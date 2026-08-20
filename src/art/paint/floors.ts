import type { SectorId } from '../../data/encounters';
import { mix, shade } from '../../scenes/tex/color';
import { BIOME_FLOOR_TINT, Material, Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px, TILE } from '../px';

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
    px.fillTriangle(
      c === 0 ? 0 : c === 1 ? TILE : 0,
      c === 2 ? TILE : 0,
      c === 0 ? TILE : TILE,
      c === 1 ? TILE : 0,
      c === 0 ? 0 : c === 1 ? TILE * 0.38 : TILE * 0.55,
      c === 0 ? TILE * 0.62 : c === 1 ? 0 : TILE * 0.32,
      mix(bed, Theme.inkMute, 0.22),
    );
    for (let i = 0; i < 5; i++) {
      const x = 2 + ((i * 9 + variant * 5) % 42);
      const y = 2 + ((i * 11 + variant * 7) % 40);
      px.fillRect(x, y, 3 + (i % 2), 2, Material.recess);
    }
  } else if (family === 'wet') {
    const wet = mix(Material.brine, tint, 0.35);
    px.fillRect(0, 0, TILE, TILE, wet);
    px.fillEllipse(24, 22, 20, 16, mix(Material.brine, accentOf(sector), 0.2), 180);
    px.fillRect(6, 10, 10, 1, Theme.inkBright);
  } else {
    const deck = mix(Material.deck, tint, 0.16);
    px.fillRect(0, 0, TILE, TILE, deck);
    px.fillRect(0, 0, TILE, 1, mix(deck, Theme.inkMute, 0.2));
    px.fillRect(0, TILE - 2, TILE, 2, mix(deck, Theme.groundDeep, 0.25));
    for (let i = 0; i < 6; i++) {
      px.fillRect(4 + ((i * 7 + variant * 3) % 40), 6 + ((i * 5) % 36), 2, 1, Material.recess);
    }
  }
}

