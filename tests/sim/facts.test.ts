import { describe, expect, it } from 'vitest';
import { FACT_CODEX } from '../../src/data/codex';
import { LORE } from '../../src/data/lore';
import { createGame } from '../../src/sim';
import { collectSectorFacts, factsSatisfy, pickFactCodex } from '../../src/sim/facts';
import { EM_WARN } from '../../src/sim/emStress';
import { makeEnemy } from './fixtures';

describe('room facts', () => {
  it('only reports terrain that is actually on the map', () => {
    const st = createGame(42);
    for (const row of st.tiles) {
      for (const tile of row) {
        if (tile.kind === 'vent' || tile.kind === 'brine_pool') tile.kind = 'floor';
      }
    }
    const facts = collectSectorFacts(st);
    expect(facts.has('vent')).toBe(false);
    expect(facts.has('brine_pool')).toBe(false);

    st.tiles[st.player.y]![st.player.x + 1]!.kind = 'vent';
    expect(collectSectorFacts(st).has('vent')).toBe(true);
  });

  it('buckets ecology by what is alive and present', () => {
    const st = createGame(42);
    st.enemies = [makeEnemy({ kind: 'mite', x: st.player.x + 2, y: st.player.y })];
    expect(collectSectorFacts(st).has('fauna_swarm')).toBe(true);
    expect(collectSectorFacts(st).has('fauna_hunter')).toBe(false);

    st.enemies[0]!.alive = false;
    expect(collectSectorFacts(st).has('fauna_swarm')).toBe(false);
  });

  it('reports run pressure only once contaminated', () => {
    const st = createGame(42);
    st.emStress = 0;
    expect(collectSectorFacts(st).has('em_warn')).toBe(false);
    st.emStress = EM_WARN;
    expect(collectSectorFacts(st).has('em_warn')).toBe(true);
  });

  it('never satisfies an unbound requirement list', () => {
    expect(factsSatisfy(new Set(['vent']), [])).toBe(false);
  });
});

describe('fact-bound codex', () => {
  it('every page has text and at least one required fact', () => {
    for (const entry of FACT_CODEX) {
      expect(entry.id in LORE).toBe(true);
      expect(entry.requires.length).toBeGreaterThan(0);
    }
  });

  it('prefers the most specific page the ground can prove', () => {
    const st = createGame(42);
    st.emStress = EM_WARN;
    st.tiles[st.player.y]![st.player.x + 1]!.kind = 'vent';
    // vent alone would bind CODEX-FACT-VENT; vent + contamination is more specific.
    expect(pickFactCodex(st, [])).toBe('CODEX-FACT-VENT-EM');
  });

  it('does not repeat a page already collected this run', () => {
    const st = createGame(42);
    st.emStress = EM_WARN;
    st.tiles[st.player.y]![st.player.x + 1]!.kind = 'vent';
    expect(pickFactCodex(st, ['CODEX-FACT-VENT-EM'])).not.toBe('CODEX-FACT-VENT-EM');
  });

  it('returns null when no page binds, so callers fall back to the sector brief', () => {
    const st = createGame(42);
    st.emStress = 0;
    st.enemies = [];
    st.npcs = [];
    st.scanScars = [];
    st.poiPos = null;
    for (const row of st.tiles) {
      for (const tile of row) {
        if (tile.kind !== 'wall' && tile.kind !== 'exit') tile.kind = 'floor';
      }
    }
    expect(pickFactCodex(st, [])).toBeNull();
  });
});
