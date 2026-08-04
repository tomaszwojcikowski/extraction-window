import type { SectorDef } from '../data/encounters';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import {
  enemyCountBonus,
  scaleEnemyCombat,
} from '../data/difficulty';
import type { ItemKind } from '../data/items';
import type { Enemy, EnemyTier, FieldNpc, GroundItem, Pos, PoiKind, RoomQuest, Tile } from '../sim/types';
import { npcKindForSector } from '../data/npcs';
import { canReach } from '../sim/fov';
import { mulberry32, pick, randInt, shuffle, type Rng } from '../sim/rng';
import {
  buildMultiRoomQuest,
  buildSingleRoomQuest,
  isMultiSiteKind,
  pickRoomQuestKind,
} from '../sim/roomQuest';

type RoomTemplate = 'chamber' | 'gallery' | 'machine' | 'cross' | 'cache';

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
  npcs: FieldNpc[];
  beaconPos: Pos | null;
  shuttlePos: Pos | null;
  poiPos: Pos | null;
  poiKind: PoiKind | null;
  roomQuest: RoomQuest | null;
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
function scrub(blocksSight = false): Tile {
  // Sight-blocker in canopy/spire — ADOM scrub/fog feel without global FOV collapse
  return { kind: 'scrub', walkable: true, transparent: !blocksSight };
}
function rubble(): Tile {
  return { kind: 'rubble', walkable: true, transparent: true };
}
function vent(): Tile {
  return { kind: 'vent', walkable: true, transparent: true };
}
function sealed(): Tile {
  return { kind: 'sealed', walkable: false, transparent: true };
}
function tripwire(): Tile {
  return { kind: 'tripwire', walkable: true, transparent: true };
}
function brinePool(): Tile {
  return { kind: 'brine_pool', walkable: true, transparent: true };
}
function scrubNest(blocksSight = true): Tile {
  return { kind: 'scrub_nest', walkable: true, transparent: !blocksSight };
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
function questTile(): Tile {
  return { kind: 'quest', walkable: true, transparent: true };
}

function makeEnemy(
  id: number,
  kind: EnemyKind,
  p: Pos,
  sectorIndex: number,
  tier: EnemyTier = 'normal',
  playerLevel = 1,
): Enemy {
  const def = ENEMIES[kind];
  // Soft elite/boss curve — kill refunds still pay; keep autopilot WR in band
  const scaled = scaleEnemyCombat(def, sectorIndex, playerLevel, tier);
  return {
    id,
    kind,
    x: p.x,
    y: p.y,
    hp: scaled.hp,
    maxHp: scaled.hp,
    atk: scaled.atk,
    def: scaled.def,
    alive: true,
    statuses: {},
    alerted: false,
    swellTurns: 0,
    homeX: p.x,
    homeY: p.y,
    skirmishRetreat: false,
    windup: 0,
    tier,
  };
}

function eliteKindForSector(index: number): EnemyKind {
  if (index < 5) return 'elite_skirmisher';
  if (index < 10) return 'elite_ward';
  return 'elite_apex';
}

function occupiedSet(
  enemies: Enemy[],
  items: GroundItem[],
  start: Pos,
  specials: Pos[],
  npcs: FieldNpc[] = [],
): Set<string> {
  const s = new Set<string>();
  s.add(`${start.x},${start.y}`);
  for (const p of specials) s.add(`${p.x},${p.y}`);
  for (const e of enemies) s.add(`${e.x},${e.y}`);
  for (const i of items) s.add(`${i.x},${i.y}`);
  for (const n of npcs) s.add(`${n.x},${n.y}`);
  return s;
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

function connect(tiles: Tile[][], a: Room, b: Room, rng: Rng, wideChance = 0.35): void {
  const wide = rng() < wideChance;
  if (rng() < 0.5) {
    carveH(tiles, a.cx, b.cx, a.cy, wide);
    carveV(tiles, a.cy, b.cy, b.cx, wide);
  } else {
    carveV(tiles, a.cy, b.cy, a.cx, wide);
    carveH(tiles, a.cx, b.cx, b.cy, wide);
  }
}

/** Biome-flavored room footprint. */
function roomSizeForBiome(id: SectorDef['id'], rng: Rng): { w: number; h: number } {
  switch (id) {
    case 'vault':
      return { w: randInt(rng, 4, 6), h: randInt(rng, 3, 5) };
    case 'flood':
      return { w: randInt(rng, 6, 11), h: randInt(rng, 5, 9) };
    case 'ridge':
    case 'approach':
      return { w: randInt(rng, 4, 7), h: randInt(rng, 3, 5) };
    case 'canopy':
    case 'spire':
    case 'reef':
      return { w: randInt(rng, 5, 9), h: randInt(rng, 4, 8) };
    case 'ruin':
    case 'trench':
    case 'duct':
      return { w: randInt(rng, 5, 9), h: randInt(rng, 4, 7) };
    default:
      return { w: randInt(rng, 5, 10), h: randInt(rng, 4, 8) };
  }
}

function corridorWideChance(id: SectorDef['id']): number {
  if (id === 'flood' || id === 'vault') return 0.12; // choke bridges / tight halls
  if (id === 'ridge' || id === 'approach') return 0.2;
  if (id === 'canopy' || id === 'spire' || id === 'reef') return 0.25;
  if (id === 'duct') return 0.18;
  return 0.35;
}

/** Flood lakes, canopy scrub walls, ash vent lines, rubble mazes. */
function dressBiomeTerrain(
  tiles: Tile[][],
  rooms: Room[],
  sector: SectorDef,
  rng: Rng,
): void {
  const id = sector.id;
  const height = tiles.length;
  const width = tiles[0]!.length;

  const blockScrub = id === 'canopy' || id === 'spire' || id === 'reef';

  // Base sparse dressing
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y]![x]!.kind !== 'floor') continue;
      const roll = rng();
      if (roll < sector.hazardChance) tiles[y]![x] = hazard();
      else if (roll < sector.hazardChance + sector.ventChance) tiles[y]![x] = vent();
      else if (roll < sector.hazardChance + sector.ventChance + sector.scrubChance) {
        tiles[y]![x] = scrub(blockScrub);
      } else if (
        roll <
        sector.hazardChance + sector.ventChance + sector.scrubChance + sector.rubbleChance
      ) {
        tiles[y]![x] = rubble();
      }
    }
  }

  if (id === 'flood') {
    // Hazard lakes inside a few rooms, leave bridge strip through center
    for (const room of rooms) {
      if (rng() > 0.55) continue;
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (Math.abs(x - room.cx) <= 1) continue; // dry bridge
          if (tiles[y]![x]!.walkable && rng() < 0.55) tiles[y]![x] = hazard();
        }
      }
    }
  }

  if (id === 'canopy' || id === 'spire' || id === 'reef') {
    // Longer scrub sight-blockers along room edges
    for (const room of rooms) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (tiles[room.y]?.[x]?.kind === 'floor' && rng() < 0.45) tiles[room.y]![x] = scrub(true);
        const by = room.y + room.h - 1;
        if (tiles[by]?.[x]?.kind === 'floor' && rng() < 0.45) tiles[by]![x] = scrub(true);
      }
    }
  }

  if (id === 'ruin' || id === 'trench' || id === 'duct') {
    // Rubble maze pockets
    for (const room of rooms) {
      if (rng() > 0.5) continue;
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if ((x + y) % 2 === 0 && tiles[y]![x]!.kind === 'floor' && rng() < 0.4) {
            tiles[y]![x] = rubble();
          }
        }
      }
    }
  }

  if (id === 'ash' || id === 'brine' || id === 'fissure' || id === 'duct') {
    // Vent corridors between adjacent rooms
    for (let i = 0; i + 1 < rooms.length; i++) {
      const a = rooms[i]!;
      const b = rooms[i + 1]!;
      const y = a.cy;
      const x0 = Math.min(a.cx, b.cx);
      const x1 = Math.max(a.cx, b.cx);
      for (let x = x0; x <= x1; x++) {
        if (tiles[y]?.[x]?.walkable && rng() < 0.55) tiles[y]![x] = vent();
      }
    }
  }

  // Wave 2 sparse features (walkable only here — sealed placed after path check)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y]![x]!.kind !== 'floor') continue;
      const roll = rng();
      if (id === 'brine' || id === 'flood') {
        if (roll < 0.016) tiles[y]![x] = brinePool();
      } else if (roll < 0.004) {
        tiles[y]![x] = brinePool();
      }
      if (tiles[y]![x]!.kind !== 'floor') continue;
      if (id === 'canopy' || id === 'spire' || id === 'reef') {
        if (rng() < 0.012) tiles[y]![x] = scrubNest(true);
      }
      if (tiles[y]![x]!.kind !== 'floor') continue;
      if (id === 'ash' || id === 'duct' || id === 'vault') {
        if (rng() < 0.01) tiles[y]![x] = tripwire();
      } else if (rng() < 0.003) {
        tiles[y]![x] = tripwire();
      }
    }
  }
}

