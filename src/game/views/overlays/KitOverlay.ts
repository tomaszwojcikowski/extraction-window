import Phaser from 'phaser';
import type { GameState } from '../../../sim';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel, drawTapeStrip } from '../../../scenes/atmosphere';
import {
  buildKitOverlayContent,
  KIT_LINE_H,
} from '../../presenters/KitOverlayContent';

/** Draw the field kit / inventory modal into existing Phaser objects. */
export function drawKitOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  st: GameState,
): void {
  const { lines, panelW, panelH: contentH, actionLine, powerShort } = buildKitOverlayContent(st);
  const panelH = Math.min(contentH, screenH - 32);
  const px = (screenW - panelW) / 2;
  const py = (screenH - panelH) / 2;
  const accent = powerShort ? Theme.rust : Theme.tape;
  drawFieldPanel(panel, px, py, panelW, panelH, accent);

  // Header tape — bag case language, rust if the selected spend is short Power.
  drawTapeStrip(panel, px + 14, py + 8, Math.min(96, panelW - 28), 5, accent, 0.85);

  // Accent the primary action row so u is glanceable before the essay desc.
  if (actionLine !== null) {
    const rowY = py + 18 + actionLine * KIT_LINE_H;
    if (rowY + KIT_LINE_H < py + panelH - 10) {
      panel.fillStyle(accent, powerShort ? 0.22 : 0.16);
      panel.fillRect(px + 12, rowY - 1, panelW - 24, KIT_LINE_H);
      panel.fillStyle(accent, 0.9);
      panel.fillRect(px + 12, rowY - 1, 3, KIT_LINE_H);
    }
  }

  text.setWordWrapWidth(panelW - 36);
  text.setPosition(px + 18, py + 18);
  text.setText(lines.join('\n'));
}
