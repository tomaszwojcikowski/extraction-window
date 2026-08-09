import { lore } from '../data/lore';
import {
  ITEMS,
  INVENTORY_SLOTS,
  ARMOR_MAX_BONUS,
  type EquipSlotId,
  type ItemKind,
} from '../data/items';
import { STORM_SURPLUS_SALVAGE, XP_QUEST_ITEM } from '../data/progression';
import type { GameState } from './types';
import type { SectorId } from '../data/encounters';
import { playerAttack } from './combat';
import { killEnemy } from './death';
import { pushLog, recordLoreEvent } from './log';
import { addStatus, addPlayerMarked, hasStatus, tryStabilizeScar } from './status';
import { pick, randInt } from './rng';
import { tryStabilizeQuest } from './roomQuest';
import { gainXp, hasSkill, bumpDoctrine } from './progression';
import { addEmStress, purgeEmStress, EM_HIGH } from './emStress';
import { addLightSource, inShadow, isLit, rebuildIllumination } from './light';
import { tryClearPatternDesync } from './mechanics/patternBuffer';
import { flareDamageForEnemy } from './brands';
import { tryUseUplinkAid } from './mechanics/extractionUplink';
import { tryOpenAdjacentSealed } from './mechanics/sealedHatch';
import { cancelOverwatch } from './ai';

const PLATE_REPAIR = 10;

const EQUIP_LOG: Partial<Record<ItemKind, Parameters<typeof pushLog>[1]>> = {
  blade: 'LOG-USE-BLADE',
  pulse_baton: 'LOG-USE-BATON',
  harness: 'LOG-USE-HARNESS',
  ablative_vest: 'LOG-USE-VEST',
  sensor_rig: 'LOG-USE-SENSOR',
  eps_coupler: 'LOG-USE-COUPLER',
  flare_prism: 'LOG-USE-FLARE-PRISM',
  ward_weave: 'LOG-USE-WARD-WEAVE',
  shadow_lens: 'LOG-USE-SHADOW-LENS',
};

type TimerKey =
  | 'probeTurns'
  | 'stimTurns'
  | 'filterTurns'
  | 'jammerTurns'
  | 'lensTurns'
  | 'mapperTurns';

const TIMER_KEYS: TimerKey[] = [
  'probeTurns',
  'stimTurns',
  'filterTurns',
  'jammerTurns',
  'lensTurns',
  'mapperTurns',
];

type UnknownKind = 'salvage' | 'sealed_crate' | 'array_shard';

const ID_CATEGORIES: Record<string, { label: string; items: ItemKind[] }> = {
  power: { label: 'power kit', items: ['energy', 'coolant', 'filter', 'probe'] },
  combat: { label: 'combat kit', items: ['stim', 'dart', 'plate', 'blade'] },
  field: { label: 'field kit', items: ['med', 'ration', 'sealant', 'patch', 'flare'] },
};

function biomeIdTable(sectorId: SectorId, scav: boolean): ItemKind[] {
  const early: SectorId[] = ['plains', 'flood', 'canopy', 'reef'];
  const mid: SectorId[] = ['spire', 'ruin', 'beacon', 'trench', 'duct'];
  if (early.includes(sectorId)) {
    return scav
      ? ['coolant', 'plate', 'med', 'filter', 'lens', 'dart', 'stim', 'flare']
      : ['energy', 'med', 'ration', 'dart', 'sealant', 'patch', 'flare', 'plate'];
  }
  if (mid.includes(sectorId)) {
    return scav
      ? ['coolant', 'plate', 'med', 'filter', 'lens', 'mapper', 'dart', 'stim', 'sensor_rig', 'jammer']
      : ['energy', 'med', 'filter', 'dart', 'sealant', 'plate', 'coolant', 'stim'];
  }
  // deep / ashward
  return scav
    ? ['coolant', 'plate', 'med', 'filter', 'lens', 'mapper', 'dart', 'stim', 'sensor_rig', 'eps_coupler']
    : ['coolant', 'med', 'filter', 'plate', 'sealant', 'jammer', 'lens', 'stim'];
}

function failChanceFor(kind: UnknownKind, scav: boolean): number {
  if (kind === 'salvage') return scav ? 0.08 : 0.18;
  if (kind === 'sealed_crate') return scav ? 0.16 : 0.28;
  return scav ? 0.24 : 0.38;
}

function backlashEm(kind: UnknownKind): number {
  if (kind === 'salvage') return 15;
  if (kind === 'sealed_crate') return 20;
  return 28;
}

