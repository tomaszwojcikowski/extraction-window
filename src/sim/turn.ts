import { getSector } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import { CAMPAIGN_LENGTH } from '../campaign/spine';
import { XP_SECTOR } from '../data/progression';
import { pushLog } from './log';
import { syncObjectiveFlags } from './inventory';
import { loadSector } from './state';
import { pinPhaserTrainingMites } from '../map/tutorialMap';
import { moveEnemies } from './ai';
import { applyAllyFieldRoles, moveAllies } from './allyAi';
import { EQUIP_TAGS } from '../data/items';
import { isItemWorn } from './equip';
import { addPlayerStatus, addStatus, addPlayerMarked, tickPlayerStatusEffects } from './status';
import { gainXp, hasSkill } from './progression';
import { addEmStress, emEnergyTax } from './emStress';
import { mechanicsOnEndTurn } from './mechanics';
import { refreshVision, refreshVisionAfterTurn } from './vision';
import { enemyAt, manhattan } from './spatial';
import { tickContamination } from './contamination';
import { consumeExtractFavor } from './extractFavor';
import { tickBusPressure } from './bus';
import type { Enemy, GameState } from './types';

function trySpawnNestMite(state: GameState): void {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (const [dx, dy] of dirs) {
    const x = state.player.x + dx;
    const y = state.player.y + dy;
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) continue;
    if (!state.tiles[y]![x]!.walkable) continue;
    if (enemyAt(state, x, y)) continue;
    if (x === state.player.x && y === state.player.y) continue;
    const def = ENEMIES.mite;
    const mite: Enemy = {
      id: state.nextEntityId++,
      kind: 'mite',
      x,
      y,
      hp: def.hp,
      maxHp: def.hp,
      atk: def.atk,
      def: def.def,
      alive: true,
      statuses: {},
      alerted: true,
      swellTurns: 0,
      homeX: x,
      homeY: y,
      skirmishRetreat: false,
      windup: 0,
      beamCooldown: 0,
      tier: 'normal',
    };
    state.enemies.push(mite);
    pushLog(state, 'LOG-SCRUB-NEST');
    return;
  }
}

export function checkLose(state: GameState, opts?: { skipBus?: boolean }): void {
  if (state.status !== 'playing') return;
  if (state.player.hp <= 0 && !state.player.statuses.downed) {
    state.status = 'lost';
    state.loseReason = 'hp';
    return;
  }
  if (state.player.energy > 0) {
    state.busFailing = false;
  } else if (!opts?.skipBus) {
    state.player.energy = 0;
    if (!state.busFailing) {
      state.busFailing = true;
      pushLog(state, 'LOG-BUS-FAILING');
      return;
    }
    state.status = 'lost';
    state.loseReason = 'energy';
  }
}

/** FOV refresh after a sector load (no enemy moves / energy drip). */
export function finishSectorTransition(state: GameState): void {
  state.turn += 1;
  refreshVision(state);
  syncObjectiveFlags(state);
  // Hatch crossing is not the bus-death beat — keep failing so the first
  // action in the new sector still has a cell-use window.
  checkLose(state, { skipBus: true });
}

