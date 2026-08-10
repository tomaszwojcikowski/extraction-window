/**
 * Win-rate probe over an arbitrary seed count.
 *
 * The gate seed sets are small enough that a real balance move and a run of bad
 * luck look identical — an 8-seed smoke run swings ±20 points on noise alone.
 * This exists to answer "did that change the game or the dice" before spending
 * a tuning pass on the wrong one.
 *
 * Usage: `npx tsx scripts/probe-wr.ts [seedCount]`
 */
import { runSeed } from '../tests/harness';

const count = Number(process.argv[2] ?? 200);
const seeds = Array.from({ length: count }, (_, i) => 1000 + i * 7);

let wins = 0;
const loseMix: Record<string, number> = {};
let turnTotal = 0;

for (const seed of seeds) {
  const r = runSeed(seed, 10000);
  if (r.status === 'won') wins++;
  else loseMix[r.loseReason ?? r.status] = (loseMix[r.loseReason ?? r.status] ?? 0) + 1;
  turnTotal += r.turns;
}

const rate = wins / seeds.length;
// Binomial standard error, so the report says how much of the number to trust.
const stderr = Math.sqrt((rate * (1 - rate)) / seeds.length);
console.log(
  `${wins}/${seeds.length} wins = ${(rate * 100).toFixed(1)}% ±${(stderr * 196).toFixed(1)} (95%)`,
);
console.log(`avg turns ${(turnTotal / seeds.length).toFixed(0)}`);
console.log(
  'lose mix: ' +
    Object.entries(loseMix)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(' '),
);
