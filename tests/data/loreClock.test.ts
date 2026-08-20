import { describe, expect, it } from 'vitest';
import { LORE } from '../../src/data/lore';
import { findClockLies, findPeekLies } from '../../src/data/loreClockGuard';

describe('lore clock guard', () => {
  it('player lore does not teach a Window turn timer', () => {
    expect(findClockLies(LORE)).toEqual([]);
  });

  it('player lore does not teach Shift-peek or confirm-on-`.`', () => {
    expect(findPeekLies(LORE)).toEqual([]);
  });
});
