import Phaser from 'phaser';
import { lore } from '../data/lore';

export class TitleScene extends Phaser.Scene {
  private seed = 42;

  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a0c10);

    this.add
      .text(width / 2, height * 0.28, lore('UI-TITLE'), {
        fontFamily: 'Courier New, monospace',
        fontSize: '28px',
        color: '#5ec8ff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.38, lore('UI-SUBTITLE'), {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#8a9bb0',
      })
      .setOrigin(0.5);

    const seedText = this.add
      .text(width / 2, height * 0.52, `${lore('UI-SEED')}: ${this.seed}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#c8d0dc',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.62, lore('UI-PRESS-START'), {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#e0c040',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.78, lore('UI-CONTROLS'), {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#5a6a7a',
        align: 'center',
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.88, '← → change seed · ENTER start', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#6a7a8a',
      })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        this.seed = (this.seed - 1 + 100000) % 100000;
        seedText.setText(`${lore('UI-SEED')}: ${this.seed}`);
      } else if (e.key === 'ArrowRight') {
        this.seed = (this.seed + 1) % 100000;
        seedText.setText(`${lore('UI-SEED')}: ${this.seed}`);
      } else if (e.key === 'Enter') {
        this.scene.start('Game', { seed: this.seed });
      }
    });
  }
}
