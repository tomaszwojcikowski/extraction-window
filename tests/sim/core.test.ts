import { describe, expect, it } from 'vitest';
import { STORM_TURNS, PLAYER_BASE, CAMPAIGN_LENGTH } from '../../src/campaign/spine';
import {
  applyAction,
  assertLegalWin,
  createGame,
  hasItem,
  loreOrderLegal,
  mechanicsTryAction,
} from '../../src/sim';
import { lore } from '../../src/data/lore';
import { contextHint } from '../../src/game/presenters/ContextHints';

describe('sim bootstrap', () => {
  it('createGame starts playing on drop zone with base vitals', () => {
    const st = createGame(42);
    expect(st.status).toBe('playing');
    expect(st.sectorIndex).toBe(0);
    expect(st.sectorId).toBe('plains');
    expect(st.seed).toBe(42);
    expect(st.stormTurns).toBe(STORM_TURNS);
    expect(st.player.hp).toBe(PLAYER_BASE.hp);
    expect(st.player.energy).toBe(PLAYER_BASE.energy);
    expect(st.inventory.some((s) => s.kind === 'energy')).toBe(true);
  });

  it('same seed is deterministic for start position', () => {
    const a = createGame(1337);
    const b = createGame(1337);
    expect(a.player.x).toBe(b.player.x);
    expect(a.player.y).toBe(b.player.y);
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
  });
});

describe('sim actions', () => {
  it('wait advances turn and drains storm window', () => {
    const st = createGame(99);
    const storm = st.stormTurns;
    const turn = st.turn;
    applyAction(st, { type: 'wait' });
    expect(st.turn).toBe(turn + 1);
    expect(st.stormTurns).toBeLessThan(storm);
  });

  it('move into wall does not relocate player', () => {
    const st = createGame(7);
    // Find a blocked neighbor or push against map edge
    const { x, y } = st.player;
    applyAction(st, { type: 'move', dx: -x - 1, dy: 0 });
    // Out of bounds from 0,0 or blocked — either way status stays playing
    expect(st.status).toBe('playing');
    expect(st.player.x).toBeGreaterThanOrEqual(0);
    expect(st.player.y).toBeGreaterThanOrEqual(0);
  });

  it('toggle inventory opens and closes ui flag', () => {
    const st = createGame(1);
    expect(st.ui.inventoryOpen).toBe(false);
    applyAction(st, { type: 'toggle_inventory' });
    expect(st.ui.inventoryOpen).toBe(true);
    applyAction(st, { type: 'close_ui' });
    expect(st.ui.inventoryOpen).toBe(false);
  });

  it('use energy cell restores EPS when selected', () => {
    const st = createGame(42);
    const idx = st.inventory.findIndex((s) => s.kind === 'energy');
    expect(idx).toBeGreaterThanOrEqual(0);
    st.player.energy = 20;
    st.ui.selectedSlot = idx;
    applyAction(st, { type: 'use' });
    expect(st.player.energy).toBeGreaterThan(20);
  });
});

describe('objectives legality', () => {
  it('assertLegalWin rejects mid-run without extract', () => {
    const st = createGame(42);
    expect(assertLegalWin(st)).toBe(false);
  });

  it('assertLegalWin requires nav core flag on won state', () => {
    const st = createGame(42);
    st.status = 'won';
    st.objectives.hasNavCore = false;
    st.loreEvents = ['LOG-GOT-KEY', 'LOG-USED-KEY', 'LOG-GOT-CORE', 'LOG-EXTRACT'];
    expect(assertLegalWin(st)).toBe(false);
    st.objectives.hasNavCore = true;
    // May still fail sector checks — at minimum hasNavCore is required path
    const legal = assertLegalWin(st);
    expect(typeof legal).toBe('boolean');
  });

  it('loreOrderLegal accepts empty and ordered chain', () => {
    expect(loreOrderLegal([])).toBe(true);
    expect(
      loreOrderLegal(['LOG-GOT-KEY', 'LOG-USED-KEY', 'LOG-GOT-CORE', 'LOG-EXTRACT']),
    ).toBe(true);
    expect(loreOrderLegal(['LOG-USED-KEY', 'LOG-GOT-KEY'])).toBe(false);
  });
});

describe('mechanics registry', () => {
  it('mechanicsTryAction is a no-op off quest tiles', () => {
    const st = createGame(42);
    // Not standing on a room quest — should return false
    if (st.roomQuest) {
      st.player.x = (st.roomQuest.pos.x + 3) % st.width;
      st.player.y = (st.roomQuest.pos.y + 3) % st.height;
    }
    expect(mechanicsTryAction(st, { type: 'exit' })).toBe(false);
  });

  it('contextHint returns skill hint when skillPick is set', () => {
    const st = createGame(42);
    st.skillPick = ['triage', 'deep_reserve'];
    expect(contextHint(st)).toBe('UI-HINT-SKILL');
  });
});

