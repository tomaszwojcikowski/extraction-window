import Phaser from 'phaser';
import { lore } from '../../../data/lore';
import {
  EQUIP_SLOT_LORE,
  EQUIP_SLOT_ORDER,
  ITEMS,
  shortEquipName,
} from '../../../data/items';
import type { GameState } from '../../../sim';
import { isItemWorn } from '../../../sim/equip';
import { Theme } from '../../../scenes/theme';
import { drawFieldPanel } from '../../../scenes/atmosphere';
import { phaserKitStatus } from '../../presenters/PhaserLanes';
import { kitUseFeedback } from '../../presenters/KitFeedback';

/** Draw the field kit / inventory modal into existing Phaser objects. */
export function drawKitOverlay(
  panel: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  screenW: number,
  screenH: number,
  st: GameState,
): void {
  const pw = 520;
  const selectedSlot = st.ui.selectedSlot;
  const selected = st.inventory[selectedSlot];
  const detailLines: string[] = [];

  if (selected) {
    const def = ITEMS[selected.kind];
    detailLines.push(`${lore(def.loreName).toUpperCase()}  ×${selected.count}`);
    detailLines.push(lore(def.loreDesc));
    if (isItemWorn(st, selected.kind)) {
      detailLines.push(`[${lore('UI-WORN')}]`);
    } else if (def.equipSlot || def.equipSlots?.length) {
      detailLines.push(`[${lore('UI-WEARABLE')}]`);
    }
  }

  const listLines =
    st.inventory.length === 0
      ? [lore('UI-EMPTY-INV')]
      : st.inventory.map((slot, i) => {
          const mark = i === selectedSlot ? '▸' : ' ';
          const num = i < 9 ? `${i + 1}` : i === 9 ? '0' : '·';
          const name = lore(ITEMS[slot.kind].loreName);
          const def = ITEMS[slot.kind];
          const wearable = def.equipSlot || def.equipSlots?.length;
          const worn = isItemWorn(st, slot.kind) ? ' ◆' : wearable ? ' ·' : '';
          return `${mark} ${num}  ${name}${worn}  ×${slot.count}`;
        });

  const dollLines = EQUIP_SLOT_ORDER.map((slotId) => {
    const label = lore(EQUIP_SLOT_LORE[slotId]);
    const worn = shortEquipName(st.player.equip[slotId]);
    return `${label.padEnd(5)} ${worn}`;
  });

  const SEP = '────────────────────────────';

  const sections: string[] = [
    lore('UI-LOADOUT'),
    dollLines.join('\n'),
    SEP,
    `${lore('UI-INV')}  ·  ${lore('UI-INV-BAG')}`,
    listLines.join('\n'),
  ];

  if (detailLines.length > 0) {
    sections.push(SEP);
    sections.push(detailLines.join('\n'));
  }

  const phaserStatus = phaserKitStatus(st, selected?.kind);
  if (phaserStatus) {
    sections.push(SEP);
    sections.push(lore(phaserStatus));
  }

  sections.push(SEP);
  const feedback = kitUseFeedback(st);
  if (feedback) {
    sections.push(`! ${feedback}`);
    sections.push(SEP);
  }
  sections.push(
    st.inventory.length > 10 ? lore('UI-INV-HINT-LONG') : lore('UI-INV-HINT'),
  );

  const ph = Math.max(280, 120 + st.inventory.length * 22 + (detailLines.length > 0 ? 72 : 0));
  const px = (screenW - pw) / 2;
  const py = (screenH - ph) / 2;
  drawFieldPanel(panel, px, py, pw, ph, Theme.tape);
  text.setWordWrapWidth(pw - 36);
  text.setPosition(px + 18, py + 22);
  text.setText(sections.join('\n'));
}
