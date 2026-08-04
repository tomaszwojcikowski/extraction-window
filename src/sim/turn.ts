import { getSector } from '../data/encounters';
import { CAMPAIGN_LENGTH } from '../campaign/spine';
import { XP_SECTOR } from '../data/progression';
import { computeFov, playerFovRadius } from './fov';
import { pushLog } from './log';
import { syncObjectiveFlags } from './inventory';
import { loadSector } from './state';
import { moveEnemies } from './ai';
import { moveAllies } from './allyAi';
import { addStatus, tickPlayerStatusEffects } from './status';
import { gainXp, hasSkill } from './progression';
import { addEmStress, emEnergyTax } from './emStress';
import { mechanicsOnEndTurn, mechanicsModifyFov } from './mechanics';
import { grantSectorSurveyBonus } from './mechanics/survey';
import type { GameState } from './types';

function fovR(state: GameState): number {
  const base =
    playerFovRadius(state.player.probeTurns, state.player.lensTurns) +
    state.paddMods.fovBonus +
    (state.player.equip.utility === 'sensor_rig' ? 1 : 0);
  return mechanicsModifyFov(state, base);
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
  computeFov(
    state.tiles,
    state.explored,
    state.visible,
    state.player.x,
    state.player.y,
    fovR(state),
  );
  syncObjectiveFlags(state);
  checkLose(state);
}

function tickEnvironment(state: GameState): void {
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
  const coupler = state.player.equip.utility === 'eps_coupler';
  if (state.turn % 5 === 0) {
    const skipDrip =
      hasSkill(state, 'deep_reserve') && state.turn % 10 === 0;
    if (!skipDrip) {
      state.player.energy -= filter ? 0 : Math.max(0, 1 - (coupler ? 1 : 0));
    }
  }
  state.player.energy -= emEnergyTax(state);
  let drain = filter ? Math.ceil(sector.energyDrain / 2) : sector.energyDrain;
  if (coupler) drain = Math.max(0, drain - 1);
  state.player.energy -= drain;

  const tile = state.tiles[state.player.y]![state.player.x]!;
  if (tile.kind === 'hazard') {
    const brineExtra = sector.id === 'brine' && !filter ? 1 : 0;
    let hazardDrain = (filter ? 1 : 2) + brineExtra;
    if (coupler) hazardDrain = Math.max(0, hazardDrain - 1);
    state.player.energy -= hazardDrain;
    addStatus(state.player, 'ion_burn', 1);
    pushLog(state, 'LOG-HAZARD');
  } else if (tile.kind === 'vent') {
    state.player.energy -= filter || coupler ? 0 : 1;
    if (sector.id === 'ash' || sector.id === 'vault') addEmStress(state, 1);
  }
  // scrub is a sight-blocker only — no energy tax

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

  tickPlayerStatusEffects(state);
  mechanicsOnEndTurn(state);
}

export function endPlayerTurn(state: GameState): void {
  if (state.status !== 'playing') return;
  state.turn += 1;
  tickEnvironment(state);
  // FOV from the player's new tile before AI so ambush/FOV checks see current vision.
  computeFov(
    state.tiles,
    state.explored,
    state.visible,
    state.player.x,
    state.player.y,
    fovR(state),
  );
  moveEnemies(state);
  moveAllies(state);
  // Recompute after enemy moves so presentation matches final visibility.
  computeFov(
    state.tiles,
    state.explored,
    state.visible,
    state.player.x,
    state.player.y,
    fovR(state),
  );
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
