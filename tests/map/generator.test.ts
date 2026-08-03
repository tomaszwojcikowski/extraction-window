import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LENGTH } from '../../src/campaign/spine';
import { getSector } from '../../src/data/encounters';
import { generateSectorMap } from '../../src/map/generator';
import { canReach } from '../../src/sim';
import { checkObjectivesReachable } from '../harness';

describe('map generator', () => {
  it('every sector has a walkable start→exit path for sample seeds', () => {
    for (const seed of [1, 42, 9999]) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const sector = getSector(i);
        const map = generateSectorMap(sector, seed, i);
        expect(
          canReach(map.tiles, map.start, map.exit),
          `seed=${seed} sector=${sector.id}`,
        ).toBe(true);
      }
    }
  });

  it('ruin always places a reachable isolinear key', () => {
    for (const seed of [1, 42, 777, 12345]) {
      const sector = getSector(5); // Crash Wreck Belt
      expect(sector.id).toBe('ruin');
      const map = generateSectorMap(sector, seed, 5);
      const key = map.items.find((i) => i.kind === 'relay_key');
      expect(key, `seed=${seed} missing key`).toBeTruthy();
      expect(canReach(map.tiles, map.start, { x: key!.x, y: key!.y })).toBe(true);
    }
  });

  it('vault always places a reachable nav core', () => {
    for (const seed of [1, 42, 777, 12345]) {
      const sector = getSector(11);
      expect(sector.id).toBe('vault');
      const map = generateSectorMap(sector, seed, 11);
      const core = map.items.find((i) => i.kind === 'nav_core');
      expect(core, `seed=${seed} missing core`).toBeTruthy();
      expect(canReach(map.tiles, map.start, { x: core!.x, y: core!.y })).toBe(true);
    }
  });

  it('checkObjectivesReachable passes for smoke seeds', () => {
    for (const seed of [1, 42, 99, 12345]) {
      expect(checkObjectivesReachable(seed)).toBe(true);
    }
  });
});
