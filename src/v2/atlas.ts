import * as THREE from 'three';

export type AtlasSheets = 'floors' | 'walls' | 'props' | 'items' | 'actors';

type AtlasJson = {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
};

const SHEETS: AtlasSheets[] = ['floors', 'walls', 'props', 'items', 'actors'];

function fieldTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`atlas image failed: ${url}`));
    img.src = url;
  });
  return img;
}

/** Phaser atlas frames → linearly sampled Three textures on the orbit field. */
export async function loadFieldAtlas(): Promise<Map<string, THREE.Texture>> {
  const out = new Map<string, THREE.Texture>();
  await Promise.all(
    SHEETS.map(async (name) => {
      const [img, json] = await Promise.all([
        loadImage(`art/${name}.png`),
        fetch(`art/${name}.json`).then((r) => r.json() as Promise<AtlasJson>),
      ]);
      for (const [key, def] of Object.entries(json.frames)) {
        const { x, y, w, h } = def.frame;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        out.set(key, fieldTexture(canvas));
      }
    }),
  );
  return out;
}
