import { pushLog } from './log';
import type { GameState, Pos } from './types';

const CONTAMINATION_TURNS = 3;

/**
 * Spore residue — visual only. Swell burst already bills the fight; invisible
 * tile tax was a second clock with no map tell.
 */
export function leaveContamination(_state: GameState, _pos: Pos): void {
  // no-op
}

/** Age residue for field tint only — no Power tax. */
export function tickContamination(state: GameState): void {
  state.contamination = state.contamination
    .map((tile) => ({ ...tile, turns: tile.turns - 1 }))
    .filter((tile) => tile.turns > 0);
}
