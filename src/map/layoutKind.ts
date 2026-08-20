import type { SectorId } from '../data/encounters';

/**
 * How a sector is put together — the skeleton under the rooms.
 * Kept free of Room imports so ambient/SFX/role code can share it
 * without cycling through layout placement.
 */

export type LayoutKind = 'scatter' | 'spine' | 'hub' | 'lattice' | 'branch' | 'warren';

export function layoutForSector(id: SectorId): LayoutKind {
  switch (id) {
    case 'ridge':
      // Final approach is the only pure gauntlet — approach stays scatter so the
      // campaign does not end on two linear maps in a row.
      return 'spine';
    case 'beacon':
    case 'vault':
      return 'hub';
    case 'duct':
    case 'trench':
      return 'lattice';
    case 'canopy':
    case 'reef':
    case 'spire':
      return 'branch';
    case 'ruin':
    case 'ash':
    case 'fissure':
    case 'brine':
      return 'warren';
    default:
      // plains, flood, approach — open country, the familiar chain.
      return 'scatter';
  }
}
