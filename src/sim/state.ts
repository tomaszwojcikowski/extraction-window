import { xpToNextForLevel } from '../data/progression';
import { getSector, type SectorId } from '../data/encounters';
import { PLAYER_BASE, STORM_TURNS } from '../campaign/spine';
import type { LoreId } from '../data/lore';
import { generateSectorMap } from '../map/generator';
import { computeFov, playerFovRadius } from './fov';
import { mulberry32 } from './rng';
import type { GameState } from './types';
import { pushLog } from './combat';
import { syncObjectiveFlags } from './inventory';
import { hasSkill } from './progression';
import { mechanicsOnSectorEnter } from './mechanics';

const SECTOR_ENTRY_LOG: Partial<Record<SectorId, LoreId>> = {
  flood: 'LOG-SEC-FLOOD',
  canopy: 'LOG-SEC-CANOPY',
  reef: 'LOG-SEC-REEF',
  spire: 'LOG-SEC-SPIRE',
  ruin: 'LOG-SEC-RUIN',
  beacon: 'LOG-SEC-BEACON',
  trench: 'LOG-SEC-TRENCH',
  duct: 'LOG-SEC-DUCT',
  ash: 'LOG-SEC-ASH',
  brine: 'LOG-SEC-BRINE',
  vault: 'LOG-SEC-VAULT',
  fissure: 'LOG-SEC-FISSURE',
  approach: 'LOG-SEC-APPROACH',
  ridge: 'LOG-SEC-RIDGE',
};

export function createGame(seed: number): GameState {
  const rng = mulberry32(seed >>> 0);
  const sector = getSector(0);
  const map = generateSectorMap(sector, seed, 0);

  const explored = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => false),
  );
  const visible = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => false),
  );

  const state: GameState = {
    seed: seed >>> 0,
    rng,
    status: 'playing',
    loseReason: null,
    turn: 0,
    stormTurns: STORM_TURNS,
    sectorIndex: 0,
    sectorId: sector.id,
    width: map.width,
    height: map.height,
    tiles: map.tiles,
    explored,
    visible,
    player: {
      x: map.start.x,
      y: map.start.y,
      hp: PLAYER_BASE.hp,
      maxHp: PLAYER_BASE.maxHp,
      energy: PLAYER_BASE.energy,
      maxEnergy: PLAYER_BASE.maxEnergy,
      atk: PLAYER_BASE.atk,
      def: PLAYER_BASE.def,
      armor: PLAYER_BASE.armor,
      maxArmor: PLAYER_BASE.maxArmor,
      probeTurns: 0,
      stimTurns: 0,
      filterTurns: 0,
      jammerTurns: 0,
      lensTurns: 0,
      mapperTurns: 0,
      stabilizeTurns: 0,
      statuses: {},
      equip: { tool: null, armor: null },
    },
    inventory: [
      { kind: 'med', count: 4 },
      { kind: 'energy', count: 4 },
      { kind: 'coolant', count: 2 },
      { kind: 'ration', count: 1 },
      { kind: 'probe', count: 1 },
      { kind: 'stim', count: 1 },
      { kind: 'flare', count: 1 },
      { kind: 'plate', count: 2 },
      { kind: 'filter', count: 1 },
      { kind: 'patch', count: 1 },
      { kind: 'dart', count: 1 },
      { kind: 'jammer', count: 1 },
      { kind: 'sealant', count: 1 },
    ],
    enemies: map.enemies,
    items: map.items,
    exitPos: map.exit,
    shuttlePos: map.shuttlePos,
    beaconPos: map.beaconPos,
    poiPos: map.poiPos,
    poiKind: map.poiKind,
    poiUsed: false,
    roomQuest: map.roomQuest,
    codexPages: 0,
    codexLog: [],
    emStress: 0,
    handshake: null,
    patternDesync: 0,
    scriptedFired: {},
    approachShearAcc: 0,
    paddMods: {
      filterBonus: 0,
      fovBonus: 0,
      quietVault: false,
      brineSeal: false,
    },
    skillPick: null,
    level: 1,
    xp: 0,
    xpToNext: xpToNextForLevel(1),
    skills: [],
    lootTakenThisSector: false,
    objectives: {
      hasRelayKey: false,
      usedRelayKey: false,
      hasNavCore: false,
      beaconOpen: false,
    },
    log: [],
    ui: { inventoryOpen: false, selectedSlot: 0, aimingDart: false, questFlash: 0 },
    nextEntityId: map.nextEntityId,
    loreEvents: [],
  };

  computeFov(
    state.tiles,
    state.explored,
    state.visible,
    state.player.x,
    state.player.y,
    playerFovRadius(state.player.probeTurns, state.player.lensTurns) + state.paddMods.fovBonus,
  );
  pushLog(state, 'LOG-DROP');
  syncObjectiveFlags(state);
  mechanicsOnSectorEnter(state);
  return state;
}

export function loadSector(state: GameState, sectorIndex: number): void {
  const sector = getSector(sectorIndex);
  const map = generateSectorMap(sector, state.seed, sectorIndex, {
    beaconAlreadyOpen: state.objectives.beaconOpen,
  });

  state.sectorIndex = sectorIndex;
  state.sectorId = sector.id;
  state.width = map.width;
  state.height = map.height;
  state.tiles = map.tiles;
  state.explored = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => false),
  );
  state.visible = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => false),
  );
  state.player.x = map.start.x;
  state.player.y = map.start.y;
  state.enemies = map.enemies;
  state.items = map.items;
  state.exitPos = map.exit;
  state.shuttlePos = map.shuttlePos;
  state.beaconPos = map.beaconPos;
  state.poiPos = map.poiPos;
  state.poiKind = map.poiKind;
  state.poiUsed = false;
  state.roomQuest = map.roomQuest;
  state.lootTakenThisSector = false;
  state.handshake = null;
  state.approachShearAcc = 0;
  state.ui.aimingDart = false;
  state.ui.questFlash = 0;
  state.nextEntityId = Math.max(state.nextEntityId, map.nextEntityId);

  // If returning somehow to open beacon
  if (sector.isBeacon && state.objectives.beaconOpen && state.exitPos) {
    state.tiles[state.exitPos.y]![state.exitPos.x] = {
      kind: 'exit',
      walkable: true,
      transparent: true,
    };
  }

  computeFov(
    state.tiles,
    state.explored,
    state.visible,
    state.player.x,
    state.player.y,
    playerFovRadius(state.player.probeTurns, state.player.lensTurns) + state.paddMods.fovBonus,
  );
  if (sectorIndex > 0 && hasSkill(state, 'triage')) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 6);
  }
  pushLog(state, 'LOG-SECTOR');
  const entry = SECTOR_ENTRY_LOG[sector.id];
  if (entry) pushLog(state, entry);
  mechanicsOnSectorEnter(state);
}
