import { describe, expect, it } from 'vitest';
import {
  LIGHT_NEAR,
  LIT_THRESHOLD,
  SHADOW_THRESHOLD,
  accumulateLight,
  floodAddLight,
  inShadow,
  irradiance,
  isLit,
  lightTransmittance,
  rebuildIllumination,
  toneMap,
} from '../../src/sim/light';
import { createGame, applyAction, fireDart } from '../../src/sim';
import type { Tile } from '../../src/sim/types';

function grid(w: number, h: number, fill: Tile): Tile[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ ...fill })),
  );
}

describe('sim light physics', () => {
  it('irradiance peaks near the source and falls with distance', () => {
    const near = irradiance(0, 5, 1);
    const mid = irradiance(2, 5, 1);
    const far = irradiance(4.5, 5, 1);
    const past = irradiance(5, 5, 1);
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    expect(past).toBe(0);
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

  it('accumulateLight respects radius', () => {
    const tiles = grid(5, 5, { kind: 'floor', walkable: true, transparent: true });
    expect(accumulateLight(tiles, 2, 2, 2, 2, 3, 1)).toBeGreaterThan(0);
    expect(accumulateLight(tiles, 0, 0, 4, 4, 2, 1)).toBe(0);
  });

  it('Dijkstra flood lights open floor and stops through solid walls', () => {
    // Sealed corridor — no wrap around the wall.
    const tiles = grid(7, 3, { kind: 'wall', walkable: false, transparent: false });
    for (let x = 0; x < 7; x++) {
      tiles[1]![x] = { kind: 'floor', walkable: true, transparent: true };
    }
    tiles[1]![3] = { kind: 'wall', walkable: false, transparent: false };
    const out = Array.from({ length: 3 }, () => Array.from({ length: 7 }, () => 0));
    floodAddLight(tiles, 0, 1, 6, 1, out);
    expect(out[1]![0]!).toBeGreaterThan(0);
    expect(out[1]![1]!).toBeGreaterThan(0);
    // Far side of a sealing wall: no path around.
    expect(out[1]![5]!).toBe(0);
    expect(out[1]![6]!).toBe(0);
  });

  it('Dijkstra flood wraps around open corners (unlike Bresenham LOS)', () => {
    const tiles = grid(5, 5, { kind: 'wall', walkable: false, transparent: false });
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [2, 2],
      [3, 2],
      [4, 2],
    ] as const) {
      tiles[y]![x] = { kind: 'floor', walkable: true, transparent: true };
    }
    const out = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
    floodAddLight(tiles, 0, 0, 8, 1, out);
    expect(out[2]![4]!).toBeGreaterThan(0);
    // Straight LOS through the wall still fails.
    expect(lightTransmittance(tiles, 0, 0, 4, 2)).toBe(0);
  });
});

describe('field illumination gameplay', () => {
  it('createGame rebuilds illumination and player tile is lit', () => {
    const st = createGame(42);
    expect(st.illumination.length).toBe(st.height);
    expect(isLit(st, st.player.x, st.player.y)).toBe(true);
    expect(toneMap(st.illumination[st.player.y]![st.player.x]!)).toBeGreaterThanOrEqual(
      LIT_THRESHOLD,
    );
  });

  it('rebuildIllumination is deterministic for a fixed state', () => {
    const st = createGame(42);
    rebuildIllumination(st);
    const a = st.illumination.map((row) => [...row]);
    rebuildIllumination(st);
    expect(st.illumination).toEqual(a);
  });

  it('quiet stance dims lamp and puts player in soft shadow', () => {
    const st = createGame(42);
    expect(inShadow(st, st.player.x, st.player.y)).toBe(false);
    const before = st.illumination[st.player.y]![st.player.x]!;
    st.player.jammerTurns = 5;
    rebuildIllumination(st);
    const after = st.illumination[st.player.y]![st.player.x]!;
    expect(after).toBeLessThan(before);
    expect(inShadow(st, st.player.x, st.player.y)).toBe(true);
    expect(toneMap(after)).toBeLessThan(SHADOW_THRESHOLD);
  });

  it('tiles far from the lamp fail isLit without flare', () => {
    const st = createGame(42);
    let found = false;
    for (let y = 0; y < st.height && !found; y++) {
      for (let x = 0; x < st.width; x++) {
        if (!st.tiles[y]![x]!.walkable) continue;
        const d = Math.hypot(x - st.player.x, y - st.player.y);
        if (d < 6) continue;
        if (!isLit(st, x, y)) {
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);
  });

  it('flare adds a timed light source', () => {
    const st = createGame(7);
    st.ui.selectedSlot = st.inventory.findIndex((s) => s.kind === 'flare');
    expect(st.ui.selectedSlot).toBeGreaterThanOrEqual(0);
    applyAction(st, { type: 'use' });
    // use ends the turn → tickLightSources decays life 4 → 3
    expect(st.lightSources.some((s) => (s.life ?? 0) >= 3)).toBe(true);
    expect(isLit(st, st.player.x, st.player.y)).toBe(true);
  });

  it('microdart misses when the target tile is unlit', () => {
    const st = createGame(42);
    const px = st.player.x;
    const py = st.player.y;
    for (let i = 1; i <= 2; i++) {
      st.tiles[py]![px + i] = { kind: 'floor', walkable: true, transparent: true };
      st.visible[py]![px + i] = true;
    }
    const en = st.enemies.find((e) => e.alive) ?? st.enemies[0]!;
    en.alive = true;
    en.x = px + 2;
    en.y = py;
    en.hp = 10;
    st.illumination[py]![px + 2] = 0;
    st.inventory = st.inventory.filter((s) => s.kind !== 'dart');
    st.inventory.push({ kind: 'dart', count: 1 });
    fireDart(st, 1, 0);
    expect(st.inventory.some((s) => s.kind === 'dart')).toBe(false);
    expect(en.hp).toBe(10);
    expect(
      st.log.some((l) => l.loreId === 'LOG-AIM-MISS' && l.detail === 'target in shadow'),
    ).toBe(true);
  });
});
