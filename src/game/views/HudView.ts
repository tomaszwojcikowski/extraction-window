import Phaser from 'phaser';
import { lore } from '../../data/lore';
import { shortEquipName } from '../../data/items';
import { getSector } from '../../data/encounters';
import { SKILLS } from '../../data/progression';
import { describeObjective, stickyMilestone, type GameState } from '../../sim';
import { scarHud, statusHud } from '../../sim/status';
import { armorDefBonus, toolAtkBonus } from '../../sim/combat';
import { CAMPAIGN_LENGTH, STORM_TURNS } from '../../campaign/spine';
import {
  EXPLORE_BONUS_THRESHOLD,
  SURVEY_ROOM_CAP,
} from '../../data/progression';
import { Theme, ThemeCss } from '../../scenes/theme';
import { drawStencilBadge } from '../../scenes/atmosphere';
import { contextHint } from '../presenters/ContextHints';
import { shouldShowPeekTeach } from '../presenters/PeekTeach';
import { drawKitOverlay } from './overlays/KitOverlay';
import { roomQuestHudLine } from '../../sim/mechanics/roomQuestMechanic';
import { isQuietStance } from '../../sim/mechanics/quietStance';
import { exploredFloorRatio } from '../../sim/mechanics/survey';
import { stanceBadgeLabel } from '../presenters/HudBadges';
import type { ShearPressureSpec } from '../presenters/ShearPressure';

export const HUD_BAR_SLOTS = 5;
export const HUD_BADGE_SLOTS = 6;

export type HudViewRefs = {
  barsGfx: Phaser.GameObjects.Graphics;
  badgeGfx: Phaser.GameObjects.Graphics;
  barCaptions: Phaser.GameObjects.Text[];
  barValues: Phaser.GameObjects.Text[];
  badgeTexts: Phaser.GameObjects.Text[];
  hudMeta: Phaser.GameObjects.Text;
  objLocalText: Phaser.GameObjects.Text;
  objCampaignText: Phaser.GameObjects.Text;
  questText: Phaser.GameObjects.Text;
  urgencyText: Phaser.GameObjects.Text;
  milestoneText: Phaser.GameObjects.Text;
  sectorText: Phaser.GameObjects.Text;
  logText: Phaser.GameObjects.Text;
  hintText: Phaser.GameObjects.Text;
  windowPulse: Phaser.GameObjects.Rectangle;
  invBg: Phaser.GameObjects.Rectangle;
  invPanel: Phaser.GameObjects.Graphics;
  invText: Phaser.GameObjects.Text;
};

export type HudRedrawOpts = {
  screenW: number;
  screenH: number;
  helpOpen: boolean;
  pagesOpen: boolean;
  /** Scene tweens for the storm-window pulse. */
  tweens: Phaser.Tweens.TweenManager;
  /** Mutable holder so the scene can stop/replace the pulse tween. */
  windowPulseTween: { current: Phaser.Tweens.Tween | null };
  /** Diegetic Shear Pressure dial — demotes raw window/bus bars when set. */
  shear?: ShearPressureSpec;
  /** Shift-peek active — show wake-peek tip without opening help. */
  movePreviewActive?: boolean;
};

/** The light badge must mirror the shadow predicate used by ambush AI. */
export function stanceBadgeSpec(st: GameState): { label: string; fill: number } | null {
  const label = stanceBadgeLabel(st);
  if (label === 'QUIET') return { label, fill: Theme.phosphorMute };
  if (label === 'SHADOW') return { label, fill: Theme.quest };
  if (label === 'LIT') return { label, fill: Theme.energy };
  return null;
}

/**
 * Field HUD redraw helpers — bars, badges, meta, objectives, log, kit panel.
 * Owns no Phaser objects; operates on refs created by GameScene.
 */
export class HudView {
  constructor(private readonly refs: HudViewRefs) {}

