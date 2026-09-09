import { describe, expect, it } from 'vitest';
import { createGame, finishTutorial, loadSector } from '../../src/sim';
import {
  canvasViewSize,
  fieldMapStamp,
  fieldMapStale,
  playerLightReadout,
  SIM_ALBEDO_FLOOR,
  SIM_ALBEDO_SPAN,
} from '../../src/v2/field';

describe('v2 flood readout', () => {
  it('keeps flood albedo high enough that Lambert tiles stay readable', () => {
    expect(SIM_ALBEDO_FLOOR).toBeGreaterThan(0.55);
    expect(SIM_ALBEDO_FLOOR + SIM_ALBEDO_SPAN).toBeCloseTo(1);
    expect(SIM_ALBEDO_SPAN).toBeGreaterThan(0.2);
  });

  it('reports LIT or SHADOW from the sim flood grid', () => {
    const state = createGame(42, { skipTutorial: true });
    const light = playerLightReadout(state);
    expect(light.band === 'LIT' || light.band === 'SHADOW').toBe(true);
    expect(light.brightness).toBeGreaterThanOrEqual(0);
    expect(light.brightness).toBeLessThanOrEqual(1);
  });
});

describe('v2 field map stamp', () => {
  it('is stale when the hatch swaps sector, drill bay, or map size', () => {
    const drawn = fieldMapStamp({
      sectorIndex: 0,
      tutorialActive: true,
      width: 24,
      height: 16,
    });
    expect(fieldMapStale(drawn, drawn)).toBe(false);
    expect(fieldMapStale(drawn, { ...drawn, sectorIndex: 1 })).toBe(true);
    expect(fieldMapStale(drawn, { ...drawn, tutorialActive: false })).toBe(true);
    expect(fieldMapStale(drawn, { ...drawn, width: 40 })).toBe(true);
    expect(fieldMapStale(drawn, { ...drawn, height: 32 })).toBe(true);
  });

  it('goes stale after a real hatch into the next sector', () => {
    const state = createGame(42, { skipTutorial: true });
    const drawn = fieldMapStamp(state);
    loadSector(state, 1);
    expect(fieldMapStale(drawn, state)).toBe(true);
  });

  it('goes stale when the drill bay drops into plains', () => {
    const state = createGame(42, { skipTutorial: false });
    const drawn = fieldMapStamp(state);
    finishTutorial(state);
    expect(fieldMapStale(drawn, state)).toBe(true);
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
