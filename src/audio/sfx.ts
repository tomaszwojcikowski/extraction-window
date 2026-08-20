/** Field-gear SFX — noise, sub thuds, and filter sweeps. No melodic arpeggios. */

import { audioBus } from './bus';

export type SfxId =
  | 'ui'
  | 'move'
  | 'blocked'
  | 'hit'
  | 'kill'
  | 'hurt'
  | 'pickup'
  | 'quest'
  | 'use'
  | 'sector'
  | 'beacon'
  | 'warn'
  | 'win'
  | 'lose'
  | 'start'
  | 'armor'
  | 'level'
  | 'extract'
  | 'notice'
  | 'enemy'
  | 'scuttle'
  | 'telegraph_beam'
  | 'telegraph_hold'
  | 'telegraph_charge'
  | 'telegraph_pulse'
  | 'enemy_beam'
  | 'enemy_pulse'
  | 'player_beam'
  | 'shear'
  | 'shear_breach';

const COMBAT: SfxId[] = [
  'hit',
  'kill',
  'hurt',
  'warn',
  'armor',
  'notice',
  'enemy',
  'scuttle',
  'telegraph_beam',
  'telegraph_hold',
  'telegraph_charge',
  'telegraph_pulse',
  'enemy_beam',
  'enemy_pulse',
  'player_beam',
];

/** Band-limited noise reads quiet — multiply before bus gain. */
const VOICE = 3.2;

class SfxBus {
  private noiseBuf: AudioBuffer | null = null;

  isMuted(): boolean {
    return audioBus.isMuted();
  }

  toggleMute(): boolean {
    return audioBus.toggleMute();
  }

  unlock(): void {
    audioBus.unlock();
  }

  play(id: SfxId): void {
    if (audioBus.isMuted()) return;
    const ctx = audioBus.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
    if (COMBAT.includes(id)) audioBus.duckAmbient();
    // Beds bury noise one-shots — always clear a pocket for SFX.
    audioBus.duckMusic(id === 'ui' || id === 'move' || id === 'scuttle' ? 140 : 280);
    this.render(ctx, id);
  }

