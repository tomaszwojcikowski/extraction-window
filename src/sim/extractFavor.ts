import { pushLog } from './log';
import type { ExtractFavorKind, GameState } from './types';

/** One favor per quest, so which quest you took shows up at extraction. */
const FAVOR_BY_QUEST = {
  salvage: 'storm_shelter',
  purge: 'hazard_pass',
  vent_seal: 'pattern_fail_safe',
} as const satisfies Record<NonNullable<GameState['roomQuest']>['kind'], ExtractFavorKind>;

export const FAVOR_LABEL: Record<ExtractFavorKind, string> = {
  storm_shelter: 'SHELTER',
  hazard_pass: 'SAFE STEP',
  pattern_fail_safe: 'BUFFER',
};

export function favorForQuest(state: GameState): ExtractFavorKind {
  return FAVOR_BY_QUEST[state.roomQuest?.kind ?? 'salvage'];
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

/** Shelter converts into a final-sector window buffer rather than expiring unused. */
export function applyStormShelterOnSectorEntry(state: GameState): void {
  if (!consumeExtractFavor(state, 'storm_shelter')) return;
  state.stormTurns += 15;
  pushLog(state, 'LOG-FAVOR-SHELTER', '+15 window');
}
