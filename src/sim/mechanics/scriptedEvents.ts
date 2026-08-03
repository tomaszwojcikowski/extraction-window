import { pushLog } from '../combat';
import { addEmStress } from '../emStress';
import { spawnRelayAmbushNearStep, activeQuestStep } from '../roomQuest';
import type { GameState, Pos } from '../types';
import type { Mechanic } from './types';

function once(state: GameState, id: string): boolean {
  if (state.scriptedFired[id]) return false;
  state.scriptedFired[id] = true;
  return true;
}

function revealRoomPulse(state: GameState, room: { x: number; y: number; w: number; h: number }): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (state.explored[y]) state.explored[y]![x] = true;
    }
  }
}

function markQuestOnMap(state: GameState): void {
  const rq = state.roomQuest;
  if (!rq || rq.done) return;
  const step = activeQuestStep(rq);
  if (!step) return;
  if (state.explored[step.pos.y]) state.explored[step.pos.y]![step.pos.x] = true;
}

function shearPulse(state: GameState): void {
  pushLog(state, 'LOG-EVT-SHEAR');
  state.player.energy -= 1;
  const dirs: Pos[] = [
    { x: state.player.x + 1, y: state.player.y },
    { x: state.player.x - 1, y: state.player.y },
    { x: state.player.x, y: state.player.y + 1 },
    { x: state.player.x, y: state.player.y - 1 },
  ];
  for (const p of dirs) {
    const t = state.tiles[p.y]?.[p.x];
    if (t?.kind === 'floor' && state.rng() < 0.5) {
      state.tiles[p.y]![p.x] = { kind: 'vent', walkable: true, transparent: true };
    }
  }
}

/**
 * Sector scripted beats — logs, light FOV, EM, shear, quest ambush.
 */
export const scriptedEventsMechanic: Mechanic = {
  id: 'scripted_events',

  onSectorEnter(state: GameState): void {
    if (state.sectorId === 'plains' && once(state, 'plains_afterglow')) {
      pushLog(state, 'LOG-EVT-AFTERGLOW');
      addEmStress(state, 3, 'drop afterglow');
    }

    if ((state.sectorId === 'reef' || state.sectorId === 'ruin') && once(state, `survey_${state.sectorId}`)) {
      pushLog(state, 'LOG-EVT-SURVEY');
      if (state.roomQuest && !state.roomQuest.done) {
        markQuestOnMap(state);
        const step = activeQuestStep(state.roomQuest);
        if (step) revealRoomPulse(state, step.room);
      } else if (state.exitPos) {
        const midY = Math.floor(state.height / 2);
        const midX = Math.floor(state.width / 2);
        revealRoomPulse(state, { x: midX - 2, y: midY - 2, w: 5, h: 5 });
      }
    }

    if (state.sectorId === 'beacon' && once(state, 'beacon_lock_warn')) {
      pushLog(state, 'LOG-EVT-BEACON-TEACH');
    }

    if (state.sectorId === 'vault' && once(state, 'vault_pattern_hook')) {
      pushLog(state, 'LOG-EVT-PATTERN-HOOK');
    }

    if (state.sectorId === 'approach') {
      state.approachShearAcc = 0;
      if (once(state, 'approach_enter')) {
        pushLog(state, 'LOG-EVT-APPROACH');
      }
    }
  },

  onEndTurn(state: GameState): void {
    if (state.sectorId === 'approach') {
      state.approachShearAcc += 1;
      if (state.approachShearAcc >= 40) {
        state.approachShearAcc = 0;
        shearPulse(state);
      }
    }

    const rq = state.roomQuest;
    if (
      rq &&
      !rq.done &&
      rq.kind === 'relay_chain' &&
      rq.stepIndex === 1 &&
      rq.steps[0]?.done &&
      once(state, `relay_ambush_${state.sectorIndex}`)
    ) {
      const step = activeQuestStep(rq);
      if (step) spawnRelayAmbushNearStep(state, step.pos);
    }
  },
};

/** Mild pattern stress when Nav Core is first secured. */
export function onNavCoreAcquired(state: GameState): void {
  if (!once(state, 'core_pattern_seed')) return;
  // Lore beat only — do not force desync (keeps coolant for Type-9)
  pushLog(state, 'LOG-PB-STRESS');
}
