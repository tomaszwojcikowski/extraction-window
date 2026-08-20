import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';
import { drawModalTapeHeader } from './modalChrome';

/** Draw the field help modal into existing Phaser objects. */
export function drawHelpOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  tutorialActive = false,
): void {
  const w = 520;
  const h = Math.min(tutorialActive ? 360 : 540, screenH - 48);
  const x = (screenW - w) / 2;
  const y = (screenH - h) / 2;
  drawFieldPanel(panel, x, y, w, h, Theme.biolum);
  drawModalTapeHeader(panel, x, y, w, Theme.biolum);
  text.setWordWrapWidth(w - 48);
  text.setPosition(x + 24, y + 28);
  if (tutorialActive) {
    text.setText(
      `${lore('UI-HELP')}\n\n${lore('UI-HELP-TUT')}\nESC or ? — close`,
    );
  } else {
    text.setText(
      `${lore('UI-HELP')}\n\n` +
        `${lore('UI-KIT-PURPOSE')}\n\n` +
        `────────────────────────────────\n` +
        `${lore('UI-HELP-BODY')}\n` +
        `────────────────────────────────\n` +
        `ESC or ? — close`,
    );
  }
}
