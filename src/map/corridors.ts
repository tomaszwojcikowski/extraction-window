import type { Pos, Tile, TileKind } from '../sim/types';
import type { Room } from './rooms';

/** Structural tiles that may sit on a door without being dressing. */
const KEEP_ON_CORRIDOR: ReadonlySet<TileKind> = new Set([
  'exit',
  'beacon',
  'shuttle',
  'quest',
  'console',
]);

function inRoom(room: Room, x: number, y: number): boolean {
  return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
}

const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function roomAt(rooms: Room[], x: number, y: number): Room | undefined {
  return rooms.find((r) => inRoom(r, x, y));
}

/** Walkable tile carved between rooms — the hall itself. */
export function isHallwayTile(tiles: Tile[][], rooms: Room[], x: number, y: number): boolean {
  if (!tiles[y]?.[x]?.walkable) return false;
  return !roomAt(rooms, x, y);
}

/** Room-edge tile that opens onto a hall. */
export function isDoorwayTile(tiles: Tile[][], room: Room, x: number, y: number): boolean {
  if (!inRoom(room, x, y)) return false;
  if (!tiles[y]?.[x]?.walkable) return false;
  for (const [dx, dy] of ORTHO) {
    const nx = x + dx;
    const ny = y + dy;
    if (!tiles[ny]?.[nx]?.walkable) continue;
    if (!inRoom(room, nx, ny)) return true;
  }
  return false;
}

/**
 * Circulation space: halls between rooms, and the door tiles that feed them.
 * Events, dressing, and packs stay in rooms so a corridor is never the fight.
 */
export function isCorridorCell(tiles: Tile[][], rooms: Room[], x: number, y: number): boolean {
  if (isHallwayTile(tiles, rooms, x, y)) return true;
  const room = roomAt(rooms, x, y);
  return room ? isDoorwayTile(tiles, room, x, y) : false;
}

export function corridorCells(tiles: Tile[][], rooms: Room[]): Pos[] {
  const out: Pos[] = [];
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y]!.length; x++) {
      if (isCorridorCell(tiles, rooms, x, y)) out.push({ x, y });
    }
  }
  return out;
}

/**
 * After halls are finished, strip biome dressing from circulation space.
 *
 * Dressing runs before some `connect()` repairs, so a tile can be painted
 * while it still looks like room interior and only later become a doorway.
 */
export function clearCorridorDressing(tiles: Tile[][], rooms: Room[], reserved: Pos[] = []): void {
  const keep = new Set(reserved.map((p) => `${p.x},${p.y}`));
  for (const { x, y } of corridorCells(tiles, rooms)) {
    if (keep.has(`${x},${y}`)) continue;
    const tile = tiles[y]![x]!;
    if (!tile.walkable) continue;
    if (KEEP_ON_CORRIDOR.has(tile.kind)) continue;
    if (tile.kind === 'floor') continue;
    tiles[y]![x] = { kind: 'floor', walkable: true, transparent: true };
  }
}
