import { describe, expect, it } from 'vitest';
import { createSurveyor, poseSurveyor, SURVEYOR_HOP_MS, SURVEYOR_PARTS } from '../../src/v2/surveyorMesh';

describe('v2 surveyor rig', () => {
  it('builds the named field-kit parts', () => {
    const rig = createSurveyor();
    expect(rig.name).toBe('surveyor');
    for (const name of SURVEYOR_PARTS) {
      expect(rig.getObjectByName(name), name).toBeTruthy();
    }
  });

  it('swings opposite hips mid-stride', () => {
    const rig = createSurveyor();
    poseSurveyor(rig, 0, 0.5, 1);
    const hipL = rig.getObjectByName('hipL')!.rotation.x;
    const hipR = rig.getObjectByName('hipR')!.rotation.x;
    expect(hipL).toBeGreaterThan(0.5);
    expect(hipR).toBe(-hipL);
    poseSurveyor(rig, 0, null, 1);
    expect(rig.getObjectByName('hipL')!.rotation.x).toBe(0);
  });

  it('bends both knees at mid-hop', () => {
    const rig = createSurveyor();
    poseSurveyor(rig, 0, 0.5, 1);
    expect(rig.getObjectByName('kneeL')!.rotation.x).toBeGreaterThan(0.5);
    expect(rig.getObjectByName('kneeR')!.rotation.x).toBe(
      rig.getObjectByName('kneeL')!.rotation.x,
    );
  });

  it('gives the 3D stride enough time to read as a step', () => {
    expect(SURVEYOR_HOP_MS).toBeGreaterThanOrEqual(260);
  });
});
