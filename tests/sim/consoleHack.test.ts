import { describe, expect, it } from 'vitest';
import { createGame, applyAction } from '../../src/sim';
import { mulberry32 } from '../../src/sim/rng';
import {
  HACK_LEN,
  HACK_TRIES,
  canPickHackCell,
  forceOpenHackLab,
  generateHackSession,
  hackHasSolution,
  hackLaneCells,
  nextHackGlyph,
} from '../../src/sim/mechanics/consoleHack';

describe('lattice lock', () => {
  it('generates a solvable lock for many seeds', () => {
    for (const seed of [1, 7, 42, 99, 256, 777, 1337, 4096, 9999]) {
      const session = generateHackSession(mulberry32(seed));
      expect(session.target).toHaveLength(HACK_LEN);
      expect(session.attempts).toBe(HACK_TRIES);
      expect(hackHasSolution(session.grid, session.target), `seed=${seed}`).toBe(true);
    }
  });

  it('opens on the planted terminal and aborts without a payout', () => {
    const st = createGame(42);
    const energy = st.player.energy;
    const kit = st.inventory.length;
    forceOpenHackLab(st);
    expect(st.tiles[st.player.y]![st.player.x]!.kind).toBe('console');
    expect(st.consoleHack?.session).toBeTruthy();
    applyAction(st, { type: 'hack_abort' });
    expect(st.consoleHack?.session).toBeNull();
    expect(st.consoleHack?.done).toBe(false);
    expect(st.player.energy).toBe(energy);
    expect(st.inventory.length).toBe(kit);
  });

  it('wraps the cursor and stays on the legal lane after the first splice', () => {
    const st = createGame(1);
    forceOpenHackLab(st);
    const session = st.consoleHack!.session!;
    session.cursor = { x: 0, y: 0 };
    applyAction(st, { type: 'hack_move', dx: -1, dy: 0 });
    expect(session.cursor).toEqual({ x: 4, y: 0 });
    applyAction(st, { type: 'hack_move', dx: 1, dy: 0 });
    expect(session.cursor).toEqual({ x: 0, y: 0 });
    applyAction(st, { type: 'hack_pick' });
    expect(session.last).toEqual({ x: 0, y: 0 });
    expect(session.axis).toBe('col');
    expect(session.cursor.x).toBe(0);
    expect(session.cursor.y).not.toBe(0);
    applyAction(st, { type: 'hack_move', dx: 1, dy: 0 });
    expect(session.cursor.x).toBe(0);
    expect(st.consoleHack?.note).toBe('blocked');
    const y = session.cursor.y;
    applyAction(st, { type: 'hack_move', dx: 0, dy: 1 });
    expect(session.cursor).toEqual({ x: 0, y: (y + 1) % 5 });
    expect(canPickHackCell(session, session.cursor.x, session.cursor.y)).toBe(true);
    expect(hackLaneCells(session).every((p) => p.x === 0)).toBe(true);
    expect(nextHackGlyph(session)).toBe(session.target[1]);
  });

  it('pays a heavy kit dump when the target sequence is spliced', () => {
    const st = createGame(99);
    st.player.energy = 10;
    st.player.armor = 0;
    st.emStress = 20;
    forceOpenHackLab(st);
    const session = st.consoleHack!.session!;
    const path: Array<{ x: number; y: number }> = [];
    const walk = (
      x: number,
      y: number,
      axis: 'row' | 'col',
      depth: number,
      used: Set<string>,
    ): boolean => {
      if (session.grid[y]![x] !== session.target[depth]) return false;
      if (depth + 1 >= session.target.length) {
        path.push({ x, y });
        return true;
      }
      const mark = `${x},${y}`;
      used.add(mark);
      const next = axis === 'col' ? 'row' : 'col';
      if (axis === 'col') {
        for (let ny = 0; ny < session.grid.length; ny++) {
          if (!used.has(`${x},${ny}`) && walk(x, ny, next, depth + 1, used)) {
            path.push({ x, y });
            return true;
          }
        }
      } else {
        for (let nx = 0; nx < session.grid.length; nx++) {
          if (!used.has(`${nx},${y}`) && walk(nx, y, next, depth + 1, used)) {
            path.push({ x, y });
            return true;
          }
        }
      }
      used.delete(mark);
      return false;
    };
    let found = false;
    for (let y = 0; y < session.grid.length && !found; y++) {
      for (let x = 0; x < session.grid.length && !found; x++) {
        if (walk(x, y, 'col', 0, new Set())) found = true;
      }
    }
    expect(found).toBe(true);
    for (const cell of path.reverse()) {
      session.cursor = cell;
      applyAction(st, { type: 'hack_pick' });
    }
    expect(st.consoleHack?.done).toBe(true);
    expect(st.consoleHack?.session).toBeNull();
    expect(st.player.energy).toBeGreaterThan(10);
    expect(st.player.armor).toBe(st.player.maxArmor);
    expect(st.log.some((l) => l.loreId === 'LOG-HACK-OK')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-PICKUP')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-CODEX')).toBe(true);
  });

  it('taxes Power and EM on a wrong buffer, then lockouts', () => {
    const st = createGame(3);
    forceOpenHackLab(st);
    const energy = st.player.energy;
    const bounce = (): void => {
      const s = st.consoleHack?.session;
      if (!s) return;
      s.buffer = [1, 1, 1];
      s.target = [0, 0, 0, 0];
      s.last = { x: 0, y: 0 };
      s.axis = 'row';
      s.cursor = { x: 1, y: 0 };
      s.used = s.used.map((row) => row.map(() => false));
      s.used[0]![0] = true;
      s.grid[0]![1] = 1;
      applyAction(st, { type: 'hack_pick' });
    };
    bounce();
    bounce();
    bounce();
    expect(st.player.energy).toBeLessThan(energy);
    expect(st.emStress).toBeGreaterThan(0);
    expect(st.consoleHack?.done).toBe(true);
    expect(st.consoleHack?.session).toBeNull();
    expect(st.log.some((l) => l.loreId === 'LOG-HACK-LOCK')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-HACK-OK')).toBe(false);
  });
});
