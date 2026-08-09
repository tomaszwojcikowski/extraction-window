import { describe, expect, it } from 'vitest';
import { STORM_TURNS } from '../../src/campaign/spine';
import {
  captureNoticeSnap,
  enemyMovedCloser,
  noticeImpactIds,
} from '../../src/game/presenters/NoticeImpact';
import {
  markPeekTeachDone,
  PEEK_TEACH_SCRIPT,
  peekTeachBlockedBy,
  peekTeachEligible,
  shouldShowPeekTeach,
} from '../../src/game/presenters/PeekTeach';
import { wouldNoticeEnemy } from '../../src/game/presenters/WakeTells';
import type { Enemy, GameState } from '../../src/sim/types';
import { LORE } from '../../src/data/lore';

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
    scanScars: [],
    scriptedFired: {},
    tutorialActive: false,
    paddMods: {},
    skillPick: null,
    ui: { inventoryOpen: false, selectedSlot: 0, aimingDart: false, questFlash: 0 },
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

describe('NoticeImpact', () => {
  it('punches when fauna newly enters notice range', () => {
    const far = stubEnemy('mite', 9, 5);
    const st = stubState({ enemies: [far] });
    const prev = captureNoticeSnap(st);
    expect(prev[0]!.wouldNotice).toBe(false);

    far.x = 6; // now in aggro
    const ids = noticeImpactIds(st, prev);
    expect(wouldNoticeEnemy(st, far, 5, 5)).toBe(true);
    expect(ids).toEqual([1]);
  });

  it('does not spam while already noticing and still', () => {
    const near = stubEnemy('mite', 6, 5);
    const st = stubState({ enemies: [near] });
    const prev = captureNoticeSnap(st);
    expect(prev[0]!.wouldNotice).toBe(true);
    expect(noticeImpactIds(st, prev)).toEqual([]);
  });

  it('punches on first chase edge only — latch blocks follow-up closer steps', () => {
    const near = stubEnemy('mite', 7, 5, { alerted: true });
    const st = stubState({ enemies: [near] });
    const latch = new Set<number>();
    const prev = captureNoticeSnap(st);
    near.x = 6;
    expect(enemyMovedCloser(prev[0]!, near, 5, 5)).toBe(true);
    expect(noticeImpactIds(st, prev, latch)).toEqual([1]);
    expect(latch.has(1)).toBe(true);

    const mid = captureNoticeSnap(st);
    near.x = 5; // closes again
    expect(enemyMovedCloser(mid[0]!, near, 5, 5)).toBe(true);
    expect(noticeImpactIds(st, mid, latch)).toEqual([]);
  });

  it('re-arms chase latch after fauna leaves notice', () => {
    const en = stubEnemy('mite', 6, 5, { alerted: true });
    const st = stubState({ enemies: [en] });
    const latch = new Set<number>([1]);
    en.x = 9; // leave notice
    expect(noticeImpactIds(st, captureNoticeSnap(st), latch)).toEqual([]);
    expect(latch.has(1)).toBe(false);

    const farSnap = captureNoticeSnap(st);
    en.x = 6; // re-enter notice
    expect(noticeImpactIds(st, farSnap, latch)).toEqual([1]);
  });

  it('stays quiet under jammer silence (no false Impact)', () => {
    const near = stubEnemy('mite', 9, 5);
    const base = stubState({});
    const st = stubState({
      enemies: [near],
      player: { ...base.player, x: 5, y: 5, jammerTurns: 5 },
    });
    const prev = captureNoticeSnap(st);
    near.x = 6;
    expect(noticeImpactIds(st, prev)).toEqual([]);
  });

  it('corridor empty of fauna → zero Impact', () => {
    const st = stubState({ enemies: [] });
    const prev = captureNoticeSnap(st);
    expect(noticeImpactIds(st, prev)).toEqual([]);
  });

  it('punches newly alerted ambush', () => {
    const amb = stubEnemy('skitter', 6, 5, { alerted: false });
    const st = stubState({ enemies: [amb] });
    const prev = captureNoticeSnap(st);
    amb.alerted = true;
    expect(noticeImpactIds(st, prev)).toContain(1);
  });
});

describe('PeekTeach', () => {
  it('shows once when wake threat visible early, then never after mark', () => {
    const near = stubEnemy('mite', 6, 5);
    const st = stubState({ enemies: [near], tutorialActive: true, sectorIndex: 0 });
    expect(peekTeachEligible(st)).toBe(true);
    expect(shouldShowPeekTeach(st)).toBe(true);
    markPeekTeachDone(st);
    expect(st.scriptedFired[PEEK_TEACH_SCRIPT]).toBe(true);
    expect(shouldShowPeekTeach(st)).toBe(false);
  });

  it('skips late campaign sectors', () => {
    const near = stubEnemy('mite', 6, 5);
    const st = stubState({ enemies: [near], sectorIndex: 5, tutorialActive: false });
    expect(shouldShowPeekTeach(st)).toBe(false);
  });

  it('yields to drill get/kit/hatch and combat coaching', () => {
    expect(peekTeachBlockedBy('UI-TUT-STALKER')).toBe(true);
    expect(peekTeachBlockedBy('UI-TUT-FIGHT')).toBe(true);
    expect(peekTeachBlockedBy('UI-HINT-TELE')).toBe(true);
    expect(peekTeachBlockedBy('UI-TUT-GET')).toBe(true);
    expect(peekTeachBlockedBy('UI-TUT-KIT')).toBe(true);
    expect(peekTeachBlockedBy('UI-TUT-GOTO-HATCH')).toBe(true);
    expect(peekTeachBlockedBy('UI-TUT-HAZARD')).toBe(true);
    expect(peekTeachBlockedBy('UI-TUT-MOVE')).toBe(false);
    expect(peekTeachBlockedBy(null)).toBe(false);

    const near = stubEnemy('mite', 6, 5);
    const st = stubState({ enemies: [near], tutorialActive: true, sectorIndex: 0 });
    expect(shouldShowPeekTeach(st, 'UI-TUT-STALKER')).toBe(false);
    expect(shouldShowPeekTeach(st, 'UI-HINT-TELE')).toBe(false);
    expect(shouldShowPeekTeach(st, 'UI-TUT-GET')).toBe(false);
    expect(shouldShowPeekTeach(st, 'UI-TUT-MOVE')).toBe(true);
    expect(shouldShowPeekTeach(st, null)).toBe(true);
  });
});

describe('fluid-lock copy', () => {
  it('help and controls teach WASD move, Shift peek, . wait — not confirm', () => {
    const body = LORE['UI-HELP-BODY'];
    const controls = LORE['UI-CONTROLS'];
    const tut = LORE['UI-TUT-MOVE'];
    const teach = LORE['UI-HINT-PEEK-TEACH'];
    for (const s of [body, controls, tut, teach]) {
      expect(s.toLowerCase()).not.toMatch(/queue/);
      expect(s.toLowerCase()).not.toMatch(/confirm/);
      expect(s.toLowerCase()).not.toMatch(/commits/);
    }
    expect(body).toMatch(/WASD/);
    expect(body).toMatch(/Shift/);
    expect(body).toMatch(/\. — wait/);
    expect(controls).toMatch(/WASD move/);
    expect(controls).toMatch(/Shift peek/);
    expect(controls).toMatch(/\. wait/);
    expect(tut).toMatch(/\. wait/);
    expect(teach).toMatch(/Shift\+dir/);
  });
});
