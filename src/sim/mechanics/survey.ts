import {
  EXPLORE_BONUS_THRESHOLD,
  STORM_ROOM_SURVEY,
  STORM_SECTOR_SURVEY,
  SURVEY_ROOM_CAP,
  XP_ROOM_SURVEY,
  XP_SECTOR_SURVEY,
} from '../../data/progression';
import { pushLog } from '../log';
import { gainXp } from '../progression';
import { randInt } from '../rng';
import type { GameState } from '../types';
import type { Mechanic } from './types';

function roomContains(room: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
  return x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h;
}

/** First entry into an unsurveyed mid-room → XP + storm (capped per sector). */
export function trySurveyRoom(state: GameState): void {
  if (state.surveyedRoomIds.length >= SURVEY_ROOM_CAP) return;
  if (state.rooms.length < 3) return;

  const mid = state.rooms.slice(1, -1);
  for (let i = 0; i < mid.length; i++) {
    const room = mid[i]!;
    const roomId = i + 1; // stable mid-room index within sector
    if (state.surveyedRoomIds.includes(roomId)) continue;
    if (!roomContains(room, state.player.x, state.player.y)) continue;
    state.surveyedRoomIds.push(roomId);
    const storm = randInt(state.rng, STORM_ROOM_SURVEY[0], STORM_ROOM_SURVEY[1]);
    state.stormTurns += storm;
    gainXp(state, XP_ROOM_SURVEY, 'survey');
    pushLog(state, 'LOG-SURVEY-ROOM', `+${storm}`);
    return;
  }
}

export function exploredFloorRatio(state: GameState): number {
  let floors = 0;
  let explored = 0;
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (!state.tiles[y]![x]!.walkable) continue;
      floors += 1;
      if (state.explored[y]![x]) explored += 1;
    }
  }
  if (floors <= 0) return 0;
  return explored / floors;
}

/** Hatch bonus when enough of the sector floor was explored. */
export function grantSectorSurveyBonus(state: GameState): void {
  if (exploredFloorRatio(state) < EXPLORE_BONUS_THRESHOLD) return;
  const storm = randInt(state.rng, STORM_SECTOR_SURVEY[0], STORM_SECTOR_SURVEY[1]);
  state.stormTurns += storm;
  gainXp(state, XP_SECTOR_SURVEY, 'survey_sector');
  pushLog(state, 'LOG-SURVEY-SECTOR', `+${storm}`);
}

export const surveyMechanic: Mechanic = {
  id: 'survey',
  onEndTurn(state: GameState): void {
    trySurveyRoom(state);
  },
};
