import { idlePose, walkPose, windupPose } from '../../scenes/textures';

/** Contact texture frame: 0–1 idle, 2–9 stride, 10–11 assist. */
export function contactAnimFrame(moving: boolean, animFrame: number, assist = false): number {
  if (assist) return windupPose(animFrame);
  if (moving) return walkPose(animFrame);
  return idlePose(animFrame);
}
