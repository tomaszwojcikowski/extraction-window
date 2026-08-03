/** Tiny synthesized SFX via Web Audio — no asset files. */

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
  | 'start';

type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  slide?: number;
  delay?: number;
};

const MUTE_KEY = 'extraction-window-mute';

class SfxBus {
  private ctx: AudioContext | null = null;
  private muted = false;
  private master = 0.22;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!this.muted) this.play('ui');
    return this.muted;
  }

  /** Call from a user gesture so AudioContext can start. */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  play(id: SfxId): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();

    const seq = this.sequence(id);
    for (const tone of seq) this.beep(ctx, tone);
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  private sequence(id: SfxId): Tone[] {
    switch (id) {
      case 'ui':
        return [{ freq: 660, dur: 0.04, type: 'square', vol: 0.12 }];
      case 'move':
        return [{ freq: 180, dur: 0.035, type: 'triangle', vol: 0.08, slide: -40 }];
      case 'blocked':
        return [{ freq: 90, dur: 0.06, type: 'square', vol: 0.1, slide: -30 }];
      case 'hit':
        return [
          { freq: 220, dur: 0.05, type: 'square', vol: 0.16 },
          { freq: 140, dur: 0.07, type: 'sawtooth', vol: 0.1, delay: 0.04, slide: -80 },
        ];
      case 'kill':
        return [
          { freq: 320, dur: 0.05, type: 'square', vol: 0.14 },
          { freq: 480, dur: 0.08, type: 'triangle', vol: 0.12, delay: 0.05 },
          { freq: 640, dur: 0.1, type: 'triangle', vol: 0.08, delay: 0.12, slide: 80 },
        ];
      case 'hurt':
        return [
          { freq: 300, dur: 0.08, type: 'sawtooth', vol: 0.18, slide: -180 },
          { freq: 120, dur: 0.12, type: 'square', vol: 0.12, delay: 0.05, slide: -40 },
        ];
      case 'pickup':
        return [
          { freq: 520, dur: 0.05, type: 'triangle', vol: 0.12 },
          { freq: 780, dur: 0.07, type: 'triangle', vol: 0.1, delay: 0.05 },
        ];
      case 'quest':
        return [
          { freq: 440, dur: 0.07, type: 'square', vol: 0.12 },
          { freq: 554, dur: 0.08, type: 'square', vol: 0.12, delay: 0.07 },
          { freq: 659, dur: 0.14, type: 'triangle', vol: 0.14, delay: 0.14 },
        ];
      case 'use':
        return [
          { freq: 400, dur: 0.05, type: 'sine', vol: 0.12 },
          { freq: 560, dur: 0.08, type: 'sine', vol: 0.1, delay: 0.05 },
        ];
      case 'sector':
        return [
          { freq: 200, dur: 0.08, type: 'triangle', vol: 0.12, slide: 120 },
          { freq: 320, dur: 0.12, type: 'triangle', vol: 0.1, delay: 0.1 },
        ];
      case 'beacon':
        return [
          { freq: 360, dur: 0.1, type: 'square', vol: 0.12 },
          { freq: 540, dur: 0.12, type: 'square', vol: 0.12, delay: 0.1 },
          { freq: 720, dur: 0.18, type: 'sine', vol: 0.14, delay: 0.22 },
        ];
      case 'warn':
        return [
          { freq: 880, dur: 0.1, type: 'square', vol: 0.14 },
          { freq: 660, dur: 0.12, type: 'square', vol: 0.12, delay: 0.12 },
        ];
      case 'win':
        return [
          { freq: 392, dur: 0.1, type: 'triangle', vol: 0.14 },
          { freq: 494, dur: 0.1, type: 'triangle', vol: 0.14, delay: 0.1 },
          { freq: 587, dur: 0.12, type: 'triangle', vol: 0.14, delay: 0.2 },
          { freq: 784, dur: 0.22, type: 'sine', vol: 0.16, delay: 0.32 },
        ];
      case 'lose':
        return [
          { freq: 300, dur: 0.15, type: 'sawtooth', vol: 0.14, slide: -100 },
          { freq: 180, dur: 0.2, type: 'sawtooth', vol: 0.12, delay: 0.12, slide: -80 },
          { freq: 90, dur: 0.28, type: 'triangle', vol: 0.14, delay: 0.28, slide: -40 },
        ];
      case 'start':
        return [
          { freq: 240, dur: 0.08, type: 'triangle', vol: 0.12 },
          { freq: 360, dur: 0.1, type: 'triangle', vol: 0.12, delay: 0.08 },
          { freq: 480, dur: 0.14, type: 'sine', vol: 0.14, delay: 0.18 },
        ];
    }
  }

  private beep(ctx: AudioContext, tone: Tone): void {
    const t0 = ctx.currentTime + (tone.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type ?? 'square';
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.slide) {
      osc.frequency.linearRampToValueAtTime(tone.freq + tone.slide, t0 + tone.dur);
    }
    const vol = (tone.vol ?? 0.12) * this.master;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + tone.dur + 0.02);
  }
}

export const sfx = new SfxBus();
