import { pushLog } from './log';
import type { ExtractFavorKind, GameState } from './types';

export const FAVOR_LABEL: Record<ExtractFavorKind, string> = {
  pattern_fail_safe: 'Save 1 skiff start',
};

/** Vent-seal pays a skiff-lock save; salvage and purge pay kit/XP only. */
export function favorForQuest(state: GameState): ExtractFavorKind | null {
  return state.roomQuest?.kind === 'vent_seal' ? 'pattern_fail_safe' : null;
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
