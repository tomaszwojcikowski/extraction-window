import { describe, expect, it } from 'vitest';
import { createGame, emptyEquipSlots } from '../../src/sim';
import { ITEMS } from '../../src/data/items';
import { contextHint } from '../../src/game/presenters/ContextHints';
import { minimapGoalPos } from '../../src/game/views/MinimapView';
import { describeObjective } from '../../src/sim/objectives';
import { generateTutorialMap, pinDrillStalkerOnSouthLane } from '../../src/map/tutorialMap';
import { manhattan } from '../../src/sim/spatial';

describe('exploration progress coaching', () => {
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
    // teach_minimap deliberately unset — this case is the first fire.
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
    st.player.equip = emptyEquipSlots();

    const hatch = st.exitPos!;
    // Keep the hatch explored for the map ring, but not in lamp FOV.
    st.explored[hatch.y]![hatch.x] = true;
    st.visible[hatch.y]![hatch.x] = false;
    expect(manhattan(st.player.x, st.player.y, hatch.x, hatch.y)).toBeGreaterThan(4);

    expect(contextHint(st)).toBe('UI-HINT-MINIMAP');
    expect(contextHint(st)).toBe('OBJ-LOCAL-EXIT');
  });

  it('rings the explored hatch on the minimap', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    const pos = describeObjective(st).pos!;
    st.explored[pos.y]![pos.x] = true;
    expect(minimapGoalPos(st)).toEqual(pos);
    st.explored[pos.y]![pos.x] = false;
    st.visible[pos.y]![pos.x] = false;
    expect(minimapGoalPos(st)).toBeNull();
  });

  it('keeps a south path past the drill stalker that never steps adjacent', () => {
    const map = generateTutorialMap(42);
    const stalker = map.enemies.find((e) => e.kind === 'stalker')!;
    // Walk the south lane — no tile should be adjacent to the stalker.
    const pathYs = [11];
    for (let x = 9; x <= 16; x++) {
      for (const y of pathYs) {
        expect(map.tiles[y]![x]!.walkable).toBe(true);
        const d = Math.abs(x - stalker.x) + Math.abs(y - stalker.y);
        expect(d).toBeGreaterThan(1);
      }
    }
  });

  it('pins the drill stalker while the surveyor stays on the south lane', () => {
    const st = createGame(1, { skipTutorial: false });
    const stalker = st.enemies.find((e) => e.kind === 'stalker')!;
    const home = { x: stalker.homeX, y: stalker.homeY };
    st.player.x = 12;
    st.player.y = 11;
    stalker.x = 12;
    stalker.y = 10;
    stalker.windup = 2;
    stalker.alerted = true;
    pinDrillStalkerOnSouthLane(st);
    expect(stalker.x).toBe(home.x);
    expect(stalker.y).toBe(home.y);
    expect(stalker.windup).toBe(0);
    expect(stalker.alerted).toBe(false);
  });
});
