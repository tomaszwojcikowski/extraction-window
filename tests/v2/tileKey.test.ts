import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGame, loadSector } from '../../src/sim';
import { SECTORS } from '../../src/data/encounters';
import { tileTextureKey } from '../../src/v2/tileKey';

function atlasKeys(file: string): Set<string> {
  const json = JSON.parse(readFileSync(`public/art/${file}`, 'utf8')) as {
    frames: Record<string, unknown>;
  };
  return new Set(Object.keys(json.frames));
}

describe('v2 tile keys', () => {
  it('resolve to packed atlas frames across sectors', () => {
    const keys = new Set([
      ...atlasKeys('floors.json'),
      ...atlasKeys('walls.json'),
      ...atlasKeys('props.json'),
    ]);
    const missing: string[] = [];
    const state = createGame(42, { skipTutorial: true });
    for (let i = 0; i < SECTORS.length; i++) {
      if (i > 0) loadSector(state, i);
      for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
          const kind = state.tiles[y]![x]!.kind;
          const key = tileTextureKey(state, kind, x, y);
          if (!keys.has(key)) missing.push(`${state.sectorId} ${x},${y} ${kind} ${key}`);
        }
      }
    }
    expect(missing.slice(0, 12)).toEqual([]);
  });
});
