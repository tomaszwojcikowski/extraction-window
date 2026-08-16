import Phaser from 'phaser';
import type { SectorId } from '../../data/encounters';
import { ENEMIES, type EnemyKind } from '../../data/enemies';
import { BIOME_FLOOR_TINT, Material, Theme } from '../theme';
import type { WallStyle } from '../textures';
import { mix, shade } from './color';

type G = Phaser.GameObjects.Graphics;
type Q = (value: number) => number;

export type DeluxePropKind =
  | 'scrub'
  | 'rubble'
  | 'vent'
  | 'hazard'
  | 'exit'
  | 'beacon'
  | 'shuttle'
  | 'landmark'
  | 'quest'
  | 'sealed'
  | 'tripwire'
  | 'brine_pool'
  | 'scrub_nest';

function unit(T: number): (value: number) => number {
  const u = T / 48;
  return (value: number) => Math.round(value * u);
}

function transparent(g: G, T: number): void {
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
}

function floorAccent(sector: SectorId): number {
  switch (sector) {
    case 'flood':
    case 'brine':
      return Theme.biolum;
    case 'reef':
    case 'canopy':
      return Theme.safe;
    case 'fissure':
    case 'approach':
    case 'ash':
      return Theme.arc;
    case 'spire':
    case 'vault':
      return Theme.arcWhite;
    default:
      return Theme.inkDim;
  }
}

