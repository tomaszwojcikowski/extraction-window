import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';

/**
 * Sensor quiet stance — active while jammer timer runs.
 * FOV shrinks; fauna aggro shrinks (see ai.effectiveAggro). HUD shows SYS:Q.
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

  contextHint(_state: GameState): LoreId | null {
    return null;
  },

  autopilotHint(_state: GameState): Action | null {
    // Autopilot already uses jammer via generic policy — avoid double-spend
    return null;
  },
};
