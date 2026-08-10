import { describe, expect, it } from 'vitest';
import { castReachTiles } from '../../src/game/views/castShadows';
import type { Tile } from '../../src/sim/types';

function grid(w: number, h: number, fill: Tile): Tile[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ ...fill })),
  );
}

describe('castReachTiles', () => {
  it('throws full want across open floor', () => {
    const tiles = grid(7, 3, { kind: 'floor', walkable: true, transparent: true });
    expect(castReachTiles(tiles, 1, 1, 1, 0, 1.2)).toBeCloseTo(1.2, 5);
  });

  it('stops before an opaque wall along the cast', () => {
    const tiles = grid(7, 3, { kind: 'floor', walkable: true, transparent: true });
    tiles[1]![3] = { kind: 'wall', walkable: false, transparent: false };
    const reach = castReachTiles(tiles, 1, 1, 1, 0, 2.5);
    // Actor at x=1; wall at x=3 — reach must stop short of the wall cell.
    expect(reach).toBeLessThan(2);
    expect(reach).toBeGreaterThan(0.12);
    const tipX = Math.floor(1 + 0.5 + 1 * reach);
    expect(tipX).toBeLessThan(3);
  });

  it('does not throw through map edge void', () => {
    const tiles = grid(3, 3, { kind: 'floor', walkable: true, transparent: true });
    const reach = castReachTiles(tiles, 2, 1, 1, 0, 2);
    expect(reach).toBeLessThan(2);
  });
});
