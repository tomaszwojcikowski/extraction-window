import { describe, expect, it } from 'vitest';
import { applyAction, createGame, emptyEquipSlots, isItemWorn, tryEquipItem } from '../../src/sim';
import { armorDefBonus, toolAtkBonus } from '../../src/sim/combat';
import { tryPickup } from '../../src/sim/inventory';
import { addPlayerStatus } from '../../src/sim/status';

describe('loadout paper doll', () => {
  it('initializes all worn slots empty', () => {
    const st = createGame(42);
    expect(st.player.equip).toEqual(emptyEquipSlots());
  });

  it('toggles tool and suit equip without removing from bag', () => {
    const st = createGame(42);
    st.inventory = [
      { kind: 'blade', count: 1 },
      { kind: 'harness', count: 1 },
    ];
    st.ui.selectedSlot = 0;
    applyAction(st, { type: 'use' });
    expect(st.player.equip.tool).toBe('blade');
    expect(isItemWorn(st, 'blade')).toBe(true);
    expect(toolAtkBonus(st)).toBe(1);

    st.ui.selectedSlot = 1;
    applyAction(st, { type: 'use' });
    expect(st.player.equip.suit).toBe('harness');
    expect(isItemWorn(st, 'harness')).toBe(true);
  });

  it('scan band occupies first free ring slot', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'scan_band', count: 1 }];
    tryEquipItem(st, 'scan_band');
    expect(st.player.equip.ring_l).toBe('scan_band');
    expect(st.player.equip.ring_r).toBeNull();
  });

  it('second scan band fills ring_r when ring_l taken', () => {
    const st = createGame(42);
    st.inventory = [
      { kind: 'scan_band', count: 1 },
      { kind: 'scan_band', count: 1 },
    ];
    tryEquipItem(st, 'scan_band');
    expect(st.player.equip.ring_l).toBe('scan_band');
    tryEquipItem(st, 'scan_band');
    expect(st.player.equip.ring_r).toBe('scan_band');
  });

  it('suit swap adjusts max shields', () => {
    const st = createGame(42);
    st.inventory = [
      { kind: 'harness', count: 1 },
      { kind: 'ablative_vest', count: 1 },
    ];
    const baseMax = st.player.maxArmor;
    tryEquipItem(st, 'harness');
    expect(st.player.maxArmor).toBe(baseMax + 6);
    tryEquipItem(st, 'ablative_vest');
    expect(st.player.maxArmor).toBe(baseMax + 4);
    expect(armorDefBonus(st)).toBe(1);
  });
});

describe('loadout item effects', () => {
  it('survey visor softens jam duration', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'survey_visor', count: 1 }];
    tryEquipItem(st, 'survey_visor');
    addPlayerStatus(st, 'jam', 3);
    expect(st.player.statuses.jam).toBe(2);
  });
});

describe('walk-on wear', () => {
  it('wears a ground phaser when the tool slot is empty', () => {
    const st = createGame(42);
    st.items.push({
      id: st.nextEntityId++,
      kind: 'phaser',
      x: st.player.x,
      y: st.player.y,
    });
    expect(tryPickup(st)).toBe(true);
    expect(st.player.equip.tool).toBe('phaser');
    expect(st.log.some((l) => l.loreId === 'LOG-USE-PHASER-EQUIP')).toBe(true);
  });

  it('bags a ground phaser when the tool slot is already worn', () => {
    const st = createGame(42);
    st.inventory.push({ kind: 'blade', count: 1 });
    tryEquipItem(st, 'blade');
    expect(st.player.equip.tool).toBe('blade');
    st.items.push({
      id: st.nextEntityId++,
      kind: 'phaser',
      x: st.player.x,
      y: st.player.y,
    });
    expect(tryPickup(st)).toBe(true);
    expect(st.player.equip.tool).toBe('blade');
    expect(st.inventory.some((s) => s.kind === 'phaser')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-USE-PHASER-EQUIP')).toBe(false);
  });

  it('leaves skip-tutorial packed phaser unworn until u', () => {
    const st = createGame(42);
    expect(st.inventory.some((s) => s.kind === 'phaser')).toBe(true);
    expect(st.player.equip.tool).toBeNull();
  });
});
