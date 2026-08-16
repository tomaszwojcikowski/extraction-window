import type { StatusId, StatusMap, GameState, Enemy } from './types';
import { killEnemy } from './death';
import { formatCombatDetail, pushLog } from './log';

export function addStatus(target: { statuses: StatusMap }, id: StatusId, turns: number): void {
  const cur = target.statuses[id] ?? 0;
  target.statuses[id] = Math.max(cur, turns);
}

export function addPlayerMarked(state: GameState, turns: number): void {
  addStatus(state.player, 'marked', turns);
}

export function hasStatus(target: { statuses: StatusMap }, id: StatusId): boolean {
  return (target.statuses[id] ?? 0) > 0;
}

export function tickStatuses(target: { statuses: StatusMap }): void {
  for (const key of Object.keys(target.statuses) as StatusId[]) {
    const v = target.statuses[key];
    if (v === undefined) continue;
    if (v <= 1) delete target.statuses[key];
    else target.statuses[key] = v - 1;
  }
}

/** Bleed damage per tick — ablative vest softens player bleed. */
export function playerBleedDamage(state: GameState): number {
  return state.player.equip.armor === 'ablative_vest' ? 1 : 2;
}

/** Apply end-of-turn status damage/effects to the player. */
export function tickPlayerStatusEffects(state: GameState): void {
  const p = state.player;
  // Drill bay: keep teaching calm — statuses may exist after the stalker, but don't bleed out.
  if (!state.tutorialActive) {
    if (hasStatus(p, 'bleed')) {
      const dmg = playerBleedDamage(state);
      p.hp -= dmg;
      const rem = Math.max(0, p.hp);
      pushLog(state, 'LOG-STATUS-BLEED', formatCombatDetail('bleed', dmg, rem, p.maxHp));
    }
    if (hasStatus(p, 'ion_burn')) {
      const drain = p.filterTurns > 0 ? 1 : 3;
      p.energy -= drain;
      pushLog(state, 'LOG-STATUS-ION', `-${drain} Bus · ${Math.max(0, p.energy)} left`);
    }
  }
  tickStatuses(p);
}

export function tickEnemyStatusEffects(state: GameState, enemy: Enemy): void {
  if (!enemy.alive) return;
  if (hasStatus(enemy, 'stun')) {
    enemy.windup = 0;
  }
  if (hasStatus(enemy, 'bleed')) {
    enemy.hp -= 2;
    if (enemy.hp <= 0) {
      killEnemy(state, enemy);
    }
  }
  if (hasStatus(enemy, 'ion_burn') && enemy.alive) {
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      killEnemy(state, enemy);
    }
  }
  if (enemy.alive) tickStatuses(enemy);
}

export function statusHud(statuses: StatusMap): string {
  const parts: string[] = [];
  if ((statuses.stun ?? 0) > 0) parts.push(`Stun ${statuses.stun}`);
  if ((statuses.bleed ?? 0) > 0) parts.push(`Bleed ${statuses.bleed}`);
  if ((statuses.blind ?? 0) > 0) parts.push(`Blind ${statuses.blind}`);
  if ((statuses.jam ?? 0) > 0) parts.push(`Jam ${statuses.jam}`);
  if ((statuses.marked ?? 0) > 0) parts.push(`Marked ${statuses.marked}`);
  if ((statuses.ion_burn ?? 0) > 0) parts.push(`Burn ${statuses.ion_burn}`);
  if ((statuses.expose ?? 0) > 0) parts.push(`Exposed ${statuses.expose}`);
  return parts.join(' · ');
}

