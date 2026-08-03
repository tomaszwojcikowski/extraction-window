import Phaser from 'phaser';
import { lore, type LoreId } from '../data/lore';
import { getSector } from '../data/encounters';
import { ITEMS } from '../data/items';
import { ENEMIES } from '../data/enemies';
import { applyAction, createGame, describeObjective, stickyMilestone, type Action, type GameState } from '../sim';
import { fovDistance, playerFovRadius } from '../sim/fov';
import { statusHud } from '../sim/status';
import { toolAtkBonus } from '../sim/combat';
import { CAMPAIGN_LENGTH, STORM_TURNS } from '../campaign/spine';
import { SKILLS } from '../data/progression';
import { TILE, TILE_DRAW, enemyTextureKey } from './textures';
import { BIOME_FLOOR_TINT, FONT_DATA, Theme, ThemeCss, floorTextureKey } from './theme';
import { createScanRetrace } from './atmosphere';
import { sfx } from '../audio/sfx';
import { ambient, music } from '../audio';

const TOP = 92;
const BOTTOM = 112;
const MOVE_MS = 100;

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
  private hudMeta!: Phaser.GameObjects.Text;
  private objText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private sectorText!: Phaser.GameObjects.Text;
  private milestoneText!: Phaser.GameObjects.Text;
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

    this.hudMeta = this.add
      .text(12, 8, '', { fontFamily: FONT_DATA, fontSize: '12px', color: ThemeCss.phosphor })
      .setScrollFactor(0)
      .setDepth(92);

    this.objText = this.add
      .text(12, 48, '', {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.phosphorBright,
        wordWrap: { width: this.scale.width - 220 },
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.milestoneText = this.add
      .text(12, 78, '', {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.quest,
        wordWrap: { width: this.scale.width - 220 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.chevronGfx = this.add.graphics().setScrollFactor(0).setDepth(94);

    this.goalMarker = this.add.image(0, 0, 't_quest');
    this.goalMarker.setDisplaySize(TILE_DRAW + 4, TILE_DRAW + 4);
    this.goalMarker.setAlpha(0);
    this.goalMarker.setDepth(5);
    this.itemLayer.add(this.goalMarker);

    this.questText = this.add
      .text(this.scale.width - 12, 10, '', {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.quest,
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(92);

    this.sectorText = this.add
      .text(this.scale.width - 12, 30, '', {
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

    this.drawChrome();
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.syncItems();
    this.syncActors(true);
    this.redrawTilesAndHud();
    this.updateCamera(true);
    this.syncFieldAudio(true);
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
    if (force) music.syncStorm(this.state.stormTurns);
    else music.syncStorm(this.state.stormTurns);
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
    this.topPanel.clear();
    this.topPanel.fillStyle(Theme.groundDeep, 0.98);
    this.topPanel.fillRect(0, 0, w, TOP);
    this.topPanel.lineStyle(1, Theme.phosphor, 0.7);
    this.topPanel.lineBetween(0, TOP - 1, w, TOP - 1);
    // Registration ticks
    this.topPanel.lineStyle(1, Theme.phosphorDim, 0.9);
    this.topPanel.lineBetween(8, TOP - 6, 8, TOP);
    this.topPanel.lineBetween(w - 8, TOP - 6, w - 8, TOP);
    this.topPanel.lineBetween(4, 4, 14, 4);
    this.topPanel.lineBetween(4, 4, 4, 14);

    this.bottomPanel.clear();
    this.bottomPanel.fillStyle(Theme.groundDeep, 0.98);
    this.bottomPanel.fillRect(0, h - BOTTOM, w, BOTTOM);
    this.bottomPanel.lineStyle(1, Theme.phosphor, 0.7);
    this.bottomPanel.lineBetween(0, h - BOTTOM + 1, w, h - BOTTOM + 1);
    this.bottomPanel.lineStyle(1, Theme.phosphorDim, 0.9);
    this.bottomPanel.lineBetween(8, h - BOTTOM, 8, h - BOTTOM + 6);
    this.bottomPanel.lineBetween(w - 8, h - BOTTOM, w - 8, h - BOTTOM + 6);
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
    this.animating = false;
    this.mapLayer.removeAll(true);
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

    if (e.key === 'm' || e.key === 'M') {
      sfx.toggleMute();
      this.syncFieldAudio(true);
      this.hintText.setVisible(true);
      this.hintText.setText(sfx.isMuted() ? lore('UI-MUTE-ON') : lore('UI-MUTE-OFF'));
      this.time.delayedCall(900, () => {
        const hint = this.contextHint();
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

    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      this.toggleHelp();
      sfx.play('ui');
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      if (this.helpOpen) this.toggleHelp(false);
      this.togglePages();
      sfx.play('ui');
      return;
    }
    if (this.pagesOpen) {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === 'Enter') {
        this.togglePages(false);
        sfx.play('ui');
      }
      return;
    }
    if (this.helpOpen) {
      if (e.key === 'Escape' || e.key === '?' || e.key === 'Enter') {
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
      return;
    }

    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      applyAction(this.state, { type: 'select_slot', index: idx });
      if (!this.state.ui.inventoryOpen) applyAction(this.state, { type: 'toggle_inventory' });
      sfx.play('ui');
      this.redrawTilesAndHud();
      this.syncItems();
      return;
    }

    let action: Action | null = null;
    const k = e.key;
    if (k === 'Escape') {
      if (this.state.ui.inventoryOpen) action = { type: 'close_ui' };
      else if (this.pagesOpen) {
        this.togglePages(false);
        sfx.play('ui');
        return;
      } else {
        this.toggleHelp(true);
        sfx.play('ui');
        return;
      }
    } else if (k === 'i' || k === 'I') action = { type: 'toggle_inventory' };
    else if (k === 'u' || k === 'U') action = { type: 'use' };
    else if (k === 'g' || k === 'G') action = { type: 'get' };
    else if (k === '.' && !e.shiftKey) action = { type: 'wait' };
    else if (k === '>' || k === '=' || (e.code === 'Period' && e.shiftKey)) action = { type: 'exit' };
    else if (k === 'ArrowUp' || k === 'w' || k === 'W') action = { type: 'move', dx: 0, dy: -1 };
    else if (k === 'ArrowDown' || k === 's' || k === 'S') action = { type: 'move', dx: 0, dy: 1 };
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') action = { type: 'move', dx: -1, dy: 0 };
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') action = { type: 'move', dx: 1, dy: 0 };
    if (!action) return;

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

    music.syncStorm(this.state.stormTurns);

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
    const finish = () => {
      pending -= 1;
      if (pending > 0) return;
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
          if (label) label.setPosition(img.x - 6, img.y - 10);
        },
        onComplete: () => {
          this.tweens.add({
            targets: img,
            displayWidth: TILE_DRAW + 2,
            displayHeight: TILE_DRAW - 3,
            duration: 35,
            yoyo: true,
            onComplete: finish,
          });
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
      const w = 440;
      const h = 300;
      const x = (this.scale.width - w) / 2;
      const y = (this.scale.height - h) / 2;
      this.helpPanel.clear();
      this.helpPanel.fillStyle(Theme.panel, 0.98);
      this.helpPanel.fillRect(x, y, w, h);
      this.helpPanel.lineStyle(1, Theme.phosphor, 0.85);
      this.helpPanel.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      // Registration corners
      this.helpPanel.lineStyle(1, Theme.phosphorDim, 1);
      this.helpPanel.lineBetween(x + 4, y + 4, x + 14, y + 4);
      this.helpPanel.lineBetween(x + 4, y + 4, x + 4, y + 14);
      this.helpPanel.lineBetween(x + w - 4, y + 4, x + w - 14, y + 4);
      this.helpPanel.lineBetween(x + w - 4, y + 4, x + w - 4, y + 14);
      this.helpText.setPosition(x + 24, y + 20);
      this.helpText.setText(`${lore('UI-HELP')}\n\n${lore('UI-HELP-BODY')}\n\nESC / ? close`);
    }
  }

  private togglePages(force?: boolean): void {
    this.pagesOpen = force ?? !this.pagesOpen;
    if (this.pagesOpen && this.helpOpen) this.toggleHelp(false);
    this.pagesBg.setVisible(this.pagesOpen);
    this.pagesPanel.setVisible(this.pagesOpen);
    this.pagesText.setVisible(this.pagesOpen);
    if (this.pagesOpen) {
      const st = this.state;
      const w = 460;
      const body =
        st.codexLog.length === 0
          ? lore('UI-PAGES-EMPTY')
          : st.codexLog.map((id, i) => `${i + 1}. ${lore(id)}`).join('\n\n');
      const h = Math.min(420, 90 + Math.max(40, st.codexLog.length * 48));
      const x = (this.scale.width - w) / 2;
      const y = (this.scale.height - h) / 2;
      this.pagesPanel.clear();
      this.pagesPanel.fillStyle(Theme.panel, 0.98);
      this.pagesPanel.fillRect(x, y, w, h);
      this.pagesPanel.lineStyle(1, Theme.quest, 0.9);
      this.pagesPanel.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      this.pagesText.setPosition(x + 20, y + 16);
      this.pagesText.setText(
        `${lore('UI-PAGES')}  (${st.codexPages})\n\n${body}\n\n${lore('UI-PAGES-HINT')}`,
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
    this.barsGfx.fillStyle(Theme.panel, 1);
    this.barsGfx.fillRect(x, y, w, h);
    this.barsGfx.fillStyle(r <= 0.3 ? low : fill, 1);
    this.barsGfx.fillRect(x, y, Math.max(0, Math.floor(w * r)), h);
    this.barsGfx.lineStyle(1, Theme.phosphorMute, 1);
    this.barsGfx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private drawFovVignette(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const g = this.fovVignette;
    g.clear();
    const top = TOP;
    const bot = h - BOTTOM;
    // Plotter mask: hard L-corners, not soft vignette soup
    g.lineStyle(1, Theme.phosphorMute, 0.35);
    g.strokeRect(8.5, top + 8.5, w - 17, bot - top - 17);
    const arm = 18;
    g.lineStyle(1, Theme.phosphorDim, 0.55);
    // TL
    g.lineBetween(8, top + 8, 8 + arm, top + 8);
    g.lineBetween(8, top + 8, 8, top + 8 + arm);
    // TR
    g.lineBetween(w - 8, top + 8, w - 8 - arm, top + 8);
    g.lineBetween(w - 8, top + 8, w - 8, top + 8 + arm);
    // BL
    g.lineBetween(8, bot - 8, 8 + arm, bot - 8);
    g.lineBetween(8, bot - 8, 8, bot - 8 - arm);
    // BR
    g.lineBetween(w - 8, bot - 8, w - 8 - arm, bot - 8);
    g.lineBetween(w - 8, bot - 8, w - 8, bot - 8 - arm);
  }

  private contextHint(): LoreId | null {
    const st = this.state;
    if (st.ui.aimingDart) return 'UI-HINT-AIM';
    const tile = st.tiles[st.player.y]![st.player.x]!;
    if (tile.kind === 'exit') return 'UI-HINT-EXIT';
    if (tile.kind === 'beacon') return 'UI-HINT-BEACON';
    if (tile.kind === 'shuttle') return 'UI-HINT-SHUTTLE';
    if (
      st.roomQuest &&
      !st.roomQuest.done &&
      st.player.x === st.roomQuest.pos.x &&
      st.player.y === st.roomQuest.pos.y
    ) {
      return 'UI-HINT-QUEST';
    }
    if (tile.kind === 'poi' && !st.poiUsed) return 'UI-HINT-POI';
    if (st.items.some((i) => i.x === st.player.x && i.y === st.player.y)) return 'UI-HINT-ITEM';
    if (st.player.hp <= st.player.maxHp * 0.4) return 'UI-HINT-USE-MED';
    if (st.player.energy <= st.player.maxEnergy * 0.35) return 'UI-HINT-USE-ENERGY';
    if (st.player.armor <= 3 && st.player.maxArmor > 0) return 'UI-HINT-USE-ARMOR';
    return null;
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

    this.drawFovVignette();

    this.barsGfx.clear();
    this.drawBar(12, 30, 150, 10, st.player.hp / st.player.maxHp, Theme.ok, Theme.danger);
    this.drawBar(176, 30, 120, 10, st.player.armor / Math.max(1, st.player.maxArmor), Theme.phosphor, Theme.danger);
    this.drawBar(308, 30, 120, 10, st.player.energy / st.player.maxEnergy, Theme.energy, Theme.storm);
    this.drawBar(440, 30, 100, 10, st.stormTurns / STORM_TURNS, Theme.storm, Theme.danger);
    const xpFrac = st.xpToNext > 0 ? st.xp / st.xpToNext : 1;
    this.drawBar(550, 30, 80, 10, xpFrac, Theme.quest, Theme.phosphorMute);

    const probe = st.player.probeTurns > 0 ? ` P${st.player.probeTurns}` : '';
    const stim = st.player.stimTurns > 0 ? ` S${st.player.stimTurns}` : '';
    const filter = st.player.filterTurns > 0 ? ` F${st.player.filterTurns}` : '';
    const jam = st.player.jammerTurns > 0 ? ` J${st.player.jammerTurns}` : '';
    const lens = st.player.lensTurns > 0 ? ` L${st.player.lensTurns}` : '';
    const map = st.player.mapperTurns > 0 ? ` M${st.player.mapperTurns}` : '';
    const activeSys = `${probe}${stim}${filter}${jam}${lens}${map}`;
    const systems = activeSys ? `  ${lore('UI-ACTIVE')}:${activeSys}` : '';
    const tool =
      st.player.equip.tool === 'blade' ? `  ${lore('UI-TOOL')}:knife` : '';
    const armorEq =
      st.player.equip.armor === 'harness' ? `  ${lore('UI-EQUIP-ARMOR')}:eva` : '';
    const statuses = statusHud(st.player.statuses);
    const statusLine = statuses ? `  ${statuses}` : '';
    const atkBonus =
      toolAtkBonus(st) +
      (st.player.probeTurns > 0 ? 2 : 0) +
      (st.player.stimTurns > 0 ? 3 : 0);
    this.hudMeta.setText(
      `${lore('UI-LEVEL')} ${st.level}  ${lore('UI-XP')} ${st.xp}${st.xpToNext ? `/${st.xpToNext}` : ''}  ${lore('UI-HP')} ${st.player.hp}/${st.player.maxHp}  ${lore('UI-ARMOR')} ${st.player.armor}/${st.player.maxArmor}  ${lore('UI-ENERGY')} ${st.player.energy}/${st.player.maxEnergy}  ${lore('UI-WINDOW')} ${st.stormTurns}  ${lore('UI-EM')} ${st.emStress}  ${lore('UI-ATK')} ${st.player.atk}${atkBonus ? `+${atkBonus}` : ''}  ${lore('UI-DEF')} ${st.player.def}${systems}${tool}${armorEq}${statusLine}`,
    );

    const sector = getSector(st.sectorIndex);
    const dots = Array.from({ length: CAMPAIGN_LENGTH }, (_, i) =>
      i <= st.sectorIndex ? '●' : '○',
    ).join(' ');
    this.sectorText.setText(
      `${lore('UI-SECTOR')} ${st.sectorIndex + 1}/${CAMPAIGN_LENGTH}  ${lore(sector.loreName)}\n${dots}   ${lore('UI-SEED')} ${st.seed}`,
    );

    const badges: string[] = [];
    if (st.objectives.hasRelayKey) badges.push(lore('UI-QUEST-KEY'));
    if (st.objectives.usedRelayKey && !st.objectives.hasRelayKey) {
      badges.push(lore('UI-RELAY-OPEN'));
    }
    if (st.objectives.hasNavCore) badges.push(lore('UI-QUEST-CORE'));
    if (st.codexPages > 0) badges.push(`${lore('UI-CODEX')} ${st.codexPages}`);
    this.questText.setText(badges.join('  ·  '));

    const desc = describeObjective(st);
    const localLine = lore(desc.local);
    const campaignLine = `${lore('UI-OBJECTIVE')}: ${lore(desc.campaign)}`;
    const stormBit =
      st.stormTurns <= 80
        ? `\n${lore('HAZ-STORM')}  (${st.stormTurns})`
        : st.stormTurns <= 200
          ? `\n${lore('LOG-STORM-WARN')}  (${st.stormTurns})`
          : '';
    const skillBit = st.skillPick
      ? `\n${lore('UI-SKILL-PICK')}: 1 ${lore(SKILLS[st.skillPick[0]!].loreName)}${st.skillPick[1] ? ` · 2 ${lore(SKILLS[st.skillPick[1]!].loreName)}` : ''}`
      : '';
    const emBit = st.emStress >= 35 ? `\n${lore('UI-EM')} ${st.emStress}` : '';
    this.objText.setText(`${localLine}\n${campaignLine}${stormBit}${skillBit}${emBit}`);

    const sticky = stickyMilestone(st.loreEvents);
    this.milestoneText.setText(sticky ? lore(sticky) : '');

    this.syncGoalVisuals(desc.pos);

    const logs = st.log.slice(-5).map((l) => {
      const base = lore(l.loreId);
      return l.detail ? `› ${base} (${l.detail})` : `› ${base}`;
    });
    this.logText.setText(`${lore('UI-LOG')}   [? help]\n${logs.join('\n')}`);

    const hint = this.contextHint();
    if (hint && !st.ui.inventoryOpen && !this.helpOpen && !this.pagesOpen) {
      this.hintText.setVisible(true);
      this.hintText.setText(lore(hint));
    } else {
      this.hintText.setVisible(false);
    }

    const invOpen = st.ui.inventoryOpen;
    this.invBg.setVisible(invOpen);
    this.invPanel.setVisible(invOpen);
    this.invText.setVisible(invOpen);
    if (invOpen) {
      const pw = 380;
      const ph = Math.max(180, 70 + st.inventory.length * 22);
      const px = (this.scale.width - pw) / 2;
      const py = (this.scale.height - ph) / 2;
      this.invPanel.clear();
      this.invPanel.fillStyle(Theme.panel, 0.98);
      this.invPanel.fillRect(px, py, pw, ph);
      this.invPanel.lineStyle(1, Theme.phosphor, 0.85);
      this.invPanel.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      this.invPanel.lineStyle(1, Theme.phosphorDim, 1);
      this.invPanel.lineBetween(px + 4, py + 4, px + 14, py + 4);
      this.invPanel.lineBetween(px + 4, py + 4, px + 4, py + 14);
      const lines =
        st.inventory.length === 0
          ? [lore('UI-EMPTY-INV')]
          : st.inventory.map((slot, i) => {
              const mark = i === st.ui.selectedSlot ? '▸' : ' ';
              const num = i < 9 ? `${i + 1}` : ' ';
              const name = lore(ITEMS[slot.kind].loreName);
              const desc = lore(ITEMS[slot.kind].loreDesc);
              const sel = i === st.ui.selectedSlot ? `  — ${desc}` : '';
              return `${mark} ${num}  ${name} ×${slot.count}${sel}`;
            });
      this.invText.setPosition(px + 18, py + 16);
      const equipLine = `${lore('UI-TOOL')}: ${st.player.equip.tool === 'blade' ? 'knife' : (st.player.equip.tool ?? '—')}   ${lore('UI-EQUIP-ARMOR')}: ${st.player.equip.armor === 'harness' ? 'eva' : (st.player.equip.armor ?? '—')}`;
      this.invText.setText(
        `${lore('UI-INV')}\n${equipLine}\n\n${lines.join('\n')}\n\n${lore('UI-INV-HINT')}`,
      );
    }
  }
}
