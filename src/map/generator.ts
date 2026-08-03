import type { SectorDef } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import type { ItemKind } from '../data/items';
import type { Enemy, GroundItem, Pos, PoiKind, Tile } from '../sim/types';
import { canReach } from '../sim/fov';
import { mulberry32, pick, randInt, shuffle, type Rng } from '../sim/rng';

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface GeneratedMap {
  tiles: Tile[][];
  width: number;
  height: number;
  rooms: Room[];
  start: Pos;
  exit: Pos;
  enemies: Enemy[];
  items: GroundItem[];
  beaconPos: Pos | null;
  shuttlePos: Pos | null;
  poiPos: Pos | null;
  poiKind: PoiKind | null;
  nextEntityId: number;
}

function wall(): Tile {
  return { kind: 'wall', walkable: false, transparent: false };
}
function floor(): Tile {
  return { kind: 'floor', walkable: true, transparent: true };
}
function hazard(): Tile {
  return { kind: 'hazard', walkable: true, transparent: true };
}
function scrub(): Tile {
  return { kind: 'scrub', walkable: true, transparent: true };
}
function rubble(): Tile {
  return { kind: 'rubble', walkable: true, transparent: true };
}
function vent(): Tile {
  return { kind: 'vent', walkable: true, transparent: true };
}
function exitTile(): Tile {
  return { kind: 'exit', walkable: true, transparent: true };
}
function beaconTile(): Tile {
  return { kind: 'beacon', walkable: true, transparent: true };
}
function shuttleTile(): Tile {
  return { kind: 'shuttle', walkable: true, transparent: true };
}
function poiTile(): Tile {
  return { kind: 'poi', walkable: true, transparent: true };
}

function carveRoom(tiles: Tile[][], room: Room): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      tiles[y]![x] = floor();
    }
  }
}

function carveH(tiles: Tile[][], x1: number, x2: number, y: number, wide = false): void {
  const a = Math.min(x1, x2);
  const b = Math.max(x1, x2);
  for (let x = a; x <= b; x++) {
    tiles[y]![x] = floor();
    if (wide && y + 1 < tiles.length - 1) tiles[y + 1]![x] = floor();
  }
}

function carveV(tiles: Tile[][], y1: number, y2: number, x: number, wide = false): void {
  const a = Math.min(y1, y2);
  const b = Math.max(y1, y2);
  for (let y = a; y <= b; y++) {
    tiles[y]![x] = floor();
    if (wide && x + 1 < tiles[0]!.length - 1) tiles[y]![x + 1] = floor();
  }
}

function connect(tiles: Tile[][], a: Room, b: Room, rng: Rng): void {
  const wide = rng() < 0.35;
  if (rng() < 0.5) {
    carveH(tiles, a.cx, b.cx, a.cy, wide);
    carveV(tiles, a.cy, b.cy, b.cx, wide);
  } else {
    carveV(tiles, a.cy, b.cy, a.cx, wide);
    carveH(tiles, a.cx, b.cx, b.cy, wide);
  }
}

function roomOverlaps(a: Room, b: Room, pad = 1): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function floorTiles(tiles: Tile[][]): Pos[] {
  const out: Pos[] = [];
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y]!.length; x++) {
      if (tiles[y]![x]!.walkable) out.push({ x, y });
    }
  }
  return out;
}

function occupiedSet(enemies: Enemy[], items: GroundItem[], start: Pos, specials: Pos[]): Set<string> {
  const s = new Set<string>();
  s.add(`${start.x},${start.y}`);
  for (const p of specials) s.add(`${p.x},${p.y}`);
  for (const e of enemies) s.add(`${e.x},${e.y}`);
  for (const i of items) s.add(`${i.x},${i.y}`);
  return s;
}

/**
 * Generate a connected room-and-corridor map for a sector.
 * Guarantees path from start to exit and to quest items.
 */
