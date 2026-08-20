import { writeFileSync } from 'node:fs';
import { encodePng } from './png';
import { Px, TILE } from './px';

export type Frame = { key: string; px: Px };

export const ATLAS_NAMES = ['floors', 'walls', 'props', 'items', 'actors'] as const;
export type AtlasName = (typeof ATLAS_NAMES)[number];

export function packAtlas(frames: Frame[], columns = 16): { sheet: Px; json: object } {
  const cols = Math.max(1, Math.min(columns, frames.length || 1));
  const rows = Math.max(1, Math.ceil(frames.length / cols));
  const sheet = new Px(cols * TILE, rows * TILE);
  const jsonFrames: Record<string, object> = {};
  frames.forEach((frame, i) => {
    const cx = (i % cols) * TILE;
    const cy = Math.floor(i / cols) * TILE;
    sheet.blit(frame.px, cx, cy);
    jsonFrames[frame.key] = {
      frame: { x: cx, y: cy, w: TILE, h: TILE },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: TILE, h: TILE },
      sourceSize: { w: TILE, h: TILE },
    };
  });
  return {
    sheet,
    json: {
      frames: jsonFrames,
      meta: {
        app: 'extraction-window',
        version: '1.0',
        size: { w: sheet.w, h: sheet.h },
        scale: '1',
      },
    },
  };
}

export function writeAtlas(dir: string, name: string, frames: Frame[]): void {
  const { sheet, json } = packAtlas(frames);
  const meta = json as { meta: { image: string } };
  meta.meta.image = `${name}.png`;
  writeFileSync(`${dir}/${name}.png`, encodePng(sheet));
  writeFileSync(`${dir}/${name}.json`, `${JSON.stringify(json, null, 2)}\n`);
}
