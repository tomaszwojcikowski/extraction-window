import { describe, expect, it } from 'vitest';
import { lampCarryT } from '../../src/v2/field';

describe('v2 lamp carry', () => {
  it('eases FOW reveal slower than a normal wash lerp', () => {
    expect(lampCarryT(0, false)).toBe(0);
    expect(lampCarryT(1, false)).toBe(1);
    expect(lampCarryT(0.5, false)).toBe(0.5);
    expect(lampCarryT(0.5, true)).toBe(0.25);
    expect(lampCarryT(0.5, true)).toBeLessThan(lampCarryT(0.5, false));
  });
});
