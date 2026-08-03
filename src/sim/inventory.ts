import { ITEMS, INVENTORY_SLOTS, type ItemKind } from '../data/items';
import type { GameState } from './types';
import { pushLog, recordLoreEvent } from './combat';

export function findSlot(state: GameState, kind: ItemKind): number {
  return state.inventory.findIndex((s) => s.kind === kind);
}

export function hasItem(state: GameState, kind: ItemKind): boolean {
  return findSlot(state, kind) >= 0;
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
      // Evict a non-quest stack to make room for mission-critical gear
      const dropIdx = state.inventory.findIndex((s) => !ITEMS[s.kind].quest);
      if (dropIdx >= 0) {
        const dropped = state.inventory[dropIdx]!;
        state.inventory.splice(dropIdx, 1);
        // Drop onto the ground underfoot so kit items are not voided
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

export function useSelected(state: GameState): void {
  if (state.inventory.length === 0) {
    pushLog(state, 'LOG-USE-FAIL');
    return;
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
      state.player.probeTurns = Math.max(state.player.probeTurns, 20);
      removeOne(state, kind);
      pushLog(state, 'LOG-USE-PROBE');
      break;
    case 'relay_key':
      // Used via exit/beacon interaction, not inventory use
      pushLog(state, 'LOG-USE-FAIL');
      break;
    case 'nav_core':
      pushLog(state, 'LOG-USE-FAIL');
      break;
  }
  syncObjectiveFlags(state);
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
  pushLog(state, 'LOG-PICKUP');
  if (item.kind === 'relay_key') {
    pushLog(state, 'LOG-GOT-KEY');
    recordLoreEvent(state, 'LOG-GOT-KEY');
  }
  if (item.kind === 'nav_core') {
    pushLog(state, 'LOG-GOT-CORE');
    recordLoreEvent(state, 'LOG-GOT-CORE');
  }
  syncObjectiveFlags(state);
}
