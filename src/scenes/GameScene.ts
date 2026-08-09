import Phaser from 'phaser';
import {
  TILE_DRAW,
  enemyTextureKey,
  npcTextureKey,
  allyTextureKey,
  playerTextureKey,
  wallTextureKey,
} from './textures';
import { FONT_DATA, FONT_DISPLAY, LightTemp, Theme, ThemeCss, floorTextureKey } from './theme';
import { ENEMIES } from '../data/enemies';
import { NPCS, ALLIES } from '../data/npcs';
import { lore, type LoreId } from '../data/lore';
import { applyAction, createGame, describeObjective, type Action, type GameState } from '../sim';
import { tileBrightness } from '../sim/light';
import {
  addCameraAtmosphere,
  createArcSweep,
  drawHudStripChrome,
  type ArcSweep,
  type CameraAtmosphere,
} from './atmosphere';
import { sfx } from '../audio/sfx';
import { ambient, music } from '../audio';
import { HUD_BOTTOM, HUD_TOP } from '../game/GameHost';
import { handleGameKey, type CommitTurnOpts } from '../game/input/InputController';
import {
  applyDirectionQueue,
  previewTile,
  type MovePreviewQueue,
} from '../game/input/MovePreviewQueue';
import { resolveHintLine } from '../game/presenters/ContextHints';
import {
  bumpAttack,
  bumpMeleeAttackers,
  actionFloatLabels,
  flashHit,
  flashScreen,
  playMoveAnims,
  presentActionFeedback,
  tintVisibleEnemies,
  type EnemyView,
} from '../game/presenters/ActionFeedback';
import {
  captureNoticeSnap,
  noticeImpactIds,
} from '../game/presenters/NoticeImpact';
import { pickCameraCue, type CameraCue } from '../game/presenters/EventCamera';
import { markPeekTeachDone } from '../game/presenters/PeekTeach';
import { HudView, HUD_BAR_SLOTS, HUD_BADGE_SLOTS } from '../game/views/HudView';
import { LightView } from '../game/views/LightView';
import { drawFovVignette } from '../game/views/MapView';
import { drawHelpOverlay } from '../game/views/overlays/HelpOverlay';
import { drawPaddOverlay } from '../game/views/overlays/PaddOverlay';
import { computeShearPressure, type ShearPressureState } from '../game/presenters/ShearPressure';
import { collectWakeTells, drawWakeTells, wakeTellsAt } from '../game/presenters/WakeTells';
import { pressureRevealTint } from '../game/presenters/PressureReveal';

