import { describe, expect, it } from 'vitest';
import { INVENTORY_SLOTS } from '../../src/data/items';
import { lore } from '../../src/data/lore';
import {
  buildKitOverlayContent,
  bagScrollStart,
  clampKitSelection,
  fitKitBlock,
  KIT_STABLE_LINES,
  KIT_STABLE_PANEL_H,
  kitPowerReadiness,
  kitPowerTrough,
  wrapKitLine,
} from '../../src/game/presenters/KitOverlayContent';
import { pushLog } from '../../src/sim/log';
import { tryEquipItem } from '../../src/sim/inventory';
import { combatArena } from '../sim/fixtures';

describe('bagScrollStart', () => {
  it('stays put until the selection would leave the window', () => {
    expect(bagScrollStart(0, 16)).toBe(0);
    expect(bagScrollStart(7, 16)).toBe(0);
    expect(bagScrollStart(8, 16)).toBe(1);
    expect(bagScrollStart(15, 16)).toBe(8);
  });

  it('shows all rows when the bag is short', () => {
    expect(bagScrollStart(2, 5)).toBe(0);
  });
});

describe('clampKitSelection', () => {
  it('keeps the cursor inside the bag', () => {
    expect(clampKitSelection(0, 0)).toBe(0);
    expect(clampKitSelection(9, 3)).toBe(2);
    expect(clampKitSelection(-1, 4)).toBe(0);
  });
});

describe('fitKitBlock', () => {
  it('pads and trims to a fixed slot count', () => {
    expect(fitKitBlock(['a'], 3)).toEqual(['a', '', '']);
    expect(fitKitBlock(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
  });
});

describe('kitPowerTrough', () => {
  it('renders a filled trough for Power spend', () => {
    expect(kitPowerTrough(2, 12)).toBe(`[${'█'.repeat(2)}${'░'.repeat(10)}]`);
    expect(kitPowerTrough(0)).toContain('░');
  });
});

describe('kitPowerReadiness', () => {
  it('names ready vs short before the player spends', () => {
    const st = combatArena();
    st.player.energy = 40;
    expect(kitPowerReadiness(st, 2).ready).toBe(true);
    expect(kitPowerReadiness(st, 2).line).toContain(lore('UI-KIT-POWER-READY'));

    st.player.energy = 1;
    const short = kitPowerReadiness(st, 4);
    expect(short.ready).toBe(false);
    expect(short.line).toContain(lore('UI-KIT-POWER-SHORT'));
    expect(short.line).toContain('3');
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
    expect(lines.some((l) => l.includes('▶') && l.includes('Field Hypo'))).toBe(true);
  });

  it('keeps a stable panel height when switching items', () => {
    const st = combatArena();
    st.inventory = [
      { kind: 'med', count: 1 },
      { kind: 'flare', count: 1 },
      { kind: 'survey_visor', count: 1 },
      { kind: 'phaser', count: 1 },
    ];
    st.player.energy = 40;
    const heights = st.inventory.map((_, i) => {
      st.ui.selectedSlot = i;
      const content = buildKitOverlayContent(st);
      expect(content.lines).toHaveLength(KIT_STABLE_LINES);
      return content.panelH;
    });
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBe(KIT_STABLE_PANEL_H);
  });

  it('puts the action CTA before the description', () => {
    const desc = lore('ITEM-FLARE-DESC');
    expect(wrapKitLine(desc).length).toBeGreaterThan(1);

    const st = combatArena();
    st.inventory = [{ kind: 'flare', count: 2 }];
    st.player.energy = 40;
    st.ui.selectedSlot = 0;
    const { lines, actionLine, powerShort } = buildKitOverlayContent(st);
    expect(actionLine).not.toBeNull();
    expect(lines[actionLine!]).toContain(lore('UI-KIT-USE'));
    expect(lines.some((l) => l.includes(lore('UI-KIT-POWER-READY')))).toBe(true);
    expect(lines.some((l) => l.includes(kitPowerTrough(2)))).toBe(true);
    expect(powerShort).toBe(false);
  });

  it('flags short Power on the selected spend', () => {
    const st = combatArena();
    st.inventory = [{ kind: 'flare', count: 1 }];
    st.player.energy = 0;
    st.ui.selectedSlot = 0;
    const { lines, powerShort } = buildKitOverlayContent(st);
    expect(powerShort).toBe(true);
    expect(lines.some((l) => l.includes(lore('UI-KIT-POWER-SHORT')))).toBe(true);
  });

  it('shows stow hint and loadout marker for worn items', () => {
    const st = combatArena();
    st.inventory = [{ kind: 'survey_visor', count: 1 }];
    tryEquipItem(st, 'survey_visor');
    const { lines } = buildKitOverlayContent(st);
    expect(lines.some((l) => l.includes(lore('UI-KIT-STOW')))).toBe(true);
    expect(lines.some((l) => l.includes('▶Head') || l.includes('▶Head '))).toBe(true);
    expect(lines.some((l) => l.includes('◆Head'))).toBe(true);
  });

  it('scrolls the bag list only when the cursor leaves the window', () => {
    const st = combatArena();
    st.inventory = Array.from({ length: 12 }, (_, i) => ({
      kind: i % 2 === 0 ? 'med' : 'energy',
      count: 1,
    }));
    st.ui.selectedSlot = 7;
    expect(buildKitOverlayContent(st).lines.some((l) => l.includes('Field Hypo'))).toBe(true);
    st.ui.selectedSlot = 11;
    const { lines } = buildKitOverlayContent(st);
    expect(lines.some((l) => l.includes('5–12 / 12'))).toBe(true);
    expect(lines.some((l) => l.includes(lore('UI-KIT-SCROLL-UP')) || l.includes(lore('UI-KIT-SCROLL-DOWN')))).toBe(
      true,
    );
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

  it('coaches an empty bag', () => {
    const st = combatArena();
    st.inventory = [];
    const { lines } = buildKitOverlayContent(st);
    expect(lines.some((l) => l.includes(lore('UI-KIT-EMPTY-TIP')))).toBe(true);
  });
});
