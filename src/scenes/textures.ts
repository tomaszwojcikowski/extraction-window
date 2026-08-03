import Phaser from 'phaser';
import type { SectorId } from '../data/encounters';
import type { EnemyKind } from '../data/enemies';
import { Theme, floorTextureKey } from './theme';

/** Base pixel art size — rendered larger on screen for readability. */
export const TILE = 32;
export const TILE_DRAW = 36;

export { FONT_DATA as FONT, FONT_DATA, FONT_DISPLAY, BIOME_FLOOR_TINT } from './theme';

export function enemyTextureKey(kind: EnemyKind): string {
  return `t_enemy_${kind}`;
}

/** Wall contour family per biome — cliff / bulkhead / conduit. */
export type WallStyle = 'cliff' | 'bulkhead' | 'conduit';

export function wallStyleForSector(sectorId: SectorId): WallStyle {
  switch (sectorId) {
    case 'duct':
    case 'reef':
    case 'brine':
      return 'conduit';
    case 'vault':
    case 'beacon':
    case 'ruin':
    case 'spire':
    case 'trench':
      return 'bulkhead';
    default:
      return 'cliff';
  }
}

export function wallTextureKey(sectorId: SectorId, variant: number): string {
  return `t_wall_${wallStyleForSector(sectorId)}_${variant % 2}`;
}

type G = Phaser.GameObjects.Graphics;

function ink(g: G, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
}

function clearGround(g: G, T: number): void {
  g.clear();
  ink(g, Theme.groundDeep);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.ground);
  g.fillRect(1, 1, T - 2, T - 2);
}

function bake(g: G, key: string, T: number): void {
  g.generateTexture(key, T, T);
}

// --- Floors -----------------------------------------------------------------

