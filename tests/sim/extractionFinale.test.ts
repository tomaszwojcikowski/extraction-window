import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../../src/sim';
import {
  consumeExtractFavor,
  grantExtractFavor,
} from '../../src/sim/extractFavor';

describe('room quest extraction favors', () => {
  it('replaces the active favor and consumes it once', () => {
    const state = createGame(12);
    grantExtractFavor(state, 'storm_shelter');
    grantExtractFavor(state, 'hazard_pass');

    expect(state.extractFavor?.kind).toBe('hazard_pass');
    expect(consumeExtractFavor(state, 'hazard_pass')).toBe(true);
    expect(state.extractFavor).toBeNull();
    expect(consumeExtractFavor(state, 'hazard_pass')).toBe(false);
  });

  it('spends safe-step favor on a hazard crossing', () => {
    const state = createGame(12);
    grantExtractFavor(state, 'hazard_pass');
    state.tiles[state.player.y]![state.player.x] = {
      kind: 'hazard',
      walkable: true,
      transparent: true,
    };
    const energy = state.player.energy;
    applyAction(state, { type: 'wait' });

    expect(state.extractFavor).toBeNull();
    expect(state.player.energy).toBeGreaterThanOrEqual(energy - 1);
  });
});

describe('final ridge uplink', () => {
  it('requires three held turns before extraction completes', () => {
    const state = createGame(12);
    state.sectorId = 'ridge';
    state.shuttlePos = { x: state.player.x, y: state.player.y };
    state.tiles[state.player.y]![state.player.x] = {
      kind: 'shuttle',
      walkable: true,
      transparent: true,
    };
    state.inventory = [{ kind: 'nav_core', count: 1 }];
    state.objectives.usedRelayKey = true;
    state.objectives.beaconOpen = true;

    applyAction(state, { type: 'exit' });
    expect(state.uplink?.progress).toBe(1);
    expect(state.status).toBe('playing');
    applyAction(state, { type: 'wait' });
    expect(state.uplink?.progress).toBe(2);
    applyAction(state, { type: 'wait' });

    expect(state.status).toBe('won');
  });
});
