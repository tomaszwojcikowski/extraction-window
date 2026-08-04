import { ENEMIES } from '../data/enemies';
import { lore } from '../data/lore';
import { ARMOR_DEF_BONUS, TOOL_ATK_BONUS, equipOnHitBleed, equipOnHitStun } from '../data/items';
import { killEnemy } from './death';
import { formatCombatDetail, pushLog } from './log';
import { addStatus, addPlayerMarked, hasScar, hasStatus } from './status';
import { hasSkill } from './progression';
import type { DamageType, Enemy, GameState } from './types';

export { pushLog, recordLoreEvent, formatCombatDetail } from './log';
export { killEnemy, markEnemyDead } from './death';

export function meleeDamage(atk: number, def: number, variance: number): number {
  return Math.max(1, atk - def + variance);
}

export function toolAtkBonus(state: GameState): number {
  const tool = state.player.equip.tool;
  if (!tool) return 0;
  return TOOL_ATK_BONUS[tool] ?? 0;
}

export function armorDefBonus(state: GameState): number {
  const armor = state.player.equip.armor;
  if (!armor) return 0;
  return ARMOR_DEF_BONUS[armor] ?? 0;
}

/**
 * Apply damage to the player: ion filter halves ion, then ablative armor absorbs before HP.
 * Returns whether armor fully absorbed the hit (no HP loss).
 */
export function applyPlayerDamage(
  state: GameState,
  amount: number,
  type: DamageType,
  opts?: { source?: string },
): { armorLost: number; hpLost: number; fullyAbsorbed: boolean } {
  let dmg = Math.max(0, amount);
  const filterOn = state.player.filterTurns > 0;
  const ionSkin = hasSkill(state, 'ion_skin');
  if (filterOn && (type === 'ion' || (ionSkin && type === 'kinetic'))) {
    dmg = Math.max(1, Math.ceil(dmg / 2));
  }

  let armorLost = 0;
  let hpLost = 0;
  if (dmg <= 0) return { armorLost: 0, hpLost: 0, fullyAbsorbed: true };

  const src = opts?.source;
  if (state.player.armor > 0) {
    let absorbCap = dmg;
    // Exposed away officers bleed through personal shields
    if (hasStatus(state.player, 'expose')) {
      absorbCap = Math.max(0, Math.ceil(dmg * 0.55));
    }
    armorLost = Math.min(state.player.armor, absorbCap);
    state.player.armor -= armorLost;
    dmg -= armorLost;
    if (armorLost > 0) {
      pushLog(state, 'LOG-ARMOR-ABSORB', src ? `${src} -${armorLost}` : `-${armorLost}`);
    }
  }
  if (dmg > 0) {
    hpLost = dmg;
    state.player.hp -= hpLost;
    const rem = Math.max(0, state.player.hp);
    pushLog(
      state,
      'LOG-HURT',
      formatCombatDetail(src ?? 'hit', hpLost, rem, state.player.maxHp, type),
    );
  }
  return { armorLost, hpLost, fullyAbsorbed: hpLost === 0 && armorLost > 0 };
}

export function playerAttack(state: GameState, enemy: Enemy, variance: number): void {
  const overcharge =
    hasSkill(state, 'overcharge') && state.player.hp <= state.player.maxHp * 0.5 ? 1 : 0;
  const scarAtk = hasScar(state, 'array_bleed') ? 1 : 0;
  const atk =
    state.player.atk +
    toolAtkBonus(state) +
    (state.player.probeTurns > 0 ? 2 : 0) +
    (state.player.stimTurns > 0 ? 3 : 0) +
    (hasStatus(enemy, 'expose') ? 4 : 0) +
    overcharge +
    scarAtk;
  const def = enemy.def - (hasStatus(enemy, 'expose') ? 2 : 0);
  const dmg = meleeDamage(atk, Math.max(0, def), variance);
  enemy.hp -= dmg;
  const rem = Math.max(0, enemy.hp);
  const name = lore(ENEMIES[enemy.kind].loreName);
  pushLog(state, 'LOG-HIT', formatCombatDetail(name, dmg, rem, enemy.maxHp));
  if (enemy.alive && enemy.hp > 0) {
    const stunTurns = equipOnHitStun(state.player.equip.tool);
    if (stunTurns > 0) {
      addStatus(enemy, 'stun', stunTurns);
      enemy.windup = 0;
    }
    const bleedTurns = equipOnHitBleed(state.player.equip.tool);
    if (bleedTurns > 0) addStatus(enemy, 'bleed', bleedTurns);
  }
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
  }
}

export function enemyAttack(
  state: GameState,
  enemy: Enemy,
  variance: number,
  opts?: { bonusAtk?: number },
): boolean {
  const lastWindow = hasSkill(state, 'last_window') && state.stormTurns <= 80 ? 1 : 0;
  const def =
    state.player.def +
    armorDefBonus(state) +
    (state.player.stabilizeTurns > 0 ? 1 : 0) +
    lastWindow -
    (hasStatus(state.player, 'expose') ? 2 : 0);
  const atk = enemy.atk + (opts?.bonusAtk ?? 0);
  const dmg = meleeDamage(atk, Math.max(0, def), variance);
  const dtype = ENEMIES[enemy.kind].damageType;
  const name = lore(ENEMIES[enemy.kind].loreName);
  const result = applyPlayerDamage(state, dmg, dtype, { source: name });

  if (ENEMIES[enemy.kind].behavior === 'drain') {
    state.player.energy -= 2;
    pushLog(state, 'LOG-DRAIN', `${name} -2E`);
  }
  if (
    enemy.kind === 'stalker' ||
    enemy.kind === 'serpent' ||
    enemy.kind === 'wraith' ||
    enemy.kind === 'skitter'
  ) {
    addStatus(state.player, 'bleed', 3);
  }
  // Wasp / skitter: chance to mark the surveyor (hunter notice)
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
