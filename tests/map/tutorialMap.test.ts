import { describe, expect, it } from 'vitest';
import {
  generateTutorialMap,
  inPhaserBay,
  PHASER_STAND,
} from '../../src/map/tutorialMap';
import { canReach } from '../../src/sim/fov';

describe('generateTutorialMap', () => {
  it('is a fixed 32×16 drill bay with hatch east of the phaser room', () => {
    const map = generateTutorialMap(42);
    expect(map.width).toBe(32);
    expect(map.height).toBe(16);
    expect(map.start).toEqual({ x: 2, y: 7 });
    expect(map.exit).toEqual({ x: 28, y: 7 });
    expect(map.tiles[map.exit.y]![map.exit.x]!.kind).toBe('exit');
    expect(map.tiles[map.start.y]![map.start.x]!.walkable).toBe(true);
    expect(canReach(map.tiles, map.start, map.exit)).toBe(true);
  });

  it('always places flare, salvage, and a survey phaser pickup', () => {
    for (const seed of [1, 7, 42, 99, 12345]) {
      const map = generateTutorialMap(seed);
      expect(map.items.some((i) => i.kind === 'flare')).toBe(true);
      expect(map.items.some((i) => i.kind === 'salvage')).toBe(true);
      expect(map.items.some((i) => i.kind === 'phaser')).toBe(true);
      expect(map.items).toHaveLength(3);
    }
  });

  it('places one stalker in the corridor and training mites in the phaser bay', () => {
    const map = generateTutorialMap(256);
    expect(map.enemies.filter((e) => e.kind === 'stalker')).toHaveLength(1);
    expect(map.enemies.filter((e) => e.kind === 'mite')).toHaveLength(3);
    expect(map.enemies[0]!.kind).toBe('stalker');
    for (const mite of map.enemies.filter((e) => e.kind === 'mite')) {
      expect(inPhaserBay(mite.x, mite.y)).toBe(true);
    }
    expect(map.npcs).toHaveLength(0);
    expect(map.roomQuest).toBeNull();
    expect(map.beaconPos).toBeNull();
    expect(map.shuttlePos).toBeNull();
  });

  it('keeps a scrub and south alcove around the corridor', () => {
    const map = generateTutorialMap(3);
    expect(map.tiles[6]![11]!.kind).toBe('scrub');
    expect(map.tiles[10]![11]!.walkable).toBe(true);
    expect(canReach(map.tiles, { x: 10, y: 10 }, map.exit)).toBe(true);
  });

  it('lines up phaser training mites from the stand tile', () => {
    const map = generateTutorialMap(3);
    const north = map.enemies.find((e) => e.x === PHASER_STAND.x && e.y === PHASER_STAND.y - 2);
    const east = map.enemies.find((e) => e.x === PHASER_STAND.x + 3 && e.y === PHASER_STAND.y);
    expect(north?.kind).toBe('mite');
    expect(east?.kind).toBe('mite');
  });

  it('teaches the same single unknown gamble on every seed', () => {
    const kinds = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => {
        const map = generateTutorialMap(seed);
        return map.items.find((i) => i.kind !== 'flare' && i.kind !== 'phaser')!.kind;
      }),
    );
    expect([...kinds]).toEqual(['salvage']);
  });
});
