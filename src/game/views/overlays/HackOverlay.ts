import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import type { HackNote, HackSession } from '../../../sim/types';
import {
  HACK_LEN,
  HACK_MARKS,
  HACK_SIZE,
  HACK_TRIES,
  hackConstraintHint,
  hackLaneCells,
} from '../../../sim/mechanics/consoleHack';
import { Theme, ThemeCss, FONT_DATA, FONT_DISPLAY } from '../../../scenes/theme';
import { drawFieldPanel, drawStencilBadge } from '../../../scenes/atmosphere';
import { drawModalTapeHeader } from './modalChrome';

const PANEL_W = 560;
const PANEL_H = 478;
const CELL = 46;
const GAP = 8;
const GRID = HACK_SIZE * CELL + (HACK_SIZE - 1) * GAP;
const CHIP = 36;
const CHIP_GAP = 8;

export const HACK_GLYPH_COLOR = [Theme.ink, Theme.biolum, Theme.tape, Theme.flag, Theme.safe] as const;

export type HackOverlayObjects = {
  bg: Phaser.GameObjects.Rectangle;
  panel: Phaser.GameObjects.Graphics;
  badgeGfx: Phaser.GameObjects.Graphics;
  gridGfx: Phaser.GameObjects.Graphics;
  badge: Phaser.GameObjects.Text;
  labels: Phaser.GameObjects.Text;
  header: Phaser.GameObjects.Text;
  footer: Phaser.GameObjects.Text;
  chips: Phaser.GameObjects.Text[];
  cells: Phaser.GameObjects.Text[];
};

