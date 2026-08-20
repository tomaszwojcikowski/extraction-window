import Phaser from 'phaser';
import { lore } from '../data/lore';
import { drawHelpOverlay } from '../game/views/overlays/HelpOverlay';
import { FONT_DATA, FONT_DISPLAY, Theme, ThemeCss } from './theme';
import {
  addCameraAtmosphere,
  drawMenuChrome,
  drawMenuPlate,
  drawTitleWindow,
  type CameraAtmosphere,
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
  private helpOpen = false;
  private audioPrimed = false;
  private scanPhase = 0;
  private cameraAtmosphere: CameraAtmosphere | null = null;

  private windowGfx!: Phaser.GameObjects.Graphics;
  private plateGfx!: Phaser.GameObjects.Graphics;
  private helpPanel!: Phaser.GameObjects.Graphics;
  private helpText!: Phaser.GameObjects.Text;

  private beginText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private muteText!: Phaser.GameObjects.Text;
  private chrome: Phaser.GameObjects.GameObject[] = [];

  private layout = computeTitleLayout(960, 640);
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.layout = computeTitleLayout(width, height);
    this.cameras.main.setBackgroundColor(Theme.groundDeep);
    this.chrome = [];
    this.cameraAtmosphere = addCameraAtmosphere(this, 0.05);

    const bg = this.add.graphics();
    drawMenuChrome(this, bg, width, height);

    this.windowGfx = this.add.graphics();
    this.plateGfx = this.add.graphics().setDepth(1);
    this.drawPlates();
    this.drawHero(width);

    this.seedText = this.add
      .text(width / 2, this.layout.seedY, this.seedLine(), {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.ink,
      })
      .setOrigin(0.5)
      .setDepth(2);
    this.chrome.push(this.seedText);

    this.beginText = this.add
      .text(width / 2, this.layout.beginY, lore('UI-PRESS-START'), {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5)
      .setDepth(2);
    this.chrome.push(this.beginText);

    this.add
      .text(width / 2, this.layout.briefY, lore('UI-BRIEF'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkDim,
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, this.layout.controlsY, lore('UI-CONTROLS-TITLE'), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5);

    this.muteText = this.add
      .text(width - 52, this.layout.footerY, this.muteLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(1, 0.5)
      .setDepth(2);
    this.chrome.push(this.muteText);

    this.add
      .text(52, this.layout.footerY, lore('UI-ORG'), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0, 0.5)
      .setDepth(2);

    this.time.addEvent({
      delay: 720,
      loop: true,
      callback: () => {
        if (!this.beginText?.active || this.helpOpen) return;
        this.beginText.setVisible(!this.beginText.visible);
      },
    });

    this.time.addEvent({
      delay: 48,
      loop: true,
      callback: () => {
        if (this.helpOpen) return;
        this.scanPhase = (this.scanPhase + 0.008) % 1;
        const { window: win } = this.layout;
        drawTitleWindow(this.windowGfx, win.x, win.y, win.w, win.h, this.scanPhase);
      },
    });

    this.input.keyboard!.on('keydown', this.keyHandler);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', this.keyHandler);
      this.cameraAtmosphere?.destroy();
      this.cameraAtmosphere = null;
    });
  }

  private drawPlates(): void {
    const { seedPlate, beginPlate } = this.layout;
    this.plateGfx.clear();
    drawMenuPlate(this.plateGfx, seedPlate.x, seedPlate.y, seedPlate.w, seedPlate.h, {
      tape: true,
      accent: Theme.tape,
    });
    drawMenuPlate(this.plateGfx, beginPlate.x, beginPlate.y, beginPlate.w, beginPlate.h, {
      accent: Theme.flag,
    });
  }

  private drawHero(width: number): void {
    const { window: win } = this.layout;
    drawTitleWindow(this.windowGfx, win.x, win.y, win.w, win.h, this.scanPhase);

    const title = this.add
      .text(width / 2, win.y + 46, lore('UI-TITLE'), {
        fontFamily: FONT_DISPLAY,
        fontSize: '36px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const tagline = this.add
      .text(width / 2, win.y + win.h - 20, lore('UI-TITLE-TAGLINE'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkDim,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.chrome.push(title, tagline);
  }

  private setChromeVisible(visible: boolean): void {
    for (const obj of this.chrome) {
      if ('setVisible' in obj && typeof obj.setVisible === 'function') {
        obj.setVisible(visible);
      }
    }
    this.windowGfx.setVisible(visible);
    this.plateGfx.setVisible(visible);
    if (visible) this.beginText.setVisible(true);
  }

  private openHelp(open: boolean): void {
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
    if (!open) {
      this.setChromeVisible(true);
      return;
    }
    const { width, height } = this.scale;
    drawHelpOverlay(this.helpPanel, this.helpText, width, height, false);
    this.setChromeVisible(false);
  }

  private seedLine(): string {
    return `${formatMissionSeed(this.seed)}  ·  ${lore('UI-SEED-HINT')}`;
  }

  private muteLabel(): string {
    return sfx.isMuted() ? `m ${lore('UI-MUTE-ON')}` : `m ${lore('UI-MUTE-OFF')}`;
  }

  private ensureBeds(): void {
    if (this.audioPrimed) return;
    this.audioPrimed = true;
    if (sfx.isMuted()) return;
    ambient.startTitle();
    music.setMood('title');
  }

  private adjustSeed(delta: number): void {
    this.seed = (this.seed + delta + 100000) % 100000;
    this.seedText.setText(this.seedLine());
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
        this.openHelp(false);
        sfx.play('ui');
      }
      return;
    }

    if (isTitleHelpKey(e)) {
      this.ensureBeds();
      this.openHelp(true);
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
      this.seedText.setText(this.seedLine());
      sfx.play('ui');
    } else if (isTitleStartKey(e)) {
      sfx.play('start');
      this.scene.start('Game', { seed: this.seed });
    }
  }
}
