import { lore } from '../data/lore';
import { ITEMS, INVENTORY_SLOTS, type ItemKind } from '../data/items';
import { XP_QUEST_ITEM } from '../data/progression';
import type { GameState } from './types';
import { pushLog, recordLoreEvent, playerAttack, killEnemy } from './combat';
import { addStatus } from './status';
import { pick, randInt } from './rng';
import { tryStabilizeQuest } from './roomQuest';
import { gainXp, hasSkill } from './progression';
import { addEmStress, purgeEmStress } from './emStress';
import { onNavCoreAcquired } from './mechanics/scriptedEvents';
import { tryClearPatternDesync } from './mechanics/patternBuffer';

const HARNESS_ARMOR_BONUS = 6;
const PLATE_REPAIR = 10;

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

/** Soft cap: at most 3 concurrent kit timers (keep the one being applied). */
function capActiveSystems(state: GameState, keep: TimerKey): void {
  const active = TIMER_KEYS.filter((k) => state.player[k] > 0 && k !== keep);
  while (active.length >= 3) {
    let shortest = active[0]!;
    for (const k of active) {
      if (state.player[k] < state.player[shortest]) shortest = k;
    }
    state.player[shortest] = 0;
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

function unequipTool(state: GameState): void {
  const prev = state.player.equip.tool;
  if (!prev) return;
  state.player.equip.tool = null;
  addItem(state, prev);
  pushLog(state, 'LOG-UNEQUIP');
}

function unequipArmor(state: GameState): void {
  const prev = state.player.equip.armor;
  if (!prev) return;
  if (prev === 'harness') {
    state.player.maxArmor = Math.max(0, state.player.maxArmor - HARNESS_ARMOR_BONUS);
    state.player.armor = Math.min(state.player.armor, state.player.maxArmor);
  }
  state.player.equip.armor = null;
  addItem(state, prev);
  pushLog(state, 'LOG-UNEQUIP');
}

function equipTool(state: GameState, kind: ItemKind): void {
  if (state.player.equip.tool === kind) return;
  unequipTool(state);
  removeOne(state, kind);
  state.player.equip.tool = kind;
  pushLog(state, 'LOG-USE-BLADE');
}

function equipArmor(state: GameState, kind: ItemKind): void {
  if (state.player.equip.armor === kind) return;
  unequipArmor(state);
  removeOne(state, kind);
  state.player.equip.armor = kind;
  if (kind === 'harness') {
    state.player.maxArmor += HARNESS_ARMOR_BONUS;
    state.player.armor = state.player.maxArmor;
  }
  pushLog(state, 'LOG-USE-HARNESS');
}

/** ADOM unidentified loot — scan unknown salvage into a known kit item (or backlash). */
function identifySalvage(state: GameState): void {
  if (!removeOne(state, 'salvage')) {
    pushLog(state, 'LOG-USE-FAIL');
    return;
  }
  const roll = state.rng();
  const scav = hasSkill(state, 'scavenger');
  const failChance = scav ? 0.08 : 0.18;
  if (roll < failChance) {
    addEmStress(state, 15, 'unstable salvage');
    addStatus(state.player, 'ion_burn', 2);
    state.lootTakenThisSector = true;
    for (const en of state.enemies) {
      if (!en.alive) continue;
      if (Math.abs(en.x - state.player.x) + Math.abs(en.y - state.player.y) <= 5) {
        en.alerted = true;
      }
    }
    pushLog(state, 'LOG-SALVAGE-BAD');
    return;
  }
  const table: ItemKind[] = scav
    ? ['coolant', 'plate', 'med', 'filter', 'lens', 'mapper', 'dart', 'stim']
    : ['energy', 'med', 'ration', 'dart', 'sealant', 'patch', 'flare', 'plate'];
  const kind = pick(state.rng, table);
  addItem(state, kind);
  pushLog(state, 'LOG-SALVAGE-ID', lore(ITEMS[kind].loreName));
}

export function useSelected(state: GameState): boolean {
  if (state.inventory.length === 0) {
    pushLog(state, 'LOG-USE-FAIL');
    return true;
  }
  const idx = Math.max(0, Math.min(state.ui.selectedSlot, state.inventory.length - 1));
  const slot = state.inventory[idx]!;
  const kind = slot.kind;

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
      capActiveSystems(state, 'probeTurns');
      state.player.probeTurns = Math.max(state.player.probeTurns, 20);
      removeOne(state, kind);
      addEmStress(state, 4, 'tricorder');
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
      if (state.patternDesync > 0 && tryClearPatternDesync(state)) {
        state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 35);
        break;
      }
      state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 35);
      removeOne(state, kind);
      purgeEmStress(state, 12);
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
    case 'blade':
      equipTool(state, 'blade');
      break;
    case 'harness':
      equipArmor(state, 'harness');
      break;
    case 'flare': {
      removeOne(state, kind);
      let hits = 0;
      for (const en of state.enemies) {
        if (!en.alive) continue;
        if (Math.abs(en.x - state.player.x) + Math.abs(en.y - state.player.y) !== 1) continue;
        en.hp -= 4;
        addStatus(en, 'stun', 2);
        en.windup = 0;
        hits += 1;
        if (en.hp <= 0) killEnemy(state, en);
      }
      pushLog(state, 'LOG-USE-FLARE', hits ? `x${hits}` : undefined);
      break;
    }
    case 'jammer':
      capActiveSystems(state, 'jammerTurns');
      state.player.jammerTurns = Math.max(state.player.jammerTurns, 12);
      removeOne(state, kind);
      addEmStress(state, 5, 'scrambler');
      pushLog(state, 'LOG-USE-JAMMER');
      pushLog(state, 'LOG-QUIET-ON');
      break;
    case 'salvage': {
      identifySalvage(state);
      break;
    }
    case 'sealant': {
      if (tryStabilizeQuest(state, 'sealant')) {
        removeOne(state, kind);
        break;
      }
      const tile = state.tiles[state.player.y]![state.player.x]!;
      if (tile.kind === 'hazard' || tile.kind === 'vent') {
        state.tiles[state.player.y]![state.player.x] = {
          kind: 'floor',
          walkable: true,
          transparent: true,
        };
        removeOne(state, kind);
        purgeEmStress(state, state.paddMods.brineSeal ? 18 : 8);
        pushLog(state, 'LOG-USE-SEALANT');
      } else {
        // Flush EM without sealing terrain
        removeOne(state, kind);
        purgeEmStress(state, 20);
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
      pushLog(state, 'LOG-USE-FAIL');
      break;
  }
  syncObjectiveFlags(state);
  return true;
}

/** Fire dart in a direction (Chebyshev range ≤3, needs FOV). */
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
  for (let i = 1; i <= 3; i++) {
    const x = state.player.x + sx * i;
    const y = state.player.y + sy * i;
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) break;
    if (!state.tiles[y]![x]!.transparent && !state.tiles[y]![x]!.walkable) break;
    if (!state.visible[y]![x]) break;
    const en = state.enemies.find((e) => e.alive && e.x === x && e.y === y);
    if (en) {
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
    pushLog(state, 'LOG-AIM-MISS');
  }
}

export function syncObjectiveFlags(state: GameState): void {
  state.objectives.hasRelayKey = hasItem(state, 'relay_key');
  state.objectives.hasNavCore = hasItem(state, 'nav_core');
}

export function tryPickup(state: GameState): void {
  const item = state.items.find(
    (i) => i.x === state.player.x && i.y === state.player.y,
  );
  if (!item) {
    pushLog(state, 'LOG-NO-PICKUP');
    return;
  }
  if (!addItem(state, item.kind)) return;
  state.items = state.items.filter((i) => i.id !== item.id);
  state.lootTakenThisSector = true;
  pushLog(state, 'LOG-PICKUP');
  if (item.kind === 'relay_key') {
    pushLog(state, 'LOG-GOT-KEY');
    recordLoreEvent(state, 'LOG-GOT-KEY');
    gainXp(state, XP_QUEST_ITEM, 'key');
  }
  if (item.kind === 'nav_core') {
    pushLog(state, 'LOG-GOT-CORE');
    recordLoreEvent(state, 'LOG-GOT-CORE');
    gainXp(state, XP_QUEST_ITEM, 'core');
    onNavCoreAcquired(state);
  }
  syncObjectiveFlags(state);
}
