import { pushLog } from './combat';
import type { GameState } from './types';

/** ADOM-style corruption lite: tricorder EM agitates Theta-7 ecology. */
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

/** Extra EPS drip while EM-stressed (ADOM hunger/corruption pressure). */
export function emEnergyTax(state: GameState): number {
  if (state.emStress >= EM_HIGH) return 1;
  return 0;
}

/** Extra aggro range for EM-sensitive fauna. */
export function emAggroBonus(state: GameState): number {
  if (state.emStress >= EM_HIGH) return 1;
  if (state.emStress >= EM_WARN) return 1;
  return 0;
}
