import { ENEMY_DROPS, dropChance } from '../data/drops';
import { ENEMIES } from '../data/enemies';
import { XP_KILL_BASE } from '../data/progression';
import { lore, type LoreId } from '../data/lore';
import { addStatus, hasStatus } from './status';
import { gainXp, hasSkill } from './progression';
import type { DamageType, Enemy, GameState } from './types';

export function pushLog(state: GameState, loreId: LoreId, detail?: string): void {
  state.log.push({ loreId, detail, turn: state.turn });
  if (state.log.length > 80) state.log.shift();
}

export function recordLoreEvent(state: GameState, loreId: LoreId): void {
  state.loreEvents.push(loreId);
}

export function meleeDamage(atk: number, def: number, variance: number): number {
  return Math.max(1, atk - def + variance);
}

export function toolAtkBonus(state: GameState): number {
  return state.player.equip.tool === 'blade' ? 1 : 0;
}

/**
 * Apply damage to the player: ion filter halves ion, then ablative armor absorbs before HP.
 * Returns whether armor fully absorbed the hit (no HP loss).
 */
export function applyPlayerDamage(
  state: GameState,
  amount: number,
  type: DamageType,
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

  if (state.player.armor > 0) {
    armorLost = Math.min(state.player.armor, dmg);
    state.player.armor -= armorLost;
    dmg -= armorLost;
    if (armorLost > 0) pushLog(state, 'LOG-ARMOR-ABSORB', `-${armorLost}`);
  }
  if (dmg > 0) {
    hpLost = dmg;
    state.player.hp -= hpLost;
    pushLog(state, 'LOG-HURT', `-${hpLost}`);
  }
  return { armorLost, hpLost, fullyAbsorbed: hpLost === 0 && armorLost > 0 };
}

function tryDeathDrop(state: GameState, enemy: Enemy): void {
  let chance = dropChance(state.sectorIndex);
  if (hasSkill(state, 'scavenger')) chance = Math.min(0.95, chance + 0.15);
  if (state.rng() > chance) return;
  const table = ENEMY_DROPS[enemy.kind];
  if (!table.length) return;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = state.rng() * total;
  let kind = table[0]!.kind;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) {
      kind = entry.kind;
      break;
    }
  }
  state.items.push({
    id: state.nextEntityId++,
    kind,
    x: enemy.x,
    y: enemy.y,
  });
  pushLog(state, 'LOG-LOOT-DROP', lore(ENEMIES[enemy.kind].loreName));
}

export function killEnemy(state: GameState, enemy: Enemy): void {
  enemy.alive = false;
  enemy.hp = 0;
  pushLog(state, 'LOG-KILL', lore(ENEMIES[enemy.kind].loreName));
  tryDeathDrop(state, enemy);
  gainXp(state, XP_KILL_BASE + Math.floor(enemy.maxHp / 2));
}

export function playerAttack(state: GameState, enemy: Enemy, variance: number): void {
  const overcharge =
    hasSkill(state, 'overcharge') && state.player.hp <= state.player.maxHp * 0.5 ? 1 : 0;
  const atk =
    state.player.atk +
    toolAtkBonus(state) +
    (state.player.probeTurns > 0 ? 2 : 0) +
    (state.player.stimTurns > 0 ? 3 : 0) +
    (hasStatus(enemy, 'expose') ? 2 : 0) +
    overcharge;
  const def = enemy.def - (hasStatus(enemy, 'expose') ? 1 : 0);
  const dmg = meleeDamage(atk, Math.max(0, def), variance);
  enemy.hp -= dmg;
  const rem = Math.max(0, enemy.hp);
  pushLog(state, 'LOG-HIT', rem > 0 ? `-${dmg} · hp${rem}` : `-${dmg}`);
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
    (state.player.stabilizeTurns > 0 ? 1 : 0) +
    lastWindow -
    (hasStatus(state.player, 'expose') ? 1 : 0);
  const atk = enemy.atk + (opts?.bonusAtk ?? 0);
  const dmg = meleeDamage(atk, Math.max(0, def), variance);
  const dtype = ENEMIES[enemy.kind].damageType;
  const result = applyPlayerDamage(state, dmg, dtype);

  if (ENEMIES[enemy.kind].behavior === 'drain') {
    state.player.energy -= 2;
    pushLog(state, 'LOG-DRAIN', '-2E');
  }
  if (
    enemy.kind === 'stalker' ||
    enemy.kind === 'serpent' ||
    enemy.kind === 'wraith' ||
    enemy.kind === 'skitter'
  ) {
    addStatus(state.player, 'bleed', 2);
  }
  if (enemy.kind === 'rift') {
    addStatus(state.player, 'expose', 3);
  }
  return result.fullyAbsorbed;
}
