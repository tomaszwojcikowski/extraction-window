import Phaser from 'phaser';
import { lore } from '../data/lore';
import { FONT_DATA, FONT_DISPLAY, Theme, ThemeCss } from './theme';
import { addCameraAtmosphere, drawMenuChrome } from './atmosphere';
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
    this.cameras.main.setBackgroundColor(Theme.groundDeep);
    const cameraAtmosphere = addCameraAtmosphere(this, 0.05);

    const bg = this.add.graphics();
    drawMenuChrome(this, bg, width, height);
    const surveyField = this.add.graphics();
    surveyField.lineStyle(1, Theme.quest, 0.18);
    surveyField.strokeCircle(width / 2, height * 0.31, 92);
    surveyField.strokeCircle(width / 2, height * 0.31, 106);
    surveyField.lineStyle(1, Theme.phosphor, 0.3);
    surveyField.lineBetween(width / 2 - 124, height * 0.31, width / 2 - 78, height * 0.31);
    surveyField.lineBetween(width / 2 + 78, height * 0.31, width / 2 + 124, height * 0.31);
    surveyField.fillStyle(Theme.ionHazard, 0.35);
    for (let i = 0; i < 8; i++) {
      const x = width / 2 - 154 + ((i * 47) % 308);
      const y = height * 0.17 + ((i * 31) % Math.max(1, height * 0.3));
      surveyField.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
    }

    this.add
      .text(width / 2, height * 0.2, lore('UI-ORG'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.phosphorMute,
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.3, lore('UI-TITLE'), {
        fontFamily: FONT_DISPLAY,
        fontSize: '36px',
        color: ThemeCss.phosphorBright,
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.38,
        `${lore('UI-SUBTITLE')} — ${lore('LOC-VIRE7')} ${lore('UI-SURVEY-TAG')}`,
        {
          fontFamily: FONT_DATA,
          fontSize: '13px',
          color: ThemeCss.phosphorDim,
        },
      )
      .setOrigin(0.5);

    // Sheet rule
    this.add.rectangle(width / 2, height * 0.44, 220, 1, Theme.phosphorMute).setOrigin(0.5);

    this.seedText = this.add
      .text(width / 2, height * 0.5, this.seedLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '16px',
        color: ThemeCss.phosphor,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.55, lore('UI-SEED-HINT'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.phosphorMute,
      })
      .setOrigin(0.5);

    this.pulse = this.add
      .text(width / 2, height * 0.64, lore('UI-PRESS-START'), {
        fontFamily: FONT_DATA,
        fontSize: '15px',
        color: ThemeCss.phosphorBright,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.pulse,
      alpha: 0.4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
      easeParams: [3],
    });

    this.add
      .text(width / 2, height * 0.78, lore('UI-CONTROLS'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.phosphorMute,
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.86, lore('UI-BRIEF-TUT'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.textMute,
      })
      .setOrigin(0.5);

    this.muteText = this.add
      .text(width / 2, height * 0.92, this.muteLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.phosphorMute,
      })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.events.once('shutdown', () => cameraAtmosphere?.destroy());
    // Do not stop music/ambient here — GameScene takes over beds.
    // Stopping on shutdown races Phaser start order and kills newly started field music.
  }

  private muteLabel(): string {
    return sfx.isMuted() ? `m — ${lore('UI-MUTE-ON')}` : `m — ${lore('UI-MUTE-OFF')}`;
  }

  private seedLabel(): string {
    return `MISSION  ${this.seed}  ·  ${lore('UI-SEED')}`;
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
