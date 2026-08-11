/** Sparse procedural music beds — biome-tinted field + combat danger + storm densify. */

import type { SectorId } from '../data/encounters';
import { audioBus } from './bus';

export type MusicMood =
  | 'title'
  | 'field'
  | 'storm'
  | 'critical'
  | 'combat'
  | 'end_win'
  | 'end_lose'
  | 'off';

const NOTES: Record<Exclude<MusicMood, 'off' | 'field'>, number[]> = {
  title: [196, 247, 294, 370],
  storm: [185, 220, 247, 311],
  critical: [208, 247, 277, 370],
  combat: [185, 196, 233, 277, 311, 370], // tense minor climb
  end_win: [262, 330, 392, 523],
  end_lose: [196, 185, 165, 131],
};

/** Biome melodic families — ambient drones stay in ambient.ts; these tint field/storm beds. */
const SECTOR_NOTES: Record<SectorId, number[]> = {
  plains: [165, 196, 220, 262], // open fifths
  flood: [147, 175, 196, 233], // wet lower
  canopy: [175, 208, 247, 294], // leafy mid
  reef: [185, 220, 262, 311], // crystal shimmer
  spire: [196, 233, 277, 330], // array shimmer
  ruin: [155, 185, 208, 247], // wreck grit
  beacon: [185, 220, 277, 330], // signal ping
  trench: [139, 165, 185, 220], // deep cut
  duct: [147, 175, 196, 233], // conduit hum
  ash: [147, 175, 208, 247], // radiogenic dust
  brine: [165, 196, 233, 277], // pulse brine
  vault: [175, 208, 262, 311], // depot chill
  fissure: [185, 208, 247, 294], // shear tension
  approach: [196, 233, 277, 330], // pad shear
  ridge: [196, 247, 294, 370], // pad approach lift
};

const STORM_TINT: Partial<Record<SectorId, number[]>> = {
  ash: [175, 208, 247, 294],
  brine: [185, 220, 262, 311],
  vault: [196, 233, 277, 330],
  fissure: [208, 247, 277, 349],
  approach: [220, 247, 294, 349],
  ridge: [220, 262, 311, 370],
};

class MusicEngine {
  private timer: number | null = null;
  private mood: MusicMood = 'off';
  private step = 0;
  private fadeGain: GainNode | null = null;
  private currentSector: SectorId = 'plains';
  private combatHold = 0;

