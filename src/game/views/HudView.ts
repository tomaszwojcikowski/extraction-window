import Phaser from 'phaser';
import { lore } from '../../data/lore';
import { getSector } from '../../data/encounters';
import {
  describeObjective,
  stickyMilestone,
  type GameState,
} from '../../sim';
import { CAMPAIGN_LENGTH } from '../../campaign/spine';
import { Theme, ThemeCss } from '../../scenes/theme';
import { drawMeter, drawStencilBadge, drawHintPlate } from '../../scenes/atmosphere';
import { resolveHintLine } from '../presenters/ContextHints';
import { fieldHudChips, formatHudMeta } from '../presenters/FieldHud';
import { lightBadgeSpec } from '../presenters/HudBadges';
import { drawKitOverlay } from './overlays/KitOverlay';
import { formatRoomQuestHudLine } from '../../sim/mechanics/roomQuestMechanic';
import type { ShearPressureSpec } from '../presenters/ShearPressure';
import { EM_HIGH, EM_WARN } from '../../sim/emStress';
import { busIsCritical } from '../../sim/bus';

export const HUD_BAR_SLOTS = 4;
export const HUD_BADGE_SLOTS = 8;

/** Instrument needle travel — short enough to stay inside the juice budget. */
const METER_MS = 140;
/** Readout stamp flash when a printed value changes. */
const TICK_MS = 90;

function tintToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

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
  hintGfx: Phaser.GameObjects.Graphics;
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
  /** Mission log strip open (`l`) — when false, log text stays empty; chips carry the beat. */
  logOpen?: boolean;
  /** Scene tweens for meter needles + readout ticks. */
  tweens: Phaser.Tweens.TweenManager;
  /** Mutable holder so the scene can stop/replace the pulse tween. */
  windowPulseTween: { current: Phaser.Tweens.Tween | null };
  /** Diegetic Shear Pressure dial — demotes raw window/bus bars when set. */
  shear?: ShearPressureSpec;
  /** Subtle per-biome field accent used by the sector readout. */
  biomeAccent?: number;
};

type BarLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: number;
  low: number;
  target: number;
};

/** The light badge must mirror the shadow predicate used by ambush AI. */
export function stanceBadgeSpec(st: GameState): { label: string; fill: number } | null {
  return lightBadgeSpec(st);
}

/**
 * Field HUD redraw helpers — bars, badges, meta, objectives, log, kit panel.
 * Owns no Phaser objects; operates on refs created by GameScene.
 *
 * Stat changes drive instrument motion: meters ease to the new fill, printed
 * readouts take a hard stamp tick — not soft SaaS pulses.
 */
export class HudView {
  private primed = false;
  private displayRatio: number[] = Array.from({ length: HUD_BAR_SLOTS }, () => 0);
  private lastBarValue: string[] = Array.from({ length: HUD_BAR_SLOTS }, () => '');
  private barLayout: (BarLayout | null)[] = Array.from({ length: HUD_BAR_SLOTS }, () => null);
  private barTweens: (Phaser.Tweens.Tween | null)[] = Array.from(
    { length: HUD_BAR_SLOTS },
    () => null,
  );
  private lastMeta = '';
  private lastBadges = '';
  private lastObjLocal = '';
  private lastObjCampaign = '';
  private lastQuest = '';
  private lastUrgency = '';
  private lastMilestone = '';
  private lastSector = '';
  private lastLog = '';

  constructor(private readonly refs: HudViewRefs) {}