/** Five-layer biome floor: base, grain, edge wear, contact shade, sparse decal. */
export function drawDeluxeFloor(g: G, T: number, sector: SectorId, variant: number): void {
  const q = unit(T);
  const tint = BIOME_FLOOR_TINT[sector];
  const base = mix(Theme.ground, tint, 0.1);
  const accent = floorAccent(sector);
  g.clear();

  // Base slab.
  g.fillStyle(Theme.groundDeep, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(base, 1);
  g.fillRect(q(1), q(1), T - q(2), T - q(2));
  g.fillStyle(mix(base, accent, 0.08), 1);
  g.fillRect(q(3), q(3), T - q(6), T - q(7));

  // Deterministic micro-noise.
  for (let i = 0; i < 18; i++) {
    const x = q(4 + ((i * 13 + variant * 7) % 40));
    const y = q(4 + ((i * 19 + variant * 11) % 38));
    g.fillStyle(i % 3 === 0 ? shade(tint, 0.38) : accent, i % 3 === 0 ? 0.28 : 0.16);
    g.fillRect(x, y, q(i % 5 === 0 ? 2 : 1), q(1));
  }

  // Worn bevel and floor-contact shadow.
  g.fillStyle(mix(base, tint, 0.2), 0.45);
  g.fillRect(q(2), q(2), T - q(4), q(1));
  g.fillRect(q(2), q(3), q(1), T - q(7));
  g.fillStyle(Theme.groundDeep, 0.58);
  g.fillRect(q(2), T - q(4), T - q(4), q(2));
  g.fillRect(T - q(4), q(4), q(2), T - q(8));

  FLOOR_DECAL[sector]({ g, q, T, variant, accent, tint });
}

/** What the surveyor's boots are actually on, sector by sector. */
type FloorPaint = {
  g: G;
  q: Q;
  T: number;
  variant: number;
  accent: number;
  tint: number;
};

/**
 * The decal layer is where a biome earns its identity.
 *
 * Tint is a lift, not a costume — two sectors that share a motif and differ
 * only by colour read as the same place once the lighting changes, which it
 * constantly does. So every sector gets its own ground story here, and none of
 * them is allowed to be another one's palette swap.
 */
const FLOOR_DECAL: Record<SectorId, (p: FloorPaint) => void> = {
  /**
   * Open shelf: loose grit the wind has been working on, and not much else.
   * Read as scatter, so it cannot be confused with ridge's banding.
   */
  plains: ({ g, q, variant, accent, tint }) => {
    g.fillStyle(shade(tint, 0.55), 0.65);
    for (let i = 0; i < 11; i++) {
      const x = q(5 + ((i * 13 + variant * 7) % 36));
      const y = q(6 + ((i * 17 + variant * 11) % 34));
      const big = i % 5 === 0;
      g.fillRect(x, y, q(big ? 3 : 2), q(big ? 2 : 1));
      g.fillStyle(Theme.groundDeep, 0.55);
      g.fillRect(x, y + q(big ? 2 : 1), q(big ? 3 : 2), q(1));
      g.fillStyle(shade(tint, 0.55), 0.65);
    }
    // Sparse pebble clusters — still scatter, not ledges.
    g.fillStyle(mix(Material.rock, tint, 0.25), 0.55);
    g.fillRect(q(10 + variant * 2), q(18), q(2), q(2));
    g.fillRect(q(13 + variant), q(19), q(1), q(1));
    g.fillRect(q(28 - variant), q(27), q(2), q(1));
    g.fillStyle(accent, 0.18);
    g.fillRect(q(9), q(14 + variant * 2), q(4), q(1));
    g.fillRect(q(30), q(33 - variant), q(5), q(1));
  },

  /**
   * High stone worn back to its bedding planes — thick ledges, each stepped
   * back from the one under it and casting into it.
   */
  ridge: ({ g, q, T, variant, accent }) => {
    for (let i = 0; i < 3; i++) {
      const y = q(8 + i * 12);
      const step = q(i * 4 + variant * 2);
      const w = T - q(8) - step;
      g.fillStyle(mix(Material.rock, accent, 0.2), 0.55);
      g.fillRect(q(4) + step, y, w, q(5));
      g.fillStyle(accent, 0.28);
      g.fillRect(q(4) + step, y, w, q(1));
      g.fillStyle(Theme.groundDeep, 0.75);
      g.fillRect(q(4) + step, y + q(5), w, q(2));
      // Chip bites on the lip so ledges aren't ruler-straight.
      g.fillStyle(Material.recess, 0.7);
      g.fillRect(q(10 + i * 9 + variant * 2) + step, y + q(1), q(3), q(2));
    }
  },

  /** Leaf litter and a root run under it. */
  canopy: ({ g, q, variant, accent }) => {
    g.fillStyle(mix(Material.foliage, accent, 0.35), 0.55);
    for (let i = 0; i < 7; i++) {
      const x = q(6 + ((i * 11 + variant * 4) % 32));
      const y = q(7 + ((i * 13 + variant * 7) % 30));
      g.fillTriangle(x, y + q(2), x + q(3), y, x + q(5), y + q(3));
      g.fillRect(x + q(1), y + q(2), q(3), q(1));
    }
    // Root run with a darker underside.
    g.lineStyle(q(3), mix(Material.foliage, Theme.groundDeep, 0.4), 0.55);
    g.lineBetween(q(4), q(32 + variant), q(22), q(25));
    g.lineBetween(q(22), q(25), q(44), q(31 - variant * 2));
    g.lineStyle(q(1), shade(accent, 0.65), 0.4);
    g.lineBetween(q(5), q(31 + variant), q(22), q(24));
    g.lineBetween(q(22), q(24), q(43), q(30 - variant * 2));
  },

  /** A film of standing water still ringing from something that moved. */
  flood: ({ g, q, T, variant, accent }) => {
    const cx = T / 2 + q(variant * 3 - 3);
    const cy = T / 2 - q(2);
    g.fillStyle(mix(Material.brine, accent, 0.25), 0.22);
    g.fillEllipse(q(6), q(10), T - q(12), T - q(18));
    for (let r = 0; r < 3; r++) {
      g.lineStyle(q(1), accent, 0.42 - r * 0.1);
      g.strokeCircle(cx, cy, q(5 + r * 6));
    }
    // Specular skim — motivated reflection, not a UI ring.
    g.fillStyle(Theme.inkBright, 0.22);
    g.fillRect(cx - q(6), cy - q(8), q(8), q(1));
    g.fillStyle(accent, 0.25);
    g.fillRect(q(5), q(38), T - q(10), q(2));
    g.fillStyle(Theme.groundDeep, 0.35);
    g.fillRect(q(5), q(40), T - q(10), q(1));
  },

  /** Evaporated salt, cracked into irregular crust cells — never a duct grate. */
  brine: ({ g, q, T, variant, accent }) => {
    g.lineStyle(q(1), mix(accent, Theme.inkMute, 0.3), 0.5);
    const cells = [
      [6, 8, 18, 16],
      [20, 6, 16, 14],
      [8, 22, 14, 16],
      [24, 20, 18, 18],
      [14, 14, 12, 12],
    ] as const;
    for (let i = 0; i < cells.length; i++) {
      const [x, y, w, h] = cells[i]!;
      const ox = q(((i + variant) % 3) - 1);
      g.strokeRect(q(x) + ox, q(y), q(w), q(h));
    }
    g.fillStyle(accent, 0.28);
    g.fillRect(q(12 + variant), q(12), q(3), q(3));
    g.fillRect(q(28 - variant), q(26), q(2), q(2));
    g.fillStyle(Theme.biolumDeep, 0.2);
    g.fillRect(q(8), T - q(10), T - q(16), q(2));
  },

  /** Calcified growth pushing up through the floor. */
  reef: ({ g, q, variant, accent }) => {
    for (let i = 0; i < 5; i++) {
      const x = q(6 + ((i * 11 + variant * 3) % 32));
      const y = q(8 + ((i * 7 + variant * 5) % 26));
      g.fillStyle(mix(Material.rock, accent, 0.35), 0.7);
      g.fillRect(x + q(1), y + q(5), q(5), q(2));
      g.fillStyle(accent, 0.5);
      g.fillTriangle(x, y + q(7), x + q(3), y, x + q(7), y + q(7));
      g.fillStyle(Theme.inkBright, 0.2);
      g.fillRect(x + q(2), y + q(2), q(1), q(3));
    }
  },

  /** Fallout, drifted into dunes against whatever stopped it. */
  ash: ({ g, q, T, variant, accent, tint }) => {
    for (let i = 0; i < 3; i++) {
      const y = q(12 + i * 11 + variant);
      const crest = q(12 + i * 9 + variant * 2);
      g.fillStyle(shade(tint, 0.45), 0.55);
      g.fillTriangle(q(3), y + q(7), crest, y - q(2), T - q(3), y + q(7));
      g.fillStyle(Theme.groundDeep, 0.65);
      g.fillTriangle(crest, y - q(2), T - q(3), y + q(7), crest + q(3), y + q(7));
      g.fillStyle(mix(accent, tint, 0.3), 0.25);
      g.fillRect(crest - q(2), y, q(4), q(1));
    }
    g.fillStyle(accent, 0.45);
    for (let i = 0; i < 14; i++) {
      const x = q(4 + ((i * 9 + variant * 5) % 38));
      const y = q(5 + ((i * 7 + variant * 13) % 14));
      g.fillRect(x, y, q(i % 3 === 0 ? 2 : 1), q(1));
    }
  },

  /** Ground that has already split, and is still deciding where next. */
  fissure: ({ g, q, T, variant, accent }) => {
    const fork = q(22 + variant * 2);
    g.fillStyle(Material.recess, 0.95);
    g.fillTriangle(q(5), q(3), fork + q(2), q(24), q(4), q(5));
    g.fillTriangle(fork - q(1), q(22), q(16), T - q(3), fork + q(3), q(26));
    g.lineStyle(q(2), Theme.groundDeep, 0.9);
    g.lineBetween(q(6), q(4), fork, q(24));
    g.lineBetween(fork, q(24), q(18), T - q(4));
    g.lineStyle(q(1), accent, 0.55);
    g.lineBetween(fork, q(24), q(38), q(14 + variant * 3));
    g.lineBetween(fork, q(24), q(36), q(36));
    g.fillStyle(accent, 0.35);
    g.fillRect(fork - q(1), q(23), q(2), q(2));
  },

  /**
   * Churned by everything that walked in before the surveyor did. Kept dull —
   * this is ordinary ground, and bright paint here would read as a rule.
   */
  approach: ({ g, q, T, variant, accent, tint }) => {
    g.fillStyle(Theme.groundDeep, 0.5);
    for (const lane of [q(13 + variant), q(28 + variant)]) {
      g.fillRect(lane, q(4), q(7), T - q(8));
      g.fillStyle(shade(tint, 0.35), 0.4);
      g.fillRect(lane + q(1), q(4), q(1), T - q(8));
      g.fillStyle(Theme.groundDeep, 0.5);
    }
    g.fillStyle(shade(tint, 0.4), 0.55);
    for (let i = 0; i < 7; i++) {
      const y = q(5 + i * 6);
      // Broken tread blocks — not clean dashes.
      g.fillRect(q(13 + variant), y, q(3), q(2));
      g.fillRect(q(17 + variant), y + q(1), q(2), q(1));
      g.fillRect(q(28 + variant), y + q(2), q(3), q(2));
      g.fillRect(q(32 + variant), y + q(3), q(2), q(1));
    }
    g.fillStyle(accent, 0.14);
    g.fillRect(q(13 + variant), q(4), q(1), T - q(8));
  },

  /** A cut channel, held open by revetment boards. */
  trench: ({ g, q, T, variant, accent }) => {
    g.fillStyle(Theme.groundDeep, 0.55);
    g.fillRect(q(3), q(5), q(9), T - q(10));
    g.fillStyle(mix(Material.debris, accent, 0.2), 0.7);
    g.fillRect(q(4), q(6), q(7), T - q(12));
    g.fillStyle(accent, 0.45);
    for (let i = 0; i < 5; i++) {
      g.fillRect(q(4), q(7 + i * 7), q(7), q(1));
      g.fillStyle(Theme.groundDeep, 0.4);
      g.fillRect(q(5), q(8 + i * 7), q(2), q(1));
      g.fillStyle(accent, 0.45);
    }
    g.fillStyle(mix(Material.debris, Theme.inkMute, 0.3), 0.55);
    for (let i = 0; i < 3; i++) {
      const y = q(11 + i * 10 + variant);
      g.fillRect(q(14), y, T - q(20), q(3));
      g.fillStyle(Theme.groundDeep, 0.5);
      g.fillRect(q(14), y + q(3), T - q(20), q(1));
      g.fillStyle(mix(Material.debris, Theme.inkMute, 0.3), 0.55);
    }
  },

  /** A slab that came down, with its reinforcement still in it. */
  ruin: ({ g, q, variant, accent }) => {
    const ox = q(6 + variant * 3);
    g.fillStyle(mix(Material.debris, accent, 0.25), 0.75);
    g.fillRect(ox, q(11), q(17), q(10));
    g.fillRect(ox + q(5), q(21), q(13), q(7));
    g.fillStyle(Theme.groundDeep, 0.8);
    g.fillRect(ox + q(2), q(13), q(11), q(1));
    g.fillRect(ox + q(1), q(11), q(1), q(10));
    g.fillStyle(Theme.rust, 0.65);
    for (let i = 0; i < 3; i++) {
      g.fillRect(ox + q(3 + i * 5), q(8), q(1), q(5));
      g.fillRect(ox + q(2 + i * 5), q(8), q(3), q(1));
    }
    // Masonry chips off the slab.
    g.fillStyle(Material.rock, 0.7);
    g.fillRect(ox + q(18), q(28), q(4), q(3));
    g.fillTriangle(ox - q(2), q(30), ox + q(3), q(24), ox + q(5), q(32));
  },

  /**
   * Service run: grating slats over the crawl space. Kept as bare parallel
   * bars — the moment a cross member is added it reads as brine's crust cells.
   */
  duct: ({ g, q, T, variant, accent }) => {
    g.fillStyle(Material.recess, 0.85);
    g.fillRect(q(5), q(5), T - q(10), T - q(10));
    for (let x = q(7 + variant * 2); x < T - q(6); x += q(7)) {
      g.fillStyle(Theme.groundDeep, 0.85);
      g.fillRect(x, q(5), q(4), T - q(10));
      g.fillStyle(Theme.panelEdge, 0.7);
      g.fillRect(x, q(5), q(2), T - q(10));
      g.fillStyle(mix(Theme.panelEdge, Theme.inkBright, 0.15), 0.35);
      g.fillRect(x, q(5), q(1), T - q(10));
    }
    g.fillStyle(accent, 0.4);
    g.fillRect(q(4), q(22 + variant * 3), T - q(8), q(1));
  },

  /** Machined deck, bolted down on a grid. */
  spire: ({ g, q, T, variant, accent }) => {
    g.fillStyle(Theme.panelEdge, 0.35);
    g.fillRect(q(4), T / 2 - q(1), T - q(8), q(2));
    g.fillRect(T / 2 - q(1), q(4), q(2), T - q(8));
    g.fillStyle(Theme.groundDeep, 0.4);
    g.fillRect(q(4), T / 2 + q(1), T - q(8), q(1));
    g.fillRect(T / 2 + q(1), q(4), q(1), T - q(8));
    for (let ry = 0; ry < 2; ry++) {
      for (let rx = 0; rx < 2; rx++) {
        const bx = q(11 + rx * 22 + variant);
        const by = q(11 + ry * 22 + variant);
        g.fillStyle(Material.recess, 0.8);
        g.fillRect(bx - q(1), by - q(1), q(5), q(5));
        g.fillStyle(accent, 0.65);
        g.fillRect(bx, by, q(3), q(3));
        g.fillStyle(Theme.inkBright, 0.35);
        g.fillRect(bx, by, q(1), q(1));
      }
    }
  },

  /** Sealed floor, chevroned where you are not supposed to stand. */
  vault: ({ g, q, T, variant, accent }) => {
    const c = T / 2;
    g.fillStyle(mix(Theme.panel, accent, 0.08), 0.35);
    g.fillRect(q(10), q(10), T - q(20), T - q(20));
    g.lineStyle(q(2), accent, 0.4);
    g.strokeRect(q(9), q(9), T - q(18), T - q(18));
    g.lineStyle(q(1), Theme.groundDeep, 0.55);
    g.strokeRect(q(11), q(11), T - q(22), T - q(22));
    g.fillStyle(accent, 0.55);
    for (let i = 0; i < 4; i++) {
      const off = q(i * 4 + variant);
      g.fillTriangle(q(12) + off, c - q(5), q(17) + off, c, q(12) + off, c + q(5));
    }
  },

  /** Pad markings, repainted often enough to still read. */
  beacon: ({ g, q, T, variant, accent }) => {
    const c = T / 2;
    g.fillStyle(mix(Theme.panel, accent, 0.12), 0.3);
    g.fillCircle(c, c, q(14 + variant));
    g.lineStyle(q(2), accent, 0.5);
    g.strokeCircle(c, c, q(11 + variant));
    g.lineStyle(q(1), Theme.inkBright, 0.25);
    g.strokeCircle(c, c, q(8 + variant));
    g.fillStyle(accent, 0.55);
    g.fillRect(c - q(2), q(4), q(4), q(7));
    g.fillRect(q(4), c - q(2), q(7), q(4));
    g.fillRect(T - q(11), c - q(2), q(7), q(4));
    // Dashed outer ring segments.
    g.fillStyle(accent, 0.35);
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) continue;
      const ang = (i / 8) * Math.PI * 2;
      const x = c + Math.cos(ang) * q(16);
      const y = c + Math.sin(ang) * q(16);
      g.fillRect(x - q(1), y - q(1), q(2), q(2));
    }
  },
};

/**
 * Shear stress-fractures that appear on optional path tiles at Arcing+.
 * Transparent canvas — layered over the live floor so biome identity survives.
 * Motif mirrors FLOOR_DECAL so each sector cracks like itself, not a generic glow.
 */
export function drawPressureCrack(
  g: G,
  T: number,
  sector: SectorId,
  variant: number,
  urgent: boolean,
): void {
  transparent(g, T);
  const q = unit(T);
  const v = ((variant % 3) + 3) % 3;
  const ink = urgent ? Theme.arcWhite : Theme.arc;
  const deep = urgent ? mix(Theme.arcWhite, Theme.groundDeep, 0.35) : mix(Theme.arc, Theme.groundDeep, 0.45);
  const core = urgent ? 0.95 : 0.72;
  const halo = urgent ? 0.55 : 0.32;

  const stroke = (x0: number, y0: number, x1: number, y1: number, w = 1): void => {
    g.lineStyle(q(w + 1), deep, halo);
    g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(q(w), ink, core);
    g.lineBetween(x0, y0, x1, y1);
  };

  CRACK_PATH[sector]({ g, q, T, variant: v, stroke, urgent, ink });

  // Hot pinpricks at Breaching — magnesium bite, not nested bloom rings.
  if (urgent) {
    g.fillStyle(Theme.arcWhite, 0.9);
    for (let i = 0; i < 7; i++) {
      const x = q(6 + ((i * 9 + v * 5) % 34));
      const y = q(7 + ((i * 11 + v * 7) % 32));
      g.fillRect(x, y, q(1), q(1));
    }
    // Secondary hairline so the breach reads as a network, not a single stroke.
    g.lineStyle(q(1), Theme.arcWhite, 0.45);
    g.lineBetween(q(8 + v), q(36), q(38 - v), q(10));
  }
}

