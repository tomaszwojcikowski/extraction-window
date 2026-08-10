import type { SectorDef } from '../data/encounters';
import { pick, randInt, shuffle, type Rng } from '../sim/rng';
import type { Tile } from '../sim/types';
import type { Room } from './rooms';

/**
 * How a sector is put together — the skeleton under the rooms.
 *
 * Roles made rooms different; without this, every sector is still the same
 * chain of boxes joined by L-corridors. A grammar owns placement and wiring
 * so walking into the duct and walking into the plains are different shapes,
 * not the same shape with different paint.
 */

export type LayoutKind = 'scatter' | 'spine' | 'hub' | 'lattice' | 'branch' | 'warren';

export function layoutForSector(id: SectorDef['id']): LayoutKind {
  switch (id) {
    case 'ridge':
      // Final approach is the only pure gauntlet — approach stays scatter so the
      // campaign does not end on two linear maps in a row.
      return 'spine';
    case 'beacon':
    case 'vault':
      return 'hub';
    case 'duct':
    case 'trench':
      return 'lattice';
    case 'canopy':
    case 'reef':
    case 'spire':
      return 'branch';
    case 'ruin':
    case 'ash':
    case 'fissure':
    case 'brine':
      return 'warren';
    default:
      // plains, flood, approach — open country, the familiar chain.
      return 'scatter';
  }
}

export interface LayoutResult {
  rooms: Room[];
  /** Index of the room the surveyor lands in. */
  startIndex: number;
  /** Index of the room that holds the way out. */
  endIndex: number;
}

export interface LayoutDeps {
  makeRoom: (x: number, y: number, w: number, h: number) => Room;
  carveRoom: (tiles: Tile[][], room: Room) => void;
  connect: (tiles: Tile[][], a: Room, b: Room, rng: Rng, wideChance: number) => void;
  roomSize: (rng: Rng) => { w: number; h: number };
  wideChance: number;
}

function overlaps(a: Room, b: Room, pad: number): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function tryPlace(
  rooms: Room[],
  x: number,
  y: number,
  w: number,
  h: number,
  width: number,
  height: number,
  pad: number,
  makeRoom: LayoutDeps['makeRoom'],
): Room | null {
  if (x < 1 || y < 1 || x + w >= width - 1 || y + h >= height - 1) return null;
  const room = makeRoom(x, y, w, h);
  if (rooms.some((r) => overlaps(r, room, pad))) return null;
  return room;
}

function ensureMinimum(
  rooms: Room[],
  tiles: Tile[][],
  width: number,
  height: number,
  rng: Rng,
  deps: LayoutDeps,
): void {
  if (rooms.length >= 3) return;
  for (const [rx, ry] of [
    [2, 2],
    [width - 10, 2],
    [2, height - 8],
    [width - 10, height - 8],
  ] as const) {
    if (rooms.length >= 4) break;
    const room = tryPlace(rooms, rx, ry, 6, 5, width, height, 1, deps.makeRoom);
    if (!room) continue;
    rooms.push(room);
    deps.carveRoom(tiles, room);
    if (rooms.length > 1) deps.connect(tiles, rooms[0]!, room, rng, deps.wideChance);
  }
}

function addAlcoves(
  rooms: Room[],
  tiles: Tile[][],
  width: number,
  height: number,
  rng: Rng,
  deps: LayoutDeps,
  count: number,
): void {
  for (let i = 0; i < count && rooms.length > 0; i++) {
    const parent = pick(rng, rooms);
    const ox = randInt(rng, -1, 1);
    const oy = randInt(rng, -1, 1);
    if (ox === 0 && oy === 0) continue;
    const w = randInt(rng, 3, 5);
    const h = randInt(rng, 3, 4);
    const x = parent.cx + ox * (parent.w + 1);
    const y = parent.cy + oy * (parent.h + 1);
    const alcove = tryPlace(rooms, x, y, w, h, width, height, 0, deps.makeRoom);
    if (!alcove) continue;
    rooms.push(alcove);
    deps.carveRoom(tiles, alcove);
    deps.connect(tiles, parent, alcove, rng, deps.wideChance);
  }
}

