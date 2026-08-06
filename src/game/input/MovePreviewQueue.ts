import type { Action, GameState } from '../../sim';

/**
 * Queued adjacent step. Preview destination always matches the one-tile commit
 * (`toMoveAction`) — no multi-tile peek lead.
 */
export type MovePreviewQueue = {
  dx: number;
  dy: number;
};

export function isWalkableTile(st: GameState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= st.width || y >= st.height) return false;
  return st.tiles[y]?.[x]?.walkable ?? false;
}

/** Destination tile for ghost + wake tells — always the one-step commit tile. */
export function previewTile(
  st: GameState,
  q: MovePreviewQueue,
): { x: number; y: number } | null {
  const x = st.player.x + q.dx;
  const y = st.player.y + q.dy;
  if (!isWalkableTile(st, x, y)) return null;
  return { x, y };
}

/**
 * Queue or re-aim a move preview.
 * Same direction re-aims the adjacent tile (no lead advance) — ghost honesty.
 */
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

/** True when preview destination equals the tile a commit would land on. */
export function previewMatchesCommit(st: GameState, q: MovePreviewQueue): boolean {
  const dest = previewTile(st, q);
  if (!dest) return false;
  return dest.x === st.player.x + q.dx && dest.y === st.player.y + q.dy;
}
