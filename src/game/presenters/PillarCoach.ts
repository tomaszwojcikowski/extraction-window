import type { LoreId } from '../../data/lore';
import { flankPenalty } from '../../sim/combat';
import type { GameState } from '../../sim/types';
import { peekTeachEligible } from './PeekTeach';

function once(state: GameState, id: string): boolean {
  if (state.scriptedFired[id]) return false;
  state.scriptedFired[id] = true;
  return true;
}

/**
 * One-shot brace/shove tip on first adjacent hostile after the Shift-peek
 * window — drill already teaches b/f via UI-TUT-FIGHT.
 */
export function braceShoveCoachHint(st: GameState): LoreId | null {
  if (st.tutorialActive) return null;
  // Peek tip owns early first-contact; flank tip owns encirclement.
  if (peekTeachEligible(st)) return null;
  if (flankPenalty(st) > 0) return null;
  const adjacent = st.enemies.some(
    (e) =>
      e.alive && Math.abs(e.x - st.player.x) + Math.abs(e.y - st.player.y) === 1,
  );
  if (adjacent && once(st, 'teach_brace_shove')) {
    return 'UI-HINT-BRACE-SHOVE';
  }
  return null;
}

/**
 * One-shot pillar coaching for the early shelf — dual clocks, extract spine,
 * flank. Call only when the hint line is free of combat / tile urgency
 * (DESIGN_PRINCIPLES §4: teach at the moment of need).
 *
 * Clocks / extract fire only after the drill bay (`tut_welcome`) so harness
 * runs and peek-teach tests are not stomped.
 */
export function pillarCoachHint(st: GameState): LoreId | null {
  if (st.tutorialActive) return null;

  if (flankPenalty(st) > 0 && once(st, 'teach_flank')) {
    return 'UI-HINT-FLANK';
  }

  if (!st.scriptedFired.tut_welcome) return null;

  // Window + Bus go live the moment the drill hatch closes.
  if (st.sectorIndex === 0 && st.turn <= 4 && once(st, 'teach_clocks')) {
    return 'UI-HINT-CLOCKS';
  }

  // Causal extract — before the Key sector, so the objective strip has a story.
  if (
    st.sectorIndex <= 2 &&
    st.turn >= 1 &&
    !st.objectives.hasRelayKey &&
    once(st, 'teach_extract')
  ) {
    return 'UI-HINT-EXTRACT';
  }

  return null;
}
