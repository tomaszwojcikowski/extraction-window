import Phaser from 'phaser';
import { Theme } from './theme';

/** LCARS-style menu chrome — black field, orange rules, elbow accents. */
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

  // Main panel
  g.fillStyle(Theme.ground, 1);
  g.fillRect(40, 44, width - 80, height - 88);

  // Outer LCARS frame
  g.lineStyle(2, accent, 0.85);
  g.strokeRect(40.5, 44.5, width - 81, height - 89);

  // Top elbow bar
  g.fillStyle(accent, 1);
  g.fillRect(48, 52, width - 140, 10);
  g.fillRect(width - 100, 52, 44, 10);
  g.fillRect(width - 64, 52, 10, 28);

  // Bottom elbow bar
  g.fillStyle(Theme.quest, 0.9);
  g.fillRect(48, height - 62, 10, 10);
  g.fillRect(48, height - 62, width - 140, 8);
  g.fillRect(width - 100, height - 62, 44, 8);

  // Side rail
  g.fillStyle(Theme.phosphorMute, 0.55);
  g.fillRect(48, 70, 8, height - 140);
}

/**
 * Single horizontal scan-retrace — LCARS sensor sweep.
 * Returns the line so the caller can tween/destroy it.
 */
export function createScanRetrace(
  scene: Phaser.Scene,
  depth: number,
): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  const line = scene.add
    .rectangle(0, 80, width, 1, Theme.phosphorDim, 0.22)
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setDepth(depth);

  scene.tweens.add({
    targets: line,
    y: { from: 72, to: height - 120 },
    duration: 5200,
    ease: 'Linear',
    repeat: -1,
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
