/** Sampled ambient music beds — looping AudioBuffers with crossfades. */

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

/** Mood → file under `public/audio/music/` (Vite `BASE_URL`). */
const BEDS: Record<Exclude<MusicMood, 'off'>, string> = {
  title: 'title.ogg',
  field: 'field.ogg',
  storm: 'storm.ogg',
  critical: 'storm.ogg',
  combat: 'combat.ogg',
  end_win: 'end_win.mp3',
  end_lose: 'end_lose.mp3',
};

type BedVoice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

class MusicEngine {
  private mood: MusicMood = 'off';
  private fadeGain: GainNode | null = null;
  private voice: BedVoice | null = null;
  private currentFile: string | null = null;
  private currentSector: SectorId = 'plains';
  private combatHold = 0;
  private buffers = new Map<string, AudioBuffer>();
  private loadPromise: Promise<void> | null = null;
  private gen = 0;

  setMood(mood: MusicMood): void {
    if (mood === this.mood && (mood === 'off' || this.voice)) return;

    const nextFile = mood === 'off' ? null : BEDS[mood];
    // storm ↔ critical share a bed — don't restart the loop.
    if (
      mood !== 'off' &&
      nextFile !== null &&
      this.voice &&
      this.currentFile === nextFile
    ) {
      this.mood = mood;
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
      this.crossfadeTo(mood);
      if (mood === 'combat') audioBus.duckAmbient(500);
    };
    void run();
  }

  /**
   * Field sync: combat > storm critical/storm > biome field bed.
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

  /** Warm the decode cache from a user gesture. */
  prefetch(): void {
    void this.ensureLoaded();
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

  private crossfadeTo(mood: Exclude<MusicMood, 'off'>): void {
    const ctx = audioBus.ensure();
    const file = BEDS[mood];
    const buffer = this.buffers.get(file);
    if (!buffer) return;

    if (!this.fadeGain) {
      this.fadeGain = ctx.createGain();
      this.fadeGain.gain.value = 1;
      this.fadeGain.connect(audioBus.channel('music'));
    }

    const t = ctx.currentTime;
    const fade = 1.1;
    const old = this.voice;
    if (old) {
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
      const dying = old;
      window.setTimeout(() => {
        try {
          dying.source.stop();
        } catch {
          /* already stopped */
        }
        dying.source.disconnect();
        dying.gain.disconnect();
      }, (fade + 0.05) * 1000);
      this.voice = null;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(1, t + fade);
    source.connect(gain);
    gain.connect(this.fadeGain);
    source.start(t);
    this.voice = { source, gain };
    this.currentFile = file;
  }

  private fadeOut(fadeSec: number): void {
    this.gen++;
    const ctx = this.fadeGain ? audioBus.ensure() : null;
    const t = ctx?.currentTime ?? 0;
    const old = this.voice;
    const bus = this.fadeGain;
    this.voice = null;
    this.currentFile = null;
    this.fadeGain = null;
    if (old && ctx) {
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0.0001, t + fadeSec);
    }
    window.setTimeout(() => {
      if (old) {
        try {
          old.source.stop();
        } catch {
          /* ignore */
        }
        old.source.disconnect();
        old.gain.disconnect();
      }
      bus?.disconnect();
    }, (fadeSec + 0.05) * 1000);
  }
}

export const music = new MusicEngine();
