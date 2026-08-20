import Phaser from 'phaser';
import { FONT_DATA, Theme, ThemeCss } from '../../scenes/theme';
import { TILE_DRAW, allyTextureKey, enemyTextureKey, npcTextureKey } from '../../scenes/textures';
import { activeQuestStep } from '../../sim/roomQuest';
import type { GameState } from '../../sim/types';
import { playActorDeath, type EnemyView } from './ActionFeedback';
import { npcQuestMarker, npcQuestMarkerColor } from './NpcMarkers';
import { enemyAnimFrame } from './enemyAnimFrame';

export type ActorSyncHost = {
  addImage(x: number, y: number, texture: string): Phaser.GameObjects.Image;
  addText(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text;
  entityLayer: Phaser.GameObjects.Container;
  itemLayer: Phaser.GameObjects.Container;
  tweens: Phaser.Tweens.TweenManager;
  snapImg(img: Phaser.GameObjects.Image, gx: number, gy: number): void;
  playerSprite: Phaser.GameObjects.Image;
  playerDying: boolean;
  enemyViews: Map<number, EnemyView>;
  npcViews: Map<number, EnemyView>;
  allyViews: Map<number, EnemyView>;
  goalMarker: Phaser.GameObjects.Image;
  getGoalPulseTween(): Phaser.Tweens.Tween | null;
  setGoalPulseTween(t: Phaser.Tweens.Tween | null): void;
  chevronGfx: Phaser.GameObjects.Graphics;
  optionalSiteGfx: Phaser.GameObjects.Graphics;
  tileSprites: Phaser.GameObjects.Image[][];
  camX: number;
  camY: number;
  scale: { width: number; height: number };
  topInset: number;
  bottomInset(): number;
  animFrame: number;
};

function beginActorDeath(
  host: ActorSyncHost,
  map: Map<number, EnemyView>,
  id: number,
  view: EnemyView,
): void {
  playActorDeath(host.tweens, view, () => {
    map.delete(id);
  });
}

function updateEnemyIntentLabel(
  view: EnemyView,
  enemy: GameState['enemies'][number],
): void {
  if (enemy.windup <= 0) {
    view.label.setText('');
    view.label.setVisible(false);
    return;
  }
  const marker =
    enemy.intent === 'beam'
      ? 'BEAM'
      : enemy.intent === 'overwatch'
        ? 'HOLD'
        : enemy.intent === 'pounce'
          ? 'LUNGE'
          : enemy.intent === 'reach'
            ? 'REACH'
            : enemy.intent === 'zone'
              ? 'PULSE'
              : 'WINDUP';
  const color =
    enemy.intent === 'beam'
      ? ThemeCss.arcWhite
      : enemy.intent === 'overwatch'
        ? ThemeCss.tape
        : enemy.intent === 'zone'
          ? ThemeCss.scanWash
          : ThemeCss.rust;
  view.label.setText(marker);
  view.label.setColor(color);
  view.label.setFontSize(marker.length > 4 ? 8 : 10);
  view.label.setVisible(view.img.visible);
}

function updateNpcQuestLabel(
  view: EnemyView,
  npc: GameState['npcs'][number],
  visible: boolean,
): void {
  const mark = npcQuestMarker(npc);
  if (!visible) {
    view.label.setVisible(false);
    return;
  }
  view.label.setText(mark);
  view.label.setColor(npcQuestMarkerColor(mark));
  view.label.setVisible(true);
}

function bindTexture(img: Phaser.GameObjects.Image, key: string): void {
  if (img.texture.key !== key) img.setTexture(key);
}

/** Enemy texture + windup label refresh on anim frame tick. */
export function refreshEnemyAnimFrame(host: ActorSyncHost, st: GameState): void {
  for (const en of st.enemies) {
    if (!en.alive) continue;
    const view = host.enemyViews.get(en.id);
    if (!view) continue;
    const moving = view.gx !== en.x || view.gy !== en.y;
    bindTexture(view.img, enemyTextureKey(en.kind, enemyAnimFrame(en, host.animFrame, moving)));
    updateEnemyIntentLabel(view, en);
  }
}

export function syncFieldItems(host: ActorSyncHost, st: GameState): void {
  if (host.goalMarker?.parentContainer === host.itemLayer) {
    host.itemLayer.remove(host.goalMarker, false);
  }
  host.itemLayer.removeAll(true);
  for (const item of st.items) {
    const seen = st.explored[item.y]![item.x];
    const vis = st.visible[item.y]![item.x];
    if (!seen) continue;
    const quest = item.kind === 'relay_key' || item.kind === 'nav_core';
    if (!vis && !quest) continue;
    const tex =
      item.kind === 'nav_core' ? 't_nav_core' : item.kind === 'relay_key' ? 't_key' : 't_item';
    const spr = host.addImage(
      item.x * TILE_DRAW + TILE_DRAW / 2,
      item.y * TILE_DRAW + TILE_DRAW / 2,
      tex,
    );
    spr.setDisplaySize(TILE_DRAW - 4, TILE_DRAW - 4);
    spr.setAlpha(vis ? 1 : 0.3);
    if (!vis) spr.setTint(Theme.memoryWash);
    host.itemLayer.add(spr);
    if (quest && vis) {
      host.tweens.add({
        targets: spr,
        alpha: 0.55,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }
  }
  if (host.goalMarker?.active) {
    host.itemLayer.add(host.goalMarker);
  }
}

export function syncFieldActors(host: ActorSyncHost, st: GameState, snapPositions: boolean): void {
  const aliveIds = new Set<number>();
  const visAt = (x: number, y: number): boolean =>
    st.visible[Math.round(y)]?.[Math.round(x)] ?? false;

  for (const en of st.enemies) {
    if (!en.alive) continue;
    aliveIds.add(en.id);
    const destVis = visAt(en.x, en.y);
    let view = host.enemyViews.get(en.id);
    if (!view) {
      const img = host.addImage(0, 0, enemyTextureKey(en.kind, enemyAnimFrame(en, host.animFrame, false)));
      const bulk = en.tier === 'boss' ? 6 : en.tier === 'elite' ? 3 : 0;
      img.setDisplaySize(TILE_DRAW - 2 + bulk, TILE_DRAW - 2 + bulk);
      const label = host.addText(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkBright,
        stroke: ThemeCss.groundDeep,
        strokeThickness: 3,
      });
      label.setOrigin(0.5, 1);
      label.setVisible(false);
      host.entityLayer.add(img);
      host.entityLayer.add(label);
      view = { img, label, gx: en.x, gy: en.y };
      host.enemyViews.set(en.id, view);
      host.snapImg(img, en.x, en.y);
      label.setPosition(img.x, img.y - TILE_DRAW / 2 + 5);
    }
    const visible = snapPositions ? destVis : destVis || visAt(view.gx, view.gy);
    view.img.setVisible(visible);
    view.label.setVisible(visible);
    const moving = !snapPositions && (view.gx !== en.x || view.gy !== en.y);
    bindTexture(view.img, enemyTextureKey(en.kind, enemyAnimFrame(en, host.animFrame, moving)));
    updateEnemyIntentLabel(view, en);
    if (snapPositions) {
      host.snapImg(view.img, en.x, en.y);
      view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 5);
      view.gx = en.x;
      view.gy = en.y;
    }
  }

  for (const [id, view] of host.enemyViews) {
    if (aliveIds.has(id) || view.dying) continue;
    beginActorDeath(host, host.enemyViews, id, view);
  }

  const npcIds = new Set<number>();
  for (const n of st.npcs) {
    npcIds.add(n.id);
    const destVis = visAt(n.x, n.y);
    let view = host.npcViews.get(n.id);
    if (!view) {
      const img = host.addImage(0, 0, npcTextureKey(n.kind));
      img.setDisplaySize(TILE_DRAW - 2, TILE_DRAW - 2);
      const label = host.addText(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.tape,
        stroke: ThemeCss.groundDeep,
        strokeThickness: 4,
      });
      label.setOrigin(0.5, 1);
      label.setVisible(false);
      host.entityLayer.add(img);
      host.entityLayer.add(label);
      view = { img, label, gx: n.x, gy: n.y };
      host.npcViews.set(n.id, view);
      host.snapImg(img, n.x, n.y);
      label.setPosition(img.x, img.y - TILE_DRAW / 2 + 2);
    }
    const visible = snapPositions ? destVis : destVis || visAt(view.gx, view.gy);
    view.img.setVisible(visible);
    updateNpcQuestLabel(view, n, visible);
    view.img.setAlpha(n.talked ? 0.45 : 1);
    if (snapPositions) {
      host.snapImg(view.img, n.x, n.y);
      view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 2);
      view.gx = n.x;
      view.gy = n.y;
    }
  }
  for (const [id, view] of host.npcViews) {
    if (!npcIds.has(id)) {
      view.img.destroy();
      view.label.destroy();
      host.npcViews.delete(id);
    }
  }

  const allyIds = new Set<number>();
  for (const a of st.allies) {
    if (!a.alive) continue;
    allyIds.add(a.id);
    const destVis = visAt(a.x, a.y);
    let view = host.allyViews.get(a.id);
    if (!view) {
      const img = host.addImage(0, 0, allyTextureKey(a.kind));
      img.setDisplaySize(TILE_DRAW - 2, TILE_DRAW - 2);
      const label = host.addText(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.biolum,
        stroke: ThemeCss.groundDeep,
        strokeThickness: 3,
      });
      label.setOrigin(0.5, 1);
      label.setVisible(false);
      host.entityLayer.add(img);
      host.entityLayer.add(label);
      view = { img, label, gx: a.x, gy: a.y };
      host.allyViews.set(a.id, view);
      host.snapImg(img, a.x, a.y);
      label.setPosition(img.x, img.y - TILE_DRAW / 2 + 5);
    }
    const visible = snapPositions ? destVis : destVis || visAt(view.gx, view.gy);
    view.img.setVisible(visible);
    view.label.setVisible(false);
    view.img.setTexture(allyTextureKey(a.kind));
    if (snapPositions) {
      host.snapImg(view.img, a.x, a.y);
      view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 5);
      view.gx = a.x;
      view.gy = a.y;
    }
  }
  for (const [id, view] of host.allyViews) {
    if (allyIds.has(id) || view.dying) continue;
    beginActorDeath(host, host.allyViews, id, view);
  }

  host.playerSprite.setVisible(true);
  if (snapPositions && !host.playerDying) host.snapImg(host.playerSprite, st.player.x, st.player.y);
  host.entityLayer.bringToTop(host.playerSprite);
}

