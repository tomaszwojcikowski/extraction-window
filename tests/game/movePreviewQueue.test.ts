import { describe, expect, it } from 'vitest';
import {
  applyDirectionQueue,
  previewMatchesCommit,
  previewTile,
  toMoveAction,
} from '../../src/game/input/MovePreviewQueue';
import type { GameState } from '../../src/sim/types';
import { STORM_TURNS } from '../../src/campaign/spine';

function stubState(over: Partial<{ px: number; py: number; wallAt?: [number, number] }> = {}): GameState {
  const w = 11;
  const h = 11;
  const visible = Array.from({ length: h }, () => Array.from({ length: w }, () => true));
  const explored = visible.map((row) => row.slice());
  const tiles = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ kind: 'floor' as const, walkable: true, transparent: true })),
  ) as GameState['tiles'];
  if (over.wallAt) {
    const [wx, wy] = over.wallAt;
    tiles[wy]![wx] = { kind: 'wall', walkable: false, transparent: false };
  }
  return {
    width: w,
    height: h,
    tiles,
    illumination: Array.from({ length: h }, () => Array.from({ length: w }, () => 0)),
    visible,
    explored,
    turn: 1,
    stormTurns: STORM_TURNS,
    player: {
      x: over.px ?? 5,
      y: over.py ?? 5,
      hp: 10,
      maxHp: 10,
      energy: 50,
      maxEnergy: 50,
      jammerTurns: 0,
    },
  } as GameState;
}

describe('MovePreviewQueue (Shift wake peek)', () => {
  it('aims adjacent tile for peek', () => {
    const st = stubState();
    const q = applyDirectionQueue(st, null, 0, -1);
    expect(q).toEqual({ dx: 0, dy: -1 });
    expect(previewTile(st, q!)).toEqual({ x: 5, y: 4 });
    expect(toMoveAction(q!)).toEqual({ type: 'move', dx: 0, dy: -1 });
    expect(previewMatchesCommit(st, q!)).toBe(true);
  });

  it('same direction re-aims adjacent only', () => {
    const st = stubState();
    const first = applyDirectionQueue(st, null, 1, 0);
    const second = applyDirectionQueue(st, first, 1, 0);
    expect(second).toEqual({ dx: 1, dy: 0 });
    expect(previewTile(st, second!)).toEqual({ x: 6, y: 5 });
    expect(previewMatchesCommit(st, second!)).toBe(true);
  });

  it('retargets on different direction', () => {
    const st = stubState();
    const north = applyDirectionQueue(st, null, 0, -1);
    const east = applyDirectionQueue(st, north, 1, 0);
    expect(east).toEqual({ dx: 1, dy: 0 });
    expect(previewTile(st, east!)).toEqual({ x: 6, y: 5 });
  });

  it('returns null when direction targets a wall', () => {
    const st = stubState({ wallAt: [5, 4] });
    expect(applyDirectionQueue(st, null, 0, -1)).toBeNull();
  });

  it('peek dest always equals one-step tile', () => {
    const st = stubState();
    let q = applyDirectionQueue(st, null, 1, 0);
    for (let i = 0; i < 5; i++) {
      q = applyDirectionQueue(st, q, 1, 0);
      expect(previewMatchesCommit(st, q!)).toBe(true);
    }
  });
});
