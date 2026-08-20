import { deflateSync, inflateSync } from 'node:zlib';
import { Px } from './px';

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

const PNG_SIG = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

export function encodePng(px: Px): Buffer {
  const { w, h, data } = px;
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * stride + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const parts = [PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  return Buffer.concat(parts);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decode 8-bit RGBA PNGs written by `encodePng` (and Aseprite RGBA exports). */
export function decodePng(buf: Uint8Array): Px {
  if (buf.length < 8 || PNG_SIG.some((b, i) => buf[i] !== b)) {
    throw new Error('not a PNG');
  }
  let w = 0;
  let h = 0;
  const idats: Uint8Array[] = [];
  let off = 8;
  while (off + 12 <= buf.length) {
    const len = (buf[off]! << 24) | (buf[off + 1]! << 16) | (buf[off + 2]! << 8) | buf[off + 3]!;
    const type = String.fromCharCode(buf[off + 4]!, buf[off + 5]!, buf[off + 6]!, buf[off + 7]!);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = (data[0]! << 24) | (data[1]! << 16) | (data[2]! << 8) | data[3]!;
      h = (data[4]! << 24) | (data[5]! << 16) | (data[6]! << 8) | data[7]!;
      if (data[8] !== 8 || data[9] !== 6) throw new Error('PNG must be 8-bit RGBA');
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const compressed = Buffer.concat(idats.map((d) => Buffer.from(d)));
  const raw = inflateSync(compressed);
  const px = new Px(w, h);
  const bpp = 4;
  const stride = w * bpp;
  let src = 0;
  const prev = new Uint8Array(stride);
  const row = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[src++]!;
    const slice = raw.subarray(src, src + stride);
    src += stride;
    for (let i = 0; i < stride; i++) {
      const x = slice[i]!;
      const a = i >= bpp ? row[i - bpp]! : 0;
      const b = prev[i]!;
      const c = i >= bpp ? prev[i - bpp]! : 0;
      let val = x;
      if (filter === 1) val = (x + a) & 255;
      else if (filter === 2) val = (x + b) & 255;
      else if (filter === 3) val = (x + ((a + b) >> 1)) & 255;
      else if (filter === 4) val = (x + paeth(a, b, c)) & 255;
      else if (filter !== 0) throw new Error(`unsupported PNG filter ${filter}`);
      row[i] = val;
    }
    px.data.set(row, y * stride);
    prev.set(row);
  }
  return px;
}
