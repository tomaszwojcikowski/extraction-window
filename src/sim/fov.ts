import type { Pos, Tile } from './types';

const FOV_RADIUS = 8;

/** Diamond / shadowcast-lite FOV. Mutates `visible`. */
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

  for (let i = 0; i < 8; i++) {
    castOctant(tiles, explored, visible, ox, oy, radius, i);
  }
}

function castOctant(
  tiles: Tile[][],
  explored: boolean[][],
  visible: boolean[][],
  ox: number,
  oy: number,
  radius: number,
  octant: number,
): void {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  let start = 0;
  let end = 1;
  // Simple row sweeps per octant using slope blocking
  for (let row = 1; row <= radius; row++) {
    let blocked = false;
    let newStart = start;
    for (let col = 0; col <= row; col++) {
      const slopeStart = (col - 0.5) / row;
      const slopeEnd = (col + 0.5) / row;
      if (slopeEnd < start) continue;
      if (slopeStart > end) break;

      const [mx, my] = transform(ox, oy, col, row, octant);
      if (mx < 0 || my < 0 || mx >= w || my >= h) continue;
      const dist = Math.abs(mx - ox) + Math.abs(my - oy);
      if (dist > radius * 1.5) continue;

      visible[my]![mx] = true;
      explored[my]![mx] = true;

      const opaque = !tiles[my]![mx]!.transparent;
      if (blocked) {
        if (opaque) {
          newStart = slopeEnd;
          continue;
        }
        blocked = false;
        start = newStart;
      } else if (opaque) {
        blocked = true;
        // Recurse remaining with narrowed end — simplified: just mark and continue
        end = slopeStart;
        newStart = slopeEnd;
      }
    }
    if (blocked) break;
  }
}

function transform(
  ox: number,
  oy: number,
  col: number,
  row: number,
  octant: number,
): [number, number] {
  switch (octant) {
    case 0:
      return [ox + col, oy - row];
    case 1:
      return [ox + row, oy - col];
    case 2:
      return [ox + row, oy + col];
    case 3:
      return [ox + col, oy + row];
    case 4:
      return [ox - col, oy + row];
    case 5:
      return [ox - row, oy + col];
    case 6:
      return [ox - row, oy - col];
    default:
      return [ox - col, oy - row];
  }
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

export function canReach(
  tiles: Tile[][],
  from: Pos,
  to: Pos,
): boolean {
  return bfsPath(tiles, from, to, () => false) !== null;
}
