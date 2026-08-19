import { lore } from '../data/lore';
import {
  ITEMS,
  INVENTORY_SLOTS,
  ARMOR_MAX_BONUS,
  type EquipSlotId,
  type ItemKind,
} from '../data/items';
import { XP_QUEST_ITEM } from '../data/progression';
import type { GameState } from './types';
import type { SectorId } from '../data/encounters';
import { flankPenalty, playerAttack } from './combat';
import { killEnemy } from './death';
import { pushLog, recordLoreEvent } from './log';
import { addStatus, addPlayerMarked, hasStatus } from './status';
import { pick, randInt } from './rng';
import { trySealVentSite } from './roomQuest';
import { gainXp, hasSkill } from './progression';
import { addEmStress, purgeEmStress } from './emStress';
import { addLightSource, inShadow, isLit, LIGHT_TEMP, rebuildIllumination } from './light';
import { tryClearPatternDesync } from './mechanics/patternBuffer';
import { flareDamageForEnemy } from './brands';
import { tryUseUplinkAid } from './mechanics/extractionUplink';
import { tryOpenAdjacentSealed } from './mechanics/sealedHatch';
import { cancelOverwatch } from './ai';
import { fieldPosition } from './stance';

const PLATE_REPAIR = 12;

const EQUIP_LOG: Partial<Record<ItemKind, Parameters<typeof pushLog>[1]>> = {
  blade: 'LOG-USE-BLADE',
  pulse_baton: 'LOG-USE-BATON',
  phaser: 'LOG-USE-PHASER-EQUIP',
  harness: 'LOG-USE-HARNESS',
  ablative_vest: 'LOG-USE-VEST',
};

/** Unknown salvage resolves into whatever this depth of shelf actually stocks. */
function biomeIdTable(sectorId: SectorId): ItemKind[] {
  const early: SectorId[] = ['plains', 'flood', 'canopy', 'reef'];
  const mid: SectorId[] = ['spire', 'ruin', 'beacon', 'trench', 'duct'];
  if (early.includes(sectorId)) {
    return ['med', 'energy', 'dart', 'sealant', 'flare', 'plate'];
  }
  if (mid.includes(sectorId)) {
    return ['med', 'energy', 'filter', 'dart', 'sealant', 'plate', 'stim', 'probe', 'phaser'];
  }
  return ['med', 'energy', 'filter', 'plate', 'sealant', 'stim', 'mapper', 'phaser'];
}

const SALVAGE_FAIL = 0.18;
const SALVAGE_FAIL_SCAV = 0.08;
const SALVAGE_BACKLASH_EM = 15;

export function findSlot(state: GameState, kind: ItemKind): number {
  return state.inventory.findIndex((s) => s.kind === kind);
}

export function hasItem(state: GameState, kind: ItemKind): boolean {
  return findSlot(state, kind) >= 0;
}

function isUnknownKind(kind: ItemKind): boolean {
  return kind === 'salvage';
}

export function addItem(state: GameState, kind: ItemKind): boolean {
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
 * Toggle or swap worn gear. Equipped pieces stay in inventory (kit marks them worn).
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
  const logId = EQUIP_LOG[kind];
  if (logId) pushLog(state, logId);
}

function applyIdentifyBacklash(state: GameState): void {
  addEmStress(state, SALVAGE_BACKLASH_EM, 'unstable salvage');
  addStatus(state.player, 'ion_burn', 2);
  state.lootTakenThisSector = true;
  for (const en of state.enemies) {
    if (!en.alive) continue;
    if (Math.abs(en.x - state.player.x) + Math.abs(en.y - state.player.y) <= 5) {
      en.alerted = true;
    }
  }
  pushLog(state, 'LOG-SALVAGE-BAD');
}

/**
 * One gamble, one rule: scan the unknown and it either becomes kit or bites.
 * Scavenger is the only thing that shifts the odds.
 */
function identifyUnknown(state: GameState): void {
  if (!removeOne(state, 'salvage')) {
    pushLog(state, 'LOG-USE-FAIL');
    return;
  }
  const fail = hasSkill(state, 'scavenger') ? SALVAGE_FAIL_SCAV : SALVAGE_FAIL;
  if (state.rng() < fail) {
    state.salvageBacklash++;
    applyIdentifyBacklash(state);
    return;
  }
  state.salvageIdentified++;
  const idKind = pick(state.rng, biomeIdTable(state.sectorId));
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
    // Med is the whole answer to damage: it heals and it stops the bleeding.
    case 'med':
      if (hasStatus(state.player, 'downed')) {
        delete state.player.statuses.downed;
        state.player.hp = 8;
        delete state.player.statuses.bleed;
        removeOne(state, kind);
        pushLog(state, 'LOG-STABILIZE');
        break;
      }
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 22);
      delete state.player.statuses.bleed;
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-MED');
      break;
    // Energy is the whole answer to the bus.
    case 'energy':
      if (tryUseUplinkAid(state, 'energy')) {
        removeOne(state, kind);
        break;
      }
      if (state.patternDesync > 0 && tryClearPatternDesync(state)) {
        state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 32);
        break;
      }
      state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 32);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-ENERGY');
      break;
    case 'probe':
      if (hasStatus(state.player, 'jam')) {
        pushLog(state, 'LOG-JAM-BLOCK');
        return false;
      }
      state.player.probeTurns = Math.max(state.player.probeTurns, 25);
      removeOne(state, kind);
      addEmStress(state, 4, 'array pulse');
      pushLog(state, 'LOG-USE-PROBE');
      break;
    case 'stim':
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
      const filterDur = 50 + state.paddMods.filterBonus;
      state.player.filterTurns = Math.max(state.player.filterTurns, filterDur);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-FILTER');
      break;
    }
    case 'mapper':
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
        life: 5,
        color: LIGHT_TEMP.flare,
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
    case 'salvage':
      identifyUnknown(state);
      break;
    case 'sealant': {
      if (trySealVentSite(state)) {
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
        pushLog(state, 'LOG-USE-SEALANT');
      } else if (tryOpenAdjacentSealed(state)) {
        removeOne(state, kind);
        purgeEmStress(state, 6);
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
      pushLog(state, 'LOG-USE-QUEST');
      return false;
  }
  syncObjectiveFlags(state);
  return true;
}

/** Fire dart in a direction (Chebyshev range ≤3, needs FOV + lit target). */
export function fireDart(state: GameState, dx: number, dy: number): void {
  state.ui.aimingDart = false;
  if (hasStatus(state.player, 'downed')) {
    pushLog(state, 'LOG-DOWNED-ACT');
    return;
  }
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
      if (!isLit(state, x, y)) {
        darkBlock = true;
        break;
      }
      removeOne(state, 'dart');
      playerAttack(state, en, randInt(state.rng, 0, 1));
      if (en.alive) addStatus(en, 'expose', 4);
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
    if (fieldPosition(flankPenalty(state), hasStatus(state.player, 'expose')) === 'desperate') {
      addEmStress(state, 10, 'desperate pickup');
      pushLog(state, 'LOG-PAY-PRICE');
    }
  }
  if (item.kind === 'nav_core') {
    pushLog(state, 'LOG-GOT-CORE');
    recordLoreEvent(state, 'LOG-GOT-CORE');
    gainXp(state, XP_QUEST_ITEM, 'core');
    if (fieldPosition(flankPenalty(state), hasStatus(state.player, 'expose')) === 'desperate') {
      addEmStress(state, 10, 'desperate pickup');
      pushLog(state, 'LOG-PAY-PRICE');
    }
  }
  syncObjectiveFlags(state);
  return true;
}
