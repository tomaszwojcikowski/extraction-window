import { lore } from '../../data/lore';
import { ITEMS, shortEquipName, type ItemKind } from '../../data/items';
import { equipSlotsFor, isItemWorn } from '../../sim/equip';
import { BUS_WARN_AT } from '../../sim/bus';
import { hasItem } from '../../sim/inventory';
import { isObjectiveHidden } from '../../sim/objectives';
import type { GameState } from '../../sim/types';
import { clampKitSelection } from './KitOverlayContent';

/** Dock only shows hotkeyed bag slots (1–9, 0). */
export const FIELD_KIT_DOCK_SLOTS = 10;

/** Compact bag name for the always-on dock strip. */
export function shortKitName(kind: ItemKind): string {
  switch (kind) {
    case 'med':
      return 'hypo';
    case 'energy':
      return 'cell';
    case 'probe':
      return 'pulse';
    case 'stim':
      return 'stim';
    case 'plate':
      return 'shield';
    case 'flare':
      return 'flare';
    case 'filter':
      return 'filter';
    case 'dart':
      return 'dart';
    case 'sealant':
      return 'foam';
    case 'mapper':
      return 'ping';
    case 'salvage':
      return 'salvage';
    case 'relay_key':
      return 'key';
    case 'nav_core':
      return 'lattice';
    default:
      return shortEquipName(kind);
  }
}

function slotHotkey(index: number): string {
  if (index < 9) return String(index + 1);
  return '0';
}

function slotMark(state: GameState, kind: ItemKind): string {
  if (isItemWorn(state, kind)) return '◆';
  if (equipSlotsFor(kind).length > 0) return '·';
  return '';
}

function isUnwornWearable(state: GameState, kind: ItemKind): boolean {
  return equipSlotsFor(kind).length > 0 && !isItemWorn(state, kind);
}

/** Prefer dropping consumables before the selected slot or unworn gear. */
function slotKeepScore(state: GameState, index: number, selected: number): number {
  if (index === selected) return 3;
  const kind = state.inventory[index]?.kind;
  if (!kind) return 0;
  if (isUnwornWearable(state, kind)) return 2;
  if (ITEMS[kind].quest) return 1;
  return 0;
}

/** Hotkey + wear verb for the first unworn piece that is not already selected. */
export function fieldKitWearCue(state: GameState): string {
  const bag = Math.min(state.inventory.length, FIELD_KIT_DOCK_SLOTS);
  if (bag === 0) return '';
  const selected = clampKitSelection(state.ui.selectedSlot, bag);
  for (let i = 0; i < bag; i++) {
    if (i === selected) continue;
    const kind = state.inventory[i]?.kind;
    if (!kind || !isUnwornWearable(state, kind)) continue;
    return `${slotHotkey(i)} ${lore('UI-DOCK-WEAR')} ${shortKitName(kind)}`;
  }
  return '';
}

/** Kit that can reveal the live next-step tile while it is still in fog. */
export function fogSurveyKitKind(state: GameState): ItemKind | null {
  if (!isObjectiveHidden(state)) return null;
  if (hasItem(state, 'mapper') && state.player.mapperTurns <= 0) return 'mapper';
  if (hasItem(state, 'probe') && state.player.probeTurns <= 0) return 'probe';
  return null;
}

/** Hotkey + use verb for a Power Cell when the bus is at a warn mark. */
export function fieldKitSpendCue(state: GameState): string {
  if (!state.busFailing && state.player.energy > BUS_WARN_AT[0]) return '';
  const bag = Math.min(state.inventory.length, FIELD_KIT_DOCK_SLOTS);
  if (bag === 0) return '';
  const selected = clampKitSelection(state.ui.selectedSlot, bag);
  if (state.inventory[selected]?.kind === 'energy') return '';
  const idx = state.inventory.findIndex((s) => s.kind === 'energy');
  if (idx < 0 || idx >= bag) return '';
  return `${slotHotkey(idx)} ${lore('UI-DOCK-USE')} ${shortKitName('energy')}`;
}

