import type { Enemy, GameState } from '../../sim/types';
import { isJammerSilenced, wouldNoticeEnemy } from '../../sim/notice';

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

export { isJammerSilenced } from '../../sim/notice';

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

function stillNoticeThreat(
  state: GameState,
  en: Enemy,
  px: number,
  py: number,
): boolean {
  if (!en.alive) return false;
  if (!(state.visible[en.y]?.[en.x] ?? false)) return false;
  if (isJammerSilenced(state, en)) return false;
  return wouldNoticeEnemy(state, en, px, py);
}

/**
 * Prune chase latches when fauna leave notice / FOV / silence.
 * Mutates `chaseLatched` in place.
 */
export function pruneNoticeChaseLatch(
  state: GameState,
  chaseLatched: Set<number>,
): void {
  const px = state.player.x;
  const py = state.player.y;
  for (const id of [...chaseLatched]) {
    const en = state.enemies.find((e) => e.id === id);
    if (!en || !stillNoticeThreat(state, en, px, py)) chaseLatched.delete(id);
  }
}

/**
 * Fauna that newly noticed / engaged this turn — honest Impact targets only.
 * Quiet/jammer-suppressed notice never punches.
 * Chase Impact latches per id until leave-notice so sustained approach is not strobe.
 */
export function noticeImpactIds(
  state: GameState,
  prev: ReadonlyArray<NoticeSnap>,
  chaseLatched: Set<number> = new Set(),
): number[] {
  const px = state.player.x;
  const py = state.player.y;
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const ids: number[] = [];

  pruneNoticeChaseLatch(state, chaseLatched);

  for (const en of state.enemies) {
    if (!stillNoticeThreat(state, en, px, py)) continue;

    const p = prevById.get(en.id);
    if (!p || !p.alive) continue;

    const newlyNoticed = !p.wouldNotice;
    const newlyAlerted = !p.alerted && en.alerted;
    const chaseEdge =
      p.wouldNotice &&
      p.visible &&
      enemyMovedCloser(p, en, px, py) &&
      !chaseLatched.has(en.id);

    if (newlyNoticed || newlyAlerted || chaseEdge) {
      ids.push(en.id);
      // Latch after any Impact so follow-up closer steps stay quiet.
      chaseLatched.add(en.id);
    }
  }

  return ids;
}
