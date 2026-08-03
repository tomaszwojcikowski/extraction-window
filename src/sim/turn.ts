import { getSector } from '../data/encounters';
import { CAMPAIGN_LENGTH } from '../campaign/spine';
import { enemyAttack } from './combat';
import { computeFov, bfsPath } from './fov';
import { pushLog } from './combat';
import { syncObjectiveFlags } from './inventory';
import { loadSector } from './state';
import type { Enemy, GameState } from './types';
import { randInt } from './rng';

function enemyAt(state: GameState, x: number, y: number): Enemy | undefined {
  return state.enemies.find((e) => e.alive && e.x === x && e.y === y);
}

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
  computeFov(state.tiles, state.explored, state.visible, state.player.x, state.player.y);
  syncObjectiveFlags(state);
  checkLose(state);
}

function tickEnvironment(state: GameState): void {
  const sector = getSector(state.sectorIndex);
  state.stormTurns -= 1;
  if (state.stormTurns === 50 || state.stormTurns === 20) {
    pushLog(state, 'LOG-STORM-WARN');
  }

  // Base life-support drip every few turns
  if (state.turn % 5 === 0) {
    state.player.energy -= 1;
  }
  state.player.energy -= sector.energyDrain;

  const tile = state.tiles[state.player.y]![state.player.x]!;
  if (tile.kind === 'hazard') {
    state.player.energy -= 2;
    pushLog(state, 'LOG-HAZARD');
  }

  if (state.player.probeTurns > 0) state.player.probeTurns -= 1;
}

function moveEnemies(state: GameState): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const dist =
      Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
    if (dist > 10) continue;

    if (dist === 1) {
      enemyAttack(state, enemy, randInt(state.rng, -1, 1));
      continue;
    }

    // Step toward player if close
    if (dist <= 6) {
      const path = bfsPath(
        state.tiles,
        { x: enemy.x, y: enemy.y },
        { x: state.player.x, y: state.player.y },
        (x, y) => !!enemyAt(state, x, y),
      );
      if (path && path.length > 0) {
        const step = path[0]!;
        if (!(step.x === state.player.x && step.y === state.player.y)) {
          if (!enemyAt(state, step.x, step.y)) {
            enemy.x = step.x;
            enemy.y = step.y;
          }
        }
      }
    }
  }
}

export function endPlayerTurn(state: GameState): void {
  if (state.status !== 'playing') return;
  state.turn += 1;
  tickEnvironment(state);
  moveEnemies(state);
  computeFov(state.tiles, state.explored, state.visible, state.player.x, state.player.y);
  syncObjectiveFlags(state);
  checkLose(state);
}

export function advanceSector(state: GameState): boolean {
  if (state.sectorIndex >= CAMPAIGN_LENGTH - 1) return false;
  loadSector(state, state.sectorIndex + 1);
  return true;
}