/** Underfoot terrain tax — shared so the drill can teach visible hazards. */
function tickUnderfootTerrain(state: GameState): void {
  const sector = getSector(state.sectorIndex);
  const filter = state.player.filterTurns > 0;
  const tile = state.tiles[state.player.y]![state.player.x]!;
  const hazardCrossing =
    tile.kind === 'hazard' || tile.kind === 'brine_pool' || tile.kind === 'vent';
  const boots = isItemWorn(state, 'mag_boots');
  const gloves = isItemWorn(state, 'grip_gloves');
  const drainCut = boots ? EQUIP_TAGS.mag_boots.hazardDrainReduction : 0;
  if (hazardCrossing && consumeExtractFavor(state, 'hazard_pass')) {
    pushLog(state, 'LOG-FAVOR-HAZARD');
  } else if (tile.kind === 'hazard') {
    const brineExtra = sector.id === 'brine' && !filter ? 1 : 0;
    const drain = Math.max(1, (filter ? 1 : 2) + brineExtra - drainCut);
    state.player.energy -= drain;
    if (!gloves || !EQUIP_TAGS.grip_gloves.hazardIonSkip) {
      addStatus(state.player, 'ion_burn', 1);
    }
    pushLog(state, 'LOG-HAZARD');
  } else if (tile.kind === 'brine_pool') {
    const brineExtra = sector.id === 'brine' && !filter ? 1 : 0;
    const drain = Math.max(1, (filter ? 1 : 2) + brineExtra - drainCut);
    state.player.energy -= drain;
    pushLog(state, 'LOG-BRINE-POOL');
  } else if (tile.kind === 'vent') {
    state.player.energy -= filter ? 0 : 1;
    if (sector.id === 'ash' || sector.id === 'vault') addEmStress(state, 1);
    if (state.rng() < 0.12) {
      addPlayerStatus(state, 'jam', 1);
      pushLog(state, 'LOG-STATUS-JAM');
    }
  } else if (tile.kind === 'tripwire') {
    const tripEm = Math.max(
      1,
      2 - (boots ? EQUIP_TAGS.mag_boots.tripwireEmReduction : 0),
    );
    addEmStress(state, tripEm, 'tripwire');
    for (const en of state.enemies) {
      if (!en.alive) continue;
      if (manhattan(en.x, en.y, state.player.x, state.player.y) <= 5) {
        en.alerted = true;
      }
    }
    state.tiles[state.player.y]![state.player.x] = {
      kind: 'floor',
      walkable: true,
      transparent: true,
    };
    pushLog(state, 'LOG-TRIPWIRE');
  } else if (tile.kind === 'scrub_nest') {
    const nestRoll = state.rng();
    if (nestRoll < 0.08) {
      addPlayerMarked(state, 3);
      pushLog(state, 'LOG-STATUS-MARKED');
    } else if (nestRoll < 0.14) {
      trySpawnNestMite(state);
    }
  }
}

function tickEnvironment(state: GameState): void {
  // Drill bay — pause bus drip; still teach underfoot hazards.
  if (state.tutorialActive) {
    tickUnderfootTerrain(state);
    if (state.player.probeTurns > 0) state.player.probeTurns -= 1;
    if (state.player.stimTurns > 0) state.player.stimTurns -= 1;
    if (state.player.filterTurns > 0) state.player.filterTurns -= 1;
    if (state.player.mapperTurns > 0) state.player.mapperTurns -= 1;
    if (state.keepCalmCooldown > 0) state.keepCalmCooldown -= 1;
    tickContamination(state);
    tickPlayerStatusEffects(state);
    mechanicsOnEndTurn(state);
    return;
  }

  const sector = getSector(state.sectorIndex);
  const filter = state.player.filterTurns > 0;
  if (state.turn % 5 === 0) {
    const skipDrip =
      hasSkill(state, 'deep_reserve') && state.turn % 10 === 0;
    if (!skipDrip) {
      state.player.energy -= filter ? 0 : 1;
    }
  }
  state.player.energy -= emEnergyTax(state);
  state.player.energy -= filter ? Math.ceil(sector.energyDrain / 2) : sector.energyDrain;

  tickUnderfootTerrain(state);
  tickContamination(state);

  if (state.player.probeTurns > 0) state.player.probeTurns -= 1;
  if (state.player.stimTurns > 0) state.player.stimTurns -= 1;
  if (state.player.filterTurns > 0) state.player.filterTurns -= 1;
  if (state.player.mapperTurns > 0) state.player.mapperTurns -= 1;
  if (state.keepCalmCooldown > 0) state.keepCalmCooldown -= 1;

  tickPlayerStatusEffects(state);
  mechanicsOnEndTurn(state);
}

export function endPlayerTurn(state: GameState): void {
  if (state.status !== 'playing') return;
  const energyBefore = state.player.energy;
  state.turn += 1;
  tickEnvironment(state);
  refreshVisionAfterTurn(state);
  applyAllyFieldRoles(state);
  moveEnemies(state);
  pinPhaserTrainingMites(state);
  moveAllies(state);
  refreshVision(state);
  syncObjectiveFlags(state);
  tickBusPressure(state, energyBefore);
  checkLose(state);
}

export function advanceSector(state: GameState): boolean {
  if (state.sectorIndex >= CAMPAIGN_LENGTH - 1) return false;
  const nextIndex = state.sectorIndex + 1;
  gainXp(state, XP_SECTOR, 'sector');
  if (state.player.armor < state.player.maxArmor) {
    state.player.armor = state.player.maxArmor;
    pushLog(state, 'LOG-ARMOR-RESEAT');
  }
  loadSector(state, nextIndex);
  return true;
}
