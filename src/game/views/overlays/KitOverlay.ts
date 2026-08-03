import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import { ITEMS, shortEquipName } from '../../../data/items';
import type { GameState } from '../../../sim';
import { Theme } from '../../../scenes/theme';
import { drawLcarsPanel } from '../../../scenes/atmosphere';

function isWorn(st: GameState, kind: string): boolean {
  const e = st.player.equip;
  return e.tool === kind || e.armor === kind || e.utility === kind;
}

/** Draw the field kit / inventory modal into existing Phaser objects. */
export function drawKitOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  st: GameState,
): void {
  const pw = 420;
  const ph = Math.max(200, 100 + st.inventory.length * 22);
  const px = (screenW - pw) / 2;
  const py = (screenH - ph) / 2;
  drawLcarsPanel(panel, px, py, pw, ph, Theme.phosphor);
  const lines =
    st.inventory.length === 0
      ? [lore('UI-EMPTY-INV')]
      : st.inventory.map((slot, i) => {
          const mark = i === st.ui.selectedSlot ? '▸' : ' ';
          const num = i < 9 ? `${i + 1}` : ' ';
          const name = lore(ITEMS[slot.kind].loreName);
          const desc = lore(ITEMS[slot.kind].loreDesc);
          const worn = isWorn(st, slot.kind) ? ' [E]' : ITEMS[slot.kind].equipSlot ? ' [e]' : '';
          const sel = i === st.ui.selectedSlot ? `  — ${desc}` : '';
          return `${mark} ${num}  ${name}${worn} ×${slot.count}${sel}`;
        });
  text.setPosition(px + 18, py + 22);
  const equipLine =
    `${lore('UI-TOOL')}: ${shortEquipName(st.player.equip.tool)}   ` +
    `${lore('UI-EQUIP-ARMOR')}: ${shortEquipName(st.player.equip.armor)}   ` +
    `${lore('UI-EQUIP-UTIL')}: ${shortEquipName(st.player.equip.utility)}`;
  text.setText(`${lore('UI-INV')}\n${equipLine}\n\n${lines.join('\n')}\n\n${lore('UI-INV-HINT')}`);
}
