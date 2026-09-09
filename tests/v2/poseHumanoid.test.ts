import { describe, expect, it } from 'vitest';
import { hopLift, hopSquash, hopSwing } from '../../src/v2/poseHumanoid';

describe('v2 humanoid hop curves', () => {
  it('peaks the lift at mid-stride', () => {
    expect(hopLift(0)).toBe(0);
    expect(hopLift(1)).toBe(0);
    expect(hopLift(0.5)).toBe(1);
  });

  it('swings opposite signs at mid-stride', () => {
    expect(hopSwing(0.5, 1, 0.78)).toBeCloseTo(0.78);
    expect(hopSwing(0.5, -1, 0.78)).toBeCloseTo(-0.78);
    expect(hopSwing(0, 1, 0.78)).toBe(0);
  });

  it('squashes only at plant and land', () => {
    expect(hopSquash(0)).toBe(1);
    expect(hopSquash(0.5)).toBe(0);
    expect(hopSquash(1)).toBe(1);
  });
});
