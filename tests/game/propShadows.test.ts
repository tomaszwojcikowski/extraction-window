import { describe, expect, it } from 'vitest';
import { tileCastsPropShadow } from '../../src/game/views/propShadows';
import type { TileKind } from '../../src/sim/types';

describe('propShadows', () => {
  it('marks upright furniture for propLayer, not recessed terrain', () => {
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
    expect(tileCastsPropShadow('sump')).toBe(false);
    expect(tileCastsPropShadow('scrub_nest')).toBe(false);
  });
});
