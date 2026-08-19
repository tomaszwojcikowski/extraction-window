import Phaser from 'phaser';
import type { LoreId } from '../../data/lore';
import {
  findPhaserTarget,
  hasPhaserEquipped,
  PHASER_CARDINALS,
  PHASER_ENERGY_COST,
  PHASER_RANGE_MAX,
  PHASER_RANGE_MIN,
  phaserAnyTarget,
  tracePhaserLane,
  type PhaserLaneStep,
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

  if (inKit && phaserAnyTarget(st)) return 'UI-HINT-PHASER-EQUIP';
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

function tileRect(x: number, y: number, tileDraw: number): { left: number; top: number; size: number } {
  const pad = 2;
  return { left: x * tileDraw + pad, top: y * tileDraw + pad, size: tileDraw - pad * 2 };
}

/** Corner-bracket reticle on the tile that will eat the beam. */
function drawTargetReticle(
  g: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  size: number,
  alpha: number,
): void {
  const inset = 3;
  const arm = Math.max(5, Math.floor(size * 0.28));
  g.lineStyle(2, Theme.arcWhite, alpha);
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
  g.lineStyle(1, Theme.scanWash, alpha * 0.55);
  g.strokeRect(left + 1, top + 1, size - 2, size - 2);
}

/** Step-1 tile — phaser band starts at 2; adjacent stays melee. */
function drawMeleeBandTile(
  g: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  size: number,
  alpha: number,
): void {
  g.lineStyle(1, Theme.arc, alpha * 0.55);
  g.strokeRect(left, top, size, size);
  g.lineStyle(1, Theme.rust, alpha * 0.35);
  const inset = 4;
  g.lineBetween(left + inset, top + inset, left + size - inset, top + size - inset);
  g.lineBetween(left + size - inset, top + inset, left + inset, top + size - inset);
}

function drawBandTile(
  g: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  size: number,
  ready: boolean,
  alpha: number,
  step: number,
): void {
  const inBand = step >= PHASER_RANGE_MIN && step <= PHASER_RANGE_MAX;
  if (!inBand) return;
  const fillA = (ready ? 0.22 : 0.1) * alpha;
  g.fillStyle(Theme.scanWash, fillA);
  g.fillRect(left + 1, top + 1, size - 2, size - 2);
  g.lineStyle(ready ? 2 : 1, Theme.arc, (ready ? 0.72 : 0.32) * alpha);
  g.strokeRect(left, top, size, size);
  const cx = left + size / 2;
  const cy = top + size / 2;
  g.fillStyle(Theme.arcWhite, (ready ? 0.85 : 0.4) * alpha);
  g.fillCircle(cx, cy, step === PHASER_RANGE_MIN ? 2 : 1.5);
}

function drawLaneBeam(
  g: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  target: Enemy,
  tileDraw: number,
  alpha: number,
  live: boolean,
): void {
  const toX = target.x * tileDraw + tileDraw / 2;
  const toY = target.y * tileDraw + tileDraw / 2;
  const halo = live ? 5 : 3;
  g.lineStyle(halo, Theme.scanWash, (live ? 0.28 : 0.12) * alpha);
  g.beginPath();
  g.moveTo(fromX, fromY);
  g.lineTo(toX, toY);
  g.strokePath();
  g.lineStyle(live ? 2 : 1, Theme.arcWhite, (live ? 0.82 : 0.35) * alpha);
  g.beginPath();
  g.moveTo(fromX, fromY);
  g.lineTo(toX, toY);
  g.strokePath();

  const dx = Math.sign(target.x * tileDraw + tileDraw / 2 - fromX);
  const dy = Math.sign(target.y * tileDraw + tileDraw / 2 - fromY);
  const midX = fromX + dx * tileDraw * 0.55;
  const midY = fromY + dy * tileDraw * 0.55;
  const chev = tileDraw * 0.14;
  g.lineStyle(1, Theme.arcWhite, (live ? 0.7 : 0.3) * alpha);
  if (dx !== 0) {
    g.lineBetween(midX - dx * chev, midY - chev, midX, midY);
    g.lineBetween(midX - dx * chev, midY + chev, midX, midY);
  } else {
    g.lineBetween(midX - chev, midY - dy * chev, midX, midY);
    g.lineBetween(midX + chev, midY - dy * chev, midX, midY);
  }
}

function enemyOnStep(st: GameState, s: PhaserLaneStep): Enemy | undefined {
  return st.enemies.find((e) => e.alive && e.x === s.x && e.y === s.y);
}

/** Paint cardinal lanes when the survey phaser is worn — range band, reticle, beam guide. */
export function drawPhaserLanes(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  animFrame: number,
  tileDraw: number,
): void {
  if (!hasPhaserEquipped(st)) return;

  const ready = st.player.energy >= PHASER_ENERGY_COST;
  const pulse = 0.72 + (animFrame % 4) * 0.08;
  const fromX = st.player.x * tileDraw + tileDraw / 2;
  const fromY = st.player.y * tileDraw + tileDraw / 2;
  const liveCount = phaserLiveLaneCount(st);
  const focusLive = ready && liveCount > 0;

  for (const [dx, dy] of PHASER_CARDINALS) {
    const { steps, target } = tracePhaserLane(st, dx, dy);
    const live = ready && target !== undefined;
    const laneAlpha = focusLive ? (live ? 1 : 0.22) : pulse;

    for (const s of steps) {
      const { left, top, size } = tileRect(s.x, s.y, tileDraw);
      const isTarget = target !== undefined && target.x === s.x && target.y === s.y;
      const foe = enemyOnStep(st, s);

      if (s.step === 1) {
        if (foe && !isTarget) drawMeleeBandTile(g, left, top, size, laneAlpha);
        continue;
      }

      if (isTarget && live) {
        g.fillStyle(Theme.arcWhite, 0.18 * laneAlpha);
        g.fillRect(left, top, size, size);
        drawTargetReticle(g, left, top, size, 0.95 * laneAlpha);
      } else {
        drawBandTile(g, left, top, size, ready, laneAlpha, s.step);
      }
    }

    if (target && ready) {
      drawLaneBeam(g, fromX, fromY, target, tileDraw, laneAlpha, live);
    } else if (steps.length > 0 && !focusLive) {
      const last = steps[steps.length - 1]!;
      const { left, top, size } = tileRect(last.x, last.y, tileDraw);
      g.lineStyle(1, Theme.inkMute, 0.25 * pulse);
      g.strokeRect(left, top, size, size);
    }
  }
}