/** Rare sealed hatches in mid-rooms — never break start→exit. */
function dressSealedHatches(
  tiles: Tile[][],
  rooms: Room[],
  start: Pos,
  exit: Pos,
  rng: Rng,
): void {
  const mid = rooms.filter((_, i) => i > 0 && i < rooms.length - 1);
  if (mid.length === 0) return;
  for (const room of mid) {
    if (rng() > 0.22) continue;
    const candidates: Pos[] = [];
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
      for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
        if (tiles[y]![x]!.kind !== 'floor') continue;
        if (x === start.x && y === start.y) continue;
        if (x === exit.x && y === exit.y) continue;
        if (x === room.cx && y === room.cy) continue;
        candidates.push({ x, y });
      }
    }
    if (!candidates.length) continue;
    const p = pick(rng, candidates);
    const prev = tiles[p.y]![p.x]!;
    tiles[p.y]![p.x] = sealed();
    if (!canReach(tiles, start, exit)) {
      tiles[p.y]![p.x] = prev;
    }
    break; // at most one sealed hatch per sector
  }
}

function pickRoomTemplate(id: SectorDef['id'], rng: Rng): RoomTemplate {
  const roll = rng();
  switch (id) {
    case 'reef':
      return roll < 0.55 ? 'gallery' : roll < 0.8 ? 'chamber' : 'cross';
    case 'duct':
      return roll < 0.5 ? 'machine' : roll < 0.75 ? 'cross' : 'cache';
    case 'vault':
      return roll < 0.45 ? 'cache' : roll < 0.75 ? 'chamber' : 'machine';
    case 'approach':
      return roll < 0.55 ? 'cross' : roll < 0.8 ? 'chamber' : 'machine';
    case 'canopy':
    case 'spire':
      return roll < 0.4 ? 'gallery' : roll < 0.7 ? 'chamber' : 'cross';
    default:
      if (roll < 0.25) return 'chamber';
      if (roll < 0.45) return 'gallery';
      if (roll < 0.65) return 'machine';
      if (roll < 0.85) return 'cross';
      return 'cache';
  }
}

