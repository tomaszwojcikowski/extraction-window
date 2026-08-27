import type { SectorId } from '../../data/encounters';
import { mix, shade } from '../../scenes/tex/color';
import { BIOME_FLOOR_TINT, Material, Theme } from '../../scenes/theme';
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

function wrap(n: number): number {
  return ((n % TILE) + TILE) % TILE;
}

function setW(px: Px, x: number, y: number, color: number): void {
  px.set(wrap(x | 0), wrap(y | 0), color);
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
  for (const ox of [-TILE, 0, TILE]) {
    for (const oy of [-TILE, 0, TILE]) {
      px.fillTriangle(x0 + ox, y0 + oy, x1 + ox, y1 + oy, x2 + ox, y2 + oy, color);
    }
  }
}

function lcg(n: number): number {
  return (n * 1103515245 + 12345) | 0;
}

/** Wrapping blobs so a wash does not stamp a 48px triangle or ellipse. */
function wash(px: Px, color: number, seed: number, blobs: number, r0: number, r1: number): void {
  let n = seed | 0;
  for (let i = 0; i < blobs; i++) {
    n = lcg(n);
    const cx = ((n >>> 16) >>> 0) % TILE;
    n = lcg(n);
    const cy = ((n >>> 16) >>> 0) % TILE;
    n = lcg(n);
    const span = Math.max(1, r1 - r0 + 1);
    const r = r0 + (((n >>> 16) >>> 0) % span);
    fillDiscW(px, cx, cy, r, color);
  }
}

function hashAmp(i: number, seed: number, amp: number): number {
  const n = lcg(seed + i * 101);
  return (((n >>> 16) >>> 0) % (amp * 2 + 1)) - amp;
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
    wash(px, mix(bed, Theme.groundDeep, 0.14), seed, 16, 2, 5);
    wash(px, Material.rockLit, seed + 3, 12, 2, 4);
    grit(px, Material.recess, 28, seed + variant);
    grit(px, Theme.inkMute, 10, seed + 9 + variant);
    wanderH(px, 2 + (variant % 2), seed + 41, Theme.inkMute, Material.recess);
  } else if (family === 'wet') {
    const wet = mix(Material.brine, tint, 0.35);
    px.fillRect(0, 0, TILE, TILE, wet);
    wash(px, mix(Material.brine, accentOf(sector), 0.12), seed, 10, 4, 7);
    wash(px, Material.brineLit, seed + 5, 8, 3, 5);
    grit(px, Theme.biolumDeep, 14, seed + variant);
    grit(px, Theme.inkBright, 6, seed + 19 + variant);
  } else {
    const deck = mix(Material.deck, tint, 0.16);
    px.fillRect(0, 0, TILE, TILE, deck);
    wash(px, mix(deck, Theme.groundDeep, 0.14), seed, 10, 3, 6);
    wash(px, Material.deckLit, seed + 7, 8, 2, 4);
    grit(px, Theme.panelEdge, 12, seed + variant);
    grit(px, Theme.inkMute, 8, seed + 13 + variant);
  }
}