/** Random boxes, chain-wired, one loop — the original generator. */
function placeScatter(
  tiles: Tile[][],
  width: number,
  height: number,
  target: number,
  rng: Rng,
  deps: LayoutDeps,
): LayoutResult {
  const rooms: Room[] = [];
  let attempts = 0;
  while (rooms.length < target && attempts < 200) {
    attempts++;
    const { w, h } = deps.roomSize(rng);
    const x = randInt(rng, 1, width - w - 2);
    const y = randInt(rng, 1, height - h - 2);
    const room = tryPlace(rooms, x, y, w, h, width, height, 2, deps.makeRoom);
    if (!room) continue;
    rooms.push(room);
    deps.carveRoom(tiles, room);
    if (rooms.length > 1) deps.connect(tiles, rooms[rooms.length - 2]!, room, rng, deps.wideChance);
  }
  ensureMinimum(rooms, tiles, width, height, rng, deps);
  if (rooms.length >= 3) deps.connect(tiles, rooms[0]!, rooms[rooms.length - 1]!, rng, deps.wideChance);
  addAlcoves(rooms, tiles, width, height, rng, deps, randInt(rng, 1, 2));
  return { rooms, startIndex: 0, endIndex: Math.max(0, rooms.length - 1) };
}

/**
 * West → east ordered rooms, sequential wiring, no loop.
 * The run is a corridor of decisions, not a loop you can shortcut.
 */
function placeSpine(
  tiles: Tile[][],
  width: number,
  height: number,
  target: number,
  rng: Rng,
  deps: LayoutDeps,
): LayoutResult {
  const rooms: Room[] = [];
  const band = Math.max(3, Math.floor(width / (target + 1)));
  let attempts = 0;
  while (rooms.length < target && attempts < 200) {
    attempts++;
    const { w, h } = deps.roomSize(rng);
    const i = rooms.length;
    const xMin = Math.max(1, 1 + i * band - 2);
    const xMax = Math.min(width - w - 2, 1 + (i + 1) * band);
    if (xMax < xMin) continue;
    const x = randInt(rng, xMin, xMax);
    const y = randInt(rng, 2, height - h - 3);
    const room = tryPlace(rooms, x, y, w, h, width, height, 1, deps.makeRoom);
    if (!room) continue;
    rooms.push(room);
    deps.carveRoom(tiles, room);
    if (rooms.length > 1) deps.connect(tiles, rooms[rooms.length - 2]!, room, rng, deps.wideChance);
  }
  ensureMinimum(rooms, tiles, width, height, rng, deps);
  // Sort by x so start is west and exit is east even after the fallback rooms.
  rooms.sort((a, b) => a.cx - b.cx);
  // Re-wire sequentially after the sort — the fallback may have attached oddly.
  for (let i = 1; i < rooms.length; i++) {
    deps.connect(tiles, rooms[i - 1]!, rooms[i]!, rng, deps.wideChance);
  }
  // Optional pockets off the spine — nests and caches live here so the critical
  // path is not every fight in the sector. One skip link so a single blocked
  // room is not a softlock on the only route.
  addAlcoves(rooms, tiles, width, height, rng, deps, randInt(rng, 2, 3));
  if (rooms.length >= 4 && rng() < 0.45) {
    const i = randInt(rng, 0, rooms.length - 3);
    deps.connect(tiles, rooms[i]!, rooms[i + 2]!, rng, deps.wideChance);
  }
  return { rooms, startIndex: 0, endIndex: Math.max(0, rooms.length - 1) };
}

/**
 * One central room, satellites on spokes.
 * Start and exit are opposite spokes so the hub is crossed, not landed in.
 */
function placeHub(
  tiles: Tile[][],
  width: number,
  height: number,
  target: number,
  rng: Rng,
  deps: LayoutDeps,
): LayoutResult {
  const rooms: Room[] = [];
  const hubW = Math.min(10, Math.max(6, Math.floor(width / 5)));
  const hubH = Math.min(8, Math.max(5, Math.floor(height / 4)));
  const hub = deps.makeRoom(
    Math.floor(width / 2 - hubW / 2),
    Math.floor(height / 2 - hubH / 2),
    hubW,
    hubH,
  );
  rooms.push(hub);
  deps.carveRoom(tiles, hub);

  const spokes = Math.max(3, target - 1);
  const angles = shuffle(
    rng,
    Array.from({ length: spokes }, (_, i) => (i * Math.PI * 2) / spokes),
  );
  let attempts = 0;
  let ai = 0;
  while (rooms.length < spokes + 1 && attempts < 200) {
    attempts++;
    const { w, h } = deps.roomSize(rng);
    const angle = angles[ai % angles.length]!;
    ai++;
    const dist = randInt(rng, Math.floor(Math.min(width, height) / 4), Math.floor(Math.min(width, height) / 2.2));
    const x = Math.round(hub.cx + Math.cos(angle) * dist - w / 2);
    const y = Math.round(hub.cy + Math.sin(angle) * dist - h / 2);
    const room = tryPlace(rooms, x, y, w, h, width, height, 1, deps.makeRoom);
    if (!room) continue;
    rooms.push(room);
    deps.carveRoom(tiles, room);
    deps.connect(tiles, hub, room, rng, deps.wideChance);
  }
  ensureMinimum(rooms, tiles, width, height, rng, deps);
  // Pick the two spokes farthest apart on x as start and exit; hub stays mid.
  const spokesOnly = rooms.slice(1);
  if (spokesOnly.length < 2) {
    return { rooms, startIndex: 0, endIndex: Math.max(0, rooms.length - 1) };
  }
  let start = spokesOnly[0]!;
  let end = spokesOnly[0]!;
  for (const r of spokesOnly) {
    if (r.cx < start.cx) start = r;
    if (r.cx > end.cx) end = r;
  }
  if (start === end) end = spokesOnly[spokesOnly.length - 1]!;
  return {
    rooms,
    startIndex: rooms.indexOf(start),
    endIndex: rooms.indexOf(end),
  };
}

