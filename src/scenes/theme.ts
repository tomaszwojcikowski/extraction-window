import type { SectorId } from '../data/encounters';

/**
 * Halcyon field kit on the Meridian Shelf.
 *
 * Material story, not a UI kit: painted alloy cases scuffed back to bare metal,
 * bone-white silkscreen legends, reflective hazard tape, brine corrosion, and
 * whatever the local ecology is glowing with. Nothing here is a starship
 * console — no rounded elbow panels, no orange-on-black bridge chrome — and
 * nothing is a default "sci-fi glow": each emitter below has a motivated
 * colour temperature (see `LightTemp`).
 */

export const FONT_DATA = '"IBM Plex Mono", "Courier New", monospace';
export const FONT_DISPLAY = '"Share Tech Mono", "IBM Plex Mono", monospace';

/** @deprecated use FONT_DATA — kept for gradual imports */
export const FONT = FONT_DATA;

export const Theme = {
  // Structure — wet basalt, damp deck plate, painted alloy, machined bevel.
  ground: 0x121a1c,
  groundDeep: 0x06090a,
  panel: 0x182124,
  panelEdge: 0x36464a,

  // Ink — silkscreen legends on painted cases (bone, not phosphor).
  ink: 0xdfe4d5,
  inkBright: 0xf6f4e6,
  inkDim: 0x93a196,
  inkMute: 0x55635f,

  // Materials / status.
  /** Fauna + vent bioluminescence. */
  biolum: 0x54cbb2,
  biolumDeep: 0x1d6a63,
  /** Brine corrosion — damage, failure, rust. */
  rust: 0xc0512f,
  /** Surveyor's flagging tape — player-placed objectives and marks. */
  flag: 0xe0578f,
  /** Reflective hazard tape — the bus / stored charge. */
  tape: 0xe8b93c,
  /** Shear heat — the window closing. */
  arc: 0xe4622f,
  /** Overloaded arc blow-out — Breaching. */
  arcWhite: 0xcfefff,
  /** Sallow EM-HIGH scan wash. */
  scanWash: 0xbfd45e,
  safe: 0x6fa87a,

  // Fog / survey memory.
  fog: 0x030506,
  memory: 0x243033,

  // --- Legacy aliases (same values, older call sites) ----------------------
  /** @deprecated use `ink` */
  phosphor: 0xdfe4d5,
  /** @deprecated use `inkDim` */
  phosphorDim: 0x93a196,
  /** @deprecated use `inkBright` */
  phosphorBright: 0xf6f4e6,
  /** @deprecated use `inkMute` */
  phosphorMute: 0x55635f,
  /** @deprecated use `biolum` */
  ionHazard: 0x54cbb2,
  /** @deprecated use `biolumDeep` */
  ionHazardDeep: 0x1d6a63,
  /** @deprecated use `rust` */
  danger: 0xc0512f,
  /** @deprecated use `flag` */
  quest: 0xe0578f,
  /** @deprecated use `safe` */
  ok: 0x6fa87a,
  /** @deprecated use `tape` */
  energy: 0xe8b93c,
  /** @deprecated use `arc` */
  storm: 0xe4622f,
} as const;

export const ThemeCss = {
  ground: '#121a1c',
  groundDeep: '#06090a',
  panel: '#182124',
  ink: '#dfe4d5',
  inkBright: '#f6f4e6',
  inkDim: '#93a196',
  inkMute: '#55635f',
  biolum: '#54cbb2',
  rust: '#c0512f',
  flag: '#e0578f',
  tape: '#e8b93c',
  arc: '#e4622f',
  arcWhite: '#cfefff',
  safe: '#6fa87a',
  /** Quiet stance's red night filter. */
  lampQuiet: '#d8734a',
  hintBg: '#0d1416ee',

  // Legacy aliases
  phosphor: '#dfe4d5',
  phosphorDim: '#93a196',
  phosphorBright: '#f6f4e6',
  phosphorMute: '#55635f',
  danger: '#c0512f',
  quest: '#e0578f',
  text: '#dfe4d5',
  textDim: '#93a196',
  textMute: '#55635f',
} as const;

/**
 * Motivated colour temperatures. Every emitter in the world is a *thing* —
 * a hooded halogen, a magnesium stick, an animal, a corroded relay — and it
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
 * scrub scatters it (canopy/plains lift), brine reflects it (brine/flood cool
 * and bright), ash chokes it (ash/approach dark and warm-grey), duct swallows
 * it. Vertical-slice sectors this pass: plains (bright), duct (dark),
 * approach (pressure).
 */
export const BIOME_AMBIENT: Record<SectorId, BiomeAmbient> = {
  plains: { ambient: 0.44, tint: 0xffeccc },
  flood: { ambient: 0.34, tint: 0xbcd8e4 },
  canopy: { ambient: 0.34, tint: 0xc4dcb4 },
  reef: { ambient: 0.28, tint: 0xa8e8dc },
  spire: { ambient: 0.31, tint: 0xd4dce4 },
  ruin: { ambient: 0.32, tint: 0xe4ccac },
  beacon: { ambient: 0.37, tint: 0xffdcb0 },
  trench: { ambient: 0.26, tint: 0xccbc9c },
  duct: { ambient: 0.17, tint: 0xa4b0b8 },
  ash: { ambient: 0.26, tint: 0xdcbc98 },
  brine: { ambient: 0.32, tint: 0xa4d8e0 },
  vault: { ambient: 0.33, tint: 0xc4ccd8 },
  fissure: { ambient: 0.27, tint: 0xe4b49c },
  approach: { ambient: 0.21, tint: 0xd4b898 },
  ridge: { ambient: 0.4, tint: 0xe8e0c8 },
};

export function floorTextureKey(sectorId: SectorId, variant: number): string {
  return `t_floor_${sectorId}_${variant % 3}`;
}
