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
export { createGame, loadSector } from './state';
export { applyAction } from './actions';
export { computeFov, bfsPath, canReach, playerFovRadius, fovDistance, FOV_RADIUS } from './fov';
export { currentObjectivePos, describeObjective, stickyMilestone, assertLegalWin, loreOrderLegal } from './objectives';
export { gainXp, hasSkill, pickSkill } from './progression';
export { hasItem, syncObjectiveFlags } from './inventory';
export {
  mechanicsTryAction,
  mechanicsOnEndTurn,
  mechanicsContextHint,
  mechanicsAutopilotHint,
  mechanicsModifyFov,
} from './mechanics';
export type { Mechanic } from './mechanics';
