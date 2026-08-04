import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';
import { EM_HIGH } from '../emStress';
import { hasItem } from '../inventory';

/**
 * Sensor quiet stance — active while jammer timer runs.
 * FOV shrinks; fauna aggro shrinks (see ai.effectiveAggro).
 * At EM-HIGH, quiet also suppresses emAggroBonus (see emStress).
 * HUD shows SYS:Q.
 */
export function isQuietStance(state: GameState): boolean {
  return state.player.jammerTurns > 0;
}

export const quietStanceMechanic: Mechanic = {
  id: 'quiet_stance',

  modifyFov(state: GameState, base: number): number {
    if (!isQuietStance(state)) return base;
    return Math.max(3, base - 1);
  },

  contextHint(state: GameState): LoreId | null {
    if (isQuietStance(state)) return null;
    if (state.emStress < EM_HIGH) return null;
    if (!hasItem(state, 'jammer')) return null;
    return 'UI-HINT-QUIET-EM';
  },

  autopilotHint(_state: GameState): Action | null {
    // Autopilot uses jammer via generic policy (incl. EM-HIGH) — avoid double-spend
    return null;
  },
};
