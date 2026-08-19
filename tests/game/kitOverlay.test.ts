import { describe, expect, it } from 'vitest';
import { INVENTORY_SLOTS } from '../../src/data/items';
import { lore } from '../../src/data/lore';
import { buildKitOverlayContent, bagScrollStart } from '../../src/game/presenters/KitOverlayContent';
import { pushLog } from '../../src/sim/log';
import { tryEquipItem } from '../../src/sim/inventory';
import { combatArena } from '../sim/fixtures';

describe('bagScrollStart', () => {
  it('centers the selected row in the visible window', () => {
    expect(bagScrollStart(0, 16)).toBe(0);
    expect(bagScrollStart(15, 16)).toBe(8);
    expect(bagScrollStart(8, 16)).toBe(4);
  });

  it('shows all rows when the bag is short', () => {
    expect(bagScrollStart(2, 5)).toBe(0);
  });
});

describe('buildKitOverlayContent', () => {
  it('shows loadout and bag side by side with slot counts', () => {
    const st = combatArena();
    st.inventory = [
      { kind: 'med', count: 2 },
      { kind: 'energy', count: 1 },
    ];
    const { lines } = buildKitOverlayContent(st);
    expect(lines[0]).toContain(lore('UI-LOADOUT'));
    expect(lines[0]).toContain(`2/${INVENTORY_SLOTS}`);
    expect(lines.some((l) => l.includes('▸ 1') && l.includes('Field Hypo'))).toBe(true);
  });

  it('shows equip target and power cost for selected consumables', () => {
    const st = combatArena();
    st.inventory = [{ kind: 'flare', count: 1 }];
    st.ui.selectedSlot = 0;
    const { lines } = buildKitOverlayContent(st);
    expect(lines.some((l) => l.includes(lore('UI-KIT-USE')))).toBe(true);
    expect(lines.some((l) => l.includes(`${lore('UI-KIT-POWER')} 2`))).toBe(true);
  });

  it('shows stow hint and loadout marker for worn items', () => {
    const st = combatArena();
    st.inventory = [{ kind: 'survey_visor', count: 1 }];
    tryEquipItem(st, 'survey_visor');
    const { lines } = buildKitOverlayContent(st);
    expect(lines.some((l) => l.includes(lore('UI-KIT-STOW')))).toBe(true);
    expect(lines.some((l) => l.includes('▸Head') || l.includes('▸Head '))).toBe(true);
  });

  it('scrolls the bag list when more than eight items are packed', () => {
    const st = combatArena();
    st.inventory = Array.from({ length: 12 }, (_, i) => ({
      kind: i % 2 === 0 ? 'med' : 'energy',
      count: 1,
    }));
    st.ui.selectedSlot = 11;
    const { lines } = buildKitOverlayContent(st);
    expect(lines.some((l) => l.includes('5–12 / 12'))).toBe(true);
  });

  it('shows only the latest use failure in the footer', () => {
    const st = combatArena();
    st.inventory = [{ kind: 'med', count: 1 }];
    pushLog(st, 'LOG-USE-FAIL');
    pushLog(st, 'LOG-WAIT');
    const { lines } = buildKitOverlayContent(st);
    expect(lines.some((l) => l.includes(lore('LOG-USE-FAIL')))).toBe(false);
  });

  it('flags a full bag in the header', () => {
    const st = combatArena();
    while (st.inventory.length < INVENTORY_SLOTS) {
      st.inventory.push({ kind: 'flare', count: 1 });
    }
    const { lines } = buildKitOverlayContent(st);
    expect(lines[0]).toContain(lore('UI-ENCUMBERED'));
  });
});
