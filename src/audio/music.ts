/** Sampled ambient music beds — looping AudioBuffers with crossfades. */

import type { SectorId } from '../data/encounters';
import { layoutForSector, type LayoutKind } from '../map/layoutKind';
import { audioBus } from './bus';

export type MusicMood =
  | 'title'
  | 'field'
  | 'shear'
  | 'critical'
  | 'combat'
  | 'end_win'
  | 'end_lose'
  | 'off';

/** Mirrors ShearPressure dial states — kept local so audio never imports game/. */
export type MusicShearState = 'Calm' | 'Charged' | 'Arcing' | 'Breaching';

/** Mood → file under `public/audio/music/` (Vite `BASE_URL`). */
const BEDS: Record<Exclude<MusicMood, 'off'>, string> = {
  title: 'title.ogg',
  field: 'field.ogg',
  shear: 'shear.ogg',
  critical: 'shear.ogg',
  combat: 'combat.ogg',
  end_win: 'end_win.mp3',
  end_lose: 'end_lose.mp3',
};

/**
 * How the shared field/shear beds are coloured for a biome.
 * Same assets — different rate + band so hatch changes read as a new place.
 */
export type BiomeMusicColor = {
  /** Playback rate (pitch + tempo). */
  rate: number;
  /** Low-pass cutoff Hz. */
  lowpass: number;
  /** High-pass cutoff Hz. */
  highpass: number;
  /** Bed voice gain after filters. */
  gain: number;
  /**
   * When mood is `field`, quietly layer the shear bed underneath (0–1).
   * Makes wet / late / warren shelves feel charged without flipping mood.
   */
  shearUnder: number;
};

const GRAMMAR_COLOR: Record<LayoutKind, BiomeMusicColor> = {
  scatter: { rate: 1.0, lowpass: 3200, highpass: 55, gain: 1, shearUnder: 0 },
  spine: { rate: 1.06, lowpass: 2400, highpass: 70, gain: 1.02, shearUnder: 0.12 },
  hub: { rate: 0.97, lowpass: 2800, highpass: 90, gain: 0.95, shearUnder: 0.08 },
  lattice: { rate: 0.94, lowpass: 1800, highpass: 120, gain: 0.92, shearUnder: 0.15 },
  branch: { rate: 1.08, lowpass: 4200, highpass: 80, gain: 0.98, shearUnder: 0.05 },
  warren: { rate: 0.9, lowpass: 1400, highpass: 45, gain: 0.9, shearUnder: 0.22 },
};

/** Per-sector overrides on top of grammar — flood ≠ plains even in scatter. */
const SECTOR_COLOR: Partial<Record<SectorId, Partial<BiomeMusicColor>>> = {
  plains: { rate: 1.02, lowpass: 3600, highpass: 50, shearUnder: 0 },
  flood: { rate: 0.92, lowpass: 1600, highpass: 40, gain: 0.88, shearUnder: 0.18 },
  canopy: { rate: 1.1, lowpass: 4500, highpass: 100, shearUnder: 0.04 },
  reef: { rate: 1.04, lowpass: 3000, highpass: 70, gain: 0.94, shearUnder: 0.14 },
  spire: { rate: 1.12, lowpass: 3800, highpass: 110, shearUnder: 0.1 },
  ruin: { rate: 0.88, lowpass: 1200, highpass: 55, shearUnder: 0.2 },
  beacon: { rate: 0.98, lowpass: 2600, highpass: 100, shearUnder: 0.1 },
  trench: { rate: 0.91, lowpass: 1500, highpass: 130, shearUnder: 0.18 },
  duct: { rate: 0.93, lowpass: 1700, highpass: 140, gain: 0.9, shearUnder: 0.16 },
  ash: { rate: 0.86, lowpass: 1100, highpass: 40, gain: 0.88, shearUnder: 0.28 },
  brine: { rate: 0.89, lowpass: 1300, highpass: 35, gain: 0.86, shearUnder: 0.25 },
  vault: { rate: 0.96, lowpass: 2200, highpass: 95, shearUnder: 0.12 },
  fissure: { rate: 0.9, lowpass: 1250, highpass: 60, shearUnder: 0.3 },
  approach: { rate: 1.05, lowpass: 2000, highpass: 75, shearUnder: 0.2 },
  ridge: { rate: 1.08, lowpass: 2100, highpass: 85, gain: 1.04, shearUnder: 0.16 },
};

