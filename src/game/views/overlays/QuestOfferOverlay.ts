import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import type { QuestOffer } from '../../../sim/types';
import { Theme, ThemeCss, FONT_DATA } from '../../../scenes/theme';
import { drawFieldPanel, drawStencilBadge } from '../../../scenes/atmosphere';
import { drawModalTapeHeader } from './modalChrome';

const PANEL_W = 520;
const PANEL_H = 260;

/** Create Phaser objects for the quest accept/decline overlay. */
export function createQuestOfferObjects(scene: Phaser.Scene): {
  bg: Phaser.GameObjects.Rectangle;
  panel: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  badgeGfx: Phaser.GameObjects.Graphics;
} {
  const bg = scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, Theme.groundDeep, 0.55)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(108)
    .setVisible(false);
  const panel = scene.add.graphics().setScrollFactor(0).setDepth(109).setVisible(false);
  const badgeGfx = scene.add.graphics().setScrollFactor(0).setDepth(110).setVisible(false);
  const text = scene.add
    .text(0, 0, '', {
      fontFamily: FONT_DATA,
      fontSize: '13px',
      color: ThemeCss.ink,
      lineSpacing: 6,
    })
    .setScrollFactor(0)
    .setDepth(110)
    .setVisible(false);
  return { bg, panel, text, badgeGfx };
}

export function drawQuestOfferOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  badgeGfx: Phaser.GameObjects.Graphics,
  bg: Phaser.GameObjects.Rectangle,
  screenW: number,
  screenH: number,
  offer: QuestOffer,
): void {
  bg.setVisible(true);
  panel.setVisible(true);
  text.setVisible(true);
  badgeGfx.setVisible(true);

  const x = (screenW - PANEL_W) / 2;
  const y = (screenH - PANEL_H) / 2;
  const accent = offer.source === 'npc' ? Theme.tape : Theme.flag;
  drawFieldPanel(panel, x, y, PANEL_W, PANEL_H, accent);
  drawModalTapeHeader(panel, x, y, PANEL_W, accent);

  badgeGfx.clear();
  const headerW = 148;
  drawStencilBadge(badgeGfx, x + PANEL_W / 2 - headerW / 2, y - 10, headerW, 20, accent);

  const lines: string[] = [];
  lines.push(lore('UI-QUEST-OFFER').toUpperCase());
  lines.push('');
  lines.push(lore(offer.title).toUpperCase());
  lines.push(lore(offer.body));
  lines.push('');
  if (offer.costLine) {
    lines.push(`${lore('UI-QUEST-BILLS')} ${lore(offer.costLine)}`);
  }
  if (offer.payoffLine) {
    lines.push(`${lore('UI-QUEST-PAYS')} ${lore(offer.payoffLine)}`);
  }
  lines.push('');
  lines.push(lore('UI-QUEST-ACCEPT'));
  lines.push(lore('UI-QUEST-DECLINE'));

  text.setWordWrapWidth(PANEL_W - 48);
  text.setPosition(x + 24, y + 32);
  text.setText(lines.join('\n'));
}

export function hideQuestOfferOverlay(
  bg: Phaser.GameObjects.Rectangle,
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  badgeGfx: Phaser.GameObjects.Graphics,
): void {
  bg.setVisible(false);
  panel.setVisible(false);
  text.setVisible(false);
  badgeGfx.setVisible(false);
}
