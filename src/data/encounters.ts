import type { EnemyKind } from './enemies';
import type { ItemKind } from './items';
import type { LoreId } from './lore';

export type SectorId =
  | 'plains'
  | 'flood'
  | 'canopy'
  | 'ruin'
  | 'beacon'
  | 'ash'
  | 'vault'
  | 'ridge';

export interface SectorDef {
  id: SectorId;
  index: number;
  loreName: LoreId;
  width: number;
  height: number;
  roomCount: [number, number];
  enemyTable: EnemyKind[];
  enemyCount: [number, number];
  lootTable: ItemKind[];
  lootCount: [number, number];
  hazardChance: number;
  scrubChance: number;
  rubbleChance: number;
  ventChance: number;
  energyDrain: number;
  hasRelayKey: boolean;
  hasNavCore: boolean;
  isBeacon: boolean;
  isShuttle: boolean;
}

const FIELD_LOOT: ItemKind[] = [
  'med',
  'energy',
  'ration',
  'probe',
  'stim',
  'flare',
  'dart',
  'sealant',
];
const DEEP_LOOT: ItemKind[] = [
  'med',
  'energy',
  'probe',
  'stim',
  'plate',
  'filter',
  'coolant',
  'flare',
  'blade',
  'harness',
  'dart',
  'jammer',
  'sealant',
];

export const SECTORS: SectorDef[] = [
  {
    id: 'plains',
    index: 0,
    loreName: 'SEC-PLAINS',
    width: 40,
    height: 28,
    roomCount: [5, 7],
    enemyTable: ['mite', 'spore'],
    enemyCount: [2, 3],
    lootTable: ['med', 'ration', 'energy', 'flare', 'dart'],
    lootCount: [3, 5],
    hazardChance: 0.015,
    scrubChance: 0.06,
    rubbleChance: 0.03,
    ventChance: 0.01,
    energyDrain: 0,
    hasRelayKey: false,
    hasNavCore: false,
    isBeacon: false,
    isShuttle: false,
  },
  {
    id: 'flood',
    index: 1,
    loreName: 'SEC-FLOOD',
    width: 42,
    height: 28,
    roomCount: [5, 7],
    enemyTable: ['leech', 'mite', 'spore'],
    enemyCount: [2, 4],
    lootTable: ['med', 'energy', 'ration', 'filter', 'coolant', 'sealant'],
    lootCount: [3, 5],
    hazardChance: 0.07,
    scrubChance: 0.04,
    rubbleChance: 0.02,
    ventChance: 0.03,
    energyDrain: 0,
    hasRelayKey: false,
    hasNavCore: false,
    isBeacon: false,
    isShuttle: false,
  },
  {
    id: 'canopy',
    index: 2,
    loreName: 'SEC-CANOPY',
    width: 44,
    height: 30,
    roomCount: [6, 8],
    enemyTable: ['stalker', 'wasp', 'mite'],
    enemyCount: [3, 5],
    lootTable: [...FIELD_LOOT, 'plate'],
    lootCount: [3, 5],
    hazardChance: 0.025,
    scrubChance: 0.08,
    rubbleChance: 0.02,
    ventChance: 0.015,
    energyDrain: 0,
    hasRelayKey: false,
    hasNavCore: false,
    isBeacon: false,
    isShuttle: false,
  },
  {
    id: 'ruin',
    index: 3,
    loreName: 'SEC-RUIN',
    width: 44,
    height: 30,
    roomCount: [6, 9],
    enemyTable: ['wasp', 'stalker', 'spore'],
    enemyCount: [3, 5],
    lootTable: ['med', 'energy', 'probe', 'stim', 'plate', 'blade', 'flare', 'jammer', 'dart', 'harness'],
    lootCount: [3, 5],
    hazardChance: 0.03,
    scrubChance: 0.02,
    rubbleChance: 0.1,
    ventChance: 0.02,
    energyDrain: 0,
    hasRelayKey: true,
    hasNavCore: false,
    isBeacon: false,
    isShuttle: false,
  },
  {
    id: 'beacon',
    index: 4,
    loreName: 'SEC-BEACON',
    width: 34,
    height: 24,
    roomCount: [4, 5],
    enemyTable: ['wasp', 'sentinel', 'drone'],
    enemyCount: [2, 3],
    lootTable: ['energy', 'med', 'coolant', 'filter', 'jammer'],
    lootCount: [2, 3],
    hazardChance: 0.015,
    scrubChance: 0.01,
    rubbleChance: 0.04,
    ventChance: 0.04,
    energyDrain: 0,
    hasRelayKey: false,
    hasNavCore: false,
    isBeacon: true,
    isShuttle: false,
  },
  {
    id: 'ash',
    index: 5,
    loreName: 'SEC-ASH',
    width: 42,
    height: 30,
    roomCount: [6, 8],
    enemyTable: ['crawler', 'serpent', 'wasp', 'wraith'],
    enemyCount: [3, 5],
    lootTable: ['med', 'energy', 'ration', 'filter', 'coolant', 'plate', 'sealant', 'dart', 'harness'],
    lootCount: [3, 5],
    hazardChance: 0.05,
    scrubChance: 0.02,
    rubbleChance: 0.08,
    ventChance: 0.04,
    energyDrain: 1,
    hasRelayKey: false,
    hasNavCore: false,
    isBeacon: false,
    isShuttle: false,
  },
  {
    id: 'vault',
    index: 6,
    loreName: 'SEC-VAULT',
    width: 38,
    height: 26,
    roomCount: [5, 7],
    enemyTable: ['sentinel', 'crawler', 'serpent', 'drone'],
    enemyCount: [3, 4],
    lootTable: DEEP_LOOT,
    lootCount: [3, 5],
    hazardChance: 0.02,
    scrubChance: 0.01,
    rubbleChance: 0.05,
    ventChance: 0.05,
    energyDrain: 0,
    hasRelayKey: false,
    hasNavCore: true,
    isBeacon: false,
    isShuttle: false,
  },
  {
    id: 'ridge',
    index: 7,
    loreName: 'SEC-RIDGE',
    width: 36,
    height: 24,
    roomCount: [4, 6],
    enemyTable: ['serpent', 'crawler', 'wasp', 'wraith'],
    enemyCount: [2, 4],
    lootTable: ['med', 'energy', 'coolant', 'stim', 'plate'],
    lootCount: [2, 3],
    hazardChance: 0.03,
    scrubChance: 0.03,
    rubbleChance: 0.06,
    ventChance: 0.02,
    energyDrain: 0,
    hasRelayKey: false,
    hasNavCore: false,
    isBeacon: false,
    isShuttle: true,
  },
];

export function getSector(index: number): SectorDef {
  return SECTORS[Math.max(0, Math.min(SECTORS.length - 1, index))]!;
}
