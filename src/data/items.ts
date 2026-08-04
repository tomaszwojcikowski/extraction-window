import type { LoreId } from './lore';

export type ItemKind =
  | 'relay_key'
  | 'nav_core'
  | 'med'
  | 'energy'
  | 'ration'
  | 'probe'
  | 'stim'
  | 'plate'
  | 'flare'
  | 'filter'
  | 'coolant'
  | 'blade'
  | 'pulse_baton'
  | 'harness'
  | 'ablative_vest'
  | 'sensor_rig'
  | 'eps_coupler'
  | 'dart'
  | 'jammer'
  | 'sealant'
  | 'battery'
  | 'patch'
  | 'lens'
  | 'mapper'
  | 'salvage'
  | 'sealed_crate'
  | 'array_shard'
  | 'field_sample'
  | 'pattern_balm';

export type EquipSlotId = 'tool' | 'armor' | 'utility';

export interface ItemDef {
  kind: ItemKind;
  loreName: LoreId;
  loreDesc: LoreId;
  quest: boolean;
  stackable: boolean;
  /** Worn loadout slot — use toggles equip / stow. */
  equipSlot?: EquipSlotId;
}

/** Situational equip tags (Wave 1 ADOM brands). */
export const EQUIP_TAGS = {
  blade: { onHitBleed: 1 },
  pulse_baton: { onHitStun: 2 },
  ablative_vest: { bleedDamage: 1 },
  eps_coupler: { emEnergyTaxZero: true },
  sensor_rig: { blindFovPenalty: 1 },
  harness: { cancelFatigueTax: true },
} as const;

export function equipOnHitBleed(tool: ItemKind | null): number {
  if (tool === 'blade') return EQUIP_TAGS.blade.onHitBleed;
  return 0;
}

export function equipOnHitStun(tool: ItemKind | null): number {
  if (tool === 'pulse_baton') return EQUIP_TAGS.pulse_baton.onHitStun;
  return 0;
}

export function equipCancelsFatigueTax(armor: ItemKind | null): boolean {
  return armor === 'harness';
}

