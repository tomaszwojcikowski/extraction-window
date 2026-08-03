import type { SectorId } from '../data/encounters';

/** Helix field-plotter visual theme — phosphor amber on olive-black, not cyan cyber. */

export const FONT_DATA = '"IBM Plex Mono", "Courier New", monospace';
export const FONT_DISPLAY = '"Share Tech Mono", "IBM Plex Mono", monospace';

/** @deprecated use FONT_DATA — kept for gradual imports */
export const FONT = FONT_DATA;

export const Theme = {
  // Ground / panels
  ground: 0x1a1c14,
  groundDeep: 0x12140e,
  panel: 0x22261a,
  panelEdge: 0x3a4030,
  // Phosphor ink
  phosphor: 0xc4b48a,
  phosphorDim: 0x8a9a4a,
  phosphorBright: 0xe8dcc0,
  phosphorMute: 0x5a6048,
  // Status
  ionHazard: 0xd0e8a0,
  ionHazardDeep: 0x6a8040,
  danger: 0xb05040,
  quest: 0xc08050,
  ok: 0x8aaa50,
  energy: 0xa0b070,
  storm: 0xc4a060,
  // Fog / memory
  fog: 0x0e100c,
  memory: 0x3a4030,
} as const;

export const ThemeCss = {
  ground: '#1a1c14',
  groundDeep: '#12140e',
  panel: '#22261a',
  phosphor: '#c4b48a',
  phosphorDim: '#8a9a4a',
  phosphorBright: '#e8dcc0',
  phosphorMute: '#5a6048',
  danger: '#b05040',
  quest: '#c08050',
  text: '#c4b48a',
  textDim: '#8a9a4a',
  textMute: '#5a6048',
  hintBg: '#1a1c14ee',
} as const;

/** Light biome lifts — pattern carries identity; tint is secondary. */
export const BIOME_FLOOR_TINT: Record<SectorId, number> = {
  plains: 0xe8e0c0,
  flood: 0xc0d0c8,
  canopy: 0xc8d8b0,
  spire: 0xd0d8c0,
  ruin: 0xd8c8a8,
  beacon: 0xd0d0b8,
  trench: 0xc8c0a8,
  ash: 0xd0c0a0,
  brine: 0xb8d0c8,
  vault: 0xc8c8b0,
  fissure: 0xd0b8a8,
  ridge: 0xd8d0b0,
};

export function floorTextureKey(sectorId: SectorId, variant: number): string {
  return `t_floor_${sectorId}_${variant % 3}`;
}
