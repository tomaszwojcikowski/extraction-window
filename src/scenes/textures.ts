import Phaser from 'phaser';
import type { SectorId } from '../data/encounters';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import { Theme, crackTextureKey, floorTextureKey } from './theme';
import {
  drawDeluxeContact,
  drawDeluxeEnemy,
  drawDeluxeFloor,
  drawDeluxeItem,
  drawDeluxePlayer,
  drawDeluxeProp,
  drawDeluxeSconce,
  drawDeluxeWall,
  drawPressureCrack,
  WALL_WEAR_COUNT,
} from './tex/deluxe';

export { floorScatter, wallWearAt, WALL_WEAR_COUNT } from './tex/deluxe';

/** Base pixel art size — drawn 1:1 so floor seams don't scale up as a grout grid. */
export const TILE = 48;
export const TILE_DRAW = TILE;

export { FONT_DATA, FONT_DISPLAY, BIOME_FLOOR_TINT } from './theme';

export function enemyTextureKey(kind: EnemyKind, frame = 0): string {
  return frame === 0 ? `t_enemy_${kind}` : `t_enemy_${kind}_${frame % 3}`;
}

export function playerTextureKey(frame = 0): string {
  return frame === 0 ? 't_player' : `t_player_${frame % 3}`;
}

export function npcTextureKey(kind: string, frame = 0): string {
  const f = frame % 3;
  return f === 0 ? `t_npc_${kind}` : `t_npc_${kind}_${f}`;
}

export function allyTextureKey(kind: string, frame = 0): string {
  const f = frame % 3;
  return f === 0 ? `t_ally_${kind}` : `t_ally_${kind}_${f}`;
}

/** Wall contour family per biome — cliff / bulkhead / conduit. */
export type WallStyle = 'cliff' | 'bulkhead' | 'conduit';

export function wallStyleForSector(sectorId: SectorId): WallStyle {
  switch (sectorId) {
    case 'duct':
    case 'reef':
    case 'brine':
      return 'conduit';
    case 'vault':
    case 'beacon':
    case 'ruin':
    case 'spire':
    case 'trench':
      return 'bulkhead';
    default:
      return 'cliff';
  }
}

export function wallTextureKey(sectorId: SectorId, role: number, wear = 0): string {
  const r = ((role % 4) + 4) % 4;
  const w = ((wear % WALL_WEAR_COUNT) + WALL_WEAR_COUNT) % WALL_WEAR_COUNT;
  return `t_wall_${sectorId}_${r}_${w}`;
}

export function sconceTextureKey(sectorId: SectorId): string {
  return `t_sconce_${wallStyleForSector(sectorId)}`;
}

type G = Phaser.GameObjects.Graphics;

function ink(g: G, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
}

function clearGround(g: G, T: number): void {
  g.clear();
  ink(g, Theme.groundDeep);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.ground);
  g.fillRect(1, 1, T - 2, T - 2);
}

function bake(g: G, key: string, T: number): void {
  g.generateTexture(key, T, T);
}

function drawFog(g: G, T: number): void {
  g.clear();
  ink(g, Theme.fog);
  g.fillRect(0, 0, T, T);
  // Keep fog readable: a tiny edge vignette plus deterministic “specks”.
  // This makes unexplored shroud feel atmospheric rather than a flat tile wash.
  ink(g, Theme.groundDeep, 0.18);
  g.fillRect(0, 0, T, 2);
  g.fillRect(0, T - 2, T, 2);
  g.fillRect(0, 0, 2, T);
  g.fillRect(T - 2, 0, 2, T);

  ink(g, Theme.ground, 0.35);
  for (let i = 0; i < 22; i++) {
    const x = 2 + ((i * 11 + 7) % (T - 4));
    const y = 2 + ((i * 7 + 13) % (T - 4));
    const bright = 0.25 + (i % 5) * 0.05;
    ink(g, Theme.ground, bright);
    g.fillRect(x, y, 1, 1);
    if (i % 6 === 0) {
      g.fillRect(Math.min(T - 2, x + 1), y, 1, 1);
    }
  }
}

function drawMemory(g: G, T: number): void {
  // Fallback chalk wash — runtime memory prefers real tile + desat tint.
  g.clear();
  ink(g, Theme.memory);
  g.fillRect(0, 0, T, T);
  ink(g, Theme.memoryWash, 0.35);
  for (let i = 0; i < 12; i++) {
    g.fillRect(4 + ((i * 11) % 36), 5 + ((i * 7) % 34), i % 3 === 0 ? 2 : 1, 1);
  }
}

