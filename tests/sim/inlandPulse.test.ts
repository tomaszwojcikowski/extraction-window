import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { ionFrontChipLore, ionFrontMechanic, startIonFront } from '../../src/sim/mechanics/ionFront';
import { mechanicsOnEndTurn } from '../../src/sim/mechanics';
import { pickRoomQuestKind } from '../../src/sim/roomQuest';
import { fieldHudChips } from '../../src/game/presenters/FieldHud';
import { combatArena, makeEnemy } from './fixtures';

function inlandRoom(st: ReturnType<typeof combatArena>) {
  const x = st.player.x;
  const y = st.player.y;
  st.rooms = [
    {
      x: Math.max(0, x - 2),
      y: Math.max(0, y - 2),
      w: 5,
      h: 5,
      cx: x,
      cy: y,
      role: 'nest',
    },
  ];
}

describe('inland ion fronts', () => {
  it('always starts a front inland even when the roll would miss', () => {
    const st = combatArena();
    st.tutorialActive = false;
    st.sectorIndex = 7;
    st.sectorId = 'trench';
    st.rng = () => 0.99;
    st.ionFrontTurns = 0;
    ionFrontMechanic.onSectorEnter!(st);
    expect(st.ionFrontTurns).toBe(6);
    expect(st.log.some((e) => e.loreId === 'LOG-ION-FAULT')).toBe(true);
  });

  it('still rolls the 60% chance on the beacon', () => {
    const miss = combatArena();
    miss.tutorialActive = false;
    miss.sectorIndex = 6;
    miss.sectorId = 'beacon';
    miss.rng = () => 0.99;
    miss.ionFrontTurns = 0;
    ionFrontMechanic.onSectorEnter!(miss);
    expect(miss.ionFrontTurns).toBe(0);

    const hit = combatArena();
    hit.tutorialActive = false;
    hit.sectorIndex = 6;
    hit.sectorId = 'beacon';
    hit.rng = () => 0.1;
    hit.ionFrontTurns = 0;
    ionFrontMechanic.onSectorEnter!(hit);
    expect(hit.ionFrontTurns).toBe(6);
  });

  it('wakes fauna in the current trench room on a pulse', () => {
    const st = combatArena();
    inlandRoom(st);
    st.sectorId = 'trench';
    st.sectorIndex = 7;
    const crawler = makeEnemy({
      kind: 'crawler',
      x: st.player.x + 1,
      y: st.player.y,
      alerted: false,
    });
    st.enemies = [crawler];
    startIonFront(st);
    st.ionFrontTurns = 2;
    st.log = [];
    mechanicsOnEndTurn(st);
    expect(crawler.alerted).toBe(true);
    expect(st.log.some((e) => e.loreId === 'LOG-ION-WAKE-FAULT')).toBe(true);
  });

  it('adds a vent-surge EM tax and wakes duct drones near vents', () => {
    const st = combatArena();
    inlandRoom(st);
    st.sectorId = 'duct';
    st.sectorIndex = 8;
    st.tiles[st.player.y]![st.player.x + 1] = {
      kind: 'vent',
      walkable: true,
      transparent: true,
    };
    const drone = makeEnemy({
      kind: 'duct_drone',
      x: st.player.x,
      y: st.player.y + 1,
      alerted: false,
    });
    st.enemies = [drone];
    startIonFront(st);
    st.ionFrontTurns = 2;
    const em = st.emStress;
    mechanicsOnEndTurn(st);
    expect(st.emStress).toBe(em + 2);
    expect(drone.alerted).toBe(true);
    expect(st.log.some((e) => e.loreId === 'LOG-ION-WAKE-VENT')).toBe(true);
  });

  it('skips the brine wet extra tax when Mag Boots are worn', () => {
    const wet = combatArena();
    inlandRoom(wet);
    wet.sectorId = 'brine';
    wet.sectorIndex = 10;
    wet.tiles[wet.player.y]![wet.player.x] = {
      kind: 'hazard',
      walkable: true,
      transparent: true,
    };
    startIonFront(wet);
    wet.ionFrontTurns = 2;
    const energy = wet.player.energy;
    mechanicsOnEndTurn(wet);
    expect(wet.player.energy).toBe(energy - 2);

    const booted = combatArena();
    inlandRoom(booted);
    booted.sectorId = 'brine';
    booted.sectorIndex = 10;
    booted.tiles[booted.player.y]![booted.player.x] = {
      kind: 'hazard',
      walkable: true,
      transparent: true,
    };
    booted.player.equip.feet = 'mag_boots';
    startIonFront(booted);
    booted.ionFrontTurns = 2;
    const bootedEnergy = booted.player.energy;
    mechanicsOnEndTurn(booted);
    expect(booted.player.energy).toBe(bootedEnergy - 1);
  });

  it('lets a Filter stop the inland wake as well as the pulse', () => {
    const st = combatArena();
    inlandRoom(st);
    st.sectorId = 'ash';
    st.sectorIndex = 9;
    const wraith = makeEnemy({
      kind: 'wraith',
      x: st.player.x + 1,
      y: st.player.y,
      alerted: false,
    });
    st.enemies = [wraith];
    st.player.filterTurns = 4;
    startIonFront(st);
    st.ionFrontTurns = 2;
    mechanicsOnEndTurn(st);
    expect(wraith.alerted).toBe(false);
    expect(st.log.some((e) => e.loreId === 'LOG-ION-DAMPEN')).toBe(true);
  });

  it('names the inland chip after the local weather', () => {
    const st = combatArena();
    st.sectorId = 'trench';
    st.ionFrontTurns = 4;
    expect(ionFrontChipLore(st)).toBe('UI-ION-FAULT');
    expect(fieldHudChips(st).some((c) => c.label === `${lore('UI-ION-FAULT')} 4`)).toBe(true);
  });
});

describe('inland room-quest weights', () => {
  it('still only offers the three kinds, and inland bags start on the local ask', () => {
    expect(pickRoomQuestKind(() => 0, 'trench')).toBe('purge');
    expect(pickRoomQuestKind(() => 0, 'duct')).toBe('vent_seal');
    expect(pickRoomQuestKind(() => 0, 'plains')).toBe('salvage');
    for (const roll of [0, 0.34, 0.5, 0.99]) {
      expect(['salvage', 'purge', 'vent_seal']).toContain(pickRoomQuestKind(() => roll, 'brine'));
    }
  });
});
