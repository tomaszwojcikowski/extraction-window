import { describe, expect, it } from 'vitest';
import { floorFrames, SECTORS } from '../../src/art/paint/floors';
import { Px, TILE } from '../../src/art/px';
import { FLOOR_VARIANT_COUNT } from '../../src/scenes/theme';
import { floorVariantAt } from '../../src/scenes/textures';

function periodicity(data: Uint8ClampedArray, w: number, h: number, step: number): number {
  let same = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w - step; x++) {
      const i = (y * w + x) * 4;
      const j = (y * w + x + step) * 4;
      n++;
      if (data[i] === data[j] && data[i + 1] === data[j + 1] && data[i + 2] === data[j + 2]) same++;
    }
  }
  return same / n;
}

function blitRoom(
  frames: Record<string, { data: Uint8ClampedArray; w: number; h: number }>,
  sector: string,
  hashed: boolean,
): Px {
  const cols = 8;
  const rows = 6;
  const out = new Px(cols * TILE, rows * TILE);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = hashed ? floorVariantAt(x, y, 7) : 0;
      out.blit(frames[`t_floor_${sector}_${v}`] as Px, x * TILE, y * TILE);
    }
  }
  return out;
}

describe('floorVariantAt', () => {
  it('stays in range and is deterministic', () => {
    for (let seed = 0; seed < 8; seed++) {
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          const v = floorVariantAt(x, y, seed);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(FLOOR_VARIANT_COUNT);
          expect(floorVariantAt(x, y, seed)).toBe(v);
        }
      }
    }
  });

  it('does not stripe (x + 3y + seed) % 3 across a room', () => {
    for (const seed of [1, 7, 42, 99]) {
      let matches = 0;
      let cells = 0;
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          cells++;
          if (floorVariantAt(x, y, seed) % 3 === (x + y * 3 + seed) % 3) matches++;
        }
      }
      expect(matches).toBeLessThan(cells * 0.55);
    }
  });

  it('uses several variants in a room and often differs from neighbours', () => {
    const seed = 11;
    const seen = new Set<number>();
    let differ = 0;
    let edges = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const v = floorVariantAt(x, y, seed);
        seen.add(v);
        if (x < 7) {
          edges++;
          if (floorVariantAt(x + 1, y, seed) !== v) differ++;
        }
        if (y < 7) {
          edges++;
          if (floorVariantAt(x, y + 1, seed) !== v) differ++;
        }
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
    expect(differ / edges).toBeGreaterThan(0.5);
  });
});

describe('floorFrames', () => {
  it('bakes six phase-shifted variants per sector', () => {
    const frames = floorFrames();
    for (const sector of SECTORS) {
      const keys = Array.from(
        { length: FLOOR_VARIANT_COUNT },
        (_, v) => `t_floor_${sector}_${v}`,
      );
      for (const key of keys) {
        expect(frames.some((f) => f.key === key)).toBe(true);
      }
      const a = frames.find((f) => f.key === keys[0])!.px.data;
      const b = frames.find((f) => f.key === keys[1])!.px.data;
      let diff = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      expect(diff).toBeGreaterThan(48);
    }
  });

  it('does not stamp the beacon pad disc on every variant at the same cell', () => {
    const frames = floorFrames();
    const v0 = frames.find((f) => f.key === 't_floor_beacon_0')!.px;
    const v1 = frames.find((f) => f.key === 't_floor_beacon_1')!.px;
    const i = (24 * v0.w + 24) * 4;
    expect(v0.data[i]).not.toBe(v1.data[i]);
    expect(v0.data[i + 1]).not.toBe(v1.data[i + 1]);
  });

  it('breaks 48px periodicity when variants are hashed across a room', () => {
    const frames = Object.fromEntries(floorFrames().map((f) => [f.key, f.px]));
    for (const sector of ['beacon', 'duct', 'spire', 'fissure', 'ridge'] as const) {
      const stamped = blitRoom(frames, sector, false);
      const hashed = blitRoom(frames, sector, true);
      const a = periodicity(stamped.data, stamped.w, stamped.h, TILE);
      const b = periodicity(hashed.data, hashed.w, hashed.h, TILE);
      expect(b).toBeLessThan(a * 0.92);
    }
  });
});
