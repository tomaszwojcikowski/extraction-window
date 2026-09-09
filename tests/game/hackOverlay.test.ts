import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/sim';
import { forceOpenHackLab } from '../../src/sim/mechanics/consoleHack';
import {
  formatHackContent,
  hackOverlayContent,
} from '../../src/game/presenters/HackOverlayContent';

describe('hack overlay content', () => {
  it('builds a session board from a live splice without mutating the buffer', () => {
    const st = createGame(42, { skipTutorial: true });
    forceOpenHackLab(st);
    const session = st.consoleHack!.session!;
    const before = session.buffer.length;
    const board = hackOverlayContent(st);
    expect(board?.kind).toBe('session');
    if (board?.kind !== 'session') return;
    expect(board.cells).toHaveLength(25);
    expect(board.target).toHaveLength(session.target.length);
    expect(board.buffer).toHaveLength(session.target.length);
    expect(board.tries).toBe(session.attempts);
    const cursor = board.cells.find((c) => c.cursor);
    expect(cursor).toMatchObject({ x: session.cursor.x, y: session.cursor.y });
    expect(board.cells.filter((c) => c.legal).length).toBeGreaterThan(0);
    expect(st.consoleHack!.session!.buffer.length).toBe(before);
    expect(formatHackContent(st)).toContain(board.badge);
  });

  it('payout board lists kit dump copy without closing the payout', () => {
    const st = createGame(7, { skipTutorial: true });
    forceOpenHackLab(st);
    st.consoleHack!.session = null;
    st.consoleHack!.payout = { items: ['Plate'], boosts: ['UI-HACK-PAY-POWER'] };
    const board = hackOverlayContent(st);
    expect(board?.kind).toBe('payout');
    if (board?.kind !== 'payout') return;
    expect(board.items.some((line) => line.includes('Plate'))).toBe(true);
    expect(board.boosts.length).toBe(1);
    expect(st.consoleHack!.payout).toEqual({ items: ['Plate'], boosts: ['UI-HACK-PAY-POWER'] });
  });
});
