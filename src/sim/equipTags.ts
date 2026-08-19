import { EQUIP_TAGS, type ItemKind } from '../data/items';
import { EQUIP_SLOT_ORDER, type EquipSlotId } from '../data/items';
import type { GameState } from './types';

type TagRow = (typeof EQUIP_TAGS)[keyof typeof EQUIP_TAGS];

/** Union of all numeric/boolean tag keys across EQUIP_TAGS rows. */
export type EquipTagKey = {
  [K in keyof typeof EQUIP_TAGS]: keyof (typeof EQUIP_TAGS)[K];
}[keyof typeof EQUIP_TAGS];

function tagsFor(kind: ItemKind | null): TagRow | undefined {
  if (!kind) return undefined;
  return EQUIP_TAGS[kind as keyof typeof EQUIP_TAGS];
}

function wornKinds(state: GameState): ItemKind[] {
  return EQUIP_SLOT_ORDER.map((s) => state.player.equip[s]).filter(
    (k): k is ItemKind => k !== null,
  );
}

/** Sum a numeric tag across all worn pieces (rings stack via max in wornTagMax). */
export function wornTagSum(state: GameState, key: EquipTagKey): number {
  let sum = 0;
  for (const kind of wornKinds(state)) {
    const row = tagsFor(kind);
    const v = row?.[key as keyof TagRow];
    if (typeof v === 'number') sum += v;
  }
  return sum;
}

/** Max numeric tag across worn pieces (salvage fail reduction, FOV cap, etc.). */
export function wornTagMax(state: GameState, key: EquipTagKey): number {
  let max = 0;
  for (const kind of wornKinds(state)) {
    const row = tagsFor(kind);
    const v = row?.[key as keyof TagRow];
    if (typeof v === 'number') max = Math.max(max, v);
  }
  return max;
}

/** Numeric tag from a single slot (tool, suit, head, …). */
export function slotTag(
  state: GameState,
  slot: EquipSlotId,
  key: EquipTagKey,
): number {
  const row = tagsFor(state.player.equip[slot]);
  const v = row?.[key as keyof TagRow];
  return typeof v === 'number' ? v : 0;
}

/** Any worn piece sets a boolean tag true. */
export function wornHasTag(state: GameState, key: EquipTagKey): boolean {
  for (const kind of wornKinds(state)) {
    const row = tagsFor(kind);
    if (row?.[key as keyof TagRow] === true) return true;
  }
  return false;
}
