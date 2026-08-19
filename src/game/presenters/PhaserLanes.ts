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
} from '../../sim/phaser';
import { hasItem } from '../../sim/inventory';
import { hasStatus } from '../../sim/status';
import { Theme } from '../../scenes/theme';
import type { GameState } from '../../sim/types';

function once(state: GameState, id: string): boolean {
  if (state.scriptedFired[id]) return false;
  state.scriptedFired[id] = true;
  return true;
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

/** Paint 2–3 tile cardinal lanes when the survey phaser is worn. */
export function drawPhaserLanes(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  animFrame: number,
  tileDraw: number,
): void {
  if (!hasPhaserEquipped(st)) return;

  const ready = st.player.energy >= PHASER_ENERGY_COST;
  const pulse = 0.68 + (animFrame % 4) * 0.09;
  const fromX = st.player.x * tileDraw + tileDraw / 2;
  const fromY = st.player.y * tileDraw + tileDraw / 2;

  for (const [dx, dy] of PHASER_CARDINALS) {
    const { steps, target } = tracePhaserLane(st, dx, dy);
    const live = ready && target !== undefined;

    for (const s of steps) {
      if (s.step < PHASER_RANGE_MIN) continue;
      const left = s.x * tileDraw + 2;
      const top = s.y * tileDraw + 2;
      const size = tileDraw - 4;
      const isTarget = target !== undefined && target.x === s.x && target.y === s.y;

      if (isTarget && live) {
        g.lineStyle(2, Theme.arcWhite, 0.92 * pulse);
        g.strokeRect(left, top, size, size);
        g.fillStyle(Theme.arcWhite, 0.22 * pulse);
        g.fillRect(left + 1, top + 1, size - 2, size - 2);
      } else {
        g.fillStyle(Theme.scanWash, (ready ? 0.14 : 0.08) * pulse);
        g.fillRect(left + 2, top + 2, size - 4, size - 4);
        g.lineStyle(1, Theme.arc, (ready ? 0.45 : 0.22) * pulse);
        g.strokeRect(left, top, size, size);
      }
    }

    if (live && target) {
      const toX = target.x * tileDraw + tileDraw / 2;
      const toY = target.y * tileDraw + tileDraw / 2;
      g.lineStyle(1, Theme.arcWhite, 0.38 * pulse);
      g.beginPath();
      g.moveTo(fromX, fromY);
      g.lineTo(toX, toY);
      g.strokePath();
    }
  }
}