/** Landmark + internal props per room — keep walkability. */
function dressRoomTemplate(
  tiles: Tile[][],
  room: Room,
  template: RoomTemplate,
  rng: Rng,
  start: Pos,
  exit: Pos,
): void {
  const placeIfFloor = (x: number, y: number, tile: Tile) => {
    if (x === start.x && y === start.y) return;
    if (x === exit.x && y === exit.y) return;
    if (tiles[y]?.[x]?.kind === 'floor') tiles[y]![x] = tile;
  };

  if (template === 'chamber') {
    placeIfFloor(room.cx, room.cy, poiTile());
    return;
  }
  if (template === 'gallery') {
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
      const x = room.x + 1 + ((y - room.y) % Math.max(2, room.w - 2));
      if (x > room.x && x < room.x + room.w - 1) placeIfFloor(x, y, scrub(true));
    }
    placeIfFloor(room.cx, room.cy, poiTile());
    return;
  }
  if (template === 'machine') {
    const wallY = room.y + 1;
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      if (rng() < 0.55) placeIfFloor(x, wallY, vent());
    }
    placeIfFloor(room.cx, room.cy, poiTile());
    return;
  }
  if (template === 'cross') {
    // Stub arms — short corridors already exist; add rubble choke near center
    placeIfFloor(room.cx + 1, room.cy, rubble());
    placeIfFloor(room.cx - 1, room.cy, rubble());
    placeIfFloor(room.cx, room.cy, poiTile());
    return;
  }
  // cache — guaranteed loot pile later; rubble choke near door-ish edge
  placeIfFloor(room.x + 1, room.cy, rubble());
  placeIfFloor(room.cx, room.cy, poiTile());
}

