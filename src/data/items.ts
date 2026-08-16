import type { LoreId } from './lore';

/**
 * One clear tool per job. Every kit item owns a job no other item does:
 * med heals, energy charges the bus, filter and sealant answer EM two
 * different ways, probe sees, mapper remembers, flare and
 * dart and plate fight, salvage gambles.
 */
export type ItemKind =
  | 'relay_key'
  | 'nav_core'
  | 'med'
  | 'energy'
  | 'probe'
  | 'stim'
  | 'plate'
  | 'flare'
  | 'filter'
  | 'blade'
  | 'pulse_baton'
  | 'harness'
  | 'ablative_vest'
  | 'dart'
  | 'sealant'
  | 'mapper'
  | 'salvage';

export type EquipSlotId = 'tool' | 'armor';

export interface ItemDef {
  kind: ItemKind;
  loreName: LoreId;
  loreDesc: LoreId;
  quest: boolean;
  stackable: boolean;
  /** Worn loadout slot — use toggles equip / stow. */
  equipSlot?: EquipSlotId;
}

/** Situational equip tags — worn gear reads as one line of consequence. */
export const EQUIP_TAGS = {
  blade: { onHitBleed: 1 },
  pulse_baton: { onHitStun: 2 },
  ablative_vest: { bleedDamage: 1, ionDamageReduction: 1 },
} as const;

/** Ablative lattice blunts ion damage by a point while worn. */
export function equipIonReduction(armor: ItemKind | null): number {
  return armor === 'ablative_vest' ? EQUIP_TAGS.ablative_vest.ionDamageReduction : 0;
}

export function equipOnHitBleed(tool: ItemKind | null): number {
  if (tool === 'blade') return EQUIP_TAGS.blade.onHitBleed;
  return 0;
}

export function equipOnHitStun(tool: ItemKind | null): number {
  if (tool === 'pulse_baton') return EQUIP_TAGS.pulse_baton.onHitStun;
  return 0;
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
  dart: {
    kind: 'dart',
    loreName: 'ITEM-DART',
    loreDesc: 'ITEM-DART-DESC',
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
    default:
      return kind;
  }
}
