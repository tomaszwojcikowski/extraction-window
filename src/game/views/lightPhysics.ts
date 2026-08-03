import type { Tile } from '../../sim/types';

/**
 * Physics-inspired lighting math for the field view.
 * Inverse-square irradiance + grid LOS attenuation (presentation-only).
 */

/** Soft near-field distance (tiles) — prevents singularity at d=0. */
export const LIGHT_NEAR = 0.75;

/**
 * Inverse-square irradiance with soft cutoff at `radius`.
 * At d=0 → ~intensity; falls as 1/(1+(d/near)²); windowed to 0 at radius.
 */
export function irradiance(dist: number, radius: number, intensity: number): number {
  if (radius <= 0 || intensity <= 0) return 0;
  if (dist >= radius) return 0;
  const d = Math.max(0, dist);
  const invSq = 1 / (1 + (d * d) / (LIGHT_NEAR * LIGHT_NEAR));
  // Soft photometric window so the clip isn't a hard ring
  const t = 1 - d / radius;
  const window = t * t;
  return intensity * invSq * window;
}

/**
 * Supercover / Bresenham cells between two tile centers (exclusive of ends).
 * Returns transmittance 0–1: opaque walls block fully; scrub halves remaining light.
 */
export function lightTransmittance(
  tiles: Tile[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  if (x0 === x1 && y0 === y1) return 1;

  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  let transmit = 1;

  // Integer Bresenham — visit every crossed cell
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    if (x === x1 && y === y1) break;
    if (y < 0 || x < 0 || y >= h || x >= w) return 0;
    const tile = tiles[y]![x]!;
    if (!tile.transparent) return 0;
    if (tile.kind === 'scrub') transmit *= 0.55;
    if (transmit < 0.02) return 0;
  }
  return transmit;
}

/** Tone-map HDR sum into 0–1 display brightness (Reinhard). */
export function toneMap(hdr: number): number {
  if (hdr <= 0) return 0;
  return hdr / (1 + hdr);
}

export function accumulateLight(
  tiles: Tile[][],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  radius: number,
  intensity: number,
): number {
  const dist = Math.hypot(tx - sx, ty - sy);
  const E = irradiance(dist, radius, intensity);
  if (E <= 0.001) return 0;
  const T = lightTransmittance(tiles, sx, sy, tx, ty);
  return E * T;
}
