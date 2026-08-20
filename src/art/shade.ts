import { Theme } from '../scenes/theme';
import { Px } from './px';

/**
 * Classic pixel volume: NW light. Only retints pixels that still match `mid`
 * so plates, eyes, and tape painted on top stay put.
 */
export function volume(px: Px, mid: number, lit: number, deep: number): void {
  const hits: Array<[number, number, number]> = [];
  for (let y = 0; y < px.h; y++) {
    for (let x = 0; x < px.w; x++) {
      const p = px.get(x, y);
      if (p.a < 255 || p.color !== mid) continue;
      const up = !px.opaque(x, y - 1);
      const left = !px.opaque(x - 1, y);
      const down = !px.opaque(x, y + 1);
      const right = !px.opaque(x + 1, y);
      if (up || left) hits.push([x, y, lit]);
      else if (down || right) hits.push([x, y, deep]);
    }
  }
  for (const [x, y, c] of hits) px.set(x, y, c);
}

/** Machined slab: lit lip, mid face, deep floor. */
export function bevelRect(
  px: Px,
  x: number,
  y: number,
  w: number,
  h: number,
  lit: number,
  mid: number,
  deep: number,
): void {
  if (w <= 0 || h <= 0) return;
  px.fillRect(x, y, w, h, mid);
  px.fillRect(x, y, w, 1, lit);
  px.fillRect(x, y, 1, h, lit);
  px.fillRect(x, y + h - 1, w, 1, deep);
  px.fillRect(x + w - 1, y, 1, h, deep);
  if (w > 2 && h > 2) px.set(x + w - 1, y, mid);
}

/** Seed-stable 1px grit. Skips empty cells unless `onEmpty`. */
export function grit(
  px: Px,
  color: number,
  count: number,
  seed: number,
  onEmpty = false,
): void {
  let n = seed | 0;
  for (let i = 0; i < count; i++) {
    n = (n * 1103515245 + 12345) | 0;
    const x = ((n >>> 16) >>> 0) % px.w;
    n = (n * 1103515245 + 12345) | 0;
    const y = ((n >>> 16) >>> 0) % px.h;
    if (onEmpty) px.setEmpty(x, y, color);
    else if (px.opaque(x, y)) px.set(x, y, color);
  }
}

/** Irregular edge chips so a tile doesn't stamp a ruler. */
export function biteEdges(px: Px, dark: number, light: number, seed: number): void {
  for (let i = 0; i < 5; i++) {
    const along = 4 + ((i * 11 + seed * 7) % 38);
    const span = 2 + ((i + seed) % 3);
    px.fillRect(along, 0, span, 2, i % 2 === 0 ? dark : light);
    px.fillRect(along + 1, px.h - 2, span, 2, i % 2 === 0 ? light : dark);
    px.fillRect(0, along, 2, span, dark);
    px.fillRect(px.w - 2, along + 1, 2, span, light);
  }
}

/** Contact plant into leftover transparent cells — never outlined. */
export function plantShadow(px: Px): void {
  for (let y = 38; y < 46; y++) {
    for (let x = 8; x < 40; x++) {
      const dx = (x - 24) / 14;
      const dy = (y - 42) / 3.2;
      if (dx * dx + dy * dy <= 1) px.setEmpty(x, y, Theme.groundDeep);
    }
  }
  for (let y = 41; y < 45; y++) {
    for (let x = 14; x < 34; x++) {
      const dx = (x - 24) / 9;
      const dy = (y - 43) / 1.6;
      if (dx * dx + dy * dy <= 1) px.setEmpty(x, y, Theme.groundDeep);
    }
  }
}

export function finishSprite(px: Px, allowed: readonly number[], outline = Theme.groundDeep): void {
  px.outline(outline);
  plantShadow(px);
  px.snap(allowed);
}
