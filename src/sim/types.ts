import type { EnemyKind, DamageType } from '../data/enemies';
export type { DamageType };
import type { ItemKind } from '../data/items';
import type { NpcKind, AllyKind } from '../data/npcs';
import type { SectorId } from '../data/encounters';
import type { SkillId } from '../data/progression';
import type { LoreId } from '../data/lore';
import type { Rng } from './rng';

export interface Pos {
  x: number;
  y: number;
}

export type TileKind =
  | 'wall'
  | 'floor'
  | 'hazard'
  | 'scrub'
  | 'rubble'
  | 'vent'
  | 'sealed'
  | 'tripwire'
  | 'brine_pool'
  | 'scrub_nest'
  | 'exit'
  | 'beacon'
  | 'shuttle'
  /** Purely decorative room centrepiece — no interaction. */
  | 'landmark'
  | 'quest';

export type EnemyTier = 'normal' | 'elite' | 'boss';

/** Ephemeral / world light emitters owned by the sim. */
export interface FieldLightSource {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  /** Turns remaining; omit for permanent. */
  life?: number;
  /** Presentation tint (optional). */
  color?: number;
  /** Permanent wall fixture — presentation draws a sconce on the mount cell. */
  fixture?: 'sconce';
  /**
   * Wall cell the fixture is bolted to. Emission (`x`,`y`) is the facing floor
   * so flood/bloom actually light the corridor; the sprite sits on the mount.
   */
  mountX?: number;
  mountY?: number;
}

/**
 * What a room is *for*.
 *
 * A room that is only a rectangle is a room the player has no opinion about.
 * The role is decided at generation time and then owns what goes in the room —
 * hostiles, loot, and ground — so that walking into one is a different event
 * from walking into the next.
 */
export type RoomRole =
  /** Where the surveyor put down. Never holds a threat. */
  | 'entry'
  /** A pack lives here, behind cover that hides how many. */
  | 'nest'
  /** The payout, with something in the way of it. */
  | 'cache'
  /** The ground is the threat; the fauna is incidental. */
  | 'hazard'
  /** One hostile holding a sightline across open floor. */
  | 'post'
  /** Growth too dense to see through — the threat is not knowing. */
  | 'thicket'
  /** Half-fallen: cover everywhere, and walls to put a shoulder into. */
  | 'collapse'
  /** Genuinely empty — what makes the rest of the sector read as loud. */
  | 'quiet'
  /** The way out. */
  | 'exit';

/** Room bounds from the sector map generator (survey / quest pulse). */
export interface MapRoom {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  role: RoomRole;
}

export interface Tile {
  kind: TileKind;
  walkable: boolean;
  transparent: boolean;
}

export interface InventorySlot {
  kind: ItemKind;
  count: number;
}

export type StatusId =
  | 'stun'
  | 'bleed'
  | 'ion_burn'
  | 'expose'
  | 'blind'
  | 'jam'
  | 'marked'
  | 'downed';

export type StatusMap = Partial<Record<StatusId, number>>;

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  alive: boolean;
  statuses: StatusMap;
  /** AI memory */
  alerted: boolean;
  swellTurns: number;
  homeX: number;
  homeY: number;
  skirmishRetreat: boolean;
  /** Turns remaining in telegraph windup (0 = ready) */
  windup: number;
  /** Telegraph type carried by the shared windup counter. */
  intent?: 'pounce' | 'reach' | 'zone' | 'beam' | 'overwatch';
  /** Enemy AI turns before the next beam can be prepared. */
  beamCooldown: number;
  /** Combat prize tier — elites/bosses grant storm + kit on kill */
  tier: EnemyTier;
}

export interface FieldNpc {
  id: number;
  kind: NpcKind;
  x: number;
  y: number;
  talked: boolean;
  /** Second hail can complete a soft agenda (optional). */
  agendaOpen?: boolean;
  agendaDone?: boolean;
}

export interface Ally {
  id: number;
  kind: AllyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  turnsLeft: number;
  alive: boolean;
  /** Cooldown on a companion's positional field intervention. */
  roleCooldown: number;
}