/** Pulse explored/visible extract goal; edge chevron when known but off-screen. */
export function syncGoalVisuals(
  host: ActorSyncHost,
  st: GameState,
  pos: { x: number; y: number } | null,
): void {
  host.chevronGfx.clear();
  if (!pos) {
    host.goalMarker.setAlpha(0);
    host.getGoalPulseTween()?.stop();
    host.setGoalPulseTween(null);
    return;
  }

  const explored = st.explored[pos.y]?.[pos.x] === true;
  const visible = st.visible[pos.y]?.[pos.x] === true;
  const mapperReveal = st.player.mapperTurns > 0;
  if (!explored && !visible && !mapperReveal) {
    host.goalMarker.setAlpha(0);
    host.getGoalPulseTween()?.stop();
    host.setGoalPulseTween(null);
    return;
  }

  const wx = pos.x * TILE_DRAW + TILE_DRAW / 2;
  const wy = pos.y * TILE_DRAW + TILE_DRAW / 2;
  host.goalMarker.setPosition(wx, wy);
  host.goalMarker.setTint(Theme.flag);
  if (!host.getGoalPulseTween()) {
    host.goalMarker.setAlpha(0.75);
    host.setGoalPulseTween(
      host.tweens.add({
        targets: host.goalMarker,
        alpha: 0.35,
        duration: 520,
        yoyo: true,
        repeat: -1,
      }),
    );
  }

  const top = host.topInset;
  const screenX = wx - host.camX;
  const screenY = wy - host.camY + top;
  const pad = 18;
  const left = pad;
  const right = host.scale.width - pad;
  const topEdge = top + pad;
  const bottomInset = host.bottomInset();
  const bottom = host.scale.height - bottomInset - pad;
  const onScreen =
    screenX >= left && screenX <= right && screenY >= topEdge && screenY <= bottom;
  if (onScreen) return;

  const cx = host.scale.width / 2;
  const cy = top + (host.scale.height - top - bottomInset) / 2;
  const dx = screenX - cx;
  const dy = screenY - cy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const edgeDistX = ux > 0 ? (right - cx) / ux : ux < 0 ? (left - cx) / ux : Infinity;
  const edgeDistY = uy > 0 ? (bottom - cy) / uy : uy < 0 ? (topEdge - cy) / uy : Infinity;
  const edgeDist = Math.min(Math.abs(edgeDistX), Math.abs(edgeDistY));
  const ex = cx + ux * edgeDist;
  const ey = cy + uy * edgeDist;

  host.chevronGfx.fillStyle(Theme.flag, 0.95);
  host.chevronGfx.lineStyle(1, Theme.inkBright, 1);
  const s = 10;
  const px = -uy;
  const py = ux;
  host.chevronGfx.fillTriangle(
    ex + ux * s,
    ey + uy * s,
    ex - ux * s * 0.4 + px * s * 0.7,
    ey - uy * s * 0.4 + py * s * 0.7,
    ex - ux * s * 0.4 - px * s * 0.7,
    ey - uy * s * 0.4 - py * s * 0.7,
  );
}

