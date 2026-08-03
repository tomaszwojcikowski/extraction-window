import Phaser from 'phaser';
import { lore } from '../data/lore';
import type { LoseReason } from '../sim';

export class EndScene extends Phaser.Scene {
  private status: 'won' | 'lost' = 'lost';
  private loseReason: LoseReason = null;
  private seed = 42;
  private turn = 0;

  constructor() {
    super('End');
  }

  init(data: {
    status: 'won' | 'lost';
    loseReason: LoseReason;
    seed: number;
    turn: number;
  }): void {
    this.status = data.status;
    this.loseReason = data.loseReason;
    this.seed = data.seed;
    this.turn = data.turn;
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a0c10);

    let title = lore('UI-WIN');
    let color = '#5ec8ff';
    if (this.status === 'lost') {
      color = '#e05050';
      switch (this.loseReason) {
        case 'hp':
          title = lore('UI-LOSE-HP');
          break;
        case 'energy':
          title = lore('UI-LOSE-ENERGY');
          break;
        case 'storm':
          title = lore('UI-LOSE-STORM');
          break;
        default:
          title = lore('UI-LOSE-STUCK');
      }
    }

    this.add
      .text(width / 2, height * 0.35, title, {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color,
        align: 'center',
        wordWrap: { width: width - 60 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.5, `${lore('UI-SEED')} ${this.seed} · T${this.turn}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        color: '#8a9bb0',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.65, lore('UI-RETRY'), {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        color: '#e0c040',
      })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.scene.start('Game', { seed: (this.seed + 1) % 100000 });
      } else if (e.key === 'Escape') {
        this.scene.start('Title');
      }
    });
  }
}
