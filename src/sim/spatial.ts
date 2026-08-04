import type { Ally, Enemy, FieldNpc, GameState } from './types';

export function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function enemyAt(
  state: GameState,
  x: number,
  y: number,
  skipId?: number,
): Enemy | undefined {
  return state.enemies.find((e) => e.alive && e.id !== skipId && e.x === x && e.y === y);
}

export function allyAt(
  state: GameState,
  x: number,
  y: number,
  skipId?: number,
): Ally | undefined {
  return state.allies.find((a) => a.alive && a.id !== skipId && a.x === x && a.y === y);
}

export function npcAt(state: GameState, x: number, y: number): FieldNpc | undefined {
  return state.npcs.find((n) => n.x === x && n.y === y);
}
