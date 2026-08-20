import type { GameState, MapRoom, Pos } from './types';
import { XP_ROOM_QUEST } from '../data/progression';
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

export function markCacheRoomLooted(state: GameState, room: MapRoom): void {
  if (room.cacheLooted) return;
  room.cacheLooted = true;
  const caches = cacheRoomList(state);
  const looted = caches.filter((r) => r.cacheLooted).length;
  if (caches.length > 0 && looted === caches.length) {
    pushLog(state, 'LOG-CACHE-CLEAR');
    gainXp(state, Math.floor(XP_ROOM_QUEST / 2), 'quest');
  }
}

/** Nearest explored cache room not yet looted — for mapper ping. */
export function nearestUnlootedCache(state: GameState): MapRoom | null {
  let best: MapRoom | null = null;
  let bestD = Infinity;
  for (const r of cacheRoomList(state)) {
    if (r.cacheLooted) continue;
    if (!state.explored[r.cy]?.[r.cx]) continue;
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
