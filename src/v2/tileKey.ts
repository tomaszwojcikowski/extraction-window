import {
  floorVariantAt,
  wallTextureKey,
  wallWearAt,
} from '../scenes/textures';
import { floorTextureKey } from '../scenes/theme';
import { propFrameKey } from '../art/animPose';
import type { GameState, TileKind } from '../sim/types';

/** Wall face role from open neighbors — same rule as GameScene. */
export function wallVariantAt(state: GameState, x: number, y: number): number {
  const solid = (tx: number, ty: number): boolean => state.tiles[ty]?.[tx]?.kind === 'wall';
  const openL = !solid(x - 1, y);
  const openR = !solid(x + 1, y);
  const openU = !solid(x, y - 1);
  const openD = !solid(x, y + 1);
  if ((openL && openR) || (openU && openD) || ((openL || openR) && (openU || openD))) {
    return 3;
  }
  if (openL) return 1;
  if (openR) return 2;
  return 0;
}

/** Atlas frame for a map cell. Idle prop frame — same mapping as GameScene.tileKey. */
export function tileTextureKey(state: GameState, kind: TileKind, x: number, y: number): string {
  const animated = (base: string): string => propFrameKey(base, 0);
  switch (kind) {
    case 'wall':
      return wallTextureKey(state.sectorId, wallVariantAt(state, x, y), wallWearAt(x, y, state.seed));
    case 'hazard':
      return animated('t_hazard');
    case 'sump':
      return animated('t_sump');
    case 'scrub':
      return 't_scrub';
    case 'scrub_nest':
      return 't_scrub_nest';
    case 'rubble':
      return 't_rubble';
    case 'sealed':
      return 't_sealed';
    case 'tripwire':
      return 't_tripwire';
    case 'vent':
      return animated('t_vent');
    case 'exit':
      return 't_exit';
    case 'beacon':
      return animated('t_beacon');
    case 'shuttle':
      return 't_shuttle';
    case 'landmark':
      return animated('t_landmark');
    case 'quest':
      return animated('t_quest_tile');
    case 'console':
      return animated('t_console');
    case 'floor':
      return floorTextureKey(state.sectorId, floorVariantAt(x, y, state.seed));
    default:
      return floorTextureKey(state.sectorId, 0);
  }
}
