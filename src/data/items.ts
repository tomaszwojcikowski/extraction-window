import type { LoreId } from './lore';

export type ItemKind =
  | 'relay_key'
  | 'nav_core'
  | 'med'
  | 'energy'
  | 'ration'
  | 'probe';

export interface ItemDef {
  kind: ItemKind;
  loreName: LoreId;
  loreDesc: LoreId;
  quest: boolean;
  stackable: boolean;
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
};

export const INVENTORY_SLOTS = 10;
