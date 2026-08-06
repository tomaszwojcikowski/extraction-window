import { describe, expect, it } from 'vitest';
import { pickCameraCue } from '../../src/game/presenters/EventCamera';

describe('pickCameraCue', () => {
  it('returns null for routine logs', () => {
    expect(pickCameraCue(['LOG-WAIT', 'LOG-PICKUP'])).toBeNull();
  });

  it('picks the highest-priority cue when several fire', () => {
    const cue = pickCameraCue(['LOG-KILL', 'LOG-ION-FRONT', 'LOG-HURT']);
    expect(cue?.id).toBe('ion_form');
  });

  it('prefers hurt over kill', () => {
    expect(pickCameraCue(['LOG-KILL', 'LOG-HURT'])?.id).toBe('hurt');
  });

  it('can promote notice impact when no louder event', () => {
    expect(pickCameraCue([], { noticeImpact: true })?.id).toBe('notice');
    expect(pickCameraCue(['LOG-HURT'], { noticeImpact: true })?.id).toBe('hurt');
  });

  it('maps flare and extract', () => {
    expect(pickCameraCue(['LOG-USE-FLARE'])?.ignite).toBe('flare');
    expect(pickCameraCue(['LOG-EXTRACT'])?.id).toBe('extract');
  });

  it('keeps hurt kick readable (bumped intensity)', () => {
    const hurt = pickCameraCue(['LOG-HURT']);
    expect(hurt?.shakeIntensity).toBeGreaterThanOrEqual(0.004);
    expect(hurt?.nudgePx).toBeGreaterThanOrEqual(8);
  });

  it('zooms in on impactful events', () => {
    expect(pickCameraCue(['LOG-HURT'])?.zoomScale).toBeGreaterThan(1);
    expect(pickCameraCue(['LOG-USE-FLARE'])?.zoomScale).toBeGreaterThan(1);
    expect(pickCameraCue(['LOG-EXTRACT'])?.zoomScale).toBeGreaterThanOrEqual(1.08);
  });
});