function drawFloor(g: G, T: number, sector: SectorId, variant: number): void {
  clearGround(g, T);
  const v = variant;
  switch (sector) {
    case 'plains':
      // Sparse survey ticks / grass blades
      ink(g, Theme.phosphorMute, 0.5);
      for (let i = 0; i < 10; i++) {
        const px = 3 + ((i * 7 + v * 5) % (T - 6));
        const py = 3 + ((i * 11 + v * 3) % (T - 6));
        g.fillRect(px, py, 1, 1);
        if (i % 3 === 0) g.fillRect(px, py - 1, 1, 2);
      }
      break;
    case 'flood':
      // Wavelets — staggered horizontal ripples
      ink(g, Theme.phosphorMute, 0.65);
      for (let y = 4 + v; y < T - 3; y += 3) {
        const ox = (y + v) % 2;
        g.fillRect(3 + ox, y, T - 6 - ox, 1);
        if (y % 2 === 0) g.fillRect(6, y + 1, T - 12, 1);
      }
      ink(g, Theme.ionHazardDeep, 0.25);
      g.fillRect(8 + v, T - 8, 10, 1);
      break;
    case 'canopy':
      // Leaf ticks / dappled canopy
      ink(g, Theme.phosphorDim, 0.45);
      for (let i = 0; i < 8; i++) {
        const x = 4 + ((i * 5 + v * 2) % (T - 10));
        const y = 4 + ((i * 7 + v) % (T - 10));
        g.fillRect(x, y, 3, 1);
        g.fillRect(x + 1, y + 1, 1, 2);
        g.fillRect(x + 2, y + 1, 1, 1);
      }
      break;
    case 'reef':
      // Crystal shards — angled diamond chips
      ink(g, Theme.ionHazardDeep, 0.55);
      for (let i = 0; i < 7; i++) {
        const px = 4 + ((i * 6 + v * 4) % (T - 10));
        const py = 4 + ((i * 9 + v * 3) % (T - 10));
        g.fillRect(px + 1, py, 2, 1);
        g.fillRect(px, py + 1, 4, 2);
        g.fillRect(px + 1, py + 3, 2, 1);
        if (i % 2 === 0) {
          ink(g, Theme.ionHazard, 0.7);
          g.fillRect(px + 1, py + 1, 1, 1);
          ink(g, Theme.ionHazardDeep, 0.55);
        }
      }
      break;
    case 'spire':
      // Vertical isolinear risers
      ink(g, Theme.phosphorDim, 0.5);
      for (let x = 6 + v; x < T - 5; x += 7) {
        g.fillRect(x, 3, 1, T - 6);
        g.fillRect(x - 1, 5 + v, 3, 1);
        g.fillRect(x - 1, T - 8, 3, 1);
      }
      break;
    case 'ruin':
      // Broken masonry grid with collapsed block
      ink(g, Theme.phosphorMute, 0.6);
      for (let x = 3 + v; x < T - 3; x += 6) g.fillRect(x, 3, 1, T - 6);
      for (let y = 3 + (1 - (v % 2)); y < T - 3; y += 6) g.fillRect(3, y, T - 6, 1);
      ink(g, Theme.groundDeep);
      g.fillRect(10 + v, 10, 8, 7);
      ink(g, Theme.phosphorMute, 0.4);
      g.fillRect(11 + v, 11, 3, 2);
      break;
    case 'beacon':
      // Survey crosshair / ranging rings
      ink(g, Theme.phosphorMute, 0.45);
      {
        const c = T / 2;
        const r = 4 + v;
        g.fillRect(c - r, c - 0.5, r * 2 + 1, 1);
        g.fillRect(c - 0.5, c - r, 1, r * 2 + 1);
        g.fillRect(c - 2, c - 2, 5, 1);
        g.fillRect(c - 2, c + 2, 5, 1);
        if (v > 0) {
          g.fillRect(c - r - 2, c - 0.5, 2, 1);
          g.fillRect(c + r, c - 0.5, 2, 1);
        }
      }
      break;
    case 'trench':
      // Deep strata layers
      ink(g, Theme.phosphorMute, 0.65);
      for (let y = 5 + v; y < T - 4; y += 4) {
        g.fillRect(2, y, T - 4, 1);
        g.fillRect(5, y + 1, T - 10, 1);
        g.fillRect(3, y + 2, 2, 1);
      }
      break;
    case 'duct':
      // Pipe rings / conduit segments
      ink(g, Theme.phosphorMute, 0.65);
      for (let x = 5 + v; x < T - 5; x += 6) {
        g.fillRect(x, 4, 1, T - 8);
        g.fillRect(x - 2, 8 + v, 5, 1);
        g.fillRect(x - 2, 16 + (v % 2), 5, 1);
        ink(g, Theme.panelEdge, 0.5);
        g.fillRect(x - 1, 7 + v, 3, 3);
        ink(g, Theme.phosphorMute, 0.65);
      }
      ink(g, Theme.ionHazardDeep, 0.35);
      g.fillRect(7, 14 + (v % 2), T - 14, 1);
      break;
    case 'ash':
      // Cinder scatter
      ink(g, Theme.phosphorMute, 0.75);
      for (let i = 0; i < 18; i++) {
        const px = 2 + ((i * 5 + v * 7) % (T - 4));
        const py = 2 + ((i * 13 + v * 9) % (T - 4));
        g.fillRect(px, py, 1, 1);
        if (i % 4 === 0) g.fillRect(px + 1, py, 1, 1);
      }
      break;
    case 'brine':
      // Salt ripples + pool stain
      ink(g, Theme.phosphorMute, 0.7);
      for (let y = 3 + v; y < T - 3; y += 2) {
        g.fillRect(3 + (y % 2), y, T - 6 - (y % 2), 1);
      }
      ink(g, Theme.ionHazardDeep, 0.4);
      g.fillRect(9 + v, 10, 10, 6);
      ink(g, Theme.ionHazard, 0.25);
      g.fillRect(11 + v, 12, 5, 2);
      break;
    case 'vault':
      // Isolinear grid tiles
      ink(g, Theme.phosphorMute, 0.5);
      for (let y = 4; y < T - 4; y += 5) {
        for (let x = 4 + (((y / 5) | 0) + v) % 2 * 2; x < T - 4; x += 5) {
          g.fillRect(x, y, 3, 3);
          ink(g, Theme.phosphorDim, 0.35);
          g.fillRect(x + 1, y + 1, 1, 1);
          ink(g, Theme.phosphorMute, 0.5);
        }
      }
      break;
    case 'fissure':
      // Shear crack diagonals
      ink(g, Theme.phosphorMute, 0.65);
      for (let i = 0; i < T; i++) {
        const y = 5 + ((i * 2 + v * 4) % (T - 10));
        g.fillRect(i, y, 1, 2);
        if (i % 3 === 0) g.fillRect(i, y + 3, 1, 1);
      }
      ink(g, Theme.danger, 0.2);
      g.fillRect(4 + v, 14, T - 10, 1);
      break;
    case 'approach':
      // Storm-shear diagonals
      ink(g, Theme.phosphorMute, 0.65);
      for (let i = 0; i < T; i++) {
        const y = 4 + ((i * 3 + v * 2) % (T - 8));
        g.fillRect(i, y, 1, 1);
        g.fillRect((i + 3) % T, y + 2, 1, 1);
        g.fillRect((i + 6) % T, y + 4, 1, 1);
      }
      ink(g, Theme.storm, 0.3);
      g.fillRect(4 + v, 6, T - 10, 1);
      g.fillRect(6, T - 10 - v, T - 12, 1);
      break;
    case 'ridge':
      // Elevation contour ticks
      ink(g, Theme.phosphorMute, 0.6);
      for (let i = 0; i < T; i++) {
        const y = 4 + ((i + v * 3) % (T - 8));
        g.fillRect(i, y, 1, 1);
        if (i % 4 === 0) g.fillRect(i, y + 2, 1, 2);
      }
      break;
  }
}

