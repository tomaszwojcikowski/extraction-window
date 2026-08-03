import { describe, expect, it } from 'vitest';
import {
  irradiance,
  lightTransmittance,
  toneMap,
  LIGHT_NEAR,
} from '../../src/game/views/lightPhysics';
import type { Tile } from '../../src/sim/types';

function grid(w: number, h: number, fill: Tile): Tile[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ ...fill })),
  );
}

describe('lightPhysics', () => {
  it('irradiance peaks near the source and falls with distance', () => {
    const near = irradiance(0, 5, 1);
    const mid = irradiance(2, 5, 1);
    const far = irradiance(4.5, 5, 1);
    const past = irradiance(5, 5, 1);
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    expect(past).toBe(0);
    // Inverse-square character: doubling distance drops faster than linear
    const d1 = irradiance(LIGHT_NEAR, 8, 1);
    const d2 = irradiance(LIGHT_NEAR * 2, 8, 1);
    expect(d2).toBeLessThan(d1 * 0.75);
  });

  it('toneMap is Reinhard-bounded in 0–1', () => {
    expect(toneMap(0)).toBe(0);
    expect(toneMap(1)).toBeCloseTo(0.5, 5);
    expect(toneMap(100)).toBeLessThan(1);
    expect(toneMap(100)).toBeGreaterThan(0.9);
  });

  it('walls fully occlude light transmittance', () => {
    const tiles = grid(7, 3, { kind: 'floor', walkable: true, transparent: true });
    tiles[1]![3] = { kind: 'wall', walkable: false, transparent: false };
    expect(lightTransmittance(tiles, 0, 1, 6, 1)).toBe(0);
  });

  it('open corridor transmits fully; scrub attenuates', () => {
    const open = grid(5, 3, { kind: 'floor', walkable: true, transparent: true });
    expect(lightTransmittance(open, 0, 1, 4, 1)).toBe(1);

    const scrubbed = grid(5, 3, { kind: 'floor', walkable: true, transparent: true });
    scrubbed[1]![2] = { kind: 'scrub', walkable: true, transparent: true };
    const t = lightTransmittance(scrubbed, 0, 1, 4, 1);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(1);
  });
});
