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

/** Continuous bedding — no perimeter chips or seam grid, or every tile stamps squares. */
function paintBed(px: Px, sector: SectorId, variant: number): void {
  const tint = BIOME_FLOOR_TINT[sector];
  const family = familyOf(sector);
  if (family === 'cliff') {
    const bed = mix(Material.rock, tint, 0.18);
    px.fillRect(0, 0, TILE, TILE, bed);
    const c = variant % 3;
    if (c === 0) px.fillTriangle(0, 0, TILE, 0, 0, 28, mix(bed, Theme.inkMute, 0.18));
    else if (c === 1) px.fillTriangle(TILE, 0, TILE, TILE, 18, 0, mix(bed, Theme.inkMute, 0.18));
    else px.fillTriangle(0, TILE, TILE, TILE, 26, 16, mix(bed, Theme.groundDeep, 0.2));
    grit(px, Material.recess, 22, 11 + variant * 9);
  } else if (family === 'wet') {
    const wet = mix(Material.brine, tint, 0.35);
    px.fillRect(0, 0, TILE, TILE, wet);
    px.fillEllipse(22 + variant, 24, 18, 14, mix(Material.brine, accentOf(sector), 0.18));
    px.line(8, 12, 16, 12, Theme.inkBright);
    grit(px, Theme.biolumDeep, 12, 30 + variant);
  } else {
    const deck = mix(Material.deck, tint, 0.16);
    px.fillRect(0, 0, TILE, TILE, deck);
    px.fillTriangle(0, 0, TILE, 0, 8, 18, mix(deck, Theme.inkMute, 0.12));
    grit(px, Theme.panelEdge, 10, 50 + variant * 4);
  }
}

