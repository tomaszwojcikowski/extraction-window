import { pushLog } from './log';
import type { GameState } from './types';

/** ADOM-style corruption lite: field-array EM agitates Meridian Shelf ecology. */
export const EM_WARN = 35;
export const EM_HIGH = 65;
export const EM_MAX = 100;

export function addEmStress(state: GameState, amount: number, detail?: string): void {
  if (amount <= 0) return;
  const prev = state.emStress;
  state.emStress = Math.min(EM_MAX, state.emStress + amount);
  if (prev < EM_WARN && state.emStress >= EM_WARN) {
    pushLog(state, 'LOG-EM-WARN', detail);
  } else if (prev < EM_HIGH && state.emStress >= EM_HIGH) {
    pushLog(state, 'LOG-EM-HIGH', detail);
  }
}

export function purgeEmStress(state: GameState, amount: number): void {
  if (amount <= 0) return;
  const prev = state.emStress;
  state.emStress = Math.max(0, state.emStress - amount);
  if (prev > 0 && amount > 0) {
    pushLog(state, 'LOG-EM-PURGE', `-${Math.min(prev, amount)}`);
  }
}

/** Extra bus drip while EM-stressed (ADOM hunger/corruption pressure). */
export function emEnergyTax(state: GameState): number {
  if (state.emStress >= EM_HIGH) return 1;
  return 0;
}

/**
 * Extra aggro range for EM-sensitive fauna.
 * Quiet stance (jammer) at EM-HIGH fully suppresses the contamination bump —
 * FOV cost still applies via quietStance.modifyFov.
 */
export function emAggroBonus(state: GameState): number {
  if (state.emStress < EM_WARN) return 0;
  if (state.emStress >= EM_HIGH && state.player.jammerTurns > 0) return 0;
  return 1;
}
