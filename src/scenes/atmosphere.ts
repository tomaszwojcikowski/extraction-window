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

/** Top/bottom in-run HUD strips — elbow accents without eating the map. */
export function drawHudStripChrome(
  g: Phaser.GameObjects.Graphics,
  opts: { y: number; height: number; width: number; side: 'top' | 'bottom' },
): void {
  const { y, height, width, side } = opts;
  g.clear();
  g.fillStyle(Theme.groundDeep, 0.98);
  g.fillRect(0, y, width, height);

  if (side === 'top') {
    // Elbow bar along top edge
    g.fillStyle(Theme.phosphor, 1);
    g.fillRect(10, y + 4, width - 200, 6);
    g.fillRect(width - 178, y + 4, 36, 6);
    g.fillRect(width - 150, y + 4, 6, 16);
    // Bottom rule into map
    g.lineStyle(2, Theme.phosphor, 0.75);
    g.lineBetween(0, y + height - 1, width, y + height - 1);
    // Side rail fragment
    g.fillStyle(Theme.phosphorMute, 0.55);
    g.fillRect(4, y + 12, 5, height - 18);
  } else {
    // Top rule from map
    g.lineStyle(2, Theme.phosphor, 0.75);
    g.lineBetween(0, y + 1, width, y + 1);
    // Lavender elbow along bottom (matches Title menu)
    g.fillStyle(Theme.quest, 0.9);
    g.fillRect(10, y + height - 12, 8, 8);
    g.fillRect(10, y + height - 10, width - 160, 6);
    g.fillRect(width - 138, y + height - 10, 36, 6);
    g.fillStyle(Theme.phosphorMute, 0.55);
    g.fillRect(4, y + 6, 5, height - 18);
  }
}

/** Modal panel — kit / PADD / help. */
export function drawLcarsPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: number = Theme.phosphor,
): void {
  g.clear();
  g.fillStyle(Theme.panel, 0.98);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, accent, 0.9);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Top elbow stub
  g.fillStyle(accent, 1);
  g.fillRect(x + 8, y + 6, Math.min(w - 48, 180), 5);
  g.fillRect(x + w - 28, y + 6, 16, 5);
  g.fillRect(x + w - 18, y + 6, 5, 14);
  // Registration corners
  g.lineStyle(1, Theme.phosphorDim, 1);
  g.lineBetween(x + 4, y + 4, x + 14, y + 4);
  g.lineBetween(x + 4, y + 4, x + 4, y + 14);
  g.lineBetween(x + w - 4, y + 4, x + w - 14, y + 4);
  g.lineBetween(x + w - 4, y + 4, x + w - 4, y + 14);
  g.lineBetween(x + 4, y + h - 4, x + 14, y + h - 4);
  g.lineBetween(x + 4, y + h - 4, x + 4, y + h - 14);
}

/** Solid LCARS status plate for quest badges. */
export function drawLcarsBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
): void {
  g.fillStyle(fill, 1);
  g.fillRect(x, y, w, h);
  // Soft inner cut on left (classic LCARS pill block)
  g.fillStyle(Theme.groundDeep, 1);
  g.fillRect(x, y, 4, h);
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
