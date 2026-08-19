import { ENEMIES } from '../data/enemies';
import { ALLIES, type AllyKind } from '../data/npcs';
import { lore } from '../data/lore';
import { bfsPath } from './fov';
import { resolveHit } from './stance';
import { markEnemyDead } from './death';
import { formatCombatDetail, pushLog } from './log';
import { randInt } from './rng';
import { allyAt, enemyAt, manhattan, npcAt } from './spatial';
import { hasStatus } from './status';
import type { Ally, Enemy, GameState, Pos } from './types';

function blockedForAlly(state: GameState, x: number, y: number, selfId: number): boolean {
  if (x === state.player.x && y === state.player.y) return true;
  if (enemyAt(state, x, y)) return true;
  if (allyAt(state, x, y, selfId)) return true;
  if (npcAt(state, x, y)) return true;
  return false;
}

function nearestEnemy(state: GameState, ally: Ally, aggro: number): Enemy | null {
  let best: Enemy | null = null;
  let bestD = aggro + 1;
  for (const en of state.enemies) {
    if (!en.alive) continue;
    const d = manhattan(ally.x, ally.y, en.x, en.y);
    if (d < bestD) {
      best = en;
      bestD = d;
    }
  }
  return best;
}

function allyMelee(state: GameState, ally: Ally, enemy: Enemy): void {
  const helpless = hasStatus(enemy, 'stun') || hasStatus(enemy, 'expose');
  const stance = helpless ? 'enhanced' : 'normal';
  const dmg = resolveHit(ally.atk, enemy.def, randInt(state.rng, -1, 0), stance, state.rng);
  enemy.hp -= dmg;
  const rem = Math.max(0, enemy.hp);
  const allyName = lore(ALLIES[ally.kind].loreName);
  const foeName = lore(ENEMIES[enemy.kind].loreName);
  pushLog(
    state,
    'LOG-ALLY-HIT',
    formatCombatDetail(`${allyName} → ${foeName}`, dmg, rem, enemy.maxHp),
  );
  if (enemy.hp <= 0) {
    markEnemyDead(enemy);
    pushLog(state, 'LOG-ALLY-KILL', `${allyName} → ${foeName}`);
  }
}

function stepAllyToward(state: GameState, ally: Ally, tx: number, ty: number): void {
  const path = bfsPath(
    state.tiles,
    { x: ally.x, y: ally.y },
    { x: tx, y: ty },
    (x, y) => blockedForAlly(state, x, y, ally.id),
  );
  if (!path || path.length === 0) return;
  const step = path[0]!;
  if (blockedForAlly(state, step.x, step.y, ally.id)) return;
  if (step.x === tx && step.y === ty) return;
  ally.x = step.x;
  ally.y = step.y;
}

function followPlayer(state: GameState, ally: Ally): void {
  if (manhattan(ally.x, ally.y, state.player.x, state.player.y) <= 1) return;
  stepAllyToward(state, ally, state.player.x, state.player.y);
}

/** Bodyguard — stay on the player; only strike what's already in melee range. */
function tickEscort(state: GameState, ally: Ally, def: (typeof ALLIES)['away_escort']): void {
  const adjacentToPlayer = manhattan(ally.x, ally.y, state.player.x, state.player.y) === 1;
  const target = nearestEnemy(state, ally, def.aggro);
  if (target && manhattan(ally.x, ally.y, target.x, target.y) === 1) {
    allyMelee(state, ally, target);
  } else if (!adjacentToPlayer) {
    followPlayer(state, ally);
  }
}

function tickCombatAlly(state: GameState, ally: Ally, def: (typeof ALLIES)[AllyKind]): void {
  const target = nearestEnemy(state, ally, def.aggro);
  if (target) {
    const dist = manhattan(ally.x, ally.y, target.x, target.y);
    if (dist === 1) {
      allyMelee(state, ally, target);
    } else {
      stepAllyToward(state, ally, target.x, target.y);
      const d2 = manhattan(ally.x, ally.y, target.x, target.y);
      if (d2 === 1) allyMelee(state, ally, target);
    }
  }
}

