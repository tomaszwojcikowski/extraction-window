import { ENEMIES } from '../data/enemies';
import type { HuntStyle } from '../data/enemies';
import { lore } from '../data/lore';
import { applyPlayerDamage, enemyAttack } from './combat';
import { pushLog } from './log';
import { bfsPath } from './fov';
import { addStatus, hasStatus, tickEnemyStatusEffects } from './status';
import { randInt } from './rng';
import { livingAllyAt, tryEnemyMeleePreferPlayer } from './allyAi';
import { inShadow } from './light';
import { enemyAt, manhattan, npcAt } from './spatial';
import { leaveContamination } from './contamination';
import { effectiveAggro } from './notice';
import type { Enemy, GameState, Pos } from './types';

export { effectiveAggro } from './notice';

function tileBlocked(state: GameState, x: number, y: number, skipEnemyId?: number): boolean {
  if (enemyAt(state, x, y, skipEnemyId)) return true;
  if (livingAllyAt(state, x, y)) return true;
  if (npcAt(state, x, y)) return true;
  return false;
}

function contactSeats(state: GameState): Pos[] {
  const px = state.player.x;
  const py = state.player.y;
  const seats: Pos[] = [
    { x: px + 1, y: py },
    { x: px - 1, y: py },
    { x: px, y: py + 1 },
    { x: px, y: py - 1 },
  ];
  return seats.filter((p) => {
    if (p.x < 0 || p.y < 0 || p.x >= state.width || p.y >= state.height) return false;
    const tile = state.tiles[p.y]?.[p.x];
    return !!tile?.walkable;
  });
}

function seatPathLen(state: GameState, enemy: Enemy, seat: Pos): number {
  if (enemy.x === seat.x && enemy.y === seat.y) return 0;
  const path = bfsPath(
    state.tiles,
    { x: enemy.x, y: enemy.y },
    seat,
    (x, y) => tileBlocked(state, x, y, enemy.id),
  );
  return path ? path.length : Number.POSITIVE_INFINITY;
}

/** Two distinct seats is a peel. Four simultaneous bites collapsed the win-rate band. */
const MAX_PACK_CONTACT = 2;

/** Living hunters closer to the player (manhattan, then id) within the pack radius. */
function packCloserCount(state: GameState, enemy: Enemy): number {
  const d = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
  return state.enemies.filter((other) => {
    if (!other.alive || other.id === enemy.id) return false;
    const od = manhattan(other.x, other.y, state.player.x, state.player.y);
    if (od > 8) return false;
    return od < d || (od === d && other.id < enemy.id);
  }).length;
}

function emptyContactSeat(state: GameState, enemy: Enemy, x: number, y: number): boolean {
  if (manhattan(x, y, state.player.x, state.player.y) !== 1) return false;
  return !enemyAt(state, x, y, enemy.id);
}

/**
 * Close on an empty contact seat instead of queuing behind the first mite.
 * Packs already peel DEF; they have to actually stand on two sides for that
 * rule to fire. Skip seats a closer hunter will claim this approach.
 * Third-and-later hunters cannot step onto empty contact tiles.
 */
function stepToFlank(state: GameState, enemy: Enemy): boolean {
  if (manhattan(enemy.x, enemy.y, state.player.x, state.player.y) === 1) {
    return false;
  }
  if (packCloserCount(state, enemy) >= MAX_PACK_CONTACT) {
    return stepToward(state, enemy, state.player.x, state.player.y, (x, y) =>
      emptyContactSeat(state, enemy, x, y),
    );
  }
  const seats = contactSeats(state);
  const empty = seats.filter((s) => !tileBlocked(state, s.x, s.y, enemy.id));
  if (empty.length === 0) {
    return stepToward(state, enemy, state.player.x, state.player.y);
  }

  let best: Pos | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const seat of empty) {
    const mine = seatPathLen(state, enemy, seat);
    if (mine === Number.POSITIVE_INFINITY || mine > 8) continue;
    let claimed = false;
    for (const other of state.enemies) {
      if (!other.alive || other.id === enemy.id) continue;
      if (manhattan(other.x, other.y, state.player.x, state.player.y) > 8) continue;
      if (seatPathLen(state, other, seat) < mine) {
        claimed = true;
        break;
      }
    }
    if (claimed) continue;
    if (mine < bestLen) {
      bestLen = mine;
      best = seat;
    }
  }
  if (!best) {
    return stepToward(state, enemy, state.player.x, state.player.y);
  }
  return stepToward(state, enemy, best.x, best.y);
}

