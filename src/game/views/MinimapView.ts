import Phaser from 'phaser';
import type { GameState } from '../../sim';
import { Theme } from '../../scenes/theme';
import { drawBolt, drawPlate } from '../../scenes/atmosphere';

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
 * Field-sketch minimap overlay — toggle with Tab.
 *
 * Rendered into a RenderTexture so it only redraws on turn ticks, not every
 * Phaser frame. The panel chrome (plate + bolts) lives on a separate Graphics
 * object that is drawn once and never cleared.
 */
export class MinimapView {
  private panel!: Phaser.GameObjects.Graphics;
  private rt!: Phaser.GameObjects.RenderTexture;
  private dot!: Phaser.GameObjects.Graphics;
  private visible = false;

  create(scene: Phaser.Scene): void {
    const sw = scene.scale.width;
    const sh = scene.scale.height;

    // Top-right corner, just below the HUD strip.
    const px = sw - PANEL_W - 4;
    const py = 4;

    // Static chrome — drawn once.
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(95);
    this.panel.setVisible(false);
    drawPlate(this.panel, px, py, PANEL_W, PANEL_H, { fill: Theme.panel, alpha: 0.93 });
    // Corner bolts.
    drawBolt(this.panel, px + 4, py + 4);
    drawBolt(this.panel, px + PANEL_W - 5, py + 4);
    drawBolt(this.panel, px + 4, py + PANEL_H - 5);
    drawBolt(this.panel, px + PANEL_W - 5, py + PANEL_H - 5);

    // Dynamic map canvas.
    this.rt = scene.add
      .renderTexture(px + PAD, py + PAD, MAP_W, MAP_H)
      .setScrollFactor(0)
      .setDepth(96)
      .setVisible(false);

    // Single reusable Graphics for pixel fills into the RT.
    this.dot = scene.add.graphics();
    this.dot.setVisible(false);
  }

  redraw(state: GameState): void {
    if (!this.visible) return;

    const { tiles, explored, visible, width, height, enemies, player } = state;

    // Scale cells to fit the 128×128 canvas, capped at CELL px per tile.
    const cellW = Math.min(CELL, Math.floor(MAP_W / width));
    const cellH = Math.min(CELL, Math.floor(MAP_H / height));
    const offX = Math.floor((MAP_W - width * cellW) / 2);
    const offY = Math.floor((MAP_H - height * cellH) / 2);

    this.rt.clear();

    // Draw unexplored background.
    this.dot.clear();
    this.dot.fillStyle(Theme.fog, 1);
    this.dot.fillRect(0, 0, MAP_W, MAP_H);
    this.rt.draw(this.dot, 0, 0);

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

        this.dot.clear();
        this.dot.fillStyle(color, isVisible ? 1 : 0.6);
        this.dot.fillRect(0, 0, cellW, cellH);
        this.rt.draw(this.dot, offX + x * cellW, offY + y * cellH);
      }
    }

    // Entity dots — drawn on top of tiles.
    // Player.
    this.dot.clear();
    this.dot.fillStyle(Theme.flag, 1);
    this.dot.fillRect(0, 0, Math.max(2, cellW), Math.max(2, cellH));
    this.rt.draw(this.dot, offX + player.x * cellW, offY + player.y * cellH);

    // Visible enemies.
    for (const enemy of enemies) {
      if (!visible[enemy.y]![enemy.x]) continue;
      this.dot.clear();
      this.dot.fillStyle(Theme.rust, 1);
      this.dot.fillRect(0, 0, Math.max(2, cellW), Math.max(2, cellH));
      this.rt.draw(this.dot, offX + enemy.x * cellW, offY + enemy.y * cellH);
    }
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.panel.setVisible(v);
    this.rt.setVisible(v);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