  redraw(st: GameState, opts: HudRedrawOpts): void {
    const r = this.refs;
    r.barsGfx.clear();
    const barY = 22;
    const barH = 10;
    const shearPrimary = (opts.shear?.value ?? 0) > 0.12;
    const secondaryCss = shearPrimary ? ThemeCss.inkMute : ThemeCss.inkDim;
    const secondaryValCss = shearPrimary ? ThemeCss.inkDim : ThemeCss.ink;
    const busHot = busIsCritical(st);
    this.placeBarSlot(
      0,
      14,
      barY,
      130,
      barH,
      st.player.hp / st.player.maxHp,
      Theme.safe,
      Theme.rust,
      lore('UI-BAR-HP'),
      `${st.player.hp}/${st.player.maxHp}`,
      opts,
    );
    this.placeBarSlot(
      1,
      156,
      barY,
      110,
      barH,
      st.player.armor / Math.max(1, st.player.maxArmor),
      Theme.ink,
      Theme.rust,
      lore('UI-BAR-SHD'),
      `${st.player.armor}/${st.player.maxArmor}`,
      opts,
    );
    this.placeBarSlot(
      2,
      278,
      barY,
      180,
      barH,
      st.player.energy / st.player.maxEnergy,
      Theme.tape,
      Theme.arc,
      lore('UI-BAR-EPS'),
      `${st.player.energy}/${st.player.maxEnergy}`,
      opts,
      secondaryCss,
      secondaryValCss,
    );
    const xpFrac = st.xpToNext > 0 ? st.xp / st.xpToNext : 1;
    this.placeBarSlot(
      3,
      472,
      barY,
      120,
      barH,
      xpFrac,
      Theme.flag,
      Theme.inkMute,
      lore('UI-BAR-XP'),
      st.xpToNext ? `${st.xp}/${st.xpToNext}` : `${st.xp}`,
      opts,
    );
    this.syncPowerPulse(278, barY, 180, barH, busHot, opts);

    const meta = formatHudMeta(st, { shearPrimary });
    this.setReadout(r.hudMeta, meta, opts, ThemeCss.ink, 'meta');

    const sector = getSector(st.sectorIndex);
    let sectorLine: string;
    if (st.tutorialActive) {
      sectorLine = `${lore('UI-SECTOR')} ${lore('UI-TUT-SECTOR')}\n${lore('OBJ-TUT-BRIEF')}   ${lore('UI-SEED')} ${st.seed}`;
    } else {
      const ticks = Array.from({ length: CAMPAIGN_LENGTH }, (_, i) =>
        i <= st.sectorIndex ? '#' : '-',
      ).join(' ');
      sectorLine = `${lore('UI-SECTOR')} ${st.sectorIndex + 1}/${CAMPAIGN_LENGTH}  ${lore(sector.loreName)}\n${ticks}   ${lore('UI-SEED')} ${st.seed}`;
    }
    this.setReadout(r.sectorText, sectorLine, opts, tintToCss(opts.biomeAccent ?? Theme.inkDim), 'sector');

    const badgeSpecs = fieldHudChips(st).slice(0, HUD_BADGE_SLOTS);
    this.drawQuestBadges(badgeSpecs, opts.screenW, opts);

    const desc = describeObjective(st);
    this.setReadout(r.objLocalText, lore(desc.local), opts, ThemeCss.inkDim, 'objLocal');
    this.setReadout(
      r.objCampaignText,
      `${lore('UI-OBJECTIVE')}: ${lore(desc.campaign)}`,
      opts,
      ThemeCss.inkBright,
      'objCampaign',
    );

    // Optional tracker: step verb + favor preview (never steals the extract objective).
    const questLine = formatRoomQuestHudLine(st);
    if (questLine) {
      this.setReadout(r.questText, questLine, opts, ThemeCss.tape, 'quest');
      r.questText.setVisible(true);
    } else {
      this.setReadout(r.questText, '', opts, ThemeCss.tape, 'quest');
      r.questText.setVisible(false);
    }

    const emHot = st.emStress >= EM_HIGH;
    const urgencyParts: string[] = [];
    const skillLock = Boolean(st.skillPick);
    // Skill pick owns the line — Power/EM wait until the fork is chosen.
    if (skillLock) {
      urgencyParts.push(`▶ ${lore('UI-SKILL-CHOOSE')}`);
    } else {
      // Power kill clock stays visible even when Shear owns the center — that
      // compression is how bus deaths used to arrive with no notice.
      if (busHot) {
        urgencyParts.push(`▸ ${lore('HAZ-BUS')}  (${st.player.energy})`);
      }
      if (emHot && !shearPrimary) {
        urgencyParts.push(`▸ ${lore('UI-EM-CRIT')} ${st.emStress}`);
      } else if (st.emStress >= EM_WARN) {
        urgencyParts.push(`▸ ${lore('UI-EM-WARN')} ${st.emStress}`);
      }
    }

    const hasUrgency = urgencyParts.length > 0;
    const urgencyColor = skillLock
      ? ThemeCss.flag
      : busHot || (emHot && !shearPrimary)
        ? ThemeCss.rust
        : st.emStress >= EM_HIGH
          ? ThemeCss.rust
          : ThemeCss.inkDim;
    this.setReadout(
      r.urgencyText,
      hasUrgency ? urgencyParts.join(' · ') : '',
      opts,
      urgencyColor,
      'urgency',
    );

    const sticky = stickyMilestone(st.loreEvents);
    this.setReadout(
      r.milestoneText,
      hasUrgency ? '' : sticky ? lore(sticky) : '',
      opts,
      ThemeCss.flag,
      'milestone',
    );

    if (opts.logOpen) {
      const logs = st.log.slice(-5).map((l) => {
        const base = lore(l.loreId);
        return l.detail ? `- ${base} (${l.detail})` : `- ${base}`;
      });
      this.setReadout(
        r.logText,
        `${lore('UI-LOG')}  /  l close · ? help\n${logs.join('\n')}`,
        opts,
        ThemeCss.ink,
        'log',
      );
    } else {
      this.setReadout(r.logText, '', opts, ThemeCss.ink, 'log');
    }

    const hint = resolveHintLine(st);
    if (hint && !st.ui.inventoryOpen && !opts.helpOpen && !opts.pagesOpen) {
      r.hintText.setVisible(true);
      r.hintText.setText(lore(hint));
      r.hintGfx.setVisible(true);
      drawHintPlate(r.hintGfx, r.hintText.x, r.hintText.y, r.hintText.width, r.hintText.height, {
        originX: 0,
      });
    } else {
      r.hintText.setVisible(false);
      r.hintGfx.clear();
      r.hintGfx.setVisible(false);
    }

    const invOpen = st.ui.inventoryOpen;
    r.invBg.setVisible(invOpen);
    r.invPanel.setVisible(invOpen);
    r.invText.setVisible(invOpen);
    if (invOpen) {
      drawKitOverlay(r.invPanel, r.invText, opts.screenW, opts.screenH, st);
    }

    this.primed = true;
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
    opts: HudRedrawOpts,
    captionCss: string = ThemeCss.inkDim,
    valueCss: string = ThemeCss.ink,
  ): void {
    const target = Math.max(0, Math.min(1, ratio));
    this.barLayout[index] = { x, y, w, h, fill, low, target };

    const cap = this.refs.barCaptions[index]!;
    const val = this.refs.barValues[index]!;
    cap.setPosition(x, y - 11);
    cap.setText(caption);
    cap.setColor(captionCss);
    val.setPosition(x, y + h + 2);
    val.setText(value);

    const critical = target <= 0.3;
    const printColor = critical ? ThemeCss.rust : valueCss;
    const valueChanged = this.primed && value !== this.lastBarValue[index];
    const prevDisplay = this.displayRatio[index]!;
    const moved = this.primed && Math.abs(target - prevDisplay) > 0.004;

    if (!this.primed) {
      this.displayRatio[index] = target;
    } else if (moved) {
      this.barTweens[index]?.stop();
      const proxy = { r: prevDisplay };
      this.barTweens[index] = opts.tweens.add({
        targets: proxy,
        r: target,
        duration: METER_MS,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          this.displayRatio[index] = proxy.r;
          this.paintMeters();
        },
        onComplete: () => {
          this.displayRatio[index] = target;
          this.barTweens[index] = null;
          this.paintMeters();
        },
      });
    } else {
      this.displayRatio[index] = target;
    }

