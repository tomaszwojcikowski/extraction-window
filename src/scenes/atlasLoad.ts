import Phaser from 'phaser';

const ATLAS_NAMES = ['floors', 'walls', 'props', 'items', 'actors'] as const;

/** Load packed field atlases from /art (Vite public/). */
export function loadFieldArt(scene: Phaser.Scene): void {
  for (const name of ATLAS_NAMES) {
    scene.load.atlas(`ew-${name}`, `art/${name}.png`, `art/${name}.json`);
  }
}

/**
 * Promote each atlas frame to a standalone texture so existing `add.image(x, y, key)`
 * call sites keep working.
 */
export function promoteFieldArt(scene: Phaser.Scene): void {
  for (const name of ATLAS_NAMES) {
    const atlasKey = `ew-${name}`;
    if (!scene.textures.exists(atlasKey)) continue;
    const tex = scene.textures.get(atlasKey);
    const img = tex.getSourceImage() as CanvasImageSource;
    for (const frameName of tex.getFrameNames()) {
      if (frameName === '__BASE' || scene.textures.exists(frameName)) continue;
      const frame = tex.get(frameName);
      const canvas = document.createElement('canvas');
      canvas.width = frame.cutWidth;
      canvas.height = frame.cutHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        img,
        frame.cutX,
        frame.cutY,
        frame.cutWidth,
        frame.cutHeight,
        0,
        0,
        frame.cutWidth,
        frame.cutHeight,
      );
      scene.textures.addCanvas(frameName, canvas);
    }
  }
}
