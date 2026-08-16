import { describe, expect, it } from 'vitest';
import { effectiveAggro } from '../../src/sim/ai';
import { rebuildIllumination } from '../../src/sim/light';
import { startIonFront } from '../../src/sim/mechanics/ionFront';
import { mechanicsOnEndTurn } from '../../src/sim/mechanics';
import {
  buildVentSealQuest,
  buildSingleRoomQuest,
  pickRoomQuestKind,
  tickRoomQuest,
  tryRoomQuest,
  trySealVentSite,
} from '../../src/sim/roomQuest';
import { roomQuestHudLine } from '../../src/sim/mechanics/roomQuestMechanic';
import { combatArena, makeEnemy } from './fixtures';

describe('ADOM Wave 3 — ion fronts', () => {
  it('taxes EM and bus, while Quiet or a filter dampens its pulse', () => {
    const st = combatArena();
    startIonFront(st);
    const em = st.emStress;
    const energy = st.player.energy;

    mechanicsOnEndTurn(st);
    expect(st.emStress).toBe(em + 2);
    expect(st.player.energy).toBe(energy - 2);

    st.ionFrontTurns = 2;
    st.player.jammerTurns = 4;
    const quietEnergy = st.player.energy;
    mechanicsOnEndTurn(st);
    expect(st.player.energy).toBe(quietEnergy);

    st.ionFrontTurns = 2;
    st.player.filterTurns = 4;
    const filteredEm = st.emStress;
    mechanicsOnEndTurn(st);
    expect(st.emStress).toBe(filteredEm);
    expect(st.log.some((entry) => entry.loreId === 'LOG-ION-DAMPEN')).toBe(true);
  });

  it('helps lit-prefer fauna track a lit player', () => {
    const st = combatArena();
    st.player.probeTurns = 20;
    st.ionFrontTurns = 3;
    rebuildIllumination(st);
    const wasp = makeEnemy({ kind: 'wasp', x: st.player.x + 3, y: st.player.y });

    expect(effectiveAggro(st, wasp)).toBe(9);
  });
});

describe('room quests', () => {
  it('only ever offers the three kinds, at any depth', () => {
    for (const roll of [0, 0.34, 0.5, 0.99]) {
      expect(['salvage', 'purge', 'vent_seal']).toContain(pickRoomQuestKind(() => roll));
    }
  });

  it('bills the kit for a vent seal, then pays a pattern fail-safe', () => {
    const st = combatArena();
    const room = { x: 1, y: 1, w: 3, h: 3 };
    st.roomQuest = buildVentSealQuest([
      { pos: { x: 2, y: 2 }, room },
      { pos: { x: 4, y: 2 }, room: { ...room, x: 3 } },
    ]);
    st.player.x = 2;
    st.player.y = 2;

    // Site A is a vent: the console does nothing until sealant goes down.
    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.stepIndex).toBe(0);

    expect(trySealVentSite(st)).toBe(true);
    expect(st.roomQuest.stepIndex).toBe(1);

    st.player.x = 4;
    st.player.y = 2;
    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.done).toBe(true);
    expect(st.extractFavor).toEqual({ kind: 'pattern_fail_safe' });
  });

  it('previews the extract favor before an optional quest is completed', () => {
    const st = combatArena();
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 2, y: 2 }, { x: 1, y: 1, w: 3, h: 3 });

    expect(roomQuestHudLine(st)).toMatchObject({ favor: '+15 WINDOW', index: 1, total: 1 });
  });
});

describe('room quest purge', () => {
  it('bills HP: hostiles wake on entry and the console holds until they are down', () => {
    const st = combatArena();
    const room = { x: 1, y: 1, w: 5, h: 5 };
    st.roomQuest = buildSingleRoomQuest('purge', { x: 3, y: 3 }, room);
    st.player.x = 3;
    st.player.y = 3;

    tickRoomQuest(st);
    expect(st.roomQuest.spawnedIds.length).toBeGreaterThan(0);

    // Console refuses while the nest is alive.
    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.done).toBe(false);

    for (const id of st.roomQuest.spawnedIds) {
      const en = st.enemies.find((e) => e.id === id);
      if (en) en.alive = false;
    }
    tickRoomQuest(st);
    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.done).toBe(true);
    expect(st.extractFavor).toEqual({ kind: 'hazard_pass' });
  });
});
