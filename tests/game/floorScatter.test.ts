import { describe, expect, it } from 'vitest';
import { floorScatter } from '../../src/scenes/textures';

describe('floorScatter', () => {
  it('stays on a 2px lattice break and never opens a grout gap', () => {
    for (let seed = 0; seed < 5; seed++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const s = floorScatter(x, y, seed);
          expect(s.dx).toBeGreaterThanOrEqual(-2);
          expect(s.dx).toBeLessThanOrEqual(2);
          expect(s.dy).toBeGreaterThanOrEqual(-2);
          expect(s.dy).toBeLessThanOrEqual(2);
          expect(s.pad).toBeGreaterThanOrEqual(6);
          expect(s.pad).toBeLessThanOrEqual(8);
          const right = floorScatter(x + 1, y, seed);
          const down = floorScatter(x, y + 1, seed);
          expect(s.dx - right.dx + (s.pad + right.pad) / 2).toBeGreaterThanOrEqual(1);
          expect(s.dy - down.dy + (s.pad + down.pad) / 2).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('is deterministic for a cell', () => {
    expect(floorScatter(3, 4, 99)).toEqual(floorScatter(3, 4, 99));
    expect(floorScatter(3, 4, 99)).not.toEqual(floorScatter(4, 3, 99));
  });
});
