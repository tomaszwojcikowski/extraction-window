import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { resolveHintLine } from '../../src/game/presenters/ContextHints';
import {
  applyStormShelterOnSectorEntry,
  FAVOR_LABEL,
} from '../../src/sim/extractFavor';
import { useSelected } from '../../src/sim/inventory';
import {
  formatRoomQuestHudLine,
  roomQuestHudLine,
  roomQuestMechanic,
} from '../../src/sim/mechanics/roomQuestMechanic';
import {
  buildSingleRoomQuest,
  buildVentSealQuest,
  tryRoomQuest,
  tickRoomQuest,
} from '../../src/sim/roomQuest';
import { combatArena } from './fixtures';

function placeOnQuest(st: ReturnType<typeof combatArena>, x: number, y: number): void {
  st.player.x = x;
  st.player.y = y;
  st.tiles[y]![x] = { kind: 'quest', walkable: true, transparent: true };
  st.enemies = [];
  st.items = st.items.filter((i) => !(i.x === x && i.y === y));
}

describe('room quest readability', () => {
  it('HUD line names salvage verb and storm-shelter favor', () => {
    const st = combatArena();
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 2, y: 2 }, { x: 1, y: 1, w: 3, h: 3 });

    expect(roomQuestHudLine(st)).toMatchObject({
      prompt: 'UI-RQ-SALVAGE',
      index: 1,
      total: 1,
      favor: FAVOR_LABEL.storm_shelter,
    });
    expect(formatRoomQuestHudLine(st)).toBe(
      `OPT — ${lore('UI-RQ-SALVAGE')} · pays ${FAVOR_LABEL.storm_shelter}`,
    );
  });

  it('HUD line tracks vent-seal step index and pattern-fail-safe favor', () => {
    const st = combatArena();
    const room = { x: 1, y: 1, w: 3, h: 3 };
    st.roomQuest = buildVentSealQuest([
      { pos: { x: 2, y: 2 }, room },
      { pos: { x: 4, y: 2 }, room: { ...room, x: 3 } },
    ]);

    expect(formatRoomQuestHudLine(st)).toBe(
      `OPT 1/2 — ${lore('UI-RQ-VENT-A')} · pays ${FAVOR_LABEL.pattern_fail_safe}`,
    );

    st.roomQuest.stepIndex = 1;
    expect(formatRoomQuestHudLine(st)).toBe(
      `OPT 2/2 — ${lore('UI-RQ-VENT-B')} · pays ${FAVOR_LABEL.pattern_fail_safe}`,
    );
  });

  it('standing on vent site A coaches Sealant Foam, not generic Enter', () => {
    const st = combatArena();
    const room = { x: 1, y: 1, w: 3, h: 3 };
    st.roomQuest = buildVentSealQuest([
      { pos: { x: 2, y: 2 }, room },
      { pos: { x: 4, y: 2 }, room: { ...room, x: 3 } },
    ]);
    placeOnQuest(st, 2, 2);

    expect(roomQuestMechanic.contextHint?.(st)).toBe('UI-RQ-VENT-A');
    expect(resolveHintLine(st)).toBe('UI-RQ-VENT-A');
    expect(resolveHintLine(st)).not.toBe('UI-HINT-QUEST');
  });

  it('standing on salvage console coaches Enter / Space / >', () => {
    const st = combatArena();
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 2, y: 2 }, { x: 1, y: 1, w: 3, h: 3 });
    placeOnQuest(st, 2, 2);

    expect(resolveHintLine(st)).toBe('UI-RQ-SALVAGE');
  });

  it('idle quest tiles stay quiet so the OPT line owns the read', () => {
    const st = combatArena();
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 5, y: 5 }, { x: 4, y: 4, w: 3, h: 3 });
    placeOnQuest(st, 2, 2);
    st.tiles[2]![2]!.kind = 'quest';

    expect(roomQuestMechanic.contextHint?.(st)).toBeNull();
    expect(resolveHintLine(st)).toBeNull();
  });
});

describe('room quest flows', () => {
  it('salvage completes and grants storm shelter that boosts Window on entry', () => {
    const st = combatArena();
    st.roomQuest = buildSingleRoomQuest('salvage', { x: 2, y: 2 }, { x: 1, y: 1, w: 3, h: 3 });
    placeOnQuest(st, 2, 2);

    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.done).toBe(true);
    expect(st.extractFavor).toEqual({ kind: 'storm_shelter' });
    expect(formatRoomQuestHudLine(st)).toBeNull();

    const before = st.stormTurns;
    applyStormShelterOnSectorEntry(st);
    expect(st.stormTurns).toBe(before + 15);
    expect(st.extractFavor).toBeNull();
    expect(st.log.some((e) => e.loreId === 'LOG-FAVOR-SHELTER')).toBe(true);
  });

  it('purge holds until nest hostiles die, then grants hazard pass', () => {
    const st = combatArena();
    const room = { x: 1, y: 1, w: 5, h: 5 };
    st.roomQuest = buildSingleRoomQuest('purge', { x: 3, y: 3 }, room);
    placeOnQuest(st, 3, 3);

    tickRoomQuest(st);
    expect(st.roomQuest.spawnedIds.length).toBeGreaterThan(0);
    expect(formatRoomQuestHudLine(st)).toContain(lore('UI-RQ-PURGE'));
    expect(resolveHintLine(st)).toBe('UI-RQ-PURGE');

    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.done).toBe(false);

    for (const id of st.roomQuest.spawnedIds) {
      const en = st.enemies.find((e) => e.id === id);
      if (en) en.alive = false;
    }
    tickRoomQuest(st);
    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.done).toBe(true);
    expect(st.extractFavor).toEqual({ kind: 'hazard_pass' });
  });

  it('vent-seal consumes Sealant Foam on site A, then console pays pattern fail-safe', () => {
    const st = combatArena();
    const room = { x: 1, y: 1, w: 3, h: 3 };
    st.roomQuest = buildVentSealQuest([
      { pos: { x: 2, y: 2 }, room },
      { pos: { x: 4, y: 2 }, room: { ...room, x: 3 } },
    ]);
    placeOnQuest(st, 2, 2);
    st.inventory = [{ kind: 'sealant', count: 1 }];
    st.ui.selectedSlot = 0;

    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.stepIndex).toBe(0);

    expect(useSelected(st)).toBe(true);
    expect(st.roomQuest.stepIndex).toBe(1);
    expect(st.inventory.some((s) => s.kind === 'sealant')).toBe(false);
    expect(st.log.some((e) => e.loreId === 'LOG-RQ-VENT-SEALED')).toBe(true);
    expect(resolveHintLine(st)).toBeNull();

    placeOnQuest(st, 4, 2);
    expect(resolveHintLine(st)).toBe('UI-RQ-VENT-B');
    expect(tryRoomQuest(st)).toBe(true);
    expect(st.roomQuest.done).toBe(true);
    expect(st.extractFavor).toEqual({ kind: 'pattern_fail_safe' });
  });
});
