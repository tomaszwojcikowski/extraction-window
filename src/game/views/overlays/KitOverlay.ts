import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import { ITEMS, shortEquipName } from '../../../data/items';
import type { GameState } from '../../../sim';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';

function isWorn(st: GameState, kind: string): boolean {
  const e = st.player.equip;
  return e.tool === kind || e.armor === kind;
}

/** Draw the field kit / inventory modal into existing Phaser objects. */
export function drawKitOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  st: GameState,
): void {
  const pw = 440;
  const selectedSlot = st.ui.selectedSlot;
  const selected = st.inventory[selectedSlot];
  const detailLines: string[] = [];

  if (selected) {
    const def = ITEMS[selected.kind];
    detailLines.push(`${lore(def.loreName).toUpperCase()}  ×${selected.count}`);
    detailLines.push(lore(def.loreDesc));
    if (isWorn(st, selected.kind)) {
      detailLines.push(`[${lore('UI-WORN')}]`);
    } else if (def.equipSlot) {
      detailLines.push(`[${lore('UI-WEARABLE')}]`);
    }
  }

  const listLines =
    st.inventory.length === 0
      ? [lore('UI-EMPTY-INV')]
      : st.inventory.map((slot, i) => {
          const mark = i === selectedSlot ? '▸' : ' ';
          const num = i < 9 ? `${i + 1}` : ' ';
          const name = lore(ITEMS[slot.kind].loreName);
          const worn = isWorn(st, slot.kind) ? ' ·' : ITEMS[slot.kind].equipSlot ? ' ·' : '';
          return `${mark} ${num}  ${name}${worn}  ×${slot.count}`;
        });

  const equipLine =
    `${lore('UI-TOOL')}: ${shortEquipName(st.player.equip.tool)}   ` +
    `${lore('UI-EQUIP-ARMOR')}: ${shortEquipName(st.player.equip.armor)}`;

  const SEP = '────────────────────────────';

  const sections: string[] = [
    `${lore('UI-INV')}  ·  ${equipLine}`,
    SEP,
    listLines.join('\n'),
  ];

  if (detailLines.length > 0) {
    sections.push(SEP);
    sections.push(detailLines.join('\n'));
  }

  sections.push(SEP);
  sections.push(lore('UI-INV-HINT'));

  const ph = Math.max(220, 88 + st.inventory.length * 22 + (detailLines.length > 0 ? 72 : 0));
  const px = (screenW - pw) / 2;
  const py = (screenH - ph) / 2;
  drawFieldPanel(panel, px, py, pw, ph, Theme.tape);
  text.setWordWrapWidth(pw - 36);
  text.setPosition(px + 18, py + 22);
  text.setText(sections.join('\n'));
}
