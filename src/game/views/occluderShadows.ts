import type { Tile } from '../../sim/types';
import { LIGHT_TEMP } from '../../sim/light';
import { castReachFrom } from './castShadows';

/**
 * Soft floor umbra from opaque tiles — presentation only.
 *
 * Bloom already stops at walls; these quads are the silhouette those walls throw
 * onto lit deck when a real emitter sits on the other side. Flood energy on the
 * lit face decides whether a face casts; geometry decides where the wedge lands.
 */

export const MAX_OCCLUDER_LIGHT_DIST = 10;
export const MAX_OCCLUDER_EDGES = 56;
/** Soft throw in tiles before wall clip. */
export const MAX_OCCLUDER_THROW = 1.65;

const FACES = [
  { nx: 1, ny: 0 },
  { nx: -1, ny: 0 },
  { nx: 0, ny: 1 },
  { nx: 0, ny: -1 },
] as const;

/** Engineered emitters that throw real wall umbra — not fauna / markers. */
const OCCLUDER_LIGHT_COLORS = new Set<number>([
  LIGHT_TEMP.lamp,
  LIGHT_TEMP.flare,
  LIGHT_TEMP.beacon,
  LIGHT_TEMP.shuttle,
  LIGHT_TEMP.standby,
  LIGHT_TEMP.sconce,
  LIGHT_TEMP.sconceCool,
]);

export type OccluderLight = {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  /** True for personal lamp / flare / sconce / pad floods — skip fauna markers. */
  castsOccluderShadow: boolean;
};

/** Quad corners in continuous tile space (multiply by TILE_DRAW to draw). */
export type OccluderShadowQuad = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  /** 0–1 draw weight after SHADOW-band attenuation is applied by the view. */
  weight: number;
};

export function lightCastsOccluderShadow(s: {
  color?: number;
  fixture?: string;
  intensity: number;
}): boolean {
  if (s.fixture === 'sconce') return true;
  if (s.color === undefined) return s.intensity >= 0.9;
  return OCCLUDER_LIGHT_COLORS.has(s.color);
}

/**
 * Project one occluder face away from a light into a soft shadow quad.
 * Returns null when the face is not lit from behind or has nowhere to land.
 */
export function projectOccluderFace(
  tiles: Tile[][],
  ox: number,
  oy: number,
  nx: number,
  ny: number,
  lightX: number,
  lightY: number,
  litFaceEnergy: number,
  intensity: number,
): OccluderShadowQuad | null {
  if (litFaceEnergy < 0.025) return null;
  const farX = ox + nx;
  const farY = oy + ny;
  const far = tiles[farY]?.[farX];
  if (!far || !far.transparent) return null;

  // Face mid in continuous tile coords (cell corners).
  const midX = ox + 0.5 + nx * 0.5;
  const midY = oy + 0.5 + ny * 0.5;
  // Light must sit on the near side of the face (opposite the outward normal).
  const side = (lightX + 0.5 - midX) * nx + (lightY + 0.5 - midY) * ny;
  if (side >= -0.05) return null;

  // Two corners of the occluder face (tile-space).
  let aX: number;
  let aY: number;
  let bX: number;
  let bY: number;
  if (nx !== 0) {
    aX = ox + (nx > 0 ? 1 : 0);
    bX = aX;
    aY = oy;
    bY = oy + 1;
  } else {
    aY = oy + (ny > 0 ? 1 : 0);
    bY = aY;
    aX = ox;
    bX = ox + 1;
  }

  const want = Math.min(
    MAX_OCCLUDER_THROW,
    0.45 + litFaceEnergy * 1.1 + Math.min(0.35, intensity * 0.22),
  );
  const dirLenA = Math.hypot(aX - (lightX + 0.5), aY - (lightY + 0.5));
  const dirLenB = Math.hypot(bX - (lightX + 0.5), bY - (lightY + 0.5));
  if (dirLenA < 0.08 || dirLenB < 0.08) return null;
  const dAx = (aX - (lightX + 0.5)) / dirLenA;
  const dAy = (aY - (lightY + 0.5)) / dirLenA;
  const dBx = (bX - (lightX + 0.5)) / dirLenB;
  const dBy = (bY - (lightY + 0.5)) / dirLenB;

  // Clip each projected ray independently — axis probe along the face normal
  // let diagonal tips leak into adjacent walls.
  const throwA = castReachFrom(tiles, aX, aY, dAx, dAy, want);
  const throwB = castReachFrom(tiles, bX, bY, dBx, dBy, want);
  if (throwA < 0.14 && throwB < 0.14) return null;

  const cX = aX + dAx * throwA;
  const cY = aY + dAy * throwA;
  const dX = bX + dBx * throwB;
  const dY = bY + dBy * throwB;

  const weight = Math.min(1, 0.22 + litFaceEnergy * 1.4 + intensity * 0.08);
  return {
    x0: aX,
    y0: aY,
    x1: bX,
    y1: bY,
    x2: dX,
    y2: dY,
    x3: cX,
    y3: cY,
    weight,
  };
}

/**
 * Collect soft occluder quads for the current light set.
 * `energyAt(sourceIndex, x, y)` must match the flood grids used for bloom/casts.
 */
export function collectOccluderShadows(
  tiles: Tile[][],
  visible: boolean[][],
  lights: OccluderLight[],
  energyAt: (sourceIndex: number, x: number, y: number) => number,
  focusX: number,
  focusY: number,
  maxEdges = MAX_OCCLUDER_EDGES,
): OccluderShadowQuad[] {
  const out: OccluderShadowQuad[] = [];
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;

  for (let li = 0; li < lights.length; li++) {
    const light = lights[li]!;
    if (!light.castsOccluderShadow) continue;
    if (Math.hypot(light.x - focusX, light.y - focusY) > MAX_OCCLUDER_LIGHT_DIST) continue;

    const r = Math.ceil(light.radius) + 1;
    const x0 = Math.max(0, Math.floor(light.x) - r);
    const y0 = Math.max(0, Math.floor(light.y) - r);
    const x1 = Math.min(w - 1, Math.ceil(light.x) + r);
    const y1 = Math.min(h - 1, Math.ceil(light.y) + r);

    for (let oy = y0; oy <= y1; oy++) {
      for (let ox = x0; ox <= x1; ox++) {
        const tile = tiles[oy]![ox]!;
        if (tile.transparent) continue;
        // Need at least one visible neighbor so we do not paint outside FOV.
        let nearVisible = false;
        for (const f of FACES) {
          if (visible[oy + f.ny]?.[ox + f.nx]) {
            nearVisible = true;
            break;
          }
        }
        if (!nearVisible) continue;

        for (const f of FACES) {
          if (out.length >= maxEdges) return out;
          const nearX = ox - f.nx;
          const nearY = oy - f.ny;
          const farX = ox + f.nx;
          const farY = oy + f.ny;
          if (nearX < 0 || nearY < 0 || nearX >= w || nearY >= h) continue;
          const nearTile = tiles[nearY]![nearX]!;
          if (!nearTile.transparent) continue;
          // Landing floor must be in FOV — do not silhouette unexplored cells.
          if (!visible[farY]?.[farX] && !visible[nearY]?.[nearX]) continue;

          const litE = energyAt(li, nearX, nearY);
          const quad = projectOccluderFace(
            tiles,
            ox,
            oy,
            f.nx,
            f.ny,
            light.x,
            light.y,
            litE,
            light.intensity,
          );
          if (quad) out.push(quad);
        }
      }
    }
  }
  return out;
}
