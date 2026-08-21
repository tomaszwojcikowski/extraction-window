/** Contact texture frame: 0 idle, 1 stride/assist, 2 active. */
export function contactAnimFrame(moving: boolean, animFrame: number, assist = false): number {
  if (assist) return 2;
  if (moving) return animFrame % 2 === 0 ? 1 : 2;
  return animFrame % 4 < 2 ? 0 : 1;
}
