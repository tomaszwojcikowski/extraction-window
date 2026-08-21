import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import type { HackSession } from '../../../sim/types';
import {
  HACK_MARKS,
  HACK_SIZE,
  canPickHackCell,
  hackConstraintHint,
} from '../../../sim/mechanics/consoleHack';
import { Theme, ThemeCss, FONT_DATA } from '../../../scenes/theme';
import { drawFieldPanel, drawStencilBadge } from '../../../scenes/atmosphere';
import { drawModalTapeHeader } from './modalChrome';

const PANEL_W = 540;
const PANEL_H = 420;
const CELL = 40;
const GAP = 6;
const GRID = HACK_SIZE * CELL + (HACK_SIZE - 1) * GAP;

const GLYPH_COLOR = [Theme.ink, Theme.biolum, Theme.tape, Theme.flag] as const;

export type HackOverlayObjects = {
  bg: Phaser.GameObjects.Rectangle;
  panel: Phaser.GameObjects.Graphics;
  badgeGfx: Phaser.GameObjects.Graphics;
  gridGfx: Phaser.GameObjects.Graphics;
  header: Phaser.GameObjects.Text;
  footer: Phaser.GameObjects.Text;
  cells: Phaser.GameObjects.Text[];
};

export function createHackOverlayObjects(scene: Phaser.Scene): HackOverlayObjects {
  const bg = scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, Theme.groundDeep, 0.62)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(108)
    .setVisible(false);
  const panel = scene.add.graphics().setScrollFactor(0).setDepth(109).setVisible(false);
  const badgeGfx = scene.add.graphics().setScrollFactor(0).setDepth(110).setVisible(false);
  const gridGfx = scene.add.graphics().setScrollFactor(0).setDepth(110).setVisible(false);
  const header = scene.add
    .text(0, 0, '', {
      fontFamily: FONT_DATA,
      fontSize: '13px',
      color: ThemeCss.ink,
      lineSpacing: 5,
    })
    .setScrollFactor(0)
    .setDepth(111)
    .setVisible(false);
  const footer = scene.add
    .text(0, 0, '', {
      fontFamily: FONT_DATA,
      fontSize: '12px',
      color: ThemeCss.inkDim,
      lineSpacing: 4,
    })
    .setScrollFactor(0)
    .setDepth(111)
    .setVisible(false);
  const cells: Phaser.GameObjects.Text[] = [];
  for (let i = 0; i < HACK_SIZE * HACK_SIZE; i++) {
    cells.push(
      scene.add
        .text(0, 0, '', {
          fontFamily: FONT_DATA,
          fontSize: '18px',
          color: ThemeCss.inkBright,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(111)
        .setVisible(false),
    );
  }
  return { bg, panel, badgeGfx, gridGfx, header, footer, cells };
}

function seq(glyphs: readonly number[], empty = '·'): string {
  return glyphs.map((g) => HACK_MARKS[g] ?? empty).join('  ');
}

export function drawHackOverlay(
  objs: HackOverlayObjects,
  screenW: number,
  screenH: number,
  session: HackSession,
): void {
  const { bg, panel, badgeGfx, gridGfx, header, footer, cells } = objs;
  bg.setVisible(true);
  panel.setVisible(true);
  badgeGfx.setVisible(true);
  gridGfx.setVisible(true);
  header.setVisible(true);
  footer.setVisible(true);

  const x = (screenW - PANEL_W) / 2;
  const y = (screenH - PANEL_H) / 2;
  drawFieldPanel(panel, x, y, PANEL_W, PANEL_H, Theme.tape);
  drawModalTapeHeader(panel, x, y, PANEL_W, Theme.tape);

  badgeGfx.clear();
  drawStencilBadge(badgeGfx, x + PANEL_W / 2 - 70, y - 10, 140, 20, Theme.tape);

  const pad = session.buffer.length
    ? seq(session.buffer).padEnd(seq(session.target).length, ' ')
    : '·  ·  ·  ·';
  header.setWordWrapWidth(PANEL_W - 48);
  header.setPosition(x + 24, y + 28);
  header.setText(
    `${lore('UI-HACK-TITLE').toUpperCase()}\n` +
      `${lore('UI-HACK-TARGET')}  ${seq(session.target)}\n` +
      `${lore('UI-HACK-BUFFER')}  ${pad}\n` +
      `${lore('UI-HACK-TRIES')} ${session.attempts}`,
  );

  const gx = x + (PANEL_W - GRID) / 2;
  const gy = y + 118;
  gridGfx.clear();
  for (let row = 0; row < HACK_SIZE; row++) {
    for (let col = 0; col < HACK_SIZE; col++) {
      const cx = gx + col * (CELL + GAP);
      const cy = gy + row * (CELL + GAP);
      const glyph = session.grid[row]![col]!;
      const used = session.used[row]![col]!;
      const cursor = session.cursor.x === col && session.cursor.y === row;
      const legal = canPickHackCell(session, col, row);
      gridGfx.fillStyle(Theme.panel, used ? 0.45 : 1);
      gridGfx.fillRect(cx, cy, CELL, CELL);
      gridGfx.lineStyle(cursor ? 2 : 1, cursor ? Theme.tape : Theme.panelEdge, cursor ? 1 : 0.85);
      gridGfx.strokeRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1);
      if (cursor && legal) {
        gridGfx.lineStyle(1, Theme.inkBright, 0.7);
        gridGfx.strokeRect(cx + 3, cy + 3, CELL - 6, CELL - 6);
      }
      const text = cells[row * HACK_SIZE + col]!;
      text.setVisible(true);
      text.setPosition(cx + CELL / 2, cy + CELL / 2);
      text.setText(HACK_MARKS[glyph]!);
      text.setColor(
        used ? ThemeCss.inkMute : `#${GLYPH_COLOR[glyph]!.toString(16).padStart(6, '0')}`,
      );
      text.setAlpha(used ? 0.4 : 1);
    }
  }

  footer.setWordWrapWidth(PANEL_W - 48);
  footer.setPosition(x + 24, gy + GRID + 16);
  footer.setText(`${lore(hackConstraintHint(session))}\n${lore('UI-HACK-KEYS')}`);
}

export function hideHackOverlay(objs: HackOverlayObjects): void {
  objs.bg.setVisible(false);
  objs.panel.setVisible(false);
  objs.badgeGfx.setVisible(false);
  objs.gridGfx.setVisible(false);
  objs.header.setVisible(false);
  objs.footer.setVisible(false);
  for (const cell of objs.cells) cell.setVisible(false);
}
