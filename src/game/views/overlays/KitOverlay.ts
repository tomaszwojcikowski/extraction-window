import Phaser from 'phaser';
import type { GameState } from '../../../sim';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';
import { buildKitOverlayContent } from '../../presenters/KitOverlayContent';

/** Draw the field kit / inventory modal into existing Phaser objects. */
export function drawKitOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  st: GameState,
): void {
  const { lines, panelW, panelH } = buildKitOverlayContent(st);
  const px = (screenW - panelW) / 2;
  const py = (screenH - panelH) / 2;
  drawFieldPanel(panel, px, py, panelW, panelH, Theme.tape);
  text.setWordWrapWidth(panelW - 36);
  text.setPosition(px + 18, py + 18);
  text.setText(lines.join('\n'));
}