// --- Walls ------------------------------------------------------------------

function drawWall(g: G, T: number, style: WallStyle, variant: number): void {
  clearGround(g, T);
  const v = variant;
  if (style === 'cliff') {
    ink(g, Theme.phosphorMute);
    g.fillRect(1, 1, T - 2, T - 2);
    ink(g, Theme.groundDeep);
    for (let i = 4; i < T - 4; i += 3) {
      g.fillRect(3, i + (v % 2), 5, 1);
      g.fillRect(T - 9, i + 1, 5, 1);
    }
    ink(g, Theme.phosphorDim);
    g.fillRect(2, 2, T - 4, 2);
    g.fillRect(2, T - 4, T - 4, 1);
  } else if (style === 'bulkhead') {
    ink(g, Theme.phosphorMute);
    g.fillRect(1, 1, T - 2, T - 2);
    ink(g, Theme.panel);
    g.fillRect(3, 3, T - 6, T - 6);
    ink(g, Theme.groundDeep);
    for (let i = 4; i < T - 4; i += 3) g.fillRect(i, 5, 1, T - 10);
    ink(g, Theme.phosphor);
    g.fillRect(5, T - 6, T - 10, 1);
    if (v > 0) {
      ink(g, Theme.phosphorDim);
      g.fillRect(T / 2 - 1, 4, 2, 4);
    }
  } else {
    // conduit
    ink(g, Theme.phosphorMute);
    g.fillRect(1, 1, T - 2, T - 2);
    ink(g, Theme.panel);
    g.fillRect(3, 3, T - 6, T - 6);
    ink(g, Theme.groundDeep);
    g.fillRect(6, 4, T - 12, T - 8);
    ink(g, Theme.ionHazardDeep, 0.5);
    for (let y = 6 + v; y < T - 6; y += 5) {
      g.fillRect(5, y, T - 10, 2);
      ink(g, Theme.panelEdge);
      g.fillRect(8, y - 1, 3, 4);
      ink(g, Theme.ionHazardDeep, 0.5);
    }
  }
}

