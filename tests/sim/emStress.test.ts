import { describe, expect, it } from 'vitest';
import { EM_HIGH, EM_WARN, emAggroBonus } from '../../src/sim/emStress';
import { combatArena } from './fixtures';

describe('emAggroBonus', () => {
  it('returns 0 below EM-HIGH (including warn tier)', () => {
    const st = combatArena();
    st.emStress = EM_WARN - 1;
    expect(emAggroBonus(st)).toBe(0);
    st.emStress = EM_WARN;
    expect(emAggroBonus(st)).toBe(0);
  });

  it('returns 1 at EM-HIGH', () => {
    const st = combatArena();
    st.emStress = EM_HIGH;
    expect(emAggroBonus(st)).toBe(1);
  });
});