  redraw(st: GameState, opts: HudRedrawOpts): void {
    const r = this.refs;
    r.barsGfx.clear();
    const barY = 22;
    const barH = 10;
    const shearPrimary = (opts.shear?.value ?? 0) > 0.12;
    const secondaryCss = shearPrimary ? ThemeCss.inkMute : ThemeCss.phosphorDim;
    const secondaryValCss = shearPrimary ? ThemeCss.inkDim : ThemeCss.phosphor;
    this.placeBarSlot(
      0,
      14,
      barY,
      130,
      barH,
      st.player.hp / st.player.maxHp,
      Theme.ok,
      Theme.danger,
      lore('UI-BAR-HP'),
      `${st.player.hp}/${st.player.maxHp}`,
    );
    this.placeBarSlot(
      1,
      156,
      barY,
      110,
      barH,
      st.player.armor / Math.max(1, st.player.maxArmor),
      Theme.phosphor,
      Theme.danger,
      lore('UI-BAR-SHD'),
      `${st.player.armor}/${st.player.maxArmor}`,
    );
    this.placeBarSlot(
      2,
      278,
      barY,
      110,
      barH,
      st.player.energy / st.player.maxEnergy,
      Theme.energy,
      Theme.storm,
      shearPrimary ? lore('UI-BAR-EPS') : lore('UI-BAR-EPS'),
      `${st.player.energy}/${st.player.maxEnergy}`,
      secondaryCss,
      secondaryValCss,
    );
    this.placeBarSlot(
      3,
      400,
      barY,
      100,
      barH,
      st.stormTurns / STORM_TURNS,
      Theme.storm,
      Theme.danger,
      lore('UI-BAR-WINDOW'),
      `${st.stormTurns}`,
      secondaryCss,
      secondaryValCss,
    );
    const xpFrac = st.xpToNext > 0 ? st.xp / st.xpToNext : 1;
    this.placeBarSlot(
      4,
      512,
      barY,
      80,
      barH,
      xpFrac,
      Theme.quest,
      Theme.phosphorMute,
      lore('UI-BAR-XP'),
      st.xpToNext ? `${st.xp}/${st.xpToNext}` : `${st.xp}`,
    );
    this.syncWindowPulse(400, barY, 100, barH, st.stormTurns <= 80, opts);

    const probe = st.player.probeTurns > 0 ? ` P${st.player.probeTurns}` : '';
    const stim = st.player.stimTurns > 0 ? ` S${st.player.stimTurns}` : '';
    const filter = st.player.filterTurns > 0 ? ` F${st.player.filterTurns}` : '';
    const jam = st.player.jammerTurns > 0 ? ` J${st.player.jammerTurns}` : '';
    const quiet = isQuietStance(st) ? ' Q' : '';
    const lens = st.player.lensTurns > 0 ? ` L${st.player.lensTurns}` : '';
    const map = st.player.mapperTurns > 0 ? ` M${st.player.mapperTurns}` : '';
    const desync = st.patternDesync > 0 ? ` DS${st.patternDesync}` : '';
    const allyRole = st.allies.some((a) => a.alive && a.kind === 'probe_drone')
      ? ` ${lore('UI-ALLY-DRONE')}`
      : st.allies.some(
            (a) =>
              a.alive &&
              a.kind === 'away_escort' &&
              Math.abs(a.x - st.player.x) + Math.abs(a.y - st.player.y) === 1,
          )
        ? ` ${lore('UI-ALLY-ESCORT')}`
        : '';
    const doctrine =
      st.doctrineQuiet > 0 || st.doctrineProbe > 0
        ? `  ${lore('UI-DOCTRINE')}:Q${st.doctrineQuiet}${st.doctrineQuiet >= 3 ? '(-1EM)' : '/3'} P${st.doctrineProbe}${st.doctrineProbe >= 3 ? '(+5W)' : '/3'}`
        : '';
    const activeSys = `${probe}${stim}${filter}${jam}${quiet}${lens}${map}${desync}${allyRole}`;
    const systems = activeSys ? `  ${lore('UI-ACTIVE')}:${activeSys}` : '';
    const tool = st.player.equip.tool
      ? `  ${lore('UI-TOOL')}:${shortEquipName(st.player.equip.tool)}`
      : '';
    const armorEq = st.player.equip.armor
      ? `  ${lore('UI-EQUIP-ARMOR')}:${shortEquipName(st.player.equip.armor)}`
      : '';
    const utilEq = st.player.equip.utility
      ? `  ${lore('UI-EQUIP-UTIL')}:${shortEquipName(st.player.equip.utility)}`
      : '';
    const statuses = statusHud(st.player.statuses);
    const scars = scarHud(st.scanScars);
    const statusLine = statuses ? `  ${statuses}` : '';
    const scarLine = scars ? `  SCAR:${scars}` : '';
    const atkBonus =
      toolAtkBonus(st) +
      (st.player.probeTurns > 0 ? 2 : 0) +
      (st.player.stimTurns > 0 ? 3 : 0) +
      (st.scanScars.some((s) => s.id === 'array_bleed') ? 1 : 0);
    const defBonus = armorDefBonus(st) + (st.player.stabilizeTurns > 0 ? 1 : 0);
    const emPart = shearPrimary ? '' : `  ${lore('UI-EM')} ${st.emStress}`;
    r.hudMeta.setText(
      `${lore('UI-LEVEL')} ${st.level}  ${lore('UI-ATK')} ${st.player.atk}${atkBonus ? `+${atkBonus}` : ''}  ${lore('UI-DEF')} ${st.player.def}${defBonus ? `+${defBonus}` : ''}${emPart}${doctrine}${systems}${tool}${armorEq}${utilEq}${statusLine}${scarLine}`,
    );

    const sector = getSector(st.sectorIndex);
    if (st.tutorialActive) {
      r.sectorText.setText(
        `${lore('UI-SECTOR')} ${lore('UI-TUT-SECTOR')}\n${lore('OBJ-TUT-BRIEF')}   ${lore('UI-SEED')} ${st.seed}`,
      );
    } else {
      const dots = Array.from({ length: CAMPAIGN_LENGTH }, (_, i) =>
        i <= st.sectorIndex ? '●' : '○',
      ).join(' ');
      r.sectorText.setText(
        `${lore('UI-SECTOR')} ${st.sectorIndex + 1}/${CAMPAIGN_LENGTH}  ${lore(sector.loreName)}\n${dots}   ${lore('UI-SEED')} ${st.seed}`,
      );
    }

    const badgeSpecs: { label: string; fill: number }[] = [];
    if (opts.shear) {
      badgeSpecs.push({
        label: `SHEAR · ${opts.shear.state.toUpperCase()}`,
        fill: opts.shear.accent,
      });
    }
    const stanceBadge = stanceBadgeSpec(st);
    if (stanceBadge) badgeSpecs.push(stanceBadge);
    if (st.ionFrontTurns > 0) {
      badgeSpecs.push({
        label: lore(st.ionFrontTurns <= 1 ? 'UI-FRONT-CLEARING' : 'UI-ION-FRONT'),
        fill: st.ionFrontTurns <= 1 ? Theme.phosphorMute : Theme.danger,
      });
    }
    if (st.objectives.hasRelayKey) badgeSpecs.push({ label: lore('UI-QUEST-KEY'), fill: Theme.energy });
    if (st.objectives.usedRelayKey && !st.objectives.hasRelayKey) {
      badgeSpecs.push({ label: lore('UI-RELAY-OPEN'), fill: Theme.ok });
    }
    if (st.objectives.hasNavCore) badgeSpecs.push({ label: lore('UI-QUEST-CORE'), fill: Theme.quest });
    if (st.extractFavor) {
      const label = {
        storm_shelter: 'SHELTER',
        hazard_pass: 'SAFE STEP',
        pattern_fail_safe: 'BUFFER',
      }[st.extractFavor.kind];
      badgeSpecs.push({ label, fill: Theme.ok });
    }
    if (st.uplink?.active) {
      badgeSpecs.push({ label: `UPLINK ${st.uplink.progress}/3`, fill: Theme.storm });
      if (st.uplink.progress === 1 && !st.uplink.repelled) {
        badgeSpecs.push({ label: 'WAVE NEXT', fill: Theme.danger });
      }
    }
    if (st.codexPages > 0) {
      badgeSpecs.push({ label: `${lore('UI-CODEX')} ${st.codexPages}`, fill: Theme.phosphorMute });
    }
    if (st.rooms.length >= 3) {
      badgeSpecs.push({
        label: `${lore('UI-SURVEY')} ${st.surveyedRoomIds.length}/${SURVEY_ROOM_CAP}`,
        fill: Theme.phosphorMute,
      });
      const expPct = Math.floor(exploredFloorRatio(st) * 100);
      const exploreReady = exploredFloorRatio(st) >= EXPLORE_BONUS_THRESHOLD;
      badgeSpecs.push({
        label: `${lore('UI-EXPLORE')} ${expPct}%`,
        fill: exploreReady ? Theme.storm : Theme.phosphorMute,
      });
    }
    this.drawQuestBadges(badgeSpecs, opts.screenW);

    const desc = describeObjective(st);
    r.objLocalText.setText(lore(desc.local));
    r.objCampaignText.setText(`${lore('UI-OBJECTIVE')}: ${lore(desc.campaign)}`);

    const questLine = roomQuestHudLine(st);
    if (questLine) {
      r.questText.setVisible(true);
      r.questText.setText(
        `${lore('UI-QUEST-TRACK')}: ${lore(questLine.prompt)} → ${questLine.favor}  ${questLine.index}/${questLine.total}`,
      );
      r.questText.setColor(st.ui.questFlash > 0 ? ThemeCss.phosphorBright : ThemeCss.quest);
    } else {
      r.questText.setVisible(false);
      r.questText.setText('');
    }

    const stormHot = st.stormTurns <= 80;
    const stormWarn = st.stormTurns <= 200;
    const urgencyParts: string[] = [];
    if (stormHot) urgencyParts.push(`${lore('HAZ-STORM')}  (${st.stormTurns})`);
    else if (stormWarn) urgencyParts.push(`${lore('LOG-STORM-WARN')}  (${st.stormTurns})`);
    if (st.skillPick) {
      urgencyParts.push(
        `${lore('UI-SKILL-PICK')}: 1 ${lore(SKILLS[st.skillPick[0]!].loreName)}${st.skillPick[1] ? ` · 2 ${lore(SKILLS[st.skillPick[1]!].loreName)}` : ''}`,
      );
    }
    if (!shearPrimary && st.emStress >= 35) urgencyParts.push(`${lore('UI-EM')} ${st.emStress}`);

    const hasUrgency = urgencyParts.length > 0;
    r.urgencyText.setText(hasUrgency ? urgencyParts.join('  ·  ') : '');
    r.urgencyText.setColor(stormHot ? '#cc4444' : stormWarn ? '#ff9933' : ThemeCss.phosphorDim);

    const sticky = stickyMilestone(st.loreEvents);
    if (hasUrgency) {
      r.milestoneText.setText('');
    } else {
      r.milestoneText.setText(sticky ? lore(sticky) : '');
    }

    const logs = st.log.slice(-5).map((l) => {
      const base = lore(l.loreId);
      return l.detail ? `› ${base} (${l.detail})` : `› ${base}`;
    });
    r.logText.setText(`${lore('UI-LOG')}   [? help]\n${logs.join('\n')}`);

    let hint =
      opts.movePreviewActive && !st.ui.inventoryOpen && !st.skillPick && !st.ui.aimingDart
        ? ('UI-HINT-COMMIT' as const)
        : contextHint(st);
    // One-shot field teach — Shift-peek before a doc; never nags after success/dismiss.
    if (
      !opts.movePreviewActive &&
      !st.ui.inventoryOpen &&
      !st.skillPick &&
      !st.ui.aimingDart &&
      shouldShowPeekTeach(st)
    ) {
      hint = 'UI-HINT-PEEK-TEACH';
    }
    if (hint && !st.ui.inventoryOpen && !opts.helpOpen && !opts.pagesOpen) {
      r.hintText.setVisible(true);
      r.hintText.setText(lore(hint));
    } else {
      r.hintText.setVisible(false);
    }

    const invOpen = st.ui.inventoryOpen;
    r.invBg.setVisible(invOpen);
    r.invPanel.setVisible(invOpen);
    r.invText.setVisible(invOpen);
    if (invOpen) {
      drawKitOverlay(r.invPanel, r.invText, opts.screenW, opts.screenH, st);
    }
  }

