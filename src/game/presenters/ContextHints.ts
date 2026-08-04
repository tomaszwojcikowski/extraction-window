import type { LoreId } from '../../data/lore';
import { ITEMS } from '../../data/items';
import {
  EXPLORE_BONUS_THRESHOLD,
} from '../../data/progression';
import type { GameState } from '../../sim';
import { hasItem } from '../../sim/inventory';
import { inShadow } from '../../sim/light';
import { mechanicsContextHint } from '../../sim/mechanics';
import { exploredFloorRatio } from '../../sim/mechanics/survey';

/** Pure contextual hint for the field HUD — no Phaser / scene state. */
export function contextHint(st: GameState): LoreId | null {
  // Skill pick locks movement — never show vitals tips that ask for i/u/WASD
  if (st.skillPick) return 'UI-HINT-SKILL';
  if (st.ui.aimingDart) return 'UI-HINT-AIM';

  const fromMechanic = mechanicsContextHint(st);
  if (fromMechanic) return fromMechanic;

  const telegraphed = st.enemies.some(
    (e) =>
      e.alive &&
      e.windup > 0 &&
      (st.visible[e.y]?.[e.x] ?? false),
  );
  if (telegraphed) return 'UI-HINT-TELE';

  const tile = st.tiles[st.player.y]![st.player.x]!;
  if (tile.kind === 'exit') return 'UI-HINT-EXIT';
  if (tile.kind === 'beacon') return 'UI-HINT-BEACON';
  if (tile.kind === 'shuttle') return 'UI-HINT-SHUTTLE';
  if (tile.kind === 'poi' && !st.poiUsed) return 'UI-HINT-POI';
  if (tile.kind === 'quest') return 'UI-HINT-QUEST';
  if (st.items.some((i) => i.x === st.player.x && i.y === st.player.y)) return 'UI-HINT-ITEM';

  // Situation coaching — only when the kit actually has the tool
  if ((tile.kind === 'hazard' || tile.kind === 'vent') && hasItem(st, 'sealant')) {
    return 'UI-HINT-USE-SEALANT';
  }
  if (
    inShadow(st, st.player.x, st.player.y) &&
    hasItem(st, 'flare') &&
    st.enemies.some(
      (e) =>
        e.alive &&
        Math.abs(e.x - st.player.x) + Math.abs(e.y - st.player.y) <= 3,
    )
  ) {
    return 'UI-HINT-FLARE';
  }
  if ((st.player.statuses.bleed ?? 0) > 0 && hasItem(st, 'patch')) {
    return 'UI-HINT-USE-PATCH';
  }
  if (st.player.hp <= st.player.maxHp * 0.4 && hasItem(st, 'med')) {
    return 'UI-HINT-USE-MED';
  }
  if (
    st.player.energy <= st.player.maxEnergy * 0.35 &&
    (hasItem(st, 'energy') || hasItem(st, 'coolant') || hasItem(st, 'battery'))
  ) {
    return 'UI-HINT-USE-ENERGY';
  }
  if (
    st.player.armor <= 3 &&
    st.player.maxArmor > 0 &&
    hasItem(st, 'plate')
  ) {
    return 'UI-HINT-USE-ARMOR';
  }

  // Unequipped wearables still in kit
  for (const slot of st.inventory) {
    const eq = ITEMS[slot.kind].equipSlot;
    if (!eq) continue;
    if (st.player.equip[eq] !== slot.kind) return 'UI-HINT-EQUIP';
  }

  const explore = exploredFloorRatio(st);
  if (
    st.exitPos &&
    explore >= EXPLORE_BONUS_THRESHOLD * 0.82 &&
    explore < EXPLORE_BONUS_THRESHOLD
  ) {
    return 'UI-HINT-EXPLORE';
  }

  return null;
}
