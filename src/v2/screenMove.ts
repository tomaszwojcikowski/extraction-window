export type ScreenIntent = 'forward' | 'back' | 'left' | 'right';

export type Cardinal = { dx: number; dy: number };

/**
 * Flattened camera look on XZ → nearest grid cardinal.
 * World +X is grid east (`dx`), world +Z is grid south (`dy`).
 */
function nz(n: number): number {
  return n === 0 ? 0 : n;
}

export function cardinalFromLook(lookX: number, lookZ: number): Cardinal {
  const len = Math.hypot(lookX, lookZ);
  if (len < 1e-6) return { dx: 0, dy: -1 };
  const quarter = Math.PI / 2;
  const snapped = Math.round(Math.atan2(lookZ, lookX) / quarter) * quarter;
  return {
    dx: nz(Math.round(Math.cos(snapped))),
    dy: nz(Math.round(Math.sin(snapped))),
  };
}

/**
 * WASD / arrows relative to the camera: W is into the screen, D is screen-right.
 * Always a single cardinal — the sim does not walk diagonals.
 */
export function moveFromScreenIntent(intent: ScreenIntent, lookX: number, lookZ: number): Cardinal {
  const forward = cardinalFromLook(lookX, lookZ);
  const right: Cardinal = { dx: nz(-forward.dy), dy: nz(forward.dx) };
  switch (intent) {
    case 'forward':
      return forward;
    case 'back':
      return { dx: nz(-forward.dx), dy: nz(-forward.dy) };
    case 'right':
      return right;
    case 'left':
      return { dx: nz(-right.dx), dy: nz(-right.dy) };
  }
}

export function screenIntentFromKey(e: KeyboardEvent): ScreenIntent | null {
  const k = e.key;
  if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'forward';
  if (k === 'ArrowDown' || k === 's' || k === 'S') return 'back';
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left';
  if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
  return null;
}

/** One cardinal step toward a clicked tile, or null if already there. */
export function stepToward(fromX: number, fromY: number, toX: number, toY: number): Cardinal | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return { dx: nz(Math.sign(dx)), dy: 0 };
  return { dx: 0, dy: nz(Math.sign(dy)) };
}
