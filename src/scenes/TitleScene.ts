import Phaser from 'phaser';
import { lore } from '../data/lore';
import { FONT } from './textures';
import { ambient, music, sfx } from '../audio';

export class TitleScene extends Phaser.Scene {
  private seed = (Date.now() % 90000) + 1000;
  private pulse!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private muteText!: Phaser.GameObjects.Text;

  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x07090e);

    // Atmosphere — layered panels
    const bg = this.add.graphics();
    bg.fillStyle(0x0c121c, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x101820, 1);
    bg.fillRect(40, 48, width - 80, height - 96);
    bg.lineStyle(1, 0x2a3a4a, 1);
    bg.strokeRect(40.5, 48.5, width - 81, height - 97);
    bg.lineStyle(1, 0x5ec8ff, 0.35);
    bg.strokeRect(48.5, 56.5, width - 97, height - 113);

    // Scanline accent
    for (let y = 60; y < height - 60; y += 4) {
      bg.fillStyle(0x5ec8ff, 0.015);
      bg.fillRect(50, y, width - 100, 1);
    }

    this.add
      .text(width / 2, height * 0.22, lore('UI-ORG'), {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#5a7a90',
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.3, lore('UI-TITLE'), {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#5ec8ff',
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.38,
        `${lore('UI-SUBTITLE')} — ${lore('LOC-VIRE7')} ${lore('UI-SURVEY-TAG')}`,
        {
          fontFamily: FONT,
          fontSize: '13px',
          color: '#8a9bb0',
        },
      )
      .setOrigin(0.5);

    this.add
      .rectangle(width / 2, height * 0.44, 180, 1, 0x2a4a5a)
      .setOrigin(0.5);

    this.seedText = this.add
      .text(width / 2, height * 0.5, this.seedLabel(), {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#c8d0dc',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.55, lore('UI-SEED-HINT'), {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#5a6a7a',
      })
      .setOrigin(0.5);

    this.pulse = this.add
      .text(width / 2, height * 0.64, lore('UI-PRESS-START'), {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#e0c040',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.pulse,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(width / 2, height * 0.78, lore('UI-CONTROLS'), {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#4a5a6a',
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.86, lore('UI-BRIEF'), {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#3a5060',
      })
      .setOrigin(0.5);

    this.muteText = this.add
      .text(width / 2, height * 0.92, this.muteLabel(), {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#4a5a6a',
      })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.events.once('shutdown', () => {
      ambient.stop();
      music.stop();
    });
  }

  private muteLabel(): string {
    return sfx.isMuted() ? `m — ${lore('UI-MUTE-ON')}` : `m — ${lore('UI-MUTE-OFF')}`;
  }

  private seedLabel(): string {
    return `${lore('UI-SEED')}  ${this.seed}`;
  }

  private ensureBeds(): void {
    if (sfx.isMuted()) return;
    ambient.startTitle();
    music.setMood('title');
  }

  private onKey(e: KeyboardEvent): void {
    sfx.unlock();
    if (e.key === 'm' || e.key === 'M') {
      sfx.toggleMute();
      this.muteText.setText(this.muteLabel());
      if (sfx.isMuted()) {
        ambient.stop();
        music.stop();
      } else {
        this.ensureBeds();
      }
      return;
    }
    this.ensureBeds();
    if (e.key === 'ArrowLeft') {
      this.seed = (this.seed - 1 + 100000) % 100000;
      this.seedText.setText(this.seedLabel());
      sfx.play('ui');
    } else if (e.key === 'ArrowRight') {
      this.seed = (this.seed + 1) % 100000;
      this.seedText.setText(this.seedLabel());
      sfx.play('ui');
    } else if (e.key === 'r' || e.key === 'R') {
      this.seed = Math.floor(Math.random() * 100000);
      this.seedText.setText(this.seedLabel());
      sfx.play('ui');
    } else if (e.key === 'Enter') {
      sfx.play('start');
      this.scene.start('Game', { seed: this.seed });
    }
  }
}
