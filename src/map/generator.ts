import type { SectorDef } from '../data/encounters';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import {
  enemyCountBonus,
  scaleEnemyCombat,
} from '../data/difficulty';
import type { ItemKind } from '../data/items';
import type {
  Enemy,
  EnemyTier,
  FieldNpc,
  FieldLightSource,
  GroundItem,
  Pos,
  RoomQuest,
  RoomRole,
  Tile,
} from '../sim/types';
import { npcKindForSector } from '../data/npcs';
import { canReach } from '../sim/fov';
import { mulberry32, pick, randInt, shuffle, type Rng } from '../sim/rng';
import {
  buildVentSealQuest,
  buildSingleRoomQuest,
  isMultiSiteKind,
  pickRoomQuestKind,
} from '../sim/roomQuest';
import { layoutForSector, placeLayout } from './layout';
import {
  assignRoomRoles,
  dressRoomRoles,
  fillOrder,
  holderKind,
  planHostiles,
  planLoot,
  type Room,
} from './rooms';
import { placeWallLights } from './wallLights';

export type { Room } from './rooms';

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
  roomQuest: RoomQuest | null;
  nextEntityId: number;
  /** Permanent wall fixtures seeded into `state.lightSources`. */
  wallLights: FieldLightSource[];
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
function landmarkTile(): Tile {
  return { kind: 'landmark', walkable: true, transparent: true };
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
    firstContactBite: true,
    swellTurns: 0,
    homeX: p.x,
    homeY: p.y,
    skirmishRetreat: false,
    windup: 0,
    beamCooldown: 0,
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
  const contains = (room: Room, p: Pos): boolean =>
    p.x >= room.x && p.x < room.x + room.w && p.y >= room.y && p.y < room.y + room.h;
  const mid = rooms.filter((r) => !contains(r, start) && !contains(r, exit));
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

/**
 * Where a crowned hostile should be found, best first.
 *
 * Order is the honesty rule: put the sector's hardest fight in a room the
 * player already had a reason to read, and never in one that promised nothing.
 */
const TIER_ROOM_ORDER: RoomRole[] = ['nest', 'post', 'collapse', 'thicket', 'hazard', 'cache'];

/**
 * Free a slot in a room about to receive a crowned hostile, so the room's
 * hostile count stays close to what the sector budgeted.
 *
 * Only a full pack is thinned. A crown on top of three bodies measured as a
 * difficulty spike; taking one off every crowned room measured as a sector-wide
 * discount. Two bodies and a leader is the fight this is trying to build.
 */
function promoteWithinPack(enemies: Enemy[], room: Room): void {
  const inside = enemies.filter(
    (e) =>
      e.tier === 'normal' &&
      e.x >= room.x &&
      e.x < room.x + room.w &&
      e.y >= room.y &&
      e.y < room.y + room.h,
  );
  if (inside.length < 3) return;
  const drop = enemies.indexOf(inside[inside.length - 1]!);
  if (drop >= 0) enemies.splice(drop, 1);
}

function byRolePreference(pool: Room[]): Room[] {
  const rank = (room: Room): number => {
    const at = TIER_ROOM_ORDER.indexOf(room.role);
    return at === -1 ? TIER_ROOM_ORDER.length : at;
  };
  return [...pool].sort((a, b) => rank(a) - rank(b));
}

/** Rooms are born roleless; `assignRoomRoles` decides once they are all placed. */
function makeRoom(x: number, y: number, w: number, h: number): Room {
  return { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), role: 'quiet' };
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

  const wideChance = corridorWideChance(sector.id);
  const targetRooms = randInt(rng, sector.roomCount[0], sector.roomCount[1]);
  const layout = placeLayout(layoutForSector(sector.id), tiles, width, height, targetRooms, rng, {
    makeRoom,
    carveRoom,
    connect,
    roomSize: (r) => roomSizeForBiome(sector.id, r),
    wideChance,
  });
  const rooms = layout.rooms;

  dressBiomeTerrain(tiles, rooms, sector, rng);

  const startRoom = rooms[layout.startIndex] ?? rooms[0]!;
  const endRoom = rooms[layout.endIndex] ?? rooms[rooms.length - 1]!;
  const start: Pos = { x: startRoom.cx, y: startRoom.cy };
  let exit: Pos = { x: endRoom.cx, y: endRoom.cy };
  if (exit.x === start.x && exit.y === start.y && rooms.length > 1) {
    const other = rooms.find((r) => r !== startRoom) ?? rooms[1]!;
    exit = { x: other.cx, y: other.cy };
  }

  const kind = layoutForSector(sector.id);
  const crossing = kind === 'hub' ? rooms[0] : undefined;
  assignRoomRoles(rooms, sector, rng, startRoom, endRoom, crossing);
  dressRoomRoles(tiles, rooms, sector, rng, [start, exit]);

  let beaconPos: Pos | null = null;
  let shuttlePos: Pos | null = null;
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
    const midRooms = rooms.filter((r) => r !== startRoom && r !== endRoom);
    const candidates = midRooms.length >= 1 ? midRooms : rooms.filter((r) => r !== startRoom);
    const kind = pickRoomQuestKind(rng);

    if (isMultiSiteKind(kind) && candidates.length >= 2) {
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
        // Site A has to be a vent — that is what the sealant is for.
        let aPos = { x: aRoom.cx, y: aRoom.cy };
        let vented: Pos | null = null;
        for (let y = aRoom.y; y < aRoom.y + aRoom.h && !vented; y++) {
          for (let x = aRoom.x; x < aRoom.x + aRoom.w; x++) {
            if (tiles[y]?.[x]?.kind === 'vent') {
              vented = { x, y };
              break;
            }
          }
        }
        if (vented) aPos = vented;
        else tiles[aPos.y]![aPos.x] = vent();
        const bPos = { x: bRoom.cx, y: bRoom.cy };
        tiles[aPos.y]![aPos.x] = questTile();
        tiles[bPos.y]![bPos.x] = questTile();
        specials.push(aPos, bPos);
        roomQuest = buildVentSealQuest([
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
  const occ = () => occupiedSet(enemies, items, start, specials, npcs);
  /** A tile is spendable if it is free, reachable, and not the quest furniture. */
  const openIn = (room: Room, minStartDist = 0): Pos[] =>
    fillOrder(room, tiles, rng).filter((p) => {
      if (occ().has(`${p.x},${p.y}`)) return false;
      if (Math.abs(p.x - start.x) + Math.abs(p.y - start.y) < minStartDist) return false;
      if (roomQuest?.steps.some((s) => s.pos.x === p.x && s.pos.y === p.y)) return false;
      return canReach(tiles, start, p);
    });

  // Loot lives where the room says it lives — caches hold piles, hazard rooms
  // hold bait, and a quiet room is quiet in both directions.
  const lootN = randInt(rng, sector.lootCount[0], sector.lootCount[1]);
  for (const fill of planLoot(rooms, lootN, rng)) {
    const spots = openIn(fill.room);
    for (let i = 0; i < fill.count && i < spots.length; i++) {
      const kind = pick(rng, sector.lootTable);
      items.push({ id: nextEntityId++, kind, x: spots[i]!.x, y: spots[i]!.y });
    }
  }

  // Hostiles the same way. A pack in one room and nothing in the next reads as
  // a decision; the same count smeared evenly reads as weather.
  const enemyN =
    randInt(rng, sector.enemyCount[0], sector.enemyCount[1]) +
    enemyCountBonus(playerLevel);
  for (const fill of planHostiles(rooms, enemyN, rng)) {
    const spots = openIn(fill.room, 5);
    for (let i = 0; i < fill.count && i < spots.length; i++) {
      const kind =
        fill.room.role === 'post' ? holderKind(sector.enemyTable, rng) : pick(rng, sector.enemyTable);
      enemies.push(
        makeEnemy(nextEntityId++, kind, spots[i]!, sector.index, 'normal', playerLevel),
      );
    }
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
    // A crowned hostile belongs with the pack it is crowning, so the room the
    // player was already wary of becomes the set piece — and a quiet room stays
    // honestly quiet instead of hiding the sector's hardest fight.
    const pool = byRolePreference(eliteRooms.length ? eliteRooms : midRooms);
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
      // The crown leads the pack rather than arriving on top of it. Without
      // this the crowned nest is the room's whole budget plus an elite, which
      // measured as a difficulty spike rather than a set piece.
      promoteWithinPack(enemies, room);
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
      for (const r of byRolePreference(shuffle(rng, mid))) {
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
    if (roomQuest) {
      for (const step of roomQuest.steps) {
        tiles[step.pos.y]![step.pos.x] = questTile();
      }
    }
  }
  for (const it of items) {
    if ((it.kind === 'relay_key' || it.kind === 'nav_core') && !canReach(tiles, start, it)) {
      connect(tiles, startRoom, makeRoom(it.x, it.y, 1, 1), rng);
    }
  }

  const wallLights = placeWallLights(tiles, rooms, sector.id, rng, [
    start,
    exit,
    ...specials,
  ]);

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
    roomQuest,
    nextEntityId,
    wallLights,
  };
}