export function biomeMusicColor(sectorId: SectorId): BiomeMusicColor {
  const base = GRAMMAR_COLOR[layoutForSector(sectorId)];
  const over = SECTOR_COLOR[sectorId] ?? {};
  return {
    rate: over.rate ?? base.rate,
    lowpass: over.lowpass ?? base.lowpass,
    highpass: over.highpass ?? base.highpass,
    gain: over.gain ?? base.gain,
    shearUnder: over.shearUnder ?? base.shearUnder,
  };
}

export type FieldMusicOpts = {
  sectorId: SectorId;
  sectorIndex: number;
  playerEnergy: number;
  maxEnergy: number;
  inCombat: boolean;
  /** Shear dial state — Power + EM pressure (not a death clock). */
  shearState?: MusicShearState;
  /** Active ion-front turns remaining. */
  ionFrontTurns?: number;
};

/**
 * Pure bed pick for the field. Combat > Power-critical > shear pressure > field.
 * Shared by MusicEngine and unit tests — no AudioContext required.
 */
export function pickFieldMood(opts: FieldMusicOpts): Exclude<MusicMood, 'off' | 'title' | 'end_win' | 'end_lose'> {
  const energyRatio = opts.playerEnergy / Math.max(1, opts.maxEnergy);
  const shear = opts.shearState ?? 'Calm';
  const ionHot = (opts.ionFrontTurns ?? 0) > 0;

  if (opts.inCombat) return 'combat';
  if (opts.playerEnergy <= 8 || energyRatio <= 0.12 || shear === 'Breaching') {
    return 'critical';
  }
  if (
    opts.playerEnergy <= 20 ||
    energyRatio <= 0.28 ||
    shear === 'Arcing' ||
    shear === 'Charged' ||
    ionHot ||
    opts.sectorIndex >= 10
  ) {
    return 'shear';
  }
  return 'field';
}

/** Stable key so a biome change crossfades even when mood stays `field`. */
export function fieldBedKey(
  mood: Exclude<MusicMood, 'off'>,
  sectorId: SectorId | null,
): string {
  if (mood === 'title' || mood === 'end_win' || mood === 'end_lose' || mood === 'combat') {
    return `${mood}:${BEDS[mood]}`;
  }
  const id = sectorId ?? 'plains';
  const c = biomeMusicColor(id);
  const under = mood === 'field' ? c.shearUnder : 0;
  return `${mood}:${id}:${c.rate.toFixed(3)}:${c.lowpass}:${c.highpass}:${under.toFixed(2)}`;
}

type BedLayer = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  low: BiquadFilterNode;
  high: BiquadFilterNode;
};

type BedVoice = {
  layers: BedLayer[];
  master: GainNode;
};

class MusicEngine {
  private mood: MusicMood = 'off';
  private fadeGain: GainNode | null = null;
  private voice: BedVoice | null = null;
  private currentKey: string | null = null;
  private sectorId: SectorId = 'plains';
  private combatHold = 0;
  private buffers = new Map<string, AudioBuffer>();
  private loadPromise: Promise<void> | null = null;
  private gen = 0;

  setMood(mood: MusicMood, sectorId: SectorId = this.sectorId): void {
    this.sectorId = sectorId;
    const nextKey = mood === 'off' ? null : fieldBedKey(mood, sectorId);
    if (mood === this.mood && nextKey !== null && this.currentKey === nextKey && this.voice) {
      return;
    }

    this.mood = mood;
    if (mood === 'off' || audioBus.isMuted()) {
      this.fadeOut(0.4);
      return;
    }

    const ctx = audioBus.ensure();
    const run = async () => {
      const myGen = ++this.gen;
      await this.ensureLoaded();
      if (myGen !== this.gen || this.mood !== mood || audioBus.isMuted()) return;
      if (ctx.state === 'suspended') await ctx.resume();
      if (myGen !== this.gen || this.mood !== mood) return;
      this.crossfadeTo(mood, sectorId);
      if (mood === 'combat') audioBus.duckAmbient(500);
    };
    void run();
  }

  /**
   * Field sync: combat > Power critical > shear pressure > biome-coloured field.
   * Combat uses multi-turn hysteresis so beds don’t flicker on step-away.
   * Sector changes always recolour / crossfade the bed.
   */
  syncField(opts: FieldMusicOpts): void {
    if (this.mood === 'title' || this.mood === 'end_win' || this.mood === 'end_lose') return;

    this.sectorId = opts.sectorId;
    if (opts.inCombat) this.combatHold = 5;
    else if (this.combatHold > 0) this.combatHold -= 1;

    const mood = pickFieldMood({
      ...opts,
      inCombat: this.combatHold > 0,
    });
    this.setMood(mood, opts.sectorId);
  }

  stop(): void {
    this.combatHold = 0;
    this.setMood('off');
  }

