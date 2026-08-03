import {
  applyAction,
  bfsPath,
  currentObjectivePos,
  hasItem,
  type Action,
  type GameState,
} from '../sim';
import { INVENTORY_SLOTS } from '../data/items';

function dartAim(
  state: GameState,
  en: { x: number; y: number },
): { dx: number; dy: number } | null {
  const dx = en.x - state.player.x;
  const dy = en.y - state.player.y;
  const d = Math.max(Math.abs(dx), Math.abs(dy));
  if (d < 1 || d > 3) return null;
  if (!state.visible[en.y]?.[en.x]) return null;
  // Must lie on a cardinal or diagonal ray
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;
  return { dx: Math.sign(dx), dy: Math.sign(dy) };
}

function nearestDartTarget(state: GameState) {
  let best: { x: number; y: number; d: number; dx: number; dy: number } | null = null;
  for (const en of state.enemies) {
    if (!en.alive) continue;
    const aim = dartAim(state, en);
    if (!aim) continue;
    const d = Math.max(Math.abs(en.x - state.player.x), Math.abs(en.y - state.player.y));
    if (!best || d < best.d) best = { x: en.x, y: en.y, d, ...aim };
  }
  return best;
}

/**
 * Headless autopilot: path to objectives, fight blockers, heal when low,
 * use tactical tools, key/core interactions, exit sectors.
 */
