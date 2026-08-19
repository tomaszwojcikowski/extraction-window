import { describe, expect, it } from 'vitest';
import { collectWakeTells, wakeTellsAt } from '../../src/game/presenters/WakeTells';
import { wouldNoticeEnemy } from '../../src/sim/notice';
import type { Enemy, GameState } from '../../src/sim/types';

function stubState(over: Partial<GameState> & { enemies?: Enemy[] }): GameState {
  const w = 11;
  const h = 11;
  const visible = Array.from({ length: h }, () => Array.from({ length: w }, () => true));
  return {
    width: w,
    height: h,
    tiles: Array.from({ length: h }, () =>
      Array.from({ length: w }, () => ({ kind: 'floor' as const, walkable: true, transparent: true })),
    ),
    illumination: Array.from({ length: h }, () => Array.from({ length: w }, () => 0)),
    visible,
    explored: visible.map((row) => row.slice()),
    turn: 1,
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
    id: x * 100 + y,
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

describe('collectWakeTells', () => {
  it('flags fauna that would notice at the player tile', () => {
    const st = stubState({ enemies: [stubEnemy('mite', 6, 5)] });
    const tells = collectWakeTells(st, 5, 5);
    expect(tells).toHaveLength(1);
    expect(tells[0]!.kind).toBe('dark');
  });

  it('matches wouldNoticeEnemy — no guard false positive at dist 4', () => {
    const st = stubState({ enemies: [stubEnemy('crawler', 9, 5)] });
    expect(wouldNoticeEnemy(st, st.enemies[0]!, 5, 5)).toBe(false);
    expect(collectWakeTells(st, 5, 5)).toHaveLength(0);
  });

  it('wakeTellsAt shares the live predicate path', () => {
    const st = stubState({ enemies: [stubEnemy('crawler', 7, 5)] });
    expect(wakeTellsAt(st, 5, 5)).toEqual(collectWakeTells(st, 5, 5));
  });

  it('caps at eight closest visible noticers', () => {
    const enemies = Array.from({ length: 12 }, (_, i) => stubEnemy('mite', 6 + (i % 3), 5 + Math.floor(i / 3)));
    const st = stubState({ enemies });
    expect(collectWakeTells(st, 5, 5).length).toBeLessThanOrEqual(8);
  });
});
