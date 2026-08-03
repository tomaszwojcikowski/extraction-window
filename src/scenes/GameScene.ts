import Phaser from 'phaser';
import { lore, type LoreId } from '../data/lore';
import { getSector } from '../data/encounters';
import { ITEMS } from '../data/items';
import { ENEMIES } from '../data/enemies';
import { applyAction, createGame, type Action, type GameState } from '../sim';
import { objectivePrompt, STORM_TURNS } from '../campaign/spine';
import { BIOME_FLOOR_TINT, FONT, TILE } from './textures';

const TOP = 72;
const BOTTOM = 108;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private mapLayer!: Phaser.GameObjects.Container;
  private entityLayer!: Phaser.GameObjects.Container;
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private camX = 0;
  private camY = 0;

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
  private lastHp = 0;
  private lastEnergy = 0;

  constructor() {
    super('Game');
  }

  init(data: { seed?: number }): void {
    this.state = createGame(data.seed ?? 42);
    this.helpOpen = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x07090e);
    this.mapLayer = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.buildMapSprites();

    this.topPanel = this.add.graphics().setScrollFactor(0).setDepth(90);
    this.bottomPanel = this.add.graphics().setScrollFactor(0).setDepth(90);
    this.barsGfx = this.add.graphics().setScrollFactor(0).setDepth(91);

    this.hudMeta = this.add
      .text(12, 8, '', { fontFamily: FONT, fontSize: '12px', color: '#c8d0dc' })
      .setScrollFactor(0)
      .setDepth(92);

    this.objText = this.add
      .text(12, 48, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#e0c040',
        wordWrap: { width: this.scale.width - 200 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.questText = this.add
      .text(this.scale.width - 12, 10, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#ff80d0',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(92);

    this.sectorText = this.add
      .text(this.scale.width - 12, 28, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#8a9bb0',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(92);

    this.logText = this.add
      .text(12, this.scale.height - BOTTOM + 10, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#9aacbe',
        wordWrap: { width: this.scale.width - 24 },
      })
      .setScrollFactor(0)
      .setDepth(92);

    this.hintText = this.add
      .text(this.scale.width / 2, this.scale.height - BOTTOM - 14, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#5ec8ff',
        backgroundColor: '#0a1018cc',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(93)
      .setVisible(false);

    // Inventory modal
    this.invBg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.55)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false)
      .setInteractive();

    this.invPanel = this.add.graphics().setScrollFactor(0).setDepth(101).setVisible(false);
    this.invText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#d0dae8',
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);

    // Help modal
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
        color: '#c8d0dc',
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

    this.lastHp = this.state.player.hp;
    this.lastEnergy = this.state.player.energy;

    this.drawChrome();
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.redraw(true);
  }

  private drawChrome(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.topPanel.clear();
    this.topPanel.fillStyle(0x0a1018, 0.96);
    this.topPanel.fillRect(0, 0, w, TOP);
    this.topPanel.lineStyle(1, 0x2a3a4a, 1);
    this.topPanel.lineBetween(0, TOP - 0.5, w, TOP - 0.5);
    this.topPanel.lineStyle(1, 0x5ec8ff, 0.25);
    this.topPanel.lineBetween(0, TOP - 1.5, w, TOP - 1.5);

    this.bottomPanel.clear();
    this.bottomPanel.fillStyle(0x0a1018, 0.96);
    this.bottomPanel.fillRect(0, h - BOTTOM, w, BOTTOM);
    this.bottomPanel.lineStyle(1, 0x2a3a4a, 1);
    this.bottomPanel.lineBetween(0, h - BOTTOM + 0.5, w, h - BOTTOM + 0.5);
  }

  private buildMapSprites(): void {
    this.mapLayer.removeAll(true);
    this.entityLayer.removeAll(true);
    this.tileSprites = [];
    const tint = BIOME_FLOOR_TINT[this.state.sectorId];
    const { width, height, tiles } = this.state;
    for (let y = 0; y < height; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < width; x++) {
        const kind = tiles[y]![x]!.kind;
        const key = this.tileKey(kind);
        const img = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, key);
        img.setDisplaySize(TILE, TILE);
        if (kind === 'floor') img.setTint(tint);
        this.mapLayer.add(img);
        this.tileSprites[y]![x] = img;
      }
    }
  }

  private tileKey(kind: string): string {
    switch (kind) {
      case 'wall':
        return 't_wall';
      case 'hazard':
        return 't_hazard';
      case 'exit':
        return 't_exit';
      case 'beacon':
        return 't_beacon';
      case 'shuttle':
        return 't_shuttle';
      default:
        return 't_floor';
    }
  }

  private onKey(e: KeyboardEvent): void {
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
      return;
    }

    if (this.helpOpen) {
      if (e.key === 'Escape' || e.key === '?' || e.key === 'Enter') this.toggleHelp(false);
      return;
    }

    // Number keys select inventory slot
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      applyAction(this.state, { type: 'select_slot', index: idx });
      if (!this.state.ui.inventoryOpen) {
        applyAction(this.state, { type: 'toggle_inventory' });
      }
      this.redraw();
      return;
    }

    let action: Action | null = null;
    const k = e.key;

    if (k === 'Escape') {
      if (this.state.ui.inventoryOpen) action = { type: 'close_ui' };
      else {
        this.toggleHelp(true);
        return;
      }
    } else if (k === 'i' || k === 'I') action = { type: 'toggle_inventory' };
    else if (k === 'u' || k === 'U') action = { type: 'use' };
    else if (k === 'g' || k === 'G') action = { type: 'get' };
    else if (k === '.' && !e.shiftKey) action = { type: 'wait' };
    else if (k === '>' || k === '=' || (e.code === 'Period' && e.shiftKey)) {
      action = { type: 'exit' };
    } else if (k === 'ArrowUp' || k === 'w' || k === 'W') action = { type: 'move', dx: 0, dy: -1 };
    else if (k === 'ArrowDown' || k === 's' || k === 'S') action = { type: 'move', dx: 0, dy: 1 };
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') action = { type: 'move', dx: -1, dy: 0 };
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') action = { type: 'move', dx: 1, dy: 0 };

    if (!action) return;

    const prevSector = this.state.sectorIndex;
    const prevHp = this.state.player.hp;
    applyAction(this.state, action);
    if (this.state.sectorIndex !== prevSector) {
      this.buildMapSprites();
    }
    if (this.state.player.hp < prevHp) {
      this.flashHit();
    }
    this.redraw();

    if (this.state.status !== 'playing') {
      this.time.delayedCall(500, () => {
        this.scene.start('End', {
          status: this.state.status,
          loseReason: this.state.loseReason,
          seed: this.state.seed,
          turn: this.state.turn,
        });
      });
    }
  }

  private toggleHelp(force?: boolean): void {
    this.helpOpen = force ?? !this.helpOpen;
    this.helpBg.setVisible(this.helpOpen);
    this.helpPanel.setVisible(this.helpOpen);
    this.helpText.setVisible(this.helpOpen);
    if (this.helpOpen) {
      const w = 420;
      const h = 280;
      const x = (this.scale.width - w) / 2;
      const y = (this.scale.height - h) / 2;
      this.helpPanel.clear();
      this.helpPanel.fillStyle(0x101820, 0.98);
      this.helpPanel.fillRoundedRect(x, y, w, h, 4);
      this.helpPanel.lineStyle(1, 0x5ec8ff, 0.6);
      this.helpPanel.strokeRoundedRect(x, y, w, h, 4);
      this.helpText.setPosition(x + 24, y + 20);
      this.helpText.setText(`${lore('UI-HELP')}\n\n${lore('UI-HELP-BODY')}\n\nESC / ? close`);
    }
  }

  private flashHit(): void {
    this.flash.setFillStyle(0xe05050, 1);
    this.flash.setAlpha(0.28);
    this.tweens.add({
      targets: this.flash,
      alpha: 0,
      duration: 220,
    });
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
    this.barsGfx.fillStyle(0x1a222e, 1);
    this.barsGfx.fillRect(x, y, w, h);
    this.barsGfx.fillStyle(r <= 0.3 ? low : fill, 1);
    this.barsGfx.fillRect(x, y, Math.max(0, Math.floor(w * r)), h);
    this.barsGfx.lineStyle(1, 0x3a4a5a, 1);
    this.barsGfx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private contextHint(): LoreId | null {
    const st = this.state;
    const tile = st.tiles[st.player.y]![st.player.x]!;
    if (tile.kind === 'exit') return 'UI-HINT-EXIT';
    if (tile.kind === 'beacon') return 'UI-HINT-BEACON';
    if (tile.kind === 'shuttle') return 'UI-HINT-SHUTTLE';
    if (st.items.some((i) => i.x === st.player.x && i.y === st.player.y)) return 'UI-HINT-ITEM';
    return null;
  }

  private redraw(snapCam = false): void {
    const st = this.state;
    const tint = BIOME_FLOOR_TINT[st.sectorId];

    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const img = this.tileSprites[y]![x]!;
        const kind = st.tiles[y]![x]!.kind;
        if (!st.explored[y]![x]) {
          img.setTexture('t_fog');
          img.clearTint();
          img.setAlpha(1);
        } else {
          img.setTexture(this.tileKey(kind));
          if (kind === 'floor') img.setTint(tint);
          else img.clearTint();
          img.setAlpha(st.visible[y]![x] ? 1 : 0.32);
        }
      }
    }

    this.entityLayer.removeAll(true);

    for (const item of st.items) {
      if (!st.explored[item.y]![item.x]) continue;
      const quest = item.kind === 'relay_key' || item.kind === 'nav_core';
      const spr = this.add.image(
        item.x * TILE + TILE / 2,
        item.y * TILE + TILE / 2,
        quest ? 't_quest' : 't_item',
      );
      spr.setDisplaySize(TILE - 2, TILE - 2);
      spr.setAlpha(st.visible[item.y]![item.x] ? 1 : 0.35);
      this.entityLayer.add(spr);
    }

    for (const en of st.enemies) {
      if (!en.alive || !st.visible[en.y]![en.x]) continue;
      const spr = this.add.image(en.x * TILE + TILE / 2, en.y * TILE + TILE / 2, 't_enemy');
      spr.setDisplaySize(TILE - 1, TILE - 1);
      this.entityLayer.add(spr);
      const label = this.add
        .text(en.x * TILE + 3, en.y * TILE + 2, ENEMIES[en.kind].glyph, {
          fontFamily: FONT,
          fontSize: '9px',
          color: '#fff',
        })
        .setDepth(2);
      this.entityLayer.add(label);
    }

    const player = this.add.image(
      st.player.x * TILE + TILE / 2,
      st.player.y * TILE + TILE / 2,
      't_player',
    );
    player.setDisplaySize(TILE, TILE);
    this.entityLayer.add(player);

    // Camera — keep player in playfield between chrome
    const viewW = this.scale.width;
    const viewH = this.scale.height - TOP - BOTTOM;
    const targetX = st.player.x * TILE - viewW / 2 + TILE / 2;
    const targetY = st.player.y * TILE - viewH / 2;
    if (snapCam) {
      this.camX = targetX;
      this.camY = targetY;
    } else {
      this.camX += (targetX - this.camX) * 0.35;
      this.camY += (targetY - this.camY) * 0.35;
    }
    this.mapLayer.setPosition(-this.camX, -this.camY + TOP);
    this.entityLayer.setPosition(-this.camX, -this.camY + TOP);

    // Bars
    this.barsGfx.clear();
    this.drawBar(12, 28, 140, 8, st.player.hp / st.player.maxHp, 0x40c878, 0xe05050);
    this.drawBar(168, 28, 140, 8, st.player.energy / st.player.maxEnergy, 0x5ec8ff, 0xe09040);
    const stormRatio = Math.min(1, st.stormTurns / STORM_TURNS);
    this.drawBar(324, 28, 160, 8, stormRatio, 0xe0c040, 0xe05050);

    const probe = st.player.probeTurns > 0 ? `  ${lore('UI-PROBE')} ${st.player.probeTurns}` : '';
    this.hudMeta.setText(
      `${lore('UI-HP')} ${st.player.hp}/${st.player.maxHp}    ${lore('UI-ENERGY')} ${st.player.energy}/${st.player.maxEnergy}    ${lore('UI-WINDOW')} ${st.stormTurns}    ${lore('UI-ATK')} ${st.player.atk}${st.player.probeTurns > 0 ? '+2' : ''}  ${lore('UI-DEF')} ${st.player.def}${probe}`,
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
    this.objText.setText(
      st.stormTurns <= 50 ? `${objLine}\n${lore('HAZ-STORM')}` : objLine,
    );

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

    // Inventory
    const invOpen = st.ui.inventoryOpen;
    this.invBg.setVisible(invOpen);
    this.invPanel.setVisible(invOpen);
    this.invText.setVisible(invOpen);
    if (invOpen) {
      const pw = 360;
      const ph = Math.max(180, 70 + st.inventory.length * 22);
      const px = (this.scale.width - pw) / 2;
      const py = (this.scale.height - ph) / 2;
      this.invPanel.clear();
      this.invPanel.fillStyle(0x101820, 0.98);
      this.invPanel.fillRoundedRect(px, py, pw, ph, 4);
      this.invPanel.lineStyle(1, 0xe0c040, 0.55);
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

    this.lastHp = st.player.hp;
    this.lastEnergy = st.player.energy;
  }
}
