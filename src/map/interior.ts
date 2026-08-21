import { pick, randInt, type Rng } from '../sim/rng';
import type { Pos, Tile } from '../sim/types';
import type { Room } from './rooms';

/**
 * Make a room take more than a glance.
 *
 * Layout carves rectangles and used to join them centre-to-centre, so every
 * room was a hollow box with a highway through the middle — spent in about
 * twenty seconds. This pass turns those boxes into places: shared edges become
 * walls with doors, and the interior gets a role-shaped obstruction that you
 * have to walk around, not past.
 *
 * Never owns start/exit/centre tiles, and always leaves every door able to
 * reach the room centre, so dressing and quests cannot be walled in.
 */

function wall(): Tile {
  return { kind: 'wall', walkable: false, transparent: false };
}
function floor(): Tile {
  return { kind: 'floor', walkable: true, transparent: true };
}

function inRoom(room: Room, x: number, y: number): boolean {
  return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function protectedTiles(rooms: Room[], reserved: Pos[]): Set<string> {
  const out = new Set<string>();
  for (const p of reserved) out.add(key(p.x, p.y));
  for (const room of rooms) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = room.cx + dx;
        const y = room.cy + dy;
        if (inRoom(room, x, y)) out.add(key(x, y));
      }
    }
  }
  return out;
}

function canWall(tiles: Tile[][], locked: Set<string>, x: number, y: number): boolean {
  if (locked.has(key(x, y))) return false;
  const t = tiles[y]?.[x];
  if (!t) return false;
  // Do not smash special furniture — only raw floor is structure clay.
  return t.kind === 'floor';
}

type Side = 'n' | 's' | 'e' | 'w';

function openingsOnSide(tiles: Tile[][], room: Room, side: Side): Pos[] {
  const out: Pos[] = [];
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const pushIfOpen = (x: number, y: number, nx: number, ny: number) => {
    if (!tiles[y]?.[x]?.walkable) return;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
    if (tiles[ny]?.[nx]?.walkable) out.push({ x, y });
  };
  if (side === 'n') {
    for (let x = room.x; x < room.x + room.w; x++) pushIfOpen(x, room.y, x, room.y - 1);
  } else if (side === 's') {
    const y = room.y + room.h - 1;
    for (let x = room.x; x < room.x + room.w; x++) pushIfOpen(x, y, x, y + 1);
  } else if (side === 'w') {
    for (let y = room.y; y < room.y + room.h; y++) pushIfOpen(room.x, y, room.x - 1, y);
  } else {
    const x = room.x + room.w - 1;
    for (let y = room.y; y < room.y + room.h; y++) pushIfOpen(x, y, x + 1, y);
  }
  return out;
}

/**
 * A run of three or more openings is a missing wall, not a door. Keep one or
 * two tiles as the actual doorway and close the rest.
 */
function sealWideOpenings(tiles: Tile[][], room: Room, rng: Rng, locked: Set<string>): void {
  for (const side of ['n', 's', 'e', 'w'] as const) {
    const opens = openingsOnSide(tiles, room, side);
    if (opens.length < 3) continue;
    const along = side === 'n' || side === 's' ? (p: Pos) => p.x : (p: Pos) => p.y;
    opens.sort((a, b) => along(a) - along(b));
    let run: Pos[] = [];
    const flush = () => {
      if (run.length < 3) {
        run = [];
        return;
      }
      const keep = new Set<number>();
      keep.add(randInt(rng, 0, run.length - 1));
      if (run.length >= 7) keep.add(randInt(rng, 0, run.length - 1));
      for (let i = 0; i < run.length; i++) {
        if (keep.has(i)) continue;
        const p = run[i]!;
        if (canWall(tiles, locked, p.x, p.y)) tiles[p.y]![p.x] = wall();
      }
      run = [];
    };
    let prev = along(opens[0]!) - 2;
    for (const p of opens) {
      const v = along(p);
      if (v !== prev + 1) flush();
      run.push(p);
      prev = v;
    }
    flush();
  }
}

function placePillars(tiles: Tile[][], room: Room, rng: Rng, locked: Set<string>): void {
  const stepX = room.w >= 12 ? 4 : 3;
  const stepY = room.h >= 10 ? 4 : 3;
  const fat = room.w >= 10 && room.h >= 8;
  for (let y = room.y + 2; y < room.y + room.h - 2; y += stepY) {
    for (let x = room.x + 2; x < room.x + room.w - 2; x += stepX) {
      if (!canWall(tiles, locked, x, y)) continue;
      tiles[y]![x] = wall();
      if (fat && rng() < 0.55 && canWall(tiles, locked, x + 1, y)) tiles[y]![x + 1] = wall();
      if (fat && rng() < 0.35 && canWall(tiles, locked, x, y + 1)) tiles[y + 1]![x] = wall();
    }
  }
}

