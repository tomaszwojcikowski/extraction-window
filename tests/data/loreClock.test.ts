import { describe, expect, it } from 'vitest';
import { LORE } from '../../src/data/lore';
import { findClockLies } from '../../src/data/loreClockGuard';

describe('lore clock guard', () => {
  it('player lore does not teach a Window turn timer', () => {
    expect(findClockLies(LORE)).toEqual([]);
  });
});