type CrackPaint = {
  g: G;
  q: Q;
  T: number;
  variant: number;
  stroke: (x0: number, y0: number, x1: number, y1: number, w?: number) => void;
  urgent: boolean;
  ink: number;
};

const CRACK_PATH: Record<SectorId, (p: CrackPaint) => void> = {
  plains: ({ q, T, variant, stroke, urgent }) => {
    stroke(q(6), q(10 + variant * 2), q(22), q(18), 1);
    stroke(q(22), q(18), q(40), q(14 + variant), 1);
    stroke(q(18), q(18), q(24), q(34), 1);
    if (urgent) stroke(q(10), q(28), q(30), q(36), 1);
  },
  ridge: ({ q, T, variant, stroke, urgent }) => {
    for (let i = 0; i < 3; i++) {
      const y = q(12 + i * 11 + variant);
      const step = q(i * 3);
      stroke(q(4) + step, y, T - q(6), y, 1);
      if (urgent || i === 1) stroke(q(16 + variant * 4), y, q(20 + variant * 4), y + q(8), 1);
    }
  },
  canopy: ({ q, variant, stroke, urgent }) => {
    stroke(q(4), q(30 + variant), q(18), q(22), 2);
    stroke(q(18), q(22), q(34), q(16), 1);
    stroke(q(18), q(22), q(22), q(38), 1);
    stroke(q(28), q(18), q(40), q(28), 1);
    if (urgent) stroke(q(10), q(14), q(18), q(22), 1);
  },
  flood: ({ q, T, variant, stroke, urgent }) => {
    const cx = T / 2 + q(variant * 2 - 2);
    const cy = T / 2;
    stroke(cx - q(14), cy, cx + q(14), cy, 1);
    stroke(cx, cy - q(12), cx, cy + q(12), 1);
    stroke(cx - q(10), cy - q(8), cx + q(10), cy + q(8), 1);
    if (urgent) stroke(cx - q(10), cy + q(8), cx + q(10), cy - q(8), 1);
  },
  brine: ({ q, T, variant, stroke, urgent }) => {
    const step = q(12);
    for (let i = 0; i <= 2; i++) {
      const off = q(((i + variant) % 2) * 2);
      stroke(q(5), q(10) + i * step + off, T - q(5), q(12) + i * step, 1);
      stroke(q(10) + i * step, q(5), q(8) + i * step + off, T - q(5), 1);
    }
    if (urgent) stroke(q(8), q(8), T - q(8), T - q(8), 1);
  },
  reef: ({ q, variant, stroke, urgent }) => {
    const ox = q(8 + variant * 3);
    stroke(ox + q(10), q(8), ox + q(10), q(38), 1);
    stroke(ox, q(18), ox + q(22), q(26), 1);
    stroke(ox + q(4), q(30), ox + q(20), q(14), 1);
    if (urgent) stroke(ox + q(2), q(12), ox + q(18), q(34), 1);
  },
  ash: ({ q, T, variant, stroke, urgent }) => {
    for (let i = 0; i < 3; i++) {
      const y = q(14 + i * 10 + variant);
      stroke(q(4), y + q(4), q(20), y, 1);
      stroke(q(20), y, T - q(4), y + q(3), 1);
    }
    if (urgent) stroke(q(12), q(8), q(28), T - q(6), 1);
  },
  fissure: ({ q, T, variant, stroke, urgent }) => {
    stroke(q(6), q(4), q(22 + variant * 2), q(22), 2);
    stroke(q(22 + variant * 2), q(22), q(16), T - q(4), 2);
    stroke(q(22 + variant * 2), q(22), q(40), q(12 + variant * 2), 1);
    stroke(q(22 + variant * 2), q(22), q(38), q(36), 1);
    if (urgent) stroke(q(10), q(28), q(30), q(8), 1);
  },
  approach: ({ q, T, variant, stroke, urgent }) => {
    const lane = q(16 + variant);
    stroke(lane, q(4), lane, T - q(4), 2);
    stroke(lane + q(12), q(6), lane + q(12), T - q(6), 1);
    stroke(lane, q(20), lane + q(12), q(24), 1);
    if (urgent) stroke(lane - q(4), q(12), lane + q(16), q(32), 1);
  },
  trench: ({ q, T, variant, stroke, urgent }) => {
    stroke(q(8), q(6), q(8), T - q(6), 2);
    for (let i = 0; i < 4; i++) {
      stroke(q(8), q(10 + i * 8 + variant), q(28), q(12 + i * 8), 1);
    }
    if (urgent) stroke(q(20), q(6), q(20), T - q(6), 1);
  },
  ruin: ({ q, variant, stroke, urgent }) => {
    const ox = q(8 + variant * 2);
    stroke(ox, q(10), ox + q(18), q(10), 1);
    stroke(ox, q(10), ox, q(28), 2);
    stroke(ox, q(28), ox + q(14), q(34), 1);
    stroke(ox + q(6), q(10), ox + q(6), q(22), 1);
    if (urgent) stroke(ox + q(12), q(14), ox + q(12), q(36), 1);
  },
  duct: ({ q, T, variant, stroke, urgent }) => {
    for (let i = 0; i < 3; i++) {
      const x = q(10 + i * 10 + variant * 2);
      stroke(x, q(5), x, T - q(5), 1);
    }
    stroke(q(6), q(22 + variant), T - q(6), q(24 + variant), 2);
    if (urgent) stroke(q(6), q(14), T - q(6), q(16), 1);
  },
  spire: ({ q, T, variant, stroke, urgent }) => {
    const c = T / 2;
    stroke(c, q(6), c, T - q(6), 1);
    stroke(q(6), c, T - q(6), c, 1);
    stroke(q(10 + variant), q(10), T - q(10), T - q(10), 1);
    if (urgent) stroke(T - q(10), q(10), q(10 + variant), T - q(10), 1);
  },
  vault: ({ q, T, variant, stroke, urgent }) => {
    const c = T / 2;
    stroke(q(10), q(10), T - q(10), q(10), 1);
    stroke(q(10), q(10), q(10), T - q(10), 1);
    stroke(T - q(10), q(10), T - q(10), T - q(10), 1);
    for (let i = 0; i < 3; i++) {
      const off = q(i * 4 + variant);
      stroke(q(14) + off, c - q(6), q(20) + off, c, 1);
      stroke(q(20) + off, c, q(14) + off, c + q(6), 1);
    }
    if (urgent) stroke(q(12), T - q(12), T - q(12), T - q(12), 1);
  },
  beacon: ({ q, T, variant, stroke, urgent }) => {
    const c = T / 2;
    stroke(c, q(6), c, T - q(6), 1);
    stroke(q(6), c, T - q(6), c, 1);
    stroke(q(10), q(10 + variant), T - q(10), T - q(10 + variant), 1);
    stroke(T - q(10), q(10 + variant), q(10), T - q(10 + variant), 1);
    if (urgent) {
      stroke(c - q(10), c - q(10), c + q(10), c + q(10), 1);
    }
  },
};

