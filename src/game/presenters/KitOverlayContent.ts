import { lore } from '../../data/lore';
import {
  EQUIP_SLOT_LORE,
  EQUIP_SLOT_ORDER,
  INVENTORY_SLOTS,
  ITEMS,
  shortEquipName,
  type EquipSlotId,
  type ItemKind,
} from '../../data/items';
import { KIT_POWER_COST } from '../../sim/bus';
import { equipSlotsFor, isItemWorn, resolveEquipTarget } from '../../sim/equip';
import { wornTagMax } from '../../sim/equipTags';
import { equipTagLines, hasWornLoadout, netLoadoutTagSummary } from '../../sim/equipTagLines';
import type { GameState } from '../../sim/types';
import { encumbered } from '../../sim/stance';
import { kitUseFeedback } from './KitFeedback';
import { phaserKitStatus } from './PhaserLanes';

export const BAG_VISIBLE_ROWS = 8;
/** Monospace wrap width — matches panel inner width at 13px IBM Plex Mono. */
export const KIT_WRAP_CHARS = 58;
export const KIT_LINE_H = 17;
export const KIT_PANEL_PAD = 36;

/** Word-wrap kit copy to a fixed character width (pure, testable). */
export function wrapKitLine(text: string, maxChars = KIT_WRAP_CHARS): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function pushWrapped(lines: string[], text: string): void {
  for (const row of wrapKitLine(text)) {
    lines.push(row);
  }
}

/** Keep the selected bag row inside a fixed visible window. */
export function bagScrollStart(
  selected: number,
  total: number,
  visible = BAG_VISIBLE_ROWS,
): number {
  if (total <= visible) return 0;
  const maxStart = total - visible;
  const centered = selected - Math.floor(visible / 2);
  return Math.max(0, Math.min(centered, maxStart));
}

function slotHotkey(index: number): string {
  if (index < 9) return String(index + 1);
  if (index === 9) return '0';
  return '·';
}

function kitPowerCost(state: GameState, kind: ItemKind): number | null {
  switch (kind) {
    case 'probe':
      return KIT_POWER_COST.probe;
    case 'stim':
      return KIT_POWER_COST.stim;
    case 'filter':
      return KIT_POWER_COST.filter;
    case 'flare':
      return Math.max(1, KIT_POWER_COST.flare - wornTagMax(state, 'flarePowerReduction'));
    case 'phaser':
      return KIT_POWER_COST.phaser;
    default:
      return null;
  }
}

