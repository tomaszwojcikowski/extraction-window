import { describe, expect, it } from 'vitest';
import { applyAction, createGame, loadSector } from '../../src/sim';
import { contextHint } from '../../src/game/presenters/ContextHints';
import { getSector } from '../../src/data/encounters';

/** Stand the surveyor on the sector hatch with an empty underfoot tip stack. */
function onExit(st: ReturnType<typeof createGame>): void {
  const exit = st.exitPos!;
  st.player.x = exit.x;
  st.player.y = exit.y;
  st.items = st.items.filter((i) => !(i.x === exit.x && i.y === exit.y));
  st.enemies = [];
  st.skillPick = null;
}

describe('blocked hatch explains how to progress', () => {
  it('ruin hatch asks for the Splice Key', () => {
    const st = createGame(42);
    loadSector(st, getSector(5).index); // ruin
    expect(st.sectorId).toBe('ruin');
    st.inventory = st.inventory.filter((s) => s.kind !== 'relay_key');
    st.items = st.items.filter((i) => i.kind !== 'relay_key');
    onExit(st);

    expect(contextHint(st)).toBe('UI-HINT-EXIT-NEED-KEY');
    applyAction(st, { type: 'exit' });
    expect(st.log.some((l) => l.loreId === 'LOG-EXIT-NEED-KEY')).toBe(true);
    expect(st.sectorId).toBe('ruin');
  });

  it('vault hatch asks for the Nav Lattice', () => {
    const st = createGame(42);
    loadSector(st, getSector(11).index); // vault
    expect(st.sectorId).toBe('vault');
    st.inventory = st.inventory.filter((s) => s.kind !== 'nav_core');
    st.items = st.items.filter((i) => i.kind !== 'nav_core');
    st.objectives.hasNavCore = false;
    onExit(st);

    expect(contextHint(st)).toBe('UI-HINT-EXIT-NEED-CORE');
    applyAction(st, { type: 'exit' });
    expect(st.log.some((l) => l.loreId === 'LOG-EXIT-NEED-CORE')).toBe(true);
    expect(st.sectorId).toBe('vault');
  });

  it('beacon hatch asks for authorization when the key is already in hand', () => {
    const st = createGame(42);
    loadSector(st, getSector(6).index); // beacon
    expect(st.sectorId).toBe('beacon');
    st.objectives.beaconOpen = false;
    if (!st.inventory.some((s) => s.kind === 'relay_key')) {
      st.inventory.push({ kind: 'relay_key', count: 1 });
    }
    st.objectives.hasRelayKey = true;
    onExit(st);

    expect(contextHint(st)).toBe('UI-HINT-EXIT-NEED-BEACON');
    applyAction(st, { type: 'exit' });
    expect(st.log.some((l) => l.loreId === 'LOG-EXIT-NEED-BEACON')).toBe(true);
    expect(st.objectives.beaconOpen).toBe(false);
  });
});
