import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/sim';
import { applyPlayerDamage } from '../../src/sim/combat';
import { addStatus, tickPlayerStatusEffects } from '../../src/sim/status';
import { combatArena, fixedRng, lastLog, makeEnemy } from './fixtures';
import { checkLose, endPlayerTurn } from '../../src/sim/turn';

describe('downed overflow', () => {
  it('failed save sets downed and does not lose yet', () => {
    const st = combatArena();
    st.player.hp = 3;
    st.player.def = 0;
    st.rng = fixedRng([0.99]);
    applyPlayerDamage(st, 8, 'kinetic', { source: 'Scar Mite' });
    expect(st.player.hp).toBe(0);
    expect(st.player.statuses.downed).toBe(3);
    expect(lastLog(st, 'LOG-DOWNED')).toBeTruthy();
    checkLose(st);
    expect(st.status).toBe('playing');
  });

  it('successful save leaves 1 HP and expose', () => {
    const st = combatArena();
    st.player.hp = 3;
    st.player.def = 0;
    st.rng = fixedRng([0]);
    applyPlayerDamage(st, 8, 'kinetic', { source: 'Scar Mite' });
    expect(st.player.hp).toBe(1);
    expect(st.player.statuses.downed).toBeUndefined();
    expect(st.player.statuses.expose).toBe(4);
    expect(lastLog(st, 'LOG-CRIT-SAVE')).toBeTruthy();
  });

  it('hits while downed shorten the clock without a re-save', () => {
    const st = combatArena();
    st.player.hp = 0;
    st.player.statuses = { downed: 3 };
    applyPlayerDamage(st, 6, 'kinetic', { source: 'Scar Mite' });
    expect(st.player.hp).toBe(0);
    expect(st.player.statuses.downed).toBe(2);
    expect(lastLog(st, 'LOG-DOWNED-TICK')).toBeTruthy();
    expect(lastLog(st, 'LOG-DOWNED')).toBeFalsy();
  });

  it('med while downed stabilizes at 8 HP', () => {
    const st = combatArena();
    st.player.hp = 0;
    st.player.statuses = { downed: 2, bleed: 3 };
    const medIdx = st.inventory.findIndex((s) => s.kind === 'med');
    st.ui.selectedSlot = medIdx;
    applyAction(st, { type: 'use' });
    expect(st.player.statuses.downed).toBeUndefined();
    expect(st.player.hp).toBe(8);
    expect(lastLog(st, 'LOG-STABILIZE')).toBeTruthy();
  });

  it('clock expiring with HP still 0 is an HP lose', () => {
    const st = combatArena();
    st.player.hp = 0;
    st.player.statuses = { downed: 1 };
    endPlayerTurn(st);
    expect(st.player.statuses.downed).toBeUndefined();
    expect(st.status).toBe('lost');
    expect(st.loseReason).toBe('hp');
  });

  it('skips downed in the drill bay', () => {
    const st = combatArena();
    st.tutorialActive = true;
    st.player.hp = 3;
    st.rng = fixedRng([0.99]);
    applyPlayerDamage(st, 8, 'kinetic');
    expect(st.player.hp).toBeLessThanOrEqual(0);
    expect(st.player.statuses.downed).toBeUndefined();
  });

  it('bleed uses the overflow path', () => {
    const st = combatArena();
    st.player.hp = 1;
    st.player.def = 0;
    st.rng = fixedRng([0.99]);
    addStatus(st.player, 'bleed', 2);
    tickPlayerStatusEffects(st);
    expect(st.player.hp).toBe(0);
    expect(st.player.statuses.downed).toBeGreaterThan(0);
  });

  it('blocks bump while downed', () => {
    const st = combatArena();
    st.player.x = 5;
    st.player.y = 5;
    st.player.hp = 0;
    st.player.statuses = { downed: 3 };
    st.tiles[5]![6] = { kind: 'floor', walkable: true, transparent: true };
    st.enemies = [makeEnemy({ kind: 'mite', x: 6, y: 5, hp: 20, maxHp: 20 })];
    const turn = st.turn;
    applyAction(st, { type: 'move', dx: 1, dy: 0 });
    expect(st.turn).toBe(turn);
    expect(st.enemies[0]!.hp).toBe(20);
    expect(lastLog(st, 'LOG-DOWNED-ACT')).toBeTruthy();
  });
});
