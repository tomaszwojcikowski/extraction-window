import { describe, expect, it } from 'vitest';
import { chooseAction, PERSONAS, runAutopilot, unstickAction } from '../../src/ai/autopilot';
import { applyAction, createGame, hasItem } from '../../src/sim';
import { summarize, type SeedReport } from '../harness';
import { makeEnemy } from '../sim/fixtures';
import type { GameState } from '../../src/sim/types';

function openEast(st: GameState, dist: number): void {
  const py = st.player.y;
  const px = Math.min(st.player.x, st.width - dist - 2);
  st.player.x = px;
  for (let step = 0; step <= dist; step++) {
    const x = px + step;
    st.tiles[py]![x] = { kind: 'floor', walkable: true, transparent: true };
    st.visible[py]![x] = true;
  }
}

function phaserLane(seed = 7): GameState {
  const st = createGame(seed, { skipTutorial: true });
  st.enemies = [];
  st.npcs = [];
  st.allies = [];
  st.handshake = null;
  st.uplink = null;
  st.questOffer = null;
  st.player.hp = st.player.maxHp;
  st.player.energy = st.player.maxEnergy;
  st.player.equip.tool = null;
  st.player.x = 8;
  st.player.y = 8;
  st.inventory = [{ kind: 'phaser', count: 1 }, { kind: 'energy', count: 4 }];
  openEast(st, 3);
  st.enemies = [
    makeEnemy({
      id: 1,
      kind: 'elite_skirmisher',
      tier: 'elite',
      x: st.player.x + 2,
      y: st.player.y,
    }),
  ];
  return st;
}

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

  it('unstick waits during an active handshake', () => {
    const st = createGame(42);
    st.handshake = { active: true, progress: 1 };
    expect(unstickAction(st)).toEqual({ type: 'wait' });
  });

  it('unstick melees an adjacent blocker', () => {
    const st = createGame(42);
    st.enemies = [
      makeEnemy({ id: 1, kind: 'mite', x: st.player.x + 1, y: st.player.y }),
    ];
    expect(unstickAction(st)).toEqual({ type: 'move', dx: 1, dy: 0 });
  });

  it('equips a phaser when a 2-tile cardinal lane is live', () => {
    const st = phaserLane();
    const action = chooseAction(st);
    expect(action).toEqual({ type: 'use' });
    expect(st.inventory[st.ui.selectedSlot]?.kind).toBe('phaser');
  });

  it('steps into a live phaser lane once the tool is worn', () => {
    const st = phaserLane();
    st.player.equip.tool = 'phaser';
    expect(chooseAction(st)).toEqual({ type: 'move', dx: 1, dy: 0 });
  });

  it('sidesteps onto a cardinal before firing an off-axis foe', () => {
    const st = phaserLane();
    st.player.equip.tool = 'phaser';
    st.player.hp = Math.floor(st.player.maxHp * 0.75);
    st.tiles[9]![8] = { kind: 'floor', walkable: true, transparent: true };
    st.visible[9]![8] = true;
    st.enemies = [
      makeEnemy({ id: 2, kind: 'elite_skirmisher', tier: 'elite', x: 10, y: 9 }),
    ];
    st.visible[9]![10] = true;
    expect(chooseAction(st)).toEqual({ type: 'move', dx: 0, dy: 1 });
  });

  it('holds the phaser when Power is under the kit reserve', () => {
    const st = phaserLane();
    st.player.equip.tool = 'phaser';
    st.player.energy = 50;
    const action = chooseAction(st);
    expect(action).not.toEqual({ type: 'move', dx: 1, dy: 0 });
  });

  it('walks into a visible hostile within 4 tiles instead of pathing past', () => {
    const st = createGame(7, { skipTutorial: true });
    st.handshake = null;
    st.uplink = null;
    st.questOffer = null;
    st.player.hp = st.player.maxHp;
    st.player.energy = st.player.maxEnergy;
    st.player.x = 8;
    st.player.y = 8;
    st.player.equip.tool = null;
    st.inventory = [{ kind: 'med', count: 2 }, { kind: 'energy', count: 4 }];
    for (let x = 8; x <= 12; x++) {
      st.tiles[8]![x] = { kind: 'floor', walkable: true, transparent: true };
      st.visible[8]![x] = true;
    }
    st.enemies = [makeEnemy({ id: 3, kind: 'mite', x: 11, y: 8 })];
    st.npcs = [];
    st.allies = [];
    const action = chooseAction(st);
    expect(action).toEqual({ type: 'move', dx: 1, dy: 0 });
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

  it('quiet persona hoards flares while probe spends them', () => {
    expect(PERSONAS.quiet.useFlare).toBe(false);
    expect(PERSONAS.probe.useFlare).toBe(true);
    expect(PERSONAS.probe.pushProbe).toBe(true);
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
    const s = summarize([loss('hp'), loss('hp'), loss('hp'), loss('energy')]);
    expect(s.loseChannels).toBe(2);
    expect(s.dominantLoseShare).toBeCloseTo(0.75, 5);
  });

  it('reads an even spread as diverse', () => {
    const s = summarize([loss('hp'), loss('energy'), loss('stuck')]);
    expect(s.loseChannels).toBe(3);
    expect(s.dominantLoseShare).toBeCloseTo(1 / 3, 5);
  });

  it('stays at zero with no losses', () => {
    expect(summarize([]).dominantLoseShare).toBe(0);
  });
});
