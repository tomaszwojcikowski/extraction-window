import type { LoreId } from '../../data/lore';
import { ITEMS } from '../../data/items';
import { ENEMIES } from '../../data/enemies';
import {
  EXPLORE_BONUS_THRESHOLD,
} from '../../data/progression';
import type { GameState } from '../../sim';
import { hasItem } from '../../sim/inventory';
import { inShadow } from '../../sim/light';
import { mechanicsContextHint } from '../../sim/mechanics';
import { exploredFloorRatio } from '../../sim/mechanics/survey';
import { shouldShowPeekTeach } from './PeekTeach';

/** Pure contextual hint for the field HUD — no Phaser / scene state. */
export function contextHint(st: GameState): LoreId | null {
  // Skill pick locks movement — never show vitals tips that ask for i/u/WASD
  if (st.skillPick) return 'UI-HINT-SKILL';
  if (st.ui.aimingDart) return 'UI-HINT-AIM';

  const fromMechanic = mechanicsContextHint(st);
  // The first-run drill deliberately teaches its bespoke stalker response.
  if (st.tutorialActive && fromMechanic) return fromMechanic;

  const telegraphed = st.enemies.some(
    (e) =>
      e.alive &&
      (st.visible[e.y]?.[e.x] ?? false) &&
      e.windup > 0,
  );
  if (telegraphed) return 'UI-HINT-TELE';

  if (fromMechanic) return fromMechanic;

  const brandedVisible = st.enemies.some(
    (e) => e.alive && ENEMIES[e.kind].brand && (st.visible[e.y]?.[e.x] ?? false),
  );
  if (brandedVisible) return 'UI-HINT-BRAND';
  if (st.allies.some((a) => a.alive && a.kind === 'probe_drone')) return 'UI-HINT-ALLY-DRONE';
  if (
    st.allies.some(
      (a) =>
        a.alive &&
        a.kind === 'away_escort' &&
        Math.abs(a.x - st.player.x) + Math.abs(a.y - st.player.y) === 1,
    )
  ) {
    return 'UI-HINT-ALLY-ESCORT';
  }

  const tile = st.tiles[st.player.y]![st.player.x]!;
  if (tile.kind === 'exit') return 'UI-HINT-EXIT';
  if (tile.kind === 'beacon') return 'UI-HINT-BEACON';
  if (tile.kind === 'shuttle') return 'UI-HINT-SHUTTLE';
  if (tile.kind === 'quest') return 'UI-HINT-QUEST';
  if (st.items.some((i) => i.x === st.player.x && i.y === st.player.y)) return 'UI-HINT-ITEM';

  // Situation coaching — only when the kit actually has the tool
  if (
    (tile.kind === 'hazard' || tile.kind === 'vent' || tile.kind === 'brine_pool') &&
    hasItem(st, 'sealant')
  ) {
    return 'UI-HINT-USE-SEALANT';
  }
  const adjSealed = (
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const
  ).some(([dx, dy]) => {
    const t = st.tiles[st.player.y + dy]?.[st.player.x + dx];
    return t?.kind === 'sealed';
  });
  if (adjSealed && hasItem(st, 'sealant')) {
    return 'UI-HINT-USE-SEALANT';
  }
  // Quiet ambush trade is one-shot via quietStanceMechanic — do not re-hog here.
  if (
    inShadow(st, st.player.x, st.player.y) &&
    hasItem(st, 'flare') &&
    st.enemies.some(
      (e) =>
        e.alive &&
        Math.abs(e.x - st.player.x) + Math.abs(e.y - st.player.y) <= 3,
    )
  ) {
    return 'UI-HINT-FLARE';
  }
  if ((st.player.statuses.bleed ?? 0) > 0 && hasItem(st, 'patch')) {
    return 'UI-HINT-USE-PATCH';
  }
  if (st.player.hp <= st.player.maxHp * 0.4 && hasItem(st, 'med')) {
    return 'UI-HINT-USE-MED';
  }
  if (
    st.player.energy <= st.player.maxEnergy * 0.35 &&
    (hasItem(st, 'energy') || hasItem(st, 'coolant') || hasItem(st, 'battery'))
  ) {
    return 'UI-HINT-USE-ENERGY';
  }
  if (
    st.player.armor <= 3 &&
    st.player.maxArmor > 0 &&
    hasItem(st, 'plate')
  ) {
    return 'UI-HINT-USE-ARMOR';
  }

  // Unequipped wearables still in kit
  for (const slot of st.inventory) {
    const eq = ITEMS[slot.kind].equipSlot;
    if (!eq) continue;
    if (st.player.equip[eq] !== slot.kind) return 'UI-HINT-EQUIP';
  }

  const explore = exploredFloorRatio(st);
  if (
    st.exitPos &&
    explore >= EXPLORE_BONUS_THRESHOLD * 0.82 &&
    explore < EXPLORE_BONUS_THRESHOLD
  ) {
    return 'UI-HINT-EXPLORE';
  }

  return null;
}

export type HintLineContext = {
  /** Shift-peek held — the commit tip owns the line. */
  movePreviewActive?: boolean;
};

/**
 * The single hint-line channel, resolved once: peek tip → context coaching →
 * one-shot Shift-peek teach. HUD drawing and the Escape handler must agree on
 * what is actually on screen, so both go through here (DESIGN_PRINCIPLES §2).
 */
export function resolveHintLine(st: GameState, ctx: HintLineContext = {}): LoreId | null {
  const overlayOwnsLine = Boolean(st.ui.inventoryOpen || st.skillPick || st.ui.aimingDart);
  if (ctx.movePreviewActive) {
    if (!overlayOwnsLine) return 'UI-HINT-COMMIT';
    return contextHint(st);
  }
  const hint = contextHint(st);
  if (!overlayOwnsLine && shouldShowPeekTeach(st, hint)) return 'UI-HINT-PEEK-TEACH';
  return hint;
}
