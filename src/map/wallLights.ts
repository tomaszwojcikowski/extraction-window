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

/**
 * Mount weak permanent lamps on wall cells that face open floor.
 * Emitters sit on the wall so flood lights the facing corridor without
 * stealing walkable tiles — and ambush rooms stay dark by role.
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

  type Cand = { x: number; y: number; score: number };
  const cands: Cand[] = [];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tiles[y]![x]!.kind !== 'wall') continue;
      if (avoidSet.has(`${x},${y}`)) continue;

      let floorNeigh = 0;
      let darkFacing = false;
      let corridorFacing = false;
      for (const [dx, dy] of CARD) {
        const nx = x + dx;
        const ny = y + dy;
        const t = tiles[ny]?.[nx];
        if (!t?.walkable) continue;
        floorNeigh++;
        const role = roleAt(rooms, nx, ny);
        if (role && DARK_ROLES.has(role)) darkFacing = true;
        if (role === null || role === 'entry' || role === 'exit' || role === 'post') {
          corridorFacing = true;
        }
      }
      // Mount on a wall face (1–2 open sides), not a freestanding pillar or buried cell.
      if (floorNeigh < 1 || floorNeigh > 2) continue;
      if (darkFacing) continue;

      cands.push({
        x,
        y,
        score: (corridorFacing ? 3 : 1) + (floorNeigh === 1 ? 1 : 0) + rng() * 0.5,
      });
    }
  }

  cands.sort((a, b) => b.score - a.score);
  const ordered = shuffle(rng, cands.slice(0, Math.min(cands.length, want * 4)));
  const placed: FieldLightSource[] = [];
  const minDist = 4;

  for (const c of ordered) {
    if (placed.length >= want) break;
    if (
      placed.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < minDist)
    ) {
      continue;
    }
    placed.push({
      x: c.x,
      y: c.y,
      radius: 2.1,
      intensity: 0.4,
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
