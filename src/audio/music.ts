/** Sparse procedural music beds — quiet arpeggios, denser when storm-critical. */

import { audioBus } from './bus';

export type MusicMood = 'title' | 'field' | 'storm' | 'critical' | 'end_win' | 'end_lose' | 'off';

const NOTES = {
  title: [196, 247, 294, 370],
  field: [165, 196, 220, 262],
  storm: [185, 220, 247, 311],
  critical: [208, 247, 277, 370],
  end_win: [262, 330, 392, 523],
  end_lose: [196, 185, 165, 131],
};

class MusicEngine {
  private timer: number | null = null;
  private mood: MusicMood = 'off';
  private step = 0;
  private fadeGain: GainNode | null = null;

  setMood(mood: MusicMood): void {
    if (mood === this.mood && this.timer !== null) return;
    this.stopInternal(mood === 'off' ? 0.4 : 0.2);
    this.mood = mood;
    if (mood === 'off' || audioBus.isMuted()) return;

    const ctx = audioBus.ensure();
    if (ctx.state === 'suspended') void ctx.resume();

    this.fadeGain = ctx.createGain();
    this.fadeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.8);
    this.fadeGain.connect(audioBus.channel('music'));

    this.step = 0;
    const interval = this.intervalMs(mood);
    this.timer = window.setInterval(() => this.tick(), interval);
    this.tick();
  }

  /** Map storm window to field / storm / critical beds. */
  syncStorm(stormTurns: number): void {
    if (this.mood === 'title' || this.mood === 'end_win' || this.mood === 'end_lose') return;
    if (stormTurns <= 20) this.setMood('critical');
    else if (stormTurns <= 50) this.setMood('storm');
    else this.setMood('field');
  }

  stop(): void {
    this.setMood('off');
  }

  private intervalMs(mood: MusicMood): number {
    switch (mood) {
      case 'title':
        return 1400;
      case 'field':
        return 1600;
      case 'storm':
        return 900;
      case 'critical':
        return 520;
      case 'end_win':
        return 400;
      case 'end_lose':
        return 700;
      default:
        return 2000;
    }
  }

  private tick(): void {
    if (this.mood === 'off' || !this.fadeGain || audioBus.isMuted()) return;
    // Sparse: often skip notes on field/title
    if (this.mood === 'field' && Math.random() < 0.45) {
      this.step++;
      return;
    }
    if (this.mood === 'title' && Math.random() < 0.35) {
      this.step++;
      return;
    }

    const scale = NOTES[this.mood];
    const freq = scale[this.step % scale.length]!;
    this.step++;

    const ctx = audioBus.ensure();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = this.mood === 'critical' ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    const peak =
      this.mood === 'critical'
        ? 0.055
        : this.mood === 'storm'
          ? 0.04
          : this.mood === 'end_win' || this.mood === 'end_lose'
            ? 0.05
            : 0.028;
    const dur = this.mood === 'critical' ? 0.18 : 0.28;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.fadeGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
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
