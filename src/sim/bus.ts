import type { LoreId } from '../data/lore';
import { pushLog } from './log';
import type { GameState } from './types';

/** Power remaining marks that earn a warning, crossed downward. */
export const BUS_WARN_AT = [40, 20, 8] as const;
/** HUD / hint: Power is the live kill clock. */
export const BUS_CRITICAL = 20;
/** Handshake / pattern fail tax — matches prior Window penalty weight. */
export const POWER_TAX_HEAVY = 8;
/**
 * Global bus drip cadence: one Power every N turns, billed in `tickEnvironment`.
 * Sized so a full-spine run (~600 turns at the current room footprints) pays
 * ~100 drip — the original 5-turn cadence predates the larger rooms and was
 * taxing the longer spine ~35% harder than its Power budget allowed.
 */
export const BUS_DRIP_TURNS = 6;

export function busIsCritical(state: GameState): boolean {
  return state.busFailing || state.player.energy <= BUS_CRITICAL;
}

/**
 * Clamp the bus and warn when a remaining-power mark is crossed this turn.
 * Hitting 0 is owned by `checkLose` (failing grace, then death).
 */
export function tickBusPressure(state: GameState, energyBefore: number): void {
  const after = Math.max(0, state.player.energy);
  state.player.energy = after;
  if (after <= 0) return;
  if (BUS_WARN_AT.some((mark) => energyBefore > mark && after <= mark)) {
    pushLog(state, 'LOG-BUS-WARN');
  }
}

export function canSpendPower(state: GameState, cost: number): boolean {
  return state.player.energy >= cost;
}

/** Spend Power for a chosen kit action; returns false when broke. */
export function spendPower(
  state: GameState,
  cost: number,
  logId: LoreId,
  detail?: string,
): boolean {
  if (!canSpendPower(state, cost)) return false;
  state.player.energy = Math.max(0, state.player.energy - cost);
  pushLog(state, logId, detail ?? `-${cost} Power`);
  return true;
}

/** Mandatory Power tax (interrupts, fails) — always applies. */
export const KIT_POWER_COST = {
  probe: 3,
  flare: 2,
  filter: 1,
  stim: 2,
  phaser: 4,
} as const;

export function taxPower(state: GameState, cost: number, logId: LoreId): void {
  state.player.energy = Math.max(0, state.player.energy - cost);
  pushLog(state, logId, `-${cost} Power`);
}
