import { getSector } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import { progressEnergyTax, progressStormTax } from '../data/difficulty';
import { CAMPAIGN_LENGTH } from '../campaign/spine';
import { XP_SECTOR } from '../data/progression';
import { equipCancelsFatigueTax } from '../data/items';
import { pushLog } from './log';
import { syncObjectiveFlags } from './inventory';
import { loadSector } from './state';
import { moveEnemies } from './ai';
import { moveAllies } from './allyAi';
import { addStatus, addPlayerMarked, hasScar, hasStatus, tickPlayerStatusEffects } from './status';
import { gainXp, hasSkill } from './progression';
import { addEmStress, emEnergyTax, EM_HIGH, SCAR_STREAK_TURNS } from './emStress';
import { mechanicsOnEndTurn } from './mechanics';
import { grantSectorSurveyBonus } from './mechanics/survey';
import { refreshVision, refreshVisionAfterTurn } from './vision';
import { enemyAt, manhattan } from './spatial';
import { tickContamination } from './contamination';
import { consumeExtractFavor } from './extractFavor';
import type { Enemy, GameState, ScanScarId } from './types';
import { pick } from './rng';

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

function tickScanScars(state: GameState): void {
  if (state.emStress >= EM_HIGH) {
    state.emHighStreak += 1;
    // Soft fatigue pressure while hot and not quiet
    if (state.player.jammerTurns <= 0 && state.rng() < 0.06) {
      addStatus(state.player, 'fatigue', 3);
      pushLog(state, 'LOG-STATUS-FATIGUE');
    }
  } else {
    state.emHighStreak = 0;
  }

  if (state.emHighStreak < SCAR_STREAK_TURNS || state.scanScars.length >= 2) return;
  const pool: ScanScarId[] = (['array_bleed', 'hunter_eye'] as ScanScarId[]).filter(
    (id) => !hasScar(state, id),
  );
  if (pool.length === 0) return;
  const id = pick(state.rng, pool);
  state.scanScars.push({ id, stabilized: false });
  state.emHighStreak = 0;
  pushLog(state, id === 'array_bleed' ? 'LOG-SCAR-ARRAY' : 'LOG-SCAR-EYE');
}

