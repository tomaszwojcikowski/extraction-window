import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import { SKILLS } from '../../../data/progression';
import type { SkillId } from '../../../data/progression';
import { Theme, ThemeCss, FONT_DATA } from '../../../scenes/theme';
import { drawFieldPanel, drawStencilBadge } from '../../../scenes/atmosphere';

const PANEL_W = 480;
const PANEL_H = 220;

/** Create the Phaser objects for the skill pick overlay (call once in create()). */
export function createSkillPickObjects(
  scene: Phaser.Scene,
): {
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
  const panel = scene.add
    .graphics()
    .setScrollFactor(0)
    .setDepth(109)
    .setVisible(false);
  const badgeGfx = scene.add
    .graphics()
    .setScrollFactor(0)
    .setDepth(110)
    .setVisible(false);
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

/** Redraw the skill pick overlay when skillPick is present. */
export function drawSkillPickOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  badgeGfx: Phaser.GameObjects.Graphics,
  bg: Phaser.GameObjects.Rectangle,
  screenW: number,
  screenH: number,
  skillPick: readonly SkillId[],
): void {
  bg.setVisible(true);
  panel.setVisible(true);
  text.setVisible(true);
  badgeGfx.setVisible(true);

  const x = (screenW - PANEL_W) / 2;
  const y = (screenH - PANEL_H) / 2;
  drawFieldPanel(panel, x, y, PANEL_W, PANEL_H, Theme.biolum);

  badgeGfx.clear();
  // Header badge
  const headerW = 136;
  drawStencilBadge(badgeGfx, x + PANEL_W / 2 - headerW / 2, y - 10, headerW, 20, Theme.biolum);

  const lines: string[] = [];
  lines.push(lore('UI-SKILL-PICK').toUpperCase());
  lines.push('');
  for (let i = 0; i < skillPick.length; i++) {
    const id = skillPick[i]!;
    const def = SKILLS[id];
    lines.push(`${i + 1}  ${lore(def.loreName).toUpperCase()}  —  ${lore(def.loreDesc)}`);
  }
  lines.push('');
  lines.push(lore('UI-SKILL-CHOOSE'));

  text.setWordWrapWidth(PANEL_W - 48);
  text.setPosition(x + 24, y + 28);
  text.setText(lines.join('\n'));
}

/** Hide all skill pick objects. */
export function hideSkillPickOverlay(
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
