import Phaser from 'phaser';
import type { SectorId } from '../data/encounters';
import type { EnemyKind } from '../data/enemies';
import { ENEMIES } from '../data/enemies';

/** Base pixel art size — rendered larger on screen for readability. */
export const TILE = 24;
export const TILE_DRAW = 28;

const FONT = '"IBM Plex Mono", "Courier New", monospace';

/** Strong biome floor tints — high contrast between sectors. */
export const BIOME_FLOOR_TINT: Record<SectorId, number> = {
  plains: 0xd0e0a0,
  flood: 0x60b0d0,
  canopy: 0x50d080,
  ruin: 0xd0a880,
  beacon: 0x80a0e0,
  ash: 0xc09060,
  vault: 0x7090b0,
  ridge: 0xc0b090,
};

export function enemyTextureKey(kind: EnemyKind): string {
  return `t_enemy_${kind}`;
}

export function registerTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const T = TILE;

  const bake = (key: string) => {
    g.generateTexture(key, T, T);
  };

  // --- Wall: bright panel vs dark edge ---
  g.clear();
  g.fillStyle(0x05070c, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x4a5568, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0x6a7588, 1);
  g.fillRect(2, 2, T - 4, 3);
  g.fillStyle(0x2a3038, 1);
  g.fillRect(3, 8, 4, 4);
  g.fillRect(T - 7, 8, 4, 4);
  g.fillRect(3, T - 8, 4, 4);
  g.fillRect(T - 7, T - 8, 4, 4);
  g.fillStyle(0x8a95a8, 1);
  g.fillRect(4, 9, 2, 2);
  g.fillRect(T - 6, 9, 2, 2);
  bake('t_wall');

  // --- Floor: mid tone with grid ---
  g.clear();
  g.fillStyle(0x0a1018, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x2a3848, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0x3a4858, 1);
  g.fillRect(1, 1, T - 2, 1);
  g.fillRect(1, 1, 1, T - 2);
  g.fillStyle(0x1a2430, 1);
  g.fillRect(T - 2, 2, 1, T - 3);
  g.fillRect(2, T - 2, T - 3, 1);
  bake('t_floor');

  // Scrub — teal vegetation tufts
  g.clear();
  g.fillStyle(0x0a1810, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x1a3020, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0x40a060, 1);
  g.fillRect(4, 10, 3, 8);
  g.fillRect(10, 6, 3, 12);
  g.fillRect(16, 12, 3, 6);
  g.fillStyle(0x80e0a0, 1);
  g.fillRect(5, 8, 1, 3);
  g.fillRect(11, 4, 1, 3);
  bake('t_scrub');

  // Rubble — warm debris
  g.clear();
  g.fillStyle(0x14100c, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x3a3028, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0x8a7060, 1);
  g.fillRect(3, 12, 6, 5);
  g.fillRect(12, 8, 7, 6);
  g.fillStyle(0xc0a090, 1);
  g.fillRect(4, 13, 3, 2);
  g.fillRect(14, 9, 3, 2);
  bake('t_rubble');

  // Vent — cyan grate
  g.clear();
  g.fillStyle(0x081018, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x203040, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0x40a0c0, 1);
  g.fillRect(4, 4, T - 8, 3);
  g.fillRect(4, 10, T - 8, 3);
  g.fillRect(4, 16, T - 8, 3);
  g.fillStyle(0xa0e8ff, 1);
  g.fillRect(5, 5, T - 10, 1);
  bake('t_vent');

  // --- Hazard: hot magenta warning ---
  g.clear();
  g.fillStyle(0x1a0820, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x8020b0, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0xff40ff, 1);
  g.fillRect(4, 4, T - 8, T - 8);
  g.fillStyle(0xffc0ff, 1);
  g.fillRect(8, 8, T - 16, T - 16);
  g.fillStyle(0x401060, 1);
  g.fillRect(2, 2, 3, 3);
  g.fillRect(T - 5, T - 5, 3, 3);
  bake('t_hazard');

  // --- Exit: bright green hatch ---
  g.clear();
  g.fillStyle(0x041810, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x208050, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0x40ff90, 1);
  g.fillRect(4, 3, T - 8, 3);
  g.fillRect(4, T - 6, T - 8, 3);
  g.fillRect(3, 4, 3, T - 8);
  g.fillRect(T - 6, 4, 3, T - 8);
  g.fillStyle(0xc0ffe0, 1);
  g.fillRect(8, 8, T - 16, T - 16);
  bake('t_exit');

  // --- Beacon: cyan tower ---
  g.clear();
  g.fillStyle(0x081828, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x2060a0, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0x40c0ff, 1);
  g.fillRect(9, 3, 6, 14);
  g.fillStyle(0xe0f8ff, 1);
  g.fillRect(10, 5, 4, 4);
  g.fillStyle(0x80e0ff, 1);
  g.fillRect(6, 16, 12, 4);
  bake('t_beacon');

  // --- Shuttle: lime landing pad ---
  g.clear();
  g.fillStyle(0x102008, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x408020, 1);
  g.fillRect(1, 1, T - 2, T - 2);
  g.fillStyle(0x90ff40, 1);
  g.fillRect(3, 10, T - 6, 4);
  g.fillRect(10, 3, 4, T - 6);
  g.fillStyle(0xf0ffe0, 1);
  g.fillRect(8, 8, 8, 8);
  bake('t_shuttle');

  // --- Fog ---
  g.clear();
  g.fillStyle(0x04060a, 1);
  g.fillRect(0, 0, T, T);
  bake('t_fog');

  // --- Player: bright cyan astronaut ---
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x003050, 1);
  g.fillRect(5, 4, 14, 16);
  g.fillStyle(0x20d0ff, 1);
  g.fillRect(6, 3, 12, 5);
  g.fillRect(5, 8, 14, 8);
  g.fillRect(7, 16, 10, 5);
  g.fillStyle(0xe8ffff, 1);
  g.fillRect(8, 9, 8, 5);
  g.fillStyle(0xffffff, 1);
  g.fillRect(10, 10, 4, 2);
  bake('t_player');

  // --- Item crate: gold ---
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x604000, 1);
  g.fillRect(4, 5, 16, 14);
  g.fillStyle(0xffd040, 1);
  g.fillRect(5, 6, 14, 12);
  g.fillStyle(0xfff0a0, 1);
  g.fillRect(8, 9, 8, 4);
  g.fillStyle(0xffffff, 1);
  g.fillRect(10, 10, 4, 2);
  bake('t_item');

  // --- Quest gem: hot magenta ---
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0x800060, 1);
  g.fillRect(8, 2, 8, 20);
  g.fillStyle(0xff40d0, 1);
  g.fillRect(7, 4, 10, 16);
  g.fillStyle(0xffc0f0, 1);
  g.fillRect(9, 6, 6, 6);
  g.fillStyle(0xffffff, 1);
  g.fillRect(10, 7, 3, 2);
  bake('t_quest');

  // --- Per-enemy silhouettes (distinct shapes + colors) ---
  const paintEnemy = (kind: EnemyKind, paint: () => void) => {
    g.clear();
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, T, T);
    paint();
    bake(enemyTextureKey(kind));
  };

  const c = (kind: EnemyKind) => ENEMIES[kind].color;
  const darken = (col: number) => {
    const r = ((col >> 16) & 0xff) >> 1;
    const gch = ((col >> 8) & 0xff) >> 1;
    const b = (col & 0xff) >> 1;
    return (r << 16) | (gch << 8) | b;
  };

  paintEnemy('mite', () => {
    const col = c('mite');
    g.fillStyle(darken(col), 1);
    g.fillRect(6, 10, 12, 10);
    g.fillStyle(col, 1);
    g.fillRect(7, 8, 10, 10);
    g.fillStyle(0xffffff, 1);
    g.fillRect(9, 10, 2, 2);
    g.fillRect(13, 10, 2, 2);
  });

  paintEnemy('spore', () => {
    const col = c('spore');
    g.fillStyle(darken(col), 1);
    g.fillCircle(12, 12, 9);
    g.fillStyle(col, 1);
    g.fillCircle(12, 12, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 10, 2);
  });

  paintEnemy('wasp', () => {
    const col = c('wasp');
    g.fillStyle(darken(col), 1);
    g.fillRect(5, 8, 14, 10);
    g.fillStyle(col, 1);
    g.fillRect(6, 7, 12, 8);
    g.fillStyle(0xffff80, 1);
    g.fillRect(4, 9, 3, 5);
    g.fillRect(17, 9, 3, 5);
    g.fillStyle(0x201000, 1);
    g.fillRect(9, 9, 2, 2);
    g.fillRect(13, 9, 2, 2);
  });

  paintEnemy('stalker', () => {
    const col = c('stalker');
    g.fillStyle(darken(col), 1);
    g.fillRect(8, 3, 8, 18);
    g.fillStyle(col, 1);
    g.fillRect(9, 4, 6, 16);
    g.fillStyle(0xff6060, 1);
    g.fillRect(10, 7, 2, 2);
    g.fillRect(13, 7, 2, 2);
  });

  paintEnemy('leech', () => {
    const col = c('leech');
    g.fillStyle(darken(col), 1);
    g.fillRect(3, 10, 18, 8);
    g.fillStyle(col, 1);
    g.fillRect(4, 11, 16, 6);
    g.fillStyle(0xff8080, 1);
    g.fillRect(16, 12, 4, 4);
  });

  paintEnemy('crawler', () => {
    const col = c('crawler');
    g.fillStyle(darken(col), 1);
    g.fillRect(4, 8, 16, 12);
    g.fillStyle(col, 1);
    g.fillRect(5, 9, 14, 10);
    g.fillStyle(0xffe080, 1);
    g.fillRect(7, 11, 3, 3);
    g.fillRect(14, 11, 3, 3);
  });

  paintEnemy('sentinel', () => {
    const col = c('sentinel');
    g.fillStyle(darken(col), 1);
    g.fillRect(5, 4, 14, 16);
    g.fillStyle(col, 1);
    g.fillRect(6, 5, 12, 14);
    g.fillStyle(0xff4040, 1);
    g.fillRect(9, 8, 6, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(11, 9, 2, 2);
  });

  paintEnemy('serpent', () => {
    const col = c('serpent');
    g.fillStyle(darken(col), 1);
    g.fillRect(4, 6, 6, 14);
    g.fillRect(8, 4, 8, 6);
    g.fillRect(14, 8, 6, 12);
    g.fillStyle(col, 1);
    g.fillRect(5, 7, 4, 12);
    g.fillRect(9, 5, 6, 4);
    g.fillRect(15, 9, 4, 10);
    g.fillStyle(0xffffff, 1);
    g.fillRect(16, 10, 2, 2);
  });

  g.destroy();
}

export { FONT };
