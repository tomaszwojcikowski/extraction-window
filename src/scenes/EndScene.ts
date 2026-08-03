import Phaser from 'phaser';
import { lore, type LoreId } from '../data/lore';
import type { LoseReason } from '../sim';
import { FONT_DATA, FONT_DISPLAY, Theme, ThemeCss } from './theme';
import { drawMenuChrome } from './atmosphere';
import { ambient, music, sfx } from '../audio';
import { SKILLS, type SkillId } from '../data/progression';

export class EndScene extends Phaser.Scene {
  private status: 'won' | 'lost' = 'lost';
  private loseReason: LoseReason = null;
  private seed = 42;
  private turn = 0;
  private level = 1;
  private skills: SkillId[] = [];
  private objective = '';

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
  }): void {
    this.status = data.status;
    this.loseReason = data.loseReason;
    this.seed = data.seed;
    this.turn = data.turn;
    this.level = data.level ?? 1;
    this.skills = data.skills ?? [];
    this.objective = data.objective ?? '';
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(Theme.groundDeep);

    const won = this.status === 'won';
    let titleId: LoreId = 'UI-WIN';
    let bodyId: LoreId = 'UI-WIN-BODY';
    let accent: number = Theme.phosphor;
    let titleColor: string = ThemeCss.phosphorBright;

    if (!won) {
      accent = Theme.danger;
      titleColor = '#c87060';
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
    drawMenuChrome(this, g, width, height, accent);

    this.add
      .text(width / 2, height * 0.2, lore('UI-MISSION-STATUS'), {
        fontFamily: FONT_DATA,
        fontSize: '11px',
        color: ThemeCss.phosphorMute,
        letterSpacing: 4,
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
        color: ThemeCss.phosphorDim,
        align: 'center',
        wordWrap: { width: width - 180 },
      })
      .setOrigin(0.5);

    const skillNames = this.skills
      .map((id) => lore(SKILLS[id].loreName))
      .join(', ');
    const summary = [
      this.objective ? `OBJ  ${this.objective}` : null,
      `LVL  ${this.level}${skillNames ? `  ·  ${skillNames}` : ''}`,
      `SHEET ${this.seed}   ·   turn ${this.turn}`,
    ]
      .filter(Boolean)
      .join('\n');

    this.add
      .text(width / 2, height * 0.54, summary, {
        fontFamily: FONT_DATA,
        fontSize: '12px',
        color: ThemeCss.phosphorMute,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const retry = this.add
      .text(width / 2, height * 0.72, lore('UI-RETRY'), {
        fontFamily: FONT_DATA,
        fontSize: '14px',
        color: ThemeCss.phosphorBright,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: retry,
      alpha: 0.35,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
      easeParams: [2],
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
