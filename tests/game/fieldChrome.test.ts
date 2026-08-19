import { describe, expect, it } from 'vitest';
import { resetEphemeralFieldChrome } from '../../src/game/presenters/FieldChrome';

describe('resetEphemeralFieldChrome', () => {
  it('clears preference hints and signal rail on level change', () => {
    const recentSignals = [{ label: 'old beat', color: '#ffffff' }];
    const chrome = {
      lightPreferenceHints: new Set([1, 2, 3]),
      preferenceHint: {
        id: 'UI-HINT-PREFER-DARK' as const,
        until: 999_999,
      },
      recentSignals,
    };
    resetEphemeralFieldChrome(chrome);
    expect(chrome.lightPreferenceHints.size).toBe(0);
    expect(chrome.preferenceHint).toBeNull();
    expect(chrome.recentSignals).toEqual([]);
    expect(chrome.recentSignals).toBe(recentSignals);
  });
});
