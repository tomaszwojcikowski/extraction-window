import { describe, expect, it } from 'vitest';
import { enemyAttack, flankPenalty } from '../../src/sim/combat';
import { flankBoxTiles, incomingFlankSeats, moveEnemies } from '../../src/sim/ai';
import type { GameState } from '../../src/sim/types';
import { combatArena, makeEnemy } from './fixtures';

/** Player at 5,5 with open floor on every side. */
function openFloor(): GameState {
  const st = combatArena();
  st.player.x = 5;
  st.player.y = 5;
  for (let y = 3; y <= 7; y++) {
    for (let x = 3; x <= 7; x++) {
      st.tiles[y]![x] = { kind: 'floor', walkable: true, transparent: true };
    }
  }
  return st;
}

const RING = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function surround(st: GameState, count: number): void {
  st.enemies = RING.slice(0, count).map(([dx, dy], i) =>
    makeEnemy({ id: 100 + i, kind: 'mite', x: st.player.x + dx, y: st.player.y + dy }),
  );
}

describe('being surrounded pries defence open', () => {
  it('costs nothing for a single hostile in contact', () => {
    const st = openFloor();
    surround(st, 1);
    expect(flankPenalty(st)).toBe(0);
  });

  it('scales with each hostile past the first', () => {
    const st = openFloor();
    surround(st, 2);
    expect(flankPenalty(st)).toBe(1);
    surround(st, 3);
    expect(flankPenalty(st)).toBe(2);
    surround(st, 4);
    expect(flankPenalty(st)).toBe(3);
  });

  it('caps so a swarm is a reason to move, not an instant death', () => {
    const st = openFloor();
    surround(st, 4);
    expect(flankPenalty(st)).toBe(3);
  });

  it('ignores hostiles that are near but not in contact', () => {
    const st = openFloor();
    st.enemies = [
      makeEnemy({ id: 1, kind: 'mite', x: 6, y: 5 }),
      makeEnemy({ id: 2, kind: 'mite', x: 7, y: 5 }),
      makeEnemy({ id: 3, kind: 'mite', x: 5, y: 3 }),
    ];
    expect(flankPenalty(st)).toBe(0);
  });

  it('ignores the dead', () => {
    const st = openFloor();
    surround(st, 3);
    st.enemies[1]!.alive = false;
    expect(flankPenalty(st)).toBe(1);
  });

  it('lands harder hits than the same attacker would alone', () => {
    const damageFrom = (count: number): number => {
      const st = openFloor();
      st.player.hp = 100;
      st.player.maxHp = 100;
      st.illumination[st.player.y]![st.player.x] = 0.9;
      surround(st, count);
      enemyAttack(st, st.enemies[0]!, 0);
      return 100 - st.player.hp;
    };

    expect(damageFrom(3)).toBeGreaterThan(damageFrom(1));
  });
});

describe('packs take empty contact seats', () => {
  it('two hunters from a line occupy different adjacent tiles', () => {
    const st = openFloor();
    st.enemies = [
      makeEnemy({ id: 1, kind: 'crawler', x: 8, y: 5, alerted: true }),
      makeEnemy({ id: 2, kind: 'crawler', x: 9, y: 5, alerted: true }),
    ];
    for (let i = 0; i < 10; i++) moveEnemies(st);
    const adj = st.enemies.filter(
      (e) => e.alive && Math.abs(e.x - st.player.x) + Math.abs(e.y - st.player.y) === 1,
    );
    expect(adj).toHaveLength(2);
    expect(new Set(adj.map((e) => `${e.x},${e.y}`)).size).toBe(2);
    expect(flankPenalty(st)).toBe(1);
  });

  it('a third hunter queues instead of filling every side', () => {
    const st = openFloor();
    st.enemies = [
      makeEnemy({ id: 1, kind: 'crawler', x: 8, y: 5, alerted: true }),
      makeEnemy({ id: 2, kind: 'crawler', x: 5, y: 8, alerted: true }),
      makeEnemy({ id: 3, kind: 'crawler', x: 5, y: 2, alerted: true }),
    ];
    for (let i = 0; i < 10; i++) moveEnemies(st);
    const adj = st.enemies.filter(
      (e) => e.alive && Math.abs(e.x - st.player.x) + Math.abs(e.y - st.player.y) === 1,
    );
    expect(adj).toHaveLength(2);
    expect(flankPenalty(st)).toBe(1);
  });
});

function revealAround(st: GameState): void {
  for (let y = 2; y <= 8; y++) {
    for (let x = 2; x <= 9; x++) {
      if (st.visible[y]) st.visible[y]![x] = true;
    }
  }
}

describe('pack seats are a spatial question', () => {
  it('does not paint a 1v1 approach', () => {
    const st = openFloor();
    revealAround(st);
    st.enemies = [makeEnemy({ id: 1, kind: 'crawler', x: 8, y: 5, alerted: true })];
    expect(incomingFlankSeats(st)).toHaveLength(0);
    expect(flankBoxTiles(st)).toHaveLength(0);
  });

  it('paints two distinct seats when hunters approach from two sides', () => {
    const st = openFloor();
    revealAround(st);
    st.enemies = [
      makeEnemy({ id: 1, kind: 'crawler', x: 8, y: 5, alerted: true }),
      makeEnemy({ id: 2, kind: 'crawler', x: 5, y: 8, alerted: true }),
    ];
    const seats = incomingFlankSeats(st);
    expect(seats.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seats.map((s) => `${s.x},${s.y}`)).size).toBe(seats.length);
    expect(seats.every((s) => Math.abs(s.x - st.player.x) + Math.abs(s.y - st.player.y) === 1)).toBe(
      true,
    );
  });

  it('boxes occupied contact tiles once peel is live', () => {
    const st = openFloor();
    surround(st, 2);
    expect(flankBoxTiles(st)).toHaveLength(2);
    expect(incomingFlankSeats(st)).toHaveLength(0);
  });
});