function stepToward(
  state: GameState,
  enemy: Enemy,
  tx: number,
  ty: number,
  extraBlock?: (x: number, y: number) => boolean,
): boolean {
  const path = bfsPath(
    state.tiles,
    { x: enemy.x, y: enemy.y },
    { x: tx, y: ty },
    (x, y) => tileBlocked(state, x, y, enemy.id) || extraBlock?.(x, y) === true,
  );
  if (!path || path.length === 0) return false;
  const step = path[0]!;
  if (step.x === state.player.x && step.y === state.player.y) return false;
  if (tileBlocked(state, step.x, step.y, enemy.id)) return false;
  if (extraBlock?.(step.x, step.y)) return false;
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
    if (livingAllyAt(state, p.x, p.y)) continue;
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
    if (livingAllyAt(state, nx, ny)) continue;
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
  return tryEnemyMeleePreferPlayer(state, enemy, () => {
    const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
    if (dist !== 1) return false;
    enemyAttack(state, enemy, randInt(state.rng, -1, 1), { bonusAtk });
    return true;
  });
}

/** Cardinal three-tile ray; walls and scrub stop ion beams. */
export function hasBeamLine(state: GameState, enemy: Enemy): boolean {
  const dx = state.player.x - enemy.x;
  const dy = state.player.y - enemy.y;
  const distance = Math.abs(dx) + Math.abs(dy);
  if (distance === 0 || distance > 3 || (dx !== 0 && dy !== 0)) return false;

  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  for (let step = 1; step < distance; step++) {
    const tile = state.tiles[enemy.y + stepY * step]?.[enemy.x + stepX * step];
    if (!tile?.transparent) return false;
  }
  return true;
}

function tryBeamPattern(state: GameState, enemy: Enemy): boolean {
  if (enemy.beamCooldown > 0) {
    enemy.beamCooldown -= 1;
    return false;
  }
  if (enemy.intent === 'beam' && enemy.windup > 0) {
    enemy.windup = 0;
    enemy.intent = undefined;
    enemy.beamCooldown = 3;
    if (hasBeamLine(state, enemy)) {
      applyPlayerDamage(state, 2, 'ion', { source: lore(ENEMIES[enemy.kind].loreName) });
      state.player.energy -= 4;
      pushLog(state, 'LOG-BEAM-FIRE', `${lore(ENEMIES[enemy.kind].loreName)} -4 Power`);
    } else {
      pushLog(state, 'LOG-BEAM-BLOCKED');
    }
    return true;
  }
  if (hasBeamLine(state, enemy)) {
    enemy.windup = 1;
    enemy.intent = 'beam';
    pushLog(state, 'LOG-TELE-BEAM');
    return true;
  }
  return false;
}

/** Armed sentinels strike before a player enters a neighboring tile. */
export function triggerOverwatch(state: GameState, destination: Pos): boolean {
  const sentry = state.enemies.find(
    (enemy) =>
      enemy.alive &&
      enemy.intent === 'overwatch' &&
      enemy.windup > 0 &&
      manhattan(enemy.x, enemy.y, destination.x, destination.y) === 1,
  );
  if (!sentry) return false;
  sentry.windup = 0;
  sentry.intent = undefined;
  enemyAttack(state, sentry, randInt(state.rng, -1, 1), { bonusAtk: 1 });
  pushLog(state, 'LOG-OVERWATCH-FIRE');
  return true;
}

/** Resolve a held sentinel shot before the player bump-attacks it. */
export function triggerOverwatchOnAttack(state: GameState, target: Enemy): boolean {
  if (
    !target.alive ||
    target.intent !== 'overwatch' ||
    target.windup <= 0 ||
    manhattan(target.x, target.y, state.player.x, state.player.y) !== 1
  ) {
    return false;
  }
  target.windup = 0;
  target.intent = undefined;
  enemyAttack(state, target, randInt(state.rng, -1, 1), { bonusAtk: 1 });
  pushLog(state, 'LOG-OVERWATCH-FIRE');
  return true;
}

