import { Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px } from '../px';

type Stamp = 'crate' | 'key' | 'core' | 'med' | 'energy' | 'flare' | 'tool' | 'wear';

function paintItem(kind: Stamp): Px {
  const px = new Px();
  px.contactShadow();
  const wash =
    kind === 'crate'
      ? Theme.tape
      : kind === 'key'
        ? Theme.flag
        : kind === 'core'
          ? Theme.arcWhite
          : kind === 'med'
            ? Theme.safe
            : kind === 'energy'
              ? Theme.tape
              : kind === 'flare'
                ? Theme.arc
                : kind === 'tool'
                  ? Theme.biolum
                  : Theme.inkDim;
  px.fillDisc(24, 24, 17, wash, 90);
  if (kind === 'crate') {
    px.fillRect(9, 15, 30, 23, Theme.inkDim);
    px.fillRect(13, 19, 22, 15, Theme.groundDeep);
    px.fillRect(20, 14, 8, 8, Theme.tape);
    px.fillRect(17, 24, 14, 5, Theme.tape);
  } else if (kind === 'key') {
    px.fillTriangle(24, 4, 11, 22, 37, 22, Theme.flag);
    px.fillTriangle(24, 44, 11, 22, 37, 22, Theme.flag);
    px.fillRect(22, 10, 4, 25, Theme.inkBright);
    px.fillRect(16, 19, 16, 4, Theme.inkBright);
  } else if (kind === 'core') {
    px.fillTriangle(24, 3, 5, 24, 24, 45, Theme.arcWhite);
    px.fillTriangle(24, 3, 43, 24, 24, 45, Theme.arcWhite);
    px.fillDisc(24, 24, 9, Theme.groundDeep);
    px.fillDisc(24, 24, 5, Theme.inkBright);
  } else if (kind === 'med') {
    px.fillRect(12, 14, 24, 22, Theme.inkBright);
    px.fillRect(21, 17, 6, 16, Theme.safe);
    px.fillRect(16, 22, 16, 6, Theme.safe);
    px.fillRect(14, 16, 4, 2, Theme.groundDeep);
  } else if (kind === 'energy') {
    px.fillRect(16, 10, 16, 28, Theme.panelEdge);
    px.fillRect(18, 14, 12, 18, Theme.tape);
    px.fillRect(20, 16, 8, 4, Theme.inkBright);
    px.fillRect(19, 34, 10, 3, Theme.groundDeep);
  } else if (kind === 'flare') {
    px.fillRect(21, 8, 6, 30, Theme.panelEdge);
    px.fillRect(20, 6, 8, 8, Theme.arc);
    px.fillDisc(24, 8, 5, Theme.arcWhite);
    px.fillRect(20, 28, 8, 3, Theme.tape);
  } else if (kind === 'tool') {
    px.fillRect(21, 10, 6, 26, Theme.panelEdge);
    px.fillTriangle(24, 6, 12, 16, 36, 16, Theme.biolum);
    px.fillRect(19, 30, 10, 4, Theme.inkBright);
  } else {
    px.fillRect(11, 14, 26, 22, Theme.inkDim);
    px.fillRect(14, 17, 20, 16, Theme.panel);
    px.fillRect(14, 17, 20, 3, Theme.tape);
    px.fillRect(16, 24, 12, 2, Theme.inkBright);
  }
  px.outline(Theme.groundDeep);
  px.snap(envPalette());
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
