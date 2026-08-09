import type { Action, GameState } from '../types';
import type { Mechanic } from './types';
import type { LoreId } from '../../data/lore';
import { EM_HIGH } from '../emStress';
import { hasItem } from '../inventory';
import { inShadow } from '../light';
import { manhattan } from '../spatial';

/**
 * Quiet stance — active while EM Scrambler timer runs.
 * FOV shrinks; field lamp dims; fauna aggro shrinks.
 * At EM-HIGH, Quiet also suppresses emAggroBonus (see emStress).
 */
export function isQuietStance(state: GameState): boolean {
  return state.player.jammerTurns > 0;
}

function adjacentVisibleThreat(state: GameState): boolean {
  const { x, y } = state.player;
  return state.enemies.some(
    (e) =>
      e.alive &&
      (state.visible[e.y]?.[e.x] ?? false) &&
      manhattan(e.x, e.y, x, y) === 1,
  );
}

export const quietStanceMechanic: Mechanic = {
  id: 'quiet_stance',

  modifyFov(state: GameState, base: number): number {
    if (!isQuietStance(state)) return base;
    return Math.max(3, base - 2);
  },

  contextHint(state: GameState): LoreId | null {
    if (state.emStress >= EM_HIGH && !isQuietStance(state) && hasItem(state, 'jammer')) {
      return 'UI-HINT-QUIET-EM';
    }
    if (!isQuietStance(state)) return null;
    // One-shot after activating Quiet (badge + meta timer already show stance).
    if (!state.scriptedFired.quiet_hint) {
      state.scriptedFired.quiet_hint = true;
      return 'UI-HINT-QUIET';
    }
    // Soft-shadow ambush trade — once; never hog the hint line every turn.
    if (
      !state.scriptedFired.quiet_ambush_hint &&
      inShadow(state, state.player.x, state.player.y) &&
      adjacentVisibleThreat(state)
    ) {
      state.scriptedFired.quiet_ambush_hint = true;
      return 'UI-HINT-QUIET';
    }
    return null;
  },

  autopilotHint(_state: GameState): Action | null {
    return null;
  },
};
