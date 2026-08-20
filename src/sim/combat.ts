import { ENEMIES } from '../data/enemies';
import { lore } from '../data/lore';
import { ARMOR_DEF_BONUS, TOOL_ATK_BONUS, equipOnHitBleed, equipOnHitStun } from '../data/items';
import { equippedSuit, equippedTool } from './equip';
import { killEnemy } from './death';
import { formatCombatDetail, pushLog } from './log';
import { inShadow } from './light';
import { addStatus, addPlayerMarked, hasStatus } from './status';
import { brandIonAttackPenalty } from './brands';
import { applyPlayerDamage } from './playerDamage';
import {
  enemyAttackStance,
  playerAttackStance,
  resolveHit,
  shadowAmbush,
} from './stance';
import type { Enemy, GameState } from './types';

export { meleeDamage } from './combatMath';
export { applyPlayerDamage } from './playerDamage';
export { pushLog, recordLoreEvent, formatCombatDetail } from './log';
export { killEnemy, markEnemyDead } from './death';

export function toolAtkBonus(state: GameState): number {
  const tool = equippedTool(state);
  if (!tool) return 0;
  return TOOL_ATK_BONUS[tool] ?? 0;
}

export function armorDefBonus(state: GameState): number {
  const suit = equippedSuit(state);
  if (!suit) return 0;
  return ARMOR_DEF_BONUS[suit] ?? 0;
}

/**
 * You cannot cover every side at once. Each hostile in contact past the first
 * peels a point of defence off, which is what makes the shape of a room worth
 * anything: a doorway lets one of them reach you, open floor lets four.
 * Capped so a swarm is a reason to change ground rather than an instant death.
 * Peak peel is three so an open-floor pack reads harsher than a doorway duel.
 */
const MAX_FLANK_PENALTY = 3;

/**
 * Preferred-light bite — Wave 9 named this +1; it only lived on aggro range.
 * Dark-prefer fauna get it in SHADOW. Lit-prefer stays an aggro cue: wiring
 * +1 ATK on true LIT is a flat wasp buff (the surveyor is usually on their lamp).
 */
export function lightPreferAtkBonus(state: GameState, enemy: Enemy): number {
  const prefer = ENEMIES[enemy.kind].lightPrefer;
  if (prefer !== 'dark') return 0;
  return inShadow(state, state.player.x, state.player.y) ? 1 : 0;
}

/**
 * Catch fauna on the lighting they do not want: dark-prefer in the open,
 * lamp-hunters in SHADOW. Same +1 they get against you — not a new verb.
 * Enhanced already ignores weapon, so this only applies on a Normal bump.
 */
export function playerLightAtkBonus(state: GameState, enemy: Enemy): number {
  const prefer = ENEMIES[enemy.kind].lightPrefer;
  if (!prefer) return 0;
  const dark = inShadow(state, state.player.x, state.player.y);
  if (prefer === 'dark' && !dark) return 1;
  if (prefer === 'lit' && dark) return 1;
  return 0;
}

/** Bumping a winding foe breaks the painted charge without a new key. */
export function interruptArmedWindup(enemy: Enemy): boolean {
  if (!enemy.alive) return false;
  if (enemy.windup <= 0 && enemy.intent === undefined) return false;
  enemy.windup = 0;
  enemy.intent = undefined;
  return true;
}

export function flankPenalty(state: GameState): number {
  const inContact = state.enemies.filter(
    (enemy) =>
      enemy.alive &&
      Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y) === 1,
  ).length;
  return Math.min(MAX_FLANK_PENALTY, Math.max(0, inContact - 1));
}

function hasEscortCover(state: GameState): boolean {
  return state.allies.some(
    (ally) =>
      ally.alive &&
      ally.kind === 'away_escort' &&
      Math.abs(ally.x - state.player.x) + Math.abs(ally.y - state.player.y) === 1,
  );
}

