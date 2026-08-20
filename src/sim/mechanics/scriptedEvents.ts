import { activeQuestStep } from '../roomQuest';
import { questBriefLogId } from './roomQuestMechanic';
import { pushLog } from '../log';
import { addEmStress } from '../emStress';
import type { GameState } from '../types';
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

/** Soft dual-clock tax on approach — no floor→vent ring (gimmick noise). */
function shearPulse(state: GameState): void {
  pushLog(state, 'LOG-EVT-SHEAR');
  state.player.energy -= 1;
}

/**
 * Sector scripted beats — prior-crew conflict + pillar-teaching pulses.
 *
 * Kept: drop EM afterglow, quest-room reveal, approach storm pressure,
 * elite contact tell, and the legacy relay ambush for deferred relay-chain saves.
 * Removed texture-only sector pulses and non-quest mapper reveals.
 */
export const scriptedEventsMechanic: Mechanic = {
  id: 'scripted_events',

  onSectorEnter(state: GameState): void {
    if (state.sectorId === 'plains' && !state.tutorialActive && once(state, 'plains_afterglow')) {
      pushLog(state, 'LOG-EVT-AFTERGLOW');
      addEmStress(state, 3, 'drop afterglow');
    }

    // Sector-enter pulse for the active quest step room on all biomes
    if (state.roomQuest && !state.roomQuest.done && once(state, `quest_pulse_${state.sectorIndex}`)) {
      markQuestOnMap(state);
      const step = activeQuestStep(state.roomQuest);
      if (step) revealRoomPulse(state, step.room);
      pushLog(state, questBriefLogId(state.roomQuest.kind));
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

    // Elite contact tell when first seen
    for (const en of state.enemies) {
      if (!en.alive || en.tier !== 'elite') continue;
      if (!state.visible[en.y]?.[en.x]) continue;
      if (once(state, `elite_contact_${state.sectorIndex}_${en.id}`)) {
        pushLog(state, 'LOG-ELITE-CONTACT');
      }
    }
  },
};