/**
 * Ground an armed enemy threatens once its windup resolves.
 *
 * Derived from the same ranges the AI acts on, so the on-screen telegraph
 * cannot drift from what the resolve actually does.
 */
export function enemyThreatTiles(state: GameState, enemy: Enemy): Pos[] {
  if (!enemy.alive || enemy.windup <= 0 || !enemy.intent) return [];
  const tiles: Pos[] = [];
  const add = (x: number, y: number): void => {
    if (state.tiles[y]?.[x]?.walkable) tiles.push({ x, y });
  };

  if (enemy.intent === 'beam') {
    const dx = Math.sign(state.player.x - enemy.x);
    const dy = Math.sign(state.player.y - enemy.y);
    if (dx !== 0 && dy !== 0) return [];
    for (let step = 1; step <= 3; step++) {
      const x = enemy.x + dx * step;
      const y = enemy.y + dy * step;
      const tile = state.tiles[y]?.[x];
      if (!tile) break;
      add(x, y);
      if (!tile.transparent) break;
    }
    return tiles;
  }

  // Melee charges cover their move allowance plus the strike; the zone pulse
  // covers a fixed radius and never moves.
  const radius =
    enemy.intent === 'overwatch'
      ? 1
      : enemy.intent === 'zone'
        ? ZONE_PULSE_RADIUS
        : HUNT_RANGE[enemy.intent === 'reach' ? 'reach' : 'lunge'];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      if (dx === 0 && dy === 0) continue;
      add(enemy.x + dx, enemy.y + dy);
    }
  }
  return tiles;
}

/** Flares and stun interrupt a visible sentinel's held shot. */
export function cancelOverwatch(state: GameState): void {
  for (const enemy of state.enemies) {
    if (enemy.intent !== 'overwatch') continue;
    enemy.windup = 0;
    enemy.intent = undefined;
  }
}

/** Tiles the rift's standoff pulse covers, measured from the rift itself. */
export const ZONE_PULSE_RADIUS = 2;

/**
 * How far out each style commits to a telegraph. Charge styles cover their
 * move allowance plus the strike; the zone telegraph matches its own pulse
 * radius exactly, so an armed rift always means "you are standing in it".
 */
const HUNT_RANGE: Record<HuntStyle, number> = { lunge: 2, reach: 3, zone: ZONE_PULSE_RADIUS };
const HUNT_INTENT: Record<HuntStyle, 'pounce' | 'reach' | 'zone'> = {
  lunge: 'pounce',
  reach: 'reach',
  zone: 'zone',
};
const HUNT_TELE_LOG = {
  lunge: 'LOG-TELE-POUNCE',
  reach: 'LOG-TELE-REACH',
  zone: 'LOG-TELE-ZONE',
} as const;

function huntStyle(enemy: Enemy): HuntStyle {
  return ENEMIES[enemy.kind].hunt ?? 'lunge';
}

/**
 * Close the gap and strike. `steps` is how much ground the style covers.
 *
 * A two-tile charge cannot be walked away from, so it pays for that reach by
 * overcommitting: it lands winded and gives up the following turn. That is the
 * reward for reading the tell — the counter is the punish, not the dodge.
 */
function resolveCharge(state: GameState, enemy: Enemy, steps: number): void {
  const bonus = 3;
  let moved = 0;
  for (let i = 0; i < steps; i++) {
    if (manhattan(enemy.x, enemy.y, state.player.x, state.player.y) === 1) break;
    if (!stepToward(state, enemy, state.player.x, state.player.y)) break;
    moved++;
  }
  if (manhattan(enemy.x, enemy.y, state.player.x, state.player.y) === 1) {
    tryMelee(state, enemy, bonus);
  }
  // Two turns, because the status tick spends one before the skip check.
  if (steps > 1 && moved > 1) {
    addStatus(enemy, 'stun', 2);
    pushLog(state, 'LOG-CHARGE-WINDED');
  }
}

