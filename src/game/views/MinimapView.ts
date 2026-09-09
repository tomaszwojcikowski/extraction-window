import Phaser from 'phaser';
import type { GameState } from '../../sim';
import { Theme } from '../../scenes/theme';
import { drawBolt, drawMenuPlate, drawTapeStrip } from '../../scenes/atmosphere';
import { HUD_TOP } from '../GameHost';
import {
  MINIMAP_MAP,
  minimapCellMetrics,
  minimapGoalPos,
  minimapSketch,
} from '../presenters/MinimapContent';

export { minimapGoalPos };

/** Inner map canvas padding; tape strip sits above. */
const PAD = 10;
/** Extra top for kit tape. */
const TAPE_H = 8;
/** Total panel size including padding and bolt clearance. */
const PANEL_W = MINIMAP_MAP + PAD * 2;
const PANEL_H = MINIMAP_MAP + PAD * 2 + TAPE_H;

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

    // Static chrome — bolted kit plate + hazard tape.
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(95);
    this.panel.setVisible(false);
    drawMenuPlate(this.panel, px, py, PANEL_W, PANEL_H, { accent: Theme.tape });
    drawTapeStrip(this.panel, px + 8, py + 5, Math.min(56, PANEL_W - 16), 5, Theme.tape, 0.8);
    drawBolt(this.panel, px + 4, py + 4);
    drawBolt(this.panel, px + PANEL_W - 5, py + 4);
    drawBolt(this.panel, px + 4, py + PANEL_H - 5);
    drawBolt(this.panel, px + PANEL_W - 5, py + PANEL_H - 5);

    this.mapGfx = scene.add.graphics().setScrollFactor(0).setDepth(96).setVisible(false).setAlpha(0.82);
  }

  redraw(state: GameState): void {
    if (!this.visible) return;

    const sketch = minimapSketch(state);
    const { cellW, cellH, offX, offY } = minimapCellMetrics(sketch.width, sketch.height);
    const mapX = this.panelX + PAD;
    const mapY = this.panelY + PAD + TAPE_H;

    this.mapGfx.clear();
    this.mapGfx.fillStyle(Theme.fog, 0.72);
    this.mapGfx.fillRect(mapX, mapY, MINIMAP_MAP, MINIMAP_MAP);

    for (const cell of sketch.cells) {
      this.mapGfx.fillStyle(cell.color, cell.alpha);
      this.mapGfx.fillRect(
        mapX + offX + cell.x * cellW,
        mapY + offY + cell.y * cellH,
        cellW,
        cellH,
      );
    }

    for (const pip of sketch.pips) {
      this.mapGfx.fillStyle(pip.color, pip.alpha);
      this.mapGfx.fillRect(
        mapX + offX + pip.x * cellW,
        mapY + offY + pip.y * cellH,
        Math.max(2, cellW),
        Math.max(2, cellH),
      );
    }

    for (const ring of sketch.rings) {
      this.mapGfx.lineStyle(1, ring.color, 1);
      const px = mapX + offX + ring.x * cellW;
      const py = mapY + offY + ring.y * cellH;
      this.mapGfx.strokeRect(px - 1, py - 1, Math.max(3, cellW + 2), Math.max(3, cellH + 2));
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
