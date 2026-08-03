/** Shared Web Audio context, master mute, and SFX / ambient / music gains. */

const MUTE_KEY = 'extraction-window-mute';

export type BusChannel = 'sfx' | 'ambient' | 'music';

class AudioBus {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channels: Partial<Record<BusChannel, GainNode>> = {};
  private muted = false;
  private readonly channelLevels: Record<BusChannel, number> = {
    sfx: 0.28,
    ambient: 0.22,
    music: 0.32,
  };
  private duckUntil = 0;

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
    this.applyMute();
    return this.muted;
  }

  /** Call from a user gesture so AudioContext can start. */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  ensure(): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      for (const ch of ['sfx', 'ambient', 'music'] as BusChannel[]) {
        const g = this.ctx.createGain();
        g.gain.value = this.channelLevels[ch];
        g.connect(this.masterGain);
        this.channels[ch] = g;
      }
      this.applyMute();
    }
    return this.ctx;
  }

  channel(ch: BusChannel): GainNode {
    this.ensure();
    return this.channels[ch]!;
  }

  /** Briefly duck ambient under combat one-shots. */
  duckAmbient(ms = 180): void {
    const ctx = this.ensure();
    const amb = this.channels.ambient;
    if (!amb || this.muted) return;
    const until = ctx.currentTime + ms / 1000;
    this.duckUntil = Math.max(this.duckUntil, until);
    const base = this.channelLevels.ambient;
    amb.gain.cancelScheduledValues(ctx.currentTime);
    amb.gain.setValueAtTime(amb.gain.value, ctx.currentTime);
    amb.gain.linearRampToValueAtTime(base * 0.35, ctx.currentTime + 0.02);
    amb.gain.linearRampToValueAtTime(base, until);
  }

  private applyMute(): void {
    if (!this.masterGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(this.muted ? 0.0001 : 1, t);
  }
}

export const audioBus = new AudioBus();
