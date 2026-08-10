import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Material, Theme, ThemeCss } from '../../src/scenes/theme';

/**
 * The art bible's one hard palette rule: a colour enters the world by earning a
 * name in `theme.ts`, never by appearing inline in a drawing call. Two things
 * make that rule rot in practice — someone reaches for a hex mid-sketch, or an
 * old alias keeps a retired framing alive long after the palette moved on. This
 * file fails on both so the review does not have to catch them.
 */

/** Everywhere colour is chosen: bake-time art, runtime views, presenters. */
const PAINTING_LAYER = ['src/scenes', 'src/game/views', 'src/game/presenters'];

/**
 * Fully transparent and fully opaque are not colours — they are the alpha
 * channel spelled as a fill, which is how Phaser wants it.
 */
const NOT_A_COLOUR = new Set(['0x000000', '0xffffff']);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

function inlineColours(path: string): string[] {
  const found: string[] = [];
  readFileSync(path, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const hex of line.match(/0x[0-9a-fA-F]{6}/g) ?? []) {
        if (!NOT_A_COLOUR.has(hex.toLowerCase())) found.push(`${path}:${i + 1} ${hex}`);
      }
    });
  return found;
}

describe('every colour in the world is a named material', () => {
  it('has no inline hex in the painting layer', () => {
    const offenders = PAINTING_LAYER.flatMap(sources)
      .filter((path) => !path.endsWith('theme.ts'))
      .flatMap(inlineColours);

    expect(offenders).toEqual([]);
  });

  it('keeps roles and materials as separate vocabularies', () => {
    // A material that duplicates a role means the drawing code has two ways to
    // say the same thing, and the two will drift apart at the next tweak.
    const roles = new Set<number>(Object.values(Theme));
    const collisions = Object.entries(Material).filter(([, value]) => roles.has(value));

    expect(collisions).toEqual([]);
  });

  it('carries no retired aliases into the current palette', () => {
    // These named the phosphor-terminal look the game deliberately left behind.
    const retired = [
      'phosphor',
      'phosphorDim',
      'phosphorBright',
      'phosphorMute',
      'ionHazard',
      'ionHazardDeep',
      'danger',
      'quest',
      'ok',
      'energy',
      'storm',
      'text',
      'textDim',
      'textMute',
    ];

    for (const name of retired) {
      expect(Theme).not.toHaveProperty(name);
      expect(ThemeCss).not.toHaveProperty(name);
    }
  });
});
