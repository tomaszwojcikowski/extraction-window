import type { TileKind } from '../../sim/types';

/**
 * Raised furniture / POIs drawn on `propLayer` above floor shadows so occluder
 * umbra sits under the art. Not a second cast system — layering only.
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
