import type { GameState } from '../../sim/types';
import { collectWakeTells, wouldNoticeEnemy } from './WakeTells';

export const PEEK_TEACH_SCRIPT = 'peek_teach';

/** Early vertical-slice window for the one-shot Shift-peek cue. */
export function peekTeachEligible(st: GameState): boolean {
  if (st.scriptedFired[PEEK_TEACH_SCRIPT]) return false;
  // Drill + first couple of shelf sectors — teach in the field, not late campaign.
  if (!st.tutorialActive && st.sectorIndex > 2) return false;
  return true;
}

/**
 * True when live wake tells are up, or a visible threat sits in notice range.
 * Presentation gate only — mirrors WakeTells honesty (incl. quiet/jammer silence).
 */
export function peekTeachThreatVisible(st: GameState): boolean {
  if (collectWakeTells(st).length > 0) return true;
  const px = st.player.x;
  const py = st.player.y;
  for (const en of st.enemies) {
    if (!en.alive) continue;
    if (!(st.visible[en.y]?.[en.x] ?? false)) continue;
    if (wouldNoticeEnemy(st, en, px, py)) return true;
  }
  return false;
}

export function shouldShowPeekTeach(st: GameState): boolean {
  return peekTeachEligible(st) && peekTeachThreatVisible(st);
}

/** Mark the one-shot teach consumed (successful peek or dismiss). */
export function markPeekTeachDone(st: GameState): void {
  st.scriptedFired[PEEK_TEACH_SCRIPT] = true;
}
