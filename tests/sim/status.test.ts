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
import { visionRadius } from '../../src/sim/vision';
import { emEnergyTax, EM_HIGH } from '../../src/sim/emStress';
import { applyAction } from '../../src/sim';

describe('statusHud', () => {
  it('formats active status badges including Wave-1 statuses', () => {
    expect(statusHud({ stun: 1, bleed: 3, ion_burn: 2, expose: 4 })).toBe(
      'Stun 1 · Bleed 3 · Burn 2 · Exposed 4',
    );
    expect(statusHud({ blind: 2, jam: 1, fatigue: 3, marked: 4 })).toBe(
      'Blind 2 · Jam 1 · Fatigue 3 · Marked 4',
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

  it('ablative vest softens bleed damage to 1', () => {
    const st = combatArena();
    st.player.hp = 10;
    st.player.maxHp = 20;
    st.player.equip.armor = 'ablative_vest';
    addStatus(st.player, 'bleed', 2);
    tickPlayerStatusEffects(st);
    expect(st.player.hp).toBe(9);
    expect(lastLog(st, 'LOG-STATUS-BLEED')?.detail).toBe('bleed · -1 · 9/20 hp');
  });

  it('ion burn drains bus; filter softens', () => {
    const st = combatArena();
    st.player.energy = 30;
    addStatus(st.player, 'ion_burn', 2);
    tickPlayerStatusEffects(st);
    expect(st.player.energy).toBe(27);
    expect(lastLog(st, 'LOG-STATUS-ION')?.detail).toBe('-3 Bus · 27 left');

    st.log = [];
    st.player.filterTurns = 2;
    addStatus(st.player, 'ion_burn', 2);
    tickPlayerStatusEffects(st);
    expect(st.player.energy).toBe(26);
    expect(lastLog(st, 'LOG-STATUS-ION')?.detail).toBe('-1 Bus · 26 left');
  });
});

describe('Wave-1 status effects', () => {
  it('quiet stance trades two FOV tiles for reduced attention', () => {
    const st = combatArena();
    const clear = visionRadius(st);
    st.player.jammerTurns = 5;
    expect(visionRadius(st)).toBe(Math.max(3, clear - 2));
  });

  it('blind shrinks FOV; sensor_rig softens the penalty', () => {
    const st = combatArena();
    const clear = visionRadius(st);
    addStatus(st.player, 'blind', 2);
    expect(visionRadius(st)).toBe(Math.max(2, clear - 2));
    st.player.equip.utility = 'sensor_rig';
    expect(visionRadius(st)).toBe(Math.max(2, clear + 1 - 1));
  });

  it('jam blocks probe and jammer without consuming', () => {
    const st = combatArena();
    addStatus(st.player, 'jam', 2);
    const probeBefore = st.inventory.find((s) => s.kind === 'probe')?.count ?? 0;
    st.ui.selectedSlot = st.inventory.findIndex((s) => s.kind === 'probe');
    const turnBefore = st.turn;
    applyAction(st, { type: 'use' });
    expect(st.turn).toBe(turnBefore);
    expect(st.inventory.find((s) => s.kind === 'probe')?.count).toBe(probeBefore);
    expect(lastLog(st, 'LOG-JAM-BLOCK')).toBeTruthy();
  });

  it('fatigue taxes energy; harness cancels', () => {
    const st = combatArena();
    st.player.energy = 40;
    addStatus(st.player, 'fatigue', 3);
    const before = st.player.energy;
    applyAction(st, { type: 'wait' });
    // wait ends turn — fatigue tax applies (plus normal drip may apply)
    expect(st.player.energy).toBeLessThan(before);
    const taxed = before - st.player.energy;

    const st2 = combatArena();
    st2.player.energy = 40;
    st2.player.equip.armor = 'harness';
    addStatus(st2.player, 'fatigue', 3);
    const before2 = st2.player.energy;
    applyAction(st2, { type: 'wait' });
    const taxed2 = before2 - st2.player.energy;
    expect(taxed2).toBeLessThan(taxed);
  });

  it('eps_coupler zeroes EM energy tax', () => {
    const st = combatArena();
    st.emStress = EM_HIGH;
    st.player.equip.utility = 'eps_coupler';
    expect(emEnergyTax(st)).toBe(0);
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
