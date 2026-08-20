import type { SectorId } from '../../data/encounters';
import type { ShearPressureSpec } from './ShearPressure';
import type { GameState } from '../../sim/types';
import { roomAt } from '../../sim/cacheSurvey';

const REVEAL_KINDS = new Set(['quest']);

export type PressureReveal = {
  sectorId: SectorId;
  variant: number;
  urgent: boolean;
  /** Arcing flickers; Breaching holds so the path stays readable under stress. */
  visible: boolean;
  /** Overlay opacity — Breaching holds hotter than Arcing flicker. */
  alpha: number;
};

/**
 * Arcing+ stress-fracture on optional paths — presentation-only, no loot sim changes.
 * Returns crack overlay params; callers draw sector motifs instead of washing the tile tint.
 */
export function pressureRevealAt(
  st: GameState,
  shear: ShearPressureSpec,
  x: number,
  y: number,
  animFrame: number,
): PressureReveal | null {
  if (shear.state !== 'Arcing' && shear.state !== 'Breaching') return null;
  if (!st.explored[y]?.[x] || !st.visible[y]?.[x]) return null;

  const kind = st.tiles[y]?.[x]?.kind;
  const room = roomAt(st, x, y);
  const unlootedCache = room?.role === 'cache' && !room.cacheLooted;
  if (!kind) return null;
  if (!REVEAL_KINDS.has(kind) && !unlootedCache) return null;

  const urgent = shear.state === 'Breaching';
  const flicker = (animFrame + x + y) % (urgent ? 2 : 3) === 0;
  const visible = urgent || flicker;
  const alpha = unlootedCache
    ? urgent
      ? 0.96 + 0.04 * ((animFrame + x) % 2)
      : 0.88
    : urgent
      ? 0.92 + 0.08 * ((animFrame + x) % 2)
      : 0.78;

  return {
    sectorId: st.sectorId,
    variant: (x + y * 3 + st.seed) % 3,
    urgent,
    visible,
    alpha,
  };
}
