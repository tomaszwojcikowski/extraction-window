import type { LoreId } from '../../data/lore';
import { bfsPath } from '../fov';
import { inShadow } from '../light';
import { hasItem } from '../inventory';
import { pushLog } from '../log';
import { wouldNoticeEnemy } from '../notice';
import { findPhaserTarget, hasPhaserEquipped } from '../phaser';
import { inPhaserBay, PHASER_STAND } from '../../map/tutorialMap';
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
    if (t?.kind === 'hazard' || t?.kind === 'vent' || t?.kind === 'sump') return true;
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

  onEndTurn(state: GameState): void {
    if (!state.tutorialActive) return;
    if (state.log.some((l) => l.loreId === 'LOG-USE-PHASER')) {
      state.scriptedFired.tut_phaser_fired = true;
    }
  },

  contextHint(state: GameState): LoreId | null {
    if (!state.tutorialActive) return null;

    // Until first turn resolves — teach movement + wait
    if (state.turn === 0) return 'UI-TUT-MOVE';

    // Once: hooded lamp / LIT·SHADOW — teach when SHADOW first matters (map already speaks LIT).
    if (
      !state.scriptedFired.tut_light &&
      inShadow(state, state.player.x, state.player.y)
    ) {
      once(state, 'tut_light');
      return 'UI-TUT-LIGHT';
    }

    // Visible ion hazard — known path tax, not a hidden trap
    if (onOrAdjacentHazard(state)) {
      if (once(state, 'tut_hazard_log')) pushLog(state, 'LOG-TUT-HAZARD');
      return 'UI-TUT-HAZARD';
    }

    if (hasItem(state, 'salvage') && state.turn < 8) return 'UI-TUT-KIT';

    const corridorHostile = state.enemies.some(
      (e) =>
        e.alive &&
        e.kind === 'stalker' &&
        (state.visible[e.y]?.[e.x] ?? false),
    );
    if (corridorHostile) {
      const stalkerWinding = state.enemies.some(
        (e) =>
          e.alive &&
          e.kind === 'stalker' &&
          e.windup > 0 &&
          (state.visible[e.y]?.[e.x] ?? false),
      );
      if (stalkerWinding) return 'UI-TUT-STALKER';

      const px = state.player.x;
      const py = state.player.y;
      const wakeActive = state.enemies.some(
        (e) =>
          e.alive &&
          e.kind === 'stalker' &&
          (state.visible[e.y]?.[e.x] ?? false) &&
          wouldNoticeEnemy(state, e, px, py),
      );
      if (wakeActive && !state.scriptedFired.tut_wake) {
        once(state, 'tut_wake');
        return 'UI-TUT-WAKE';
      }

      if (inShadow(state, state.player.x, state.player.y) && hasItem(state, 'flare')) {
        return 'UI-HINT-FLARE';
      }
      return 'UI-TUT-FIGHT';
    }

    if (!state.scriptedFired.tut_phaser_fired) {
      if (inPhaserBay(state.player.x, state.player.y)) {
        if (once(state, 'tut_phaser_log')) pushLog(state, 'LOG-TUT-PHASER');
        const phaserOnGround = state.items.some((i) => i.kind === 'phaser');
        if (phaserOnGround) return 'UI-TUT-PHASER-PICKUP';
        if (hasItem(state, 'phaser') && !hasPhaserEquipped(state)) {
          return 'UI-TUT-PHASER-EQUIP';
        }
        return 'UI-TUT-PHASER';
      }
      return 'UI-TUT-GOTO-PHASER';
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
    const blocked = (bx: number, by: number) =>
      state.enemies.some((e) => e.alive && e.x === bx && e.y === by);

    if (!state.scriptedFired.tut_phaser_fired) {
      const phaserGround = state.items.find((i) => i.kind === 'phaser');
      if (phaserGround) {
        const path = bfsPath(state.tiles, { x, y }, phaserGround, blocked);
        if (path?.[0]) {
          return { type: 'move', dx: path[0].x - x, dy: path[0].y - y };
        }
      }

      const phaserIdx = state.inventory.findIndex((s) => s.kind === 'phaser');
      if (phaserIdx >= 0 && !hasPhaserEquipped(state)) {
        state.ui.selectedSlot = phaserIdx;
        return { type: 'use' };
      }

      if (hasPhaserEquipped(state)) {
        if (x !== PHASER_STAND.x || y !== PHASER_STAND.y) {
          const path = bfsPath(state.tiles, { x, y }, PHASER_STAND, blocked);
          if (path?.[0]) {
            return { type: 'move', dx: path[0].x - x, dy: path[0].y - y };
          }
        }
        for (const [dx, dy] of [
          [1, 0],
          [0, -1],
        ] as const) {
          if (findPhaserTarget(state, dx, dy)) {
            return { type: 'move', dx, dy };
          }
        }
      }

      const bayEntry = { x: 16, y: 7 };
      const path = bfsPath(state.tiles, { x, y }, bayEntry, blocked);
      if (path?.[0]) {
        return { type: 'move', dx: path[0].x - x, dy: path[0].y - y };
      }
    }

    if (x === state.exitPos.x && y === state.exitPos.y) {
      return { type: 'exit' };
    }
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
