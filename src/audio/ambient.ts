/** Looping synthesized biome ambient beds — few oscillators, no assets. */

import type { SectorId } from '../data/encounters';
import { audioBus } from './bus';

type Voice = {
  osc: OscillatorNode;
  gain: GainNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
  filter?: BiquadFilterNode;
};

type AmbientPreset = {
  drones: Array<{ freq: number; type: OscillatorType; vol: number; lfoHz?: number; lfoDepth?: number }>;
  noise?: { vol: number; filterHz: number };
  dripHz?: number;
};

const PRESETS: Record<SectorId, AmbientPreset> = {
  plains: {
    drones: [
      { freq: 55, type: 'sine', vol: 0.045 },
      { freq: 82, type: 'triangle', vol: 0.02, lfoHz: 0.08, lfoDepth: 4 },
    ],
  },
  flood: {
    drones: [{ freq: 48, type: 'sine', vol: 0.04, lfoHz: 0.12, lfoDepth: 6 }],
    noise: { vol: 0.018, filterHz: 600 },
    dripHz: 0.35,
  },
  canopy: {
    drones: [
      { freq: 70, type: 'triangle', vol: 0.03 },
      { freq: 110, type: 'sine', vol: 0.015, lfoHz: 0.2, lfoDepth: 8 },
    ],
  },
  reef: {
    drones: [
      { freq: 78, type: 'sine', vol: 0.032, lfoHz: 0.22, lfoDepth: 11 },
      { freq: 156, type: 'triangle', vol: 0.012 },
    ],
    noise: { vol: 0.01, filterHz: 750 },
  },
  spire: {
    drones: [
      { freq: 88, type: 'sine', vol: 0.032, lfoHz: 0.18, lfoDepth: 10 },
      { freq: 176, type: 'triangle', vol: 0.01 },
    ],
  },
  ruin: {
    drones: [
      { freq: 62, type: 'sawtooth', vol: 0.012 },
      { freq: 93, type: 'sine', vol: 0.03 },
    ],
    noise: { vol: 0.01, filterHz: 400 },
  },
  beacon: {
    drones: [
      { freq: 90, type: 'sine', vol: 0.035, lfoHz: 0.15, lfoDepth: 12 },
      { freq: 180, type: 'triangle', vol: 0.012 },
    ],
  },
  trench: {
    drones: [
      { freq: 50, type: 'sine', vol: 0.038 },
      { freq: 100, type: 'sawtooth', vol: 0.008, lfoHz: 0.06, lfoDepth: 4 },
    ],
    noise: { vol: 0.012, filterHz: 350 },
  },
  duct: {
    drones: [
      { freq: 54, type: 'sine', vol: 0.036 },
      { freq: 108, type: 'square', vol: 0.008, lfoHz: 0.09, lfoDepth: 5 },
    ],
    noise: { vol: 0.014, filterHz: 450 },
  },
  ash: {
    drones: [{ freq: 42, type: 'sawtooth', vol: 0.01 }],
    noise: { vol: 0.028, filterHz: 900 },
  },
  brine: {
    drones: [{ freq: 46, type: 'sine', vol: 0.038, lfoHz: 0.14, lfoDepth: 7 }],
    noise: { vol: 0.02, filterHz: 500 },
    dripHz: 0.28,
  },
  vault: {
    drones: [
      { freq: 75, type: 'sine', vol: 0.04 },
      { freq: 150, type: 'square', vol: 0.008, lfoHz: 0.05, lfoDepth: 3 },
    ],
  },
  fissure: {
    drones: [
      { freq: 52, type: 'sawtooth', vol: 0.014 },
      { freq: 104, type: 'sine', vol: 0.028, lfoHz: 0.11, lfoDepth: 6 },
    ],
    noise: { vol: 0.016, filterHz: 700 },
  },
  approach: {
    drones: [
      { freq: 60, type: 'sawtooth', vol: 0.012 },
      { freq: 120, type: 'sine', vol: 0.03, lfoHz: 0.16, lfoDepth: 8 },
    ],
    noise: { vol: 0.018, filterHz: 650 },
  },
  ridge: {
    drones: [
      { freq: 58, type: 'sine', vol: 0.035 },
      { freq: 116, type: 'triangle', vol: 0.018, lfoHz: 0.1, lfoDepth: 5 },
    ],
  },
};