  /** Warm the decode cache from a user gesture. */
  prefetch(): void {
    void this.ensureLoaded();
  }

  /** Test / debug aid — current logical mood. */
  currentMood(): MusicMood {
    return this.mood;
  }

  private bedUrl(file: string): string {
    const base = import.meta.env.BASE_URL ?? './';
    return `${base}audio/music/${file}`;
  }

  private ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    const ctx = audioBus.ensure();
    const files = [...new Set(Object.values(BEDS))];
    this.loadPromise = Promise.all(
      files.map(async (file) => {
        if (this.buffers.has(file)) return;
        const res = await fetch(this.bedUrl(file));
        if (!res.ok) throw new Error(`music bed missing: ${file}`);
        const raw = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(raw.slice(0));
        this.buffers.set(file, buf);
      }),
    )
      .then(() => undefined)
      .catch((err) => {
        this.loadPromise = null;
        console.warn('[music] failed to load beds', err);
      });
    return this.loadPromise;
  }

  private makeLayer(
    ctx: AudioContext,
    file: string,
    color: BiomeMusicColor,
    layerGain: number,
    t: number,
  ): BedLayer | null {
    const buffer = this.buffers.get(file);
    if (!buffer) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = color.rate;

    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = color.highpass;
    high.Q.value = 0.7;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = color.lowpass;
    low.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = Math.max(0.0001, layerGain * color.gain);

    source.connect(high);
    high.connect(low);
    low.connect(gain);
    source.start(t);
    return { source, gain, low, high };
  }

  private crossfadeTo(mood: Exclude<MusicMood, 'off'>, sectorId: SectorId): void {
    const ctx = audioBus.ensure();
    const color = biomeMusicColor(sectorId);
    const file = BEDS[mood];

    if (!this.fadeGain) {
      this.fadeGain = ctx.createGain();
      this.fadeGain.gain.value = 1;
      this.fadeGain.connect(audioBus.channel('music'));
    }

    const t = ctx.currentTime;
    const fade = 1.25;
    const old = this.voice;
    if (old) {
      old.master.gain.cancelScheduledValues(t);
      old.master.gain.setValueAtTime(old.master.gain.value, t);
      old.master.gain.linearRampToValueAtTime(0.0001, t + fade);
      const dying = old;
      window.setTimeout(() => this.teardownVoice(dying), (fade + 0.05) * 1000);
      this.voice = null;
    }

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(1, t + fade);
    master.connect(this.fadeGain);

    const layers: BedLayer[] = [];
    const primary = this.makeLayer(ctx, file, color, 1, t);
    if (primary) {
      primary.gain.connect(master);
      layers.push(primary);
    }

    // Field mood: optional shear underlay coloured for the biome.
    if (mood === 'field' && color.shearUnder > 0.01) {
      const underColor: BiomeMusicColor = {
        ...color,
        rate: color.rate * 0.97,
        lowpass: Math.min(color.lowpass, 1600),
        gain: 1,
      };
      const under = this.makeLayer(ctx, BEDS.shear, underColor, color.shearUnder, t);
      if (under) {
        under.gain.connect(master);
        layers.push(under);
      }
    }

    // Shear / critical: still biome-filter the shared bed so late shelves differ.
    if ((mood === 'shear' || mood === 'critical') && primary) {
      /* colour already applied via makeLayer */
    }

    if (!layers.length) {
      master.disconnect();
      return;
    }

    this.voice = { layers, master };
    this.currentKey = fieldBedKey(mood, sectorId);
  }

  private teardownVoice(voice: BedVoice): void {
    for (const layer of voice.layers) {
      try {
        layer.source.stop();
      } catch {
        /* already stopped */
      }
      layer.source.disconnect();
      layer.high.disconnect();
      layer.low.disconnect();
      layer.gain.disconnect();
    }
    voice.master.disconnect();
  }

  private fadeOut(fadeSec: number): void {
    this.gen++;
    const ctx = this.fadeGain ? audioBus.ensure() : null;
    const t = ctx?.currentTime ?? 0;
    const old = this.voice;
    const bus = this.fadeGain;
    this.voice = null;
    this.currentKey = null;
    this.fadeGain = null;
    if (old && ctx) {
      old.master.gain.cancelScheduledValues(t);
      old.master.gain.setValueAtTime(old.master.gain.value, t);
      old.master.gain.linearRampToValueAtTime(0.0001, t + fadeSec);
    }
    window.setTimeout(() => {
      if (old) this.teardownVoice(old);
      bus?.disconnect();
    }, (fadeSec + 0.05) * 1000);
  }
}

export const music = new MusicEngine();
