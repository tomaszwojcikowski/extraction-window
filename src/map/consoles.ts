import { canReach } from '../sim/fov';
import { shuffle, type Rng } from '../sim/rng';
import type { Pos, Tile, TileKind } from '../sim/types';
import type { Room } from './rooms';

/** Some sectors get a locked terminal — independent of the room-quest roll. */
const CONSOLE_CHANCE = 0.55;

function consoleTile(): Tile {
  return { kind: 'console', walkable: true, transparent: true };
}

function keyOf(p: Pos): string {
  return `${p.x},${p.y}`;
}

function convertible(kind: TileKind): boolean {
  return kind === 'floor' || kind === 'landmark' || kind === 'rubble';
}

function pickSpot(tiles: Tile[][], room: Room, blocked: Set<string>): Pos | null {
  const centre = { x: room.cx, y: room.cy };
  const tryPos = (p: Pos): boolean => {
    if (blocked.has(keyOf(p))) return false;
    const t = tiles[p.y]?.[p.x];
    return Boolean(t && t.walkable && convertible(t.kind));
  };
  if (tryPos(centre)) return centre;
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      const p = { x, y };
      if (tryPos(p)) return p;
    }
  }
  return null;
}

/**
 * At most one locked terminal per sector. Prefers quiet rooms so the empty
 * landmark reads as a desk worth stopping at. Never overwrites quest / extract
 * furniture, and never walls the player in.
 */
export function placeLockedConsole(
  tiles: Tile[][],
  rooms: Room[],
  start: Pos,
  exit: Pos,
  reserved: Pos[],
  rng: Rng,
): Pos | null {
  if (rooms.length < 3) return null;
  if (rng() >= CONSOLE_CHANCE) return null;

  const blocked = new Set(reserved.map(keyOf));
  blocked.add(keyOf(start));
  blocked.add(keyOf(exit));

  const mid = rooms.filter((r) => r.role !== 'entry' && r.role !== 'exit');
  const ranked = [
    ...shuffle(rng, mid.filter((r) => r.role === 'quiet')),
    ...shuffle(rng, mid.filter((r) => r.role === 'cache')),
    ...shuffle(rng, mid.filter((r) => r.role === 'post')),
    ...shuffle(rng, mid),
  ];
  const seen = new Set<Room>();
  for (const room of ranked) {
    if (seen.has(room)) continue;
    seen.add(room);
    const pos = pickSpot(tiles, room, blocked);
    if (!pos) continue;
    if (!canReach(tiles, start, pos)) continue;
    tiles[pos.y]![pos.x] = consoleTile();
    return pos;
  }
  return null;
}
