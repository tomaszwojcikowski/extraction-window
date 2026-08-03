import {
  applyAction,
  bfsPath,
  currentObjectivePos,
  hasItem,
  type Action,
  type GameState,
} from '../sim';

/**
 * Headless autopilot: path to objectives, fight blockers, heal when low,
 * use key/core interactions, exit sectors.
 */
export function chooseAction(state: GameState): Action | null {
  if (state.status !== 'playing') return null;

  // Heal / recharge aggressively
  if (state.player.hp <= state.player.maxHp * 0.55) {
    const medIdx = state.inventory.findIndex((s) => s.kind === 'med');
    const rationIdx = state.inventory.findIndex((s) => s.kind === 'ration');
    const idx = medIdx >= 0 ? medIdx : rationIdx;
    if (idx >= 0) {
      state.ui.selectedSlot = idx;
      return { type: 'use' };
    }
  }
  if (state.player.energy <= state.player.maxEnergy * 0.45) {
    const enIdx = state.inventory.findIndex((s) => s.kind === 'energy');
    const rationIdx = state.inventory.findIndex((s) => s.kind === 'ration');
    const idx = enIdx >= 0 ? enIdx : rationIdx;
    if (idx >= 0) {
      state.ui.selectedSlot = idx;
      return { type: 'use' };
    }
  }
  // Buff before likely fights in late sectors
  if (state.sectorIndex >= 3 && state.player.probeTurns <= 0) {
    const probeIdx = state.inventory.findIndex((s) => s.kind === 'probe');
    if (probeIdx >= 0 && state.player.hp > state.player.maxHp * 0.5) {
      state.ui.selectedSlot = probeIdx;
      return { type: 'use' };
    }
  }

  const { x, y } = state.player;
  const tile = state.tiles[y]![x]!;

  // Interact when standing on special tiles
  if (tile.kind === 'beacon' && !state.objectives.beaconOpen && hasItem(state, 'relay_key')) {
    return { type: 'exit' };
  }
  if (tile.kind === 'shuttle' && hasItem(state, 'nav_core')) {
    return { type: 'exit' };
  }
  if (tile.kind === 'exit') {
    // Never leave early without required quest items
    if (state.sectorId === 'ruin' && !hasItem(state, 'relay_key')) {
      // fall through to path toward key
    } else if (state.sectorId === 'vault' && !hasItem(state, 'nav_core')) {
      // fall through toward core
    } else if (state.sectorId === 'beacon' && !state.objectives.beaconOpen) {
      // need to authorize beacon first
    } else if (state.sectorId !== 'beacon' || state.objectives.beaconOpen) {
      return { type: 'exit' };
    }
  }

  // Pickup useful items underfoot
  const here = state.items.find((i) => i.x === x && i.y === y);
  if (here && here.kind !== 'relay_key' && here.kind !== 'nav_core') {
    // quest auto-picked; grab consumables if space
    if (state.inventory.length < 10) return { type: 'get' };
  }

  const goal = currentObjectivePos(state);
  if (!goal) return { type: 'wait' };

  // If on beacon tile needing key
  if (
    state.beaconPos &&
    goal.x === state.beaconPos.x &&
    goal.y === state.beaconPos.y &&
    x === goal.x &&
    y === goal.y
  ) {
    return { type: 'exit' };
  }

  // If on shuttle
  if (
    state.shuttlePos &&
    x === state.shuttlePos.x &&
    y === state.shuttlePos.y
  ) {
    return { type: 'exit' };
  }

  // If on exit
  if (state.exitPos && x === state.exitPos.x && y === state.exitPos.y) {
    if (state.sectorId === 'ruin' && !hasItem(state, 'relay_key')) {
      // stay and seek key
    } else if (state.sectorId === 'vault' && !hasItem(state, 'nav_core')) {
      // stay and seek core
    } else if (state.sectorId === 'beacon' && !state.objectives.beaconOpen) {
      // need key authorization first
    } else if (state.sectorId !== 'beacon' || state.objectives.beaconOpen) {
      return { type: 'exit' };
    }
  }

  const blocked = (bx: number, by: number) => {
    // Allow stepping onto enemy (attack)
    return false;
  };

  const path = bfsPath(state.tiles, { x, y }, goal, blocked);
  if (!path || path.length === 0) {
    // Wander toward exit if stuck on current goal
    if (state.exitPos && !(goal.x === state.exitPos.x && goal.y === state.exitPos.y)) {
      const alt = bfsPath(state.tiles, { x, y }, state.exitPos, blocked);
      if (alt && alt[0]) {
        return { type: 'move', dx: alt[0].x - x, dy: alt[0].y - y };
      }
    }
    // Random step
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const d = dirs[Math.floor(state.rng() * dirs.length)]!;
    return { type: 'move', dx: d[0]!, dy: d[1]! };
  }

  const step = path[0]!;
  return { type: 'move', dx: step.x - x, dy: step.y - y };
}

export interface AutopilotResult {
  state: GameState;
  actions: number;
  stuck: boolean;
}

export function runAutopilot(
  state: GameState,
  maxActions = 8000,
): AutopilotResult {
  let actions = 0;
  let idleStreak = 0;
  let lastPos = `${state.player.x},${state.player.y},${state.sectorIndex}`;

  while (state.status === 'playing' && actions < maxActions) {
    const action = chooseAction(state);
    if (!action) break;
    applyAction(state, action);
    actions++;

    const pos = `${state.player.x},${state.player.y},${state.sectorIndex},${state.objectives.beaconOpen},${state.objectives.hasRelayKey},${state.objectives.hasNavCore}`;
    if (pos === lastPos && action.type !== 'use' && action.type !== 'get') {
      idleStreak++;
    } else {
      idleStreak = 0;
      lastPos = pos;
    }

    if (idleStreak > 80) {
      return { state, actions, stuck: true };
    }
  }

  return { state, actions, stuck: state.status === 'playing' };
}
