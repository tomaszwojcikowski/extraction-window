import { describe, expect, it } from 'vitest';
import { effectiveAggro } from '../../src/sim/ai';
import { rebuildIllumination } from '../../src/sim/light';
import { startIonFront } from '../../src/sim/mechanics/ionFront';
import { mechanicsOnEndTurn } from '../../src/sim/mechanics';
import { buildMultiRoomQuest, pickRoomQuestKind, tryRoomQuest } from '../../src/sim/roomQuest';
import { combatArena, makeEnemy } from './fixtures';

describe('ADOM Wave 3 — ion fronts', () => {
  it('taxes EM and bus, while Quiet or a filter dampens its pulse', () => {
    const st = combatArena();
    startIonFront(st);
    const em = st.emStress;
    const energy = st.player.energy;

    mechanicsOnEndTurn(st);
    expect(st.emStress).toBe(em + 1);
    expect(st.player.energy).toBe(energy - 1);

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

describe('ADOM Wave 3 — relay chain', () => {
  it('appears only in the midgame pool', () => {
    expect(pickRoomQuestKind(() => 0.99, 4)).toBe('relay_chain');
    expect(pickRoomQuestKind(() => 0.99, 11)).toBe('decode');
  });

  it('grants a pattern-buffer fail-safe after all relays are closed', () => {
    const st = combatArena();
    const room = { x: 1, y: 1, w: 3, h: 3 };
    st.roomQuest = buildMultiRoomQuest('relay_chain', [
      { pos: { x: 2, y: 2 }, room },
      { pos: { x: 4, y: 2 }, room: { ...room, x: 3 } },
    ]);

    for (const step of st.roomQuest.steps) {
      st.player.x = step.pos.x;
      st.player.y = step.pos.y;
      expect(tryRoomQuest(st)).toBe(true);
    }

    expect(st.roomQuest.done).toBe(true);
    expect(st.extractFavor).toEqual({ kind: 'pattern_fail_safe' });
  });
});
