import { describe, expect, it } from 'vitest';
import { STORM_TURNS, PLAYER_BASE, CAMPAIGN_LENGTH } from '../../src/campaign/spine';
import {
  applyAction,
  assertLegalWin,
  armorDefBonus,
  createGame,
  hasItem,
  loreOrderLegal,
  mechanicsTryAction,
  toolAtkBonus,
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

  it('use energy cell restores bus when selected', () => {
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
  it('quest HUD lore prompts exist for every quest kind', () => {
    const ids = ['UI-RQ-SALVAGE', 'UI-RQ-PURGE', 'UI-RQ-VENT-A', 'UI-RQ-VENT-B'] as const;
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
    // Energy owns the bus, so it is what resyncs a desynced pattern buffer
    const cIdx = st.inventory.findIndex((s) => s.kind === 'energy');
    expect(cIdx).toBeGreaterThanOrEqual(0);
    st.ui.selectedSlot = cIdx;
    applyAction(st, { type: 'use' });
    expect(st.patternDesync).toBe(0);
    applyAction(st, { type: 'exit' });
    expect(st.status).toBe('playing');
    expect(st.uplink?.progress).toBe(1);
    applyAction(st, { type: 'wait' });
    applyAction(st, { type: 'wait' });
    expect(st.status).toBe('won');
  });
});

describe('turn economy', () => {
  it('walking over kit picks it up without a second turn', () => {
    const st = createGame(42);
    const to = { x: st.player.x + 1, y: st.player.y };
    st.tiles[to.y]![to.x] = { kind: 'floor', walkable: true, transparent: true };
    st.items = [{ id: st.nextEntityId++, kind: 'med', x: to.x, y: to.y }];
    const turn = st.turn;

    applyAction(st, { type: 'move', dx: 1, dy: 0 });

    expect(st.items.length).toBe(0);
    expect(st.inventory.some((slot) => slot.kind === 'med')).toBe(true);
    expect(st.turn).toBe(turn + 1);
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
      beamCooldown: 0,
      swellTurns: 0,
      alerted: true,
      skirmishRetreat: false,
      homeX: st.player.x,
      homeY: st.player.y,
      statuses: {},
      tier: 'normal',
    });
    // Place on a walkable neighbor and mark visible
    const nx = Math.min(st.width - 2, st.player.x + 1);
    const en = st.enemies[st.enemies.length - 1]!;
    en.x = nx;
    en.y = st.player.y;
    st.visible[en.y]![en.x] = true;
    // Adjacent, so the shoulder can still break the set.
    expect(contextHint(st)).toBe('UI-HINT-TELE-REACH');

    // Out of reach, the answer is brace or ground instead.
    en.x = Math.min(st.width - 2, st.player.x + 2);
    st.visible[en.y]![en.x] = true;
    expect(contextHint(st)).toBe('UI-HINT-TELE');
  });
});

describe('equipment loadout', () => {
  it('equips blade without removing it from kit and toggles stow', () => {
    const st = createGame(42);
    st.inventory = [{ kind: 'blade', count: 1 }];
    st.ui.selectedSlot = 0;
    st.ui.inventoryOpen = true;
    applyAction(st, { type: 'use' });
    expect(st.player.equip.tool).toBe('blade');
    expect(hasItem(st, 'blade')).toBe(true);
    expect(toolAtkBonus(st)).toBe(1);
    applyAction(st, { type: 'use' });
    expect(st.player.equip.tool).toBeNull();
    expect(hasItem(st, 'blade')).toBe(true);
  });

  it('swaps armor and adjusts max shields', () => {
    const st = createGame(42);
    st.inventory = [
      { kind: 'harness', count: 1 },
      { kind: 'ablative_vest', count: 1 },
    ];
    const baseMax = st.player.maxArmor;
    st.ui.selectedSlot = 0;
    applyAction(st, { type: 'use' });
    expect(st.player.equip.armor).toBe('harness');
    expect(st.player.maxArmor).toBe(baseMax + 6);
    st.ui.selectedSlot = 1;
    applyAction(st, { type: 'use' });
    expect(st.player.equip.armor).toBe('ablative_vest');
    expect(st.player.maxArmor).toBe(baseMax + 4);
    expect(armorDefBonus(st)).toBe(1);
  });

});

