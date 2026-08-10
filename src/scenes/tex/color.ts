/**
 * Colour arithmetic for the painting layer.
 *
 * These exist so a named material can be shown under different light without
 * anyone inventing a second hex for it: the same surface lit, shadowed, or wet
 * is one material and a multiplier, not three colours.
 */

const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

/** The same material under more or less light. */
export function shade(color: number, amount: number): number {
  const r = clamp(((color >> 16) & 0xff) * amount);
  const g = clamp(((color >> 8) & 0xff) * amount);
  const b = clamp((color & 0xff) * amount);
  return (r << 16) | (g << 8) | b;
}

/** One material bleeding into another — wear, wash, corrosion. */
export function mix(a: number, b: number, amount: number): number {
  const t = Math.max(0, Math.min(1, amount));
  const r = clamp(((a >> 16) & 0xff) * (1 - t) + ((b >> 16) & 0xff) * t);
  const g = clamp(((a >> 8) & 0xff) * (1 - t) + ((b >> 8) & 0xff) * t);
  const bl = clamp((a & 0xff) * (1 - t) + (b & 0xff) * t);
  return (r << 16) | (g << 8) | bl;
}
