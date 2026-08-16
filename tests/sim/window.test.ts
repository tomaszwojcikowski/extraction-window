import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/sim';
import {
  spendWindow,
  windowDrainAt,
  windowDrainRate,
  windowTurnsLeft,
} from '../../src/sim/window';

describe('window drain rate', () => {
  it('is untaxed early, half-taxed from duct, and heaviest on the run home', () => {
    expect(windowDrainRate(0)).toBe(1);
    expect(windowDrainRate(7)).toBe(1);
    expect(windowDrainRate(8)).toBe(1.5);
    // The vault holds the Nav Lattice, so it stays off the heaviest rate.
    expect(windowDrainRate(11)).toBe(1.5);
    expect(windowDrainRate(12)).toBe(2.5);
    expect(windowDrainRate(14)).toBe(2.5);
  });

  it('charges whole units per turn, alternating the mid-spine tax', () => {
    expect(windowDrainAt(0, 10)).toBe(1);
    expect(windowDrainAt(0, 11)).toBe(1);
    // Mid tax lands every other turn so the average is the 1.5 above.
    expect(windowDrainAt(8, 10)).toBe(2);
    expect(windowDrainAt(8, 11)).toBe(1);
    expect(windowDrainAt(12, 10)).toBe(3);
    expect(windowDrainAt(12, 11)).toBe(2);
  });

  it('averages to the advertised rate over a pair of turns', () => {
    for (const sector of [0, 8, 12, 14]) {
      const pair = windowDrainAt(sector, 10) + windowDrainAt(sector, 11);
      expect(pair / 2).toBe(windowDrainRate(sector));
    }
  });
});

describe('window turns remaining', () => {
  it('reports the same units as far fewer turns once the tax bites', () => {
    const state = createGame(12);
    state.stormTurns = 240;

    state.sectorIndex = 0;
    expect(windowTurnsLeft(state)).toBe(240);
    state.sectorIndex = 8;
    expect(windowTurnsLeft(state)).toBe(160);
    state.sectorIndex = 12;
    expect(windowTurnsLeft(state)).toBe(96);
  });

  it('never reports negative turns', () => {
    const state = createGame(12);
    state.stormTurns = -5;
    expect(windowTurnsLeft(state)).toBe(0);
  });
});

describe('spendWindow warnings', () => {
  const warnings = (state: ReturnType<typeof createGame>) =>
    state.log.filter((e) => e.loreId === 'LOG-STORM-WARN').length;

  it('warns when crossing a turns-remaining mark, once', () => {
    const state = createGame(12);
    state.sectorIndex = 0;
    state.stormTurns = 82;

    spendWindow(state, 1);
    expect(warnings(state)).toBe(0);

    spendWindow(state, 1);
    expect(warnings(state)).toBe(1);

    spendWindow(state, 1);
    expect(warnings(state)).toBe(1);
  });

  it('gives the same turns of notice deep in the spine as it does on the flats', () => {
    const flats = createGame(12);
    flats.sectorIndex = 0;
    flats.stormTurns = 81;
    spendWindow(flats, 1);

    const fissure = createGame(12);
    fissure.sectorIndex = 12;
    // 80 turns of notice at 2.5 units a turn is 200 units, not 80.
    fissure.stormTurns = 203;
    spendWindow(fissure, 3);

    expect(warnings(flats)).toBe(1);
    expect(warnings(fissure)).toBe(1);
    expect(windowTurnsLeft(fissure)).toBe(80);
  });
});