function tickEnvironment(state: GameState): void {
  // Drill bay — pause storm clock and bus drip (stress-free teaching)
  if (state.tutorialActive) {
    if (state.player.probeTurns > 0) state.player.probeTurns -= 1;
    if (state.player.stimTurns > 0) state.player.stimTurns -= 1;
    if (state.player.filterTurns > 0) state.player.filterTurns -= 1;
    if (state.player.jammerTurns > 0) {
      state.player.jammerTurns -= 1;
      if (state.player.jammerTurns === 0) pushLog(state, 'LOG-QUIET-OFF');
    }
    if (state.player.lensTurns > 0) state.player.lensTurns -= 1;
    if (state.player.mapperTurns > 0) state.player.mapperTurns -= 1;
    if (state.player.stabilizeTurns > 0) state.player.stabilizeTurns -= 1;
    if (state.player.braceTurns > 0) state.player.braceTurns -= 1;
    tickContamination(state);
    tickPlayerStatusEffects(state);
    tickScanScars(state);
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
  // Leveled runs feel the clock sooner inland
  if (progressStormTax(state.level, sector.index, state.turn)) {
    state.stormTurns -= 1;
  }

  const filter = state.player.filterTurns > 0;
  const coupler = state.player.equip.utility === 'eps_coupler';
  if (state.turn % 5 === 0) {
    const skipDrip =
      hasSkill(state, 'deep_reserve') && state.turn % 10 === 0;
    if (!skipDrip) {
      state.player.energy -= filter ? 0 : Math.max(0, 1 - (coupler ? 1 : 0));
    }
  }
  state.player.energy -= emEnergyTax(state);
  state.player.energy -= progressEnergyTax(state.level, state.turn, filter);
  let drain = filter ? Math.ceil(sector.energyDrain / 2) : sector.energyDrain;
  if (coupler) drain = Math.max(0, drain - 1);
  state.player.energy -= drain;

  // Fatigue status: +1 energy tax / turn unless harness worn
  if (hasStatus(state.player, 'fatigue') && !equipCancelsFatigueTax(state.player.equip.armor)) {
    state.player.energy -= 1;
  }

  const tile = state.tiles[state.player.y]![state.player.x]!;
  const hazardCrossing =
    tile.kind === 'hazard' || tile.kind === 'brine_pool' || tile.kind === 'vent';
  if (hazardCrossing && consumeExtractFavor(state, 'hazard_pass')) {
    pushLog(state, 'LOG-FAVOR-HAZARD');
  } else if (tile.kind === 'hazard') {
    const brineExtra = sector.id === 'brine' && !filter ? 1 : 0;
    let hazardDrain = (filter ? 1 : 2) + brineExtra;
    if (coupler) hazardDrain = Math.max(0, hazardDrain - 1);
    state.player.energy -= hazardDrain;
    addStatus(state.player, 'ion_burn', 1);
    pushLog(state, 'LOG-HAZARD');
  } else if (tile.kind === 'brine_pool') {
    const brineExtra = sector.id === 'brine' && !filter ? 1 : 0;
    let poolDrain = (filter ? 1 : 2) + brineExtra;
    if (coupler) poolDrain = Math.max(0, poolDrain - 1);
    state.player.energy -= poolDrain;
    if (state.rng() < 0.18) {
      addStatus(state.player, 'fatigue', 2);
      pushLog(state, 'LOG-STATUS-FATIGUE');
    }
    pushLog(state, 'LOG-BRINE-POOL');
  } else if (tile.kind === 'vent') {
    state.player.energy -= filter || coupler ? 0 : 1;
    if (sector.id === 'ash' || sector.id === 'vault') addEmStress(state, 1);
    // Vent step: chance jam (1) or fatigue
    const ventRoll = state.rng();
    if (ventRoll < 0.12) {
      addStatus(state.player, 'jam', 1);
      pushLog(state, 'LOG-STATUS-JAM');
    } else if (ventRoll < 0.22) {
      addStatus(state.player, 'fatigue', 2);
      pushLog(state, 'LOG-STATUS-FATIGUE');
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
  // scrub / scrub_nest are sight-blockers — scrub_nest may also spawn
  tickContamination(state);

  if (state.player.probeTurns > 0) state.player.probeTurns -= 1;
  if (state.player.stimTurns > 0) state.player.stimTurns -= 1;
  if (state.player.filterTurns > 0) state.player.filterTurns -= 1;
  if (state.player.jammerTurns > 0) {
    state.player.jammerTurns -= 1;
    if (state.player.jammerTurns === 0) pushLog(state, 'LOG-QUIET-OFF');
  }
  if (state.player.lensTurns > 0) state.player.lensTurns -= 1;
  if (state.player.mapperTurns > 0) state.player.mapperTurns -= 1;
  if (state.player.stabilizeTurns > 0) state.player.stabilizeTurns -= 1;
  if (state.player.braceTurns > 0) state.player.braceTurns -= 1;

  tickPlayerStatusEffects(state);
  tickScanScars(state);
  mechanicsOnEndTurn(state);
}

export function endPlayerTurn(state: GameState): void {
  if (state.status !== 'playing') return;
  state.turn += 1;
  tickEnvironment(state);
  // FOV + light from the player's new tile before AI so ambush/FOV checks see current vision.
  refreshVisionAfterTurn(state);
  moveEnemies(state);
  moveAllies(state);
  // Recompute after enemy moves so presentation matches final visibility / light.
  refreshVision(state);
  syncObjectiveFlags(state);
  checkLose(state);
}

export function advanceSector(state: GameState): boolean {
  if (state.sectorIndex >= CAMPAIGN_LENGTH - 1) return false;
  grantSectorSurveyBonus(state);
  gainXp(state, XP_SECTOR, 'sector');
  loadSector(state, state.sectorIndex + 1);
  return true;
}
