import Phaser from 'phaser';
import { lore, type LoreId } from '../data/lore';
import type { LoseReason } from '../sim';
import { FONT_DATA, FONT_DISPLAY, Theme, ThemeCss } from './theme';
import {
  addCameraAtmosphere,
  drawBolt,
  drawMenuChrome,
  drawMenuPlate,
  drawPlate,
  drawTapeStrip,
} from './atmosphere';
import { ambient, music, sfx } from '../audio';
import { SKILLS, type SkillId } from '../data/progression';
import { shortEquipName, type ItemKind } from '../data/items';

export class EndScene extends Phaser.Scene {
  private status: 'won' | 'lost' = 'lost';
  private loseReason: LoseReason = null;
  private seed = 42;
  private turn = 0;
  private level = 1;
  private skills: SkillId[] = [];
  private objective = '';
  private loadout: ItemKind[] = [];
  private muteText!: Phaser.GameObjects.Text;
  private won = false;

  constructor() {
    super('End');
  }

  init(data: {
    status: 'won' | 'lost';
    loseReason: LoseReason;
    seed: number;
    turn: number;
    level?: number;
    skills?: SkillId[];
    objective?: string;
    loadout?: ItemKind[];
  }): void {
    this.status = data.status;
    this.loseReason = data.loseReason;
    this.seed = data.seed;
    this.turn = data.turn;
    this.level = data.level ?? 1;
    this.skills = data.skills ?? [];
    this.objective = data.objective ?? '';
    this.loadout = data.loadout ?? [];
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(Theme.groundDeep);

    const won = this.status === 'won';
    this.won = won;
    let titleId: LoreId = 'UI-WIN';
    let bodyId: LoreId = 'UI-WIN-BODY';
    let accent: number = Theme.safe;
    let titleColor: string = ThemeCss.inkBright;

    if (!won) {
      accent = Theme.rust;
      titleColor = ThemeCss.rust;
      switch (this.loseReason) {
        case 'hp':
          titleId = 'UI-LOSE-HP';
          bodyId = 'UI-LOSE-HP-BODY';
          break;
        case 'energy':
          titleId = 'UI-LOSE-ENERGY';
          bodyId = 'UI-LOSE-ENERGY-BODY';
          break;
        default:
          titleId = 'UI-LOSE-STUCK';
          bodyId = 'UI-LOSE-STUCK-BODY';
      }
    }

    const cameraAtmosphere = addCameraAtmosphere(this, won ? 0.045 : 0.08);
    const g = this.add.graphics();
    drawMenuChrome(this, g, width, height, accent);
    // Verdict stamped onto a recovered mission card, not a sensor readout.
    const statusField = this.add.graphics();
    const cardX = width / 2 - 172;
    const cardY = height * 0.24;
    const cardW = 344;
    const cardH = height * 0.15;
    drawPlate(statusField, cardX, cardY, cardW, cardH, { fill: Theme.ground, alpha: 0.9 });
    if (won) {
      statusField.fillStyle(accent, 0.85);
      statusField.fillRect(cardX + 10, cardY + 8, 4, cardH - 16);
    } else {
      drawTapeStrip(statusField, cardX + 8, cardY + 8, cardW - 16, 8, accent, 0.7);
    }
    for (const [bx, by] of [
      [cardX + 5, cardY + 5],
      [cardX + cardW - 6, cardY + 5],
      [cardX + 5, cardY + cardH - 6],
      [cardX + cardW - 6, cardY + cardH - 6],
    ]) {
      drawBolt(statusField, bx!, by!);
    }
    statusField.fillStyle(won ? Theme.safe : Theme.rust, 0.55);
    statusField.fillRect(width / 2 - 54, cardY + cardH - 12, 108, 2);

    this.add
      .text(width / 2, height * 0.2, lore('UI-MISSION-STATUS'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    const title = this.add
      .text(width / 2, height * 0.3, lore(titleId), {
        fontFamily: FONT_DISPLAY,
        fontSize: '26px',
        color: titleColor,
        align: 'center',
        wordWrap: { width: width - 160 },
      })
      .setOrigin(0.5);

    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 280 });

    this.add
      .text(width / 2, height * 0.4, lore(bodyId), {
        fontFamily: FONT_DATA,
        fontSize: '13px',
        color: ThemeCss.inkDim,
        align: 'center',
        wordWrap: { width: width - 180 },
      })
      .setOrigin(0.5);

    const skillNames = this.skills
      .map((id) => lore(SKILLS[id].loreName))
      .join(', ');
    const worn =
      this.loadout.length > 0
        ? this.loadout.map((k) => shortEquipName(k)).join(' · ')
        : null;
    const summary = [
      this.objective ? `OBJ  ${this.objective}` : null,
      `LVL  ${this.level}${skillNames ? `  /  ${skillNames}` : ''}`,
      worn ? `KIT  ${worn}` : null,
      `MISSION ${this.seed}   /   turn ${this.turn}`,
    ]
      .filter(Boolean)
      .join('\n');

    const summaryY = height * 0.54;
    const kitPlate = this.add.graphics();
    drawMenuPlate(kitPlate, width / 2 - 168, summaryY - 36, 336, 88, {
      tape: true,
      accent,
    });

    this.add
      .text(width / 2, summaryY, summary, {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.inkMute,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const ctaY = height * 0.72;
    const ctaGfx = this.add.graphics();
    drawMenuPlate(ctaGfx, width / 2 - 140, ctaY - 14, 280, 28, { accent: Theme.flag });
    const retry = this.add
      .text(width / 2, ctaY, lore('UI-RETRY'), {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.inkBright,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(width / 2, ctaY + 28, 'Esc · title', {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0.5);

    this.muteText = this.add
      .text(width - 52, height - 28, this.muteLabel(), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(1, 0.5);
    this.add
      .text(52, height - 28, lore('UI-ORG'), {
        fontFamily: FONT_DATA,
        fontSize: '10px',
        color: ThemeCss.inkMute,
      })
      .setOrigin(0, 0.5);

    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        if (retry.active) retry.setVisible(!retry.visible);
      },
    });

    sfx.unlock();
    ambient.stop();
    music.setMood(won ? 'end_win' : 'end_lose');
    sfx.play(won ? 'win' : 'lose');

    this.events.once('shutdown', () => {
      music.stop();
      cameraAtmosphere?.destroy();
    });

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      sfx.unlock();
      if (e.key === 'm' || e.key === 'M') {
        sfx.toggleMute();
        this.muteText.setText(this.muteLabel());
        if (sfx.isMuted()) music.stop();
        else music.setMood(this.won ? 'end_win' : 'end_lose');
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

  private muteLabel(): string {
    return sfx.isMuted() ? `m ${lore('UI-MUTE-ON')}` : `m ${lore('UI-MUTE-OFF')}`;
  }
}
