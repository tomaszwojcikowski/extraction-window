import type { SectorId } from '../data/encounters';
import { LIGHT_TEMP } from '../sim/light';
import { mulberry32, randInt, shuffle, type Rng } from '../sim/rng';
import type { FieldLightSource, Pos, RoomRole, Tile } from '../sim/types';
import type { Room } from './rooms';

const CARD: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
];

/** Roles that should stay dark — ambush / quiet landmark identity. */
const DARK_ROLES: ReadonlySet<RoomRole> = new Set([
  'nest',
  'thicket',
  'quiet',
  'hazard',
]);

function roleAt(rooms: Room[], x: number, y: number): RoomRole | null {
  for (const r of rooms) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.role ?? null;
  }
  return null;
}

function budget(sectorId: SectorId, rng: Rng): number {
  switch (sectorId) {
    case 'duct':
    case 'trench':
    case 'approach':
    case 'ash':
    case 'fissure':
      return randInt(rng, 2, 4);
    case 'vault':
    case 'beacon':
    case 'spire':
    case 'plains':
    case 'ridge':
      return randInt(rng, 5, 9);
    default:
      return randInt(rng, 3, 6);
  }
}

function sconceColor(sectorId: SectorId): number {
  switch (sectorId) {
    case 'duct':
    case 'reef':
    case 'brine':
      return LIGHT_TEMP.sconceCool;
    default:
      return LIGHT_TEMP.sconce;
  }
}

/** Prefer south-facing floor (reads under the lamp), else any open side. */
function facingFloor(
  tiles: Tile[][],
  wx: number,
  wy: number,
): Pos | null {
  for (const [dx, dy] of CARD) {
    const nx = wx + dx;
    const ny = wy + dy;
    if (tiles[ny]?.[nx]?.walkable) return { x: nx, y: ny };
  }
  return null;
}

/**
 * Mount permanent lamps on wall faces that look onto open floor.
 * The fixture is bolted to the wall (`mountX/Y`); emission sits on the facing
 * floor so flood + bloom actually light the corridor (a wall-cell origin
 * wasted almost all energy one step away).
 */
export function placeWallLights(
  tiles: Tile[][],
  rooms: Room[],
  sectorId: SectorId,
  rng: Rng,
  avoid: Pos[] = [],
): FieldLightSource[] {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const want = budget(sectorId, rng);
  const color = sconceColor(sectorId);
  const avoidSet = new Set(avoid.map((p) => `${p.x},${p.y}`));

  type Cand = { wx: number; wy: number; fx: number; fy: number; score: number };
  const cands: Cand[] = [];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tiles[y]![x]!.kind !== 'wall') continue;
      if (avoidSet.has(`${x},${y}`)) continue;

      let floorNeigh = 0;
      let darkFacing = false;
      let corridorFacing = false;
      let face: Pos | null = null;
      for (const [dx, dy] of CARD) {
        const nx = x + dx;
        const ny = y + dy;
        const t = tiles[ny]?.[nx];
        if (!t?.walkable) continue;
        floorNeigh++;
        if (!face) face = { x: nx, y: ny };
        const role = roleAt(rooms, nx, ny);
        if (role && DARK_ROLES.has(role)) darkFacing = true;
        if (role === null || role === 'entry' || role === 'exit' || role === 'post') {
          corridorFacing = true;
        }
      }
      // Mount on a wall face (1–2 open sides), not a freestanding pillar or buried cell.
      if (floorNeigh < 1 || floorNeigh > 2 || !face) continue;
      if (darkFacing) continue;
      if (avoidSet.has(`${face.x},${face.y}`)) continue;

      cands.push({
        wx: x,
        wy: y,
        fx: face.x,
        fy: face.y,
        score: (corridorFacing ? 3 : 1) + (floorNeigh === 1 ? 1 : 0) + rng() * 0.5,
      });
    }
  }

  cands.sort((a, b) => b.score - a.score);
  const ordered = shuffle(rng, cands.slice(0, Math.min(cands.length, want * 4)));
  const placed: FieldLightSource[] = [];
  const minDist = 4;
  const usedFloors = new Set<string>();
  const usedMounts = new Set<string>();

  for (const c of ordered) {
    if (placed.length >= want) break;
    const floorKey = `${c.fx},${c.fy}`;
    const mountKey = `${c.wx},${c.wy}`;
    if (usedFloors.has(floorKey) || usedMounts.has(mountKey)) continue;
    if (placed.some((p) => Math.hypot(p.x - c.fx, p.y - c.fy) < minDist)) continue;

    usedFloors.add(floorKey);
    usedMounts.add(mountKey);
    placed.push({
      x: c.fx,
      y: c.fy,
      mountX: c.wx,
      mountY: c.wy,
      // Weaker than an exit hatch, strong enough to read as a real pool.
      radius: 2.5,
      intensity: 0.55,
      color,
      fixture: 'sconce',
    });
  }

  return placed;
}

/** Deterministic helper for tests — fixed RNG stream. */
export function placeWallLightsSeeded(
  tiles: Tile[][],
  rooms: Room[],
  sectorId: SectorId,
  seed: number,
  avoid: Pos[] = [],
): FieldLightSource[] {
  return placeWallLights(tiles, rooms, sectorId, mulberry32(seed >>> 0), avoid);
}

export { facingFloor };