// --- Props ------------------------------------------------------------------

function drawProp(
  g: G,
  T: number,
  kind: 'scrub' | 'rubble' | 'vent' | 'hazard' | 'exit' | 'beacon' | 'shuttle' | 'poi',
  frame = 0,
): void {
  clearGround(g, T);
  switch (kind) {
    case 'scrub':
      ink(g, Theme.phosphorDim);
      g.fillRect(7, 10, 1, 12);
      g.fillRect(14, 6, 1, 16);
      g.fillRect(22, 12, 1, 8);
      ink(g, Theme.phosphor);
      g.fillRect(6, 8, 3, 2);
      g.fillRect(13, 4, 3, 2);
      g.fillRect(21, 10, 3, 2);
      break;
    case 'rubble':
      ink(g, Theme.phosphorMute);
      g.fillRect(4, 16, 10, 7);
      g.fillRect(15, 9, 11, 8);
      g.fillRect(8, 6, 6, 5);
      ink(g, Theme.phosphorDim);
      g.fillRect(5, 17, 4, 3);
      g.fillRect(17, 11, 5, 3);
      break;
    case 'vent':
      ink(g, Theme.panel);
      g.fillRect(1, 1, T - 2, T - 2);
      ink(g, Theme.phosphorDim);
      for (let y = 5 + frame; y < T - 4; y += 5) g.fillRect(5, y, T - 10, 2);
      ink(g, Theme.phosphor);
      g.fillRect(5, 5 + frame, T - 10, 1);
      ink(g, Theme.ionHazard, 0.35);
      g.fillRect(T / 2 - 1, 8, 2, T - 16);
      break;
    case 'hazard':
      ink(g, Theme.ionHazardDeep);
      g.fillRect(1, 1, T - 2, T - 2);
      ink(g, Theme.ionHazard);
      // Warning chevron / plasma bolt
      g.fillRect(T / 2 - 1, 5 + frame, 3, 14);
      g.fillRect(8, 11 + frame, 16, 3);
      g.fillRect(10, 8 + frame, 3, 3);
      g.fillRect(19, 8 + frame, 3, 3);
      ink(g, Theme.phosphorBright);
      g.fillRect(T / 2 - 1, 6 + frame, 3, 3);
      break;
    case 'exit':
      // Survey hatch — door frame + flag
      ink(g, Theme.ok);
      g.fillRect(1, 1, T - 2, T - 2);
      ink(g, Theme.groundDeep);
      g.fillRect(6, 6, T - 12, T - 12);
      ink(g, Theme.panel);
      g.fillRect(8, 8, T - 16, T - 16);
      ink(g, Theme.phosphorBright);
      g.fillRect(14, 4, 2, 20);
      g.fillRect(16, 4, 8, 6);
      ink(g, Theme.ok);
      g.fillRect(17, 5, 5, 3);
      break;
    case 'beacon':
      // Mast + LCARS console glow
      ink(g, Theme.panel);
      g.fillRect(1, 1, T - 2, T - 2);
      ink(g, Theme.phosphorDim);
      g.fillRect(14, 5, 3, 18);
      g.fillRect(9, 20, 13, 4);
      ink(g, Theme.phosphor);
      g.fillRect(10, 21, 11, 1);
      ink(g, Theme.phosphorBright);
      g.fillRect(13, 3 + frame, 5, 5);
      if (frame >= 1) {
        ink(g, Theme.storm, 0.7);
        g.fillRect(12, 2, 7, 2);
      }
      if (frame >= 2) {
        ink(g, Theme.phosphor);
        g.fillRect(11, 2, 9, 2);
      }
      break;
    case 'shuttle':
      // Landing pad cross + corner marks
      ink(g, Theme.ok);
      g.fillRect(1, 1, T - 2, T - 2);
      ink(g, Theme.groundDeep);
      g.fillRect(5, 5, T - 10, T - 10);
      ink(g, Theme.phosphorBright);
      g.fillRect(6, 14, T - 12, 3);
      g.fillRect(14, 6, 3, T - 12);
      ink(g, Theme.energy);
      g.fillRect(5, 5, 4, 1);
      g.fillRect(T - 9, 5, 4, 1);
      g.fillRect(5, T - 6, 4, 1);
      g.fillRect(T - 9, T - 6, 4, 1);
      break;
    case 'poi':
      // Landmark asterisk stamp
      ink(g, Theme.quest);
      g.fillRect(1, 1, T - 2, T - 2);
      ink(g, Theme.groundDeep);
      g.fillRect(5, 5, T - 10, T - 10);
      ink(g, Theme.phosphorBright);
      g.fillRect(14, 6 + frame, 3, 16);
      g.fillRect(7, 14, 17, 3);
      g.fillRect(8, 8, 3, 3);
      g.fillRect(20, 8, 3, 3);
      g.fillRect(8, 20, 3, 3);
      g.fillRect(20, 20, 3, 3);
      if (frame >= 2) {
        ink(g, Theme.phosphor);
        g.fillRect(13, 13, 5, 5);
      }
      break;
  }
}

