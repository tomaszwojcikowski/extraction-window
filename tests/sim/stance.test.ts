import { describe, expect, it } from 'vitest';
import { INVENTORY_SLOTS } from '../../src/data/items';
import { applyAction } from '../../src/sim';
import { enemyAttack, playerAttack } from '../../src/sim/combat';
import { fireDart } from '../../src/sim/inventory';
import { addStatus } from '../../src/sim/status';
import {
  encumbered,
  fieldPosition,
  playerAttackStance,
  playerHudStance,
  playerReadyStance,
  resolveHit,
} from '../../src/sim/stance';
import { combatArena, fixedRng, lastLog, makeEnemy } from './fixtures';

describe('resolveHit', () => {
  it('Normal keeps atk minus def plus variance', () => {
    expect(resolveHit(6, 2, 0, 'normal', () => 0)).toBe(4);
    expect(resolveHit(6, 2, 1, 'normal', () => 0)).toBe(5);
  });

  it('Impaired is a d4 and ignores weapon', () => {
    const one = resolveHit(99, 9, 0, 'impaired', () => 0);
    const four = resolveHit(99, 9, 0, 'impaired', () => 0.99);
    expect(one).toBe(1);
    expect(four).toBe(4);
  });

  it('Enhanced is a d12 minus def, capped at 12', () => {
    expect(resolveHit(2, 0, 0, 'enhanced', () => 0.99)).toBe(12);
    expect(resolveHit(2, 4, 0, 'enhanced', () => 0.99)).toBe(8);
  });
});

describe('player stances', () => {
  it('stim or overcharge is Enhanced; probe is not', () => {
    const st = combatArena();
    const foe = makeEnemy({ kind: 'mite', def: 0 });
    expect(playerAttackStance(st, foe)).toBe('normal');
    st.player.probeTurns = 25;
    expect(playerAttackStance(st, foe)).toBe('normal');
    expect(playerReadyStance(st)).toBe('normal');
    st.player.stimTurns = 15;
    expect(playerAttackStance(st, foe)).toBe('enhanced');
  });

  it('helpless foe wins over Impaired', () => {
    const st = combatArena();
    st.player.statuses = { jam: 2 };
    const foe = makeEnemy({ kind: 'mite' });
    expect(playerAttackStance(st, foe)).toBe('impaired');
    addStatus(foe, 'stun', 2);
    expect(playerAttackStance(st, foe)).toBe('enhanced');
  });

  it('full kit is encumbered Impaired unless the foe is helpless', () => {
    const st = combatArena();
    while (st.inventory.length < INVENTORY_SLOTS) {
      st.inventory.push({ kind: 'flare', count: 1 });
    }
    expect(encumbered(st)).toBe(true);
    const foe = makeEnemy({ kind: 'mite' });
    expect(playerAttackStance(st, foe)).toBe('impaired');
    addStatus(foe, 'expose', 2);
    expect(playerAttackStance(st, foe)).toBe('enhanced');
  });

  it('starting loadout is not encumbered', () => {
    const st = combatArena();
    expect(st.inventory.length).toBeLessThan(INVENTORY_SLOTS);
    expect(encumbered(st)).toBe(false);
  });

  it('HUD stance is Enhanced when an adjacent foe is helpless', () => {
    const st = combatArena();
    st.player.statuses = { jam: 2 };
    expect(playerHudStance(st)).toBe('impaired');
    const foe = makeEnemy({
      kind: 'mite',
      x: st.player.x + 1,
      y: st.player.y,
    });
    addStatus(foe, 'stun', 2);
    st.enemies = [foe];
    expect(playerHudStance(st)).toBe('enhanced');
  });
});

describe('field position', () => {
  it('names peel without a second damage tax', () => {
    expect(fieldPosition(0, false)).toBe('controlled');
    expect(fieldPosition(1, false)).toBe('risky');
    expect(fieldPosition(2, false)).toBe('desperate');
    expect(fieldPosition(0, true)).toBe('desperate');
  });
});

describe('wired attacks', () => {
  it('logs Impaired on a jammed bump', () => {
    const st = combatArena();
    st.player.statuses = { jam: 2 };
    const foe = makeEnemy({ kind: 'mite', hp: 20, maxHp: 20, def: 0 });
    playerAttack(st, foe, 0);
    expect(lastLog(st, 'LOG-IMPAIRED')).toBeTruthy();
  });

  it('logs Punish when Enhanced because the foe is stunned', () => {
    const st = combatArena();
    const foe = makeEnemy({ kind: 'mite', hp: 20, maxHp: 20, def: 0 });
    addStatus(foe, 'stun', 2);
    playerAttack(st, foe, 0);
    expect(lastLog(st, 'LOG-PUNISH')).toBeTruthy();
  });

  it('dart hits at current stance then exposes', () => {
    const st = combatArena();
    const dx = st.player.x < st.width - 2 ? 1 : -1;
    const tx = st.player.x + dx;
    const ty = st.player.y;
    st.visible[ty]![tx] = true;
    st.illumination[ty]![tx] = 0.9;
    st.tiles[ty]![tx] = { kind: 'floor', walkable: true, transparent: true };
    const foe = makeEnemy({ kind: 'mite', hp: 40, maxHp: 40, def: 0, x: tx, y: ty });
    st.enemies = [foe];
    const dart = st.inventory.find((s) => s.kind === 'dart');
    if (dart) dart.count = 2;
    else st.inventory.push({ kind: 'dart', count: 2 });
    fireDart(st, dx, 0);
    expect(foe.statuses.expose).toBe(4);
    expect(st.log.some((l) => l.loreId === 'LOG-ENHANCED')).toBe(false);
    const hpAfterFirst = foe.hp;
    fireDart(st, dx, 0);
    expect(st.log.some((l) => l.loreId === 'LOG-ENHANCED' || l.loreId === 'LOG-PUNISH')).toBe(true);
    expect(foe.hp).toBeLessThan(hpAfterFirst);
  });
});

describe('enemy Enhanced in SHADOW', () => {
  it('dark-prefer fauna log SHADOW bite and roll Enhanced', () => {
    const st = combatArena();
    st.player.hp = 100;
    st.player.maxHp = 100;
    st.player.def = 0;
    st.player.armor = 0;
    st.illumination[st.player.y]![st.player.x] = 0.2;
    st.rng = fixedRng([0.99]);
    enemyAttack(st, makeEnemy({ kind: 'mite', atk: 5 }), 0);
    expect(lastLog(st, 'LOG-SHADOW-BITE')).toBeTruthy();
    expect(100 - st.player.hp).toBe(12);
  });
});
