import {
  ITEMS,
  EQUIP_SLOT_ORDER,
  type EquipSlotId,
  type ItemKind,
} from '../data/items';
import type { EquipSlots, GameState } from './types';

/** Fresh worn loadout — every slot empty. */
export function emptyEquipSlots(): EquipSlots {
  return {
    head: null,
    suit: null,
    hands: null,
    tool: null,
    feet: null,
    comm: null,
    ring_l: null,
    ring_r: null,
  };
}

export { EQUIP_SLOT_ORDER };

export function equippedInSlot(state: GameState, slot: EquipSlotId): ItemKind | null {
  return state.player.equip[slot];
}

export function equippedSuit(state: GameState): ItemKind | null {
  return state.player.equip.suit;
}

export function equippedTool(state: GameState): ItemKind | null {
  return state.player.equip.tool;
}

/** Slot(s) this wearable may occupy. */
export function equipSlotsFor(kind: ItemKind): EquipSlotId[] {
  const def = ITEMS[kind];
  if (def.equipSlots?.length) return def.equipSlots;
  if (def.equipSlot) return [def.equipSlot];
  return [];
}

/** Which slot currently holds this kind, if any. */
export function findWornSlot(state: GameState, kind: ItemKind): EquipSlotId | null {
  for (const slot of equipSlotsFor(kind)) {
    if (state.player.equip[slot] === kind) return slot;
  }
  return null;
}

export function isItemWorn(state: GameState, kind: ItemKind): boolean {
  return findWornSlot(state, kind) !== null;
}

/** Target slot for equipping — prefers slot already holding kind, else first empty. */
export function resolveEquipTarget(state: GameState, kind: ItemKind): EquipSlotId | null {
  const slots = equipSlotsFor(kind);
  if (slots.length === 0) return null;
  const worn = findWornSlot(state, kind);
  if (worn) return worn;
  for (const slot of slots) {
    if (!state.player.equip[slot]) return slot;
  }
  return slots[0]!;
}
