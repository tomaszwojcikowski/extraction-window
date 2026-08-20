import type { SectorId } from '../../data/encounters';
import type { ShearPressureSpec } from './ShearPressure';
import type { GameState } from '../../sim/types';
import { roomAt } from '../../sim/cacheSurvey';

/** Quest sites fracture; landmarks (ex-POI) stay silent by policy. */
const REVEAL_KINDS = new Set(['quest']);

export type PressureRevealMotif = 'quest' | 'cache';

export type PressureReveal = {
  sectorId: SectorId;
  variant: number;
  urgent: boolean;
  motif: PressureRevealMotif;
  /** Arcing flickers; Breaching holds so the path stays readable under stress. */
  visible: boolean;
  /** Overlay opacity — Breaching holds hotter than Arcing flicker. */
  alpha: number;
};

/**
 * Arcing+ stress-fracture on optional paths — presentation-only, no loot sim changes.
 * Quest vs unlooted cache use different motif/variant so detour reads apart from hold.
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

  const motif: PressureRevealMotif = unlootedCache ? 'cache' : 'quest';
  const urgent = shear.state === 'Breaching';
  // Cache: slower flicker (pocket you hunt). Quest: faster hold-corridor pulse.
  const flickerMod = motif === 'cache' ? (urgent ? 3 : 4) : urgent ? 2 : 3;
  const flicker = (animFrame + x + y) % flickerMod === 0;
  const visible = urgent || flicker;
  const alpha =
    motif === 'cache'
      ? urgent
        ? 0.96 + 0.04 * ((animFrame + x) % 2)
        : 0.88
      : urgent
        ? 0.92 + 0.08 * ((animFrame + x) % 2)
        : 0.78;

  // Cache offsets variant so crack texture family differs from quest sites.
  const baseVariant = (x + y * 3 + st.seed) % 3;
  const variant = motif === 'cache' ? (baseVariant + 1) % 3 : baseVariant;

  return {
    sectorId: st.sectorId,
    variant,
    urgent,
    motif,
    visible,
    alpha,
  };
}