function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function createHackOverlayObjects(scene: Phaser.Scene): HackOverlayObjects {
  const bg = scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, Theme.groundDeep, 0.82)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(108)
    .setVisible(false);
  const panel = scene.add.graphics().setScrollFactor(0).setDepth(109).setVisible(false);
  const badgeGfx = scene.add.graphics().setScrollFactor(0).setDepth(110).setVisible(false);
  const gridGfx = scene.add.graphics().setScrollFactor(0).setDepth(110).setVisible(false);
  const badge = scene.add
    .text(0, 0, '', {
      fontFamily: FONT_DISPLAY,
      fontSize: '11px',
      color: ThemeCss.inkBright,
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(111)
    .setVisible(false);
  const labels = scene.add
    .text(0, 0, '', {
      fontFamily: FONT_DATA,
      fontSize: '11px',
      color: ThemeCss.inkDim,
      lineSpacing: 35,
    })
    .setScrollFactor(0)
    .setDepth(111)
    .setVisible(false);
  const header = scene.add
    .text(0, 0, '', {
      fontFamily: FONT_DATA,
      fontSize: '13px',
      color: ThemeCss.ink,
      lineSpacing: 4,
    })
    .setScrollFactor(0)
    .setDepth(111)
    .setVisible(false);
  const footer = scene.add
    .text(0, 0, '', {
      fontFamily: FONT_DATA,
      fontSize: '12px',
      color: ThemeCss.inkDim,
    })
    .setScrollFactor(0)
    .setDepth(111)
    .setVisible(false);
  const chips: Phaser.GameObjects.Text[] = [];
  for (let i = 0; i < HACK_LEN * 2; i++) {
    chips.push(
      scene.add
        .text(0, 0, '', {
          fontFamily: FONT_DATA,
          fontSize: '16px',
          color: ThemeCss.inkBright,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(111)
        .setVisible(false),
    );
  }
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
  return { bg, panel, badgeGfx, gridGfx, badge, labels, header, footer, chips, cells };
}

function drawChipPlate(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  fill: number,
  opts: { empty?: boolean; live?: boolean; miss?: boolean },
): void {
  g.fillStyle(Theme.groundDeep, 0.9);
  g.fillRect(x, y, CHIP, CHIP);
  g.fillStyle(opts.empty ? Theme.panel : Theme.ground, opts.empty ? 0.7 : 1);
  g.fillRect(x + 1, y + 1, CHIP - 2, CHIP - 2);
  const tab = opts.miss ? Theme.rust : fill;
  g.fillStyle(tab, opts.empty ? 0.25 : 0.95);
  g.fillRect(x + 1, y + 2, 3, CHIP - 4);
  if (opts.live) {
    g.lineStyle(2, Theme.tape, 1);
    g.strokeRect(x + 0.5, y + 0.5, CHIP - 1, CHIP - 1);
  } else {
    g.lineStyle(1, Theme.panelEdge, 0.7);
    g.strokeRect(x + 0.5, y + 0.5, CHIP - 1, CHIP - 1);
  }
}

export function drawHackOverlay(
  objs: HackOverlayObjects,
  screenW: number,
  screenH: number,
  session: HackSession,
  animFrame = 0,
  lab = false,
  note: HackNote | null = null,
): void {
  const { bg, panel, badgeGfx, gridGfx, badge, labels, header, footer, chips, cells } = objs;
  bg.setVisible(true);
  panel.setVisible(true);
  badgeGfx.setVisible(true);
  gridGfx.setVisible(true);
  badge.setVisible(true);
  labels.setVisible(true);
  header.setVisible(true);
  footer.setVisible(true);

  const x = (screenW - PANEL_W) / 2;
  const y = (screenH - PANEL_H) / 2;
  drawFieldPanel(panel, x, y, PANEL_W, PANEL_H, Theme.tape);
  drawModalTapeHeader(panel, x, y, PANEL_W, Theme.tape);

  badgeGfx.clear();
  const badgeW = 148;
  drawStencilBadge(badgeGfx, x + PANEL_W / 2 - badgeW / 2, y - 10, badgeW, 20, Theme.tape);
  badge.setPosition(x + PANEL_W / 2 + 4, y);
  badge.setText(lore('UI-HACK-TITLE').toUpperCase());

  const chipRowW = HACK_LEN * CHIP + (HACK_LEN - 1) * CHIP_GAP;
  const chipX = x + 28;
  const targetY = y + 36;
  const bufferY = targetY + CHIP + 10;
  const live = session.buffer.length;

  labels.setPosition(chipX, targetY);
  labels.setText(`${lore('UI-HACK-TARGET')}\n${lore('UI-HACK-BUFFER')}`);

  const chipsLeft = chipX + 78;
  gridGfx.clear();
  for (let i = 0; i < HACK_LEN; i++) {
    const cx = chipsLeft + i * (CHIP + CHIP_GAP);
    const glyph = session.target[i]!;
    const fill = HACK_GLYPH_COLOR[glyph]!;
    drawChipPlate(gridGfx, cx, targetY - 6, fill, { live: i === live });
    const t = chips[i]!;
    t.setVisible(true);
    t.setPosition(cx + CHIP / 2 + 1, targetY - 6 + CHIP / 2);
    t.setText(HACK_MARKS[glyph]!);
    t.setColor(css(fill));
    t.setAlpha(i === live ? 1 : i < live ? 0.55 : 0.9);

    const bx = cx;
    const have = i < session.buffer.length;
    const bglyph = have ? session.buffer[i]! : null;
    const miss = have && bglyph !== session.target[i];
    drawChipPlate(gridGfx, bx, bufferY - 6, have ? HACK_GLYPH_COLOR[bglyph!]! : Theme.inkMute, {
      empty: !have,
      miss,
    });
    const b = chips[HACK_LEN + i]!;
    b.setVisible(true);
    b.setPosition(bx + CHIP / 2 + 1, bufferY - 6 + CHIP / 2);
    b.setText(have ? HACK_MARKS[bglyph!]! : '·');
    b.setColor(have ? css(miss ? Theme.rust : HACK_GLYPH_COLOR[bglyph!]!) : ThemeCss.inkMute);
    b.setAlpha(have ? 1 : 0.5);
  }

  const pipX = chipsLeft + chipRowW + 18;
  const pipY = targetY - 2;
  for (let i = 0; i < HACK_TRIES; i++) {
    const on = i < session.attempts;
    gridGfx.fillStyle(on ? Theme.tape : Theme.panelEdge, on ? 0.95 : 0.4);
    gridGfx.fillRect(pipX, pipY + i * 12, 10, 8);
    gridGfx.fillStyle(Theme.groundDeep, 0.35);
    gridGfx.fillRect(pipX, pipY + i * 12, 10, 1);
  }

  const gx = x + (PANEL_W - GRID) / 2;
  const gy = y + 132;
  const lane = new Set(hackLaneCells(session).map((p) => `${p.x},${p.y}`));
  const pulse = animFrame % 2 === 0;

  gridGfx.fillStyle(Theme.groundDeep, 0.65);
  gridGfx.fillRect(gx - 8, gy - 8, GRID + 16, GRID + 16);
  gridGfx.lineStyle(1, Theme.panelEdge, 0.7);
  gridGfx.strokeRect(gx - 8.5, gy - 8.5, GRID + 17, GRID + 17);

  if (session.last) {
    gridGfx.fillStyle(Theme.tape, 0.9);
    if (session.axis === 'col') {
      const lx = gx + session.last.x * (CELL + GAP) - 4;
      gridGfx.fillRect(lx, gy - 4, 2, GRID + 8);
    } else {
      const ly = gy + session.last.y * (CELL + GAP) - 4;
      gridGfx.fillRect(gx - 4, ly, GRID + 8, 2);
    }
  }

  for (let row = 0; row < HACK_SIZE; row++) {
    for (let col = 0; col < HACK_SIZE; col++) {
      const cx = gx + col * (CELL + GAP);
      const cy = gy + row * (CELL + GAP);
      const glyph = session.grid[row]![col]!;
      const used = session.used[row]![col]!;
      const cursor = session.cursor.x === col && session.cursor.y === row;
      const legal = lane.has(`${col},${row}`);

      gridGfx.fillStyle(Theme.panel, used ? 0.35 : legal ? 1 : 0.55);
      gridGfx.fillRect(cx, cy, CELL, CELL);
      if (legal && !used) {
        gridGfx.fillStyle(Theme.tape, cursor ? 0.22 : 0.1);
        gridGfx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
      }
      const edge = cursor
        ? note === 'blocked'
          ? Theme.rust
          : Theme.tape
        : legal && !used
          ? Theme.tape
          : Theme.panelEdge;
      gridGfx.lineStyle(cursor ? 2 : 1, edge, cursor ? 1 : legal ? 0.85 : 0.45);
      gridGfx.strokeRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1);
      if (cursor) {
        const inset = pulse ? 3 : 4;
        gridGfx.lineStyle(1, Theme.inkBright, pulse ? 0.85 : 0.45);
        gridGfx.strokeRect(cx + inset, cy + inset, CELL - inset * 2, CELL - inset * 2);
      }
      const order = session.picks.findIndex((p) => p.x === col && p.y === row);
      if (order >= 0) {
        gridGfx.fillStyle(Theme.tape, 0.9);
        gridGfx.fillRect(cx + 3, cy + 3, 7, 9);
        gridGfx.fillStyle(Theme.groundDeep, 1);
        for (let t = 0; t <= order; t++) {
          gridGfx.fillRect(cx + 4, cy + 4 + t * 2, 5, 1);
        }
      }

      const text = cells[row * HACK_SIZE + col]!;
      text.setVisible(true);
      text.setPosition(cx + CELL / 2, cy + CELL / 2);
      text.setText(HACK_MARKS[glyph]!);
      text.setColor(used ? ThemeCss.inkMute : css(HACK_GLYPH_COLOR[glyph]!));
      text.setAlpha(used ? 0.35 : legal ? 1 : 0.4);
    }
  }

  header.setPosition(x + 28, gy + GRID + 18);
  header.setColor(note === 'fail' ? ThemeCss.flag : ThemeCss.tape);
  header.setText(lore(hackConstraintHint(session)));

  footer.setPosition(x + 28, gy + GRID + 40);
  footer.setText(lab ? `${lore('UI-HACK-KEYS')} · ${lore('UI-HACK-LAB-HINT')}` : lore('UI-HACK-KEYS'));
}

export function hideHackOverlay(objs: HackOverlayObjects): void {
  objs.bg.setVisible(false);
  objs.panel.setVisible(false);
  objs.badgeGfx.setVisible(false);
  objs.gridGfx.setVisible(false);
  objs.badge.setVisible(false);
  objs.labels.setVisible(false);
  objs.header.setVisible(false);
  objs.footer.setVisible(false);
  for (const chip of objs.chips) chip.setVisible(false);
  for (const cell of objs.cells) cell.setVisible(false);
}
