import Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { emAggroBonus } from '../../sim/emStress';
import { inShadow, isLit } from '../../sim/light';
import { hasScar, hasStatus, scarStabilized } from '../../sim/status';
import { shadowboundDarkAggro } from '../../sim/brands';
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
  /** Wander / swell awareness — dashed brackets, not chase telegraph. */
  neutralNotice: boolean;
};

function silenced(state: GameState, enemy: Enemy): boolean {
  if (state.player.jammerTurns <= 0) return false;
  const kind = enemy.kind;
  return kind === 'mite' || kind === 'wasp' || kind === 'reef_skitter';
}

/** Aggro radius as if the player stood on (px, py) — mirrors effectiveAggro light/stance terms. */
export function effectiveAggroAt(
  state: GameState,
  enemy: Enemy,
  px: number,
  py: number,
): number {
  const def = ENEMIES[enemy.kind];
  let r = def.aggroRange;
  if (
    enemy.kind === 'mite' ||
    enemy.kind === 'wasp' ||
    enemy.kind === 'mastling' ||
    enemy.kind === 'reef_skitter'
  ) {
    r += emAggroBonus(state);
  }
  if (state.sectorId === 'vault' && state.lootTakenThisSector && !state.paddMods.quietVault) {
    if (def.behavior === 'sentinel' || def.behavior === 'guard') r += 2;
  }
  if (hasStatus(state.player, 'marked')) r += 2;
  if (state.player.jammerTurns > 0) {
    const shrink =
      hasScar(state, 'hunter_eye') && !scarStabilized(state, 'hunter_eye') ? 2 : 3;
    r = Math.max(1, r - shrink);
  }
  if (def.lightPrefer) {
    const lit = isLit(state, px, py);
    const dark = inShadow(state, px, py);
    if (def.lightPrefer === 'dark') {
      if (lit) r = Math.max(1, r - 2);
      else if (dark) r += 1;
    } else if (def.lightPrefer === 'lit') {
      if (lit) r += 2;
      else if (dark) r = Math.max(1, r - 1);
    }
    if (lit && state.ionFrontTurns > 0 && def.lightPrefer === 'lit') r += 1;
  }
  r += shadowboundDarkAggro(enemy, inShadow(state, px, py));
  return r;
}

/** Whether fauna would notice / engage from player tile (px, py) — mirrors ai.ts gates. */
export function wouldNoticeEnemy(
  st: GameState,
  enemy: Enemy,
  px: number,
  py: number,
): boolean {
  const dist = manhattan(enemy.x, enemy.y, px, py);
  const aggro = effectiveAggroAt(st, enemy, px, py);
  const def = ENEMIES[enemy.kind];
  const inFov = st.visible[enemy.y]?.[enemy.x] ?? false;

  switch (def.behavior) {
    case 'ambush':
      if (!enemy.alerted) {
        const playerDark = inShadow(st, px, py);
        return dist <= 1 || inFov || (playerDark && dist <= aggro);
      }
      return dist <= aggro;
    case 'guard':
      return (
        st.lootTakenThisSector || dist <= 2 || (enemy.alerted && dist <= aggro)
      );
    case 'sentinel':
      return dist <= aggro;
    case 'swell':
    case 'wander':
    case 'skirmish':
    case 'drain':
    case 'hunter':
      return dist <= aggro;
    default:
      return dist <= aggro;
  }
}

function isNeutralNotice(enemy: Enemy): boolean {
  const def = ENEMIES[enemy.kind];
  if (def.behavior === 'swell') return enemy.swellTurns < 2;
  if (def.behavior === 'wander') return true;
  return false;
}

/** Wake footprint if the player stood on (px, py). Used for live tile and move preview. */
export function wakeTellsAt(st: GameState, px: number, py: number): WakeTell[] {
  const ranked: { tell: WakeTell; dist: number }[] = [];

  for (const en of st.enemies) {
    if (!en.alive) continue;
    if (!(st.visible[en.y]?.[en.x] ?? false)) continue;
    if (silenced(st, en)) continue;

    const dist = manhattan(en.x, en.y, px, py);
    const aggro = effectiveAggroAt(st, en, px, py);
    if (!wouldNoticeEnemy(st, en, px, py)) continue;

    const def = ENEMIES[en.kind];
    const lit = isLit(st, px, py);
    const dark = inShadow(st, px, py);
    ranked.push({
      tell: {
        id: en.id,
        ex: en.x,
        ey: en.y,
        litBoost: def.lightPrefer === 'lit' && lit,
        darkBoost: def.lightPrefer === 'dark' && dark,
        neutralNotice: isNeutralNotice(en),
      },
      dist,
    });
  }

  ranked.sort((a, b) => a.dist - b.dist);
  return ranked.slice(0, MAX_WAKE_TELLS).map((r) => r.tell);
}

/** Visible enemies within notice range at the player's current tile. */
export function collectWakeTells(st: GameState): WakeTell[] {
  return wakeTellsAt(st, st.player.x, st.player.y);
}

/** Visual language for wake lines — live feet vs Shift-peek dest must dual-read. */
export type WakeTellLayer = 'live' | 'liveUnderPeek' | 'peek';

export type WakeTellDrawOpts = {
  tileDraw?: number;
  /** Line origin tile — player tile or queued destination. */
  originX?: number;
  originY?: number;
  /** Ground ring at the step being previewed. */
  previewDest?: { x: number; y: number };
  /** Live vs peek weight — default live. */
  layer?: WakeTellLayer;
  /** Skip clear so live + peek can composite in one frame. */
  clear?: boolean;
  /** Notice Impact — thicken/flash these tell ids for one beat. */
  impactIds?: ReadonlySet<number>;
  /** 0..1 Impact pulse strength (from scene timer). */
  impactPulse?: number;
};

