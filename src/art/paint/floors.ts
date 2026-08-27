import type { SectorId } from '../../data/encounters';
import { mix, shade } from '../../scenes/tex/color';
import { BIOME_FLOOR_TINT, FLOOR_VARIANT_COUNT, Material, Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px, TILE } from '../px';
import { grit } from '../shade';

const SECTORS: SectorId[] = [
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

type FloorFamily = 'cliff' | 'wet' | 'built';

function familyOf(sector: SectorId): FloorFamily {
  if (sector === 'flood' || sector === 'brine' || sector === 'reef') return 'wet';
  if (
    sector === 'duct' ||
    sector === 'spire' ||
    sector === 'vault' ||
    sector === 'beacon' ||
    sector === 'ruin'
  ) {
    return 'built';
  }
  return 'cliff';
}

function accentOf(sector: SectorId): number {
  if (sector === 'flood' || sector === 'brine') return Theme.biolum;
  if (sector === 'reef' || sector === 'canopy') return Theme.safe;
  if (sector === 'fissure' || sector === 'approach' || sector === 'ash') return Theme.arc;
  if (sector === 'spire' || sector === 'vault') return Theme.arcWhite;
  return Theme.inkDim;
}

function setW(px: Px, x: number, y: number, color: number): void {
  px.set(x | 0, y | 0, color);
}

function fillDiscW(px: Px, cx: number, cy: number, r: number, color: number): void {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rr) setW(px, x, y, color);
    }
  }
}

function strokeDiscW(px: Px, cx: number, cy: number, r: number, color: number): void {
  const r0 = (r - 0.55) * (r - 0.55);
  const r1 = (r + 0.55) * (r + 0.55);
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = dx * dx + dy * dy;
      if (d >= r0 && d <= r1) setW(px, x, y, color);
    }
  }
}

function strokeEllipseW(px: Px, cx: number, cy: number, rx: number, ry: number, color: number): void {
  if (rx <= 0 || ry <= 0) return;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d >= 0.78 && d <= 1.18) setW(px, x, y, color);
    }
  }
}