/** Soft cap: at most 3 concurrent kit timers (keep the one being applied). */
function capActiveSystems(state: GameState, keep: TimerKey): void {
  const labels: Record<TimerKey, string> = {
    probeTurns: 'probe',
    stimTurns: 'stim',
    filterTurns: 'filter',
    jammerTurns: 'jammer',
    lensTurns: 'lens',
    mapperTurns: 'mapper',
  };
  const active = TIMER_KEYS.filter((k) => state.player[k] > 0 && k !== keep);
  while (active.length >= 3) {
    let shortest = active[0]!;
    for (const k of active) {
      if (state.player[k] < state.player[shortest]) shortest = k;
    }
    state.player[shortest] = 0;
    pushLog(state, 'LOG-SYS-DROP', labels[shortest]);
    const i = active.indexOf(shortest);
    if (i >= 0) active.splice(i, 1);
  }
}

export function findSlot(state: GameState, kind: ItemKind): number {
  return state.inventory.findIndex((s) => s.kind === kind);
}

export function hasItem(state: GameState, kind: ItemKind): boolean {
  return findSlot(state, kind) >= 0;
}

function isUnknownKind(kind: ItemKind): kind is UnknownKind {
  return kind === 'salvage' || kind === 'sealed_crate' || kind === 'array_shard';
}

export function addItem(state: GameState, kind: ItemKind): boolean {
  // Battery merged into coolant tier — keep kind for legacy drops, stack as coolant
  if (kind === 'battery') kind = 'coolant';
  const def = ITEMS[kind];
  if (def.stackable) {
    const idx = findSlot(state, kind);
    if (idx >= 0) {
      state.inventory[idx]!.count += 1;
      return true;
    }
  }
  if (state.inventory.length >= INVENTORY_SLOTS) {
    if (isUnknownKind(kind)) {
      const storm = randInt(state.rng, STORM_SURPLUS_SALVAGE[0], STORM_SURPLUS_SALVAGE[1]);
      state.stormTurns += storm;
      pushLog(state, 'LOG-SURPLUS-STORM', `+${storm}`);
      return true;
    }
    if (def.quest) {
      const dropIdx = state.inventory.findIndex((s) => !ITEMS[s.kind].quest);
      if (dropIdx >= 0) {
        const dropped = state.inventory[dropIdx]!;
        state.inventory.splice(dropIdx, 1);
        for (let n = 0; n < dropped.count; n++) {
          state.items.push({
            id: state.nextEntityId++,
            kind: dropped.kind,
            x: state.player.x,
            y: state.player.y,
          });
        }
        pushLog(state, 'LOG-INV-FULL');
      } else {
        pushLog(state, 'LOG-INV-FULL');
        return false;
      }
    } else {
      pushLog(state, 'LOG-INV-FULL');
      return false;
    }
  }
  state.inventory.push({ kind, count: 1 });
  return true;
}

export function removeOne(state: GameState, kind: ItemKind): boolean {
  const idx = findSlot(state, kind);
  if (idx < 0) return false;
  const slot = state.inventory[idx]!;
  slot.count -= 1;
  if (slot.count <= 0) state.inventory.splice(idx, 1);
  return true;
}

function clearArmorBonus(state: GameState, kind: ItemKind): void {
  const bonus = ARMOR_MAX_BONUS[kind] ?? 0;
  if (bonus <= 0) return;
  state.player.maxArmor = Math.max(0, state.player.maxArmor - bonus);
  state.player.armor = Math.min(state.player.armor, state.player.maxArmor);
}

function applyArmorBonus(state: GameState, kind: ItemKind): void {
  const bonus = ARMOR_MAX_BONUS[kind] ?? 0;
  if (bonus <= 0) return;
  state.player.maxArmor += bonus;
  state.player.armor = state.player.maxArmor;
}

/** Stow worn gear for a slot (item stays in the kit bag). */
function unequipSlot(state: GameState, slot: EquipSlotId): void {
  const prev = state.player.equip[slot];
  if (!prev) return;
  if (slot === 'armor') clearArmorBonus(state, prev);
  state.player.equip[slot] = null;
  pushLog(state, 'LOG-UNEQUIP');
}

/**
 * Toggle or swap worn gear. Equipped pieces stay in inventory (marked [E] in kit).
 * Use again on the worn piece to stow.
 */
