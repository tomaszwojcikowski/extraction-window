import { ENEMIES } from '../data/enemies';
import { applyPlayerDamage, enemyAttack, pushLog } from './combat';
import { bfsPath } from './fov';
import { addStatus, hasStatus, tickEnemyStatusEffects } from './status';
import { randInt } from './rng';
import type { Enemy, GameState, Pos } from './types';

function enemyAt(state: GameState, x: number, y: number, skipId?: number): Enemy | undefined {
  return state.enemies.find((e) => e.alive && e.id !== skipId && e.x === x && e.y === y);
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function stepToward(
  state: GameState,
  enemy: Enemy,
  tx: number,
  ty: number,
): boolean {
  const path = bfsPath(
    state.tiles,
    { x: enemy.x, y: enemy.y },
    { x: tx, y: ty },
    (x, y) => !!enemyAt(state, x, y, enemy.id),
  );
  if (!path || path.length === 0) return false;
  const step = path[0]!;
  if (step.x === state.player.x && step.y === state.player.y) return false;
  if (enemyAt(state, step.x, step.y, enemy.id)) return false;
  enemy.x = step.x;
  enemy.y = step.y;
  return true;
}

function stepAway(state: GameState, enemy: Enemy): void {
  const px = state.player.x;
  const py = state.player.y;
  const dirs: Pos[] = [
    { x: enemy.x + 1, y: enemy.y },
    { x: enemy.x - 1, y: enemy.y },
    { x: enemy.x, y: enemy.y + 1 },
    { x: enemy.x, y: enemy.y - 1 },
  ];
  let best: Pos | null = null;
  let bestDist = -1;
  for (const p of dirs) {
    if (p.x < 0 || p.y < 0 || p.x >= state.width || p.y >= state.height) continue;
    if (!state.tiles[p.y]![p.x]!.walkable) continue;
    if (enemyAt(state, p.x, p.y, enemy.id)) continue;
    if (p.x === px && p.y === py) continue;
    const d = manhattan(p.x, p.y, px, py);
    if (d > bestDist) {
      bestDist = d;
      best = p;
    }
  }
  if (best) {
    enemy.x = best.x;
    enemy.y = best.y;
  }
}

function randomStep(state: GameState, enemy: Enemy): void {
  const dirs = shuffleDirs(state);
  for (const [dx, dy] of dirs) {
    const nx = enemy.x + dx;
    const ny = enemy.y + dy;
    if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
    if (!state.tiles[ny]![nx]!.walkable) continue;
    if (enemyAt(state, nx, ny, enemy.id)) continue;
    if (nx === state.player.x && ny === state.player.y) continue;
    enemy.x = nx;
    enemy.y = ny;
    return;
  }
}

function shuffleDirs(state: GameState): Array<[number, number]> {
  const dirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = randInt(state.rng, 0, i);
    const tmp = dirs[i]!;
    dirs[i] = dirs[j]!;
    dirs[j] = tmp;
  }
  return dirs;
}

function tryMelee(state: GameState, enemy: Enemy, bonusAtk = 0): boolean {
  const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
  if (dist !== 1) return false;
  enemyAttack(state, enemy, randInt(state.rng, -1, 1), { bonusAtk });
  return true;
}

/** Hunter/ambush/wraith: windup then pounce with bonus damage. */
function tryPouncePattern(state: GameState, enemy: Enemy, defAggro: number): void {
  const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
  if (dist > defAggro) {
    enemy.windup = 0;
    return;
  }
  if (enemy.windup > 0) {
    enemy.windup = 0;
    if (dist === 1) {
      tryMelee(state, enemy, 3);
    } else {
      stepToward(state, enemy, state.player.x, state.player.y);
      const d2 = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
      if (d2 === 1) tryMelee(state, enemy, 3);
      else if (d2 > 1) stepToward(state, enemy, state.player.x, state.player.y);
    }
    return;
  }
  if (dist <= 2) {
    enemy.windup = 1;
    pushLog(state, 'LOG-TELE-POUNCE');
    return;
  }
  if (!tryMelee(state, enemy)) {
    stepToward(state, enemy, state.player.x, state.player.y);
    const d2 = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
    if (d2 > 1) stepToward(state, enemy, state.player.x, state.player.y);
  }
}

