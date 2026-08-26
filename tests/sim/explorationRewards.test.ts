import { describe, expect, it } from 'vitest';
import { createGame, applyAction } from '../../src/sim';
import {
  CACHE_POWER_SIP,
  QUIET_POWER_SIP,
  XP_CACHE,
  XP_ROOM_QUEST,
  XP_SEALED,
} from '../../src/data/progression';
import { markCacheRoomLooted, rewardQuietDiscovery } from '../../src/sim/cacheSurvey';
import { openSealedTile } from '../../src/sim/mechanics/sealedHatch';
import { getSector } from '../../src/data/encounters';
import { generateSectorMap } from '../../src/map/generator';

function gameWithRole(role: 'cache' | 'quiet', seed = 42) {
  for (let s = seed; s < seed + 40; s++) {
    const st = createGame(s);
    st.tutorialActive = false;
    const room = st.rooms.find((r) => r.role === role);
    if (room) return { st, room };
  }
  throw new Error(`no ${role} room in seeds`);
}

describe('exploration rewards', () => {
  it('pays XP and Power on first cache loot', () => {
    const { st, room } = gameWithRole('cache');
    const energyBefore = st.player.energy;
    const xpBefore = st.xp;
    const cacheCount = st.rooms.filter((r) => r.role === 'cache').length;
    markCacheRoomLooted(st, room);
    expect(st.player.energy).toBe(Math.min(st.player.maxEnergy, energyBefore + CACHE_POWER_SIP));
    const expectedXp = XP_CACHE + (cacheCount === 1 ? Math.floor(XP_ROOM_QUEST / 2) : 0);
    expect(st.xp).toBe(xpBefore + expectedXp);
    expect(room.cacheLooted).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-CACHE-FIND')).toBe(true);
    markCacheRoomLooted(st, room);
    expect(st.xp).toBe(xpBefore + expectedXp);
  });

  it('sips Power on first quiet-room step', () => {
    const { st, room } = gameWithRole('quiet');
    st.player.x = room.cx;
    st.player.y = room.cy;
    const energyBefore = st.player.energy;
    rewardQuietDiscovery(st);
    expect(room.quietSiphoned).toBe(true);
    expect(st.player.energy).toBe(Math.min(st.player.maxEnergy, energyBefore + QUIET_POWER_SIP));
    expect(st.log.some((l) => l.loreId === 'LOG-QUIET-FIND')).toBe(true);
    rewardQuietDiscovery(st);
    expect(st.player.energy).toBe(Math.min(st.player.maxEnergy, energyBefore + QUIET_POWER_SIP));
  });

  it('always pays kit and XP when opening a sealed hatch', () => {
    const st = createGame(7);
    st.tutorialActive = false;
    st.sectorIndex = 2;
    const sx = Math.min(st.width - 2, st.player.x + 1);
    const sy = st.player.y;
    st.tiles[sy]![sx] = { kind: 'sealed', walkable: false, transparent: true };
    const xpBefore = st.xp;
    const groundBefore = st.items.length;
    const invBefore = st.inventory.reduce((n, s) => n + s.count, 0);
    openSealedTile(st, sx, sy, 'sealant');
    expect(st.tiles[sy]![sx]!.kind).toBe('floor');
    expect(st.xp).toBe(xpBefore + XP_SEALED);
    const invAfter = st.inventory.reduce((n, s) => n + s.count, 0);
    expect(invAfter + (st.items.length - groundBefore)).toBeGreaterThan(invBefore);
    expect(st.log.some((l) => l.loreId === 'LOG-SEALED-CACHE')).toBe(true);
  });

  it('Nav Ping prefers an unlooted cache even through fog', () => {
    const { st, room } = gameWithRole('cache', 99);
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        st.explored[y]![x] = false;
        st.visible[y]![x] = false;
      }
    }
    st.inventory = [{ kind: 'mapper', count: 1 }];
    st.ui.selectedSlot = 0;
    applyAction(st, { type: 'use' });
    expect(st.mapperPing).toEqual({ x: room.cx, y: room.cy });
  });

  it('still places sealed hatches from canopy onward', () => {
    let found = 0;
    for (const seed of [1, 42, 99, 777, 12345]) {
      const map = generateSectorMap(getSector(2), seed, 2);
      if (map.tiles.flat().some((t) => t.kind === 'sealed')) found++;
    }
    expect(found).toBeGreaterThan(0);
  });
});