const TITLE_PRESET: AmbientPreset = {
  drones: [
    { freq: 66, type: 'sine', vol: 0.04, lfoHz: 0.07, lfoDepth: 5 },
    { freq: 99, type: 'triangle', vol: 0.015 },
  ],
};

class AmbientEngine {
  private voices: Voice[] = [];
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private dripTimer: number | null = null;
  private currentKey: string | null = null;
  private fadeGain: GainNode | null = null;

  startTitle(): void {
    this.setPreset('title', TITLE_PRESET);
  }

  startSector(id: SectorId): void {
    this.setPreset(id, PRESETS[id]);
  }

  stop(): void {
    this.teardown(0.35);
    this.currentKey = null;
  }

  private setPreset(key: string, preset: AmbientPreset): void {
    if (audioBus.isMuted()) {
      // Still track key so unmute + unlock can restart from scenes
      this.currentKey = key;
      this.teardown(0.05);
      return;
    }
    if (this.currentKey === key && this.voices.length > 0) return;
    this.teardown(0.25);
    this.currentKey = key;

    const ctx = audioBus.ensure();
    if (ctx.state === 'suspended') void ctx.resume();

    this.fadeGain = ctx.createGain();
    this.fadeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
    this.fadeGain.connect(audioBus.channel('ambient'));

    for (const d of preset.drones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = d.type;
      osc.frequency.value = d.freq;
      gain.gain.value = d.vol;
      osc.connect(gain);
      gain.connect(this.fadeGain);
      osc.start();

      const voice: Voice = { osc, gain };
      if (d.lfoHz && d.lfoDepth) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = d.lfoHz;
        lfoGain.gain.value = d.lfoDepth;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        voice.lfo = lfo;
        voice.lfoGain = lfoGain;
      }
      this.voices.push(voice);
    }

    if (preset.noise) {
      const buffer = this.noiseBuffer(ctx, 2);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = preset.noise.filterHz;
      const ng = ctx.createGain();
      ng.gain.value = preset.noise.vol;
      src.connect(filter);
      filter.connect(ng);
      ng.connect(this.fadeGain);
      src.start();
      this.noiseNode = src;
      this.noiseGain = ng;
    }

    if (preset.dripHz) {
      const interval = 1000 / preset.dripHz;
      this.dripTimer = window.setInterval(() => this.drip(), interval + Math.random() * 400);
    }
  }

  private drip(): void {
    if (audioBus.isMuted() || !this.fadeGain) return;
    const ctx = audioBus.ensure();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880 + Math.random() * 400, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.04, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(g);
    g.connect(this.fadeGain);
    osc.start(t0);
    osc.stop(t0 + 0.16);
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private teardown(fadeSec: number): void {
    if (this.dripTimer !== null) {
      clearInterval(this.dripTimer);
      this.dripTimer = null;
    }
    const ctx = this.fadeGain ? audioBus.ensure() : null;
    const t = ctx?.currentTime ?? 0;
    if (this.fadeGain && ctx) {
      this.fadeGain.gain.cancelScheduledValues(t);
      this.fadeGain.gain.setValueAtTime(this.fadeGain.gain.value, t);
      this.fadeGain.gain.linearRampToValueAtTime(0.0001, t + fadeSec);
    }
    const voices = this.voices;
    const noise = this.noiseNode;
    const fade = this.fadeGain;
    this.voices = [];
    this.noiseNode = null;
    this.noiseGain = null;
    this.fadeGain = null;

    const stopAt = (fadeSec + 0.05) * 1000;
    window.setTimeout(() => {
      for (const v of voices) {
        try {
          v.osc.stop();
          v.lfo?.stop();
        } catch {
          /* already stopped */
        }
        v.osc.disconnect();
        v.gain.disconnect();
        v.lfo?.disconnect();
        v.lfoGain?.disconnect();
      }
      try {
        noise?.stop();
      } catch {
        /* ignore */
      }
      noise?.disconnect();
      fade?.disconnect();
    }, stopAt);
  }
}

export const ambient = new AmbientEngine();
