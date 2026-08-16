import { describe, expect, it } from 'vitest';
import { enemyAttack, flankPenalty } from '../../src/sim/combat';
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
      surround(st, count);
      enemyAttack(st, st.enemies[0]!, 0);
      return 100 - st.player.hp;
    };

    expect(damageFrom(3)).toBeGreaterThan(damageFrom(1));
  });
});
