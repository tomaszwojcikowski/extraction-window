import { ENEMIES } from '../data/enemies';
import { lore, type LoreId } from '../data/lore';
import { addStatus, hasStatus } from './status';
import type { GameState, Enemy } from './types';

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

export function playerAttack(state: GameState, enemy: Enemy, variance: number): void {
  const atk =
    state.player.atk +
    (state.player.probeTurns > 0 ? 2 : 0) +
    (state.player.stimTurns > 0 ? 3 : 0) +
    (hasStatus(enemy, 'expose') ? 2 : 0);
  const def = enemy.def - (hasStatus(enemy, 'expose') ? 1 : 0);
  const dmg = meleeDamage(atk, Math.max(0, def), variance);
  enemy.hp -= dmg;
  pushLog(state, 'LOG-HIT', `-${dmg}`);
  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.hp = 0;
    pushLog(state, 'LOG-KILL', lore(ENEMIES[enemy.kind].loreName));
  }
}

export function enemyAttack(state: GameState, enemy: Enemy, variance: number): void {
  const def =
    state.player.def +
    (state.player.plateTurns > 0 ? 2 : 0) -
    (hasStatus(state.player, 'expose') ? 1 : 0);
  const dmg = meleeDamage(enemy.atk, Math.max(0, def), variance);
  state.player.hp -= dmg;
  pushLog(state, 'LOG-HURT', `-${dmg}`);
  if (ENEMIES[enemy.kind].behavior === 'drain') {
    state.player.energy -= 2;
    pushLog(state, 'LOG-DRAIN', '-2E');
  }
  if (enemy.kind === 'stalker' || enemy.kind === 'serpent') {
    addStatus(state.player, 'bleed', 2);
  }
}
