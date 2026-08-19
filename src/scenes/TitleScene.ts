import Phaser from 'phaser';
import { lore } from '../data/lore';
import { drawHelpOverlay } from '../game/views/overlays/HelpOverlay';
import { FONT_DATA, FONT_DISPLAY, Theme, ThemeCss } from './theme';
import {
  addCameraAtmosphere,
  drawMenuChrome,
  drawMenuPlate,
  drawTitleWindow,
} from './atmosphere';
import {
  computeTitleLayout,
  formatMissionSeed,
  isTitleHelpDismissKey,
  isTitleHelpKey,
  isTitleStartKey,
} from './titleLayout';
import { ambient, music, sfx } from '../audio';

export class TitleScene extends Phaser.Scene {
  private seed = (Date.now() % 90000) + 1000;
  private windowPhase = 0;
  private beginPulse = false;
  private helpOpen = false;
  private audioPrimed = false;

  private windowGfx!: Phaser.GameObjects.Graphics;
  private platesGfx!: Phaser.GameObjects.Graphics;
  private helpPanel!: Phaser.GameObjects.Graphics;
  private helpText!: Phaser.GameObjects.Text;

  private pulseText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private muteText!: Phaser.GameObjects.Text;
  private titleGroup!: Phaser.GameObjects.GameObject[];

  private layout = computeTitleLayout(960, 640);
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.layout = computeTitleLayout(width, height);
    this.cameras.main.setBackgroundColor(Theme.groundDeep);

    const cameraAtmosphere = addCameraAtmosphere(this, 0.06);
    const bg = this.add.graphics();
    drawMenuChrome(this, bg, width, height);

    this.platesGfx = this.add.graphics();
    this.windowGfx = this.add.graphics();
    this.titleGroup = [];

    this.drawChrome(width);
    this.drawHero(width);
    this.drawSeedPlate(width);
    this.drawBeginPlate();
    this.drawFooter(width);
    this.redrawPlates();

    this.muteText = this.add
      .text(width / 2, height - 36, this.muteLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);
    this.titleGroup.push(this.muteText);

