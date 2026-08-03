import type { LoreId } from './lore';

export type DamageType = 'kinetic' | 'ion';

export type EnemyKind =
  | 'mite'
  | 'spore'
  | 'wasp'
  | 'stalker'
  | 'leech'
  | 'crawler'
  | 'sentinel'
  | 'serpent'
  | 'wraith'
  | 'drone'
  | 'mastling'
  | 'skitter'
  | 'rift';

export type EnemyBehavior =
  | 'wander'
  | 'swell'
  | 'skirmish'
  | 'ambush'
  | 'drain'
  | 'guard'
  | 'sentinel'
  | 'hunter';

export interface EnemyDef {
  kind: EnemyKind;
  loreName: LoreId;
  hp: number;
  atk: number;
  def: number;
  glyph: string;
  color: number;
  behavior: EnemyBehavior;
  /** Manhattan aggro / interest radius */
  aggroRange: number;
  damageType: DamageType;
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
    behavior: 'wander',
    aggroRange: 2,
    damageType: 'kinetic',
  },
  spore: {
    kind: 'spore',
    loreName: 'ENEMY-SPORE',
    hp: 4,
    atk: 2,
    def: 0,
    glyph: 's',
    color: 0x66ccaa,
    behavior: 'swell',
    aggroRange: 3,
    damageType: 'ion',
  },
  wasp: {
    kind: 'wasp',
    loreName: 'ENEMY-WASP',
    hp: 5,
    atk: 3,
    def: 0,
    glyph: 'w',
    color: 0xccaa22,
    behavior: 'skirmish',
    aggroRange: 6,
    damageType: 'kinetic',
  },
  stalker: {
    kind: 'stalker',
    loreName: 'ENEMY-STALKER',
    hp: 7,
    atk: 4,
    def: 1,
    glyph: 'S',
    color: 0x44aa66,
    behavior: 'ambush',
    aggroRange: 8,
    damageType: 'kinetic',
  },
  leech: {
    kind: 'leech',
    loreName: 'ENEMY-LEECH',
    hp: 5,
    atk: 3,
    def: 0,
    glyph: 'l',
    color: 0x4488bb,
    behavior: 'drain',
    aggroRange: 5,
    damageType: 'ion',
  },
  crawler: {
    kind: 'crawler',
    loreName: 'ENEMY-CRAWLER',
    hp: 8,
    atk: 4,
    def: 1,
    glyph: 'c',
    color: 0xaa6644,
    behavior: 'guard',
    aggroRange: 7,
    damageType: 'kinetic',
  },
  sentinel: {
    kind: 'sentinel',
    loreName: 'ENEMY-SENTINEL',
    hp: 10,
    atk: 5,
    def: 2,
    glyph: 'V',
    color: 0x8888cc,
    behavior: 'sentinel',
    aggroRange: 5,
    damageType: 'kinetic',
  },
  serpent: {
    kind: 'serpent',
    loreName: 'ENEMY-SERPENT',
    hp: 9,
    atk: 5,
    def: 1,
    glyph: 'Z',
    color: 0xcc4488,
    behavior: 'hunter',
    aggroRange: 12,
    damageType: 'ion',
  },
  wraith: {
    kind: 'wraith',
    loreName: 'ENEMY-WRAITH',
    hp: 5,
    atk: 4,
    def: 0,
    glyph: 'W',
    color: 0xa0d080,
    behavior: 'hunter',
    aggroRange: 12,
    damageType: 'ion',
  },
  drone: {
    kind: 'drone',
    loreName: 'ENEMY-DRONE',
    hp: 10,
    atk: 4,
    def: 3,
    glyph: 'D',
    color: 0x90a0b0,
    behavior: 'sentinel',
    aggroRange: 4,
    damageType: 'kinetic',
  },
  mastling: {
    kind: 'mastling',
    loreName: 'ENEMY-MASTLING',
    hp: 5,
    atk: 3,
    def: 0,
    glyph: 'M',
    color: 0xb0c070,
    behavior: 'skirmish',
    aggroRange: 7,
    damageType: 'ion',
  },
  skitter: {
    kind: 'skitter',
    loreName: 'ENEMY-SKITTER',
    hp: 4,
    atk: 3,
    def: 0,
    glyph: 'k',
    color: 0xa88860,
    behavior: 'ambush',
    aggroRange: 9,
    damageType: 'kinetic',
  },
  rift: {
    kind: 'rift',
    loreName: 'ENEMY-RIFT',
    hp: 7,
    atk: 5,
    def: 1,
    glyph: 'R',
    color: 0xc07090,
    behavior: 'hunter',
    aggroRange: 13,
    damageType: 'ion',
  },
};
