import type { Enemy } from '../../sim/types';

/**
 * Map a hostile to a deluxe texture frame (0 idle, 1 stride/alert, 2 windup).
 * Presentation-only — does not change sim windup or AI.
 */
export function enemyAnimFrame(
  en: Pick<Enemy, 'windup' | 'intent' | 'alerted'>,
  animFrame: number,
  moving: boolean,
): number {
  if (en.windup > 0 && en.intent) return 2;
  if (moving) return animFrame % 2 === 0 ? 1 : 2;
  if (en.alerted) return 1;
  return animFrame % 4 < 2 ? 0 : 1;
}
