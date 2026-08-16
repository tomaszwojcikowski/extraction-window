import { describe, expect, it } from 'vitest';
import { moveBlendDirtyCells } from '../../src/game/views/moveBlendDirty';

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