export function playerAttack(state: GameState, enemy: Enemy, variance: number): void {
  const ambush = shadowAmbush(state, enemy);
  const stance = playerAttackStance(state, enemy);
  const light = stance === 'normal' ? playerLightAtkBonus(state, enemy) : 0;
  const weapon = state.player.atk + toolAtkBonus(state) + light;
  const dmg = resolveHit(weapon, enemy.def, variance, stance, state.rng);
  if (stance === 'enhanced' && hasStatus(enemy, 'stun')) pushLog(state, 'LOG-PUNISH');
  else if (stance === 'enhanced' && ambush) pushLog(state, 'LOG-SHADOW-AMBUSH');
  else if (stance === 'enhanced') pushLog(state, 'LOG-ENHANCED');
  else if (stance === 'impaired') pushLog(state, 'LOG-IMPAIRED');
  if (light > 0) {
    pushLog(state, 'LOG-LIGHT-MATCH', inShadow(state, state.player.x, state.player.y) ? 'SHADOW' : 'LIT');
  }
  enemy.hp -= dmg;
  const rem = Math.max(0, enemy.hp);
  const name = lore(ENEMIES[enemy.kind].loreName);
  pushLog(state, 'LOG-HIT', formatCombatDetail(name, dmg, rem, enemy.maxHp));
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
  } else if (enemy.alive) {
    if (interruptArmedWindup(enemy)) pushLog(state, 'LOG-CHARGE-BREAK');
    const stunTurns = equipOnHitStun(equippedTool(state));
    if (stunTurns > 0) {
      addStatus(enemy, 'stun', stunTurns);
      enemy.windup = 0;
      enemy.intent = undefined;
    }
    const bleedTurns = equipOnHitBleed(equippedTool(state));
    if (bleedTurns > 0) addStatus(enemy, 'bleed', bleedTurns);
  }
  enemy.alerted = true;
}

export function enemyAttack(
  state: GameState,
  enemy: Enemy,
  variance: number,
  opts?: { bonusAtk?: number },
): boolean {
  const def =
    state.player.def +
    armorDefBonus(state) +
    (hasEscortCover(state) ? 1 : 0) -
    flankPenalty(state);
  const prefer = lightPreferAtkBonus(state, enemy);
  const stance = enemyAttackStance(state, prefer > 0);
  const atk = enemy.atk + (opts?.bonusAtk ?? 0);
  const rawDamage = resolveHit(atk, Math.max(0, def), variance, stance, state.rng);
  const dtype = ENEMIES[enemy.kind].damageType;
  const dmg = dtype === 'ion' ? Math.max(1, rawDamage - brandIonAttackPenalty(enemy)) : rawDamage;
  const name = lore(ENEMIES[enemy.kind].loreName);
  if (prefer > 0) pushLog(state, 'LOG-SHADOW-BITE');
  else if (stance === 'enhanced') pushLog(state, 'LOG-ENHANCED');
  const result = applyPlayerDamage(state, dmg, dtype, { source: name });
  enemy.alerted = true;

  if (ENEMIES[enemy.kind].behavior === 'drain') {
    state.player.energy -= 2;
    pushLog(state, 'LOG-DRAIN', `${name} -2 Power`);
  }
  if (
    enemy.kind === 'stalker' ||
    enemy.kind === 'serpent' ||
    enemy.kind === 'wraith' ||
    enemy.kind === 'skitter'
  ) {
    addStatus(state.player, 'bleed', 3);
  }
  if (enemy.kind === 'wasp' || enemy.kind === 'skitter' || enemy.kind === 'reef_skitter') {
    if (state.rng() < 0.28) {
      addPlayerMarked(state, 4);
      pushLog(state, 'LOG-STATUS-MARKED');
    }
  }
  if (enemy.kind === 'wasp' && state.rng() < 0.18) {
    addStatus(state.player, 'bleed', 2);
  }
  if (enemy.kind === 'rift') {
    addStatus(state.player, 'expose', 4);
  }
  return result.fullyAbsorbed;
}