function placeDivider(tiles: Tile[][], room: Room, rng: Rng, locked: Set<string>): void {
  const vertical = rng() < 0.5;
  if (vertical) {
    const x = randInt(rng, room.x + 2, room.x + room.w - 3);
    const gaps = new Set<number>([room.cy]);
    if (room.h >= 8) gaps.add(randInt(rng, room.y + 1, room.y + room.h - 2));
    for (let y = room.y; y < room.y + room.h; y++) {
      if (gaps.has(y)) continue;
      if (canWall(tiles, locked, x, y)) tiles[y]![x] = wall();
    }
  } else {
    const y = randInt(rng, room.y + 2, room.y + room.h - 3);
    const gaps = new Set<number>([room.cx]);
    if (room.w >= 10) gaps.add(randInt(rng, room.x + 1, room.x + room.w - 2));
    for (let x = room.x; x < room.x + room.w; x++) {
      if (gaps.has(x)) continue;
      if (canWall(tiles, locked, x, y)) tiles[y]![x] = wall();
    }
  }
}

function placeChamber(tiles: Tile[][], room: Room, rng: Rng, locked: Set<string>): void {
  const inset = 1;
  const ix = room.x + inset + randInt(rng, 0, 1);
  const iy = room.y + inset + randInt(rng, 0, 1);
  const iw = Math.max(4, room.w - 4 - randInt(rng, 0, 1));
  const ih = Math.max(3, room.h - 4 - randInt(rng, 0, 1));
  if (ix + iw >= room.x + room.w || iy + ih >= room.y + room.h) {
    placeDivider(tiles, room, rng, locked);
    return;
  }
  const doorSide = pick(rng, ['n', 's', 'e', 'w'] as const);
  for (let x = ix; x < ix + iw; x++) {
    if (canWall(tiles, locked, x, iy)) tiles[iy]![x] = wall();
    const by = iy + ih - 1;
    if (canWall(tiles, locked, x, by)) tiles[by]![x] = wall();
  }
  for (let y = iy + 1; y < iy + ih - 1; y++) {
    if (canWall(tiles, locked, ix, y)) tiles[y]![ix] = wall();
    const rx = ix + iw - 1;
    if (canWall(tiles, locked, rx, y)) tiles[y]![rx] = wall();
  }
  const door =
    doorSide === 'n'
      ? { x: ix + Math.floor(iw / 2), y: iy }
      : doorSide === 's'
        ? { x: ix + Math.floor(iw / 2), y: iy + ih - 1 }
        : doorSide === 'w'
          ? { x: ix, y: iy + Math.floor(ih / 2) }
          : { x: ix + iw - 1, y: iy + Math.floor(ih / 2) };
  if (inRoom(room, door.x, door.y) && !locked.has(key(door.x, door.y))) {
    tiles[door.y]![door.x] = floor();
  }
}

function placeLBlock(tiles: Tile[][], room: Room, rng: Rng, locked: Set<string>): void {
  const west = rng() < 0.5;
  const north = rng() < 0.5;
  const cutX = west
    ? room.x + Math.max(3, Math.floor(room.w * 0.45))
    : room.x + room.w - Math.max(3, Math.floor(room.w * 0.45));
  const cutY = north
    ? room.y + Math.max(3, Math.floor(room.h * 0.45))
    : room.y + room.h - Math.max(3, Math.floor(room.h * 0.45));
  const x0 = west ? room.x : cutX;
  const x1 = west ? cutX : room.x + room.w;
  const y0 = north ? room.y : cutY;
  const y1 = north ? cutY : room.y + room.h;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (canWall(tiles, locked, x, y)) tiles[y]![x] = wall();
    }
  }
  // Inner-face gap so the block is a corner, not a sealed vault.
  const gapX = west ? cutX - 1 : cutX;
  const gapY = north ? cutY - 1 : cutY;
  for (const [x, y] of [
    [gapX, gapY],
    [gapX + (west ? -1 : 1), gapY],
    [gapX, gapY + (north ? -1 : 1)],
  ] as const) {
    if (inRoom(room, x, y) && !locked.has(key(x, y))) tiles[y]![x] = floor();
  }
}

