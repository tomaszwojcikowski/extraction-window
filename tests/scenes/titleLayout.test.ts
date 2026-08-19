import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import {
  computeTitleLayout,
  formatMissionSeed,
  isTitleHelpKey,
  isTitleStartKey,
} from '../../src/scenes/titleLayout';

describe('titleLayout', () => {
  it('fits plates within the 960×640 frame', () => {
    const layout = computeTitleLayout(960, 640);
    expect(layout.window.w).toBe(540);
    expect(layout.footerPlate.y + layout.footerPlate.h).toBeLessThanOrEqual(640);
    expect(layout.beginPlate.y).toBeGreaterThan(layout.seedPlate.y + layout.seedPlate.h);
  });

  it('formats mission seed with zero padding', () => {
    expect(formatMissionSeed(42, lore('UI-SEED'))).toBe('MISSION  00042  /  Mission ID');
  });

  it('accepts Enter and Space to start', () => {
    expect(isTitleStartKey({ key: 'Enter', code: 'Enter' } as KeyboardEvent)).toBe(true);
    expect(isTitleStartKey({ key: ' ', code: 'Space' } as KeyboardEvent)).toBe(true);
    expect(isTitleStartKey({ key: 'a', code: 'KeyA' } as KeyboardEvent)).toBe(false);
  });

  it('maps ? to title help', () => {
    expect(isTitleHelpKey({ key: '?', shiftKey: false } as KeyboardEvent)).toBe(true);
    expect(isTitleHelpKey({ key: '/', shiftKey: true } as KeyboardEvent)).toBe(true);
  });
});
