import Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { effectiveAggro } from '../../sim/ai';
import { inShadow, isLit } from '../../sim/light';
import { manhattan } from '../../sim/spatial';
import { LightTemp, Theme } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';
import type { Enemy, GameState } from '../../sim/types';

export const MAX_WAKE_TELLS = 8;

export type WakeTell = {
  id: number;
  ex: number;
  ey: number;
  /** Lit-prefer fauna hunting your lamp footprint. */
  litBoost: boolean;
  /** Dark-prefer fauna keyed to shadow tiles. */
  darkBoost: boolean;
};

function silenced(state: GameState, enemy: Enemy): boolean {
  if (state.player.jammerTurns <= 0) return false;
  const kind = enemy.kind;
  return kind === 'mite' || kind === 'wasp' || kind === 'reef_skitter';
}

/** Visible enemies within notice range given current light + stance (presentation mirror of aggro). */
export function collectWakeTells(st: GameState): WakeTell[] {
  const px = st.player.x;
  const py = st.player.y;
  const ranked: { tell: WakeTell; dist: number }[] = [];

  for (const en of st.enemies) {
    if (!en.alive) continue;
    if (!(st.visible[en.y]?.[en.x] ?? false)) continue;
    if (silenced(st, en)) continue;

    const dist = manhattan(en.x, en.y, px, py);
    const aggro = effectiveAggro(st, en);
    const def = ENEMIES[en.kind];

    let inNotice = false;
    if (def.behavior === 'ambush' && !en.alerted) {
      const playerDark = inShadow(st, px, py);
      const inFov = st.visible[en.y]?.[en.x] ?? false;
      inNotice = dist <= 1 || inFov || (playerDark && dist <= aggro);
    } else {
      inNotice = dist <= aggro;
    }
    if (!inNotice) continue;

    const lit = isLit(st, px, py);
    const dark = inShadow(st, px, py);
    ranked.push({
      tell: {
        id: en.id,
        ex: en.x,
        ey: en.y,
        litBoost: def.lightPrefer === 'lit' && lit,
        darkBoost: def.lightPrefer === 'dark' && dark,
      },
      dist,
    });
  }

  ranked.sort((a, b) => a.dist - b.dist);
  return ranked.slice(0, MAX_WAKE_TELLS).map((r) => r.tell);
}

/** Thin notice lines + pulse rings — the wake before you commit. */
export function drawWakeTells(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  tells: WakeTell[],
  animFrame: number,
  tileDraw: number = TILE_DRAW,
): void {
  g.clear();
  if (tells.length === 0) return;

  const px = st.player.x * tileDraw + tileDraw / 2;
  const py = st.player.y * tileDraw + tileDraw / 2;
  const pulse = 0.55 + (animFrame % 4) * 0.12;

  for (const t of tells) {
    const ex = t.ex * tileDraw + tileDraw / 2;
    const ey = t.ey * tileDraw + tileDraw / 2;
    const color = t.litBoost ? LightTemp.lamp : t.darkBoost ? Theme.biolumDeep : Theme.scanWash;
    const alpha = t.litBoost || t.darkBoost ? 0.78 : 0.48;

    g.lineStyle(1, color, alpha * 0.5 * pulse);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(ex, ey);
    g.strokePath();

    const r = tileDraw * 0.36;
    g.lineStyle(1, color, alpha * pulse);
    g.strokeCircle(ex, ey, r);
    g.lineStyle(1, color, alpha * 0.32);
    g.strokeCircle(ex, ey, r + 3);
  }
}
