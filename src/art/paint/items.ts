import { Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px } from '../px';
import { bevelRect, finishSprite } from '../shade';

type Stamp = 'crate' | 'key' | 'core' | 'med' | 'energy' | 'flare' | 'tool' | 'wear';

function paintItem(kind: Stamp): Px {
  const px = new Px();
  if (kind === 'crate') {
    bevelRect(px, 10, 16, 28, 22, Theme.inkDim, Theme.inkMute, Theme.groundDeep);
    px.fillRect(14, 20, 20, 14, Theme.groundDeep);
    bevelRect(px, 20, 14, 8, 8, Theme.inkBright, Theme.tape, Theme.groundDeep);
    px.fillRect(18, 26, 12, 4, Theme.tape);
  } else if (kind === 'key') {
    px.fillTriangle(24, 6, 12, 22, 36, 22, Theme.flag);
    px.fillTriangle(24, 42, 12, 22, 36, 22, Theme.flag);
    px.fillRect(22, 12, 4, 22, Theme.inkBright);
    px.fillRect(16, 20, 16, 4, Theme.inkBright);
    px.set(24, 10, Theme.inkBright);
  } else if (kind === 'core') {
    px.fillTriangle(24, 4, 8, 24, 24, 44, Theme.arcWhite);
    px.fillTriangle(24, 4, 40, 24, 24, 44, Theme.arcWhite);
    px.fillDisc(24, 24, 8, Theme.groundDeep);
    px.strokeDisc(24, 24, 8, Theme.inkDim);
    px.fillDisc(24, 24, 4, Theme.inkBright);
    px.set(24, 23, Theme.arcWhite);
  } else if (kind === 'med') {
    bevelRect(px, 12, 14, 24, 22, Theme.inkBright, Theme.ink, Theme.groundDeep);
    px.fillRect(21, 17, 6, 16, Theme.safe);
    px.fillRect(16, 22, 16, 6, Theme.safe);
    px.fillRect(14, 16, 4, 2, Theme.groundDeep);
  } else if (kind === 'energy') {
    bevelRect(px, 16, 10, 16, 28, Theme.inkMute, Theme.panelEdge, Theme.groundDeep);
    px.fillRect(18, 14, 12, 16, Theme.tape);
    px.fillRect(20, 16, 8, 3, Theme.inkBright);
    px.fillRect(19, 32, 10, 3, Theme.groundDeep);
  } else if (kind === 'flare') {
    bevelRect(px, 21, 12, 6, 26, Theme.inkMute, Theme.panelEdge, Theme.groundDeep);
    px.fillRect(20, 8, 8, 8, Theme.arc);
    px.fillDisc(24, 9, 5, Theme.arcWhite);
    px.fillRect(20, 28, 8, 3, Theme.tape);
  } else if (kind === 'tool') {
    bevelRect(px, 21, 14, 6, 24, Theme.inkMute, Theme.panelEdge, Theme.groundDeep);
    px.fillTriangle(24, 6, 11, 16, 37, 16, Theme.biolum);
    px.fillRect(22, 8, 4, 6, Theme.inkBright);
    px.fillRect(19, 32, 10, 4, Theme.inkBright);
  } else {
    bevelRect(px, 11, 14, 26, 22, Theme.inkDim, Theme.inkMute, Theme.groundDeep);
    px.fillRect(14, 17, 20, 16, Theme.panel);
    px.fillRect(14, 17, 20, 3, Theme.tape);
    px.fillRect(16, 24, 12, 2, Theme.inkBright);
    px.fillRect(16, 28, 8, 2, Theme.inkMute);
  }
  finishSprite(px, envPalette());
  return px;
}

export function itemFrames(): Frame[] {
  const crate = paintItem('crate');
  const key = paintItem('key');
  const core = paintItem('core');
  return [
    { key: 't_item', px: crate },
    { key: 't_item_med', px: paintItem('med') },
    { key: 't_item_energy', px: paintItem('energy') },
    { key: 't_item_flare', px: paintItem('flare') },
    { key: 't_item_tool', px: paintItem('tool') },
    { key: 't_item_wear', px: paintItem('wear') },
    { key: 't_key', px: key },
    { key: 't_quest', px: key.clone() },
    { key: 't_nav_core', px: core },
  ];
}
