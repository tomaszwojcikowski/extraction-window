import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LENGTH } from '../../src/campaign/spine';
import { getSector, SECTORS } from '../../src/data/encounters';
import { ENEMIES } from '../../src/data/enemies';
import { generateSectorMap } from '../../src/map/generator';
import { canReach } from '../../src/sim';
import type { RoomRole } from '../../src/sim/types';

const SEEDS = [1, 42, 777, 9999, 12345];

/** Every sector, every seed — the invariants below are not allowed exceptions. */
function everyMap(fn: (map: ReturnType<typeof generateSectorMap>, label: string) => void): void {
  for (const seed of SEEDS) {
    for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
      const sector = getSector(i);
      fn(generateSectorMap(sector, seed, i), `seed=${seed} sector=${sector.id}`);
    }
  }
}

describe('a room is for something', () => {
  it('lands the surveyor in an entry room and puts the way out in an exit room', () => {
    everyMap((map, label) => {
      expect(map.rooms[0]!.role, label).toBe('entry');
      if (map.rooms.length > 1) {
        expect(map.rooms[map.rooms.length - 1]!.role, label).toBe('exit');
      }
    });
  });

  it('owes the player a fight worth avoiding and a payout worth taking', () => {
    everyMap((map, label) => {
      const middle = map.rooms.slice(1, -1);
      if (middle.length < 2) return;
      const roles = new Set(middle.map((r) => r.role));
      expect(roles.has('nest'), `${label} has no nest`).toBe(true);
      expect(roles.has('cache'), `${label} has no cache`).toBe(true);
    });
  });

  it('never dresses a room into blocking the way out', () => {
    everyMap((map, label) => {
      expect(canReach(map.tiles, map.start, map.exit), label).toBe(true);
    });
  });

  it('leaves the entry room clear of hostiles', () => {
    everyMap((map, label) => {
      const entry = map.rooms[0]!;
      const inside = map.enemies.filter(
        (e) =>
          e.x >= entry.x && e.x < entry.x + entry.w && e.y >= entry.y && e.y < entry.y + entry.h,
      );
      expect(inside, label).toEqual([]);
    });
  });
});

describe('hostiles arrive in packs, not in a smear', () => {
  it('puts more than one hostile in a nest when the budget allows', () => {
    let packs = 0;
    let nests = 0;
    everyMap((map) => {
      for (const room of map.rooms) {
        if (room.role !== 'nest') continue;
        nests++;
        const inside = map.enemies.filter(
          (e) => e.x >= room.x && e.x < room.x + room.w && e.y >= room.y && e.y < room.y + room.h,
        );
        if (inside.length >= 2) packs++;
      }
    });
    expect(nests).toBeGreaterThan(0);
    // Not every nest can be filled — a small sector's budget runs out — but the
    // common case has to be a pack, or the role is not doing anything.
    expect(packs / nests).toBeGreaterThan(0.4);
  });

  it('leaves quiet rooms quiet', () => {
    let quiet = 0;
    let occupied = 0;
    everyMap((map) => {
      for (const room of map.rooms) {
        if (room.role !== 'quiet') continue;
        quiet++;
        const inside = map.enemies.filter(
          (e) => e.x >= room.x && e.x < room.x + room.w && e.y >= room.y && e.y < room.y + room.h,
        );
        if (inside.length) occupied++;
      }
    });
    expect(quiet).toBeGreaterThan(0);
    // Wanderers drift, so this is about placement, not a promise about turn 200.
    expect(occupied).toBe(0);
  });

  it('gives a post something that can actually hold a line', () => {
    everyMap((map, label) => {
      for (const room of map.rooms) {
        if (room.role !== 'post') continue;
        const inside = map.enemies.filter(
          (e) => e.x >= room.x && e.x < room.x + room.w && e.y >= room.y && e.y < room.y + room.h,
        );
        for (const holder of inside) {
          const def = ENEMIES[holder.kind];
          const holds =
            def.overwatch ||
            def.beam ||
            def.behavior === 'guard' ||
            def.behavior === 'sentinel' ||
            def.hunt === 'zone';
          expect(holds, `${label} post holds ${holder.kind}`).toBe(true);
        }
      }
    });
  });
});

describe('a sector can only draw the rooms it has earned', () => {
  it('keeps caustic ground out of the sectors that have none', () => {
    const gentle = SECTORS.filter((s) => s.hazardChance + s.ventChance <= 0.08).map((s) => s.id);
    expect(gentle.length).toBeGreaterThan(0);
    everyMap((map, label) => {
      const id = label.split('sector=')[1]!;
      if (!gentle.includes(id as never)) return;
      expect(map.rooms.some((r) => r.role === 'hazard'), label).toBe(false);
    });
  });

  it('keeps posts out of the sectors with nothing to man them', () => {
    const unmanned = SECTORS.filter(
      (s) => !s.enemyTable.some((k) => ENEMIES[k].overwatch || ENEMIES[k].beam),
    ).map((s) => s.id);
    expect(unmanned.length).toBeGreaterThan(0);
    everyMap((map, label) => {
      const id = label.split('sector=')[1]!;
      if (!unmanned.includes(id as never)) return;
      expect(map.rooms.some((r) => r.role === 'post'), label).toBe(false);
    });
  });

  it('gives the sectors genuinely different room mixes', () => {
    // The whole point: two sectors that draw from the same bag are one sector
    // wearing two palettes.
    const signatures = new Set<string>();
    for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
      const sector = getSector(i);
      const roles = new Set<RoomRole>();
      for (const seed of SEEDS) {
        for (const room of generateSectorMap(sector, seed, i).rooms) roles.add(room.role);
      }
      signatures.add([...roles].sort().join(','));
    }
    expect(signatures.size).toBeGreaterThanOrEqual(5);
  });
});
