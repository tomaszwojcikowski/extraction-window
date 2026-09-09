import { describe, expect, it } from 'vitest';
import { Theme } from '../../src/scenes/theme';
import { minimapGoalPos, minimapSketch } from '../../src/game/presenters/MinimapContent';
import { createGame } from '../../src/sim';

describe('minimap sketch', () => {
  it('marks the surveyor and explored floor without mutating the map', () => {
    const st = createGame(42, { skipTutorial: true });
    const before = st.explored[st.player.y]![st.player.x];
    const sketch = minimapSketch(st);
    expect(sketch.width).toBe(st.width);
    expect(sketch.pips.some((p) => p.x === st.player.x && p.y === st.player.y && p.color === Theme.flag)).toBe(
      true,
    );
    expect(sketch.cells.length).toBeGreaterThan(0);
    expect(st.explored[st.player.y]![st.player.x]).toBe(before);
  });

  it('rings the local goal once that cell is explored', () => {
    const st = createGame(42, { skipTutorial: true });
    const goal = minimapGoalPos(st);
    if (!goal) {
      st.player.mapperTurns = 40;
    }
    const pos = minimapGoalPos(st);
    expect(pos).not.toBeNull();
    const sketch = minimapSketch(st);
    expect(sketch.rings.some((r) => r.x === pos!.x && r.y === pos!.y && r.color === Theme.flag)).toBe(true);
  });
});
