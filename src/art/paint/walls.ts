import { mix } from '../../scenes/tex/color';
import { Material, Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px, TILE } from '../px';

export type WallStyle = 'cliff' | 'bulkhead' | 'conduit';
export const WALL_WEAR_COUNT = 3;

function paintWall(style: WallStyle, role: number, wear: number): Px {
  const px = new Px();
  const leftOpen = role === 1 || role === 3;
  const rightOpen = role === 2 || role === 3;
  const face =
    style === 'cliff' ? Material.rock : style === 'bulkhead' ? Material.deck : Material.conduit;
  const crown =
    style === 'conduit' ? mix(Theme.biolumDeep, Theme.biolum, 0.3) : mix(Theme.inkMute, Theme.inkBright, 0.25);
  px.fillRect(0, 0, TILE, TILE, Theme.groundDeep);
  const insetL = leftOpen ? 4 : 1;
  const insetR = rightOpen ? 4 : 1;
  px.fillRect(insetL, 1, TILE - insetL - insetR, TILE - 2, face);
  if (leftOpen) {
    px.fillRect(1, 1, 3, TILE - 2, Material.recess);
    px.fillRect(3, 2, 2, TILE - 4, mix(face, Theme.groundDeep, 0.35));
  }
  if (rightOpen) {
    px.fillRect(TILE - 4, 1, 3, TILE - 2, Material.recess);
    px.fillRect(TILE - 5, 2, 2, TILE - 4, mix(face, Theme.groundDeep, 0.35));
  }
  px.fillRect(insetL + 2 + (wear % 2), 8 + (wear === 2 ? 1 : 0), TILE - insetL - insetR - 4, TILE - 18, mix(face, Material.recess, 0.14));
  px.fillRect(insetL, 1, TILE - insetL - insetR, 4, crown);
  px.fillRect(insetL + 1, 2, TILE - insetL - insetR - 2, 1, Theme.inkBright);
  px.fillRect(insetL, 5, TILE - insetL - insetR, 2, Theme.groundDeep);
  if (role === 3) {
    px.fillRect(2, 1, 4, 3, crown);
    px.fillRect(TILE - 6, 1, 4, 3, crown);
  }
  for (let i = 0; i < 18; i++) {
    const x = 6 + ((i * 11 + wear * 13 + role * 2) % 34);
    const y = 10 + ((i * 17 + wear * 7) % 22);
    if (x < insetL + 2 || x > TILE - insetR - 3) continue;
    px.fillRect(x, y, i % 5 === 0 ? 2 : 1, 1, i % 4 === 0 ? Theme.inkMute : Theme.inkDim);
  }
  if (style === 'cliff') {
    for (let i = 0; i < 3; i++) {
      const y = 12 + i * 10 + wear;
      px.fillRect(insetL + 4, y, TILE - insetL - insetR - 8, 3, mix(Material.rock, Theme.groundDeep, 0.3));
      px.fillRect(insetL + 6 + i * 8, y + 1, 4, 1, Theme.inkMute);
    }
  } else if (style === 'bulkhead') {
    for (let y = 12; y < 38; y += 8) {
      for (let x = insetL + 6; x < TILE - insetR - 6; x += 8) {
        px.fillRect(x, y, 3, 3, Theme.panelEdge);
        px.fillRect(x + 1, y + 1, 1, 1, Theme.inkMute);
      }
    }
    px.fillRect(insetL + 4, 36, TILE - insetL - insetR - 8, 4, mix(Material.deck, Theme.tape, 0.12));
  } else {
    px.fillRect(insetL + 3, 14, 4, 26, mix(Material.conduit, Theme.biolumDeep, 0.25));
    px.fillRect(TILE - insetR - 7, 14, 4, 26, mix(Material.conduit, Theme.biolumDeep, 0.25));
    px.fillRect(insetL + 10, 18, TILE - insetL - insetR - 20, 3, Theme.biolumDeep);
    px.fillRect(insetL + 12, 19, TILE - insetL - insetR - 24, 1, Theme.biolum);
  }
  px.fillRect(insetL, TILE - 6, TILE - insetL - insetR, 5, mix(face, Theme.groundDeep, 0.4));
  px.snap(envPalette());
  return px;
}

function paintSconce(style: WallStyle): Px {
  const px = new Px();
  const cool = style === 'conduit';
  const body = cool ? Material.conduit : Material.deck;
  const glow = cool ? Theme.biolum : Theme.tape;
  px.fillRect(16, 10, 16, 22, body);
  px.fillRect(18, 12, 12, 8, Theme.groundDeep);
  px.fillRect(19, 13, 10, 6, glow);
  px.fillRect(21, 14, 6, 3, Theme.inkBright);
  px.fillRect(18, 22, 12, 8, mix(body, Theme.groundDeep, 0.3));
  px.fillRect(20, 32, 8, 4, Theme.panelEdge);
  px.outline(Theme.groundDeep);
  px.snap(envPalette());
  return px;
}

export function wallFrames(): Frame[] {
  const styles: WallStyle[] = ['cliff', 'bulkhead', 'conduit'];
  const frames: Frame[] = [];
  for (const style of styles) {
    for (let role = 0; role < 4; role++) {
      for (let wear = 0; wear < WALL_WEAR_COUNT; wear++) {
        frames.push({ key: `t_wall_${style}_${role}_${wear}`, px: paintWall(style, role, wear) });
      }
      frames.push({
        key: `t_wall_${style}_${role}`,
        px: paintWall(style, role, 0).clone(),
      });
    }
  }
  const cliff00 = frames.find((f) => f.key === 't_wall_cliff_0_0')!.px;
  frames.push({ key: 't_wall', px: cliff00.clone() });
  frames.push({
    key: 't_wall_1',
    px: frames.find((f) => f.key === 't_wall_cliff_1_0')!.px.clone(),
  });
  return frames;
}

export function sconceFrames(): Frame[] {
  return (['cliff', 'bulkhead', 'conduit'] as const).map((style) => ({
    key: `t_sconce_${style}`,
    px: paintSconce(style),
  }));
}
