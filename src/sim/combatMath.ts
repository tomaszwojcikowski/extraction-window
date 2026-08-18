/** Normal bump: auto-hit, atk minus def plus a small variance. Floor 1. */
export function meleeDamage(atk: number, def: number, variance: number): number {
  return Math.max(1, atk - def + variance);
}
