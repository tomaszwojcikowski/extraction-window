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

/** Clamp bag selection into a legal index (empty bag → 0). */
export function clampKitSelection(selected: number, bagCount: number): number {
  if (bagCount <= 0) return 0;
  return Math.max(0, Math.min(selected, bagCount - 1));
}

function slotHotkey(index: number): string {
  if (index < 9) return String(index + 1);
  if (index === 9) return '0';
  return '·';
}

export function kitPowerCost(state: GameState, kind: ItemKind): number | null {
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

/** Power readiness for the selected kit spend — shown before the player presses u. */
export function kitPowerReadiness(
  state: GameState,
  cost: number,
): { ready: boolean; line: string } {
  const have = state.player.energy;
  if (have >= cost) {
    return {
      ready: true,
      line: `${lore('UI-KIT-POWER')} ${cost}  ${kitPowerTrough(cost)}  ${lore('UI-KIT-POWER-HAVE')} ${have} · ${lore('UI-KIT-POWER-READY')}`,
    };
  }
  const short = cost - have;
  return {
    ready: false,
    line: `${lore('UI-KIT-POWER')} ${cost}  ${kitPowerTrough(cost)}  ${lore('UI-KIT-POWER-HAVE')} ${have} · ${lore('UI-KIT-POWER-SHORT')} ${short}`,
  };
}

function wornSlotLabel(state: GameState, kind: ItemKind): string | null {
  for (const slotId of EQUIP_SLOT_ORDER) {
    if (state.player.equip[slotId] === kind) return lore(EQUIP_SLOT_LORE[slotId]);
  }
  return null;
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
  const mark = worn && worn === selectedKind ? '▶' : ' ';
  const name = shortEquipName(worn);
  return `${mark}${label.padEnd(5)} ${name}`;
}

function formatBagRow(state: GameState, index: number, selected: number): string {
  const slot = state.inventory[index];
  if (!slot) return '';
  const selectedRow = index === selected;
  const mark = selectedRow ? '▶' : ' ';
  const key = slotHotkey(index);
  const name = lore(ITEMS[slot.kind].loreName);
  const def = ITEMS[slot.kind];
  let tag = ' ';
  if (isItemWorn(state, slot.kind)) {
    const worn = wornSlotLabel(state, slot.kind);
    tag = worn ? `◆${worn.slice(0, 4)}` : '◆';
  } else if (def.equipSlot || def.equipSlots?.length) {
    tag = '·eq';
  } else if (def.quest) {
    tag = '·q';
  }
  const body = `${key.padStart(2)} ${name.padEnd(16).slice(0, 16)} ${tag.padEnd(6)} ×${slot.count}`;
  return selectedRow ? `${mark}${body}` : ` ${body}`;
}

export type KitOverlayContent = {
  lines: string[];
  panelW: number;
  panelH: number;
  /** Line index of the primary action CTA — for chrome accent. */
  actionLine: number | null;
  powerShort: boolean;
};

/** Pure kit panel copy — testable without Phaser. */
export function buildKitOverlayContent(st: GameState): KitOverlayContent {
  const pw = 548;
  const bagCount = st.inventory.length;
  const selected = clampKitSelection(st.ui.selectedSlot, bagCount);
  const selectedItem = st.inventory[selected];
  const selectedKind = selectedItem?.kind ?? null;
  const scrollStart = bagScrollStart(selected, bagCount);
  const scrollEnd = Math.min(bagCount, scrollStart + BAG_VISIBLE_ROWS);
  const moreAbove = scrollStart > 0;
  const moreBelow = scrollEnd < bagCount;

  const lines: string[] = [];
  let actionLine: number | null = null;
  let powerShort = false;

  const bagLabel = encumbered(st)
    ? `${lore('UI-INV-BAG')} ${bagCount}/${INVENTORY_SLOTS} · ${lore('UI-ENCUMBERED')}`
    : `${lore('UI-INV-BAG')} ${bagCount}/${INVENTORY_SLOTS}`;

  lines.push(`${lore('UI-LOADOUT').padEnd(22)}${bagLabel}`);
  lines.push(`┌${'─'.repeat(21)}┬${'─'.repeat(38)}┐`);

  for (let row = 0; row < BAG_VISIBLE_ROWS; row++) {
    const slotId = EQUIP_SLOT_ORDER[row]!;
    const left = formatLoadoutRow(st, slotId, selectedKind);
    const bagIndex = scrollStart + row;
    let right = '';
    if (bagCount === 0 && row === 0) {
      right = lore('UI-EMPTY-INV');
    } else if (bagIndex < scrollEnd) {
      right = formatBagRow(st, bagIndex, selected);
    } else if (row === 0 && moreAbove) {
      right = lore('UI-KIT-SCROLL-UP');
    }
    lines.push(`│${left.padEnd(21)}│${right.padEnd(38)}│`);
  }

  if (bagCount > BAG_VISIBLE_ROWS) {
    const range = `${scrollStart + 1}–${scrollEnd} / ${bagCount}`;
    const cue = moreBelow
      ? `${lore('UI-KIT-SCROLL-DOWN')}  ${range}`
      : moreAbove
        ? `${lore('UI-KIT-SCROLL-UP')}  ${range}`
        : `${lore('UI-INV-SCROLL')} ${range}`;
    lines.push(`│${''.padEnd(21)}│${cue.padEnd(38)}│`);
  }
  lines.push(`└${'─'.repeat(21)}┴${'─'.repeat(38)}┘`);

  if (selectedItem) {
    const def = ITEMS[selectedItem.kind];
    lines.push(`┌ ${lore(def.loreName).toUpperCase()}  ×${selectedItem.count}`);
    actionLine = lines.length;
    lines.push(`│ ▶ ${itemActionHint(st, selectedItem.kind)}`);
    pushWrapped(lines, lore(def.loreDesc));
    if (equipSlotsFor(selectedItem.kind).length > 0) {
      for (const tag of equipTagLines(selectedItem.kind)) {
        lines.push(`│ ${lore('UI-KIT-TAGS')}: ${tag}`);
      }
    }
    const power = kitPowerCost(st, selectedItem.kind);
    if (power !== null) {
      const readiness = kitPowerReadiness(st, power);
      powerShort = !readiness.ready;
      lines.push(`│ ${readiness.line}`);
    }
    lines.push(`└${'─'.repeat(60)}┘`);
  } else if (bagCount === 0) {
    lines.push(`┌ ${lore('UI-EMPTY-INV')}`);
    lines.push(`│ ${lore('UI-KIT-EMPTY-TIP')}`);
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

  return { lines, panelW: pw, panelH, actionLine, powerShort };
}
