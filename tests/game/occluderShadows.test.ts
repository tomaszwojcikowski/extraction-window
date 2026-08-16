import { describe, expect, it } from 'vitest';
import { LIGHT_TEMP } from '../../src/sim/light';
import {
  collectOccluderShadows,
  lightCastsOccluderShadow,
  projectOccluderFace,
} from '../../src/game/views/occluderShadows';
import type { Tile } from '../../src/sim/types';

function grid(w: number, h: number, fill: Tile): Tile[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ({ ...fill })));
}

function openVisible(w: number, h: number): boolean[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => true));
}

describe('lightCastsOccluderShadow', () => {
  it('accepts lamp / flare / sconce and rejects fauna markers', () => {
    expect(lightCastsOccluderShadow({ color: LIGHT_TEMP.lamp, intensity: 1 })).toBe(true);
    expect(lightCastsOccluderShadow({ color: LIGHT_TEMP.flare, intensity: 1 })).toBe(true);
    expect(lightCastsOccluderShadow({ fixture: 'sconce', intensity: 0.5 })).toBe(true);
    expect(lightCastsOccluderShadow({ color: LIGHT_TEMP.fauna, intensity: 1 })).toBe(false);
    expect(lightCastsOccluderShadow({ color: LIGHT_TEMP.marker, intensity: 1 })).toBe(false);
  });
});

describe('projectOccluderFace', () => {
  it('throws a soft quad onto open floor when the lit face has energy', () => {
    const tiles = grid(7, 3, { kind: 'floor', walkable: true, transparent: true });
    tiles[1]![3] = { kind: 'wall', walkable: false, transparent: false };
    // Light west of wall; east face casts onto x=4.
    const quad = projectOccluderFace(tiles, 3, 1, 1, 0, 1, 1, 0.4, 1.1);
    expect(quad).not.toBeNull();
    expect(quad!.x3).toBeGreaterThan(quad!.x0);
    expect(quad!.weight).toBeGreaterThan(0.2);
  });

  it('skips a face that is not lit from behind', () => {
    const tiles = grid(7, 3, { kind: 'floor', walkable: true, transparent: true });
    tiles[1]![3] = { kind: 'wall', walkable: false, transparent: false };
    // Light already on the far (east) side — no cast onto that side.
    expect(projectOccluderFace(tiles, 3, 1, 1, 0, 5, 1, 0.5, 1)).toBeNull();
  });

  it('skips when lit-face energy is too low', () => {
    const tiles = grid(7, 3, { kind: 'floor', walkable: true, transparent: true });
    tiles[1]![3] = { kind: 'wall', walkable: false, transparent: false };
    expect(projectOccluderFace(tiles, 3, 1, 1, 0, 1, 1, 0.01, 1)).toBeNull();
  });

  it('clips each projected ray before a blocking wall', () => {
    const tiles = grid(8, 3, { kind: 'floor', walkable: true, transparent: true });
    tiles[1]![3] = { kind: 'wall', walkable: false, transparent: false };
    // Full column so both face-corner rays hit opaque before x=5.
    tiles[0]![5] = { kind: 'wall', walkable: false, transparent: false };
    tiles[1]![5] = { kind: 'wall', walkable: false, transparent: false };
    tiles[2]![5] = { kind: 'wall', walkable: false, transparent: false };
    const open = projectOccluderFace(tiles, 3, 1, 1, 0, 1, 1, 0.5, 1.2)!;
    expect(Math.max(open.x2, open.x3)).toBeLessThan(5);
  });
});

describe('collectOccluderShadows', () => {
  it('emits at least one quad for a lit pillar beside the lamp', () => {
    const tiles = grid(9, 5, { kind: 'floor', walkable: true, transparent: true });
    tiles[2]![4] = { kind: 'wall', walkable: false, transparent: false };
    const visible = openVisible(9, 5);
    const energy = Array.from({ length: 5 }, () => Array.from({ length: 9 }, () => 0));
    // Lit face west of the pillar.
    energy[2]![3] = 0.55;
    energy[2]![2] = 0.7;
    const quads = collectOccluderShadows(
      tiles,
      visible,
      [{ x: 1, y: 2, radius: 6, intensity: 1.1, castsOccluderShadow: true }],
      (_i, x, y) => energy[y]![x]!,
      1,
      2,
    );
    expect(quads.length).toBeGreaterThan(0);
  });

  it('ignores fauna lights', () => {
    const tiles = grid(9, 5, { kind: 'floor', walkable: true, transparent: true });
    tiles[2]![4] = { kind: 'wall', walkable: false, transparent: false };
    const visible = openVisible(9, 5);
    const quads = collectOccluderShadows(
      tiles,
      visible,
      [{ x: 1, y: 2, radius: 6, intensity: 1.1, castsOccluderShadow: false }],
      () => 0.8,
      1,
      2,
    );
    expect(quads).toHaveLength(0);
  });
});
