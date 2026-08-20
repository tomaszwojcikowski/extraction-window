import { describe, expect, it } from 'vitest';
import { WALL_WEAR_COUNT, wallTextureKey, wallWearAt } from '../../src/scenes/textures';

describe('wallWearAt', () => {
  it('is deterministic and stays in the baked wear range', () => {
    expect(wallWearAt(4, 6, 7)).toEqual(wallWearAt(4, 6, 7));
    expect(wallWearAt(4, 6, 7)).toBeGreaterThanOrEqual(0);
    expect(wallWearAt(4, 6, 7)).toBeLessThan(WALL_WEAR_COUNT);
  });

  it('shares wear across a 2x2 patch and differs across patches', () => {
    const seed = 42;
    expect(wallWearAt(2, 2, seed)).toBe(wallWearAt(3, 3, seed));
    const a = wallWearAt(0, 0, seed);
    const other = [2, 4, 6, 8, 10, 12, 14].map((x) => wallWearAt(x, 0, seed));
    expect(other.some((w) => w !== a)).toBe(true);
  });
});

describe('wallTextureKey', () => {
  it('keeps role and wear in the key so a level can pick both', () => {
    expect(wallTextureKey('plains', 0, 1)).toBe('t_wall_cliff_0_1');
    expect(wallTextureKey('vault', 3, 2)).toBe('t_wall_bulkhead_3_2');
  });
});
