import Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { wouldNoticeEnemy } from '../../sim/notice';
import { manhattan } from '../../sim/spatial';
import { Theme } from '../../scenes/theme';
import type { GameState } from '../../sim/types';

/** Cap live rings so dense packs stay readable. */
export const MAX_WAKE_TELLS = 8;

export type WakeTellKind = 'lit' | 'dark' | 'neutral';

export type WakeTell = {
  enemyId: number;
  ex: number;
  ey: number;
  kind: WakeTellKind;
};

const KIND_COLOR: Record<WakeTellKind, number> = {
  lit: Theme.tape,
  dark: Theme.biolumDeep,
  neutral: Theme.scanWash,
};

function tellKind(enemyKind: keyof typeof ENEMIES): WakeTellKind {
  const prefer = ENEMIES[enemyKind].lightPrefer;
  if (prefer === 'lit') return 'lit';
  if (prefer === 'dark') return 'dark';
  return 'neutral';
}

/** Notice footprint as if the player stood on (px, py) — mirrors sim engage gates. */
export function collectWakeTells(
  st: GameState,
  px: number,
  py: number,
  max = MAX_WAKE_TELLS,
): WakeTell[] {
  const ranked: Array<WakeTell & { dist: number }> = [];
  for (const en of st.enemies) {
    if (!en.alive) continue;
    if (!(st.visible[en.y]?.[en.x] ?? false)) continue;
    if (!wouldNoticeEnemy(st, en, px, py)) continue;
    ranked.push({
      enemyId: en.id,
      ex: en.x,
      ey: en.y,
      kind: tellKind(en.kind),
      dist: manhattan(en.x, en.y, px, py),
    });
  }
  ranked.sort((a, b) => a.dist - b.dist);
  return ranked.slice(0, max).map(({ dist: _d, ...tell }) => tell);
}

/** Alias for preview-at-destination math (same predicate path as live tells). */
export function wakeTellsAt(st: GameState, px: number, py: number): WakeTell[] {
  return collectWakeTells(st, px, py);
}

/** Paint notice lines + rings on the threat layer (caller must not clear first). */
export function drawWakeTells(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  px: number,
  py: number,
  animFrame: number,
  tileDraw: number,
): void {
  const pulse = 0.65 + (animFrame % 4) * 0.1;
  const tells = collectWakeTells(st, px, py);
  const fromX = px * tileDraw + tileDraw / 2;
  const fromY = py * tileDraw + tileDraw / 2;

  for (const tell of tells) {
    const color = KIND_COLOR[tell.kind];
    const toX = tell.ex * tileDraw + tileDraw / 2;
    const toY = tell.ey * tileDraw + tileDraw / 2;
    const onFeet = tell.ex === px && tell.ey === py;

    g.lineStyle(1, color, 0.42 * pulse);
    g.beginPath();
    g.moveTo(fromX, fromY);
    g.lineTo(toX, toY);
    g.strokePath();

    const r = tileDraw * (0.34 + 0.06 * pulse);
    g.lineStyle(onFeet ? 2 : 1, color, (onFeet ? 0.95 : 0.72) * pulse);
    g.strokeCircle(toX, toY, r);
    g.lineStyle(1, color, 0.35 * pulse);
    g.strokeCircle(toX, toY, r + 3);
  }
}
