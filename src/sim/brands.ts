import { ENEMIES, type EnemyBrand } from '../data/enemies';
import { lore, type LoreId } from '../data/lore';
import { pushLog } from './log';
import type { Enemy, GameState } from './types';

export function enemyBrand(enemy: Enemy): EnemyBrand | null {
  return ENEMIES[enemy.kind].brand ?? null;
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
