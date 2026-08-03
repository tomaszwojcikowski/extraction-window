import type { EnemyKind } from './enemies';
import type { ItemKind } from './items';

/** Weighted drop tables per enemy kind. Never includes quest items. */
export const ENEMY_DROPS: Record<EnemyKind, Array<{ kind: ItemKind; weight: number }>> = {
  mite: [{ kind: 'ration', weight: 2 }, { kind: 'salvage', weight: 1 }],
  spore: [
    { kind: 'energy', weight: 2 },
    { kind: 'filter', weight: 1 },
  ],
  wasp: [
    { kind: 'dart', weight: 2 },
    { kind: 'energy', weight: 1 },
  ],
  stalker: [
    { kind: 'med', weight: 2 },
    { kind: 'stim', weight: 1 },
  ],
  leech: [
    { kind: 'filter', weight: 2 },
    { kind: 'coolant', weight: 1 },
  ],
  crawler: [
    { kind: 'plate', weight: 2 },
    { kind: 'ration', weight: 1 },
    { kind: 'salvage', weight: 2 },
  ],
  sentinel: [
    { kind: 'plate', weight: 2 },
    { kind: 'filter', weight: 2 },
    { kind: 'coolant', weight: 1 },
  ],
  serpent: [
    { kind: 'energy', weight: 2 },
    { kind: 'patch', weight: 1 },
  ],
  wraith: [
    { kind: 'energy', weight: 2 },
    { kind: 'filter', weight: 2 },
  ],
  drone: [
    { kind: 'jammer', weight: 2 },
    { kind: 'coolant', weight: 2 },
  ],
  mastling: [
    { kind: 'probe', weight: 2 },
    { kind: 'jammer', weight: 1 },
    { kind: 'lens', weight: 1 },
  ],
  skitter: [
    { kind: 'patch', weight: 2 },
    { kind: 'med', weight: 1 },
  ],
  rift: [
    { kind: 'coolant', weight: 2 },
    { kind: 'mapper', weight: 1 },
    { kind: 'filter', weight: 1 },
  ],
  reef_skitter: [
    { kind: 'energy', weight: 2 },
    { kind: 'probe', weight: 1 },
  ],
  duct_drone: [
    { kind: 'sealant', weight: 2 },
    { kind: 'jammer', weight: 1 },
  ],
  shear_wraith: [
    { kind: 'coolant', weight: 2 },
    { kind: 'filter', weight: 1 },
  ],
  elite_skirmisher: [
    { kind: 'pulse_baton', weight: 2 },
    { kind: 'stim', weight: 2 },
    { kind: 'med', weight: 1 },
  ],
  elite_ward: [
    { kind: 'plate', weight: 2 },
    { kind: 'ablative_vest', weight: 2 },
    { kind: 'harness', weight: 1 },
    { kind: 'coolant', weight: 1 },
  ],
  elite_apex: [
    { kind: 'coolant', weight: 2 },
    { kind: 'sensor_rig', weight: 1 },
    { kind: 'filter', weight: 2 },
  ],
  isolinear_warden: [
    { kind: 'pulse_baton', weight: 2 },
    { kind: 'plate', weight: 2 },
    { kind: 'probe', weight: 1 },
  ],
  pattern_custodian: [
    { kind: 'jammer', weight: 2 },
    { kind: 'eps_coupler', weight: 2 },
    { kind: 'lens', weight: 1 },
  ],
  shear_sovereign: [
    { kind: 'filter', weight: 2 },
    { kind: 'ablative_vest', weight: 1 },
    { kind: 'sensor_rig', weight: 1 },
    { kind: 'coolant', weight: 1 },
  ],
};

/** Drop chance by sector depth (early softer). */
export function dropChance(sectorIndex: number): number {
  if (sectorIndex < 3) return 0.22;
  if (sectorIndex < 6) return 0.35;
  return 0.42;
}
