import { ENEMIES } from '../data/enemies';
import { mix } from '../scenes/tex/color';
import { BIOME_FLOOR_TINT, Material, Theme } from '../scenes/theme';
import { LIGHT_TEMP } from '../sim/light';
import { bodyShades } from './px';

/** Fully transparent / fully opaque — not colours. */
export const NOT_A_COLOUR = new Set<number>([0x000000, 0xffffff]);

export function namedWorldPalette(): number[] {
  return [
    ...Object.values(Theme),
    ...Object.values(Material),
    ...Object.values(LIGHT_TEMP),
    ...Object.values(BIOME_FLOOR_TINT),
  ];
}

export function hostileExtraPalette(): number[] {
  const extras: number[] = [];
  for (const def of Object.values(ENEMIES)) {
    const s = bodyShades(def.color);
    extras.push(def.color, s.deep, s.lit, s.rim, mix(Theme.arcWhite, def.color, 0.4));
  }
  return extras;
}

export function allowedPngColours(): Set<number> {
  return new Set([...namedWorldPalette(), ...hostileExtraPalette(), ...NOT_A_COLOUR]);
}

export function envPalette(): number[] {
  return [...namedWorldPalette(), ...NOT_A_COLOUR];
}

export function actorPalette(body?: number): number[] {
  const base = [...namedWorldPalette(), ...NOT_A_COLOUR];
  if (body === undefined) return base;
  const s = bodyShades(body);
  return [...base, body, s.deep, s.lit, s.rim, mix(Theme.arcWhite, body, 0.4)];
}
