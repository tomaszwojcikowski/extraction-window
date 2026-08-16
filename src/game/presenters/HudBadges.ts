import type { GameState } from '../../sim';
import { inShadow, isLit } from '../../sim/light';

/** Match the HUD's light readout to the shadow rule used by ambush AI. */
export function stanceBadgeLabel(st: GameState): 'SHADOW' | 'LIT' | null {
  if (inShadow(st, st.player.x, st.player.y)) return 'SHADOW';
  if (isLit(st, st.player.x, st.player.y)) return 'LIT';
  return null;
}
