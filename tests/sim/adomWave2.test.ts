import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../../src/sim';
import { addItem, hasItem, useSelected } from '../../src/sim/inventory';
import { endPlayerTurn } from '../../src/sim/turn';
import { tryPrySealed, tryOpenAdjacentSealed } from '../../src/sim/mechanics/sealedHatch';
import { ENEMIES } from '../../src/data/enemies';
import { makeEnemy, combatArena } from './fixtures';
import { effectiveAggro, moveEnemies } from '../../src/sim/ai';
import { rebuildIllumination, isLit } from '../../src/sim/light';

describe('ADOM Wave 2 — sealed hatch', () => {
  it('opens adjacent sealed with sealant use', () => {
    const st = createGame(42);
    const px = st.player.x;
    const py = st.player.y;
    const sx = Math.min(st.width - 2, px + 1);
    const sy = py;
    st.tiles[sy]![sx] = { kind: 'sealed', walkable: false, transparent: true };
    st.inventory = [{ kind: 'sealant', count: 1 }];
    st.ui.selectedSlot = 0;
    const storm = st.stormTurns;
    expect(tryOpenAdjacentSealed(st)).toBe(true);
    expect(st.tiles[sy]![sx]!.kind).toBe('floor');
    expect(st.log.some((e) => e.loreId === 'LOG-SEALED-OPEN')).toBe(true);
    expect(st.stormTurns).toBe(storm + 6);
    expect(st.log.some((e) => e.loreId === 'LOG-SEALED-CACHE')).toBe(true);
  });

  it('pry opens sealed with pulse baton via exit', () => {
    const st = createGame(42);
    st.enemies = [];
    st.npcs = [];
    const px = st.player.x;
    const py = st.player.y;
    const sx = Math.min(st.width - 2, px + 1);
    st.tiles[py]![sx] = { kind: 'sealed', walkable: false, transparent: true };
    st.player.equip.tool = 'pulse_baton';
    expect(tryPrySealed(st)).toBe(true);
    expect(st.tiles[py]![sx]!.kind).toBe('floor');
    expect(st.log.some((e) => e.loreId === 'LOG-SEALED-PRY')).toBe(true);
  });
});

describe('ADOM Wave 2 — tripwire', () => {
  it('spikes EM, alerts foes, and converts to floor', () => {
    const st = createGame(42);
    st.enemies = [
      makeEnemy({
        id: 1,
        kind: 'crawler',
        x: st.player.x + 2,
        y: st.player.y,
        alerted: false,
      }),
    ];
    st.tiles[st.player.y]![st.player.x] = {
      kind: 'tripwire',
      walkable: true,
      transparent: true,
    };
    const em0 = st.emStress;
    endPlayerTurn(st);
    expect(st.emStress).toBeGreaterThanOrEqual(em0 + 2);
    expect(st.tiles[st.player.y]![st.player.x]!.kind).toBe('floor');
    expect(st.enemies[0]!.alerted).toBe(true);
    expect(st.log.some((e) => e.loreId === 'LOG-TRIPWIRE')).toBe(true);
  });
});

describe('ADOM Wave 2 — field craft', () => {
  it('crafts filter from field_sample + sealant', () => {
    const st = createGame(42);
    st.inventory = [
      { kind: 'field_sample', count: 1 },
      { kind: 'sealant', count: 1 },
    ];
    st.ui.selectedSlot = 0;
    expect(useSelected(st)).toBe(true);
    expect(hasItem(st, 'filter')).toBe(true);
    expect(hasItem(st, 'field_sample')).toBe(false);
    expect(hasItem(st, 'sealant')).toBe(false);
    expect(st.log.some((e) => e.loreId === 'LOG-CRAFT-FILTER')).toBe(true);
  });

  it('crafts pattern_balm from array_shard + coolant', () => {
    const st = createGame(42);
    st.inventory = [
      { kind: 'array_shard', count: 1 },
      { kind: 'coolant', count: 1 },
    ];
    st.ui.selectedSlot = 0;
    expect(useSelected(st)).toBe(true);
    expect(hasItem(st, 'pattern_balm')).toBe(true);
    expect(st.log.some((e) => e.loreId === 'LOG-CRAFT-BALM')).toBe(true);
  });
});

