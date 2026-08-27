/** Authored actor poses: 0–1 idle, 2–5 stride, 6–7 windup / assist. */
export const ACTOR_ANIM_FRAMES = 8;
/** Hazard / vent / beacon pulse stamps. */
export const PROP_ANIM_FRAMES = 6;

export function wrapActorFrame(frame: number): number {
  return ((frame % ACTOR_ANIM_FRAMES) + ACTOR_ANIM_FRAMES) % ACTOR_ANIM_FRAMES;
}

export function actorFrameKey(base: string, frame = 0): string {
  const f = wrapActorFrame(frame);
  return f === 0 ? base : `${base}_${f}`;
}

export function wrapPropFrame(frame: number): number {
  return ((frame % PROP_ANIM_FRAMES) + PROP_ANIM_FRAMES) % PROP_ANIM_FRAMES;
}

export function propFrameKey(base: string, frame = 0): string {
  const f = wrapPropFrame(frame);
  return f === 0 ? base : `${base}_${f}`;
}

const at = <T>(table: readonly T[], frame: number): T => table[wrapActorFrame(frame)]!;

export function poseGait(frame: number): number {
  return at([0, 1, 2, 1, -2, -1, 2, -2], frame);
}

export function poseStomp(frame: number): number {
  return at([0, 1, 2, 1, -1, 0, 2, 1], frame);
}

export function poseSway(frame: number): number {
  return at([0, 1, 1, 0, -1, -1, 2, -2], frame);
}

export function poseWing(frame: number, mastling: boolean): number {
  return mastling
    ? at([15, 16, 18, 16, 11, 14, 19, 10], frame)
    : at([12, 13, 16, 14, 7, 10, 17, 6], frame);
}

export function poseSwivel(frame: number): number {
  return at([0, 2, 4, 2, -4, -2, 5, -5], frame);
}

export function poseLean(frame: number): number {
  return at([0, 2, 3, 1, -3, -2, 4, -4], frame);
}

export function poseStretch(frame: number): number {
  return at([0, 3, 6, 4, 2, 1, 7, 5], frame);
}

export function posePulse(frame: number): number {
  return at([0, 1, 1, 0, -1, -1, 2, -1], frame);
}

/** Bloom / aperture / emitter lift in the old 0–3 band, not raw frame index. */
export function poseBloom(frame: number): number {
  return at([0, 0, 1, 1, 2, 2, 3, 2], frame);
}

export function poseSlide(frame: number): number {
  return at([0, 1, 1, 2, 2, 3, 0, 3], frame);
}

export function hoverBob(frame: number): number {
  return at([0, -2, -3, -1, 2, 1, -1, 3], frame);
}

export function groundBob(frame: number): number {
  return at([0, 0, 0, 1, 1, 0, 1, 2], frame);
}

export function playerBob(frame: number): number {
  return at([0, -2, -1, 0, 1, 0, 1, 2], frame);
}

export function playerStride(frame: number): number {
  return at([0, -1, 2, 3, -2, -3, 1, -1], frame);
}

export function contactBob(frame: number): number {
  return at([0, -1, -1, 0, 1, 1, 0, 2], frame);
}

export function contactStride(frame: number): number {
  return at([0, 1, 2, 3, -2, -3, 1, -1], frame);
}

export function poseKick(frame: number, i: number, gait: number): number {
  return (i + frame) % 2 === 0 ? gait : -gait;
}

export function idlePose(animFrame: number): number {
  return animFrame % 4 < 2 ? 0 : 1;
}

export function walkPose(animFrame: number): number {
  return 2 + (animFrame % 4);
}

export function windupPose(animFrame: number): number {
  return 6 + (animFrame % 2);
}
