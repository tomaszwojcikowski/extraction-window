import Phaser from 'phaser';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';
import { drawModalTapeHeader } from './modalChrome';
import { formatPaddContent } from '../../presenters/OverlayCopy';
import type { GameState } from '../../../sim/types';

export { formatPaddContent } from '../../presenters/OverlayCopy';

/** Fixed panel budget — body grows only inside this cap (kit lesson). */
const PADD_MAX_H = 460;
const PADD_LINE = 18;

/** Draw the PADD / codex pages modal into existing Phaser objects. */
export function drawPaddOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  state: GameState,
): void {
  const w = 480;
  const body = formatPaddContent(state);
  const lines = body.split('\n').length;
  const h = Math.min(PADD_MAX_H, 56 + Math.max(4, lines) * PADD_LINE);
  const x = (screenW - w) / 2;
  const y = (screenH - h) / 2;
  drawFieldPanel(panel, x, y, w, h, Theme.flag);
  drawModalTapeHeader(panel, x, y, w, Theme.flag);
  text.setWordWrapWidth(w - 40);
  text.setPosition(x + 20, y + 28);
  text.setText(body);
}
