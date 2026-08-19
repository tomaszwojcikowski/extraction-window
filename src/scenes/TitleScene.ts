import Phaser from 'phaser';
import { lore } from '../data/lore';
import { FONT_DATA, FONT_DISPLAY, Theme, ThemeCss } from './theme';
import {
  addCameraAtmosphere,
  drawMenuChrome,
  drawMenuPlate,
  drawTitleWindow,
} from './atmosphere';
import { ambient, music, sfx } from '../audio';

export class TitleScene extends Phaser.Scene {
  private seed = (Date.now() % 90000) + 1000;
  private pulse!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private muteText!: Phaser.GameObjects.Text;
  private windowGfx!: Phaser.GameObjects.Graphics;
  private windowPhase = 0;
  private windowX = 0;
  private windowY = 0;
  private windowW = 0;
  private windowH = 0;

  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(Theme.groundDeep);
    const cameraAtmosphere = addCameraAtmosphere(this, 0.06);

    const bg = this.add.graphics();
    drawMenuChrome(this, bg, width, height);

    // Case serial — machined into the top rail, not a caption.
    this.add
      .text(52, 48, `${lore('UI-ORG')}  ·  SURVEY CASE 07`, {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0, 0.5);
    this.add
      .text(width - 52, 48, lore('UI-CLOCKS-LIVE'), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.tape,
      })
      .setOrigin(1, 0.5);

    // Hero aperture — the Extraction Window made literal.
    this.windowW = 540;
    this.windowH = 168;
    this.windowX = Math.round((width - this.windowW) / 2);
    this.windowY = 72;
    this.windowGfx = this.add.graphics();
    drawTitleWindow(this.windowGfx, this.windowX, this.windowY, this.windowW, this.windowH, 0);

    const winY = this.windowY;
    const winH = this.windowH;

    this.add
      .text(width / 2, winY + 38, lore('UI-TITLE'), {
        fontFamily: FONT_DISPLAY,
        fontSize: '40px',
        color: ThemeCss.inkBright,
        stroke: ThemeCss.groundDeep,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(width / 2, winY + winH - 28, lore('UI-SUBTITLE'), {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.inkDim,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(width / 2, winY + winH - 12, `${lore('LOC-VIRE7')}  ·  ${lore('UI-SURVEY-TAG')}`, {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Mission ID plate with physical chevrons.
    const plates = this.add.graphics();
    const midY = winY + winH + 28;
    const seedW = 360;
    const seedH = 52;
    const seedX = Math.round((width - seedW) / 2);
    drawMenuPlate(plates, seedX, midY, seedW, seedH, { accent: Theme.biolum });

    this.add
      .text(seedX + 22, midY + 14, '◀', {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);
    this.add
      .text(seedX + seedW - 22, midY + 14, '▶', {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    this.seedText = this.add
      .text(width / 2, midY + 14, this.seedLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '15px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, midY + 34, lore('UI-SEED-HINT'), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    // Begin — bolted action plate; lamp blink is the only soft attention.
    const beginW = 220;
    const beginH = 36;
    const beginX = Math.round((width - beginW) / 2);
    const beginY = midY + 68;
    drawMenuPlate(plates, beginX, beginY, beginW, beginH, { tape: true, accent: Theme.tape });

    this.pulse = this.add
      .text(width / 2, beginY + beginH / 2, lore('UI-PRESS-START'), {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5);

    this.time.addEvent({
      delay: 640,
      loop: true,
      callback: () => {
        if (this.pulse.active) this.pulse.setVisible(!this.pulse.visible);
      },
    });

    // Footer dossier — controls + brief on one laminated strip.
    const footW = 640;
    const footH = 78;
    const footX = Math.round((width - footW) / 2);
    const footY = height - 128;
    drawMenuPlate(plates, footX, footY, footW, footH, { accent: Theme.panelEdge });

    this.add
      .text(width / 2, footY + 22, lore('UI-CONTROLS'), {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.inkDim,
        align: 'center',
        wordWrap: { width: footW - 40 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, footY + 48, lore('UI-BRIEF-TUT'), {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.ink,
        align: 'center',
        wordWrap: { width: footW - 40 },
      })
      .setOrigin(0.5);

    this.muteText = this.add
      .text(width / 2, height - 42, this.muteLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    // Mechanical window tick — hard step, not a tweened glow.
    this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        if (!this.windowGfx?.active) return;
        this.windowPhase = (this.windowPhase + 1) % 64;
        drawTitleWindow(
          this.windowGfx,
          this.windowX,
          this.windowY,
          this.windowW,
          this.windowH,
          this.windowPhase,
        );
      },
    });

    // One pressure blink on open — kit waking up.
    this.time.delayedCall(80, () => cameraAtmosphere?.pulse(0.11, 420));

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.events.once('shutdown', () => cameraAtmosphere?.destroy());
  }

  private muteLabel(): string {
    return sfx.isMuted() ? `m — ${lore('UI-MUTE-ON')}` : `m — ${lore('UI-MUTE-OFF')}`;
  }

  private seedLabel(): string {
    return `MISSION  ${String(this.seed).padStart(5, '0')}  /  ${lore('UI-SEED')}`;
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
