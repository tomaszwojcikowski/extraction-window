import { describe, expect, it } from 'vitest';
import { describeObjective } from '../../src/sim/objectives';
import { buildSingleRoomQuest } from '../../src/sim/roomQuest';
import { combatArena } from './fixtures';

describe('describeObjective optional sites', () => {
  it('never hands the extract marker to an optional site', () => {
    const st = combatArena();
    st.tutorialActive = false;
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 3, y: 3 }, { x: 2, y: 2, w: 3, h: 3 });
    st.player.x = 3;
    st.player.y = 3;
    st.visible[3]![3] = true;
    st.explored[3]![3] = true;

    const desc = describeObjective(st);
    expect(desc.local).not.toBe('OBJ-LOCAL-ROOM');
    expect(desc.pos).not.toEqual({ x: 3, y: 3 });
  });

  it('keeps extract guidance when an optional site is explored at range', () => {
    const st = combatArena();
    st.tutorialActive = false;
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 8, y: 8 }, { x: 7, y: 7, w: 3, h: 3 });
    st.explored[8]![8] = true;
    st.player.x = 1;
    st.player.y = 1;

    const desc = describeObjective(st);
    expect(desc.local).not.toBe('OBJ-LOCAL-ROOM');
  });
});
