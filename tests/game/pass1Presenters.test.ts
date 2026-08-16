import { describe, expect, it } from 'vitest';
import { STORM_TURNS } from '../../src/campaign/spine';
import {
  collectWakeTells,
  wakeTellsAt,
  wouldNoticeEnemy,
} from '../../src/game/presenters/WakeTells';
import { pressureRevealAt } from '../../src/game/presenters/PressureReveal';
import { computeShearPressure, shearReadoutLabel } from '../../src/game/presenters/ShearPressure';
import type { Enemy, GameState } from '../../src/sim/types';

function stubState(over: Partial<GameState> & { enemies?: Enemy[] }): GameState {
  const w = 11;
  const h = 11;
  const visible = Array.from({ length: h }, () => Array.from({ length: w }, () => true));
  const explored = visible.map((row) => row.slice());
  const tiles = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ kind: 'floor' as const, walkable: true, transparent: true })),
  );
  const illumination = Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
  return {
    width: w,
    height: h,
    tiles,
    illumination,
    visible,
    explored,
    turn: 1,
    stormTurns: STORM_TURNS,
    player: {
      x: 5,
      y: 5,
      hp: 52,
      maxHp: 52,
      energy: 100,
      maxEnergy: 100,
      atk: 6,
      def: 2,
      armor: 12,
      maxArmor: 12,
      jammerTurns: 0,
      probeTurns: 0,
      stimTurns: 0,
      filterTurns: 0,
      lensTurns: 0,
      mapperTurns: 0,
      equip: {},
      inventory: [],
      statuses: {},
    },
    enemies: [],
    emStress: 0,
    sectorId: 'plains',
    sectorIndex: 0,
    seed: 1,
    level: 1,
    xp: 0,
    xpToNext: 100,
    lootTakenThisSector: false,
    ionFrontTurns: 0,
    scanScars: [],
    ...over,
  } as GameState;
}

function stubEnemy(kind: Enemy['kind'], x: number, y: number, extra: Partial<Enemy> = {}): Enemy {
  return {
    id: 1,
    kind,
    x,
    y,
    hp: 5,
    maxHp: 5,
    atk: 2,
    def: 0,
    alive: true,
    statuses: {},
    alerted: false,
    swellTurns: 0,
    homeX: x,
    homeY: y,
    skirmishRetreat: false,
    windup: 0,
    beamCooldown: 0,
    tier: 'normal',
    ...extra,
  };
}

describe('computeShearPressure', () => {
  it('starts Calm at full window and bus', () => {
    const spec = computeShearPressure(stubState({}));
    expect(spec.value).toBe(0);
    expect(spec.state).toBe('Calm');
    expect(spec.drainingLeg).toBe('both');
  });

  it('maps 62/38 blend to named thresholds', () => {
    const charged = computeShearPressure(
      stubState({ stormTurns: Math.floor(STORM_TURNS * 0.55), player: { ...stubState({}).player, energy: 70 } }),
    );
    expect(charged.state).toBe('Charged');
    expect(charged.value).toBeGreaterThanOrEqual(0.25);
    expect(charged.value).toBeLessThan(0.5);

    const breaching = computeShearPressure(
      stubState({ stormTurns: 0, player: { ...stubState({}).player, energy: 5 } }),
    );
    expect(breaching.state).toBe('Breaching');
    expect(breaching.value).toBeGreaterThanOrEqual(0.75);
    expect(breaching.drainingLeg).toBe('storm');
  });

  it('names bus as draining leg when window is full and reserve low', () => {
    const spec = computeShearPressure(
      stubState({ stormTurns: STORM_TURNS, player: { ...stubState({}).player, energy: 10 } }),
    );
    expect(spec.drainingLeg).toBe('bus');
  });
});

