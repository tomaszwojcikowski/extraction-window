import type { Action, GameState } from '../../sim';

/**
 * Optional Shift-peek aim — adjacent tile only.
 * Ghost + wake tells show here; normal WASD still commits immediately.
 */
export type MovePreviewQueue = {
  dx: number;
  dy: number;
};

export function isWalkableTile(st: GameState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= st.width || y >= st.height) return false;
  return st.tiles[y]?.[x]?.walkable ?? false;
}

/** Peek destination tile for ghost + wake tells. */
export function previewTile(
  st: GameState,
  q: MovePreviewQueue,
): { x: number; y: number } | null {
  const x = st.player.x + q.dx;
  const y = st.player.y + q.dy;
  if (!isWalkableTile(st, x, y)) return null;
  return { x, y };
}

/** Aim or re-aim a Shift-peek at an adjacent walkable tile. */
export function applyDirectionQueue(
  st: GameState,
  _current: MovePreviewQueue | null,
  dx: number,
  dy: number,
): MovePreviewQueue | null {
  if (!isWalkableTile(st, st.player.x + dx, st.player.y + dy)) return null;
  return { dx, dy };
}

export function toMoveAction(q: MovePreviewQueue): Action {
  return { type: 'move', dx: q.dx, dy: q.dy };
}

/** Peek dest always matches one-step along (dx, dy). */
export function previewMatchesCommit(st: GameState, q: MovePreviewQueue): boolean {
  const dest = previewTile(st, q);
  if (!dest) return false;
  return dest.x === st.player.x + q.dx && dest.y === st.player.y + q.dy;
}
