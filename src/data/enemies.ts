import type { LoreId } from './lore';
import type { ItemKind } from './items';

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
  | 'rift'
  | 'reef_skitter'
  | 'duct_drone'
  | 'elite_skirmisher'
  | 'elite_ward'
  | 'elite_apex'
  | 'isolinear_warden'
  | 'pattern_custodian'
  | 'shear_sovereign';

export type EnemyBehavior =
  | 'wander'
  | 'swell'
  | 'skirmish'
  | 'ambush'
  | 'drain'
  | 'guard'
  | 'sentinel'
  | 'hunter';

export type EnemyBrand = 'flarebound' | 'warded' | 'shadowbound';

/**
 * How a windup resolves. Each style has a different correct answer, so the
 * player has to read which hunter is charging before deciding:
 * - `lunge` — one step then a bonus strike. Leave the 2-tile ring or kill it.
 * - `reach` — closes up to two tiles. Stepping back does not break it; kill or tank.
 * - `zone`  — stationary ion pulse over a radius. Step out of the ring.
 */
export type HuntStyle = 'lunge' | 'reach' | 'zone';

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
  /** Prefer dark (hunt shadows) or lit (hunt lamps) tiles for aggro bias. */
  lightPrefer?: 'dark' | 'lit';
  /** Windup resolution for pouncing hunters and alerted ambushers. */
  hunt?: HuntStyle;
  /** Arms a shot against the tile the player steps into. */
  overwatch?: boolean;
  /** Charges a cardinal ion beam down a clear lane. */
  beam?: boolean;
  /** Named elite/boss field modifier and its deterministic recovery. */
  brand?: EnemyBrand;
  brandDrop?: ItemKind;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mite: {
    kind: 'mite',
    loreName: 'ENEMY-MITE',
    hp: 3,
    atk: 2,
    def: 0,
    glyph: 'm',
    color: 0x88cc44,
    behavior: 'wander',
    aggroRange: 2,
    damageType: 'kinetic',
    lightPrefer: 'dark',
  },
  spore: {
    kind: 'spore',
    loreName: 'ENEMY-SPORE',
    hp: 4,
    atk: 2,
    def: 0,
    glyph: 's',
    color: 0x44ddff,
    behavior: 'swell',
    aggroRange: 3,
    damageType: 'ion',
    lightPrefer: 'dark',
  },
  wasp: {
    kind: 'wasp',
    loreName: 'ENEMY-WASP',
    hp: 5,
    atk: 3,
    def: 0,
    glyph: 'w',
    color: 0xffaa22,
    behavior: 'skirmish',
    aggroRange: 6,
    damageType: 'kinetic',
    lightPrefer: 'lit',
  },
  stalker: {
    kind: 'stalker',
    loreName: 'ENEMY-STALKER',
    hp: 7,
    atk: 4,
    def: 1,
    glyph: 'S',
    color: 0x44cc88,
    behavior: 'ambush',
    aggroRange: 8,
    damageType: 'kinetic',
    lightPrefer: 'dark',
  },
  leech: {
    kind: 'leech',
    loreName: 'ENEMY-LEECH',
    hp: 5,
    atk: 3,
    def: 0,
    glyph: 'l',
    color: 0x3399dd,
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
    color: 0xcc7744,
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
    color: 0x9988ff,
    behavior: 'sentinel',
    aggroRange: 5,
    damageType: 'kinetic',
    overwatch: true,
  },
  serpent: {
    kind: 'serpent',
    loreName: 'ENEMY-SERPENT',
    hp: 9,
    atk: 5,
    def: 1,
    glyph: 'Z',
    color: 0xff4488,
    behavior: 'hunter',
    aggroRange: 12,
    damageType: 'ion',
    hunt: 'lunge',
  },
  wraith: {
    kind: 'wraith',
    loreName: 'ENEMY-WRAITH',
    hp: 5,
    atk: 4,
    def: 0,
    glyph: 'Y',
    color: 0x88e0ff,
    behavior: 'hunter',
    aggroRange: 12,
    damageType: 'ion',
    hunt: 'reach',
  },
  drone: {
    kind: 'drone',
    loreName: 'ENEMY-DRONE',
    hp: 10,
    atk: 4,
    def: 3,
    glyph: 'D',
    color: 0xa0b0d0,
    behavior: 'sentinel',
    aggroRange: 4,
    damageType: 'kinetic',
    lightPrefer: 'lit',
    beam: true,
  },
  mastling: {
    kind: 'mastling',
    loreName: 'ENEMY-MASTLING',
    hp: 5,
    atk: 3,
    def: 0,
    glyph: 'M',
    color: 0x66eeff,
    behavior: 'skirmish',
    aggroRange: 7,
    damageType: 'ion',
    lightPrefer: 'lit',
  },
  skitter: {
    kind: 'skitter',
    loreName: 'ENEMY-SKITTER',
    hp: 4,
    atk: 3,
    def: 0,
    glyph: 'k',
    color: 0xddaa55,
    behavior: 'ambush',
    aggroRange: 9,
    damageType: 'kinetic',
    lightPrefer: 'dark',
  },
  rift: {
    kind: 'rift',
    loreName: 'ENEMY-RIFT',
    hp: 7,
    atk: 5,
    def: 1,
    glyph: 'R',
    color: 0xff6688,
    behavior: 'hunter',
    aggroRange: 13,
    damageType: 'ion',
    hunt: 'zone',
  },
  reef_skitter: {
    kind: 'reef_skitter',
    loreName: 'ENEMY-REEF-SKITTER',
    hp: 4,
    atk: 3,
    def: 0,
    glyph: 'r',
    color: 0x2fc0d8,
    behavior: 'ambush',
    aggroRange: 8,
    damageType: 'ion',
    lightPrefer: 'dark',
  },
  duct_drone: {
    kind: 'duct_drone',
    loreName: 'ENEMY-DUCT-DRONE',
    hp: 9,
    atk: 4,
    def: 2,
    glyph: 'd',
    color: 0x8899aa,
    behavior: 'sentinel',
    aggroRange: 5,
    damageType: 'kinetic',
    lightPrefer: 'lit',
    beam: true,
  },
  elite_skirmisher: {
    kind: 'elite_skirmisher',
    loreName: 'ENEMY-ELITE-SKIRM',
    hp: 7,
    atk: 3,
    def: 1,
    glyph: 'W',
    color: 0xffcc44,
    behavior: 'skirmish',
    aggroRange: 6,
    damageType: 'kinetic',
    brand: 'flarebound',
    brandDrop: 'flare',
  },
  elite_ward: {
    kind: 'elite_ward',
    loreName: 'ENEMY-ELITE-WARD',
    hp: 9,
    atk: 4,
    def: 2,
    glyph: 'E',
    color: 0xcf6cff,
    behavior: 'sentinel',
    aggroRange: 5,
    damageType: 'kinetic',
    overwatch: true,
    brand: 'warded',
    brandDrop: 'plate',
  },
  elite_apex: {
    kind: 'elite_apex',
    loreName: 'ENEMY-ELITE-APEX',
    hp: 10,
    atk: 4,
    def: 1,
    glyph: 'A',
    color: 0xcc44ff,
    behavior: 'hunter',
    aggroRange: 8,
    damageType: 'ion',
    hunt: 'reach',
    brand: 'shadowbound',
    brandDrop: 'probe',
  },
  isolinear_warden: {
    kind: 'isolinear_warden',
    loreName: 'ENEMY-WARDEN',
    hp: 12,
    atk: 5,
    def: 2,
    glyph: 'Ω',
    color: 0x99aaff,
    behavior: 'sentinel',
    aggroRange: 6,
    damageType: 'ion',
    brand: 'warded',
    brandDrop: 'plate',
  },
  pattern_custodian: {
    kind: 'pattern_custodian',
    loreName: 'ENEMY-CUSTODIAN',
    hp: 13,
    atk: 4,
    def: 2,
    glyph: 'Ψ',
    color: 0xcc88ff,
    behavior: 'guard',
    aggroRange: 6,
    damageType: 'ion',
    brand: 'shadowbound',
    brandDrop: 'probe',
  },
  shear_sovereign: {
    kind: 'shear_sovereign',
    loreName: 'ENEMY-SOVEREIGN',
    hp: 14,
    atk: 5,
    def: 1,
    glyph: 'Ξ',
    color: 0xe0f0ff,
    behavior: 'hunter',
    aggroRange: 8,
    damageType: 'ion',
    hunt: 'reach',
    brand: 'flarebound',
    brandDrop: 'flare',
  },
};
