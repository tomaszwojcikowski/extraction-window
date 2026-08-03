import Phaser from 'phaser';
import { lore, type LoreId } from '../data/lore';
import { ENEMIES } from '../data/enemies';
import { applyAction, createGame, describeObjective, type Action, type GameState } from '../sim';
import { fovDistance, playerFovRadius } from '../sim/fov';
import { TILE, TILE_DRAW, enemyTextureKey } from './textures';
import { BIOME_FLOOR_TINT, FONT_DATA, FONT_DISPLAY, Theme, ThemeCss, floorTextureKey } from './theme';
import { createScanRetrace, drawHudStripChrome } from './atmosphere';
import { sfx } from '../audio/sfx';
import { ambient, music } from '../audio';
import { HUD_BOTTOM, HUD_TOP, MOVE_MS } from '../game/GameHost';
import {
  actionFromKey,
  chromeFromKey,
  isHelpDismissKey,
  isPagesDismissKey,
  slotIndexFromKey,
} from '../game/input/Keymap';
import { contextHint } from '../game/presenters/ContextHints';
import { HudView, HUD_BAR_SLOTS, HUD_BADGE_SLOTS } from '../game/views/HudView';
import { drawFovVignette } from '../game/views/MapView';
import { drawHelpOverlay } from '../game/views/overlays/HelpOverlay';
import { drawPaddOverlay } from '../game/views/overlays/PaddOverlay';

const TOP = HUD_TOP;
const BOTTOM = HUD_BOTTOM;
const BAR_SLOTS = HUD_BAR_SLOTS;
const BADGE_SLOTS = HUD_BADGE_SLOTS;

