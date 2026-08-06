import { Theme } from '../../scenes/theme';
import type { ShearPressureSpec } from './ShearPressure';
import type { GameState } from '../../sim/types';

const REVEAL_KINDS = new Set(['quest', 'exit', 'poi']);

/** Arcing+ stress-fracture on optional paths — presentation-only, no loot sim changes. */
export function pressureRevealTint(
  st: GameState,
  shear: ShearPressureSpec,
  x: number,
  y: number,
  animFrame: number,
): number | null {
  if (shear.state !== 'Arcing' && shear.state !== 'Breaching') return null;
  if (!st.explored[y]?.[x] || !st.visible[y]?.[x]) return null;

  const kind = st.tiles[y]?.[x]?.kind;
  if (!kind || !REVEAL_KINDS.has(kind)) return null;
  if (kind === 'poi' && st.poiUsed) return null;

  const urgent = shear.state === 'Breaching';
  const flicker = (animFrame + x + y) % (urgent ? 2 : 3) === 0;
  if (!flicker && !urgent) return null;

  return urgent ? Theme.arcWhite : Theme.arc;
}
