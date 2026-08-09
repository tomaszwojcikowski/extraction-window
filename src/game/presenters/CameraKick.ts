import type { CameraCue } from './EventCamera';

/**
 * World-layer kick + zoom decay for event camera cues — pure timing math, no Phaser.
 *
 * Owns the transient part of a cue (nudge offset and punch-in scale) so the scene
 * only asks "where are the world layers this frame?". Shake, vignette, and ignite
 * stay with the scene because they belong to Phaser objects.
 *
 * DESIGN_PRINCIPLES §7: the kick decays inside the cue budget and returns to rest;
 * nothing here can outlive the cue that caused it.
 */
export const KICK_DECAY_MS = 200;

export class CameraKick {
  private nudgeX = 0;
  private nudgeY = 0;
  private nudgeUntil = 0;
  private zoomPeak = 1;
  private zoomUntil = 0;
  private zoomMs = 1;

  reset(): void {
    this.nudgeX = 0;
    this.nudgeY = 0;
    this.nudgeUntil = 0;
    this.zoomPeak = 1;
    this.zoomUntil = 0;
    this.zoomMs = 1;
  }

  /**
   * Arm nudge / zoom from a cue. `turn` only picks the kick direction, so repeated
   * cues on one turn push the same way instead of jittering.
   */
  apply(cue: CameraCue, now: number, turn: number): void {
    const kickMs = Math.max(KICK_DECAY_MS, cue.shakeMs, cue.vignetteMs * 0.5, cue.zoomMs * 0.6);
    if (cue.nudgePx > 0) {
      const ang = (turn * 2.399) % (Math.PI * 2);
      this.nudgeX = Math.cos(ang) * cue.nudgePx;
      this.nudgeY = Math.sin(ang) * cue.nudgePx;
      this.nudgeUntil = now + kickMs;
    }
    if (cue.zoomScale > 1 && cue.zoomMs > 0) {
      this.zoomPeak = cue.zoomScale;
      this.zoomMs = cue.zoomMs;
      this.zoomUntil = now + cue.zoomMs;
    }
  }

  /** Current kick offset in pixels; clears itself once the cue budget is spent. */
  offset(now: number): { x: number; y: number } {
    if (now >= this.nudgeUntil) {
      this.nudgeX = 0;
      this.nudgeY = 0;
      return { x: 0, y: 0 };
    }
    const t = Math.min(1, (this.nudgeUntil - now) / KICK_DECAY_MS);
    return { x: this.nudgeX * t, y: this.nudgeY * t };
  }

  /** World-layer scale this frame (1 = rest). Ease-out: hold the punch, then settle. */
  zoom(now: number): number {
    if (now >= this.zoomUntil || this.zoomPeak <= 1) {
      this.zoomPeak = 1;
      return 1;
    }
    const u = Math.min(1, (this.zoomUntil - now) / Math.max(1, this.zoomMs));
    return 1 + (this.zoomPeak - 1) * u * u;
  }
}
