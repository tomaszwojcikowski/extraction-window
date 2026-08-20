import type { SectorId } from '../data/encounters';
import type { EnemyKind } from '../data/enemies';

export { FONT_DATA, FONT_DISPLAY, BIOME_FLOOR_TINT } from './theme';

/** Base pixel art size — drawn 1:1 so floor seams don't scale up as a grout grid. */
export const TILE = 48;
export const TILE_DRAW = TILE;

export const WALL_WEAR_COUNT = 3;

function floorScatterHash(x: number, y: number, seed: number): number {
  return Math.abs((x * 19 + y * 47 + (seed & 0xffff) * 13) | 0);
}

/** 1px lattice break + overlap pad so ground sits uneven without opening grout gaps. */
export function floorScatter(
  x: number,
  y: number,
  seed: number,
): { dx: number; dy: number; pad: number } {
  const n = floorScatterHash(x, y, seed);
  return {
    dx: (n % 3) - 1,
    dy: ((n >> 3) % 3) - 1,
    pad: 1 + ((n >> 5) % 2),
  };
}

/** Face treatment for a wall cell — 2×2 patches so a run weathers together. */
export function wallWearAt(x: number, y: number, seed: number): number {
  const px = Math.floor(x / 2);
  const py = Math.floor(y / 2);
  const n = Math.abs((px * 29 + py * 53 + (seed & 0xffff) * 17) | 0);
  return n % WALL_WEAR_COUNT;
}

export function enemyTextureKey(kind: EnemyKind, frame = 0): string {
  return frame === 0 ? `t_enemy_${kind}` : `t_enemy_${kind}_${frame % 3}`;
}

export function playerTextureKey(frame = 0): string {
  return frame === 0 ? 't_player' : `t_player_${frame % 3}`;
}

export function npcTextureKey(kind: string, frame = 0): string {
  const f = frame % 3;
  return f === 0 ? `t_npc_${kind}` : `t_npc_${kind}_${f}`;
}

export function allyTextureKey(kind: string, frame = 0): string {
  const f = frame % 3;
  return f === 0 ? `t_ally_${kind}` : `t_ally_${kind}_${f}`;
}

/** Wall contour family per biome — cliff / bulkhead / conduit. */
export type WallStyle = 'cliff' | 'bulkhead' | 'conduit';

export function wallStyleForSector(sectorId: SectorId): WallStyle {
  switch (sectorId) {
    case 'duct':
    case 'reef':
    case 'brine':
      return 'conduit';
    case 'vault':
    case 'beacon':
    case 'ruin':
    case 'spire':
    case 'trench':
      return 'bulkhead';
    default:
      return 'cliff';
  }
}

export function wallTextureKey(sectorId: SectorId, role: number, wear = 0): string {
  const r = ((role % 4) + 4) % 4;
  const w = ((wear % WALL_WEAR_COUNT) + WALL_WEAR_COUNT) % WALL_WEAR_COUNT;
  return `t_wall_${wallStyleForSector(sectorId)}_${r}_${w}`;
}

export function sconceTextureKey(sectorId: SectorId): string {
  return `t_sconce_${wallStyleForSector(sectorId)}`;
}
