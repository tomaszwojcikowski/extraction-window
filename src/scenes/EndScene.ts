import Phaser from 'phaser';
import { lore, type LoreId } from '../data/lore';
import type { LoseReason } from '../sim';
import { FONT } from './textures';
import { ambient, music, sfx } from '../audio';

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
    this.cameras.main.setBackgroundColor(0x07090e);

    const won = this.status === 'won';
    let titleId: LoreId = 'UI-WIN';
    let bodyId: LoreId = 'UI-WIN-BODY';
    let accent = 0x5ec8ff;
    let titleColor = '#5ec8ff';

    if (!won) {
      accent = 0xe05050;
      titleColor = '#e07070';
      switch (this.loseReason) {
        case 'hp':
          titleId = 'UI-LOSE-HP';
          bodyId = 'UI-LOSE-HP-BODY';
          break;
        case 'energy':
          titleId = 'UI-LOSE-ENERGY';
          bodyId = 'UI-LOSE-ENERGY-BODY';
          break;
        case 'storm':
          titleId = 'UI-LOSE-STORM';
          bodyId = 'UI-LOSE-STORM-BODY';
          break;
        default:
          titleId = 'UI-LOSE-STUCK';
          bodyId = 'UI-LOSE-STUCK-BODY';
      }
    }

    const g = this.add.graphics();
    g.fillStyle(0x0c121c, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x101820, 1);
    g.fillRect(60, 70, width - 120, height - 140);
    g.lineStyle(1, accent, 0.55);
    g.strokeRect(60.5, 70.5, width - 121, height - 141);

    this.add
      .text(width / 2, height * 0.28, lore('UI-MISSION-STATUS'), {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#5a7a90',
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    const title = this.add
      .text(width / 2, height * 0.38, lore(titleId), {
        fontFamily: FONT,
        fontSize: '24px',
        color: titleColor,
        align: 'center',
        wordWrap: { width: width - 160 },
      })
      .setOrigin(0.5);

    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 400 });

    this.add
      .text(width / 2, height * 0.48, lore(bodyId), {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#8a9bb0',
        align: 'center',
        wordWrap: { width: width - 180 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.58, `${lore('UI-SEED')} ${this.seed}   ·   turn ${this.turn}`, {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#5a6a7a',
      })
      .setOrigin(0.5);

    const retry = this.add
      .text(width / 2, height * 0.7, lore('UI-RETRY'), {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#e0c040',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: retry,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    sfx.unlock();
    ambient.stop();
    music.setMood(won ? 'end_win' : 'end_lose');
    sfx.play(won ? 'win' : 'lose');

    this.events.once('shutdown', () => {
      music.stop();
    });

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      if (e.key === 'm' || e.key === 'M') {
        sfx.toggleMute();
        if (sfx.isMuted()) music.stop();
        else music.setMood(won ? 'end_win' : 'end_lose');
        return;
      }
      if (e.key === 'Enter') {
        sfx.play('start');
        this.scene.start('Game', { seed: (this.seed + 1) % 100000 });
      } else if (e.key === 'Escape') {
        sfx.play('ui');
        this.scene.start('Title');
      }
    });
  }
}
