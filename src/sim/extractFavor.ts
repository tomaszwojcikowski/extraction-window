import { pushLog } from './log';
import type { ExtractFavorKind, GameState } from './types';

export const FAVOR_LABEL: Record<ExtractFavorKind, string> = {
  hazard_pass: 'Skip 1 hazard',
  pattern_fail_safe: 'Block 1 skiff lock',
};

/** Purge and vent_seal pay extract favors; salvage pays kit/XP only. */
export function favorForQuest(state: GameState): ExtractFavorKind | null {
  const kind = state.roomQuest?.kind;
  if (kind === 'purge') return 'hazard_pass';
  if (kind === 'vent_seal') return 'pattern_fail_safe';
  return null;
}

/** Replacing an old favor keeps the reward cap readable and deterministic. */
export function grantExtractFavor(state: GameState, kind: ExtractFavorKind): void {
  const replaced = state.extractFavor?.kind;
  state.extractFavor = { kind };
  pushLog(
    state,
    'LOG-FAVOR-GRANT',
    replaced
      ? `replaced ${FAVOR_LABEL[replaced]} → ${FAVOR_LABEL[kind]}`
      : FAVOR_LABEL[kind],
  );
}

export function consumeExtractFavor(state: GameState, kind: ExtractFavorKind): boolean {
  if (state.extractFavor?.kind !== kind) return false;
  state.extractFavor = null;
  pushLog(state, 'LOG-FAVOR-CONSUME', FAVOR_LABEL[kind]);
  return true;
}