export function tryEquipItem(state: GameState, kind: ItemKind): void {
  const slot = ITEMS[kind].equipSlot;
  if (!slot) return;
  if (state.player.equip[slot] === kind) {
    unequipSlot(state, slot);
    return;
  }
  unequipSlot(state, slot);
  state.player.equip[slot] = kind;
  if (slot === 'armor') applyArmorBonus(state, kind);
  if (kind === 'eps_coupler') addEmStress(state, 3, 'eps coupler');
  const logId = EQUIP_LOG[kind];
  if (logId) pushLog(state, logId);
}

function applyIdentifyBacklash(state: GameState, kind: UnknownKind): void {
  addEmStress(state, backlashEm(kind), `unstable ${kind}`);
  addStatus(state.player, 'ion_burn', kind === 'array_shard' ? 3 : 2);
  state.lootTakenThisSector = true;
  for (const en of state.enemies) {
    if (!en.alive) continue;
    if (Math.abs(en.x - state.player.x) + Math.abs(en.y - state.player.y) <= 5) {
      en.alerted = true;
    }
  }
  pushLog(state, 'LOG-SALVAGE-BAD');
}

/** ADOM unidentified loot — scan unknown into a known kit item (or backlash). */
function identifyUnknown(state: GameState, kind: UnknownKind): void {
  if (!removeOne(state, kind)) {
    pushLog(state, 'LOG-USE-FAIL');
    return;
  }
  const scav = hasSkill(state, 'scavenger');
  const failChance = failChanceFor(kind, scav);
  if (state.rng() < failChance) {
    state.salvageBacklash++;
    applyIdentifyBacklash(state, kind);
    return;
  }
  state.salvageIdentified++;

  // Partial ID: ~20% on array_shard with scavenger — log category then roll within it
  if (kind === 'array_shard' && scav && state.rng() < 0.2) {
    const catKey = pick(state.rng, Object.keys(ID_CATEGORIES));
    const cat = ID_CATEGORIES[catKey]!;
    pushLog(state, 'LOG-ID-PARTIAL', cat.label);
    const idKind = pick(state.rng, cat.items);
    addItem(state, idKind);
    pushLog(state, 'LOG-SALVAGE-ID', lore(ITEMS[idKind].loreName));
    return;
  }

  const table = biomeIdTable(state.sectorId, scav);
  const idKind = pick(state.rng, table);
  addItem(state, idKind);
  pushLog(state, 'LOG-SALVAGE-ID', lore(ITEMS[idKind].loreName));
}

