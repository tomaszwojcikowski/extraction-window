import { describe, expect, it } from 'vitest';
import { marchPoolRays, marchPoolRaysAt } from '../../src/game/views/poolReach';
import type { Tile } from '../../src/sim/types';

function grid(w: number, h: number, fill: Tile): Tile[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ ...fill })),
  );
}

describe('marchPoolRays', () => {
  it('reaches full radius across open floor', () => {
    const tiles = grid(11, 11, { kind: 'floor', walkable: true, transparent: true });
    const rays = marchPoolRays(tiles, 5, 5, 4, 8, 0.28);
    expect(rays.every((r) => r.hit >= 3.9 && r.atten === 1)).toBe(true);
  });

  it('stops before an opaque wall', () => {
    const tiles = grid(11, 11, { kind: 'floor', walkable: true, transparent: true });
    for (let y = 0; y < 11; y++) {
      tiles[y]![8] = { kind: 'wall', walkable: false, transparent: false };
    }
    const rays = marchPoolRays(tiles, 5, 5, 5, 8, 0.28);
    // East-ish ray (index near 0 for angle 0) should be clipped.
    const east = rays[0]!;
    expect(east.hit).toBeLessThan(3.5);
  });

  it('attenuates through scrub and dies in thicket', () => {
    const tiles = grid(11, 11, { kind: 'floor', walkable: true, transparent: true });
    for (let x = 6; x <= 9; x++) {
      tiles[5]![x] = { kind: 'scrub', walkable: true, transparent: true };
    }
    const open = marchPoolRays(
      grid(11, 11, { kind: 'floor', walkable: true, transparent: true }),
      5,
      5,
      4,
      8,
      0.28,
    );
    const scrubbed = marchPoolRays(tiles, 5, 5, 4, 8, 0.28);
    const eastOpen = open[0]!;
    const eastScrub = scrubbed[0]!;
    expect(eastScrub.atten).toBeLessThan(eastOpen.atten);
    expect(eastScrub.atten).toBeLessThan(1);
  });

  it('can originate from a wall-face offset into the room', () => {
    const tiles = grid(11, 11, { kind: 'floor', walkable: true, transparent: true });
    for (let x = 0; x < 11; x++) {
      tiles[2]![x] = { kind: 'wall', walkable: false, transparent: false };
    }
    // Origin just south of the wall — north rays clip, south rays open.
    const rays = marchPoolRaysAt(tiles, 5.5, 2.5 + 0.42, 3, 8, 0.28);
    const south = rays[2]!; // π/2
    const northRay = rays[6]!; // 3π/2
    expect(northRay.hit).toBeLessThan(south.hit);
    expect(south.hit).toBeGreaterThan(1.5);
  });
});
