import Phaser from 'phaser';
import type { SectorId } from '../data/encounters';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import { Theme, floorTextureKey } from './theme';
import {
  drawDeluxeContact,
  drawDeluxeEnemy,
  drawDeluxeFloor,
  drawDeluxeItem,
  drawDeluxePlayer,
  drawDeluxeProp,
  drawDeluxeSconce,
  drawDeluxeWall,
} from './tex/deluxe';

/** Base pixel art size — rendered larger on screen for readability. */
export const TILE = 48;
export const TILE_DRAW = 46;

export { FONT_DATA, FONT_DISPLAY, BIOME_FLOOR_TINT } from './theme';

export function enemyTextureKey(kind: EnemyKind, frame = 0): string {
  return frame === 0 ? `t_enemy_${kind}` : `t_enemy_${kind}_${frame % 3}`;
}

export function playerTextureKey(frame = 0): string {
  return frame === 0 ? 't_player' : `t_player_${frame % 3}`;
}

export function npcTextureKey(kind: string): string {
  return `t_npc_${kind}`;
}

export function allyTextureKey(kind: string): string {
  return `t_ally_${kind}`;
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

export function wallTextureKey(sectorId: SectorId, variant: number): string {
  return `t_wall_${sectorId}_${variant % 4}`;
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
  ink(g, Theme.ground, 0.35);
  g.fillRect(6, 8, 1, 1);
  g.fillRect(18, 14, 1, 1);
  g.fillRect(12, 22, 1, 1);
  g.fillRect(24, 6, 1, 1);
}

function drawMemory(g: G, T: number): void {
  g.clear();
  ink(g, 0x000000);
  g.fillRect(0, 0, T, T);
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
      drawDeluxeWall(g, T, style, v, id);
      bake(g, wallTextureKey(id, v), T);
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

  // Field contacts
  drawDeluxeContact(g, T, 'npc', 'archive_holo');
  bake(g, npcTextureKey('archive_holo'), T);
  drawDeluxeContact(g, T, 'npc', 'stranded_ensign');
  bake(g, npcTextureKey('stranded_ensign'), T);
  drawDeluxeContact(g, T, 'npc', 'field_tech');
  bake(g, npcTextureKey('field_tech'), T);
  drawDeluxeContact(g, T, 'npc', 'survey_contact');
  bake(g, npcTextureKey('survey_contact'), T);
  drawDeluxeContact(g, T, 'ally', 'probe_drone');
  bake(g, allyTextureKey('probe_drone'), T);
  drawDeluxeContact(g, T, 'ally', 'away_escort');
  bake(g, allyTextureKey('away_escort'), T);

  g.destroy();
}
