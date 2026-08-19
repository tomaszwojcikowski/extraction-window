import { describe, expect, it } from 'vitest';
import { floorScatter } from '../../src/scenes/textures';

describe('floorScatter', () => {
  it('stays on a 1px lattice break and never opens a grout gap', () => {
    for (let seed = 0; seed < 5; seed++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const s = floorScatter(x, y, seed);
          expect(s.dx).toBeGreaterThanOrEqual(-1);
          expect(s.dx).toBeLessThanOrEqual(1);
          expect(s.dy).toBeGreaterThanOrEqual(-1);
          expect(s.dy).toBeLessThanOrEqual(1);
          expect(s.pad).toBeGreaterThanOrEqual(1);
          expect(s.pad).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('is deterministic for a cell', () => {
    expect(floorScatter(3, 4, 99)).toEqual(floorScatter(3, 4, 99));
    expect(floorScatter(3, 4, 99)).not.toEqual(floorScatter(4, 3, 99));
  });
});
