import Phaser from 'phaser';
import { lore } from '../data/lore';
import { getSector } from '../data/encounters';
import { ITEMS } from '../data/items';
import { ENEMIES } from '../data/enemies';
import { applyAction, createGame, type Action, type GameState } from '../sim';
import { objectivePrompt } from '../campaign/spine';
import { TILE } from './textures';

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private mapLayer!: Phaser.GameObjects.Container;
  private entityLayer!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private invText!: Phaser.GameObjects.Text;
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private camFollow = { x: 0, y: 0 };

  constructor() {
    super('Game');
  }

  init(data: { seed?: number }): void {
    this.state = createGame(data.seed ?? 42);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0a0c10);
    this.mapLayer = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.buildMapSprites();

    this.hud = this.add
      .text(8, 6, '', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#c8d0dc',
        backgroundColor: '#0a0c10cc',
        padding: { x: 4, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.logText = this.add
      .text(8, this.scale.height - 90, '', {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#8a9bb0',
        backgroundColor: '#0a0c10cc',
        padding: { x: 4, y: 4 },
        wordWrap: { width: this.scale.width - 16 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.invText = this.add
      .text(this.scale.width - 200, 40, '', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#e0c040',
        backgroundColor: '#0a0c10ee',
        padding: { x: 6, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.redraw();
  }

  private buildMapSprites(): void {
    this.mapLayer.removeAll(true);
    this.entityLayer.removeAll(true);
    this.tileSprites = [];
    const { width, height, tiles } = this.state;
    for (let y = 0; y < height; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < width; x++) {
        const key = this.tileKey(tiles[y]![x]!.kind);
        const img = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, key);
        img.setDisplaySize(TILE, TILE);
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

    let action: Action | null = null;
    const k = e.key;

    if (k === 'Escape') action = { type: 'close_ui' };
    else if (k === 'i' || k === 'I') action = { type: 'toggle_inventory' };
    else if (k === 'u' || k === 'U') action = { type: 'use' };
    else if (k === 'g' || k === 'G') action = { type: 'get' };
    else if (k === '.' || k === 'Period') action = { type: 'wait' };
    else if (k === '>' || k === 'Period' && e.shiftKey) action = { type: 'exit' };
    else if (k === 'Enter' && e.shiftKey) action = { type: 'exit' };
    else if (k === 'ArrowUp' || k === 'w' || k === 'W') action = { type: 'move', dx: 0, dy: -1 };
    else if (k === 'ArrowDown' || k === 's' || k === 'S') action = { type: 'move', dx: 0, dy: 1 };
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') action = { type: 'move', dx: -1, dy: 0 };
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') action = { type: 'move', dx: 1, dy: 0 };
    else if (k === '=' || k === '+') action = { type: 'exit' };

    // Also bind `>` via Shift+.
    if (e.code === 'Period' && e.shiftKey) action = { type: 'exit' };

    if (!action) return;
    const prevSector = this.state.sectorIndex;
    applyAction(this.state, action);
    if (this.state.sectorIndex !== prevSector) {
      this.buildMapSprites();
    }
    this.redraw();

    if (this.state.status !== 'playing') {
      this.time.delayedCall(400, () => {
        this.scene.start('End', {
          status: this.state.status,
          loseReason: this.state.loseReason,
          seed: this.state.seed,
          turn: this.state.turn,
        });
      });
    }
  }

  private redraw(): void {
    const st = this.state;
    // Tiles + fog
    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const img = this.tileSprites[y]![x]!;
        if (!st.explored[y]![x]) {
          img.setTexture('t_fog');
          img.setAlpha(1);
        } else {
          img.setTexture(this.tileKey(st.tiles[y]![x]!.kind));
          img.setAlpha(st.visible[y]![x] ? 1 : 0.35);
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
      spr.setDisplaySize(TILE - 4, TILE - 4);
      spr.setAlpha(st.visible[item.y]![item.x] ? 1 : 0.4);
      this.entityLayer.add(spr);
    }

    for (const en of st.enemies) {
      if (!en.alive || !st.visible[en.y]![en.x]) continue;
      const spr = this.add.image(en.x * TILE + TILE / 2, en.y * TILE + TILE / 2, 't_enemy');
      spr.setDisplaySize(TILE - 2, TILE - 2);
      this.entityLayer.add(spr);
      const label = this.add
        .text(en.x * TILE + 2, en.y * TILE + 1, ENEMIES[en.kind].glyph, {
          fontFamily: 'Courier New, monospace',
          fontSize: '10px',
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
    player.setDisplaySize(TILE - 2, TILE - 2);
    this.entityLayer.add(player);

    // Camera
    const viewW = this.scale.width;
    const viewH = this.scale.height - 100;
    const tx = st.player.x * TILE - viewW / 2 + TILE / 2;
    const ty = st.player.y * TILE - viewH / 2;
    this.camFollow.x = tx;
    this.camFollow.y = ty;
    this.mapLayer.setPosition(-tx, -ty + 36);
    this.entityLayer.setPosition(-tx, -ty + 36);

    const sector = getSector(st.sectorIndex);
    const obj = lore(
      objectivePrompt({
        hasRelayKey: st.objectives.hasRelayKey,
        usedRelayKey: st.objectives.usedRelayKey,
        hasNavCore: st.objectives.hasNavCore,
        sectorId: st.sectorId,
      }),
    );

    this.hud.setText(
      [
        `${lore('UI-HP')} ${st.player.hp}/${st.player.maxHp}  ${lore('UI-ENERGY')} ${st.player.energy}/${st.player.maxEnergy}  ${lore('UI-ATK')} ${st.player.atk}${st.player.probeTurns > 0 ? '+2' : ''}  ${lore('UI-DEF')} ${st.player.def}`,
        `${lore('UI-WINDOW')} ${st.stormTurns}  ${lore('UI-SECTOR')} ${st.sectorIndex + 1}/8 ${lore(sector.loreName)}  ${lore('UI-SEED')} ${st.seed}  T${st.turn}`,
        obj,
      ].join('\n'),
    );

    const logs = st.log.slice(-5).map((l) => {
      const base = lore(l.loreId);
      return l.detail ? `${base} (${l.detail})` : base;
    });
    this.logText.setText(`${lore('UI-LOG')}\n${logs.join('\n')}`);
    this.logText.setY(this.scale.height - 20 - logs.length * 12);

    if (st.ui.inventoryOpen) {
      this.invText.setVisible(true);
      const lines = st.inventory.map((slot, i) => {
        const mark = i === st.ui.selectedSlot ? '>' : ' ';
        const name = lore(ITEMS[slot.kind].loreName);
        return `${mark} ${name} x${slot.count}`;
      });
      this.invText.setText(`${lore('UI-INV')}\n${lines.join('\n') || '(empty)'}\nu use · esc close`);
    } else {
      this.invText.setVisible(false);
    }
  }
}
