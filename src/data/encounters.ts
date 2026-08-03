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
  energyDrain: number;
  hasRelayKey: boolean;
  hasNavCore: boolean;
  isBeacon: boolean;
  isShuttle: boolean;
}

export const SECTORS: SectorDef[] = [
  {
    id: 'plains',
    index: 0,
    loreName: 'SEC-PLAINS',
    width: 36,
    height: 24,
    roomCount: [5, 7],
    enemyTable: ['mite', 'spore'],
    enemyCount: [2, 4],
    lootTable: ['med', 'ration', 'energy'],
    lootCount: [3, 5],
    hazardChance: 0.02,
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
    width: 38,
    height: 26,
    roomCount: [5, 8],
    enemyTable: ['leech', 'mite', 'spore'],
    enemyCount: [3, 5],
    lootTable: ['med', 'energy', 'ration'],
    lootCount: [3, 5],
    hazardChance: 0.08,
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
    width: 40,
    height: 28,
    roomCount: [6, 9],
    enemyTable: ['stalker', 'wasp', 'mite'],
    enemyCount: [4, 6],
    lootTable: ['med', 'probe', 'ration', 'energy'],
    lootCount: [3, 5],
    hazardChance: 0.03,
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
    width: 42,
    height: 28,
    roomCount: [6, 10],
    enemyTable: ['wasp', 'stalker', 'spore'],
    enemyCount: [4, 7],
    lootTable: ['med', 'energy', 'probe'],
    lootCount: [3, 5],
    hazardChance: 0.04,
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
    width: 32,
    height: 22,
    roomCount: [4, 6],
    enemyTable: ['wasp', 'sentinel'],
    enemyCount: [2, 4],
    lootTable: ['energy', 'med'],
    lootCount: [2, 4],
    hazardChance: 0.02,
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
    width: 40,
    height: 28,
    roomCount: [6, 9],
    enemyTable: ['crawler', 'serpent', 'wasp'],
    enemyCount: [4, 7],
    lootTable: ['med', 'energy', 'ration'],
    lootCount: [4, 6],
    hazardChance: 0.06,
    energyDrain: 0,
    hasRelayKey: false,
    hasNavCore: false,
    isBeacon: false,
    isShuttle: false,
  },
  {
    id: 'vault',
    index: 6,
    loreName: 'SEC-VAULT',
    width: 36,
    height: 24,
    roomCount: [5, 8],
    enemyTable: ['sentinel', 'crawler', 'serpent'],
    enemyCount: [3, 6],
    lootTable: ['med', 'energy', 'probe'],
    lootCount: [3, 5],
    hazardChance: 0.03,
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
    width: 34,
    height: 22,
    roomCount: [4, 6],
    enemyTable: ['serpent', 'crawler', 'wasp'],
    enemyCount: [3, 5],
    lootTable: ['med', 'energy'],
    lootCount: [2, 3],
    hazardChance: 0.04,
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
