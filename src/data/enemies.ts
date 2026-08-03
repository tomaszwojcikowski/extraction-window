import type { LoreId } from './lore';

export type EnemyKind =
  | 'mite'
  | 'spore'
  | 'wasp'
  | 'stalker'
  | 'leech'
  | 'crawler'
  | 'sentinel'
  | 'serpent';

export interface EnemyDef {
  kind: EnemyKind;
  loreName: LoreId;
  hp: number;
  atk: number;
  def: number;
  glyph: string;
  color: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mite: {
    kind: 'mite',
    loreName: 'ENEMY-MITE',
    hp: 3,
    atk: 2,
    def: 0,
    glyph: 'm',
    color: 0x88aa44,
  },
  spore: {
    kind: 'spore',
    loreName: 'ENEMY-SPORE',
    hp: 4,
    atk: 2,
    def: 0,
    glyph: 's',
    color: 0x66ccaa,
  },
  wasp: {
    kind: 'wasp',
    loreName: 'ENEMY-WASP',
    hp: 5,
    atk: 3,
    def: 0,
    glyph: 'w',
    color: 0xccaa22,
  },
  stalker: {
    kind: 'stalker',
    loreName: 'ENEMY-STALKER',
    hp: 7,
    atk: 4,
    def: 1,
    glyph: 'S',
    color: 0x44aa66,
  },
  leech: {
    kind: 'leech',
    loreName: 'ENEMY-LEECH',
    hp: 5,
    atk: 3,
    def: 0,
    glyph: 'l',
    color: 0x4488bb,
  },
  crawler: {
    kind: 'crawler',
    loreName: 'ENEMY-CRAWLER',
    hp: 8,
    atk: 4,
    def: 1,
    glyph: 'c',
    color: 0xaa6644,
  },
  sentinel: {
    kind: 'sentinel',
    loreName: 'ENEMY-SENTINEL',
    hp: 10,
    atk: 5,
    def: 2,
    glyph: 'V',
    color: 0x8888cc,
  },
  serpent: {
    kind: 'serpent',
    loreName: 'ENEMY-SERPENT',
    hp: 9,
    atk: 5,
    def: 1,
    glyph: 'Z',
    color: 0xcc4488,
  },
};