function drawCornerBrackets(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  half: number,
  color: number,
  alpha: number,
  lineWidth = 1,
): void {
  const len = half * 0.55;
  g.lineStyle(lineWidth, color, alpha);
  for (const [sx, sy, ex, ey] of [
    [-half, -half, -half + len, -half],
    [-half, -half, -half, -half + len],
    [half, -half, half - len, -half],
    [half, -half, half, -half + len],
    [-half, half, -half + len, half],
    [-half, half, -half, half - len],
    [half, half, half - len, half],
    [half, half, half, half - len],
  ]) {
    g.beginPath();
    g.moveTo(cx + sx, cy + sy);
    g.lineTo(cx + ex, cy + ey);
    g.strokePath();
  }
}

function drawDashedLine(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number,
  alpha: number,
  lineWidth: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const dash = 5;
  const gap = 4;
  let t = 0;
  let draw = true;
  while (t < len) {
    const seg = Math.min(draw ? dash : gap, len - t);
    if (draw) {
      g.lineStyle(lineWidth, color, alpha);
      g.beginPath();
      g.moveTo(x0 + ux * t, y0 + uy * t);
      g.lineTo(x0 + ux * (t + seg), y0 + uy * (t + seg));
      g.strokePath();
    }
    t += seg;
    draw = !draw;
  }
}

/** Thin notice lines + pulse rings — live state or queued-step preview. */
export function drawWakeTells(
  g: Phaser.GameObjects.Graphics,
  st: GameState,
  tells: WakeTell[],
  animFrame: number,
  opts: WakeTellDrawOpts = {},
): void {
  if (opts.clear !== false) g.clear();
  const tileDraw = opts.tileDraw ?? TILE_DRAW;
  const layer: WakeTellLayer = opts.layer ?? 'live';
  const ox = opts.originX ?? st.player.x;
  const oy = opts.originY ?? st.player.y;
  const px = ox * tileDraw + tileDraw / 2;
  const py = oy * tileDraw + tileDraw / 2;
  const pulse = 0.55 + (animFrame % 4) * 0.12;
  const impactIds = opts.impactIds;
  const impactPulse = opts.impactPulse ?? 0;

  if (opts.previewDest && layer === 'peek') {
    const dx = opts.previewDest.x * tileDraw + tileDraw / 2;
    const dy = opts.previewDest.y * tileDraw + tileDraw / 2;
    const destLit = isLit(st, opts.previewDest.x, opts.previewDest.y);
    const ringColor = destLit ? LightTemp.lamp : Theme.tape;
    // Peek dest ring — heavier than live language so quiet-shrink is readable.
    g.lineStyle(3, ringColor, 0.55 * pulse);
    g.strokeCircle(dx, dy, tileDraw * 0.44);
    g.lineStyle(1, ringColor, 0.28);
    g.strokeCircle(dx, dy, tileDraw * 0.56);
  }

  for (const t of tells) {
    const ex = t.ex * tileDraw + tileDraw / 2;
    const ey = t.ey * tileDraw + tileDraw / 2;
    const impacting = impactIds?.has(t.id) && impactPulse > 0;

    let color: number;
    let alpha: number;
    let lineWidth: number;

    if (layer === 'liveUnderPeek') {
      // Dim dashed presence at feet while peek owns the solid telegraph.
      color = Theme.inkMute;
      alpha = 0.22;
      lineWidth = 1;
    } else if (layer === 'peek') {
      color = t.litBoost
        ? LightTemp.lamp
        : t.darkBoost
          ? Theme.biolum
          : Theme.tape;
      alpha = t.litBoost || t.darkBoost ? 0.92 : t.neutralNotice ? 0.48 : 0.72;
      lineWidth = 2;
    } else {
      color = t.litBoost ? LightTemp.lamp : t.darkBoost ? Theme.biolumDeep : Theme.scanWash;
      alpha = t.litBoost || t.darkBoost ? 0.78 : t.neutralNotice ? 0.32 : 0.48;
      lineWidth = 1;
    }

    if (impacting) {
      color = Theme.rust;
      alpha = Math.min(1, alpha + 0.35 * impactPulse);
      lineWidth = Math.max(lineWidth, 2) + (impactPulse > 0.5 ? 1 : 0);
    }

    if (layer === 'liveUnderPeek') {
      drawDashedLine(g, px, py, ex, ey, color, alpha * pulse, lineWidth);
    } else {
      g.lineStyle(lineWidth, color, alpha * 0.55 * pulse);
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(ex, ey);
      g.strokePath();
    }

    const r = tileDraw * (layer === 'peek' ? 0.4 : 0.36);
    const ringAlpha = alpha * pulse * (impacting ? 1.15 : 1);
    if (t.neutralNotice && !impacting) {
      drawCornerBrackets(g, ex, ey, r, color, ringAlpha, lineWidth);
    } else {
      g.lineStyle(impacting ? 2 : lineWidth, color, ringAlpha);
      g.strokeCircle(ex, ey, r * (impacting ? 1 + 0.18 * impactPulse : 1));
      g.lineStyle(1, color, ringAlpha * 0.35);
      g.strokeCircle(ex, ey, r + 3 + (impacting ? 4 * impactPulse : 0));
    }
  }
}
