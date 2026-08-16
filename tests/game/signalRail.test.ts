import { describe, expect, it } from 'vitest';
import { pushSignalRail, SIGNAL_RAIL_CAP } from '../../src/game/presenters/SignalRail';
import type { ActionFloat } from '../../src/game/presenters/ActionFeedback';

describe('SignalRail', () => {
  it('keeps the newest chips within the rail cap', () => {
    const a: ActionFloat = { label: 'A', color: '#fff' };
    const b: ActionFloat = { label: 'B', color: '#fff' };
    const c: ActionFloat = { label: 'C', color: '#fff' };
    const d: ActionFloat = { label: 'D', color: '#fff' };
    const rail = pushSignalRail([a], [b, c, d]);
    expect(rail).toHaveLength(SIGNAL_RAIL_CAP);
    expect(rail.map((s) => s.label)).toEqual(['B', 'C', 'D']);
  });

  it('ignores empty batches', () => {
    const a: ActionFloat = { label: 'A', color: '#fff' };
    expect(pushSignalRail([a], [])).toEqual([a]);
  });
});
