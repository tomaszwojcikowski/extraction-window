import Phaser from 'phaser';
import type { GameState } from '../../sim';
import { Theme } from '../../scenes/theme';
import { drawBolt, drawPlate } from '../../scenes/atmosphere';
import { HUD_TOP } from '../GameHost';

/** Map cell size in pixels on the minimap. */
const CELL = 2;
/** Inner map canvas size. Supports maps up to 64×64. */
const MAP_W = 128;
const MAP_H = 128;
/** Outer panel padding around the map canvas. */
const PAD = 8;
/** Total panel size including padding and bolt clearance. */
const PANEL_W = MAP_W + PAD * 2;
const PANEL_H = MAP_H + PAD * 2;

/**
 * Field-sketch minimap overlay — toggle with `n`.
 *
 * Drawn with a dedicated Graphics layer so it stays cheap and easy to tint.
 */
export class MinimapView {
  private panel!: Phaser.GameObjects.Graphics;
  private mapGfx!: Phaser.GameObjects.Graphics;
  private visible = false;
  private panelX = 0;
  private panelY = 0;

  create(scene: Phaser.Scene): void {
    const sw = scene.scale.width;

    // Top-right corner, just below the HUD strip.
    const px = sw - PANEL_W - 4;
    const py = HUD_TOP + 6;
    this.panelX = px;
    this.panelY = py;

    // Static chrome — drawn once.
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(95);
    this.panel.setVisible(false);
    drawPlate(this.panel, px, py, PANEL_W, PANEL_H, { fill: Theme.panel, alpha: 0.72 });
    // Corner bolts.
    drawBolt(this.panel, px + 4, py + 4);
    drawBolt(this.panel, px + PANEL_W - 5, py + 4);
    drawBolt(this.panel, px + 4, py + PANEL_H - 5);
    drawBolt(this.panel, px + PANEL_W - 5, py + PANEL_H - 5);

    this.mapGfx = scene.add.graphics().setScrollFactor(0).setDepth(96).setVisible(false).setAlpha(0.82);
  }

  redraw(state: GameState): void {
    if (!this.visible) return;

    const { tiles, explored, visible, width, height, enemies, player } = state;

    // Scale cells to fit the 128×128 canvas, capped at CELL px per tile.
    const cellW = Math.min(CELL, Math.floor(MAP_W / width));
    const cellH = Math.min(CELL, Math.floor(MAP_H / height));
    const offX = Math.floor((MAP_W - width * cellW) / 2);
    const offY = Math.floor((MAP_H - height * cellH) / 2);

    this.mapGfx.clear();
    const mapX = this.panelX + PAD;
    const mapY = this.panelY + PAD;
    this.mapGfx.fillStyle(Theme.fog, 0.72);
    this.mapGfx.fillRect(mapX, mapY, MAP_W, MAP_H);

    // Tile layer — explored cells.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!explored[y]![x]) continue;
        const kind = tiles[y]![x]!.kind;
        const isVisible = visible[y]![x];
        let color: number;

        if (kind === 'wall' || kind === 'sealed') {
          color = isVisible ? Theme.panelEdge : Theme.memory;
        } else if (kind === 'exit' || kind === 'beacon' || kind === 'shuttle') {
          color = Theme.tape;
        } else if (kind === 'brine_pool' || kind === 'vent' || kind === 'hazard') {
          color = isVisible ? Theme.arc : Theme.memory;
        } else {
          color = isVisible ? Theme.inkDim : Theme.memory;
        }

        this.mapGfx.fillStyle(color, isVisible ? 1 : 0.6);
        this.mapGfx.fillRect(mapX + offX + x * cellW, mapY + offY + y * cellH, cellW, cellH);
      }
    }

    // Entity dots — drawn on top of tiles.
    // Player.
    this.mapGfx.fillStyle(Theme.flag, 1);
    this.mapGfx.fillRect(
      mapX + offX + player.x * cellW,
      mapY + offY + player.y * cellH,
      Math.max(2, cellW),
      Math.max(2, cellH),
    );

    // Visible enemies.
    for (const enemy of enemies) {
      if (!visible[enemy.y]![enemy.x]) continue;
      this.mapGfx.fillStyle(Theme.rust, 1);
      this.mapGfx.fillRect(
        mapX + offX + enemy.x * cellW,
        mapY + offY + enemy.y * cellH,
        Math.max(2, cellW),
        Math.max(2, cellH),
      );
    }

    if (state.mapperPing) {
      const { x, y } = state.mapperPing;
      if (explored[y]?.[x]) {
        this.mapGfx.lineStyle(1, Theme.tape, 1);
        const px = mapX + offX + x * cellW;
        const py = mapY + offY + y * cellH;
        this.mapGfx.strokeRect(px - 1, py - 1, Math.max(3, cellW + 2), Math.max(3, cellH + 2));
      }
    }
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.panel.setVisible(v);
    this.mapGfx.setVisible(v);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
