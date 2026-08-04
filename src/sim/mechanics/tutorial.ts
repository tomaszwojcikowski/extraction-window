import type { LoreId } from '../../data/lore';
import { bfsPath } from '../fov';
import { inShadow } from '../light';
import { hasItem } from '../inventory';
import { pushLog } from '../log';
import type { Action, GameState } from '../types';
import type { Mechanic } from './types';

function once(state: GameState, id: string): boolean {
  if (state.scriptedFired[id]) return false;
  state.scriptedFired[id] = true;
  return true;
}

/**
 * First-run drill bay coaching — register early for contextHint priority.
 * Only active while `tutorialActive`; never stacks past skill pick / aiming
 * (those short-circuit in ContextHints before mechanics).
 */
export const tutorialMechanic: Mechanic = {
  id: 'tutorial',

  onSectorEnter(state: GameState): void {
    if (!state.tutorialActive) return;
    if (once(state, 'tut_welcome')) {
      pushLog(state, 'LOG-TUT-WELCOME');
    }
  },

  contextHint(state: GameState): LoreId | null {
    if (!state.tutorialActive) return null;

    // Until first turn resolves — teach movement
    if (state.turn === 0) return 'UI-TUT-MOVE';

    const underfoot = state.items.some(
      (i) => i.x === state.player.x && i.y === state.player.y,
    );
    if (underfoot) return 'UI-TUT-GET';

    const hasUnusedId =
      hasItem(state, 'salvage') ||
      hasItem(state, 'field_sample') ||
      hasItem(state, 'sealed_crate') ||
      hasItem(state, 'array_shard');
    if (hasUnusedId && state.turn < 8) return 'UI-TUT-KIT';

    const hostileVisible = state.enemies.some(
      (e) => e.alive && (state.visible[e.y]?.[e.x] ?? false),
    );
    if (hostileVisible) {
      const stalkerWinding = state.enemies.some(
        (e) => e.alive && e.kind === 'stalker' && e.windup > 0 && (state.visible[e.y]?.[e.x] ?? false),
      );
      if (stalkerWinding) return 'UI-TUT-STALKER';
      if (inShadow(state, state.player.x, state.player.y) && hasItem(state, 'flare')) {
        return 'UI-HINT-FLARE';
      }
      return 'UI-TUT-FIGHT';
    }

    return 'UI-TUT-EXIT';
  },

  autopilotHint(state: GameState): Action | null {
    if (!state.tutorialActive || !state.exitPos) return null;
    const { x, y } = state.player;
    if (x === state.exitPos.x && y === state.exitPos.y) {
      return { type: 'exit' };
    }
    const path = bfsPath(state.tiles, { x, y }, state.exitPos, (bx, by) =>
      state.enemies.some((e) => e.alive && e.x === bx && e.y === by),
    );
    if (path && path[0]) {
      return { type: 'move', dx: path[0].x - x, dy: path[0].y - y };
    }
    return { type: 'exit' };
  },
};
