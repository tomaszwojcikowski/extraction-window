import { describe, expect, it } from 'vitest';
import type { TileKind } from '../../src/sim/types';
import { createProp, isFieldProp } from '../../src/v2/propMesh';

const KINDS: TileKind[] = [
  'hazard',
  'scrub',
  'rubble',
  'vent',
  'tripwire',
  'sump',
  'scrub_nest',
  'exit',
  'beacon',
  'shuttle',
  'landmark',
  'quest',
  'console',
];

describe('v2 tile prop rigs', () => {
  it('builds a bob group for every walkable field prop', () => {
    for (const kind of KINDS) {
      expect(isFieldProp(kind), kind).toBe(true);
      const rig = createProp(kind);
      expect(rig, kind).toBeTruthy();
      expect(rig!.getObjectByName('bob'), kind).toBeTruthy();
    }
    expect(createProp('floor')).toBeNull();
    expect(createProp('wall')).toBeNull();
    expect(isFieldProp('sealed')).toBe(false);
  });
});