export interface GroundItem {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';
export type LoseReason = 'hp' | 'energy' | 'stuck' | null;

export interface LogEntry {
  loreId: LoreId;
  detail?: string;
  turn: number;
}

export interface ObjectiveFlags {
  hasRelayKey: boolean;
  usedRelayKey: boolean;
  hasNavCore: boolean;
  beaconOpen: boolean;
}

/**
 * Three quests, each billing a different resource: salvage costs Power/EM opportunity,
 * purge costs HP, vent_seal costs kit.
 */
export type RoomQuestKind = 'salvage' | 'purge' | 'vent_seal';

export interface QuestStep {
  id: string;
  pos: Pos;
  room: { x: number; y: number; w: number; h: number };
  done: boolean;
  /** Lore id for HUD step prompt */
  prompt: LoreId;
}

export interface RoomQuest {
  kind: RoomQuestKind;
  steps: QuestStep[];
  stepIndex: number;
  /**
   * Active step position — kept in sync with `steps[stepIndex]` for callers.
   * Prefer `activeQuestStep()` when reading multi-step state.
   */
  pos: Pos;
  room: { x: number; y: number; w: number; h: number };
  /** decode wait / purge stage / calibrate timer / relay phase counter */
  stage: number;
  done: boolean;
  spawnedIds: number[];
}

/** Beacon multi-turn authorization progress. */
export interface BeaconHandshake {
  /** Turns spent syncing on the beacon tile (need HANDSHAKE_TURNS). */
  progress: number;
  /** True once > was pressed with key on beacon. */
  active: boolean;
}

/** One optional room-quest payoff that changes the route to extraction. */
export type ExtractFavorKind = 'hazard_pass' | 'pattern_fail_safe';

export interface ExtractFavor {
  kind: ExtractFavorKind;
}

/** Final-pad launch sequence. Progress is counted at the end of each held turn. */
export interface ExtractionUplink {
  progress: number;
  active: boolean;
  accelerated: boolean;
  repelled: boolean;
}

export interface EquipSlots {
  tool: ItemKind | null;
  armor: ItemKind | null;
}

export interface GameState {
  seed: number;
  rng: Rng;
  status: GameStatus;
  loseReason: LoseReason;
  turn: number;
  /** Power hit 0 this run and has not been restored — next end-turn at 0 is death. */
  busFailing: boolean;
  sectorIndex: number;
  sectorId: SectorId;
  /** Pre-campaign drill bay — not a 16th sector; gates plains afterglow / storm tax. */
  tutorialActive: boolean;
  width: number;
  height: number;
  tiles: Tile[][];
  explored: boolean[][];
  visible: boolean[][];
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    atk: number;
    def: number;
    armor: number;
    maxArmor: number;
    probeTurns: number;
    stimTurns: number;
    filterTurns: number;
    mapperTurns: number;
    statuses: StatusMap;
    equip: EquipSlots;
  };
  inventory: InventorySlot[];
  enemies: Enemy[];
  npcs: FieldNpc[];
  allies: Ally[];
  items: GroundItem[];
  exitPos: Pos | null;
  shuttlePos: Pos | null;
  beaconPos: Pos | null;
  roomQuest: RoomQuest | null;
  /** Sector room layout for quest pulse (reset each sector). */
  rooms: MapRoom[];
  /** Field NPCs already logged as sighted this run. */
  noticedNpcIds: number[];
  /** Branded elite/boss contacts already identified this run. */
  noticedBrandIds: number[];
  /** Per-tile HDR illumination (ambient + emitters); rebuilt with FOV. */
  illumination: number[][];
  /** Ephemeral light emitters (flares, etc.). */
  lightSources: FieldLightSource[];
  /** Short-lived spore residue; costs bus power when occupied. */
  contamination: Array<Pos & { turns: number }>;
  codexPages: number;
  /** Collected CODEX-* lore ids for this run (Pages panel). */
  codexLog: LoreId[];
  /** EM contamination 0–100 (ADOM corruption-lite). */
  emStress: number;
  /** Turns before EM keep-calm can jam again. */
  keepCalmCooldown: number;
  /** Unknown salvage resolved into a known kit item this run. */
  salvageIdentified: number;
  /** Unknown salvage that bit back instead of resolving. */
  salvageBacklash: number;
  /** Beacon multi-turn handshake (null when idle / not on beacon sector). */
  handshake: BeaconHandshake | null;
  /** Optional room-quest extraction favor; only one can be carried. */
  extractFavor: ExtractFavor | null;
  /** Final ridge pad multi-turn uplink. */
  uplink: ExtractionUplink | null;
  /** Nav Core pattern-buffer desync; shuttle rejects while > 0. */
  patternDesync: number;
  /** Scripted event once-flags (event id → fired). */
  scriptedFired: Record<string, boolean>;
  /** Turns accrued in approach for shear pulse cadence. */
  approachShearAcc: number;
  /** Remaining turns in an ecology-wide ion shear front. */
  ionFrontTurns: number;
  /** A flare has buffered the next ion-front pulse. */
  ionFrontDampened: boolean;
  /** In-run PADD modifiers from recovered pages. */
  paddMods: {
    filterBonus: number;
    fovBonus: number;
    quietVault: boolean;
    brineSeal: boolean;
  };
  /** Pending skill fork choice (ADOM talent pick). */
  skillPick: SkillId[] | null;
  /** In-run surveyor proficiency (resets each seed) */
  level: number;
  xp: number;
  xpToNext: number;
  skills: SkillId[];
  /** Loot taken this sector — wakes guard crawlers */
  lootTakenThisSector: boolean;
  objectives: ObjectiveFlags;
  log: LogEntry[];
  ui: {
    inventoryOpen: boolean;
    selectedSlot: number;
    /** After using dart, next move key aims */
    aimingDart: boolean;
    /** Turns remaining to sticky-flash quest milestone in HUD */
    questFlash: number;
  };
  nextEntityId: number;
  loreEvents: LoreId[];
}

export type Action =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'wait' }
  | { type: 'toggle_inventory' }
  | { type: 'select_slot'; index: number }
  | { type: 'use' }
  | { type: 'aim'; dx: number; dy: number }
  | { type: 'exit' }
  | { type: 'close_ui' }
  | { type: 'pick_skill'; id: SkillId };
