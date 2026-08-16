import Phaser from 'phaser';
import { lore } from '../data/lore';
import { FONT_DATA, FONT_DISPLAY, Theme, ThemeCss } from './theme';
import {
  addCameraAtmosphere,
  drawBolt,
  drawMenuChrome,
  drawPlate,
  drawStencilTicks,
} from './atmosphere';
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
    // Stencilled title window: sight brackets scratched into the case, a
    // laminated mission card, and brine beading along its lower edge.
    const surveyField = this.add.graphics();
    const cardX = width / 2 - 196;
    const cardY = height * 0.245;
    const cardW = 392;
    const cardH = height * 0.175;
    drawPlate(surveyField, cardX, cardY, cardW, cardH, { fill: Theme.panel, alpha: 0.95 });
    surveyField.fillStyle(Theme.groundDeep, 0.35);
    surveyField.fillRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12);
    surveyField.fillStyle(Theme.inkMute, 0.5);
    surveyField.fillRect(cardX + 14, cardY + cardH - 16, cardW - 28, 1);
    for (const [bx, by] of [
      [cardX + 5, cardY + 5],
      [cardX + cardW - 6, cardY + 5],
      [cardX + 5, cardY + cardH - 6],
      [cardX + cardW - 6, cardY + cardH - 6],
    ]) {
      drawBolt(surveyField, bx!, by!);
    }
    const arm = 16;
    surveyField.lineStyle(1, Theme.biolum, 0.5);
    surveyField.lineBetween(cardX - 14, cardY - 8, cardX - 14 + arm, cardY - 8);
    surveyField.lineBetween(cardX - 14, cardY - 8, cardX - 14, cardY - 8 + arm);
    surveyField.lineBetween(cardX + cardW + 14, cardY + cardH + 8, cardX + cardW + 14 - arm, cardY + cardH + 8);
    surveyField.lineBetween(cardX + cardW + 14, cardY + cardH + 8, cardX + cardW + 14, cardY + cardH + 8 - arm);
    drawStencilTicks(surveyField, cardX + 14, cardY + cardH - 13, cardW - 28, false, Theme.inkMute);
    for (let i = 0; i < 14; i++) {
      surveyField.fillStyle(Theme.biolum, 0.18 + ((i * 7) % 5) * 0.05);
      surveyField.fillRect(cardX + 18 + ((i * 53) % (cardW - 36)), cardY + cardH - 5, 1, 2);
    }

    this.add
      .text(width / 2, height * 0.2, lore('UI-ORG'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.3, lore('UI-TITLE'), {
        fontFamily: FONT_DISPLAY,
        fontSize: '36px',
        color: ThemeCss.inkBright,
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
          color: ThemeCss.inkDim,
        },
      )
      .setOrigin(0.5);

    // Scribed rule on the case face
    this.add.rectangle(width / 2, height * 0.44, 220, 1, Theme.inkMute).setOrigin(0.5);

    this.seedText = this.add
      .text(width / 2, height * 0.5, this.seedLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '16px',
        color: ThemeCss.ink,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.55, lore('UI-SEED-HINT'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    this.pulse = this.add
      .text(width / 2, height * 0.64, lore('UI-PRESS-START'), {
        fontFamily: FONT_DATA,
        fontSize: '15px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5);

    // Mechanical lamp blink — hard on/off, not a soft fade CTA.
    this.time.addEvent({
      delay: 640,
      loop: true,
      callback: () => {
        if (this.pulse.active) this.pulse.setVisible(!this.pulse.visible);
      },
    });

    this.add
      .text(width / 2, height * 0.78, lore('UI-CONTROLS'), {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.inkDim,
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.86, lore('UI-BRIEF-TUT'), {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.ink,
      })
      .setOrigin(0.5);

    this.muteText = this.add
      .text(width / 2, height * 0.92, this.muteLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
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
    return `MISSION  ${this.seed}  /  ${lore('UI-SEED')}`;
  }

  private ensureBeds(): void {
    if (sfx.isMuted()) return;
    ambient.startTitle();
    music.setMood('title');
  }

  private onKey(e: KeyboardEvent): void {
    sfx.unlock();
    music.prefetch();
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
