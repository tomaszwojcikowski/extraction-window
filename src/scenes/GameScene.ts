import Phaser from 'phaser';
import {
  TILE_DRAW,
  enemyTextureKey,
  npcTextureKey,
  allyTextureKey,
  playerTextureKey,
  wallTextureKey,
  sconceTextureKey,
  floorScatter,
  wallWearAt,
} from './textures';
import {
  BIOME_FLOOR_TINT,
  FONT_DATA,
  FONT_DISPLAY,
  LightTemp,
  Theme,
  ThemeCss,
  crackTextureKey,
  floorTextureKey,
} from './theme';
import { ENEMIES } from '../data/enemies';
import { lore, type LoreId } from '../data/lore';
import { applyAction, createGame, describeObjective, type Action, type GameState } from '../sim';
import { activeQuestStep } from '../sim/roomQuest';
import { tileBrightness } from '../sim/light';
import {
  addCameraAtmosphere,
  createArcSweep,
  drawHintPlate,
  drawHudStripChrome,
  type ArcSweep,
  type CameraAtmosphere,
} from './atmosphere';
import { sfx } from '../audio/sfx';
import { ambient, music } from '../audio';
import { HUD_BOTTOM_LOG, HUD_BOTTOM_DOCK, HUD_TOP } from '../game/GameHost';
import { handleGameKey } from '../game/input/InputController';
import { resolveHintLine } from '../game/presenters/ContextHints';
import {
  ensureSignalRailTexts,
  layoutSignalRail,
  pushSignalRail,
} from '../game/presenters/SignalRail';
import { tileCastsPropShadow } from '../game/views/propShadows';
import {
  causalActionFloats,
  flashHit,
  flashScreen,
  playCombatContactJuice,
  playMoveAnims,
  phaserBeamTargetTile,
  playPhaserBeam,
  playActorDeath,
  playPlayerDeath,
  presentActionFeedback,
  tintPlayerHurt,
  tintVisibleEnemies,
  PHASER_BEAM_MS,
  type ActionFloat,
  type EnemyView,
} from '../game/presenters/ActionFeedback';
import { flankPenalty } from '../sim/combat';
import { pickCameraCue, shearBreachCue, type CameraCue } from '../game/presenters/EventCamera';
import { CameraKick } from '../game/presenters/CameraKick';
import { HudView, HUD_BAR_SLOTS, HUD_BADGE_SLOTS } from '../game/views/HudView';
import { LightView } from '../game/views/LightView';
import { drawFovVignette } from '../game/views/MapView';
import { MinimapView } from '../game/views/MinimapView';
import { drawThreatZones } from '../game/views/ThreatView';
import { drawHelpOverlay } from '../game/views/overlays/HelpOverlay';
import { drawPaddOverlay } from '../game/views/overlays/PaddOverlay';
import {
  createSkillPickObjects,
  drawSkillPickOverlay,
  hideSkillPickOverlay,
} from '../game/views/overlays/SkillPickOverlay';
import { computeShearPressure, shearReadoutLabel, type ShearPressureState } from '../game/presenters/ShearPressure';
import {
  resetEphemeralFieldChrome,
  type EphemeralFieldChrome,
  type LightPreferenceHint,
} from '../game/presenters/FieldChrome';
import { pressureRevealAt } from '../game/presenters/PressureReveal';
import { npcQuestMarker, npcQuestMarkerColor } from '../game/presenters/NpcMarkers';

