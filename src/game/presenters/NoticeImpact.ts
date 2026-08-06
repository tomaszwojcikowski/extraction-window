import type { Enemy, GameState } from '../../sim/types';
import { wouldNoticeEnemy } from './WakeTells';

/** Pre-turn fauna snapshot for Notice Impact deltas (presentation only). */
export type NoticeSnap = {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  alerted: boolean;
  /** Would notice the player at the pre-turn player tile. */
  wouldNotice: boolean;
  visible: boolean;
  /** Jammer-silenced kinds — no live tell, no Impact. */
  silenced: boolean;
};

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/** Mirrors WakeTells jammer silence — presentation honesty only. */
export function isJammerSilenced(state: GameState, enemy: Enemy): boolean {
  if (state.player.jammerTurns <= 0) return false;
  const kind = enemy.kind;
  return kind === 'mite' || kind === 'wasp' || kind === 'reef_skitter';
}

/** Capture notice predicates before applyAction. */
export function captureNoticeSnap(state: GameState): NoticeSnap[] {
  const px = state.player.x;
  const py = state.player.y;
  return state.enemies.map((en) => {
    const silenced = en.alive && isJammerSilenced(state, en);
    return {
      id: en.id,
      x: en.x,
      y: en.y,
      alive: en.alive,
      alerted: en.alerted,
      wouldNotice:
        en.alive && !silenced ? wouldNoticeEnemy(state, en, px, py) : false,
      visible: state.visible[en.y]?.[en.x] ?? false,
      silenced,
    };
  });
}

export function enemyMovedCloser(
  prev: NoticeSnap,
  en: Pick<Enemy, 'x' | 'y'>,
  px: number,
  py: number,
): boolean {
  if (en.x === prev.x && en.y === prev.y) return false;
  return manhattan(en.x, en.y, px, py) < manhattan(prev.x, prev.y, px, py);
}

/**
 * Fauna that newly noticed / engaged this turn — honest Impact targets only.
 * Quiet/jammer-suppressed notice never punches.
 * Already-noticing fauna that keep standing still do not spam.
 */
export function noticeImpactIds(
  state: GameState,
  prev: ReadonlyArray<NoticeSnap>,
): number[] {
  const px = state.player.x;
  const py = state.player.y;
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const ids: number[] = [];

  for (const en of state.enemies) {
    if (!en.alive) continue;
    const visible = state.visible[en.y]?.[en.x] ?? false;
    if (!visible) continue;

    // Honesty: only punch fauna that would show a live wake tell.
    if (isJammerSilenced(state, en)) continue;
    if (!wouldNoticeEnemy(state, en, px, py)) continue;

    const p = prevById.get(en.id);
    if (!p || !p.alive) continue;

    const newlyNoticed = !p.wouldNotice;
    const newlyAlerted = !p.alerted && en.alerted;
    const chaseStart = p.wouldNotice && p.visible && enemyMovedCloser(p, en, px, py);

    if (newlyNoticed || newlyAlerted || chaseStart) {
      ids.push(en.id);
    }
  }

  return ids;
}
