import { ENEMIES } from '../data/enemies';
import { canReach } from '../sim/fov';
import { LIGHT_TEMP } from '../sim/light';
import { mulberry32 } from '../sim/rng';
import type { Enemy, FieldLightSource, GroundItem, Pos, Tile } from '../sim/types';
import type { GeneratedMap } from './generator';

function wall(): Tile {
  return { kind: 'wall', walkable: false, transparent: false };
}
function floor(): Tile {
  return { kind: 'floor', walkable: true, transparent: true };
}
function scrub(): Tile {
  return { kind: 'scrub', walkable: true, transparent: false };
}
function hazard(): Tile {
  return { kind: 'hazard', walkable: true, transparent: true };
}
function exitTile(): Tile {
  return { kind: 'exit', walkable: true, transparent: true };
}

function carveRect(tiles: Tile[][], x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (tiles[y]?.[x]) tiles[y]![x] = floor();
    }
  }
}

/** East phaser lane drill — room 2 of the drill bay. */
export const PHASER_BAY_BOUNDS = { x0: 16, y0: 5, x1: 24, y1: 10 } as const;
/** Suggested stand for 2N / 3E training mites. */
export const PHASER_STAND: Pos = { x: 20, y: 7 };

export function inPhaserBay(x: number, y: number): boolean {
  return (
    x >= PHASER_BAY_BOUNDS.x0 &&
    x <= PHASER_BAY_BOUNDS.x1 &&
    y >= PHASER_BAY_BOUNDS.y0 &&
    y <= PHASER_BAY_BOUNDS.y1
  );
}

/** Keep lane-drill mites on their marks until the phaser lesson completes. */
export function pinPhaserTrainingMites(state: {
  tutorialActive: boolean;
  scriptedFired: Record<string, boolean>;
  enemies: Array<{ kind: string; alive: boolean; homeX: number; homeY: number; x: number; y: number; windup: number; alerted: boolean }>;
}): void {
  if (!state.tutorialActive || state.scriptedFired.tut_phaser_fired) return;
  for (const e of state.enemies) {
    if (e.kind !== 'mite' || !e.alive) continue;
    if (!inPhaserBay(e.homeX, e.homeY)) continue;
    e.x = e.homeX;
    e.y = e.homeY;
    e.windup = 0;
    e.alerted = false;
  }
}

/**
 * Hand-authored ~32×16 drill bay — west start, mid stalker corridor, east phaser
 * training bay, hatch chamber. Not a campaign sector; `tutorialActive` only.
 */
