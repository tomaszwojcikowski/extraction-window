import type { GameState, Enemy } from './types';
import type { LoreId } from '../data/lore';

export function pushLog(state: GameState, loreId: LoreId, detail?: string): void {
  state.log.push({ loreId, detail, turn: state.turn });
  if (state.log.length > 80) state.log.shift();
}

export function recordLoreEvent(state: GameState, loreId: LoreId): void {
  state.loreEvents.push(loreId);
}

export function meleeDamage(atk: number, def: number, variance: number): number {
  const raw = Math.max(1, atk - def + variance);
  return raw;
}

export function playerAttack(state: GameState, enemy: Enemy, variance: number): void {
  const atk = state.player.atk + (state.player.probeTurns > 0 ? 2 : 0);
  const dmg = meleeDamage(atk, enemy.def, variance);
  enemy.hp -= dmg;
  pushLog(state, 'LOG-HIT', `-${dmg}`);
  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.hp = 0;
    pushLog(state, 'LOG-KILL');
  }
}

export function enemyAttack(state: GameState, enemy: Enemy, variance: number): void {
  const dmg = meleeDamage(enemy.atk, state.player.def, variance);
  state.player.hp -= dmg;
  pushLog(state, 'LOG-HURT', `-${dmg}`);
}
