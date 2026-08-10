import { describe, expect, it } from 'vitest';
import { propShadowTall, tileCastsPropShadow } from '../../src/game/views/propShadows';
import type { TileKind } from '../../src/sim/types';

describe('propShadows', () => {
  it('marks furniture and POIs as casters, not soft scrub', () => {
    const yes: TileKind[] = [
      'landmark',
      'quest',
      'hazard',
      'vent',
      'brine_pool',
      'beacon',
      'exit',
      'shuttle',
      'sealed',
      'rubble',
      'scrub_nest',
    ];
    for (const kind of yes) expect(tileCastsPropShadow(kind)).toBe(true);
    expect(tileCastsPropShadow('floor')).toBe(false);
    expect(tileCastsPropShadow('scrub')).toBe(false);
    expect(tileCastsPropShadow('tripwire')).toBe(false);
    expect(tileCastsPropShadow('wall')).toBe(false);
  });

  it('treats beacons and landmarks as tall casters', () => {
    expect(propShadowTall('beacon')).toBe(true);
    expect(propShadowTall('shuttle')).toBe(true);
    expect(propShadowTall('landmark')).toBe(true);
    expect(propShadowTall('hazard')).toBe(false);
    expect(propShadowTall('rubble')).toBe(false);
  });
});
