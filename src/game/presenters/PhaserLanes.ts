import Phaser from 'phaser';
import type { LoreId } from '../../data/lore';
import {
  hasPhaserEquipped,
  PHASER_CARDINALS,
  PHASER_ENERGY_COST,
  PHASER_RANGE_MAX,
  PHASER_RANGE_MIN,
  phaserAnyTarget,
  tracePhaserLane,
} from '../../sim/phaser';
import { hasItem } from '../../sim/inventory';
import { hasStatus } from '../../sim/status';
import { Theme } from '../../scenes/theme';
import type { Enemy, GameState } from '../../sim/types';

function once(state: GameState, id: string): boolean {
  if (state.scriptedFired[id]) return false;
  state.scriptedFired[id] = true;
  return true;
}

/** Count cardinal lanes with a valid 2–3 tile shot while phaser is worn and powered. */
export function phaserLiveLaneCount(st: GameState): number {
  if (!hasPhaserEquipped(st) || st.player.energy < PHASER_ENERGY_COST) return 0;
  let n = 0;
  for (const [dx, dy] of PHASER_CARDINALS) {
    if (tracePhaserLane(st, dx, dy).target) n++;
  }
  return n;
}

/** Visible cardinal hostiles that are too close, too far, or blocked for a beam. */
export function phaserNeedsRangeCoach(st: GameState): boolean {
  if (phaserAnyTarget(st)) return false;
  const px = st.player.x;
  const py = st.player.y;
  for (const en of st.enemies) {
    if (!en.alive || !(st.visible[en.y]?.[en.x] ?? false)) continue;
    const dx = en.x - px;
    const dy = en.y - py;
    if (dx !== 0 && dy !== 0) continue;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist === 0) continue;
    if (dist === 1) return true;
    if (dist > PHASER_RANGE_MAX) return true;
    const lane = tracePhaserLane(st, Math.sign(dx), Math.sign(dy));
    if (!lane.target) return true;
  }
  return false;
}

/** Contextual phaser coaching — equip, range band, and fire readiness. */
export function phaserContextHint(st: GameState): LoreId | null {
  if (hasStatus(st.player, 'downed')) return null;
  if (st.ui.aimingDart || st.ui.inventoryOpen) return null;

  const equipped = hasPhaserEquipped(st);
  const inKit = hasItem(st, 'phaser');

  if (equipped && once(st, 'teach_phaser')) {
    return 'UI-HINT-PHASER-TEACH';
  }

  if (equipped) {
    if (st.player.energy < PHASER_ENERGY_COST) {
      if (phaserAnyTarget(st)) return 'UI-HINT-PHASER-LOW';
      return null;
    }
    if (phaserAnyTarget(st)) return 'UI-HINT-PHASER-FIRE';
    if (phaserNeedsRangeCoach(st)) return 'UI-HINT-PHASER-RANGE';
    return null;
  }

  if (inKit && phaserAnyTarget(st)) {
    // Drill bay teaches flare/stalker before the phaser bay — don't steal that beat.
    if (st.tutorialActive && !st.scriptedFired.tut_phaser_fired) return null;
    return 'UI-HINT-PHASER-EQUIP';
  }
  return null;
}

/** Kit overlay status when phaser is worn or selected. */
export function phaserKitStatus(st: GameState, selectedKind: string | undefined): LoreId | null {
  const worn = st.player.equip.tool === 'phaser';
  const selected = selectedKind === 'phaser';
  if (!worn && !selected) return null;
  if (worn) {
    return st.player.energy >= PHASER_ENERGY_COST
      ? 'UI-PHASER-READY'
      : 'UI-PHASER-LOW';
  }
  return 'UI-PHASER-WEAR';
}

export type PhaserTrackRole = 'band' | 'target';

export type PhaserTrackMark = {
  x: number;
  y: number;
  role: PhaserTrackRole;
  live: boolean;
};

/** Range-band tiles the overlay should mark — idle ticks vs live target. */
export function phaserTrackMarks(st: GameState): PhaserTrackMark[] {
  if (!hasPhaserEquipped(st)) return [];
  const ready = st.player.energy >= PHASER_ENERGY_COST;
  const marks: PhaserTrackMark[] = [];
  for (const [dx, dy] of PHASER_CARDINALS) {
    const { steps, target } = tracePhaserLane(st, dx, dy);
    const live = ready && target !== undefined;
    for (const s of steps) {
      if (s.step < PHASER_RANGE_MIN || s.step > PHASER_RANGE_MAX) continue;
      const isTarget = target !== undefined && target.x === s.x && target.y === s.y;
      marks.push({
        x: s.x,
        y: s.y,
        role: isTarget && live ? 'target' : 'band',
        live,
      });
    }
  }
  return marks;
}

function tileRect(x: number, y: number, tileDraw: number): { left: number; top: number; size: number } {
  const pad = 3;
  return { left: x * tileDraw + pad, top: y * tileDraw + pad, size: tileDraw - pad * 2 };
}

/** Short corner ticks — reads as kit flagging, not a HUD plate. */
function drawCornerTicks(
  g: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  size: number,
  color: number,
  alpha: number,
  armScale: number,
): void {
  const inset = 1;
  const arm = Math.max(2, Math.floor(size * armScale));
  g.lineStyle(1, color, alpha);
  const corners: [number, number, number, number][] = [
    [left + inset, top + inset, 1, 1],
    [left + size - inset, top + inset, -1, 1],
    [left + inset, top + size - inset, 1, -1],
    [left + size - inset, top + size - inset, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    g.beginPath();
    g.moveTo(cx, cy + sy * arm);
    g.lineTo(cx, cy);
    g.lineTo(cx + sx * arm, cy);
    g.strokePath();
  }
}

/** Hairline spine on a live lane — no halo, no chevron. */
function drawLaneSpine(
  g: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  target: Enemy,
  tileDraw: number,
  alpha: number,
): void {
  const toX = target.x * tileDraw + tileDraw / 2;
  const toY = target.y * tileDraw + tileDraw / 2;
  g.lineStyle(1, Theme.scanWash, 0.22 * alpha);
  g.beginPath();
  g.moveTo(fromX, fromY);
  g.lineTo(toX, toY);
  g.strokePath();
}

/** Paint cardinal tracking ticks when the survey phaser is worn. */
export function drawPhaserLanes(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  animFrame: number,
  tileDraw: number,
): void {
  if (!hasPhaserEquipped(st)) return;

  const ready = st.player.energy >= PHASER_ENERGY_COST;
  const breathe = 0.86 + (animFrame % 6) * 0.02;
  const fromX = st.player.x * tileDraw + tileDraw / 2;
  const fromY = st.player.y * tileDraw + tileDraw / 2;
  const marks = phaserTrackMarks(st);
  const focusLive = marks.some((m) => m.role === 'target');

  for (const m of marks) {
    const laneAlpha = focusLive ? (m.live ? 1 : 0.28) : 1;
    const { left, top, size } = tileRect(m.x, m.y, tileDraw);
    if (m.role === 'target') {
      drawCornerTicks(g, left, top, size, Theme.arcWhite, 0.42 * laneAlpha * breathe, 0.18);
    } else {
      drawCornerTicks(
        g,
        left,
        top,
        size,
        ready ? Theme.scanWash : Theme.inkMute,
        (ready ? 0.2 : 0.12) * laneAlpha,
        0.12,
      );
    }
  }

  for (const [dx, dy] of PHASER_CARDINALS) {
    const { target } = tracePhaserLane(st, dx, dy);
    if (target && ready) drawLaneSpine(g, fromX, fromY, target, tileDraw, 1);
  }
}
