import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../../src/sim';
import { extractTrack } from '../../src/sim/objectives';
import { combatArena, lastLog } from './fixtures';

describe('extract Pays the Price', () => {
  it('handshake interrupt spends Window and raises EM', () => {
    const st = createGame(42);
    st.sectorId = 'beacon';
    st.beaconPos = { x: st.player.x, y: st.player.y };
    st.tiles[st.player.y]![st.player.x] = {
      kind: 'beacon',
      walkable: true,
      transparent: true,
    };
    st.inventory.push({ kind: 'relay_key', count: 1 });
    st.objectives.beaconOpen = false;
    applyAction(st, { type: 'exit' });
    expect(st.handshake?.active).toBe(true);
    const windowBefore = st.stormTurns;
    const emBefore = st.emStress;
    const nx = Math.min(st.width - 2, st.player.x + 1);
    if (st.tiles[st.player.y]![nx]!.walkable) {
      applyAction(st, { type: 'move', dx: nx - st.player.x, dy: 0 });
    } else {
      st.player.x = nx;
      applyAction(st, { type: 'wait' });
    }
    expect(st.handshake).toBeNull();
    expect(st.stormTurns).toBeLessThan(windowBefore);
    expect(st.emStress).toBeGreaterThan(emBefore);
    expect(lastLog(st, 'LOG-PAY-PRICE')).toBeTruthy();
  });

  it('pattern reject spends Window', () => {
    const st = createGame(42);
    st.sectorId = 'ridge';
    st.shuttlePos = { x: st.player.x, y: st.player.y };
    st.tiles[st.player.y]![st.player.x] = {
      kind: 'shuttle',
      walkable: true,
      transparent: true,
    };
    st.inventory.push({ kind: 'nav_core', count: 1 });
    st.objectives.hasNavCore = true;
    st.objectives.usedRelayKey = true;
    st.objectives.beaconOpen = true;
    st.patternDesync = 2;
    const windowBefore = st.stormTurns;
    applyAction(st, { type: 'exit' });
    expect(st.status).toBe('playing');
    expect(st.stormTurns).toBeLessThan(windowBefore);
    expect(lastLog(st, 'LOG-PB-REJECT')).toBeTruthy();
    expect(lastLog(st, 'LOG-PAY-PRICE')).toBeTruthy();
  });

  it('extract boxes fill from existing flags', () => {
    const st = combatArena();
    expect(extractTrack(st)).toEqual({
      key: false,
      handshake: false,
      lattice: false,
      pad: false,
    });
    st.objectives.hasRelayKey = true;
    st.objectives.beaconOpen = true;
    st.objectives.hasNavCore = true;
    expect(extractTrack(st).key).toBe(true);
    expect(extractTrack(st).handshake).toBe(true);
    expect(extractTrack(st).lattice).toBe(true);
    expect(extractTrack(st).pad).toBe(false);
  });
});
