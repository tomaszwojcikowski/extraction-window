/**
 * ASCII dump of generated sectors, with room roles labelled.
 *
 * Layout is the one part of the game the contact sheet cannot show, so this is
 * how a generation change gets eyeballed: does a room read as one thing from
 * its doorway, and does the sector read differently from its neighbour?
 *
 * Usage: `npx tsx scripts/probe-map.ts [seed] [sectorIndex...]`
 */
import { getSector } from '../src/data/encounters';
import { generateSectorMap } from '../src/map/generator';
import { layoutForSector } from '../src/map/layout';
import type { Tile } from '../src/sim/types';

const GLYPH: Partial<Record<Tile['kind'], string>> = {
  wall: '#',
  floor: '.',
  hazard: '!',
  vent: '=',
  scrub: '"',
  scrub_nest: '&',
  rubble: '%',
  sealed: '+',
  tripwire: '^',
  brine_pool: '~',
  landmark: 'O',
  exit: '>',
  beacon: 'B',
  shuttle: 'S',
  quest: '?',
};

const ROLE_MARK: Record<string, string> = {
  entry: 'E',
  nest: 'N',
  cache: 'C',
  hazard: 'H',
  post: 'P',
  quiet: 'q',
  exit: 'X',
};

const seed = Number(process.argv[2] ?? 42);
const indices = process.argv.slice(3).map(Number);
const sectors = indices.length ? indices : [0, 5, 8, 11, 14];

for (const index of sectors) {
  const sector = getSector(index);
  const map = generateSectorMap(sector, seed, index);
  const grid = map.tiles.map((row) => row.map((t) => GLYPH[t.kind] ?? '?'));

  // Role letter at each room centre, hostiles as lowercase, loot as $.
  for (const room of map.rooms) {
    grid[room.cy]![room.cx] = ROLE_MARK[room.role] ?? '?';
  }
  for (const e of map.enemies) grid[e.y]![e.x] = e.tier === 'normal' ? 'x' : 'X';
  for (const i of map.items) grid[i.y]![i.x] = '$';
  grid[map.start.y]![map.start.x] = '@';

  const counts = map.rooms.reduce<Record<string, number>>((acc, r) => {
    acc[r.role] = (acc[r.role] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `\n=== ${sector.id} [${layoutForSector(sector.id)}] (index ${index}, seed ${seed}) — ${map.rooms.length} rooms: ` +
      Object.entries(counts)
        .map(([k, v]) => `${v}×${k}`)
        .join(', ') +
      ` · ${map.enemies.length} hostiles, ${map.items.length} items`,
  );
  console.log(grid.map((row) => row.join('')).join('\n'));
}
