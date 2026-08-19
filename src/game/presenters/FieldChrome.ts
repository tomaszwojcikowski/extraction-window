import type { ActionFloat } from './ActionFeedback';

export type LightPreferenceHint = {
  id: 'UI-HINT-PREFER-DARK' | 'UI-HINT-PREFER-LIT';
  until: number;
};

/** Scene-owned coaching that must not carry across sector / map reloads. */
export type EphemeralFieldChrome = {
  lightPreferenceHints: Set<number>;
  preferenceHint: LightPreferenceHint | null;
  recentSignals: ActionFloat[];
};

export function resetEphemeralFieldChrome(chrome: EphemeralFieldChrome): void {
  chrome.lightPreferenceHints.clear();
  chrome.preferenceHint = null;
  // Mutate in place — GameScene holds the same array reference.
  chrome.recentSignals.length = 0;
}
