import Phaser from 'phaser';
import type { SectorId } from '../data/encounters';

export const TILE = 16;

const FONT = '"IBM Plex Mono", "Courier New", monospace';

/** Biome floor tint multipliers (Phaser tint). */
export const BIOME_FLOOR_TINT: Record<SectorId, number> = {
  plains: 0xb8c4a8,
  flood: 0x7a9aaa,
  canopy: 0x6aaa7a,
  ruin: 0xa89888,
  beacon: 0x8898b8,
  ash: 0x988878,
  vault: 0x7a8a9a,
  ridge: 0xa8a090,
};

export function registerTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const solid = (key: string, fill: number, edge = 0x0c0e14) => {
    g.clear();
    g.fillStyle(edge, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(fill, 1);
    g.fillRect(1, 1, TILE - 2, TILE - 2);
    g.generateTexture(key, TILE, TILE);
  };

  // Wall with rivet dots
  g.clear();
  g.fillStyle(0x0c0e14, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x2e3440, 1);
  g.fillRect(1, 1, TILE - 2, TILE - 2);
  g.fillStyle(0x3a4250, 1);
  g.fillRect(3, 3, 2, 2);
  g.fillRect(11, 3, 2, 2);
  g.fillRect(3, 11, 2, 2);
  g.fillRect(11, 11, 2, 2);
  g.generateTexture('t_wall', TILE, TILE);

  // Floor with subtle grain
  g.clear();
  g.fillStyle(0x0c0e14, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x1c2434, 1);
  g.fillRect(1, 1, TILE - 2, TILE - 2);
  g.fillStyle(0x222a3a, 1);
  g.fillRect(4, 4, 1, 1);
  g.fillRect(10, 9, 1, 1);
  g.generateTexture('t_floor', TILE, TILE);

  // Hazard — purple mottling
  g.clear();
  g.fillStyle(0x0c0e14, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x3a2850, 1);
  g.fillRect(1, 1, TILE - 2, TILE - 2);
  g.fillStyle(0x6a40a0, 1);
  g.fillRect(3, 5, 3, 3);
  g.fillRect(9, 8, 3, 3);
  g.fillStyle(0xa070d0, 0.9);
  g.fillRect(7, 3, 2, 2);
  g.generateTexture('t_hazard', TILE, TILE);

  // Exit hatch
  g.clear();
  g.fillStyle(0x0c0e14, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x1a3a2a, 1);
  g.fillRect(1, 1, TILE - 2, TILE - 2);
  g.fillStyle(0x40c878, 1);
  g.fillRect(4, 2, 8, 2);
  g.fillRect(4, 12, 8, 2);
  g.fillRect(2, 4, 2, 8);
  g.fillRect(12, 4, 2, 8);
  g.fillStyle(0x80ffb0, 1);
  g.fillRect(6, 6, 4, 4);
  g.generateTexture('t_exit', TILE, TILE);

  // Beacon node
  g.clear();
  g.fillStyle(0x0c0e14, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x243850, 1);
  g.fillRect(1, 1, TILE - 2, TILE - 2);
  g.fillStyle(0x5090d0, 1);
  g.fillRect(6, 3, 4, 10);
  g.fillStyle(0x90d0ff, 1);
  g.fillRect(7, 5, 2, 2);
  g.fillRect(5, 11, 6, 2);
  g.generateTexture('t_beacon', TILE, TILE);

  // Shuttle pad
  g.clear();
  g.fillStyle(0x0c0e14, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x2a4020, 1);
  g.fillRect(1, 1, TILE - 2, TILE - 2);
  g.fillStyle(0x70c040, 1);
  g.fillRect(2, 7, 12, 2);
  g.fillRect(7, 2, 2, 12);
  g.fillStyle(0xc0ff80, 1);
  g.fillRect(6, 6, 4, 4);
  g.generateTexture('t_shuttle', TILE, TILE);

  solid('t_fog', 0x080a0e, 0x080a0e);

  // Player — cyan diamond suit
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x1a3040, 1);
  g.fillRect(3, 3, 10, 10);
  g.fillStyle(0x5ec8ff, 1);
  g.fillRect(5, 2, 6, 3);
  g.fillRect(4, 5, 8, 6);
  g.fillRect(5, 11, 6, 3);
  g.fillStyle(0xd0f0ff, 1);
  g.fillRect(6, 6, 4, 3);
  g.generateTexture('t_player', TILE, TILE);

  // Enemy blob
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x601818, 1);
  g.fillRect(3, 4, 10, 9);
  g.fillStyle(0xe05050, 1);
  g.fillRect(4, 5, 8, 7);
  g.fillStyle(0xffa0a0, 1);
  g.fillRect(5, 6, 2, 2);
  g.fillRect(9, 6, 2, 2);
  g.generateTexture('t_enemy', TILE, TILE);

  // Item crate
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x605010, 1);
  g.fillRect(3, 4, 10, 9);
  g.fillStyle(0xe0c040, 1);
  g.fillRect(4, 5, 8, 7);
  g.fillStyle(0xfff0a0, 1);
  g.fillRect(6, 7, 4, 2);
  g.generateTexture('t_item', TILE, TILE);

  // Quest gem
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x602060, 1);
  g.fillRect(5, 2, 6, 12);
  g.fillStyle(0xff60d0, 1);
  g.fillRect(6, 3, 4, 10);
  g.fillStyle(0xffd0ff, 1);
  g.fillRect(7, 5, 2, 3);
  g.generateTexture('t_quest', TILE, TILE);

  // UI panel pixel
  solid('ui_panel', 0x121820, 0x3a4a5a);
  solid('ui_panel_hi', 0x1a2838, 0x5ec8ff);

  g.destroy();
}

export { FONT };
