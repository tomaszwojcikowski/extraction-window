import { pushLog } from './log';
import type { GameState } from './types';

/**
 * Window burn is not one unit per turn.
 *
 * Late sectors tax the extract clock, so a turn spent in the vault costs two
 * and a half times what the same turn costs out on the flats. The tick and the
 * readout both resolve the rate here: while the tax lived inline in the turn
 * loop the HUD went on counting in units the sim had stopped spending at
 * sector 8, and a player reading "240 left" in the vault actually had 96 turns.
 */

/**
 * First sector that taxes the Window, and the one that taxes it hardest.
 *
 * The heavy tax used to start at the vault, which is where the Nav Lattice is:
 * the run was charged its steepest clock rate for doing the one thing the spine
 * requires. Measured, the vault was the single most expensive sector in 17 of
 * 44 Window losses at a median 55 turns against a winner's 29. Peak pressure
 * belongs on the run home, so it starts at the fissure instead.
 */
const TAX_FROM = 8;
const HEAVY_TAX_FROM = 12;

/** Turns-remaining marks that earn a warning, crossed downward. */
const WARN_AT_TURNS = [200, 80, 50, 20];

/**
 * Units this specific turn costs. The mid tax alternates rather than charging a
 * half, so the counter stays whole.
 */
export function windowDrainAt(sectorIndex: number, turn: number): number {
  let drain = 1;
  if (sectorIndex >= TAX_FROM && turn % 2 === 0) drain += 1;
  if (sectorIndex >= HEAVY_TAX_FROM) drain += 1;
  return drain;
}

/** Average units per turn at this depth — the rate the player plans against. */
export function windowDrainRate(sectorIndex: number): number {
  return 1 + (sectorIndex >= TAX_FROM ? 0.5 : 0) + (sectorIndex >= HEAVY_TAX_FROM ? 1 : 0);
}

/** Window remaining converted to turns at the current burn rate. */
export function windowTurnsLeft(state: GameState): number {
  return Math.max(0, Math.floor(state.stormTurns / windowDrainRate(state.sectorIndex)));
}

/**
 * Spend Window and warn on crossing a turns-remaining mark. Marks are counted in
 * turns rather than units so the last warning is the same amount of playable
 * time everywhere; on units it was 80 turns of notice on the flats and 32 in
 * the vault, which is where the notice is worth the most.
 */
export function spendWindow(state: GameState, units: number): void {
  const before = windowTurnsLeft(state);
  state.stormTurns -= units;
  const after = windowTurnsLeft(state);
  if (WARN_AT_TURNS.some((mark) => before > mark && after <= mark)) {
    pushLog(state, 'LOG-STORM-WARN');
  }
}
