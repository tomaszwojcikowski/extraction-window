import { describe, expect, it } from 'vitest';
import { LIGHT_TEMP } from '../../src/sim/light';
import { HANDSHAKE_TURNS } from '../../src/sim/mechanics/beaconHandshake';
import { createGame } from '../../src/sim';
import { Theme } from '../../src/scenes/theme';
import { handshakePadView } from '../../src/game/presenters/handshakeTells';

describe('handshakePadView', () => {
  it('is empty until the splice is live', () => {
    const st = createGame(42, { skipTutorial: true });
    st.beaconPos = { x: 4, y: 4 };
    st.explored[4]![4] = true;
    expect(handshakePadView(st, 0)).toBeNull();
  });

  it('ticks stages as handshake progress climbs', () => {
    const st = createGame(42, { skipTutorial: true });
    st.beaconPos = { x: 4, y: 4 };
    st.explored[4]![4] = true;
    st.visible[4]![4] = true;
    st.handshake = { active: true, progress: 0 };
    const start = handshakePadView(st, 0);
    expect(start).not.toBeNull();
    expect(start!.x).toBe(4);
    expect(start!.y).toBe(4);
    expect(start!.stages).toHaveLength(HANDSHAKE_TURNS);
    expect(start!.stages[0]).toMatchObject({ filled: false, hot: true, color: LIGHT_TEMP.beacon });

    st.handshake.progress = 1;
    const mid = handshakePadView(st, 0)!;
    expect(mid.stages[0]).toMatchObject({ filled: true, hot: false, color: Theme.safe });
    expect(mid.stages[1]).toMatchObject({ filled: false, hot: true, color: LIGHT_TEMP.beacon });

    st.handshake.progress = HANDSHAKE_TURNS;
    const done = handshakePadView(st, 0)!;
    expect(done.stages.every((s) => s.filled && !s.hot)).toBe(true);
  });

  it('stays quiet on an unexplored pad', () => {
    const st = createGame(42, { skipTutorial: true });
    st.beaconPos = { x: 4, y: 4 };
    st.explored[4]![4] = false;
    st.visible[4]![4] = false;
    st.handshake = { active: true, progress: 1 };
    expect(handshakePadView(st, 0)).toBeNull();
  });
});