/**
 * Standoff ion pulse. It never closes and never touches you — the counter is
 * to leave the radius or kill it mid-charge.
 */
function resolveZonePulse(state: GameState, enemy: Enemy): void {
  const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
  if (dist > ZONE_PULSE_RADIUS) {
    pushLog(state, 'LOG-ZONE-FIZZLE');
    return;
  }
  pushLog(state, 'LOG-ZONE-PULSE');
  applyPlayerDamage(state, 2, 'ion', { source: lore(ENEMIES[enemy.kind].loreName) });
  addStatus(state.player, 'expose', 2);
}

/** Hunters and alerted ambushers: telegraph a windup, then resolve by style. */
function tryPouncePattern(state: GameState, enemy: Enemy, defAggro: number): void {
  const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
  if (dist > defAggro) {
    enemy.windup = 0;
    enemy.intent = undefined;
    return;
  }
  const style = huntStyle(enemy);

  if (enemy.windup > 0) {
    enemy.windup = 0;
    enemy.intent = undefined;
    if (style === 'zone') resolveZonePulse(state, enemy);
    else resolveCharge(state, enemy, style === 'reach' ? 2 : 1);
    return;
  }

  // Soft-shadow player (dark tile): skip telegraph and strike if adjacent
  if (style !== 'zone' && dist === 1 && inShadow(state, state.player.x, state.player.y)) {
    tryMelee(state, enemy, 3);
    return;
  }
  if (dist <= HUNT_RANGE[style]) {
    enemy.windup = 1;
    enemy.intent = HUNT_INTENT[style];
    pushLog(state, HUNT_TELE_LOG[style]);
    return;
  }
  if (style === 'zone') {
    // Walks to the edge of its own pulse and holds there.
    stepToFlank(state, enemy);
    return;
  }
  if (!tryMelee(state, enemy)) {
    stepToFlank(state, enemy);
  }
}

