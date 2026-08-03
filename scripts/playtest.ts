/**
 * Headless playtest harness.
 * Usage: tsx scripts/playtest.ts [--smoke]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

const smoke = process.argv.includes('--smoke');
const seeds = smoke
  ? [1, 42, 99, 12345, 777, 256, 2024, 88888]
  : [
      1, 7, 13, 42, 99, 111, 256, 333, 512, 777, 1024, 1337, 2024, 3141, 4096, 5000, 7777, 8192,
      9999, 12345, 22222, 31415, 44444, 54321, 65535, 77777, 88888, 99999, 123456, 654321,
    ];

interface SeedReport {
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
}

function checkObjectivesReachable(seed: number): boolean {
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

function runSeed(seed: number): SeedReport {
  try {
    const objectivesReachable = checkObjectivesReachable(seed);
    const state = createGame(seed);
    const { state: end, actions, stuck } = runAutopilot(state, smoke ? 5000 : 10000);

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
    };
  }
}

function main(): void {
  const results: SeedReport[] = [];
  for (const seed of seeds) {
    const r = runSeed(seed);
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

  const wins = results.filter((r) => r.status === 'won').length;
  const crashes = results.filter((r) => r.crash).length;
  const illegal = results.filter((r) => !r.winLegal || !r.loreLegal || !r.objectivesReachable).length;
  const winRate = results.length ? wins / results.length : 0;

  const report = {
    mode: smoke ? 'smoke' : 'full',
    generatedAt: new Date().toISOString(),
    summary: {
      seeds: results.length,
      wins,
      losses: results.filter((r) => r.status === 'lost').length,
      crashes,
      illegal,
      winRate,
      allReachable: results.every((r) => r.objectivesReachable),
      noCrashes: crashes === 0,
      allLegal: illegal === 0,
    },
    results,
  };

  const outPath = resolve(process.cwd(), 'playtest-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(
    `Summary: ${wins}/${results.length} wins (${(winRate * 100).toFixed(0)}%), ${crashes} crashes, illegal=${illegal}, allReachable=${report.summary.allReachable}`,
  );

  if (crashes > 0) {
    process.exitCode = 1;
    console.error('FAIL: crashes detected');
  } else if (!report.summary.allReachable) {
    process.exitCode = 1;
    console.error('FAIL: objectives not reachable for some seeds');
  } else if (illegal > 0) {
    process.exitCode = 1;
    console.error('FAIL: illegal win/lore order');
  } else if (!smoke && winRate < 0.7) {
    process.exitCode = 1;
    console.error(`FAIL: win rate ${(winRate * 100).toFixed(0)}% < 70%`);
  } else {
    console.log('PASS');
  }
}

main();
