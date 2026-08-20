import Phaser from 'phaser';
import { Theme } from '../../../scenes/theme';
import { drawTapeStrip } from '../../../scenes/atmosphere';

/** Shared kit-case header for Help / PADD / bulletin — tape only, no new chrome. */
export function drawModalTapeHeader(
  panel: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  accent: number,
): void {
  drawTapeStrip(panel, x + 14, y + 8, Math.min(110, w - 28), 5, accent, 0.85);
  panel.fillStyle(Theme.panelEdge, 0.35);
  panel.fillRect(x + 12, y + 18, w - 24, 1);
}
