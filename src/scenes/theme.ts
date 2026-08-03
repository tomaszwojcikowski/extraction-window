import type { SectorId } from '../data/encounters';

/** Voyager LCARS-adjacent theme — orange/peach on deep space black (not olive phosphor). */

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
  spire: 0xc8c0e0,
  ruin: 0xd0b090,
  beacon: 0xd0c8a0,
  trench: 0xb8a890,
  ash: 0xc8a880,
  brine: 0x90c8d0,
  vault: 0xb0b0d0,
  fissure: 0xd0a090,
  ridge: 0xd8d0b8,
};

export function floorTextureKey(sectorId: SectorId, variant: number): string {
  return `t_floor_${sectorId}_${variant % 3}`;
}
