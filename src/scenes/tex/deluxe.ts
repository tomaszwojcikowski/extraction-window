import Phaser from 'phaser';
import type { SectorId } from '../../data/encounters';
import { ENEMIES, type EnemyKind } from '../../data/enemies';
import { BIOME_FLOOR_TINT, Theme } from '../theme';
import type { WallStyle } from '../textures';

type G = Phaser.GameObjects.Graphics;

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

const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

function shade(color: number, amount: number): number {
  const r = clamp(((color >> 16) & 0xff) * amount);
  const g = clamp(((color >> 8) & 0xff) * amount);
  const b = clamp((color & 0xff) * amount);
  return (r << 16) | (g << 8) | b;
}

function mix(a: number, b: number, amount: number): number {
  const t = Math.max(0, Math.min(1, amount));
  const r = clamp(((a >> 16) & 0xff) * (1 - t) + ((b >> 16) & 0xff) * t);
  const g = clamp(((a >> 8) & 0xff) * (1 - t) + ((b >> 8) & 0xff) * t);
  const bl = clamp((a & 0xff) * (1 - t) + (b & 0xff) * t);
  return (r << 16) | (g << 8) | bl;
}

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
      return Theme.ionHazard;
    case 'reef':
    case 'canopy':
      return Theme.ok;
    case 'fissure':
    case 'approach':
    case 'ash':
      return Theme.storm;
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

  // Sparse biome decal layer.
  g.fillStyle(accent, 0.42);
  switch (sector) {
    case 'ruin':
    case 'trench': {
      const ox = q(7 + variant * 3);
      g.fillRect(ox, q(12), q(12), q(3));
      g.fillRect(ox + q(4), q(15), q(7), q(4));
      g.fillStyle(Theme.groundDeep, 0.8);
      g.fillRect(ox + q(2), q(13), q(4), q(1));
      break;
    }
    case 'flood':
    case 'brine':
      for (let i = 0; i < 3; i++) {
        const y = q(11 + i * 9 + variant);
        g.fillRect(q(7 + ((i + variant) % 2) * 5), y, q(25 - i * 4), q(1));
        g.fillRect(q(13 + i * 2), y + q(2), q(12), q(1));
      }
      break;
    case 'ash':
      for (let i = 0; i < 8; i++) {
        const x = q(5 + ((i * 9 + variant * 5) % 37));
        const y = q(8 + ((i * 7 + variant * 13) % 32));
        g.fillRect(x, y, q(i % 3 === 0 ? 3 : 1), q(i % 3 === 0 ? 2 : 1));
      }
      break;
    case 'duct':
      g.fillStyle(Theme.panelEdge, 0.58);
      for (let x = q(8 + variant * 2); x < T - q(6); x += q(8)) {
        g.fillRect(x, q(6), q(2), T - q(13));
      }
      g.fillStyle(accent, 0.48);
      g.fillRect(q(6), q(17 + variant * 4), T - q(12), q(2));
      g.fillRect(q(6), q(30 + variant), T - q(12), q(1));
      break;
    case 'reef':
      for (let i = 0; i < 4; i++) {
        const x = q(7 + ((i * 11 + variant * 3) % 31));
        const y = q(9 + ((i * 7 + variant * 5) % 25));
        g.fillTriangle(x, y + q(7), x + q(3), y, x + q(7), y + q(7));
      }
      break;
    case 'canopy':
    case 'plains':
      for (let i = 0; i < 5; i++) {
        const x = q(7 + ((i * 9 + variant * 4) % 31));
        const y = q(8 + ((i * 13 + variant * 2) % 31));
        g.fillRect(x, y, q(5), q(1));
        g.fillRect(x + q(2), y - q(2), q(1), q(5));
      }
      break;
    case 'beacon':
    case 'vault':
    case 'spire': {
      const c = T / 2;
      g.lineStyle(q(1), accent, 0.42);
      g.strokeCircle(c, c, q(8 + variant * 3));
      g.lineBetween(c - q(15), c, c + q(15), c);
      g.lineBetween(c, c - q(15), c, c + q(15));
      break;
    }
    case 'fissure':
    case 'approach':
    case 'ridge':
      g.lineStyle(q(1), accent, 0.48);
      g.lineBetween(q(5), q(34 - variant * 3), q(18), q(16 + variant * 2));
      g.lineBetween(q(18), q(16 + variant * 2), q(29), q(29 - variant));
      g.lineBetween(q(29), q(29 - variant), q(43), q(10 + variant * 4));
      break;
  }
}

