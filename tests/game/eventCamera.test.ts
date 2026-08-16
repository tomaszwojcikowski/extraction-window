import { describe, expect, it } from 'vitest';
import { pickCameraCue } from '../../src/game/presenters/EventCamera';
import { CameraKick, KICK_DECAY_MS } from '../../src/game/presenters/CameraKick';

describe('CameraKick', () => {
  it('rests at zero offset and no zoom', () => {
    const kick = new CameraKick();
    expect(kick.offset(0)).toEqual({ x: 0, y: 0 });
    expect(kick.zoom(0)).toBe(1);
  });

  it('decays a nudge back to rest inside the cue budget', () => {
    const kick = new CameraKick();
    const cue = pickCameraCue(['LOG-HURT'])!;
    kick.apply(cue, 1000, 3);

    const start = kick.offset(1000);
    expect(Math.hypot(start.x, start.y)).toBeCloseTo(cue.nudgePx, 5);

    const mid = kick.offset(1000 + KICK_DECAY_MS / 2);
    expect(Math.hypot(mid.x, mid.y)).toBeLessThan(Math.hypot(start.x, start.y));

    const after = Math.max(cue.shakeMs, KICK_DECAY_MS, cue.vignetteMs * 0.5, cue.zoomMs * 0.6);
    expect(kick.offset(1001 + after)).toEqual({ x: 0, y: 0 });
  });

  it('eases zoom from the cue peak back to 1', () => {
    const kick = new CameraKick();
    const cue = pickCameraCue(['LOG-HURT'])!;
    kick.apply(cue, 0, 0);
    expect(kick.zoom(0)).toBeCloseTo(cue.zoomScale, 5);
    expect(kick.zoom(cue.zoomMs / 2)).toBeLessThan(cue.zoomScale);
    expect(kick.zoom(cue.zoomMs)).toBe(1);
  });

  it('reset drops a live kick so a new run starts at rest', () => {
    const kick = new CameraKick();
    kick.apply(pickCameraCue(['LOG-HURT'])!, 0, 0);
    kick.reset();
    expect(kick.offset(0)).toEqual({ x: 0, y: 0 });
    expect(kick.zoom(0)).toBe(1);
  });
});

describe('pickCameraCue', () => {
  it('returns null for routine logs and status ticks', () => {
    expect(pickCameraCue(['LOG-WAIT', 'LOG-PICKUP'])).toBeNull();
    expect(pickCameraCue(['LOG-STATUS-BLEED'])).toBeNull();
    expect(pickCameraCue(['LOG-ION-PULSE'])).toBeNull();
    expect(pickCameraCue(['LOG-PB-STRESS'])).toBeNull();
  });

  it('picks the highest-priority cue when several fire', () => {
    const cue = pickCameraCue(['LOG-KILL', 'LOG-ION-FRONT', 'LOG-HURT']);
    expect(cue?.id).toBe('ion_form');
  });

  it('prefers hurt punch over kill reward', () => {
    const cue = pickCameraCue(['LOG-KILL', 'LOG-HURT']);
    expect(cue?.id).toBe('hurt');
    expect(cue?.profile).toBe('punch');
  });

  it('maps flare bloom and extract bloom', () => {
    expect(pickCameraCue(['LOG-USE-FLARE'])?.ignite).toBe('flare');
    expect(pickCameraCue(['LOG-USE-FLARE'])?.profile).toBe('bloom');
    expect(pickCameraCue(['LOG-EXTRACT'])?.profile).toBe('bloom');
  });

  it('keeps combat punches inside the ~200ms juice budget', () => {
    for (const id of ['LOG-HURT', 'LOG-TELE-POUNCE'] as const) {
      const cue = pickCameraCue([id])!;
      expect(cue.zoomMs).toBeLessThanOrEqual(200);
      expect(cue.shakeMs).toBeLessThanOrEqual(200);
      expect(cue.zoomScale).toBeGreaterThan(1);
    }
  });

  it('does not cue on unmapped lore ids', () => {
    expect(pickCameraCue(['LOG-WAIT' as never])).toBeNull();
  });

  it('treats approach shear as pressure, not a punch', () => {
    const shear = pickCameraCue(['LOG-EVT-SHEAR'])!;
    expect(shear.profile).toBe('pressure');
    expect(shear.shakeMs).toBe(0);
  });

  it('softens kills relative to hurt', () => {
    const kill = pickCameraCue(['LOG-KILL'])!;
    const hurt = pickCameraCue(['LOG-HURT'])!;
    expect(kill.profile).toBe('reward');
    expect(kill.shakeMs).toBe(0);
    expect(kill.zoomScale).toBeLessThan(hurt.zoomScale);
  });
});
