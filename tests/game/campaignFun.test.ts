import { describe, expect, it } from 'vitest';
import { createGame, applyAction } from '../../src/sim';
import { BUS_DRIP_TURNS } from '../../src/sim/bus';
import { getSector } from '../../src/data/encounters';
import { generateSectorMap } from '../../src/map/generator';
import { contextHint } from '../../src/game/presenters/ContextHints';
import { ITEMS } from '../../src/data/items';

describe('campaign gameplay fun', () => {
  it('sizes bus drip for an ~800-turn spine (~100 Power)', () => {
    expect(BUS_DRIP_TURNS).toBe(8);
    expect(Math.round(800 / BUS_DRIP_TURNS)).toBe(100);
  });

  it('does not stack ash sector drain on top of the bus drip', () => {
    expect(getSector(9).id).toBe('ash');
    expect(getSector(9).energyDrain).toBe(0);
  });

  it('packs fewer hostiles on plains than on canopy for the same seed', () => {
    const plains = generateSectorMap(getSector(0), 42, 0);
    const canopy = generateSectorMap(getSector(2), 42, 2);
    expect(plains.enemies.length).toBeLessThan(canopy.enemies.length);
  });

  it('keeps sealed hatches off plains and flood', () => {
    for (const seed of [1, 42, 99, 777]) {
      for (const index of [0, 1]) {
        const map = generateSectorMap(getSector(index), seed, index);
        const sealed = map.tiles.flat().filter((t) => t.kind === 'sealed');
        expect(sealed, `seed=${seed} sector=${index}`).toEqual([]);
      }
    }
  });

  it('Nav Ping marks a cache through fog when one remains', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    const cache = st.rooms.find((r) => r.role === 'cache');
    expect(cache).toBeTruthy();
    st.inventory = [{ kind: 'mapper', count: 1 }];
    st.ui.selectedSlot = 0;
    applyAction(st, { type: 'use' });
    expect(st.mapperPing).toEqual({ x: cache!.cx, y: cache!.cy });
    expect(st.player.mapperTurns).toBeGreaterThan(0);
  });

  it('teaches the minimap once when the hatch sits outside lamp range', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    st.sectorIndex = 0;
    st.scriptedFired.tut_welcome = true;
    st.scriptedFired.teach_clocks = true;
    st.scriptedFired.teach_extract = true;
    st.scriptedFired.teach_equip = true;
    st.scriptedFired.teach_brand = true;
    st.scriptedFired.teach_light = true;
    st.items = [];
    st.enemies = [];
    st.roomQuest = null;
    st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
    st.player.hp = st.player.maxHp;
    st.player.energy = st.player.maxEnergy;
    st.player.armor = st.player.maxArmor;
    st.player.statuses = {};
    st.inventory = st.inventory.filter(
      (s) => !(ITEMS[s.kind].equipSlot || ITEMS[s.kind].equipSlots?.length),
    );
    const hatch = st.exitPos!;
    st.explored[hatch.y]![hatch.x] = true;
    st.visible[hatch.y]![hatch.x] = false;
    expect(contextHint(st)).toBe('UI-HINT-MINIMAP');
    expect(contextHint(st)).toBe('OBJ-LOCAL-EXIT');
  });

  it('coaches a locked hatch before you stand on it once the tile is known', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    st.sectorId = 'ruin';
    st.objectives.hasRelayKey = false;
    st.inventory = st.inventory.filter((s) => s.kind !== 'relay_key');
    st.items = st.items.filter((i) => i.kind !== 'relay_key');
    const exit = st.exitPos!;
    st.explored[exit.y]![exit.x] = true;
    st.player.x = Math.max(1, exit.x - 2);
    st.player.y = exit.y;
    st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
    st.enemies = [];
    expect(contextHint(st)).toBe('UI-HINT-EXIT-NEED-KEY');
  });
});
