import Phaser from 'phaser';
import { Theme } from './theme';

/** Survey cover sheet chrome — ruled margins + registration marks, not cyber glow. */
export function drawMenuChrome(
  _scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  accent: number = Theme.phosphor,
): void {
  g.clear();
  g.fillStyle(Theme.groundDeep, 1);
  g.fillRect(0, 0, width, height);

  // Margin field
  g.fillStyle(Theme.ground, 1);
  g.fillRect(36, 40, width - 72, height - 80);

  // Hard outer rule
  g.lineStyle(1, Theme.panelEdge, 1);
  g.strokeRect(36.5, 40.5, width - 73, height - 81);

  // Inner rule
  g.lineStyle(1, accent, 0.55);
  g.strokeRect(48.5, 52.5, width - 97, height - 105);

  // Registration marks (corners)
  const mark = (x: number, y: number) => {
    g.lineStyle(1, accent, 0.9);
    g.lineBetween(x - 6, y, x + 6, y);
    g.lineBetween(x, y - 6, x, y + 6);
  };
  mark(48, 52);
  mark(width - 49, 52);
  mark(48, height - 53);
  mark(width - 49, height - 53);

  // Horizontal ruling (plotter paper)
  for (let y = 68; y < height - 68; y += 8) {
    g.lineStyle(1, Theme.phosphorMute, 0.12);
    g.lineBetween(56, y, width - 56, y);
  }
}

/**
 * Single horizontal scan-retrace — replaces particle dust clouds.
 * Returns the line so the caller can tween/destroy it.
 */
export function createScanRetrace(
  scene: Phaser.Scene,
  depth: number,
): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  const line = scene.add
    .rectangle(0, 80, width, 1, Theme.phosphorDim, 0.2)
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setDepth(depth);

  scene.tweens.add({
    targets: line,
    y: { from: 72, to: height - 120 },
    duration: 5200,
    ease: 'Linear',
    repeat: -1,
    yoyo: false,
    onYoyo: undefined,
    onRepeat: () => {
      line.setAlpha(0.22);
    },
  });
  scene.tweens.add({
    targets: line,
    alpha: { from: 0.22, to: 0.04 },
    duration: 2600,
    yoyo: true,
    repeat: -1,
  });

  return line;
}
