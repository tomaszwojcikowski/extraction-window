import Phaser from 'phaser';
import { lore, type LoreId } from '../../../data/lore';
import { Theme } from '../../../scenes/theme';
import { drawLcarsPanel } from '../../../scenes/atmosphere';

/** Draw the PADD / codex pages modal into existing Phaser objects. */
export function drawPaddOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  codexLog: LoreId[],
  codexPages: number,
): void {
  const w = 460;
  const body =
    codexLog.length === 0
      ? lore('UI-PAGES-EMPTY')
      : codexLog.map((id, i) => `${i + 1}. ${lore(id)}`).join('\n\n');
  const h = Math.min(420, 90 + Math.max(40, codexLog.length * 48));
  const x = (screenW - w) / 2;
  const y = (screenH - h) / 2;
  drawLcarsPanel(panel, x, y, w, h, Theme.quest);
  text.setPosition(x + 20, y + 22);
  text.setText(
    `${lore('UI-PAGES')}  (${codexPages})\n\n${lore('UI-PAGES-PURPOSE')}\n\n${body}\n\n${lore('UI-PAGES-HINT')}`,
  );
}
