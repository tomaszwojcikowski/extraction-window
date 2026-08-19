import { ARMOR_DEF_BONUS, equipIonReduction } from '../data/items';
import { equippedSuit } from './equip';
import type { LoreId } from '../data/lore';
import { EM_HIGH } from './emStress';
import { formatCombatDetail, pushLog } from './log';
import { hasSkill } from './progression';
import { randInt } from './rng';
import type { DamageType, GameState, StatusId, StatusMap } from './types';

const DOWNED_TURNS = 3;
const CRIT_SAVE_BASE = 8;
export const KEEP_CALM_COOLDOWN = 8;
export const KEEP_CALM_JAM = 2;

import { addPlayerStatus } from './status';

function grantStatus(target: { statuses: StatusMap }, id: StatusId, turns: number): void {
  const cur = target.statuses[id] ?? 0;
  target.statuses[id] = Math.max(cur, turns);
}

function armorDefBonus(state: GameState): number {
  const suit = equippedSuit(state);
  if (!suit) return 0;
  return ARMOR_DEF_BONUS[suit] ?? 0;
}

/**
 * EM_HIGH + real HP loss can jam kit. Filter already answers EM — skip the check.
 * Cooldown so a pack cannot fritz every bite.
 */
export function tryKeepCalm(state: GameState): void {
  if (state.tutorialActive) return;
  if (state.player.filterTurns > 0) return;
  if (state.keepCalmCooldown > 0) return;
  if (state.emStress < EM_HIGH) return;
  if (randInt(state.rng, 1, 100) <= state.emStress) {
    addPlayerStatus(state, 'jam', KEEP_CALM_JAM);
    state.keepCalmCooldown = KEEP_CALM_COOLDOWN;
    pushLog(state, 'LOG-KEEP-CALM-FAIL');
  }
}

export type ApplyPlayerDamageOpts = {
  source?: string;
  /** Bleed ignores ablative plating; overflow still applies. */
  pierceArmor?: boolean;
  logId?: LoreId;
};

/**
 * Apply damage to the player: ion filter halves ion, then ablative armor absorbs before HP.
 * Overflow past 0 HP rolls a save (not in the drill bay). Hits while downed shorten the clock.
 */
export function applyPlayerDamage(
  state: GameState,
  amount: number,
  type: DamageType,
  opts?: ApplyPlayerDamageOpts,
): { armorLost: number; hpLost: number; fullyAbsorbed: boolean } {
  let dmg = Math.max(0, amount);
  const filterOn = state.player.filterTurns > 0;
  const ionSkin = hasSkill(state, 'ion_skin');
  if (type === 'ion') dmg = Math.max(1, dmg - equipIonReduction(equippedSuit(state)));
  if (filterOn && (type === 'ion' || (ionSkin && type === 'kinetic'))) {
    dmg = Math.max(1, Math.ceil(dmg / 2));
  }

  let armorLost = 0;
  let hpLost = 0;
  if (dmg <= 0) return { armorLost: 0, hpLost: 0, fullyAbsorbed: true };

  const src = opts?.source;
  if (!opts?.pierceArmor && state.player.armor > 0) {
    let absorbCap = dmg;
    if ((state.player.statuses.expose ?? 0) > 0) {
      absorbCap = Math.max(0, Math.ceil(dmg * 0.55));
    }
    armorLost = Math.min(state.player.armor, absorbCap);
    state.player.armor -= armorLost;
    dmg -= armorLost;
    if (armorLost > 0) {
      pushLog(state, 'LOG-ARMOR-ABSORB', src ? `${src} -${armorLost}` : `-${armorLost}`);
    }
  }
  if (dmg > 0) {
    if ((state.player.statuses.downed ?? 0) > 0) {
      const cur = state.player.statuses.downed ?? 0;
      if (cur <= 1) delete state.player.statuses.downed;
      else state.player.statuses.downed = cur - 1;
      pushLog(state, 'LOG-DOWNED-TICK', src);
    } else if (!state.tutorialActive && state.player.hp - dmg <= 0) {
      state.player.hp = 0;
      hpLost = dmg;
      const saveTarget = CRIT_SAVE_BASE + state.player.def + armorDefBonus(state);
      if (randInt(state.rng, 1, 20) <= saveTarget) {
        state.player.hp = 1;
        grantStatus(state.player, 'expose', 4);
        pushLog(state, 'LOG-CRIT-SAVE', src);
      } else {
        grantStatus(state.player, 'downed', DOWNED_TURNS);
        pushLog(state, 'LOG-DOWNED', src);
      }
    } else {
      hpLost = dmg;
      state.player.hp -= hpLost;
      const rem = Math.max(0, state.player.hp);
      pushLog(
        state,
        opts?.logId ?? 'LOG-HURT',
        formatCombatDetail(src ?? 'hit', hpLost, rem, state.player.maxHp, type),
      );
    }
  }
  if (hpLost > 0) tryKeepCalm(state);
  return { armorLost, hpLost, fullyAbsorbed: hpLost === 0 && armorLost > 0 };
}
