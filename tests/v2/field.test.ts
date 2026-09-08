import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/sim';
import { playerLightReadout } from '../../src/v2/field';

describe('v2 flood readout', () => {
  it('reports LIT or SHADOW from the sim flood grid', () => {
    const state = createGame(42, { skipTutorial: true });
    const light = playerLightReadout(state);
    expect(light.band === 'LIT' || light.band === 'SHADOW').toBe(true);
    expect(light.brightness).toBeGreaterThanOrEqual(0);
    expect(light.brightness).toBeLessThanOrEqual(1);
  });
});
