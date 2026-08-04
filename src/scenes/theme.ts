import type { SectorId } from '../data/encounters';

/** Halcyon survey chrome — orange/peach on deep space black (not olive phosphor). */

export const FONT_DATA = '"IBM Plex Mono", "Courier New", monospace';
export const FONT_DISPLAY = '"Share Tech Mono", "IBM Plex Mono", monospace';

/** @deprecated use FONT_DATA — kept for gradual imports */
export const FONT = FONT_DATA;

export const Theme = {
  // Ground / panels — space black + LCARS panels
  ground: 0x12121c,
  groundDeep: 0x06060c,
  panel: 0x1a1a28,
  panelEdge: 0x3a3a55,
  // LCARS ink (orange / peach / lavender)
  phosphor: 0xf0a040,
  phosphorDim: 0xc08050,
  phosphorBright: 0xffd0a0,
  phosphorMute: 0x6a5a78,
  // Status
  ionHazard: 0x66ccff,
  ionHazardDeep: 0x3377aa,
  danger: 0xcc4444,
  quest: 0x9999ff,
  ok: 0x44aa88,
  energy: 0xffcc66,
  storm: 0xff9933,
  // Fog / memory
  fog: 0x040408,
  memory: 0x2a2a40,
} as const;

export const ThemeCss = {
  ground: '#12121c',
  groundDeep: '#06060c',
  panel: '#1a1a28',
  phosphor: '#f0a040',
  phosphorDim: '#c08050',
  phosphorBright: '#ffd0a0',
  phosphorMute: '#6a5a78',
  danger: '#cc4444',
  quest: '#9999ff',
  text: '#f0a040',
  textDim: '#c08050',
  textMute: '#6a5a78',
  hintBg: '#12121cee',
} as const;

/** Light biome lifts — pattern carries identity; tint is secondary. */
export const BIOME_FLOOR_TINT: Record<SectorId, number> = {
  plains: 0xe8d8b8,
  flood: 0xa8c8e0,
  canopy: 0xb0d0a0,
  reef: 0x98d8d0,
  spire: 0xc8c0e0,
  ruin: 0xd0b090,
  beacon: 0xd0c8a0,
  trench: 0xb8a890,
  duct: 0x9890a8,
  ash: 0xc8a880,
  brine: 0x90c8d0,
  vault: 0xb0b0d0,
  fissure: 0xd0a090,
  approach: 0xc0b098,
  ridge: 0xd8d0b8,
};

/** Ambient field light (0–1) + cool/warm key tint per sector. */
export type BiomeAmbient = {
  /** Base brightness before dynamic sources (duct dark, plains brighter). */
  ambient: number;
  /** Soft multiply tint applied to lit tiles (Phaser tint). */
  tint: number;
};

export const BIOME_AMBIENT: Record<SectorId, BiomeAmbient> = {
  plains: { ambient: 0.42, tint: 0xfff0d8 },
  flood: { ambient: 0.34, tint: 0xc8e0f0 },
  canopy: { ambient: 0.36, tint: 0xd0e8c0 },
  reef: { ambient: 0.3, tint: 0xb8f0e8 },
  spire: { ambient: 0.32, tint: 0xe0d8f8 },
  ruin: { ambient: 0.33, tint: 0xf0d8b8 },
  beacon: { ambient: 0.38, tint: 0xffe8c0 },
  trench: { ambient: 0.28, tint: 0xd8c8a8 },
  duct: { ambient: 0.2, tint: 0xc0b8d0 },
  ash: { ambient: 0.3, tint: 0xe8c8a0 },
  brine: { ambient: 0.31, tint: 0xb0e0e8 },
  vault: { ambient: 0.35, tint: 0xd0d0f0 },
  fissure: { ambient: 0.29, tint: 0xf0c0a8 },
  approach: { ambient: 0.24, tint: 0xe0c8a8 },
  ridge: { ambient: 0.4, tint: 0xf0e8d0 },
};

export function floorTextureKey(sectorId: SectorId, variant: number): string {
  return `t_floor_${sectorId}_${variant % 3}`;
}
