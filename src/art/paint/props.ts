import { mix } from '../../scenes/tex/color';
import { Material, Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px } from '../px';

type PropKind =
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

function paintProp(kind: PropKind, frame = 0): Px {
  const px = new Px();
  const pulse = frame % 4;
  switch (kind) {
    case 'scrub':
      px.fillEllipse(24, 38, 17, 4, Theme.groundDeep);
      for (let i = 0; i < 8; i++) {
        px.fillRect(8 + ((i * 11) % 32), 32 + (i % 3), 2, 2, mix(Material.foliage, Material.debris, 0.45));
      }
      for (let i = 0; i < 5; i++) {
        const x = 9 + i * 7;
        const h = 14 + ((i * 5) % 14);
        px.fillRect(x, 36 - h, 3, h, Material.foliage);
        px.fillRect(x, 36 - h, 1, h, mix(Material.foliage, Theme.groundDeep, 0.35));
        px.fillTriangle(x - 3, 18 + (i % 3) * 4, x + 2, 12 + (i % 2) * 5, x + 5, 19 + (i % 3) * 4, Theme.safe);
      }
      break;
    case 'scrub_nest':
      px.fillEllipse(24, 38, 20, 5, Theme.groundDeep);
      px.fillEllipse(24, 32, 18, 8, mix(Material.foliage, Material.debris, 0.3));
      px.fillEllipse(24, 26, 16, 4, Material.foliage);
      px.fillEllipse(24, 30, 12, 7, Material.nest);
      px.fillEllipse(24, 31, 9, 5, mix(Material.nest, Theme.groundDeep, 0.4));
      px.fillEllipse(24, 31, 7, 4, Theme.groundDeep);
      px.fillRect(20, 28, 3, 2, mix(Material.debris, Theme.inkMute, 0.5));
      break;
    case 'rubble':
      px.fillEllipse(24, 40, 16, 4, Theme.groundDeep);
      px.fillRect(10, 22, 14, 16, Material.debris);
      px.fillRect(22, 18, 16, 20, mix(Material.debris, Theme.groundDeep, 0.25));
      px.fillRect(12, 24, 8, 6, Material.recess);
      px.fillRect(28, 28, 6, 4, Theme.inkMute);
      px.fillRect(16, 34, 10, 3, Theme.rust);
      break;
    case 'vent':
      px.fillRect(8, 10, 32, 28, Material.conduit);
      px.fillRect(10, 12, 28, 24, Theme.groundDeep);
      for (let i = 0; i < 4; i++) {
        px.fillRect(12, 14 + i * 6, 24, 3, Theme.biolumDeep);
      }
      px.fillRect(18, 16 + pulse, 12, 4, Theme.biolum);
      px.fillRect(20, 8, 8, 4, Theme.panelEdge);
      break;
    case 'hazard':
      px.fillEllipse(24, 28, 18, 12, mix(Material.brine, Theme.rust, 0.3));
      px.fillEllipse(24, 28, 12, 8, Theme.rust);
      px.fillEllipse(24, 26, 6, 4, Theme.arc);
      if (pulse % 2 === 0) px.fillDisc(24, 22, 3, Theme.arcWhite);
      px.fillRect(8, 36, 32, 4, Theme.tape);
      px.fillRect(10, 37, 6, 2, Theme.groundDeep);
      px.fillRect(28, 37, 6, 2, Theme.groundDeep);
      break;
    case 'brine_pool':
      px.fillEllipse(24, 28, 20, 14, Material.brine);
      px.fillEllipse(24, 26, 14, 10, mix(Material.brine, Theme.biolum, 0.3));
      px.fillRect(12, 18 + (pulse % 3), 8, 1, Theme.inkBright);
      px.fillEllipse(24, 38, 16, 4, Theme.biolumDeep);
      break;
    case 'sealed':
      px.fillRect(6, 6, 36, 36, Material.deck);
      px.fillRect(8, 8, 32, 32, Material.recess);
      px.fillRect(12, 12, 24, 24, Material.deck);
      px.fillRect(20, 14, 8, 20, Theme.tape);
      px.fillRect(14, 20, 20, 8, Theme.tape);
      px.fillRect(22, 22, 4, 4, Theme.groundDeep);
      break;
    case 'tripwire':
      px.fillRect(4, 30, 6, 8, Material.debris);
      px.fillRect(38, 28, 6, 10, Material.debris);
      px.line(8, 32, 40, 30, Theme.inkBright);
      px.line(8, 33, 40, 31, Theme.flag);
      px.fillRect(22, 28, 4, 4, Theme.flag);
      break;
    case 'exit':
      px.fillRect(10, 8, 28, 32, Material.deck);
      px.fillRect(12, 10, 24, 28, Theme.groundDeep);
      px.fillRect(16, 14, 16, 20, mix(Material.deck, Theme.safe, 0.2));
      px.fillRect(22, 18, 4, 12, Theme.safe);
      px.fillRect(14, 36, 20, 3, Theme.tape);
      break;
    case 'shuttle':
      px.fillRect(6, 18, 36, 16, Material.deck);
      px.fillTriangle(6, 18, 6, 34, 0, 26, Material.deck);
      px.fillTriangle(42, 18, 42, 34, 48, 26, Material.deck);
      px.fillRect(12, 20, 24, 8, Theme.groundDeep);
      px.fillRect(16, 22, 6, 4, Theme.arcWhite);
      px.fillRect(26, 22, 6, 4, Theme.arcWhite);
      px.fillRect(10, 32, 8, 4, Theme.panelEdge);
      px.fillRect(30, 32, 8, 4, Theme.panelEdge);
      break;
    case 'beacon':
      px.fillRect(20, 8, 8, 28, Material.deck);
      px.fillRect(16, 32, 16, 8, Material.deck);
      px.fillDisc(24, 12, 6 + (pulse % 2), Theme.tape);
      px.fillDisc(24, 12, 3, Theme.inkBright);
      px.fillRect(22, 18, 4, 14, Theme.panelEdge);
      break;
    case 'landmark':
      px.fillRect(14, 10, 20, 28, Material.rock);
      px.fillRect(16, 12, 16, 10, mix(Material.rock, Theme.inkMute, 0.3));
      px.fillRect(18, 24, 12, 10, Material.recess);
      px.fillRect(22, 8 + pulse, 4, 6, Theme.flag);
      break;
    case 'quest':
      px.fillRect(10, 14, 28, 22, Material.deck);
      px.fillRect(12, 16, 24, 18, Theme.groundDeep);
      px.fillRect(16, 18, 16, 10, Theme.panel);
      px.fillTriangle(24, 6 + (pulse % 2), 18, 16, 30, 16, Theme.flag);
      px.fillRect(22, 16, 4, 8, Theme.flag);
      break;
  }
  if (kind !== 'hazard' && kind !== 'brine_pool' && kind !== 'tripwire') {
    px.outline(Theme.groundDeep);
  }
  px.snap(envPalette());
  return px;
}