/** High-contrast, beveled cliff / bulkhead / conduit families — layered like floors. */
export function drawDeluxeWall(
  g: G,
  T: number,
  style: WallStyle,
  variant: number,
  sector: SectorId = 'plains',
): void {
  const q = unit(T);
  const tint = BIOME_FLOOR_TINT[sector];
  const accent = floorAccent(sector);
  const v = ((variant % 4) + 4) % 4;
  const face =
    style === 'cliff'
      ? mix(Material.rock, tint, 0.18)
      : style === 'bulkhead'
        ? mix(Material.deck, tint, 0.14)
        : mix(Material.conduit, tint, 0.16);

  g.clear();
  g.fillStyle(Theme.groundDeep, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(face, 1);
  g.fillRect(q(1), q(1), T - q(2), T - q(2));

  // Inner slab — slightly cooler so bevels read.
  g.fillStyle(mix(face, Material.recess, 0.12), 1);
  g.fillRect(q(3), q(3), T - q(6), T - q(7));

  // Deterministic grit so adjacent variants don't stamp identical.
  for (let i = 0; i < 22; i++) {
    const x = q(4 + ((i * 11 + v * 9) % 38));
    const y = q(5 + ((i * 17 + v * 5) % 36));
    g.fillStyle(i % 4 === 0 ? shade(tint, 0.42) : accent, i % 4 === 0 ? 0.26 : 0.14);
    g.fillRect(x, y, q(i % 5 === 0 ? 2 : 1), q(1));
  }
  // Scuff pits along the lower third — field wear, not UI noise.
  g.fillStyle(Material.recess, 0.55);
  for (let i = 0; i < 4; i++) {
    g.fillRect(q(8 + i * 9 + v), q(34 + (i % 2)), q(3), q(2));
  }

  // Bright top/left bevel, deep bottom/right — machined lip.
  g.fillStyle(style === 'conduit' ? mix(Theme.biolumDeep, accent, 0.25) : Theme.inkMute, 0.88);
  g.fillRect(q(2), q(2), T - q(4), q(3));
  g.fillRect(q(2), q(5), q(3), T - q(9));
  g.fillStyle(Theme.groundDeep, 0.92);
  g.fillRect(q(4), T - q(6), T - q(8), q(4));
  g.fillRect(T - q(6), q(5), q(4), T - q(11));

  if (style === 'cliff') {
    paintCliffFace(g, q, T, v, accent);
  } else if (style === 'bulkhead') {
    paintBulkheadFace(g, q, T, v, accent);
  } else {
    paintConduitFace(g, q, T, v, accent);
  }

  // Corner fasteners — same on every family so walls read as built mass.
  g.fillStyle(Theme.panelEdge, 0.9);
  for (const [bx, by] of [
    [6, 6],
    [T - 10, 6],
    [6, T - 12],
    [T - 10, T - 12],
  ] as const) {
    const ox = q(bx + (v % 2));
    const oy = q(by + ((v >> 1) % 2));
    g.fillRect(ox, oy, q(2), q(2));
    g.fillStyle(Theme.inkBright, 0.35);
    g.fillRect(ox, oy, q(1), q(1));
    g.fillStyle(Theme.panelEdge, 0.9);
  }

  WALL_ACCENT[sector]({ g, q, T, variant: v, accent, tint, style });
}

/** Wall-mounted work light — scratched fixture, not a softglow orb. */
export function drawDeluxeSconce(g: G, T: number, style: WallStyle): void {
  transparent(g, T);
  const q = unit(T);
  const glow = style === 'conduit' ? Theme.biolum : Theme.tape;
  const housing = style === 'cliff' ? Material.rock : style === 'bulkhead' ? Theme.panel : Material.conduit;

  if (style === 'conduit') {
    // Offset strip — not centered candy.
    g.fillStyle(Theme.panelEdge, 1);
    g.fillRect(q(8), q(17), T - q(14), q(9));
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(q(10), q(19), T - q(18), q(5));
    g.fillStyle(glow, 0.85);
    g.fillRect(q(12), q(20), T - q(24), q(2));
    g.fillStyle(Theme.inkDim, 0.55);
    g.fillRect(q(14), q(20), q(3), q(1));
    g.fillRect(T - q(22), q(21), q(5), q(1));
    // Clamp scar + cable stub.
    g.fillStyle(Material.debris, 0.7);
    g.fillRect(q(9), q(16), q(3), q(11));
    g.fillStyle(Material.conduit, 0.9);
    g.fillRect(q(11), q(27), q(2), q(6));
  } else if (style === 'bulkhead') {
    g.fillStyle(housing, 1);
    g.fillRect(q(15), q(13), q(18), q(20));
    g.fillStyle(Theme.panelEdge, 0.85);
    g.fillRect(q(15), q(13), q(18), q(2));
    g.fillRect(q(15), q(13), q(2), q(20));
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(q(19), q(18), q(10), q(9));
    g.fillStyle(glow, 0.8);
    g.fillRect(q(21), q(20), q(6), q(5));
    g.fillStyle(Theme.inkBright, 0.35);
    g.fillRect(q(22), q(21), q(2), q(2));
    // Uneven bolts + paint chip + lens dirt.
    g.fillStyle(Theme.panelEdge, 0.9);
    g.fillRect(q(17), q(15), q(2), q(2));
    g.fillRect(T - q(19), q(28), q(2), q(2));
    g.fillStyle(Material.debris, 0.55);
    g.fillRect(q(27), q(14), q(4), q(2));
    g.fillStyle(Theme.inkDim, 0.4);
    g.fillRect(q(23), q(23), q(2), q(1));
  } else {
    // Cliff: crooked bracket, dirty bulb glass.
    g.fillStyle(Material.debris, 1);
    g.fillRect(q(21), q(11), q(5), q(12));
    g.fillRect(q(16), q(19), q(14), q(4));
    g.fillStyle(housing, 1);
    g.fillRect(q(18), q(24), q(12), q(10));
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(q(20), q(26), q(8), q(6));
    g.fillStyle(glow, 0.75);
    g.fillRect(q(21), q(27), q(6), q(4));
    g.fillStyle(Theme.inkDim, 0.45);
    g.fillRect(q(22), q(28), q(2), q(1));
    g.fillRect(q(25), q(29), q(1), q(1));
    g.fillStyle(Material.recess, 0.6);
    g.fillRect(q(19), q(33), q(3), q(1));
  }
}

type WallPaint = {
  g: G;
  q: Q;
  T: number;
  variant: number;
  accent: number;
  tint: number;
  style: WallStyle;
};

function paintCliffFace(g: G, q: Q, T: number, v: number, accent: number): void {
  // Stratified shelves — offset so variants tile differently along a run.
  for (let i = 0; i < 5; i++) {
    const y = q(8 + i * 7 + ((v + i) % 2));
    const x = q(6 + ((i * 9 + v * 5) % 16));
    const w = q(22 - (i % 3) * 4 - (v % 2));
    g.fillStyle(Material.recess, 0.95);
    g.fillRect(x, y, w, q(3));
    g.fillStyle(Theme.inkMute, 0.55);
    g.fillRect(x, y, q(7 + (v % 3)), q(1));
    g.fillStyle(mix(Material.rock, Theme.groundDeep, 0.3), 0.5);
    g.fillRect(x, y + q(2), w, q(1));
    if (i % 2 === v % 2) {
      g.fillStyle(mix(Material.rock, accent, 0.35), 0.45);
      g.fillRect(x + q(2), y + q(1), q(4), q(1));
    }
  }
  // Vertical joint crack with a darker throat.
  const jx = q(14 + v * 5);
  g.fillStyle(Material.recess, 0.85);
  g.fillRect(jx, q(8), q(2), T - q(16));
  g.fillStyle(Theme.groundDeep, 0.7);
  g.fillRect(jx, q(8), q(1), T - q(16));
}

function paintBulkheadFace(g: G, q: Q, T: number, v: number, accent: number): void {
  const inset = q(7 + (v % 2));
  g.fillStyle(Theme.panel, 1);
  g.fillRect(inset, inset, T - inset * 2, T - inset * 2 - q(2));
  g.lineStyle(q(2), Theme.panelEdge, 0.95);
  g.strokeRect(inset + q(1), inset + q(1), T - inset * 2 - q(2), T - inset * 2 - q(4));

  // Panel seams — cross or grid by variant.
  g.fillStyle(Theme.groundDeep, 1);
  if (v === 0 || v === 2) {
    g.fillRect(q(22 + (v === 2 ? 3 : 0)), inset + q(2), q(3), T - inset * 2 - q(6));
  }
  if (v === 1 || v === 2 || v === 3) {
    g.fillRect(inset + q(2), q(20 + (v === 3 ? 4 : 0)), T - inset * 2 - q(4), q(3));
  }
  if (v === 3) {
    g.fillRect(q(18), inset + q(2), q(2), T - inset * 2 - q(6));
  }

  // Stencil / caution tape / stress mark.
  g.fillStyle(v === 1 ? Theme.tape : v === 3 ? accent : Theme.inkDim, 0.85);
  g.fillRect(inset + q(3), inset + q(3), q(8), q(2));
  g.fillRect(T - inset - q(11), T - inset - q(8), q(8), q(2));

  // Rivet row along the top seam.
  g.fillStyle(Theme.panelEdge, 0.75);
  for (let i = 0; i < 4; i++) {
    g.fillRect(inset + q(5 + i * 8 + (v % 2)), inset + q(5), q(2), q(2));
  }
}

function paintConduitFace(g: G, q: Q, T: number, v: number, accent: number): void {
  g.fillStyle(Theme.panel, 1);
  g.fillRect(q(7), q(7), T - q(14), T - q(16));

  // Pipe runs — shift spacing with variant; middle run always wetter.
  for (let i = 0; i < 3; i++) {
    const y = q(10 + i * 9 + (v % 3) - (v === 3 ? 1 : 0));
    const wet = i === 1 || (v === 2 && i === 0);
    g.fillStyle(wet ? mix(Theme.biolumDeep, accent, 0.3) : Theme.panelEdge, 0.95);
    g.fillRect(q(6), y, T - q(12), q(5));
    g.fillStyle(Theme.groundDeep, 0.55);
    g.fillRect(q(6), y + q(4), T - q(12), q(1));
    g.fillStyle(Theme.inkBright, wet ? 0.55 : 0.35);
    g.fillRect(q(10 + i * 7 + v * 2), y + q(1), q(3), q(2));
    // Clamp collar.
    g.fillStyle(Theme.panelEdge, 0.9);
    g.fillRect(q(8 + ((i + v) % 3) * 10), y - q(1), q(4), q(7));
    if (wet) {
      // Condensation drip under the wet run.
      g.fillStyle(Theme.biolumDeep, 0.45);
      g.fillRect(q(14 + v * 3), y + q(5), q(1), q(4));
      g.fillRect(q(30 - v * 2), y + q(5), q(1), q(3));
    }
  }

  // Vertical riser on odd variants.
  if (v % 2 === 1) {
    g.fillStyle(mix(Theme.biolumDeep, Material.conduit, 0.4), 0.85);
    g.fillRect(q(28 + (v === 3 ? -4 : 0)), q(9), q(4), T - q(20));
  }
}

/** Sparse sector tell on the wall face — reads family first, biome second. */
const WALL_ACCENT: Record<SectorId, (p: WallPaint) => void> = {
  plains: ({ g, q, T, variant }) => {
    g.fillStyle(Material.recess, 0.45);
    g.fillRect(q(12 + variant * 3), q(30), q(14), q(1));
  },
  ridge: ({ g, q, T, variant, accent }) => {
    g.fillStyle(mix(Material.rock, accent, 0.4), 0.55);
    g.fillRect(q(8), q(14 + variant * 2), q(3), q(18));
    g.fillRect(T - q(12), q(10), q(2), q(22));
  },
  canopy: ({ g, q, variant, accent }) => {
    g.fillStyle(mix(Material.foliage, accent, 0.35), 0.5);
    for (let i = 0; i < 3; i++) {
      g.fillRect(q(10 + i * 9 + variant), q(28 + (i % 2)), q(5), q(2));
    }
  },
  flood: ({ g, q, T, accent }) => {
    g.fillStyle(mix(Theme.biolumDeep, accent, 0.4), 0.4);
    g.fillRect(q(6), T - q(14), T - q(12), q(3));
    g.fillRect(q(8), T - q(11), q(10), q(1));
  },
  brine: ({ g, q, T, accent }) => {
    g.fillStyle(accent, 0.45);
    g.fillRect(q(7), q(18), T - q(14), q(1));
    g.fillRect(q(9), q(26), T - q(18), q(1));
  },
  reef: ({ g, q, T, variant, accent }) => {
    g.fillStyle(mix(Theme.safe, accent, 0.3), 0.55);
    for (let i = 0; i < 5; i++) {
      g.fillRect(q(9 + ((i * 7 + variant * 3) % 28)), q(12 + ((i * 9) % 22)), q(2), q(2));
    }
  },
  ash: ({ g, q, T, variant }) => {
    g.fillStyle(Theme.groundDeep, 0.55);
    for (let i = 0; i < 6; i++) {
      g.fillRect(q(8 + ((i * 5 + variant) % 30)), q(8 + i * 5), q(4 + (i % 2)), q(1));
    }
  },
  fissure: ({ g, q, T, variant, accent }) => {
    g.fillStyle(mix(Material.recess, accent, 0.25), 0.85);
    g.fillRect(q(10 + variant * 2), q(7), q(2), T - q(14));
    g.fillRect(q(18), q(16 + variant), q(12), q(1));
  },
  approach: ({ g, q, T, variant }) => {
    g.fillStyle(Theme.arc, 0.28);
    g.fillRect(q(6), q(8 + variant * 3), T - q(12), q(1));
    g.fillStyle(Theme.groundDeep, 0.5);
    g.fillRect(q(20), q(10), q(1), T - q(18));
  },
  trench: ({ g, q, T, variant }) => {
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(q(8), q(12 + variant), T - q(16), q(4));
    g.fillRect(q(8), q(28), T - q(16), q(3));
  },
  ruin: ({ g, q, T, variant, accent }) => {
    g.fillStyle(mix(Material.debris, accent, 0.2), 0.7);
    g.fillRect(q(10 + variant), q(10), q(14), q(8));
    g.fillStyle(Theme.groundDeep, 0.8);
    g.fillRect(q(12), q(12), q(8), q(4));
    g.fillRect(T - q(18), T - q(16), q(6), q(5));
  },
  duct: ({ g, q, T, variant, accent }) => {
    g.fillStyle(mix(Theme.biolum, accent, 0.25), 0.4);
    g.fillRect(q(14 + variant), q(8), q(2), T - q(16));
    g.fillStyle(Theme.panelEdge, 0.7);
    g.fillRect(q(12), q(20), q(6), q(3));
  },
  spire: ({ g, q, T, variant, accent }) => {
    g.fillStyle(mix(Theme.arcWhite, accent, 0.2), 0.35);
    g.fillRect(q(9), q(9 + variant), T - q(18), q(1));
    g.fillRect(q(11), q(11), q(1), T - q(22));
    g.fillRect(T - q(14), q(11), q(1), T - q(22));
  },
  vault: ({ g, q, T, variant }) => {
    g.fillStyle(Theme.panelEdge, 0.8);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        g.fillRect(q(12 + col * 8 + (variant % 2)), q(12 + row * 8), q(2), q(2));
      }
    }
  },
  beacon: ({ g, q, T, variant }) => {
    g.fillStyle(Theme.tape, 0.75);
    const y = q(16 + (variant % 2) * 6);
    g.fillRect(q(8), y, T - q(16), q(3));
    g.fillStyle(Theme.groundDeep, 0.55);
    g.fillRect(q(8), y + q(1), T - q(16), q(1));
  },
};


