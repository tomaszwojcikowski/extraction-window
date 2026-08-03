/**
 * Shared headless playtest helpers — used by scripts/playtest.ts and Vitest suites.
 */
import { CAMPAIGN_LENGTH } from '../src/campaign/spine';
import { runAutopilot } from '../src/ai/autopilot';
import { getSector } from '../src/data/encounters';
import { generateSectorMap } from '../src/map/generator';
import {
  assertLegalWin,
  canReach,
  createGame,
  loreOrderLegal,
} from '../src/sim';

export const SMOKE_SEEDS = [1, 42, 99, 12345, 777, 256, 2024, 88888] as const;

export const FULL_SEEDS = [
  1, 7, 13, 42, 99, 111, 256, 333, 512, 777, 1024, 1337, 2024, 3141, 4096, 5000, 7777, 8192,
  9999, 12345, 22222, 31415, 44444, 54321, 65535, 77777, 88888, 99999, 123456, 654321,
] as const;

/** Target autopilot win-rate band (PLAN.md). */
export const WIN_RATE_MIN = 0.55;
export const WIN_RATE_MAX = 0.85;

export interface SeedReport {
  seed: number;
  status: string;
  loseReason: string | null;
  turns: number;
  actions: number;
  sectorReached: number;
  stuck: boolean;
  winLegal: boolean;
  loreLegal: boolean;
  objectivesReachable: boolean;
  crash: string | null;
  hasNavCoreAtEnd: boolean;
  level: number;
}

export function checkObjectivesReachable(seed: number): boolean {
  for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
    const sector = getSector(i);
    const map = generateSectorMap(sector, seed, i);
    if (!canReach(map.tiles, map.start, map.exit)) return false;
    for (const item of map.items) {
      if (item.kind === 'relay_key' || item.kind === 'nav_core') {
        if (!canReach(map.tiles, map.start, { x: item.x, y: item.y })) return false;
      }
    }
  }
  return true;
}

export function runSeed(seed: number, maxActions = 10000): SeedReport {
  try {
    const objectivesReachable = checkObjectivesReachable(seed);
    const state = createGame(seed);
    const { state: end, actions, stuck } = runAutopilot(state, maxActions);

    if (stuck && end.status === 'playing') {
      end.status = 'lost';
      end.loseReason = 'stuck';
    }

    const winLegal = end.status !== 'won' || assertLegalWin(end);
    const loreLegal = loreOrderLegal(end.loreEvents);

    return {
      seed,
      status: end.status,
      loseReason: end.loseReason,
      turns: end.turn,
      actions,
      sectorReached: end.sectorIndex,
      stuck,
      winLegal,
      loreLegal,
      objectivesReachable,
      crash: null,
      hasNavCoreAtEnd: end.objectives.hasNavCore,
      level: end.level,
    };
  } catch (e) {
    return {
      seed,
      status: 'crash',
      loseReason: null,
      turns: 0,
      actions: 0,
      sectorReached: 0,
      stuck: false,
      winLegal: false,
      loreLegal: false,
      objectivesReachable: false,
      crash: e instanceof Error ? e.message : String(e),
      hasNavCoreAtEnd: false,
      level: 1,
    };
  }
}

export function summarize(results: SeedReport[]) {
  const wins = results.filter((r) => r.status === 'won');
  const losses = results.filter((r) => r.status === 'lost');
  const crashes = results.filter((r) => r.crash);
  const illegal = results.filter((r) => !r.winLegal || !r.loreLegal || !r.objectivesReachable);
  const winRate = results.length ? wins.length / results.length : 0;

  const loseReasons = {
    hp: losses.filter((r) => r.loseReason === 'hp').length,
    energy: losses.filter((r) => r.loseReason === 'energy').length,
    storm: losses.filter((r) => r.loseReason === 'storm').length,
    stuck: losses.filter((r) => r.loseReason === 'stuck').length,
  };

  return {
    seeds: results.length,
    wins: wins.length,
    losses: losses.length,
    crashes: crashes.length,
    illegal: illegal.length,
    winRate,
    loseReasons,
    allReachable: results.every((r) => r.objectivesReachable),
    noCrashes: crashes.length === 0,
    allLegal: illegal.length === 0,
    avgTurnsWins:
      wins.length === 0 ? 0 : wins.reduce((s, r) => s + r.turns, 0) / wins.length,
    avgSectorLosses:
      losses.length === 0
        ? 0
        : losses.reduce((s, r) => s + r.sectorReached, 0) / losses.length,
  };
}