/** Apply damage to an ally from an enemy strike. */
export function applyAllyDamage(
  state: GameState,
  ally: Ally,
  amount: number,
  opts?: { source?: string },
): void {
  const dealt = Math.max(1, amount);
  ally.hp -= dealt;
  const rem = Math.max(0, ally.hp);
  const allyName = lore(ALLIES[ally.kind].loreName);
  const subject = opts?.source ? `${opts.source} → ${allyName}` : allyName;
  pushLog(state, 'LOG-ALLY-HURT', formatCombatDetail(subject, dealt, rem, ally.maxHp));
  if (ally.hp <= 0) {
    ally.alive = false;
    ally.hp = 0;
    pushLog(state, 'LOG-ALLY-DOWN', allyName);
  }
}

export function livingAllyAt(state: GameState, x: number, y: number): Ally | undefined {
  return allyAt(state, x, y);
}

/** Escort cover is evaluated only while enemy attacks resolve. */
export function hasEscortCover(state: GameState): boolean {
  return state.allies.some(
    (ally) =>
      ally.alive &&
      ally.kind === 'away_escort' &&
      manhattan(ally.x, ally.y, state.player.x, state.player.y) === 1,
  );
}

/**
 * Drone role: cancel one visible overwatch on a short cooldown.
 * This is deliberately positional prevention, not another damage source.
 */
export function applyAllyFieldRoles(state: GameState): void {
  for (const ally of state.allies) {
    if (!ally.alive || ally.kind !== 'probe_drone') continue;
    if (ally.roleCooldown > 0) {
      ally.roleCooldown -= 1;
      continue;
    }
    const overwatch = state.enemies.find(
      (enemy) =>
        enemy.alive &&
        enemy.intent === 'overwatch' &&
        enemy.windup > 0 &&
        (state.visible[enemy.y]?.[enemy.x] ?? false),
    );
    if (!overwatch) continue;
    overwatch.windup = 0;
    overwatch.intent = undefined;
    ally.roleCooldown = 3;
    pushLog(state, 'LOG-DRONE-INTERRUPT', lore(ENEMIES[overwatch.kind].loreName));
  }
}

/**
 * Ally AI tick — chase / melee fauna, then expire timers.
 * No player XP on ally kills.
 */
export function moveAllies(state: GameState): void {
  for (const ally of state.allies) {
    if (!ally.alive) continue;
    const def = ALLIES[ally.kind];
    if (ally.kind === 'away_escort') {
      tickEscort(state, ally, def);
    } else {
      tickCombatAlly(state, ally, def);
    }

    ally.turnsLeft -= 1;
    if (ally.turnsLeft <= 0 && ally.alive) {
      ally.alive = false;
      pushLog(state, 'LOG-ALLY-EXPIRE', lore(def.loreName));
    }
  }
}

/** Prefer player; otherwise strike an adjacent ally. */
export function tryEnemyMeleePreferPlayer(
  state: GameState,
  enemy: Enemy,
  attackPlayer: () => boolean,
): boolean {
  const distP = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
  if (distP === 1) return attackPlayer();

  const dirs: Pos[] = [
    { x: enemy.x + 1, y: enemy.y },
    { x: enemy.x - 1, y: enemy.y },
    { x: enemy.x, y: enemy.y + 1 },
    { x: enemy.x, y: enemy.y - 1 },
  ];
  for (const p of dirs) {
    const ally = allyAt(state, p.x, p.y);
    if (!ally) continue;
    const dmg = resolveHit(enemy.atk, ally.def, randInt(state.rng, -1, 1), 'normal', state.rng);
    applyAllyDamage(state, ally, dmg, { source: lore(ENEMIES[enemy.kind].loreName) });
    return true;
  }
  return false;
}
