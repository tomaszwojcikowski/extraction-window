import Phaser from 'phaser';
import { FONT_DATA, Theme, ThemeCss } from '../../scenes/theme';
import { drawStencilBadge } from '../../scenes/atmosphere';
import type { ActionFloat } from './ActionFeedback';

/** How many recent causal chips stay docked when the mission log is closed. */
export const SIGNAL_RAIL_CAP = 3;

const CHIP_H = 18;
const CHIP_GAP = 4;
const CHIP_PAD_X = 8;

/**
 * Dock recent action floats as plated chips along the bottom-left rail.
 * Presentation-only — the full mission log (`l`) still owns the text history.
 */
export function layoutSignalRail(
  gfx: Phaser.GameObjects.Graphics,
  texts: Phaser.GameObjects.Text[],
  signals: ReadonlyArray<ActionFloat>,
  opts: { screenH: number; bottomInset: number; visible: boolean },
): number {
  gfx.clear();
  if (!opts.visible || signals.length === 0) {
    gfx.setVisible(false);
    for (const t of texts) t.setVisible(false);
    return 0;
  }

  gfx.setVisible(true);
  const baseY = opts.screenH - opts.bottomInset - 12;
  let stackH = 0;

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i]!;
    const signal = signals[signals.length - 1 - i];
    if (!signal) {
      text.setVisible(false);
      continue;
    }
    text.setVisible(true);
    text.setText(signal.label);
    text.setColor(signal.color);
    text.setFontFamily(FONT_DATA);
    text.setFontSize(10);
    const w = Math.max(56, Math.ceil(text.width) + CHIP_PAD_X * 2);
    const y = baseY - (i + 1) * (CHIP_H + CHIP_GAP);
    const x = 12;
    drawStencilBadge(gfx, x, y, w, CHIP_H, parseCssColor(signal.color));
    text.setPosition(x + CHIP_PAD_X, y + CHIP_H / 2);
    text.setOrigin(0, 0.5);
    stackH = (i + 1) * (CHIP_H + CHIP_GAP) + 6;
  }

  return stackH;
}

/** ThemeCss strings are `#rrggbb` — Phaser graphics want a number fill. */
function parseCssColor(css: string): number {
  if (css.startsWith('#') && css.length === 7) {
    return parseInt(css.slice(1), 16);
  }
  return Theme.panelEdge;
}

export function pushSignalRail(
  rail: ActionFloat[],
  next: ReadonlyArray<ActionFloat>,
  cap = SIGNAL_RAIL_CAP,
): ActionFloat[] {
  if (next.length === 0) return rail;
  return [...rail, ...next].slice(-cap);
}

/** Ensure a fixed pool of chip labels exists (scene create). */
export function ensureSignalRailTexts(
  scene: Phaser.Scene,
  count = SIGNAL_RAIL_CAP,
): Phaser.GameObjects.Text[] {
  const out: Phaser.GameObjects.Text[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      scene.add
        .text(0, 0, '', {
          fontFamily: FONT_DATA,
          fontSize: '10px',
          color: ThemeCss.ink,
        })
        .setScrollFactor(0)
        .setDepth(94)
        .setVisible(false),
    );
  }
  return out;
}
