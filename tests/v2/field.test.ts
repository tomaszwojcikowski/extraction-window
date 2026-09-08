import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/sim';
import { canvasViewSize, playerLightReadout } from '../../src/v2/field';

describe('v2 flood readout', () => {
  it('reports LIT or SHADOW from the sim flood grid', () => {
    const state = createGame(42, { skipTutorial: true });
    const light = playerLightReadout(state);
    expect(light.band === 'LIT' || light.band === 'SHADOW').toBe(true);
    expect(light.brightness).toBeGreaterThanOrEqual(0);
    expect(light.brightness).toBeLessThanOrEqual(1);
  });
});

describe('v2 canvas view size', () => {
  it('uses the CSS box so a widescreen canvas is not treated as square', () => {
    expect(canvasViewSize({ clientWidth: 1920, clientHeight: 1080 })).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(canvasViewSize({ clientWidth: 0, clientHeight: 0 })).toEqual({
      width: 1,
      height: 1,
    });
  });
});
