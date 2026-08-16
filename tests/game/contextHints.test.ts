import { describe, expect, it } from 'vitest';
import { createGame, applyAction } from '../../src/sim';
import { contextHint, resolveHintLine } from '../../src/game/presenters/ContextHints';
import { stanceBadgeLabel } from '../../src/game/presenters/HudBadges';
import { hasItem } from '../../src/sim/inventory';
import { ITEMS } from '../../src/data/items';
import { makeEnemy } from '../sim/fixtures';

describe('contextHint coaching', () => {
  it('returns skill hint when skillPick is set', () => {
    const st = createGame(42);
    st.skillPick = ['triage', 'deep_reserve'];
    expect(contextHint(st)).toBe('UI-HINT-SKILL');
  });

  it('skips med tip when kit has no field hypo', () => {
    const st = createGame(42);
    st.player.hp = 5;
    st.inventory = st.inventory.filter((s) => s.kind !== 'med');
    expect(hasItem(st, 'med')).toBe(false);
    expect(contextHint(st)).not.toBe('UI-HINT-USE-MED');
  });

  it('hints med when critical and field hypo available', () => {
    const st = createGame(42);
    st.player.hp = 5;
    // Clear tile/item tips
    st.items = st.items.filter((i) => !(i.x === st.player.x && i.y === st.player.y));
    const tile = st.tiles[st.player.y]![st.player.x]!;
    if (tile.kind === 'exit' || tile.kind === 'quest') {
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

  it('shows SHADOW instead of LIT in the soft-shadow band', () => {
    const st = createGame(42);
    st.illumination[st.player.y]![st.player.x] = 0.2;

    expect(stanceBadgeLabel(st)).toBe('SHADOW');
  });

  it('prioritizes visible windups over an exit interaction', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    st.tiles[st.player.y]![st.player.x]!.kind = 'exit';
    const sentinel = makeEnemy({
      kind: 'sentinel',
      x: st.player.x + 2,
      y: st.player.y,
      windup: 1,
    });
    sentinel.intent = 'overwatch';
    st.enemies = [sentinel];
    st.visible[sentinel.y]![sentinel.x] = true;

    expect(contextHint(st)).toBe('UI-HINT-TELE');
  });

  it('teaches dual clocks once after the drill bay', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    st.sectorIndex = 0;
    st.turn = 1;
    st.scriptedFired.tut_welcome = true;
    st.items = [];
    st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
    st.inventory = st.inventory.filter((s) => !ITEMS[s.kind].equipSlot);
    st.player.equip = { tool: null, armor: null };
    st.player.hp = st.player.maxHp;
    st.player.energy = st.player.maxEnergy;
    st.player.armor = st.player.maxArmor;
    st.player.statuses = {};
    st.enemies = [];

    expect(contextHint(st)).toBe('UI-HINT-CLOCKS');
    expect(contextHint(st)).not.toBe('UI-HINT-CLOCKS');
  });

  it('teaches extract spine once after clocks', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    st.sectorIndex = 0;
    st.turn = 2;
    st.scriptedFired.tut_welcome = true;
    st.scriptedFired.teach_clocks = true;
    st.objectives.hasRelayKey = false;
    st.items = [];
    st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
    st.inventory = st.inventory.filter((s) => !ITEMS[s.kind].equipSlot);
    st.player.equip = { tool: null, armor: null };
    st.player.hp = st.player.maxHp;
    st.player.energy = st.player.maxEnergy;
    st.player.armor = st.player.maxArmor;
    st.player.statuses = {};
    st.enemies = [];

    expect(contextHint(st)).toBe('UI-HINT-EXTRACT');
    expect(contextHint(st)).not.toBe('UI-HINT-EXTRACT');
  });

  it('teaches flank when two hostiles are in contact', () => {
    const st = createGame(42);
    st.tutorialActive = false;
    st.items = [];
    st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
    st.inventory = st.inventory.filter((s) => !ITEMS[s.kind].equipSlot);
    st.player.equip = { tool: null, armor: null };
    st.player.braceTurns = 0;
    const a = makeEnemy({ kind: 'mite', x: st.player.x + 1, y: st.player.y });
    const b = makeEnemy({ kind: 'mite', x: st.player.x - 1, y: st.player.y });
    st.enemies = [a, b];
    st.visible[a.y]![a.x] = true;
    st.visible[b.y]![b.x] = true;

    expect(contextHint(st)).toBe('UI-HINT-FLANK');
    expect(contextHint(st)).not.toBe('UI-HINT-FLANK');
  });
});

describe('hint line resolver', () => {
  /** Early sector with a visible mite in notice range — peek teach conditions. */
  function peekTeachState() {
    const st = createGame(42);
    st.tutorialActive = false;
    st.sectorIndex = 0;
    st.items = [];
    st.tiles[st.player.y]![st.player.x]!.kind = 'floor';
    const mite = makeEnemy({ kind: 'mite', x: st.player.x + 1, y: st.player.y });
    st.enemies = [mite];
    st.visible[mite.y]![mite.x] = true;
    return st;
  }

  it('gives the line to the one-shot teach when nothing outranks it', () => {
    expect(resolveHintLine(peekTeachState())).toBe('UI-HINT-PEEK-TEACH');
  });

  it('yields the teach to the peek commit tip while Shift is held', () => {
    expect(resolveHintLine(peekTeachState(), { movePreviewActive: true })).toBe('UI-HINT-COMMIT');
  });

  it('yields the teach to a pending skill pick', () => {
    const st = peekTeachState();
    st.skillPick = ['triage', 'deep_reserve'];
    expect(resolveHintLine(st)).toBe('UI-HINT-SKILL');
  });

  it('yields the teach to a visible windup', () => {
    const st = peekTeachState();
    const sentinel = makeEnemy({
      kind: 'sentinel',
      x: st.player.x + 2,
      y: st.player.y,
      windup: 1,
    });
    sentinel.intent = 'overwatch';
    st.enemies.push(sentinel);
    st.visible[sentinel.y]![sentinel.x] = true;
    expect(resolveHintLine(st)).toBe('UI-HINT-TELE');
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
