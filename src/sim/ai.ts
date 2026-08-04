import { ENEMIES } from '../data/enemies';
import { lore } from '../data/lore';
import { applyPlayerDamage, enemyAttack } from './combat';
import { pushLog } from './log';
import { bfsPath } from './fov';
import { addStatus, hasScar, hasStatus, scarStabilized, tickEnemyStatusEffects } from './status';
import { randInt } from './rng';
import { emAggroBonus } from './emStress';
import { livingAllyAt, tryEnemyMeleePreferPlayer } from './allyAi';
import { inShadow, isLit } from './light';
import { enemyAt, manhattan, npcAt } from './spatial';
import { leaveContamination } from './contamination';
import type { Enemy, GameState, Pos } from './types';

function tileBlocked(state: GameState, x: number, y: number, skipEnemyId?: number): boolean {
  if (enemyAt(state, x, y, skipEnemyId)) return true;
  if (livingAllyAt(state, x, y)) return true;
  if (npcAt(state, x, y)) return true;
  return false;
}

/** Detection radius after player stance, light, and campaign modifiers. */
export function effectiveAggro(state: GameState, enemy: Enemy): number {
  const def = ENEMIES[enemy.kind];
  let r = def.aggroRange;
  if (enemy.kind === 'mite' || enemy.kind === 'wasp' || enemy.kind === 'mastling' || enemy.kind === 'reef_skitter') {
    r += emAggroBonus(state);
  }
  if (state.sectorId === 'vault' && state.lootTakenThisSector && !state.paddMods.quietVault) {
    if (def.behavior === 'sentinel' || def.behavior === 'guard') r += 2;
  }
  if (hasStatus(state.player, 'marked')) r += 2;
  // Quiet stance (jammer): substantially shrink interest radius — hunter_eye softens shrink
  if (state.player.jammerTurns > 0) {
    const shrink = hasScar(state, 'hunter_eye') && !scarStabilized(state, 'hunter_eye') ? 2 : 3;
    r = Math.max(1, r - shrink);
  }
  // Light mastery: dark-prefer fauna shy from lamps; lit-prefer hunt bright tiles
  if (def.lightPrefer) {
    const lit = isLit(state, state.player.x, state.player.y);
    const dark = inShadow(state, state.player.x, state.player.y);
    if (def.lightPrefer === 'dark') {
      if (lit) r = Math.max(1, r - 2);
      else if (dark) r += 1;
    } else if (def.lightPrefer === 'lit') {
      if (lit) r += 2;
      else if (dark) r = Math.max(1, r - 1);
    }
  }
  return r;
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
    (x, y) => tileBlocked(state, x, y, enemy.id),
  );
  if (!path || path.length === 0) return false;
  const step = path[0]!;
  if (step.x === state.player.x && step.y === state.player.y) return false;
  if (tileBlocked(state, step.x, step.y, enemy.id)) return false;
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
      pushLog(state, 'LOG-BEAM-FIRE', `${lore(ENEMIES[enemy.kind].loreName)} -4E`);
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

/** Flares and stun interrupt a visible sentinel's held shot. */
export function cancelOverwatch(state: GameState): void {
  for (const enemy of state.enemies) {
    if (enemy.intent !== 'overwatch') continue;
    enemy.windup = 0;
    enemy.intent = undefined;
  }
}

/** Hunter/ambush/wraith: windup then pounce with bonus damage. */
function tryPouncePattern(state: GameState, enemy: Enemy, defAggro: number): void {
  const dist = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
  if (dist > defAggro) {
    enemy.windup = 0;
    enemy.intent = undefined;
    return;
  }
  if (enemy.windup > 0) {
    enemy.windup = 0;
    enemy.intent = undefined;
    if (dist === 1) {
      tryMelee(state, enemy, state.player.braceTurns > 0 ? 0 : 3);
    } else {
      // One lunge step — no double-step pounce (keeps telegraph readable).
      stepToward(state, enemy, state.player.x, state.player.y);
      const d2 = manhattan(enemy.x, enemy.y, state.player.x, state.player.y);
      if (d2 === 1) tryMelee(state, enemy, state.player.braceTurns > 0 ? 0 : 3);
    }
    return;
  }
  // Soft-shadow player (quiet lamp / dark tile): skip telegraph and strike if adjacent
  if (dist === 1 && inShadow(state, state.player.x, state.player.y)) {
    tryMelee(state, enemy, state.player.braceTurns > 0 ? 0 : 3);
    return;
  }
  if (dist <= 2) {
    enemy.windup = 1;
    enemy.intent = 'pounce';
    pushLog(state, 'LOG-TELE-POUNCE');
    return;
  }
  if (!tryMelee(state, enemy)) {
    stepToward(state, enemy, state.player.x, state.player.y);
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
      // Quiet-break / FOV drain pulse
      state.player.energy -= 2;
      addStatus(state.player, 'expose', 1);
      pushLog(state, 'LOG-DRAIN', `${lore(ENEMIES[enemy.kind].loreName)} -2E`);
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

function silenced(state: GameState, enemy: Enemy): boolean {
  if (state.player.jammerTurns <= 0) return false;
  const kind = enemy.kind;
  return kind === 'mite' || kind === 'wasp' || kind === 'reef_skitter';
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
    const quiet = silenced(state, enemy);
    const aggro = effectiveAggro(state, enemy);

    if (
      (enemy.kind === 'drone' || enemy.kind === 'duct_drone') &&
      dist <= aggro &&
      tryBeamPattern(state, enemy)
    ) {
      continue;
    }

    switch (def.behavior) {
      case 'wander': {
        if (quiet) {
          randomStep(state, enemy);
          break;
        }
        if (dist <= aggro) {
          if (!tryMelee(state, enemy)) stepToward(state, enemy, state.player.x, state.player.y);
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
        if (quiet) {
          randomStep(state, enemy);
          break;
        }
        if (dist > aggro) break;
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
        if (!tryMelee(state, enemy)) stepToward(state, enemy, state.player.x, state.player.y);
        break;
      }
      case 'guard': {
        const engage =
          state.lootTakenThisSector || dist <= 2 || (enemy.alerted && dist <= aggro);
        if (engage) {
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
        if (enemy.kind === 'sentinel') {
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
          else if (dist <= 3) stepToward(state, enemy, state.player.x, state.player.y);
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
