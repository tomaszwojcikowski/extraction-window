import { describe, expect, it } from 'vitest';
import { EM_HIGH } from '../../src/sim/emStress';
import { applyPlayerDamage, KEEP_CALM_COOLDOWN } from '../../src/sim/playerDamage';
import { combatArena, fixedRng, lastLog } from './fixtures';

describe('EM keep-calm', () => {
  it('jams on a failed check after HP damage at EM_HIGH', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.armor = 0;
    st.emStress = EM_HIGH;
    st.rng = fixedRng([0]);
    applyPlayerDamage(st, 2, 'kinetic');
    expect(st.player.statuses.jam).toBe(2);
    expect(st.keepCalmCooldown).toBe(KEEP_CALM_COOLDOWN);
    expect(lastLog(st, 'LOG-KEEP-CALM-FAIL')).toBeTruthy();
  });

  it('skips when the filter is up', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.filterTurns = 5;
    st.emStress = EM_HIGH;
    st.rng = fixedRng([0]);
    applyPlayerDamage(st, 2, 'kinetic');
    expect(st.player.statuses.jam).toBeUndefined();
    expect(st.keepCalmCooldown).toBe(0);
  });

  it('does not re-fire during cooldown', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.emStress = EM_HIGH;
    st.keepCalmCooldown = 3;
    st.rng = fixedRng([0]);
    applyPlayerDamage(st, 2, 'kinetic');
    expect(st.player.statuses.jam).toBeUndefined();
    expect(st.keepCalmCooldown).toBe(3);
  });
});
