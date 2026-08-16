/** Synthesized one-shot SFX via Web Audio — no asset files.
 *  Voices mix filtered oscillators + noise so hits read as gear/fauna, not chiptune.
 */

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
  | 'scuttle';

type FilterSpec = {
  type: BiquadFilterType;
  freq: number;
  Q?: number;
};

type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  slide?: number;
  delay?: number;
  /** Soft attack (seconds). Default ~0.008. */
  attack?: number;
  /** Noise burst mix 0–1 under/instead of the oscillator. */
  noise?: number;
  filter?: FilterSpec;
  /** Second osc ratio (e.g. 1.01 slight chorusing, 1.5 fifth). */
  ratio?: number;
  ratioVol?: number;
};

const COMBAT: SfxId[] = [
  'hit',
  'kill',
  'hurt',
  'warn',
  'armor',
  'notice',
  'enemy',
  'scuttle',
];

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

    const seq = this.sequence(id);
    for (const tone of seq) this.voice(ctx, tone);
  }

  private sequence(id: SfxId): Tone[] {
    switch (id) {
      case 'ui':
        // Soft pad click — band-limited, short.
        return [
          {
            freq: 720,
            dur: 0.035,
            type: 'triangle',
            vol: 0.09,
            filter: { type: 'lowpass', freq: 1800 },
            attack: 0.004,
          },
        ];
      case 'move':
        // Boot grit on deck — noise tick + low thump.
        return [
          {
            freq: 140,
            dur: 0.028,
            type: 'triangle',
            vol: 0.055,
            slide: -50,
            noise: 0.55,
            filter: { type: 'bandpass', freq: 420, Q: 0.8 },
            attack: 0.003,
          },
        ];
      case 'blocked':
        return [
          {
            freq: 85,
            dur: 0.07,
            type: 'square',
            vol: 0.09,
            slide: -25,
            noise: 0.35,
            filter: { type: 'lowpass', freq: 500 },
            attack: 0.005,
          },
        ];
      case 'hit':
        // Kinetic strike — noise transient + mid body + decay scrape.
        return [
          {
            freq: 180,
            dur: 0.04,
            type: 'square',
            vol: 0.14,
            noise: 0.7,
            filter: { type: 'bandpass', freq: 900, Q: 1.2 },
            attack: 0.002,
          },
          {
            freq: 110,
            dur: 0.09,
            type: 'sawtooth',
            vol: 0.09,
            delay: 0.02,
            slide: -55,
            filter: { type: 'lowpass', freq: 700 },
            ratio: 1.01,
            ratioVol: 0.4,
          },
        ];
      case 'kill':
        return [
          {
            freq: 200,
            dur: 0.045,
            type: 'square',
            vol: 0.12,
            noise: 0.55,
            filter: { type: 'bandpass', freq: 1100, Q: 1 },
            attack: 0.002,
          },
          {
            freq: 360,
            dur: 0.08,
            type: 'triangle',
            vol: 0.1,
            delay: 0.04,
            filter: { type: 'lowpass', freq: 2200 },
            ratio: 1.498,
            ratioVol: 0.35,
          },
          {
            freq: 540,
            dur: 0.12,
            type: 'sine',
            vol: 0.08,
            delay: 0.11,
            slide: 60,
            filter: { type: 'lowpass', freq: 2800 },
          },
        ];
      case 'hurt':
        return [
          {
            freq: 260,
            dur: 0.09,
            type: 'sawtooth',
            vol: 0.15,
            slide: -160,
            noise: 0.45,
            filter: { type: 'lowpass', freq: 1200 },
            attack: 0.004,
          },
          {
            freq: 95,
            dur: 0.14,
            type: 'triangle',
            vol: 0.11,
            delay: 0.05,
            slide: -30,
            filter: { type: 'lowpass', freq: 400 },
          },
        ];
      case 'pickup':
        return [
          {
            freq: 480,
            dur: 0.05,
            type: 'triangle',
            vol: 0.1,
            filter: { type: 'lowpass', freq: 2400 },
            ratio: 2,
            ratioVol: 0.25,
          },
          {
            freq: 720,
            dur: 0.08,
            type: 'sine',
            vol: 0.09,
            delay: 0.05,
            filter: { type: 'lowpass', freq: 3200 },
          },
        ];
      case 'quest':
        // Flagging tone — clear fifth climb, soft square.
        return [
          {
            freq: 440,
            dur: 0.07,
            type: 'triangle',
            vol: 0.1,
            filter: { type: 'lowpass', freq: 2000 },
          },
          {
            freq: 554,
            dur: 0.08,
            type: 'triangle',
            vol: 0.1,
            delay: 0.07,
            filter: { type: 'lowpass', freq: 2200 },
          },
          {
            freq: 659,
            dur: 0.16,
            type: 'sine',
            vol: 0.12,
            delay: 0.14,
            filter: { type: 'lowpass', freq: 2800 },
            ratio: 1.5,
            ratioVol: 0.3,
          },
        ];
      case 'use':
        return [
          {
            freq: 380,
            dur: 0.045,
            type: 'sine',
            vol: 0.1,
            filter: { type: 'lowpass', freq: 1600 },
          },
          {
            freq: 520,
            dur: 0.09,
            type: 'triangle',
            vol: 0.085,
            delay: 0.045,
            filter: { type: 'lowpass', freq: 2000 },
          },
        ];
      case 'sector':
        // Shear peel — rising wash into a soft lock tone.
        return [
          {
            freq: 160,
            dur: 0.1,
            type: 'sawtooth',
            vol: 0.08,
            slide: 140,
            noise: 0.4,
            filter: { type: 'bandpass', freq: 500, Q: 0.7 },
          },
          {
            freq: 300,
            dur: 0.14,
            type: 'triangle',
            vol: 0.09,
            delay: 0.09,
            filter: { type: 'lowpass', freq: 1800 },
            ratio: 1.5,
            ratioVol: 0.28,
          },
        ];
      case 'beacon':
        return [
          {
            freq: 340,
            dur: 0.09,
            type: 'triangle',
            vol: 0.1,
            filter: { type: 'lowpass', freq: 1600 },
          },
          {
            freq: 510,
            dur: 0.11,
            type: 'triangle',
            vol: 0.1,
            delay: 0.09,
            filter: { type: 'lowpass', freq: 2000 },
          },
          {
            freq: 680,
            dur: 0.2,
            type: 'sine',
            vol: 0.12,
            delay: 0.2,
            filter: { type: 'lowpass', freq: 2600 },
            ratio: 2.0,
            ratioVol: 0.22,
          },
        ];
      case 'warn':
        return [
          {
            freq: 820,
            dur: 0.09,
            type: 'square',
            vol: 0.11,
            filter: { type: 'bandpass', freq: 900, Q: 2 },
            attack: 0.006,
          },
          {
            freq: 620,
            dur: 0.11,
            type: 'square',
            vol: 0.09,
            delay: 0.11,
            filter: { type: 'bandpass', freq: 700, Q: 2 },
          },
        ];
      case 'win':
        return [
          {
            freq: 392,
            dur: 0.1,
            type: 'triangle',
            vol: 0.11,
            filter: { type: 'lowpass', freq: 2400 },
            ratio: 1.5,
            ratioVol: 0.25,
          },
          {
            freq: 494,
            dur: 0.1,
            type: 'triangle',
            vol: 0.11,
            delay: 0.1,
            filter: { type: 'lowpass', freq: 2600 },
          },
          {
            freq: 587,
            dur: 0.12,
            type: 'sine',
            vol: 0.12,
            delay: 0.2,
            filter: { type: 'lowpass', freq: 3000 },
          },
          {
            freq: 784,
            dur: 0.26,
            type: 'sine',
            vol: 0.13,
            delay: 0.32,
            filter: { type: 'lowpass', freq: 3400 },
            ratio: 1.498,
            ratioVol: 0.3,
          },
        ];
      case 'lose':
        return [
          {
            freq: 280,
            dur: 0.16,
            type: 'sawtooth',
            vol: 0.11,
            slide: -90,
            noise: 0.35,
            filter: { type: 'lowpass', freq: 800 },
          },
          {
            freq: 160,
            dur: 0.22,
            type: 'triangle',
            vol: 0.1,
            delay: 0.12,
            slide: -60,
            filter: { type: 'lowpass', freq: 500 },
          },
          {
            freq: 80,
            dur: 0.32,
            type: 'sine',
            vol: 0.12,
            delay: 0.3,
            slide: -25,
            filter: { type: 'lowpass', freq: 300 },
          },
        ];
      case 'start':
        return [
          {
            freq: 220,
            dur: 0.08,
            type: 'triangle',
            vol: 0.1,
            filter: { type: 'lowpass', freq: 1800 },
          },
          {
            freq: 330,
            dur: 0.1,
            type: 'triangle',
            vol: 0.1,
            delay: 0.08,
            filter: { type: 'lowpass', freq: 2200 },
          },
          {
            freq: 440,
            dur: 0.16,
            type: 'sine',
            vol: 0.12,
            delay: 0.18,
            filter: { type: 'lowpass', freq: 2800 },
            ratio: 1.5,
            ratioVol: 0.28,
          },
        ];
      case 'armor':
        // Plate knock — short metallic noise + dull thud.
        return [
          {
            freq: 220,
            dur: 0.03,
            type: 'square',
            vol: 0.08,
            noise: 0.85,
            filter: { type: 'bandpass', freq: 1600, Q: 2.5 },
            attack: 0.001,
          },
          {
            freq: 95,
            dur: 0.07,
            type: 'triangle',
            vol: 0.07,
            delay: 0.02,
            slide: -15,
            filter: { type: 'lowpass', freq: 350 },
          },
        ];
      case 'level':
        return [
          {
            freq: 380,
            dur: 0.055,
            type: 'triangle',
            vol: 0.1,
            filter: { type: 'lowpass', freq: 2000 },
          },
          {
            freq: 570,
            dur: 0.08,
            type: 'triangle',
            vol: 0.1,
            delay: 0.055,
            filter: { type: 'lowpass', freq: 2400 },
          },
          {
            freq: 760,
            dur: 0.14,
            type: 'sine',
            vol: 0.12,
            delay: 0.13,
            filter: { type: 'lowpass', freq: 3200 },
            ratio: 1.5,
            ratioVol: 0.28,
          },
        ];
      case 'extract':
        return [
          {
            freq: 310,
            dur: 0.08,
            type: 'triangle',
            vol: 0.1,
            filter: { type: 'lowpass', freq: 1800 },
          },
          {
            freq: 415,
            dur: 0.1,
            type: 'triangle',
            vol: 0.1,
            delay: 0.08,
            filter: { type: 'lowpass', freq: 2200 },
          },
          {
            freq: 620,
            dur: 0.18,
            type: 'sine',
            vol: 0.12,
            delay: 0.18,
            filter: { type: 'lowpass', freq: 2800 },
            ratio: 1.5,
            ratioVol: 0.3,
          },
        ];
      case 'notice':
        // Fauna latch — dry click into rising scrape.
        return [
          {
            freq: 120,
            dur: 0.035,
            type: 'square',
            vol: 0.12,
            noise: 0.7,
            filter: { type: 'highpass', freq: 200 },
            attack: 0.001,
          },
          {
            freq: 380,
            dur: 0.1,
            type: 'sawtooth',
            vol: 0.1,
            delay: 0.025,
            slide: 180,
            filter: { type: 'bandpass', freq: 700, Q: 1.4 },
          },
          {
            freq: 70,
            dur: 0.09,
            type: 'triangle',
            vol: 0.08,
            delay: 0.08,
            slide: -20,
            filter: { type: 'lowpass', freq: 250 },
          },
        ];
      case 'enemy':
        // Hostile strike — heavier noise body than player hit.
        return [
          {
            freq: 90,
            dur: 0.055,
            type: 'sawtooth',
            vol: 0.15,
            noise: 0.75,
            filter: { type: 'lowpass', freq: 600 },
            attack: 0.002,
          },
          {
            freq: 55,
            dur: 0.12,
            type: 'sine',
            vol: 0.14,
            delay: 0.03,
            slide: -20,
            filter: { type: 'lowpass', freq: 200 },
          },
          {
            freq: 170,
            dur: 0.05,
            type: 'triangle',
            vol: 0.06,
            delay: 0.08,
            filter: { type: 'bandpass', freq: 400, Q: 1 },
          },
        ];
      case 'scuttle':
        // Closer footfalls — dual grit ticks.
        return [
          {
            freq: 80,
            dur: 0.028,
            type: 'triangle',
            vol: 0.07,
            slide: -20,
            noise: 0.8,
            filter: { type: 'bandpass', freq: 550, Q: 1.1 },
            attack: 0.002,
          },
          {
            freq: 110,
            dur: 0.028,
            type: 'triangle',
            vol: 0.055,
            delay: 0.038,
            slide: -15,
            noise: 0.7,
            filter: { type: 'bandpass', freq: 700, Q: 1 },
            attack: 0.002,
          },
        ];
    }
  }

  private voice(ctx: AudioContext, tone: Tone): void {
    const t0 = ctx.currentTime + (tone.delay ?? 0);
    const dur = tone.dur;
    const attack = Math.min(tone.attack ?? 0.008, dur * 0.4);
    const vol = tone.vol ?? 0.12;
    const noiseAmt = tone.noise ?? 0;
    const toneAmt = Math.max(0, 1 - noiseAmt * 0.85);

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + attack);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    let dest: AudioNode = out;
    if (tone.filter) {
      const f = ctx.createBiquadFilter();
      f.type = tone.filter.type;
      f.frequency.setValueAtTime(tone.filter.freq, t0);
      if (tone.filter.Q !== undefined) f.Q.value = tone.filter.Q;
      if (tone.slide && tone.filter.type !== 'lowpass') {
        // Keep band focus tracking a rising scrape a little.
        f.frequency.linearRampToValueAtTime(
          tone.filter.freq + tone.slide * 0.4,
          t0 + dur,
        );
      }
      f.connect(out);
      dest = f;
    }

    if (toneAmt > 0.02 && tone.freq > 0) {
      this.oscInto(ctx, dest, {
        freq: tone.freq,
        type: tone.type ?? 'triangle',
        t0,
        dur,
        vol: toneAmt,
        slide: tone.slide,
      });
      if (tone.ratio && tone.ratio !== 1) {
        this.oscInto(ctx, dest, {
          freq: tone.freq * tone.ratio,
          type: tone.type === 'sawtooth' ? 'triangle' : (tone.type ?? 'sine'),
          t0,
          dur,
          vol: toneAmt * (tone.ratioVol ?? 0.3),
          slide: tone.slide ? tone.slide * tone.ratio : undefined,
        });
      }
    }

    if (noiseAmt > 0.02) {
      this.noiseInto(ctx, dest, {
        t0,
        dur: Math.min(dur, 0.12),
        vol: noiseAmt,
      });
    }

    out.connect(audioBus.channel('sfx'));
  }

  private oscInto(
    ctx: AudioContext,
    dest: AudioNode,
    opts: {
      freq: number;
      type: OscillatorType;
      t0: number;
      dur: number;
      vol: number;
      slide?: number;
    },
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(Math.max(20, opts.freq), opts.t0);
    if (opts.slide) {
      osc.frequency.linearRampToValueAtTime(
        Math.max(20, opts.freq + opts.slide),
        opts.t0 + opts.dur,
      );
    }
    g.gain.value = opts.vol;
    osc.connect(g);
    g.connect(dest);
    osc.start(opts.t0);
    osc.stop(opts.t0 + opts.dur + 0.03);
  }

  private noiseInto(
    ctx: AudioContext,
    dest: AudioNode,
    opts: { t0: number; dur: number; vol: number },
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = this.ensureNoise(ctx);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, opts.t0);
    g.gain.exponentialRampToValueAtTime(Math.max(opts.vol, 0.0002), opts.t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, opts.t0 + opts.dur);
    src.connect(g);
    g.connect(dest);
    src.start(opts.t0);
    src.stop(opts.t0 + opts.dur + 0.02);
  }

  private ensureNoise(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuf && this.noiseBuf.sampleRate === ctx.sampleRate) return this.noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }
}

export const sfx = new SfxBus();
