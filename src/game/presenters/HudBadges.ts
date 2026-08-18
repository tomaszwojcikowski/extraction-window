import type { GameState } from '../../sim';
import { inShadow, isLit } from '../../sim/light';
import { Theme } from '../../scenes/theme';

/** Match the HUD's light readout to the shadow rule used by ambush AI. */
export function stanceBadgeLabel(st: GameState): 'SHADOW' | 'LIT' | null {
  if (inShadow(st, st.player.x, st.player.y)) return 'SHADOW';
  if (isLit(st, st.player.x, st.player.y)) return 'LIT';
  return null;
}

export function lightBadgeSpec(st: GameState): { label: string; fill: number } | null {
  const label = stanceBadgeLabel(st);
  if (label === 'SHADOW') return { label, fill: Theme.flag };
  if (label === 'LIT') return { label, fill: Theme.tape };
  return null;
}
