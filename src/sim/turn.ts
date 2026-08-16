import { getSector } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import { CAMPAIGN_LENGTH } from '../campaign/spine';
import { XP_SECTOR } from '../data/progression';
import { pushLog } from './log';
import { syncObjectiveFlags } from './inventory';
import { loadSector } from './state';
import { moveEnemies } from './ai';
import { applyAllyFieldRoles, moveAllies } from './allyAi';
import { addStatus, addPlayerMarked, tickPlayerStatusEffects } from './status';
import { gainXp, hasSkill } from './progression';
import { addEmStress, emEnergyTax } from './emStress';
import { mechanicsOnEndTurn } from './mechanics';
import { refreshVision, refreshVisionAfterTurn } from './vision';
import { enemyAt, manhattan } from './spatial';
import { tickContamination } from './contamination';
import { consumeExtractFavor } from './extractFavor';
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

export function checkLose(state: GameState): void {
  if (state.status !== 'playing') return;
  if (state.player.hp <= 0) {
    state.status = 'lost';
    state.loseReason = 'hp';
    return;
  }
  if (state.player.energy <= 0) {
    state.status = 'lost';
    state.loseReason = 'energy';
    return;
  }
  if (state.stormTurns <= 0) {
    state.status = 'lost';
    state.loseReason = 'storm';
  }
}

/** Storm tick + FOV after a sector load (no enemy moves / energy drip). */
export function finishSectorTransition(state: GameState): void {
  state.turn += 1;
  state.stormTurns -= 1;
  if (state.stormTurns === 200 || state.stormTurns === 80 || state.stormTurns === 50 || state.stormTurns === 20) {
    pushLog(state, 'LOG-STORM-WARN');
  }
  refreshVision(state);
  syncObjectiveFlags(state);
  checkLose(state);
}

/** Underfoot terrain tax — shared so the drill can teach visible hazards. */
function tickUnderfootTerrain(state: GameState): void {
  const sector = getSector(state.sectorIndex);
  const filter = state.player.filterTurns > 0;
  const tile = state.tiles[state.player.y]![state.player.x]!;
  const hazardCrossing =
    tile.kind === 'hazard' || tile.kind === 'brine_pool' || tile.kind === 'vent';
  if (hazardCrossing && consumeExtractFavor(state, 'hazard_pass')) {
    pushLog(state, 'LOG-FAVOR-HAZARD');
  } else if (tile.kind === 'hazard') {
    const brineExtra = sector.id === 'brine' && !filter ? 1 : 0;
    state.player.energy -= (filter ? 1 : 2) + brineExtra;
    addStatus(state.player, 'ion_burn', 1);
    pushLog(state, 'LOG-HAZARD');
  } else if (tile.kind === 'brine_pool') {
    const brineExtra = sector.id === 'brine' && !filter ? 1 : 0;
    state.player.energy -= (filter ? 1 : 2) + brineExtra;
    pushLog(state, 'LOG-BRINE-POOL');
  } else if (tile.kind === 'vent') {
    state.player.energy -= filter ? 0 : 1;
    if (sector.id === 'ash' || sector.id === 'vault') addEmStress(state, 1);
    if (state.rng() < 0.12) {
      addStatus(state.player, 'jam', 1);
      pushLog(state, 'LOG-STATUS-JAM');
    }
  } else if (tile.kind === 'tripwire') {
    addEmStress(state, 2, 'tripwire');
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
  // Drill bay — pause storm clock and bus drip; still teach underfoot hazards.
  if (state.tutorialActive) {
    tickUnderfootTerrain(state);
    if (state.player.probeTurns > 0) state.player.probeTurns -= 1;
    if (state.player.stimTurns > 0) state.player.stimTurns -= 1;
    if (state.player.filterTurns > 0) state.player.filterTurns -= 1;
    if (state.player.mapperTurns > 0) state.player.mapperTurns -= 1;
    if (state.player.braceTurns > 0) state.player.braceTurns -= 1;
    tickContamination(state);
    tickPlayerStatusEffects(state);
    mechanicsOnEndTurn(state);
    return;
  }

  const sector = getSector(state.sectorIndex);
  state.stormTurns -= 1;
  if (state.stormTurns === 200 || state.stormTurns === 80 || state.stormTurns === 50 || state.stormTurns === 20) {
    pushLog(state, 'LOG-STORM-WARN');
  }
  // Late-sector storm tax — duct onward (index 8+); vault+ every turn
  if (sector.index >= 8 && state.turn % 2 === 0) {
    state.stormTurns -= 1;
  }
  if (sector.index >= 11) {
    state.stormTurns -= 1;
  }

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
  // scrub / scrub_nest are sight-blockers — scrub_nest may also spawn
  tickContamination(state);

  if (state.player.probeTurns > 0) state.player.probeTurns -= 1;
  if (state.player.stimTurns > 0) state.player.stimTurns -= 1;
  if (state.player.filterTurns > 0) state.player.filterTurns -= 1;
  if (state.player.mapperTurns > 0) state.player.mapperTurns -= 1;
  if (state.player.braceTurns > 0) state.player.braceTurns -= 1;

  tickPlayerStatusEffects(state);
  mechanicsOnEndTurn(state);
}

export function endPlayerTurn(state: GameState): void {
  if (state.status !== 'playing') return;
  state.turn += 1;
  tickEnvironment(state);
  // FOV + light from the player's new tile before AI so ambush/FOV checks see current vision.
  refreshVisionAfterTurn(state);
  applyAllyFieldRoles(state);
  moveEnemies(state);
  moveAllies(state);
  // Recompute after enemy moves so presentation matches final visibility / light.
  refreshVision(state);
  syncObjectiveFlags(state);
  checkLose(state);
}

export function advanceSector(state: GameState): boolean {
  if (state.sectorIndex >= CAMPAIGN_LENGTH - 1) return false;
  gainXp(state, XP_SECTOR, 'sector');
  // Plating is a per-sector shield, not a one-time buffer for the whole run:
  // you re-seat it in the hatch. Plate stays the mid-sector repair.
  if (state.player.armor < state.player.maxArmor) {
    state.player.armor = state.player.maxArmor;
    pushLog(state, 'LOG-ARMOR-RESEAT');
  }
  loadSector(state, state.sectorIndex + 1);
  return true;
}
