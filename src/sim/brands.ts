import { ENEMIES, type EnemyBrand } from '../data/enemies';
import { lore, type LoreId } from '../data/lore';
import { pushLog } from './log';
import type { Enemy, GameState } from './types';

export function enemyBrand(enemy: Enemy): EnemyBrand | null {
  return ENEMIES[enemy.kind].brand ?? null;
}

/** Flarebound targets overload under a plasma flare. */
export function flareDamageForEnemy(enemy: Enemy, baseDamage: number): number {
  return enemyBrand(enemy) === 'flarebound' ? baseDamage + 2 : baseDamage;
}

/** Warded ion lattices blunt their own ion output by one point. */
export function brandIonAttackPenalty(enemy: Enemy): number {
  return enemyBrand(enemy) === 'warded' ? 1 : 0;
}

/** Shadowbound fields make dark tiles a more dangerous place to linger. */
export function shadowboundDarkAggro(enemy: Enemy, playerInShadow: boolean): number {
  return enemyBrand(enemy) === 'shadowbound' && playerInShadow ? 1 : 0;
}

export function brandLoreId(brand: EnemyBrand): LoreId {
  switch (brand) {
    case 'flarebound':
      return 'BRAND-FLAREBOUND';
    case 'warded':
      return 'BRAND-WARDED';
    case 'shadowbound':
      return 'BRAND-SHADOWBOUND';
  }
}

/** Log a readable brand tell once, only after the hostile is actually seen. */
export function noticeVisibleBrands(state: GameState): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive || !enemyBrand(enemy)) continue;
    if (state.noticedBrandIds.includes(enemy.id)) continue;
    if (!(state.visible[enemy.y]?.[enemy.x] ?? false)) continue;
    state.noticedBrandIds.push(enemy.id);
    pushLog(state, 'LOG-BRAND-SIGHT', lore(brandLoreId(enemyBrand(enemy)!)));
  }
}
