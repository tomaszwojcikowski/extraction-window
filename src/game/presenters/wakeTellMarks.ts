import { ENEMIES } from '../../data/enemies';
import { wouldNoticeEnemy } from '../../sim/notice';
import { manhattan } from '../../sim/spatial';
import { Theme } from '../../scenes/theme';
import type { GameState } from '../../sim/types';
import type { ShearPressureSpec } from './ShearPressure';

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

export function wakeTellColor(kind: WakeTellKind): number {
  return KIND_COLOR[kind];
}

/** Pulse weight — Breaching hits harder; Calm stays soft. */
export function wakeTellPulse(
  animFrame: number,
  shear?: Pick<ShearPressureSpec, 'state'>,
): { pulse: number; lineW: number } {
  const weight =
    shear?.state === 'Breaching' ? 1.35 : shear?.state === 'Arcing' ? 1.12 : 1;
  const lineW = shear?.state === 'Breaching' ? 2 : 1;
  const pulse = (0.65 + (animFrame % 4) * 0.1) * weight;
  return { pulse, lineW };
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
