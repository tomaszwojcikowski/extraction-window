import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { isKitUseFailure, kitUseFeedback } from '../../src/game/presenters/KitFeedback';
import { pushLog } from '../../src/sim/log';
import { combatArena } from '../sim/fixtures';

describe('KitFeedback', () => {
  it('surfaces the latest kit-use failure from the log', () => {
    const st = combatArena();
    pushLog(st, 'LOG-WAIT');
    pushLog(st, 'LOG-USE-FAIL');
    expect(kitUseFeedback(st)).toBe(lore('LOG-USE-FAIL'));
  });

  it('detects a fresh failure after u', () => {
    const st = combatArena();
    const before = st.log.length;
    pushLog(st, 'LOG-USE-NO-POWER');
    expect(isKitUseFailure(st, before)).toBe(true);
  });
});
