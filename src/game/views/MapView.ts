import Phaser from 'phaser';
import { Theme } from '../../scenes/theme';

/** Plotter FOV frame — hard L-corners over the map viewport. */
export function drawFovVignette(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  topInset: number,
  bottomInset: number,
): void {
  g.clear();
  const top = topInset;
  const bot = height - bottomInset;
  g.lineStyle(1, Theme.inkMute, 0.35);
  g.strokeRect(8.5, top + 8.5, width - 17, bot - top - 17);
  const arm = 18;
  g.lineStyle(1, Theme.inkDim, 0.55);
  // TL
  g.lineBetween(8, top + 8, 8 + arm, top + 8);
  g.lineBetween(8, top + 8, 8, top + 8 + arm);
  // TR
  g.lineBetween(width - 8, top + 8, width - 8 - arm, top + 8);
  g.lineBetween(width - 8, top + 8, width - 8, top + 8 + arm);
  // BL
  g.lineBetween(8, bot - 8, 8 + arm, bot - 8);
  g.lineBetween(8, bot - 8, 8, bot - 8 - arm);
  // BR
  g.lineBetween(width - 8, bot - 8, width - 8 - arm, bot - 8);
  g.lineBetween(width - 8, bot - 8, width - 8, bot - 8 - arm);
}
