import type { SectorId } from '../../data/encounters';
import { mix, shade } from '../../scenes/tex/color';
import { BIOME_FLOOR_TINT, Material, Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px, TILE } from '../px';
import { biteEdges, grit } from '../shade';

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
    grit(px, Material.recess, 28, 11 + variant * 9);
    biteEdges(px, mix(bed, Theme.groundDeep, 0.24), mix(bed, Theme.inkMute, 0.18), variant);
  } else if (family === 'wet') {
    const wet = mix(Material.brine, tint, 0.35);
    px.fillRect(0, 0, TILE, TILE, wet);
    px.fillEllipse(22 + variant, 24, 18, 14, mix(Material.brine, accentOf(sector), 0.18));
    px.fillRect(8, 12, 9, 1, Theme.inkBright);
    grit(px, Theme.biolumDeep, 14, 30 + variant);
    biteEdges(px, mix(wet, Theme.groundDeep, 0.2), mix(wet, Theme.inkBright, 0.12), variant + 3);
  } else {
    const deck = mix(Material.deck, tint, 0.16);
    px.fillRect(0, 0, TILE, TILE, deck);
    px.fillRect(0, 0, TILE, 1, mix(deck, Theme.inkMute, 0.25));
    px.fillRect(0, TILE - 2, TILE, 2, mix(deck, Theme.groundDeep, 0.28));
    for (let y = 8; y < 42; y += 8) {
      px.fillRect(2, y, TILE - 4, 1, Material.recess);
    }
    grit(px, Theme.panelEdge, 18, 50 + variant * 4);
    biteEdges(px, Material.recess, Theme.inkMute, variant + 7);
  }
}

