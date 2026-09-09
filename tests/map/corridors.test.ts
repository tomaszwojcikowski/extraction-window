import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LENGTH } from '../../src/campaign/spine';
import { getSector } from '../../src/data/encounters';
import { isCorridorCell } from '../../src/map/corridors';
import { generateSectorMap } from '../../src/map/generator';

const SEEDS = [1, 42, 777, 9999, 12345];

describe('corridors stay clear of events', () => {
  it('keeps halls and doorways as plain floor', () => {
    for (const seed of SEEDS) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const sector = getSector(i);
        const map = generateSectorMap(sector, seed, i);
        const label = `seed=${seed} ${sector.id}`;
        let halls = 0;
        for (let y = 0; y < map.height; y++) {
          for (let x = 0; x < map.width; x++) {
            if (!isCorridorCell(map.tiles, map.rooms, x, y)) continue;
            halls++;
            expect(map.tiles[y]![x]!.kind, `${label} ${x},${y}`).toBe('floor');
          }
        }
        expect(halls, label).toBeGreaterThan(0);
      }
    }
  });

  it('does not seat hostiles or kit in a doorway', () => {
    for (const seed of SEEDS) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const sector = getSector(i);
        const map = generateSectorMap(sector, seed, i);
        const label = `seed=${seed} ${sector.id}`;
        for (const e of map.enemies) {
          expect(isCorridorCell(map.tiles, map.rooms, e.x, e.y), `${label} enemy ${e.x},${e.y}`).toBe(
            false,
          );
        }
        for (const it of map.items) {
          expect(isCorridorCell(map.tiles, map.rooms, it.x, it.y), `${label} item ${it.x},${it.y}`).toBe(
            false,
          );
        }
        for (const n of map.npcs) {
          expect(isCorridorCell(map.tiles, map.rooms, n.x, n.y), `${label} npc ${n.x},${n.y}`).toBe(
            false,
          );
        }
      }
    }
  });
});
