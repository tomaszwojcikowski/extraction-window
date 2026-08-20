import { describe, expect, it } from 'vitest';
import {
  computeTitleLayout,
  formatMissionSeed,
  isTitleHelpKey,
  isTitleStartKey,
} from '../../src/scenes/titleLayout';

describe('titleLayout', () => {
  it('keeps the hero window inside the frame', () => {
    const layout = computeTitleLayout(960, 640);
    expect(layout.window.w).toBe(520);
    expect(layout.controlsY).toBeLessThan(640);
    expect(layout.beginY).toBeGreaterThan(layout.seedY);
  });

  it('anchors plated strips for seed and begin CTAs', () => {
    const layout = computeTitleLayout(960, 640);
    expect(layout.seedPlate.w).toBeGreaterThan(0);
    expect(layout.beginPlate.y).toBe(layout.beginY - 14);
    expect(layout.footerY).toBe(600);
  });

  it('formats seed as zero-padded digits', () => {
    expect(formatMissionSeed(42)).toBe('00042');
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