/**
 * Optional site language: amber tile frame + off-screen square pip.
 * Standing on it draws a small interact caret — no essay HUD line.
 *
 * Drawn on propLayer (above quest furniture). Dashed stroke + corner ticks so
 * the frame survives console art and still reads as tape, not a HUD plate.
 */
export function syncOptionalSiteVisuals(host: ActorSyncHost, st: GameState): void {
  host.optionalSiteGfx.clear();
  const rq = st.roomQuest;
  if (!rq || rq.done) return;
  const step = activeQuestStep(rq);
  if (!step) return;

  const explored = st.explored[step.pos.y]?.[step.pos.x] === true;
  const visible = st.visible[step.pos.y]?.[step.pos.x] === true;
  const mapperReveal = st.player.mapperTurns > 0;
  if (!explored && !visible && !mapperReveal) return;

  const onPlayer = st.player.x === step.pos.x && st.player.y === step.pos.y;
  const wx = step.pos.x * TILE_DRAW;
  const wy = step.pos.y * TILE_DRAW;
  const flash = st.ui.questFlash > 0;
  const a = flash ? 1 : onPlayer ? 0.95 : 0.88;

  const inset = 2;
  const x0 = wx + inset;
  const y0 = wy + inset;
  const size = TILE_DRAW - inset * 2;
  const x1 = x0 + size;
  const y1 = y0 + size;

  // Soft amber wash so the site reads even when the dashed stroke is thin.
  host.optionalSiteGfx.fillStyle(Theme.tape, onPlayer ? 0.18 : 0.12);
  host.optionalSiteGfx.fillRect(x0, y0, size, size);

  host.optionalSiteGfx.lineStyle(2, Theme.tape, a);
  host.optionalSiteGfx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);

  const dash = 5;
  const gap = 3;
  const strokeDashed = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    let d = (host.animFrame * 2) % (dash + gap);
    host.optionalSiteGfx.lineStyle(2, Theme.tape, a);
    while (d < len) {
      const seg = Math.min(dash, len - d);
      if (d + seg > 0) {
        host.optionalSiteGfx.beginPath();
        host.optionalSiteGfx.moveTo(ax + ux * Math.max(0, d), ay + uy * Math.max(0, d));
        host.optionalSiteGfx.lineTo(ax + ux * (d + seg), ay + uy * (d + seg));
        host.optionalSiteGfx.strokePath();
      }
      d += dash + gap;
    }
  };
  // Inset dashed ring — help copy says "amber dashed frame".
  strokeDashed(x0 + 2, y0 + 2, x1 - 2, y0 + 2);
  strokeDashed(x1 - 2, y0 + 2, x1 - 2, y1 - 2);
  strokeDashed(x1 - 2, y1 - 2, x0 + 2, y1 - 2);
  strokeDashed(x0 + 2, y1 - 2, x0 + 2, y0 + 2);

  // Corner ticks — kit flagging language (same family as phaser track marks).
  const arm = 6;
  host.optionalSiteGfx.lineStyle(2, Theme.tape, Math.min(1, a + 0.08));
  for (const [cx, cy, sx, sy] of [
    [x0, y0, 1, 1],
    [x1, y0, -1, 1],
    [x0, y1, 1, -1],
    [x1, y1, -1, -1],
  ] as const) {
    host.optionalSiteGfx.beginPath();
    host.optionalSiteGfx.moveTo(cx, cy + sy * arm);
    host.optionalSiteGfx.lineTo(cx, cy);
    host.optionalSiteGfx.lineTo(cx + sx * arm, cy);
    host.optionalSiteGfx.strokePath();
  }

  if (onPlayer) {
    const cx = wx + TILE_DRAW / 2;
    const cy = wy + 6;
    host.optionalSiteGfx.fillStyle(Theme.inkBright, 0.95);
    host.optionalSiteGfx.fillTriangle(cx, cy - 5, cx - 5, cy + 3, cx + 5, cy + 3);
    host.optionalSiteGfx.fillStyle(Theme.tape, 0.95);
    host.optionalSiteGfx.fillRect(cx - 1.5, cy + 4, 3, 5);
  }

  const tile = host.tileSprites[step.pos.y]?.[step.pos.x];
  if (tile && visible) tile.setTint(Theme.tape);

  const top = host.topInset;
  const screenX = wx + TILE_DRAW / 2 - host.camX;
  const screenY = wy + TILE_DRAW / 2 - host.camY + top;
  const pad = 18;
  const left = pad;
  const right = host.scale.width - pad;
  const topEdge = top + pad;
  const bottomInset = host.bottomInset();
  const bottom = host.scale.height - bottomInset - pad;
  const onScreen =
    screenX >= left && screenX <= right && screenY >= topEdge && screenY <= bottom;
  if (onScreen) return;

  const scx = host.scale.width / 2;
  const scy = top + (host.scale.height - top - bottomInset) / 2;
  const dx = screenX - scx;
  const dy = screenY - scy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const edgeDistX = ux > 0 ? (right - scx) / ux : ux < 0 ? (left - scx) / ux : Infinity;
  const edgeDistY = uy > 0 ? (bottom - scy) / uy : uy < 0 ? (topEdge - scy) / uy : Infinity;
  const edgeDist = Math.min(Math.abs(edgeDistX), Math.abs(edgeDistY));
  const ex = scx + ux * edgeDist;
  const ey = scy + uy * edgeDist;
  host.chevronGfx.lineStyle(2, Theme.tape, 0.95);
  host.chevronGfx.strokeRect(ex - 5, ey - 5, 10, 10);
  host.chevronGfx.fillStyle(Theme.tape, 0.35);
  host.chevronGfx.fillRect(ex - 3, ey - 3, 6, 6);
}

