/**
 * Headless playtest harness.
 * Usage: tsx scripts/playtest.ts [--smoke] [--personas]
 *
 * `--personas` sweeps the reporting personas over the smoke seeds to show whether
 * the mastery paths fail differently (GEM §2). It never gates: only the calibrated
 * `stable` policy owns the win-rate band.
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
import type { PersonaId } from '../src/ai/autopilot';

const smoke = process.argv.includes('--smoke');
const personaSweep = process.argv.includes('--personas');
const seeds = smoke ? [...SMOKE_SEEDS] : [...FULL_SEEDS];

const SWEEP_PERSONAS: PersonaId[] = ['stable', 'quiet', 'probe', 'reckless'];

/** Report-only: which channel kills each doctrine, and what pressure it pays. */
function sweepPersonas(): void {
  console.log(`Persona sweep over ${seeds.length} seeds (report only, not a gate)\n`);
  for (const persona of SWEEP_PERSONAS) {
    const results = seeds.map((seed) => runSeed(seed, smoke ? 5000 : 10000, persona));
    const s = summarize(results);
    const lose = s.loseReasons;
    console.log(
      `${persona.padEnd(9)} WR ${(s.winRate * 100).toFixed(0).padStart(3)}%  ` +
        `hp=${lose.hp} energy=${lose.energy} stuck=${lose.stuck}  ` +
        `dominant=${(s.dominantLoseShare * 100).toFixed(0)}%  ` +
        `emPeak avg=${s.avgEmPeak.toFixed(0)} max=${s.maxEmPeak}  ` +
        `ids=${s.avgIdentified.toFixed(1)}`,
    );
  }
}

function main(): void {
  if (personaSweep) {
    sweepPersonas();
    return;
  }
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
      `seed=${seed} ${tag} turns=${r.turns} actions=${r.actions} sector=${r.sectorReached} reachable=${r.objectivesReachable} winLegal=${r.winLegal} loreLegal=${r.loreLegal} emPeak=${r.emPeak} ids=${r.salvageIdentified}/${r.salvageIdentified + r.salvageBacklash}`,
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
  const lose = summary.loseReasons;
  console.log(
    `Lose mix: hp=${lose.hp} energy=${lose.energy} stuck=${lose.stuck} · channels=${summary.loseChannels} dominant=${(summary.dominantLoseShare * 100).toFixed(0)}%`,
  );
  console.log(
    `Pressure: emPeak avg=${summary.avgEmPeak.toFixed(0)} max=${summary.maxEmPeak} · ids=${summary.avgIdentified.toFixed(1)} backlash=${summary.avgBacklash.toFixed(1)}`,
  );

  // GEM §2: paths must fail differently. Reported, not gated — tuning signal only.
  if (summary.losses > 1 && summary.dominantLoseShare > 0.7) {
    console.warn(
      `WARN: one lose channel owns ${(summary.dominantLoseShare * 100).toFixed(0)}% of deaths — mastery paths may be collapsing into one curve`,
    );
  }

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