export const ITEMS: Record<ItemKind, ItemDef> = {
  relay_key: {
    kind: 'relay_key',
    loreName: 'ITEM-RELAY-KEY',
    loreDesc: 'ITEM-RELAY-KEY-DESC',
    quest: true,
    stackable: false,
  },
  nav_core: {
    kind: 'nav_core',
    loreName: 'ITEM-NAV-CORE',
    loreDesc: 'ITEM-NAV-CORE-DESC',
    quest: true,
    stackable: false,
  },
  med: {
    kind: 'med',
    loreName: 'ITEM-MED',
    loreDesc: 'ITEM-MED-DESC',
    quest: false,
    stackable: true,
  },
  energy: {
    kind: 'energy',
    loreName: 'ITEM-ENERGY',
    loreDesc: 'ITEM-ENERGY-DESC',
    quest: false,
    stackable: true,
  },
  ration: {
    kind: 'ration',
    loreName: 'ITEM-RATION',
    loreDesc: 'ITEM-RATION-DESC',
    quest: false,
    stackable: true,
  },
  probe: {
    kind: 'probe',
    loreName: 'ITEM-PROBE',
    loreDesc: 'ITEM-PROBE-DESC',
    quest: false,
    stackable: true,
  },
  stim: {
    kind: 'stim',
    loreName: 'ITEM-STIM',
    loreDesc: 'ITEM-STIM-DESC',
    quest: false,
    stackable: true,
  },
  plate: {
    kind: 'plate',
    loreName: 'ITEM-PLATE',
    loreDesc: 'ITEM-PLATE-DESC',
    quest: false,
    stackable: true,
  },
  flare: {
    kind: 'flare',
    loreName: 'ITEM-FLARE',
    loreDesc: 'ITEM-FLARE-DESC',
    quest: false,
    stackable: true,
  },
  filter: {
    kind: 'filter',
    loreName: 'ITEM-FILTER',
    loreDesc: 'ITEM-FILTER-DESC',
    quest: false,
    stackable: true,
  },
  coolant: {
    kind: 'coolant',
    loreName: 'ITEM-COOLANT',
    loreDesc: 'ITEM-COOLANT-DESC',
    quest: false,
    stackable: true,
  },
  blade: {
    kind: 'blade',
    loreName: 'ITEM-BLADE',
    loreDesc: 'ITEM-BLADE-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'tool',
  },
  pulse_baton: {
    kind: 'pulse_baton',
    loreName: 'ITEM-BATON',
    loreDesc: 'ITEM-BATON-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'tool',
  },
  harness: {
    kind: 'harness',
    loreName: 'ITEM-HARNESS',
    loreDesc: 'ITEM-HARNESS-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'armor',
  },
  ablative_vest: {
    kind: 'ablative_vest',
    loreName: 'ITEM-VEST',
    loreDesc: 'ITEM-VEST-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'armor',
  },
  sensor_rig: {
    kind: 'sensor_rig',
    loreName: 'ITEM-SENSOR',
    loreDesc: 'ITEM-SENSOR-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'utility',
  },
  eps_coupler: {
    kind: 'eps_coupler',
    loreName: 'ITEM-COUPLER',
    loreDesc: 'ITEM-COUPLER-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'utility',
  },
  dart: {
    kind: 'dart',
    loreName: 'ITEM-DART',
    loreDesc: 'ITEM-DART-DESC',
    quest: false,
    stackable: true,
  },
  jammer: {
    kind: 'jammer',
    loreName: 'ITEM-JAMMER',
    loreDesc: 'ITEM-JAMMER-DESC',
    quest: false,
    stackable: true,
  },
  sealant: {
    kind: 'sealant',
    loreName: 'ITEM-SEALANT',
    loreDesc: 'ITEM-SEALANT-DESC',
    quest: false,
    stackable: true,
  },
  battery: {
    kind: 'battery',
    loreName: 'ITEM-BATTERY',
    loreDesc: 'ITEM-BATTERY-DESC',
    quest: false,
    stackable: true,
  },
  patch: {
    kind: 'patch',
    loreName: 'ITEM-PATCH',
    loreDesc: 'ITEM-PATCH-DESC',
    quest: false,
    stackable: true,
  },
  lens: {
    kind: 'lens',
    loreName: 'ITEM-LENS',
    loreDesc: 'ITEM-LENS-DESC',
    quest: false,
    stackable: true,
  },
  mapper: {
    kind: 'mapper',
    loreName: 'ITEM-MAPPER',
    loreDesc: 'ITEM-MAPPER-DESC',
    quest: false,
    stackable: true,
  },
  salvage: {
    kind: 'salvage',
    loreName: 'ITEM-SALVAGE',
    loreDesc: 'ITEM-SALVAGE-DESC',
    quest: false,
    stackable: true,
  },
  sealed_crate: {
    kind: 'sealed_crate',
    loreName: 'ITEM-CRATE',
    loreDesc: 'ITEM-CRATE-DESC',
    quest: false,
    stackable: true,
  },
  array_shard: {
    kind: 'array_shard',
    loreName: 'ITEM-SHARD',
    loreDesc: 'ITEM-SHARD-DESC',
    quest: false,
    stackable: true,
  },
  field_sample: {
    kind: 'field_sample',
    loreName: 'ITEM-SAMPLE',
    loreDesc: 'ITEM-SAMPLE-DESC',
    quest: false,
    stackable: true,
  },
  pattern_balm: {
    kind: 'pattern_balm',
    loreName: 'ITEM-BALM',
    loreDesc: 'ITEM-BALM-DESC',
    quest: false,
    stackable: true,
  },
};

/** Max armor granted while this armor piece is worn. */
export const ARMOR_MAX_BONUS: Partial<Record<ItemKind, number>> = {
  harness: 6,
  ablative_vest: 4,
};

/** Flat DEF while this armor is worn. */
export const ARMOR_DEF_BONUS: Partial<Record<ItemKind, number>> = {
  ablative_vest: 1,
};

/** Flat ATK while this tool is worn. */
export const TOOL_ATK_BONUS: Partial<Record<ItemKind, number>> = {
  blade: 1,
  pulse_baton: 1,
};

export const INVENTORY_SLOTS = 16;

export function shortEquipName(kind: ItemKind | null): string {
  if (!kind) return '—';
  switch (kind) {
    case 'blade':
      return 'knife';
    case 'pulse_baton':
      return 'baton';
    case 'harness':
      return 'eva';
    case 'ablative_vest':
      return 'vest';
    case 'sensor_rig':
      return 'sensor';
    case 'eps_coupler':
      return 'coupler';
    default:
      return kind;
  }
}