function groundTile(g: G, T: number): (value: number) => number {
  drawDeluxeFloor(g, T, 'plains', 0);
  return unit(T);
}

/** Distinct, full-tile utility silhouettes with four-frame hazard motion. */
export function drawDeluxeProp(g: G, T: number, kind: DeluxePropKind, frame = 0): void {
  const q = groundTile(g, T);
  const pulse = frame % 4;
  switch (kind) {
    case 'scrub':
      // Upright stalks with grit litter — material thicket, not a green UI blot.
      g.fillStyle(Theme.groundDeep, 0.75);
      g.fillEllipse(q(7), q(34), q(34), q(7));
      // Litter grit under the stems.
      g.fillStyle(mix(Material.foliage, Material.debris, 0.45), 0.9);
      for (let i = 0; i < 8; i++) {
        g.fillRect(q(8 + ((i * 11) % 32)), q(32 + (i % 3)), q(2), q(2));
      }
      g.fillStyle(Material.foliage, 1);
      for (let i = 0; i < 5; i++) {
        const x = q(9 + i * 7);
        const h = q(14 + ((i * 5) % 14));
        g.fillRect(x, q(36) - h, q(3), h);
        g.fillStyle(mix(Material.foliage, Theme.groundDeep, 0.35), 1);
        g.fillRect(x, q(36) - h, q(1), h);
        g.fillStyle(Theme.safe, 0.7);
        g.fillTriangle(
          x - q(3),
          q(18 + (i % 3) * 4),
          x + q(2),
          q(12 + (i % 2) * 5),
          x + q(5),
          q(19 + (i % 3) * 4),
        );
        g.fillStyle(Material.foliage, 1);
      }
      break;
    case 'scrub_nest':
      // Dried kill-bowl: nested materials, rim grit, hollow mouth.
      g.fillStyle(Theme.groundDeep, 0.85);
      g.fillEllipse(q(4), q(34), q(40), q(9));
      g.fillStyle(mix(Material.foliage, Material.debris, 0.3), 1);
      g.fillEllipse(q(6), q(28), q(36), q(16));
      // Woven rim edge.
      g.fillStyle(Material.foliage, 1);
      g.fillEllipse(q(8), q(22), q(32), q(8));
      g.fillStyle(Material.nest, 1);
      g.fillEllipse(q(12), q(24), q(24), q(14));
      g.fillStyle(mix(Material.nest, Theme.groundDeep, 0.4), 1);
      g.fillEllipse(q(15), q(26), q(18), q(10));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillEllipse(q(17), q(27), q(14), q(7));
      // Bone grit in the hollow — not a UI glow pip.
      g.fillStyle(mix(Material.debris, Theme.inkMute, 0.5), 0.95);
      g.fillRect(q(20), q(28), q(3), q(2));
      g.fillRect(q(26), q(29), q(2), q(2));
      g.fillStyle(Material.foliage, 1);
      g.fillRect(q(10), q(20), q(3), q(8));
      g.fillRect(q(35), q(21), q(3), q(7));
      g.fillRect(q(22), q(17), q(4), q(6));
      break;
    case 'rubble':
      // Broken plate + masonry chips with hard edges and grit scatter.
      g.fillStyle(Theme.groundDeep, 0.85);
      g.fillEllipse(q(5), q(35), q(39), q(7));
      g.fillStyle(Material.debris, 1);
      g.fillTriangle(q(5), q(35), q(15), q(21), q(23), q(35));
      g.fillTriangle(q(17), q(35), q(30), q(14), q(42), q(35));
      g.fillStyle(Material.rock, 1);
      g.fillRect(q(11), q(24), q(8), q(7));
      g.fillRect(q(28), q(20), q(10), q(6));
      g.fillStyle(mix(Material.debris, Theme.inkBright, 0.15), 0.9);
      g.fillRect(q(11), q(24), q(8), q(1));
      g.fillRect(q(28), q(20), q(10), q(1));
      g.fillStyle(Theme.inkMute, 0.85);
      g.fillTriangle(q(9), q(31), q(15), q(23), q(19), q(32));
      g.fillTriangle(q(24), q(31), q(30), q(17), q(35), q(31));
      // Grit scatter.
      g.fillStyle(mix(Material.debris, Theme.groundDeep, 0.3), 1);
      for (let i = 0; i < 6; i++) {
        g.fillRect(q(7 + i * 6), q(33 + (i % 2)), q(2), q(2));
      }
      break;
    case 'vent':
      // Recessed conduit grate — metal lip, dark throat, biolum seep between slats.
      g.fillStyle(Material.conduit, 1);
      g.fillRect(q(3), q(4), q(42), q(40));
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(3), q(4), q(42), q(2));
      g.fillRect(q(3), q(42), q(42), q(2));
      g.fillStyle(Material.recess, 1);
      g.fillRect(q(7), q(8), q(34), q(32));
      // Bolt corners.
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(5), q(6), q(3), q(3));
      g.fillRect(q(40), q(6), q(3), q(3));
      g.fillRect(q(5), q(39), q(3), q(3));
      g.fillRect(q(40), q(39), q(3), q(3));
      for (let y = 10 + pulse; y < 38; y += 6) {
        g.fillStyle(mix(Material.conduit, Theme.panelEdge, 0.4), 1);
        g.fillRect(q(9), q(y), q(30), q(2));
        g.fillStyle(Theme.biolumDeep, 0.7);
        g.fillRect(q(10), q(y + 2), q(28), q(2));
        g.fillStyle(Theme.biolum, 0.45);
        g.fillRect(q(12 + pulse), q(y + 2), q(10), q(1));
      }
      break;
    case 'hazard':
      // Corroded deck stain + blistered plate — material burn, not a warning glyph.
      g.fillStyle(mix(Material.deck, Theme.rust, 0.35), 1);
      g.fillRect(q(2), q(2), q(44), q(44));
      g.fillStyle(Material.recess, 0.9);
      g.fillEllipse(q(8), q(10), q(32), q(28));
      // Blistered raised flakes.
      g.fillStyle(mix(Theme.rust, Material.debris, 0.4), 1);
      g.fillTriangle(q(10), q(30), q(18), q(12 + pulse), q(26), q(32));
      g.fillTriangle(q(22), q(34), q(32), q(14 + pulse), q(40), q(30));
      g.fillStyle(mix(Theme.rust, Theme.groundDeep, 0.25), 1);
      g.fillRect(q(14), q(22 + pulse), q(6), q(4));
      g.fillRect(q(28), q(18 + pulse), q(5), q(5));
      // Edge scorch ring — silhouette before colour.
      g.lineStyle(q(2), mix(Theme.rust, Theme.groundDeep, 0.35), 0.95);
      g.strokeRect(q(4), q(4), q(40), q(40));
      // Sparse grit, not an exclamation mark.
      g.fillStyle(Theme.arc, 0.55);
      for (let i = 0; i < 5; i++) {
        g.fillRect(q(12 + i * 6), q(36 - ((i + pulse) % 3)), q(2), q(2));
      }
      break;
    case 'brine_pool':
      // Standing ion-brine with a crusted rim — pool silhouette, not a flat oval UI blob.
      g.fillStyle(Theme.groundDeep, 0.7);
      g.fillEllipse(q(2), q(12), q(44), q(30));
      g.fillStyle(mix(Material.debris, Material.brine, 0.4), 0.9);
      g.fillEllipse(q(4), q(14), q(40), q(26));
      g.fillStyle(Material.brine, 0.95);
      g.fillEllipse(q(7), q(16), q(34), q(22));
      g.fillStyle(Theme.biolumDeep, 0.8);
      g.fillEllipse(q(10 + pulse), q(18), q(28 - pulse), q(16));
      // Surface skim that drifts with the frame.
      g.fillStyle(Theme.biolum, 0.55);
      g.fillRect(q(12 + pulse * 3), q(22), q(10), q(1));
      g.fillRect(q(24 - pulse * 2), q(28), q(12), q(1));
      g.fillStyle(Theme.inkBright, 0.2);
      g.fillRect(q(14 + pulse), q(20), q(6), q(1));
      // Salt crust chips on the rim.
      g.fillStyle(mix(Theme.inkMute, Theme.biolum, 0.2), 0.75);
      g.fillRect(q(8), q(15), q(3), q(2));
      g.fillRect(q(36), q(30), q(3), q(2));
      g.fillRect(q(20), q(36), q(4), q(2));
      break;
    case 'sealed':
    case 'exit': {
      // Hatch as bolted deck plate — status colour only on the seal strip / chevron.
      const open = kind === 'exit';
      const status = open ? Theme.safe : Theme.rust;
      g.fillStyle(Theme.groundDeep, 0.85);
      g.fillEllipse(q(6), q(40), q(36), q(6));
      g.fillStyle(Material.deck, 1);
      g.fillRect(q(5), q(4), q(38), q(38));
      g.fillStyle(Theme.panelEdge, 0.9);
      g.fillRect(q(5), q(4), q(38), q(2));
      g.fillRect(q(5), q(4), q(2), q(38));
      g.fillStyle(Theme.groundDeep, 0.9);
      g.fillRect(q(5), q(40), q(38), q(2));
      g.fillRect(q(41), q(4), q(2), q(38));
      g.fillStyle(Theme.panel, 1);
      g.fillRect(q(10), q(9), q(28), q(30));
      // Seal strip / parting line.
      g.fillStyle(status, 0.95);
      g.fillRect(q(22), q(10), q(4), q(28));
      g.fillRect(q(11), q(22), q(26), q(3));
      g.fillStyle(Theme.panelEdge, 0.85);
      for (const [bx, by] of [
        [12, 11],
        [34, 11],
        [12, 34],
        [34, 34],
      ] as const) {
        g.fillRect(q(bx), q(by), q(3), q(3));
      }
      g.fillStyle(Theme.inkBright, 0.9);
      if (open) {
        g.fillTriangle(q(16), q(17), q(28), q(23), q(16), q(29));
      } else {
        g.fillRect(q(18), q(18), q(12), q(3));
        g.fillRect(q(22), q(14), q(3), q(12));
      }
      break;
    }
    case 'tripwire':
      // Physical stakes + taut filament — silhouette first, rust wash second.
      g.fillStyle(mix(Material.deck, Theme.rust, 0.15), 0.35);
      g.fillRect(q(3), q(3), q(42), q(42));
      g.fillStyle(Material.debris, 1);
      g.fillRect(q(5), q(26), q(5), q(12));
      g.fillRect(q(38), q(12), q(5), q(12));
      g.fillStyle(Theme.panelEdge, 0.9);
      g.fillRect(q(6), q(27), q(3), q(2));
      g.fillRect(q(39), q(13), q(3), q(2));
      g.lineStyle(q(2), mix(Theme.arc, Theme.rust, 0.35), 0.95);
      g.lineBetween(q(8), q(30), q(40), q(18));
      g.lineStyle(q(1), Theme.inkBright, 0.55);
      g.lineBetween(q(8), q(29), q(40), q(17));
      // Tension tabs.
      g.fillStyle(Theme.tape, 0.7);
      g.fillRect(q(14), q(26), q(3), q(2));
      g.fillRect(q(30), q(19), q(3), q(2));
      break;
    case 'beacon':
      g.fillStyle(Theme.groundDeep, 0.8);
      g.fillEllipse(q(8), q(38), q(32), q(6));
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(19), q(15), q(10), q(25));
      g.fillRect(q(12), q(37), q(24), q(5));
      g.fillStyle(Theme.ink, 1);
      g.fillRect(q(22), q(17), q(4), q(18));
      g.fillStyle(Theme.inkBright, 0.65 + pulse * 0.1);
      g.fillCircle(q(24), q(10), q(5 + pulse));
      break;
    case 'shuttle':
      g.fillStyle(Theme.safe, 0.9);
      g.fillRect(q(3), q(3), q(42), q(42));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillRect(q(7), q(7), q(34), q(34));
      g.fillStyle(Theme.inkBright, 1);
      g.fillRect(q(21), q(10), q(6), q(28));
      g.fillRect(q(10), q(21), q(28), q(6));
      g.fillStyle(Theme.tape, 1);
      g.fillRect(q(8), q(8), q(8), q(2));
      g.fillRect(q(32), q(38), q(8), q(2));
      break;
    case 'landmark':
    case 'quest': {
      const color = kind === 'quest' ? Theme.flag : Theme.ink;
      g.fillStyle(color, 0.9);
      g.fillCircle(q(24), q(24), q(18));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillCircle(q(24), q(24), q(13));
      g.lineStyle(q(3), Theme.inkBright, 1);
      g.strokeCircle(q(24), q(24), q(7 + pulse));
      g.fillStyle(color, 1);
      g.fillTriangle(q(24), q(10 + pulse), q(19), q(21), q(29), q(21));
      g.fillRect(q(22), q(20), q(4), q(15));
      break;
    }
  }
}

