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

function onOrAdjacentHazard(state: GameState): boolean {
  const { x, y } = state.player;
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const t = state.tiles[y + dy]?.[x + dx];
    if (t?.kind === 'hazard' || t?.kind === 'vent' || t?.kind === 'brine_pool') return true;
  }
  return false;
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

    // Until first turn resolves — teach movement + peek
    if (state.turn === 0) return 'UI-TUT-MOVE';

    const underfoot = state.items.some(
      (i) => i.x === state.player.x && i.y === state.player.y,
    );
    if (underfoot) return 'UI-TUT-GET';

    // Visible ion hazard — known path tax, not a hidden trap
    if (onOrAdjacentHazard(state)) {
      if (once(state, 'tut_hazard_log')) pushLog(state, 'LOG-TUT-HAZARD');
      return 'UI-TUT-HAZARD';
    }

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
        (e) =>
          e.alive &&
          e.kind === 'stalker' &&
          e.windup > 0 &&
          (state.visible[e.y]?.[e.x] ?? false),
      );
      if (stalkerWinding) return 'UI-TUT-STALKER';

      // Teach wake lines once before generic fight coaching
      if (!state.scriptedFired.tut_wake) {
        once(state, 'tut_wake');
        pushLog(state, 'LOG-TUT-WAKE');
        return 'UI-TUT-WAKE';
      }

      if (inShadow(state, state.player.x, state.player.y) && hasItem(state, 'flare')) {
        return 'UI-HINT-FLARE';
      }
      return 'UI-TUT-FIGHT';
    }

    const onHatch =
      state.tiles[state.player.y]?.[state.player.x]?.kind === 'exit' ||
      (state.exitPos !== null &&
        state.player.x === state.exitPos.x &&
        state.player.y === state.exitPos.y);
    if (onHatch) return 'UI-TUT-EXIT';
    return 'UI-TUT-GOTO-HATCH';
  },

  autopilotHint(state: GameState): Action | null {
    if (!state.tutorialActive || !state.exitPos) return null;
    const { x, y } = state.player;
    if (x === state.exitPos.x && y === state.exitPos.y) {
      return { type: 'exit' };
    }
    const blocked = (bx: number, by: number) =>
      state.enemies.some((e) => e.alive && e.x === bx && e.y === by);
    // Prefer south alcove while still west of it — skips stalker + ion tile.
    const alcove = { x: 12, y: 10 } as const;
    const useAlcove =
      x < alcove.x && (state.tiles[alcove.y]?.[alcove.x]?.walkable ?? false);
    const goal = useAlcove ? alcove : state.exitPos;
    const path = bfsPath(state.tiles, { x, y }, goal, blocked);
    if (path && path[0]) {
      return { type: 'move', dx: path[0].x - x, dy: path[0].y - y };
    }
    const direct = bfsPath(state.tiles, { x, y }, state.exitPos, blocked);
    if (direct && direct[0]) {
      return { type: 'move', dx: direct[0].x - x, dy: direct[0].y - y };
    }
    return { type: 'exit' };
  },
};
