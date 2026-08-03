import Phaser from 'phaser';
import type { SectorId } from '../data/encounters';
import type { EnemyKind } from '../data/enemies';
import { Theme, floorTextureKey } from './theme';

/** Base pixel art size — rendered larger on screen for readability. */
export const TILE = 24;
export const TILE_DRAW = 28;

export { FONT_DATA as FONT, FONT_DATA, FONT_DISPLAY, BIOME_FLOOR_TINT } from './theme';

export function enemyTextureKey(kind: EnemyKind): string {
  return `t_enemy_${kind}`;
}

type G = Phaser.GameObjects.Graphics;

function ink(g: G, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
}

/** Cartographic plotter tile grammar — hatches & stamps, not beveled cyber panels. */
export function registerTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const T = TILE;

  const bake = (key: string) => {
    g.generateTexture(key, T, T);
  };

  const clearGround = () => {
    g.clear();
    ink(g, Theme.groundDeep);
    g.fillRect(0, 0, T, T);
    ink(g, Theme.ground);
    g.fillRect(1, 1, T - 2, T - 2);
  };

  // --- Walls: contour / cliff ticks ---
  clearGround();
  ink(g, Theme.phosphorMute);
  g.fillRect(1, 1, T - 2, T - 2);
  ink(g, Theme.groundDeep);
  for (let i = 3; i < T - 3; i += 3) {
    g.fillRect(3, i, 4, 1);
    g.fillRect(T - 7, i + 1, 4, 1);
  }
  ink(g, Theme.phosphorDim);
  g.fillRect(2, 2, T - 4, 1);
  bake('t_wall');

  clearGround();
  ink(g, Theme.phosphorMute);
  g.fillRect(1, 1, T - 2, T - 2);
  ink(g, Theme.groundDeep);
  for (let i = 2; i < T - 2; i += 2) g.fillRect(i, 4, 1, T - 8);
  ink(g, Theme.phosphor);
  g.fillRect(4, T - 5, T - 8, 1);
  bake('t_wall_1');

  // --- Biome floor hatches (3 variants each) ---
  const biomeHatch: Record<SectorId, (variant: number) => void> = {
    plains: (v) => {
      ink(g, Theme.phosphorMute, 0.55);
      for (let i = 0; i < 8; i++) {
        const px = 3 + ((i * 5 + v * 3) % (T - 6));
        const py = 3 + ((i * 7 + v * 2) % (T - 6));
        g.fillRect(px, py, 1, 1);
      }
    },
    flood: (v) => {
      ink(g, Theme.phosphorMute, 0.7);
      for (let y = 4 + v; y < T - 3; y += 3) {
        g.fillRect(3, y, T - 6, 1);
        if (y % 2 === 0) g.fillRect(5, y + 1, T - 10, 1);
      }
    },
    canopy: (v) => {
      ink(g, Theme.phosphorDim, 0.5);
      for (let i = 0; i < 6; i++) {
        const x = 4 + ((i * 4 + v) % 14);
        const y = 4 + ((i * 5) % 14);
        g.fillRect(x, y, 2, 1);
        g.fillRect(x + 1, y + 1, 1, 2);
      }
    },
    ruin: (v) => {
      ink(g, Theme.phosphorMute, 0.65);
      for (let x = 3 + v; x < T - 3; x += 5) g.fillRect(x, 3, 1, T - 6);
      for (let y = 3 + (1 - v); y < T - 3; y += 5) g.fillRect(3, y, T - 6, 1);
      ink(g, Theme.groundDeep);
      g.fillRect(8 + v, 8, 5, 5);
    },
    beacon: (v) => {
      ink(g, Theme.phosphorMute, 0.5);
      const c = 12;
      const r = 3 + v;
      g.fillRect(c - r, c, r * 2 + 1, 1);
      g.fillRect(c, c - r, 1, r * 2 + 1);
      if (v > 0) {
        g.fillRect(c - 2, c - 2, 5, 1);
        g.fillRect(c - 2, c + 2, 5, 1);
      }
    },
    ash: (v) => {
      ink(g, Theme.phosphorMute, 0.8);
      for (let i = 0; i < 14; i++) {
        const px = 2 + ((i * 3 + v * 5) % (T - 4));
        const py = 2 + ((i * 11 + v * 7) % (T - 4));
        g.fillRect(px, py, 1, 1);
      }
    },
    vault: (v) => {
      ink(g, Theme.phosphorMute, 0.55);
      for (let y = 4; y < T - 4; y += 4) {
        for (let x = 4 + ((y + v) % 2) * 2; x < T - 4; x += 4) {
          g.fillRect(x, y, 2, 2);
        }
      }
    },
    ridge: (v) => {
      ink(g, Theme.phosphorMute, 0.65);
      for (let i = 0; i < T; i++) {
        const y = 3 + ((i + v * 2) % (T - 6));
        g.fillRect(i, y, 1, 1);
        if (i % 3 === 0) g.fillRect(i, y + 2, 1, 1);
      }
    },
  };

  for (const id of Object.keys(biomeHatch) as SectorId[]) {
    for (let v = 0; v < 3; v++) {
      clearGround();
      biomeHatch[id](v);
      bake(floorTextureKey(id, v));
    }
  }
  // Legacy aliases
  clearGround();
  biomeHatch.plains(0);
  bake('t_floor');
  bake('t_floor_0');
  clearGround();
  biomeHatch.plains(1);
  bake('t_floor_1');
  clearGround();
  biomeHatch.plains(2);
  bake('t_floor_2');

  // Scrub — sparse vegetation ticks
  clearGround();
  ink(g, Theme.phosphorDim);
  g.fillRect(5, 8, 1, 8);
  g.fillRect(11, 5, 1, 12);
  g.fillRect(17, 10, 1, 6);
  ink(g, Theme.phosphor);
  g.fillRect(5, 7, 1, 1);
  g.fillRect(11, 4, 1, 1);
  bake('t_scrub');

  // Rubble — broken blocks
  clearGround();
  ink(g, Theme.phosphorMute);
  g.fillRect(3, 12, 7, 5);
  g.fillRect(12, 7, 8, 6);
  ink(g, Theme.phosphorDim);
  g.fillRect(4, 13, 3, 2);
  g.fillRect(14, 8, 3, 2);
  bake('t_rubble');

  // Vent — grate stamp
  const ventStamp = (shift: number) => {
    clearGround();
    ink(g, Theme.panel);
    g.fillRect(1, 1, T - 2, T - 2);
    ink(g, Theme.phosphorDim);
    for (let y = 4 + shift; y < T - 3; y += 4) g.fillRect(4, y, T - 8, 2);
    ink(g, Theme.phosphor);
    g.fillRect(4, 4 + shift, T - 8, 1);
  };
  ventStamp(0);
  bake('t_vent');
  ventStamp(1);
  bake('t_vent_1');
  ventStamp(2);
  bake('t_vent_2');

  // Hazard — warning chevron (sickly green-white, not magenta)
  const hazardStamp = (weight: number) => {
    clearGround();
    ink(g, Theme.ionHazardDeep);
    g.fillRect(1, 1, T - 2, T - 2);
    ink(g, Theme.ionHazard);
    // Chevron
    g.fillRect(11, 4 + weight, 2, 10);
    g.fillRect(7, 8 + weight, 10, 2);
    g.fillRect(9, 6 + weight, 2, 2);
    g.fillRect(13, 6 + weight, 2, 2);
    ink(g, Theme.phosphorBright);
    g.fillRect(11, 5 + weight, 2, 2);
  };
  hazardStamp(0);
  bake('t_hazard');
  hazardStamp(1);
  bake('t_hazard_1');
  hazardStamp(2);
  bake('t_hazard_2');

  // Exit — survey flag / hatch door
  clearGround();
  ink(g, Theme.ok);
  g.fillRect(1, 1, T - 2, T - 2);
  ink(g, Theme.groundDeep);
  g.fillRect(5, 5, T - 10, T - 10);
  ink(g, Theme.phosphorBright);
  g.fillRect(10, 3, 2, 14);
  g.fillRect(12, 3, 6, 5);
  bake('t_exit');

  // Beacon — mast stamp
  const beaconStamp = (glow: number) => {
    clearGround();
    ink(g, Theme.panel);
    g.fillRect(1, 1, T - 2, T - 2);
    ink(g, Theme.phosphorDim);
    g.fillRect(11, 4, 2, 14);
    g.fillRect(7, 16, 10, 3);
    ink(g, Theme.phosphorBright);
    g.fillRect(10, 3 + glow, 4, 4);
  };
  beaconStamp(0);
  bake('t_beacon');
  beaconStamp(1);
  bake('t_beacon_1');
  beaconStamp(0);
  ink(g, Theme.phosphor);
  g.fillRect(9, 2, 6, 2);
  bake('t_beacon_2');

  // Shuttle — pad cross
  clearGround();
  ink(g, Theme.ok);
  g.fillRect(1, 1, T - 2, T - 2);
  ink(g, Theme.groundDeep);
  g.fillRect(4, 4, T - 8, T - 8);
  ink(g, Theme.phosphorBright);
  g.fillRect(5, 11, T - 10, 2);
  g.fillRect(11, 5, 2, T - 10);
  bake('t_shuttle');

  // POI — asterisk / stamp
  const poiStamp = (w: number) => {
    clearGround();
    ink(g, Theme.quest);
    g.fillRect(1, 1, T - 2, T - 2);
    ink(g, Theme.groundDeep);
    g.fillRect(4, 4, T - 8, T - 8);
    ink(g, Theme.phosphorBright);
    g.fillRect(11, 5 + w, 2, 12);
    g.fillRect(6, 11, 12, 2);
    g.fillRect(7, 7, 2, 2);
    g.fillRect(15, 7, 2, 2);
    g.fillRect(7, 15, 2, 2);
    g.fillRect(15, 15, 2, 2);
  };
  poiStamp(0);
  bake('t_poi');
  poiStamp(1);
  bake('t_poi_1');
  poiStamp(0);
  ink(g, Theme.phosphor);
  g.fillRect(10, 10, 4, 4);
  bake('t_poi_2');

  // Fog
  g.clear();
  ink(g, Theme.fog);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.ground, 0.4);
  g.fillRect(4, 6, 1, 1);
  g.fillRect(14, 12, 1, 1);
  g.fillRect(9, 18, 1, 1);
  bake('t_fog');

  g.clear();
  ink(g, 0x000000);
  g.fillRect(0, 0, T, T);
  bake('t_memory');

  // Player — surveyor helmet + pack
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.groundDeep);
  g.fillRect(6, 5, 12, 14);
  ink(g, Theme.phosphor);
  g.fillRect(7, 4, 10, 5);
  g.fillRect(6, 9, 12, 7);
  g.fillRect(8, 16, 8, 4);
  ink(g, Theme.phosphorBright);
  g.fillRect(9, 10, 6, 4);
  ink(g, Theme.phosphorDim);
  g.fillRect(16, 10, 3, 6); // pack
  bake('t_player');

  // Item crate
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.quest);
  g.fillRect(5, 6, 14, 12);
  ink(g, Theme.phosphorBright);
  g.fillRect(7, 9, 10, 4);
  bake('t_item');

  // Quest gem
  g.clear();
  g.fillStyle(0x000000, 0);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.quest);
  g.fillRect(8, 3, 8, 18);
  ink(g, Theme.phosphorBright);
  g.fillRect(10, 6, 4, 6);
  bake('t_quest');

  // Enemies — high-contrast ink silhouettes
  const paintEnemy = (kind: EnemyKind, paint: () => void) => {
    g.clear();
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, T, T);
    paint();
    bake(enemyTextureKey(kind));
  };

  paintEnemy('mite', () => {
    ink(g, Theme.phosphorDim);
    g.fillRect(7, 10, 10, 8);
    ink(g, Theme.phosphor);
    g.fillRect(8, 9, 8, 6);
    ink(g, Theme.groundDeep);
    g.fillRect(9, 11, 1, 1);
    g.fillRect(14, 11, 1, 1);
  });

  paintEnemy('spore', () => {
    ink(g, Theme.ionHazardDeep);
    g.fillCircle(12, 12, 8);
    ink(g, Theme.ionHazard);
    g.fillCircle(12, 12, 5);
    ink(g, Theme.groundDeep);
    g.fillRect(10, 10, 2, 2);
  });

  paintEnemy('wasp', () => {
    ink(g, Theme.storm);
    g.fillRect(6, 8, 12, 8);
    ink(g, Theme.phosphorBright);
    g.fillRect(4, 9, 3, 4);
    g.fillRect(17, 9, 3, 4);
    ink(g, Theme.groundDeep);
    g.fillRect(9, 10, 2, 2);
    g.fillRect(13, 10, 2, 2);
  });

  paintEnemy('stalker', () => {
    ink(g, Theme.phosphorDim);
    g.fillRect(10, 2, 4, 18);
    ink(g, Theme.phosphor);
    g.fillRect(9, 3, 3, 16);
    ink(g, Theme.danger);
    g.fillRect(10, 6, 2, 2);
  });

  paintEnemy('leech', () => {
    ink(g, 0x4a7080);
    g.fillRect(3, 10, 18, 6);
    ink(g, Theme.phosphor);
    g.fillRect(16, 11, 4, 4);
  });

  paintEnemy('crawler', () => {
    ink(g, Theme.quest);
    g.fillRect(4, 8, 16, 10);
    ink(g, Theme.phosphorBright);
    g.fillRect(6, 10, 3, 3);
    g.fillRect(14, 10, 3, 3);
  });

  paintEnemy('sentinel', () => {
    ink(g, Theme.phosphorMute);
    g.fillRect(5, 3, 14, 18);
    ink(g, Theme.phosphor);
    g.fillRect(7, 5, 10, 14);
    ink(g, Theme.danger);
    g.fillRect(9, 8, 6, 3);
  });

  paintEnemy('serpent', () => {
    ink(g, Theme.danger);
    g.fillRect(4, 6, 5, 12);
    g.fillRect(8, 4, 8, 5);
    g.fillRect(14, 8, 5, 10);
    ink(g, Theme.phosphorBright);
    g.fillRect(15, 9, 2, 2);
  });

  paintEnemy('wraith', () => {
    // Hollow outline — ion ghost
    ink(g, Theme.ionHazard);
    g.fillRect(8, 3, 8, 2);
    g.fillRect(7, 5, 2, 12);
    g.fillRect(15, 5, 2, 12);
    g.fillRect(8, 17, 8, 2);
    ink(g, Theme.phosphorBright);
    g.fillRect(10, 8, 2, 2);
    g.fillRect(13, 8, 2, 2);
  });

  paintEnemy('drone', () => {
    ink(g, Theme.phosphorMute);
    g.fillRect(5, 6, 14, 12);
    ink(g, Theme.phosphor);
    g.fillRect(7, 8, 10, 8);
    ink(g, Theme.danger);
    g.fillRect(10, 10, 4, 2);
    ink(g, Theme.phosphorBright);
    g.fillRect(6, 4, 3, 3);
    g.fillRect(15, 4, 3, 3);
  });

  g.destroy();
}
