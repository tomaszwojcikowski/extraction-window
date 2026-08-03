import type { GameState, Pos } from './types';
import { hasItem } from './inventory';
import type { LoreId } from '../data/lore';
import { objectivePrompt } from '../campaign/spine';

export function currentObjectivePos(state: GameState): Pos | null {
  const sector = state.sectorId;

  if (sector === 'ruin' && !state.objectives.hasRelayKey) {
    const key = state.items.find((i) => i.kind === 'relay_key');
    if (key) return { x: key.x, y: key.y };
  }
  if (sector === 'beacon' && !state.objectives.beaconOpen) {
    return state.beaconPos;
  }
  if (sector === 'vault' && !state.objectives.hasNavCore) {
    const core = state.items.find((i) => i.kind === 'nav_core');
    if (core) return { x: core.x, y: core.y };
  }
  if (sector === 'ridge') {
    return state.shuttlePos ?? state.exitPos;
  }

  // Prefer ground quest items
  const quest = state.items.find((i) => i.kind === 'relay_key' || i.kind === 'nav_core');
  if (quest) return { x: quest.x, y: quest.y };

  // Useful loot if low resources
  if (state.player.hp < state.player.maxHp * 0.5) {
    const med = state.items.find((i) => i.kind === 'med' || i.kind === 'ration');
    if (med) return { x: med.x, y: med.y };
  }
  if (state.player.energy < state.player.maxEnergy * 0.4) {
    const en = state.items.find((i) => i.kind === 'energy' || i.kind === 'ration');
    if (en) return { x: en.x, y: en.y };
  }

  return state.exitPos ?? state.shuttlePos;
}

export type ObjectiveDesc = {
  local: LoreId;
  campaign: LoreId;
  pos: Pos | null;
};

/** Shared HUD / coherency description of the active goal. */
export function describeObjective(state: GameState): ObjectiveDesc {
  const campaign = objectivePrompt({
    hasRelayKey: state.objectives.hasRelayKey,
    usedRelayKey: state.objectives.usedRelayKey,
    hasNavCore: state.objectives.hasNavCore,
    sectorId: state.sectorId,
  });
  const pos = currentObjectivePos(state);
  let local: LoreId = 'OBJ-LOCAL-EXIT';

  if (state.sectorId === 'ruin' && !state.objectives.hasRelayKey) {
    local = 'OBJ-LOCAL-KEY';
  } else if (state.sectorId === 'beacon' && !state.objectives.beaconOpen) {
    local = 'OBJ-LOCAL-BEACON';
  } else if (state.sectorId === 'vault' && !state.objectives.hasNavCore) {
    local = 'OBJ-LOCAL-CORE';
  } else if (state.sectorId === 'ridge') {
    local = 'OBJ-LOCAL-SHUTTLE';
  } else if (pos) {
    const ground = state.items.find((i) => i.x === pos.x && i.y === pos.y);
    if (ground?.kind === 'relay_key') local = 'OBJ-LOCAL-KEY';
    else if (ground?.kind === 'nav_core') local = 'OBJ-LOCAL-CORE';
    else if (
      state.beaconPos &&
      pos.x === state.beaconPos.x &&
      pos.y === state.beaconPos.y
    ) {
      local = 'OBJ-LOCAL-BEACON';
    } else if (
      state.shuttlePos &&
      pos.x === state.shuttlePos.x &&
      pos.y === state.shuttlePos.y
    ) {
      local = 'OBJ-LOCAL-SHUTTLE';
    } else {
      local = 'OBJ-LOCAL-EXIT';
    }
  }

  return { local, campaign, pos };
}

/** Latest causal milestone for sticky HUD (key → used → core). */
export function stickyMilestone(events: LoreId[]): LoreId | null {
  const order: LoreId[] = ['LOG-GOT-KEY', 'LOG-USED-KEY', 'LOG-GOT-CORE'];
  let best: LoreId | null = null;
  let bestIdx = -1;
  for (const id of order) {
    const i = events.lastIndexOf(id);
    if (i > bestIdx) {
      bestIdx = i;
      best = id;
    }
  }
  return best;
}

export function assertLegalWin(state: GameState): boolean {
  return (
    state.status === 'won' &&
    hasItem(state, 'nav_core') &&
    state.objectives.usedRelayKey &&
    state.objectives.beaconOpen
  );
}

export function loreOrderLegal(events: LoreId[]): boolean {
  const idx = (id: LoreId) => events.indexOf(id);
  const key = idx('LOG-GOT-KEY');
  const used = idx('LOG-USED-KEY');
  const core = idx('LOG-GOT-CORE');
  const extract = idx('LOG-EXTRACT');

  if (used >= 0 && (key < 0 || used < key)) return false;
  if (core >= 0 && used >= 0 && core < used) return false;
  if (core >= 0 && key >= 0 && core < key) return false;
  if (extract >= 0) {
    if (core < 0 || extract < core) return false;
    if (used < 0 || extract < used) return false;
    if (key < 0 || extract < key) return false;
  }
  return true;
}
