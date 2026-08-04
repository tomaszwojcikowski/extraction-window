import { describe, expect, it } from 'vitest';
import { createGame, applyAction } from '../../src/sim';
import { contextHint } from '../../src/game/presenters/ContextHints';
import { hasItem } from '../../src/sim/inventory';

describe('contextHint coaching', () => {
  it('returns skill hint when skillPick is set', () => {
    const st = createGame(42);
    st.skillPick = ['triage', 'deep_reserve'];
    expect(contextHint(st)).toBe('UI-HINT-SKILL');
  });

  it('skips med tip when kit has no field hypo', () => {
    const st = createGame(42);
    st.player.hp = 5;
    st.inventory = st.inventory.filter((s) => s.kind !== 'med' && s.kind !== 'ration');
    expect(hasItem(st, 'med')).toBe(false);
    expect(contextHint(st)).not.toBe('UI-HINT-USE-MED');
  });

  it('hints med when critical and field hypo available', () => {
    const st = createGame(42);
    st.player.hp = 5;
    // Clear tile/item tips
    st.items = st.items.filter((i) => !(i.x === st.player.x && i.y === st.player.y));
    const tile = st.tiles[st.player.y]![st.player.x]!;
    if (tile.kind === 'exit' || tile.kind === 'poi' || tile.kind === 'quest') {
      tile.kind = 'floor';
    }
    expect(hasItem(st, 'med')).toBe(true);
    expect(contextHint(st)).toBe('UI-HINT-USE-MED');
  });

  it('hints patch when bleeding with patch in kit', () => {
    const st = createGame(42);
    st.player.statuses = { bleed: 2 };
    st.items = st.items.filter((i) => !(i.x === st.player.x && i.y === st.player.y));
    const tile = st.tiles[st.player.y]![st.player.x]!;
    tile.kind = 'floor';
    expect(contextHint(st)).toBe('UI-HINT-USE-PATCH');
  });

  it('hints equip when blade in kit but not worn', () => {
    const st = createGame(42);
    st.player.hp = st.player.maxHp;
    st.player.energy = st.player.maxEnergy;
    st.player.armor = st.player.maxArmor;
    st.player.statuses = {};
    st.items = st.items.filter((i) => !(i.x === st.player.x && i.y === st.player.y));
    st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
    st.inventory.push({ kind: 'blade', count: 1 });
    st.player.equip.tool = null;
    expect(contextHint(st)).toBe('UI-HINT-EQUIP');
  });
});

describe('kit use failure clarity', () => {
  it('logs LOG-USE-EMPTY on empty kit', () => {
    const st = createGame(42);
    st.inventory = [];
    applyAction(st, { type: 'use' });
    expect(st.log.some((l) => l.loreId === 'LOG-USE-EMPTY')).toBe(true);
  });

  it('logs LOG-USE-QUEST for Splice Key', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'relay_key', count: 1 }];
    st.ui.selectedSlot = 0;
    applyAction(st, { type: 'use' });
    expect(st.log.some((l) => l.loreId === 'LOG-USE-QUEST')).toBe(true);
  });
});