    this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => this.tickWindow(),
    });
    this.time.addEvent({
      delay: 640,
      loop: true,
      callback: () => {
        if (!this.pulseText?.active || this.helpOpen) return;
        this.beginPulse = !this.beginPulse;
        this.pulseText.setVisible(this.beginPulse);
        this.redrawPlates();
      },
    });

    this.time.delayedCall(80, () => cameraAtmosphere?.pulse(0.11, 420));

    this.input.keyboard!.on('keydown', this.keyHandler);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.keyHandler);
      cameraAtmosphere?.destroy();
    });
  }

  private drawChrome(width: number): void {
    const org = this.add
      .text(52, 48, `${lore('UI-ORG')}  ·  ${lore('UI-TITLE-CASE')}`, {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0, 0.5);
    const clocks = this.add
      .text(width - 52, 48, lore('UI-CLOCKS-LIVE'), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.tape,
      })
      .setOrigin(1, 0.5);
    this.titleGroup.push(org, clocks);
  }

  private drawHero(width: number): void {
    const { window: win } = this.layout;
    drawTitleWindow(this.windowGfx, win.x, win.y, win.w, win.h, 0);

    const title = this.add
      .text(width / 2, win.y + 40, lore('UI-TITLE'), {
        fontFamily: FONT_DISPLAY,
        fontSize: '38px',
        color: ThemeCss.inkBright,
        stroke: ThemeCss.groundDeep,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const tagline = this.add
      .text(width / 2, win.y + win.h - 22, lore('UI-TITLE-TAGLINE'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkDim,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.titleGroup.push(title, tagline);
  }

  private drawSeedPlate(width: number): void {
    const { seedPlate: plate } = this.layout;

    const left = this.add
      .text(plate.x + 22, plate.y + 14, '◀', {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);
    const right = this.add
      .text(plate.x + plate.w - 22, plate.y + 14, '▶', {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    this.seedText = this.add
      .text(width / 2, plate.y + 14, this.seedLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '15px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(width / 2, plate.y + 34, lore('UI-SEED-HINT'), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    this.titleGroup.push(left, right, this.seedText, hint);
  }

  private drawBeginPlate(): void {
    const { beginPlate: plate } = this.layout;
    this.pulseText = this.add
      .text(plate.x + plate.w / 2, plate.y + plate.h / 2, lore('UI-PRESS-START'), {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5);
    this.titleGroup.push(this.pulseText);
  }

  private redrawPlates(): void {
    const { seedPlate, beginPlate, footerPlate } = this.layout;
    this.platesGfx.clear();
    drawMenuPlate(this.platesGfx, seedPlate.x, seedPlate.y, seedPlate.w, seedPlate.h, {
      accent: Theme.biolum,
    });
    drawMenuPlate(this.platesGfx, beginPlate.x, beginPlate.y, beginPlate.w, beginPlate.h, {
      tape: true,
      accent: this.beginPulse ? Theme.arc : Theme.tape,
    });
    drawMenuPlate(this.platesGfx, footerPlate.x, footerPlate.y, footerPlate.w, footerPlate.h, {
      accent: Theme.panelEdge,
    });
  }

  private drawFooter(width: number): void {
    const { footerPlate: plate } = this.layout;

    const controls = this.add
      .text(width / 2, plate.y + 20, lore('UI-CONTROLS-TITLE'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkDim,
        align: 'center',
        wordWrap: { width: plate.w - 36 },
      })
      .setOrigin(0.5);

    const brief = this.add
      .text(width / 2, plate.y + 44, lore('UI-BRIEF'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.ink,
        align: 'center',
        wordWrap: { width: plate.w - 36 },
      })
      .setOrigin(0.5);

    this.titleGroup.push(controls, brief);
  }

  private drawHelpOverlay(open: boolean): void {
    if (!this.helpPanel) {
      this.helpPanel = this.add.graphics().setDepth(20);
      this.helpText = this.add
        .text(0, 0, '', {
          fontFamily: FONT_DATA,
          fontSize: '12px',
          color: ThemeCss.ink,
        })
        .setDepth(21);
    }
    this.helpOpen = open;
    this.helpPanel.setVisible(open);
    this.helpText.setVisible(open);
    if (!open) return;

    const { width, height } = this.scale;
    drawHelpOverlay(this.helpPanel, this.helpText, width, height, false);
    this.setTitleVisible(false);
  }

  private setTitleVisible(visible: boolean): void {
    for (const obj of this.titleGroup) {
      if ('setVisible' in obj && typeof obj.setVisible === 'function') {
        obj.setVisible(visible);
      }
    }
    this.windowGfx.setVisible(visible);
    this.platesGfx.setVisible(visible);
    this.muteText.setVisible(visible);
  }

  private tickWindow(): void {
    if (!this.windowGfx?.active) return;
    const { window: win } = this.layout;
    this.windowPhase = (this.windowPhase + 1) % 64;
    drawTitleWindow(this.windowGfx, win.x, win.y, win.w, win.h, this.windowPhase);
  }

  private muteLabel(): string {
    return sfx.isMuted() ? `m — ${lore('UI-MUTE-ON')}` : `m — ${lore('UI-MUTE-OFF')}`;
  }

  private seedLabel(): string {
    return formatMissionSeed(this.seed, lore('UI-SEED'));
  }

  private flashSeed(): void {
    this.seedText.setColor(ThemeCss.biolum);
    this.time.delayedCall(120, () => {
      if (this.seedText?.active) this.seedText.setColor(ThemeCss.inkBright);
    });
  }

  private ensureBeds(): void {
    if (this.audioPrimed) return;
    this.audioPrimed = true;
    if (sfx.isMuted()) return;
    ambient.startTitle();
    music.setMood('title');
  }

  private beginSurvey(): void {
    sfx.play('start');
    this.scene.start('Game', { seed: this.seed });
  }

  private adjustSeed(delta: number): void {
    this.seed = (this.seed + delta + 100000) % 100000;
    this.seedText.setText(this.seedLabel());
    this.flashSeed();
    sfx.play('ui');
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
        this.audioPrimed = false;
      } else {
        this.ensureBeds();
      }
      return;
    }

    if (this.helpOpen) {
      if (isTitleHelpDismissKey(e)) {
        this.drawHelpOverlay(false);
        this.setTitleVisible(true);
        sfx.play('ui');
      }
      return;
    }

    if (isTitleHelpKey(e)) {
      this.ensureBeds();
      this.drawHelpOverlay(true);
      sfx.play('ui');
      return;
    }

    this.ensureBeds();

    if (e.key === 'ArrowLeft') {
      this.adjustSeed(-1);
    } else if (e.key === 'ArrowRight') {
      this.adjustSeed(1);
    } else if (e.key === 'r' || e.key === 'R') {
      this.seed = Math.floor(Math.random() * 100000);
      this.seedText.setText(this.seedLabel());
      this.flashSeed();
      sfx.play('ui');
    } else if (isTitleStartKey(e)) {
      this.beginSurvey();
    }
  }
}
