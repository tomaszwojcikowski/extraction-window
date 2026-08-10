import type { Tile } from '../../sim/types';

/**
 * How far a cast may throw (tile units) before an opaque cell eats it.
 * Same honesty rule as bloom pools: silhouettes do not punch through stone.
 */
export function castReachTiles(
  tiles: Tile[][],
  gx: number,
  gy: number,
  dirX: number,
  dirY: number,
  want: number,
): number {
  const step = 0.22;
  let travelled = 0;
  while (travelled + step <= want) {
    travelled += step;
    const tx = Math.floor(gx + 0.5 + dirX * travelled);
    const ty = Math.floor(gy + 0.5 + dirY * travelled);
    const tile = tiles[ty]?.[tx];
    if (!tile || !tile.transparent) {
      return Math.max(0.12, travelled - step);
    }
  }
  return want;
}
