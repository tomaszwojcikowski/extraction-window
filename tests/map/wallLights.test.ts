import { describe, expect, it } from 'vitest';
import { getSector } from '../../src/data/encounters';
import { generateSectorMap } from '../../src/map/generator';
import { placeWallLightsSeeded } from '../../src/map/wallLights';
import { floodAddLight, rebuildIllumination, tileBrightness } from '../../src/sim/light';
import { createGame } from '../../src/sim/state';
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
  it('emits from facing floor while mounting on the wall', () => {
    const { tiles, rooms } = corridor();
    const lights = placeWallLightsSeeded(tiles, rooms, 'vault', 42);
    expect(lights.length).toBeGreaterThan(0);
    for (const L of lights) {
      expect(L.fixture).toBe('sconce');
      expect(tiles[L.mountY!]?.[L.mountX!]?.kind).toBe('wall');
      expect(tiles[L.y]![L.x]!.walkable).toBe(true);
      expect(L.life).toBeUndefined();
    }
  });

  it('skips walls facing nest floors', () => {
    const { tiles } = corridor();
    const nestRooms = [{ x: 1, y: 2, w: 9, h: 3, cx: 5, cy: 3, role: 'nest' as const }];
    const lights = placeWallLightsSeeded(tiles, nestRooms, 'vault', 7);
    expect(lights.length).toBe(0);
  });

  it('flood from emission cell lights the corridor strongly', () => {
    const { tiles } = corridor();
    const out = Array.from({ length: 7 }, () => Array.from({ length: 11 }, () => 0));
    // Emit from floor under a north wall sconce — not from the wall cell.
    floodAddLight(tiles, 5, 3, 2.5, 0.55, out);
    expect(out[3]![5]!).toBeGreaterThan(0.4);
    expect(out[3]![6]!).toBeGreaterThan(0.05);
  });

  it('sector sconces raise floor brightness above ambient alone', () => {
    const withLights = createGame(42, { skipTutorial: true });
    const sconces = withLights.lightSources.filter((s) => s.fixture === 'sconce');
    expect(sconces.length).toBeGreaterThan(0);
    rebuildIllumination(withLights);
    const lit = sconces[0]!;
    const bright = tileBrightness(withLights, lit.x, lit.y);

    // Same seed/map but strip sconces — brightness at that cell should drop.
    withLights.lightSources = withLights.lightSources.filter((s) => s.fixture !== 'sconce');
    rebuildIllumination(withLights);
    const dim = tileBrightness(withLights, lit.x, lit.y);
    expect(bright).toBeGreaterThan(dim + 0.05);
  });

  it('sector maps seed wall lights into the generated result', () => {
    const map = generateSectorMap(getSector(0), 99, 0);
    expect(map.wallLights.length).toBeGreaterThan(0);
    expect(map.wallLights.every((L) => L.fixture === 'sconce')).toBe(true);
    expect(
      map.wallLights.every(
        (L) =>
          map.tiles[L.mountY!]?.[L.mountX!]?.kind === 'wall' && map.tiles[L.y]?.[L.x]?.walkable,
      ),
    ).toBe(true);
  });
});
