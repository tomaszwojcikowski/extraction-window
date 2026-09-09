/** Remaining opacity when a wall fully ghosts — keep a veil so the cell still reads as cover. */
export const WALL_GHOST_KEEP = 0.1;

/** Sight-line half-width in tiles at the surveyor, widening slightly toward the camera. */
const BASE_RADIUS = 1.85;
const ALONG_WIDEN = 0.14;
/** Full ghost within this many tiles of the surveyor along the view. */
const NEAR_TILES = 5;

/**
 * 0 = keep the wall solid, 1 = ghost it.
 * Uses the live camera XZ so orbit yaw moves the cutaway with the shot.
 */
export function wallGhostAmount(
  wallX: number,
  wallZ: number,
  focusX: number,
  focusZ: number,
  camX: number,
  camZ: number,
): number {
  const toCamX = camX - focusX;
  const toCamZ = camZ - focusZ;
  const camDist = Math.hypot(toCamX, toCamZ);
  if (camDist < 0.001) return 0;
  const nx = toCamX / camDist;
  const nz = toCamZ / camDist;

  const toWallX = wallX - focusX;
  const toWallZ = wallZ - focusZ;
  const along = toWallX * nx + toWallZ * nz;
  if (along <= 0.08) return 0;
  if (along > camDist + 0.4) return 0;

  const dist = Math.hypot(toWallX, toWallZ);
  if (dist < 1.7) return 1;

  const perp = Math.hypot(toWallX - nx * along, toWallZ - nz * along);
  const radius = BASE_RADIUS + along * ALONG_WIDEN;
  if (perp >= radius) return 0;

  const cone = 1 - perp / radius;
  const near = 1 - Math.min(1, Math.max(0, along - 0.2) / NEAR_TILES);
  return cone * (0.7 + 0.3 * near);
}

export function wallGhostOpacity(litOpacity: number, ghost: number): number {
  const keep = 1 - ghost * (1 - WALL_GHOST_KEEP);
  return litOpacity * keep;
}

/** Lambert ignores opacity unless the material is compiled as transparent. */
export function applyWallGhostMaterial(
  mat: {
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
    needsUpdate: boolean;
  },
  litOpacity: number,
  ghost: number,
): void {
  const opacity = wallGhostOpacity(litOpacity, ghost);
  const transparent = true;
  const depthWrite = ghost < 0.08 && opacity >= 0.999;
  if (mat.transparent !== transparent) mat.needsUpdate = true;
  mat.opacity = opacity;
  mat.transparent = transparent;
  mat.depthWrite = depthWrite;
}