/**
 * Rooms parked on a coarse grid, wired to orthogonal neighbours.
 * Reads as ducts and service runs — right angles, not organic sprawl.
 */
function placeLattice(
  tiles: Tile[][],
  width: number,
  height: number,
  target: number,
  rng: Rng,
  deps: LayoutDeps,
): LayoutResult {
  const cols = target <= 5 ? 2 : 3;
  const rows = Math.ceil(target / cols);
  const cellW = Math.floor(width / (cols + 1));
  const cellH = Math.floor(height / (rows + 1));
  const grid: (Room | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );
  const rooms: Room[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rooms.length >= target) break;
      const { w, h } = deps.roomSize(rng);
      const x = Math.max(1, Math.min(width - w - 2, (c + 1) * cellW - Math.floor(w / 2) + randInt(rng, -1, 1)));
      const y = Math.max(1, Math.min(height - h - 2, (r + 1) * cellH - Math.floor(h / 2) + randInt(rng, -1, 1)));
      const room = tryPlace(rooms, x, y, w, h, width, height, 1, deps.makeRoom);
      if (!room) continue;
      rooms.push(room);
      grid[r]![c] = room;
      deps.carveRoom(tiles, room);
    }
  }
  ensureMinimum(rooms, tiles, width, height, rng, deps);

  // Wire each cell to its right and below neighbours.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const here = grid[r]![c];
      if (!here) continue;
      const right = grid[r]![c + 1];
      const below = grid[r + 1]?.[c];
      if (right) deps.connect(tiles, here, right, rng, deps.wideChance);
      if (below) deps.connect(tiles, here, below, rng, deps.wideChance);
    }
  }
  // Fallback: if the grid left orphans, chain them.
  for (let i = 1; i < rooms.length; i++) {
    deps.connect(tiles, rooms[i - 1]!, rooms[i]!, rng, deps.wideChance * 0.5);
  }
  addAlcoves(rooms, tiles, width, height, rng, deps, 1);
  return { rooms, startIndex: 0, endIndex: Math.max(0, rooms.length - 1) };
}

/**
 * Each new room hangs off a random existing one — a tree with dead ends.
 * One optional cross-link so it is not always a pure tree.
 */
function placeBranch(
  tiles: Tile[][],
  width: number,
  height: number,
  target: number,
  rng: Rng,
  deps: LayoutDeps,
): LayoutResult {
  const rooms: Room[] = [];
  let attempts = 0;
  while (rooms.length < target && attempts < 200) {
    attempts++;
    const { w, h } = deps.roomSize(rng);
    if (rooms.length === 0) {
      const x = randInt(rng, Math.floor(width / 3), Math.floor((width * 2) / 3) - w);
      const y = randInt(rng, Math.floor(height / 3), Math.floor((height * 2) / 3) - h);
      const room = tryPlace(rooms, x, y, w, h, width, height, 2, deps.makeRoom);
      if (!room) continue;
      rooms.push(room);
      deps.carveRoom(tiles, room);
      continue;
    }
    const parent = pick(rng, rooms);
    const ox = randInt(rng, -1, 1) || 1;
    const oy = randInt(rng, -1, 1);
    const gap = randInt(rng, 2, 5);
    const x = parent.cx + ox * (Math.floor(parent.w / 2) + gap + Math.floor(w / 2)) - Math.floor(w / 2);
    const y = parent.cy + oy * (Math.floor(parent.h / 2) + gap + Math.floor(h / 2)) - Math.floor(h / 2);
    const room = tryPlace(rooms, x, y, w, h, width, height, 2, deps.makeRoom);
    if (!room) {
      // Fall back to a free random spot attached to the parent.
      const fx = randInt(rng, 1, width - w - 2);
      const fy = randInt(rng, 1, height - h - 2);
      const fallback = tryPlace(rooms, fx, fy, w, h, width, height, 2, deps.makeRoom);
      if (!fallback) continue;
      rooms.push(fallback);
      deps.carveRoom(tiles, fallback);
      deps.connect(tiles, parent, fallback, rng, deps.wideChance);
      continue;
    }
    rooms.push(room);
    deps.carveRoom(tiles, room);
    deps.connect(tiles, parent, room, rng, deps.wideChance);
  }
  ensureMinimum(rooms, tiles, width, height, rng, deps);
  // One cross-link so a total dead-end map is rare, not the rule.
  if (rooms.length >= 4 && rng() < 0.55) {
    const a = rooms[randInt(rng, 0, rooms.length - 1)]!;
    const b = rooms[randInt(rng, 0, rooms.length - 1)]!;
    if (a !== b) deps.connect(tiles, a, b, rng, deps.wideChance);
  }
  addAlcoves(rooms, tiles, width, height, rng, deps, randInt(rng, 1, 3));
  // Start at root, exit at the farthest leaf — the tree is the journey.
  let endIndex = rooms.length - 1;
  let best = -1;
  const root = rooms[0]!;
  for (let i = 1; i < rooms.length; i++) {
    const d = Math.abs(rooms[i]!.cx - root.cx) + Math.abs(rooms[i]!.cy - root.cy);
    if (d > best) {
      best = d;
      endIndex = i;
    }
  }
  return { rooms, startIndex: 0, endIndex };
}