function lineW(px: Px, x0: number, y0: number, x1: number, y1: number, color: number): void {
  let x = x0 | 0;
  let y = y0 | 0;
  const xEnd = x1 | 0;
  const yEnd = y1 | 0;
  const dx = Math.abs(xEnd - x);
  const dy = Math.abs(yEnd - y);
  const sx = x < xEnd ? 1 : -1;
  const sy = y < yEnd ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    setW(px, x, y, color);
    if (x === xEnd && y === yEnd) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function fillTriangleW(
  px: Px,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
): void {
  px.fillTriangle(x0, y0, x1, y1, x2, y2, color);
}

function lcg(n: number): number {
  return (n * 1103515245 + 12345) | 0;
}

/** Interior blobs — never sit on the seam, so clip edges do not draw a 48px frame. */
function wash(px: Px, color: number, seed: number, blobs: number, r0: number, r1: number): void {
  let n = seed | 0;
  const margin = 5;
  const span = TILE - margin * 2;
  for (let i = 0; i < blobs; i++) {
    n = lcg(n);
    const cx = margin + (((n >>> 16) >>> 0) % span);
    n = lcg(n);
    const cy = margin + (((n >>> 16) >>> 0) % span);
    n = lcg(n);
    const rspan = Math.max(1, r1 - r0 + 1);
    const r = r0 + (((n >>> 16) >>> 0) % rspan);
    px.fillDisc(cx, cy, r, color);
  }
}

function hashAmp(i: number, seed: number, amp: number): number {
  const n = lcg(seed + i * 101);
  return (((n >>> 16) >>> 0) % (amp * 2 + 1)) - amp;
}

/** Shift the motif so adjacent variants do not stamp the same 48px grid. */
function motifShift(variant: number): { ox: number; oy: number } {
  return { ox: (variant * 13) % TILE, oy: (variant * 17) % TILE };
}

/** Horizontal lip whose jitter wraps, so a ledge continues across tiles. */
function wanderH(px: Px, y0: number, seed: number, lip: number, deep?: number): void {
  const step = 8;
  const cols = TILE / step;
  for (let x = 0; x < TILE; x++) {
    const i = Math.floor(x / step);
    const t = (x % step) / step;
    const a = hashAmp(i, seed, 2);
    const b = hashAmp((i + 1) % cols, seed, 2);
    const y = y0 + Math.round(a + (b - a) * t);
    setW(px, x, y, lip);
    if (deep !== undefined) setW(px, x, y + 1, deep);
  }
}

function wanderV(px: Px, x0: number, seed: number, a: number, b: number): void {
  const step = 8;
  const rows = TILE / step;
  for (let y = 0; y < TILE; y++) {
    const i = Math.floor(y / step);
    const t = (y % step) / step;
    const u = hashAmp(i, seed, 2);
    const v = hashAmp((i + 1) % rows, seed, 2);
    const x = x0 + Math.round(u + (v - u) * t);
    setW(px, x, y, a);
    setW(px, x + 1, y, b);
  }
}

/** Continuous bedding — mottled wash only. Large triangles read as a block per cell. */
function paintBed(px: Px, sector: SectorId, variant: number): void {
  const tint = BIOME_FLOOR_TINT[sector];
  const family = familyOf(sector);
  const seed = 11 + sector.charCodeAt(0) * 17 + sector.length * 31;
  if (family === 'cliff') {
    const bed = mix(Material.rock, tint, 0.18);
    px.fillRect(0, 0, TILE, TILE, bed);
    wash(px, mix(bed, Theme.groundDeep, 0.08), seed + variant * 19, 18, 2, 4);
    wash(px, mix(bed, Material.rockLit, 0.16), seed + 3 + variant * 23, 14, 1, 3);
    grit(px, Material.recess, 28, seed + variant);
    grit(px, Theme.inkMute, 10, seed + 9 + variant);
    wanderH(px, 2, seed + 41, mix(bed, Theme.inkMute, 0.45), mix(bed, Material.recess, 0.4));
  } else if (family === 'wet') {
    const wet = mix(Material.brine, tint, 0.35);
    px.fillRect(0, 0, TILE, TILE, wet);
    wash(px, mix(wet, Theme.groundDeep, 0.08), seed + variant * 19, 12, 3, 5);
    wash(px, mix(wet, Material.brineLit, 0.18), seed + 5 + variant * 23, 10, 2, 4);
    grit(px, Theme.biolumDeep, 14, seed + variant);
    grit(px, Theme.inkBright, 6, seed + 19 + variant);
  } else {
    const deck = mix(Material.deck, tint, 0.16);
    px.fillRect(0, 0, TILE, TILE, deck);
    wash(px, mix(deck, Theme.groundDeep, 0.08), seed + variant * 19, 12, 2, 4);
    wash(px, mix(deck, Material.deckLit, 0.16), seed + 7 + variant * 23, 10, 1, 3);
    grit(px, Theme.panelEdge, 12, seed + variant);
    grit(px, Theme.inkMute, 8, seed + 13 + variant);
  }
}

function motif(px: Px, sector: SectorId, variant: number): void {
  const tint = BIOME_FLOOR_TINT[sector];
  const accent = accentOf(sector);
  const seed = 90 + sector.charCodeAt(0) * 11;
  const garnish = seed + variant * 17;
  const { ox, oy } = motifShift(variant);
  const inner = 6;
  switch (sector) {
    case 'plains': {
      let n = garnish | 0;
      for (let i = 0; i < 7; i++) {
        n = lcg(n);
        const x = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2));
        n = lcg(n);
        const y = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2));
        const r = i === 0 ? 2.4 : i < 3 ? 1.6 : 1.2;
        fillDiscW(px, x, y, r, shade(tint, 0.55));
        setW(px, x - 1, y - 1, Theme.inkMute);
        setW(px, x, y + 1, Theme.groundDeep);
      }
      grit(px, mix(Material.rock, tint, 0.3), 16, garnish);
      break;
    }
    case 'ridge':
      wanderH(px, 13, seed, mix(accent, Material.rock, 0.55), Theme.groundDeep);
      wanderH(px, 26, seed + 11, mix(Material.rock, accent, 0.22), Material.recess);
      wanderH(px, 38, seed + 23, mix(Material.rock, Theme.groundDeep, 0.35), Material.recess);
      grit(px, Theme.inkMute, 12, garnish);
      grit(px, Material.rockLit, 8, garnish + 3);
      break;
    case 'canopy': {
      let n = garnish | 0;
      for (let i = 0; i < 12; i++) {
        n = lcg(n);
        const x = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2 - 7));
        n = lcg(n);
        const y = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2 - 4));
        fillTriangleW(px, x, y + 3, x + 4, y, x + 7, y + 4, mix(Material.foliage, accent, 0.3));
        if (i % 3 === 0) fillDiscW(px, x + 2, y + 2, 1.4, Theme.safe);
      }
      lineW(px, 8, 28, 22, 18, mix(Material.foliage, Theme.groundDeep, 0.35));
      lineW(px, 22, 18, 40, 30, mix(Material.foliage, Theme.groundDeep, 0.35));
      lineW(px, 10, 36, 26, 22, mix(Material.foliage, Material.recess, 0.4));
      grit(px, Material.foliage, 10, garnish);
      break;
    }
    case 'flood': {
      let n = garnish | 0;
      for (let i = 0; i < 3; i++) {
        n = lcg(n);
        const cx = inner + 6 + (((n >>> 16) >>> 0) % (TILE - inner * 2 - 12));
        n = lcg(n);
        const cy = inner + 6 + (((n >>> 16) >>> 0) % (TILE - inner * 2 - 12));
        strokeDiscW(px, cx, cy, 7 + i * 2, mix(accent, Material.brine, 0.45));
        strokeDiscW(px, cx, cy, 10 + i * 2, mix(Material.brine, Theme.inkMute, 0.3));
      }
      break;
    }
    case 'brine':
      strokeEllipseW(px, 12, 16, 8, 6, mix(accent, Theme.inkMute, 0.45));
      strokeEllipseW(px, 34, 28, 9, 7, mix(accent, Theme.inkMute, 0.45));
      fillDiscW(px, 12, 16, 3, Material.recess);
      fillDiscW(px, 34, 28, 3, Material.recess);
      fillDiscW(px, inner + ((ox + 8) % (TILE - inner * 2)), inner + ((oy + 10) % (TILE - inner * 2)), 1.6, mix(accent, Material.brine, 0.4));
      grit(px, Material.brineLit, 10, garnish);
      break;
    case 'reef': {
      let n = garnish | 0;
      for (let i = 0; i < 6; i++) {
        n = lcg(n);
        const x = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2 - 6));
        n = lcg(n);
        const y = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2 - 7));
        fillDiscW(px, x + 3, y + 6, 2.2, mix(Material.rock, accent, 0.3));
        fillTriangleW(px, x, y + 7, x + 3, y, x + 6, y + 7, mix(accent, Material.brine, 0.35));
        lineW(px, x + 3, y + 1, x + 3, y + 6, mix(Theme.inkBright, Material.brine, 0.5));
      }
      grit(px, Material.brineLit, 8, garnish);
      break;
    }
    case 'ash': {
      let n = garnish | 0;
      for (let i = 0; i < 4; i++) {
        n = lcg(n);
        const cx = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2));
        n = lcg(n);
        const cy = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2));
        fillDiscW(px, cx, cy, 4 + i, mix(Material.debris, tint, 0.28));
        lineW(px, cx - 5, cy - 1, cx + 4, cy, mix(tint, Theme.groundDeep, 0.4));
      }
      grit(px, Material.debris, 12, garnish);
      grit(px, Theme.inkMute, 8, garnish + 5);
      break;
    }
    case 'fissure': {
      const ax = inner + 4 + (ox % 10);
      const ay = inner + 6 + (oy % 8);
      lineW(px, ax, ay, ax + 12, ay + 14, mix(Theme.groundDeep, tint, 0.25));
      lineW(px, ax + 12, ay + 14, ax + 4, ay + 28, mix(Theme.groundDeep, tint, 0.25));
      lineW(px, ax + 12, ay + 14, ax + 22, ay + 8, mix(Theme.groundDeep, tint, 0.25));
      lineW(px, ax + 1, ay + 1, ax + 12, ay + 14, mix(accent, tint, 0.45));
      fillDiscW(px, ax + 12, ay + 14, 1.6, mix(Theme.arc, tint, 0.4));
      grit(px, Theme.rust, 6, garnish);
      break;
    }
    case 'approach':
      wanderV(px, 16, seed, mix(Material.debris, tint, 0.35), Material.recess);
      wanderV(px, 30, seed + 9, mix(Material.debris, tint, 0.28), Theme.inkMute);
      grit(px, Theme.inkMute, 12, garnish);
      grit(px, Material.debris, 8, garnish + 7);
      break;
    case 'trench':
      wanderH(px, 16, seed, mix(Theme.inkMute, Material.deck, 0.5), mix(Material.deck, tint, 0.28));
      wanderH(px, 28, seed + 15, mix(Theme.inkMute, Material.deck, 0.45), Theme.groundDeep);
      wanderH(px, 40, seed + 29, mix(Material.deck, tint, 0.28), Theme.groundDeep);
      grit(px, Material.recess, 10, garnish);
      grit(px, Theme.panelEdge, 6, garnish + 2);
      break;
    case 'ruin': {
      let n = garnish | 0;
      for (let i = 0; i < 4; i++) {
        n = lcg(n);
        const x = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2 - 10));
        n = lcg(n);
        const y = inner + (((n >>> 16) >>> 0) % (TILE - inner * 2 - 10));
        fillTriangleW(
          px,
          x,
          y,
          x + 8 + i,
          y + 2,
          x + 2,
          y + 7 + i,
          i % 2 === 0 ? Material.recess : mix(Material.debris, tint, 0.28),
        );
      }
      lineW(px, 14, 12, 16, 36, mix(Theme.rust, Material.deck, 0.45));
      lineW(px, 32, 14, 34, 38, mix(Theme.rust, Material.deck, 0.45));
      grit(px, Theme.rust, 8, garnish);
      grit(px, Material.debris, 8, garnish + 4);
      break;
    }
    case 'duct': {
      const slat = mix(Material.conduit, Material.deck, 0.42);
      const gaps = [10, 11, 10, 11];
      let y = 8;
      for (const g of gaps) {
        for (let x = 0; x < TILE; x++) setW(px, x, y, slat);
        if (y + 1 < TILE) {
          for (let x = 0; x < TILE; x++) setW(px, x, y + 1, mix(Theme.groundDeep, Material.deck, 0.55));
        }
        for (let x = 6; x < TILE - 4; x += 9) {
          if (((x + variant * 3) % 5) === 0) continue;
          setW(px, x, y, mix(Theme.panelEdge, slat, 0.6));
        }
        y += g;
      }
      grit(px, Theme.inkMute, 8, garnish);
      break;
    }
    case 'spire': {
      let n = garnish | 0;
      for (let gy = 8; gy < TILE - 6; gy += 8) {
        for (let gx = 8; gx < TILE - 6; gx += 8) {
          n = lcg(n);
          if (((n >>> 16) >>> 0) % 5 < 2) continue;
          fillDiscW(px, gx, gy, 1.4, mix(Theme.panelEdge, Material.deck, 0.45));
          setW(px, gx, gy, mix(Theme.inkDim, Material.deck, 0.5));
        }
      }
      break;
    }
    case 'vault': {
      let n = garnish | 0;
      for (let row = 0; row < 3; row++) {
        const y = 12 + row * 12;
        for (let x = 0; x < TILE; x++) {
          n = lcg(n);
          const rise = Math.abs((x % 16) - 8);
          if (((n >>> 16) >>> 0) % 4 !== 0) setW(px, x, y + rise, mix(Theme.panelEdge, Material.deck, 0.55));
        }
      }
      grit(px, Theme.inkMute, 8, garnish);
      grit(px, Material.deckLit, 6, garnish + 2);
      break;
    }
    case 'beacon':
      wanderH(px, 16, seed, mix(Theme.tape, Material.deck, 0.55), mix(Theme.groundDeep, Material.deck, 0.5));
      wanderH(px, 31, seed + 8, mix(Theme.inkBright, Material.deck, 0.6), mix(Theme.inkMute, Material.deck, 0.5));
      if (variant % 4 === 0) {
        const cx = inner + 8 + (ox % (TILE - inner * 2 - 16));
        const cy = inner + 8 + (oy % (TILE - inner * 2 - 16));
        fillDiscW(px, cx, cy, 2.2, mix(Theme.tape, Material.deck, 0.35));
        setW(px, cx, cy, mix(Theme.inkBright, Material.deck, 0.4));
      }
      grit(px, Theme.inkDim, 8, garnish);
      break;
  }
}