export function chooseAction(state: GameState): Action | null {
  if (state.status !== 'playing') return null;

  // Finish dart aim if already aiming
  if (state.ui.aimingDart) {
    const target = nearestDartTarget(state);
    if (target) {
      return { type: 'aim', dx: target.dx, dy: target.dy };
    }
    return { type: 'wait' };
  }

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
  if (state.player.energy <= state.player.maxEnergy * 0.65) {
    const batIdx = state.inventory.findIndex((s) => s.kind === 'battery' || s.kind === 'coolant');
    const coolIdx = state.inventory.findIndex((s) => s.kind === 'coolant');
    const enIdx = state.inventory.findIndex((s) => s.kind === 'energy');
    const rationIdx = state.inventory.findIndex((s) => s.kind === 'ration');
    const idx =
      coolIdx >= 0 ? coolIdx : batIdx >= 0 ? batIdx : enIdx >= 0 ? enIdx : rationIdx;
    if (idx >= 0) {
      state.ui.selectedSlot = idx;
      return { type: 'use' };
    }
  }
  if (state.player.statuses.bleed && state.player.statuses.bleed > 0) {
    const pIdx = state.inventory.findIndex((s) => s.kind === 'patch');
    if (pIdx >= 0) {
      state.ui.selectedSlot = pIdx;
      return { type: 'use' };
    }
  }
  if (
    (state.sectorId === 'ash' || state.sectorId === 'brine' || state.sectorId === 'fissure') &&
    state.player.filterTurns <= 0
  ) {
    const fIdx = state.inventory.findIndex((s) => s.kind === 'filter');
    if (fIdx >= 0) {
      state.ui.selectedSlot = fIdx;
      return { type: 'use' };
    }
  }

  // Sealant when standing on hazard/vent
  const underfoot = state.tiles[state.player.y]![state.player.x]!;
  if (underfoot.kind === 'hazard' || underfoot.kind === 'vent') {
    const sIdx = state.inventory.findIndex((s) => s.kind === 'sealant');
    if (sIdx >= 0) {
      state.ui.selectedSlot = sIdx;
      return { type: 'use' };
    }
  }

  // Jammer when mites/wasps nearby and not already jamming
  if (state.player.jammerTurns <= 0) {
    const noisyNear = state.enemies.some(
      (e) =>
        e.alive &&
        (e.kind === 'mite' || e.kind === 'wasp') &&
        Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y) <= 4,
    );
    if (noisyNear) {
      const jIdx = state.inventory.findIndex((s) => s.kind === 'jammer');
      if (jIdx >= 0) {
        state.ui.selectedSlot = jIdx;
        return { type: 'use' };
      }
    }
  }

  // Dart when mid HP and a FOV threat on a valid ray
  if (
    state.player.hp <= state.player.maxHp * 0.75 &&
    state.player.hp > state.player.maxHp * 0.35
  ) {
    const dartIdx = state.inventory.findIndex((s) => s.kind === 'dart');
    if (dartIdx >= 0 && nearestDartTarget(state)) {
      state.ui.selectedSlot = dartIdx;
      return { type: 'use' };
    }
  }

  // Flare when adjacent hostiles
  const adjHostile = state.enemies.some(
    (e) =>
      e.alive && Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y) === 1,
  );
  if (adjHostile && state.player.hp <= state.player.maxHp * 0.7) {
    const fIdx = state.inventory.findIndex((s) => s.kind === 'flare');
    if (fIdx >= 0) {
      state.ui.selectedSlot = fIdx;
      return { type: 'use' };
    }
  }

  // Repair armor when pool is low
  if (state.player.armor < state.player.maxArmor * 0.65) {
    const pIdx = state.inventory.findIndex((s) => s.kind === 'plate');
    if (pIdx >= 0) {
      state.ui.selectedSlot = pIdx;
      return { type: 'use' };
    }
  }

  // Buff before likely fights in late sectors
  if (state.sectorIndex >= 4 && state.player.probeTurns <= 0 && state.player.stimTurns <= 0) {
    const stimIdx = state.inventory.findIndex((s) => s.kind === 'stim');
    const probeIdx = state.inventory.findIndex((s) => s.kind === 'probe');
    const idx = stimIdx >= 0 ? stimIdx : probeIdx;
    if (idx >= 0 && state.player.hp > state.player.maxHp * 0.5) {
      state.ui.selectedSlot = idx;
      return { type: 'use' };
    }
  }
  const harnessIdx = state.inventory.findIndex((s) => s.kind === 'harness');
  if (harnessIdx >= 0 && state.player.equip.armor !== 'harness') {
    state.ui.selectedSlot = harnessIdx;
    return { type: 'use' };
  }
  const bladeIdx = state.inventory.findIndex((s) => s.kind === 'blade');
  if (bladeIdx >= 0 && state.player.equip.tool !== 'blade') {
    state.ui.selectedSlot = bladeIdx;
    return { type: 'use' };
  }

  const { x, y } = state.player;
  const tile = state.tiles[y]![x]!;

  // Safe POI / room quests (skip purge unless healthy; skip nest)
  if (tile.kind === 'poi') {
    const rq = state.roomQuest;
    if (rq && !rq.done && x === rq.pos.x && y === rq.pos.y) {
      if (rq.kind === 'purge' && (rq.stage < 2 || state.player.hp < state.player.maxHp * 0.6)) {
        // skip incomplete/dangerous purge
      } else if (rq.kind === 'stabilize') {
        const sIdx = state.inventory.findIndex((s) => s.kind === 'sealant' || s.kind === 'filter');
        if (sIdx >= 0) {
          state.ui.selectedSlot = sIdx;
          return { type: 'use' };
        }
      } else {
        return { type: 'exit' };
      }
    } else if (
      !state.poiUsed &&
      (state.poiKind === 'console' || state.poiKind === 'cache_scar')
    ) {
      return { type: 'exit' };
    }
  }

  // Path toward safe room quest when explored and storm comfortable
  if (
    state.roomQuest &&
    !state.roomQuest.done &&
    state.stormTurns > 200 &&
    state.roomQuest.kind !== 'purge' &&
    state.explored[state.roomQuest.pos.y]?.[state.roomQuest.pos.x]
  ) {
    const rq = state.roomQuest;
    if (x !== rq.pos.x || y !== rq.pos.y) {
      const blocked = (bx: number, by: number) =>
        state.enemies.some((e) => e.alive && e.x === bx && e.y === by);
      const path = bfsPath(state.tiles, { x, y }, rq.pos, blocked);
      if (path && path.length) {
        const step = path[0]!;
        const foe = state.enemies.find((e) => e.alive && e.x === step.x && e.y === step.y);
        if (foe) return { type: 'move', dx: step.x - x, dy: step.y - y };
        return { type: 'move', dx: step.x - x, dy: step.y - y };
      }
    }
  }

  // Mapper when exploring without clear path
  if (state.player.mapperTurns <= 0 && state.sectorIndex >= 2) {
    const mIdx = state.inventory.findIndex((s) => s.kind === 'mapper');
    if (mIdx >= 0 && state.player.energy > state.player.maxEnergy * 0.4) {
      state.ui.selectedSlot = mIdx;
      return { type: 'use' };
    }
  }

  // Interact when standing on special tiles
  if (tile.kind === 'beacon' && !state.objectives.beaconOpen && hasItem(state, 'relay_key')) {
    return { type: 'exit' };
  }
  if (tile.kind === 'shuttle' && hasItem(state, 'nav_core')) {
    return { type: 'exit' };
  }
  if (tile.kind === 'exit') {
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
    if (state.inventory.length < INVENTORY_SLOTS) return { type: 'get' };
  }

  const goal = currentObjectivePos(state);
  if (!goal) return { type: 'wait' };

  if (
    state.beaconPos &&
    goal.x === state.beaconPos.x &&
    goal.y === state.beaconPos.y &&
    x === goal.x &&
    y === goal.y
  ) {
    return { type: 'exit' };
  }

  if (
    state.shuttlePos &&
    x === state.shuttlePos.x &&
    y === state.shuttlePos.y
  ) {
    return { type: 'exit' };
  }

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

  const blocked = (_bx: number, _by: number) => false;

  const path = bfsPath(state.tiles, { x, y }, goal, blocked);
  if (!path || path.length === 0) {
    if (state.exitPos && !(goal.x === state.exitPos.x && goal.y === state.exitPos.y)) {
      const alt = bfsPath(state.tiles, { x, y }, state.exitPos, blocked);
      if (alt && alt[0]) {
        return { type: 'move', dx: alt[0].x - x, dy: alt[0].y - y };
      }
    }
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
    if (pos === lastPos && action.type !== 'use' && action.type !== 'get' && action.type !== 'aim') {
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
