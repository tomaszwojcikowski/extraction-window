import type { GameState, Pos } from './types';
import { hasItem } from './inventory';
import type { LoreId } from '../data/lore';

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

export function assertLegalWin(state: GameState): boolean {
  return state.status === 'won' && hasItem(state, 'nav_core');
}

export function loreOrderLegal(events: LoreId[]): boolean {
  const idx = (id: LoreId) => events.indexOf(id);
  const key = idx('LOG-GOT-KEY');
  const used = idx('LOG-USED-KEY');
  const core = idx('LOG-GOT-CORE');
  const extract = idx('LOG-EXTRACT');

  if (used >= 0 && (key < 0 || used < key)) return false;
  if (extract >= 0) {
    if (core < 0 || extract < core) return false;
  }
  return true;
}
