import type { Enemy } from '../../sim/types';
import { idlePose, walkPose, WALK_FRAME_START, windupPose } from '../../scenes/textures';

/**
 * Map a hostile to a texture frame (0–1 idle, 2–9 stride, 10–11 windup).
 * Presentation-only — does not change sim windup or AI.
 */
export function enemyAnimFrame(
  en: Pick<Enemy, 'windup' | 'intent' | 'alerted'>,
  animFrame: number,
  moving: boolean,
): number {
  if (en.windup > 0 && en.intent) return windupPose(animFrame);
  if (moving) return walkPose(animFrame);
  if (en.alerted) return WALK_FRAME_START;
  return idlePose(animFrame);
}
