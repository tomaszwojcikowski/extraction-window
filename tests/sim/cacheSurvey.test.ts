import { describe, expect, it } from 'vitest';
import {
  cacheRoomList,
  markCacheRoomLooted,
  nearestUnlootedCache,
  roomAt,
} from '../../src/sim/cacheSurvey';
import { combatArena } from './fixtures';

describe('cacheSurvey', () => {
  it('finds cache rooms and tracks looted state', () => {
    const st = combatArena();
    st.rooms.push({
      x: 10,
      y: 10,
      w: 3,
      h: 3,
      cx: 11,
      cy: 11,
      role: 'cache',
    });
    const caches = cacheRoomList(st);
    expect(caches.length).toBeGreaterThanOrEqual(1);
    const cache = caches[0]!;
    expect(roomAt(st, cache.cx, cache.cy)).toBe(cache);
    st.explored[cache.cy]![cache.cx] = true;
    expect(nearestUnlootedCache(st)).toBe(cache);
    markCacheRoomLooted(st, cache);
    expect(cache.cacheLooted).toBe(true);
    expect(nearestUnlootedCache(st)).toBeNull();
  });
});
