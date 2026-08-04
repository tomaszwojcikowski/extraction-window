import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { ENEMIES } from '../../src/data/enemies';
import {
  addStatus,
  statusHud,
  tickEnemyStatusEffects,
  tickPlayerStatusEffects,
} from '../../src/sim/status';
import { combatArena, lastLog, makeEnemy } from './fixtures';

describe('statusHud', () => {
  it('formats active status badges', () => {
    expect(statusHud({ stun: 1, bleed: 3, ion_burn: 2, expose: 4 })).toBe(
      'STN1 BLD3 PLS2 XPS4',
    );
    expect(statusHud({})).toBe('');
  });
});

describe('tickPlayerStatusEffects', () => {
  it('bleed bypasses armor and logs rem hp', () => {
    const st = combatArena();
    st.player.hp = 10;
    st.player.maxHp = 20;
    st.player.armor = 8;
    addStatus(st.player, 'bleed', 2);
    tickPlayerStatusEffects(st);
    expect(st.player.hp).toBe(8);
    expect(st.player.armor).toBe(8);
    expect(lastLog(st, 'LOG-STATUS-BLEED')?.detail).toBe('bleed · -2 · 8/20 hp');
    expect(st.player.statuses.bleed).toBe(1);
  });

  it('ion burn drains EPS; filter softens', () => {
    const st = combatArena();
    st.player.energy = 30;
    addStatus(st.player, 'ion_burn', 2);
    tickPlayerStatusEffects(st);
    expect(st.player.energy).toBe(27);
    expect(lastLog(st, 'LOG-STATUS-ION')?.detail).toBe('-3E · 27 EPS');

    st.log = [];
    st.player.filterTurns = 2;
    addStatus(st.player, 'ion_burn', 2);
    tickPlayerStatusEffects(st);
    expect(st.player.energy).toBe(26);
    expect(lastLog(st, 'LOG-STATUS-ION')?.detail).toBe('-1E · 26 EPS');
  });
});

describe('tickEnemyStatusEffects', () => {
  it('status kill credits player via killEnemy', () => {
    const st = combatArena();
    const foe = makeEnemy({ kind: 'mite', hp: 2, maxHp: 3 });
    st.enemies = [foe];
    addStatus(foe, 'bleed', 2);
    const xp = st.xp;
    tickEnemyStatusEffects(st, foe);
    expect(foe.alive).toBe(false);
    expect(st.xp).toBeGreaterThan(xp);
    expect(lastLog(st, 'LOG-KILL')?.detail).toBe(lore(ENEMIES.mite.loreName));
  });

  it('stun clears windup without damaging', () => {
    const st = combatArena();
    const foe = makeEnemy({ kind: 'stalker', hp: 10, windup: 1 });
    st.enemies = [foe];
    addStatus(foe, 'stun', 1);
    tickEnemyStatusEffects(st, foe);
    expect(foe.windup).toBe(0);
    expect(foe.hp).toBe(10);
    expect(foe.alive).toBe(true);
  });
});
