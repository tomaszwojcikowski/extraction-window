import { ENEMIES } from '../data/enemies';
import { canReach } from '../sim/fov';
import { mulberry32 } from '../sim/rng';
import type { Enemy, GroundItem, Pos, Tile } from '../sim/types';
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
 * Hand-authored ~24×16 drill bay — west start, east hatch, one pickup, one mite.
 * Not a campaign sector; used only while `tutorialActive`.
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
  // East chamber (hatch)
  carveRect(tiles, 16, 5, 22, 10);

  const start: Pos = { x: 2, y: 7 };
  const exit: Pos = { x: 21, y: 7 };
  tiles[exit.y]![exit.x] = exitTile();

  // One scrub mid-corridor for later FOV teaching (non-blocking path south)
  tiles[6]![11] = scrub();

  const itemKind = rng() < 0.5 ? 'salvage' : 'field_sample';
  const items: GroundItem[] = [
    { id: 1, kind: itemKind, x: 3, y: 8 },
  ];

  // Weak mite mid-map — not adjacent to start
  const mitePos: Pos = { x: 13, y: 8 };
  const def = ENEMIES.mite;
  const enemies: Enemy[] = [
    {
      id: 2,
      kind: 'mite',
      x: mitePos.x,
      y: mitePos.y,
      hp: def.hp,
      maxHp: def.hp,
      atk: def.atk,
      def: def.def,
      alive: true,
      statuses: {},
      alerted: false,
      swellTurns: 0,
      homeX: mitePos.x,
      homeY: mitePos.y,
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

  return {
    tiles,
    width,
    height,
    rooms: [
      { x: 1, y: 4, w: 7, h: 8, cx: 4, cy: 7 },
      { x: 16, y: 5, w: 7, h: 6, cx: 19, cy: 7 },
    ],
    start,
    exit,
    enemies,
    items,
    npcs: [],
    beaconPos: null,
    shuttlePos: null,
    poiPos: null,
    poiKind: null,
    roomQuest: null,
    nextEntityId: 3,
  };
}
