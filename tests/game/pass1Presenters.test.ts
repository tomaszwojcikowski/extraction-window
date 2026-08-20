import { describe, expect, it } from 'vitest';
import { EM_HIGH } from '../../src/sim/emStress';
import { pressureRevealAt } from '../../src/game/presenters/PressureReveal';
import { computeShearPressure, shearReadoutLabel } from '../../src/game/presenters/ShearPressure';
import { shearAccentStrip, shearFlashMs } from '../../src/game/presenters/ShearReadout';
import { wouldNoticeEnemy } from '../../src/sim/notice';
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
  it('starts Calm at full Power and low EM', () => {
    const spec = computeShearPressure(stubState({}));
    expect(spec.value).toBe(0);
    expect(spec.state).toBe('Calm');
    expect(spec.drainingLeg).toBe('both');
  });

  it('maps Power + EM blend to named thresholds', () => {
    const charged = computeShearPressure(
      stubState({ emStress: 40, player: { ...stubState({}).player, energy: 70 } }),
    );
    expect(charged.state).toBe('Charged');
    expect(charged.value).toBeGreaterThanOrEqual(0.25);
    expect(charged.value).toBeLessThan(0.5);

    const breaching = computeShearPressure(
      stubState({ emStress: EM_HIGH, player: { ...stubState({}).player, energy: 5 } }),
    );
    expect(breaching.state).toBe('Breaching');
    expect(breaching.value).toBeGreaterThanOrEqual(0.75);
    expect(breaching.drainingLeg).toBe('bus');
  });

  it('names EM as draining leg when Power is full and scan pressure high', () => {
    const spec = computeShearPressure(
      stubState({ emStress: EM_HIGH, player: { ...stubState({}).player, energy: 100 } }),
    );
    expect(spec.drainingLeg).toBe('em');
  });
});

describe('shearReadoutLabel', () => {
  it('names the leading clock and severity, not a Shear resource', () => {
    const busLed = computeShearPressure(
      stubState({ player: { ...stubState({}).player, energy: 10 } }),
    );
    expect(shearReadoutLabel(busLed)).toBe('POWER  LOW');

    const emLed = computeShearPressure(
      stubState({ emStress: EM_HIGH, player: { ...stubState({}).player, energy: 100 } }),
    );
    expect(shearReadoutLabel(emLed)).toBe('EM  LOW');
  });
});

describe('shearAccentStrip', () => {
  it('sits left of the label plate so colour reads before text', () => {
    const strip = shearAccentStrip(960, 80, 12, 'Charged');
    expect(strip.x).toBeLessThan(960 / 2 - 40);
    expect(strip.w).toBe(4);
    expect(shearAccentStrip(960, 80, 12, 'Breaching').w).toBe(5);
    expect(shearFlashMs('Breaching')).toBeGreaterThan(shearFlashMs('Arcing'));
  });
});

describe('wouldNoticeEnemy (sim notice — presentation wake lines removed)', () => {
  it('notices dark-prefer mites in range', () => {
    const st = stubState({
      enemies: [stubEnemy('mite', 6, 5)],
    });
    expect(wouldNoticeEnemy(st, st.enemies[0]!, 5, 5)).toBe(true);
  });

  it('guard engage gate: no notice beyond dist 2 without loot or alert', () => {
    const st = stubState({
      enemies: [stubEnemy('crawler', 9, 5)],
    });
    expect(wouldNoticeEnemy(st, st.enemies[0]!, 5, 5)).toBe(false);
  });

  it('guard engage gate: notices at dist 2', () => {
    const st = stubState({
      enemies: [stubEnemy('crawler', 7, 5)],
    });
    expect(wouldNoticeEnemy(st, st.enemies[0]!, 5, 5)).toBe(true);
  });

  it('guard alerted extends engage to aggro range', () => {
    const st = stubState({
      enemies: [stubEnemy('crawler', 9, 5, { alerted: true })],
    });
    expect(wouldNoticeEnemy(st, st.enemies[0]!, 5, 5)).toBe(true);
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
    st.emStress = 35;
    st.player.energy = 45;
    const arcing = computeShearPressure(st);
    expect(arcing.state).toBe('Arcing');
    const reveal = pressureRevealAt(st, arcing, 7, 3, 2);
    expect(reveal).not.toBeNull();
    expect(reveal!.visible).toBe(true);
    expect(reveal!.urgent).toBe(false);
    expect(reveal!.sectorId).toBe(st.sectorId);
  });

  it('skips unseen or unexplored tiles — no ESP reveal', () => {
    const st = questTileState();
    const arcing = computeShearPressure(
      stubState({ emStress: EM_HIGH, player: { ...stubState({}).player, energy: 5 } }),
    );
    st.emStress = EM_HIGH;
    st.player.energy = 5;
    st.visible[3]![7] = false;
    expect(pressureRevealAt(st, arcing, 7, 3, 0)).toBeNull();
  });

  it('returns null for exit tiles at all shear states — mandatory path stays stable', () => {
    const st = stubState({});
    st.tiles[3]![7] = { kind: 'exit', walkable: true, transparent: true };
    st.emStress = EM_HIGH;
    st.player.energy = 5;
    const breaching = computeShearPressure(st);
    expect(breaching.state).toBe('Breaching');
    for (let frame = 0; frame < 6; frame++) {
      expect(pressureRevealAt(st, breaching, 7, 3, frame)).toBeNull();
    }
  });

  it('marks Breaching cracks urgent so the hot motif holds', () => {
    const st = questTileState();
    st.emStress = EM_HIGH;
    st.player.energy = 5;
    const breaching = computeShearPressure(st);
    expect(breaching.state).toBe('Breaching');
    const reveal = pressureRevealAt(st, breaching, 7, 3, 0);
    expect(reveal).not.toBeNull();
    expect(reveal!.urgent).toBe(true);
    expect(reveal!.visible).toBe(true);
    expect(reveal!.alpha).toBeGreaterThan(0.9);
  });
});
