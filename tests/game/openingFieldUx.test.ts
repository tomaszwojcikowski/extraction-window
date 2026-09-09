import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { formatExtractBoxes } from '../../src/game/presenters/FieldHud';
import { formatFieldKitDock, shortKitName } from '../../src/game/presenters/FieldKitDock';
import { buildKitOverlayContent } from '../../src/game/presenters/KitOverlayContent';
import { contextHint, resolveHintLine } from '../../src/game/presenters/ContextHints';
import { minimapGoalPos } from '../../src/game/views/MinimapView';
import { formatPaddContent } from '../../src/game/views/overlays/PaddOverlay';
import { applyAction, createGame, describeObjective, finishTutorial } from '../../src/sim';
import { makeEnemy } from '../sim/fixtures';

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
    const hatch = describeObjective(st).pos;
    if (hatch) {
      st.explored[hatch.y]![hatch.x] = true;
      st.visible[hatch.y]![hatch.x] = true;
    }

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

  it('uses Field Array Pulse when the hatch is in fog, then Nav Ping to mark the map', () => {
    const st = quietOpening();
    st.scriptedFired.teach_equip = true;
    st.scriptedFired.teach_phaser = true;
    st.player.equip.tool = 'phaser';
    const hatch = describeObjective(st).pos;
    expect(hatch).not.toBeNull();
    st.explored[hatch!.y]![hatch!.x] = false;
    st.visible[hatch!.y]![hatch!.x] = false;

    expect(formatPaddContent(st)).toContain(lore('UI-HINT-PROBE'));
    expect(resolveHintLine(st)).toBe('UI-HINT-PROBE');
    expect(st.inventory[st.ui.selectedSlot]?.kind).toBe('probe');
    expect(formatFieldKitDock(st, 120)).toContain(`${lore('UI-DOCK-USE')} ${shortKitName('probe')}`);

    applyAction(st, { type: 'use' });
    expect(st.player.probeTurns).toBeGreaterThan(0);
    expect(st.inventory.some((s) => s.kind === 'probe')).toBe(false);

    st.explored[hatch!.y]![hatch!.x] = false;
    st.visible[hatch!.y]![hatch!.x] = false;
    st.inventory.push({ kind: 'mapper', count: 1 });
    expect(resolveHintLine(st)).toBe('UI-HINT-MAPPER');
    expect(st.inventory[st.ui.selectedSlot]?.kind).toBe('mapper');
    applyAction(st, { type: 'use' });
    expect(st.player.mapperTurns).toBeGreaterThan(0);
    expect(minimapGoalPos(st)).toEqual(hatch);
    expect(formatPaddContent(st)).not.toContain(lore('UI-HINT-MAPPER'));
  });

  it('teaches Plasma Microdart with u then aim on a lit lane', () => {
    const st = quietOpening();
    st.scriptedFired.teach_equip = true;
    st.scriptedFired.teach_phaser = true;
    st.player.equip.tool = null;
    st.inventory = [{ kind: 'dart', count: 1 }];
    const foe = makeEnemy({ kind: 'mite', x: st.player.x + 2, y: st.player.y });
    st.tiles[foe.y]![foe.x] = { kind: 'floor', walkable: true, transparent: true };
    st.enemies = [foe];
    st.visible[foe.y]![foe.x] = true;
    st.illumination[foe.y]![foe.x] = 1;
    st.illumination[st.player.y]![st.player.x] = 1;

    expect(resolveHintLine(st)).toBe('UI-HINT-DART');
    expect(st.inventory[st.ui.selectedSlot]?.kind).toBe('dart');
    expect(formatFieldKitDock(st, 120)).toContain(`${lore('UI-DOCK-USE')} ${shortKitName('dart')}`);
    applyAction(st, { type: 'use' });
    expect(st.ui.aimingDart).toBe(true);
    expect(resolveHintLine(st)).toBe('UI-HINT-AIM');
  });
});

describe('drill bay field interaction', () => {
  it('keeps the Survey Phaser off the dock until the bay pickup wears it', () => {
    const st = createGame(42, { skipTutorial: false });
    expect(formatFieldKitDock(st, 120)).not.toContain('phaser');
    expect(lore(describeObjective(st).local)).toBe(lore('OBJ-TUT-PHASER'));
    expect(contextHint(st)).toBe('UI-TUT-MOVE');

    st.scriptedFired.tut_light = true;
    st.turn = 1;
    st.player.x = 14;
    st.player.y = 7;
    st.enemies.forEach((e) => {
      e.alive = false;
    });
    for (let i = 0; i < 8 && !st.inventory.some((s) => s.kind === 'phaser'); i++) {
      applyAction(st, { type: 'move', dx: 1, dy: 0 });
    }
    expect(st.inventory.some((s) => s.kind === 'phaser')).toBe(true);
    expect(st.player.equip.tool).toBe('phaser');
    expect(formatFieldKitDock(st, 120)).toContain('◆phaser');
  });

  it('teaches u Power Cell on the first quiet plains beat after a long drill', () => {
    const st = createGame(42, { skipTutorial: false });
    st.turn = 28;
    finishTutorial(st);
    st.items = [];
    st.enemies = [];
    st.npcs = [];
    st.roomQuest = null;
    st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
    st.player.hp = st.player.maxHp;
    st.player.energy = st.player.maxEnergy;
    st.player.armor = st.player.maxArmor;
    st.player.statuses = {};
    expect(contextHint(st)).toBe('UI-HINT-CLOCKS');
    expect(lore('UI-HINT-CLOCKS').toLowerCase()).toContain('power cell');
  });
});
