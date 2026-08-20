import { describe, expect, it } from 'vitest';
import { INVENTORY_SLOTS } from '../../src/data/items';
import { lore } from '../../src/data/lore';
import { fieldHudChips, fitHudChips, formatExtractBoxes, formatHudMeta, formatPositionWord } from '../../src/game/presenters/FieldHud';
import { Theme } from '../../src/scenes/theme';
import { addStatus } from '../../src/sim/status';
import { combatArena, makeEnemy } from '../sim/fixtures';

describe('field HUD meta', () => {
  it('keeps Controlled off the line and prints ATK while Normal', () => {
    const st = combatArena();
    const meta = formatHudMeta(st);
    expect(meta).not.toContain(lore('UI-POS-CONTROLLED'));
    expect(meta).not.toContain(lore('UI-EXTRACT'));
    expect(meta).toContain(`${lore('UI-ATK')} ${st.player.atk}`);
    expect(meta).toContain(lore('UI-DEF'));
  });

  it('names Risky when peel is 1, and hides ATK when Impaired', () => {
    const st = combatArena();
    st.player.x = 5;
    st.player.y = 5;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
    ] as const) {
      st.tiles[5]![5 + dx] = { kind: 'floor', walkable: true, transparent: true };
    }
    st.enemies = [
      makeEnemy({ id: 1, kind: 'crawler', x: 6, y: 5 }),
      makeEnemy({ id: 2, kind: 'crawler', x: 4, y: 5 }),
    ];
    expect(formatPositionWord(st)).toBe(lore('UI-POS-RISKY'));
    expect(formatHudMeta(st)).toContain(lore('UI-POS-RISKY'));

    st.player.statuses = { jam: 2 };
    const jammed = formatHudMeta(st);
    expect(jammed).not.toContain(`${lore('UI-ATK')} ${st.player.atk}`);
    expect(jammed).toContain(lore('UI-DEF'));
  });
});

describe('field HUD chips', () => {
  it('puts extract boxes on the rail and skips them in the drill bay', () => {
    const st = combatArena();
    expect(formatExtractBoxes(st)).toBe(`${lore('UI-EXTRACT')} K- H- L- P-`);
    expect(fieldHudChips(st).some((c) => c.label.startsWith(lore('UI-EXTRACT')))).toBe(true);
    st.tutorialActive = true;
    expect(fieldHudChips(st).some((c) => c.label.startsWith(lore('UI-EXTRACT')))).toBe(false);
  });

  it('fills extract cells from flags and lights the pad during uplink', () => {
    const st = combatArena();
    st.objectives.hasRelayKey = true;
    st.objectives.beaconOpen = true;
    st.objectives.hasNavCore = true;
    expect(formatExtractBoxes(st)).toBe(`${lore('UI-EXTRACT')} K# H# L# P-`);
    st.uplink = { progress: 1, active: true, accelerated: false, repelled: false };
    expect(formatExtractBoxes(st)).toBe(`${lore('UI-EXTRACT')} K# H# L# P#`);
  });

  it('shows unlocked skills on the chip rail', () => {
    const st = combatArena();
    st.skills = ['triage', 'scavenger'];
    const labels = fieldHudChips(st).map((c) => c.label);
    expect(labels.some((l) => l.startsWith(lore('UI-SKILL-CHIP')))).toBe(true);
    expect(labels.some((l) => l.includes(lore('SKILL-TRIAGE-NAME')))).toBe(true);
  });

  it('shows an in-progress contact job chip while an agenda is open', () => {
    const st = combatArena();
    st.npcs = [
      {
        id: 1,
        kind: 'stranded_ensign',
        x: 4,
        y: 4,
        talked: true,
        agendaOpen: true,
        agendaDone: false,
      },
    ];
    expect(fieldHudChips(st).some((c) => c.label === lore('UI-AGENDA-CHIP-ENSIGN'))).toBe(true);
    st.npcs[0]!.agendaDone = true;
    expect(fieldHudChips(st).some((c) => c.label === lore('UI-AGENDA-CHIP-ENSIGN'))).toBe(false);
  });

  it('chips Enhanced for a helpless neighbour, Kit full, Downed, and Fritz', () => {
    const st = combatArena();
    st.player.statuses = { downed: 2 };
    st.keepCalmCooldown = 5;
    while (st.inventory.length < INVENTORY_SLOTS) {
      st.inventory.push({ kind: 'flare', count: 1 });
    }
    const foe = makeEnemy({
      id: 1,
      kind: 'mite',
      x: st.player.x + 1,
      y: st.player.y,
    });
    addStatus(foe, 'expose', 2);
    st.enemies = [foe];
    st.player.statuses = { downed: 2 };
    const downedLabels = fieldHudChips(st).map((c) => c.label);
    expect(downedLabels.some((l) => l.startsWith(lore('UI-DOWNED')))).toBe(true);
    expect(downedLabels).not.toContain(lore('UI-STANCE-ENHANCED'));

    delete st.player.statuses.downed;
    const labels = fieldHudChips(st).map((c) => c.label);
    expect(labels).toContain(lore('UI-STANCE-ENHANCED'));
    expect(labels).toContain(lore('UI-ENCUMBERED'));
    expect(labels.some((l) => l.startsWith(lore('UI-FRITZ')))).toBe(true);
    expect(labels).not.toContain(lore('UI-QUEST-KEY'));
  });
});

describe('fitHudChips', () => {
  it('collapses overflow into a +N cue instead of silent drop', () => {
    const chips = Array.from({ length: 11 }, (_, i) => ({
      label: `chip-${i}`,
      fill: Theme.inkMute,
    }));
    const fitted = fitHudChips(chips, 8);
    expect(fitted).toHaveLength(8);
    expect(fitted[7]!.label).toBe('+4');
    expect(fitted.slice(0, 7).map((c) => c.label)).toEqual(
      chips.slice(0, 7).map((c) => c.label),
    );
  });

  it('passes through when under the slot budget', () => {
    const chips = [
      { label: 'a', fill: Theme.tape },
      { label: 'b', fill: Theme.arc },
    ];
    expect(fitHudChips(chips, 8)).toEqual(chips);
  });
});
