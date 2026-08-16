import type { TileKind } from '../../sim/types';

/**
 * Field props solid enough to throw a contact shadow — upright furniture and
 * landmarks. Recessed terrain (vent / brine / hazard stain) stays shadowless;
 * opaque scrub nests use occluder umbra instead of a second prop cast.
 */
export function tileCastsPropShadow(kind: TileKind): boolean {
  switch (kind) {
    case 'landmark':
    case 'quest':
    case 'beacon':
    case 'exit':
    case 'shuttle':
    case 'sealed':
    case 'rubble':
      return true;
    default:
      return false;
  }
}

/** Upright fixtures read taller than a low pad or crate. */
export function propShadowTall(kind: TileKind): boolean {
  return kind === 'beacon' || kind === 'quest' || kind === 'landmark';
}
