import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/sim';
import { hasBeamLine } from '../../src/sim/ai';
import { playerAttack } from '../../src/sim/combat';
import { tryShove } from '../../src/sim/shove';
import { manhattan } from '../../src/sim/spatial';
import { hasStatus } from '../../src/sim/status';
import type { GameState, TileKind } from '../../src/sim/types';
import { combatArena, lastLog, makeEnemy } from './fixtures';

function paint(st: GameState, x: number, y: number, kind: TileKind): void {
  st.tiles[y]![x] = {
    kind,
    walkable: kind !== 'wall',
    transparent: kind !== 'wall',
  };
}

/** Player at 5,5 with clear ground east so displacement is the only variable. */
function lane(): GameState {
  const st = combatArena();
  st.player.x = 5;
  st.player.y = 5;
  for (let x = 4; x <= 10; x++) paint(st, x, 5, 'floor');
  return st;
}

describe('shove', () => {
  it('drives an adjacent hostile back a tile without damaging it', () => {
    const st = lane();
    const enemy = makeEnemy({ kind: 'mite', x: 6, y: 5 });
    st.enemies = [enemy];

    expect(tryShove(st, 1, 0)).toBe(true);

    expect(enemy.x).toBe(7);
    expect(enemy.hp).toBe(enemy.maxHp);
    expect(lastLog(st, 'LOG-SHOVE')).toBeTruthy();
  });

  it('slams a hostile backed against cover, staggering it out of its windup', () => {
    const st = lane();
    paint(st, 7, 5, 'wall');
    const enemy = makeEnemy({ kind: 'mite', x: 6, y: 5, intent: 'pounce', windup: 1 });
    st.enemies = [enemy];

    tryShove(st, 1, 0);

    expect(enemy.x).toBe(6);
    expect(enemy.hp).toBeLessThan(enemy.maxHp);
    expect(hasStatus(enemy, 'stun')).toBe(true);
    expect(enemy.intent).toBeUndefined();
  });

  it('cannot chain slams into a permanent hold', () => {
    const st = lane();
    paint(st, 7, 5, 'wall');
    const enemy = makeEnemy({ kind: 'stalker', x: 6, y: 5, hp: 40, maxHp: 40 });
    st.enemies = [enemy];

    tryShove(st, 1, 0);
    const held = enemy.statuses.stun ?? 0;
    const afterFirst = enemy.hp;
    tryShove(st, 1, 0);

    // The second slam still lands, but it does not top the hold back up.
    expect(enemy.hp).toBeLessThan(afterFirst);
    expect(enemy.statuses.stun ?? 0).toBe(held);
  });

  it('throws a hostile into caustic ground for terrain damage', () => {
    const st = lane();
    paint(st, 7, 5, 'hazard');
    const enemy = makeEnemy({ kind: 'stalker', x: 6, y: 5, hp: 20, maxHp: 20 });
    st.enemies = [enemy];

    tryShove(st, 1, 0);

    expect(enemy.x).toBe(7);
    expect(enemy.hp).toBeLessThan(20);
    expect(lastLog(st, 'LOG-SHOVE-GROUND')).toBeTruthy();
  });

  it('bosses take the impact but keep their footing', () => {
    const st = lane();
    paint(st, 7, 5, 'wall');
    const boss = makeEnemy({ kind: 'shear_sovereign', x: 6, y: 5, tier: 'boss' });
    st.enemies = [boss];

    tryShove(st, 1, 0);

    expect(boss.hp).toBeLessThan(boss.maxHp);
    expect(hasStatus(boss, 'stun')).toBe(false);
  });

  it('drives a hostile into the one queued behind it, downing both', () => {
    const st = lane();
    const front = makeEnemy({ id: 1, kind: 'stalker', x: 6, y: 5, hp: 20, maxHp: 20 });
    const behind = makeEnemy({
      id: 2,
      kind: 'stalker',
      x: 7,
      y: 5,
      hp: 20,
      maxHp: 20,
      intent: 'pounce',
      windup: 1,
    });
    st.enemies = [front, behind];

    tryShove(st, 1, 0);

    expect(front.x).toBe(6);
    expect(front.hp).toBeLessThan(20);
    expect(behind.hp).toBeLessThan(20);
    expect(hasStatus(front, 'stun')).toBe(true);
    expect(hasStatus(behind, 'stun')).toBe(true);
    expect(behind.intent).toBeUndefined();
    expect(lastLog(st, 'LOG-SHOVE-COLLIDE')).toBeTruthy();
  });
});