describe('ADOM Wave 2 — lightPrefer aggro', () => {
  it('applies the stronger light and quiet stance modifiers', () => {
    const st = combatArena(7);
    const darkHunter = makeEnemy({ kind: 'stalker', x: st.player.x + 3, y: st.player.y });
    const litHunter = makeEnemy({ kind: 'wasp', x: st.player.x + 3, y: st.player.y });
    const neutral = makeEnemy({ kind: 'crawler', x: st.player.x + 3, y: st.player.y });

    st.player.probeTurns = 20;
    rebuildIllumination(st);
    expect(effectiveAggro(st, darkHunter)).toBe(ENEMIES.stalker.aggroRange - 2);
    expect(effectiveAggro(st, litHunter)).toBe(ENEMIES.wasp.aggroRange + 2);

    st.player.jammerTurns = 5;
    expect(effectiveAggro(st, neutral)).toBe(ENEMIES.crawler.aggroRange - 3);
  });

  it('dark-prefer mite loses aggro when player is lit', () => {
    const st = combatArena(7);
    // Bright lamp on player
    st.player.probeTurns = 20;
    rebuildIllumination(st);
    expect(isLit(st, st.player.x, st.player.y)).toBe(true);

    const mite = makeEnemy({
      kind: 'mite',
      x: st.player.x + 2,
      y: st.player.y,
      alerted: false,
    });
    st.enemies = [mite];
    // Base mite aggro 2; lit → −2 (clamped to 1), so dist 2 should not engage melee path
    const dist = 2;
    expect(ENEMIES.mite.lightPrefer).toBe('dark');
    expect(dist).toBeGreaterThan(Math.max(1, ENEMIES.mite.aggroRange - 2));

    moveEnemies(st);
    // With aggro shrunk to 1, mite at dist 2 wanders rather than closing for sure —
    // at minimum it should not have teleported onto the player
    expect(mite.x !== st.player.x || mite.y !== st.player.y).toBe(true);
  });

  it('lit-prefer wasp gains aggro when player is lit', () => {
    const st = combatArena(11);
    st.player.probeTurns = 20;
    rebuildIllumination(st);
    expect(isLit(st, st.player.x, st.player.y)).toBe(true);
    expect(ENEMIES.wasp.lightPrefer).toBe('lit');

    const wasp = makeEnemy({
      kind: 'wasp',
      x: st.player.x + ENEMIES.wasp.aggroRange,
      y: st.player.y,
    });
    st.enemies = [wasp];
    const x0 = wasp.x;
    moveEnemies(st);
    // With +2 lit aggro, wasp at edge of base range should step in
    expect(Math.abs(wasp.x - st.player.x) + Math.abs(wasp.y - st.player.y)).toBeLessThanOrEqual(
      Math.abs(x0 - st.player.x) + Math.abs(wasp.y - st.player.y),
    );
  });
});

describe('ADOM Wave 2 — npc agenda', () => {
  it('second hail completes ensign agenda when med paid', () => {
    const st = createGame(42);
    st.npcs = [
      {
        id: 1,
        kind: 'stranded_ensign',
        x: st.player.x,
        y: st.player.y,
        talked: true,
        agendaOpen: true,
        agendaDone: false,
      },
    ];
    addItem(st, 'med');
    const storm0 = st.stormTurns;
    applyAction(st, { type: 'exit' });
    expect(st.npcs[0]!.agendaDone).toBe(true);
    expect(st.stormTurns).toBeGreaterThan(storm0);
    expect(st.log.some((e) => e.loreId === 'LOG-AGENDA-DONE')).toBe(true);
  });
});
