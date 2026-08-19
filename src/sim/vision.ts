import { computeFov, playerFovRadius } from './fov';
import { rebuildIllumination, tickLightSources } from './light';
import { EQUIP_TAGS } from '../data/items';
import { isItemWorn } from './equip';
import { mechanicsModifyFov } from './mechanics';
import { hasStatus } from './status';
import { noticeVisibleBrands } from './brands';
import type { GameState } from './types';

export function visionRadius(state: GameState): number {
  let base =
    playerFovRadius(state.player.probeTurns) + state.paddMods.fovBonus;
  let r = mechanicsModifyFov(state, base);
  if (isItemWorn(state, 'survey_visor')) {
    r = Math.max(2, r - EQUIP_TAGS.survey_visor.fovCap);
  }
  if (hasStatus(state.player, 'blind')) {
    const pen = 2;
    r = Math.max(2, r - pen);
  }
  return r;
}

/** Recompute FOV then illumination grid (call after moves / sector load). */
export function refreshVision(state: GameState): void {
  computeFov(
    state.tiles,
    state.explored,
    state.visible,
    state.player.x,
    state.player.y,
    visionRadius(state),
  );
  rebuildIllumination(state);
  noticeVisibleBrands(state);
}

/** End-of-turn light decay then vision refresh. */
export function refreshVisionAfterTurn(state: GameState): void {
  tickLightSources(state);
  refreshVision(state);
}