/** High-contrast, beveled cliff / bulkhead / conduit families. */
export function drawDeluxeWall(g: G, T: number, style: WallStyle, variant: number): void {
  const q = unit(T);
  g.clear();
  g.fillStyle(Theme.groundDeep, 1);
  g.fillRect(0, 0, T, T);
  // Meridian geology, not starship grey: basalt shelf, painted bulkhead, wet duct steel.
  g.fillStyle(style === 'cliff' ? 0x2c3a37 : style === 'bulkhead' ? 0x28343a : 0x1e2f36, 1);
  g.fillRect(q(1), q(1), T - q(2), T - q(2));

  // Bright top/left bevel, deep bottom/right bevel.
  g.fillStyle(style === 'conduit' ? Theme.biolumDeep : Theme.inkMute, 0.9);
  g.fillRect(q(2), q(2), T - q(4), q(4));
  g.fillRect(q(2), q(6), q(4), T - q(10));
  g.fillStyle(Theme.groundDeep, 0.95);
  g.fillRect(q(5), T - q(7), T - q(10), q(5));
  g.fillRect(T - q(7), q(6), q(5), T - q(13));

  if (style === 'cliff') {
    g.fillStyle(0x0d1517, 0.95);
    for (let i = 0; i < 5; i++) {
      const y = q(9 + i * 7 + (variant ? i % 2 : 0));
      const x = q(7 + ((i * 9 + variant * 4) % 14));
      g.fillRect(x, y, q(21 - (i % 3) * 4), q(3));
      g.fillStyle(Theme.inkMute, 0.55);
      g.fillRect(x, y, q(8), q(1));
      g.fillStyle(0x0d1517, 0.95);
    }
  } else if (style === 'bulkhead') {
    g.fillStyle(Theme.panel, 1);
    g.fillRect(q(8), q(8), T - q(16), T - q(18));
    g.lineStyle(q(2), Theme.panelEdge, 0.95);
    g.strokeRect(q(9), q(9), T - q(18), T - q(20));
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(q(22), q(10), q(4), T - q(24));
    g.fillRect(q(10), q(22), T - q(20), q(3));
    g.fillStyle(variant ? Theme.tape : Theme.inkDim, 0.85);
    g.fillRect(q(11), q(11), q(7), q(2));
    g.fillRect(T - q(18), T - q(15), q(7), q(2));
  } else {
    g.fillStyle(Theme.panel, 1);
    g.fillRect(q(8), q(8), T - q(16), T - q(18));
    for (let i = 0; i < 3; i++) {
      const y = q(11 + i * 9 + variant);
      g.fillStyle(i === 1 ? Theme.ionHazardDeep : Theme.panelEdge, 0.95);
      g.fillRect(q(7), y, T - q(14), q(5));
      g.fillStyle(Theme.phosphorBright, 0.45);
      g.fillRect(q(11 + i * 7), y + q(1), q(3), q(2));
    }
  }
}

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
    case 'scrub_nest':
      g.fillStyle(Theme.groundDeep, 0.75);
      g.fillEllipse(q(7), q(34), q(34), q(7));
      g.fillStyle(0x285b49, 1);
      for (let i = 0; i < 5; i++) {
        const x = q(9 + i * 7);
        const h = q(12 + ((i * 5) % 12));
        g.fillRect(x, q(36) - h, q(3), h);
        g.fillStyle(Theme.ok, 0.85);
        g.fillTriangle(x - q(3), q(19 + (i % 3) * 4), x + q(2), q(14 + (i % 2) * 5), x + q(5), q(20 + (i % 3) * 4));
        g.fillStyle(0x285b49, 1);
      }
      if (kind === 'scrub_nest') {
        g.fillStyle(Theme.ionHazardDeep, 0.95);
        g.fillEllipse(q(14), q(27), q(21), q(11));
        g.fillStyle(Theme.ionHazard, 0.7);
        g.fillRect(q(21), q(29), q(7), q(2));
      }
      break;
    case 'rubble':
      g.fillStyle(Theme.groundDeep, 0.8);
      g.fillEllipse(q(5), q(35), q(39), q(7));
      g.fillStyle(0x4e4658, 1);
      g.fillTriangle(q(5), q(35), q(15), q(21), q(23), q(35));
      g.fillTriangle(q(17), q(35), q(30), q(14), q(42), q(35));
      g.fillStyle(Theme.phosphorMute, 0.85);
      g.fillTriangle(q(9), q(31), q(15), q(23), q(19), q(32));
      g.fillTriangle(q(24), q(31), q(30), q(17), q(35), q(31));
      break;
    case 'vent':
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(4), q(5), q(40), q(38));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillRect(q(8), q(9), q(32), q(30));
      for (let y = 11 + pulse; y < 38; y += 7) {
        g.fillStyle(Theme.ionHazardDeep, 0.75);
        g.fillRect(q(10), q(y), q(28), q(3));
        g.fillStyle(Theme.ionHazard, 0.55);
        g.fillRect(q(12 + pulse), q(y), q(12), q(1));
      }
      break;
    case 'hazard':
      g.fillStyle(0x351522, 1);
      g.fillRect(q(2), q(2), q(44), q(44));
      g.lineStyle(q(2), Theme.danger, 0.95);
      g.strokeRect(q(4), q(4), q(40), q(40));
      g.fillStyle(Theme.storm, 0.9);
      g.fillTriangle(q(24), q(7 + pulse), q(7), q(38), q(41), q(38));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillTriangle(q(24), q(13 + pulse), q(14), q(34), q(34), q(34));
      g.fillStyle(Theme.phosphorBright, 1);
      g.fillRect(q(22), q(19 + pulse), q(4), q(9));
      g.fillRect(q(22), q(31 + pulse / 2), q(4), q(4));
      break;
    case 'brine_pool':
      g.fillStyle(0x123349, 0.95);
      g.fillEllipse(q(3), q(11), q(42), q(29));
      g.fillStyle(Theme.ionHazardDeep, 0.85);
      g.fillEllipse(q(7 + pulse), q(15), q(34 - pulse), q(20));
      g.fillStyle(Theme.ionHazard, 0.7);
      g.fillRect(q(10 + pulse * 3), q(21), q(9), q(2));
      g.fillRect(q(25 - pulse * 2), q(29), q(11), q(2));
      break;
    case 'sealed':
    case 'exit': {
      const open = kind === 'exit';
      g.fillStyle(open ? Theme.ok : Theme.storm, 1);
      g.fillRect(q(4), q(3), q(40), q(42));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillRect(q(8), q(7), q(32), q(38));
      g.fillStyle(Theme.panel, 1);
      g.fillRect(q(12), q(9), q(24), q(36));
      g.fillStyle(open ? Theme.ok : Theme.danger, 0.95);
      g.fillRect(q(22), q(10), q(4), q(34));
      g.fillRect(q(13), q(24), q(22), q(3));
      g.fillStyle(Theme.phosphorBright, 1);
      if (open) {
        g.fillTriangle(q(17), q(18), q(29), q(24), q(17), q(30));
      } else {
        g.fillRect(q(19), q(19), q(10), q(3));
        g.fillRect(q(23), q(15), q(3), q(11));
      }
      break;
    }
    case 'tripwire':
      g.fillStyle(Theme.danger, 0.22);
      g.fillRect(q(2), q(2), q(44), q(44));
      g.lineStyle(q(2), Theme.storm, 0.95);
      g.lineBetween(q(4), q(32), q(44), q(18));
      g.fillStyle(Theme.phosphorBright, 1);
      g.fillRect(q(4), q(27), q(4), q(10));
      g.fillRect(q(40), q(13), q(4), q(10));
      break;
    case 'beacon':
      g.fillStyle(Theme.groundDeep, 0.8);
      g.fillEllipse(q(8), q(38), q(32), q(6));
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(19), q(15), q(10), q(25));
      g.fillRect(q(12), q(37), q(24), q(5));
      g.fillStyle(Theme.phosphor, 1);
      g.fillRect(q(22), q(17), q(4), q(18));
      g.fillStyle(Theme.phosphorBright, 0.65 + pulse * 0.1);
      g.fillCircle(q(24), q(10), q(5 + pulse));
      break;
    case 'shuttle':
      g.fillStyle(Theme.ok, 0.9);
      g.fillRect(q(3), q(3), q(42), q(42));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillRect(q(7), q(7), q(34), q(34));
      g.fillStyle(Theme.phosphorBright, 1);
      g.fillRect(q(21), q(10), q(6), q(28));
      g.fillRect(q(10), q(21), q(28), q(6));
      g.fillStyle(Theme.energy, 1);
      g.fillRect(q(8), q(8), q(8), q(2));
      g.fillRect(q(32), q(38), q(8), q(2));
      break;
    case 'landmark':
    case 'quest': {
      const color = kind === 'quest' ? Theme.quest : Theme.phosphor;
      g.fillStyle(color, 0.9);
      g.fillCircle(q(24), q(24), q(18));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillCircle(q(24), q(24), q(13));
      g.lineStyle(q(3), Theme.phosphorBright, 1);
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
  g.fillStyle(0x09111e, 1);
  g.fillRect(q(12), q(12 + bob), q(24), q(28));
  g.fillRect(q(9), q(20 + bob), q(7), q(15));
  g.fillRect(q(32), q(20 + bob), q(7), q(15));
  g.fillStyle(0x3175a8, 1);
  g.fillRect(q(15), q(15 + bob), q(18), q(22));
  g.fillStyle(0x18344e, 1);
  g.fillRect(q(15), q(7 + bob), q(18), q(13));
  g.fillStyle(Theme.phosphorBright, 1);
  g.fillRect(q(18), q(10 + bob), q(13), q(6));
  g.fillStyle(Theme.ionHazard, 0.8);
  g.fillRect(q(20 + frame), q(12 + bob), q(7), q(2));
  g.fillStyle(Theme.phosphor, 1);
  g.fillRect(q(18), q(22 + bob), q(6), q(4));
  g.fillStyle(0x07101c, 1);
  g.fillRect(q(15 + (frame === 2 ? 1 : 0)), q(36), q(7), q(5));
  g.fillRect(q(27 - (frame === 2 ? 1 : 0)), q(36), q(7), q(5));
  g.fillStyle(Theme.ok, 0.9);
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
  | 'machine'
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
      return 'machine';
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
  g.fillStyle(Theme.danger, 1);
  g.fillRect(q(cx - spread - size + 1), q(y + 1), q(size - 2), q(size - 2));
  g.fillRect(q(cx + spread + 1), q(y + 1), q(size - 2), q(size - 2));
}