/** Hotkey + use verb for Nav Ping / Field Array Pulse while the goal is in fog. */
export function fieldKitFogCue(state: GameState): string {
  const kind = fogSurveyKitKind(state);
  if (!kind) return '';
  const bag = Math.min(state.inventory.length, FIELD_KIT_DOCK_SLOTS);
  if (bag === 0) return '';
  const selected = clampKitSelection(state.ui.selectedSlot, bag);
  if (state.inventory[selected]?.kind === kind) return '';
  const idx = state.inventory.findIndex((s) => s.kind === kind);
  if (idx < 0 || idx >= bag) return '';
  return `${slotHotkey(idx)} ${lore('UI-DOCK-USE')} ${shortKitName(kind)}`;
}

function formatSlotCell(
  state: GameState,
  index: number,
  selected: number,
): string {
  const slot = state.inventory[index];
  if (!slot) return '';
  const count = slot.count > 1 ? `×${slot.count}` : '';
  const body = `${slotHotkey(index)}${slotMark(state, slot.kind)}${shortKitName(slot.kind)}${count}`;
  return index === selected ? `[${body}]` : body;
}

/** Verb for the highlighted dock slot — what `u` will do. */
export function fieldKitSelectedVerb(state: GameState): string {
  const bag = Math.min(state.inventory.length, FIELD_KIT_DOCK_SLOTS);
  if (bag === 0) return '';
  const selected = clampKitSelection(state.ui.selectedSlot, bag);
  const slot = state.inventory[selected];
  if (!slot) return '';
  const name = shortKitName(slot.kind);
  if (ITEMS[slot.kind].quest) return lore('UI-KIT-QUEST');
  if (isItemWorn(state, slot.kind)) return `${lore('UI-DOCK-STOW')} ${name}`;
  if (equipSlotsFor(slot.kind).length > 0) return `${lore('UI-DOCK-WEAR')} ${name}`;
  return `${lore('UI-DOCK-USE')} ${name}`;
}

function joinDock(cells: string[], extras: string[]): string {
  const extra = extras.filter(Boolean);
  const body = cells.filter(Boolean).join('  ');
  if (extra.length === 0) return body;
  return body ? `${body}  ${extra.join('  ·  ')}` : extra.join('  ·  ');
}

/**
 * Always-on bag readout so 1–9 / u work without opening the kit case.
 * Truncates consumables first so unworn gear (·) stays on the strip.
 */
export function formatFieldKitDock(state: GameState, maxChars = 88): string {
  const bag = Math.min(state.inventory.length, FIELD_KIT_DOCK_SLOTS);
  if (bag === 0) return lore('UI-EMPTY-INV');
  const selected = clampKitSelection(state.ui.selectedSlot, bag);
  const cells: string[] = [];
  for (let i = 0; i < bag; i++) cells.push(formatSlotCell(state, i, selected));
  const verb = fieldKitSelectedVerb(state);
  const extras = [
    verb,
    fieldKitSpendCue(state),
    fieldKitFogCue(state),
    fieldKitWearCue(state),
  ].filter(Boolean);

  const fit = (slice: string[], extra: string[]) =>
    joinDock(slice, extra).length <= maxChars;

  let keep = cells.map((c, i) => ({ c, i }));
  let extra = extras.slice();
  while (keep.length > 1 && !fit(keep.map((k) => k.c), extra)) {
    let dropAt = -1;
    let dropScore = Infinity;
    for (let i = keep.length - 1; i >= 0; i--) {
      const score = slotKeepScore(state, keep[i]!.i, selected);
      if (score < dropScore) {
        dropScore = score;
        dropAt = i;
      }
    }
    if (dropAt < 0 || dropScore >= 2) break;
    keep.splice(dropAt, 1);
  }
  while (extra.length > 1 && !fit(keep.map((k) => k.c), extra)) extra.pop();
  return joinDock(
    keep.map((k) => k.c),
    extra,
  );
}
