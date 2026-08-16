/** Sustained pad beds — biome-tinted field pressure, not melodic pings. */

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

/** Root + cloudy interval (not bright major arpeggios). */
const ROOTS: Record<Exclude<MusicMood, 'off' | 'field'>, number[]> = {
  title: [55, 82, 98],
  storm: [49, 73, 92],
  critical: [52, 78, 104],
  combat: [46, 69, 92],
  end_win: [65, 98, 130],
  end_lose: [49, 65, 82],
};

const SECTOR_ROOTS: Record<SectorId, number[]> = {
  plains: [55, 82, 110],
  flood: [46, 69, 92],
  canopy: [58, 87, 116],
  reef: [61, 92, 123],
  spire: [65, 98, 130],
  ruin: [49, 73, 98],
  beacon: [61, 92, 138],
  trench: [41, 61, 82],
  duct: [46, 69, 92],
  ash: [44, 65, 87],
  brine: [52, 78, 104],
  vault: [55, 82, 123],
  fissure: [49, 73, 110],
  approach: [58, 87, 130],
  ridge: [61, 92, 138],
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
    this.stopInternal(mood === 'off' ? 0.4 : 0.25);
    this.mood = mood;
    if (mood === 'off' || audioBus.isMuted()) return;

    const ctx = audioBus.ensure();
    const startBeds = () => {
      if (this.mood !== mood || audioBus.isMuted()) return;
      if (this.timer !== null) return;

      this.fadeGain = ctx.createGain();
      this.fadeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.7);
      this.fadeGain.connect(audioBus.channel('music'));

      this.step = 0;
      this.timer = window.setInterval(() => this.tick(), this.intervalMs(mood));
      this.tick();
      if (mood === 'combat') audioBus.duckAmbient(420);
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(startBeds);
    } else {
      startBeds();
    }
  }

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
        return 2200;
      case 'field':
        return 2400;
      case 'storm':
        return 1600;
      case 'critical':
        return 900;
      case 'combat':
        return 320;
      case 'end_win':
        return 1800;
      case 'end_lose':
        return 2000;
      default:
        return 2400;
    }
  }

  private roots(): number[] {
    if (this.mood === 'field') return SECTOR_ROOTS[this.currentSector] ?? SECTOR_ROOTS.plains;
    if (this.mood === 'off') return ROOTS.title;
    return ROOTS[this.mood];
  }

  private tick(): void {
    if (this.mood === 'off' || !this.fadeGain || audioBus.isMuted()) return;

    const ctx = audioBus.ensure();
    if (ctx.state === 'suspended') return;
    const t0 = ctx.currentTime;
    const roots = this.roots();
    const root = roots[this.step % roots.length]!;
    this.step++;

    if (this.mood === 'combat') {
      this.tickCombat(ctx, t0, root);
      return;
    }

    // Long overlapping pads — pressure bed, not a melody.
    const dur =
      this.mood === 'critical' ? 1.1 : this.mood === 'storm' ? 1.6 : this.mood === 'end_lose' ? 2.0 : 2.2;
    const peak =
      this.mood === 'critical' ? 0.07 : this.mood === 'storm' ? 0.055 : this.mood === 'end_win' ? 0.06 : 0.045;

    this.pad(ctx, t0, { freq: root, dur, peak, filterHz: 420 });
    this.pad(ctx, t0 + 0.08, {
      freq: root * 1.498,
      dur: dur * 0.9,
      peak: peak * 0.55,
      filterHz: 520,
    });
    // Sparse cloudy dissonance on storm/critical.
    if (this.mood === 'storm' || this.mood === 'critical') {
      this.pad(ctx, t0 + 0.15, {
        freq: root * 1.26,
        dur: dur * 0.7,
        peak: peak * 0.35,
        filterHz: 380,
      });
    }
    // Soft air layer so it doesn’t read as pure sine tone.
    if (this.step % 2 === 0) {
      this.air(ctx, t0, {
        dur: dur * 0.6,
        vol: peak * 0.5,
        bp: 500 + (this.step % 3) * 200,
      });
    }
  }

  private pad(
    ctx: AudioContext,
    t0: number,
    opts: { freq: number; dur: number; peak: number; filterHz: number },
  ): void {
    if (!this.fadeGain) return;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = opts.freq;
    // Tiny detune wobble via LFO on a second voice would be heavier; slight freq drift:
    osc.frequency.linearRampToValueAtTime(opts.freq * 1.01, t0 + opts.dur);
    lp.type = 'lowpass';
    lp.frequency.value = opts.filterHz;
    lp.Q.value = 0.6;
    const attack = Math.min(0.35, opts.dur * 0.3);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(opts.peak, 0.0002), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.fadeGain);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  private air(
    ctx: AudioContext,
    t0: number,
    opts: { dur: number; vol: number; bp: number },
  ): void {
    if (!this.fadeGain) return;
    const len = Math.floor(ctx.sampleRate * Math.min(opts.dur + 0.1, 2.5));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = opts.bp;
    bp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(opts.vol, 0.0002), t0 + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.fadeGain);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.05);
  }

  /** Combat: rhythmic thuds + grit, not sawtooth melody. */
  private tickCombat(ctx: AudioContext, t0: number, root: number): void {
    if (!this.fadeGain) return;

    const thud = ctx.createOscillator();
    const thudG = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(root, t0);
    thud.frequency.exponentialRampToValueAtTime(Math.max(30, root * 0.7), t0 + 0.14);
    lp.type = 'lowpass';
    lp.frequency.value = 160;
    thudG.gain.setValueAtTime(0.0001, t0);
    thudG.gain.exponentialRampToValueAtTime(0.16, t0 + 0.01);
    thudG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
    thud.connect(lp);
    lp.connect(thudG);
    thudG.connect(this.fadeGain);
    thud.start(t0);
    thud.stop(t0 + 0.17);

    // Grit scrape every step.
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(400 + (this.step % 3) * 180, t0);
    bp.frequency.linearRampToValueAtTime(250, t0 + 0.1);
    bp.Q.value = 1.2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.exponentialRampToValueAtTime(0.07, t0 + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(this.fadeGain);
    src.start(t0);
    src.stop(t0 + 0.12);
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
