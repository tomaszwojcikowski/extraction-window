import type { GameState, MapRoom, Pos } from './types';
import {
  CACHE_POWER_SIP,
  QUIET_POWER_SIP,
  XP_CACHE,
  XP_ROOM_QUEST,
} from '../data/progression';
import { pushLog } from './log';
import { gainXp } from './progression';

export function cacheRoomList(state: GameState): MapRoom[] {
  return (state.rooms ?? []).filter((r) => r.role === 'cache');
}

export function roomAt(state: GameState, x: number, y: number): MapRoom | null {
  const rooms = state.rooms ?? [];
  for (const r of rooms) {
    if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r;
  }
  return null;
}

/**
 * First loot in a cache pays XP + Power so the alcove detour is not pure drip.
 * Clearing every cache still logs a sector bonus (smaller XP).
 */
export function markCacheRoomLooted(state: GameState, room: MapRoom): void {
  if (room.cacheLooted) return;
  room.cacheLooted = true;
  state.player.energy = Math.min(
    state.player.maxEnergy,
    state.player.energy + CACHE_POWER_SIP,
  );
  pushLog(state, 'LOG-CACHE-FIND', `+${CACHE_POWER_SIP} Power`);
  gainXp(state, XP_CACHE, 'quest');
  const caches = cacheRoomList(state);
  const looted = caches.filter((r) => r.cacheLooted).length;
  if (caches.length > 0 && looted === caches.length) {
    pushLog(state, 'LOG-CACHE-CLEAR');
    gainXp(state, Math.floor(XP_ROOM_QUEST / 2), 'quest');
  }
}

/** Nearest unlooted cache — fog OK so Nav Ping can find side loot. */
export function nearestUnlootedCache(state: GameState): MapRoom | null {
  let best: MapRoom | null = null;
  let bestD = Infinity;
  for (const r of cacheRoomList(state)) {
    if (r.cacheLooted) continue;
    const d = Math.abs(r.cx - state.player.x) + Math.abs(r.cy - state.player.y);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

export function cacheCenter(room: MapRoom): Pos {
  return { x: room.cx, y: room.cy };
}

/** First step into a quiet room refunds a little Power — off-spine is not empty. */
export function rewardQuietDiscovery(state: GameState): void {
  if (state.tutorialActive) return;
  const room = roomAt(state, state.player.x, state.player.y);
  if (!room || room.role !== 'quiet' || room.quietSiphoned) return;
  room.quietSiphoned = true;
  state.player.energy = Math.min(
    state.player.maxEnergy,
    state.player.energy + QUIET_POWER_SIP,
  );
  pushLog(state, 'LOG-QUIET-FIND', `+${QUIET_POWER_SIP} Power`);
}
