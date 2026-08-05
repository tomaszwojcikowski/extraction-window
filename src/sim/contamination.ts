import { pushLog } from './log';
import type { GameState, Pos } from './types';

const CONTAMINATION_TURNS = 3;
const CONTAMINATION_ENERGY_COST = 3;

/** Leave a short-lived energy-taxing residue, refreshing an existing patch. */
export function leaveContamination(state: GameState, pos: Pos): void {
  const existing = state.contamination.find((tile) => tile.x === pos.x && tile.y === pos.y);
  if (existing) {
    existing.turns = CONTAMINATION_TURNS;
    return;
  }
  state.contamination.push({ ...pos, turns: CONTAMINATION_TURNS });
}

/** Tax the player if standing in residue, then age all residue once per turn. */
export function tickContamination(state: GameState): void {
  if (
    state.contamination.some(
      (tile) => tile.x === state.player.x && tile.y === state.player.y,
    )
  ) {
    state.player.energy -= CONTAMINATION_ENERGY_COST;
    pushLog(state, 'LOG-CONTAMINATION', `tile tax -${CONTAMINATION_ENERGY_COST}E`);
  }
  state.contamination = state.contamination
    .map((tile) => ({ ...tile, turns: tile.turns - 1 }))
    .filter((tile) => tile.turns > 0);
}