function motif(px: Px, sector: SectorId, variant: number): void {
  const tint = BIOME_FLOOR_TINT[sector];
  const accent = accentOf(sector);
  switch (sector) {
    case 'plains':
      for (let i = 0; i < 10; i++) {
        const x = 2 + ((i * 13 + variant * 7) % 44);
        const y = 2 + ((i * 17 + variant * 11) % 44);
        const r = i % 5 === 0 ? 2.2 : 1.2;
        px.fillDisc(x, y, r, shade(tint, 0.55));
        px.set(x, y + 1, Theme.groundDeep);
      }
      grit(px, mix(Material.rock, tint, 0.3), 16, 70 + variant);
      break;
    case 'ridge':
      for (let i = 0; i < 3; i++) {
        const y = 10 + i * 12;
        const peak = 8 + i * 11 + (variant % 5);
        px.fillTriangle(0, y + 8, TILE, y + 8, peak, y, mix(Material.rock, accent, 0.18));
        px.line(0, y + 1, TILE - 1, y + 2, accent);
        px.line(0, y + 7, TILE - 1, y + 8, Theme.groundDeep);
      }
      break;
    case 'canopy':
      for (let i = 0; i < 12; i++) {
        const x = 4 + ((i * 11 + variant * 4) % 38);
        const y = 5 + ((i * 13 + variant * 7) % 34);
        px.fillTriangle(x, y + 3, x + 4, y, x + 7, y + 4, mix(Material.foliage, accent, 0.3));
      }
      px.line(3, 34 + variant, 20, 26, mix(Material.foliage, Theme.groundDeep, 0.35));
      px.line(20, 26, 45, 33 - variant, mix(Material.foliage, Theme.groundDeep, 0.35));
      px.line(4, 33 + variant, 20, 25, shade(accent, 0.65));
      px.line(20, 25, 44, 32 - variant, shade(accent, 0.65));
      break;
    case 'flood': {
      const cx = 24 + variant * 2 - 2;
      const cy = 22;
      for (let r = 3; r >= 0; r--) {
        px.strokeDisc(cx, cy, 6 + r * 5, r % 2 === 0 ? accent : mix(Material.brine, Theme.inkBright, 0.2));
      }
      px.line(cx - 6, cy - 8, cx + 2, cy - 8, Theme.inkBright);
      px.fillEllipse(24, 40, 16, 3, accent);
      break;
    }
    case 'brine':
      ;[
        [14, 14, 11, 9],
        [32, 12, 10, 8],
        [14, 32, 9, 9],
        [34, 30, 11, 10],
        [24, 22, 8, 7],
      ].forEach(([cx, cy, rx, ry], i) => {
        const ox = ((i + variant) % 3) - 1;
        px.strokeEllipse(cx + ox, cy, rx, ry, mix(accent, Theme.inkMute, 0.25));
      });
      px.fillDisc(16 + variant, 14, 2, accent);
      px.fillEllipse(24, 42, 14, 2, Theme.biolumDeep);
      break;
    case 'reef':
      for (let i = 0; i < 6; i++) {
        const x = 6 + ((i * 11 + variant * 3) % 34);
        const y = 8 + ((i * 7 + variant * 5) % 28);
        px.fillDisc(x + 4, y + 8, 2.4, mix(Material.rock, accent, 0.3));
        px.fillTriangle(x, y + 9, x + 4, y, x + 8, y + 9, accent);
        px.line(x + 4, y + 2, x + 4, y + 7, Theme.inkBright);
      }
      break;
    case 'ash':
      for (let i = 0; i < 4; i++) {
        const cx = 10 + i * 9 + (variant % 2);
        const cy = 10 + i * 8;
        px.fillEllipse(cx, cy, 16 - i, 4, mix(Material.debris, tint, 0.28));
        px.line(cx - 12, cy - 2, cx + 10, cy - 3, shade(tint, 0.7));
      }
      px.line(16 + variant, 22, 30 + variant, 24, Theme.arc);
      break;
    case 'fissure':
      px.line(5, 6, 18, 22, Theme.groundDeep);
      px.line(18, 22, 12, 42, Theme.groundDeep);
      px.line(18, 22, 34, 16 + variant, Theme.groundDeep);
      px.line(34, 16 + variant, 44, 40, Theme.groundDeep);
      px.line(19, 22, 28, 36, Theme.groundDeep);
      px.line(6, 7, 18, 22, accent);
      px.line(18, 22, 34, 17 + variant, accent);
      px.fillDisc(18, 22, 2, Theme.arc);
      break;
    case 'approach':
      for (let i = 0; i < 4; i++) {
        const x = 7 + i * 10 + (variant % 2);
        const wobble = i % 2 === 0 ? 3 : -2;
        px.line(x, 0, x + wobble, TILE - 1, mix(Material.debris, tint, 0.4));
        px.line(x + 2, 2, x + wobble - 1, TILE - 2, Material.recess);
      }
      grit(px, Theme.inkMute, 8, 40 + variant);
      break;
    case 'trench':
      for (let i = 0; i < 3; i++) {
        const y = 10 + i * 11;
        px.fillEllipse(24, y + 3, 24, 3, mix(Material.deck, tint, 0.22));
        px.line(0, y + 1, TILE - 1, y + 1, Theme.inkMute);
        px.line(0, y + 5, TILE - 1, y + 5, Theme.groundDeep);
      }
      break;
    case 'ruin':
      px.fillTriangle(8 + variant, 10, 40, 14, 12, 38, mix(Material.debris, tint, 0.28));
      px.fillTriangle(40, 14, 36, 40, 12, 38, Material.recess);
      px.line(12, 14, 14, 36, Theme.rust);
      px.line(30, 16, 32, 34, Theme.rust);
      grit(px, Theme.rust, 8, 90 + variant);
      break;
    case 'duct':
      for (let i = 0; i < 6; i++) {
        const y = 6 + i * 7;
        px.line(0, y, TILE - 1, y, mix(Material.conduit, tint, 0.28));
        px.line(0, y + 1, TILE - 1, y + 1, Theme.groundDeep);
      }
      break;
    case 'spire':
      for (let i = 0; i < 8; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 10 + col * 12 + ((row + variant) % 2) * 5;
        const y = 10 + row * 12 + (col % 2);
        px.fillDisc(x, y, 1.8, Theme.panelEdge);
        px.set(x, y, Theme.inkDim);
      }
      break;
    case 'vault':
      for (let i = 0; i < 4; i++) {
        const y = 8 + i * 9;
        px.line(0, y + 2, 16, y + 5, Theme.panelEdge);
        px.line(16, y + 5, 32, y, Theme.panelEdge);
        px.line(32, y, TILE - 1, y + 3, Theme.panelEdge);
      }
      break;
    case 'beacon':
      px.line(0, 24, TILE - 1, 24, Theme.tape);
      px.line(0, 25, TILE - 1, 25, Theme.inkBright);
      px.line(24, 0, 24, TILE - 1, Theme.tape);
      px.line(25, 0, 25, TILE - 1, Theme.inkBright);
      px.fillDisc(24, 24, 3, Theme.inkBright);
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
  px.line(5, 8, 16, 20, ink);
  px.line(16, 20, 12, 36, ink);
  px.line(16, 20, 32, 16, ink);
  px.line(32, 16, 42, 34, ink);
  px.line(12, 36, 22, 44, ink);
  px.line(32, 16, 28, 40, ink);
  px.line(6, 9, 16, 20, hot);
  px.line(16, 20, 32, 17, hot);
  if (urgent) {
    px.fillDisc(16, 20, 1.6, Theme.arcWhite);
    px.fillDisc(32, 16, 1.6, Theme.arc);
    px.set(22, 42, Theme.arcWhite);
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
