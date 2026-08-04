import { describe, expect, it } from 'vitest';
import { EM_HIGH, EM_WARN, emAggroBonus } from '../../src/sim/emStress';
import { combatArena } from './fixtures';

describe('emAggroBonus / quiet stance', () => {
  it('returns 0 below EM warn', () => {
    const st = combatArena();
    st.emStress = EM_WARN - 1;
    st.player.jammerTurns = 0;
    expect(emAggroBonus(st)).toBe(0);
  });

  it('returns 1 at EM warn / high without quiet', () => {
    const st = combatArena();
    st.emStress = EM_WARN;
    st.player.jammerTurns = 0;
    expect(emAggroBonus(st)).toBe(1);
    st.emStress = EM_HIGH;
    expect(emAggroBonus(st)).toBe(1);
  });

  it('suppresses EM-HIGH bump while quiet stance is active', () => {
    const st = combatArena();
    st.emStress = EM_HIGH;
    st.player.jammerTurns = 5;
    expect(emAggroBonus(st)).toBe(0);
  });

  it('does not suppress warn-tier bump with quiet (only EM-HIGH)', () => {
    const st = combatArena();
    st.emStress = EM_WARN;
    st.player.jammerTurns = 5;
    expect(emAggroBonus(st)).toBe(1);
  });
});
