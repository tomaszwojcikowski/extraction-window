import type { EnemyKind } from '../data/enemies';
import type { ItemKind } from '../data/items';
import type { LoreId } from '../data/lore';
import type { SectorId } from '../data/encounters';
import type { Rng } from './rng';

export interface Pos {
  x: number;
  y: number;
}

export type TileKind =
  | 'wall'
  | 'floor'
  | 'hazard'
  | 'scrub'
  | 'rubble'
  | 'vent'
  | 'exit'
  | 'beacon'
  | 'shuttle';

export interface Tile {
  kind: TileKind;
  walkable: boolean;
  transparent: boolean;
}

export interface InventorySlot {
  kind: ItemKind;
  count: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  alive: boolean;
}

export interface GroundItem {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';
export type LoseReason = 'hp' | 'energy' | 'storm' | 'stuck' | null;

export interface LogEntry {
  loreId: LoreId;
  detail?: string;
  turn: number;
}

export interface ObjectiveFlags {
  hasRelayKey: boolean;
  usedRelayKey: boolean;
  hasNavCore: boolean;
  beaconOpen: boolean;
}

export interface GameState {
  seed: number;
  rng: Rng;
  status: GameStatus;
  loseReason: LoseReason;
  turn: number;
  stormTurns: number;
  sectorIndex: number;
  sectorId: SectorId;
  width: number;
  height: number;
  tiles: Tile[][];
  explored: boolean[][];
  visible: boolean[][];
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    atk: number;
    def: number;
    probeTurns: number;
    stimTurns: number;
    plateTurns: number;
    filterTurns: number;
  };
  inventory: InventorySlot[];
  enemies: Enemy[];
  items: GroundItem[];
  exitPos: Pos | null;
  shuttlePos: Pos | null;
  beaconPos: Pos | null;
  objectives: ObjectiveFlags;
  log: LogEntry[];
  ui: {
    inventoryOpen: boolean;
    selectedSlot: number;
  };
  nextEntityId: number;
  /** Lore event order for playtest assertions */
  loreEvents: LoreId[];
}

export type Action =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'wait' }
  | { type: 'get' }
  | { type: 'toggle_inventory' }
  | { type: 'select_slot'; index: number }
  | { type: 'use' }
  | { type: 'exit' }
  | { type: 'close_ui' };