export function generateSectorMap(
  sector: SectorDef,
  seed: number,
  sectorSalt: number,
  opts: { beaconAlreadyOpen?: boolean } = {},
): GeneratedMap {
  const rng = mulberry32((seed ^ (sectorSalt * 0x9e3779b9)) >>> 0);
  const width = sector.width;
  const height = sector.height;
  const tiles: Tile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => wall()),
  );

  const rooms: Room[] = [];
  const targetRooms = randInt(rng, sector.roomCount[0], sector.roomCount[1]);
  let attempts = 0;
  while (rooms.length < targetRooms && attempts < 200) {
    attempts++;
    const w = randInt(rng, 5, 10);
    const h = randInt(rng, 4, 8);
    const x = randInt(rng, 1, width - w - 2);
    const y = randInt(rng, 1, height - h - 2);
    const room: Room = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    if (rooms.some((r) => roomOverlaps(r, room, 2))) continue;
    rooms.push(room);
    carveRoom(tiles, room);
    if (rooms.length > 1) connect(tiles, rooms[rooms.length - 2]!, room, rng);
  }

  // Ensure minimum rooms
  if (rooms.length < 3) {
    for (const [rx, ry] of [
      [2, 2],
      [width - 10, 2],
      [2, height - 8],
      [width - 10, height - 8],
    ] as const) {
      if (rooms.length >= 4) break;
      const room: Room = {
        x: rx,
        y: ry,
        w: 6,
        h: 5,
        cx: rx + 3,
        cy: ry + 2,
      };
      if (room.x + room.w >= width - 1 || room.y + room.h >= height - 1) continue;
      if (rooms.some((r) => roomOverlaps(r, room))) continue;
      rooms.push(room);
      carveRoom(tiles, room);
      if (rooms.length > 1) connect(tiles, rooms[0]!, room, rng);
    }
  }

  // Extra connections for loops
  if (rooms.length >= 3) {
    connect(tiles, rooms[0]!, rooms[rooms.length - 1]!, rng);
  }

  // Sparse alcoves off random rooms (open feel, not crowded)
  const alcoveN = randInt(rng, 1, 2);
  for (let i = 0; i < alcoveN && rooms.length > 0; i++) {
    const parent = pick(rng, rooms);
    const ox = randInt(rng, -1, 1);
    const oy = randInt(rng, -1, 1);
    if (ox === 0 && oy === 0) continue;
    const w = randInt(rng, 3, 5);
    const h = randInt(rng, 3, 4);
    const x = parent.cx + ox * (parent.w + 1);
    const y = parent.cy + oy * (parent.h + 1);
    if (x < 1 || y < 1 || x + w >= width - 1 || y + h >= height - 1) continue;
    const alcove: Room = {
      x,
      y,
      w,
      h,
      cx: x + Math.floor(w / 2),
      cy: y + Math.floor(h / 2),
    };
    if (rooms.some((r) => roomOverlaps(r, alcove, 0))) continue;
    rooms.push(alcove);
    carveRoom(tiles, alcove);
    connect(tiles, parent, alcove, rng);
  }

  // Terrain dressing — sparse, skip specials later
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y]![x]!.kind !== 'floor') continue;
      const roll = rng();
      if (roll < sector.hazardChance) tiles[y]![x] = hazard();
      else if (roll < sector.hazardChance + sector.ventChance) tiles[y]![x] = vent();
      else if (roll < sector.hazardChance + sector.ventChance + sector.scrubChance) {
        tiles[y]![x] = scrub();
      } else if (
        roll <
        sector.hazardChance + sector.ventChance + sector.scrubChance + sector.rubbleChance
      ) {
        tiles[y]![x] = rubble();
      }
    }
  }

  const startRoom = rooms[0]!;
  const endRoom = rooms[rooms.length - 1]!;
  const start: Pos = { x: startRoom.cx, y: startRoom.cy };
  let exit: Pos = { x: endRoom.cx, y: endRoom.cy };
  if (exit.x === start.x && exit.y === start.y && rooms.length > 1) {
    exit = { x: rooms[1]!.cx, y: rooms[1]!.cy };
  }

  let beaconPos: Pos | null = null;
  let shuttlePos: Pos | null = null;
  let poiPos: Pos | null = null;
  let poiKind: PoiKind | null = null;
  let nextEntityId = 1;
  const enemies: Enemy[] = [];
  const items: GroundItem[] = [];

  if (sector.isBeacon) {
    beaconPos = { x: endRoom.cx, y: endRoom.cy };
    tiles[beaconPos.y]![beaconPos.x] = beaconTile();
    // Exit is near beacon but only open after key use — place exit adjacent
    const candidates = [
      { x: beaconPos.x + 1, y: beaconPos.y },
      { x: beaconPos.x - 1, y: beaconPos.y },
      { x: beaconPos.x, y: beaconPos.y + 1 },
      { x: beaconPos.x, y: beaconPos.y - 1 },
    ].filter((p) => tiles[p.y]?.[p.x]?.walkable);
    exit = candidates[0] ?? exit;
    if (opts.beaconAlreadyOpen) {
      tiles[exit.y]![exit.x] = exitTile();
    } else {
      // Exit tile exists but blocked until key — still mark as exit for rendering
      tiles[exit.y]![exit.x] = exitTile();
    }
  } else if (sector.isShuttle) {
    shuttlePos = { x: endRoom.cx, y: endRoom.cy };
    tiles[shuttlePos.y]![shuttlePos.x] = shuttleTile();
    exit = shuttlePos;
  } else {
    tiles[exit.y]![exit.x] = exitTile();
  }

  // Guarantee connectivity start → exit
  if (!canReach(tiles, start, exit)) {
    connect(tiles, startRoom, endRoom, rng);
    // re-apply special tiles
    if (sector.isBeacon && beaconPos) tiles[beaconPos.y]![beaconPos.x] = beaconTile();
    if (sector.isShuttle && shuttlePos) tiles[shuttlePos.y]![shuttlePos.x] = shuttleTile();
    else if (!sector.isShuttle) tiles[exit.y]![exit.x] = exitTile();
  }

  const specials: Pos[] = [exit];
  if (beaconPos) specials.push(beaconPos);
  if (shuttlePos) specials.push(shuttlePos);

  // Quest items with reachability guarantee
  const floors = shuffle(rng, floorTiles(tiles));
  const placeQuest = (kind: ItemKind) => {
    for (const p of floors) {
      if (p.x === start.x && p.y === start.y) continue;
      if (p.x === exit.x && p.y === exit.y) continue;
      if (!canReach(tiles, start, p)) continue;
      items.push({ id: nextEntityId++, kind, x: p.x, y: p.y });
      specials.push(p);
      return;
    }
    // Fallback: place in a mid room and carve path
    const mid = rooms[Math.floor(rooms.length / 2)] ?? endRoom;
    const p = { x: mid.cx, y: mid.cy };
    if (!(p.x === start.x && p.y === start.y)) {
      items.push({ id: nextEntityId++, kind, x: p.x, y: p.y });
      specials.push(p);
      connect(tiles, startRoom, mid, rng);
    }
  };

  if (sector.hasRelayKey) placeQuest('relay_key');
  if (sector.hasNavCore) placeQuest('nav_core');

  // Sparse POI — at most one, never on start/exit/quest
  if (rng() < 0.7 && rooms.length >= 2) {
    const poiRoom = rooms[randInt(rng, 1, rooms.length - 1)]!;
    const candidates = [
      { x: poiRoom.cx, y: poiRoom.cy },
      { x: poiRoom.cx + 1, y: poiRoom.cy },
      { x: poiRoom.cx, y: poiRoom.cy + 1 },
    ].filter(
      (p) =>
        tiles[p.y]?.[p.x]?.walkable &&
        !(p.x === start.x && p.y === start.y) &&
        !(p.x === exit.x && p.y === exit.y) &&
        canReach(tiles, start, p),
    );
    if (candidates.length) {
      poiPos = candidates[0]!;
      const kinds: PoiKind[] = ['console', 'nest', 'cache_scar'];
      poiKind = pick(rng, kinds);
      tiles[poiPos.y]![poiPos.x] = poiTile();
      specials.push(poiPos);
    }
  }

  // Loot — fewer piles, more variety (already in tables)
  const lootN = randInt(rng, sector.lootCount[0], sector.lootCount[1]);
  let placed = 0;
  const occ = () => occupiedSet(enemies, items, start, specials);
  for (const p of floors) {
    if (placed >= lootN) break;
    const key = `${p.x},${p.y}`;
    if (occ().has(key)) continue;
    if (!canReach(tiles, start, p)) continue;
    if (rng() > 0.22) continue;
    const kind = pick(rng, sector.lootTable);
    items.push({ id: nextEntityId++, kind, x: p.x, y: p.y });
    placed++;
  }

  // Enemies — keep packs sparse
  const enemyN = randInt(rng, sector.enemyCount[0], sector.enemyCount[1]);
  let ePlaced = 0;
  for (const p of floors) {
    if (ePlaced >= enemyN) break;
    const key = `${p.x},${p.y}`;
    if (occ().has(key)) continue;
    if (Math.abs(p.x - start.x) + Math.abs(p.y - start.y) < 5) continue;
    if (rng() > 0.28) continue;
    const kind = pick(rng, sector.enemyTable);
    const def = ENEMIES[kind];
    const scale = 1 + sector.index * 0.05;
    enemies.push({
      id: nextEntityId++,
      kind,
      x: p.x,
      y: p.y,
      hp: Math.ceil(def.hp * scale),
      maxHp: Math.ceil(def.hp * scale),
      atk: Math.ceil(def.atk * scale),
      def: def.def,
      alive: true,
      statuses: {},
      alerted: false,
      swellTurns: 0,
      homeX: p.x,
      homeY: p.y,
      skirmishRetreat: false,
    });
    ePlaced++;
  }

  // Final connectivity assert repair
  if (!canReach(tiles, start, exit)) {
    for (const r of rooms) connect(tiles, startRoom, r, rng);
    if (sector.isBeacon && beaconPos) tiles[beaconPos.y]![beaconPos.x] = beaconTile();
    if (sector.isShuttle && shuttlePos) tiles[shuttlePos.y]![shuttlePos.x] = shuttleTile();
    else tiles[exit.y]![exit.x] = exitTile();
    if (poiPos && poiKind) tiles[poiPos.y]![poiPos.x] = poiTile();
  }
  for (const it of items) {
    if ((it.kind === 'relay_key' || it.kind === 'nav_core') && !canReach(tiles, start, it)) {
      connect(tiles, startRoom, { x: it.x, y: it.y, w: 1, h: 1, cx: it.x, cy: it.y }, rng);
    }
  }

  return {
    tiles,
    width,
    height,
    rooms,
    start,
    exit,
    enemies,
    items,
    beaconPos,
    shuttlePos,
    poiPos,
    poiKind,
    nextEntityId,
  };
}
