import type { SectorId } from '../data/encounters';

/**
 * Crisp Halcyon survey kit on a living Meridian Shelf.
 *
 * Material story, not a UI kit: sealed alloy still in expedition paint,
 * bone-white silkscreen legends, high-vis flagging and charge tape, and
 * ecology glowing like a reef at night. Nothing here is a starship
 * console — no rounded elbow panels, no orange-on-black bridge chrome — and
 * nothing is a default "sci-fi glow": each emitter below has a motivated
 * colour temperature (see `LightTemp`). Wear comes from use, not decay.
 */

export const FONT_DATA = '"IBM Plex Mono", "Courier New", monospace';
export const FONT_DISPLAY = '"Share Tech Mono", "IBM Plex Mono", monospace';

export const Theme = {
  // Structure — mineral slate, painted expedition alloy, machined bevel.
  ground: 0x1e2c30,
  groundDeep: 0x0c1214,
  panel: 0x243438,
  panelEdge: 0x4a5e62,

  // Ink — silkscreen legends on painted cases (bone, not phosphor).
  ink: 0xdfe4d5,
  inkBright: 0xf6f4e6,
  inkDim: 0x93a196,
  inkMute: 0x647470,

  // Materials / status.
  /** Living reef-glow — fauna and vent light. */
  biolum: 0x5edcc4,
  biolumDeep: 0x228078,
  /** Kinetic heat — impact tell, not corrosion-as-identity. */
  rust: 0xc0512f,
  /** Surveyor's flagging tape — player-placed objectives and marks. */
  flag: 0xe0578f,
  /** Reflective high-vis tape — the bus / stored charge. */
  tape: 0xe8b93c,
  /** Shear heat — the window closing. */
  arc: 0xe4622f,
  /** Overloaded arc blow-out — Breaching. */
  arcWhite: 0xcfefff,
  /** Chartreuse EM-HIGH survey wash. */
  scanWash: 0xc8e054,
  safe: 0x7cbc88,

  // Fog / survey memory.
  fog: 0x030506,
  memory: 0x243033,
  /** Wash over a contact the surveyor remembers but cannot currently see. */
  memoryWash: 0x6688aa,
  /** The cold, drained band below the shadow threshold — the dark ambushers use. */
  shadowWash: 0x5a7080,
} as const;

/**
 * Named world materials — the substances the tile art is actually made of.
 *
 * `Theme` above is the *role* palette: what a colour means to the player. This
 * is the *stuff* palette: what a surface is. Both exist so no drawing code ever
 * reaches for a raw hex; a new surface earns a name here first, which is what
 * keeps the world from drifting into unmotivated colour.
 */
export const Material = {
  /** Mineral slate cliff face. */
  rock: 0x354844,
  /** NW lip on cliff bedding. */
  rockLit: 0x42685a,
  /** Painted expedition deck in built sectors. */
  deck: 0x32444c,
  /** NW lip on built deck. */
  deckLit: 0x3e5560,
  /** Conduit lining. */
  conduit: 0x264048,
  /** Depth inside a wall recess or seam. */
  recess: 0x151e20,

  /** Shelf scrub. */
  foliage: 0x327055,
  /** Fallen masonry and broken plate. */
  debris: 0x4e4658,
  /** Scrub nest lining. */
  nest: 0x3e1c28,
  /** Standing brine. */
  brine: 0x184056,
  /** Catch-light on standing brine. */
  brineLit: 0x22586c,

  /** Surveyor's suit: shadowed body, lit panels, mid webbing, sealed visor. */
  suitDeep: 0x09111e,
  suitLit: 0x3a82b4,
  suitMid: 0x1e3e5a,
  visor: 0x07101c,

  /** Field contacts: another surveyor's kit, a projection, a drone shell. */
  contactSuit: 0xd6b080,
  contactHolo: 0x66ccee,
  allyShell: 0x78caa0,
  contactRim: 0x243d4d,
  allyRim: 0x143b31,
} as const;

