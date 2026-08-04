import { pushLog } from './log';
import type { ExtractFavorKind, GameState } from './types';

const FAVOR_BY_QUEST = {
  salvage: 'storm_shelter',
  purge: 'hazard_pass',
  decode: 'pattern_fail_safe',
  stabilize: 'storm_shelter',
  relay_chain: 'pattern_fail_safe',
  calibrate: 'storm_shelter',
  vent_seal: 'hazard_pass',
} as const satisfies Record<NonNullable<GameState['roomQuest']>['kind'], ExtractFavorKind>;

export function favorForQuest(state: GameState): ExtractFavorKind {
  return FAVOR_BY_QUEST[state.roomQuest?.kind ?? 'salvage'];
}

/** Replacing an old favor keeps the reward cap readable and deterministic. */
export function grantExtractFavor(state: GameState, kind: ExtractFavorKind): void {
  const replaced = state.extractFavor?.kind;
  state.extractFavor = { kind };
  pushLog(state, 'LOG-FAVOR-GRANT', replaced ? `${replaced} → ${kind}` : kind);
}

export function consumeExtractFavor(state: GameState, kind: ExtractFavorKind): boolean {
  if (state.extractFavor?.kind !== kind) return false;
  state.extractFavor = null;
  pushLog(state, 'LOG-FAVOR-CONSUME', kind);
  return true;
}

/** Shelter converts into a final-sector window buffer rather than expiring unused. */
export function applyStormShelterOnSectorEntry(state: GameState): void {
  if (!consumeExtractFavor(state, 'storm_shelter')) return;
  state.stormTurns += 15;
  pushLog(state, 'LOG-FAVOR-SHELTER', '+15 window');
}
