import { ENEMIES } from '../data/enemies';
import { lore } from '../data/lore';
import { killEnemy } from './death';
import { formatCombatDetail, pushLog } from './log';
import { addStatus, hasStatus } from './status';
import { livingAllyAt } from './allyAi';
import { enemyAt, manhattan, npcAt } from './spatial';
import type { Enemy, GameState, TileKind } from './types';

/**
 * A wall is behind half the fights in the game, so the slam has to stay under
 * what a swing would have done — the stagger is what you are really buying.
 */
const SLAM_DAMAGE = 2;
/** Two turns, because the status tick spends one before the skip check. */
const STAGGER_TURNS = 2;

/**
 * Ground that bites what lands in it. The surveyor is billed for standing
 * here; fauna know to keep moving, so it only collects on a body thrown in.
 *
 * Live ground almost never lines up behind a target, so when it does it should
 * be worth crossing the room for: it out-damages a swing and keeps burning.
 */
const GROUND_DAMAGE: Partial<Record<TileKind, number>> = {
  hazard: 5,
  brine_pool: 3,
  vent: 3,
};
const GROUND_BURN_TURNS = 3;

export function hostileGround(kind: TileKind): boolean {
  return GROUND_DAMAGE[kind] !== undefined;
}

/** Living hostiles the surveyor could put a shoulder into right now. */
export function shoveTargets(state: GameState): Enemy[] {
  return state.enemies.filter(
    (enemy) =>
      enemy.alive && manhattan(enemy.x, enemy.y, state.player.x, state.player.y) === 1,
  );
}

function hurtEnemy(state: GameState, enemy: Enemy, damage: number, source: string): void {
  enemy.hp -= damage;
  const remaining = Math.max(0, enemy.hp);
  pushLog(
    state,
    'LOG-HIT',
    formatCombatDetail(`${lore(ENEMIES[enemy.kind].loreName)} ${source}`, damage, remaining, enemy.maxHp),
  );
  if (enemy.hp <= 0) killEnemy(state, enemy);
}

/**
 * Knock a hostile off whatever it was setting up. This is what a shove buys
 * when there is no cover to slam it into: you trade your swing for its swing.
 * Charges telegraph from range, where the shoulder cannot reach — so brace
 * still owns the approach and this owns the moment it arrives.
 */
function breakSet(enemy: Enemy): void {
  enemy.windup = 0;
  enemy.intent = undefined;
}

/**
 * Bosses take the impact but keep their footing — a crown never loses a turn
 * to the terrain, so cornering one is chip damage rather than a lock.
 */
function stagger(enemy: Enemy): void {
  if (!enemy.alive || enemy.tier === 'boss') return;
  // Re-slamming a hostile that is already down does not extend the hold, so a
  // wall cannot be used to keep one permanently out of the fight.
  if (hasStatus(enemy, 'stun')) return;
  addStatus(enemy, 'stun', STAGGER_TURNS);
}

function displacementBlocked(state: GameState, enemy: Enemy, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return true;
  if (!state.tiles[y]![x]!.walkable) return true;
  if (enemyAt(state, x, y, enemy.id)) return true;
  if (livingAllyAt(state, x, y)) return true;
  if (npcAt(state, x, y)) return true;
  return false;
}

/**
 * Put a shoulder into an adjacent hostile.
 *
 * A clean shove deals nothing — it breaks the target's set and buys a tile,
 * and what that tile is worth is the decision. Backed against cover the
 * hostile eats the wall instead; thrown onto caustic footing it eats the
 * sector. Returns whether the attempt consumed the turn.
 */
export function tryShove(state: GameState, dx: number, dy: number): boolean {
  const tx = state.player.x + dx;
  const ty = state.player.y + dy;
  const target = state.enemies.find((enemy) => enemy.alive && enemy.x === tx && enemy.y === ty);
  if (!target) {
    pushLog(state, 'LOG-SHOVE-EMPTY');
    return false;
  }

  const name = lore(ENEMIES[target.kind].loreName);
  const nx = tx + dx;
  const ny = ty + dy;

  breakSet(target);

  if (displacementBlocked(state, target, nx, ny)) {
    pushLog(state, 'LOG-SHOVE-SLAM', name);
    hurtEnemy(state, target, SLAM_DAMAGE, 'slam');
    stagger(target);
    return true;
  }

  target.x = nx;
  target.y = ny;
  pushLog(state, 'LOG-SHOVE', name);

  const ground = state.tiles[ny]![nx]!.kind;
  const groundDamage = GROUND_DAMAGE[ground];
  if (groundDamage !== undefined) {
    pushLog(state, 'LOG-SHOVE-GROUND', name);
    hurtEnemy(state, target, groundDamage, 'ground');
    if (target.alive) addStatus(target, 'ion_burn', GROUND_BURN_TURNS);
  }
  return true;
}
