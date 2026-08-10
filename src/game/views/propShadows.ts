import type { TileKind } from '../../sim/types';

/**
 * Field props solid enough to throw a contact shadow — landmarks, hatches,
 * hazards, and other full-tile furniture. Soft scrub / tripwire stay shadowless.
 */
export function tileCastsPropShadow(kind: TileKind): boolean {
  switch (kind) {
    case 'landmark':
    case 'quest':
    case 'hazard':
    case 'vent':
    case 'brine_pool':
    case 'beacon':
    case 'exit':
    case 'shuttle':
    case 'sealed':
    case 'rubble':
    case 'scrub_nest':
      return true;
    default:
      return false;
  }
}

/** Beacons / pads read taller than a crate. */
export function propShadowTall(kind: TileKind): boolean {
  return kind === 'beacon' || kind === 'shuttle' || kind === 'landmark';
}
