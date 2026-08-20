import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { applyAction } from '../../src/sim/actions';
import { addItem } from '../../src/sim/inventory';
import {
  agendaChipLore,
  canFulfillAgenda,
  openAgendaNpc,
} from '../../src/sim/mechanics/npcMechanic';
import { buildSingleRoomQuest } from '../../src/sim/roomQuest';
import { combatArena, makeAlly } from './fixtures';

describe('NPC agenda payoffs', () => {
  it('ensign turn-in refreshes escort clock and patches HP', () => {
    const st = combatArena();
    st.player.hp = st.player.maxHp - 4;
    st.npcs = [
      {
        id: 1,
        kind: 'stranded_ensign',
        x: st.player.x,
        y: st.player.y,
        talked: true,
        agendaOpen: true,
        agendaDone: false,
      },
    ];
    st.allies = [makeAlly({ kind: 'away_escort', turnsLeft: 3, x: st.player.x + 1, y: st.player.y })];
    addItem(st, 'med');

    applyAction(st, { type: 'exit' });
    expect(st.npcs[0]!.agendaDone).toBe(true);
    // Hail spends the turn, so the ally clock ticks once after the refresh.
    expect(st.allies[0]!.turnsLeft).toBe(21);
    expect(st.player.hp).toBe(st.player.maxHp - 2);
    expect(st.log.some((e) => e.loreId === 'LOG-AGENDA-ALLY')).toBe(true);
    expect(st.log.some((e) => e.loreId === 'LOG-AGENDA-HEAL')).toBe(true);
  });

  it('tech turn-in grants a hazard pass when none is held', () => {
    const st = combatArena();
    st.npcs = [
      {
        id: 2,
        kind: 'field_tech',
        x: st.player.x,
        y: st.player.y,
        talked: true,
        agendaOpen: true,
        agendaDone: false,
      },
    ];
    addItem(st, 'sealant');
    applyAction(st, { type: 'exit' });
    expect(st.extractFavor).toEqual({ kind: 'hazard_pass' });
    expect(st.log.some((e) => e.loreId === 'LOG-FAVOR-GRANT')).toBe(true);
  });

  it('survey turn-in boosts an accepted unfinished optional site', () => {
    const st = combatArena();
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 8, y: 8 }, { x: 7, y: 7, w: 3, h: 3 });
    st.roomQuest.offer = 'accepted';
    st.npcs = [
      {
        id: 3,
        kind: 'survey_contact',
        x: st.player.x,
        y: st.player.y,
        talked: true,
        agendaOpen: true,
        agendaDone: false,
      },
    ];
    addItem(st, 'mapper');
    applyAction(st, { type: 'exit' });
    expect(st.roomQuest?.payoffBoost).toBe(true);
    expect(st.extractFavor).toBeNull();
    expect(st.log.some((e) => e.loreId === 'LOG-AGENDA-BOOST')).toBe(true);
  });

  it('survey turn-in grants pattern fail-safe when no site is live', () => {
    const st = combatArena();
    st.roomQuest = null;
    st.npcs = [
      {
        id: 4,
        kind: 'survey_contact',
        x: st.player.x,
        y: st.player.y,
        talked: true,
        agendaOpen: true,
        agendaDone: false,
      },
    ];
    addItem(st, 'mapper');
    applyAction(st, { type: 'exit' });
    expect(st.extractFavor).toEqual({ kind: 'pattern_fail_safe' });
  });

  it('exposes open agenda for HUD and kit checks', () => {
    const st = combatArena();
    st.inventory = [];
    st.npcs = [
      {
        id: 5,
        kind: 'field_tech',
        x: 4,
        y: 4,
        talked: true,
        agendaOpen: true,
        agendaDone: false,
      },
    ];
    const npc = openAgendaNpc(st)!;
    expect(lore(agendaChipLore(npc))).toBe(lore('UI-AGENDA-CHIP-TECH'));
    expect(canFulfillAgenda(st, npc)).toBe(false);
    addItem(st, 'filter');
    expect(canFulfillAgenda(st, npc)).toBe(true);
  });
});