function motif(px: Px, sector: SectorId, variant: number): void {
  const tint = BIOME_FLOOR_TINT[sector];
  const accent = accentOf(sector);
  switch (sector) {
    case 'plains':
      for (let i = 0; i < 22; i++) {
        const x = 3 + ((i * 13 + variant * 7) % 42);
        const y = 4 + ((i * 17 + variant * 11) % 40);
        const big = i % 4 === 0;
        px.fillRect(x, y, big ? 4 : 2, big ? 2 : 1, shade(tint, 0.55));
        px.fillRect(x, y + (big ? 2 : 1), big ? 4 : 2, 1, Theme.groundDeep);
      }
      px.fillRect(10 + variant * 2, 18, 3, 2, mix(Material.rock, tint, 0.25));
      px.fillRect(28 - variant, 30, 4, 2, mix(Material.rock, tint, 0.25));
      break;
    case 'ridge':
      for (let i = 0; i < 4; i++) {
        const y = 6 + i * 10;
        const step = i * 3 + (variant % 3);
        px.fillRect(2 + step, y, TILE - 6 - step, 7, mix(Material.rock, accent, 0.18));
        px.fillRect(2 + step, y, TILE - 6 - step, 1, accent);
        px.fillRect(2 + step, y + 6, TILE - 6 - step, 2, Theme.groundDeep);
        px.fillRect(8 + i * 9 + variant + step, y + 2, 4, 2, Material.recess);
      }
      break;
    case 'canopy':
      for (let i = 0; i < 14; i++) {
        const x = 4 + ((i * 11 + variant * 4) % 38);
        const y = 5 + ((i * 13 + variant * 7) % 34);
        px.fillTriangle(x, y + 3, x + 4, y, x + 7, y + 4, mix(Material.foliage, accent, 0.3));
        px.fillRect(x + 2, y + 3, 3, 1, Material.foliage);
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
      px.fillRect(cx - 7, cy - 9, 9, 1, Theme.inkBright);
      px.fillRect(4, 38, TILE - 8, 2, accent);
      px.fillRect(4, 40, TILE - 8, 1, Theme.groundDeep);
      break;
    }
    case 'brine':
      ;[
        [4, 6, 20, 18],
        [22, 4, 20, 16],
        [6, 22, 16, 18],
        [24, 20, 20, 20],
        [14, 14, 14, 14],
      ].forEach(([x, y, w, h], i) => {
        const ox = ((i + variant) % 3) - 1;
        px.strokeEllipse(x + w / 2 + ox, y + h / 2, w / 2, h / 2, mix(accent, Theme.inkMute, 0.25));
      });
      px.fillRect(12 + variant, 12, 4, 3, accent);
      px.fillRect(6, TILE - 9, TILE - 12, 2, Theme.biolumDeep);
      break;
    case 'reef':
      for (let i = 0; i < 7; i++) {
        const x = 5 + ((i * 11 + variant * 3) % 34);
        const y = 6 + ((i * 7 + variant * 5) % 30);
        px.fillRect(x + 1, y + 8, 6, 3, mix(Material.rock, accent, 0.3));
        px.fillTriangle(x, y + 9, x + 4, y, x + 8, y + 9, accent);
        px.fillRect(x + 3, y + 2, 1, 5, Theme.inkBright);
      }
      break;
    case 'ash':
      for (let i = 0; i < 5; i++) {
        const y = 6 + i * 8 + (variant % 2);
        px.fillRect(1, y, 46, 4, mix(Material.debris, tint, 0.28));
        px.fillRect(1, y, 46, 1, shade(tint, 0.7));
        px.fillRect(3 + i * 9, y + 3, 10, 1, Theme.groundDeep);
      }
      px.fillRect(16 + variant, 22, 14, 2, Theme.arc);
      break;
    case 'fissure':
      px.line(5, 6, 18, 22, Theme.groundDeep);
      px.line(18, 22, 12, 42, Theme.groundDeep);
      px.line(18, 22, 34, 16 + variant, Theme.groundDeep);
      px.line(34, 16 + variant, 44, 40, Theme.groundDeep);
      px.line(19, 22, 28, 36, Theme.groundDeep);
      px.line(6, 7, 18, 22, accent);
      px.line(18, 22, 34, 17 + variant, accent);
      px.fillRect(16, 20, 4, 3, Theme.arc);
      break;
    case 'approach':
      for (let i = 0; i < 4; i++) {
        px.fillRect(3 + i * 11 + (variant % 2), 4, 8, 40, mix(Material.debris, tint, 0.22));
        px.fillRect(5 + i * 11 + (variant % 2), 6, 4, 36, Material.recess);
        px.fillRect(4 + i * 11, 20, 6, 2, Theme.inkMute);
      }
      break;
    case 'trench':
      for (let i = 0; i < 5; i++) {
        const y = 4 + i * 9;
        px.fillRect(2, y, 44, 7, mix(Material.deck, tint, 0.22));
        px.fillRect(2, y, 44, 1, Theme.inkMute);
        px.fillRect(2, y + 6, 44, 1, Theme.groundDeep);
        px.fillRect(7 + i * 8, y + 2, 2, 3, Material.recess);
      }
      break;
    case 'ruin':
      px.fillRect(6 + variant, 8, 32, 26, mix(Material.debris, tint, 0.28));
      px.fillRect(8 + variant, 10, 28, 22, Material.recess);
      px.fillRect(10, 12, 3, 24, Theme.rust);
      px.fillRect(32, 14, 3, 20, Theme.rust);
      px.fillRect(16, 26, 14, 6, Material.debris);
      px.fillRect(18, 28, 10, 2, Theme.inkMute);
      grit(px, Theme.rust, 10, 90 + variant);
      break;
    case 'duct':
      for (let i = 0; i < 6; i++) {
        px.fillRect(3, 3 + i * 8, 42, 5, mix(Material.conduit, tint, 0.18));
        px.fillRect(3, 5 + i * 8, 42, 1, Theme.groundDeep);
        px.fillRect(3, 3 + i * 8, 42, 1, Theme.inkMute);
      }
      break;
    case 'spire':
      for (let y = 5; y < 44; y += 7) {
        for (let x = 5; x < 44; x += 7) {
          px.fillRect(x, y, 4, 4, Theme.panelEdge);
          px.fillRect(x + 1, y + 1, 2, 2, Theme.inkMute);
          px.set(x + 1, y + 1, Theme.inkDim);
        }
      }
      break;
    case 'vault':
      for (let i = 0; i < 5; i++) {
        const y = 5 + i * 8;
        px.fillRect(4, y, 40, 6, mix(Material.deck, Theme.arcWhite, 0.1));
        px.fillRect(4, y, 40, 1, Theme.panelEdge);
        px.fillTriangle(6, y + 1, 16, y + 5, 26, y + 1, Theme.panelEdge);
        px.fillTriangle(22, y + 1, 32, y + 5, 42, y + 1, Theme.panelEdge);
      }
      break;
    case 'beacon':
      px.fillRect(3, 18, 42, 12, mix(Material.deck, Theme.tape, 0.18));
      px.fillRect(18, 3, 12, 42, mix(Material.deck, Theme.tape, 0.18));
      px.fillRect(5, 22, 38, 4, Theme.tape);
      px.fillRect(22, 5, 4, 38, Theme.tape);
      px.fillRect(5, 22, 38, 1, Theme.inkBright);
      px.fillRect(22, 5, 1, 38, Theme.inkBright);
      px.fillRect(21 + variant, 21, 6, 6, Theme.inkBright);
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
    px.fillRect(15, 19, 3, 2, Theme.arcWhite);
    px.fillRect(31, 15, 3, 2, Theme.arc);
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
