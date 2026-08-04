import type { GameState } from '../../sim';
import { inShadow, isLit } from '../../sim/light';
import { isQuietStance } from '../../sim/mechanics/quietStance';

/** Match the HUD's light readout to the shadow rule used by ambush AI. */
export function stanceBadgeLabel(st: GameState): 'QUIET' | 'SHADOW' | 'LIT' | null {
  if (isQuietStance(st)) return 'QUIET';
  if (inShadow(st, st.player.x, st.player.y)) return 'SHADOW';
  if (isLit(st, st.player.x, st.player.y)) return 'LIT';
  return null;
}
