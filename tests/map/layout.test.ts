import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LENGTH } from '../../src/campaign/spine';
import { getSector } from '../../src/data/encounters';
import { generateSectorMap } from '../../src/map/generator';
import { layoutForSector, type LayoutKind } from '../../src/map/layout';
import { canReach } from '../../src/sim';

const SEEDS = [1, 42, 777, 9999];

describe('sector layout grammars', () => {
  it('assigns every sector a grammar', () => {
    const kinds = new Set<LayoutKind>();
    for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
      kinds.add(layoutForSector(getSector(i).id));
    }
    // Six named shapes — if this shrinks, sectors are collapsing back together.
    expect(kinds.size).toBe(6);
  });

  it('keeps start→exit reachable under every grammar', () => {
    for (const seed of SEEDS) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const sector = getSector(i);
        const map = generateSectorMap(sector, seed, i);
        expect(
          canReach(map.tiles, map.start, map.exit),
          `seed=${seed} ${sector.id} (${layoutForSector(sector.id)})`,
        ).toBe(true);
      }
    }
  });

  it('puts spine sectors on a west→east run', () => {
    for (const seed of SEEDS) {
      const sector = getSector(
        [...Array(CAMPAIGN_LENGTH)].map((_, i) => getSector(i)).findIndex((s) => s.id === 'ridge'),
      );
      expect(sector.id).toBe('ridge');
      const map = generateSectorMap(sector, seed, sector.index);
      expect(map.start.x, `seed=${seed} ridge`).toBeLessThan(map.exit.x);
    }
  });

  it('puts hub sectors through a mid room the player does not land in', () => {
    for (const seed of SEEDS) {
      for (const id of ['beacon', 'vault'] as const) {
        const sector = getSector(
          [...Array(CAMPAIGN_LENGTH)].map((_, i) => getSector(i)).findIndex((s) => s.id === id),
        );
        const map = generateSectorMap(sector, seed, sector.index);
        const entry = map.rooms.find((r) => r.role === 'entry');
        const exit = map.rooms.find((r) => r.role === 'exit');
        const hub = map.rooms.find((r) => r !== entry && r !== exit);
        expect(hub, `seed=${seed} ${id}`).toBeTruthy();
        // Hub is larger or more central than a spoke — at least not the entry.
        expect(entry?.role).toBe('entry');
        expect(map.rooms[0]).not.toBe(entry); // rooms[0] is the carved hub
      }
    }
  });

  it('keeps the hub crossing quiet', () => {
    for (const seed of SEEDS) {
      for (const id of ['beacon', 'vault'] as const) {
        const sector = getSector(
          [...Array(CAMPAIGN_LENGTH)].map((_, i) => getSector(i)).findIndex((s) => s.id === id),
        );
        const map = generateSectorMap(sector, seed, sector.index);
        expect(map.rooms[0]!.role, `seed=${seed} ${id}`).toBe('quiet');
      }
    }
  });
});