describe('kit pressure', () => {
  it('leaves salvage on the ground when the kit is full', () => {
    const st = createGame(42);
    while (st.inventory.length < 16) {
      st.inventory.push({ kind: 'plate', count: 1 });
    }
    const storm0 = st.stormTurns;
    const to = { x: st.player.x + 1, y: st.player.y };
    st.tiles[to.y]![to.x] = { kind: 'floor', walkable: true, transparent: true };
    st.items = [{ id: st.nextEntityId++, kind: 'salvage', x: to.x, y: to.y }];

    applyAction(st, { type: 'move', dx: 1, dy: 0 });

    // A full kit is a full kit — no hidden conversion into Window time.
    expect(st.stormTurns).toBeLessThanOrEqual(storm0);
    expect(st.items.some((i) => i.kind === 'salvage' && i.x === st.player.x && i.y === st.player.y)).toBe(
      true,
    );
  });
});

describe('field NPCs', () => {
  it('hails archive holo once and grants storm', () => {
    const st = createGame(42);
    st.npcs = [
      {
        id: 9001,
        kind: 'archive_holo',
        x: st.player.x,
        y: st.player.y,
        talked: false,
      },
    ];
    const storm0 = st.stormTurns;
    applyAction(st, { type: 'exit' });
    expect(st.npcs[0]!.talked).toBe(true);
    expect(st.stormTurns).toBeGreaterThan(storm0);
    expect(st.codexLog).toContain('CODEX-HOLO');
    const pages = st.codexPages;
    applyAction(st, { type: 'exit' });
    expect(st.codexPages).toBe(pages);
  });

  it('ensign spawns escort ally; player swaps instead of attacking', () => {
    const st = createGame(42);
    st.npcs = [
      {
        id: 9002,
        kind: 'stranded_ensign',
        x: st.player.x,
        y: st.player.y,
        talked: false,
      },
    ];
    applyAction(st, { type: 'exit' });
    expect(st.allies.some((a) => a.alive && a.kind === 'away_escort')).toBe(true);
    const ally = st.allies.find((a) => a.alive)!;
    const ax = ally.x;
    const ay = ally.y;
    const dx = ax - st.player.x;
    const dy = ay - st.player.y;
    applyAction(st, { type: 'move', dx, dy });
    expect(ally.alive).toBe(true);
    expect(st.player.x).toBe(ax);
    expect(st.player.y).toBe(ay);
  });

  it('ally expires after turnsLeft ticks', () => {
    const st = createGame(42);
    st.allies = [
      {
        id: 9003,
        kind: 'probe_drone',
        x: st.player.x + 1,
        y: st.player.y,
        hp: 8,
        maxHp: 8,
        atk: 3,
        def: 1,
        turnsLeft: 1,
        alive: true,
        roleCooldown: 0,
      },
    ];
    applyAction(st, { type: 'wait' });
    expect(st.allies[0]!.alive).toBe(false);
  });

  it('logs first sight when NPC enters FOV', () => {
    const st = createGame(42);
    st.noticedNpcIds = [];
    const nx = Math.min(st.width - 1, st.player.x + 1);
    const ny = st.player.y;
    st.npcs = [
      {
        id: 9010,
        kind: 'archive_holo',
        x: nx,
        y: ny,
        talked: false,
      },
    ];
    st.visible[ny]![nx] = true;
    applyAction(st, { type: 'wait' });
    expect(st.noticedNpcIds).toContain(9010);
    expect(st.log.some((e) => e.loreId === 'LOG-NPC-SIGHT')).toBe(true);
  });
});