function dressAllRoomTemplates(
  tiles: Tile[][],
  rooms: Room[],
  sector: SectorDef,
  rng: Rng,
  start: Pos,
  exit: Pos,
): void {
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i]!;
    if (room.w < 4 || room.h < 3) continue;
    // Skip tiny alcoves
    if (i === 0 || i === rooms.length - 1) {
      if (rng() > 0.35) continue;
    }
    const tpl = pickRoomTemplate(sector.id, rng);
    dressRoomTemplate(tiles, room, tpl, rng, start, exit);
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

/**
 * Generate a connected room-and-corridor map for a sector.
 * Guarantees path from start to exit and to quest items.
 */
export function generateSectorMap(
  sector: SectorDef,
  seed: number,
  sectorSalt: number,
  opts: { beaconAlreadyOpen?: boolean; playerLevel?: number } = {},
): GeneratedMap {
  const playerLevel = opts.playerLevel ?? 1;
  const rng = mulberry32((seed ^ (sectorSalt * 0x9e3779b9)) >>> 0);
  const width = sector.width;
  const height = sector.height;
  const tiles: Tile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => wall()),
  );

  const rooms: Room[] = [];
  const wideChance = corridorWideChance(sector.id);
  const targetRooms = randInt(rng, sector.roomCount[0], sector.roomCount[1]);
  let attempts = 0;
  while (rooms.length < targetRooms && attempts < 200) {
    attempts++;
    const { w, h } = roomSizeForBiome(sector.id, rng);
    const x = randInt(rng, 1, width - w - 2);
    const y = randInt(rng, 1, height - h - 2);
    const room: Room = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    if (rooms.some((r) => roomOverlaps(r, room, 2))) continue;
    rooms.push(room);
    carveRoom(tiles, room);
    if (rooms.length > 1) connect(tiles, rooms[rooms.length - 2]!, room, rng, wideChance);
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
      if (rooms.length > 1) connect(tiles, rooms[0]!, room, rng, wideChance);
    }
  }

  // Extra connections for loops (ridge stays more linear)
  if (rooms.length >= 3 && sector.id !== 'ridge') {
    connect(tiles, rooms[0]!, rooms[rooms.length - 1]!, rng, wideChance);
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
    connect(tiles, parent, alcove, rng, wideChance);
  }

  dressBiomeTerrain(tiles, rooms, sector, rng);

  const startRoom = rooms[0]!;
  const endRoom = rooms[rooms.length - 1]!;
  const start: Pos = { x: startRoom.cx, y: startRoom.cy };
  let exit: Pos = { x: endRoom.cx, y: endRoom.cy };
  if (exit.x === start.x && exit.y === start.y && rooms.length > 1) {
    exit = { x: rooms[1]!.cx, y: rooms[1]!.cy };
  }

  dressAllRoomTemplates(tiles, rooms, sector, rng, start, exit);

  let beaconPos: Pos | null = null;
  let shuttlePos: Pos | null = null;
  let poiPos: Pos | null = null;
  let poiKind: PoiKind | null = null;
  let roomQuest: RoomQuest | null = null;
  let nextEntityId = 1;
  const enemies: Enemy[] = [];
  const items: GroundItem[] = [];
  const npcs: FieldNpc[] = [];

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

  dressSealedHatches(tiles, rooms, start, exit, rng);

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

  // Always spawn one room quest when the sector has enough rooms
  if (rooms.length >= 3) {
    const midRooms = rooms.filter((r, i) => i > 0 && i < rooms.length - 1 && r !== startRoom && r !== endRoom);
    const candidates = midRooms.length >= 1 ? midRooms : rooms.slice(1, -1);
    const kind = pickRoomQuestKind(rng);

    if (isMultiSiteKind(kind) && candidates.length >= 2) {
      const multiKind = kind as 'relay_chain' | 'calibrate' | 'vent_seal';
      const shuffled = shuffle(rng, [...candidates]);
      const aRoom = shuffled[0]!;
      let bRoom: Room | null = null;
      for (let i = 1; i < shuffled.length; i++) {
        const cand = shuffled[i]!;
        const aPos = { x: aRoom.cx, y: aRoom.cy };
        const bPos = { x: cand.cx, y: cand.cy };
        if (
          canReach(tiles, start, aPos) &&
          canReach(tiles, aPos, bPos) &&
          !(aPos.x === exit.x && aPos.y === exit.y) &&
          !(bPos.x === exit.x && bPos.y === exit.y)
        ) {
          bRoom = cand;
          break;
        }
      }
      if (bRoom) {
        // Prefer a vent tile in room A for vent_seal
        let aPos = { x: aRoom.cx, y: aRoom.cy };
        if (multiKind === 'vent_seal') {
          let found: Pos | null = null;
          for (let y = aRoom.y; y < aRoom.y + aRoom.h && !found; y++) {
            for (let x = aRoom.x; x < aRoom.x + aRoom.w; x++) {
              if (tiles[y]?.[x]?.kind === 'vent') {
                found = { x, y };
                break;
              }
            }
          }
          if (found) aPos = found;
          else {
            tiles[aPos.y]![aPos.x] = vent();
          }
        }
        const bPos = { x: bRoom.cx, y: bRoom.cy };
        tiles[aPos.y]![aPos.x] = questTile();
        tiles[bPos.y]![bPos.x] = questTile();
        specials.push(aPos, bPos);
        roomQuest = buildMultiRoomQuest(multiKind, [
          { pos: aPos, room: { x: aRoom.x, y: aRoom.y, w: aRoom.w, h: aRoom.h } },
          { pos: bPos, room: { x: bRoom.x, y: bRoom.y, w: bRoom.w, h: bRoom.h } },
        ]);
      }
    }

    if (!roomQuest && candidates.length >= 1) {
      const side = pick(rng, candidates);
      const pos = { x: side.cx, y: side.cy };
      if (
        canReach(tiles, start, pos) &&
        !(pos.x === exit.x && pos.y === exit.y) &&
        !(pos.x === start.x && pos.y === start.y)
      ) {
        const singleKind = isMultiSiteKind(kind)
          ? pick(rng, ['salvage', 'purge'] as const)
          : kind;
        tiles[pos.y]![pos.x] = questTile();
        specials.push(pos);
        roomQuest = buildSingleRoomQuest(singleKind, pos, {
          x: side.x,
          y: side.y,
          w: side.w,
          h: side.h,
        });
      }
    }
  }
  // Decorative POI only when quest build failed
  if (!roomQuest && rng() < 0.45 && rooms.length >= 2) {
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
  const occ = () => occupiedSet(enemies, items, start, specials, npcs);
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

  // Enemies — keep packs sparse; level adds light density
  const enemyN =
    randInt(rng, sector.enemyCount[0], sector.enemyCount[1]) +
    enemyCountBonus(playerLevel);
  let ePlaced = 0;
  for (const p of floors) {
    if (ePlaced >= enemyN) break;
    const key = `${p.x},${p.y}`;
    if (occ().has(key)) continue;
    if (Math.abs(p.x - start.x) + Math.abs(p.y - start.y) < 5) continue;
    if (rng() > 0.28) continue;
    const kind = pick(rng, sector.enemyTable);
    enemies.push(makeEnemy(nextEntityId++, kind, p, sector.index, 'normal', playerLevel));
    ePlaced++;
  }

  // Exactly one elite per sector from index ≥2 when a mid-room exists
  if (sector.index >= 2) {
    const midRooms = rooms.filter((r) => r !== startRoom && r !== endRoom);
    const eliteRooms = shuffle(
      rng,
      midRooms.filter((r) => {
        const d = Math.abs(r.cx - start.x) + Math.abs(r.cy - start.y);
        return d >= 6;
      }),
    );
    const pool = eliteRooms.length ? eliteRooms : midRooms;
    for (const room of pool) {
      const candidates = [
        { x: room.cx, y: room.cy },
        { x: room.cx + 1, y: room.cy },
        { x: room.cx, y: room.cy + 1 },
        { x: room.cx - 1, y: room.cy },
        { x: room.cx, y: room.cy - 1 },
      ].filter((p) => {
        if (!tiles[p.y]?.[p.x]?.walkable) return false;
        if (occ().has(`${p.x},${p.y}`)) return false;
        if (p.x === exit.x && p.y === exit.y) return false;
        if (beaconPos && p.x === beaconPos.x && p.y === beaconPos.y) return false;
        if (shuttlePos && p.x === shuttlePos.x && p.y === shuttlePos.y) return false;
        if (roomQuest?.steps.some((s) => s.pos.x === p.x && s.pos.y === p.y)) return false;
        return canReach(tiles, start, p);
      });
      if (!candidates.length) continue;
      const p = candidates[0]!;
      enemies.push(
        makeEnemy(nextEntityId++, eliteKindForSector(sector.index), p, sector.index, 'elite', playerLevel),
      );
      break;
    }
  }

  // Campaign bosses — optional combat prizes on spine sectors (mid-room first so extract stays skippable)
  const placeBoss = (kind: EnemyKind, prefer: Pos | null, midFallback: boolean) => {
    const tries: Pos[] = [];
    if (midFallback) {
      const mid = rooms.filter((r) => r !== startRoom && r !== endRoom);
      for (const r of shuffle(rng, mid)) {
        tries.push({ x: r.cx, y: r.cy });
        tries.push({ x: r.cx + 1, y: r.cy });
        tries.push({ x: r.cx, y: r.cy + 1 });
      }
    }
    if (prefer) {
      tries.push(
        { x: prefer.x + 2, y: prefer.y },
        { x: prefer.x - 2, y: prefer.y },
        { x: prefer.x, y: prefer.y + 2 },
        { x: prefer.x, y: prefer.y - 2 },
        { x: prefer.x + 1, y: prefer.y + 1 },
        { x: prefer.x - 1, y: prefer.y - 1 },
      );
    }
    for (const p of tries) {
      if (!tiles[p.y]?.[p.x]?.walkable) continue;
      if (occ().has(`${p.x},${p.y}`)) continue;
      if (p.x === exit.x && p.y === exit.y) continue;
      if (p.x === start.x && p.y === start.y) continue;
      if (prefer && p.x === prefer.x && p.y === prefer.y) continue;
      if (beaconPos && p.x === beaconPos.x && p.y === beaconPos.y) continue;
      if (shuttlePos && p.x === shuttlePos.x && p.y === shuttlePos.y) continue;
      if (!canReach(tiles, start, p)) continue;
      enemies.push(makeEnemy(nextEntityId++, kind, p, sector.index, 'boss', playerLevel));
      return;
    }
  };

  if (sector.id === 'ruin') {
    const key = items.find((i) => i.kind === 'relay_key');
    placeBoss('isolinear_warden', key ? { x: key.x, y: key.y } : null, true);
  } else if (sector.id === 'vault') {
    const core = items.find((i) => i.kind === 'nav_core');
    placeBoss('pattern_custodian', core ? { x: core.x, y: core.y } : null, true);
  } else if (sector.id === 'approach') {
    const mid = rooms[Math.floor(rooms.length / 2)] ?? endRoom;
    placeBoss('shear_sovereign', { x: mid.cx, y: mid.cy }, true);
  }

  // Field contacts — optional lore / ally hail sites
  if (rooms.length >= 3) {
    const contactChance = sector.index >= 2 ? 0.72 : 0.55;
    if (rng() < contactChance) {
      const midRooms = shuffle(
        rng,
        rooms.filter((r) => r !== startRoom && r !== endRoom),
      );
      for (const room of midRooms) {
        const candidates = [
          { x: room.cx, y: room.cy },
          { x: room.cx + 1, y: room.cy },
          { x: room.cx, y: room.cy + 1 },
          { x: room.cx - 1, y: room.cy },
          { x: room.cx, y: room.cy - 1 },
        ].filter((p) => {
          if (!tiles[p.y]?.[p.x]?.walkable) return false;
          if (occ().has(`${p.x},${p.y}`)) return false;
          if (p.x === exit.x && p.y === exit.y) return false;
          if (beaconPos && p.x === beaconPos.x && p.y === beaconPos.y) return false;
          if (shuttlePos && p.x === shuttlePos.x && p.y === shuttlePos.y) return false;
          if (roomQuest?.steps.some((s) => s.pos.x === p.x && s.pos.y === p.y)) return false;
          return canReach(tiles, start, p);
        });
        if (!candidates.length) continue;
        const p = candidates[0]!;
        npcs.push({
          id: nextEntityId++,
          kind: npcKindForSector(sector.index),
          x: p.x,
          y: p.y,
          talked: false,
        });
        specials.push(p);
        break;
      }
    }
  }

  // Late sectors: extra field_tech for dormant drone activation (~50%)
  if (sector.index >= 4 && rng() < 0.5 && !npcs.some((n) => n.kind === 'field_tech')) {
    const midRooms = shuffle(
      rng,
      rooms.filter((r) => r !== startRoom && r !== endRoom),
    );
    for (const room of midRooms) {
      const p = { x: room.cx, y: room.cy };
      if (!tiles[p.y]?.[p.x]?.walkable) continue;
      if (occ().has(`${p.x},${p.y}`)) continue;
      if (p.x === exit.x && p.y === exit.y) continue;
      if (!canReach(tiles, start, p)) continue;
      npcs.push({
        id: nextEntityId++,
        kind: 'field_tech',
        x: p.x,
        y: p.y,
        talked: false,
      });
      specials.push(p);
      break;
    }
  }

  // Final connectivity assert repair
  if (!canReach(tiles, start, exit)) {
    for (const r of rooms) connect(tiles, startRoom, r, rng);
    if (sector.isBeacon && beaconPos) tiles[beaconPos.y]![beaconPos.x] = beaconTile();
    if (sector.isShuttle && shuttlePos) tiles[shuttlePos.y]![shuttlePos.x] = shuttleTile();
    else tiles[exit.y]![exit.x] = exitTile();
    if (poiPos && poiKind) tiles[poiPos.y]![poiPos.x] = poiTile();
    if (roomQuest) {
      for (const step of roomQuest.steps) {
        tiles[step.pos.y]![step.pos.x] = questTile();
      }
    }
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
    npcs,
    beaconPos,
    shuttlePos,
    poiPos,
    poiKind,
    roomQuest,
    nextEntityId,
  };
}
