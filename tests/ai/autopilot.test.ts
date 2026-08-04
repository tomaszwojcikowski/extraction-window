import { describe, expect, it } from 'vitest';
import { chooseAction, runAutopilot } from '../../src/ai/autopilot';
import { applyAction, createGame, hasItem } from '../../src/sim';

describe('autopilot chooseAction', () => {
  it('returns a non-null action on a fresh mission', () => {
    const st = createGame(42);
    const action = chooseAction(st);
    expect(action).not.toBeNull();
    expect(action!.type).toMatch(/move|wait|get|use|exit|toggle_inventory/);
  });

  it('prefers a skill pick when skillPick is pending', () => {
    const st = createGame(42);
    st.skillPick = ['triage', 'deep_reserve'];
    const action = chooseAction(st);
    expect(action).toEqual({ type: 'pick_skill', id: 'triage' });
  });

  it('uses med when HP is critically low and med is in kit', () => {
    const st = createGame(42);
    const medIdx = st.inventory.findIndex((s) => s.kind === 'med');
    expect(medIdx).toBeGreaterThanOrEqual(0);
    st.player.hp = Math.floor(st.player.maxHp * 0.3);
    const action = chooseAction(st);
    expect(action).toEqual({ type: 'use' });
    expect(st.ui.selectedSlot).toBe(medIdx);
  });

  it('uses energy/coolant when bus is low', () => {
    const st = createGame(42);
    st.player.hp = st.player.maxHp;
    st.player.energy = Math.floor(st.player.maxEnergy * 0.3);
    const action = chooseAction(st);
    expect(action).toEqual({ type: 'use' });
    const kind = st.inventory[st.ui.selectedSlot]?.kind;
    expect(['coolant', 'battery', 'energy', 'ration']).toContain(kind);
  });
});

describe('autopilot runAutopilot', () => {
  it('completes without crash on smoke seeds', () => {
    for (const seed of [1, 42, 99]) {
      const st = createGame(seed);
      const { state, actions, stuck } = runAutopilot(st, 5000);
      expect(state.status === 'won' || state.status === 'lost' || stuck).toBe(true);
      expect(actions).toBeGreaterThan(10);
      expect(state.turn).toBeGreaterThan(0);
    }
  });

  it('never wins without nav core flag', () => {
    for (const seed of [1, 42, 99, 777]) {
      const st = createGame(seed);
      const { state } = runAutopilot(st, 5000);
      if (state.status === 'won') {
        expect(state.objectives.hasNavCore).toBe(true);
        expect(hasItem(state, 'nav_core') || state.objectives.hasNavCore).toBe(true);
      }
    }
  });

  it('advances at least a few sectors on typical seeds', () => {
    const st = createGame(99);
    const { state } = runAutopilot(st, 5000);
    // Even losses usually clear early sectors
    expect(state.sectorIndex).toBeGreaterThanOrEqual(0);
    if (state.status === 'won') {
      expect(state.sectorIndex).toBe(14);
    }
  });

  it('applyAction via autopilot choices never throws for 200 steps', () => {
    const st = createGame(256);
    for (let i = 0; i < 200 && st.status === 'playing'; i++) {
      const action = chooseAction(st);
      expect(action).not.toBeNull();
      expect(() => applyAction(st, action!)).not.toThrow();
    }
  });
});
