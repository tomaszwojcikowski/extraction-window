import { describe, expect, it } from 'vitest';
import {
  pickWearableLoot,
  rollCacheWearable,
  rollHazardWearable,
  wearableLootForSector,
} from '../../src/data/wearableLoot';
import { mulberry32 } from '../../src/sim/rng';

describe('wearableLoot', () => {
  it('returns sector-specific pools', () => {
    expect(wearableLootForSector('duct')).toContain('field_comm');
    expect(wearableLootForSector('unknown' as never).length).toBeGreaterThan(0);
  });

  it('rolls cache wearables only at high sectors', () => {
    const rng = mulberry32(42);
    expect(rollCacheWearable(7, 'duct', rng)).toBeNull();
    const item = rollCacheWearable(10, 'duct', rng);
    expect(item === null || wearableLootForSector('duct').includes(item)).toBe(true);
  });

  it('rolls hazard wearables from mid sectors', () => {
    const rng = mulberry32(99);
    expect(rollHazardWearable(5, 'trench', rng)).toBeNull();
    const item = pickWearableLoot('trench', rng);
    expect(wearableLootForSector('trench')).toContain(item);
  });
});
