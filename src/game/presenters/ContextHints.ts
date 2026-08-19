import type { LoreId } from '../../data/lore';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, INVENTORY_SLOTS } from '../../data/items';
import type { GameState } from '../../sim';
import { incomingFlankSeats } from '../../sim/ai';
import { flankPenalty } from '../../sim/combat';
import { hasItem } from '../../sim/inventory';
import { inShadow } from '../../sim/light';
import { mechanicsContextHint } from '../../sim/mechanics';
import { pillarCoachHint } from './PillarCoach';

/** Pure contextual hint for the field HUD — no Phaser / scene state. */
export function contextHint(st: GameState): LoreId | null {
  // Skill pick overlay owns coaching — never stack a second hint channel.
  if (st.skillPick) return null;
  if (st.ui.aimingDart) return 'UI-HINT-AIM';

  const fromMechanic = mechanicsContextHint(st);
  // The first-run drill deliberately teaches its bespoke stalker response.
  if (st.tutorialActive && fromMechanic) return fromMechanic;

  // Everything winding up has to be outrun or killed — coach by intent.
  const armed = st.enemies.filter(
    (e) => e.alive && (st.visible[e.y]?.[e.x] ?? false) && e.windup > 0,
  );
  if (armed.length > 0) {
    const inReach = armed.some(
      (e) => Math.abs(e.x - st.player.x) + Math.abs(e.y - st.player.y) === 1,
    );
    if (inReach && armed.some((e) => e.intent === 'reach' || e.intent === 'pounce')) {
      return 'UI-HINT-TELE-REACH';
    }
    if (armed.some((e) => e.intent === 'overwatch')) return 'UI-HINT-TELE-OVERWATCH';
    if (armed.some((e) => e.intent === 'beam')) return 'UI-HINT-TELE-BEAM';
    if (armed.some((e) => e.intent === 'zone')) return 'UI-HINT-TELE-ZONE';
    if (armed.some((e) => e.intent === 'reach')) return 'UI-HINT-TELE-REACH';
    return inReach ? 'UI-HINT-TELE-REACH' : 'UI-HINT-TELE';
  }

  if (fromMechanic) return fromMechanic;

  if ((st.player.statuses.downed ?? 0) > 0) return 'UI-HINT-DOWNED';

  if (st.busFailing || st.player.energy <= 8) {
    return hasItem(st, 'energy') ? 'UI-HINT-USE-ENERGY' : 'UI-HINT-BUS-LOW';
  }

  // Pack pressure — persist while the spatial question is live.
  // Windup and site mechanics still win; hatch/kit tips yield.
  if (flankPenalty(st) > 0) return 'UI-HINT-FLANK';
  if (incomingFlankSeats(st).length > 0) return 'UI-HINT-FLANK-COMING';

  // Dark-prefer bite is paying out — step to LIT.
  if (
    inShadow(st, st.player.x, st.player.y) &&
    st.enemies.some(
      (e) =>
        e.alive &&
        ENEMIES[e.kind].lightPrefer === 'dark' &&
        (st.visible[e.y]?.[e.x] ?? false) &&
        Math.abs(e.x - st.player.x) + Math.abs(e.y - st.player.y) === 1,
    )
  ) {
    return 'UI-HINT-PREFER-DARK';
  }

  if (st.allies.some((a) => a.alive && a.kind === 'probe_drone')) return 'UI-HINT-ALLY-DRONE';
  if (
    st.allies.some(
      (a) =>
        a.alive &&
        a.kind === 'away_escort' &&
        Math.abs(a.x - st.player.x) + Math.abs(a.y - st.player.y) === 1,
    )
  ) {
    return 'UI-HINT-ALLY-ESCORT';
  }

  const tile = st.tiles[st.player.y]![st.player.x]!;
  if (tile.kind === 'exit') {
    // Say what the hatch wants — "sealed" alone is a dead end.
    if (st.sectorId === 'ruin' && !hasItem(st, 'relay_key')) return 'UI-HINT-EXIT-NEED-KEY';
    if (st.sectorId === 'vault' && !hasItem(st, 'nav_core')) return 'UI-HINT-EXIT-NEED-CORE';
    if (st.sectorId === 'beacon' && !st.objectives.beaconOpen) {
      return hasItem(st, 'relay_key') ? 'UI-HINT-EXIT-NEED-BEACON' : 'UI-HINT-EXIT-NEED-KEY';
    }
    return 'UI-HINT-EXIT';
  }
  if (tile.kind === 'beacon') {
    if (!st.objectives.beaconOpen && !hasItem(st, 'relay_key')) {
      return 'UI-HINT-BEACON-NEED-KEY';
    }
    return 'UI-HINT-BEACON';
  }
  if (tile.kind === 'shuttle') return 'UI-HINT-SHUTTLE';
  // Active optional-site coaching comes from roomQuestMechanic (step prompt).
  // Other quest tiles stay quiet — amber frame + OPT line carry the read.
  if (tile.kind === 'quest') return null;
  if (st.items.some((i) => i.x === st.player.x && i.y === st.player.y)) {
    return st.inventory.length >= INVENTORY_SLOTS ? 'UI-HINT-ITEM-FULL' : 'UI-HINT-ITEM';
  }
  // Situation coaching — only when the kit actually has the tool
  if (
    (tile.kind === 'hazard' || tile.kind === 'vent' || tile.kind === 'brine_pool') &&
    hasItem(st, 'sealant')
  ) {
    return 'UI-HINT-USE-SEALANT';
  }
  const adjSealed = (
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const
  ).some(([dx, dy]) => {
    const t = st.tiles[st.player.y + dy]?.[st.player.x + dx];
    return t?.kind === 'sealed';
  });
  if (adjSealed && hasItem(st, 'sealant')) {
    return 'UI-HINT-SEALED-SEALANT';
  }
  if (adjSealed) return 'UI-HINT-SEALED';
  // Soft-shadow ambush tip is one-shot via drill / light badge — do not re-hog here.
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
  if ((st.player.statuses.bleed ?? 0) > 0 && hasItem(st, 'med')) {
    return 'UI-HINT-USE-PATCH';
  }
  if (st.player.hp <= st.player.maxHp * 0.4 && hasItem(st, 'med')) {
    return 'UI-HINT-USE-MED';
  }
  if (
    st.player.energy <= st.player.maxEnergy * 0.35 &&
    hasItem(st, 'energy')
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

  const pillar = pillarCoachHint(st);
  if (pillar) return pillar;

  return null;
}

/** The single hint-line channel — overlays own the line when kit/skill/aim is open. */
export function resolveHintLine(st: GameState): LoreId | null {
  return contextHint(st);
}
