import type { SectorDef } from '../data/encounters';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import { pick, randInt, shuffle, type Rng } from '../sim/rng';
import type { Pos, RoomRole, Tile } from '../sim/types';
import { layoutForSector, type LayoutKind } from './layoutKind';

/**
 * Room identity.
 *
 * The generator used to hand every room the same treatment: a rectangle, a
 * cosmetic decal, then hostiles and loot sprinkled over every walkable tile at
 * a flat probability. That produces a map where each room holds roughly the
 * sector average of everything, which is the same thing as holding nothing in
 * particular — the player has no reason to read a doorway before stepping
 * through it.
 *
 * So a room now has a role, the role owns its contents, and the sector's
 * hostile and loot budgets are *concentrated* rather than spread. Same totals,
 * very different rooms: a nest or post on the hatch-to-hatch route, a cache
 * worth paying for, ground that is itself the problem, and quiet rooms that
 * make the loud ones legible.
 */

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  role: RoomRole;
}

/** Rooms the player is meant to have an opinion about. */
export function midRooms(rooms: Room[]): Room[] {
  return rooms.filter((r) => r.role !== 'entry' && r.role !== 'exit');
}

/**
 * Role mix, derived from what the sector actually contains rather than a
 * hand-kept table per id — the same discipline the hostile silhouettes use.
 * A sector whose ground bites gets more rooms about ground; a sector stocked
 * with things that hold a line gets more rooms about sightlines.
 *
 * Layout grammar then tilts the mix so a warren and a scatter with the same
 * hazard dial still feel like different places — denser collapse/nest vs more
 * quiet/cache open ground — without changing hostile/loot totals.
 */
function grammarRoleTilt(kind: LayoutKind): Partial<Record<RoomRole, number>> {
  switch (kind) {
    case 'scatter':
      return { quiet: 2, cache: 1, nest: -1 };
    case 'spine':
      return { nest: 2, post: 1, quiet: -1 };
    case 'hub':
      return { quiet: 1, cache: 1, nest: -1 };
    case 'lattice':
      return { post: 2, nest: 1, thicket: -1 };
    case 'branch':
      return { thicket: 2, nest: 1, collapse: -1 };
    case 'warren':
      return { nest: 1, collapse: 2, hazard: 1, quiet: -1 };
  }
}

function sectorHoldsLines(sector: SectorDef): boolean {
  return sector.enemyTable.some((kind) => {
    const def = ENEMIES[kind];
    return def.overwatch || def.beam;
  });
}

function roleWeights(sector: SectorDef): Array<[RoomRole, number]> {
  // A weight of zero matters as much as a high one: the shelf sectors have no
  // caustic ground and nothing that can hold a line, so they must not be handed
  // rooms about either. That absence is what makes them a different place rather
  // than the same place with a gentler dial.
  const groundBites = sector.hazardChance + sector.ventChance > 0.08;
  const holdsLines = sectorHoldsLines(sector);
  const overgrown = sector.scrubChance > 0.05;
  const fallingApart = sector.rubbleChance > 0.05;
  const base: Array<[RoomRole, number]> = [
    ['nest', 3],
    ['cache', 2],
    ['quiet', 2],
    ['hazard', groundBites ? 3 : 0],
    ['post', holdsLines ? 3 : 0],
    ['thicket', overgrown ? 3 : 0],
    ['collapse', fallingApart ? 3 : 0],
  ];
  const tilt = grammarRoleTilt(layoutForSector(sector.id));
  return base.map(([role, w]) => {
    if (w <= 0) return [role, 0];
    const next = w + (tilt[role] ?? 0);
    return [role, Math.max(0, next)];
  });
}

function weightedRole(weights: Array<[RoomRole, number]>, rng: Rng): RoomRole {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [role, w] of weights) {
    roll -= w;
    if (roll <= 0) return role;
  }
  return weights[0]![0];
}

/**
 * Label every room. The start and exit rooms are spoken for — the surveyor
 * lands in one and leaves by the other — and the rest are drawn from the
 * sector's mix, except that a sector always owes the player one fight worth
 * taking and one payout worth taking.
 *
 * A `crossing` (the hub of a hub layout) is a post or nest: the player has to
 * walk through it, so the fight is on the road, not parked in an alcove.
 */
export function assignRoomRoles(
  rooms: Room[],
  sector: SectorDef,
  rng: Rng,
  startRoom?: Room,
  endRoom?: Room,
  crossing?: Room,
): void {
  if (!rooms.length) return;
  const entry = startRoom ?? rooms[0]!;
  const exit = endRoom ?? rooms[rooms.length - 1]!;
  const spineFight: RoomRole = sectorHoldsLines(sector) ? 'post' : 'nest';
  for (const room of rooms) {
    if (room === entry) room.role = 'entry';
    else if (room === exit) room.role = 'exit';
    else if (crossing && room === crossing) room.role = spineFight;
  }

  const middle = rooms.filter((r) => r !== entry && r !== exit && r !== crossing);
  const weights = roleWeights(sector);
  for (const room of middle) room.role = weightedRole(weights, rng);

  const guarantee = (role: RoomRole): void => {
    if (middle.some((r) => r.role === role) || (crossing && crossing.role === role)) return;
    const spare = middle.filter((r) => r.role !== 'nest' && r.role !== 'cache' && r.role !== 'post');
    const target = spare.length ? pick(rng, spare) : middle[0];
    if (target) target.role = role;
  };
  if (middle.length >= 1) guarantee('nest');
  if (middle.length >= 2) guarantee('cache');

  pinSpineFight(middle, entry, exit, spineFight);
}

