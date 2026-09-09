import type { LoreId } from '../../data/lore';
import type { Action, GameState } from '../../sim';
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

/** Short cardinal lance — long enough to read, short enough for corridor cadence. */
export const PHASER_BEAM_MS = 240;

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

/** Kit overlay status when the Survey Phaser is worn, selected, or sitting unworn in the bag. */
export function phaserKitStatus(st: GameState, selectedKind: string | undefined): LoreId | null {
  const worn = st.player.equip.tool === 'phaser';
  if (worn) {
    return st.player.energy >= PHASER_ENERGY_COST
      ? 'UI-PHASER-READY'
      : 'UI-PHASER-LOW';
  }
  if (hasItem(st, 'phaser') || selectedKind === 'phaser') return 'UI-PHASER-WEAR';
  return null;
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

/** Impact tile for phaser VFX — prefers combat hit tiles, then sim target lookup. */
export function phaserBeamTargetTile(
  newLogs: LoreId[],
  fromPlayer: { x: number; y: number },
  hitTiles: { x: number; y: number }[],
  action: Action,
  state: GameState,
): { x: number; y: number } | undefined {
  if (!newLogs.includes('LOG-USE-PHASER')) return undefined;
  const inRange = (t: { x: number; y: number }) => {
    const d = Math.abs(t.x - fromPlayer.x) + Math.abs(t.y - fromPlayer.y);
    return d >= PHASER_RANGE_MIN && d <= PHASER_RANGE_MAX;
  };
  const hit = hitTiles.find(inRange);
  if (hit) return hit;
  if (action.type === 'move') {
    const foe = findPhaserTarget(state, action.dx, action.dy);
    if (foe) return { x: foe.x, y: foe.y };
    const sx = Math.sign(action.dx);
    const sy = Math.sign(action.dy);
    if (sx === 0 && sy === 0) return undefined;
    for (let step = PHASER_RANGE_MIN; step <= PHASER_RANGE_MAX; step++) {
      const x = fromPlayer.x + sx * step;
      const y = fromPlayer.y + sy * step;
      const body = state.enemies.find((e) => e.x === x && e.y === y);
      if (body) return { x, y };
    }
  }
  return undefined;
}
