import Phaser from 'phaser';
import type { SectorId } from '../data/encounters';

/** Shared menu chrome — vignette + faint scanlines. */
export function drawMenuChrome(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  accent = 0x5ec8ff,
): void {
  g.clear();
  g.fillStyle(0x0c121c, 1);
  g.fillRect(0, 0, width, height);

  // Soft vignette corners
  g.fillStyle(0x000000, 0.35);
  g.fillRect(0, 0, width, 28);
  g.fillRect(0, height - 28, width, 28);
  g.fillRect(0, 0, 28, height);
  g.fillRect(width - 28, 0, 28, height);

  g.fillStyle(0x101820, 1);
  g.fillRect(40, 48, width - 80, height - 96);
  g.lineStyle(1, 0x2a3a4a, 1);
  g.strokeRect(40.5, 48.5, width - 81, height - 97);
  g.lineStyle(1, accent, 0.35);
  g.strokeRect(48.5, 56.5, width - 97, height - 113);

  for (let y = 60; y < height - 60; y += 4) {
    g.fillStyle(accent, 0.015);
    g.fillRect(50, y, width - 100, 1);
  }
}

export type AtmoKind = 'dust' | 'motes' | 'scan' | 'none';

export function atmoKindForSector(id: SectorId): AtmoKind {
  switch (id) {
    case 'ash':
    case 'ruin':
      return 'dust';
    case 'canopy':
    case 'plains':
      return 'motes';
    case 'beacon':
    case 'vault':
      return 'scan';
    default:
      return 'none';
  }
}

/** Lightweight floating overlay particles — keep density low for FOV clarity. */
export function createBiomeAtmosphere(
  scene: Phaser.Scene,
  sectorId: SectorId,
  depth: number,
): Phaser.GameObjects.Particles.ParticleEmitter | null {
  const kind = atmoKindForSector(sectorId);
  if (kind === 'none') return null;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 2, 2);
  const key = `t_atmo_dot_${kind}`;
  if (!scene.textures.exists(key)) {
    g.generateTexture(key, 2, 2);
  }
  g.destroy();

  const { width, height } = scene.scale;
  const color =
    kind === 'dust' ? 0xc0a080 : kind === 'motes' ? 0x80e0a0 : 0x60d0ff;

  const emitter = scene.add.particles(0, 0, key, {
    x: { min: 0, max: width },
    y: { min: 60, max: height - 100 },
    lifespan: kind === 'scan' ? 1800 : 4200,
    speedY: kind === 'dust' ? { min: 8, max: 22 } : { min: -12, max: -4 },
    speedX: { min: -8, max: 8 },
    scale: { start: 1.2, end: 0.2 },
    alpha: { start: 0.35, end: 0 },
    quantity: 1,
    frequency: kind === 'scan' ? 220 : 380,
    tint: color,
    blendMode: kind === 'scan' ? 'ADD' : 'NORMAL',
  });
  emitter.setScrollFactor(0);
  emitter.setDepth(depth);
  return emitter;
}