function tryBossPattern(state: GameState, enemy: Enemy): void {
  const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
  const aggro = effectiveAggro(state, enemy);
  if (dist > aggro) {
    enemy.windup = 0;
    return;
  }

  if (enemy.windup > 0) {
    enemy.windup = 0;
    if (enemy.kind === 'isolinear_warden') {
      // Ion sentinel smash
      if (dist === 1) {
        tryMelee(state, enemy, 2);
        applyPlayerDamage(state, 1, 'ion', { source: lore(ENEMIES[enemy.kind].loreName) });
      } else {
        stepToward(state, enemy, state.player.x, state.player.y);
        const d2 = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
        if (d2 === 1) tryMelee(state, enemy, 2);
      }
      return;
    }
    if (enemy.kind === 'pattern_custodian') {
      // FOV drain pulse
      state.player.energy -= 2;
      addStatus(state.player, 'expose', 1);
      pushLog(state, 'LOG-DRAIN', `${lore(ENEMIES[enemy.kind].loreName)} -2 Power`);
      if (dist === 1) tryMelee(state, enemy, 1);
      else stepToward(state, enemy, state.player.x, state.player.y);
      return;
    }
    // shear_sovereign — hunter pounce + short ion burst
    if (dist === 1) {
      tryMelee(state, enemy, 2);
      applyPlayerDamage(state, 1, 'ion', { source: lore(ENEMIES[enemy.kind].loreName) });
    } else {
      stepToward(state, enemy, state.player.x, state.player.y);
      const d2 = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
      if (d2 === 1) {
        tryMelee(state, enemy, 2);
        applyPlayerDamage(state, 1, 'ion', { source: lore(ENEMIES[enemy.kind].loreName) });
      }
    }
    return;
  }

  if (dist <= 2) {
    enemy.windup = 1;
    pushLog(state, 'LOG-BOSS-TELE');
    return;
  }
  if (!tryMelee(state, enemy)) {
    stepToward(state, enemy, state.player.x, state.player.y);
  }
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
      enemy.intent = undefined;
      continue;
    }

    if (enemy.tier === 'boss') {
      tryBossPattern(state, enemy);
      continue;
    }

    const def = ENEMIES[enemy.kind];
    const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
    const inFov = state.visible[enemy.y]?.[enemy.x] ?? false;
    const aggro = effectiveAggro(state, enemy);

    if (def.beam && dist <= aggro && tryBeamPattern(state, enemy)) {
      continue;
    }

    switch (def.behavior) {
      case 'wander': {
        if (dist <= aggro) {
          if (!tryMelee(state, enemy)) stepToFlank(state, enemy);
        } else {
          randomStep(state, enemy);
        }
        break;
      }
      case 'swell': {
        if (dist <= aggro) {
          enemy.swellTurns += 1;
          if (enemy.swellTurns === 2) {
            pushLog(state, 'LOG-TELE-SWELL');
          }
          if (enemy.swellTurns >= 3) {
            pushLog(state, 'LOG-SPORE-BURST');
            if (dist <= 2) {
              state.player.energy -= 6;
              applyPlayerDamage(state, 3, 'ion', {
                source: lore(ENEMIES[enemy.kind].loreName),
              });
              addStatus(state.player, 'ion_burn', 3);
              addStatus(state.player, 'expose', 2);
              addStatus(state.player, 'blind', 2);
              pushLog(state, 'LOG-STATUS-BLIND');
            }
            enemy.alive = false;
            enemy.hp = 0;
            leaveContamination(state, enemy);
          }
        } else {
          enemy.swellTurns = Math.max(0, enemy.swellTurns - 1);
        }
        break;
      }
      case 'skirmish': {
        if (dist > aggro) break;
        if (enemy.skirmishRetreat) {
          stepAway(state, enemy);
          enemy.skirmishRetreat = false;
        } else if (tryMelee(state, enemy)) {
          enemy.skirmishRetreat = true;
        } else {
          stepToFlank(state, enemy);
        }
        break;
      }
      case 'ambush': {
        const playerDark = inShadow(state, state.player.x, state.player.y);
        if (!enemy.alerted) {
          if (dist <= 1 || inFov || (playerDark && dist <= aggro)) {
            enemy.alerted = true;
            pushLog(
              state,
              playerDark && !inFov ? 'LOG-AMBUSH-DARK' : 'LOG-AMBUSH',
            );
            if (playerDark && dist === 1) {
              tryMelee(state, enemy, 3);
              break;
            }
          } else {
            break;
          }
        }
        tryPouncePattern(state, enemy, aggro);
        break;
      }
      case 'drain': {
        if (dist > aggro) break;
        if (!tryMelee(state, enemy)) stepToFlank(state, enemy);
        break;
      }
      case 'guard': {
        const engage =
          state.lootTakenThisSector || dist <= 2 || (enemy.alerted && dist <= aggro);
        if (engage) {
          enemy.alerted = true;
          if (!tryMelee(state, enemy)) stepToFlank(state, enemy);
        } else {
          const hd = manhattan(enemy.x, enemy.y, enemy.homeX, enemy.homeY);
          if (hd > 3) stepToward(state, enemy, enemy.homeX, enemy.homeY);
          else randomStep(state, enemy);
        }
        break;
      }
      case 'sentinel': {
        if (def.overwatch) {
          if (enemy.intent === 'overwatch' && enemy.windup > 0) {
            if (dist === 1) {
              enemy.windup = 0;
              enemy.intent = undefined;
              tryMelee(state, enemy);
            }
            break;
          }
          if (dist <= aggro && dist > 1) {
            enemy.windup = 1;
            enemy.intent = 'overwatch';
            pushLog(state, 'LOG-TELE-OVERWATCH');
            break;
          }
        }
        if (dist <= aggro) {
          if (dist === 1) tryMelee(state, enemy);
          else if (dist <= 3) stepToFlank(state, enemy);
        } else {
          const hd = manhattan(enemy.x, enemy.y, enemy.homeX, enemy.homeY);
          if (hd > 0) stepToward(state, enemy, enemy.homeX, enemy.homeY);
        }
        break;
      }
      case 'hunter': {
        tryPouncePattern(state, enemy, aggro);
        break;
      }
    }
  }
}