function drawFog(g: G, T: number): void {
  g.clear();
  ink(g, Theme.fog);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.ground, 0.35);
  g.fillRect(6, 8, 1, 1);
  g.fillRect(18, 14, 1, 1);
  g.fillRect(12, 22, 1, 1);
  g.fillRect(24, 6, 1, 1);
}

function drawMemory(g: G, T: number): void {
  g.clear();
  ink(g, 0x000000);
  g.fillRect(0, 0, T, T);
}

// --- Player -----------------------------------------------------------------

function drawPlayer(g: G, T: number): void {
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  // Away suit body
  ink(g, 0x1a2840);
  g.fillRect(9, 8, 14, 18);
  // Jacket / torso
  ink(g, 0x2a5080);
  g.fillRect(10, 6, 12, 8);
  // Helmet dome
  ink(g, 0x1e3048);
  g.fillRect(11, 3, 10, 6);
  // Visor gleam
  ink(g, Theme.phosphorBright);
  g.fillRect(12, 5, 8, 3);
  ink(g, Theme.ionHazard, 0.6);
  g.fillRect(13, 6, 5, 1);
  // Combadge
  ink(g, Theme.phosphor);
  g.fillRect(12, 10, 4, 3);
  ink(g, Theme.phosphorBright);
  g.fillRect(13, 11, 2, 1);
  // Pack
  ink(g, 0x3a3a50);
  g.fillRect(7, 14, 4, 8);
  g.fillRect(21, 14, 4, 8);
  ink(g, Theme.phosphorDim);
  g.fillRect(8, 15, 2, 2);
  g.fillRect(22, 15, 2, 2);
  // Boots
  ink(g, 0x0e1520);
  g.fillRect(10, 24, 5, 3);
  g.fillRect(17, 24, 5, 3);
}

// --- Items / quest ----------------------------------------------------------

function drawItemCrate(g: G, T: number): void {
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.quest);
  g.fillRect(6, 8, 20, 16);
  ink(g, Theme.groundDeep);
  g.fillRect(8, 10, 16, 12);
  ink(g, Theme.phosphorBright);
  g.fillRect(10, 13, 12, 5);
  ink(g, Theme.phosphor);
  g.fillRect(14, 8, 4, 3);
}

function drawKeyCrystal(g: G, T: number): void {
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.quest);
  g.fillRect(14, 4, 4, 22);
  g.fillRect(10, 8, 12, 4);
  g.fillRect(11, 18, 10, 3);
  ink(g, Theme.phosphorBright);
  g.fillRect(15, 6, 2, 8);
  g.fillRect(13, 9, 6, 2);
}

