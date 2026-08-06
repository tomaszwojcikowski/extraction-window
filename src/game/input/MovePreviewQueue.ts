import type { Action, GameState } from '../../sim';

/** Queued step direction plus optional lookahead tiles along the same vector. */
export type MovePreviewQueue = {
  dx: number;
  dy: number;
  /** Tiles ahead along (dx, dy) from the player — commit always moves one step. */
  lead: number;
};

export function isWalkableTile(st: GameState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= st.width || y >= st.height) return false;
  return st.tiles[y]?.[x]?.walkable ?? false;
}

export function previewTile(
  st: GameState,
  q: MovePreviewQueue,
): { x: number; y: number } | null {
  const x = st.player.x + q.dx * q.lead;
  const y = st.player.y + q.dy * q.lead;
  if (!isWalkableTile(st, x, y)) return null;
  return { x, y };
}

/** Queue or re-aim a move preview — same vector advances lead when walkable. */
export function applyDirectionQueue(
  st: GameState,
  current: MovePreviewQueue | null,
  dx: number,
  dy: number,
): MovePreviewQueue | null {
  if (current && current.dx === dx && current.dy === dy) {
    const nextLead = current.lead + 1;
    if (isWalkableTile(st, st.player.x + dx * nextLead, st.player.y + dy * nextLead)) {
      return { dx, dy, lead: nextLead };
    }
    return current;
  }
  if (!isWalkableTile(st, st.player.x + dx, st.player.y + dy)) return null;
  return { dx, dy, lead: 1 };
}

export function toMoveAction(q: MovePreviewQueue): Action {
  return { type: 'move', dx: q.dx, dy: q.dy };
}