function actorBase(g: G, T: number): (value: number) => number {
  transparent(g, T);
  const q = unit(T);
  g.fillStyle(0x000000, 0.6);
  g.fillEllipse(q(8), q(38), q(32), q(7));
  return q;
}

export function drawDeluxePlayer(g: G, T: number, frame: number): void {
  const q = actorBase(g, T);
  const bob = frame === 1 ? -1 : 0;
  g.fillStyle(Material.suitDeep, 1);
  g.fillRect(q(12), q(12 + bob), q(24), q(28));
  g.fillRect(q(9), q(20 + bob), q(7), q(15));
  g.fillRect(q(32), q(20 + bob), q(7), q(15));
  g.fillStyle(Material.suitLit, 1);
  g.fillRect(q(15), q(15 + bob), q(18), q(22));
  g.fillStyle(Material.suitMid, 1);
  g.fillRect(q(15), q(7 + bob), q(18), q(13));
  g.fillStyle(Theme.inkBright, 1);
  g.fillRect(q(18), q(10 + bob), q(13), q(6));
  g.fillStyle(Theme.biolum, 0.8);
  g.fillRect(q(20 + frame), q(12 + bob), q(7), q(2));
  g.fillStyle(Theme.ink, 1);
  g.fillRect(q(18), q(22 + bob), q(6), q(4));
  g.fillStyle(Material.visor, 1);
  g.fillRect(q(15 + (frame === 2 ? 1 : 0)), q(36), q(7), q(5));
  g.fillRect(q(27 - (frame === 2 ? 1 : 0)), q(36), q(7), q(5));
  g.fillStyle(Theme.safe, 0.9);
  g.fillRect(q(34), q(24 + bob), q(3), q(6));
}

/**
 * Body plans, keyed by what the enemy does rather than by name. A player should
 * be able to read the answer off the silhouette: machines hold lanes, crouched
 * things are waiting, reachers cover ground, apertures pressure a radius.
 */
type Silhouette =
  | 'scuttler'
  | 'bloom'
  | 'darter'
  | 'crouched'
  | 'annelid'
  | 'bulwark'
  | 'turret'
  | 'emitter'
  | 'chassis'
  | 'coil'
  | 'reacher'
  | 'aperture';

function silhouetteFor(kind: EnemyKind): Silhouette {
  const def = ENEMIES[kind];
  switch (def.behavior) {
    case 'wander':
      return 'scuttler';
    case 'swell':
      return 'bloom';
    case 'skirmish':
      return 'darter';
    case 'ambush':
      return 'crouched';
    case 'drain':
      return 'annelid';
    case 'guard':
      return 'bulwark';
    case 'sentinel':
      // Machines split by what they actually do, or five of them read alike.
      if (def.overwatch) return 'turret';
      if (def.beam) return 'emitter';
      return 'chassis';
    case 'hunter':
      if (def.hunt === 'reach') return 'reacher';
      if (def.hunt === 'zone') return 'aperture';
      return 'coil';
  }
}

/** Paired hostile optics, sized and placed to suit the body plan. */
function hostileEyes(g: G, q: Q, cx: number, y: number, spread: number, size: number): void {
  g.fillStyle(Theme.groundDeep, 1);
  g.fillRect(q(cx - spread - size), q(y), q(size), q(size));
  g.fillRect(q(cx + spread), q(y), q(size), q(size));
  g.fillStyle(Theme.rust, 1);
  g.fillRect(q(cx - spread - size + 1), q(y + 1), q(size - 2), q(size - 2));
  g.fillRect(q(cx + spread + 1), q(y + 1), q(size - 2), q(size - 2));
}