/** Convert a quiet mid-room on the start→exit axis into the sector's road fight. */
function pinSpineFight(middle: Room[], entry: Room, exit: Room, spineFight: RoomRole): void {
  const mx = (entry.cx + exit.cx) / 2;
  const my = (entry.cy + exit.cy) / 2;
  const ranked = middle
    .filter((r) => r.role !== 'cache')
    .slice()
    .sort((a, b) => {
      const da = Math.abs(a.cx - mx) + Math.abs(a.cy - my);
      const db = Math.abs(b.cx - mx) + Math.abs(b.cy - my);
      return da - db;
    });
  const target = ranked[0];
  if (!target) return;
  if (target.role === 'post' || target.role === 'nest') return;
  target.role = spineFight;
}

// --- Ground -----------------------------------------------------------------

function inner(room: Room): Pos[] {
  const out: Pos[] = [];
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) out.push({ x, y });
  }
  return out;
}

function ring(room: Room): Pos[] {
  const out: Pos[] = [];
  for (let x = room.x; x < room.x + room.w; x++) {
    out.push({ x, y: room.y }, { x, y: room.y + room.h - 1 });
  }
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
    out.push({ x: room.x, y }, { x: room.x + room.w - 1, y });
  }
  return out;
}

const chebyshev = (a: Pos, b: Pos): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * The ground a role implies.
 *
 * Every role leaves the room centre walkable and never touches the start or
 * exit tile, so dressing can never be the reason a sector is unwinnable.
 */
export function dressRoomRoles(
  tiles: Tile[][],
  rooms: Room[],
  sector: SectorDef,
  rng: Rng,
  reserved: Pos[],
): void {
  const isReserved = (p: Pos): boolean =>
    reserved.some((r) => r.x === p.x && r.y === p.y);
  const paint = (p: Pos, tile: Tile): void => {
    if (isReserved(p)) return;
    if (tiles[p.y]?.[p.x]?.kind !== 'floor') return;
    tiles[p.y]![p.x] = tile;
  };
  const wet = sector.id === 'flood' || sector.id === 'brine' || sector.id === 'reef';
  const grammar = layoutForSector(sector.id);
  // Grammar densifies dressing without changing hostile/loot budgets.
  const dens =
    grammar === 'warren' ? 1.12 : grammar === 'branch' ? 1.08 : grammar === 'scatter' ? 0.92 : 1;

  for (const room of rooms) {
    const centre = { x: room.cx, y: room.cy };
    switch (room.role) {
      case 'nest': {
        // Sight-blocking growth so the pack's size is a surprise the player
        // walks into rather than a number read from the doorway.
        for (const p of inner(room)) {
          if (chebyshev(p, centre) <= 1) continue;
          if (rng() < 0.34 * dens) paint(p, nest());
        }
        break;
      }
      case 'cache': {
        // Something in the way: a broken lip around the payout, or a runoff
        // sump if the sector has wet ground to offer.
        for (const p of ring(room)) {
          if (rng() < 0.4 * dens) paint(p, wet ? sumpTile() : rubbleTile());
        }
        break;
      }
      case 'hazard': {
        // A field with one dry line through it — the room is a crossing.
        const lane = rng() < 0.5 ? 'x' : 'y';
        for (const p of inner(room)) {
          const onLane = lane === 'x' ? p.y === room.cy : p.x === room.cx;
          if (onLane) continue;
          if (rng() < 0.55 * dens) paint(p, wet ? sumpTile() : hazardTile());
        }
        break;
      }
      case 'post': {
        // Open in the middle so the shot is real, cover at the edges so the
        // answer is not simply to eat it.
        for (const p of ring(room)) {
          if (rng() < 0.3 * dens) paint(p, rubbleTile());
        }
        break;
      }
      case 'thicket': {
        // Wall-to-wall growth. Nothing here is lethal on its own; the room is
        // about crossing ground that will not tell you what is on it.
        for (const p of inner(room)) {
          if (rng() < 0.6 * dens) paint(p, blockingScrub());
        }
        break;
      }
      case 'collapse': {
        // A checker of fallen plate: every other tile is cover, which turns the
        // room into a shoving match rather than a trade of swings.
        for (const p of inner(room)) {
          if ((p.x + p.y) % 2 !== 0) continue;
          if (chebyshev(p, centre) === 0) continue;
          if (rng() < 0.7 * dens) paint(p, rubbleTile());
        }
        break;
      }
      case 'quiet': {
        paint(centre, landmark());
        break;
      }
      default:
        break;
    }
  }
}

