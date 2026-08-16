/**
 * Where runs die, and where the Window actually goes.
 *
 * `probe-wr` reports the lose mix but not its shape: a storm loss that stalled
 * at sector 5 and one that came up two sectors short are the same line of
 * output and completely different problems. This splits each channel by how far
 * up the spine it happened and charges every turn to the sector it was spent
 * in, so a Window shortfall can be traced to the sector eating the clock.
 *
 * Usage: `npx tsx scripts/probe-loss.ts [seedCount]`
 */
import { PERSONAS, runAutopilot } from '../src/ai/autopilot';
import { CAMPAIGN_LENGTH, STORM_TURNS } from '../src/campaign/spine';
import { getSector } from '../src/data/encounters';
import { createGame } from '../src/sim';

const count = Number(process.argv[2] ?? 200);
const seeds = Array.from({ length: count }, (_, i) => 1000 + i * 7);

interface Run {
  status: string;
  loseReason: string;
  turns: number;
  sectorReached: number;
  /** Turns spent inside each sector index. */
  cost: number[];
}

const runs: Run[] = [];

for (const seed of seeds) {
  const state = createGame(seed);
  const cost: number[] = [];
  let sector = state.sectorIndex;
  let entryTurn = state.turn;

  const result = runAutopilot(state, 10000, {
    persona: PERSONAS.stable,
    onStep: (s) => {
      if (s.sectorIndex === sector) return;
      cost[sector] = (cost[sector] ?? 0) + (s.turn - entryTurn);
      sector = s.sectorIndex;
      entryTurn = s.turn;
    },
  });
  const end = result.state;
  cost[sector] = (cost[sector] ?? 0) + (end.turn - entryTurn);

  const stuck = result.stuck && end.status === 'playing';
  runs.push({
    status: stuck ? 'lost' : end.status,
    loseReason: stuck ? 'stuck' : (end.loseReason ?? ''),
    turns: end.turn,
    sectorReached: end.sectorIndex,
    cost,
  });
}

const wins = runs.filter((r) => r.status === 'won');
const losses = runs.filter((r) => r.status === 'lost');

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

console.log(
  `${wins.length}/${runs.length} wins = ${((wins.length / runs.length) * 100).toFixed(1)}%`,
);
console.log(
  `win turns: median ${median(wins.map((r) => r.turns))} of ${STORM_TURNS} window`,
);

// Each channel split by spine progress — same count, very different diagnosis.
const channels = [...new Set(losses.map((r) => r.loseReason))].sort();
for (const channel of channels) {
  const hit = losses.filter((r) => r.loseReason === channel);
  const hist: Record<number, number> = {};
  for (const r of hit) hist[r.sectorReached] = (hist[r.sectorReached] ?? 0) + 1;
  // Turns burned in the sector the run died in: a short stay is a run that got
  // overwhelmed, a long one is a run that could not finish what it arrived to do.
  const lastStay = median(hit.map((r) => r.cost[r.sectorReached] ?? 0));
  console.log(
    `\n${channel}=${hit.length} (${((hit.length / runs.length) * 100).toFixed(1)}% of runs) ` +
      `median sector ${median(hit.map((r) => r.sectorReached))} ` +
      `· median ${lastStay} turns in the sector it died in`,
  );
  console.log(
    '  by sector reached: ' +
      Object.entries(hist)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([k, v]) => `${k}:${getSector(Number(k)).id}=${v}`)
        .join(' '),
  );
}

// Turn cost per sector, counting only runs that actually entered it, so late
// sectors are not averaged down by the runs that never arrived. Winners and
// storm losers are split: a gap concentrated in one row is a sector to retune,
// a gap spread across every row is global pace variance.
const stormLosers = losses.filter((r) => r.loseReason === 'storm');
const costIn = (set: Run[], i: number) =>
  median(set.map((r) => r.cost[i]).filter((n): n is number => n !== undefined));

console.log('\nwindow spend per sector (median turns | won vs storm-lost):');
let cumWon = 0;
let cumStorm = 0;
for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
  const won = costIn(wins, i);
  const lost = costIn(stormLosers, i);
  cumWon += won;
  cumStorm += lost;
  console.log(
    `  ${String(i).padStart(2)} ${getSector(i).id.padEnd(10)} ` +
      `won ${String(won).padStart(5)} cum ${String(cumWon).padStart(5)}   ` +
      `storm ${String(lost).padStart(5)} cum ${String(cumStorm).padStart(5)}   ` +
      `+${(lost - won).toFixed(1)}`,
  );
}
console.log(
  `\nmedian full-spine cost: won ${cumWon} · storm-lost ${cumStorm} vs ${STORM_TURNS} window`,
);

// Medians hide the runs that lost the Window in one place, so charge each
// storm loss to its single most expensive sector.
const worstHist: Record<number, number> = {};
const worstCost: number[] = [];
for (const r of stormLosers) {
  let worst = 0;
  let at = 0;
  r.cost.forEach((turns, i) => {
    if (turns > worst) {
      worst = turns;
      at = i;
    }
  });
  worstHist[at] = (worstHist[at] ?? 0) + 1;
  worstCost.push(worst);
}
console.log(
  `\nstorm losses by worst single sector (median worst = ${median(worstCost)} turns):`,
);
console.log(
  '  ' +
    Object.entries(worstHist)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${getSector(Number(k)).id}=${v}`)
      .join(' '),
);
