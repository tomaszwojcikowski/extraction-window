import { pushLog } from './log';
import type { GameState } from './types';

/**
 * Power remaining marks that earn a warning, crossed downward.
 * Same idea as the Window turns marks — notice before the clock actually kills.
 */
export const BUS_WARN_AT = [40, 20, 8] as const;
/** HUD / hint: Power is the live kill clock. */
export const BUS_CRITICAL = 20;

export function busIsCritical(state: GameState): boolean {
  return state.busFailing || state.player.energy <= BUS_CRITICAL;
}

/**
 * Clamp the bus and warn when a remaining-power mark is crossed this turn.
 * Hitting 0 is owned by `checkLose` (failing grace, then death).
 */
export function tickBusPressure(state: GameState, energyBefore: number): void {
  const after = Math.max(0, state.player.energy);
  state.player.energy = after;
  if (after <= 0) return;
  if (BUS_WARN_AT.some((mark) => energyBefore > mark && after <= mark)) {
    pushLog(state, 'LOG-BUS-WARN');
  }
}
