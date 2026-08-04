import type { Action } from '../../sim';

/** Overlay / mute chrome keys handled before gameplay actions. */
export type ChromeKey =
  | { kind: 'mute' }
  | { kind: 'toggle_help' }
  | { kind: 'toggle_pages' };

/**
 * Map a keydown to mute / help / PADD chrome — null if not a chrome key.
 * Slot select (1–9) and skill forks stay in the scene (order depends on skillPick).
 */
export function chromeFromKey(e: KeyboardEvent): ChromeKey | null {
  if (e.key === 'm' || e.key === 'M') return { kind: 'mute' };
  if (e.key === '?' || (e.key === '/' && e.shiftKey)) return { kind: 'toggle_help' };
  if (e.key === 'p' || e.key === 'P') return { kind: 'toggle_pages' };
  return null;
}

/** Inventory slot index 0–8 from digit keys 1–9, else null. */
export function slotIndexFromKey(e: KeyboardEvent): number | null {
  if (e.key >= '1' && e.key <= '9') return parseInt(e.key, 10) - 1;
  return null;
}

/** True when Escape / Enter / ? should dismiss an open help overlay. */
export function isHelpDismissKey(e: KeyboardEvent): boolean {
  return e.key === 'Escape' || e.key === '?' || e.key === 'Enter';
}

/** True when Escape / p / Enter should dismiss an open PADD overlay. */
export function isPagesDismissKey(e: KeyboardEvent): boolean {
  return e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === 'Enter';
}

/**
 * Pure gameplay action from key — inventory, tactics, use, get, wait, exit, move.
 * Returns null for unmapped keys. Escape → close_ui (caller opens help when kit is closed).
 */
export function actionFromKey(e: KeyboardEvent): Action | null {
  const k = e.key;
  if (k === 'Escape') return { type: 'close_ui' };
  if (k === 'i' || k === 'I') return { type: 'toggle_inventory' };
  if (k === 'u' || k === 'U') return { type: 'use' };
  if (k === 'b' || k === 'B') return { type: 'brace' };
  if (k === 'r' || k === 'R') return { type: 'retreat' };
  if (k === 'g' || k === 'G') return { type: 'get' };
  if (k === '.' && !e.shiftKey) return { type: 'wait' };
  // Hatch / interact — `>` needs Shift on many layouts; `=` / Enter / Space are reliable.
  if (
    k === '>' ||
    k === '=' ||
    k === 'Enter' ||
    k === 'NumpadEnter' ||
    k === ' ' ||
    e.code === 'Enter' ||
    e.code === 'NumpadEnter' ||
    e.code === 'Space' ||
    e.code === 'Equal' ||
    (e.code === 'Period' && e.shiftKey) ||
    (e.code === 'Comma' && e.shiftKey && k === '>')
  ) {
    return { type: 'exit' };
  }
  if (k === 'ArrowUp' || k === 'w' || k === 'W') return { type: 'move', dx: 0, dy: -1 };
  if (k === 'ArrowDown' || k === 's' || k === 'S') return { type: 'move', dx: 0, dy: 1 };
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') return { type: 'move', dx: -1, dy: 0 };
  if (k === 'ArrowRight' || k === 'd' || k === 'D') return { type: 'move', dx: 1, dy: 0 };
  return null;
}

/** Actions that may be buffered one-deep while move tweens run. */
export function isQueueableAction(action: Action): boolean {
  return (
    action.type === 'move' ||
    action.type === 'wait' ||
    action.type === 'get' ||
    action.type === 'use' ||
    action.type === 'brace' ||
    action.type === 'retreat' ||
    action.type === 'exit' ||
    action.type === 'aim'
  );
}
