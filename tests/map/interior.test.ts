import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LENGTH } from '../../src/campaign/spine';
import { getSector } from '../../src/data/encounters';
import { generateSectorMap } from '../../src/map/generator';
import { canReach } from '../../src/sim';

const SEEDS = [1, 42, 777, 9999];

function innerWalls(map: ReturnType<typeof generateSectorMap>, room: (typeof map.rooms)[number]): number {
  let n = 0;
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      if (!map.tiles[y]?.[x]?.walkable) n++;
    }
  }
  return n;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

describe('rooms take more than a glance', () => {
  it('gives typical rooms enough floor to spend time in', () => {
    const areas: number[] = [];
    for (const seed of SEEDS) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const map = generateSectorMap(getSector(i), seed, i);
        for (const room of map.rooms) {
          if (room.w >= 6 && room.h >= 5) areas.push(room.w * room.h);
        }
      }
    }
    expect(areas.length).toBeGreaterThan(40);
    expect(median(areas), 'median room area').toBeGreaterThanOrEqual(56);
  });

  it('puts interior structure in large rooms', () => {
    let large = 0;
    let structured = 0;
    for (const seed of SEEDS) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const map = generateSectorMap(getSector(i), seed, i);
        for (const room of map.rooms) {
          if (room.w < 8 || room.h < 6) continue;
          large++;
          if (innerWalls(map, room) >= 3) structured++;
        }
      }
    }
    expect(large).toBeGreaterThan(20);
    expect(structured / large, 'share of large rooms with interior walls').toBeGreaterThan(0.4);
  });

  it('keeps each room internally connected from its centre', () => {
    for (const seed of SEEDS) {
      for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
        const sector = getSector(i);
        const map = generateSectorMap(sector, seed, i);
        const label = `seed=${seed} ${sector.id}`;
        expect(canReach(map.tiles, map.start, map.exit), label).toBe(true);
        for (const room of map.rooms) {
          const centre = { x: room.cx, y: room.cy };
          expect(map.tiles[centre.y]?.[centre.x]?.walkable, `${label} centre`).toBe(true);
          for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
              if (!map.tiles[y]?.[x]?.walkable) continue;
              expect(
                canReach(map.tiles, centre, { x, y }),
                `${label} ${room.role} ${x},${y}`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });
});
