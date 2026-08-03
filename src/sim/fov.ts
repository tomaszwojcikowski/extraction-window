import type { Pos, Tile } from './types';

/** Base sight radius (Euclidean). */
export const FOV_RADIUS = 9;

/**
 * Recursive shadowcasting FOV (standard roguelike).
 * Mutates `visible` and marks seen tiles in `explored`.
 */
export function computeFov(
  tiles: Tile[][],
  explored: boolean[][],
  visible: boolean[][],
  ox: number,
  oy: number,
  radius = FOV_RADIUS,
): void {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      visible[y]![x] = false;
    }
  }

  visible[oy]![ox] = true;
  explored[oy]![ox] = true;

  // Mults for the 8 octants
  const octants: Array<[number, number, number, number]> = [
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [0, -1, 1, 0],
    [-1, 0, 0, 1],
    [-1, 0, 0, -1],
    [0, -1, -1, 0],
    [0, 1, -1, 0],
    [1, 0, 0, -1],
  ];

  for (const [xx, xy, yx, yy] of octants) {
    castLight(tiles, explored, visible, ox, oy, radius, 1, 1.0, 0.0, xx, xy, yx, yy, w, h);
  }
}

function castLight(
  tiles: Tile[][],
  explored: boolean[][],
  visible: boolean[][],
  ox: number,
  oy: number,
  radius: number,
  row: number,
  startSlope: number,
  endSlope: number,
  xx: number,
  xy: number,
  yx: number,
  yy: number,
  w: number,
  h: number,
): void {
  if (startSlope < endSlope) return;

  let nextStart = startSlope;
  for (let i = row; i <= radius; i++) {
    let blocked = false;
    const dy = -i;
    let dx = -i;
    while (dx <= 0) {
      const lSlope = (dx - 0.5) / (dy + 0.5);
      const rSlope = (dx + 0.5) / (dy - 0.5);

      if (startSlope < rSlope) {
        dx++;
        continue;
      }
      if (endSlope > lSlope) break;

      const sax = dx * xx + dy * xy;
      const say = dx * yx + dy * yy;
      const ax = ox + sax;
      const ay = oy + say;

      if (ax >= 0 && ay >= 0 && ax < w && ay < h) {
        const dist2 = sax * sax + say * say;
        if (dist2 <= radius * radius) {
          visible[ay]![ax] = true;
          explored[ay]![ax] = true;
        }

        if (blocked) {
          if (!tiles[ay]![ax]!.transparent) {
            nextStart = rSlope;
            dx++;
            continue;
          }
          blocked = false;
          startSlope = nextStart;
        } else if (!tiles[ay]![ax]!.transparent) {
          blocked = true;
          castLight(
            tiles,
            explored,
            visible,
            ox,
            oy,
            radius,
            i + 1,
            startSlope,
            lSlope,
            xx,
            xy,
            yx,
            yy,
            w,
            h,
          );
          nextStart = rSlope;
        }
      }
      dx++;
    }
    if (blocked) break;
  }
}

/** Euclidean distance helper for light falloff rendering. */
export function fovDistance(ox: number, oy: number, x: number, y: number): number {
  const dx = x - ox;
  const dy = y - oy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Sight radius for the current player buffs (probe / lens extend RF ranging).
 */
export function playerFovRadius(probeTurns: number, lensTurns = 0): number {
  let r = FOV_RADIUS;
  if (probeTurns > 0) r += 3;
  if (lensTurns > 0) r += 4;
  return r;
}

export function bfsPath(
  tiles: Tile[][],
  from: Pos,
  to: Pos,
  blocked: (x: number, y: number) => boolean,
): Pos[] | null {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x: number, y: number) => y * w + x;
  const prev = new Map<number, number>();
  const q: Pos[] = [from];
  const seen = new Set<number>([key(from.x, from.y)]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (q.length) {
    const cur = q.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!tiles[ny]![nx]!.walkable) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      if (blocked(nx, ny) && !(nx === to.x && ny === to.y)) continue;
      seen.add(k);
      prev.set(k, key(cur.x, cur.y));
      if (nx === to.x && ny === to.y) {
        const path: Pos[] = [{ x: nx, y: ny }];
        let ck = k;
        while (prev.has(ck)) {
          const pk = prev.get(ck)!;
          const px = pk % w;
          const py = Math.floor(pk / w);
          if (px === from.x && py === from.y) break;
          path.push({ x: px, y: py });
          ck = pk;
        }
        path.reverse();
        return path;
      }
      q.push({ x: nx, y: ny });
    }
  }
  return null;
}

export function canReach(tiles: Tile[][], from: Pos, to: Pos): boolean {
  return bfsPath(tiles, from, to, () => false) !== null;
}
