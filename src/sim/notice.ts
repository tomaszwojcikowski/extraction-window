import type { Enemy, GameState } from './types';
import { ENEMIES } from '../data/enemies';
import { emAggroBonus } from './emStress';
import { inShadow, isLit } from './light';
import { hasStatus } from './status';
import { shadowboundDarkAggro } from './brands';
import { manhattan } from './spatial';

/**
 * Detection radius as if the player stood on (px, py).
 * Shared by AI (`effectiveAggro`) and the tutorial's notice coaching.
 */
export function effectiveAggroAt(
  state: GameState,
  enemy: Enemy,
  px: number,
  py: number,
): number {
  const def = ENEMIES[enemy.kind];
  let r = def.aggroRange;
  if (
    enemy.kind === 'mite' ||
    enemy.kind === 'wasp' ||
    enemy.kind === 'mastling' ||
    enemy.kind === 'reef_skitter'
  ) {
    r += emAggroBonus(state);
  }
  if (state.sectorId === 'vault' && state.lootTakenThisSector && !state.paddMods.quietVault) {
    if (def.behavior === 'sentinel' || def.behavior === 'guard') r += 2;
  }
  if (hasStatus(state.player, 'marked')) r += 2;
  if (def.lightPrefer) {
    const lit = isLit(state, px, py);
    const dark = inShadow(state, px, py);
    if (def.lightPrefer === 'dark') {
      if (lit) r = Math.max(1, r - 2);
      else if (dark) r += 2;
    } else if (def.lightPrefer === 'lit') {
      if (lit) r += 3;
      else if (dark) r = Math.max(1, r - 1);
    }
    if (lit && state.ionFrontTurns > 0 && def.lightPrefer === 'lit') r += 1;
  }
  r += shadowboundDarkAggro(enemy, inShadow(state, px, py));
  return r;
}

/** Detection radius at the player's current tile. */
export function effectiveAggro(state: GameState, enemy: Enemy): number {
  return effectiveAggroAt(state, enemy, state.player.x, state.player.y);
}

/** Whether fauna would notice / engage from player tile (px, py). */
export function wouldNoticeEnemy(
  st: GameState,
  enemy: Enemy,
  px: number,
  py: number,
): boolean {
  const dist = manhattan(enemy.x, enemy.y, px, py);
  const aggro = effectiveAggroAt(st, enemy, px, py);
  const def = ENEMIES[enemy.kind];
  const inFov = st.visible[enemy.y]?.[enemy.x] ?? false;

  switch (def.behavior) {
    case 'ambush':
      if (!enemy.alerted) {
        const playerDark = inShadow(st, px, py);
        return dist <= 1 || inFov || (playerDark && dist <= aggro);
      }
      return dist <= aggro;
    case 'guard':
      return (
        st.lootTakenThisSector || dist <= 2 || (enemy.alerted && dist <= aggro)
      );
    case 'sentinel':
      return dist <= aggro;
    default:
      return dist <= aggro;
  }
}
