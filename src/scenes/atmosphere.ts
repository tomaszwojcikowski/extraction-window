import Phaser from 'phaser';
import { Theme } from './theme';

/**
 * Optional WebGL-only camera atmosphere. Gameplay lighting and FOV remain
 * ordinary scene objects, so Canvas/headless renderers retain full readability.
 */
export type CameraAtmosphere = {
  pulse(strength: number, duration: number): void;
  destroy(): void;
};

export function addCameraAtmosphere(
  scene: Phaser.Scene,
  strength = 0.07,
): CameraAtmosphere | null {
  const filters = scene.cameras.main.filters?.external;
  if (!filters || typeof filters.addVignette !== 'function') return null;

  const vignette = filters.addVignette(0.5, 0.5, 0.72, strength, Theme.groundDeep);
  return {
    pulse(pulseStrength: number, duration: number): void {
      scene.tweens.killTweensOf(vignette);
      scene.tweens.add({
        targets: vignette,
        strength: pulseStrength,
        duration: duration / 2,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    },
    destroy(): void {
      scene.tweens.killTweensOf(vignette);
      filters.remove(vignette);
    },
  };
}

/** LCARS-style menu chrome — black field, orange rules, elbow accents. */
export function drawMenuChrome(
  _scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  accent: number = Theme.phosphor,
): void {
  g.clear();
  g.fillGradientStyle(0x020207, 0x080817, 0x0e0912, 0x030309, 1);
  g.fillRect(0, 0, width, height);

  // Deep nested field and quiet sensor bands.
  g.fillGradientStyle(Theme.ground, 0x171424, 0x090914, Theme.panel, 1);
  g.fillRect(40, 44, width - 80, height - 88);
  g.fillStyle(Theme.phosphorMute, 0.08);
  for (let y = 78; y < height - 76; y += 18) {
    g.fillRect(58, y, width - 116, 1);
  }
  for (let i = 0; i < 18; i++) {
    const x = 70 + ((i * 97) % Math.max(1, width - 140));
    const y = 76 + ((i * 53) % Math.max(1, height - 152));
    g.fillStyle(i % 5 === 0 ? Theme.quest : Theme.phosphorBright, i % 5 === 0 ? 0.25 : 0.12);
    g.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
  }

  // Outer LCARS frame
  g.lineStyle(1, Theme.phosphorBright, 0.9);
  g.strokeRect(40.5, 44.5, width - 81, height - 89);
  g.lineStyle(1, accent, 0.35);
  g.strokeRect(44.5, 48.5, width - 89, height - 97);

  // Strong segmented top elbow.
  g.fillStyle(accent, 1);
  g.fillRect(48, 52, width - 178, 12);
  g.fillRect(width - 116, 52, 60, 12);
  g.fillRect(width - 68, 52, 12, 38);
  g.fillStyle(Theme.phosphorBright, 0.9);
  g.fillRect(54, 55, width - 202, 2);
  g.fillStyle(Theme.storm, 0.95);
  g.fillRect(width - 164, 52, 38, 12);

  // Mirrored lavender bottom elbow.
  g.fillStyle(Theme.quest, 0.9);
  g.fillRect(48, height - 72, 12, 22);
  g.fillRect(48, height - 62, width - 188, 12);
  g.fillRect(width - 128, height - 62, 72, 12);
  g.fillStyle(Theme.phosphorBright, 0.65);
  g.fillRect(62, height - 59, width - 224, 2);

  // Segmented side rail and registration notches.
  g.fillStyle(Theme.phosphorMute, 0.75);
  g.fillRect(48, 72, 10, height - 160);
  g.fillStyle(Theme.groundDeep, 1);
  for (let y = 94; y < height - 92; y += 42) g.fillRect(48, y, 10, 5);
  g.fillStyle(accent, 0.95);
  g.fillRect(34, 82, 6, 52);
  g.fillRect(34, height - 134, 6, 52);
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
    // Thin, high-contrast map bezel.
    g.lineStyle(1, Theme.phosphorBright, 0.95);
    g.lineBetween(0, y + height - 1, width, y + height - 1);
    g.lineStyle(1, Theme.phosphor, 0.35);
    g.lineBetween(0, y + height - 3, width, y + height - 3);
    // Side rail fragment
    g.fillStyle(Theme.phosphorMute, 0.55);
    g.fillRect(4, y + 12, 5, height - 18);
  } else {
    // Thin, high-contrast map bezel.
    g.lineStyle(1, Theme.phosphorBright, 0.95);
    g.lineBetween(0, y + 1, width, y + 1);
    g.lineStyle(1, Theme.quest, 0.35);
    g.lineBetween(0, y + 3, width, y + 3);
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