type Q = (value: number) => number;

function drawSilhouette(
  g: G,
  q: Q,
  shape: Silhouette,
  color: number,
  frame: number,
  bob: number,
): void {
  const rim = mix(color, Theme.groundDeep, 0.62);
  const lit = mix(color, Theme.inkBright, 0.25);

  switch (shape) {
    case 'scuttler': {
      // Low, wide, many-legged. Occupies only the bottom band — reads as minor.
      const leg = frame === 1 ? 1 : 0;
      g.fillStyle(rim, 1);
      for (let i = 0; i < 4; i++) {
        const lx = 11 + i * 8;
        g.fillRect(q(lx), q(34 + bob), q(3), q(6 - leg));
        g.fillRect(q(lx - 1), q(38 - leg + bob), q(5), q(2));
      }
      g.fillEllipse(q(24), q(31 + bob), q(30), q(18));
      g.fillStyle(color, 1);
      g.fillEllipse(q(24), q(30 + bob), q(24), q(12));
      g.fillStyle(lit, 1);
      g.fillRect(q(18), q(26 + bob), q(12), q(2));
      hostileEyes(g, q, 24, 28 + bob, 4, 4);
      break;
    }
    case 'bloom': {
      // Visibly inflates frame to frame, so the swell timer reads off the body.
      const r = 12 + frame * 2;
      g.fillStyle(rim, 1);
      g.fillCircle(q(24), q(26 + bob), q(r + 4));
      g.fillStyle(color, 1);
      g.fillCircle(q(24), q(26 + bob), q(r));
      g.fillStyle(lit, 0.85);
      g.fillCircle(q(19), q(21 + bob), q(4));
      g.fillStyle(Theme.arcWhite, 0.5 + frame * 0.2);
      g.fillCircle(q(24), q(26 + bob), q(3 + frame));
      // Stress fissures widen as it charges.
      g.fillStyle(Theme.danger, 0.35 + frame * 0.25);
      g.fillRect(q(23), q(26 - r + bob), q(2), q(r * 2));
      g.fillRect(q(24 - r), q(25 + bob), q(r * 2), q(2));
      break;
    }
    case 'darter': {
      // Narrow body, big beating wings — a thing that bites and backs off.
      const span = frame === 1 ? 15 : 10;
      g.fillStyle(mix(Theme.arcWhite, color, 0.5), 0.4);
      g.fillTriangle(q(20), q(18 + bob), q(20 - span), q(8 + bob), q(20), q(30 + bob));
      g.fillTriangle(q(28), q(18 + bob), q(28 + span), q(8 + bob), q(28), q(30 + bob));
      g.fillStyle(rim, 1);
      g.fillEllipse(q(24), q(25 + bob), q(14), q(30));
      g.fillStyle(color, 1);
      g.fillEllipse(q(24), q(25 + bob), q(9), q(24));
      g.fillStyle(Theme.danger, 1);
      g.fillTriangle(q(22), q(36 + bob), q(26), q(36 + bob), q(24), q(43 + bob));
      hostileEyes(g, q, 24, 16 + bob, 2, 4);
      break;
    }
    case 'crouched': {
      // Coiled haunches, head down and forward. Reads as waiting, not walking.
      g.fillStyle(rim, 1);
      g.fillEllipse(q(30), q(28 + bob), q(26), q(20));
      g.fillRect(q(10), q(26 + bob), q(20), q(11));
      g.fillTriangle(q(4), q(30 + bob), q(14), q(24 + bob), q(14), q(36 + bob));
      g.fillStyle(color, 1);
      g.fillEllipse(q(30), q(27 + bob), q(19), q(13));
      g.fillRect(q(12), q(28 + bob), q(16), q(7));
      // Braced legs, compressed and ready.
      g.fillStyle(rim, 1);
      const crouch = frame === 2 ? 1 : 0;
      g.fillRect(q(20), q(35 + bob), q(4), q(6 - crouch));
      g.fillRect(q(34), q(35 + bob), q(4), q(6 - crouch));
      g.fillStyle(Theme.danger, 1);
      g.fillRect(q(6), q(29 + bob), q(5), q(3));
      hostileEyes(g, q, 17, 27 + bob, 2, 3);
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
      g.fillStyle(Theme.danger, 1);
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
    case 'machine': {
      // Hard rectilinear chassis and a single optic — machines are not fauna.
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(8), q(12 + bob), q(32), q(26));
      g.fillStyle(Theme.panel, 1);
      g.fillRect(q(10), q(14 + bob), q(28), q(22));
      // Mast and mount.
      g.fillStyle(Theme.panelEdge, 1);
      g.fillRect(q(22), q(4 + bob), q(4), q(9));
      g.fillRect(q(17), q(3 + bob), q(14), q(3));
      g.fillRect(q(14), q(38 + bob), q(20), q(4));
      // Chassis banding in the kind colour, then the optic.
      g.fillStyle(color, 1);
      g.fillRect(q(10), q(31 + bob), q(28), q(4));
      g.fillStyle(Theme.groundDeep, 1);
      g.fillRect(q(15), q(18 + bob), q(18), q(10));
      g.fillStyle(Theme.danger, 1);
      g.fillRect(q(17 + frame * 5), q(20 + bob), q(6), q(6));
      g.fillStyle(Theme.arcWhite, 0.8);
      g.fillRect(q(17 + frame * 5), q(20 + bob), q(2), q(2));
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
      g.fillStyle(Theme.danger, 1);
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
  const shape = silhouetteFor(kind);
  const bob = hoverShapes.has(shape) && frame === 1 ? -2 : frame === 2 ? 1 : 0;
  drawSilhouette(g, q, shape, ENEMIES[kind].color, frame, bob);
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
    g.fillStyle(Theme.phosphorBright, 1);
    g.fillRect(q(22), q(10), q(4), q(25));
    g.fillRect(q(16), q(19), q(16), q(4));
  } else {
    g.fillStyle(Theme.arcWhite, 1);
    g.fillTriangle(q(24), q(3), q(5), q(24), q(24), q(45));
    g.fillTriangle(q(24), q(3), q(43), q(24), q(24), q(45));
    g.fillStyle(Theme.groundDeep, 1);
    g.fillCircle(q(24), q(24), q(9));
    g.fillStyle(Theme.phosphorBright, 1);
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
  const body = ally ? 0x78caa0 : kind === 'archive_holo' ? 0x66ccee : 0xd6b080;
  const rim = ally ? 0x143b31 : 0x243d4d;
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
  g.fillStyle(Theme.phosphorBright, 1);
  g.fillRect(q(18), q(15), q(5), q(3));
  g.fillRect(q(27), q(15), q(4), q(3));
  g.fillStyle(ally ? Theme.ok : Theme.ionHazard, 1);
  g.fillRect(q(21), q(25), q(8), q(5));
  if (kind === 'archive_holo') {
    g.fillStyle(Theme.ionHazard, 0.5);
    g.fillRect(q(10), q(12), q(28), q(1));
    g.fillRect(q(12), q(28), q(24), q(1));
  }
}
