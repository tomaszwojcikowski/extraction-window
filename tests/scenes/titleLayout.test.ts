import { describe, expect, it } from 'vitest';
import {
  computeTitleLayout,
  formatMissionSeed,
  isTitleChangelogKey,
  isTitleHelpKey,
  isTitleStartKey,
} from '../../src/scenes/titleLayout';
import { GAME_VERSION } from '../../src/data/version';
import { lore } from '../../src/data/lore';

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

  it('maps c to the field bulletin', () => {
    expect(isTitleChangelogKey({ key: 'c' } as KeyboardEvent)).toBe(true);
    expect(isTitleChangelogKey({ key: 'C' } as KeyboardEvent)).toBe(true);
    expect(isTitleChangelogKey({ key: 'n' } as KeyboardEvent)).toBe(false);
  });
});

describe('field bulletin lore', () => {
  it('ships a versioned player-facing changelog body', () => {
    expect(GAME_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(lore('UI-CHANGELOG')).toContain('BULLETIN');
    expect(lore('UI-CHANGELOG-BODY')).toContain(GAME_VERSION);
    expect(lore('UI-CONTROLS-TITLE')).toContain('c bulletin');
  });
});