export function registerTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const T = TILE;

  const styles: WallStyle[] = ['cliff', 'bulkhead', 'conduit'];
  const styleSample: Record<WallStyle, SectorId> = {
    cliff: 'plains',
    bulkhead: 'vault',
    conduit: 'duct',
  };
  for (const id of [
    'plains',
    'flood',
    'canopy',
    'reef',
    'spire',
    'ruin',
    'beacon',
    'trench',
    'duct',
    'ash',
    'brine',
    'vault',
    'fissure',
    'approach',
    'ridge',
  ] as SectorId[]) {
    const style = wallStyleForSector(id);
    for (let v = 0; v < 4; v++) {
      for (let w = 0; w < WALL_WEAR_COUNT; w++) {
        drawDeluxeWall(g, T, style, v, id, w);
        bake(g, wallTextureKey(id, v, w), T);
      }
    }
  }
  // Style-family aliases for the contact sheet / legacy keys.
  for (const style of styles) {
    for (let v = 0; v < 4; v++) {
      drawDeluxeWall(g, T, style, v, styleSample[style]);
      bake(g, `t_wall_${style}_${v}`, T);
    }
  }
  drawDeluxeWall(g, T, 'cliff', 0, 'plains');
  bake(g, 't_wall', T);
  drawDeluxeWall(g, T, 'cliff', 1, 'plains');
  bake(g, 't_wall_1', T);

  for (const style of styles) {
    drawDeluxeSconce(g, T, style);
    bake(g, `t_sconce_${style}`, T);
  }

  const sectors: SectorId[] = [
    'plains',
    'flood',
    'canopy',
    'reef',
    'spire',
    'ruin',
    'beacon',
    'trench',
    'duct',
    'ash',
    'brine',
    'vault',
    'fissure',
    'approach',
    'ridge',
  ];
  for (const id of sectors) {
    for (let v = 0; v < 3; v++) {
      drawDeluxeFloor(g, T, id, v);
      bake(g, floorTextureKey(id, v), T);
      drawPressureCrack(g, T, id, v, false);
      bake(g, crackTextureKey(id, v, false), T);
      drawPressureCrack(g, T, id, v, true);
      bake(g, crackTextureKey(id, v, true), T);
    }
  }
  // Legacy floor aliases
  drawDeluxeFloor(g, T, 'plains', 0);
  bake(g, 't_floor', T);
  bake(g, 't_floor_0', T);
  drawDeluxeFloor(g, T, 'plains', 1);
  bake(g, 't_floor_1', T);
  drawDeluxeFloor(g, T, 'plains', 2);
  bake(g, 't_floor_2', T);

  drawDeluxeProp(g, T, 'scrub');
  bake(g, 't_scrub', T);
  drawDeluxeProp(g, T, 'scrub_nest');
  bake(g, 't_scrub_nest', T);
  drawDeluxeProp(g, T, 'rubble');
  bake(g, 't_rubble', T);
  drawDeluxeProp(g, T, 'sealed');
  bake(g, 't_sealed', T);
  drawDeluxeProp(g, T, 'tripwire');
  bake(g, 't_tripwire', T);

  for (let f = 0; f < 4; f++) {
    drawDeluxeProp(g, T, 'vent', f);
    bake(g, f === 0 ? 't_vent' : `t_vent_${f}`, T);
    drawDeluxeProp(g, T, 'hazard', f);
    bake(g, f === 0 ? 't_hazard' : `t_hazard_${f}`, T);
    drawDeluxeProp(g, T, 'brine_pool', f);
    bake(g, f === 0 ? 't_brine_pool' : `t_brine_pool_${f}`, T);
    drawDeluxeProp(g, T, 'beacon', f);
    bake(g, f === 0 ? 't_beacon' : `t_beacon_${f}`, T);
    drawDeluxeProp(g, T, 'landmark', f);
    bake(g, f === 0 ? 't_landmark' : `t_landmark_${f}`, T);
    drawDeluxeProp(g, T, 'quest', f);
    bake(g, f === 0 ? 't_quest_tile' : `t_quest_tile_${f}`, T);
  }

  drawDeluxeProp(g, T, 'exit');
  bake(g, 't_exit', T);
  drawDeluxeProp(g, T, 'shuttle');
  bake(g, 't_shuttle', T);

  drawFog(g, T);
  bake(g, 't_fog', T);
  drawMemory(g, T);
  bake(g, 't_memory', T);

  for (let f = 0; f < 3; f++) {
    drawDeluxePlayer(g, T, f);
    bake(g, playerTextureKey(f), T);
  }

  drawDeluxeItem(g, T, 'crate');
  bake(g, 't_item', T);
  for (const stamp of ['med', 'energy', 'flare', 'tool', 'wear'] as const) {
    drawDeluxeItem(g, T, stamp);
    bake(g, `t_item_${stamp}`, T);
  }
  drawDeluxeItem(g, T, 'key');
  bake(g, 't_quest', T);
  bake(g, 't_key', T);
  drawDeluxeItem(g, T, 'core');
  bake(g, 't_nav_core', T);

  for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
    for (let f = 0; f < 3; f++) {
      drawDeluxeEnemy(g, T, kind, f);
      bake(g, enemyTextureKey(kind, f), T);
    }
  }

  // Field contacts — three frames each (idle / stride / assist).
  for (const kind of ['archive_holo', 'stranded_ensign', 'field_tech', 'survey_contact'] as const) {
    for (let f = 0; f < 3; f++) {
      drawDeluxeContact(g, T, 'npc', kind, f);
      bake(g, npcTextureKey(kind, f), T);
    }
  }
  for (const kind of ['probe_drone', 'away_escort'] as const) {
    for (let f = 0; f < 3; f++) {
      drawDeluxeContact(g, T, 'ally', kind, f);
      bake(g, allyTextureKey(kind, f), T);
    }
  }

  g.destroy();
}
