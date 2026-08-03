import { getSector } from '../data/encounters';
import { CAMPAIGN_LENGTH } from '../campaign/spine';
import { computeFov, playerFovRadius } from './fov';
import { pushLog } from './combat';
import { syncObjectiveFlags } from './inventory';
import { loadSector } from './state';
import { moveEnemies } from './ai';
import { addStatus, tickPlayerStatusEffects } from './status';
import type { GameState } from './types';

export function checkLose(state: GameState): void {
  if (state.status !== 'playing') return;
  if (state.player.hp <= 0) {
    state.status = 'lost';
    state.loseReason = 'hp';
    return;
  }
  if (state.player.energy <= 0) {
    state.status = 'lost';
    state.loseReason = 'energy';
    return;
  }
  if (state.stormTurns <= 0) {
    state.status = 'lost';
    state.loseReason = 'storm';
  }
}

/** Storm tick + FOV after a sector load (no enemy moves / energy drip). */
export function finishSectorTransition(state: GameState): void {
  state.turn += 1;
  state.stormTurns -= 1;
  if (state.stormTurns === 50 || state.stormTurns === 20) {
    pushLog(state, 'LOG-STORM-WARN');
  }
  computeFov(
    state.tiles,
    state.explored,
    state.visible,
    state.player.x,
    state.player.y,
    playerFovRadius(state.player.probeTurns),
  );
  syncObjectiveFlags(state);
  checkLose(state);
}

function tickEnvironment(state: GameState): void {
  const sector = getSector(state.sectorIndex);
  state.stormTurns -= 1;
  if (state.stormTurns === 50 || state.stormTurns === 20) {
    pushLog(state, 'LOG-STORM-WARN');
  }

  const filter = state.player.filterTurns > 0;
  if (state.turn % 5 === 0) {
    state.player.energy -= filter ? 0 : 1;
  }
  const drain = filter ? Math.ceil(sector.energyDrain / 2) : sector.energyDrain;
  state.player.energy -= drain;

  const tile = state.tiles[state.player.y]![state.player.x]!;
  if (tile.kind === 'hazard') {
    state.player.energy -= filter ? 1 : 2;
    addStatus(state.player, 'ion_burn', 1);
    pushLog(state, 'LOG-HAZARD');
  } else if (tile.kind === 'vent') {
    state.player.energy -= filter ? 0 : 1;
  } else if (tile.kind === 'scrub') {
    state.player.energy -= filter ? 0 : 1;
  }

  if (state.player.probeTurns > 0) state.player.probeTurns -= 1;
  if (state.player.stimTurns > 0) state.player.stimTurns -= 1;
  if (state.player.plateTurns > 0) state.player.plateTurns -= 1;
  if (state.player.filterTurns > 0) state.player.filterTurns -= 1;
  if (state.player.jammerTurns > 0) state.player.jammerTurns -= 1;

  tickPlayerStatusEffects(state);
}

export function endPlayerTurn(state: GameState): void {
  if (state.status !== 'playing') return;
  state.turn += 1;
  tickEnvironment(state);
  moveEnemies(state);
  computeFov(
    state.tiles,
    state.explored,
    state.visible,
    state.player.x,
    state.player.y,
    playerFovRadius(state.player.probeTurns),
  );
  syncObjectiveFlags(state);
  checkLose(state);
}

export function advanceSector(state: GameState): boolean {
  if (state.sectorIndex >= CAMPAIGN_LENGTH - 1) return false;
  loadSector(state, state.sectorIndex + 1);
  return true;
}
