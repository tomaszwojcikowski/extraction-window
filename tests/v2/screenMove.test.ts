import { describe, expect, it } from 'vitest';
import {
  cardinalFromLook,
  moveFromScreenIntent,
  screenIntentFromKey,
  stepToward,
} from '../../src/v2/screenMove';

describe('camera-relative cardinals', () => {
  it('snaps the default 3/4 look to grid north so W matches v1 at rest', () => {
    expect(cardinalFromLook(-9.5, -10.5)).toEqual({ dx: 0, dy: -1 });
    expect(moveFromScreenIntent('forward', -9.5, -10.5)).toEqual({ dx: 0, dy: -1 });
    expect(moveFromScreenIntent('back', -9.5, -10.5)).toEqual({ dx: 0, dy: 1 });
    expect(moveFromScreenIntent('right', -9.5, -10.5)).toEqual({ dx: 1, dy: 0 });
    expect(moveFromScreenIntent('left', -9.5, -10.5)).toEqual({ dx: -1, dy: 0 });
  });

  it('remaps WASD when the camera looks along +X', () => {
    expect(moveFromScreenIntent('forward', 1, 0)).toEqual({ dx: 1, dy: 0 });
    expect(moveFromScreenIntent('left', 1, 0)).toEqual({ dx: 0, dy: -1 });
    expect(moveFromScreenIntent('right', 1, 0)).toEqual({ dx: 0, dy: 1 });
  });

  it('never returns a diagonal, even on a 45° look', () => {
    const step = cardinalFromLook(1, 1);
    expect(Math.abs(step.dx) + Math.abs(step.dy)).toBe(1);
  });

  it('keeps left/right orthogonal to forward', () => {
    const f = moveFromScreenIntent('forward', -4, 9);
    const r = moveFromScreenIntent('right', -4, 9);
    expect(f.dx * r.dx + f.dy * r.dy).toBe(0);
  });

  it('maps keys to screen intent, not world axes', () => {
    expect(screenIntentFromKey({ key: 'w' } as KeyboardEvent)).toBe('forward');
    expect(screenIntentFromKey({ key: 'ArrowLeft' } as KeyboardEvent)).toBe('left');
    expect(screenIntentFromKey({ key: '.' } as KeyboardEvent)).toBeNull();
  });

  it('steps toward a click on the longer axis', () => {
    expect(stepToward(3, 3, 3, 3)).toBeNull();
    expect(stepToward(0, 0, 4, 1)).toEqual({ dx: 1, dy: 0 });
    expect(stepToward(0, 0, 1, -5)).toEqual({ dx: 0, dy: -1 });
  });
});
