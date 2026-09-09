import { describe, expect, it } from 'vitest';
import { wallGhostAmount, wallGhostOpacity, WALL_GHOST_KEEP, applyWallGhostMaterial } from '../../src/v2/wallGhost';

describe('v2 wall ghost', () => {
  const focus = { x: 5.5, z: 5.5 };
  const camSe = { x: 15, z: 16 };

  it('ghosts a wall between the camera and the surveyor', () => {
    const amount = wallGhostAmount(6.5, 6.5, focus.x, focus.z, camSe.x, camSe.z);
    expect(amount).toBeGreaterThan(0.85);
    expect(wallGhostOpacity(1, amount)).toBeLessThan(0.25);
    expect(wallGhostOpacity(1, 1)).toBeCloseTo(WALL_GHOST_KEEP);
  });

  it('keeps walls behind the surveyor solid', () => {
    expect(wallGhostAmount(4.5, 4.5, focus.x, focus.z, camSe.x, camSe.z)).toBe(0);
  });

  it('keeps far side walls solid', () => {
    expect(wallGhostAmount(5.5, 9.5, focus.x, focus.z, camSe.x, camSe.z)).toBe(0);
  });

  it('moves the cutaway when the camera yaws', () => {
    const nw = { x: -4, z: -5 };
    expect(wallGhostAmount(4.5, 4.5, focus.x, focus.z, nw.x, nw.z)).toBeGreaterThan(0.85);
    expect(wallGhostAmount(6.5, 6.5, focus.x, focus.z, nw.x, nw.z)).toBe(0);
  });

  it('keeps Lambert walls on the transparent shader so opacity is not ignored', () => {
    const mat = { opacity: 1, transparent: false, depthWrite: true, needsUpdate: false };
    applyWallGhostMaterial(mat, 1, 1);
    expect(mat.transparent).toBe(true);
    expect(mat.needsUpdate).toBe(true);
    expect(mat.depthWrite).toBe(false);
    expect(mat.opacity).toBeCloseTo(WALL_GHOST_KEEP);
  });
});