function drawSilhouette(
  g: G,
  q: Q,
  shape: Silhouette,
  color: number,
  frame: number,
  bob: number,
  kind: EnemyKind,
): void {
  const rim = mix(color, Theme.groundDeep, 0.62);
  const lit = mix(color, Theme.inkBright, 0.25);

  switch (shape) {
    case 'scuttler': {
      // Low, wide, many-legged. Occupies only the bottom band — reads as minor.
      // Extra lateral splay so it never reads as a floating bloom blob.
      const leg = frame === 1 ? 1 : 0;
      g.fillStyle(rim, 1);
      for (let i = 0; i < 5; i++) {
        const lx = 8 + i * 8;
        const out = i === 0 || i === 4 ? 2 : 0;
        g.fillRect(q(lx), q(33 + bob + out), q(3), q(7 - leg));
        g.fillRect(q(lx - 2), q(39 - leg + bob + out), q(7), q(2));
      }
      g.fillEllipse(q(24), q(32 + bob), q(34), q(14));
      g.fillStyle(color, 1);
      g.fillEllipse(q(24), q(31 + bob), q(26), q(9));
      g.fillStyle(lit, 1);
      g.fillRect(q(16), q(28 + bob), q(14), q(2));
      // Mandible nubs — mite identity at tile scale.
      g.fillStyle(rim, 1);
      g.fillRect(q(10), q(30 + bob), q(4), q(3));
      g.fillRect(q(34), q(30 + bob), q(4), q(3));
      hostileEyes(g, q, 24, 29 + bob, 5, 3);
      break;
    }
    case 'bloom': {
      // Visibly inflates frame to frame, so the swell timer reads off the body.
      // Radial spines keep it from collapsing into the scuttler oval.
      const r = 12 + frame * 2;
      g.fillStyle(rim, 1);
      g.fillCircle(q(24), q(26 + bob), q(r + 4));
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + frame * 0.15;
        const sx = 24 + Math.cos(ang) * (r + 2);
        const sy = 26 + bob + Math.sin(ang) * (r + 2);
        g.fillRect(q(sx - 1), q(sy - 1), q(3), q(3));
      }
      g.fillStyle(color, 1);
      g.fillCircle(q(24), q(26 + bob), q(r));
      g.fillStyle(lit, 0.85);
      g.fillCircle(q(19), q(21 + bob), q(4));
      g.fillStyle(Theme.arcWhite, 0.5 + frame * 0.2);
      g.fillCircle(q(24), q(26 + bob), q(3 + frame));
      // Stress fissures widen as it charges.
      g.fillStyle(Theme.rust, 0.35 + frame * 0.25);
      g.fillRect(q(23), q(26 - r + bob), q(2), q(r * 2));
      g.fillRect(q(24 - r), q(25 + bob), q(r * 2), q(2));
      break;
    }
    case 'darter': {
      // Narrow body, big beating wings — a thing that bites and backs off.
      // Peer split: wasp tip-sting, mastling bulky thorax, elites keep brand crown.
      const mastling = kind === 'mastling';
      const span = mastling ? (frame === 1 ? 18 : 14) : frame === 1 ? 15 : 10;
      const bodyW = mastling ? 12 : 9;
      const bodyH = mastling ? 20 : 24;
      g.fillStyle(mix(Theme.arcWhite, color, 0.5), 0.4);
      g.fillTriangle(q(20), q(18 + bob), q(20 - span), q(8 + bob), q(20), q(30 + bob));
      g.fillTriangle(q(28), q(18 + bob), q(28 + span), q(8 + bob), q(28), q(30 + bob));
      g.fillStyle(rim, 1);
      g.fillEllipse(q(24), q(25 + bob), q(mastling ? 18 : 14), q(mastling ? 26 : 30));
      g.fillStyle(color, 1);
      g.fillEllipse(q(24), q(25 + bob), q(bodyW), q(bodyH));
      if (mastling) {
        // Thick mid-band — heavier flyer than wasp.
        g.fillStyle(rim, 1);
        g.fillRect(q(16), q(24 + bob), q(16), q(4));
      }
      g.fillStyle(Theme.rust, 1);
      if (mastling) {
        g.fillRect(q(21), q(36 + bob), q(6), q(5));
      } else {
        g.fillTriangle(q(22), q(36 + bob), q(26), q(36 + bob), q(24), q(43 + bob));
      }
      hostileEyes(g, q, 24, mastling ? 14 + bob : 16 + bob, 2, 4);
      break;
    }
    case 'crouched': {
      // Coiled haunches, head down and forward. Reads as waiting, not walking.
      // Peer split so stalker / skitter / reef_skitter do not share one rodent blob.
      const reef = kind === 'reef_skitter';
      const skit = kind === 'skitter';
      g.fillStyle(rim, 1);
      if (skit) {
        // Flatter, many-legged crouch — no long snout.
        g.fillEllipse(q(24), q(30 + bob), q(32), q(16));
        for (let i = 0; i < 4; i++) {
          const lx = 10 + i * 9;
          g.fillRect(q(lx), q(36 + bob), q(3), q(6));
          g.fillRect(q(lx - 1), q(40 + bob), q(5), q(2));
        }
        g.fillStyle(color, 1);
        g.fillEllipse(q(24), q(29 + bob), q(24), q(10));
        g.fillStyle(Theme.rust, 1);
        g.fillRect(q(20), q(28 + bob), q(8), q(3));
        hostileEyes(g, q, 24, 27 + bob, 4, 3);
      } else if (reef) {
        // Wide stance + dorsal crest — shelf fauna, not the plains stalker.
        g.fillEllipse(q(28), q(30 + bob), q(30), q(18));
        g.fillTriangle(q(22), q(18 + bob), q(28), q(6 + bob), q(34), q(18 + bob));
        g.fillRect(q(8), q(28 + bob), q(18), q(10));
        g.fillStyle(color, 1);
        g.fillEllipse(q(28), q(29 + bob), q(22), q(12));
        g.fillRect(q(10), q(30 + bob), q(14), q(6));
        g.fillStyle(lit, 0.9);
        g.fillTriangle(q(24), q(16 + bob), q(28), q(8 + bob), q(32), q(16 + bob));
        g.fillStyle(rim, 1);
        g.fillRect(q(14), q(36 + bob), q(4), q(6));
        g.fillRect(q(34), q(36 + bob), q(4), q(6));
        g.fillStyle(Theme.rust, 1);
        g.fillRect(q(6), q(31 + bob), q(5), q(3));
        hostileEyes(g, q, 18, 29 + bob, 2, 3);
      } else {
        // Stalker — coiled haunches, head down and forward.
        g.fillEllipse(q(30), q(28 + bob), q(26), q(20));
        g.fillRect(q(10), q(26 + bob), q(20), q(11));
        g.fillTriangle(q(4), q(30 + bob), q(14), q(24 + bob), q(14), q(36 + bob));
        g.fillStyle(color, 1);
        g.fillEllipse(q(30), q(27 + bob), q(19), q(13));
        g.fillRect(q(12), q(28 + bob), q(16), q(7));
        g.fillStyle(rim, 1);
        const crouch = frame === 2 ? 1 : 0;
        g.fillRect(q(20), q(35 + bob), q(4), q(6 - crouch));
        g.fillRect(q(34), q(35 + bob), q(4), q(6 - crouch));
        g.fillStyle(Theme.rust, 1);
        g.fillRect(q(6), q(29 + bob), q(5), q(3));
        hostileEyes(g, q, 17, 27 + bob, 2, 3);
      }
      break;
    }
    case 'annelid': {
      // Stacked segments under a ringed sucker — the siphon reads at a glance.
      g.fillStyle(rim, 1);
      for (let i = 0; i < 4; i++) {
        const w = 22 - i * 3;
        g.fillEllipse(q(24), q(36 - i * 8 + bob), q(w), q(10));
      }
      g.fillStyle(color, 1);
      for (let i = 0; i < 4; i++) {
        const w = 16 - i * 3;
        g.fillEllipse(q(24), q(36 - i * 8 + bob), q(w), q(6));
      }
      g.fillStyle(rim, 1);
      g.fillCircle(q(24), q(9 + bob), q(10));
      g.fillStyle(Theme.rust, 1);
      g.fillCircle(q(24), q(9 + bob), q(6 - (frame === 1 ? 1 : 0)));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillCircle(q(24), q(9 + bob), q(3));
      break;
    }
    case 'bulwark': {
      // Wide plated dome, planted on the tile. Nothing about it says mobile.
      g.fillStyle(rim, 1);
      g.fillTriangle(q(2), q(40 + bob), q(10), q(14 + bob), q(38), q(14 + bob));
      g.fillRect(q(6), q(14 + bob), q(36), q(26));
      g.fillTriangle(q(46), q(40 + bob), q(38), q(14 + bob), q(10), q(14 + bob));
      g.fillStyle(color, 1);
      g.fillRect(q(11), q(19 + bob), q(26), q(17));
      // Plate ridges.
      g.fillStyle(rim, 1);
      g.fillRect(q(11), q(24 + bob), q(26), q(2));
      g.fillRect(q(11), q(30 + bob), q(26), q(2));
      g.fillStyle(Theme.tape, 0.75);
      g.fillRect(q(11), q(19 + bob), q(26), q(2));
      hostileEyes(g, q, 24, 21 + bob, 5, 4);
      break;
    }
    case 'turret': {
      // Squat mount under a swivelling head with a levelled barrel: it is
      // aiming at ground, which is exactly what overwatch punishes.
      g.fillStyle(Theme.panelEdge, 1);
      g.fillTriangle(q(6), q(42 + bob), q(14), q(26 + bob), q(34), q(26 + bob));
      g.fillTriangle(q(42), q(42 + bob), q(34), q(26 + bob), q(14), q(26 + bob));
      g.fillStyle(Theme.panel, 1);
      g.fillRect(q(13), q(30 + bob), q(22), q(10));
      // Swivel head, tracking across frames.
      const swivel = frame === 1 ? 3 : frame === 2 ? -3 : 0;
      g.fillStyle(color, 1);
      g.fillRect(q(13 + swivel), q(12 + bob), q(22), q(16));
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(15 + swivel), q(14 + bob), q(18), q(6));
      // Levelled barrel — the aimed line reads even at tile size.
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(33 + swivel), q(20 + bob), q(13), q(5));
      g.fillStyle(Theme.tape, 1);
      g.fillRect(q(43 + swivel), q(20 + bob), q(3), q(5));
      g.fillStyle(Theme.rust, 1);
      g.fillRect(q(17 + swivel), q(21 + bob), q(5), q(5));
      break;
    }
    case 'emitter': {
      // Dish and focusing prongs across a lane — it threatens a line, not a tile.
      const duct = kind === 'duct_drone';
      if (duct) {
        // Conduit housing — boxy chassis + side vents, not the open dish drone.
        g.fillStyle(Theme.panelEdge, 1);
        g.fillRect(q(8), q(12 + bob), q(32), q(24));
        g.fillStyle(Theme.panel, 1);
        g.fillRect(q(11), q(15 + bob), q(26), q(18));
        g.fillStyle(color, 1);
        g.fillRect(q(11), q(15 + bob), q(26), q(4));
        g.fillStyle(Theme.panelEdge, 1);
        g.fillRect(q(2), q(20 + bob), q(8), q(6));
        g.fillRect(q(38), q(20 + bob), q(8), q(6));
        g.fillStyle(Theme.groundDeep, 1);
        g.fillRect(q(16), q(22 + bob), q(16), q(8));
        g.fillStyle(Theme.arcWhite, 0.5 + frame * 0.2);
        g.fillRect(q(20), q(24 + bob), q(8), q(4));
        g.fillStyle(Theme.panelEdge, 1);
        g.fillRect(q(12 - frame), q(8 + bob), q(24 + frame * 2), q(3));
      } else {
        g.fillStyle(Theme.panelEdge, 1);
        g.fillRect(q(12), q(14 + bob), q(24), q(20));
        g.fillStyle(Theme.panel, 1);
        g.fillRect(q(14), q(16 + bob), q(20), q(16));
        // Lane prongs reach out to both sides.
        g.fillStyle(Theme.panelEdge, 1);
        g.fillRect(q(2), q(22 + bob), q(11), q(4));
        g.fillRect(q(35), q(22 + bob), q(11), q(4));
        g.fillStyle(color, 1);
        g.fillRect(q(2), q(20 + bob), q(3), q(9));
        g.fillRect(q(43), q(20 + bob), q(3), q(9));
        // Charging aperture at the centre.
        g.fillStyle(Theme.groundDeep, 1);
        g.fillCircle(q(24), q(24 + bob), q(9));
        g.fillStyle(Theme.arcWhite, 0.5 + frame * 0.2);
        g.fillCircle(q(24), q(24 + bob), q(4 + frame));
        // Rotor keeps it visibly airborne.
        g.fillStyle(Theme.panelEdge, 1);
        g.fillRect(q(14 - frame), q(8 + bob), q(20 + frame * 2), q(3));
      }
      break;
    }
    case 'chassis': {
      // Plain hard-cased machine — no lane, no held shot, just armour.
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(8), q(10 + bob), q(32), q(30));
      g.fillStyle(Theme.panel, 1);
      g.fillRect(q(11), q(13 + bob), q(26), q(24));
      g.fillStyle(color, 1);
      g.fillRect(q(11), q(13 + bob), q(26), q(5));
      g.fillRect(q(11), q(32 + bob), q(26), q(5));
      // Recessed visor band.
      g.fillStyle(Theme.groundDeep, 1);
      g.fillRect(q(13), q(21 + bob), q(22), q(8));
      g.fillStyle(Theme.rust, 1);
      g.fillRect(q(15 + frame * 7), q(23 + bob), q(6), q(4));
      // Bolted feet.
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(10), q(40 + bob), q(7), q(4));
      g.fillRect(q(31), q(40 + bob), q(7), q(4));
      break;
    }
    case 'coil': {
      // Coiled base, raised striking neck — the classic one-tile lunge.
      g.fillStyle(rim, 1);
      g.fillEllipse(q(24), q(35 + bob), q(32), q(14));
      g.fillEllipse(q(24), q(29 + bob), q(24), q(11));
      const lean = frame === 1 ? 3 : frame === 2 ? -2 : 0;
      g.fillRect(q(21 + lean), q(12 + bob), q(7), q(16));
      g.fillStyle(color, 1);
      g.fillEllipse(q(24), q(34 + bob), q(24), q(8));
      g.fillEllipse(q(24), q(29 + bob), q(17), q(6));
      g.fillRect(q(22 + lean), q(13 + bob), q(4), q(14));
      // Raised head and fangs.
      g.fillStyle(rim, 1);
      g.fillTriangle(q(16 + lean), q(13 + bob), q(32 + lean), q(13 + bob), q(24 + lean), q(3 + bob));
      g.fillStyle(Theme.rust, 1);
      g.fillRect(q(21 + lean), q(13 + bob), q(2), q(4));
      g.fillRect(q(25 + lean), q(13 + bob), q(2), q(4));
      hostileEyes(g, q, 24 + lean, 8 + bob, 2, 3);
      break;
    }
    case 'reacher': {
      // Long trailing limbs that visibly out-span the tile: it covers ground.
      const stretch = frame === 1 ? 4 : 0;
      g.fillStyle(rim, 1);
      g.fillRect(q(19), q(8 + bob), q(10), q(24));
      // Arms sweep wide and low.
      g.fillTriangle(q(19), q(12 + bob), q(2), q(24 + stretch + bob), q(19), q(22 + bob));
      g.fillTriangle(q(29), q(12 + bob), q(46), q(24 + stretch + bob), q(29), q(22 + bob));
      // Tattered trailing body instead of legs.
      g.fillTriangle(q(17), q(30 + bob), q(31), q(30 + bob), q(24), q(44 + bob));
      g.fillStyle(color, 1);
      g.fillRect(q(21), q(11 + bob), q(6), q(19));
      g.fillTriangle(q(20), q(31 + bob), q(28), q(31 + bob), q(24), q(40 + bob));
      g.fillStyle(lit, 0.9);
      g.fillRect(q(6), q(22 + stretch + bob), q(9), q(2));
      g.fillRect(q(33), q(22 + stretch + bob), q(9), q(2));
      hostileEyes(g, q, 24, 12 + bob, 2, 4);
      break;
    }
    case 'aperture': {
      // A ring around a core. The ring is the threatened radius, drawn on it.
      g.fillStyle(rim, 1);
      g.fillCircle(q(24), q(24 + bob), q(21));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillCircle(q(24), q(24 + bob), q(17));
      g.lineStyle(q(3), color, 1);
      g.strokeCircle(q(24), q(24 + bob), q(19 - frame));
      g.lineStyle(q(1), lit, 0.7);
      g.strokeCircle(q(24), q(24 + bob), q(13 + frame));
      g.fillStyle(color, 1);
      g.fillCircle(q(24), q(24 + bob), q(6 + frame));
      g.fillStyle(Theme.arcWhite, 0.9);
      g.fillCircle(q(24), q(24 + bob), q(3));
      // Aperture blades mark the cardinal reach.
      g.fillStyle(color, 0.85);
      g.fillRect(q(23), q(2 + bob), q(2), q(6));
      g.fillRect(q(23), q(40 + bob), q(2), q(6));
      g.fillRect(q(2), q(23 + bob), q(6), q(2));
      g.fillRect(q(40), q(23 + bob), q(6), q(2));
      break;
    }
  }
}