function placeUBay(tiles: Tile[][], room: Room, rng: Rng, locked: Set<string>): void {
  const side = pick(rng, ['n', 's', 'e', 'w'] as const);
  const depth = randInt(rng, 3, Math.max(3, Math.min(room.w, room.h) - 4));
  if (side === 'n' || side === 's') {
    const y0 = side === 'n' ? room.y : room.y + room.h - depth;
    const y1 = y0 + depth;
    const x0 = room.x + 1;
    const x1 = room.x + room.w - 1;
    for (let y = y0; y < y1; y++) {
      if (canWall(tiles, locked, x0, y)) tiles[y]![x0] = wall();
      if (canWall(tiles, locked, x1 - 1, y)) tiles[y]![x1 - 1] = wall();
    }
    const lintel = side === 'n' ? y1 - 1 : y0;
    for (let x = x0; x < x1; x++) {
      if (canWall(tiles, locked, x, lintel)) tiles[lintel]![x] = wall();
    }
    const doorX = room.cx;
    if (!locked.has(key(doorX, lintel))) tiles[lintel]![doorX] = floor();
  } else {
    const x0 = side === 'w' ? room.x : room.x + room.w - depth;
    const x1 = x0 + depth;
    const y0 = room.y + 1;
    const y1 = room.y + room.h - 1;
    for (let x = x0; x < x1; x++) {
      if (canWall(tiles, locked, x, y0)) tiles[y0]![x] = wall();
      if (canWall(tiles, locked, x, y1 - 1)) tiles[y1 - 1]![x] = wall();
    }
    const lintel = side === 'w' ? x1 - 1 : x0;
    for (let y = y0; y < y1; y++) {
      if (canWall(tiles, locked, lintel, y)) tiles[y]![lintel] = wall();
    }
    const doorY = room.cy;
    if (!locked.has(key(lintel, doorY))) tiles[doorY]![lintel] = floor();
  }
}

type InteriorKind = 'pillars' | 'divider' | 'chamber' | 'lblock' | 'ubay';

function pickKind(role: Room['role'], rng: Rng, w: number, h: number): InteriorKind | null {
  if (w < 7 || h < 6) return null;
  switch (role) {
    case 'nest':
      return pick(rng, ['chamber', 'lblock', 'ubay'] as const);
    case 'cache':
      return pick(rng, ['chamber', 'divider'] as const);
    case 'post':
      return 'pillars';
    case 'collapse':
      return pick(rng, ['divider', 'pillars'] as const);
    case 'thicket':
      return rng() < 0.4 ? 'pillars' : null;
    case 'hazard':
      return rng() < 0.3 ? 'pillars' : null;
    case 'quiet':
      return rng() < 0.75 ? 'pillars' : rng() < 0.5 ? 'divider' : null;
    case 'entry':
      return rng() < 0.6 ? 'pillars' : null;
    case 'exit':
      return rng() < 0.5 ? 'pillars' : null;
    default:
      return rng() < 0.5 ? 'pillars' : null;
  }
}

function applyKind(
  kind: InteriorKind,
  tiles: Tile[][],
  room: Room,
  rng: Rng,
  locked: Set<string>,
): void {
  switch (kind) {
    case 'pillars':
      placePillars(tiles, room, rng, locked);
      break;
    case 'divider':
      placeDivider(tiles, room, rng, locked);
      break;
    case 'chamber':
      placeChamber(tiles, room, rng, locked);
      break;
    case 'lblock':
      placeLBlock(tiles, room, rng, locked);
      break;
    case 'ubay':
      placeUBay(tiles, room, rng, locked);
      break;
  }
}

function walkableRatio(tiles: Tile[][], room: Room): number {
  let walk = 0;
  const area = room.w * room.h;
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (tiles[y]?.[x]?.walkable) walk++;
    }
  }
  return area <= 0 ? 1 : walk / area;
}

function snapshotRoom(tiles: Tile[][], room: Room): Tile[] {
  const out: Tile[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      out.push({ ...tiles[y]![x]! });
    }
  }
  return out;
}

function restoreRoom(tiles: Tile[][], room: Room, snap: Tile[]): void {
  let i = 0;
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      tiles[y]![x] = snap[i++]!;
    }
  }
}

