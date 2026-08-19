import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../../src/sim';
import { tickBusPressure } from '../../src/sim/bus';
import { checkLose } from '../../src/sim/turn';
import { hasItem } from '../../src/sim/inventory';
import { contextHint } from '../../src/game/presenters/ContextHints';
import { fieldHudChips } from '../../src/game/presenters/FieldHud';
import { lore } from '../../src/data/lore';

describe('bus pressure', () => {
  it('warns once when power crosses a remaining mark', () => {
    const st = createGame(1, { skipTutorial: true });
    st.player.energy = 18;
    tickBusPressure(st, 41);
    expect(st.log.filter((l) => l.loreId === 'LOG-BUS-WARN')).toHaveLength(1);
    expect(st.player.energy).toBe(18);
  });

  it('does not warn again while sitting under the mark', () => {
    const st = createGame(1, { skipTutorial: true });
    st.player.energy = 18;
    tickBusPressure(st, 18);
    expect(st.log.some((l) => l.loreId === 'LOG-BUS-WARN')).toBe(false);
  });

  it('gives one failing turn at 0 before power death', () => {
    const st = createGame(1, { skipTutorial: true });
    st.player.energy = 0;
    checkLose(st);
    expect(st.status).toBe('playing');
    expect(st.busFailing).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-BUS-FAILING')).toBe(true);

    checkLose(st);
    expect(st.status).toBe('lost');
    expect(st.loseReason).toBe('energy');
  });

  it('clears failing after a Power Cell and survives the next check', () => {
    const st = createGame(1, { skipTutorial: true });
    st.player.energy = 0;
    checkLose(st);
    expect(st.busFailing).toBe(true);
    const idx = st.inventory.findIndex((s) => s.kind === 'energy');
    st.ui.selectedSlot = idx;
    expect(applyAction(st, { type: 'use' }).status).toBe('playing');
    expect(st.player.energy).toBeGreaterThan(0);
    expect(st.busFailing).toBe(false);
  });

  it('does not kill on a hatch check while failing', () => {
    const st = createGame(1, { skipTutorial: true });
    st.player.energy = 0;
    st.busFailing = true;
    checkLose(st, { skipBus: true });
    expect(st.status).toBe('playing');
  });

  it('coaches a cell at last-chance power ahead of hatch tips', () => {
    const st = createGame(1, { skipTutorial: true });
    st.enemies = [];
    st.player.energy = 0;
    st.busFailing = true;
    st.items = [];
    st.tiles[st.player.y]![st.player.x] = {
      kind: 'exit',
      walkable: true,
      transparent: true,
    };
    expect(hasItem(st, 'energy')).toBe(true);
    expect(contextHint(st)).toBe('UI-HINT-USE-ENERGY');
  });

  it('asks for a ground cell when the kit has none', () => {
    const st = createGame(1, { skipTutorial: true });
    st.enemies = [];
    st.player.energy = 4;
    st.inventory = st.inventory.filter((s) => s.kind !== 'energy');
    st.items = [];
    st.tiles[st.player.y]![st.player.x] = {
      kind: 'floor',
      walkable: true,
      transparent: true,
    };
    expect(contextHint(st)).toBe('UI-HINT-BUS-LOW');
  });

  it('pins a Power fail chip while the grace turn is live', () => {
    const st = createGame(1, { skipTutorial: true });
    st.busFailing = true;
    expect(fieldHudChips(st).some((c) => c.label === lore('UI-BUS-FAIL'))).toBe(true);
  });
});
