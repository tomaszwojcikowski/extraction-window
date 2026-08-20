import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allAtlasFrames } from '../src/art/frames';
import { writeAtlas } from '../src/art/pack';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/art');
mkdirSync(out, { recursive: true });

const atlases = allAtlasFrames();
for (const [name, frames] of Object.entries(atlases)) {
  writeAtlas(out, name, frames);
  console.log(`wrote ${name}: ${frames.length} frames`);
}
