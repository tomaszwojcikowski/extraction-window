export { mulberry32, randInt, pick, shuffle } from './rng';
export type { Rng } from './rng';
export type {
  Action,
  GameState,
  GameStatus,
  LoseReason,
  Pos,
  Tile,
  Enemy,
  GroundItem,
  InventorySlot,
  LogEntry,
} from './types';
export { createGame, loadSector, finishTutorial } from './state';
export type { CreateGameOpts } from './state';
export { applyAction } from './actions';
export { computeFov, bfsPath, canReach, playerFovRadius, fovDistance, FOV_RADIUS } from './fov';
export {
  irradiance,
  lightTransmittance,
  toneMap,
  accumulateLight,
  floodAddLight,
  rebuildIllumination,
  isLit,
  inShadow,
  addLightSource,
  collectLightSources,
  LIT_THRESHOLD,
  SHADOW_THRESHOLD,
} from './light';
export { refreshVision } from './vision';
export { windowDrainRate, windowTurnsLeft } from './window';
export { busIsCritical, BUS_CRITICAL } from './bus';
export { currentObjectivePos, describeObjective, stickyMilestone, assertLegalWin, loreOrderLegal, extractTrack } from './objectives';
export { gainXp, hasSkill, pickSkill } from './progression';
export { hasItem, syncObjectiveFlags, tryEquipItem, fireDart } from './inventory';
export {
  findPhaserTarget,
  firePhaser,
  tryFirePhaser,
  PHASER_ENERGY_COST,
  PHASER_RANGE_MAX,
  PHASER_RANGE_MIN,
} from './phaser';
export { toolAtkBonus, armorDefBonus, meleeDamage, applyPlayerDamage, playerAttack, enemyAttack, lightPreferAtkBonus, flankPenalty } from './combat';
export { pushLog, recordLoreEvent, formatCombatDetail } from './log';
export { killEnemy, markEnemyDead } from './death';
export { manhattan, enemyAt, allyAt, npcAt } from './spatial';
export {
  effectiveAggro,
  effectiveAggroAt,
  wouldNoticeEnemy,
} from './notice';
export {
  mechanicsTryAction,
  mechanicsOnEndTurn,
  mechanicsContextHint,
  mechanicsAutopilotHint,
  mechanicsModifyFov,
} from './mechanics';
export type { Mechanic } from './mechanics';
