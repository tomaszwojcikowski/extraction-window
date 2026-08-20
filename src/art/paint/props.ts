import { mix } from '../../scenes/tex/color';
import { Material, Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px } from '../px';
import { bevelRect, finishSprite, grit, volume } from '../shade';

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
      for (let i = 0; i < 10; i++) {
        px.fillRect(6 + ((i * 11) % 34), 34 + (i % 3), 2, 2, mix(Material.foliage, Material.debris, 0.4));
      }
      for (let i = 0; i < 6; i++) {
        const x = 8 + i * 6;
        const h = 16 + ((i * 5) % 12);
        px.fillRect(x, 38 - h, 3, h, Material.foliage);
        px.fillRect(x, 38 - h, 1, h, mix(Material.foliage, Theme.groundDeep, 0.35));
        px.fillTriangle(x - 4, 20 + (i % 3) * 3, x + 2, 10 + (i % 2) * 4, x + 6, 21 + (i % 3) * 3, Theme.safe);
      }
      break;
    case 'scrub_nest':
      px.fillEllipse(24, 36, 18, 8, mix(Material.foliage, Material.debris, 0.3));
      px.fillEllipse(24, 28, 16, 8, Material.foliage);
      volume(px, Material.foliage, Theme.safe, Material.nest);
      px.fillEllipse(24, 30, 11, 7, Material.nest);
      px.fillEllipse(24, 31, 7, 4, Theme.groundDeep);
      px.fillRect(20, 28, 3, 2, mix(Material.debris, Theme.inkMute, 0.4));
      px.fillRect(26, 29, 2, 2, Theme.inkMute);
      break;
    case 'rubble':
      bevelRect(px, 8, 20, 16, 18, Theme.inkMute, Material.debris, Theme.groundDeep);
      bevelRect(px, 20, 16, 18, 22, Theme.inkDim, mix(Material.debris, Theme.groundDeep, 0.2), Theme.groundDeep);
      px.fillRect(12, 24, 8, 6, Material.recess);
      px.fillRect(26, 28, 7, 4, Theme.inkMute);
      px.fillRect(14, 34, 12, 3, Theme.rust);
      grit(px, Theme.rust, 8, 12);
      break;
    case 'vent':
      bevelRect(px, 8, 10, 32, 28, Theme.inkMute, Material.conduit, Theme.groundDeep);
      px.fillRect(11, 13, 26, 22, Theme.groundDeep);
      for (let i = 0; i < 4; i++) {
        px.fillRect(13, 15 + i * 5, 22, 3, Theme.biolumDeep);
        px.fillRect(13, 16 + i * 5, 22, 1, Theme.groundDeep);
      }
      px.fillRect(18, 16 + pulse, 12, 3, Theme.biolum);
      px.fillRect(20, 8, 8, 4, Theme.panelEdge);
      break;
    case 'hazard':
      px.fillEllipse(24, 28, 16, 11, mix(Material.brine, Theme.rust, 0.25));
      volume(px, mix(Material.brine, Theme.rust, 0.25), Theme.arc, Theme.rust);
      px.fillEllipse(24, 27, 8, 6, Theme.rust);
      px.fillEllipse(24, 25, 4, 3, Theme.arc);
      if (pulse % 2 === 0) px.fillDisc(24, 22, 2, Theme.arcWhite);
      px.fillRect(8, 38, 32, 4, Theme.tape);
      px.fillRect(8, 38, 32, 1, Theme.inkBright);
      px.fillRect(12, 39, 6, 2, Theme.groundDeep);
      px.fillRect(30, 39, 6, 2, Theme.groundDeep);
      break;
    case 'brine_pool':
      px.fillEllipse(24, 28, 18, 12, Material.brine);
      volume(px, Material.brine, Theme.biolum, Theme.biolumDeep);
      px.fillEllipse(24, 26, 10, 7, mix(Material.brine, Theme.biolum, 0.25));
      px.fillRect(11, 16 + (pulse % 3), 8, 1, Theme.inkBright);
      px.fillEllipse(24, 38, 14, 4, Theme.biolumDeep);
      break;
    case 'sealed':
      bevelRect(px, 8, 8, 32, 32, Theme.inkMute, Material.deck, Theme.groundDeep);
      px.fillRect(12, 12, 24, 24, Material.recess);
      bevelRect(px, 16, 16, 16, 16, Theme.inkMute, Material.deck, Theme.groundDeep);
      px.fillRect(22, 14, 4, 20, Theme.tape);
      px.fillRect(14, 22, 20, 4, Theme.tape);
      px.fillRect(22, 22, 4, 4, Theme.groundDeep);
      break;
    case 'tripwire':
      bevelRect(px, 4, 28, 8, 10, Theme.inkMute, Material.debris, Theme.groundDeep);
      bevelRect(px, 36, 26, 8, 12, Theme.inkMute, Material.debris, Theme.groundDeep);
      px.line(10, 32, 38, 30, Theme.inkBright);
      px.line(10, 33, 38, 31, Theme.flag);
      px.fillRect(22, 28, 4, 4, Theme.flag);
      px.set(24, 29, Theme.inkBright);
      break;
    case 'exit':
      bevelRect(px, 10, 8, 28, 32, Theme.inkMute, Material.deck, Theme.groundDeep);
      px.fillRect(13, 11, 22, 26, Theme.groundDeep);
      px.fillRect(17, 14, 14, 18, mix(Material.deck, Theme.safe, 0.18));
      px.fillRect(22, 18, 4, 12, Theme.safe);
      px.fillRect(22, 18, 4, 1, Theme.inkBright);
      px.fillRect(14, 36, 20, 3, Theme.tape);
      break;
    case 'shuttle':
      bevelRect(px, 8, 18, 32, 14, Theme.inkMute, Material.deck, Theme.groundDeep);
      px.fillTriangle(8, 18, 8, 32, 1, 25, Material.deck);
      px.fillTriangle(40, 18, 40, 32, 47, 25, Material.deck);
      px.fillRect(14, 20, 20, 7, Theme.groundDeep);
      px.fillRect(16, 22, 6, 3, Theme.arcWhite);
      px.fillRect(26, 22, 6, 3, Theme.arcWhite);
      px.fillRect(12, 32, 8, 4, Theme.panelEdge);
      px.fillRect(28, 32, 8, 4, Theme.panelEdge);
      break;
    case 'beacon':
      bevelRect(px, 20, 10, 8, 26, Theme.inkMute, Material.deck, Theme.groundDeep);
      bevelRect(px, 16, 32, 16, 8, Theme.inkMute, Material.deck, Theme.groundDeep);
      px.fillDisc(24, 12, 6 + (pulse % 2), Theme.tape);
      px.fillDisc(24, 12, 3, Theme.inkBright);
      px.fillRect(22, 18, 4, 12, Theme.panelEdge);
      break;
    case 'landmark':
      bevelRect(px, 14, 12, 20, 26, Theme.inkMute, Material.rock, Theme.groundDeep);
      px.fillRect(16, 14, 16, 8, mix(Material.rock, Theme.inkMute, 0.25));
      px.fillRect(18, 24, 12, 10, Material.recess);
      px.fillRect(22, 8 + (pulse % 2), 4, 8, Theme.flag);
      px.set(24, 8 + (pulse % 2), Theme.inkBright);
      break;
    case 'quest':
      bevelRect(px, 10, 16, 28, 22, Theme.inkMute, Material.deck, Theme.groundDeep);
      px.fillRect(13, 19, 22, 16, Theme.groundDeep);
      bevelRect(px, 16, 20, 16, 10, Theme.inkMute, Theme.panel, Theme.groundDeep);
      px.fillTriangle(24, 6 + (pulse % 2), 17, 16, 31, 16, Theme.flag);
      px.fillRect(22, 16, 4, 8, Theme.flag);
      break;
  }
  if (kind !== 'hazard' && kind !== 'brine_pool' && kind !== 'tripwire') {
    finishSprite(px, envPalette());
  } else {
    px.snap(envPalette());
  }
  return px;
}

function paintFog(): Px {
  const px = new Px();
  px.fillRect(0, 0, px.w, px.h, Theme.fog);
  px.fillRect(0, 0, px.w, 2, Theme.groundDeep);
  px.fillRect(0, px.h - 2, px.w, 2, Theme.groundDeep);
  px.fillRect(0, 0, 2, px.h, Theme.groundDeep);
  px.fillRect(px.w - 2, 0, 2, px.h, Theme.groundDeep);
  grit(px, Theme.ground, 28, 4);
  px.snap(envPalette());
  return px;
}

function paintMemory(): Px {
  const px = new Px();
  px.fillRect(0, 0, px.w, px.h, Theme.memory);
  for (let i = 0; i < 16; i++) {
    px.fillRect(3 + ((i * 11) % 40), 4 + ((i * 7) % 38), i % 3 === 0 ? 3 : 1, 1, Theme.memoryWash);
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
    const keyBase = kind === 'quest' ? 't_quest_tile' : (`t_${kind}` as const);
    for (let f = 0; f < 4; f++) {
      frames.push({
        key: f === 0 ? keyBase : `${keyBase}_${f}`,
        px: paintProp(kind, f),
      });
    }
  }
  return frames;
}
