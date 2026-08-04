import {
  applyAction,
  bfsPath,
  currentObjectivePos,
  hasItem,
  mechanicsAutopilotHint,
  type Action,
  type GameState,
} from '../sim';
import { INVENTORY_SLOTS } from '../data/items';
import { EM_HIGH } from '../sim/emStress';
import { inShadow, isLit } from '../sim/light';

function dartAim(
  state: GameState,
  en: { x: number; y: number },
): { dx: number; dy: number } | null {
  const dx = en.x - state.player.x;
  const dy = en.y - state.player.y;
  const d = Math.max(Math.abs(dx), Math.abs(dy));
  if (d < 1 || d > 3) return null;
  if (!state.visible[en.y]?.[en.x]) return null;
  if (!isLit(state, en.x, en.y)) return null;
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

function randomStep(state: GameState): Action {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const { x, y } = state.player;
  const shuffled = dirs.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  for (const [dx, dy] of shuffled) {
    const nx = x + dx!;
    const ny = y + dy!;
    if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
    if (!state.tiles[ny]![nx]!.walkable) continue;
    if (state.enemies.some((e) => e.alive && e.x === nx && e.y === ny)) continue;
    return { type: 'move', dx: dx!, dy: dy! };
  }
  return { type: 'wait' };
}

/**
 * Headless autopilot: path to objectives, fight blockers, heal when low,
 * use tactical tools, key/core interactions, exit sectors.
 */
export function chooseAction(state: GameState): Action | null {
  if (state.status !== 'playing') return null;

  // Talent fork — prefer survival skills for suite stability
  if (state.skillPick && state.skillPick.length > 0) {
    const prefer = ['triage', 'ion_skin', 'deep_reserve'] as const;
    for (const id of prefer) {
      if (state.skillPick.includes(id)) return { type: 'pick_skill', id };
    }
    return { type: 'pick_skill', id: state.skillPick[0]! };
  }

  const mechanicHint = mechanicsAutopilotHint(state);
  if (mechanicHint) return mechanicHint;

  // Finish dart aim if already aiming; cancel if target gone (avoid idle wait loop)
  if (state.ui.aimingDart) {
    const target = nearestDartTarget(state);
    if (target) {
      return { type: 'aim', dx: target.dx, dy: target.dy };
    }
    state.ui.aimingDart = false;
  }

  // Heal / recharge aggressively
  if (state.player.hp <= state.player.maxHp * 0.65) {
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
  if (state.emStress >= 65) {
    const coolIdx = state.inventory.findIndex((s) => s.kind === 'coolant');
    if (coolIdx >= 0) {
      state.ui.selectedSlot = coolIdx;
      return { type: 'use' };
    }
  }
  // Identify unknown salvage when kit has space and not in combat crisis
  if (state.player.hp > state.player.maxHp * 0.55 && state.emStress < 50) {
    const sIdx = state.inventory.findIndex((s) => s.kind === 'salvage');
    if (sIdx >= 0 && state.inventory.length < INVENTORY_SLOTS - 1) {
      state.ui.selectedSlot = sIdx;
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

  // Jammer: mites/wasps nearby, or EM-HIGH (quiet suppresses contamination aggro bump)
  if (state.player.jammerTurns <= 0) {
    const emCritical = state.emStress >= EM_HIGH;
    const noisyNear = state.enemies.some(
      (e) =>
        e.alive &&
        (e.kind === 'mite' || e.kind === 'wasp') &&
        Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y) <= 4,
    );
    if (emCritical || noisyNear) {
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

  // Flare when adjacent hostiles, or standing dark with hostiles nearby
  const adjHostile = state.enemies.some(
    (e) =>
      e.alive && Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y) === 1,
  );
  const nearHostile = state.enemies.some(
    (e) =>
      e.alive && Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y) <= 3,
  );
  const playerDark = inShadow(state, state.player.x, state.player.y);
  if (
    (adjHostile && state.player.hp <= state.player.maxHp * 0.7) ||
    (playerDark && nearHostile)
  ) {
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
  const batonIdx = state.inventory.findIndex((s) => s.kind === 'pulse_baton');
  if (batonIdx >= 0 && state.player.equip.tool !== 'pulse_baton') {
    state.ui.selectedSlot = batonIdx;
    return { type: 'use' };
  }
  const bladeIdx = state.inventory.findIndex((s) => s.kind === 'blade');
  if (bladeIdx >= 0 && !state.player.equip.tool) {
    state.ui.selectedSlot = bladeIdx;
    return { type: 'use' };
  }
  const vestIdx = state.inventory.findIndex((s) => s.kind === 'ablative_vest');
  if (vestIdx >= 0 && state.player.equip.armor !== 'ablative_vest') {
    if (
      state.player.equip.armor !== 'harness' ||
      state.player.hp < state.player.maxHp * 0.7
    ) {
      state.ui.selectedSlot = vestIdx;
      return { type: 'use' };
    }
  }
  const harnessIdx = state.inventory.findIndex((s) => s.kind === 'harness');
  if (harnessIdx >= 0 && !state.player.equip.armor) {
    state.ui.selectedSlot = harnessIdx;
    return { type: 'use' };
  }
  if (state.player.energy <= state.player.maxEnergy * 0.45) {
    const coupIdx = state.inventory.findIndex((s) => s.kind === 'eps_coupler');
    if (coupIdx >= 0 && state.player.equip.utility !== 'eps_coupler') {
      state.ui.selectedSlot = coupIdx;
      return { type: 'use' };
    }
  }
  const sensIdx = state.inventory.findIndex((s) => s.kind === 'sensor_rig');
  if (sensIdx >= 0 && !state.player.equip.utility) {
    state.ui.selectedSlot = sensIdx;
    return { type: 'use' };
  }

  const { x, y } = state.player;
  const tile = state.tiles[y]![x]!;

  // Decorative / safe POI only — skip optional room quests (campaign spine for suite WR)
  if (
    tile.kind === 'poi' &&
    !state.poiUsed &&
    (state.poiKind === 'console' || state.poiKind === 'cache_scar')
  ) {
    return { type: 'exit' };
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

  // Always recover quest items underfoot (pathing targets them but old code skipped get)
  const here = state.items.find((i) => i.x === x && i.y === y);
  if (here) {
    if (here.kind === 'relay_key' || here.kind === 'nav_core') {
      return { type: 'get' };
    }
    if (state.inventory.length < INVENTORY_SLOTS) return { type: 'get' };
  }

  const goal = currentObjectivePos(state);
  if (!goal) return randomStep(state);

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

  const blockedElites = (bx: number, by: number) => {
    if (state.npcs.some((n) => n.x === bx && n.y === by)) return true;
    const en = state.enemies.find((e) => e.alive && e.x === bx && e.y === by);
    if (!en) return false;
    if ((en.tier === 'elite' || en.tier === 'boss') && state.player.hp < state.player.maxHp * 0.75) {
      return true;
    }
    return false;
  };

  const path = bfsPath(state.tiles, { x, y }, goal, blockedElites);
  if (path && path[0]) {
    return { type: 'move', dx: path[0].x - x, dy: path[0].y - y };
  }

  // Retry without elite avoidance — better to fight than thrash forever (NPCs still block)
  const blockedNpcs = (bx: number, by: number) =>
    state.npcs.some((n) => n.x === bx && n.y === by);
  const direct = bfsPath(state.tiles, { x, y }, goal, blockedNpcs);
  if (direct && direct[0]) {
    return { type: 'move', dx: direct[0].x - x, dy: direct[0].y - y };
  }

  if (state.exitPos && !(goal.x === state.exitPos.x && goal.y === state.exitPos.y)) {
    const alt = bfsPath(state.tiles, { x, y }, state.exitPos, blockedElites);
    if (alt && alt[0]) {
      return { type: 'move', dx: alt[0].x - x, dy: alt[0].y - y };
    }
  }

  return randomStep(state);
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
    const inMelee = state.enemies.some(
      (e) =>
        e.alive &&
        Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y) === 1,
    );
    if (
      pos === lastPos &&
      !inMelee &&
      action.type !== 'use' &&
      action.type !== 'get' &&
      action.type !== 'aim' &&
      action.type !== 'exit'
    ) {
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