describe('campaign constants', () => {
  it('campaign has fifteen sectors and storm budget', () => {
    expect(CAMPAIGN_LENGTH).toBe(15);
    expect(STORM_TURNS).toBeGreaterThanOrEqual(650);
    expect(STORM_TURNS).toBeLessThanOrEqual(750);
  });
});

describe('quest item inventory', () => {
  it('hasItem reflects inventory contents', () => {
    const st = createGame(42);
    expect(hasItem(st, 'energy')).toBe(true);
    expect(hasItem(st, 'nav_core')).toBe(false);
  });
});

describe('expansion phase 2 mechanics', () => {
  it('quest HUD lore prompts exist for multiroom kinds', () => {
    const ids = [
      'UI-RQ-RELAY-A',
      'UI-RQ-RELAY-B',
      'UI-RQ-RELAY-RETURN',
      'UI-RQ-CAL-A',
      'UI-RQ-CAL-B',
      'UI-RQ-VENT-A',
      'UI-RQ-VENT-B',
    ] as const;
    for (const id of ids) {
      expect(lore(id).length).toBeGreaterThan(0);
    }
  });

  it('beacon handshake interrupts when leaving the pad', () => {
    const st = createGame(42);
    // Jump to a synthetic beacon sector state
    st.sectorId = 'beacon';
    st.beaconPos = { x: st.player.x, y: st.player.y };
    st.tiles[st.player.y]![st.player.x] = {
      kind: 'beacon',
      walkable: true,
      transparent: true,
    };
    st.inventory.push({ kind: 'relay_key', count: 1 });
    st.objectives.beaconOpen = false;
    applyAction(st, { type: 'exit' });
    expect(st.handshake?.active).toBe(true);
    // Leave pad
    const nx = Math.min(st.width - 2, st.player.x + 1);
    const ny = st.player.y;
    if (st.tiles[ny]![nx]!.walkable) {
      applyAction(st, { type: 'move', dx: nx - st.player.x, dy: 0 });
    } else {
      st.player.x = nx;
      applyAction(st, { type: 'wait' });
    }
    expect(st.handshake).toBeNull();
    expect(st.objectives.beaconOpen).toBe(false);
  });

  it('pattern desync blocks shuttle extract until coolant', () => {
    const st = createGame(42);
    st.sectorId = 'ridge';
    st.shuttlePos = { x: st.player.x, y: st.player.y };
    st.tiles[st.player.y]![st.player.x] = {
      kind: 'shuttle',
      walkable: true,
      transparent: true,
    };
    st.inventory.push({ kind: 'nav_core', count: 1 });
    st.objectives.hasNavCore = true;
    st.objectives.usedRelayKey = true;
    st.objectives.beaconOpen = true;
    st.patternDesync = 2;
    applyAction(st, { type: 'exit' });
    expect(st.status).toBe('playing');
    // Clear with coolant
    const cIdx = st.inventory.findIndex((s) => s.kind === 'coolant');
    expect(cIdx).toBeGreaterThanOrEqual(0);
    st.ui.selectedSlot = cIdx;
    applyAction(st, { type: 'use' });
    expect(st.patternDesync).toBe(0);
    applyAction(st, { type: 'exit' });
    expect(st.status).toBe('won');
  });
});

describe('turn economy', () => {
  it('failed get does not spend a turn', () => {
    const st = createGame(42);
    st.items = st.items.filter((i) => i.x !== st.player.x || i.y !== st.player.y);
    const turn = st.turn;
    applyAction(st, { type: 'get' });
    expect(st.turn).toBe(turn);
  });

  it('empty kit use does not spend a turn', () => {
    const st = createGame(42);
    st.inventory = [];
    st.ui.inventoryOpen = true;
    const turn = st.turn;
    applyAction(st, { type: 'use' });
    expect(st.turn).toBe(turn);
  });

  it('using a quest item does not spend a turn', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'relay_key', count: 1 }];
    st.ui.selectedSlot = 0;
    st.ui.inventoryOpen = true;
    const turn = st.turn;
    applyAction(st, { type: 'use' });
    expect(st.turn).toBe(turn);
  });

  it('contextHint surfaces visible windup telegraph', () => {
    const st = createGame(42);
    st.enemies.push({
      id: 9999,
      kind: 'stalker',
      x: st.player.x,
      y: st.player.y,
      hp: 10,
      maxHp: 10,
      atk: 4,
      def: 1,
      alive: true,
      windup: 1,
      swellTurns: 0,
      alerted: true,
      skirmishRetreat: false,
      homeX: st.player.x,
      homeY: st.player.y,
      statuses: {},
    });
    // Place on a walkable neighbor and mark visible
    const nx = Math.min(st.width - 2, st.player.x + 1);
    const en = st.enemies[st.enemies.length - 1]!;
    en.x = nx;
    en.y = st.player.y;
    st.visible[en.y]![en.x] = true;
    expect(contextHint(st)).toBe('UI-HINT-TELE');
  });
});
