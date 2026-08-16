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

/**
 * Hand-authored ~24×16 drill bay — west start, east hatch, visible hazard tax,
 * scrub FOV beat, flare-ready stalker. Not a campaign sector; `tutorialActive` only.
 */
export function generateTutorialMap(seed: number): GeneratedMap {
  const rng = mulberry32(seed >>> 0);
  const width = 24;
  const height = 16;
  const tiles: Tile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => wall()),
  );

  // West chamber (start)
  carveRect(tiles, 1, 4, 7, 11);
  // Mid corridor
  carveRect(tiles, 7, 6, 16, 9);
  // Small south alcove — quiet route around the stalker *and* the ion hazard.
  carveRect(tiles, 9, 9, 15, 11);
  // East chamber (hatch)
  carveRect(tiles, 16, 5, 22, 10);

  const start: Pos = { x: 2, y: 7 };
  const exit: Pos = { x: 21, y: 7 };
  tiles[exit.y]![exit.x] = exitTile();

  // Scrub mid-corridor — blocks sight; south floor stays clear.
  tiles[6]![11] = scrub();
  // Visible ion hazard on the straight lane — bus tax if you walk it; alcove bypasses.
  tiles[7]![12] = hazard();

  const items: GroundItem[] = [
    { id: 1, kind: 'salvage', x: 3, y: 8 },
    { id: 2, kind: 'flare', x: 10, y: 9 },
  ];

  // Stalker closes at the corridor mouth; its normal pounce windup is the drill beat.
  const stalkerPos: Pos = { x: 13, y: 8 };
  const def = ENEMIES.stalker;
  const enemies: Enemy[] = [
    {
      id: 3,
      kind: 'stalker',
      x: stalkerPos.x,
      y: stalkerPos.y,
      hp: def.hp,
      maxHp: def.hp,
      atk: def.atk,
      def: def.def,
      alive: true,
      statuses: {},
      alerted: false,
      firstContactBite: true,
      swellTurns: 0,
      homeX: stalkerPos.x,
      homeY: stalkerPos.y,
      skirmishRetreat: false,
      windup: 0,
      beamCooldown: 0,
      tier: 'normal',
    },
  ];

  if (!canReach(tiles, start, exit)) {
    // Safety: clear a straight floor lane if layout ever breaks
    carveRect(tiles, start.x, start.y, exit.x, exit.y);
    tiles[exit.y]![exit.x] = exitTile();
  }

  // A few corridor sconces so the bay teaches that walls carry work lights.
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
      { x: 16, y: 5, w: 7, h: 6, cx: 19, cy: 7, role: 'exit' },
    ],
    start,
    exit,
    enemies,
    items,
    npcs: [],
    beaconPos: null,
    shuttlePos: null,
    roomQuest: null,
    nextEntityId: 4,
    wallLights,
  };
}
