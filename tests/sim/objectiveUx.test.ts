import { describe, expect, it } from 'vitest';
import { describeObjective } from '../../src/sim/objectives';
import { minimapGoalPos } from '../../src/game/views/MinimapView';
import { combatArena } from './fixtures';

describe('describeObjective now vs later', () => {
  it('on early sectors, local is the hatch and campaign says the Key is inland', () => {
    const st = combatArena();
    st.tutorialActive = false;
    st.sectorId = 'plains';
    st.objectives.hasRelayKey = false;
    const desc = describeObjective(st);
    expect(desc.local).toBe('OBJ-LOCAL-EXIT');
    expect(desc.campaign).toBe('OBJ-RELAYKEY');
  });

  it('on the wreck, campaign names getting the Key here', () => {
    const st = combatArena();
    st.tutorialActive = false;
    st.sectorId = 'ruin';
    st.objectives.hasRelayKey = false;
    expect(describeObjective(st).campaign).toBe('OBJ-RELAYKEY');
    expect(describeObjective(st).local).toBe('OBJ-LOCAL-KEY');
  });

  it('on the beacon without the Key, names the missing Key', () => {
    const st = combatArena();
    st.tutorialActive = false;
    st.sectorId = 'beacon';
    st.objectives.hasRelayKey = false;
    st.objectives.beaconOpen = false;
    expect(describeObjective(st).campaign).toBe('OBJ-RELAYKEY');
  });

  it('exposes the local goal cell once that tile is explored', () => {
    const st = combatArena();
    st.tutorialActive = false;
    st.sectorId = 'plains';
    const pos = describeObjective(st).pos;
    expect(pos).not.toBeNull();
    st.explored[pos!.y]![pos!.x] = true;
    expect(minimapGoalPos(st)).toEqual(pos);
    st.explored[pos!.y]![pos!.x] = false;
    st.visible[pos!.y]![pos!.x] = false;
    expect(minimapGoalPos(st)).toBeNull();
    st.player.mapperTurns = 40;
    expect(minimapGoalPos(st)).toEqual(pos);
  });
});