    this.lastBarValue[index] = value;
    val.setColor(printColor);
    if (valueChanged) {
      // Stamp caption + value so the named clock (HP/Power/Window) owns the beat.
      this.stampReadout(cap, opts, captionCss);
      this.stampReadout(val, opts, printColor);
    }

    this.drawBar(x, y, w, h, this.displayRatio[index]!, fill, low);
  }

  private paintMeters(): void {
    this.refs.barsGfx.clear();
    for (let i = 0; i < HUD_BAR_SLOTS; i++) {
      const layout = this.barLayout[i];
      if (!layout) continue;
      this.drawBar(
        layout.x,
        layout.y,
        layout.w,
        layout.h,
        this.displayRatio[i]!,
        layout.fill,
        layout.low,
      );
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
    drawMeter(this.refs.barsGfx, x, y, w, h, ratio, fill, low);
  }

  private setReadout(
    text: Phaser.GameObjects.Text,
    next: string,
    opts: HudRedrawOpts,
    color: string,
    key:
      | 'meta'
      | 'sector'
      | 'objLocal'
      | 'objCampaign'
      | 'quest'
      | 'urgency'
      | 'milestone'
      | 'log',
  ): void {
    const prev =
      key === 'meta'
        ? this.lastMeta
        : key === 'sector'
          ? this.lastSector
          : key === 'objLocal'
            ? this.lastObjLocal
            : key === 'objCampaign'
              ? this.lastObjCampaign
              : key === 'quest'
                ? this.lastQuest
                : key === 'urgency'
                  ? this.lastUrgency
                  : key === 'milestone'
                    ? this.lastMilestone
                    : this.lastLog;
    text.setText(next);
    text.setColor(color);
    // Log is a feed, not a gauge — skip stamp so every turn doesn't chatter.
    if (key !== 'log' && this.primed && next !== prev && next !== '') {
      this.stampReadout(text, opts, color);
    }
    if (key === 'meta') this.lastMeta = next;
    else if (key === 'sector') this.lastSector = next;
    else if (key === 'objLocal') this.lastObjLocal = next;
    else if (key === 'objCampaign') this.lastObjCampaign = next;
    else if (key === 'quest') this.lastQuest = next;
    else if (key === 'urgency') this.lastUrgency = next;
    else if (key === 'milestone') this.lastMilestone = next;
    else this.lastLog = next;
  }

  /** Hard stamp — bright flash + 1px lift, not a soft fade. */
  private stampReadout(
    text: Phaser.GameObjects.Text,
    opts: HudRedrawOpts,
    restoreColor: string,
  ): void {
    if (!text.visible) return;
    opts.tweens.killTweensOf(text);
    const baseY = text.y;
    text.setColor(ThemeCss.inkBright);
    text.setY(baseY);
    opts.tweens.add({
      targets: text,
      y: baseY - 1,
      duration: TICK_MS,
      yoyo: true,
      ease: 'Stepped',
      easeParams: [2],
      onComplete: () => {
        if (!text.active) return;
        text.setY(baseY);
        text.setColor(restoreColor);
      },
    });
  }

  private syncPowerPulse(
    x: number,
    y: number,
    w: number,
    h: number,
    critical: boolean,
    opts: HudRedrawOpts,
  ): void {
    const pulse = this.refs.windowPulse;
    // Hard tape under the meter — on or off, no soft alpha breathe.
    pulse.setPosition(x, y + h + 1);
    pulse.setSize(w, 2);
    opts.windowPulseTween.current?.stop();
    opts.windowPulseTween.current = null;
    if (critical) {
      pulse.setVisible(true);
      pulse.setAlpha(0.85);
    } else {
      pulse.setVisible(false);
    }
  }

  private drawQuestBadges(
    badges: { label: string; fill: number }[],
    screenW: number,
    opts: HudRedrawOpts,
  ): void {
    this.refs.badgeGfx.clear();
    const y = 10;
    const h = 16;
    const padX = 8;
    const gap = 6;
    const key = badges.map((b) => `${b.label}:${b.fill}`).join('|');
    const changed = this.primed && key !== this.lastBadges;
    this.lastBadges = key;
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
      if (changed) this.stampReadout(t, opts, ThemeCss.ink);
      x += tw + gap;
    }
  }
}
