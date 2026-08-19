import type { LoreId } from '../../data/lore';
import { hasItem } from '../inventory';
import { pushLog } from '../log';
import type { Action, GameState, Pos, Tile } from '../types';
import type { Mechanic } from './types';

const FLOOR: Tile = { kind: 'floor', walkable: true, transparent: true };

function adjacentSealed(state: GameState): Pos | null {
  const dirs: Pos[] = [
    { x: state.player.x + 1, y: state.player.y },
    { x: state.player.x - 1, y: state.player.y },
    { x: state.player.x, y: state.player.y + 1 },
    { x: state.player.x, y: state.player.y - 1 },
  ];
  for (const p of dirs) {
    if (p.x < 0 || p.y < 0 || p.x >= state.width || p.y >= state.height) continue;
    if (state.tiles[p.y]![p.x]!.kind === 'sealed') return p;
  }
  return null;
}

/** True when a sealed hatch is within one cardinal step. */
export function isAdjacentSealed(state: GameState): boolean {
  return adjacentSealed(state) !== null;
}

/** Open a sealed hatch tile to floor. */
export function openSealedTile(state: GameState, x: number, y: number, how: 'sealant' | 'pry'): void {
  state.tiles[y]![x] = { ...FLOOR };
  pushLog(state, how === 'sealant' ? 'LOG-SEALED-OPEN' : 'LOG-SEALED-PRY');
}

/** Sealant foam on an adjacent sealed hatch (inventory use path). */
export function tryOpenAdjacentSealed(state: GameState): boolean {
  const p = adjacentSealed(state);
  if (!p) return false;
  openSealedTile(state, p.x, p.y, 'sealant');
  return true;
}

/**
 * Pulse baton pry: stand adjacent and press `>` with baton equipped.
 */
export function tryPrySealed(state: GameState): boolean {
  if (state.player.equip.tool !== 'pulse_baton') return false;
  const p = adjacentSealed(state);
  if (!p) return false;
  openSealedTile(state, p.x, p.y, 'pry');
  return true;
}

export const sealedHatchMechanic: Mechanic = {
  id: 'sealed_hatch',

  tryAction(state: GameState, action: Action): boolean {
    if (action.type !== 'exit') return false;
    return tryPrySealed(state);
  },

  contextHint(state: GameState): LoreId | null {
    if (!adjacentSealed(state)) return null;
    if (state.player.equip.tool === 'pulse_baton') return 'UI-HINT-PRY-SEALED';
    if (hasItem(state, 'sealant')) return 'UI-HINT-SEALED-SEALANT';
    return 'UI-HINT-SEALED';
  },
};