describe('shearReadoutLabel', () => {
  it('names pressure and the leading clock, not a Shear resource', () => {
    const busLed = computeShearPressure(
      stubState({ stormTurns: STORM_TURNS, player: { ...stubState({}).player, energy: 10 } }),
    );
    expect(shearReadoutLabel(busLed)).toBe(`PRESSURE  ${busLed.state.toUpperCase()}  ·  BUS`);

    const windowLed = computeShearPressure(
      stubState({ stormTurns: 0, player: { ...stubState({}).player, energy: 5 } }),
    );
    expect(shearReadoutLabel(windowLed)).toBe('PRESSURE  BREACHING  ·  WINDOW');
  });
});

describe('collectWakeTells', () => {
  it('suppresses jammer-silenced dark-prefer kinds', () => {
    const st = stubState({
      player: { ...stubState({}).player, jammerTurns: 3 },
      enemies: [stubEnemy('mite', 6, 5)],
    });
    expect(collectWakeTells(st)).toHaveLength(0);
  });

  it('mirrors ambush dark-notice at aggro range', () => {
    const st = stubState({
      enemies: [stubEnemy('stalker', 8, 5)], // ambush, dark-prefer; player tile dark
    });
    st.illumination[5]![5] = 0;
    const tells = collectWakeTells(st);
    expect(tells).toHaveLength(1);
    expect(tells[0]!.darkBoost).toBe(true);
  });

  it('does not warn lit ambush beyond adjacency when player is lit and enemy not in FOV', () => {
    const visible = Array.from({ length: 11 }, () => Array.from({ length: 11 }, () => false));
    visible[5]![5] = true; // player only
    const st = stubState({
      visible,
      enemies: [stubEnemy('stalker', 8, 5)],
    });
    expect(collectWakeTells(st)).toHaveLength(0);
  });

  it('guard engage gate: no ring beyond dist 2 without loot or alert', () => {
    const st = stubState({
      enemies: [stubEnemy('crawler', 9, 5)], // guard, dist=4
    });
    expect(collectWakeTells(st)).toHaveLength(0);
    expect(wouldNoticeEnemy(st, st.enemies[0]!, 5, 5)).toBe(false);
  });

  it('guard engage gate: ring at dist 2', () => {
    const st = stubState({
      enemies: [stubEnemy('crawler', 7, 5)], // dist=2
    });
    expect(collectWakeTells(st)).toHaveLength(1);
  });

  it('guard engage gate: ring at extended range when loot taken', () => {
    const st = stubState({
      lootTakenThisSector: true,
      enemies: [stubEnemy('crawler', 9, 5)],
    });
    expect(collectWakeTells(st)).toHaveLength(1);
  });

  it('sentinel mirrors aggro-range notice', () => {
    const st = stubState({
      enemies: [stubEnemy('sentinel', 8, 5)], // dist=3, aggro 5
    });
    expect(collectWakeTells(st)).toHaveLength(1);
  });

  it('marks wander as neutral notice', () => {
    const st = stubState({
      enemies: [stubEnemy('mite', 6, 5)],
    });
    const tells = collectWakeTells(st);
    expect(tells).toHaveLength(1);
    expect(tells[0]!.neutralNotice).toBe(true);
    expect(tells[0]!.litBoost).toBe(false);
  });

  it('wakeTellsAt preview differs from live when stepping into lit tile', () => {
    const st = stubState({
      enemies: [stubEnemy('wasp', 6, 6)], // lit-prefer
    });
    st.illumination[5]![5] = 0;
    st.illumination[6]![6] = 4;
    expect(collectWakeTells(st).every((t) => !t.litBoost)).toBe(true);
    const preview = wakeTellsAt(st, 6, 6);
    expect(preview.some((t) => t.litBoost)).toBe(true);
  });

  it('preview and live share identical tell sets at the same tile', () => {
    const st = stubState({
      enemies: [
        stubEnemy('crawler', 7, 5),
        stubEnemy('wasp', 6, 6),
        stubEnemy('mite', 8, 5),
      ],
    });
    st.player.x = 5;
    st.player.y = 5;
    const live = collectWakeTells(st);
    const preview = wakeTellsAt(st, st.player.x, st.player.y);
    expect(preview.map((t) => t.id).sort()).toEqual(live.map((t) => t.id).sort());
    for (const id of live.map((t) => t.id)) {
      const a = live.find((t) => t.id === id)!;
      const b = preview.find((t) => t.id === id)!;
      expect(b.litBoost).toBe(a.litBoost);
      expect(b.darkBoost).toBe(a.darkBoost);
      expect(b.neutralNotice).toBe(a.neutralNotice);
    }
  });

  it('guard alerted extends engage to aggro range', () => {
    const st = stubState({
      enemies: [stubEnemy('crawler', 9, 5, { alerted: true })],
    });
    expect(wouldNoticeEnemy(st, st.enemies[0]!, 5, 5)).toBe(true);
    expect(collectWakeTells(st)).toHaveLength(1);
  });

  it('swell pre-burst uses neutral notice bracket language', () => {
    const st = stubState({
      enemies: [stubEnemy('spore', 6, 5, { swellTurns: 0 })],
    });
    const tells = collectWakeTells(st);
    expect(tells).toHaveLength(1);
    expect(tells[0]!.neutralNotice).toBe(true);
  });

  it('quiet jammer shrinks preview footprint same as live', () => {
    const st = stubState({
      enemies: [stubEnemy('sentinel', 10, 5)], // dist=5, aggro 5
    });
    expect(collectWakeTells(st)).toHaveLength(1);
    st.player.jammerTurns = 3; // aggro shrinks to 2 — out of range
    expect(collectWakeTells(st)).toHaveLength(0);
    expect(wakeTellsAt(st, 5, 5)).toHaveLength(0);
  });
});