function canReachInRoom(tiles: Tile[][], room: Room, a: Pos, b: Pos): boolean {
  if (!tiles[a.y]?.[a.x]?.walkable || !tiles[b.y]?.[b.x]?.walkable) return false;
  const seen = new Set<string>([key(a.x, a.y)]);
  const q: Pos[] = [a];
  while (q.length) {
    const p = q.pop()!;
    if (p.x === b.x && p.y === b.y) return true;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (!inRoom(room, x, y)) continue;
      if (!tiles[y]?.[x]?.walkable) continue;
      const k = key(x, y);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ x, y });
    }
  }
  return false;
}

function tunnel(tiles: Tile[][], room: Room, from: Pos, to: Pos): void {
  let x = from.x;
  let y = from.y;
  while (x !== to.x) {
    x += Math.sign(to.x - x);
    if (inRoom(room, x, y) && tiles[y]?.[x] && !tiles[y][x]!.walkable) {
      tiles[y]![x] = floor();
    }
  }
  while (y !== to.y) {
    y += Math.sign(to.y - y);
    if (inRoom(room, x, y) && tiles[y]?.[x] && !tiles[y][x]!.walkable) {
      tiles[y]![x] = floor();
    }
  }
}

function roomDoors(tiles: Tile[][], room: Room): Pos[] {
  const seen = new Set<string>();
  const out: Pos[] = [];
  for (const side of ['n', 's', 'e', 'w'] as const) {
    for (const p of openingsOnSide(tiles, room, side)) {
      const k = key(p.x, p.y);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

function floodRoom(tiles: Tile[][], room: Room, origin: Pos): Set<string> {
  const seen = new Set<string>();
  if (!tiles[origin.y]?.[origin.x]?.walkable) return seen;
  const q: Pos[] = [origin];
  seen.add(key(origin.x, origin.y));
  while (q.length) {
    const p = q.pop()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (!inRoom(room, x, y)) continue;
      if (!tiles[y]?.[x]?.walkable) continue;
      const k = key(x, y);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ x, y });
    }
  }
  return seen;
}

function repairRoom(tiles: Tile[][], room: Room, reserved: Pos[]): void {
  const centre: Pos = { x: room.cx, y: room.cy };
  if (!tiles[centre.y]?.[centre.x]?.walkable) tiles[centre.y]![centre.x] = floor();
  const targets = [...roomDoors(tiles, room)];
  for (const p of reserved) {
    if (inRoom(room, p.x, p.y)) targets.push(p);
  }
  for (const t of targets) {
    if (!tiles[t.y]?.[t.x]?.walkable) tiles[t.y]![t.x] = floor();
    if (!canReachInRoom(tiles, room, centre, t)) tunnel(tiles, room, centre, t);
  }
  // Close leftover pockets: anything still walkable but cut off from the
  // centre gets a tunnel, so a chamber door that failed to open cannot trap
  // a tile the player can see but never reach.
  for (let n = 0; n < room.w * room.h; n++) {
    const reached = floodRoom(tiles, room, centre);
    let orphan: Pos | null = null;
    for (let y = room.y; y < room.y + room.h && !orphan; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (!tiles[y]?.[x]?.walkable) continue;
        if (!reached.has(key(x, y))) {
          orphan = { x, y };
          break;
        }
      }
    }
    if (!orphan) break;
    tunnel(tiles, room, centre, orphan);
  }
}

function furnishRoom(
  tiles: Tile[][],
  room: Room,
  rng: Rng,
  locked: Set<string>,
  reserved: Pos[],
): void {
  const kind = pickKind(room.role, rng, room.w, room.h);
  if (!kind && !(room.w >= 11 && room.h >= 8)) {
    repairRoom(tiles, room, reserved);
    return;
  }
  const snap = snapshotRoom(tiles, room);
  if (kind) applyKind(kind, tiles, room, rng, locked);
  if (room.w >= 11 && room.h >= 8 && rng() < 0.6) {
    placePillars(tiles, room, rng, locked);
  }
  if (walkableRatio(tiles, room) < 0.38) {
    restoreRoom(tiles, room, snap);
    placePillars(tiles, room, rng, locked);
    if (walkableRatio(tiles, room) < 0.38) restoreRoom(tiles, room, snap);
  }
  repairRoom(tiles, room, reserved);
}

export function carveRoomStructure(
  tiles: Tile[][],
  rooms: Room[],
  rng: Rng,
  reserved: Pos[],
): void {
  const locked = protectedTiles(rooms, reserved);
  for (const room of rooms) sealWideOpenings(tiles, room, rng, locked);
  for (const room of rooms) furnishRoom(tiles, room, rng, locked, reserved);
}
