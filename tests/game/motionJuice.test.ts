import { describe, expect, it } from 'vitest';
import { enemyAnimFrame } from '../../src/game/presenters/enemyAnimFrame';
import { beamLaneHot, tileHatchPulse, windupThreatPulse } from '../../src/game/presenters/threatPulse';
import { igniteTileForCue, pickCameraCue, sectorEnterCue } from '../../src/game/presenters/EventCamera';

describe('enemyAnimFrame', () => {
  it('holds windup pose on frame 2', () => {
    expect(enemyAnimFrame({ windup: 2, intent: 'beam', alerted: true }, 0, false)).toBe(2);
    expect(enemyAnimFrame({ windup: 1, intent: 'pounce', alerted: false }, 3, true)).toBe(2);
  });

  it('strides 1↔2 while moving and idles 0↔1 on patrol', () => {
    expect(enemyAnimFrame({ windup: 0, alerted: false }, 0, true)).toBe(1);
    expect(enemyAnimFrame({ windup: 0, alerted: false }, 1, true)).toBe(2);
    expect(enemyAnimFrame({ windup: 0, alerted: false }, 0, false)).toBe(0);
    expect(enemyAnimFrame({ windup: 0, alerted: false }, 2, false)).toBe(1);
  });

  it('uses alert pose when standing watch', () => {
    expect(enemyAnimFrame({ windup: 0, alerted: true }, 0, false)).toBe(1);
  });
});

describe('threatPulse', () => {
  it('reads hotter on the last windup turn', () => {
    expect(windupThreatPulse(0, 1)).toBeGreaterThan(windupThreatPulse(0, 3));
  });

  it('staggers hatch by tile so rings do not blink in lockstep', () => {
    expect(tileHatchPulse(0, 1, 1)).not.toBe(tileHatchPulse(0, 2, 3));
  });

  it('travels the beam spine along the lane', () => {
    expect(beamLaneHot(0, 0, 3)).toBe(true);
    expect(beamLaneHot(0, 1, 3)).toBe(false);
    expect(beamLaneHot(1, 1, 3)).toBe(true);
    expect(beamLaneHot(0, 3, 3)).toBe(true);
  });
});

describe('igniteTileForCue', () => {
  it('places flare ignite on the newest living source, not a hardcoded origin', () => {
    const cue = pickCameraCue(['LOG-USE-FLARE'])!;
    const at = igniteTileForCue(cue, {
      player: { x: 4, y: 4 },
      lightSources: [
        { x: 1, y: 1 },
        { x: 8, y: 9, life: 5, color: 0xffc85a },
      ],
    });
    expect(at).toEqual({ x: 8, y: 9 });
  });

  it('falls back to the surveyor when no flare emitter is live', () => {
    const cue = pickCameraCue(['LOG-USE-FLARE'])!;
    expect(
      igniteTileForCue(cue, {
        player: { x: 2, y: 3 },
        lightSources: [{ x: 0, y: 0 }],
      }),
    ).toEqual({ x: 2, y: 3 });
  });
});

describe('sectorEnterCue', () => {
  it('is a bloom profile without shake so first-light stays the lead channel', () => {
    const cue = sectorEnterCue();
    expect(cue.profile).toBe('bloom');
    expect(cue.shakeMs).toBe(0);
    expect(cue.zoomMs).toBeLessThanOrEqual(240);
  });
});

describe('pickCameraCue phaser', () => {
  it('ranks a phaser shot above a kill reward', () => {
    const cue = pickCameraCue(['LOG-USE-PHASER', 'LOG-KILL']);
    expect(cue?.id).toBe('phaser');
    expect(cue?.profile).toBe('snap');
  });
});
