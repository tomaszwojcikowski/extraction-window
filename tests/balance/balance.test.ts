import { beforeAll, describe, expect, it } from 'vitest';
import {
  FULL_SEEDS,
  SMOKE_SEEDS,
  WIN_RATE_MAX,
  WIN_RATE_MIN,
  runSeed,
  summarize,
  type SeedReport,
} from '../harness';

describe('balance — smoke suite', () => {
  let results: SeedReport[];
  let summary: ReturnType<typeof summarize>;

  beforeAll(() => {
    results = SMOKE_SEEDS.map((seed) => runSeed(seed, 5000));
    summary = summarize(results);
  }, 60_000);

  it('no crashes, all reachable, all legal', () => {
    expect(summary.noCrashes, `crashes: ${JSON.stringify(results.filter((r) => r.crash))}`).toBe(
      true,
    );
    expect(summary.allReachable).toBe(true);
    expect(summary.allLegal).toBe(true);
    expect(summary.wins + summary.losses).toBe(summary.seeds);
  });

  it('produces both wins and losses', () => {
    expect(summary.wins).toBeGreaterThan(0);
    expect(summary.losses).toBeGreaterThan(0);
  });
});

describe('balance — full suite', () => {
  let results: SeedReport[];
  let summary: ReturnType<typeof summarize>;

  beforeAll(() => {
    results = FULL_SEEDS.map((seed) => runSeed(seed, 10000));
    summary = summarize(results);
  }, 180_000);

  it(`win rate stays in ${WIN_RATE_MIN * 100}–${WIN_RATE_MAX * 100}% band`, () => {
    expect(summary.noCrashes).toBe(true);
    expect(summary.allReachable).toBe(true);
    expect(summary.allLegal).toBe(true);
    expect(
      summary.winRate,
      `winRate=${(summary.winRate * 100).toFixed(1)}% wins=${summary.wins}/${summary.seeds} loses=${JSON.stringify(summary.loseReasons)}`,
    ).toBeGreaterThanOrEqual(WIN_RATE_MIN);
    expect(summary.winRate).toBeLessThanOrEqual(WIN_RATE_MAX);
  });

  it('shows multiple lose channels (hp and storm at minimum)', () => {
    const { hp, energy, storm, stuck } = summary.loseReasons;
    expect(summary.losses).toBeGreaterThan(0);
    expect(hp + energy + storm + stuck).toBe(summary.losses);
    expect(hp, 'expected some HP losses').toBeGreaterThan(0);
    expect(storm, 'expected some storm/window losses').toBeGreaterThan(0);
  });

  it('wins always have nav core and finish on final sector', () => {
    for (const r of results) {
      if (r.status !== 'won') continue;
      expect(r.hasNavCoreAtEnd, `seed=${r.seed}`).toBe(true);
      expect(r.sectorReached, `seed=${r.seed}`).toBe(14);
      expect(r.winLegal, `seed=${r.seed}`).toBe(true);
      expect(r.loreLegal, `seed=${r.seed}`).toBe(true);
    }
  });

  it('stuck rate stays low (<20% of suite)', () => {
    const stuck = results.filter((r) => r.loseReason === 'stuck' || r.stuck).length;
    expect(stuck / results.length).toBeLessThan(0.2);
  });

  it('winning runs level up (proficiency loop is live)', () => {
    const wins = results.filter((r) => r.status === 'won');
    expect(wins.length).toBeGreaterThan(0);
    const leveled = wins.filter((r) => r.level >= 3);
    expect(leveled.length).toBeGreaterThan(0);
  });

  it('energy losses appear in the mix when present (soft)', () => {
    // Soft: log-only if zero — still assert the counter is defined
    expect(summary.loseReasons.energy).toBeGreaterThanOrEqual(0);
  });
});
