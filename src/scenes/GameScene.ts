import Phaser from 'phaser';
import { lore, type LoreId } from '../data/lore';
import { getSector } from '../data/encounters';
import { ITEMS } from '../data/items';
import { ENEMIES } from '../data/enemies';
import { applyAction, createGame, type Action, type GameState } from '../sim';
import { fovDistance, playerFovRadius } from '../sim/fov';
import { statusHud } from '../sim/status';
import { objectivePrompt, STORM_TURNS } from '../campaign/spine';
import {
  BIOME_FLOOR_TINT,
  FONT,
  TILE,
  TILE_DRAW,
  enemyTextureKey,
} from './textures';
import { createBiomeAtmosphere } from './atmosphere';
import { sfx } from '../audio/sfx';
import { ambient, music } from '../audio';

const TOP = 76;
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
  private atmo: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private topPanel!: Phaser.GameObjects.Graphics;
  private bottomPanel!: Phaser.GameObjects.Graphics;
  private barsGfx!: Phaser.GameObjects.Graphics;
  private hudMeta!: Phaser.GameObjects.Text;
  private objText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private sectorText!: Phaser.GameObjects.Text;

  private invBg!: Phaser.GameObjects.Rectangle;
  private invPanel!: Phaser.GameObjects.Graphics;
  private invText!: Phaser.GameObjects.Text;

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
    this.animating = false;
    this.enemyViews.clear();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x07090e);
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
      .text(12, 8, '', { fontFamily: FONT, fontSize: '12px', color: '#d0dae8' })
      .setScrollFactor(0)
      .setDepth(92);

    this.objText = this.add
      .text(12, 50, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#f0d060',
        wordWrap: { width: this.scale.width - 220 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.questText = this.add
      .text(this.scale.width - 12, 10, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#ff80e0',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(92);

    this.sectorText = this.add
      .text(this.scale.width - 12, 30, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#a0b0c0',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(92);

    this.logText = this.add
      .text(12, this.scale.height - BOTTOM + 10, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#b0c0d0',
        wordWrap: { width: this.scale.width - 24 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.hintText = this.add
      .text(this.scale.width / 2, this.scale.height - BOTTOM - 16, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#60e0ff',
        backgroundColor: '#0a1018ee',
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
        fontFamily: FONT,
        fontSize: '13px',
        color: '#e0e8f0',
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);

    this.helpBg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.6)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(110)
      .setVisible(false);

    this.helpPanel = this.add.graphics().setScrollFactor(0).setDepth(111).setVisible(false);
    this.helpText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#d0dae8',
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

  update(): void {
    this.updateCamera(false);
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
    this.topPanel.fillStyle(0x080e16, 0.98);
    this.topPanel.fillRect(0, 0, w, TOP);
    this.topPanel.fillStyle(0x122030, 0.5);
    this.topPanel.fillRect(0, TOP - 10, w, 10);
    this.topPanel.lineStyle(2, 0x4ab0e0, 0.65);
    this.topPanel.lineBetween(0, TOP - 1, w, TOP - 1);
    this.topPanel.lineStyle(1, 0x1a3040, 0.8);
    this.topPanel.lineBetween(0, 0, w, 0);

    this.bottomPanel.clear();
    this.bottomPanel.fillStyle(0x080e16, 0.98);
    this.bottomPanel.fillRect(0, h - BOTTOM, w, BOTTOM);
    this.bottomPanel.fillStyle(0x122030, 0.45);
    this.bottomPanel.fillRect(0, h - BOTTOM, w, 10);
    this.bottomPanel.lineStyle(2, 0x4ab0e0, 0.65);
    this.bottomPanel.lineBetween(0, h - BOTTOM + 1, w, h - BOTTOM + 1);
  }

  private rebuildAtmosphere(): void {
    this.atmo?.destroy();
    this.atmo = createBiomeAtmosphere(this, this.state.sectorId, 85);
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
    switch (kind) {
      case 'wall': {
        const v = (x * 3 + y * 7 + this.state.seed) % 2;
        return v === 0 ? 't_wall' : 't_wall_1';
      }
      case 'hazard':
        return 't_hazard';
      case 'scrub':
        return 't_scrub';
      case 'rubble':
        return 't_rubble';
      case 'vent':
        return 't_vent';
      case 'exit':
        return 't_exit';
      case 'beacon':
        return 't_beacon';
      case 'shuttle':
        return 't_shuttle';
      case 'poi':
        return 't_poi';
      case 'floor': {
        const v = (x + y * 3 + this.state.seed) % 3;
        return `t_floor_${v}`;
      }
      default:
        return 't_floor';
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
        if (hint && !this.state.ui.inventoryOpen && !this.helpOpen) {
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
      });
      return;
    }

    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      this.toggleHelp();
      sfx.play('ui');
      return;
    }
    if (this.helpOpen) {
      if (e.key === 'Escape' || e.key === '?' || e.key === 'Enter') {
        this.toggleHelp(false);
        sfx.play('ui');
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
      else {
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

    if (this.state.player.hp < prevHp) this.flashHit();

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
      return;
    }
    if (has('LOG-GOT-KEY') || has('LOG-GOT-CORE')) {
      sfx.play('quest');
      return;
    }
    if (has('LOG-STORM-WARN')) {
      sfx.play('warn');
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
          fontFamily: FONT,
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
  }

  private toggleHelp(force?: boolean): void {
    this.helpOpen = force ?? !this.helpOpen;
    this.helpBg.setVisible(this.helpOpen);
    this.helpPanel.setVisible(this.helpOpen);
    this.helpText.setVisible(this.helpOpen);
    if (this.helpOpen) {
      const w = 440;
      const h = 300;
      const x = (this.scale.width - w) / 2;
      const y = (this.scale.height - h) / 2;
      this.helpPanel.clear();
      this.helpPanel.fillStyle(0x101820, 0.98);
      this.helpPanel.fillRoundedRect(x, y, w, h, 4);
      this.helpPanel.lineStyle(2, 0x5ec8ff, 0.7);
      this.helpPanel.strokeRoundedRect(x, y, w, h, 4);
      this.helpText.setPosition(x + 24, y + 20);
      this.helpText.setText(`${lore('UI-HELP')}\n\n${lore('UI-HELP-BODY')}\n\nESC / ? close`);
    }
  }

  private flashHit(): void {
    this.flash.setFillStyle(0xe05050, 1);
    this.flash.setAlpha(0.3);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 220 });
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
    this.barsGfx.fillStyle(0x15202c, 1);
    this.barsGfx.fillRect(x, y, w, h);
    this.barsGfx.fillStyle(r <= 0.3 ? low : fill, 1);
    this.barsGfx.fillRect(x, y, Math.max(0, Math.floor(w * r)), h);
    this.barsGfx.lineStyle(1, 0x5a7088, 1);
    this.barsGfx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private contextHint(): LoreId | null {
    const st = this.state;
    if (st.ui.aimingDart) return 'UI-HINT-AIM';
    const tile = st.tiles[st.player.y]![st.player.x]!;
    if (tile.kind === 'exit') return 'UI-HINT-EXIT';
    if (tile.kind === 'beacon') return 'UI-HINT-BEACON';
    if (tile.kind === 'shuttle') return 'UI-HINT-SHUTTLE';
    if (tile.kind === 'poi' && !st.poiUsed) return 'UI-HINT-POI';
    if (st.items.some((i) => i.x === st.player.x && i.y === st.player.y)) return 'UI-HINT-ITEM';
    return null;
  }

  private redrawTilesAndHud(): void {
    const st = this.state;
    const tint = BIOME_FLOOR_TINT[st.sectorId];
    const radius = playerFovRadius(st.player.probeTurns);
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
          img.setAlpha(0.52 + 0.48 * falloff);
        } else {
          // Memory: desaturated cool silhouette
          img.setTint(0x4a5870);
          img.setAlpha(0.28);
        }
      }
    }

    this.barsGfx.clear();
    this.drawBar(12, 30, 150, 10, st.player.hp / st.player.maxHp, 0x40e878, 0xff4040);
    this.drawBar(176, 30, 150, 10, st.player.energy / st.player.maxEnergy, 0x40c8ff, 0xffa040);
    this.drawBar(340, 30, 170, 10, st.stormTurns / STORM_TURNS, 0xf0d040, 0xff5050);

    const probe = st.player.probeTurns > 0 ? `  ${lore('UI-PROBE')} ${st.player.probeTurns}` : '';
    const stim = st.player.stimTurns > 0 ? `  ${lore('UI-STIM')} ${st.player.stimTurns}` : '';
    const plate = st.player.plateTurns > 0 ? `  ${lore('UI-PLATE')} ${st.player.plateTurns}` : '';
    const filter =
      st.player.filterTurns > 0 ? `  ${lore('UI-FILTER')} ${st.player.filterTurns}` : '';
    const jam =
      st.player.jammerTurns > 0 ? `  ${lore('UI-JAMMER')} ${st.player.jammerTurns}` : '';
    const statuses = statusHud(st.player.statuses);
    const statusLine = statuses ? `  ${statuses}` : '';
    const atkBonus =
      (st.player.probeTurns > 0 ? 2 : 0) + (st.player.stimTurns > 0 ? 3 : 0);
    const defBonus = st.player.plateTurns > 0 ? 2 : 0;
    this.hudMeta.setText(
      `${lore('UI-HP')} ${st.player.hp}/${st.player.maxHp}    ${lore('UI-ENERGY')} ${st.player.energy}/${st.player.maxEnergy}    ${lore('UI-WINDOW')} ${st.stormTurns}    ${lore('UI-ATK')} ${st.player.atk}${atkBonus ? `+${atkBonus}` : ''}  ${lore('UI-DEF')} ${st.player.def}${defBonus ? `+${defBonus}` : ''}${probe}${stim}${plate}${filter}${jam}${statusLine}`,
    );

    const sector = getSector(st.sectorIndex);
    const dots = Array.from({ length: 8 }, (_, i) => (i <= st.sectorIndex ? '●' : '○')).join(' ');
    this.sectorText.setText(
      `${lore('UI-SECTOR')} ${st.sectorIndex + 1}/8  ${lore(sector.loreName)}\n${dots}   ${lore('UI-SEED')} ${st.seed}`,
    );

    const badges: string[] = [];
    if (st.objectives.hasRelayKey) badges.push(lore('UI-QUEST-KEY'));
    if (st.objectives.usedRelayKey && !st.objectives.hasRelayKey) {
      badges.push(lore('UI-RELAY-OPEN'));
    }
    if (st.objectives.hasNavCore) badges.push(lore('UI-QUEST-CORE'));
    this.questText.setText(badges.join('  ·  '));

    const objLine = `${lore('UI-OBJECTIVE')}: ${lore(
      objectivePrompt({
        hasRelayKey: st.objectives.hasRelayKey,
        usedRelayKey: st.objectives.usedRelayKey,
        hasNavCore: st.objectives.hasNavCore,
        sectorId: st.sectorId,
      }),
    )}`;
    this.objText.setText(st.stormTurns <= 50 ? `${objLine}\n${lore('HAZ-STORM')}` : objLine);

    const logs = st.log.slice(-5).map((l) => {
      const base = lore(l.loreId);
      return l.detail ? `› ${base} (${l.detail})` : `› ${base}`;
    });
    this.logText.setText(`${lore('UI-LOG')}   [? help]\n${logs.join('\n')}`);

    const hint = this.contextHint();
    if (hint && !st.ui.inventoryOpen && !this.helpOpen) {
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
      this.invPanel.fillStyle(0x101820, 0.98);
      this.invPanel.fillRoundedRect(px, py, pw, ph, 4);
      this.invPanel.lineStyle(2, 0xe0c040, 0.7);
      this.invPanel.strokeRoundedRect(px, py, pw, ph, 4);
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
      this.invText.setText(`${lore('UI-INV')}\n\n${lines.join('\n')}\n\n${lore('UI-INV-HINT')}`);
    }
  }
}
