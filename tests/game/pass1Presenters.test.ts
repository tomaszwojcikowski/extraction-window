import { describe, expect, it } from 'vitest';
import { STORM_TURNS } from '../../src/campaign/spine';
import { collectWakeTells } from '../../src/game/presenters/WakeTells';
import { computeShearPressure } from '../../src/game/presenters/ShearPressure';
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
      stabilizeTurns: 0,
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

  it('flags guard false-positive: aggro range exceeds engage gate', () => {
    const st = stubState({
      enemies: [stubEnemy('crawler', 9, 5)], // guard, aggro 3, dist=4 from player
    });
    // QA documents this as feel bug — tell shows but AI guard won't engage until dist<=2.
    expect(collectWakeTells(st)).toHaveLength(1);
  });
});