function paintFloor(sector: SectorId, variant: number): Px {
  const px = new Px();
  paintBed(px, sector, variant);
  motif(px, sector, variant);
  px.snap(envPalette());
  return px;
}

function paintCrack(urgent: boolean): Px {
  const px = new Px();
  const ink = urgent ? Theme.arc : Theme.inkMute;
  const hot = urgent ? Theme.arcWhite : Theme.arc;
  lineW(px, 5, 8, 16, 20, ink);
  lineW(px, 16, 20, 12, 36, ink);
  lineW(px, 16, 20, 32, 16, ink);
  lineW(px, 32, 16, 42, 34, ink);
  lineW(px, 12, 36, 22, 44, ink);
  lineW(px, 32, 16, 28, 40, ink);
  lineW(px, 6, 9, 16, 20, hot);
  lineW(px, 16, 20, 32, 17, hot);
  if (urgent) {
    fillDiscW(px, 16, 20, 1.6, Theme.arcWhite);
    fillDiscW(px, 32, 16, 1.6, Theme.arc);
    setW(px, 22, 42, Theme.arcWhite);
  }
  px.snap(envPalette());
  return px;
}

export function floorFrames(): Frame[] {
  const frames: Frame[] = [];
  for (const sector of SECTORS) {
    for (let v = 0; v < FLOOR_VARIANT_COUNT; v++) {
      frames.push({ key: `t_floor_${sector}_${v}`, px: paintFloor(sector, v) });
    }
  }
  const plains0 = frames.find((f) => f.key === 't_floor_plains_0')!.px;
  frames.push({ key: 't_floor', px: plains0.clone() });
  frames.push({ key: 't_floor_0', px: plains0.clone() });
  frames.push({
    key: 't_floor_1',
    px: frames.find((f) => f.key === 't_floor_plains_1')!.px.clone(),
  });
  frames.push({
    key: 't_floor_2',
    px: frames.find((f) => f.key === 't_floor_plains_2')!.px.clone(),
  });
  return frames;
}

export function crackFrames(): Frame[] {
  return [
    { key: 't_crack', px: paintCrack(false) },
    { key: 't_crack_hot', px: paintCrack(true) },
  ];
}

export { SECTORS };
