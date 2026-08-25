import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { formatExtractBoxes } from '../../src/game/presenters/FieldHud';
import { formatFieldKitDock } from '../../src/game/presenters/FieldKitDock';
import { buildKitOverlayContent } from '../../src/game/presenters/KitOverlayContent';
import { contextHint, resolveHintLine } from '../../src/game/presenters/ContextHints';
import { applyAction, createGame, describeObjective } from '../../src/sim';

/** Quiet opening tile so kit/objective coaching is not stolen by loot or fauna. */
function quietOpening() {
  const st = createGame(42);
  st.items = [];
  st.enemies = [];
  st.npcs = [];
  st.roomQuest = null;
  st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
  st.player.hp = st.player.maxHp;
  st.player.energy = st.player.maxEnergy;
  st.player.armor = st.player.maxArmor;
  st.player.statuses = {};
  return st;
}

describe('opening field interaction', () => {
  it('wears the starting Survey Phaser with u from the dock, then shows the hatch', () => {
    const st = quietOpening();

    const dock = formatFieldKitDock(st, 120);
    expect(dock).toContain('phaser');
    expect(dock).toContain(`${lore('UI-DOCK-WEAR')} phaser`);

    expect(resolveHintLine(st)).toBe('UI-HINT-EQUIP');
    expect(st.inventory[st.ui.selectedSlot]?.kind).toBe('phaser');

    applyAction(st, { type: 'use' });
    expect(st.player.equip.tool).toBe('phaser');
    expect(formatFieldKitDock(st, 120)).toContain('◆phaser');

    expect(contextHint(st)).toBe('UI-HINT-PHASER-TEACH');
    expect(contextHint(st)).toBe('OBJ-LOCAL-EXIT');
    expect(lore(describeObjective(st).local)).toBe(lore('OBJ-LOCAL-EXIT'));
    expect(formatExtractBoxes(st)).toBe(`${lore('UI-EXTRACT')} K- H- L- P-`);
  });

  it('inspect kit names the empty tool fill without selecting the phaser first', () => {
    const st = quietOpening();
    st.ui.selectedSlot = 0;
    const { lines } = buildKitOverlayContent(st);
    expect(lines.some((l) => l.includes('Tool') && l.includes('9u'))).toBe(true);
    expect(lines.some((l) => l.includes('2–3'))).toBe(true);
    expect(lines.some((l) => l.includes(lore('UI-KIT-USE')))).toBe(true);
  });
});
