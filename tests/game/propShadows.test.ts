import { describe, expect, it } from 'vitest';
import { propShadowTall, tileCastsPropShadow } from '../../src/game/views/propShadows';
import type { TileKind } from '../../src/sim/types';

describe('propShadows', () => {
  it('marks upright furniture and POIs as casters, not recessed terrain', () => {
    const yes: TileKind[] = [
      'landmark',
      'quest',
      'beacon',
      'exit',
      'shuttle',
      'sealed',
      'rubble',
    ];
    for (const kind of yes) expect(tileCastsPropShadow(kind)).toBe(true);
    expect(tileCastsPropShadow('floor')).toBe(false);
    expect(tileCastsPropShadow('scrub')).toBe(false);
    expect(tileCastsPropShadow('tripwire')).toBe(false);
    expect(tileCastsPropShadow('wall')).toBe(false);
    expect(tileCastsPropShadow('hazard')).toBe(false);
    expect(tileCastsPropShadow('vent')).toBe(false);
    expect(tileCastsPropShadow('brine_pool')).toBe(false);
    // Opaque nests use occluder umbra — no second prop cast.
    expect(tileCastsPropShadow('scrub_nest')).toBe(false);
  });

  it('treats upright fixtures as tall and pads as short', () => {
    expect(propShadowTall('beacon')).toBe(true);
    expect(propShadowTall('quest')).toBe(true);
    expect(propShadowTall('landmark')).toBe(true);
    expect(propShadowTall('shuttle')).toBe(false);
    expect(propShadowTall('rubble')).toBe(false);
  });
});
