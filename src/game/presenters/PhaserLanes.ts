import Phaser from 'phaser';
import {
  hasPhaserEquipped,
  PHASER_CARDINALS,
  PHASER_ENERGY_COST,
  tracePhaserLane,
} from '../../sim/phaser';
import { Theme } from '../../scenes/theme';
import type { Enemy, GameState } from '../../sim/types';
import { phaserTrackMarks } from './phaserTells';

export {
  PHASER_BEAM_MS,
  phaserBeamTargetTile,
  phaserContextHint,
  phaserKitStatus,
  phaserLiveLaneCount,
  phaserNeedsRangeCoach,
  phaserTrackMarks,
} from './phaserTells';
export type { PhaserTrackMark, PhaserTrackRole } from './phaserTells';

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