/** Off-screen pip for explored elite hostiles (brand hunt). */
export function syncEliteHuntPip(host: ActorSyncHost, st: GameState): void {
  for (const en of st.enemies) {
    if (!en.alive || en.tier !== 'elite') continue;
    if (!st.explored[en.y]?.[en.x]) continue;
    const wx = en.x * TILE_DRAW + TILE_DRAW / 2;
    const wy = en.y * TILE_DRAW + TILE_DRAW / 2;
    const top = host.topInset;
    const screenX = wx - host.camX;
    const screenY = wy - host.camY + top;
    const pad = 18;
    const onScreen =
      screenX >= pad &&
      screenX <= host.scale.width - pad &&
      screenY >= top + pad &&
      screenY <= host.scale.height - host.bottomInset() - pad;
    if (onScreen) continue;
    const scx = host.scale.width / 2;
    const scy = top + (host.scale.height - top - host.bottomInset()) / 2;
    const dx = screenX - scx;
    const dy = screenY - scy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const left = pad;
    const right = host.scale.width - pad;
    const topEdge = top + pad;
    const bottom = host.scale.height - host.bottomInset() - pad;
    const edgeDistX = ux > 0 ? (right - scx) / ux : ux < 0 ? (left - scx) / ux : Infinity;
    const edgeDistY = uy > 0 ? (bottom - scy) / uy : uy < 0 ? (topEdge - scy) / uy : Infinity;
    const edgeDist = Math.min(Math.abs(edgeDistX), Math.abs(edgeDistY));
    const ex = scx + ux * edgeDist;
    const ey = scy + uy * edgeDist;
    host.chevronGfx.lineStyle(2, Theme.rust, 0.9);
    host.chevronGfx.strokeRect(ex - 4, ey - 4, 8, 8);
    return;
  }
}
