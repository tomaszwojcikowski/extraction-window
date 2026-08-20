import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/sim/actions';
import { buildSingleRoomQuest } from '../../src/sim/roomQuest';
import { openNpcQuestOffer, resolveQuestOffer } from '../../src/sim/questOffer';
import { combatArena } from './fixtures';

describe('quest offer modal', () => {
  it('opens on pending room site interact and accepts without spending a turn', () => {
    const st = combatArena();
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 3, y: 3 }, { x: 2, y: 2, w: 3, h: 3 });
    st.player.x = 3;
    st.player.y = 3;
    st.tiles[3]![3] = { kind: 'quest', walkable: true, transparent: true };
    const turn = st.turn;

    applyAction(st, { type: 'exit' });
    expect(st.questOffer?.source).toBe('room');
    expect(st.roomQuest?.offer).toBe('pending');
    expect(st.turn).toBe(turn);

    applyAction(st, { type: 'quest_offer', accept: true });
    expect(st.questOffer).toBeNull();
    expect(st.roomQuest?.offer).toBe('accepted');
    expect(st.turn).toBe(turn);
  });

  it('decline clears the optional site and syncs done', () => {
    const st = combatArena();
    st.roomQuest = buildSingleRoomQuest('purge', { x: 3, y: 3 }, { x: 2, y: 2, w: 3, h: 3 });
    st.player.x = 3;
    st.player.y = 3;
    st.tiles[3]![3] = { kind: 'quest', walkable: true, transparent: true };

    applyAction(st, { type: 'exit' });
    applyAction(st, { type: 'quest_offer', accept: false });
    expect(st.roomQuest?.offer).toBe('declined');
    expect(st.roomQuest?.done).toBe(true);
    expect(st.tiles[3]![3]!.kind).toBe('floor');
  });

  it('NPC agenda accept opens agenda and marks talked', () => {
    const st = combatArena();
    st.npcs = [
      {
        id: 9,
        kind: 'survey_contact',
        x: 4,
        y: 3,
        talked: false,
      },
    ];
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 8, y: 8 }, { x: 7, y: 7, w: 3, h: 3 });
    expect(openNpcQuestOffer(st, st.npcs[0]!)).toBe(true);
    expect(st.questOffer?.source).toBe('npc');
    expect(resolveQuestOffer(st, true)).toBe(true);
    expect(st.npcs[0]!.talked).toBe(true);
    expect(st.npcs[0]!.agendaOpen).toBe(true);
    expect(st.roomQuest?.offer).toBe('accepted');
  });

  it('NPC agenda decline leaves contact closed without gifts', () => {
    const st = combatArena();
    st.npcs = [
      {
        id: 2,
        kind: 'field_tech',
        x: 4,
        y: 3,
        talked: false,
      },
    ];
    openNpcQuestOffer(st, st.npcs[0]!);
    resolveQuestOffer(st, false);
    expect(st.npcs[0]!.talked).toBe(true);
    expect(st.npcs[0]!.agendaOpen).toBe(false);
    expect(st.allies.length).toBe(0);
  });
});
