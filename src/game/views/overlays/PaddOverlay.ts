import Phaser from 'phaser';
import { lore, type LoreId } from '../../../data/lore';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';
import { drawModalTapeHeader } from './modalChrome';

/** Fixed panel budget — body grows only inside this cap (kit lesson). */
const PADD_MAX_H = 460;
const PADD_MIN_BODY = 40;

/** Draw the PADD / codex pages modal into existing Phaser objects. */
export function drawPaddOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  codexLog: LoreId[],
  codexPages: number,
): void {
  const w = 480;
  const SEP = '──────────────────────────────────';
  const entries =
    codexLog.length === 0
      ? [lore('UI-PAGES-EMPTY')]
      : codexLog.map((id, i) => `${i + 1}  ${lore(id)}`);

  const body = entries.join(`\n${SEP}\n`);
  const h = Math.min(PADD_MAX_H, 110 + Math.max(PADD_MIN_BODY, codexLog.length * 52));
  const x = (screenW - w) / 2;
  const y = (screenH - h) / 2;
  drawFieldPanel(panel, x, y, w, h, Theme.flag);
  drawModalTapeHeader(panel, x, y, w, Theme.flag);
  text.setWordWrapWidth(w - 40);
  text.setPosition(x + 20, y + 28);
  text.setText(
    `${lore('UI-PAGES')}  (${codexPages} pages)\n` +
      `${SEP}\n` +
      `${lore('UI-PAGES-PURPOSE')}\n` +
      `${SEP}\n` +
      `${body}\n` +
      `${SEP}\n` +
      `${lore('UI-PAGES-HINT')}`,
  );
}