function drawNavCore(g: G, T: number): void {
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  // Octahedron silhouette
  ink(g, Theme.quest);
  g.fillRect(14, 4, 4, 2);
  g.fillRect(11, 6, 10, 3);
  g.fillRect(8, 9, 16, 6);
  g.fillRect(11, 15, 10, 4);
  g.fillRect(13, 19, 6, 3);
  g.fillRect(14, 22, 4, 2);
  ink(g, Theme.phosphorBright);
  g.fillRect(14, 10, 4, 4);
  ink(g, 0xccaaff);
  g.fillRect(15, 11, 2, 2);
}

// --- Enemies ----------------------------------------------------------------

function drawEnemy(g: G, T: number, kind: EnemyKind): void {
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);

  switch (kind) {
    case 'mite':
      // Compact beetle
      ink(g, Theme.phosphorDim);
      g.fillRect(8, 12, 16, 10);
      ink(g, 0x88cc44);
      g.fillRect(10, 10, 12, 8);
      ink(g, Theme.groundDeep);
      g.fillRect(12, 13, 2, 2);
      g.fillRect(18, 13, 2, 2);
      ink(g, Theme.phosphor);
      g.fillRect(7, 14, 2, 1);
      g.fillRect(23, 14, 2, 1);
      break;
    case 'spore':
      // Pulsing orb with spikes
      ink(g, Theme.ionHazardDeep);
      g.fillCircle(16, 16, 10);
      ink(g, Theme.ionHazard);
      g.fillCircle(16, 16, 6);
      ink(g, Theme.groundDeep);
      g.fillRect(13, 13, 3, 3);
      ink(g, Theme.phosphorBright);
      g.fillRect(15, 6, 2, 3);
      g.fillRect(15, 23, 2, 3);
      g.fillRect(6, 15, 3, 2);
      g.fillRect(23, 15, 3, 2);
      break;
    case 'wasp':
      // Winged skirmisher
      ink(g, Theme.storm);
      g.fillRect(10, 10, 12, 10);
      ink(g, Theme.phosphorBright);
      g.fillRect(4, 11, 6, 5);
      g.fillRect(22, 11, 6, 5);
      ink(g, Theme.groundDeep);
      g.fillRect(12, 12, 3, 3);
      g.fillRect(17, 12, 3, 3);
      ink(g, Theme.danger);
      g.fillRect(14, 20, 4, 4);
      break;
    case 'stalker':
      // Tall thin hunter
      ink(g, Theme.phosphorDim);
      g.fillRect(13, 2, 6, 24);
      ink(g, Theme.phosphor);
      g.fillRect(12, 4, 5, 20);
      ink(g, Theme.danger);
      g.fillRect(13, 8, 3, 3);
      ink(g, Theme.groundDeep);
      g.fillRect(10, 24, 4, 3);
      g.fillRect(18, 24, 4, 3);
      break;
    case 'leech':
      // Horizontal sucker
      ink(g, 0x4a7080);
      g.fillRect(3, 12, 24, 8);
      ink(g, Theme.phosphor);
      g.fillRect(22, 13, 6, 6);
      ink(g, Theme.danger);
      g.fillRect(24, 15, 3, 2);
      ink(g, Theme.ionHazardDeep);
      g.fillRect(6, 14, 4, 4);
      break;
    case 'crawler':
      // Wide armored plate
      ink(g, Theme.quest);
      g.fillRect(4, 10, 24, 14);
      ink(g, Theme.phosphorBright);
      g.fillRect(7, 12, 5, 5);
      g.fillRect(20, 12, 5, 5);
      ink(g, Theme.groundDeep);
      g.fillRect(8, 22, 4, 3);
      g.fillRect(20, 22, 4, 3);
      break;
    case 'sentinel':
      // Blocky guard turret
      ink(g, Theme.phosphorMute);
      g.fillRect(6, 4, 20, 24);
      ink(g, Theme.phosphor);
      g.fillRect(9, 7, 14, 18);
      ink(g, Theme.danger);
      g.fillRect(11, 10, 10, 4);
      ink(g, Theme.phosphorBright);
      g.fillRect(14, 18, 4, 4);
      break;
    case 'serpent':
      // S-curve body
      ink(g, Theme.danger);
      g.fillRect(5, 8, 7, 16);
      g.fillRect(10, 5, 12, 7);
      g.fillRect(18, 10, 7, 14);
      ink(g, Theme.phosphorBright);
      g.fillRect(20, 12, 3, 3);
      ink(g, Theme.groundDeep);
      g.fillRect(6, 20, 4, 2);
      break;
    case 'wraith':
      // Hollow ion ghost outline
      ink(g, Theme.ionHazard);
      g.fillRect(10, 3, 12, 3);
      g.fillRect(8, 6, 3, 16);
      g.fillRect(21, 6, 3, 16);
      g.fillRect(10, 22, 12, 3);
      ink(g, Theme.phosphorBright);
      g.fillRect(12, 10, 3, 3);
      g.fillRect(17, 10, 3, 3);
      break;
    case 'drone':
      // Hover disc with sensors
      ink(g, Theme.phosphorMute);
      g.fillRect(6, 8, 20, 14);
      ink(g, Theme.phosphor);
      g.fillRect(9, 10, 14, 10);
      ink(g, Theme.danger);
      g.fillRect(13, 13, 6, 3);
      ink(g, Theme.phosphorBright);
      g.fillRect(7, 5, 5, 4);
      g.fillRect(20, 5, 5, 4);
      break;
    case 'mastling':
      // Mini mast / antenna beast
      ink(g, Theme.ionHazard);
      g.fillRect(14, 3, 4, 22);
      g.fillRect(8, 8, 16, 3);
      g.fillRect(10, 18, 12, 3);
      ink(g, Theme.phosphorBright);
      g.fillRect(13, 12, 6, 5);
      break;
    case 'skitter':
      // Low multi-leg
      ink(g, Theme.quest);
      g.fillRect(4, 15, 24, 6);
      g.fillRect(6, 10, 5, 6);
      g.fillRect(21, 10, 5, 6);
      ink(g, Theme.phosphorBright);
      g.fillRect(10, 16, 3, 3);
      ink(g, Theme.groundDeep);
      g.fillRect(5, 20, 2, 4);
      g.fillRect(12, 20, 2, 4);
      g.fillRect(18, 20, 2, 4);
      g.fillRect(25, 20, 2, 4);
      break;
    case 'rift':
      // Twin pillars + core
      ink(g, Theme.danger);
      g.fillRect(5, 4, 5, 22);
      g.fillRect(22, 4, 5, 22);
      ink(g, Theme.ionHazard);
      g.fillRect(11, 10, 10, 10);
      ink(g, Theme.phosphorBright);
      g.fillRect(14, 13, 4, 4);
      break;
    case 'reef_skitter':
      // Crystal-legged reef crawler
      ink(g, 0x44aa88);
      g.fillRect(4, 14, 24, 7);
      g.fillRect(5, 8, 6, 6);
      g.fillRect(21, 8, 6, 6);
      ink(g, Theme.ionHazard);
      g.fillRect(12, 15, 3, 3);
      ink(g, Theme.phosphorBright);
      g.fillRect(7, 9, 2, 2);
      g.fillRect(23, 9, 2, 2);
      ink(g, 0x2a6655);
      g.fillRect(6, 20, 2, 4);
      g.fillRect(14, 20, 2, 4);
      g.fillRect(22, 20, 2, 4);
      break;
    case 'duct_drone':
      // Boxy maintenance drone
      ink(g, 0x708090);
      g.fillRect(7, 6, 18, 18);
      ink(g, Theme.phosphorMute);
      g.fillRect(10, 9, 12, 12);
      ink(g, Theme.storm);
      g.fillRect(13, 12, 6, 3);
      ink(g, Theme.ionHazardDeep);
      g.fillRect(8, 4, 4, 3);
      g.fillRect(20, 4, 4, 3);
      ink(g, Theme.phosphorDim);
      g.fillRect(11, 22, 10, 2);
      break;
    case 'shear_wraith':
      // Storm-shear hollow outline
      ink(g, 0xa8d0f0);
      g.fillRect(11, 2, 10, 3);
      g.fillRect(8, 5, 3, 18);
      g.fillRect(21, 5, 3, 18);
      g.fillRect(11, 23, 10, 3);
      ink(g, Theme.danger);
      g.fillRect(13, 10, 6, 3);
      ink(g, Theme.storm, 0.7);
      g.fillRect(6, 8, 2, 8);
      g.fillRect(24, 8, 2, 8);
      break;
  }
}