function motif(px: Px, sector: SectorId, variant: number): void {
  const tint = BIOME_FLOOR_TINT[sector];
  const accent = accentOf(sector);
  const seed = 90 + sector.charCodeAt(0) * 11;
  const garnish = seed + variant * 17;
  switch (sector) {
    case 'plains': {
      let n = garnish | 0;
      for (let i = 0; i < 7; i++) {
        n = lcg(n);
        const x = ((n >>> 16) >>> 0) % TILE;
        n = lcg(n);
        const y = ((n >>> 16) >>> 0) % TILE;
        const r = i === 0 ? 2.4 : i < 3 ? 1.6 : 1.2;
        fillDiscW(px, x, y, r, shade(tint, 0.55));
        setW(px, x - 1, y - 1, Theme.inkMute);
        setW(px, x, y + 1, Theme.groundDeep);
      }
      grit(px, mix(Material.rock, tint, 0.3), 16, garnish);
      break;
    }
    case 'ridge':
      wanderH(px, 13, seed, accent, Theme.groundDeep);
      wanderH(px, 26, seed + 11, mix(Material.rock, accent, 0.35), Material.recess);
      wanderH(px, 38, seed + 23, Theme.groundDeep, Material.recess);
      grit(px, Theme.inkMute, 12, garnish);
      grit(px, Material.rockLit, 8, garnish + 3);
      break;
    case 'canopy': {
      let n = garnish | 0;
      for (let i = 0; i < 12; i++) {
        n = lcg(n);
        const x = ((n >>> 16) >>> 0) % TILE;
        n = lcg(n);
        const y = ((n >>> 16) >>> 0) % TILE;
        fillTriangleW(px, x, y + 3, x + 4, y, x + 7, y + 4, mix(Material.foliage, accent, 0.3));
        if (i % 3 === 0) fillDiscW(px, x + 2, y + 2, 1.4, Theme.safe);
      }
      lineW(px, 2, 32, 22, 18, mix(Material.foliage, Theme.groundDeep, 0.35));
      lineW(px, 22, 18, 50, 34, mix(Material.foliage, Theme.groundDeep, 0.35));
      lineW(px, 8, 40, 28, 22, mix(Material.foliage, Material.recess, 0.4));
      lineW(px, 3, 31, 22, 17, shade(accent, 0.65));
      lineW(px, 22, 17, 50, 33, shade(accent, 0.65));
      grit(px, Material.foliage, 10, garnish);
      break;
    }
    case 'flood': {
      strokeDiscW(px, 6, -8, 28, accent);
      strokeDiscW(px, 6, -8, 34, mix(Material.brine, Theme.inkBright, 0.2));
      strokeDiscW(px, 6, -8, 42, Material.brineLit);
      strokeDiscW(px, 38, 40, 18, mix(Material.brine, Theme.inkMute, 0.25));
      if (variant === 1) lineW(px, 4, 2, 14, 2, Theme.inkBright);
      if (variant === 2) lineW(px, 22, 8, 34, 8, Theme.inkBright);
      break;
    }
    case 'brine':
      strokeEllipseW(px, 4, 10, 10, 8, mix(accent, Theme.inkMute, 0.25));
      strokeEllipseW(px, 38, 24, 11, 9, mix(accent, Theme.inkMute, 0.25));
      strokeEllipseW(px, 20, -4, 9, 7, mix(accent, Theme.inkMute, 0.25));
      fillDiscW(px, 4, 10, 4, Material.recess);
      fillDiscW(px, 38, 24, 4, Material.recess);
      fillDiscW(px, 8 + variant * 3, 12, 1.6, accent);
      fillDiscW(px, 36, 22, 1.2, Theme.inkBright);
      grit(px, Material.brineLit, 10, garnish);
      break;
    case 'reef': {
      let n = garnish | 0;
      for (let i = 0; i < 6; i++) {
        n = lcg(n);
        const x = ((n >>> 16) >>> 0) % TILE;
        n = lcg(n);
        const y = ((n >>> 16) >>> 0) % TILE;
        fillDiscW(px, x + 3, y + 6, 2.2, mix(Material.rock, accent, 0.3));
        fillTriangleW(px, x, y + 7, x + 3, y, x + 6, y + 7, accent);
        lineW(px, x + 3, y + 1, x + 3, y + 6, Theme.inkBright);
        setW(px, x + 3, y, Theme.inkBright);
      }
      grit(px, Material.brineLit, 8, garnish);
      break;
    }
    case 'ash': {
      let n = seed | 0;
      for (let i = 0; i < 5; i++) {
        n = lcg(n);
        const cx = ((n >>> 16) >>> 0) % TILE;
        n = lcg(n);
        const cy = ((n >>> 16) >>> 0) % TILE;
        fillDiscW(px, cx, cy, 5 + i, mix(Material.debris, tint, 0.28));
        lineW(px, cx - 7, cy - 2, cx + 6, cy - 1, shade(tint, 0.7));
        lineW(px, cx - 5, cy, cx + 4, cy + 1, Theme.groundDeep);
      }
      if (variant === 2) lineW(px, 12, 22, 34, 25, Theme.arc);
      grit(px, Material.debris, 12, garnish);
      grit(px, Theme.inkMute, 8, garnish + 5);
      break;
    }
    case 'fissure':
      lineW(px, 2, 4, 18, 22, Theme.groundDeep);
      lineW(px, 18, 22, 8, 50, Theme.groundDeep);
      lineW(px, 18, 22, 40, 14, Theme.groundDeep);
      lineW(px, 40, 14, 52, 38, Theme.groundDeep);
      lineW(px, 19, 22, 30, 40, Theme.groundDeep);
      lineW(px, 3, 5, 18, 22, accent);
      lineW(px, 18, 22, 40, 15, accent);
      lineW(px, 19, 23, 9, 48, Theme.arc);
      fillDiscW(px, 18, 22, 2.2, Theme.arc);
      fillDiscW(px, 40, 14, 1.6, Theme.arcWhite);
      grit(px, Theme.rust, 6, garnish);
      break;
    case 'approach':
      wanderV(px, 11, seed, mix(Material.debris, tint, 0.4), Material.recess);
      wanderV(px, 24, seed + 9, mix(Material.debris, tint, 0.35), Theme.inkMute);
      wanderV(px, 37, seed + 17, mix(Material.debris, tint, 0.4), Material.recess);
      wanderV(px, 18, seed + 21, Material.recess, Theme.groundDeep);
      grit(px, Theme.inkMute, 12, garnish);
      grit(px, Material.debris, 8, garnish + 7);
      break;
    case 'trench':
      wanderH(px, 15, seed, Theme.inkMute, mix(Material.deck, tint, 0.28));
      wanderH(px, 28, seed + 15, Theme.inkMute, Theme.groundDeep);
      wanderH(px, 40, seed + 29, mix(Material.deck, tint, 0.35), Theme.groundDeep);
      wanderH(px, 8, seed + 5, Theme.tape, Theme.groundDeep);
      grit(px, Material.recess, 10, garnish);
      grit(px, Theme.panelEdge, 6, garnish + 2);
      break;
    case 'ruin': {
      let n = garnish | 0;
      for (let i = 0; i < 4; i++) {
        n = lcg(n);
        const x = ((n >>> 16) >>> 0) % TILE;
        n = lcg(n);
        const y = ((n >>> 16) >>> 0) % TILE;
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
      lineW(px, 10, 8, 14, 40, Theme.rust);
      lineW(px, 32, 12, 36, 44, Theme.rust);
      lineW(px, 11, 8, 15, 40, Theme.inkMute);
      grit(px, Theme.rust, 8, garnish);
      grit(px, Material.debris, 8, garnish + 4);
      break;
    }
    case 'duct': {
      const gaps = [9, 10, 8, 11];
      let y = 6;
      for (const g of gaps) {
        for (let x = 0; x < TILE; x++) setW(px, x, y, mix(Material.conduit, tint, 0.28));
        for (let x = 0; x < TILE; x++) setW(px, x, y + 1, Theme.groundDeep);
        for (let x = 4; x < TILE; x += 8) {
          setW(px, x, y, Theme.panelEdge);
          setW(px, x, y + 1, Material.recess);
        }
        y += g;
      }
      grit(px, Theme.inkMute, 8, garnish);
      break;
    }
    case 'spire': {
      for (let gy = 6; gy < TILE; gy += 8) {
        for (let gx = 6; gx < TILE; gx += 8) {
          const x = gx + ((variant + gy / 8) % 2);
          const y = gy + (variant % 2);
          fillDiscW(px, x, y, 1.6, Theme.panelEdge);
          setW(px, x, y, Theme.inkDim);
          setW(px, x - 1, y - 1, Theme.inkMute);
          setW(px, x + 1, y + 1, Material.recess);
        }
      }
      break;
    }
    case 'vault': {
      let n = seed | 0;
      for (let row = 0; row < 3; row++) {
        const y = 10 + row * 12;
        for (let x = 0; x < TILE; x++) {
          n = lcg(n);
          const rise = Math.abs((x % 16) - 8);
          if (((n >>> 16) >>> 0) % 5 !== 0) setW(px, x, y + rise, Theme.panelEdge);
          if (x % 16 === 8) setW(px, x, y + rise + 1, Material.recess);
        }
      }
      grit(px, Theme.inkMute, 8, garnish);
      grit(px, Material.deckLit, 6, garnish + 2);
      break;
    }
    case 'beacon':
      wanderH(px, 16, seed, Theme.tape, Theme.groundDeep);
      wanderH(px, 31, seed + 8, Theme.inkBright, Theme.inkMute);
      wanderH(px, 8, seed + 3, Theme.panelEdge, Theme.groundDeep);
      fillDiscW(px, 24, 24, 3, Theme.tape);
      setW(px, 24, 24, Theme.inkBright);
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
    for (let v = 0; v < 3; v++) {
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
