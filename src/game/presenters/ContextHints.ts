import type { LoreId } from '../../data/lore';
import type { GameState } from '../../sim';

/** Pure contextual hint for the field HUD — no Phaser / scene state. */
export function contextHint(st: GameState): LoreId | null {
  // Skill pick locks movement — never show vitals tips that ask for i/u/WASD
  if (st.skillPick) return 'UI-HINT-SKILL';
  if (st.ui.aimingDart) return 'UI-HINT-AIM';
  const tile = st.tiles[st.player.y]![st.player.x]!;
  if (tile.kind === 'exit') return 'UI-HINT-EXIT';
  if (tile.kind === 'beacon') return 'UI-HINT-BEACON';
  if (tile.kind === 'shuttle') return 'UI-HINT-SHUTTLE';
  if (
    st.roomQuest &&
    !st.roomQuest.done &&
    st.player.x === st.roomQuest.pos.x &&
    st.player.y === st.roomQuest.pos.y
  ) {
    return 'UI-HINT-QUEST';
  }
  if (tile.kind === 'poi' && !st.poiUsed) return 'UI-HINT-POI';
  if (st.items.some((i) => i.x === st.player.x && i.y === st.player.y)) return 'UI-HINT-ITEM';
  if (st.player.hp <= st.player.maxHp * 0.4) return 'UI-HINT-USE-MED';
  if (st.player.energy <= st.player.maxEnergy * 0.35) return 'UI-HINT-USE-ENERGY';
  if (st.player.armor <= 3 && st.player.maxArmor > 0) return 'UI-HINT-USE-ARMOR';
  return null;
}