export function useSelected(state: GameState): boolean {
  if (state.inventory.length === 0) {
    pushLog(state, 'LOG-USE-EMPTY');
    return false;
  }
  const idx = Math.max(0, Math.min(state.ui.selectedSlot, state.inventory.length - 1));
  const slot = state.inventory[idx]!;
  const kind = slot.kind;

  const equipSlot = ITEMS[kind].equipSlot;
  if (equipSlot) {
    tryEquipItem(state, kind);
    syncObjectiveFlags(state);
    return true;
  }

  switch (kind) {
    case 'med':
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 18);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-MED');
      break;
    case 'energy':
      state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 20);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-ENERGY');
      break;
    case 'ration':
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 8);
      state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 8);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-RATION');
      break;
    case 'probe':
      if (hasStatus(state.player, 'jam')) {
        pushLog(state, 'LOG-JAM-BLOCK');
        return false;
      }
      capActiveSystems(state, 'probeTurns');
      state.player.probeTurns = Math.max(state.player.probeTurns, 20);
      removeOne(state, kind);
      addEmStress(state, 4, 'array pulse');
      bumpDoctrine(state, 'probe');
      pushLog(state, 'LOG-USE-PROBE');
      break;
    case 'stim':
      capActiveSystems(state, 'stimTurns');
      state.player.stimTurns = Math.max(state.player.stimTurns, 15);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-STIM');
      break;
    case 'plate':
      state.player.armor = Math.min(state.player.maxArmor, state.player.armor + PLATE_REPAIR);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-PLATE');
      break;
    case 'filter': {
      if (tryStabilizeQuest(state, 'filter')) {
        removeOne(state, kind);
        break;
      }
      capActiveSystems(state, 'filterTurns');
      const filterDur = 50 + state.paddMods.filterBonus;
      state.player.filterTurns = Math.max(state.player.filterTurns, filterDur);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-FILTER');
      break;
    }
    case 'coolant':
      if (tryUseUplinkAid(state, 'coolant')) {
        removeOne(state, kind);
        break;
      }
      if (state.patternDesync > 0 && tryClearPatternDesync(state)) {
        state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 35);
        break;
      }
      state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 35);
      removeOne(state, kind);
      purgeEmStress(state, 12);
      tryStabilizeScar(state);
      pushLog(state, 'LOG-USE-COOLANT');
      break;
    case 'battery':
      // Alias of coolant (legacy stacks)
      if (state.patternDesync > 0 && tryClearPatternDesync(state)) {
        state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 35);
        break;
      }
      state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 35);
      removeOne(state, kind);
      purgeEmStress(state, 12);
      tryStabilizeScar(state);
      pushLog(state, 'LOG-USE-COOLANT');
      break;
    case 'patch':
      delete state.player.statuses.bleed;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 8);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-PATCH');
      break;
    case 'lens':
      capActiveSystems(state, 'lensTurns');
      state.player.lensTurns = Math.max(state.player.lensTurns, 25);
      removeOne(state, kind);
      addEmStress(state, 3, 'lens');
      pushLog(state, 'LOG-USE-LENS');
      break;
    case 'mapper':
      capActiveSystems(state, 'mapperTurns');
      state.player.mapperTurns = Math.max(state.player.mapperTurns, 40);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-MAPPER');
      break;
    case 'flare': {
      if (tryUseUplinkAid(state, 'flare')) {
        removeOne(state, kind);
        break;
      }
      const shadowed = inShadow(state, state.player.x, state.player.y);
      removeOne(state, kind);
      cancelOverwatch(state);
      let hits = 0;
      for (const en of state.enemies) {
        if (!en.alive) continue;
        if (Math.abs(en.x - state.player.x) + Math.abs(en.y - state.player.y) !== 1) continue;
        const flareDamage = flareDamageForEnemy(en, 4);
        en.hp -= flareDamage;
        addStatus(en, 'stun', flareDamage > 4 ? 3 : 2);
        en.windup = 0;
        hits += 1;
        if (en.hp <= 0) killEnemy(state, en);
      }
      addLightSource(state, {
        x: state.player.x,
        y: state.player.y,
        radius: 5.5,
        intensity: 1.35,
        life: state.player.equip.utility === 'flare_prism' ? 6 : 4,
        color: 0xccffff,
      });
      if (state.ionFrontTurns > 0) {
        state.ionFrontDampened = true;
        pushLog(state, 'LOG-ION-DAMPEN');
      }
      rebuildIllumination(state);
      pushLog(state, 'LOG-USE-FLARE', hits ? `x${hits}` : undefined);
      // Hunter notice: flaring while already in shadow
      if (shadowed && state.rng() < 0.22) {
        addPlayerMarked(state, 3);
        pushLog(state, 'LOG-STATUS-MARKED');
      }
      break;
    }
    case 'jammer':
      if (hasStatus(state.player, 'jam')) {
        pushLog(state, 'LOG-JAM-BLOCK');
        return false;
      }
      capActiveSystems(state, 'jammerTurns');
      state.player.jammerTurns = Math.max(state.player.jammerTurns, 12);
      removeOne(state, kind);
      addEmStress(state, 5, 'scrambler');
      bumpDoctrine(state, 'quiet');
      pushLog(state, 'LOG-USE-JAMMER');
      if (state.emStress >= EM_HIGH) pushLog(state, 'LOG-QUIET-EM');
      break;
    case 'salvage':
    case 'sealed_crate': {
      identifyUnknown(state, kind);
      break;
    }
    case 'array_shard': {
      if (hasItem(state, 'coolant')) {
        removeOne(state, 'array_shard');
        removeOne(state, 'coolant');
        addItem(state, 'pattern_balm');
        pushLog(state, 'LOG-CRAFT-BALM');
        break;
      }
      identifyUnknown(state, kind);
      break;
    }
    case 'field_sample': {
      if (hasItem(state, 'sealant')) {
        removeOne(state, 'field_sample');
        removeOne(state, 'sealant');
        addItem(state, 'filter');
        pushLog(state, 'LOG-CRAFT-FILTER');
      } else if (hasItem(state, 'energy')) {
        removeOne(state, 'field_sample');
        removeOne(state, 'energy');
        addItem(state, 'ration');
        pushLog(state, 'LOG-CRAFT-RATION');
      } else {
        pushLog(state, 'LOG-CRAFT-NEED');
        return false;
      }
      break;
    }
    case 'pattern_balm': {
      removeOne(state, kind);
      if (state.patternDesync > 0) {
        state.patternDesync = 0;
        pushLog(state, 'LOG-PB-SYNC');
      }
      purgeEmStress(state, 10);
      pushLog(state, 'LOG-USE-BALM');
      break;
    }
    case 'sealant': {
      if (tryStabilizeQuest(state, 'sealant')) {
        removeOne(state, kind);
        break;
      }
      const tile = state.tiles[state.player.y]![state.player.x]!;
      if (tile.kind === 'hazard' || tile.kind === 'vent' || tile.kind === 'brine_pool') {
        state.tiles[state.player.y]![state.player.x] = {
          kind: 'floor',
          walkable: true,
          transparent: true,
        };
        removeOne(state, kind);
        purgeEmStress(state, state.paddMods.brineSeal ? 18 : 8);
        tryStabilizeScar(state);
        pushLog(state, 'LOG-USE-SEALANT');
      } else if (tryOpenAdjacentSealed(state)) {
        removeOne(state, kind);
        purgeEmStress(state, 6);
        tryStabilizeScar(state);
      } else {
        // Flush EM without sealing terrain
        removeOne(state, kind);
        purgeEmStress(state, 20);
        tryStabilizeScar(state);
        pushLog(state, 'LOG-EM-PURGE', 'sealant flush');
      }
      break;
    }
    case 'dart':
      state.ui.aimingDart = true;
      state.ui.inventoryOpen = false;
      pushLog(state, 'LOG-AIM-DART');
      return false;
    case 'relay_key':
    case 'nav_core':
      pushLog(state, 'LOG-USE-QUEST');
      return false;
  }
  syncObjectiveFlags(state);
  return true;
}

