import type { StatusId, StatusMap, GameState, Enemy } from './types';
import { pushLog } from './combat';

export function addStatus(target: { statuses: StatusMap }, id: StatusId, turns: number): void {
  const cur = target.statuses[id] ?? 0;
  target.statuses[id] = Math.max(cur, turns);
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

/** Apply end-of-turn status damage/effects to the player. */
export function tickPlayerStatusEffects(state: GameState): void {
  const p = state.player;
  if (hasStatus(p, 'bleed')) {
    // Bleed bypasses ablative armor
    p.hp -= 1;
    pushLog(state, 'LOG-STATUS-BLEED');
  }
  if (hasStatus(p, 'ion_burn')) {
    const drain = p.filterTurns > 0 ? 1 : 2;
    p.energy -= drain;
    pushLog(state, 'LOG-STATUS-ION');
  }
  tickStatuses(p);
}

export function tickEnemyStatusEffects(state: GameState, enemy: Enemy): void {
  if (!enemy.alive) return;
  if (hasStatus(enemy, 'stun')) {
    enemy.windup = 0;
  }
  if (hasStatus(enemy, 'bleed')) {
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.hp = 0;
      pushLog(state, 'LOG-KILL');
    }
  }
  if (hasStatus(enemy, 'ion_burn')) {
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.hp = 0;
      pushLog(state, 'LOG-KILL');
    }
  }
  tickStatuses(enemy);
}

export function statusHud(statuses: StatusMap): string {
  const parts: string[] = [];
  if ((statuses.stun ?? 0) > 0) parts.push(`STN${statuses.stun}`);
  if ((statuses.bleed ?? 0) > 0) parts.push(`BLD${statuses.bleed}`);
  if ((statuses.ion_burn ?? 0) > 0) parts.push(`ION${statuses.ion_burn}`);
  if ((statuses.expose ?? 0) > 0) parts.push(`EXP${statuses.expose}`);
  return parts.join(' ');
}