export const ThemeCss = {
  ground: '#1e2c30',
  groundDeep: '#0c1214',
  panel: '#243438',
  ink: '#dfe4d5',
  inkBright: '#f6f4e6',
  inkDim: '#93a196',
  inkMute: '#647470',
  biolum: '#5edcc4',
  rust: '#c0512f',
  flag: '#e0578f',
  tape: '#e8b93c',
  arc: '#e4622f',
  arcWhite: '#cfefff',
  scanWash: '#c8e054',
  safe: '#7cbc88',
  hintBg: '#0c1214ee',
} as const;

/**
 * Motivated colour temperatures. Every emitter in the world is a *thing* —
 * a hooded halogen, a magnesium stick, an animal, a sodium relay — and it
 * should be nameable by its colour alone with the sprite hidden. Owned by the
 * sim's emitter table so palette and gameplay lighting can't drift apart.
 */
export { LIGHT_TEMP as LightTemp } from '../sim/light';

/** Light biome lifts — pattern carries identity; tint is secondary. */
export const BIOME_FLOOR_TINT: Record<SectorId, number> = {
  plains: 0xd8cfae,
  flood: 0x9fbcc8,
  canopy: 0xa8c49a,
  reef: 0x8fcbc4,
  spire: 0xb8bcc4,
  ruin: 0xc0a688,
  beacon: 0xc4bc98,
  trench: 0xa89c86,
  duct: 0x8c9498,
  ash: 0xb89c80,
  brine: 0x86bcc4,
  vault: 0xa4a8b4,
  fissure: 0xc09484,
  approach: 0xb0a48c,
  ridge: 0xccc4ac,
};

/** Ambient field light (0–1) + cool/warm key tint per sector. */
export type BiomeAmbient = {
  /** Base brightness before dynamic sources (duct dark, plains brighter). */
  ambient: number;
  /** Soft multiply tint applied to lit tiles (Phaser tint). */
  tint: number;
};

/**
 * How light *behaves* per biome, not just what colour the floor is:
 * scrub scatters it (canopy/plains/ridge lift), brine reflects it (brine/flood/reef
 * cool and bright), ash holds it (ash/approach dark and warm-grey), duct absorbs
 * it. Presentation only — sim exitance lives in `SECTOR_AMBIENT`.
 */
export const BIOME_AMBIENT: Record<SectorId, BiomeAmbient> = {
  // Presentation floor only — sim exitance stays in SECTOR_AMBIENT.
  plains: { ambient: 0.48, tint: 0xffeccc },
  flood: { ambient: 0.37, tint: 0xbcd8e4 },
  canopy: { ambient: 0.38, tint: 0xc4dcb4 },
  reef: { ambient: 0.32, tint: 0xa8e8dc },
  spire: { ambient: 0.31, tint: 0xd4dce4 },
  ruin: { ambient: 0.32, tint: 0xe4ccac },
  beacon: { ambient: 0.37, tint: 0xffdcb0 },
  trench: { ambient: 0.26, tint: 0xccbc9c },
  duct: { ambient: 0.18, tint: 0xa4b0b8 },
  ash: { ambient: 0.26, tint: 0xdcbc98 },
  brine: { ambient: 0.36, tint: 0xa4d8e0 },
  vault: { ambient: 0.33, tint: 0xc4ccd8 },
  fissure: { ambient: 0.27, tint: 0xe4b49c },
  approach: { ambient: 0.23, tint: 0xd4b898 },
  ridge: { ambient: 0.43, tint: 0xe8e0c8 },
};

export function floorTextureKey(sectorId: SectorId, variant: number): string {
  return `t_floor_${sectorId}_${variant % 3}`;
}

/** Shear fracture overlay — two authored frames, tinted per motif at runtime. */
export function crackTextureKey(urgent = false): string {
  return urgent ? 't_crack_hot' : 't_crack';
}