  private render(ctx: AudioContext, id: SfxId): void {
    const t = ctx.currentTime;
    switch (id) {
      case 'ui':
        // Soft plastic/pad tap — noise only.
        this.noiseBurst(ctx, t, { dur: 0.028, vol: 0.07, bp: 1800, Q: 1.2, attack: 0.002 });
        break;
      case 'move':
        // Boot grit on metal deck.
        this.noiseBurst(ctx, t, { dur: 0.04, vol: 0.08, bp: 380, Q: 0.7, attack: 0.002 });
        this.sub(ctx, t, { freq: 55, dur: 0.045, vol: 0.06, slide: -12 });
        break;
      case 'blocked':
        this.noiseBurst(ctx, t, { dur: 0.07, vol: 0.1, bp: 220, Q: 0.6, attack: 0.003 });
        this.sub(ctx, t, { freq: 70, dur: 0.08, vol: 0.08, slide: -20 });
        break;
      case 'hit':
        // Kinetic strike: transient grit → body thud.
        this.noiseBurst(ctx, t, { dur: 0.05, vol: 0.16, bp: 1100, Q: 1.4, attack: 0.001 });
        this.noiseBurst(ctx, t + 0.015, { dur: 0.08, vol: 0.08, bp: 450, Q: 0.8, attack: 0.005 });
        this.sub(ctx, t, { freq: 75, dur: 0.1, vol: 0.12, slide: -30 });
        break;
      case 'kill':
        this.noiseBurst(ctx, t, { dur: 0.06, vol: 0.15, bp: 900, Q: 1.1, attack: 0.001 });
        this.noiseBurst(ctx, t + 0.04, { dur: 0.14, vol: 0.09, bp: 280, Q: 0.5, attack: 0.02 });
        this.sub(ctx, t + 0.02, { freq: 60, dur: 0.18, vol: 0.14, slide: -25 });
        // Soft air release — not a victory chirp.
        this.noiseBurst(ctx, t + 0.08, { dur: 0.16, vol: 0.05, bp: 1600, Q: 0.4, attack: 0.04 });
        break;
      case 'hurt':
        this.noiseBurst(ctx, t, { dur: 0.1, vol: 0.14, bp: 700, Q: 0.9, attack: 0.003, sweep: -400 });
        this.sub(ctx, t + 0.02, { freq: 90, dur: 0.16, vol: 0.13, slide: -40 });
        this.noiseBurst(ctx, t + 0.06, { dur: 0.12, vol: 0.07, bp: 300, Q: 0.6, attack: 0.02 });
        break;
      case 'pickup':
        // Salvage latch — metallic scrape, not a chime.
        this.noiseBurst(ctx, t, { dur: 0.05, vol: 0.09, bp: 2400, Q: 2.2, attack: 0.002 });
        this.noiseBurst(ctx, t + 0.03, { dur: 0.08, vol: 0.06, bp: 900, Q: 1.2, attack: 0.01, sweep: -500 });
        this.sub(ctx, t + 0.02, { freq: 110, dur: 0.07, vol: 0.05, slide: -15 });
        break;
      case 'use':
        this.noiseBurst(ctx, t, { dur: 0.045, vol: 0.08, bp: 1400, Q: 1.5, attack: 0.003 });
        this.noiseBurst(ctx, t + 0.035, { dur: 0.07, vol: 0.05, bp: 600, Q: 0.9, attack: 0.01 });
        break;
      case 'quest':
        // Flagging stamp — short hiss + low confirm, no scale climb.
        this.noiseBurst(ctx, t, { dur: 0.06, vol: 0.1, bp: 2000, Q: 1.8, attack: 0.004 });
        this.noiseBurst(ctx, t + 0.05, { dur: 0.12, vol: 0.07, bp: 500, Q: 0.7, attack: 0.02, sweep: 200 });
        this.sub(ctx, t + 0.04, { freq: 98, dur: 0.14, vol: 0.07, slide: 8 });
        break;
      case 'sector':
        // Shear peel — rising band-limited wash.
        this.noiseBurst(ctx, t, {
          dur: 0.28,
          vol: 0.1,
          bp: 200,
          Q: 0.5,
          attack: 0.04,
          sweep: 900,
        });
        this.sub(ctx, t + 0.05, { freq: 50, dur: 0.22, vol: 0.08, slide: 20 });
        break;
      case 'shear':
        // One-line pressure escalate — short band wash, not a chord.
        this.noiseBurst(ctx, t, { dur: 0.12, vol: 0.09, bp: 320, Q: 0.7, attack: 0.02, sweep: 500 });
        this.sub(ctx, t + 0.02, { freq: 48, dur: 0.14, vol: 0.07, slide: 12 });
        break;
      case 'shear_breach':
        this.noiseBurst(ctx, t, { dur: 0.16, vol: 0.12, bp: 180, Q: 0.5, attack: 0.01, sweep: 1100 });
        this.noiseBurst(ctx, t + 0.04, { dur: 0.1, vol: 0.07, bp: 900, Q: 1.1, attack: 0.01 });
        this.sub(ctx, t, { freq: 42, dur: 0.2, vol: 0.1, slide: 18 });
        break;
      case 'beacon':
        // Sodium relay settle — soft radio wash into a hum, not tones.
        this.noiseBurst(ctx, t, { dur: 0.1, vol: 0.08, bp: 1200, Q: 1.2, attack: 0.02 });
        this.noiseBurst(ctx, t + 0.08, { dur: 0.18, vol: 0.06, bp: 400, Q: 0.6, attack: 0.05 });
        this.hum(ctx, t + 0.1, { freq: 85, dur: 0.28, vol: 0.06 });
        break;
      case 'warn':
        // Alarm as AM noise pulses — not square beeps.
        this.noiseBurst(ctx, t, { dur: 0.09, vol: 0.12, bp: 950, Q: 2.5, attack: 0.004 });
        this.noiseBurst(ctx, t + 0.12, { dur: 0.1, vol: 0.1, bp: 750, Q: 2.5, attack: 0.004 });
        break;
      case 'telegraph_beam':
        // Tight ion lane warning: bright edge + cold sustain tail.
        this.noiseBurst(ctx, t, { dur: 0.05, vol: 0.1, bp: 2100, Q: 3.2, attack: 0.002 });
        this.hum(ctx, t + 0.03, { freq: 122, dur: 0.16, vol: 0.055 });
        this.noiseBurst(ctx, t + 0.06, { dur: 0.1, vol: 0.05, bp: 1200, Q: 1.8, attack: 0.01 });
        break;
      case 'telegraph_hold':
        // Sentinel hold: short latch + low mechanical stay-open.
        this.noiseBurst(ctx, t, { dur: 0.03, vol: 0.11, bp: 2600, Q: 4, attack: 0.001 });
        this.sub(ctx, t + 0.015, { freq: 68, dur: 0.12, vol: 0.07, slide: -6 });
        this.noiseBurst(ctx, t + 0.05, { dur: 0.08, vol: 0.045, bp: 700, Q: 1.1, attack: 0.008 });
        break;
      case 'telegraph_charge':
        // Closing body mass: scrape into forward shove.
        this.noiseBurst(ctx, t, { dur: 0.04, vol: 0.12, bp: 900, Q: 1.6, attack: 0.002, sweep: -250 });
        this.sub(ctx, t + 0.02, { freq: 62, dur: 0.12, vol: 0.11, slide: -18 });
        break;
      case 'telegraph_pulse':
        // Expanding field charge: airy swell instead of a directional strike.
        this.noiseBurst(ctx, t, { dur: 0.14, vol: 0.09, bp: 650, Q: 0.9, attack: 0.02, sweep: 500 });
        this.hum(ctx, t + 0.03, { freq: 96, dur: 0.18, vol: 0.045 });
        break;
      case 'win':
        // Pad swell + air, no fanfare notes.
        this.hum(ctx, t, { freq: 65, dur: 0.55, vol: 0.08 });
        this.hum(ctx, t + 0.05, { freq: 97, dur: 0.5, vol: 0.05 });
        this.noiseBurst(ctx, t, {
          dur: 0.45,
          vol: 0.07,
          bp: 600,
          Q: 0.4,
          attack: 0.08,
          sweep: 800,
        });
        break;
      case 'lose':
        this.noiseBurst(ctx, t, {
          dur: 0.35,
          vol: 0.11,
          bp: 500,
          Q: 0.5,
          attack: 0.02,
          sweep: -350,
        });
        this.sub(ctx, t + 0.05, { freq: 70, dur: 0.4, vol: 0.12, slide: -35 });
        this.noiseBurst(ctx, t + 0.2, { dur: 0.35, vol: 0.06, bp: 180, Q: 0.4, attack: 0.08 });
        break;
      case 'start':
        this.noiseBurst(ctx, t, {
          dur: 0.22,
          vol: 0.08,
          bp: 350,
          Q: 0.5,
          attack: 0.05,
          sweep: 500,
        });
        this.hum(ctx, t + 0.06, { freq: 70, dur: 0.28, vol: 0.06 });
        break;
      case 'armor':
        this.noiseBurst(ctx, t, { dur: 0.03, vol: 0.1, bp: 2200, Q: 3.5, attack: 0.001 });
        this.sub(ctx, t + 0.01, { freq: 80, dur: 0.06, vol: 0.07, slide: -10 });
        break;
      case 'level':
        this.noiseBurst(ctx, t, {
          dur: 0.2,
          vol: 0.08,
          bp: 400,
          Q: 0.6,
          attack: 0.03,
          sweep: 700,
        });
        this.hum(ctx, t + 0.04, { freq: 90, dur: 0.22, vol: 0.055 });
        break;
      case 'extract':
        this.noiseBurst(ctx, t, {
          dur: 0.3,
          vol: 0.09,
          bp: 300,
          Q: 0.45,
          attack: 0.06,
          sweep: 600,
        });
        this.hum(ctx, t + 0.08, { freq: 75, dur: 0.32, vol: 0.07 });
        this.hum(ctx, t + 0.1, { freq: 112, dur: 0.28, vol: 0.04 });
        break;
      case 'notice':
        // Fauna latch — dry click into scrape.
        this.noiseBurst(ctx, t, { dur: 0.025, vol: 0.12, bp: 2800, Q: 4, attack: 0.001 });
        this.noiseBurst(ctx, t + 0.02, {
          dur: 0.12,
          vol: 0.1,
          bp: 500,
          Q: 1.2,
          attack: 0.008,
          sweep: 700,
        });
        this.sub(ctx, t + 0.04, { freq: 55, dur: 0.1, vol: 0.08, slide: -15 });
        break;
      case 'enemy':
        this.noiseBurst(ctx, t, { dur: 0.07, vol: 0.16, bp: 350, Q: 0.8, attack: 0.002 });
        this.sub(ctx, t, { freq: 48, dur: 0.14, vol: 0.16, slide: -18 });
        this.noiseBurst(ctx, t + 0.05, { dur: 0.08, vol: 0.06, bp: 900, Q: 1.5, attack: 0.01 });
        break;
      case 'enemy_beam':
        // Ion rake: cold front edge plus a longer charged tail.
        this.noiseBurst(ctx, t, { dur: 0.035, vol: 0.12, bp: 2500, Q: 4.2, attack: 0.001 });
        this.hum(ctx, t + 0.01, { freq: 132, dur: 0.18, vol: 0.07 });
        this.noiseBurst(ctx, t + 0.03, { dur: 0.14, vol: 0.07, bp: 1100, Q: 1.4, attack: 0.006, sweep: -250 });
        break;
      case 'enemy_pulse':
        // Area discharge: wider body than beam, less directional.
        this.noiseBurst(ctx, t, { dur: 0.08, vol: 0.13, bp: 800, Q: 1.1, attack: 0.004, sweep: 350 });
        this.sub(ctx, t + 0.02, { freq: 58, dur: 0.16, vol: 0.12, slide: -8 });
        this.noiseBurst(ctx, t + 0.05, { dur: 0.1, vol: 0.05, bp: 1400, Q: 1.6, attack: 0.008 });
        break;
      case 'player_beam':
        // Survey phaser: cleaner, more tooled version of the ion beam.
        this.noiseBurst(ctx, t, { dur: 0.025, vol: 0.11, bp: 2800, Q: 5, attack: 0.001 });
        this.hum(ctx, t + 0.005, { freq: 148, dur: 0.12, vol: 0.055 });
        this.sub(ctx, t + 0.015, { freq: 84, dur: 0.09, vol: 0.07, slide: -10 });
        break;
      case 'scuttle':
        this.noiseBurst(ctx, t, { dur: 0.03, vol: 0.07, bp: 600, Q: 1.3, attack: 0.001 });
        this.noiseBurst(ctx, t + 0.04, { dur: 0.028, vol: 0.055, bp: 750, Q: 1.2, attack: 0.001 });
        break;
    }
  }

