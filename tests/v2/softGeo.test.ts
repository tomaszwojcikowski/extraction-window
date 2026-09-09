import { describe, expect, it } from 'vitest';
import { CapsuleGeometry, SphereGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ball, cap, roundBox } from '../../src/v2/softGeo';

describe('v2 soft primitives', () => {
  it('builds rounded boxes and capsules instead of hard cubes', () => {
    expect(roundBox(0.4, 0.2, 0.3)).toBeInstanceOf(RoundedBoxGeometry);
    expect(cap(0.04, 0.1)).toBeInstanceOf(CapsuleGeometry);
    expect(ball(0.12)).toBeInstanceOf(SphereGeometry);
    expect(ball(0.12).parameters.widthSegments).toBeGreaterThanOrEqual(12);
  });
});
