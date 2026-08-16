import type { LoreId } from '../../data/lore';
import type { GameState } from '../../sim/types';
import { collectWakeTells, wouldNoticeEnemy } from './WakeTells';

export const PEEK_TEACH_SCRIPT = 'peek_teach';

/**
 * Coaching that must beat the one-shot Shift-peek tip — drill stalker / fight,
 * telegraphs, vitals, and tile interactions own the hint line first.
 */
const PEEK_TEACH_YIELDS_TO: ReadonlySet<LoreId> = new Set([
  'UI-HINT-SKILL',
  'UI-HINT-AIM',
  'UI-HINT-TELE',
  'UI-HINT-TELE-REACH',
  'UI-HINT-TELE-OVERWATCH',
  'UI-HINT-TELE-BEAM',
  'UI-HINT-TELE-ZONE',
  'UI-HINT-BEACON-NEED-KEY',
  'UI-HINT-ITEM-FULL',
  'UI-HINT-LIGHT',
  'UI-TUT-STALKER',
  'UI-TUT-FIGHT',
  'UI-TUT-KIT',
  'UI-TUT-GOTO-HATCH',
  'UI-TUT-EXIT',
  'UI-TUT-HAZARD',
  'UI-TUT-WAKE',
  'UI-TUT-LIGHT',
  'UI-HINT-USE-MED',
  'UI-HINT-USE-ENERGY',
  'UI-HINT-USE-ARMOR',
  'UI-HINT-USE-PATCH',
  'UI-HINT-USE-SEALANT',
  'UI-HINT-FLARE',
  'UI-HINT-ION-FRONT',
  'UI-HINT-EXIT',
  'UI-HINT-EXIT-NEED-KEY',
  'UI-HINT-EXIT-NEED-CORE',
  'UI-HINT-EXIT-NEED-BEACON',
  'UI-HINT-BEACON',
  'UI-HINT-HANDSHAKE',
  'UI-HINT-SHUTTLE',
  'UI-HINT-UPLINK-HOLD',
  'UI-HINT-DESYNC',
  'UI-HINT-ITEM',
  'UI-HINT-QUEST',
  'UI-HINT-NPC',
  'UI-HINT-BRAND',
  'UI-HINT-SEALED',
  'UI-HINT-SEALED-SEALANT',
  'UI-HINT-PRY-SEALED',
  'UI-HINT-ALLY-DRONE',
  'UI-HINT-ALLY-ESCORT',
  'UI-HINT-PREFER-DARK',
  'UI-HINT-PREFER-LIT',
  'UI-HINT-CLOCKS',
  'UI-HINT-EXTRACT',
  'UI-HINT-FLANK',
  'UI-HINT-EQUIP',
  'UI-HINT-COMMIT',
]);

/** Early vertical-slice window for the one-shot Shift-peek cue. */
export function peekTeachEligible(st: GameState): boolean {
  if (st.scriptedFired[PEEK_TEACH_SCRIPT]) return false;
  // Drill + first couple of shelf sectors — teach in the field, not late campaign.
  if (!st.tutorialActive && st.sectorIndex > 2) return false;
  return true;
}

/**
 * True when live wake tells are up, or a visible threat sits in notice range.
 * Presentation gate only — mirrors WakeTells honesty.
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

export function peekTeachBlockedBy(coaching: LoreId | null): boolean {
  if (!coaching) return false;
  return PEEK_TEACH_YIELDS_TO.has(coaching);
}

export function shouldShowPeekTeach(st: GameState, coaching: LoreId | null = null): boolean {
  if (!peekTeachEligible(st) || !peekTeachThreatVisible(st)) return false;
  if (peekTeachBlockedBy(coaching)) return false;
  return true;
}

/** Mark the one-shot teach consumed (successful peek or dismiss). */
export function markPeekTeachDone(st: GameState): void {
  st.scriptedFired[PEEK_TEACH_SCRIPT] = true;
}
