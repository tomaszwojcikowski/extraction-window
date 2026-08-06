import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';

/** Draw the field help modal into existing Phaser objects. */
export function drawHelpOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
): void {
  const w = 520;
  const h = Math.min(520, screenH - 48);
  const x = (screenW - w) / 2;
  const y = (screenH - h) / 2;
  drawFieldPanel(panel, x, y, w, h, Theme.biolum);
  text.setWordWrapWidth(w - 48);
  text.setPosition(x + 24, y + 22);
  text.setText(
    `${lore('UI-HELP')}\n\n${lore('UI-KIT-PURPOSE')}\n\n${lore('UI-HELP-BODY')}\n\nESC or ? — close`,
  );
}