function paintFog(): Px {
  const px = new Px();
  px.fillRect(0, 0, px.w, px.h, Theme.fog);
  px.fillRect(0, 0, px.w, 2, Theme.groundDeep);
  px.fillRect(0, px.h - 2, px.w, 2, Theme.groundDeep);
  px.fillRect(0, 0, 2, px.h, Theme.groundDeep);
  px.fillRect(px.w - 2, 0, 2, px.h, Theme.groundDeep);
  for (let i = 0; i < 22; i++) {
    const x = 2 + ((i * 11 + 7) % (px.w - 4));
    const y = 2 + ((i * 7 + 13) % (px.h - 4));
    px.fillRect(x, y, 1, 1, Theme.ground);
    if (i % 6 === 0) px.fillRect(Math.min(px.w - 2, x + 1), y, 1, 1, Theme.ground);
  }
  px.snap(envPalette());
  return px;
}

function paintMemory(): Px {
  const px = new Px();
  px.fillRect(0, 0, px.w, px.h, Theme.memory);
  for (let i = 0; i < 12; i++) {
    px.fillRect(4 + ((i * 11) % 36), 5 + ((i * 7) % 34), i % 3 === 0 ? 2 : 1, 1, Theme.memoryWash);
  }
  px.snap(envPalette());
  return px;
}

export function propFrames(): Frame[] {
  const frames: Frame[] = [
    { key: 't_scrub', px: paintProp('scrub') },
    { key: 't_scrub_nest', px: paintProp('scrub_nest') },
    { key: 't_rubble', px: paintProp('rubble') },
    { key: 't_sealed', px: paintProp('sealed') },
    { key: 't_tripwire', px: paintProp('tripwire') },
    { key: 't_exit', px: paintProp('exit') },
    { key: 't_shuttle', px: paintProp('shuttle') },
    { key: 't_fog', px: paintFog() },
    { key: 't_memory', px: paintMemory() },
  ];
  for (const kind of ['vent', 'hazard', 'brine_pool', 'beacon', 'landmark', 'quest'] as const) {
    const keyBase =
      kind === 'quest' ? 't_quest_tile' : (`t_${kind}` as const);
    for (let f = 0; f < 4; f++) {
      frames.push({
        key: f === 0 ? keyBase : `${keyBase}_${f}`,
        px: paintProp(kind, f),
      });
    }
  }
  return frames;
}