  /** Band-limited noise transient — the main “material” voice. */
  private noiseBurst(
    ctx: AudioContext,
    t0: number,
    opts: {
      dur: number;
      vol: number;
      bp: number;
      Q: number;
      attack: number;
      sweep?: number;
    },
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = this.ensureNoise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(Math.max(40, opts.bp), t0);
    if (opts.sweep) {
      bp.frequency.linearRampToValueAtTime(Math.max(40, opts.bp + opts.sweep), t0 + opts.dur);
    }
    bp.Q.value = opts.Q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(opts.vol * VOICE, 0.0002), t0 + opts.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(audioBus.channel('sfx'));
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  /** Felt body — sine below clear pitch identity. */
  private sub(
    ctx: AudioContext,
    t0: number,
    opts: { freq: number; dur: number; vol: number; slide?: number },
  ): void {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.max(28, opts.freq), t0);
    if (opts.slide) {
      osc.frequency.linearRampToValueAtTime(Math.max(28, opts.freq + opts.slide), t0 + opts.dur);
    }
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(opts.vol * VOICE, 0.0002), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(audioBus.channel('sfx'));
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.03);
  }

  /** Soft continuous hum for confirms / endings — still not a melody. */
  private hum(
    ctx: AudioContext,
    t0: number,
    opts: { freq: number; dur: number; vol: number },
  ): void {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = opts.freq;
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    const attack = Math.min(0.08, opts.dur * 0.25);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(opts.vol * VOICE, 0.0002), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(audioBus.channel('sfx'));
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.03);
  }

  private ensureNoise(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuf && this.noiseBuf.sampleRate === ctx.sampleRate) return this.noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Softened noise — less digital harshness than pure white.
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      prev = (prev + 0.02 * white) / 1.02;
      data[i] = white * 0.55 + prev * 0.9;
    }
    this.noiseBuf = buf;
    return buf;
  }
}

export const sfx = new SfxBus();
