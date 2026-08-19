/**
 * Where runs die, and where Power actually goes.
 *
 * `probe-wr` reports the lose mix but not its shape: an energy loss that stalled
 * at sector 5 and one that came up two sectors short are the same line of
 * output and completely different problems. This splits each channel by how far
 * up the spine it happened and charges every turn to the sector it was spent
 * in, so a Power shortfall can be traced to the sector eating the reserve.
 *
 * Usage: `npx tsx scripts/probe-loss.ts [seedCount]`
 */
import { PERSONAS, runAutopilot } from '../src/ai/autopilot';
import { CAMPAIGN_LENGTH } from '../src/campaign/spine';
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
console.log(`win turns: median ${median(wins.map((r) => r.turns))}`);

const channels = [...new Set(losses.map((r) => r.loseReason))].sort();
for (const channel of channels) {
  const hit = losses.filter((r) => r.loseReason === channel);
  const hist: Record<number, number> = {};
  for (const r of hit) hist[r.sectorReached] = (hist[r.sectorReached] ?? 0) + 1;
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

const energyLosers = losses.filter((r) => r.loseReason === 'energy');
const costIn = (set: Run[], i: number) =>
  median(set.map((r) => r.cost[i]).filter((n): n is number => n !== undefined));

console.log('\nsector dwell (median turns | won vs energy-lost):');
let cumWon = 0;
let cumEnergy = 0;
for (let i = 0; i < CAMPAIGN_LENGTH; i++) {
  const won = costIn(wins, i);
  const lost = costIn(energyLosers, i);
  cumWon += won;
  cumEnergy += lost;
  console.log(
    `  ${String(i).padStart(2)} ${getSector(i).id.padEnd(10)} ` +
      `won ${String(won).padStart(5)} cum ${String(cumWon).padStart(5)}   ` +
      `energy ${String(lost).padStart(5)} cum ${String(cumEnergy).padStart(5)}   ` +
      `+${(lost - won).toFixed(1)}`,
  );
}
console.log(`\nmedian full-spine cost: won ${cumWon} · energy-lost ${cumEnergy}`);

const worstHist: Record<number, number> = {};
const worstCost: number[] = [];
for (const r of energyLosers) {
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
  `\nenergy losses by worst single sector (median worst = ${median(worstCost)} turns):`,
);
console.log(
  '  ' +
    Object.entries(worstHist)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${getSector(Number(k)).id}=${v}`)
      .join(' '),
);