describe('knocking a hostile off balance opens a punish window', () => {
  it('strikes harder against a hostile that has lost its footing', () => {
    const setup = (stunned: boolean) => {
      const st = lane();
      st.rng = () => 0.5;
      const enemy = makeEnemy({
        kind: 'stalker',
        x: 6,
        y: 5,
        hp: 60,
        maxHp: 60,
        statuses: stunned ? { stun: 2 } : {},
      });
      st.enemies = [enemy];
      playerAttack(st, enemy, 0);
      return 60 - enemy.hp;
    };

    expect(setup(true)).toBeGreaterThan(setup(false));
  });

  it('reports the opening so the setup turn reads as deliberate', () => {
    const st = lane();
    const enemy = makeEnemy({ kind: 'stalker', x: 6, y: 5, hp: 60, maxHp: 60, statuses: { stun: 2 } });
    st.enemies = [enemy];

    playerAttack(st, enemy, 0);

    expect(lastLog(st, 'LOG-PUNISH')).toBeTruthy();
  });
});

describe('shove is the answer to a windup already in reach', () => {
  it.each(['pounce', 'reach', 'zone', 'beam', 'overwatch'] as const)(
    'breaks a %s set',
    (intent) => {
      const st = lane();
      const enemy = makeEnemy({ kind: 'stalker', x: 6, y: 5, intent, windup: 1 });
      st.enemies = [enemy];

      tryShove(st, 1, 0);

      expect(enemy.windup).toBe(0);
      expect(enemy.intent).toBeUndefined();
    },
  );

  it('pushes a held sentinel out of the tiles it covers', () => {
    const st = lane();
    const sentinel = makeEnemy({ kind: 'sentinel', x: 6, y: 5, intent: 'overwatch', windup: 1 });
    st.enemies = [sentinel];

    tryShove(st, 1, 0);

    expect(manhattan(sentinel.x, sentinel.y, st.player.x, st.player.y)).toBe(2);
  });

  it('cannot reach a windup that is still at range — that is what brace is for', () => {
    const st = lane();
    const drone = makeEnemy({ kind: 'drone', x: 7, y: 5, intent: 'beam', windup: 1 });
    st.enemies = [drone];
    expect(hasBeamLine(st, drone)).toBe(true);

    expect(tryShove(st, 1, 0)).toBe(false);
    expect(drone.windup).toBe(1);
    expect(lastLog(st, 'LOG-SHOVE-EMPTY')).toBeTruthy();
  });
});

describe('shove input plumbing', () => {
  /** Held down so the enemy phase cannot move the target before assertions. */
  function inertEnemy(id: number, x: number, y: number) {
    return makeEnemy({ id, kind: 'mite', x, y, statuses: { stun: 9 } });
  }

  it('auto-picks the target when only one hostile is in reach', () => {
    const st = lane();
    const enemy = inertEnemy(1, 6, 5);
    st.enemies = [enemy];

    applyAction(st, { type: 'shove' });

    expect(enemy.x).toBe(7);
    expect(st.ui.aimingShove).toBe(false);
  });

  it('asks which way when two hostiles are in reach, then resolves on a direction', () => {
    const st = lane();
    paint(st, 5, 4, 'floor');
    paint(st, 5, 3, 'floor');
    const east = inertEnemy(1, 6, 5);
    const north = inertEnemy(2, 5, 4);
    st.enemies = [east, north];

    applyAction(st, { type: 'shove' });
    expect(st.ui.aimingShove).toBe(true);
    expect(east.x).toBe(6);

    applyAction(st, { type: 'move', dx: 1, dy: 0 });

    expect(st.ui.aimingShove).toBe(false);
    expect(east.x).toBe(7);
    // Aiming consumed the direction — the surveyor never took the step.
    expect(st.player.x).toBe(5);
  });

  it('spends no turn when nothing is in reach', () => {
    const st = lane();
    st.enemies = [];
    const turn = st.turn;

    applyAction(st, { type: 'shove' });

    expect(st.turn).toBe(turn);
    expect(lastLog(st, 'LOG-SHOVE-EMPTY')).toBeTruthy();
  });

  it('cancels a pending shove aim rather than leaving it armed', () => {
    const st = lane();
    paint(st, 5, 4, 'floor');
    st.enemies = [inertEnemy(1, 6, 5), inertEnemy(2, 5, 4)];

    applyAction(st, { type: 'shove' });
    expect(st.ui.aimingShove).toBe(true);

    applyAction(st, { type: 'close_ui' });
    expect(st.ui.aimingShove).toBe(false);
  });
});
