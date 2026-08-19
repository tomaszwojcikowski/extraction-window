import { describe, expect, it } from 'vitest';
import {
  applyShroudRevealFrom,
  moveBlendDirtyCells,
  shroudRevealEase,
} from '../../src/game/views/moveBlendDirty';
import { Theme } from '../../src/scenes/theme';

describe('moveBlendDirtyCells', () => {
  it('lists only cells whose alpha or tint changes', () => {
    const fromA = [
      [1, 0.5],
      [0.2, 1],
    ];
    const toA = [
      [1, 0.8],
      [0.2, 1],
    ];
    const fromT = [
      [0xffffff, 0x111111],
      [0x222222, 0x333333],
    ];
    const toT = [
      [0xffffff, 0x111111],
      [0x222222, 0x444444],
    ];
    expect(moveBlendDirtyCells(fromA, toA, fromT, toT)).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it('returns empty when grids match', () => {
    const a = [[1, 0.5]];
    const t = [[0xffffff, 0xabc]];
    expect(moveBlendDirtyCells(a, a, t, t)).toEqual([]);
  });
});

describe('shroud reveal', () => {
  it('rewrites FOW cells to an opaque fog wash so the real tile can fade in', () => {
    const fromA = [
      [1, 0.4],
      [1, 1],
    ];
    const fromT = [
      [0xffffff, 0xabcdef],
      [0xffffff, 0x111111],
    ];
    const shroud = [
      [true, false],
      [true, false],
    ];
    applyShroudRevealFrom(fromA, fromT, shroud, Theme.fog);
    expect(fromA[0]![0]).toBe(1);
    expect(fromT[0]![0]).toBe(Theme.fog);
    expect(fromA[1]![0]).toBe(1);
    expect(fromT[1]![0]).toBe(Theme.fog);
    expect(fromA[0]![1]).toBe(0.4);
    expect(fromT[0]![1]).toBe(0xabcdef);
  });

  it('makes a shroud cell dirty against a lit destination', () => {
    const fromA = [[1]];
    const fromT = [[0xffffff]];
    applyShroudRevealFrom(fromA, fromT, [[true]], Theme.fog);
    expect(moveBlendDirtyCells(fromA, [[0.8]], fromT, [[0xaabbcc]])).toEqual([{ x: 0, y: 0 }]);
  });

  it('eases in so early hop stays foggy', () => {
    expect(shroudRevealEase(0)).toBe(0);
    expect(shroudRevealEase(1)).toBe(1);
    expect(shroudRevealEase(0.5)).toBeLessThan(0.5);
  });
});
