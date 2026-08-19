import { playerAttack } from './combat';
import { pushLog } from './log';
import { randInt } from './rng';
import { allyAt, enemyAt, npcAt } from './spatial';
import { hasStatus } from './status';
import type { Enemy, GameState } from './types';

/** Worn phaser is a short cardinal lance — not adjacent melee, not a long dart. */
export const PHASER_RANGE_MIN = 2;
export const PHASER_RANGE_MAX = 3;
export const PHASER_ENERGY_COST = 4;

export function hasPhaserEquipped(state: GameState): boolean {
  return state.player.equip.tool === 'phaser';
}

export const PHASER_CARDINALS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export type PhaserLaneStep = { x: number; y: number; step: number };

/**
 * Trace a cardinal lane up to PHASER_RANGE_MAX — shared by sim fire checks and
 * field lane overlay.
 */
export function tracePhaserLane(
  state: GameState,
  dx: number,
  dy: number,
): { steps: PhaserLaneStep[]; target?: Enemy } {
  const steps: PhaserLaneStep[] = [];
  if ((dx === 0) === (dy === 0)) return { steps };
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return { steps };

  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  for (let step = 1; step <= PHASER_RANGE_MAX; step++) {
    const x = state.player.x + sx * step;
    const y = state.player.y + sy * step;
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) return { steps };
    const tile = state.tiles[y]![x]!;
    if (!tile.transparent) return { steps };
    if (allyAt(state, x, y) || npcAt(state, x, y)) return { steps };
    steps.push({ x, y, step });
    const foe = enemyAt(state, x, y);
    if (!foe) continue;
    if (step < PHASER_RANGE_MIN) return { steps };
    if (!(state.visible[y]?.[x] ?? false)) return { steps };
    return { steps, target: foe };
  }
  return { steps };
}

/** First hostile on a unit cardinal step at range 2–3, with a clear transparent lane. */
export function findPhaserTarget(
  state: GameState,
  dx: number,
  dy: number,
): Enemy | undefined {
  return tracePhaserLane(state, dx, dy).target;
}

/** True when any cardinal lane has a valid 2–3 tile shot (equip not required). */
export function phaserAnyTarget(state: GameState): boolean {
  return PHASER_CARDINALS.some(([dx, dy]) => findPhaserTarget(state, dx, dy) !== undefined);
}

export function firePhaser(state: GameState, enemy: Enemy): void {
  state.player.energy = Math.max(0, state.player.energy - PHASER_ENERGY_COST);
  pushLog(state, 'LOG-USE-PHASER', `-${PHASER_ENERGY_COST} Power`);
  playerAttack(state, enemy, randInt(state.rng, -1, 1));
}

/** True when a worn phaser spends the move on a 2–3 tile beam instead of a step. */
export function tryFirePhaser(state: GameState, dx: number, dy: number): boolean {
  if (!hasPhaserEquipped(state)) return false;
  if (hasStatus(state.player, 'downed')) return false;
  if (state.player.energy < PHASER_ENERGY_COST) return false;
  const foe = findPhaserTarget(state, dx, dy);
  if (!foe) return false;
  firePhaser(state, foe);
  return true;
}
