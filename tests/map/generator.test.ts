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

  it('always spawns a room quest when rooms ≥ 3', () => {
    for (const seed of [1, 42, 99, 777, 12345, 9999]) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const sector = getSector(i);
        const map = generateSectorMap(sector, seed, i);
        if (map.rooms.length < 3) continue;
        expect(map.roomQuest, `seed=${seed} sector=${sector.id}`).toBeTruthy();
        for (const step of map.roomQuest!.steps) {
          expect(map.tiles[step.pos.y]![step.pos.x]!.kind).toBe('quest');
        }
      }
    }
  });

  it('v1 room-quest pick pool is salvage | purge | vent_seal | decode', () => {
    const allowed = new Set(['salvage', 'purge', 'vent_seal', 'decode']);
    for (const seed of [1, 7, 42, 99, 256, 777, 1337, 4096, 9999, 12345]) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const sector = getSector(i);
        const map = generateSectorMap(sector, seed, i);
        if (!map.roomQuest) continue;
        expect(
          allowed.has(map.roomQuest.kind),
          `seed=${seed} sector=${sector.id} kind=${map.roomQuest.kind}`,
        ).toBe(true);
      }
    }
  });

  it('places exactly one elite on sector index ≥ 2 when mid-rooms exist', () => {
    for (const seed of [1, 42, 777]) {
      for (let i = 2; i < CAMPAIGN_LENGTH; i++) {
        const sector = getSector(i);
        const map = generateSectorMap(sector, seed, i);
        const mid = map.rooms.filter((_, idx) => idx > 0 && idx < map.rooms.length - 1);
        if (mid.length < 1) continue;
        const elites = map.enemies.filter((e) => e.tier === 'elite');
        expect(elites.length, `seed=${seed} ${sector.id}`).toBe(1);
      }
    }
  });

  it('places campaign bosses on ruin, vault, and approach', () => {
    for (const seed of [1, 42, 777, 12345]) {
      const ruin = generateSectorMap(getSector(5), seed, 5);
      expect(ruin.enemies.some((e) => e.kind === 'isolinear_warden' && e.tier === 'boss')).toBe(
        true,
      );

      const vault = generateSectorMap(getSector(11), seed, 11);
      expect(vault.enemies.some((e) => e.kind === 'pattern_custodian' && e.tier === 'boss')).toBe(
        true,
      );

      const approachIdx = 13;
      expect(getSector(approachIdx).id).toBe('approach');
      const approach = generateSectorMap(getSector(approachIdx), seed, approachIdx);
      expect(approach.enemies.some((e) => e.kind === 'shear_sovereign' && e.tier === 'boss')).toBe(
        true,
      );
    }
  });

  it('often places field NPCs on mid-depth sectors', () => {
    let found = 0;
    for (const seed of [1, 7, 42, 99, 256, 777, 1337, 4096]) {
      const map = generateSectorMap(getSector(3), seed, 3);
      if (map.npcs.length > 0) found += 1;
    }
    expect(found).toBeGreaterThanOrEqual(3);
  });
});
