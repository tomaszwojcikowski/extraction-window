import { computeFov, playerFovRadius } from './fov';
import { rebuildIllumination, tickLightSources } from './light';
import { mechanicsModifyFov } from './mechanics';
import { hasScar, hasStatus } from './status';
import type { GameState } from './types';

export function visionRadius(state: GameState): number {
  let base =
    playerFovRadius(state.player.probeTurns, state.player.lensTurns) +
    state.paddMods.fovBonus +
    (state.player.equip.utility === 'sensor_rig' ? 1 : 0);
  // hunter_eye: +1 FOV; quiet modifyFov still applies after
  if (hasScar(state, 'hunter_eye')) base += 1;
  let r = mechanicsModifyFov(state, base);
  if (hasStatus(state.player, 'blind')) {
    const pen = state.player.equip.utility === 'sensor_rig' ? 1 : 2;
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
}

/** End-of-turn light decay then vision refresh. */
export function refreshVisionAfterTurn(state: GameState): void {
  tickLightSources(state);
  refreshVision(state);
}
