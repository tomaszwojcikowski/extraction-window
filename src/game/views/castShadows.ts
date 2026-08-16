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
  // March from the cell centre (gx/gy are integer tile coords).
  return castReachFrom(tiles, gx + 0.5, gy + 0.5, dirX, dirY, want);
}

/** March from a continuous start point along a unit direction. */
export function castReachFrom(
  tiles: Tile[][],
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  want: number,
): number {
  const step = 0.22;
  let travelled = 0;
  let lastClear = 0;
  while (travelled + step <= want) {
    travelled += step;
    const tx = Math.floor(startX + dirX * travelled);
    const ty = Math.floor(startY + dirY * travelled);
    const tile = tiles[ty]?.[tx];
    if (!tile || !tile.transparent) {
      // Tip must remain in open floor — not inside the blocking cell.
      return Math.max(0.12, lastClear);
    }
    lastClear = travelled;
  }
  return want;
}
