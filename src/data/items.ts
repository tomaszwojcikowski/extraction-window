import type { LoreId } from './lore';

/**
 * One clear tool per job. Every kit item owns a job no other item does:
 * med heals, energy charges the bus, filter and sealant answer EM two
 * different ways, probe sees, mapper remembers, flare and
 * dart and plate fight, phaser lances a short lane, salvage gambles.
 * Worn loadout pieces (suit, tool, comm, rings, …) stay in the kit bag when equipped.
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
  | 'phaser'
  | 'harness'
  | 'ablative_vest'
  | 'dart'
  | 'sealant'
  | 'mapper'
  | 'salvage'
  | 'field_comm'
  | 'scan_band'
  | 'survey_visor'
  | 'grip_gloves'
  | 'mag_boots'
  | 'flare_prism'
  | 'ward_weave'
  | 'shadow_lens';

export type EquipSlotId =
  | 'head'
  | 'suit'
  | 'hands'
  | 'tool'
  | 'feet'
  | 'comm'
  | 'ring_l'
  | 'ring_r';

export interface ItemDef {
  kind: ItemKind;
  loreName: LoreId;
  loreDesc: LoreId;
  quest: boolean;
  stackable: boolean;
  equipSlot?: EquipSlotId;
  equipSlots?: EquipSlotId[];
}

export const EQUIP_SLOT_ORDER: EquipSlotId[] = [
  'head',
  'suit',
  'hands',
  'tool',
  'feet',
  'comm',
  'ring_l',
  'ring_r',
];

export const EQUIP_SLOT_LORE: Record<EquipSlotId, LoreId> = {
  head: 'UI-EQUIP-HEAD',
  suit: 'UI-EQUIP-SUIT',
  hands: 'UI-EQUIP-HANDS',
  tool: 'UI-EQUIP-TOOL',
  feet: 'UI-EQUIP-FEET',
  comm: 'UI-EQUIP-COMM',
  ring_l: 'UI-EQUIP-RING',
  ring_r: 'UI-EQUIP-RING',
};

/** Situational equip tags — worn gear reads as one line of consequence. */
export const EQUIP_TAGS = {
  blade: { onHitBleed: 1 },
  pulse_baton: { onHitStun: 2 },
  ablative_vest: { bleedDamage: 1, ionDamageReduction: 1 },
  scan_band: { salvageFailReduction: 0.06 },
  survey_visor: { statusTurnReduction: 1, fovCap: 1, flareEmTax: 5 },
  grip_gloves: { hazardIonSkip: true },
  mag_boots: { hazardDrainReduction: 1, tripwireEmReduction: 1 },
  flare_prism: { flarePowerReduction: 1, shadowFlareMarkBonus: 1 },
  ward_weave: { ionDamageReduction: 2, ventDrainExtra: 1 },
  shadow_lens: { darkNoticeReduction: 1, litStatusPenalty: 1 },
} as const;

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
  phaser: {
    kind: 'phaser',
    loreName: 'ITEM-PHASER',
    loreDesc: 'ITEM-PHASER-DESC',
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
    equipSlot: 'suit',
  },
  ablative_vest: {
    kind: 'ablative_vest',
    loreName: 'ITEM-VEST',
    loreDesc: 'ITEM-VEST-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'suit',
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
  field_comm: {
    kind: 'field_comm',
    loreName: 'ITEM-COMM',
    loreDesc: 'ITEM-COMM-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'comm',
  },
  scan_band: {
    kind: 'scan_band',
    loreName: 'ITEM-SCAN-BAND',
    loreDesc: 'ITEM-SCAN-BAND-DESC',
    quest: false,
    stackable: false,
    equipSlots: ['ring_l', 'ring_r'],
  },
  survey_visor: {
    kind: 'survey_visor',
    loreName: 'ITEM-VISOR',
    loreDesc: 'ITEM-VISOR-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'head',
  },
  grip_gloves: {
    kind: 'grip_gloves',
    loreName: 'ITEM-GLOVES',
    loreDesc: 'ITEM-GLOVES-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'hands',
  },
  mag_boots: {
    kind: 'mag_boots',
    loreName: 'ITEM-BOOTS',
    loreDesc: 'ITEM-BOOTS-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'feet',
  },
  flare_prism: {
    kind: 'flare_prism',
    loreName: 'ITEM-FLARE-PRISM',
    loreDesc: 'ITEM-FLARE-PRISM-DESC',
    quest: false,
    stackable: false,
    equipSlots: ['ring_l', 'ring_r'],
  },
  ward_weave: {
    kind: 'ward_weave',
    loreName: 'ITEM-WARD-WEAVE',
    loreDesc: 'ITEM-WARD-WEAVE-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'suit',
  },
  shadow_lens: {
    kind: 'shadow_lens',
    loreName: 'ITEM-SHADOW-LENS',
    loreDesc: 'ITEM-SHADOW-LENS-DESC',
    quest: false,
    stackable: false,
    equipSlot: 'head',
  },
};

/** Max armor granted while this suit piece is worn. */
export const ARMOR_MAX_BONUS: Partial<Record<ItemKind, number>> = {
  harness: 6,
  ablative_vest: 4,
  ward_weave: 3,
};

/** Flat DEF while this suit is worn. */
export const ARMOR_DEF_BONUS: Partial<Record<ItemKind, number>> = {
  ablative_vest: 1,
};

/** Flat ATK while this tool is worn. */
export const TOOL_ATK_BONUS: Partial<Record<ItemKind, number>> = {
  blade: 1,
  pulse_baton: 1,
  phaser: 1,
};

export const INVENTORY_SLOTS = 16;

export function shortEquipName(kind: ItemKind | null): string {
  if (!kind) return '—';
  switch (kind) {
    case 'blade':
      return 'knife';
    case 'pulse_baton':
      return 'baton';
    case 'phaser':
      return 'phaser';
    case 'harness':
      return 'eva';
    case 'ablative_vest':
      return 'vest';
    case 'field_comm':
      return 'comm';
    case 'scan_band':
      return 'band';
    case 'survey_visor':
      return 'visor';
    case 'grip_gloves':
      return 'gloves';
    case 'mag_boots':
      return 'boots';
    case 'flare_prism':
      return 'prism';
    case 'ward_weave':
      return 'weave';
    case 'shadow_lens':
      return 'lens';
    default:
      return kind;
  }
}