function motif(px: Px, sector: SectorId, variant: number): void {
  const tint = BIOME_FLOOR_TINT[sector];
  const accent = accentOf(sector);
  switch (sector) {
    case 'plains':
      for (let i = 0; i < 11; i++) {
        const x = 5 + ((i * 13 + variant * 7) % 36);
        const y = 6 + ((i * 17 + variant * 11) % 34);
        const big = i % 5 === 0;
        px.fillRect(x, y, big ? 3 : 2, big ? 2 : 1, shade(tint, 0.55));
        px.fillRect(x, y + (big ? 2 : 1), big ? 3 : 2, 1, Theme.groundDeep);
      }
      px.fillRect(10 + variant * 2, 18, 2, 2, mix(Material.rock, tint, 0.25));
      px.fillRect(13 + variant, 19, 1, 1, mix(Material.rock, tint, 0.25));
      break;
    case 'ridge':
      for (let i = 0; i < 3; i++) {
        const y = 8 + i * 12;
        const step = i * 4 + variant * 2;
        const w = TILE - 8 - step;
        px.fillRect(4 + step, y, w, 5, mix(Material.rock, accent, 0.2));
        px.fillRect(4 + step, y, w, 1, accent);
        px.fillRect(4 + step, y + 5, w, 2, Theme.groundDeep);
        px.fillRect(10 + i * 9 + variant * 2 + step, y + 1, 3, 2, Material.recess);
      }
      break;
    case 'canopy':
      for (let i = 0; i < 7; i++) {
        const x = 6 + ((i * 11 + variant * 4) % 32);
        const y = 7 + ((i * 13 + variant * 7) % 30);
        px.fillTriangle(x, y + 2, x + 3, y, x + 5, y + 3, mix(Material.foliage, accent, 0.35));
      }
      px.line(4, 32 + variant, 22, 25, mix(Material.foliage, Theme.groundDeep, 0.4));
      px.line(22, 25, 44, 31 - variant * 2, mix(Material.foliage, Theme.groundDeep, 0.4));
      px.line(5, 31 + variant, 22, 24, shade(accent, 0.65));
      break;
    case 'flood': {
      const cx = 24 + variant * 3 - 3;
      const cy = 22;
      px.fillEllipse(24, 24, 18, 15, mix(Material.brine, accent, 0.25), 80);
      for (let r = 0; r < 3; r++) {
        px.fillDisc(cx, cy, 5 + r * 6, accent, 40);
        px.fillDisc(cx, cy, 4 + r * 6, mix(Material.brine, tint, 0.35));
      }
      px.fillRect(cx - 6, cy - 8, 8, 1, Theme.inkBright);
      px.fillRect(5, 38, TILE - 10, 2, accent);
      break;
    }
    case 'brine':
      ;[
        [6, 8, 18, 16],
        [20, 6, 16, 14],
        [8, 22, 14, 16],
        [24, 20, 18, 18],
        [14, 14, 12, 12],
      ].forEach(([x, y, w, h], i) => {
        const ox = ((i + variant) % 3) - 1;
        px.fillRect(x + ox, y, w, 1, mix(accent, Theme.inkMute, 0.3));
        px.fillRect(x + ox, y + h - 1, w, 1, mix(accent, Theme.inkMute, 0.3));
        px.fillRect(x + ox, y, 1, h, mix(accent, Theme.inkMute, 0.3));
        px.fillRect(x + ox + w - 1, y, 1, h, mix(accent, Theme.inkMute, 0.3));
      });
      px.fillRect(12 + variant, 12, 3, 3, accent);
      px.fillRect(8, TILE - 10, TILE - 16, 2, Theme.biolumDeep);
      break;
    case 'reef':
      for (let i = 0; i < 5; i++) {
        const x = 6 + ((i * 11 + variant * 3) % 32);
        const y = 8 + ((i * 7 + variant * 5) % 26);
        px.fillRect(x + 1, y + 5, 5, 2, mix(Material.rock, accent, 0.35));
        px.fillTriangle(x, y + 7, x + 3, y, x + 7, y + 7, accent);
        px.fillRect(x + 2, y + 2, 1, 3, Theme.inkBright);
      }
      break;
    case 'ash':
      for (let i = 0; i < 4; i++) {
        const y = 8 + i * 9 + (variant % 2);
        px.fillRect(2, y, 44, 3, mix(Material.debris, tint, 0.3));
        px.fillRect(4 + i * 10, y - 1, 8, 1, shade(tint, 0.7));
      }
      px.fillRect(18 + variant, 22, 12, 2, Theme.arc);
      break;
    case 'fissure':
      px.line(6, 8, 18, 22, Theme.groundDeep);
      px.line(18, 22, 14, 40, Theme.groundDeep);
      px.line(18, 22, 36, 18 + variant, Theme.groundDeep);
      px.line(36, 18 + variant, 42, 38, Theme.groundDeep);
      px.line(7, 8, 19, 22, accent);
      px.fillRect(16, 20, 3, 2, Theme.arc);
      break;
    case 'approach':
      for (let i = 0; i < 3; i++) {
        px.fillRect(4 + i * 14 + variant, 6, 8, 36, mix(Material.debris, tint, 0.2));
        px.fillRect(6 + i * 14 + variant, 8, 4, 32, Material.recess);
      }
      break;
    case 'trench':
      for (let i = 0; i < 4; i++) {
        const y = 6 + i * 10;
        px.fillRect(3, y, 42, 6, mix(Material.deck, tint, 0.25));
        px.fillRect(3, y, 42, 1, Theme.inkMute);
        px.fillRect(8 + i * 9, y + 2, 2, 3, Material.recess);
      }
      break;
    case 'ruin':
      px.fillRect(8 + variant, 10, 28, 22, mix(Material.debris, tint, 0.3));
      px.fillRect(10 + variant, 12, 24, 18, Material.recess);
      px.fillRect(12, 14, 2, 20, Theme.rust);
      px.fillRect(32, 16, 2, 16, Theme.rust);
      px.fillRect(18, 28, 12, 4, Material.debris);
      break;
    case 'duct':
      for (let i = 0; i < 5; i++) {
        px.fillRect(4, 4 + i * 9, 40, 5, mix(Material.conduit, tint, 0.2));
        px.fillRect(4, 6 + i * 9, 40, 1, Theme.groundDeep);
      }
      break;
    case 'spire':
      for (let y = 6; y < 42; y += 8) {
        for (let x = 6; x < 42; x += 8) {
          px.fillRect(x, y, 3, 3, Theme.panelEdge);
          px.fillRect(x + 1, y + 1, 1, 1, Theme.inkMute);
        }
      }
      break;
    case 'vault':
      for (let i = 0; i < 4; i++) {
        const y = 8 + i * 9;
        px.fillRect(6, y, 36, 5, mix(Material.deck, Theme.arcWhite, 0.12));
        px.fillTriangle(8, y + 1, 16, y + 4, 24, y + 1, Theme.panelEdge);
        px.fillTriangle(24, y + 1, 32, y + 4, 40, y + 1, Theme.panelEdge);
      }
      break;
    case 'beacon':
      px.fillRect(4, 20, 40, 8, mix(Material.deck, Theme.tape, 0.2));
      px.fillRect(20, 4, 8, 40, mix(Material.deck, Theme.tape, 0.2));
      px.fillRect(6, 22, 36, 4, Theme.tape);
      px.fillRect(22, 6, 4, 36, Theme.tape);
      px.fillRect(22 + variant, 22, 4, 4, Theme.inkBright);
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
  px.line(6, 10, 16, 20, ink);
  px.line(16, 20, 14, 34, ink);
  px.line(16, 20, 30, 18, ink);
  px.line(30, 18, 40, 32, ink);
  px.line(14, 34, 22, 42, ink);
  px.line(7, 11, 16, 20, hot);
  if (urgent) {
    px.fillRect(15, 19, 3, 2, Theme.arcWhite);
    px.fillRect(29, 17, 2, 2, Theme.arc);
  }
  px.snap(envPalette());
  return px;
}

export function floorFrames(): Frame[] {
  const frames: Frame[] = [];
  for (const sector of SECTORS) {
    for (let v = 0; v < 3; v++) {
      const px = paintFloor(sector, v);
      frames.push({ key: `t_floor_${sector}_${v}`, px });
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