describe('pressureRevealAt', () => {
  function questTileState(): GameState {
    const st = stubState({});
    st.tiles[3]![7] = { kind: 'quest', walkable: true, transparent: true };
    return st;
  }

  it('returns null at Calm — optional path stays sealed', () => {
    const st = questTileState();
    const calm = computeShearPressure(st);
    expect(calm.state).toBe('Calm');
    expect(pressureRevealAt(st, calm, 7, 3, 0)).toBeNull();
  });

  it('returns visible crack params at Arcing+ for explored visible optional tiles', () => {
    const st = questTileState();
    st.stormTurns = Math.floor(STORM_TURNS * 0.35);
    st.player.energy = 25;
    const arcing = computeShearPressure(st);
    expect(arcing.state).toBe('Arcing');
    // Flicker gate: (animFrame + x + y) % 3 === 0 at Arcing
    const reveal = pressureRevealAt(st, arcing, 7, 3, 2);
    expect(reveal).not.toBeNull();
    expect(reveal!.visible).toBe(true);
    expect(reveal!.urgent).toBe(false);
    expect(reveal!.sectorId).toBe(st.sectorId);
  });

  it('skips unseen or unexplored tiles — no ESP reveal', () => {
    const st = questTileState();
    const arcing = computeShearPressure(
      stubState({ stormTurns: 0, player: { ...stubState({}).player, energy: 5 } }),
    );
    st.stormTurns = 0;
    st.player.energy = 5;
    st.visible[3]![7] = false;
    expect(pressureRevealAt(st, arcing, 7, 3, 0)).toBeNull();
  });

  it('returns null for exit tiles at all shear states — mandatory path stays stable', () => {
    const st = stubState({});
    st.tiles[3]![7] = { kind: 'exit', walkable: true, transparent: true };
    st.stormTurns = 0;
    st.player.energy = 5;
    const breaching = computeShearPressure(st);
    expect(breaching.state).toBe('Breaching');
    for (let frame = 0; frame < 6; frame++) {
      expect(pressureRevealAt(st, breaching, 7, 3, frame)).toBeNull();
    }
  });

  it('marks Breaching cracks urgent so the hot motif holds', () => {
    const st = questTileState();
    st.stormTurns = 0;
    st.player.energy = 5;
    const breaching = computeShearPressure(st);
    expect(breaching.state).toBe('Breaching');
    const reveal = pressureRevealAt(st, breaching, 7, 3, 0);
    expect(reveal).not.toBeNull();
    expect(reveal!.urgent).toBe(true);
    expect(reveal!.visible).toBe(true);
  });
});