const hoverShapes = new Set<Silhouette>(['darter', 'reacher', 'aperture', 'bloom']);

export function drawDeluxeEnemy(g: G, T: number, kind: EnemyKind, frame: number): void {
  const q = actorBase(g, T);
  const def = ENEMIES[kind];
  const shape = silhouetteFor(kind);
  const bob = hoverShapes.has(shape) && frame === 1 ? -2 : frame === 2 ? 1 : 0;
  drawSilhouette(g, q, shape, def.color, frame, bob, kind);

  // Branded field modifier — the crown says "this one drops kit and hits back
  // harder" without disturbing the body plan underneath.
  if (def.brand) {
    g.fillStyle(Theme.tape, 1);
    g.fillTriangle(q(9), q(9), q(14), q(1), q(19), q(9));
    g.fillTriangle(q(19), q(9), q(24), q(0), q(29), q(9));
    g.fillTriangle(q(29), q(9), q(34), q(1), q(39), q(9));
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(q(9), q(9), q(30), q(2));
  }
}

export function drawDeluxeItem(g: G, T: number, kind: 'crate' | 'key' | 'core'): void {
  const q = actorBase(g, T);
  // Salvage is taped and stencilled; objectives get surveyor's flagging pink.
  g.fillStyle(kind === 'crate' ? Theme.tape : kind === 'key' ? Theme.flag : Theme.arcWhite, 0.4);
  g.fillCircle(q(24), q(24), q(17));
  if (kind === 'crate') {
    g.fillStyle(Theme.inkDim, 1);
    g.fillRect(q(9), q(15), q(30), q(23));
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(q(13), q(19), q(22), q(15));
    g.fillStyle(Theme.tape, 1);
    g.fillRect(q(20), q(14), q(8), q(8));
    g.fillRect(q(17), q(24), q(14), q(5));
  } else if (kind === 'key') {
    g.fillStyle(Theme.flag, 1);
    g.fillTriangle(q(24), q(4), q(11), q(22), q(37), q(22));
    g.fillTriangle(q(24), q(44), q(11), q(22), q(37), q(22));
    g.fillStyle(Theme.inkBright, 1);
    g.fillRect(q(22), q(10), q(4), q(25));
    g.fillRect(q(16), q(19), q(16), q(4));
  } else {
    g.fillStyle(Theme.arcWhite, 1);
    g.fillTriangle(q(24), q(3), q(5), q(24), q(24), q(45));
    g.fillTriangle(q(24), q(3), q(43), q(24), q(24), q(45));
    g.fillStyle(Theme.groundDeep, 1);
    g.fillCircle(q(24), q(24), q(9));
    g.fillStyle(Theme.inkBright, 1);
    g.fillCircle(q(24), q(24), q(5));
  }
}

export function drawDeluxeContact(
  g: G,
  T: number,
  role: 'npc' | 'ally',
  kind: string,
): void {
  const q = actorBase(g, T);
  const ally = role === 'ally';
  const body = ally ? Material.allyShell : kind === 'archive_holo' ? Material.contactHolo : Material.contactSuit;
  const rim = ally ? Material.allyRim : Material.contactRim;
  if (kind.includes('drone')) {
    g.fillStyle(rim, 1);
    g.fillRect(q(8), q(14), q(32), q(22));
    g.fillStyle(body, 1);
    g.fillRect(q(12), q(18), q(24), q(14));
  } else {
    g.fillStyle(rim, 1);
    g.fillRect(q(13), q(7), q(22), q(34));
    g.fillStyle(body, kind === 'archive_holo' ? 0.8 : 1);
    g.fillRect(q(17), q(10), q(14), q(27));
    g.fillRect(q(10), q(18), q(8), q(16));
    g.fillRect(q(30), q(18), q(8), q(16));
  }
  g.fillStyle(Theme.inkBright, 1);
  g.fillRect(q(18), q(15), q(5), q(3));
  g.fillRect(q(27), q(15), q(4), q(3));
  g.fillStyle(ally ? Theme.safe : Theme.biolum, 1);
  g.fillRect(q(21), q(25), q(8), q(5));
  if (kind === 'archive_holo') {
    g.fillStyle(Theme.biolum, 0.5);
    g.fillRect(q(10), q(12), q(28), q(1));
    g.fillRect(q(12), q(28), q(24), q(1));
  }
}
