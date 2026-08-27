import type { Enemy } from '../../sim/types';
import { idlePose, walkPose, windupPose } from '../../scenes/textures';

/**
 * Map a hostile to a texture frame (0–1 idle, 2–5 stride, 6–7 windup).
 * Presentation-only — does not change sim windup or AI.
 */
export function enemyAnimFrame(
  en: Pick<Enemy, 'windup' | 'intent' | 'alerted'>,
  animFrame: number,
  moving: boolean,
): number {
  if (en.windup > 0 && en.intent) return windupPose(animFrame);
  if (moving) return walkPose(animFrame);
  if (en.alerted) return 2;
  return idlePose(animFrame);
}
