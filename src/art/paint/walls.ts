import { mix } from '../../scenes/tex/color';
import { Material, Theme } from '../../scenes/theme';
import { envPalette } from '../palette';
import type { Frame } from '../pack';
import { Px, TILE } from '../px';
import { bevelRect, grit, volume } from '../shade';

export type WallStyle = 'cliff' | 'bulkhead' | 'conduit';
export const WALL_WEAR_COUNT = 3;

function paintWall(style: WallStyle, role: number, wear: number): Px {
  const px = new Px();
  const leftOpen = role === 1 || role === 3;
  const rightOpen = role === 2 || role === 3;
  const face =
    style === 'cliff' ? Material.rock : style === 'bulkhead' ? Material.deck : Material.conduit;
  const crown =
    style === 'conduit'
      ? mix(Theme.biolumDeep, Theme.biolum, 0.25)
      : mix(Theme.inkMute, Theme.inkBright, 0.22);
  px.fillRect(0, 0, TILE, TILE, Theme.groundDeep);
  const insetL = leftOpen ? 5 : 1;
  const insetR = rightOpen ? 5 : 1;
  px.fillRect(insetL, 1, TILE - insetL - insetR, TILE - 2, face);
  if (!leftOpen) {
    px.fillRect(0, 1, 2, TILE - 2, mix(face, Theme.groundDeep, 0.45));
    px.fillRect(0, 1, 1, TILE - 2, Theme.groundDeep);
  }
  if (!rightOpen) {
    px.fillRect(TILE - 2, 1, 2, TILE - 2, mix(face, Theme.groundDeep, 0.45));
    px.fillRect(TILE - 1, 1, 1, TILE - 2, Theme.groundDeep);
  }
  if (leftOpen) {
    px.fillRect(1, 1, 4, TILE - 2, Material.recess);
    px.fillRect(4, 2, 2, TILE - 4, mix(face, Theme.groundDeep, 0.4));
  }
  if (rightOpen) {
    px.fillRect(TILE - 5, 1, 4, TILE - 2, Material.recess);
    px.fillRect(TILE - 6, 2, 2, TILE - 4, mix(face, Theme.groundDeep, 0.4));
  }
  px.fillRect(
    insetL + 2 + (wear % 2),
    8 + (wear === 2 ? 1 : 0),
    TILE - insetL - insetR - 4,
    TILE - 16,
    mix(face, Material.recess, 0.12),
  );
  const faceLit =
    style === 'cliff' ? Material.rockLit : style === 'bulkhead' ? Material.deckLit : mix(Material.conduit, Theme.biolum, 0.28);
  px.fillRect(insetL + 1, 8, 1, TILE - 16, mix(face, faceLit, 0.55));
  px.fillRect(insetL + 1, 8, TILE - insetL - insetR - 2, 1, mix(face, faceLit, 0.4));
  px.fillRect(TILE - insetR - 2, 9, 1, TILE - 17, mix(face, Theme.groundDeep, 0.38));
  px.fillRect(insetL, 1, TILE - insetL - insetR, 5, crown);
  px.fillRect(insetL + 1, 2, TILE - insetL - insetR - 2, 1, Theme.inkBright);
  px.fillRect(insetL, 6, TILE - insetL - insetR, 2, Theme.groundDeep);
  for (let rx = insetL + 5 + wear; rx < TILE - insetR - 4; rx += 7 + wear) {
    bevelRect(px, rx, 3, 2, 2, Theme.inkBright, Theme.panelEdge, Theme.groundDeep);
  }
  if (role === 3) {
    px.fillRect(2, 1, 5, 4, crown);
    px.fillRect(TILE - 7, 1, 5, 4, crown);
  }

  if (style === 'cliff') {
    const band = 7 + (wear % 2);
    const y0 = 10 + wear * 2;
    for (let i = 0; i < 4; i++) {
      const y = y0 + i * band;
      px.fillRect(insetL + 3, y, TILE - insetL - insetR - 6, 5, mix(Material.rock, Theme.groundDeep, 0.22));
      px.fillRect(insetL + 3, y, TILE - insetL - insetR - 6, 1, Material.rockLit);
      px.fillRect(insetL + 3, y + 4, TILE - insetL - insetR - 6, 1, Theme.groundDeep);
      px.fillRect(insetL + 8 + i * 7 + wear * 3, y + 2, 5, 2, Material.recess);
    }
    grit(px, Theme.inkMute, 12 + wear * 6, 20 + role * 3 + wear);
    if (wear === 1) grit(px, Theme.rust, 3, 80 + wear);
    if (wear === 2) grit(px, Theme.rust, 10, 80 + wear);
  } else if (style === 'bulkhead') {
    const gx = 7 + wear;
    const gy = 7 + (wear === 2 ? 2 : wear);
    for (let y = 11 + wear; y < 36; y += gy) {
      for (let x = insetL + 4 + wear; x < TILE - insetR - 5; x += gx) {
        if (wear === 2 && ((x + y) % 16 === 0)) continue;
        bevelRect(px, x, y, 3, 3, Theme.inkMute, Theme.panelEdge, Theme.groundDeep);
      }
    }
    const tapeY = 33 + wear;
    px.fillRect(insetL + 3, tapeY, TILE - insetL - insetR - 6, 5, mix(Material.deck, Theme.tape, 0.14));
    px.fillRect(insetL + 3, tapeY, TILE - insetL - insetR - 6, 1, Theme.tape);
    grit(px, Material.recess, 8 + wear * 4, 40 + role);
    if (wear === 2) grit(px, Theme.rust, 8, 99);
  } else {
    const pipe = mix(Material.conduit, Theme.biolumDeep, 0.3);
    bevelRect(px, insetL + 3, 12, 5, 28, Theme.biolum, pipe, Theme.groundDeep, Theme.biolumDeep, Material.recess);
    bevelRect(px, TILE - insetR - 8, 12, 5, 28, Theme.biolum, pipe, Theme.groundDeep, Theme.biolumDeep, Material.recess);
    px.fillRect(insetL + 4, 12, 1, 28, Theme.biolum);
    px.fillRect(TILE - insetR - 7, 12, 1, 28, Theme.biolum);
    bevelRect(
      px,
      insetL + 10,
      16,
      TILE - insetL - insetR - 20,
      4,
      Theme.biolum,
      Theme.biolumDeep,
      Theme.groundDeep,
    );
    if (wear === 2) {
      px.fillRect(insetL + 12, 28, 8, 3, Theme.rust);
      grit(px, Theme.inkMute, 10, 55 + wear);
    } else if (wear === 1) {
      grit(px, Theme.inkMute, 6, 55 + wear);
    }
  }

  px.fillRect(insetL, TILE - 7, TILE - insetL - insetR, 6, mix(face, Theme.groundDeep, 0.45));
  px.fillRect(insetL, TILE - 7, TILE - insetL - insetR, 1, Theme.groundDeep);
  px.snap(envPalette());
  return px;
}

function paintSconce(style: WallStyle): Px {
  const px = new Px();
  const cool = style === 'conduit';
  const body = cool ? Material.conduit : Material.deck;
  const glow = cool ? Theme.biolum : Theme.tape;
  bevelRect(px, 16, 10, 16, 24, Theme.inkMute, body, Theme.groundDeep, cool ? Theme.biolum : Theme.inkDim, Theme.groundDeep);
  volume(px, body, Theme.inkMute, Theme.groundDeep, Theme.groundDeep, cool ? Theme.biolumDeep : Theme.inkDim);
  px.fillRect(18, 12, 12, 8, Theme.groundDeep);
  px.fillRect(19, 13, 10, 6, glow);
  px.fillRect(21, 14, 6, 2, Theme.inkBright);
  px.set(22, 14, Theme.arcWhite);
  px.fillRect(20, 22, 8, 8, mix(body, Theme.groundDeep, 0.3));
  px.fillRect(21, 32, 6, 4, Theme.panelEdge);
  px.fillRect(18, 36, 12, 2, Theme.groundDeep);
  px.outline(Theme.groundDeep);
  grit(px, Theme.inkMute, 5, 9);
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