type EnemyView = {
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  gx: number;
  gy: number;
};

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private mapLayer!: Phaser.GameObjects.Container;
  private itemLayer!: Phaser.GameObjects.Container;
  private entityLayer!: Phaser.GameObjects.Container;
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private camX = 0;
  private camY = 0;

  private playerSprite!: Phaser.GameObjects.Image;
  private enemyViews = new Map<number, EnemyView>();
  private animating = false;
  private atmo: Phaser.GameObjects.Rectangle | null = null;
  private animFrame = 0;
  private animAccum = 0;
  private fovVignette!: Phaser.GameObjects.Graphics;
  private idleBob = 0;

  private topPanel!: Phaser.GameObjects.Graphics;
  private bottomPanel!: Phaser.GameObjects.Graphics;
  private barsGfx!: Phaser.GameObjects.Graphics;
  private badgeGfx!: Phaser.GameObjects.Graphics;
  private hudMeta!: Phaser.GameObjects.Text;
  private objLocalText!: Phaser.GameObjects.Text;
  private objCampaignText!: Phaser.GameObjects.Text;
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
  private goalMarker!: Phaser.GameObjects.Image;
  private goalPulseTween: Phaser.Tweens.Tween | null = null;

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
    this.state = createGame(data.seed ?? 42);
    this.helpOpen = false;
    this.pagesOpen = false;
    this.animating = false;
    this.enemyViews.clear();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Theme.groundDeep);
    this.mapLayer = this.add.container(0, 0);
    this.itemLayer = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);

    this.playerSprite = this.add.image(0, 0, 't_player');
    this.playerSprite.setDisplaySize(TILE_DRAW, TILE_DRAW);
    this.entityLayer.add(this.playerSprite);

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
            fontSize: '9px',
            color: ThemeCss.phosphorDim,
          })
          .setScrollFactor(0)
          .setDepth(92),
      );
      this.barValues.push(
        this.add
          .text(0, 0, '', {
            fontFamily: FONT_DATA,
            fontSize: '10px',
            color: ThemeCss.phosphor,
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
        color: ThemeCss.phosphor,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.objLocalText = this.add
      .text(14, 64, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.phosphorDim,
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

    this.urgencyText = this.add
      .text(14, 94, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.danger,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.milestoneText = this.add
      .text(14, 94, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.quest,
        wordWrap: { width: this.scale.width - 250 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.chevronGfx = this.add.graphics().setScrollFactor(0).setDepth(94);

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
        fontSize: '12px',
        color: ThemeCss.phosphorDim,
        wordWrap: { width: this.scale.width - 24 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.hintText = this.add
      .text(this.scale.width / 2, this.scale.height - BOTTOM - 16, '', {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.phosphorBright,
        backgroundColor: ThemeCss.hintBg,
        padding: { x: 10, y: 5 },
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
        fontSize: '13px',
        color: ThemeCss.phosphor,
        lineSpacing: 6,
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
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
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
      this.atmo?.destroy();
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
      this.animFrame = (this.animFrame + 1) % 3;
      this.tickAnimatedTiles();
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
        if (kind !== 'hazard' && kind !== 'vent' && kind !== 'poi' && kind !== 'beacon') continue;
        const img = this.tileSprites[y]?.[x];
        if (!img) continue;
        img.setTexture(this.tileKey(kind, x, y));
      }
    }
  }

  private worldXY(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE_DRAW + TILE_DRAW / 2, y: ty * TILE_DRAW + TILE_DRAW / 2 };
  }

  private snapImg(img: Phaser.GameObjects.Image, tx: number, ty: number): void {
    const p = this.worldXY(tx, ty);
    img.setPosition(p.x, p.y);
  }

  private drawChrome(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    drawHudStripChrome(this.topPanel, { y: 0, height: TOP, width: w, side: 'top' });
    drawHudStripChrome(this.bottomPanel, {
      y: h - BOTTOM,
      height: BOTTOM,
      width: w,
      side: 'bottom',
    });
  }

  private rebuildAtmosphere(): void {
    if (this.atmo) {
      this.tweens.killTweensOf(this.atmo);
      this.atmo.destroy();
      this.atmo = null;
    }
    this.atmo = createScanRetrace(this, 85);
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
    const tint = BIOME_FLOOR_TINT[this.state.sectorId];
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
        if (kind === 'floor' || kind === 'scrub' || kind === 'rubble') img.setTint(tint);
        this.mapLayer.add(img);
        this.tileSprites[y]![x] = img;
      }
    }
    this.snapImg(this.playerSprite, this.state.player.x, this.state.player.y);
    this.rebuildAtmosphere();
  }

  private tileKey(kind: string, x = 0, y = 0): string {
    const f = this.animFrame;
    switch (kind) {
      case 'wall': {
        const v = (x * 3 + y * 7 + this.state.seed) % 2;
        return v === 0 ? 't_wall' : 't_wall_1';
      }
      case 'hazard':
        return f === 0 ? 't_hazard' : f === 1 ? 't_hazard_1' : 't_hazard_2';
      case 'scrub':
        return 't_scrub';
      case 'rubble':
        return 't_rubble';
      case 'vent':
        return f === 0 ? 't_vent' : f === 1 ? 't_vent_1' : 't_vent_2';
      case 'exit':
        return 't_exit';
      case 'beacon':
        return f === 0 ? 't_beacon' : f === 1 ? 't_beacon_1' : 't_beacon_2';
      case 'shuttle':
        return 't_shuttle';
      case 'poi':
        return f === 0 ? 't_poi' : f === 1 ? 't_poi_1' : 't_poi_2';
      case 'floor': {
        const v = (x + y * 3 + this.state.seed) % 3;
        return floorTextureKey(this.state.sectorId, v);
      }
      default:
        return floorTextureKey(this.state.sectorId, 0);
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (this.animating) return;
    sfx.unlock();

    const chrome = chromeFromKey(e);
    if (chrome?.kind === 'mute') {
      sfx.toggleMute();
      this.syncFieldAudio(true);
      this.hintText.setVisible(true);
      this.hintText.setText(sfx.isMuted() ? lore('UI-MUTE-ON') : lore('UI-MUTE-OFF'));
      this.time.delayedCall(900, () => {
        const hint = contextHint(this.state);
        if (hint && !this.state.ui.inventoryOpen && !this.helpOpen && !this.pagesOpen) {
          this.hintText.setText(lore(hint));
        } else {
          this.hintText.setVisible(false);
        }
      });
      return;
    }

    if (this.state.status !== 'playing') {
      this.scene.start('End', {
        status: this.state.status,
        loseReason: this.state.loseReason,
        seed: this.state.seed,
        turn: this.state.turn,
        level: this.state.level,
        skills: this.state.skills,
        objective: lore(describeObjective(this.state).campaign),
      });
      return;
    }

    if (chrome?.kind === 'toggle_help') {
      this.toggleHelp();
      sfx.play('ui');
      return;
    }
    if (chrome?.kind === 'toggle_pages') {
      if (this.helpOpen) this.toggleHelp(false);
      this.togglePages();
      sfx.play('ui');
      return;
    }
    if (this.pagesOpen) {
      if (isPagesDismissKey(e)) {
        this.togglePages(false);
        sfx.play('ui');
      }
      return;
    }
    if (this.helpOpen) {
      if (isHelpDismissKey(e)) {
        this.toggleHelp(false);
        sfx.play('ui');
      }
      return;
    }

    if (this.state.skillPick) {
      if (e.key === '1' || e.key === '2') {
        const idx = parseInt(e.key, 10) - 1;
        const id = this.state.skillPick[idx];
        if (id) {
          applyAction(this.state, { type: 'pick_skill', id });
          sfx.play('ui');
          this.redrawTilesAndHud();
        }
        return;
      }
      // Movement / kit locked until a fork is chosen — keep the skill hint visible
      this.hintText.setVisible(true);
      this.hintText.setText(lore('UI-HINT-SKILL'));
      return;
    }

    const slotIdx = slotIndexFromKey(e);
    if (slotIdx !== null) {
      applyAction(this.state, { type: 'select_slot', index: slotIdx });
      if (!this.state.ui.inventoryOpen) applyAction(this.state, { type: 'toggle_inventory' });
      sfx.play('ui');
      this.redrawTilesAndHud();
      this.syncItems();
      return;
    }

    const action = actionFromKey(e);
    if (!action) return;

    // Escape opens help when kit is closed (actionFromKey maps Escape → close_ui)
    if (action.type === 'close_ui' && !this.state.ui.inventoryOpen) {
      if (this.pagesOpen) {
        this.togglePages(false);
        sfx.play('ui');
        return;
      }
      this.toggleHelp(true);
      sfx.play('ui');
      return;
    }

    if (action.type === 'toggle_inventory' || action.type === 'close_ui') {
      applyAction(this.state, action);
      sfx.play('ui');
      this.redrawTilesAndHud();
      return;
    }

    const prevSector = this.state.sectorIndex;
    const prevHp = this.state.player.hp;
    const prevLogLen = this.state.log.length;
    const prevAlive = this.state.enemies.filter((en) => en.alive).length;
    const fromPlayer = { x: this.state.player.x, y: this.state.player.y };
    const fromEnemies = new Map(
      this.state.enemies.filter((en) => en.alive).map((en) => [en.id, { x: en.x, y: en.y }]),
    );

    applyAction(this.state, action);
    this.playActionSfx({
      action,
      prevSector,
      prevHp,
      prevLogLen,
      prevAlive,
      fromPlayer,
    });

    if (this.state.sectorIndex !== prevSector) {
      this.buildMapSprites();
      this.syncItems();
      this.syncActors(true);
      this.redrawTilesAndHud();
      this.updateCamera(true);
      this.syncFieldAudio(true);
      if (this.state.player.hp < prevHp) this.flashHit();
      this.maybeEnd();
      return;
    }

    music.syncField({
      sectorId: this.state.sectorId,
      stormTurns: this.state.stormTurns,
      inCombat: this.threatNearby(),
    });

    const flareOrBurst =
      this.state.log.slice(prevLogLen).some(
        (l) => l.loreId === 'LOG-USE-FLARE' || l.loreId === 'LOG-SPORE-BURST',
      );
    if (flareOrBurst) this.flashFx(Theme.ionHazard, 0.22);

    if (this.state.player.hp < prevHp) this.flashHit();

    // Brief hit flash on visible enemies that took damage this action
    if (this.state.log.slice(prevLogLen).some((l) => l.loreId === 'LOG-HIT' || l.loreId === 'LOG-KILL')) {
      for (const view of this.enemyViews.values()) {
        if (!view.img.visible) continue;
        view.img.setTint(0xffffff);
        this.time.delayedCall(80, () => {
          if (view.img.active) view.img.clearTint();
        });
      }
    }

    const playerMoved =
      fromPlayer.x !== this.state.player.x || fromPlayer.y !== this.state.player.y;
    const enemyMoved = this.state.enemies.some((en) => {
      if (!en.alive) return false;
      const prev = fromEnemies.get(en.id);
      return !prev || prev.x !== en.x || prev.y !== en.y;
    });

    this.redrawTilesAndHud();
    this.syncItems();

    if (playerMoved || enemyMoved) {
      this.playMoveAnims(fromPlayer, fromEnemies);
    } else if (action.type === 'move') {
      this.bumpAttack(action.dx, action.dy);
      this.syncActors(true);
      this.maybeEnd();
    } else {
      this.syncActors(true);
      this.maybeEnd();
    }
  }

  private playActionSfx(prev: {
    action: Action;
    prevSector: number;
    prevHp: number;
    prevLogLen: number;
    prevAlive: number;
    fromPlayer: { x: number; y: number };
  }): void {
    const st = this.state;
    const newLogs = st.log.slice(prev.prevLogLen).map((l) => l.loreId);
    const has = (id: LoreId) => newLogs.includes(id);

    if (st.status === 'won') {
      // End scene plays win fanfare
      return;
    }
    if (st.status === 'lost') return;

    if (st.sectorIndex !== prev.prevSector) {
      sfx.play('sector');
      return;
    }
    if (has('LOG-USED-KEY')) {
      sfx.play('beacon');
      this.flashFx(Theme.quest, 0.28);
      return;
    }
    if (has('LOG-GOT-KEY') || has('LOG-GOT-CORE')) {
      sfx.play('quest');
      this.flashFx(Theme.quest, 0.3);
      return;
    }
    if (has('LOG-LEVEL')) {
      sfx.play('level');
      this.flashFx(Theme.phosphorBright, 0.22);
      return;
    }
    if (has('LOG-EXTRACT')) {
      sfx.play('extract');
      this.flashFx(Theme.ok, 0.35);
      return;
    }
    if (has('LOG-STORM-WARN')) {
      sfx.play('warn');
    }
    if (has('LOG-ARMOR-ABSORB') && !has('LOG-HURT')) {
      sfx.play('armor');
    }
    if (st.player.hp < prev.prevHp || has('LOG-HURT')) {
      sfx.play('hurt');
    }
    const alive = st.enemies.filter((en) => en.alive).length;
    if (alive < prev.prevAlive || has('LOG-KILL')) {
      sfx.play('kill');
      return;
    }
    if (has('LOG-HIT')) {
      sfx.play('hit');
      return;
    }
    if (
      has('LOG-USE-MED') ||
      has('LOG-USE-ENERGY') ||
      has('LOG-USE-RATION') ||
      has('LOG-USE-PROBE') ||
      has('LOG-USE-STIM') ||
      has('LOG-USE-PLATE') ||
      has('LOG-USE-FLARE') ||
      has('LOG-USE-FILTER') ||
      has('LOG-USE-COOLANT') ||
      has('LOG-USE-BLADE') ||
      has('LOG-USE-HARNESS') ||
      has('LOG-USE-DART') ||
      has('LOG-USE-JAMMER') ||
      has('LOG-USE-SEALANT')
    ) {
      sfx.play('use');
      return;
    }
    if (has('LOG-PICKUP')) {
      sfx.play('pickup');
      return;
    }
    if (has('LOG-MOVE-BLOCKED') || has('LOG-EXIT-BLOCKED') || has('LOG-NEED-KEY') || has('LOG-NEED-CORE')) {
      sfx.play('blocked');
      return;
    }
    if (
      prev.action.type === 'move' &&
      (prev.fromPlayer.x !== st.player.x || prev.fromPlayer.y !== st.player.y)
    ) {
      sfx.play('move');
      return;
    }
    if (prev.action.type === 'wait') {
      sfx.play('ui');
    }
  }

  private bumpAttack(dx: number, dy: number): void {
    const base = this.worldXY(this.state.player.x, this.state.player.y);
    this.playerSprite.setPosition(base.x, base.y);
    this.tweens.add({
      targets: this.playerSprite,
      x: base.x + dx * 6,
      y: base.y + dy * 6,
      duration: 50,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private playMoveAnims(
    fromPlayer: { x: number; y: number },
    fromEnemies: Map<number, { x: number; y: number }>,
  ): void {
    this.animating = true;
    let pending = 0;
    let finished = false;
    const finish = () => {
      pending -= 1;
      if (pending > 0 || finished) return;
      finished = true;
      this.animating = false;
      this.syncActors(true);
      this.maybeEnd();
    };

    const tweenActor = (
      img: Phaser.GameObjects.Image,
      label: Phaser.GameObjects.Text | null,
      from: { x: number; y: number },
      to: { x: number; y: number },
    ) => {
      const a = this.worldXY(from.x, from.y);
      const b = this.worldXY(to.x, to.y);
      img.setPosition(a.x, a.y);
      if (label) label.setPosition(a.x - 6, a.y - 10);
      pending += 1;
      this.tweens.add({
        targets: img,
        x: b.x,
        y: b.y,
        duration: MOVE_MS,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          if (label && label.active) label.setPosition(img.x - 6, img.y - 10);
        },
        onComplete: () => {
          if (!img.active) {
            finish();
            return;
          }
          img.setDisplaySize(TILE_DRAW, TILE_DRAW);
          finish();
        },
      });
    };

    this.syncActors(false);

    const px = this.state.player.x;
    const py = this.state.player.y;
    if (fromPlayer.x !== px || fromPlayer.y !== py) {
      tweenActor(this.playerSprite, null, fromPlayer, { x: px, y: py });
    } else {
      this.snapImg(this.playerSprite, px, py);
    }

    for (const en of this.state.enemies) {
      if (!en.alive) continue;
      const view = this.enemyViews.get(en.id);
      if (!view) continue;
      const prev = fromEnemies.get(en.id) ?? { x: en.x, y: en.y };
      if (prev.x !== en.x || prev.y !== en.y) {
        tweenActor(view.img, view.label, prev, { x: en.x, y: en.y });
        view.gx = en.x;
        view.gy = en.y;
      }
    }

    if (pending === 0) {
      this.animating = false;
      this.maybeEnd();
    } else {
      // Failsafe if a tween is killed mid-move (sector rebuild, etc.)
      this.time.delayedCall(MOVE_MS + 120, () => {
        if (!this.animating || finished) return;
        finished = true;
        this.animating = false;
        this.syncActors(true);
        this.maybeEnd();
      });
    }
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
      const spr = this.add.image(
        item.x * TILE_DRAW + TILE_DRAW / 2,
        item.y * TILE_DRAW + TILE_DRAW / 2,
        quest ? 't_quest' : 't_item',
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
        const img = this.add.image(0, 0, enemyTextureKey(en.kind));
        img.setDisplaySize(TILE_DRAW - 2, TILE_DRAW - 2);
        const label = this.add.text(0, 0, ENEMIES[en.kind].glyph, {
          fontFamily: FONT_DATA,
          fontSize: '11px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        });
        this.entityLayer.add(img);
        this.entityLayer.add(label);
        view = { img, label, gx: en.x, gy: en.y };
        this.enemyViews.set(en.id, view);
        this.snapImg(img, en.x, en.y);
        label.setPosition(img.x - 6, img.y - 10);
      }
      view.img.setVisible(visible);
      view.label.setVisible(visible);
      view.img.setTexture(enemyTextureKey(en.kind));
      if (snapPositions) {
        this.snapImg(view.img, en.x, en.y);
        view.label.setPosition(view.img.x - 6, view.img.y - 10);
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

    this.playerSprite.setVisible(true);
    if (snapPositions) this.snapImg(this.playerSprite, st.player.x, st.player.y);
    // Keep player on top
    this.entityLayer.bringToTop(this.playerSprite);
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
    const ox = -this.camX;
    const oy = -this.camY + TOP;
    this.mapLayer.setPosition(ox, oy);
    this.itemLayer.setPosition(ox, oy);
    this.entityLayer.setPosition(ox, oy);
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
    this.goalMarker.setTint(Theme.quest);
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

    this.chevronGfx.fillStyle(Theme.quest, 0.95);
    this.chevronGfx.lineStyle(1, Theme.phosphorBright, 1);
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
      drawHelpOverlay(this.helpPanel, this.helpText, this.scale.width, this.scale.height);
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
    this.flashFx(Theme.phosphorBright, 0.35);
  }

  private flashFx(color: number, alpha: number): void {
    this.flash.setFillStyle(color, 1);
    this.flash.setAlpha(alpha);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 120 });
  }

  private redrawTilesAndHud(): void {
    const st = this.state;
    const tint = BIOME_FLOOR_TINT[st.sectorId];
    const radius =
      playerFovRadius(st.player.probeTurns, st.player.lensTurns) + st.paddMods.fovBonus;
    const px = st.player.x;
    const py = st.player.y;

    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const img = this.tileSprites[y]![x]!;
        const kind = st.tiles[y]![x]!.kind;
        if (!st.explored[y]![x]) {
          img.setTexture('t_fog');
          img.clearTint();
          img.setAlpha(1);
          continue;
        }

        img.setTexture(this.tileKey(kind, x, y));
        if (st.visible[y]![x]) {
          if (kind === 'floor' || kind === 'scrub' || kind === 'rubble') img.setTint(tint);
          else img.clearTint();
          const dist = fovDistance(px, py, x, y);
          const falloff = Math.max(0, 1 - dist / (radius + 0.35));
          // Bright near player, soft edge at vision rim
          img.setAlpha(0.55 + 0.45 * falloff * falloff);
        } else {
          // Memory: olive plotter ghost
          img.setTint(Theme.memory);
          img.setAlpha(0.32);
        }
      }
    }

    drawFovVignette(this.fovVignette, this.scale.width, this.scale.height, TOP, BOTTOM);

    const pulseBox = { current: this.windowPulseTween };
    this.hud.redraw(st, {
      screenW: this.scale.width,
      screenH: this.scale.height,
      helpOpen: this.helpOpen,
      pagesOpen: this.pagesOpen,
      tweens: this.tweens,
      windowPulseTween: pulseBox,
    });
    this.windowPulseTween = pulseBox.current;

    this.syncGoalVisuals(describeObjective(st).pos);
  }
}
