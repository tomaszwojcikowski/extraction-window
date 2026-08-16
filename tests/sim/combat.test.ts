import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { ENEMIES } from '../../src/data/enemies';
import {
  applyPlayerDamage,
  enemyAttack,
  formatCombatDetail,
  playerAttack,
} from '../../src/sim/combat';
import { killEnemy, markEnemyDead } from '../../src/sim/death';
import { combatArena, lastLog, makeEnemy } from './fixtures';

describe('formatCombatDetail', () => {
  it('joins subject, damage, optional type, and rem/max hp', () => {
    expect(formatCombatDetail('EM Mite', 4, 6, 10)).toBe('EM Mite · -4 · 6/10 hp');
    expect(formatCombatDetail('EM Mite', 3, 12, 20, 'kinetic')).toBe(
      'EM Mite · -3 · kinetic · 12/20 hp',
    );
  });

  it('omits hp when rem is zero (killing blow)', () => {
    expect(formatCombatDetail('EM Mite', 4, 0, 10)).toBe('EM Mite · -4');
  });

  it('supports rem-only when max is omitted', () => {
    expect(formatCombatDetail('hit', 2, 5)).toBe('hit · -2 · 5 hp');
  });
});

describe('applyPlayerDamage', () => {
  it('ablative armor absorbs before HP and logs source', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.maxHp = 20;
    st.player.armor = 5;
    const r = applyPlayerDamage(st, 3, 'kinetic', { source: 'EM Mite' });
    expect(r.armorLost).toBe(3);
    expect(r.hpLost).toBe(0);
    expect(r.fullyAbsorbed).toBe(true);
    expect(st.player.armor).toBe(2);
    expect(st.player.hp).toBe(20);
    expect(lastLog(st, 'LOG-ARMOR-ABSORB')?.detail).toBe('EM Mite -3');
  });

  it('overflow past armor hits HP with typed detail', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.maxHp = 20;
    st.player.armor = 2;
    const r = applyPlayerDamage(st, 5, 'ion', { source: 'Spore' });
    expect(r.armorLost).toBe(2);
    expect(r.hpLost).toBe(3);
    expect(st.player.hp).toBe(17);
    expect(lastLog(st, 'LOG-HURT')?.detail).toBe('Spore · -3 · ion · 17/20 hp');
  });

  it('expose caps shield absorb (~55%)', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.maxHp = 20;
    st.player.armor = 20;
    st.player.statuses = { expose: 2 };
    const r = applyPlayerDamage(st, 10, 'kinetic', { source: 'Rift' });
    expect(r.armorLost).toBe(6); // ceil(10 * 0.55)
    expect(r.hpLost).toBe(4);
  });

  it('ion filter halves ion damage', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.maxHp = 20;
    st.player.armor = 0;
    st.player.filterTurns = 3;
    applyPlayerDamage(st, 4, 'ion', { source: 'Spore' });
    expect(st.player.hp).toBe(18); // ceil(4/2)=2
  });
});

describe('playerAttack / enemyAttack', () => {
  it('logs named hit detail and credits killEnemy on lethal', () => {
    const st = combatArena();
    const foe = makeEnemy({ kind: 'mite', hp: 2, maxHp: 3, x: 6, y: 5, def: 0 });
    st.enemies = [foe];
    st.player.x = 5;
    st.player.y = 5;
    st.player.atk = 5;
    const xpBefore = st.xp;
    playerAttack(st, foe, 0);
    expect(lastLog(st, 'LOG-HIT')?.detail).toMatch(/^Scar Mite · -/);
    expect(foe.alive).toBe(false);
    expect(lastLog(st, 'LOG-KILL')?.detail).toBe(lore(ENEMIES.mite.loreName));
    expect(st.xp).toBeGreaterThan(xpBefore);
  });

  it('pulse baton stuns a surviving target', () => {
    const st = combatArena();
    st.player.equip.tool = 'pulse_baton';
    st.player.atk = 2;
    const foe = makeEnemy({ kind: 'mite', hp: 20, maxHp: 20, def: 0 });
    st.enemies = [foe];
    playerAttack(st, foe, 0);
    expect(foe.alive).toBe(true);
    expect(foe.statuses.stun).toBe(2);
  });

  it('first melee from a hostile bites once, then settles', () => {
    const st = combatArena();
    st.player.hp = 100;
    st.player.maxHp = 100;
    st.player.armor = 0;
    st.player.def = 0;
    const foe = makeEnemy({ kind: 'mite', atk: 3, firstContactBite: true });
    enemyAttack(st, foe, 0);
    const first = 100 - st.player.hp;
    expect(foe.firstContactBite).toBe(false);
    expect(first).toBe(5); // 3 + 2 bite

    st.player.hp = 100;
    enemyAttack(st, foe, 0);
    expect(100 - st.player.hp).toBe(3);
  });

  it('drain fauna siphons bus and logs source', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.maxHp = 20;
    st.player.def = 0;
    st.player.energy = 40;
    const foe = makeEnemy({ kind: 'leech', atk: 3 });
    enemyAttack(st, foe, 0);
    expect(st.player.energy).toBe(38);
    expect(lastLog(st, 'LOG-DRAIN')?.detail).toContain('-2 Power');
  });

  it('stalker applies bleed; rift applies expose', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.maxHp = 20;
    st.player.def = 99; // still take min 1 dmg from meleeDamage
    enemyAttack(st, makeEnemy({ kind: 'stalker', atk: 1 }), 0);
    expect(st.player.statuses.bleed).toBe(3);
    st.player.statuses = {};
    enemyAttack(st, makeEnemy({ kind: 'rift', atk: 1 }), 0);
    expect(st.player.statuses.expose).toBe(4);
  });
});

describe('killEnemy / markEnemyDead', () => {
  it('markEnemyDead clears life without XP', () => {
    const st = combatArena();
    const foe = makeEnemy({ kind: 'mite', hp: 1 });
    st.enemies = [foe];
    const xp = st.xp;
    markEnemyDead(foe);
    expect(foe.alive).toBe(false);
    expect(st.xp).toBe(xp);
    expect(st.log.some((l) => l.loreId === 'LOG-KILL')).toBe(false);
  });

  it('killEnemy grants XP and kill log', () => {
    const st = combatArena();
    const foe = makeEnemy({ kind: 'mite', hp: 1, maxHp: 3 });
    st.enemies = [foe];
    const xp = st.xp;
    killEnemy(st, foe);
    expect(foe.alive).toBe(false);
    expect(st.xp).toBeGreaterThan(xp);
    expect(lastLog(st, 'LOG-KILL')?.detail).toBe(lore(ENEMIES.mite.loreName));
  });
});
