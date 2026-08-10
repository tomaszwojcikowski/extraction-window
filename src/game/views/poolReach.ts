import type { Tile } from '../../sim/types';

/** Rays per light pool — enough to read as a soft wall-cut shape, not a star. */
export const POOL_RAYS = 48;
export const POOL_STEP = 0.28;

export type PoolRay = {
  /** How far the pool travels in this direction (tiles). */
  hit: number;
  /** Path transmittance at the stop (1 = clear air, scrub multiplies by 0.55). */
  atten: number;
};

/**
 * Ray-march a light pool against the tile grid from a continuous origin
 * (tile units). Walls stop the ray; scrub attenuates like sim flood.
 */
export function marchPoolRaysAt(
  tiles: Tile[][],
  cx: number,
  cy: number,
  radius: number,
  rays = POOL_RAYS,
  step = POOL_STEP,
): PoolRay[] {
  const out: PoolRay[] = [];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let hit = radius;
    let atten = 1;
    let lastTx = Math.floor(cx);
    let lastTy = Math.floor(cy);
    for (let t = step; t <= radius; t += step) {
      const tx = Math.floor(cx + dx * t);
      const ty = Math.floor(cy + dy * t);
      const tile = tiles[ty]?.[tx];
      if (!tile) {
        hit = t;
        break;
      }
      if (!tile.transparent) {
        hit = Math.max(step, t - step * 0.5);
        break;
      }
      if (tx !== lastTx || ty !== lastTy) {
        lastTx = tx;
        lastTy = ty;
        if (tile.kind === 'scrub' || tile.kind === 'scrub_nest') {
          atten *= 0.55;
          if (atten < 0.02) {
            hit = t;
            atten = 0;
            break;
          }
        }
      }
    }
    out.push({ hit, atten });
  }
  return out;
}

/**
 * Ray-march a light pool from a tile center.
 * Walls stop the ray (pool laps the face); scrub attenuates like sim flood /
 * `lightTransmittance` so bloom cannot roar through thicket while gameplay dims.
 */
export function marchPoolRays(
  tiles: Tile[][],
  sx: number,
  sy: number,
  radius: number,
  rays = POOL_RAYS,
  step = POOL_STEP,
): PoolRay[] {
  return marchPoolRaysAt(tiles, sx + 0.5, sy + 0.5, radius, rays, step);
}
