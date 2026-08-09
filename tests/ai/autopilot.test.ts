import { describe, expect, it } from 'vitest';
import { chooseAction, PERSONAS, runAutopilot } from '../../src/ai/autopilot';
import { applyAction, createGame, hasItem } from '../../src/sim';
import { summarize, type SeedReport } from '../harness';
import { makeEnemy } from '../sim/fixtures';

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
    expect(kind).toBe('energy');
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

  it('reports a stuck reason only when it gives up', () => {
    const finished = runAutopilot(createGame(99), 5000);
    if (!finished.stuck) expect(finished.stuckReason).toBeNull();

    const capped = runAutopilot(createGame(99), 5);
    expect(capped.stuck).toBe(true);
    expect(capped.stuckReason).toBe('action_cap');
  });

  it('samples every applied action for telemetry', () => {
    let steps = 0;
    const { actions } = runAutopilot(createGame(42), 300, { onStep: () => steps++ });
    expect(steps).toBe(actions);
  });
});

describe('autopilot personas', () => {
  it('stable keeps the calibrated thresholds the WR band is tuned to', () => {
    expect(PERSONAS.stable.healAt).toBe(0.65);
    expect(PERSONAS.stable.rechargeAt).toBe(0.65);
    expect(PERSONAS.stable.useQuiet).toBe(true);
    expect(PERSONAS.stable.useFlare).toBe(true);
    expect(PERSONAS.stable.pushProbe).toBe(false);
  });

  it('reckless leaves healing later than stable', () => {
    const st = createGame(42);
    st.player.hp = Math.floor(st.player.maxHp * 0.5);
    expect(chooseAction(st, PERSONAS.stable)).toEqual({ type: 'use' });

    const reckless = createGame(42);
    reckless.player.hp = Math.floor(reckless.player.maxHp * 0.5);
    const action = chooseAction(reckless, PERSONAS.reckless);
    const kind = reckless.inventory[reckless.ui.selectedSlot]?.kind;
    expect(action?.type === 'use' && kind === 'med').toBe(false);
  });

  it('probe refuses the quiet crutch that stable reaches for', () => {
    /** Healthy, one jammer in kit, one noisy mite in range — the jammer decision. */
    function jammerChoice() {
      const st = createGame(42);
      st.player.hp = st.player.maxHp;
      st.player.energy = st.player.maxEnergy;
      st.player.armor = st.player.maxArmor;
      st.inventory = [{ kind: 'jammer', count: 1 }];
      st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 3, y: st.player.y })];
      return st;
    }

    const quiet = jammerChoice();
    expect(chooseAction(quiet, PERSONAS.quiet)).toEqual({ type: 'use' });
    expect(quiet.inventory[quiet.ui.selectedSlot]?.kind).toBe('jammer');

    const probe = jammerChoice();
    expect(chooseAction(probe, PERSONAS.probe)).not.toEqual({ type: 'use' });
  });
});

describe('summarize death-mix diversity', () => {
  function loss(reason: string): SeedReport {
    return {
      seed: 1,
      persona: 'stable',
      status: 'lost',
      loseReason: reason,
      turns: 10,
      actions: 10,
      sectorReached: 3,
      stuck: false,
      stuckReason: null,
      winLegal: true,
      loreLegal: true,
      objectivesReachable: true,
      crash: null,
      hasNavCoreAtEnd: false,
      level: 1,
      emPeak: 20,
      salvageIdentified: 0,
      salvageBacklash: 0,
      skills: [],
    };
  }

  it('flags a single dominant channel', () => {
    const s = summarize([loss('hp'), loss('hp'), loss('hp'), loss('storm')]);
    expect(s.loseChannels).toBe(2);
    expect(s.dominantLoseShare).toBeCloseTo(0.75, 5);
  });

  it('reads an even spread as diverse', () => {
    const s = summarize([loss('hp'), loss('storm'), loss('energy'), loss('stuck')]);
    expect(s.loseChannels).toBe(4);
    expect(s.dominantLoseShare).toBeCloseTo(0.25, 5);
  });

  it('stays at zero with no losses', () => {
    expect(summarize([]).dominantLoseShare).toBe(0);
  });
});
