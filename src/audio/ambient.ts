/** Looping synthesized biome ambient beds — few oscillators, no assets. */

import type { SectorId } from '../data/encounters';
import { layoutForSector, type LayoutKind } from '../map/layoutKind';
import { audioBus } from './bus';

type Voice = {
  osc: OscillatorNode;
  gain: GainNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
  filter?: BiquadFilterNode;
};

type AmbientPreset = {
  drones: Array<{
    freq: number;
    type: OscillatorType;
    vol: number;
    lfoHz?: number;
    lfoDepth?: number;
    /** Soft lowpass so saw/square drones stay field-gear, not harsh. */
    filterHz?: number;
  }>;
  noise?: { vol: number; filterHz: number; highpassHz?: number };
  dripHz?: number;
  /** Sparse EM / metal ticks (ducts, vaults, beacons). */
  tickHz?: number;
};

/**
 * Grammar overlay — same biome paint, different skeleton voice.
 * Applied on top of the sector preset so scatter/warren/lattice read apart.
 */
function grammarOverlay(kind: LayoutKind): Partial<AmbientPreset> {
  switch (kind) {
    case 'scatter':
      return {
        noise: { vol: 0.014, filterHz: 900, highpassHz: 220 },
      };
    case 'spine':
      return {
        drones: [{ freq: 64, type: 'sawtooth', vol: 0.007, filterHz: 240 }],
      };
    case 'hub':
      return { tickHz: 0.32 };
    case 'lattice':
      return {
        tickHz: 0.48,
        noise: { vol: 0.012, filterHz: 380, highpassHz: 70 },
      };
    case 'branch':
      return {
        noise: { vol: 0.016, filterHz: 1400, highpassHz: 450 },
        drones: [{ freq: 132, type: 'triangle', vol: 0.01, lfoHz: 0.25, lfoDepth: 9, filterHz: 1100 }],
      };
    case 'warren':
      return {
        tickHz: 0.2,
        noise: { vol: 0.02, filterHz: 420, highpassHz: 50 },
        drones: [{ freq: 38, type: 'sawtooth', vol: 0.008, filterHz: 200 }],
      };
  }
}

function mergePreset(base: AmbientPreset, overlay: Partial<AmbientPreset>): AmbientPreset {
  return {
    drones: [...base.drones, ...(overlay.drones ?? [])],
    noise: overlay.noise ?? base.noise,
    dripHz: overlay.dripHz ?? base.dripHz,
    tickHz: overlay.tickHz ?? base.tickHz,
  };
}

