import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import {
  fieldKitSelectedVerb,
  formatFieldKitDock,
  shortKitName,
} from '../../src/game/presenters/FieldKitDock';
import { tryEquipItem } from '../../src/sim/inventory';
import { combatArena } from '../sim/fixtures';

describe('field kit dock', () => {
  it('names the selected verb so u is obvious without opening the case', () => {
    const st = combatArena();
    st.inventory = [
      { kind: 'med', count: 2 },
      { kind: 'phaser', count: 1 },
    ];
    st.ui.selectedSlot = 0;
    expect(formatFieldKitDock(st)).toContain('[1hypo×2]');
    expect(fieldKitSelectedVerb(st)).toBe(`${lore('UI-DOCK-USE')} ${shortKitName('med')}`);

    st.ui.selectedSlot = 1;
    expect(formatFieldKitDock(st)).toContain('[2·phaser]');
    expect(fieldKitSelectedVerb(st)).toBe(`${lore('UI-DOCK-WEAR')} ${shortKitName('phaser')}`);

    tryEquipItem(st, 'phaser');
    expect(formatFieldKitDock(st)).toContain('[2◆phaser]');
    expect(fieldKitSelectedVerb(st)).toBe(`${lore('UI-DOCK-STOW')} ${shortKitName('phaser')}`);
  });

  it('keeps unworn gear and a wear cue when the starting kit is cramped', () => {
    const st = combatArena();
    st.inventory = [
      { kind: 'med', count: 7 },
      { kind: 'energy', count: 6 },
      { kind: 'probe', count: 1 },
      { kind: 'stim', count: 1 },
      { kind: 'flare', count: 2 },
      { kind: 'plate', count: 2 },
      { kind: 'filter', count: 1 },
      { kind: 'dart', count: 1 },
      { kind: 'phaser', count: 1 },
      { kind: 'sealant', count: 2 },
    ];
    st.ui.selectedSlot = 0;
    const line = formatFieldKitDock(st, 72);
    expect(line).toContain('phaser');
    expect(line).toContain(`${lore('UI-DOCK-WEAR')} ${shortKitName('phaser')}`);
    expect(line).toContain('[1hypo×7]');
  });

  it('points at a Power Cell on the dock when the bus is at a warn mark', () => {
    const st = combatArena();
    st.inventory = [
      { kind: 'med', count: 1 },
      { kind: 'energy', count: 2 },
    ];
    st.ui.selectedSlot = 0;
    st.player.energy = 40;
    const line = formatFieldKitDock(st);
    expect(line).toContain(`${lore('UI-DOCK-USE')} ${shortKitName('energy')}`);
    expect(line).toContain('2cell');
  });

  it('keeps unworn gear and a wear cue when the starting kit is cramped', () => {
    const st = combatArena();
    st.inventory = [
      { kind: 'med', count: 7 },
      { kind: 'energy', count: 6 },
      { kind: 'probe', count: 1 },
      { kind: 'stim', count: 1 },
      { kind: 'flare', count: 2 },
      { kind: 'plate', count: 2 },
      { kind: 'filter', count: 1 },
      { kind: 'dart', count: 1 },
      { kind: 'phaser', count: 1 },
      { kind: 'sealant', count: 2 },
    ];
    st.ui.selectedSlot = 0;
    const line = formatFieldKitDock(st, 72);
    expect(line).toContain('phaser');
    expect(line).toContain(`${lore('UI-DOCK-WEAR')} ${shortKitName('phaser')}`);
    expect(line).toContain('[1hypo×7]');
  });
});