export function generateTutorialMap(seed: number): GeneratedMap {
  const rng = mulberry32(seed >>> 0);
  const width = 32;
  const height = 16;
  const tiles: Tile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => wall()),
  );

  // Room 1 — west chamber (start)
  carveRect(tiles, 1, 4, 7, 11);
  // Mid corridor + stalker beat
  carveRect(tiles, 7, 6, 15, 9);
  carveRect(tiles, 9, 9, 15, 11);
  // Room 2 — phaser lane drill
  carveRect(tiles, 16, 5, 24, 10);
  // Room 3 — hatch chamber
  carveRect(tiles, 25, 5, 30, 10);

  const start: Pos = { x: 2, y: 7 };
  const exit: Pos = { x: 28, y: 7 };
  tiles[exit.y]![exit.x] = exitTile();

  tiles[6]![11] = scrub();
  tiles[7]![12] = hazard();

  const items: GroundItem[] = [
    { id: 1, kind: 'salvage', x: 3, y: 8 },
    { id: 2, kind: 'flare', x: 10, y: 9 },
    { id: 3, kind: 'phaser', x: 18, y: 7 },
  ];

  const stalkerPos: Pos = { x: 13, y: 8 };
  const stalkerDef = ENEMIES.stalker;
  const miteDef = ENEMIES.mite;

  const enemies: Enemy[] = [
    {
      id: 4,
      kind: 'stalker',
      x: stalkerPos.x,
      y: stalkerPos.y,
      hp: stalkerDef.hp,
      maxHp: stalkerDef.hp,
      atk: stalkerDef.atk,
      def: stalkerDef.def,
      alive: true,
      statuses: {},
      alerted: false,
      swellTurns: 0,
      homeX: stalkerPos.x,
      homeY: stalkerPos.y,
      skirmishRetreat: false,
      windup: 0,
      beamCooldown: 0,
      tier: 'normal',
    },
    // 2-tile north lane from PHASER_STAND
    {
      id: 5,
      kind: 'mite',
      x: 20,
      y: 5,
      hp: miteDef.hp,
      maxHp: miteDef.hp,
      atk: miteDef.atk,
      def: miteDef.def,
      alive: true,
      statuses: {},
      alerted: false,
      swellTurns: 0,
      homeX: 20,
      homeY: 5,
      skirmishRetreat: false,
      windup: 0,
      beamCooldown: 0,
      tier: 'normal',
    },
    // 3-tile east lane from PHASER_STAND
    {
      id: 6,
      kind: 'mite',
      x: 23,
      y: 7,
      hp: miteDef.hp,
      maxHp: miteDef.hp,
      atk: miteDef.atk,
      def: miteDef.def,
      alive: true,
      statuses: {},
      alerted: false,
      swellTurns: 0,
      homeX: 23,
      homeY: 7,
      skirmishRetreat: false,
      windup: 0,
      beamCooldown: 0,
      tier: 'normal',
    },
    // Adjacent south — melee band, not on cardinal phaser lanes from stand
    {
      id: 7,
      kind: 'mite',
      x: 20,
      y: 8,
      hp: miteDef.hp,
      maxHp: miteDef.hp,
      atk: miteDef.atk,
      def: miteDef.def,
      alive: true,
      statuses: {},
      alerted: false,
      swellTurns: 0,
      homeX: 20,
      homeY: 8,
      skirmishRetreat: false,
      windup: 0,
      beamCooldown: 0,
      tier: 'normal',
    },
  ];

  if (!canReach(tiles, start, exit)) {
    carveRect(tiles, start.x, start.y, exit.x, exit.y);
    tiles[exit.y]![exit.x] = exitTile();
  }

  const candidates: FieldLightSource[] = [
    {
      x: 8,
      y: 6,
      mountX: 8,
      mountY: 5,
      radius: 2.5,
      intensity: 0.55,
      color: LIGHT_TEMP.sconce,
      fixture: 'sconce',
    },
    {
      x: 12,
      y: 6,
      mountX: 12,
      mountY: 5,
      radius: 2.5,
      intensity: 0.55,
      color: LIGHT_TEMP.sconce,
      fixture: 'sconce',
    },
    {
      x: 15,
      y: 9,
      mountX: 15,
      mountY: 10,
      radius: 2.5,
      intensity: 0.55,
      color: LIGHT_TEMP.sconce,
      fixture: 'sconce',
    },
    {
      x: 20,
      y: 6,
      mountX: 20,
      mountY: 5,
      radius: 2.5,
      intensity: 0.6,
      color: LIGHT_TEMP.sconce,
      fixture: 'sconce',
    },
    {
      x: 27,
      y: 7,
      mountX: 27,
      mountY: 6,
      radius: 2.5,
      intensity: 0.55,
      color: LIGHT_TEMP.sconce,
      fixture: 'sconce',
    },
  ];
  const wallLights = candidates.filter(
    (s) =>
      tiles[s.mountY!]?.[s.mountX!]?.kind === 'wall' &&
      tiles[s.y]?.[s.x]?.walkable,
  );

  return {
    tiles,
    width,
    height,
    rooms: [
      { x: 1, y: 4, w: 7, h: 8, cx: 4, cy: 7, role: 'entry' },
      { x: 16, y: 5, w: 9, h: 6, cx: 20, cy: 7, role: 'quiet' },
      { x: 25, y: 5, w: 6, h: 6, cx: 28, cy: 7, role: 'exit' },
    ],
    start,
    exit,
    enemies,
    items,
    npcs: [],
    beaconPos: null,
    shuttlePos: null,
    roomQuest: null,
    nextEntityId: 8,
    wallLights,
  };
}