/** Fire dart in a direction (Chebyshev range ≤3, needs FOV + lit target). */
export function fireDart(state: GameState, dx: number, dy: number): void {
  state.ui.aimingDart = false;
  if (!hasItem(state, 'dart')) {
    pushLog(state, 'LOG-USE-FAIL');
    return;
  }
  if (dx === 0 && dy === 0) {
    pushLog(state, 'LOG-AIM-MISS');
    return;
  }
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  let hit = false;
  let darkBlock = false;
  for (let i = 1; i <= 3; i++) {
    const x = state.player.x + sx * i;
    const y = state.player.y + sy * i;
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) break;
    if (!state.tiles[y]![x]!.transparent && !state.tiles[y]![x]!.walkable) break;
    if (!state.visible[y]![x]) break;
    const en = state.enemies.find((e) => e.alive && e.x === x && e.y === y);
    if (en) {
      if (!isLit(state, x, y) && state.player.equip.utility !== 'shadow_lens') {
        darkBlock = true;
        break;
      }
      removeOne(state, 'dart');
      addStatus(en, 'expose', 4);
      playerAttack(state, en, randInt(state.rng, 0, 1));
      pushLog(state, 'LOG-USE-DART');
      hit = true;
      break;
    }
  }
  if (!hit) {
    removeOne(state, 'dart');
    pushLog(state, 'LOG-AIM-MISS', darkBlock ? 'target in shadow' : undefined);
  }
}

export function syncObjectiveFlags(state: GameState): void {
  state.objectives.hasRelayKey = hasItem(state, 'relay_key');
  state.objectives.hasNavCore = hasItem(state, 'nav_core');
}

/** @returns true when something was recovered (costs a turn). */
export function tryPickup(state: GameState): boolean {
  const item = state.items.find(
    (i) => i.x === state.player.x && i.y === state.player.y,
  );
  if (!item) {
    pushLog(state, 'LOG-NO-PICKUP');
    return false;
  }
  if (!addItem(state, item.kind)) return false;
  state.items = state.items.filter((i) => i.id !== item.id);
  state.lootTakenThisSector = true;
  pushLog(state, 'LOG-PICKUP', lore(ITEMS[item.kind].loreName));
  if (item.kind === 'relay_key') {
    pushLog(state, 'LOG-GOT-KEY');
    recordLoreEvent(state, 'LOG-GOT-KEY');
    gainXp(state, XP_QUEST_ITEM, 'key');
  }
  if (item.kind === 'nav_core') {
    pushLog(state, 'LOG-GOT-CORE');
    recordLoreEvent(state, 'LOG-GOT-CORE');
    gainXp(state, XP_QUEST_ITEM, 'core');
  }
  syncObjectiveFlags(state);
  return true;
}
