import { describe, expect, it } from 'vitest';
import { getSector } from '../../src/data/encounters';
import { generateSectorMap } from '../../src/map/generator';
import { placeWallLightsSeeded } from '../../src/map/wallLights';
import { floodAddLight } from '../../src/sim/light';
import type { Tile } from '../../src/sim/types';

function corridor(): {
  tiles: Tile[][];
  rooms: {
    x: number;
    y: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
    role: 'entry' | 'exit' | 'nest';
  }[];
} {
  const tiles: Tile[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 11 }, () => ({
      kind: 'wall' as const,
      walkable: false,
      transparent: false,
    })),
  );
  for (let x = 1; x <= 9; x++) {
    tiles[3]![x] = { kind: 'floor', walkable: true, transparent: true };
  }
  return {
    tiles,
    rooms: [
      { x: 1, y: 2, w: 3, h: 3, cx: 2, cy: 3, role: 'entry' },
      { x: 7, y: 2, w: 3, h: 3, cx: 8, cy: 3, role: 'exit' },
    ],
  };
}

describe('wall lights', () => {
  it('mounts sconces on wall faces, not on floor', () => {
    const { tiles, rooms } = corridor();
    const lights = placeWallLightsSeeded(tiles, rooms, 'vault', 42);
    expect(lights.length).toBeGreaterThan(0);
    for (const L of lights) {
      expect(tiles[L.y]![L.x]!.kind).toBe('wall');
      expect(L.fixture).toBe('sconce');
      expect(L.life).toBeUndefined();
    }
  });

  it('skips walls facing nest floors', () => {
    const { tiles, rooms } = corridor();
    rooms[0]!.role = 'nest';
    rooms[1]!.role = 'nest';
    // Entire corridor is inside the nest AABB if we expand — mark mid as nest room spanning corridor.
    const nestRooms = [{ x: 1, y: 2, w: 9, h: 3, cx: 5, cy: 3, role: 'nest' as const }];
    const lights = placeWallLightsSeeded(tiles, nestRooms, 'vault', 7);
    expect(lights.length).toBe(0);
  });

  it('flood from a wall sconce lights the facing floor', () => {
    const { tiles } = corridor();
    const out = Array.from({ length: 7 }, () => Array.from({ length: 11 }, () => 0));
    floodAddLight(tiles, 5, 2, 2.1, 0.4, out);
    expect(out[3]![5]!).toBeGreaterThan(0.01);
  });

  it('sector maps seed wall lights into the generated result', () => {
    const map = generateSectorMap(getSector(0), 99, 0);
    expect(map.wallLights.length).toBeGreaterThan(0);
    expect(map.wallLights.every((L) => L.fixture === 'sconce')).toBe(true);
    expect(
      map.wallLights.every((L) => map.tiles[L.y]?.[L.x]?.kind === 'wall'),
    ).toBe(true);
  });
});
