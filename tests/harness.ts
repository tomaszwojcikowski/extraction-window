/**
 * Shared headless playtest helpers — used by scripts/playtest.ts and Vitest suites.
 */
import { CAMPAIGN_LENGTH } from '../src/campaign/spine';
import { PERSONAS, runAutopilot, type PersonaId, type StuckReason } from '../src/ai/autopilot';
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

/**
 * Band-gate seed set.
 *
 * `FULL_SEEDS` is 30 hand-picked numbers, which is ±18 points of sampling error
 * — wide enough that the suite reported green at a true 52.6% win rate. These
 * are generated instead of chosen so no seed can be quietly swapped for a
 * friendlier one, and there are enough of them to resolve the 55–85% band.
 * The offset is deliberately different from `scripts/probe-wr.ts` so that probe
 * stays a held-out measurement rather than a second look at the same runs.
 */
export const GATE_SEEDS = Array.from({ length: 300 }, (_, i) => 50_000 + i * 13);

/** Target autopilot win-rate band (PLAN.md). */
export const WIN_RATE_MIN = 0.55;
export const WIN_RATE_MAX = 0.85;

export interface SeedReport {
  seed: number;
  persona: PersonaId;
  status: string;
  loseReason: string | null;
  turns: number;
  actions: number;
  sectorReached: number;
  stuck: boolean;
  /** Which give-up path fired: wedged in place, no legal action, or ran out of budget. */
  stuckReason: StuckReason | null;
  winLegal: boolean;
  loreLegal: boolean;
  objectivesReachable: boolean;
  crash: string | null;
  hasNavCoreAtEnd: boolean;
  level: number;
  /** Highest scan pressure reached — how hard this run leaned on probing. */
  emPeak: number;
  salvageIdentified: number;
  salvageBacklash: number;
  skills: string[];
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

export function runSeed(
  seed: number,
  maxActions = 10000,
  persona: PersonaId = 'stable',
): SeedReport {
  try {
    const objectivesReachable = checkObjectivesReachable(seed);
    const state = createGame(seed);
    let emPeak = state.emStress;
    const {
      state: end,
      actions,
      stuck,
      stuckReason,
    } = runAutopilot(state, maxActions, {
      persona: PERSONAS[persona],
      onStep: (s) => {
        if (s.emStress > emPeak) emPeak = s.emStress;
      },
    });

    if (stuck && end.status === 'playing') {
      end.status = 'lost';
      end.loseReason = 'stuck';
    }

    const winLegal = end.status !== 'won' || assertLegalWin(end);
    const loreLegal = loreOrderLegal(end.loreEvents);

    return {
      seed,
      persona,
      status: end.status,
      loseReason: end.loseReason,
      turns: end.turn,
      actions,
      sectorReached: end.sectorIndex,
      stuck,
      stuckReason,
      winLegal,
      loreLegal,
      objectivesReachable,
      crash: null,
      hasNavCoreAtEnd: end.objectives.hasNavCore,
      level: end.level,
      emPeak,
      salvageIdentified: end.salvageIdentified,
      salvageBacklash: end.salvageBacklash,
      skills: [...end.skills],
    };
  } catch (e) {
    return {
      seed,
      persona,
      status: 'crash',
      loseReason: null,
      turns: 0,
      actions: 0,
      sectorReached: 0,
      stuck: false,
      stuckReason: null,
      winLegal: false,
      loreLegal: false,
      objectivesReachable: false,
      crash: e instanceof Error ? e.message : String(e),
      hasNavCoreAtEnd: false,
      level: 1,
      emPeak: 0,
      salvageIdentified: 0,
      salvageBacklash: 0,
      skills: [],
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

  const channels = Object.values(loseReasons).filter((n) => n > 0);
  const avg = (pick: (r: SeedReport) => number) =>
    results.length === 0 ? 0 : results.reduce((s, r) => s + pick(r), 0) / results.length;

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
    /**
     * Death-mix diversity (GEM §2): how many lose channels fired, and how much of
     * the mix the biggest one owns. One channel over ~0.7 means the mastery paths
     * have collapsed into a single curve — retune before adding content.
     */
    loseChannels: channels.length,
    dominantLoseShare:
      losses.length === 0 ? 0 : Math.max(0, ...channels) / losses.length,
    stuckReasons: {
      idle: results.filter((r) => r.stuckReason === 'idle').length,
      noAction: results.filter((r) => r.stuckReason === 'no_action').length,
      actionCap: results.filter((r) => r.stuckReason === 'action_cap').length,
    },
    avgEmPeak: avg((r) => r.emPeak),
    maxEmPeak: results.length === 0 ? 0 : Math.max(...results.map((r) => r.emPeak)),
    avgIdentified: avg((r) => r.salvageIdentified),
    avgBacklash: avg((r) => r.salvageBacklash),
    skillPicks: results
      .flatMap((r) => r.skills)
      .reduce<Record<string, number>>((acc, s) => {
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}),
  };
}
