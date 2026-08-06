import { describe, expect, it } from 'vitest';
import { pickCameraCue } from '../../src/game/presenters/EventCamera';

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

  it('can promote notice snap when no louder event', () => {
    expect(pickCameraCue([], { noticeImpact: true })?.profile).toBe('snap');
    expect(pickCameraCue(['LOG-HURT'], { noticeImpact: true })?.id).toBe('hurt');
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
    const notice = pickCameraCue([], { noticeImpact: true })!;
    expect(notice.zoomMs).toBeLessThanOrEqual(200);
    expect(notice.shakeMs).toBeLessThanOrEqual(200);
  });

  it('keeps Quiet hush profile defined but does not cue on Quiet logs', () => {
    expect(pickCameraCue(['LOG-QUIET-ON', 'LOG-USE-JAMMER'])).toBeNull();
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