/** ASCII trough meter for kit Power spends — readable without a Phaser bar. */
export function kitPowerTrough(cost: number, maxCost = 12): string {
  const filled = Math.max(0, Math.min(maxCost, cost));
  const empty = Math.max(0, maxCost - filled);
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function itemActionHint(state: GameState, kind: ItemKind): string {
  if (ITEMS[kind].quest) return lore('UI-KIT-QUEST');
  if (isItemWorn(state, kind)) return lore('UI-KIT-STOW');
  if (equipSlotsFor(kind).length > 0) {
    const slot = resolveEquipTarget(state, kind);
    if (slot) {
      return `${lore('UI-KIT-EQUIP')} → ${lore(EQUIP_SLOT_LORE[slot])}`;
    }
    return lore('UI-KIT-EQUIP');
  }
  return lore('UI-KIT-USE');
}

function formatLoadoutRow(
  state: GameState,
  slotId: EquipSlotId,
  selectedKind: ItemKind | null,
): string {
  const label = lore(EQUIP_SLOT_LORE[slotId]);
  const worn = state.player.equip[slotId];
  const mark = worn && worn === selectedKind ? '▸' : ' ';
  const name = shortEquipName(worn);
  return `${mark}${label.padEnd(5)} ${name}`;
}

function formatBagRow(state: GameState, index: number, selected: number): string {
  const slot = state.inventory[index];
  if (!slot) return '';
  const mark = index === selected ? '▸' : ' ';
  const key = slotHotkey(index);
  const name = lore(ITEMS[slot.kind].loreName);
  const def = ITEMS[slot.kind];
  const tag = isItemWorn(state, slot.kind)
    ? '◆'
    : def.equipSlot || def.equipSlots?.length
      ? '·'
      : ' ';
  return `${mark}${key.padStart(2)} ${name.padEnd(18).slice(0, 18)} ${tag} ×${slot.count}`;
}

export type KitOverlayContent = {
  lines: string[];
  panelW: number;
  panelH: number;
};

/** Pure kit panel copy — testable without Phaser. */
export function buildKitOverlayContent(st: GameState): KitOverlayContent {
  const pw = 548;
  const selected = st.ui.selectedSlot;
  const selectedItem = st.inventory[selected];
  const selectedKind = selectedItem?.kind ?? null;
  const bagCount = st.inventory.length;
  const scrollStart = bagScrollStart(selected, bagCount);
  const scrollEnd = Math.min(bagCount, scrollStart + BAG_VISIBLE_ROWS);

  const lines: string[] = [];

  const bagLabel = encumbered(st)
    ? `${lore('UI-INV')} ${bagCount}/${INVENTORY_SLOTS} · ${lore('UI-ENCUMBERED')}`
    : `${lore('UI-INV')} ${bagCount}/${INVENTORY_SLOTS}`;

  lines.push(`${lore('UI-LOADOUT').padEnd(22)}${bagLabel}`);
  lines.push(`┌${'─'.repeat(60)}┐`);

  for (let row = 0; row < BAG_VISIBLE_ROWS; row++) {
    const slotId = EQUIP_SLOT_ORDER[row]!;
    const left = formatLoadoutRow(st, slotId, selectedKind);
    const bagIndex = scrollStart + row;
    const right =
      bagCount === 0 && row === 0
        ? lore('UI-EMPTY-INV')
        : bagIndex < scrollEnd
          ? formatBagRow(st, bagIndex, selected)
          : '';
    lines.push(`│${left.padEnd(22)}${right.padEnd(38)}│`);
  }

  if (bagCount > BAG_VISIBLE_ROWS) {
    lines.push(
      `│${''.padEnd(22)}${lore('UI-INV-SCROLL')} ${scrollStart + 1}–${scrollEnd} / ${bagCount}`.padEnd(61) +
        '│',
    );
  }
  lines.push(`└${'─'.repeat(60)}┘`);

  if (selectedItem) {
    const def = ITEMS[selectedItem.kind];
    lines.push(`┌ ${lore(def.loreName).toUpperCase()}  ×${selectedItem.count}`);
    pushWrapped(lines, lore(def.loreDesc));
    if (equipSlotsFor(selectedItem.kind).length > 0) {
      for (const tag of equipTagLines(selectedItem.kind)) {
        lines.push(`│ ${lore('UI-KIT-TAGS')}: ${tag}`);
      }
    }
    lines.push(`│ ${itemActionHint(st, selectedItem.kind)}`);
    const power = kitPowerCost(st, selectedItem.kind);
    if (power !== null) {
      lines.push(`│ ${lore('UI-KIT-POWER')} ${power}  ${kitPowerTrough(power)}`);
    }
    lines.push(`└${'─'.repeat(60)}┘`);
  }

  const phaserStatus = phaserKitStatus(st, selectedItem?.kind);
  if (phaserStatus) {
    pushWrapped(lines, lore(phaserStatus));
  }

  const feedback = kitUseFeedback(st);
  if (feedback) {
    lines.push(`┌ ${lore('UI-KIT-FEEDBACK')}`);
    pushWrapped(lines, feedback);
    lines.push(`└${'─'.repeat(60)}┘`);
  }

  if (hasWornLoadout(st)) {
    const net = netLoadoutTagSummary(st);
    if (net.length > 0) {
      lines.push(`┌ ${lore('UI-LOADOUT-NET')}`);
      lines.push(`│ ${net.join(' · ')}`);
      lines.push(`└${'─'.repeat(60)}┘`);
    }
  }

  lines.push(lore('UI-INV-HINT'));

  const panelH = KIT_PANEL_PAD + lines.length * KIT_LINE_H;

  return { lines, panelW: pw, panelH };
}
