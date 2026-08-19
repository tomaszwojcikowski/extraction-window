import type { LoreId } from '../../data/lore';
import { lore } from '../../data/lore';
import type { GameState } from '../../sim';

/** Log ids that mean a kit `u` action failed — surface inline in the kit panel. */
export const KIT_USE_FAIL_LORE: ReadonlySet<LoreId> = new Set([
  'LOG-USE-FAIL',
  'LOG-USE-EMPTY',
  'LOG-JAM-BLOCK',
  'LOG-USE-QUEST',
  'LOG-DOWNED-ACT',
  'LOG-USE-NO-POWER',
]);

/** Most recent kit-use failure message for the overlay footer, if any. */
export function kitUseFeedback(st: GameState): string | null {
  const last = st.log[st.log.length - 1];
  if (!last || !KIT_USE_FAIL_LORE.has(last.loreId)) return null;
  return lore(last.loreId);
}

/** True when the latest log line after `u` is a kit failure tell. */
export function isKitUseFailure(st: GameState, logLenBefore: number): boolean {
  if (st.log.length <= logLenBefore) return false;
  return KIT_USE_FAIL_LORE.has(st.log[st.log.length - 1]!.loreId);
}