const TOP = HUD_TOP;
const BAR_SLOTS = HUD_BAR_SLOTS;
const BADGE_SLOTS = HUD_BADGE_SLOTS;
/** Causal float linger — long enough to read mid-move; still clears before the next beat feels sticky. */
const ACTION_FLOAT_MS = 1200;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private mapLayer!: Phaser.GameObjects.Container;
  private lightLayer!: Phaser.GameObjects.Container;
  private propLayer!: Phaser.GameObjects.Container;
  private itemLayer!: Phaser.GameObjects.Container;
  private shadowLayer!: Phaser.GameObjects.Container;
  private entityLayer!: Phaser.GameObjects.Container;
  private lightView!: LightView;
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  /** Wall-fixture overlay sprites; synced against FOW separately from tile art. */
  private sconceOverlays: Array<{ img: Phaser.GameObjects.Image; x: number; y: number }> = [];
  /** Shear crack overlays on optional-path tiles — sparse, recycled. */
  private crackSprites = new Map<string, Phaser.GameObjects.Image>();
  private camX = 0;
  private camY = 0;

  private playerSprite!: Phaser.GameObjects.Image;
  private enemyViews = new Map<number, EnemyView>();
  private npcViews = new Map<number, EnemyView>();
  private allyViews = new Map<number, EnemyView>();
  private animating = false;
  /** Collapse in flight — skip idle bob and tile snaps so the tween owns the sprite. */
  private playerDying = false;
  /** One-deep input buffer while move tweens run — latest wins. */
  private queuedAction: Action | null = null;
  private arcSweep: ArcSweep | null = null;
  private cameraAtmosphere: CameraAtmosphere | null = null;
  private animFrame = 0;
  private animAccum = 0;
  /** First-light sweep radius in tiles, or null when the gate is released. */
  private firstLight: number | null = null;
  private firstLightTween: Phaser.Tweens.Tween | null = null;
  private fovVignette!: Phaser.GameObjects.Graphics;
  private fieldMotes!: Phaser.GameObjects.Graphics;
  private idleBob = 0;

  private topPanel!: Phaser.GameObjects.Graphics;
  private bottomPanel!: Phaser.GameObjects.Graphics;
  private bottomDockPanel!: Phaser.GameObjects.Graphics;
  private dockLegendText!: Phaser.GameObjects.Text;
  private barsGfx!: Phaser.GameObjects.Graphics;
  private badgeGfx!: Phaser.GameObjects.Graphics;
  private hudMeta!: Phaser.GameObjects.Text;
  private objLocalText!: Phaser.GameObjects.Text;
  private objCampaignText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private urgencyText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hintGfx!: Phaser.GameObjects.Graphics;
  private badgeTexts: Phaser.GameObjects.Text[] = [];
  private barCaptions: Phaser.GameObjects.Text[] = [];
  private barValues: Phaser.GameObjects.Text[] = [];
  private sectorText!: Phaser.GameObjects.Text;
  private milestoneText!: Phaser.GameObjects.Text;
  private windowPulse!: Phaser.GameObjects.Rectangle;
  private windowPulseTween: Phaser.Tweens.Tween | null = null;
  private hud!: HudView;
  private chevronGfx!: Phaser.GameObjects.Graphics;
  /** Amber frame / off-screen pip for optional room sites (never the extract marker). */
  private optionalSiteGfx!: Phaser.GameObjects.Graphics;
  private threatGfx!: Phaser.GameObjects.Graphics;
  private shearReadout!: Phaser.GameObjects.Text;
  private shearPlate!: Phaser.GameObjects.Graphics;
  private lastShearState: ShearPressureState | null = null;
  private shearFlashUntil = 0;
  private goalMarker!: Phaser.GameObjects.Image;
  private goalPulseTween: Phaser.Tweens.Tween | null = null;
  private readonly lightPreferenceHints = new Set<number>();
  private preferenceHint: LightPreferenceHint | null = null;
  /** Event camera kick + punch-in zoom; world layers only (HUD stays 1:1). */
  private readonly camKick = new CameraKick();
  private lastCamOx = Number.NaN;
  private lastCamOy = Number.NaN;
  private lastCamZoom = Number.NaN;
  private lastGoalSyncAt = 0;
  /** Mid-hop bloom/shadow refresh step — wash updates every frame; FX ~8×/hop. */
  private moveLightFxStep = -1;

  private invBg!: Phaser.GameObjects.Rectangle;
  private invPanel!: Phaser.GameObjects.Graphics;
  private invText!: Phaser.GameObjects.Text;

  private pagesBg!: Phaser.GameObjects.Rectangle;
  private pagesPanel!: Phaser.GameObjects.Graphics;
  private pagesText!: Phaser.GameObjects.Text;
  private pagesOpen = false;

  private helpBg!: Phaser.GameObjects.Rectangle;
  private helpPanel!: Phaser.GameObjects.Graphics;
  private helpText!: Phaser.GameObjects.Text;
  private helpOpen = false;
  private skillPickBg!: Phaser.GameObjects.Rectangle;
  private skillPickPanel!: Phaser.GameObjects.Graphics;
  private skillPickText!: Phaser.GameObjects.Text;
  private skillPickBadgeGfx!: Phaser.GameObjects.Graphics;
  /** Mission log strip — hidden by default; `l` toggles. */
  private logOpen = false;
  private minimap = new MinimapView();
  private signalRailGfx!: Phaser.GameObjects.Graphics;
  private signalRailTexts: Phaser.GameObjects.Text[] = [];
  private recentSignals: ActionFloat[] = [];
  /** World-space causal floats — tracked so a map rebuild can destroy orphans. */
  private actionFloatTexts: Phaser.GameObjects.Text[] = [];

  private flash!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Game');
  }

  init(data: { seed?: number }): void {
    this.state = createGame(data.seed ?? 42, { skipTutorial: false });
    this.helpOpen = false;
    this.pagesOpen = false;
    this.logOpen = false;
    this.animating = false;
    this.playerDying = false;
    this.enemyViews.clear();
    this.npcViews.clear();
    this.allyViews.clear();
    this.resetLevelTooltips();
    this.camKick.reset();
    this.firstLight = null;
    this.firstLightTween = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Theme.groundDeep);
    this.cameraAtmosphere = addCameraAtmosphere(this);
    this.mapLayer = this.add.container(0, 0);
    // Contact shadows sit between the floor and the things casting them.
    this.shadowLayer = this.add.container(0, 0);
    // Raised furniture above shadows so umbra sits under the art, not on it.
    this.propLayer = this.add.container(0, 0);
    this.itemLayer = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    // Bloom above actors so the player lamp isn't buried under the sprite.
    this.lightLayer = this.add.container(0, 0);
    this.fieldMotes = this.add.graphics();
    this.fieldMotes.setBlendMode(Phaser.BlendModes.ADD);
    this.lightLayer.add(this.fieldMotes);
    this.lightView = new LightView(this, this.lightLayer, this.shadowLayer);

    this.playerSprite = this.add.image(0, 0, 't_player');
    this.playerSprite.setDisplaySize(TILE_DRAW, TILE_DRAW);
    this.entityLayer.add(this.playerSprite);

    this.buildMapSprites();

    this.topPanel = this.add.graphics().setScrollFactor(0).setDepth(90);
    this.bottomPanel = this.add.graphics().setScrollFactor(0).setDepth(90);
    this.bottomDockPanel = this.add.graphics().setScrollFactor(0).setDepth(90);
    this.dockLegendText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setAlpha(0.7)
      .setScrollFactor(0)
      .setDepth(91);
    this.barsGfx = this.add.graphics().setScrollFactor(0).setDepth(91);
    this.badgeGfx = this.add.graphics().setScrollFactor(0).setDepth(91);

    for (let i = 0; i < BAR_SLOTS; i++) {
      this.barCaptions.push(
        this.add
          .text(0, 0, '', {
            fontFamily: FONT_DATA,
            fontSize: '10px',
            color: ThemeCss.inkDim,
          })
          .setScrollFactor(0)
          .setDepth(92),
      );
      this.barValues.push(
        this.add
          .text(0, 0, '', {
            fontFamily: FONT_DATA,
            fontSize: '11px',
            color: ThemeCss.ink,
          })
          .setScrollFactor(0)
          .setDepth(92),
      );
    }

    this.windowPulse = this.add
      .rectangle(0, 0, 100, 2, Theme.tape, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(91.5)
      .setVisible(false);

    this.hudMeta = this.add
      .text(14, 48, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.ink,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.objLocalText = this.add
      .text(14, 64, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkDim,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.objCampaignText = this.add
      .text(14, 78, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '13px',
        color: ThemeCss.inkBright,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.questText = this.add
      .text(14, 94, '', {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.flag,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92)
      .setVisible(false);

    this.urgencyText = this.add
      .text(14, 110, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.rust,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.milestoneText = this.add
      .text(14, 110, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.flag,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.chevronGfx = this.add.graphics().setScrollFactor(0).setDepth(94);

    this.optionalSiteGfx = this.add.graphics();
    this.optionalSiteGfx.setDepth(81);
    this.mapLayer.add(this.optionalSiteGfx);

    // Ground marking sits over the floor but under items and actors.
    this.threatGfx = this.add.graphics();
    this.threatGfx.setDepth(80);
    this.mapLayer.add(this.threatGfx);

    this.shearPlate = this.add.graphics().setScrollFactor(0).setDepth(92.5).setVisible(false);
    this.shearReadout = this.add
      .text(this.scale.width / 2, 6, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '12px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(93)
      .setAlpha(0.88);

    this.goalMarker = this.add.image(0, 0, 't_quest');
    this.goalMarker.setDisplaySize(TILE_DRAW + 4, TILE_DRAW + 4);
    this.goalMarker.setAlpha(0);
    this.goalMarker.setDepth(5);
    this.itemLayer.add(this.goalMarker);

    for (let i = 0; i < BADGE_SLOTS; i++) {
      this.badgeTexts.push(
        this.add
          .text(0, 0, '', {
            fontFamily: FONT_DATA,
            fontSize: '10px',
            color: ThemeCss.ink,
          })
          .setScrollFactor(0)
          .setDepth(92)
          .setVisible(false),
      );
    }

    this.sectorText = this.add
      .text(this.scale.width - 12, 48, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkDim,
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(92);

    this.logText = this.add
      .text(12, this.scale.height - this.bottomInset() + 10, '', {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.ink,
        wordWrap: { width: this.scale.width - 24 },
      })
      .setScrollFactor(0)
      .setDepth(92)
      .setVisible(false);

    this.signalRailGfx = this.add.graphics().setScrollFactor(0).setDepth(93);
    this.signalRailTexts = ensureSignalRailTexts(this);

    this.hintGfx = this.add.graphics().setScrollFactor(0).setDepth(92.5).setVisible(false);
    this.hintText = this.add
      .text(14, this.scale.height - this.bottomInset() - 16, '', {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(93)
      .setVisible(false);

    this.invBg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, Theme.groundDeep, 0.42)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.invPanel = this.add.graphics().setScrollFactor(0).setDepth(101).setVisible(false);
    this.invText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.ink,
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);

    this.pagesBg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, Theme.groundDeep, 0.42)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(105)
      .setVisible(false);

    this.pagesPanel = this.add.graphics().setScrollFactor(0).setDepth(106).setVisible(false);
    this.pagesText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.ink,
        lineSpacing: 5,
        wordWrap: { width: 400 },
      })
      .setScrollFactor(0)
      .setDepth(107)
      .setVisible(false);

    this.helpBg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, Theme.groundDeep, 0.42)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(110)
      .setVisible(false);

    this.helpPanel = this.add.graphics().setScrollFactor(0).setDepth(111).setVisible(false);
    this.helpText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.ink,
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(112)
      .setVisible(false);

    const skillPickObjs = createSkillPickObjects(this);
    this.skillPickBg = skillPickObjs.bg;
    this.skillPickPanel = skillPickObjs.panel;
    this.skillPickText = skillPickObjs.text;
    this.skillPickBadgeGfx = skillPickObjs.badgeGfx;

    this.flash = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, Theme.rust, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(120);

    this.fovVignette = this.add.graphics().setScrollFactor(0).setDepth(80);

    this.minimap.create(this);

    this.hud = new HudView({
      barsGfx: this.barsGfx,
      badgeGfx: this.badgeGfx,
      barCaptions: this.barCaptions,
      barValues: this.barValues,
      badgeTexts: this.badgeTexts,
      hudMeta: this.hudMeta,
      objLocalText: this.objLocalText,
      objCampaignText: this.objCampaignText,
      questText: this.questText,
      urgencyText: this.urgencyText,
      milestoneText: this.milestoneText,
      sectorText: this.sectorText,
      logText: this.logText,
      hintText: this.hintText,
      hintGfx: this.hintGfx,
      windowPulse: this.windowPulse,
      invBg: this.invBg,
      invPanel: this.invPanel,
      invText: this.invText,
    });

    this.drawChrome();
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.handleKey(e));
    this.syncItems();
    this.syncActors(true);
    this.redrawTilesAndHud();
    this.updateCamera(true);
    this.syncFieldAudio(true);
    // Phaser may finish Title shutdown after create — re-assert beds next tick
    this.time.delayedCall(50, () => this.syncFieldAudio(true));
    this.events.once('shutdown', () => {
      ambient.stop();
      music.stop();
      this.arcSweep?.destroy();
      this.arcSweep = null;
      this.cameraAtmosphere?.destroy();
      this.cameraAtmosphere = null;
      this.lightView?.destroy();
    });
  }

  private syncFieldAudio(force = false): void {
    if (sfx.isMuted()) {
      ambient.stop();
      music.stop();
      return;
    }
    sfx.unlock();
    ambient.startSector(this.state.sectorId);
    void force;
    music.syncField({
      sectorId: this.state.sectorId,
      sectorIndex: this.state.sectorIndex,
      playerEnergy: this.state.player.energy,
      maxEnergy: this.state.player.maxEnergy,
      inCombat: this.threatNearby(),
    });
  }

  /** Hostile pressure — close fauna or alerted sight-lines. */
  private threatNearby(): boolean {
    const st = this.state;
    const px = st.player.x;
    const py = st.player.y;
    return st.enemies.some((e) => {
      if (!e.alive) return false;
      const d = Math.abs(e.x - px) + Math.abs(e.y - py);
      if (d <= 4) return true;
      if (e.alerted && (st.visible[e.y]?.[e.x] ?? false) && d <= 8) return true;
      return false;
    });
  }

  update(_t: number, dt: number): void {
    this.updateCamera(false);
    this.animAccum += dt;
    if (this.animAccum >= 420) {
      this.animAccum = 0;
      this.animFrame = (this.animFrame + 1) % 4;
      this.tickAnimatedTiles();
      this.tickAnimatedActors();
      // Pulse vent/hazard/beacon bloom with anim frame
      if (this.state.status === 'playing') this.applyFieldLighting();
    }
    if (!this.animating && !this.playerDying) {
      // Snappy 1px plotter redraw, not floaty bob
      this.idleBob = Math.sin(_t / 220) > 0 ? 1 : 0;
      const p = this.worldXY(this.state.player.x, this.state.player.y);
      this.playerSprite.setPosition(p.x, p.y + this.idleBob);
    }
  }

  private tickAnimatedTiles(): void {
    const st = this.state;
    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        if (!st.explored[y]![x]) continue;
        const kind = st.tiles[y]![x]!.kind;
        if (
          kind !== 'hazard' &&
          kind !== 'vent' &&
          kind !== 'brine_pool' &&
          kind !== 'landmark' &&
          kind !== 'quest' &&
          kind !== 'beacon'
        )
          continue;
        const img = this.tileSprites[y]?.[x];
        if (!img) continue;
        img.setTexture(this.tileKey(kind, x, y));
      }
    }
  }

  private tickAnimatedActors(): void {
    this.playerSprite.setTexture(playerTextureKey(this.animFrame % 3));
    for (const en of this.state.enemies) {
      if (!en.alive) continue;
      const view = this.enemyViews.get(en.id);
      if (!view) continue;
      view.img.setTexture(enemyTextureKey(en.kind, this.animFrame % 3));
      this.updateEnemyIntentLabel(view, en);
    }
  }

  private worldXY(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE_DRAW + TILE_DRAW / 2, y: ty * TILE_DRAW + TILE_DRAW / 2 };
  }

  private snapImg(img: Phaser.GameObjects.Image, tx: number, ty: number): void {
    const p = this.worldXY(tx, ty);
    img.setPosition(p.x, p.y);
  }

  /** Collapsed default: full viewport. Open mission log (`l`) reserves the strip. */
  private bottomInset(): number {
    return (this.logOpen ? HUD_BOTTOM_LOG : 0) + HUD_BOTTOM_DOCK;
  }

  private drawChrome(shear = computeShearPressure(this.state)): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const biomeAccent = BIOME_FLOOR_TINT[this.state.sectorId];
    drawHudStripChrome(this.topPanel, {
      y: 0,
      height: TOP,
      width: w,
      side: 'top',
      corrosion: shear.value,
      accent: shear.accent,
      biomeAccent,
      drainingLeg: shear.drainingLeg,
      animFrame: this.animFrame,
    });
    const bottom = this.bottomInset();
    this.bottomPanel.setVisible(this.logOpen);
    if (this.logOpen) {
      drawHudStripChrome(this.bottomPanel, {
        y: h - bottom,
        height: bottom - HUD_BOTTOM_DOCK,
        width: w,
        side: 'bottom',
        corrosion: shear.value,
        accent: shear.accent,
        biomeAccent,
      });
    }
    // Always-visible slim dock strip at the very bottom.
    drawHudStripChrome(this.bottomDockPanel, {
      y: h - HUD_BOTTOM_DOCK,
      height: HUD_BOTTOM_DOCK,
      width: w,
      side: 'bottom',
      corrosion: 0,
      accent: shear.accent,
      biomeAccent,
    });
    // Control micro-legend: right-aligned in the dock.
    const legendStr = '? help  i kit  p PADD  n map  l log';
    this.dockLegendText.setText(legendStr);
    this.dockLegendText.setPosition(w - this.dockLegendText.width - 10, h - HUD_BOTTOM_DOCK + 3);
  }

  private syncShearPresentation(shear = computeShearPressure(this.state)): void {
    if (this.lastShearState !== shear.state) {
      const prev = this.lastShearState;
      this.lastShearState = shear.state;
      // Juice budget ~200ms — never flash-show Calm. Breaching may linger slightly.
      if (shear.state !== 'Calm') {
        this.shearFlashUntil = this.time.now + (shear.state === 'Breaching' ? 280 : 200);
      } else {
        this.shearFlashUntil = 0;
      }
      // Breaching-only climax: camera pressure beat + magnesium pinprick flash.
      if (shear.state === 'Breaching' && prev !== 'Breaching') {
        this.applyCameraCue(shearBreachCue());
        this.flashFx(Theme.arcWhite, 0.16);
      }
    }
    const flash = this.shearFlashUntil > this.time.now;
    // Single loud channel: center readout for Charged+ only (no Calm, no badge).
    if (shear.state === 'Calm') {
      this.shearReadout.setVisible(false);
      this.shearPlate.clear();
      this.shearPlate.setVisible(false);
    } else {
      this.shearReadout.setVisible(true);
      this.shearReadout.setText(shearReadoutLabel(shear));
      this.shearReadout.setColor(
        shear.state === 'Breaching'
          ? ThemeCss.arcWhite
          : shear.state === 'Arcing'
            ? ThemeCss.arc
            : ThemeCss.tape,
      );
      this.shearReadout.setAlpha(flash ? 1 : 0.9);
      this.shearReadout.setPosition(this.scale.width / 2, 7);
      const tw = Math.ceil(this.shearReadout.width);
      const th = Math.ceil(this.shearReadout.height);
      const accent =
        shear.state === 'Breaching'
          ? Theme.arcWhite
          : shear.state === 'Arcing'
            ? Theme.arc
            : Theme.tape;
      this.shearPlate.setVisible(true);
      drawHintPlate(this.shearPlate, this.scale.width / 2, 7 + th / 2, tw, th, { originX: 0.5 });
      // Retint the tab to shear accent (drawHintPlate uses tape by default).
      const pw = Math.max(48, tw + 16);
      const ph = Math.max(16, th + 8);
      const px = Math.round(this.scale.width / 2 - pw / 2);
      const py = Math.round(7 + th / 2 - ph / 2);
      this.shearPlate.fillStyle(accent, 0.9);
      this.shearPlate.fillRect(px + 1, py + 1, 3, ph - 3);
    }
    this.arcSweep?.setPressure(shear.value, shear.accent);
  }

  private rebuildAtmosphere(): void {
    this.arcSweep?.destroy();
    this.arcSweep = createArcSweep(this, 85);
  }

  private buildMapSprites(): void {
    this.clearActionFloats();
    this.tweens.killAll();
    this.windowPulseTween = null;
    this.goalPulseTween = null;
    this.animating = false;
    this.mapLayer.removeAll(true);
    this.propLayer.removeAll(true);
    if (this.goalMarker?.parentContainer === this.itemLayer) {
      this.itemLayer.remove(this.goalMarker, false);
    }
    this.itemLayer.removeAll(true);
    for (const v of this.enemyViews.values()) {
      v.img.destroy();
      v.label.destroy();
    }
    this.enemyViews.clear();
    for (const v of this.npcViews.values()) {
      v.img.destroy();
      v.label.destroy();
    }
    this.npcViews.clear();
    for (const v of this.allyViews.values()) {
      v.img.destroy();
      v.label.destroy();
    }
    this.allyViews.clear();

    // Keep player sprite in entity layer
    if (!this.playerSprite.active) {
      this.playerSprite = this.add.image(0, 0, 't_player');
      this.playerSprite.setDisplaySize(TILE_DRAW, TILE_DRAW);
      this.entityLayer.add(this.playerSprite);
    } else if (this.playerSprite.parentContainer !== this.entityLayer) {
      this.entityLayer.add(this.playerSprite);
    }

    if (this.goalMarker?.active) {
      this.itemLayer.add(this.goalMarker);
    } else if (this.goalMarker) {
      this.goalMarker = this.add.image(0, 0, 't_quest');
      this.goalMarker.setDisplaySize(TILE_DRAW + 4, TILE_DRAW + 4);
      this.goalMarker.setAlpha(0);
      this.goalMarker.setDepth(5);
      this.itemLayer.add(this.goalMarker);
    }

    this.tileSprites = [];
    for (const spr of this.crackSprites.values()) spr.destroy();
    this.crackSprites.clear();
    const { width, height, tiles } = this.state;
    for (let y = 0; y < height; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < width; x++) {
        const kind = tiles[y]![x]!.kind;
        const cx = x * TILE_DRAW + TILE_DRAW / 2;
        const cy = y * TILE_DRAW + TILE_DRAW / 2;
        const img = this.add.image(cx, cy, this.tileKey(kind, x, y));
        if (kind === 'floor') {
          const s = floorScatter(x, y, this.state.seed);
          img.setPosition(cx + s.dx, cy + s.dy);
          img.setDisplaySize(TILE_DRAW + s.pad, TILE_DRAW + s.pad);
        } else {
          img.setDisplaySize(TILE_DRAW + 1, TILE_DRAW + 1);
        }
        // Raised props sit above the shadow layer so umbra falls under the art.
        if (tileCastsPropShadow(kind)) this.propLayer.add(img);
        else this.mapLayer.add(img);
        this.tileSprites[y]![x] = img;
      }
    }
    this.placeSconceOverlays();
    this.snapImg(this.playerSprite, this.state.player.x, this.state.player.y);
    // mapLayer.removeAll destroys overlays — remount graphics that live on the map.
    this.threatGfx = this.add.graphics();
    this.threatGfx.setDepth(80);
    this.mapLayer.add(this.threatGfx);
    this.optionalSiteGfx = this.add.graphics();
    this.optionalSiteGfx.setDepth(81);
    this.mapLayer.add(this.optionalSiteGfx);
    this.rebuildAtmosphere();
  }

  /** Wall fixtures — sprite on the mount wall, nudged toward the lit floor. */
  private placeSconceOverlays(): void {
    const st = this.state;
    const key = sconceTextureKey(st.sectorId);
    this.sconceOverlays = [];
    for (const src of st.lightSources) {
      if (src.fixture !== 'sconce') continue;
      const mx = src.mountX ?? src.x;
      const my = src.mountY ?? src.y;
      if (st.tiles[my]?.[mx]?.kind !== 'wall') continue;
      const dx = src.x - mx;
      const dy = src.y - my;
      const img = this.add.image(
        mx * TILE_DRAW + TILE_DRAW / 2 + dx * 5,
        my * TILE_DRAW + TILE_DRAW / 2 + dy * 5,
        key,
      );
      img.setDisplaySize(TILE_DRAW, TILE_DRAW);
      img.setDepth(2);
      this.mapLayer.add(img);
      this.sconceOverlays.push({ img, x: mx, y: my });
    }
    this.syncSconceOverlays();
  }

  /** Sconces obey FOW like wall art: hidden in shroud, dim in remembered cells. */
  private syncSconceOverlays(): void {
    const st = this.state;
    for (const sconce of this.sconceOverlays) {
      const explored = st.explored[sconce.y]?.[sconce.x] ?? false;
      const visible = st.visible[sconce.y]?.[sconce.x] ?? false;
      if (!explored) {
        sconce.img.setVisible(false);
        continue;
      }
      sconce.img.setVisible(true);
      if (visible) {
        sconce.img.setAlpha(1);
        sconce.img.clearTint();
      } else {
        sconce.img.setAlpha(0.35);
        sconce.img.setTint(Theme.memoryWash);
      }
    }
  }

  private tileKey(kind: string, x = 0, y = 0): string {
    const f = this.animFrame;
    const animated = (base: string): string => (f === 0 ? base : `${base}_${f}`);
    switch (kind) {
      case 'wall':
        return wallTextureKey(
          this.state.sectorId,
          this.wallVariantAt(x, y),
          wallWearAt(x, y, this.state.seed),
        );
      case 'hazard':
        return animated('t_hazard');
      case 'brine_pool':
        return animated('t_brine_pool');
      case 'scrub':
        return 't_scrub';
      case 'scrub_nest':
        return 't_scrub_nest';
      case 'rubble':
        return 't_rubble';
      case 'sealed':
        return 't_sealed';
      case 'tripwire':
        return 't_tripwire';
      case 'vent':
        return animated('t_vent');
      case 'exit':
        return 't_exit';
      case 'beacon':
        return animated('t_beacon');
      case 'shuttle':
        return 't_shuttle';
      case 'landmark':
        return animated('t_landmark');
      case 'quest':
        return animated('t_quest_tile');
      case 'floor': {
        const v = (x + y * 3 + this.state.seed) % 3;
        return floorTextureKey(this.state.sectorId, v);
      }
      default:
        return floorTextureKey(this.state.sectorId, 0);
    }
  }

  /**
   * Wall texture role from open neighbors so corridors read as mass, not wallpaper.
   * 0 continuous run · 1 left-exposed · 2 right-exposed · 3 corner/pillar
   */
  private wallVariantAt(x: number, y: number): number {
    const solid = (tx: number, ty: number): boolean =>
      this.state.tiles[ty]?.[tx]?.kind === 'wall';
    const openL = !solid(x - 1, y);
    const openR = !solid(x + 1, y);
    const openU = !solid(x, y - 1);
    const openD = !solid(x, y + 1);
    if ((openL && openR) || (openU && openD) || ((openL || openR) && (openU || openD))) {
      return 3;
    }
    if (openL) return 1;
    if (openR) return 2;
    return 0;
  }

  /** Hint line the HUD is currently showing (same resolver as HudView). */
  private hintLine(): LoreId | null {
    return resolveHintLine(this.state);
  }

  /** Field-kit plate behind the context hint — never a toast bubble. */
  private syncHintPlate(): void {
    if (!this.hintText.visible) {
      this.hintGfx.clear();
      this.hintGfx.setVisible(false);
      return;
    }
    this.hintGfx.setVisible(true);
    drawHintPlate(
      this.hintGfx,
      this.hintText.x,
      this.hintText.y,
      this.hintText.width,
      this.hintText.height,
      { originX: 0 },
    );
  }

  private handleKey(e: KeyboardEvent): void {
    handleGameKey(e, {
      getState: () => this.state,
      isAnimating: () => this.animating,
      isHelpOpen: () => this.helpOpen,
      isPagesOpen: () => this.pagesOpen,
      isLogOpen: () => this.logOpen,
      queueAction: (action) => {
        this.queuedAction = action;
      },
      getQueuedAction: () => this.queuedAction,
      clearQueuedAction: () => {
        this.queuedAction = null;
      },
      syncFieldAudio: (force) => this.syncFieldAudio(force),
      showMuteHint: (muted) => {
        this.hintText.setVisible(true);
        this.hintText.setText(muted ? lore('UI-MUTE-ON') : lore('UI-MUTE-OFF'));
        this.syncHintPlate();
        this.time.delayedCall(900, () => {
          const hint = this.hintLine();
          if (hint && !this.state.ui.inventoryOpen && !this.helpOpen && !this.pagesOpen) {
            this.hintText.setText(lore(hint));
            this.hintText.setVisible(true);
          } else {
            this.hintText.setVisible(false);
          }
          this.syncHintPlate();
        });
      },
      startEndScene: () => {
        this.scene.start('End', {
          status: this.state.status,
          loseReason: this.state.loseReason,
          seed: this.state.seed,
          turn: this.state.turn,
          level: this.state.level,
          skills: this.state.skills,
          objective: lore(describeObjective(this.state).campaign),
        });
      },
      toggleHelp: (force) => this.toggleHelp(force),
      togglePages: (force) => this.togglePages(force),
      toggleLog: (force) => this.toggleLog(force),
      toggleMinimap: () => {
        this.minimap.toggle();
        this.minimap.redraw(this.state);
      },
      afterUiChrome: (opts) => {
        this.redrawTilesAndHud();
        if (opts?.syncItems) this.syncItems();
      },
      showSkillHint: () => {
        this.hintText.setVisible(true);
        this.hintText.setText(lore('UI-HINT-SKILL'));
        this.syncHintPlate();
      },
      commitTurnAction: (action) => this.commitTurnAction(action),
    });
  }

  private flushQueuedAction(): void {
    const next = this.queuedAction;
    this.queuedAction = null;
    if (!next || this.state.status !== 'playing' || this.animating) return;
    this.commitTurnAction(next);
  }

  private commitTurnAction(action: Action): void {
    this.queuedAction = null;
    this.releaseFirstLight();
    const prevSector = this.state.sectorIndex;
    const prevTutorialActive = this.state.tutorialActive;
    const prevMapWidth = this.state.width;
    const prevMapHeight = this.state.height;
    const prevHp = this.state.player.hp;
    const prevEnergy = this.state.player.energy;
    const prevArmor = this.state.player.armor;
    const prevFlank = flankPenalty(this.state);
    const prevLogLen = this.state.log.length;
    const prevAlive = this.state.enemies.filter((en) => en.alive).length;
    const fromPlayer = { x: this.state.player.x, y: this.state.player.y };
    const prevEnemySnap = this.state.enemies.map((en) => ({
      id: en.id,
      x: en.x,
      y: en.y,
      hp: en.hp,
      alive: en.alive,
      kind: en.kind,
    }));
    const prevAllySnap = this.state.allies.map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      alive: a.alive,
    }));
    const prevNpcSnap = this.state.npcs.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
    }));

    applyAction(this.state, action);

    const fb = presentActionFeedback({
      state: this.state,
      action,
      prevSector,
      prevTutorialActive,
      prevMapWidth,
      prevMapHeight,
      prevHp,
      prevLogLen,
      prevAlive,
      fromPlayer,
      prevEnemySnap,
      prevAllySnap,
      prevNpcSnap,
      lights: this.lightView,
      flash: (color, alpha) => this.flashFx(color, alpha),
      tintHitEnemies: () => tintVisibleEnemies(this.time, this.enemyViews.values()),
    });
    this.playEventCamera(fb.newLogs);
    this.queueLightPreferenceHint();
    const floatOpts = {
      vitals: {
        hpDelta: this.state.player.hp - prevHp,
        energyDelta: this.state.player.energy - prevEnergy,
        armorDelta: this.state.player.armor - prevArmor,
      },
      flankBefore: prevFlank,
      flankAfter: flankPenalty(this.state),
    };
    if (this.state.player.hp < prevHp) {
      tintPlayerHurt(this.time, this.playerSprite);
    }
    // Meter stamps fire with floats — don't wait for the move tween to finish.
    if (!fb.mapReloaded) this.redrawHudEager();

    if (fb.mapReloaded) {
      this.resetLevelTooltips();
      this.lightView.clearFx();
      this.buildMapSprites();
      this.syncItems();
      this.syncActors(true);
      this.redrawTilesAndHud();
      this.updateCamera(true);
      this.syncFieldAudio(true);
      this.startFirstLight();
      // Spawn after rebuild — killAll() would freeze hatch floats in the world.
      this.showActionFloats(this.state.log.slice(prevLogLen), floatOpts);
      if (this.state.player.hp < prevHp) this.flashHit();
      this.maybeEnd();
      this.flushQueuedAction();
      return;
    }

    this.showActionFloats(this.state.log.slice(prevLogLen), floatOpts);

    music.syncField({
      sectorId: this.state.sectorId,
      sectorIndex: this.state.sectorIndex,
      playerEnergy: this.state.player.energy,
      maxEnergy: this.state.player.maxEnergy,
      inCombat: this.threatNearby(),
    });

    // Light travels with the hop — capture the old wash, compute destination into
    // caches only (no sprite paint), then lock at t=0 so nothing flashes ahead.
    if (fb.playerMoved) {
      this.lightView.captureMoveFrom(fromPlayer, {
        x: this.state.player.x,
        y: this.state.player.y,
      });
    }
    this.applyFieldLighting();
    if (fb.playerMoved) {
      this.moveLightFxStep = -1;
      this.lightView.lockMoveBlend(this.tileSprites, this.state.sectorId);
      this.lightView.paintMoveTextures(this.state, this.tileSprites, (kind, x, y) =>
        this.tileKey(kind, x, y),
      );
      this.lightView.setMoveLightProgress(0, this.tileSprites);
      this.refreshMoveLightFx();
    }
    this.syncItems();

    const phaserTarget = phaserBeamTargetTile(
      fb.newLogs,
      fromPlayer,
      fb.hitTiles,
      action,
      this.state,
    );
    if (phaserTarget) {
      playPhaserBeam(
        this.tweens,
        this.lightLayer,
        (gx, gy) => this.worldXY(gx, gy),
        fromPlayer,
        { x: phaserTarget.x, y: phaserTarget.y },
      );
    }

    const afterPresent = (opts?: { juice?: boolean }) => {
      if (opts?.juice !== false) {
        playCombatContactJuice(this.tweens, {
          action,
          playerMoved: fb.playerMoved,
          prevHp,
          state: this.state,
          playerSprite: this.playerSprite,
          enemyViews: this.enemyViews,
          worldXY: (gx, gy) => this.worldXY(gx, gy),
        });
      }
      this.lightView.endMoveLight();
      this.redrawTilesAndHud();
      this.syncActors(true);
      this.maybeEnd();
      this.flushQueuedAction();
    };

    if (fb.playerMoved || fb.enemyMoved) {
      playMoveAnims(this.moveAnimHost(), fromPlayer, fb.fromEnemies, afterPresent, {
        fromAllies: fb.fromAllies,
        fromNpcs: fb.fromNpcs,
      });
      return;
    }

    if (phaserTarget) {
      playCombatContactJuice(this.tweens, {
        action,
        playerMoved: fb.playerMoved,
        prevHp,
        state: this.state,
        playerSprite: this.playerSprite,
        enemyViews: this.enemyViews,
        worldXY: (gx, gy) => this.worldXY(gx, gy),
      });
      this.animating = true;
      this.time.delayedCall(PHASER_BEAM_MS, () => {
        this.animating = false;
        afterPresent({ juice: false });
      });
      return;
    }

    afterPresent();
  }

  private moveAnimHost() {
    return {
      setAnimating: (v: boolean) => {
        this.animating = v;
      },
      worldXY: (gx: number, gy: number) => this.worldXY(gx, gy),
      tweens: this.tweens,
      time: this.time,
      playerSprite: this.playerSprite,
      enemyViews: this.enemyViews,
      allyViews: this.allyViews,
      npcViews: this.npcViews,
      state: this.state,
      syncActors: (snap: boolean) => this.syncActors(snap),
      snapImg: (img: Phaser.GameObjects.Image, gx: number, gy: number) => this.snapImg(img, gx, gy),
      onPlayerMoveLight: (t: number) => this.tickMoveLight(t),
    };
  }

  /**
   * Lamp wash follows every surveyor hop frame; bloom/shadows step ~8× so the
   * CPU stays free. Enemy-only hops still refresh shadows (no wash blend).
   */
  private tickMoveLight(t: number): void {
    if (this.lightView.hasMoveBlend()) {
      this.lightView.setMoveLightProgress(t, this.tileSprites);
    }
    const step = t >= 1 ? 8 : Math.floor(t * 8);
    if (step === this.moveLightFxStep) return;
    this.moveLightFxStep = step;
    this.refreshMoveLightFx();
  }

  private refreshMoveLightFx(): void {
    const st = this.state;
    const sources = this.lightView.allSources(st, this.animFrame, this.bodyLightAt());
    // Skip motes mid-hop — static grit under a moving wash reads as noise.
    this.lightView.drawBloom(sources, st.visible, st.tiles, st.sectorId);
    this.lightView.drawDynamicShadows(
      st,
      this.shadowCasters(),
      sources,
      this.firstLight,
    );
    this.applyAllActorLighting(sources);
  }

  /** Mid-hop positions for movers whose bloom should travel with the sprite. */
  private bodyLightAt(): {
    enemy: (id: number) => { x: number; y: number } | null;
    ally: (id: number) => { x: number; y: number } | null;
  } {
    return {
      enemy: (id) => {
        const v = this.enemyViews.get(id);
        return v ? { x: v.gx, y: v.gy } : null;
      },
      ally: (id) => {
        const v = this.allyViews.get(id);
        return v ? { x: v.gx, y: v.gy } : null;
      },
    };
  }

  private *litActorViews(): Generator<{
    img: Phaser.GameObjects.Image;
    gx: number;
    gy: number;
  }> {
    for (const view of this.enemyViews.values()) {
      if (!view.dying) yield view;
    }
    for (const view of this.allyViews.values()) {
      if (!view.dying) yield view;
    }
    yield* this.npcViews.values();
  }

  private applyAllActorLighting(
    sources: ReturnType<LightView['allSources']>,
  ): void {
    this.lightView.applyActorLighting(
      this.state,
      this.playerSprite,
      this.litActorViews(),
      sources,
    );
    // Talked contacts stay dimmer than flood alone would allow.
    for (const n of this.state.npcs) {
      if (!n.talked) continue;
      const view = this.npcViews.get(n.id);
      if (view?.img.visible) view.img.setAlpha(view.img.alpha * 0.45);
    }
  }

  private maybeEnd(): void {
    if (this.state.status === 'playing') return;
    if (this.state.status === 'lost' && !this.playerDying) {
      this.playerDying = true;
      playPlayerDeath(this.tweens, this.playerSprite);
    }
    this.time.delayedCall(450, () => {
      this.scene.start('End', {
        status: this.state.status,
        loseReason: this.state.loseReason,
        seed: this.state.seed,
        turn: this.state.turn,
        level: this.state.level,
        skills: this.state.skills,
        objective: lore(describeObjective(this.state).campaign),
      });
    });
  }

  private syncItems(): void {
    // Keep goal marker across refresh — removeAll(true) would destroy it
    if (this.goalMarker?.parentContainer === this.itemLayer) {
      this.itemLayer.remove(this.goalMarker, false);
    }
    this.itemLayer.removeAll(true);
    const st = this.state;
    for (const item of st.items) {
      const seen = st.explored[item.y]![item.x];
      const vis = st.visible[item.y]![item.x];
      if (!seen) continue;
      const quest = item.kind === 'relay_key' || item.kind === 'nav_core';
      // Non-quest loot only while in FOV; quest items leave a dim memory ghost
      if (!vis && !quest) continue;
      const tex =
        item.kind === 'nav_core' ? 't_nav_core' : item.kind === 'relay_key' ? 't_key' : 't_item';
      const spr = this.add.image(
        item.x * TILE_DRAW + TILE_DRAW / 2,
        item.y * TILE_DRAW + TILE_DRAW / 2,
        tex,
      );
      spr.setDisplaySize(TILE_DRAW - 4, TILE_DRAW - 4);
      spr.setAlpha(vis ? 1 : 0.3);
      if (!vis) spr.setTint(Theme.memoryWash);
      this.itemLayer.add(spr);
      if (quest && vis) {
        this.tweens.add({
          targets: spr,
          alpha: 0.55,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }
    }
    if (this.goalMarker?.active) {
      this.itemLayer.add(this.goalMarker);
    }
  }

  private syncActors(snapPositions: boolean): void {
    const st = this.state;
    const aliveIds = new Set<number>();
    const visAt = (x: number, y: number): boolean =>
      st.visible[Math.round(y)]?.[Math.round(x)] ?? false;

    for (const en of st.enemies) {
      if (!en.alive) continue;
      aliveIds.add(en.id);
      const destVis = visAt(en.x, en.y);
      let view = this.enemyViews.get(en.id);
      if (!view) {
        const img = this.add.image(0, 0, enemyTextureKey(en.kind, this.animFrame % 3));
        // Tier reads as physical presence, sourced from sim state rather than
        // baked per kind, so a scaled-up spawn still looks like what it is.
        const bulk = en.tier === 'boss' ? 6 : en.tier === 'elite' ? 3 : 0;
        img.setDisplaySize(TILE_DRAW - 2 + bulk, TILE_DRAW - 2 + bulk);
        // Silhouette only while idle — windup markers replace text in updateEnemyIntentLabel.
        const label = this.add.text(0, 0, '', {
          fontFamily: FONT_DATA,
          fontSize: '11px',
          color: ThemeCss.inkBright,
          stroke: ThemeCss.groundDeep,
          strokeThickness: 3,
        });
        label.setOrigin(0.5, 1);
        label.setVisible(false);
        this.entityLayer.add(img);
        this.entityLayer.add(label);
        view = { img, label, gx: en.x, gy: en.y };
        this.enemyViews.set(en.id, view);
        this.snapImg(img, en.x, en.y);
        label.setPosition(img.x, img.y - TILE_DRAW / 2 + 5);
      }
      // Mid-hop: keep visible while either the body tile or dest is in FOV.
      const visible = snapPositions ? destVis : destVis || visAt(view.gx, view.gy);
      view.img.setVisible(visible);
      view.label.setVisible(visible);
      view.img.setTexture(enemyTextureKey(en.kind, this.animFrame % 3));
      this.updateEnemyIntentLabel(view, en);
      if (snapPositions) {
        this.snapImg(view.img, en.x, en.y);
        view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 5);
        view.gx = en.x;
        view.gy = en.y;
      }
    }

    for (const [id, view] of this.enemyViews) {
      if (aliveIds.has(id) || view.dying) continue;
      this.beginActorDeath(this.enemyViews, id, view);
    }

    const npcIds = new Set<number>();
    for (const n of st.npcs) {
      npcIds.add(n.id);
      const destVis = visAt(n.x, n.y);
      let view = this.npcViews.get(n.id);
      if (!view) {
        const img = this.add.image(0, 0, npcTextureKey(n.kind));
        img.setDisplaySize(TILE_DRAW - 2, TILE_DRAW - 2);
        const label = this.add.text(0, 0, '', {
          fontFamily: FONT_DATA,
          fontSize: '14px',
          color: ThemeCss.tape,
          stroke: ThemeCss.groundDeep,
          strokeThickness: 4,
        });
        label.setOrigin(0.5, 1);
        label.setVisible(false);
        this.entityLayer.add(img);
        this.entityLayer.add(label);
        view = { img, label, gx: n.x, gy: n.y };
        this.npcViews.set(n.id, view);
        this.snapImg(img, n.x, n.y);
        label.setPosition(img.x, img.y - TILE_DRAW / 2 + 2);
      }
      const visible = snapPositions ? destVis : destVis || visAt(view.gx, view.gy);
      view.img.setVisible(visible);
      this.updateNpcQuestLabel(view, n, visible);
      view.img.setAlpha(n.talked ? 0.45 : 1);
      if (snapPositions) {
        this.snapImg(view.img, n.x, n.y);
        view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 2);
        view.gx = n.x;
        view.gy = n.y;
      }
    }
    for (const [id, view] of this.npcViews) {
      if (!npcIds.has(id)) {
        view.img.destroy();
        view.label.destroy();
        this.npcViews.delete(id);
      }
    }

    const allyIds = new Set<number>();
    for (const a of st.allies) {
      if (!a.alive) continue;
      allyIds.add(a.id);
      const destVis = visAt(a.x, a.y);
      let view = this.allyViews.get(a.id);
      if (!view) {
        const img = this.add.image(0, 0, allyTextureKey(a.kind));
        img.setDisplaySize(TILE_DRAW - 2, TILE_DRAW - 2);
        // Silhouette only — no letter glyphs over field allies.
        const label = this.add.text(0, 0, '', {
          fontFamily: FONT_DATA,
          fontSize: '11px',
          color: ThemeCss.biolum,
          stroke: ThemeCss.groundDeep,
          strokeThickness: 3,
        });
        label.setOrigin(0.5, 1);
        label.setVisible(false);
        this.entityLayer.add(img);
        this.entityLayer.add(label);
        view = { img, label, gx: a.x, gy: a.y };
        this.allyViews.set(a.id, view);
        this.snapImg(img, a.x, a.y);
        label.setPosition(img.x, img.y - TILE_DRAW / 2 + 5);
      }
      const visible = snapPositions ? destVis : destVis || visAt(view.gx, view.gy);
      view.img.setVisible(visible);
      view.label.setVisible(false);
      view.img.setTexture(allyTextureKey(a.kind));
      if (snapPositions) {
        this.snapImg(view.img, a.x, a.y);
        view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 5);
        view.gx = a.x;
        view.gy = a.y;
      }
    }
    for (const [id, view] of this.allyViews) {
      if (allyIds.has(id) || view.dying) continue;
      this.beginActorDeath(this.allyViews, id, view);
    }

    this.playerSprite.setVisible(true);
    if (snapPositions && !this.playerDying) this.snapImg(this.playerSprite, st.player.x, st.player.y);
    // Keep player on top
    this.entityLayer.bringToTop(this.playerSprite);
  }

  private beginActorDeath(
    map: Map<number, EnemyView>,
    id: number,
    view: EnemyView,
  ): void {
    playActorDeath(this.tweens, view, () => {
      map.delete(id);
    });
  }

  private updateEnemyIntentLabel(
    view: EnemyView,
    enemy: GameState['enemies'][number],
  ): void {
    if (enemy.windup <= 0) {
      // Trust silhouette — no idle letter glyphs.
      view.label.setText('');
      view.label.setVisible(false);
      return;
    }
    // Marker names the windup type so the player can choose leave vs fight.
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

  private updateNpcQuestLabel(
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

  private updateCamera(snap: boolean): void {
    const viewW = this.scale.width;
    const bottom = this.bottomInset();
    const viewH = this.scale.height - TOP - bottom;
    const targetX = this.playerSprite.x - viewW / 2;
    const targetY = this.playerSprite.y - viewH / 2;
    if (snap) {
      this.camX = targetX;
      this.camY = targetY;
    } else {
      this.camX += (targetX - this.camX) * 0.28;
      this.camY += (targetY - this.camY) * 0.28;
    }
    const nudge = this.camKick.offset(this.time.now);
    // World-layer zoom toward the player (not Phaser camera — HUD stays unzoomed).
    const zoom = this.camKick.zoom(this.time.now);
    const fx = this.playerSprite.x;
    const fy = this.playerSprite.y;
    const ox = -this.camX + nudge.x + fx * (1 - zoom);
    const oy = -this.camY + TOP + nudge.y + fy * (1 - zoom);
    const camMoved =
      snap ||
      Math.abs(ox - this.lastCamOx) > 0.2 ||
      Math.abs(oy - this.lastCamOy) > 0.2 ||
      Math.abs(zoom - this.lastCamZoom) > 0.0005;
    if (camMoved) {
      this.lastCamOx = ox;
      this.lastCamOy = oy;
      this.lastCamZoom = zoom;
      for (const layer of [
        this.mapLayer,
        this.shadowLayer,
        this.propLayer,
        this.lightLayer,
        this.itemLayer,
        this.entityLayer,
      ]) {
        layer.setScale(zoom);
        layer.setPosition(ox, oy);
      }
    }
    // Chevron redraw is cheap-ish but not free — keep it off the hot idle path.
    if (snap || this.time.now - this.lastGoalSyncAt >= 48) {
      this.lastGoalSyncAt = this.time.now;
      this.syncGoalVisuals(describeObjective(this.state).pos);
      this.syncOptionalSiteVisuals();
    }
  }

  /** Pulse explored/visible extract goal; edge chevron when known but off-screen. */
  private syncGoalVisuals(pos: { x: number; y: number } | null): void {
    this.chevronGfx.clear();
    const st = this.state;
    if (!pos) {
      this.goalMarker.setAlpha(0);
      this.goalPulseTween?.stop();
      this.goalPulseTween = null;
      return;
    }

    const explored = st.explored[pos.y]?.[pos.x] === true;
    const visible = st.visible[pos.y]?.[pos.x] === true;
    const mapperReveal = st.player.mapperTurns > 0;
    if (!explored && !visible && !mapperReveal) {
      this.goalMarker.setAlpha(0);
      this.goalPulseTween?.stop();
      this.goalPulseTween = null;
      return;
    }

    const wx = pos.x * TILE_DRAW + TILE_DRAW / 2;
    const wy = pos.y * TILE_DRAW + TILE_DRAW / 2;
    this.goalMarker.setPosition(wx, wy);
    this.goalMarker.setTint(Theme.flag);
    if (!this.goalPulseTween) {
      this.goalMarker.setAlpha(0.75);
      this.goalPulseTween = this.tweens.add({
        targets: this.goalMarker,
        alpha: 0.35,
        duration: 520,
        yoyo: true,
        repeat: -1,
      });
    }

    // Screen-space position of goal
    const screenX = wx - this.camX;
    const screenY = wy - this.camY + TOP;
    const pad = 18;
    const left = pad;
    const right = this.scale.width - pad;
    const top = TOP + pad;
    const bottomInset = this.bottomInset();
    const bottom = this.scale.height - bottomInset - pad;
    const onScreen =
      screenX >= left && screenX <= right && screenY >= top && screenY <= bottom;
    if (onScreen) return;

    const cx = this.scale.width / 2;
    const cy = TOP + (this.scale.height - TOP - bottomInset) / 2;
    const dx = screenX - cx;
    const dy = screenY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // Clamp to viewport edge
    const edgeDistX = ux > 0 ? (right - cx) / ux : ux < 0 ? (left - cx) / ux : Infinity;
    const edgeDistY = uy > 0 ? (bottom - cy) / uy : uy < 0 ? (top - cy) / uy : Infinity;
    const edgeDist = Math.min(Math.abs(edgeDistX), Math.abs(edgeDistY));
    const ex = cx + ux * edgeDist;
    const ey = cy + uy * edgeDist;

    this.chevronGfx.fillStyle(Theme.flag, 0.95);
    this.chevronGfx.lineStyle(1, Theme.inkBright, 1);
    const s = 10;
    const px = -uy;
    const py = ux;
    this.chevronGfx.fillTriangle(
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
   */
  private syncOptionalSiteVisuals(): void {
    this.optionalSiteGfx.clear();
    // Screen-space optional pip reuses chevronGfx after extract triangle may have drawn.
    const st = this.state;
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
    const a = flash ? 0.95 : onPlayer ? 0.9 : 0.7;

    // Dashed amber frame in world space (mapLayer).
    this.optionalSiteGfx.lineStyle(2, Theme.tape, a);
    const inset = 3;
    const x0 = wx + inset;
    const y0 = wy + inset;
    const x1 = wx + TILE_DRAW - inset;
    const y1 = wy + TILE_DRAW - inset;
    const dash = 5;
    const gap = 3;
    const strokeDashed = (ax: number, ay: number, bx: number, by: number) => {
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      let d = 0;
      while (d < len) {
        const seg = Math.min(dash, len - d);
        this.optionalSiteGfx.lineBetween(
          ax + ux * d,
          ay + uy * d,
          ax + ux * (d + seg),
          ay + uy * (d + seg),
        );
        d += dash + gap;
      }
    };
    strokeDashed(x0, y0, x1, y0);
    strokeDashed(x1, y0, x1, y1);
    strokeDashed(x1, y1, x0, y1);
    strokeDashed(x0, y1, x0, y0);

    // Corner bolts — furniture tell vs extract diamond.
    this.optionalSiteGfx.fillStyle(Theme.tape, a);
    for (const [cx, cy] of [
      [x0, y0],
      [x1 - 3, y0],
      [x0, y1 - 3],
      [x1 - 3, y1 - 3],
    ] as const) {
      this.optionalSiteGfx.fillRect(cx, cy, 3, 3);
    }

    if (onPlayer) {
      // Interact caret above the console.
      const cx = wx + TILE_DRAW / 2;
      const cy = wy + 6;
      this.optionalSiteGfx.fillStyle(Theme.inkBright, 0.95);
      this.optionalSiteGfx.fillTriangle(cx, cy - 5, cx - 5, cy + 3, cx + 5, cy + 3);
      this.optionalSiteGfx.fillStyle(Theme.tape, 0.9);
      this.optionalSiteGfx.fillRect(cx - 1.5, cy + 4, 3, 5);
    }

    // Tint the console tile amber so it reads before the frame.
    const tile = this.tileSprites[step.pos.y]?.[step.pos.x];
    if (tile && visible) tile.setTint(Theme.tape);

    const screenX = wx + TILE_DRAW / 2 - this.camX;
    const screenY = wy + TILE_DRAW / 2 - this.camY + TOP;
    const pad = 18;
    const left = pad;
    const right = this.scale.width - pad;
    const top = TOP + pad;
    const bottomInset = this.bottomInset();
    const bottom = this.scale.height - bottomInset - pad;
    const onScreen =
      screenX >= left && screenX <= right && screenY >= top && screenY <= bottom;
    if (onScreen) return;

    const scx = this.scale.width / 2;
    const scy = TOP + (this.scale.height - TOP - bottomInset) / 2;
    const dx = screenX - scx;
    const dy = screenY - scy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const edgeDistX = ux > 0 ? (right - scx) / ux : ux < 0 ? (left - scx) / ux : Infinity;
    const edgeDistY = uy > 0 ? (bottom - scy) / uy : uy < 0 ? (top - scy) / uy : Infinity;
    const edgeDist = Math.min(Math.abs(edgeDistX), Math.abs(edgeDistY));
    const ex = scx + ux * edgeDist;
    const ey = scy + uy * edgeDist;
    // Square pip — distinct from pink extract triangle.
    this.chevronGfx.lineStyle(2, Theme.tape, 0.95);
    this.chevronGfx.strokeRect(ex - 5, ey - 5, 10, 10);
    this.chevronGfx.fillStyle(Theme.tape, 0.35);
    this.chevronGfx.fillRect(ex - 3, ey - 3, 6, 6);
  }

  private toggleHelp(force?: boolean): void {
    this.helpOpen = force ?? !this.helpOpen;
    if (this.helpOpen && this.pagesOpen) this.togglePages(false);
    this.helpBg.setVisible(this.helpOpen);
    this.helpPanel.setVisible(this.helpOpen);
    this.helpText.setVisible(this.helpOpen);
    if (this.helpOpen) {
      drawHelpOverlay(
        this.helpPanel,
        this.helpText,
        this.scale.width,
        this.scale.height,
        this.state.tutorialActive,
      );
    }
  }

  private togglePages(force?: boolean): void {
    this.pagesOpen = force ?? !this.pagesOpen;
    if (this.pagesOpen && this.helpOpen) this.toggleHelp(false);
    this.pagesBg.setVisible(this.pagesOpen);
    this.pagesPanel.setVisible(this.pagesOpen);
    this.pagesText.setVisible(this.pagesOpen);
    if (this.pagesOpen) {
      drawPaddOverlay(
        this.pagesPanel,
        this.pagesText,
        this.scale.width,
        this.scale.height,
        this.state.codexLog,
        this.state.codexPages,
      );
    }
  }

  private toggleLog(force?: boolean): void {
    this.logOpen = force ?? !this.logOpen;
    this.logText.setVisible(this.logOpen);
    this.layoutBottomChrome();
    this.redrawTilesAndHud();
  }

  /** Reposition hint / log / signal rail after inset changes. */
  private layoutBottomChrome(): void {
    const h = this.scale.height;
    const bottom = this.bottomInset();
    this.logText.setPosition(12, h - bottom + 10);
    const railH = this.syncSignalRail();
    this.hintText.setPosition(14, h - bottom - 16 - railH);
    this.syncHintPlate();
  }

  /** Dock recent causal chips when the text log is closed. Returns stack height. */
  private syncSignalRail(): number {
    return layoutSignalRail(this.signalRailGfx, this.signalRailTexts, this.recentSignals, {
      screenH: this.scale.height,
      bottomInset: this.bottomInset(),
      visible: !this.logOpen,
    });
  }

  private flashHit(): void {
    flashHit(this.tweens, this.flash);
  }

  /** Hint line + signal rail — do not carry coaching from the prior sector. */
  private resetLevelTooltips(): void {
    const chrome = this.ephemeralFieldChrome();
    resetEphemeralFieldChrome(chrome);
    this.preferenceHint = chrome.preferenceHint;
  }

  private clearActionFloats(): void {
    for (const text of this.actionFloatTexts) {
      this.tweens.killTweensOf(text);
      text.destroy();
    }
    this.actionFloatTexts = [];
  }

  private ephemeralFieldChrome(): EphemeralFieldChrome {
    return {
      lightPreferenceHints: this.lightPreferenceHints,
      preferenceHint: this.preferenceHint,
      recentSignals: this.recentSignals,
    };
  }

  private queueLightPreferenceHint(): void {
    const enemy = this.state.enemies.find(
      (en) =>
        en.alive &&
        !this.lightPreferenceHints.has(en.id) &&
        (this.state.visible[en.y]?.[en.x] ?? false) &&
        ENEMIES[en.kind].lightPrefer,
    );
    if (!enemy) return;

    this.lightPreferenceHints.add(enemy.id);
    this.preferenceHint = {
      id: ENEMIES[enemy.kind].lightPrefer === 'dark' ? 'UI-HINT-PREFER-DARK' : 'UI-HINT-PREFER-LIT',
      until: this.time.now + 800,
    };
  }

  private showActionFloats(
    logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>,
    opts?: {
      vitals?: { hpDelta?: number; energyDelta?: number; armorDelta?: number };
      flankBefore?: number;
      flankAfter?: number;
    },
  ): void {
    const labels = causalActionFloats(logs, opts);
    this.recentSignals = pushSignalRail(this.recentSignals, labels);
    this.layoutBottomChrome();
    const base = this.worldXY(this.state.player.x, this.state.player.y);
    labels.forEach((label, index) => {
      const text = this.add
        .text(base.x, base.y - 16 - index * 14, label.label, {
          fontFamily: FONT_DATA,
          fontSize: '11px',
          color: label.color,
          stroke: ThemeCss.groundDeep,
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(30)
        .setScale(1.06);
      this.entityLayer.add(text);
      this.entityLayer.bringToTop(text);
      this.actionFloatTexts.push(text);
      // Hold readable, then fade — Cubic.easeIn keeps alpha high early.
      this.tweens.add({
        targets: text,
        y: text.y - 22,
        alpha: 0,
        scale: 1,
        duration: ACTION_FLOAT_MS,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          text.destroy();
          this.actionFloatTexts = this.actionFloatTexts.filter((t) => t !== text);
        },
      });
    });
  }

  /** HUD meters/stamps only — same frame as floats; full redraw still runs after hop. */
  private redrawHudEager(): void {
    const st = this.state;
    const shear = computeShearPressure(st);
    this.syncShearPresentation(shear);
    const pulseBox = { current: this.windowPulseTween };
    this.hud.redraw(st, {
      screenW: this.scale.width,
      screenH: this.scale.height,
      helpOpen: this.helpOpen,
      pagesOpen: this.pagesOpen,
      logOpen: this.logOpen,
      tweens: this.tweens,
      windowPulseTween: pulseBox,
      shear,
      biomeAccent: BIOME_FLOOR_TINT[st.sectorId],
    });
    this.windowPulseTween = pulseBox.current;
  }

  private flashFx(color: number, alpha: number): void {
    flashScreen(this.tweens, this.flash, color, alpha);
  }

  /**
   * Event camera — one ranked cue per turn (profiles: punch/snap/pressure/bloom/reward/hush).
   * Cosmetic only; never delays input. World layers zoom; HUD stays 1:1.
   */
  private playEventCamera(logs: readonly LoreId[]): void {
    const cue = pickCameraCue(logs);
    if (!cue) return;
    this.applyCameraCue(cue);
  }

  private applyCameraCue(cue: CameraCue): void {
    if (cue.shakeMs > 0 && cue.shakeIntensity > 0) {
      this.cameras.main.shake(cue.shakeMs, cue.shakeIntensity);
    }
    if (cue.vignette > 0) {
      this.cameraAtmosphere?.pulse(cue.vignette, cue.vignetteMs);
    }
    this.camKick.apply(cue, this.time.now, this.state.turn);
    if (cue.ignite) {
      const color =
        cue.ignite === 'flare'
          ? LightTemp.flare
          : cue.ignite === 'fauna'
            ? LightTemp.fauna
            : LightTemp.scan;
      const radius = cue.ignite === 'flare' ? 6 : cue.ignite === 'fauna' ? 4 : 7;
      this.lightView.ignite(
        this,
        this.lightLayer,
        this.state.player.x,
        this.state.player.y,
        radius,
        color,
      );
    }
  }

  /** Biome-native field motes — ecology in the air, rebuilt each tick inside FOV. */
  private drawFieldMotes(): void {
    const st = this.state;
    this.fieldMotes.clear();
    let count = 0;
    const maxMotes = 52;
    const sector = st.sectorId;

    for (let y = 0; y < st.height && count < maxMotes; y++) {
      for (let x = 0; x < st.width && count < maxMotes; x++) {
        if (!st.visible[y]?.[x] || tileBrightness(st, x, y) < 0.22) continue;
        const hash = (x * 73856093) ^ (y * 19349663) ^ (st.seed * 83492791);
        // Density gate — denser in ash/duct/brine, sparse on open shelf.
        const dens =
          sector === 'ash' || sector === 'duct' || sector === 'brine' || sector === 'flood'
            ? 5
            : sector === 'canopy' || sector === 'reef'
              ? 6
              : 8;
        if (Math.abs(hash) % dens !== this.animFrame % Math.min(4, dens)) continue;

        const ox = 4 + (Math.abs(hash >> 7) % Math.max(1, TILE_DRAW - 8));
        let oy =
          4 +
          ((Math.abs(hash >> 13) + this.animFrame) % Math.max(1, TILE_DRAW - 8));
        const px = x * TILE_DRAW + ox;
        const py = y * TILE_DRAW + oy;

        if (sector === 'ash' || sector === 'approach') {
          // Fallout grit drifting down.
          oy = (oy + this.animFrame * 2) % Math.max(1, TILE_DRAW - 6);
          this.fieldMotes.fillStyle(Theme.arc, 0.35);
          this.fieldMotes.fillRect(px, y * TILE_DRAW + oy, 1, 2);
        } else if (sector === 'brine' || sector === 'flood' || sector === 'reef') {
          // Cool mist beads.
          this.fieldMotes.fillStyle(Theme.biolum, 0.4);
          this.fieldMotes.fillRect(px, py, 2, 1);
          if ((hash & 3) === 0) {
            this.fieldMotes.fillStyle(Theme.biolumDeep, 0.35);
            this.fieldMotes.fillRect(px + 1, py + 2, 1, 1);
          }
        } else if (sector === 'duct' || sector === 'spire' || sector === 'vault') {
          // Steam / conduit vapour rising.
          oy = (TILE_DRAW - 6 - ((oy + this.animFrame) % Math.max(1, TILE_DRAW - 6))) | 0;
          this.fieldMotes.fillStyle(Theme.inkDim, 0.32);
          this.fieldMotes.fillRect(px, y * TILE_DRAW + oy, 1, 3);
        } else if (sector === 'canopy') {
          // Pollen / leaf flecks.
          this.fieldMotes.fillStyle(Theme.safe, 0.38);
          this.fieldMotes.fillRect(px, py, 2, 1);
          this.fieldMotes.fillRect(px + 1, py + 1, 1, 1);
        } else {
          // Open shelf grit + rare biolum mote.
          const ion = (Math.abs(hash >> 4) + this.animFrame) % 6 === 0;
          this.fieldMotes.fillStyle(ion ? Theme.biolum : Theme.inkBright, ion ? 0.45 : 0.26);
          this.fieldMotes.fillRect(px, py, ion ? 2 : 1, ion ? 2 : 1);
        }
        count += 1;
      }
    }
  }

  private applyFieldLighting(): void {
    const st = this.state;
    const shear = computeShearPressure(st);
    this.lightView.syncTurn(st.turn);
    const sources = this.lightView.allSources(st, this.animFrame, this.bodyLightAt());

    // Mid-hop: keep blending the captured wash — don't snap tiles to the destination.
    if (this.lightView.hasMoveBlend()) {
      this.refreshMoveLightFx();
      return;
    }

    const pending = this.lightView.hasPendingMoveBlend();
    this.lightView.applyTileLighting(
      st,
      this.tileSprites,
      (kind, x, y) => this.tileKey(kind, x, y),
      sources,
      { paintSprites: !pending },
    );
    // Pending hop: destination wash is cached only — sprites stay on the from frame
    // until lockMoveBlend + refreshMoveLightFx start the carry.
    if (pending) return;

    this.drawFieldMotes();
    this.lightView.drawBloom(sources, st.visible, st.tiles, st.sectorId);
    this.lightView.drawDynamicShadows(
      st,
      this.shadowCasters(),
      sources,
      this.firstLight,
    );
    this.applyAllActorLighting(sources);

    drawThreatZones(this.threatGfx, st, this.animFrame);

    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const tile = this.tileSprites[y]?.[x];
        if (!tile) continue;
        const patch = st.contamination.some((c) => c.x === x && c.y === y);
        if (patch && st.visible[y]?.[x]) {
          tile.setTint(Theme.biolum);
        } else {
          // Keep the wash from applyTileLighting — clearing wiped SHADOW band tint.
          const tint = this.lightView.tileTintAt(x, y);
          if (tint !== undefined) tile.setTint(tint);
          else tile.clearTint();
        }
      }
    }
    this.syncSconceOverlays();
    this.syncPressureCracks(st, shear);
    if (this.firstLight !== null) {
      this.lightView.applySweep(st, this.tileSprites, this.firstLight);
    }
  }

  /** Sector hairline fractures on optional paths — biome motif, not a full-tile arc wash. */
  private syncPressureCracks(st: GameState, shear: ReturnType<typeof computeShearPressure>): void {
    const live = new Set<string>();
    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const reveal = pressureRevealAt(st, shear, x, y, this.animFrame);
        if (!reveal) continue;
        const id = `${x},${y}`;
        live.add(id);
        let spr = this.crackSprites.get(id);
        if (!spr) {
          spr = this.add.image(
            x * TILE_DRAW + TILE_DRAW / 2,
            y * TILE_DRAW + TILE_DRAW / 2,
            crackTextureKey(reveal.sectorId, reveal.variant, reveal.urgent),
          );
          spr.setDisplaySize(TILE_DRAW, TILE_DRAW);
          spr.setDepth(1.5);
          this.mapLayer.add(spr);
          this.crackSprites.set(id, spr);
        } else {
          spr.setTexture(crackTextureKey(reveal.sectorId, reveal.variant, reveal.urgent));
        }
        spr.setVisible(reveal.visible);
        spr.setAlpha(reveal.alpha);
        if (reveal.urgent) {
          // Soft size pulse so Breaching cracks feel live without a full-tile wash.
          const pulse = 1 + 0.05 * Math.sin((this.animFrame + x + y) * 0.9);
          spr.setDisplaySize(TILE_DRAW * pulse, TILE_DRAW * pulse);
        } else {
          spr.setDisplaySize(TILE_DRAW, TILE_DRAW);
        }
      }
    }
    for (const [id, spr] of this.crackSprites) {
      if (!live.has(id)) {
        spr.destroy();
        this.crackSprites.delete(id);
      }
    }
  }

  /** Bodies and ground kit — contact plants only; walls use occluder umbra. */
  private *shadowCasters(): Generator<{
    gx: number;
    gy: number;
    item?: boolean;
    body?: boolean;
  }> {
    const st = this.state;
    const carry = this.lightView.lampCarryAt();
    const visAt = (x: number, y: number): boolean =>
      st.visible[Math.round(y)]?.[Math.round(x)] ?? false;
    yield {
      gx: carry?.x ?? st.player.x,
      gy: carry?.y ?? st.player.y,
      body: true,
    };
    for (const en of st.enemies) {
      if (!en.alive) continue;
      const view = this.enemyViews.get(en.id);
      const gx = view?.gx ?? en.x;
      const gy = view?.gy ?? en.y;
      if (!visAt(gx, gy) && !visAt(en.x, en.y)) continue;
      yield { gx, gy, body: true };
    }
    for (const a of st.allies) {
      if (!a.alive) continue;
      const view = this.allyViews.get(a.id);
      const gx = view?.gx ?? a.x;
      const gy = view?.gy ?? a.y;
      if (!visAt(gx, gy) && !visAt(a.x, a.y)) continue;
      yield { gx, gy, body: true };
    }
    for (const n of st.npcs) {
      const view = this.npcViews.get(n.id);
      const gx = view?.gx ?? n.x;
      const gy = view?.gy ?? n.y;
      if (!visAt(gx, gy) && !visAt(n.x, n.y)) continue;
      yield { gx, gy, body: true };
    }

    const seenItems = new Set<string>();
    for (const it of st.items) {
      if (!st.visible[it.y]?.[it.x]) continue;
      const key = `${it.x},${it.y}`;
      if (seenItems.has(key)) continue;
      seenItems.add(key);
      yield { gx: it.x, gy: it.y, item: true };
    }
  }

  /**
   * First light — a new sector arrives behind an expanding front instead of
   * hard-cutting the fog open. One wonder beat per sector, ~1.1s, skippable by
   * simply acting (the gate releases on the next committed turn).
   */
  private startFirstLight(): void {
    this.firstLightTween?.stop();
    const st = this.state;
    const reach = Math.hypot(st.width, st.height);
    this.firstLight = 0;
    this.firstLightTween = this.tweens.addCounter({
      from: 0,
      to: reach,
      duration: 1100,
      ease: 'Quad.easeOut',
      onUpdate: (tw) => {
        this.firstLight = tw.getValue() ?? reach;
        this.lightView.applySweep(this.state, this.tileSprites, this.firstLight);
      },
      onComplete: () => {
        this.firstLight = null;
        this.firstLightTween = null;
        this.lightView.applySweep(this.state, this.tileSprites, null);
      },
    });
  }

  private releaseFirstLight(): void {
    if (this.firstLight === null) return;
    this.firstLightTween?.stop();
    this.firstLightTween = null;
    this.firstLight = null;
    this.lightView.applySweep(this.state, this.tileSprites, null);
  }

  private redrawTilesAndHud(): void {
    const st = this.state;
    this.applyFieldLighting();

    drawFovVignette(this.fovVignette, this.scale.width, this.scale.height, TOP, this.bottomInset());

    const shear = computeShearPressure(st);
    this.drawChrome(shear);
    this.syncShearPresentation(shear);

    const pulseBox = { current: this.windowPulseTween };
    this.hud.redraw(st, {
      screenW: this.scale.width,
      screenH: this.scale.height,
      helpOpen: this.helpOpen,
      pagesOpen: this.pagesOpen,
      logOpen: this.logOpen,
      tweens: this.tweens,
      windowPulseTween: pulseBox,
      shear,
    });
    this.windowPulseTween = pulseBox.current;
    this.layoutBottomChrome();
    // Skill pick overlay — shown when the sim has a pending choice.
    if (st.skillPick && st.skillPick.length > 0) {
      drawSkillPickOverlay(
        this.skillPickPanel,
        this.skillPickText,
        this.skillPickBadgeGfx,
        this.skillPickBg,
        this.scale.width,
        this.scale.height,
        st.skillPick,
      );
    } else {
      hideSkillPickOverlay(
        this.skillPickBg,
        this.skillPickPanel,
        this.skillPickText,
        this.skillPickBadgeGfx,
      );
    }
    // Preference tip fills an empty hint line only — never stomps tele/vitals/context.
    if (this.preferenceHint && this.preferenceHint.until > this.time.now) {
      if (!this.hintText.visible) {
        this.hintText.setVisible(true);
        this.hintText.setText(lore(this.preferenceHint.id));
        this.syncHintPlate();
      }
    } else {
      this.preferenceHint = null;
    }

    const goal = describeObjective(st);
    this.syncGoalVisuals(goal.pos);
    this.syncOptionalSiteVisuals();
    this.minimap.redraw(st);
  }
}