/** Cartographic / LCARS tile grammar — hatches & stamps for Delta survey ops. */
export function registerTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const T = TILE;

  const styles: WallStyle[] = ['cliff', 'bulkhead', 'conduit'];
  for (const style of styles) {
    for (let v = 0; v < 2; v++) {
      drawWall(g, T, style, v);
      bake(g, `t_wall_${style}_${v}`, T);
    }
  }
  // Legacy wall aliases
  drawWall(g, T, 'cliff', 0);
  bake(g, 't_wall', T);
  drawWall(g, T, 'cliff', 1);
  bake(g, 't_wall_1', T);

  const sectors: SectorId[] = [
    'plains',
    'flood',
    'canopy',
    'reef',
    'spire',
    'ruin',
    'beacon',
    'trench',
    'duct',
    'ash',
    'brine',
    'vault',
    'fissure',
    'approach',
    'ridge',
  ];
  for (const id of sectors) {
    for (let v = 0; v < 3; v++) {
      drawFloor(g, T, id, v);
      bake(g, floorTextureKey(id, v), T);
    }
  }
  // Legacy floor aliases
  drawFloor(g, T, 'plains', 0);
  bake(g, 't_floor', T);
  bake(g, 't_floor_0', T);
  drawFloor(g, T, 'plains', 1);
  bake(g, 't_floor_1', T);
  drawFloor(g, T, 'plains', 2);
  bake(g, 't_floor_2', T);

  drawProp(g, T, 'scrub');
  bake(g, 't_scrub', T);
  drawProp(g, T, 'rubble');
  bake(g, 't_rubble', T);

  for (let f = 0; f < 3; f++) {
    drawProp(g, T, 'vent', f);
    bake(g, f === 0 ? 't_vent' : `t_vent_${f}`, T);
    drawProp(g, T, 'hazard', f);
    bake(g, f === 0 ? 't_hazard' : `t_hazard_${f}`, T);
    drawProp(g, T, 'beacon', f);
    bake(g, f === 0 ? 't_beacon' : `t_beacon_${f}`, T);
    drawProp(g, T, 'poi', f);
    bake(g, f === 0 ? 't_poi' : `t_poi_${f}`, T);
  }

  drawProp(g, T, 'exit');
  bake(g, 't_exit', T);
  drawProp(g, T, 'shuttle');
  bake(g, 't_shuttle', T);

  drawFog(g, T);
  bake(g, 't_fog', T);
  drawMemory(g, T);
  bake(g, 't_memory', T);

  drawPlayer(g, T);
  bake(g, 't_player', T);

  drawItemCrate(g, T);
  bake(g, 't_item', T);
  drawKeyCrystal(g, T);
  bake(g, 't_quest', T);
  bake(g, 't_key', T);
  drawNavCore(g, T);
  bake(g, 't_nav_core', T);

  const kinds: EnemyKind[] = [
    'mite',
    'spore',
    'wasp',
    'stalker',
    'leech',
    'crawler',
    'sentinel',
    'serpent',
    'wraith',
    'drone',
    'mastling',
    'skitter',
    'rift',
    'reef_skitter',
    'duct_drone',
    'shear_wraith',
  ];
  for (const kind of kinds) {
    drawEnemy(g, T, kind);
    bake(g, enemyTextureKey(kind), T);
  }

  g.destroy();
}
