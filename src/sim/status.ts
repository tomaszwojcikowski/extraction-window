import type { StatusId, StatusMap, GameState, Enemy, ScanScar } from './types';
import { killEnemy } from './death';
import { formatCombatDetail, pushLog } from './log';

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

/** Bleed damage per tick — ablative vest softens player bleed. */
export function playerBleedDamage(state: GameState): number {
  return state.player.equip.armor === 'ablative_vest' ? 1 : 2;
}

/** Apply end-of-turn status damage/effects to the player. */
export function tickPlayerStatusEffects(state: GameState): void {
  const p = state.player;
  if (hasStatus(p, 'bleed')) {
    const dmg = playerBleedDamage(state);
    p.hp -= dmg;
    const rem = Math.max(0, p.hp);
    pushLog(state, 'LOG-STATUS-BLEED', formatCombatDetail('bleed', dmg, rem, p.maxHp));
  }
  if (hasStatus(p, 'ion_burn')) {
    const drain = p.filterTurns > 0 ? 1 : 3;
    p.energy -= drain;
    pushLog(state, 'LOG-STATUS-ION', `-${drain}E · ${Math.max(0, p.energy)} bus`);
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
  if ((statuses.stun ?? 0) > 0) parts.push(`STN${statuses.stun}`);
  if ((statuses.bleed ?? 0) > 0) parts.push(`BLD${statuses.bleed}`);
  if ((statuses.blind ?? 0) > 0) parts.push(`BLN${statuses.blind}`);
  if ((statuses.jam ?? 0) > 0) parts.push(`JAM${statuses.jam}`);
  if ((statuses.fatigue ?? 0) > 0) parts.push(`FAT${statuses.fatigue}`);
  if ((statuses.marked ?? 0) > 0) parts.push(`MRK${statuses.marked}`);
  if ((statuses.ion_burn ?? 0) > 0) parts.push(`PLS${statuses.ion_burn}`);
  if ((statuses.expose ?? 0) > 0) parts.push(`XPS${statuses.expose}`);
  return parts.join(' ');
}

const SCAR_BADGE: Record<ScanScar['id'], string> = {
  array_bleed: 'ARR',
  hunter_eye: 'EYE',
};

/** Compact scan-scar badges for HUD (stabilized scars get a +). */
export function scarHud(scars: ScanScar[]): string {
  if (scars.length === 0) return '';
  return scars
    .map((s) => `${SCAR_BADGE[s.id]}${s.stabilized ? '+' : ''}`)
    .join(' ');
}

export function hasScar(state: GameState, id: ScanScar['id']): boolean {
  return state.scanScars.some((s) => s.id === id);
}

export function scarStabilized(state: GameState, id: ScanScar['id']): boolean {
  return state.scanScars.some((s) => s.id === id && s.stabilized);
}

/** Stabilize one unstabilized scar; returns true if any changed. */
export function tryStabilizeScar(state: GameState): boolean {
  const scar = state.scanScars.find((s) => !s.stabilized);
  if (!scar) return false;
  scar.stabilized = true;
  pushLog(state, 'LOG-SCAR-STABLE', SCAR_BADGE[scar.id]);
  return true;
}