  setMood(mood: MusicMood): void {
    if (mood === this.mood && this.timer !== null) return;
    this.stopInternal(mood === 'off' ? 0.4 : 0.2);
    this.mood = mood;
    if (mood === 'off' || audioBus.isMuted()) return;

    const ctx = audioBus.ensure();
    const startBeds = () => {
      if (this.mood !== mood || audioBus.isMuted()) return;
      if (this.timer !== null) return;

      this.fadeGain = ctx.createGain();
      this.fadeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.5);
      this.fadeGain.connect(audioBus.channel('music'));

      this.step = 0;
      const interval = this.intervalMs(mood);
      this.timer = window.setInterval(() => this.tick(), interval);
      this.tick();
      if (mood === 'combat') audioBus.duckAmbient(420);
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(startBeds);
    } else {
      startBeds();
    }
  }

  /**
   * Field sync: combat > storm critical/storm > biome-tinted field.
   * Combat uses multi-turn hysteresis so beds don’t flicker on step-away.
   */
  syncField(opts: { sectorId: SectorId; stormTurns: number; inCombat: boolean }): void {
    if (this.mood === 'title' || this.mood === 'end_win' || this.mood === 'end_lose') return;

    this.currentSector = opts.sectorId;
    if (opts.inCombat) this.combatHold = 5;
    else if (this.combatHold > 0) this.combatHold -= 1;

    if (this.combatHold > 0) {
      this.setMood('combat');
      return;
    }
    if (opts.stormTurns <= 20) this.setMood('critical');
    else if (opts.stormTurns <= 50) this.setMood('storm');
    else this.setMood('field');
  }

  /** @deprecated Prefer syncField — kept for title/end safety wrappers. */
  syncStorm(stormTurns: number): void {
    this.syncField({
      sectorId: this.currentSector,
      stormTurns,
      inCombat: false,
    });
  }

  stop(): void {
    this.combatHold = 0;
    this.setMood('off');
  }

  private intervalMs(mood: MusicMood): number {
    switch (mood) {
      case 'title':
        return 900;
      case 'field':
        return 1000;
      case 'storm':
        return 700;
      case 'critical':
        return 420;
      case 'combat':
        return 260;
      case 'end_win':
        return 400;
      case 'end_lose':
        return 700;
      default:
        return 1200;
    }
  }

  private scaleForMood(): number[] {
    if (this.mood === 'field') return SECTOR_NOTES[this.currentSector] ?? SECTOR_NOTES.plains;
    if (this.mood === 'storm') {
      return STORM_TINT[this.currentSector] ?? NOTES.storm;
    }
    if (this.mood === 'off') return NOTES.title;
    return NOTES[this.mood];
  }

  private tick(): void {
    if (this.mood === 'off' || !this.fadeGain || audioBus.isMuted()) return;
    // Sparse skips — field still mostly present
    if (this.mood === 'field' && Math.random() < 0.22) {
      this.step++;
      return;
    }
    if (this.mood === 'title' && Math.random() < 0.18) {
      this.step++;
      return;
    }

    const scale = this.scaleForMood();
    const freq = scale[this.step % scale.length]!;
    this.step++;

    const ctx = audioBus.ensure();
    if (ctx.state === 'suspended') return;
    const t0 = ctx.currentTime;

    if (this.mood === 'combat') {
      this.tickCombat(ctx, t0, freq);
      return;
    }

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = this.mood === 'critical' ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    const peak =
      this.mood === 'critical'
        ? 0.12
        : this.mood === 'storm'
          ? 0.1
          : this.mood === 'end_win' || this.mood === 'end_lose'
            ? 0.11
            : 0.09;
    const dur = this.mood === 'critical' ? 0.24 : 0.36;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.fadeGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Danger bed — dual scrape + low pulse so combat reads over biome drones. */
  private tickCombat(ctx: AudioContext, t0: number, freq: number): void {
    if (!this.fadeGain) return;
    const lead = ctx.createOscillator();
    const leadG = ctx.createGain();
    lead.type = this.step % 2 === 0 ? 'sawtooth' : 'triangle';
    lead.frequency.value = freq;
    leadG.gain.setValueAtTime(0.0001, t0);
    leadG.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
    leadG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    lead.connect(leadG);
    leadG.connect(this.fadeGain);
    lead.start(t0);
    lead.stop(t0 + 0.2);

    const fifth = ctx.createOscillator();
    const fifthG = ctx.createGain();
    fifth.type = 'triangle';
    fifth.frequency.value = freq * 1.5;
    fifthG.gain.setValueAtTime(0.0001, t0);
    fifthG.gain.exponentialRampToValueAtTime(0.07, t0 + 0.03);
    fifthG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    fifth.connect(fifthG);
    fifthG.connect(this.fadeGain);
    fifth.start(t0);
    fifth.stop(t0 + 0.18);

    // Heartbeat thud every other step.
    if (this.step % 2 === 0) {
      const thud = ctx.createOscillator();
      const thudG = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(55, t0);
      thud.frequency.exponentialRampToValueAtTime(38, t0 + 0.12);
      thudG.gain.setValueAtTime(0.0001, t0);
      thudG.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
      thudG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      thud.connect(thudG);
      thudG.connect(this.fadeGain);
      thud.start(t0);
      thud.stop(t0 + 0.16);
    }
  }

  private stopInternal(fadeSec: number): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const fade = this.fadeGain;
    this.fadeGain = null;
    if (fade) {
      const ctx = audioBus.ensure();
      const t = ctx.currentTime;
      fade.gain.cancelScheduledValues(t);
      fade.gain.setValueAtTime(fade.gain.value, t);
      fade.gain.linearRampToValueAtTime(0.0001, t + fadeSec);
      window.setTimeout(() => fade.disconnect(), (fadeSec + 0.05) * 1000);
    }
  }
}

export const music = new MusicEngine();
