/**
 * Headless playtest harness.
 * Usage: tsx scripts/playtest.ts [--smoke]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FULL_SEEDS,
  SMOKE_SEEDS,
  WIN_RATE_MAX,
  WIN_RATE_MIN,
  runSeed,
  summarize,
  type SeedReport,
} from '../tests/harness';

const smoke = process.argv.includes('--smoke');
const seeds = smoke ? [...SMOKE_SEEDS] : [...FULL_SEEDS];

function main(): void {
  const results: SeedReport[] = [];
  for (const seed of seeds) {
    const r = runSeed(seed, smoke ? 5000 : 10000);
    results.push(r);
    const tag =
      r.crash ? 'CRASH' :
      r.status === 'won' ? 'WIN' :
      r.stuck ? 'STUCK' :
      `LOSE(${r.loseReason})`;
    console.log(
      `seed=${seed} ${tag} turns=${r.turns} actions=${r.actions} sector=${r.sectorReached} reachable=${r.objectivesReachable} winLegal=${r.winLegal} loreLegal=${r.loreLegal}`,
    );
  }

  const summary = summarize(results);
  const report = {
    mode: smoke ? 'smoke' : 'full',
    generatedAt: new Date().toISOString(),
    summary,
    results,
  };

  const outPath = resolve(process.cwd(), 'playtest-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(
    `Summary: ${summary.wins}/${summary.seeds} wins (${(summary.winRate * 100).toFixed(0)}%), ${summary.crashes} crashes, illegal=${summary.illegal}, allReachable=${summary.allReachable}`,
  );

  if (summary.crashes > 0) {
    process.exitCode = 1;
    console.error('FAIL: crashes detected');
  } else if (!summary.allReachable) {
    process.exitCode = 1;
    console.error('FAIL: objectives not reachable for some seeds');
  } else if (summary.illegal > 0) {
    process.exitCode = 1;
    console.error('FAIL: illegal win/lore order');
  } else if (!smoke && (summary.winRate < WIN_RATE_MIN || summary.winRate > WIN_RATE_MAX)) {
    process.exitCode = 1;
    console.error(
      `FAIL: win rate ${(summary.winRate * 100).toFixed(0)}% outside target band ${WIN_RATE_MIN * 100}–${WIN_RATE_MAX * 100}%`,
    );
  } else {
    console.log('PASS');
  }
}

main();