const TOP = HUD_TOP;
const BOTTOM = HUD_BOTTOM;
const BAR_SLOTS = HUD_BAR_SLOTS;
const BADGE_SLOTS = HUD_BADGE_SLOTS;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private mapLayer!: Phaser.GameObjects.Container;
  private lightLayer!: Phaser.GameObjects.Container;
  private itemLayer!: Phaser.GameObjects.Container;
  private shadowLayer!: Phaser.GameObjects.Container;
  private entityLayer!: Phaser.GameObjects.Container;
  private lightView!: LightView;
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private camX = 0;
  private camY = 0;

  private playerSprite!: Phaser.GameObjects.Image;
  /** Semi-transparent silhouette at Shift-peek destination — planning ghost. */
  private commitGhost!: Phaser.GameObjects.Image;
  private commitGhostFade: Phaser.Tweens.Tween | null = null;
  private enemyViews = new Map<number, EnemyView>();
  private npcViews = new Map<number, EnemyView>();
  private allyViews = new Map<number, EnemyView>();
  private animating = false;
  /** Optional Shift-peek — ghost + wake at adjacent tile; WASD still moves immediately. */
  private movePreviewQueue: MovePreviewQueue | null = null;
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
  private barsGfx!: Phaser.GameObjects.Graphics;
  private badgeGfx!: Phaser.GameObjects.Graphics;
  private hudMeta!: Phaser.GameObjects.Text;
  private objLocalText!: Phaser.GameObjects.Text;
  private objCampaignText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private urgencyText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private badgeTexts: Phaser.GameObjects.Text[] = [];
  private barCaptions: Phaser.GameObjects.Text[] = [];
  private barValues: Phaser.GameObjects.Text[] = [];
  private sectorText!: Phaser.GameObjects.Text;
  private milestoneText!: Phaser.GameObjects.Text;
  private windowPulse!: Phaser.GameObjects.Rectangle;
  private windowPulseTween: Phaser.Tweens.Tween | null = null;
  private hud!: HudView;
  private chevronGfx!: Phaser.GameObjects.Graphics;
  private wakeTellGfx!: Phaser.GameObjects.Graphics;
  private shearReadout!: Phaser.GameObjects.Text;
  private lastShearState: ShearPressureState | null = null;
  private shearFlashUntil = 0;
  private goalMarker!: Phaser.GameObjects.Image;
  private goalPulseTween: Phaser.Tweens.Tween | null = null;
  private readonly lightPreferenceHints = new Set<number>();
  private preferenceHint: { id: 'UI-HINT-PREFER-DARK' | 'UI-HINT-PREFER-LIT'; until: number } | null =
    null;
  /** Notice Impact — tell flash / ring pop until this time (ms). */
  private noticeImpactUntil = 0;
  private noticeImpactIds = new Set<number>();
  /** Per-enemy latch so chase Impact is one snap, not corridor strobe. */
  private noticeChaseLatched = new Set<number>();
  /** Event camera kick — decays in updateCamera; world layers only (HUD stays 1:1). */
  private camNudgeX = 0;
  private camNudgeY = 0;
  private camNudgeUntil = 0;
  /** Peak world scale (>1 zooms in); eases to 1 over camZoomUntil. */
  private camZoomPeak = 1;
  private camZoomUntil = 0;
  private camZoomMs = 1;

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

  private flash!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Game');
  }

  init(data: { seed?: number }): void {
    this.state = createGame(data.seed ?? 42, { skipTutorial: false });
    this.helpOpen = false;
    this.pagesOpen = false;
    this.animating = false;
    this.enemyViews.clear();
    this.npcViews.clear();
    this.allyViews.clear();
    this.lightPreferenceHints.clear();
    this.preferenceHint = null;
    this.noticeImpactUntil = 0;
    this.noticeImpactIds.clear();
    this.noticeChaseLatched.clear();
    this.firstLight = null;
    this.firstLightTween = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Theme.groundDeep);
    this.cameraAtmosphere = addCameraAtmosphere(this);
    this.mapLayer = this.add.container(0, 0);
    this.itemLayer = this.add.container(0, 0);
    // Contact shadows sit between the floor and the things casting them.
    this.shadowLayer = this.add.container(0, 0);
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

    this.commitGhost = this.add.image(0, 0, 't_player');
    this.commitGhost.setDisplaySize(TILE_DRAW, TILE_DRAW);
    this.commitGhost.setAlpha(0);
    this.commitGhost.setVisible(false);
    this.commitGhost.setDepth(22);
    this.entityLayer.add(this.commitGhost);

    this.buildMapSprites();

    this.topPanel = this.add.graphics().setScrollFactor(0).setDepth(90);
    this.bottomPanel = this.add.graphics().setScrollFactor(0).setDepth(90);
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
      .rectangle(0, 0, 100, 10, Theme.storm, 0.35)
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
        color: ThemeCss.phosphorBright,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.questText = this.add
      .text(14, 94, '', {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.quest,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92)
      .setVisible(false);

    this.urgencyText = this.add
      .text(14, 110, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.danger,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.milestoneText = this.add
      .text(14, 110, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.quest,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.chevronGfx = this.add.graphics().setScrollFactor(0).setDepth(94);

    this.wakeTellGfx = this.add.graphics();
    this.wakeTellGfx.setDepth(24);
    this.entityLayer.add(this.wakeTellGfx);

    this.shearReadout = this.add
      .text(this.scale.width / 2, 6, '', {
        fontFamily: FONT_DISPLAY,
        fontSize: '12px',
        color: ThemeCss.phosphorBright,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(93)
      .setAlpha(0.72);

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
            color: ThemeCss.groundDeep,
            fontStyle: 'bold',
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
        color: ThemeCss.phosphorDim,
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(92);

    this.logText = this.add
      .text(12, this.scale.height - BOTTOM + 10, '', {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.ink,
        wordWrap: { width: this.scale.width - 24 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.hintText = this.add
      .text(this.scale.width / 2, this.scale.height - BOTTOM - 16, '', {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.inkBright,
        backgroundColor: ThemeCss.hintBg,
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(93)
      .setVisible(false);

    this.invBg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.55)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.invPanel = this.add.graphics().setScrollFactor(0).setDepth(101).setVisible(false);
    this.invText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.phosphor,
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);

    this.pagesBg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.55)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(105)
      .setVisible(false);

    this.pagesPanel = this.add.graphics().setScrollFactor(0).setDepth(106).setVisible(false);
    this.pagesText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.phosphor,
        lineSpacing: 5,
        wordWrap: { width: 400 },
      })
      .setScrollFactor(0)
      .setDepth(107)
      .setVisible(false);

    this.helpBg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.55)
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

    this.flash = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0xe05050, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(120);

    this.fovVignette = this.add.graphics().setScrollFactor(0).setDepth(80);

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
      windowPulse: this.windowPulse,
      invBg: this.invBg,
      invPanel: this.invPanel,
      invText: this.invText,
    });

    this.drawChrome();
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.handleKey(e));
    this.input.keyboard!.on('keyup', (e: KeyboardEvent) => this.handleKeyUp(e));
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
      stormTurns: this.state.stormTurns,
      inCombat: this.threatNearby(),
    });
  }

  /** Manhattan ≤3 to a living hostile — drives combat danger bed. */
  private threatNearby(): boolean {
    const st = this.state;
    const px = st.player.x;
    const py = st.player.y;
    return st.enemies.some(
      (e) => e.alive && Math.abs(e.x - px) + Math.abs(e.y - py) <= 3,
    );
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
    } else if (
      this.state.status === 'playing' &&
      this.noticeImpactUntil > 0 &&
      this.time.now <= this.noticeImpactUntil + 50
    ) {
      // Keep Impact tell flash resolving within the ≤200ms beat.
      this.applyFieldLighting();
    }
    if (!this.animating) {
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
          kind !== 'poi' &&
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
    if (this.commitGhost.visible) {
      this.commitGhost.setTexture(playerTextureKey(this.animFrame % 3));
    }
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

  private drawChrome(shear = computeShearPressure(this.state)): void {
    const w = this.scale.width;
    const h = this.scale.height;
    drawHudStripChrome(this.topPanel, {
      y: 0,
      height: TOP,
      width: w,
      side: 'top',
      corrosion: shear.value,
      accent: shear.accent,
      drainingLeg: shear.drainingLeg,
      animFrame: this.animFrame,
    });
    drawHudStripChrome(this.bottomPanel, {
      y: h - BOTTOM,
      height: BOTTOM,
      width: w,
      side: 'bottom',
      corrosion: shear.value,
      accent: shear.accent,
    });
  }

  private syncShearPresentation(shear = computeShearPressure(this.state)): void {
    if (this.lastShearState !== shear.state) {
      this.lastShearState = shear.state;
      // Juice budget ~200ms — never flash-show Calm.
      if (shear.state !== 'Calm') {
        this.shearFlashUntil = this.time.now + 200;
      } else {
        this.shearFlashUntil = 0;
      }
    }
    const flash = this.shearFlashUntil > this.time.now;
    // Single loud channel: center readout for Charged+ only (no Calm, no badge).
    if (shear.state === 'Calm') {
      this.shearReadout.setVisible(false);
    } else {
      this.shearReadout.setVisible(true);
      this.shearReadout.setText(`SHEAR · ${shear.state.toUpperCase()}`);
      this.shearReadout.setColor(
        shear.state === 'Breaching'
          ? ThemeCss.arcWhite
          : shear.state === 'Arcing'
            ? ThemeCss.arc
            : ThemeCss.tape,
      );
      this.shearReadout.setAlpha(flash ? 1 : 0.88);
      this.shearReadout.setPosition(this.scale.width / 2, 6);
    }
    this.arcSweep?.setPressure(shear.value, shear.accent);
  }

  private rebuildAtmosphere(): void {
    this.arcSweep?.destroy();
    this.arcSweep = createArcSweep(this, 85);
  }

  private buildMapSprites(): void {
    this.tweens.killAll();
    this.windowPulseTween = null;
    this.goalPulseTween = null;
    this.animating = false;
    this.mapLayer.removeAll(true);
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
    const { width, height, tiles } = this.state;
    for (let y = 0; y < height; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < width; x++) {
        const kind = tiles[y]![x]!.kind;
        const img = this.add.image(
          x * TILE_DRAW + TILE_DRAW / 2,
          y * TILE_DRAW + TILE_DRAW / 2,
          this.tileKey(kind, x, y),
        );
        img.setDisplaySize(TILE_DRAW, TILE_DRAW);
        this.mapLayer.add(img);
        this.tileSprites[y]![x] = img;
      }
    }
    this.snapImg(this.playerSprite, this.state.player.x, this.state.player.y);
    this.rebuildAtmosphere();
  }

  private tileKey(kind: string, x = 0, y = 0): string {
    const f = this.animFrame;
    const animated = (base: string): string => (f === 0 ? base : `${base}_${f}`);
    switch (kind) {
      case 'wall': {
        const v = (x * 3 + y * 7 + this.state.seed) % 2;
        return wallTextureKey(this.state.sectorId, v);
      }
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
      case 'poi':
        return animated('t_poi');
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

  /** Hint line the HUD is currently showing (same resolver as HudView). */
  private hintLine(): LoreId | null {
    return resolveHintLine(this.state, { movePreviewActive: this.movePreviewQueue !== null });
  }

  private handleKey(e: KeyboardEvent): void {
    handleGameKey(e, {
      getState: () => this.state,
      isAnimating: () => this.animating,
      isHelpOpen: () => this.helpOpen,
      isPagesOpen: () => this.pagesOpen,
      queueAction: (action) => {
        this.queuedAction = action;
      },
      setWakePeek: (dx, dy) => {
        this.movePreviewQueue = applyDirectionQueue(this.state, this.movePreviewQueue, dx, dy);
        if (this.movePreviewQueue) markPeekTeachDone(this.state);
        this.applyFieldLighting();
        this.redrawTilesAndHud();
      },
      getMovePreview: () => this.movePreviewQueue,
      getQueuedAction: () => this.queuedAction,
      clearQueuedAction: () => {
        this.clearMovePreview();
      },
      dismissPeekTeach: () => {
        // Only consume the one-shot teach when it is the line actually on screen —
        // otherwise Escape would burn a tip the player never saw.
        if (this.hintLine() !== 'UI-HINT-PEEK-TEACH') return false;
        markPeekTeachDone(this.state);
        this.redrawTilesAndHud();
        return true;
      },
      syncFieldAudio: (force) => this.syncFieldAudio(force),
      showMuteHint: (muted) => {
        this.hintText.setVisible(true);
        this.hintText.setText(muted ? lore('UI-MUTE-ON') : lore('UI-MUTE-OFF'));
        this.time.delayedCall(900, () => {
          const hint = this.hintLine();
          if (hint && !this.state.ui.inventoryOpen && !this.helpOpen && !this.pagesOpen) {
            this.hintText.setText(lore(hint));
          } else {
            this.hintText.setVisible(false);
          }
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
      afterUiChrome: (opts) => {
        this.redrawTilesAndHud();
        if (opts?.syncItems) this.syncItems();
      },
      showSkillHint: () => {
        this.hintText.setVisible(true);
        this.hintText.setText(lore('UI-HINT-SKILL'));
      },
      commitTurnAction: (action, opts) => this.commitTurnAction(action, opts),
    });
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key !== 'Shift' && e.code !== 'ShiftLeft' && e.code !== 'ShiftRight') return;
    if (!this.movePreviewQueue) return;
    this.clearMovePreview(true);
  }

  private clearMovePreview(fade = true): void {
    this.movePreviewQueue = null;
    this.hideCommitGhost(fade);
    this.applyFieldLighting();
  }

  private flushQueuedAction(): void {
    const next = this.queuedAction;
    this.queuedAction = null;
    if (!next || this.state.status !== 'playing' || this.animating) return;
    this.commitTurnAction(next);
  }

  private commitTurnAction(action: Action, opts?: CommitTurnOpts): void {
    const keepPreview = opts?.keepMovePreview ? this.movePreviewQueue : null;
    if (!keepPreview) {
      this.movePreviewQueue = null;
      this.hideCommitGhost(false);
    }
    this.queuedAction = null;
    this.releaseFirstLight();
    const prevSector = this.state.sectorIndex;
    const prevTutorialActive = this.state.tutorialActive;
    const prevMapWidth = this.state.width;
    const prevMapHeight = this.state.height;
    const prevHp = this.state.player.hp;
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
    const prevNotice = captureNoticeSnap(this.state);

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
      lights: this.lightView,
      flash: (color, alpha) => this.flashFx(color, alpha),
      tintHitEnemies: () => tintVisibleEnemies(this.time, this.enemyViews.values()),
    });
    const impactIds = noticeImpactIds(this.state, prevNotice, this.noticeChaseLatched);
    this.presentNoticeImpact(impactIds);
    this.playEventCamera(fb.newLogs, impactIds.length > 0);
    this.queueLightPreferenceHint();
    this.showActionFloats(this.state.log.slice(prevLogLen));

    if (fb.mapReloaded) {
      this.movePreviewQueue = null;
      this.hideCommitGhost(false);
      this.noticeChaseLatched.clear();
      this.noticeImpactIds.clear();
      this.noticeImpactUntil = 0;
      this.lightView.clearFx();
      this.buildMapSprites();
      this.syncItems();
      this.syncActors(true);
      this.redrawTilesAndHud();
      this.updateCamera(true);
      this.syncFieldAudio(true);
      this.startFirstLight();
      if (this.state.player.hp < prevHp) this.flashHit();
      this.maybeEnd();
      this.flushQueuedAction();
      return;
    }

    music.syncField({
      sectorId: this.state.sectorId,
      stormTurns: this.state.stormTurns,
      inCombat: this.threatNearby(),
    });

    // Drop keep-preview if the adjacent tile is no longer walkable after the turn.
    if (keepPreview && !previewTile(this.state, keepPreview)) {
      this.movePreviewQueue = null;
      this.hideCommitGhost(true);
    }

    // Light/FOV at the new tile immediately so the lamp isn't left behind the tween.
    // Full HUD (bars, log, hints) still waits for afterPresent.
    this.applyFieldLighting();
    this.syncItems();

    const afterPresent = () => {
      this.redrawTilesAndHud();
      this.syncActors(true);
      this.maybeEnd();
      this.flushQueuedAction();
    };

    if (fb.playerMoved || fb.enemyMoved) {
      playMoveAnims(this.moveAnimHost(), fromPlayer, fb.fromEnemies, afterPresent);
      return;
    }

    if (action.type === 'move') {
      bumpAttack(
        this.tweens,
        this.playerSprite,
        (gx, gy) => this.worldXY(gx, gy),
        { x: this.state.player.x, y: this.state.player.y },
        action.dx,
        action.dy,
      );
    }
    // Enemy melee bump when they struck without relocating
    if (this.state.player.hp < prevHp) {
      bumpMeleeAttackers(this.tweens, {
        state: this.state,
        fromEnemies: fb.fromEnemies,
        enemyViews: this.enemyViews,
        worldXY: (gx, gy) => this.worldXY(gx, gy),
      });
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
      state: this.state,
      syncActors: (snap: boolean) => this.syncActors(snap),
      snapImg: (img: Phaser.GameObjects.Image, gx: number, gy: number) => this.snapImg(img, gx, gy),
    };
  }

  private maybeEnd(): void {
    if (this.state.status === 'playing') return;
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
      if (!vis) spr.setTint(0x6688aa);
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

    for (const en of st.enemies) {
      if (!en.alive) continue;
      aliveIds.add(en.id);
      const visible = st.visible[en.y]![en.x];
      let view = this.enemyViews.get(en.id);
      if (!view) {
        const img = this.add.image(0, 0, enemyTextureKey(en.kind, this.animFrame % 3));
        img.setDisplaySize(TILE_DRAW - 2, TILE_DRAW - 2);
        const label = this.add.text(0, 0, ENEMIES[en.kind].glyph, {
          fontFamily: FONT_DATA,
          fontSize: '11px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        });
        label.setOrigin(0.5, 1);
        this.entityLayer.add(img);
        this.entityLayer.add(label);
        view = { img, label, gx: en.x, gy: en.y };
        this.enemyViews.set(en.id, view);
        this.snapImg(img, en.x, en.y);
        label.setPosition(img.x, img.y - TILE_DRAW / 2 + 5);
      }
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
      if (!aliveIds.has(id)) {
        view.img.destroy();
        view.label.destroy();
        this.enemyViews.delete(id);
      }
    }

    const npcIds = new Set<number>();
    for (const n of st.npcs) {
      npcIds.add(n.id);
      const visible = st.visible[n.y]?.[n.x] ?? false;
      let view = this.npcViews.get(n.id);
      const def = NPCS[n.kind];
      if (!view) {
        const img = this.add.image(0, 0, npcTextureKey(n.kind));
        img.setDisplaySize(TILE_DRAW - 2, TILE_DRAW - 2);
        const label = this.add.text(0, 0, def.glyph, {
          fontFamily: FONT_DATA,
          fontSize: '11px',
          color: '#a8e0ff',
          stroke: '#000000',
          strokeThickness: 3,
        });
        label.setOrigin(0.5, 1);
        this.entityLayer.add(img);
        this.entityLayer.add(label);
        view = { img, label, gx: n.x, gy: n.y };
        this.npcViews.set(n.id, view);
        this.snapImg(img, n.x, n.y);
        label.setPosition(img.x, img.y - TILE_DRAW / 2 + 5);
      }
      view.img.setVisible(visible);
      view.label.setVisible(visible && !n.talked);
      view.img.setAlpha(n.talked ? 0.45 : 1);
      if (snapPositions) {
        this.snapImg(view.img, n.x, n.y);
        view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 5);
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
      const visible = st.visible[a.y]?.[a.x] ?? false;
      let view = this.allyViews.get(a.id);
      const def = ALLIES[a.kind];
      if (!view) {
        const img = this.add.image(0, 0, allyTextureKey(a.kind));
        img.setDisplaySize(TILE_DRAW - 2, TILE_DRAW - 2);
        const label = this.add.text(0, 0, def.glyph, {
          fontFamily: FONT_DATA,
          fontSize: '11px',
          color: '#b8f0c0',
          stroke: '#000000',
          strokeThickness: 3,
        });
        label.setOrigin(0.5, 1);
        this.entityLayer.add(img);
        this.entityLayer.add(label);
        view = { img, label, gx: a.x, gy: a.y };
        this.allyViews.set(a.id, view);
        this.snapImg(img, a.x, a.y);
        label.setPosition(img.x, img.y - TILE_DRAW / 2 + 5);
      }
      view.img.setVisible(visible);
      view.label.setVisible(visible);
      view.img.setTexture(allyTextureKey(a.kind));
      if (snapPositions) {
        this.snapImg(view.img, a.x, a.y);
        view.label.setPosition(view.img.x, view.img.y - TILE_DRAW / 2 + 5);
        view.gx = a.x;
        view.gy = a.y;
      }
    }
    for (const [id, view] of this.allyViews) {
      if (!allyIds.has(id)) {
        view.img.destroy();
        view.label.destroy();
        this.allyViews.delete(id);
      }
    }

    this.playerSprite.setVisible(true);
    if (snapPositions) this.snapImg(this.playerSprite, st.player.x, st.player.y);
    // Keep player on top
    this.entityLayer.bringToTop(this.playerSprite);
  }

  private updateEnemyIntentLabel(
    view: EnemyView,
    enemy: GameState['enemies'][number],
  ): void {
    if (enemy.windup <= 0) {
      view.label.setText(ENEMIES[enemy.kind].glyph);
      view.label.setColor('#ffffff');
      view.label.setFontSize(11);
      return;
    }
    const marker =
      enemy.intent === 'beam'
        ? 'BEAM'
        : enemy.intent === 'overwatch'
          ? 'OW'
          : enemy.intent === 'pounce'
            ? 'P!'
            : 'CHARGE';
    const color =
      enemy.intent === 'beam'
        ? ThemeCss.arcWhite
        : enemy.intent === 'overwatch'
          ? ThemeCss.tape
          : ThemeCss.rust;
    view.label.setText(marker);
    view.label.setColor(color);
    view.label.setFontSize(marker.length > 2 ? 8 : 10);
  }

  private updateCamera(snap: boolean): void {
    const viewW = this.scale.width;
    const viewH = this.scale.height - TOP - BOTTOM;
    const targetX = this.playerSprite.x - viewW / 2;
    const targetY = this.playerSprite.y - viewH / 2;
    if (snap) {
      this.camX = targetX;
      this.camY = targetY;
    } else {
      this.camX += (targetX - this.camX) * 0.2;
      this.camY += (targetY - this.camY) * 0.2;
    }
    let nudgeX = 0;
    let nudgeY = 0;
    if (this.time.now < this.camNudgeUntil) {
      const remain = this.camNudgeUntil - this.time.now;
      const t = Math.min(1, remain / 200);
      nudgeX = this.camNudgeX * t;
      nudgeY = this.camNudgeY * t;
    } else {
      this.camNudgeX = 0;
      this.camNudgeY = 0;
    }
    // World-layer zoom toward the player (not Phaser camera — HUD stays unzoomed).
    let zoom = 1;
    if (this.time.now < this.camZoomUntil && this.camZoomPeak > 1) {
      const remain = this.camZoomUntil - this.time.now;
      const u = Math.min(1, remain / Math.max(1, this.camZoomMs));
      // Ease-out: hold punch early, settle back to 1.
      const ease = u * u;
      zoom = 1 + (this.camZoomPeak - 1) * ease;
    } else {
      this.camZoomPeak = 1;
    }
    const fx = this.playerSprite.x;
    const fy = this.playerSprite.y;
    const ox = -this.camX + nudgeX + fx * (1 - zoom);
    const oy = -this.camY + TOP + nudgeY + fy * (1 - zoom);
    for (const layer of [
      this.mapLayer,
      this.shadowLayer,
      this.lightLayer,
      this.itemLayer,
      this.entityLayer,
    ]) {
      layer.setScale(zoom);
      layer.setPosition(ox, oy);
    }
    // Keep chevron fresh as camera drifts
    if (!snap) this.syncGoalVisuals(describeObjective(this.state).pos);
  }

  /** Pulse explored/visible goal tile; edge chevron when known but off-screen. */
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
    const bottom = this.scale.height - BOTTOM - pad;
    const onScreen =
      screenX >= left && screenX <= right && screenY >= top && screenY <= bottom;
    if (onScreen) return;

    const cx = this.scale.width / 2;
    const cy = TOP + (this.scale.height - TOP - BOTTOM) / 2;
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

  private flashHit(): void {
    flashHit(this.tweens, this.flash);
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

  private showActionFloats(logs: ReadonlyArray<{ loreId: LoreId; detail?: string }>): void {
    const labels = actionFloatLabels(logs);
    const base = this.worldXY(this.state.player.x, this.state.player.y);
    labels.forEach((label, index) => {
      const text = this.add
        .text(base.x, base.y - 14 - index * 12, label.label, {
          fontFamily: FONT_DATA,
          fontSize: '10px',
          color: label.color,
          fontStyle: 'bold',
          stroke: ThemeCss.groundDeep,
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(30);
      this.entityLayer.add(text);
      this.entityLayer.bringToTop(text);
      this.tweens.add({
        targets: text,
        y: text.y - 10,
        alpha: 0,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => text.destroy(),
      });
    });
  }

  private flashFx(color: number, alpha: number): void {
    flashScreen(this.tweens, this.flash, color, alpha);
  }

  /**
   * Notice Impact — one ≤~200ms punch when a wake tell becomes real engage.
   * Sprite juice here; camera kick via playEventCamera(notice).
   */
  private presentNoticeImpact(ids: number[]): void {
    if (ids.length === 0) return;
    this.noticeImpactIds = new Set(ids);
    this.noticeImpactUntil = this.time.now + 180;

    for (const id of ids) {
      const view = this.enemyViews.get(id);
      if (!view?.img.visible) continue;
      view.img.setTint(Theme.rust);
      const baseScaleX = view.img.scaleX;
      const baseScaleY = view.img.scaleY;
      this.tweens.add({
        targets: view.img,
        scaleX: baseScaleX * 1.18,
        scaleY: baseScaleY * 1.18,
        duration: 70,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (view.img.active) {
            view.img.clearTint();
            view.img.setScale(baseScaleX, baseScaleY);
          }
        },
      });
    }

    this.applyFieldLighting();
  }

  /**
   * Event camera — one ranked cue per turn (profiles: punch/snap/pressure/bloom/reward/hush).
   * Cosmetic only; never delays input. World layers zoom; HUD stays 1:1.
   */
  private playEventCamera(logs: readonly LoreId[], noticeImpact: boolean): void {
    const cue = pickCameraCue(logs, { noticeImpact });
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
    const kickMs = Math.max(200, cue.shakeMs, cue.vignetteMs * 0.5, cue.zoomMs * 0.6);
    if (cue.nudgePx > 0) {
      const ang = (this.state.turn * 2.399) % (Math.PI * 2);
      this.camNudgeX = Math.cos(ang) * cue.nudgePx;
      this.camNudgeY = Math.sin(ang) * cue.nudgePx;
      this.camNudgeUntil = this.time.now + kickMs;
    }
    if (cue.zoomScale > 1 && cue.zoomMs > 0) {
      this.camZoomPeak = cue.zoomScale;
      this.camZoomMs = cue.zoomMs;
      this.camZoomUntil = this.time.now + cue.zoomMs;
    }
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

  /** Capped procedural dust/ion motes; rebuilt so no particle survives outside FOV. */
  private drawFieldMotes(): void {
    const st = this.state;
    this.fieldMotes.clear();
    let count = 0;
    const maxMotes = 44;
    for (let y = 0; y < st.height && count < maxMotes; y++) {
      for (let x = 0; x < st.width && count < maxMotes; x++) {
        if (!st.visible[y]?.[x] || tileBrightness(st, x, y) < 0.28) continue;
        const hash = (x * 73856093) ^ (y * 19349663) ^ (st.seed * 83492791);
        if (Math.abs(hash) % 7 !== this.animFrame % 4) continue;
        const ion = (Math.abs(hash >> 4) + this.animFrame) % 5 === 0;
        const ox = 5 + (Math.abs(hash >> 7) % Math.max(1, TILE_DRAW - 10));
        const oy =
          5 +
          ((Math.abs(hash >> 13) + this.animFrame * (ion ? 3 : 1)) %
            Math.max(1, TILE_DRAW - 10));
        this.fieldMotes.fillStyle(ion ? Theme.biolum : Theme.inkBright, ion ? 0.5 : 0.28);
        this.fieldMotes.fillRect(
          x * TILE_DRAW + ox,
          y * TILE_DRAW + oy,
          ion ? 2 : 1,
          ion ? 2 : 1,
        );
        count += 1;
      }
    }
  }

  private applyFieldLighting(): void {
    const st = this.state;
    const shear = computeShearPressure(st);
    this.lightView.syncTurn(st.turn);
    const sources = this.lightView.allSources(st, this.animFrame);
    this.lightView.applyTileLighting(st, this.tileSprites, (kind, x, y) => this.tileKey(kind, x, y), sources);
    this.drawFieldMotes();
    this.lightView.drawBloom(sources, st.visible, st.tiles);
    this.lightView.drawContactShadows(st, this.shadowCasters(), sources);
    this.lightView.applyActorLighting(st, this.playerSprite, this.enemyViews.values(), sources);

    const preview = this.wakePreviewContext();
    const liveTells = collectWakeTells(st);
    const impactActive = this.time.now < this.noticeImpactUntil;
    const impactIds = impactActive ? this.noticeImpactIds : undefined;
    const impactPulse = impactActive
      ? Math.max(0, (this.noticeImpactUntil - this.time.now) / 180)
      : 0;

    if (preview) {
      // Dual-read: dim dashed live at feet + solid peek dest tells.
      drawWakeTells(this.wakeTellGfx, st, liveTells, this.animFrame, {
        layer: 'liveUnderPeek',
        originX: st.player.x,
        originY: st.player.y,
        impactIds,
        impactPulse,
      });
      drawWakeTells(this.wakeTellGfx, st, preview.tells, this.animFrame, {
        clear: false,
        layer: 'peek',
        originX: preview.originX,
        originY: preview.originY,
        previewDest: preview.previewDest,
        impactIds,
        impactPulse,
      });
      this.showCommitGhost(preview.previewDest);
    } else {
      drawWakeTells(this.wakeTellGfx, st, liveTells, this.animFrame, {
        layer: 'live',
        impactIds,
        impactPulse,
      });
    }

    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const tile = this.tileSprites[y]?.[x];
        if (!tile) continue;
        const reveal = pressureRevealTint(st, shear, x, y, this.animFrame);
        if (reveal !== null) {
          tile.setTint(reveal);
          continue;
        }
        const patch = st.contamination.some((c) => c.x === x && c.y === y);
        if (patch && st.visible[y]?.[x]) {
          tile.setTint(Theme.biolum);
        } else {
          tile.clearTint();
        }
      }
    }
    if (this.firstLight !== null) {
      this.lightView.applySweep(st, this.tileSprites, this.firstLight);
    }
  }

  /** Shift-peek destination — wake footprint before you step. */
  private wakePreviewContext():
    | {
        originX: number;
        originY: number;
        previewDest: { x: number; y: number };
        tells: ReturnType<typeof wakeTellsAt>;
      }
    | null {
    const q = this.movePreviewQueue;
    if (!q) return null;
    const dest = previewTile(this.state, q);
    if (!dest) return null;
    return {
      originX: dest.x,
      originY: dest.y,
      previewDest: dest,
      tells: wakeTellsAt(this.state, dest.x, dest.y),
    };
  }

  /** Peek ghost — player silhouette at Shift-aimed tile, synced with wake preview. */
  private showCommitGhost(dest: { x: number; y: number }): void {
    this.commitGhostFade?.stop();
    this.commitGhostFade = null;
    const p = this.worldXY(dest.x, dest.y);
    this.commitGhost.setVisible(true);
    this.commitGhost.setTexture(playerTextureKey(this.animFrame % 3));
    this.commitGhost.setPosition(p.x, p.y);
    this.commitGhost.setAlpha(0.35);
  }

  private hideCommitGhost(fadeOut: boolean): void {
    if (!this.commitGhost.visible || this.commitGhost.alpha <= 0) {
      this.commitGhost.setVisible(false);
      this.commitGhost.setAlpha(0);
      return;
    }

    if (!fadeOut) {
      this.commitGhostFade?.stop();
      this.commitGhostFade = null;
      this.commitGhost.setVisible(false);
      this.commitGhost.setAlpha(0);
      return;
    }

    this.commitGhostFade?.stop();
    this.commitGhostFade = this.tweens.add({
      targets: this.commitGhost,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.commitGhost.setVisible(false);
        this.commitGhostFade = null;
      },
    });
  }

  /** Everything solid enough to throw a shadow this frame. */
  private *shadowCasters(): Generator<{ gx: number; gy: number; tall?: boolean }> {
    const st = this.state;
    yield { gx: st.player.x, gy: st.player.y };
    for (const en of st.enemies) {
      if (!en.alive) continue;
      yield { gx: en.x, gy: en.y, tall: en.tier !== 'normal' };
    }
    for (const a of st.allies) {
      if (!a.alive) continue;
      yield { gx: a.x, gy: a.y };
    }
    for (const n of st.npcs) yield { gx: n.x, gy: n.y };
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

    drawFovVignette(this.fovVignette, this.scale.width, this.scale.height, TOP, BOTTOM);

    const shear = computeShearPressure(st);
    this.drawChrome(shear);
    this.syncShearPresentation(shear);

    const pulseBox = { current: this.windowPulseTween };
    this.hud.redraw(st, {
      screenW: this.scale.width,
      screenH: this.scale.height,
      helpOpen: this.helpOpen,
      pagesOpen: this.pagesOpen,
      tweens: this.tweens,
      windowPulseTween: pulseBox,
      shear,
      movePreviewActive: this.movePreviewQueue !== null,
    });
    this.windowPulseTween = pulseBox.current;
    // Preference tip fills an empty hint line only — never stomps tele/vitals/context.
    if (this.preferenceHint && this.preferenceHint.until > this.time.now) {
      if (!this.hintText.visible) {
        this.hintText.setVisible(true);
        this.hintText.setText(lore(this.preferenceHint.id));
      }
    } else {
      this.preferenceHint = null;
    }

    this.syncGoalVisuals(describeObjective(st).pos);
  }
}