const PRESETS: Record<SectorId, AmbientPreset> = {
  plains: {
    drones: [
      { freq: 55, type: 'sine', vol: 0.045, filterHz: 400 },
      { freq: 82, type: 'triangle', vol: 0.02, lfoHz: 0.08, lfoDepth: 4, filterHz: 600 },
    ],
  },
  flood: {
    drones: [{ freq: 48, type: 'sine', vol: 0.04, lfoHz: 0.12, lfoDepth: 6, filterHz: 350 }],
    noise: { vol: 0.02, filterHz: 550, highpassHz: 80 },
    dripHz: 0.35,
  },
  canopy: {
    drones: [
      { freq: 70, type: 'triangle', vol: 0.03, filterHz: 500 },
      { freq: 110, type: 'sine', vol: 0.015, lfoHz: 0.2, lfoDepth: 8, filterHz: 900 },
    ],
    noise: { vol: 0.008, filterHz: 1200, highpassHz: 400 },
  },
  reef: {
    drones: [
      { freq: 78, type: 'sine', vol: 0.032, lfoHz: 0.22, lfoDepth: 11, filterHz: 700 },
      { freq: 156, type: 'triangle', vol: 0.012, filterHz: 1100 },
    ],
    noise: { vol: 0.01, filterHz: 750, highpassHz: 120 },
  },
  spire: {
    drones: [
      { freq: 88, type: 'sine', vol: 0.032, lfoHz: 0.18, lfoDepth: 10, filterHz: 800 },
      { freq: 176, type: 'triangle', vol: 0.01, filterHz: 1400 },
    ],
    tickHz: 0.22,
  },
  ruin: {
    drones: [
      { freq: 62, type: 'sawtooth', vol: 0.01, filterHz: 280 },
      { freq: 93, type: 'sine', vol: 0.03, filterHz: 500 },
    ],
    noise: { vol: 0.012, filterHz: 380, highpassHz: 60 },
    tickHz: 0.12,
  },
  beacon: {
    drones: [
      { freq: 90, type: 'sine', vol: 0.035, lfoHz: 0.15, lfoDepth: 12, filterHz: 700 },
      { freq: 180, type: 'triangle', vol: 0.012, filterHz: 1200 },
    ],
    tickHz: 0.28,
  },
  trench: {
    drones: [
      { freq: 50, type: 'sine', vol: 0.038, filterHz: 320 },
      { freq: 100, type: 'sawtooth', vol: 0.007, lfoHz: 0.06, lfoDepth: 4, filterHz: 260 },
    ],
    noise: { vol: 0.014, filterHz: 320, highpassHz: 40 },
  },
  duct: {
    drones: [
      { freq: 54, type: 'sine', vol: 0.036, filterHz: 400 },
      { freq: 108, type: 'square', vol: 0.006, lfoHz: 0.09, lfoDepth: 5, filterHz: 350 },
    ],
    noise: { vol: 0.016, filterHz: 420, highpassHz: 90 },
    tickHz: 0.4,
  },
  ash: {
    drones: [{ freq: 42, type: 'sawtooth', vol: 0.008, filterHz: 220 }],
    noise: { vol: 0.03, filterHz: 850, highpassHz: 150 },
  },
  brine: {
    drones: [{ freq: 46, type: 'sine', vol: 0.038, lfoHz: 0.14, lfoDepth: 7, filterHz: 380 }],
    noise: { vol: 0.022, filterHz: 480, highpassHz: 70 },
    dripHz: 0.28,
  },
  vault: {
    drones: [
      { freq: 75, type: 'sine', vol: 0.04, filterHz: 550 },
      { freq: 150, type: 'square', vol: 0.006, lfoHz: 0.05, lfoDepth: 3, filterHz: 400 },
    ],
    tickHz: 0.18,
  },
  fissure: {
    drones: [
      { freq: 52, type: 'sawtooth', vol: 0.011, filterHz: 300 },
      { freq: 104, type: 'sine', vol: 0.028, lfoHz: 0.11, lfoDepth: 6, filterHz: 600 },
    ],
    noise: { vol: 0.018, filterHz: 650, highpassHz: 100 },
  },
  approach: {
    drones: [
      { freq: 60, type: 'sawtooth', vol: 0.01, filterHz: 280 },
      { freq: 120, type: 'sine', vol: 0.03, lfoHz: 0.16, lfoDepth: 8, filterHz: 700 },
    ],
    noise: { vol: 0.018, filterHz: 600, highpassHz: 80 },
    tickHz: 0.15,
  },
  ridge: {
    drones: [
      { freq: 58, type: 'sine', vol: 0.035, filterHz: 450 },
      { freq: 116, type: 'triangle', vol: 0.018, lfoHz: 0.1, lfoDepth: 5, filterHz: 900 },
    ],
  },
};

const TITLE_PRESET: AmbientPreset = {
  drones: [
    { freq: 66, type: 'sine', vol: 0.04, lfoHz: 0.07, lfoDepth: 5, filterHz: 500 },
    { freq: 99, type: 'triangle', vol: 0.015, filterHz: 700 },
  ],
};

class AmbientEngine {
  private voices: Voice[] = [];
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private dripTimer: number | null = null;
  private tickTimer: number | null = null;
  private currentKey: string | null = null;
  private fadeGain: GainNode | null = null;

  startTitle(): void {
    this.setPreset('title', TITLE_PRESET);
  }

  startSector(id: SectorId): void {
    const grammar = layoutForSector(id);
    const merged = mergePreset(PRESETS[id], grammarOverlay(grammar));
    // Key includes grammar so a biome remapped to another shape restarts the bed.
    this.setPreset(`${id}:${grammar}`, merged);
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
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = d.filterHz ?? (d.type === 'sine' ? 800 : 450);
      filter.Q.value = 0.7;
      osc.connect(gain);
      gain.connect(filter);
      filter.connect(this.fadeGain);
      osc.start();

      const voice: Voice = { osc, gain, filter };
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
      let node: AudioNode = src;
      if (preset.noise.highpassHz) {
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = preset.noise.highpassHz;
        src.connect(hp);
        node = hp;
      }
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = preset.noise.filterHz;
      const ng = ctx.createGain();
      ng.gain.value = preset.noise.vol;
      node.connect(filter);
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
    if (preset.tickHz) {
      const interval = 1000 / preset.tickHz;
      this.tickTimer = window.setInterval(() => this.tick(), interval + Math.random() * 700);
    }
  }

  private drip(): void {
    if (audioBus.isMuted() || !this.fadeGain) return;
    const ctx = audioBus.ensure();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200 + Math.random() * 600;
    f.Q.value = 2;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900 + Math.random() * 350, t0);
    osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.14);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.035, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(f);
    f.connect(g);
    g.connect(this.fadeGain);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  }

  /** Sparse conduit / relay ticks — short filtered noise, not melodic. */
  private tick(): void {
    if (audioBus.isMuted() || !this.fadeGain) return;
    const ctx = audioBus.ensure();
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.2);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1400 + Math.random() * 1200;
    f.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.028, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    src.connect(f);
    f.connect(g);
    g.connect(this.fadeGain);
    src.start(t0);
    src.stop(t0 + 0.06);
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
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
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
        v.filter?.disconnect();
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