  private drawBar(
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    fill: number,
    low: number,
  ): void {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    const g = this.refs.barsGfx;
    g.fillStyle(Theme.panel, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(r <= 0.3 ? low : fill, 1);
    g.fillRect(x, y, Math.max(0, Math.floor(w * r)), h);
    g.lineStyle(1, Theme.phosphorMute, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private placeBarSlot(
    index: number,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    fill: number,
    low: number,
    caption: string,
    value: string,
    captionCss: string = ThemeCss.phosphorDim,
    valueCss: string = ThemeCss.phosphor,
  ): void {
    this.drawBar(x, y, w, h, ratio, fill, low);
    const cap = this.refs.barCaptions[index]!;
    const val = this.refs.barValues[index]!;
    cap.setPosition(x, y - 11);
    cap.setText(caption);
    cap.setColor(captionCss);
    val.setPosition(x, y + h + 2);
    val.setText(value);
    const critical = ratio <= 0.3;
    val.setColor(critical ? '#cc4444' : valueCss);
  }

  private syncWindowPulse(
    x: number,
    y: number,
    w: number,
    h: number,
    critical: boolean,
    opts: HudRedrawOpts,
  ): void {
    const pulse = this.refs.windowPulse;
    pulse.setPosition(x, y);
    pulse.setSize(w, h);
    if (critical) {
      pulse.setVisible(true);
      const tw = opts.windowPulseTween.current;
      if (!tw || !tw.isPlaying()) {
        tw?.stop();
        pulse.setAlpha(0.15);
        opts.windowPulseTween.current = opts.tweens.add({
          targets: pulse,
          alpha: { from: 0.12, to: 0.42 },
          duration: 420,
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      opts.windowPulseTween.current?.stop();
      opts.windowPulseTween.current = null;
      pulse.setVisible(false);
    }
  }

  private drawQuestBadges(
    badges: { label: string; fill: number }[],
    screenW: number,
  ): void {
    this.refs.badgeGfx.clear();
    const y = 10;
    const h = 16;
    const padX = 8;
    const gap = 6;
    const widths: number[] = [];
    for (let i = 0; i < HUD_BADGE_SLOTS; i++) {
      const t = this.refs.badgeTexts[i]!;
      const b = badges[i];
      if (!b) {
        t.setVisible(false);
        continue;
      }
      t.setText(b.label);
      t.setVisible(true);
      widths.push(Math.ceil(t.width) + padX * 2);
    }
    let total = 0;
    for (let i = 0; i < widths.length; i++) total += widths[i]! + (i > 0 ? gap : 0);
    let x = screenW - 12 - total;
    for (let i = 0; i < widths.length; i++) {
      const b = badges[i]!;
      const tw = widths[i]!;
      const t = this.refs.badgeTexts[i]!;
      drawStencilBadge(this.refs.badgeGfx, x, y, tw, h, b.fill);
      t.setColor(ThemeCss.ink);
      t.setPosition(x + padX, y + 3);
      x += tw + gap;
    }
  }
}