function silenced(state: GameState, enemy: Enemy): boolean {
  if (state.player.jammerTurns <= 0) return false;
  const kind = enemy.kind;
  return kind === 'mite' || kind === 'wasp';
}

/**
 * Run one AI tick for all living enemies.
 */
export function moveEnemies(state: GameState): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    tickEnemyStatusEffects(state, enemy);
    if (!enemy.alive) continue;
    if (hasStatus(enemy, 'stun')) {
      enemy.windup = 0;
      continue;
    }

    const def = ENEMIES[enemy.kind];
    const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
    const inFov = state.visible[enemy.y]?.[enemy.x] ?? false;
    const quiet = silenced(state, enemy);

    switch (def.behavior) {
      case 'wander': {
        if (quiet) {
          randomStep(state, enemy);
          break;
        }
        if (dist <= def.aggroRange) {
          if (!tryMelee(state, enemy)) stepToward(state, enemy, state.player.x, state.player.y);
        } else {
          randomStep(state, enemy);
        }
        break;
      }
      case 'swell': {
        if (dist <= def.aggroRange) {
          enemy.swellTurns += 1;
          if (enemy.swellTurns === 2) {
            pushLog(state, 'LOG-TELE-SWELL');
          }
          if (enemy.swellTurns >= 3) {
            pushLog(state, 'LOG-SPORE-BURST');
            if (dist <= 2) {
              state.player.energy -= 6;
              applyPlayerDamage(state, 3, 'ion');
              addStatus(state.player, 'ion_burn', 3);
              addStatus(state.player, 'expose', 2);
            }
            enemy.alive = false;
            enemy.hp = 0;
          }
        } else {
          enemy.swellTurns = Math.max(0, enemy.swellTurns - 1);
        }
        break;
      }
      case 'skirmish': {
        if (quiet) {
          randomStep(state, enemy);
          break;
        }
        if (dist > def.aggroRange) break;
        if (enemy.skirmishRetreat) {
          stepAway(state, enemy);
          enemy.skirmishRetreat = false;
        } else if (tryMelee(state, enemy)) {
          enemy.skirmishRetreat = true;
        } else {
          stepToward(state, enemy, state.player.x, state.player.y);
        }
        break;
      }
      case 'ambush': {
        if (!enemy.alerted) {
          if (dist <= 1 || inFov) {
            enemy.alerted = true;
            pushLog(state, 'LOG-AMBUSH');
          } else {
            break;
          }
        }
        tryPouncePattern(state, enemy, def.aggroRange);
        break;
      }
      case 'drain': {
        if (dist > def.aggroRange) break;
        if (!tryMelee(state, enemy)) stepToward(state, enemy, state.player.x, state.player.y);
        break;
      }
      case 'guard': {
        const aggro =
          state.lootTakenThisSector || dist <= 2 || (enemy.alerted && dist <= def.aggroRange);
        if (aggro) {
          enemy.alerted = true;
          if (!tryMelee(state, enemy)) stepToward(state, enemy, state.player.x, state.player.y);
        } else {
          const hd = manhattan(enemy.x, enemy.y, enemy.homeX, enemy.homeY);
          if (hd > 3) stepToward(state, enemy, enemy.homeX, enemy.homeY);
          else randomStep(state, enemy);
        }
        break;
      }
      case 'sentinel': {
        if (dist <= def.aggroRange) {
          if (dist === 1) tryMelee(state, enemy);
          else if (dist <= 3) stepToward(state, enemy, state.player.x, state.player.y);
        } else {
          const hd = manhattan(enemy.x, enemy.y, enemy.homeX, enemy.homeY);
          if (hd > 0) stepToward(state, enemy, enemy.homeX, enemy.homeY);
        }
        break;
      }
      case 'hunter': {
        tryPouncePattern(state, enemy, def.aggroRange);
        break;
      }
    }
  }
}
