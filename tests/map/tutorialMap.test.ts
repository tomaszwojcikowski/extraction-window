import { describe, expect, it } from 'vitest';
import { generateTutorialMap } from '../../src/map/tutorialMap';
import { canReach } from '../../src/sim/fov';

describe('generateTutorialMap', () => {
  it('is a fixed 24×16 drill bay with east hatch and west start', () => {
    const map = generateTutorialMap(42);
    expect(map.width).toBe(24);
    expect(map.height).toBe(16);
    expect(map.start).toEqual({ x: 2, y: 7 });
    expect(map.exit).toEqual({ x: 21, y: 7 });
    expect(map.tiles[map.exit.y]![map.exit.x]!.kind).toBe('exit');
    expect(map.tiles[map.start.y]![map.start.x]!.walkable).toBe(true);
    expect(canReach(map.tiles, map.start, map.exit)).toBe(true);
  });

  it('always places a flare and one identification pickup', () => {
    for (const seed of [1, 7, 42, 99, 12345]) {
      const map = generateTutorialMap(seed);
      expect(map.items.some((i) => i.kind === 'flare')).toBe(true);
      expect(
        map.items.some((i) => i.kind === 'salvage' || i.kind === 'field_sample'),
      ).toBe(true);
      expect(map.items).toHaveLength(2);
    }
  });

  it('places exactly one living stalker and no NPCs/quests', () => {
    const map = generateTutorialMap(256);
    expect(map.enemies).toHaveLength(1);
    expect(map.enemies[0]!.kind).toBe('stalker');
    expect(map.enemies[0]!.alive).toBe(true);
    expect(map.npcs).toHaveLength(0);
    expect(map.roomQuest).toBeNull();
    expect(map.beaconPos).toBeNull();
    expect(map.shuttlePos).toBeNull();
  });

  it('keeps a scrub and south alcove around the corridor', () => {
    const map = generateTutorialMap(3);
    expect(map.tiles[6]![11]!.kind).toBe('scrub');
    expect(map.tiles[10]![11]!.walkable).toBe(true);
    // Alcove path should still reach the hatch without needing the scrub tile
    expect(canReach(map.tiles, { x: 10, y: 10 }, map.exit)).toBe(true);
  });

  it('varies identification loot across seeds', () => {
    const kinds = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => {
        const map = generateTutorialMap(seed);
        return map.items.find((i) => i.kind !== 'flare')!.kind;
      }),
    );
    expect(kinds.size).toBeGreaterThan(1);
  });
});
