import type { LoreId } from '../data/lore';
import type { DamageType, GameState } from './types';

export function pushLog(state: GameState, loreId: LoreId, detail?: string): void {
  state.log.push({ loreId, detail, turn: state.turn });
  if (state.log.length > 80) state.log.shift();
}

export function recordLoreEvent(state: GameState, loreId: LoreId): void {
  state.loreEvents.push(loreId);
}

/** Compact combat detail: `Name -4 · 6/10 hp` (HUD wraps as base (detail)). */
export function formatCombatDetail(
  subject: string,
  dmg: number,
  remHp?: number,
  maxHp?: number,
  type?: DamageType,
): string {
  const parts: string[] = [subject, `-${dmg}`];
  if (type) parts.push(type);
  if (remHp !== undefined && maxHp !== undefined && remHp > 0) {
    parts.push(`${remHp}/${maxHp} hp`);
  } else if (remHp !== undefined && remHp > 0) {
    parts.push(`${remHp} hp`);
  }
  return parts.join(' · ');
}