function nest(): Tile {
  return { kind: 'scrub_nest', walkable: true, transparent: false };
}
function blockingScrub(): Tile {
  return { kind: 'scrub', walkable: true, transparent: false };
}
function rubbleTile(): Tile {
  return { kind: 'rubble', walkable: true, transparent: true };
}
function hazardTile(): Tile {
  return { kind: 'hazard', walkable: true, transparent: true };
}
function sumpTile(): Tile {
  return { kind: 'sump', walkable: true, transparent: true };
}
function landmark(): Tile {
  return { kind: 'landmark', walkable: true, transparent: true };
}

// --- Content budgets --------------------------------------------------------

export interface RoomFill {
  room: Room;
  count: number;
}

/**
 * Spend the sector's hostile budget by room instead of by tile.
 *
 * Nests get packs, because a pack is the only way a fight asks a positional
 * question. Posts get a single holder. Everything else gets what is left over,
 * and quiet rooms stay quiet even if that means the budget goes unspent — an
 * empty room is doing work.
 */
export function planHostiles(rooms: Room[], budget: number, rng: Rng): RoomFill[] {
  const plan: RoomFill[] = [];
  let left = budget;
  const take = (room: Room, want: number): void => {
    const count = Math.min(want, left);
    if (count <= 0) return;
    plan.push({ room, count });
    left -= count;
  };

  const byRole = (role: RoomRole): Room[] => shuffle(rng, rooms.filter((r) => r.role === role));

  // Road fights first — a nest in an alcove must not spend the whole budget
  // before the holder on the hatch-to-hatch route is paid.
  for (const room of byRole('post')) take(room, 1);
  for (const room of byRole('nest')) take(room, randInt(rng, 2, 3));
  for (const room of byRole('cache')) take(room, rng() < 0.6 ? 1 : 0);
  // A thicket with something in it is the point; an empty one is a bluff, and
  // the sector needs both for the room to stay worth reading.
  for (const room of byRole('thicket')) take(room, rng() < 0.65 ? 1 : 0);
  for (const room of byRole('collapse')) take(room, 1);
  for (const room of byRole('hazard')) take(room, rng() < 0.5 ? 1 : 0);

  // Anything still unspent goes back to the nests — thicker packs, not a thin
  // smear across rooms that are supposed to be empty.
  for (const room of byRole('nest')) {
    if (left <= 0) break;
    const existing = plan.find((f) => f.room === room);
    const extra = Math.min(left, 1);
    if (existing) existing.count += extra;
    else plan.push({ room, count: extra });
    left -= extra;
  }
  return plan;
}

/**
 * Spend the loot budget the same way. Caches hold most of it; hazard rooms get
 * a single piece as bait, which is what makes crossing them a choice rather
 * than a toll.
 */
export function planLoot(rooms: Room[], budget: number, rng: Rng): RoomFill[] {
  const plan: RoomFill[] = [];
  let left = budget;
  const take = (room: Room, want: number): void => {
    const count = Math.min(want, left);
    if (count <= 0) return;
    plan.push({ room, count });
    left -= count;
  };

  const caches = shuffle(rng, rooms.filter((r) => r.role === 'cache'));
  for (const room of caches) take(room, randInt(rng, 2, 3));
  for (const room of shuffle(rng, rooms.filter((r) => r.role === 'hazard'))) take(room, 1);
  for (const room of shuffle(rng, rooms.filter((r) => r.role === 'post'))) take(room, 1);
  // What the last crew dropped where it fell.
  for (const room of shuffle(rng, rooms.filter((r) => r.role === 'collapse'))) take(room, 1);

  // Leftovers ride along with the caches rather than dissolving into the map.
  for (const room of caches) {
    if (left <= 0) break;
    const existing = plan.find((f) => f.room === room);
    if (existing) existing.count += 1;
    else plan.push({ room, count: 1 });
    left -= 1;
  }
  return plan;
}

/**
 * Tiles to fill a room from, nearest the centre first.
 *
 * Contents cluster around the middle so a room reads as one thing seen from the
 * doorway, rather than as debris pushed into its corners.
 */
export function fillOrder(room: Room, tiles: Tile[][], rng: Rng): Pos[] {
  const centre = { x: room.cx, y: room.cy };
  const cells: Pos[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (tiles[y]?.[x]?.walkable) cells.push({ x, y });
    }
  }
  // Jitter inside a distance band so packs are clustered but not stamped.
  return shuffle(rng, cells).sort((a, b) => chebyshev(a, centre) - chebyshev(b, centre));
}

/** The hostile a post wants: something that threatens across the open floor. */
export function holderKind(table: EnemyKind[], rng: Rng): EnemyKind {
  const holders = table.filter((kind) => {
    const def = ENEMIES[kind];
    return (
      def.overwatch ||
      def.beam ||
      def.behavior === 'guard' ||
      def.behavior === 'sentinel' ||
      def.hunt === 'zone'
    );
  });
  return holders.length ? pick(rng, holders) : pick(rng, table);
}
