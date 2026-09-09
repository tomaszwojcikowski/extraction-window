import Phaser from 'phaser';
import { formatChangelogContent } from '../../presenters/OverlayCopy';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';
import { drawModalTapeHeader } from './modalChrome';

/** Halcyon field bulletin — player-facing ship notes on the title screen. */
export function drawChangelogOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
): void {
  const w = 520;
  const h = Math.min(480, screenH - 48);
  const x = (screenW - w) / 2;
  const y = (screenH - h) / 2;
  drawFieldPanel(panel, x, y, w, h, Theme.tape);
  drawModalTapeHeader(panel, x, y, w, Theme.tape);
  text.setWordWrapWidth(w - 48);
  text.setPosition(x + 24, y + 28);
  text.setText(formatChangelogContent());
}
