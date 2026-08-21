import { mix } from '../scenes/tex/color';
import { Theme } from '../scenes/theme';

/** Authored field-sprite size — 1:1 with runtime TILE. */
export const TILE = 48;

export function rgbParts(color: number): [number, number, number] {
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
}

export function packRgb(r: number, g: number, b: number): number {
  return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
}

/** Paletted pixel buffer. Alpha 0 is unused; every opaque pixel is a named colour. */
export class Px {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly w = TILE,
    readonly h = TILE,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  clone(): Px {
    const out = new Px(this.w, this.h);
    out.data.set(this.data);
    return out;
  }

  private i(x: number, y: number): number {
    return (y * this.w + x) * 4;
  }

  in(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Hard set — no blend, no anti-alias. */
  set(x: number, y: number, color: number, a = 255): void {
    if (!this.in(x, y) || a <= 0) return;
    const i = this.i(x | 0, y | 0);
    const [r, g, b] = rgbParts(color);
    if (a >= 255) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = 255;
      return;
    }
    const da = this.data[i + 3]! / 255;
    const sa = a / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) return;
    this.data[i] = Math.round((r * sa + this.data[i]! * da * (1 - sa)) / outA);
    this.data[i + 1] = Math.round((g * sa + this.data[i + 1]! * da * (1 - sa)) / outA);
    this.data[i + 2] = Math.round((b * sa + this.data[i + 2]! * da * (1 - sa)) / outA);
    this.data[i + 3] = Math.round(outA * 255);
  }

  get(x: number, y: number): { color: number; a: number } {
    if (!this.in(x, y)) return { color: 0, a: 0 };
    const i = this.i(x, y);
    return {
      color: packRgb(this.data[i]!, this.data[i + 1]!, this.data[i + 2]!),
      a: this.data[i + 3]!,
    };
  }

  opaque(x: number, y: number): boolean {
    return this.in(x, y) && this.data[this.i(x, y) + 3]! > 8;
  }

  fillRect(x: number, y: number, w: number, h: number, color: number, a = 255): void {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.w, x + w);
    const y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.set(xx, yy, color, a);
    }
  }

  /** Hard disc — radius in pixels, no coverage AA. */
  fillDisc(cx: number, cy: number, r: number, color: number, a = 255): void {
    const rr = r * r;
    const x0 = Math.floor(cx - r);
    const y0 = Math.floor(cy - r);
    const x1 = Math.ceil(cx + r);
    const y1 = Math.ceil(cy + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= rr) this.set(x, y, color, a);
      }
    }
  }

  /** 1px ring — no AA, no fill. */
  strokeDisc(cx: number, cy: number, r: number, color: number): void {
    const r0 = (r - 0.55) * (r - 0.55);
    const r1 = (r + 0.55) * (r + 0.55);
    const x0 = Math.floor(cx - r - 1);
    const y0 = Math.floor(cy - r - 1);
    const x1 = Math.ceil(cx + r + 1);
    const y1 = Math.ceil(cy + r + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = dx * dx + dy * dy;
        if (d >= r0 && d <= r1) this.set(x, y, color);
      }
    }
  }

  strokeEllipse(cx: number, cy: number, rx: number, ry: number, color: number): void {
    if (rx <= 0 || ry <= 0) return;
    const x0 = Math.floor(cx - rx - 1);
    const y0 = Math.floor(cy - ry - 1);
    const x1 = Math.ceil(cx + rx + 1);
    const y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d >= 0.78 && d <= 1.18) this.set(x, y, color);
      }
    }
  }

  /** Write only into empty cells — for contact plants after the body is drawn. */
  setEmpty(x: number, y: number, color: number): void {
    if (!this.in(x, y)) return;
    if (this.data[this.i(x, y) + 3]! > 8) return;
    this.set(x, y, color);
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: number, a = 255): void {
    if (rx <= 0 || ry <= 0) return;
    const x0 = Math.floor(cx - rx);
    const y0 = Math.floor(cy - ry);
    const x1 = Math.ceil(cx + rx);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, color, a);
      }
    }
  }

  fillTriangle(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    a = 255,
  ): void {
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(this.w - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(y0, y1, y2)));
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area;
        const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area;
        const w2 = ((x0 - px) * (y1 - py) - (x1 - px) * (y0 - py)) / area;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.set(x, y, color, a);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: number, a = 255): void {
    let x = x0 | 0;
    let y = y0 | 0;
    const xEnd = x1 | 0;
    const yEnd = y1 | 0;
    const dx = Math.abs(xEnd - x);
    const dy = Math.abs(yEnd - y);
    const sx = x < xEnd ? 1 : -1;
    const sy = y < yEnd ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      this.set(x, y, color, a);
      if (x === xEnd && y === yEnd) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** 1px outline on opaque silhouette using a rim colour. */
  outline(color: number = Theme.groundDeep): void {
    const marks: Array<[number, number]> = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.opaque(x, y)) continue;
        if (
          !this.opaque(x - 1, y) ||
          !this.opaque(x + 1, y) ||
          !this.opaque(x, y - 1) ||
          !this.opaque(x, y + 1)
        ) {
          marks.push([x, y]);
        }
      }
    }
    for (const [x, y] of marks) this.set(x, y, color);
  }

  /** Planted contact ellipse — lives in the sprite, not a drop-shadow filter. */
  contactShadow(): void {
    this.fillEllipse(24, 42, 16, 4, Theme.groundDeep, 140);
    this.fillEllipse(24, 43, 10, 2, Theme.groundDeep, 200);
  }

  blit(src: Px, dx = 0, dy = 0): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const p = src.get(x, y);
        if (p.a > 0) this.set(x + dx, y + dy, p.color, p.a);
      }
    }
  }

  /** Quantize opaque pixels onto an allowed set so the sheet cannot drift. */
  snap(allowed: readonly number[]): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = this.i(x, y);
        if (this.data[i + 3]! < 8) {
          this.data[i] = 0;
          this.data[i + 1] = 0;
          this.data[i + 2] = 0;
          this.data[i + 3] = 0;
          continue;
        }
        const color = packRgb(this.data[i]!, this.data[i + 1]!, this.data[i + 2]!);
        const snapped = nearestColor(color, allowed);
        const [r, g, b] = rgbParts(snapped);
        this.data[i] = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
      }
    }
  }
}

export function nearestColor(color: number, allowed: readonly number[]): number {
  const [r, g, b] = rgbParts(color);
  let best = allowed[0] ?? 0;
  let bestD = Infinity;
  for (const c of allowed) {
    const [cr, cg, cb] = rgbParts(c);
    const d = (r - cr) * (r - cr) + (g - cg) * (g - cg) + (b - cb) * (b - cb);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function bodyShades(color: number): {
  deep: number;
  mid: number;
  lit: number;
  rim: number;
} {
  return {
    deep: mix(color, Theme.groundDeep, 0.78),
    mid: color,
    lit: mix(color, Theme.inkBright, 0.32),
    rim: mix(color, Theme.groundDeep, 0.55),
  };
}
