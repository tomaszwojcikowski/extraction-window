import { xpToNextForLevel } from '../data/progression';
import { getSector, type SectorId } from '../data/encounters';
import { PLAYER_BASE, STORM_TURNS } from '../campaign/spine';
import type { LoreId } from '../data/lore';
import { generateSectorMap } from '../map/generator';
import { generateTutorialMap } from '../map/tutorialMap';
import { mulberry32 } from './rng';
import type { GameState } from './types';
import { pushLog } from './log';
import { syncObjectiveFlags } from './inventory';
import { hasSkill } from './progression';
import { mechanicsOnSectorEnter } from './mechanics';
import { refreshVision } from './vision';
import { applyStormShelterOnSectorEntry } from './extractFavor';
const SECTOR_ENTRY_LOG: Partial<Record<SectorId, LoreId>> = {
  plains: 'LOG-SEC-PLAINS',
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

export type CreateGameOpts = {
  /** Default true — harness / tests / autopilot skip the drill bay. */
  skipTutorial?: boolean;
};

export function createGame(seed: number, opts?: CreateGameOpts): GameState {
  const skipTutorial = opts?.skipTutorial ?? true;
  const tutorialActive = !skipTutorial;
  const rng = mulberry32(seed >>> 0);
  const sector = getSector(0);
  const map = tutorialActive
    ? generateTutorialMap(seed)
    : generateSectorMap(sector, seed, 0);

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
    tutorialActive,
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
      braceTurns: 0,
      statuses: {},
      equip: { tool: null, armor: null, utility: null },
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
    npcs: map.npcs,
    allies: [],
    items: map.items,
    exitPos: map.exit,
    shuttlePos: map.shuttlePos,
    beaconPos: map.beaconPos,
    poiPos: map.poiPos,
    poiKind: map.poiKind,
    poiUsed: false,
    roomQuest: map.roomQuest,
    rooms: map.rooms.map((r) => ({ ...r })),
    surveyedRoomIds: [],
    noticedNpcIds: [],
    noticedBrandIds: [],
    illumination: Array.from({ length: map.height }, () =>
      Array.from({ length: map.width }, () => 0),
    ),
    lightSources: [],
    contamination: [],
    codexPages: 0,
    codexLog: [],
    emStress: 0,
    emHighStreak: 0,
    scanScars: [],
    doctrineQuiet: 0,
    doctrineProbe: 0,
    handshake: null,
    extractFavor: null,
    uplink: null,
    patternDesync: 0,
    scriptedFired: {},
    approachShearAcc: 0,
    ionFrontTurns: 0,
    ionFrontDampened: false,
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

  refreshVision(state);
  if (!tutorialActive) {
    pushLog(state, 'LOG-DROP');
    pushLog(state, 'LOG-SEC-PLAINS');
  }
  syncObjectiveFlags(state);
  mechanicsOnSectorEnter(state);
  refreshVision(state);
  return state;
}

/** Leave drill bay into real plains — no XP_SECTOR; afterglow fires on loadSector. */
export function finishTutorial(state: GameState): void {
  if (!state.tutorialActive) return;
  state.tutorialActive = false;
  state.stormTurns += 2;
  loadSector(state, 0);
  pushLog(state, 'LOG-TUT-DONE');
  refreshVision(state);
}

export function loadSector(state: GameState, sectorIndex: number): void {
  const sector = getSector(sectorIndex);
  const map = generateSectorMap(sector, state.seed, sectorIndex, {
    beaconAlreadyOpen: state.objectives.beaconOpen,
    playerLevel: state.level,
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
  state.npcs = map.npcs;
  state.allies = [];
  state.items = map.items;
  state.exitPos = map.exit;
  state.shuttlePos = map.shuttlePos;
  state.beaconPos = map.beaconPos;
  state.poiPos = map.poiPos;
  state.poiKind = map.poiKind;
  state.poiUsed = false;
  state.roomQuest = map.roomQuest;
  state.rooms = map.rooms.map((r) => ({ ...r }));
  state.surveyedRoomIds = [];
  state.lightSources = [];
  state.contamination = [];
  state.illumination = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => 0),
  );
  state.lootTakenThisSector = false;
  state.handshake = null;
  state.uplink = null;
  state.approachShearAcc = 0;
  state.ionFrontTurns = 0;
  state.ionFrontDampened = false;
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

  refreshVision(state);
  if (sectorIndex > 0 && hasSkill(state, 'triage')) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 6);
  }
  applyStormShelterOnSectorEntry(state);
  pushLog(state, 'LOG-SECTOR');
  const entry = SECTOR_ENTRY_LOG[sector.id];
  if (entry) pushLog(state, entry);
  mechanicsOnSectorEnter(state);
  refreshVision(state);
}