/**
 * Tight packing, many loops — a collapsed warren you can get turned around in.
 */
function placeWarren(
  tiles: Tile[][],
  width: number,
  height: number,
  target: number,
  rng: Rng,
  deps: LayoutDeps,
): LayoutResult {
  const rooms: Room[] = [];
  let attempts = 0;
  while (rooms.length < target && attempts < 250) {
    attempts++;
    const { w, h } = deps.roomSize(rng);
    let x: number;
    let y: number;
    if (rooms.length === 0) {
      x = randInt(rng, 1, width - w - 2);
      y = randInt(rng, 1, height - h - 2);
    } else {
      // Prefer hugging an existing room — denser than scatter.
      const parent = pick(rng, rooms);
      const ox = randInt(rng, -1, 1) || 1;
      const oy = randInt(rng, -1, 1) || (ox === 0 ? 1 : 0);
      x = parent.cx + ox * (parent.w + 1) - Math.floor(w / 2);
      y = parent.cy + oy * (parent.h + 1) - Math.floor(h / 2);
    }
    // pad=0: rooms may share a wall. That is the warren feel.
    const room = tryPlace(rooms, x, y, w, h, width, height, 0, deps.makeRoom);
    if (!room) continue;
    rooms.push(room);
    deps.carveRoom(tiles, room);
    if (rooms.length > 1) {
      // Connect to the nearest neighbour, not just the previous — loops form.
      let nearest = rooms[0]!;
      let best = Infinity;
      for (let i = 0; i < rooms.length - 1; i++) {
        const r = rooms[i]!;
        const d = Math.abs(r.cx - room.cx) + Math.abs(r.cy - room.cy);
        if (d < best) {
          best = d;
          nearest = r;
        }
      }
      deps.connect(tiles, nearest, room, rng, deps.wideChance);
    }
  }
  ensureMinimum(rooms, tiles, width, height, rng, deps);
  // Extra loops: one guaranteed ring plus at most one more — denser than
  // scatter, not a maze that bills the Window for every wrong turn.
  if (rooms.length >= 3) {
    deps.connect(tiles, rooms[0]!, rooms[rooms.length - 1]!, rng, deps.wideChance);
    if (rooms.length >= 5 && rng() < 0.5) {
      const a = rooms[randInt(rng, 0, rooms.length - 1)]!;
      const b = rooms[randInt(rng, 0, rooms.length - 1)]!;
      if (a !== b) deps.connect(tiles, a, b, rng, deps.wideChance);
    }
  }
  addAlcoves(rooms, tiles, width, height, rng, deps, randInt(rng, 1, 2));
  return { rooms, startIndex: 0, endIndex: Math.max(0, rooms.length - 1) };
}

export function placeLayout(
  kind: LayoutKind,
  tiles: Tile[][],
  width: number,
  height: number,
  target: number,
  rng: Rng,
  deps: LayoutDeps,
): LayoutResult {
  switch (kind) {
    case 'spine':
      return placeSpine(tiles, width, height, target, rng, deps);
    case 'hub':
      return placeHub(tiles, width, height, target, rng, deps);
    case 'lattice':
      return placeLattice(tiles, width, height, target, rng, deps);
    case 'branch':
      return placeBranch(tiles, width, height, target, rng, deps);
    case 'warren':
      return placeWarren(tiles, width, height, target, rng, deps);
    case 'scatter':
    default:
      return placeScatter(tiles, width, height, target, rng, deps);
  }
}
