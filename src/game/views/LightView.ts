import Phaser from 'phaser';
import type { FieldLightSource, GameState } from '../../sim/types';
import {
  accumulateLight,
  collectLightSources,
  tileBrightness,
  toneMap,
} from '../../sim/light';
import { BIOME_AMBIENT, BIOME_FLOOR_TINT, Theme } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';

export type LightSource = FieldLightSource & { color: number };

const MAX_SOURCES = 12;

function multiplyTint(base: number, light: number, amount: number): number {
  const br = (base >> 16) & 0xff;
  const bg = (base >> 8) & 0xff;
  const bb = base & 0xff;
  const lr = (light >> 16) & 0xff;
  const lg = (light >> 8) & 0xff;
  const lb = light & 0xff;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(br * (1 - t) + ((br * lr) / 255) * t);
  const g = Math.round(bg * (1 - t) + ((bg * lg) / 255) * t);
  const b = Math.round(bb * (1 - t) + ((bb * lb) / 255) * t);
  return (r << 16) | (g << 8) | b;
}

function blendTowardWhite(base: number, amount: number): number {
  const br = (base >> 16) & 0xff;
  const bg = (base >> 8) & 0xff;
  const bb = base & 0xff;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(br + (255 - br) * t);
  const g = Math.round(bg + (255 - bg) * t);
  const b = Math.round(bb + (255 - bb) * t);
  return (r << 16) | (g << 8) | b;
}

function withColor(s: FieldLightSource, fallback = 0xffd0a0): LightSource {
  return { ...s, color: s.color ?? fallback };
}

/**
 * Field lighting — draws from sim illumination grid + shared emitters.
 * FOV still gates fog; brightness matches gameplay `isLit` / lamp quiet dim.
 */
export class LightView {
  private fx: LightSource[] = [];
  private lastTurn = -1;
  private readonly lightsGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.lightsGfx = scene.add.graphics();
    this.lightsGfx.setDepth(1);
    parent.add(this.lightsGfx);
  }

  destroy(): void {
    this.fx = [];
    this.lightsGfx.destroy();
  }

  clearFx(): void {
    this.fx = [];
  }

  addFxLight(src: LightSource): void {
    this.fx.push({ ...src });
    this.trimSources();
  }

  /** Keep presentation FX in sync with turn; sim owns flare life separately. */
  syncTurn(turn: number): void {
    if (this.lastTurn < 0) {
      this.lastTurn = turn;
      return;
    }
    if (turn === this.lastTurn) return;
    const steps = Math.max(1, turn - this.lastTurn);
    this.lastTurn = turn;
    const next: LightSource[] = [];
    for (const s of this.fx) {
      if (s.life === undefined) {
        next.push(s);
        continue;
      }
      const life = s.life - steps;
      if (life > 0) next.push({ ...s, life });
    }
    this.fx = next;
  }

  drawBloom(sources: LightSource[], visible: boolean[][]): void {
    this.lightsGfx.clear();
    for (const s of sources) {
      const row = visible[s.y];
      if (!row?.[s.x]) continue;
      const wx = s.x * TILE_DRAW + TILE_DRAW / 2;
      const wy = s.y * TILE_DRAW + TILE_DRAW / 2;
      const core = Math.max(6, TILE_DRAW * 0.55 * Math.sqrt(s.intensity));
      const halo = Math.max(core + 4, s.radius * TILE_DRAW * 0.4);
      const aCore = Math.min(0.28, 0.1 + s.intensity * 0.18);
      const aHalo = aCore * 0.35;
      this.lightsGfx.fillStyle(s.color, aHalo);
      this.lightsGfx.fillCircle(wx, wy, halo);
      this.lightsGfx.fillStyle(s.color, aCore);
      this.lightsGfx.fillCircle(wx, wy, core);
    }
  }

  /**
   * Bloom sources: sim emitters (lamp/quiet/flare/world) + brief presentation FX.
   */
  allSources(st: GameState, animFrame: number): LightSource[] {
    const pulse = 0.85 + (animFrame % 3) * 0.08;
    const sim = collectLightSources(st).map((s) => {
      const colored = withColor(s);
      // Soft pulse on hazard/quest radiators that have no life
      if (s.life === undefined && (s.color === Theme.ionHazard || s.color === Theme.quest || s.color === Theme.storm)) {
        return { ...colored, intensity: colored.intensity * pulse };
      }
      return colored;
    });

    for (const en of st.enemies) {
      if (!en.alive || en.tier !== 'boss') continue;
      sim.push({
        x: en.x,
        y: en.y,
        radius: 3.2,
        color: Theme.danger,
        intensity: 0.75 * pulse,
      });
    }

    if (st.patternDesync > 0) {
      sim.push({
        x: st.player.x,
        y: st.player.y,
        radius: 2.5,
        color: 0xcc88ff,
        intensity: 0.55 + (st.patternDesync % 2) * 0.25,
      });
    }

    const combined = [...sim, ...this.fx];
    if (combined.length <= MAX_SOURCES) return combined;
    const fxSorted = [...this.fx].sort((a, b) => b.intensity - a.intensity);
    const room = Math.max(0, MAX_SOURCES - sim.length);
    return [...sim.slice(0, MAX_SOURCES), ...fxSorted.slice(0, room)].slice(0, MAX_SOURCES);
  }

  private trimSources(): void {
    if (this.fx.length <= MAX_SOURCES) return;
    this.fx.sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0));
    this.fx = this.fx.slice(0, MAX_SOURCES);
  }

  private sampleColor(
    st: GameState,
    x: number,
    y: number,
    sources: LightSource[],
  ): { colorAcc: number; colorPull: number } {
    let colorPull = 0;
    let colorAcc = BIOME_AMBIENT[st.sectorId].tint;
    for (const s of sources) {
      const E = accumulateLight(st.tiles, s.x, s.y, x, y, s.radius, s.intensity);
      if (E <= 0.001) continue;
      colorPull += E;
      colorAcc = multiplyTint(colorAcc, s.color, Math.min(1, E * 0.9));
    }
    return { colorAcc, colorPull };
  }

  applyTileLighting(
    st: GameState,
    tileSprites: Phaser.GameObjects.Image[][],
    tileKey: (kind: string, x: number, y: number) => string,
    sources: LightSource[],
  ): void {
    const biome = BIOME_AMBIENT[st.sectorId];
    const floorTint = BIOME_FLOOR_TINT[st.sectorId];
    const ambientTint = biome.tint;

    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const img = tileSprites[y]![x]!;
        const kind = st.tiles[y]![x]!.kind;
        if (!st.explored[y]![x]) {
          img.setTexture('t_fog');
          img.clearTint();
          img.setAlpha(1);
          continue;
        }

        img.setTexture(tileKey(kind, x, y));
        if (!st.visible[y]![x]) {
          img.setTint(Theme.memory);
          img.setAlpha(0.32);
          continue;
        }

        // Prefer sim illumination grid so quiet/flare/EM match gameplay
        const brightness =
          st.illumination?.[y]?.[x] !== undefined
            ? tileBrightness(st, x, y)
            : toneMap(biome.ambient * 0.85);
        const { colorAcc, colorPull } = this.sampleColor(st, x, y, sources);

        const isTerrain = kind === 'floor' || kind === 'scrub' || kind === 'rubble';
        let tint = isTerrain ? floorTint : 0xffffff;
        tint = multiplyTint(tint, ambientTint, 0.35);
        if (colorPull > 0.04) {
          tint = multiplyTint(tint, colorAcc, Math.min(0.6, colorPull * 0.45));
        }
        tint = blendTowardWhite(tint, brightness * 0.28);
        img.setTint(tint);
        img.setAlpha(0.38 + 0.62 * brightness);
      }
    }
  }

  applyActorLighting(
    st: GameState,
    playerSprite: Phaser.GameObjects.Image,
    enemyViews: Iterable<{ img: Phaser.GameObjects.Image; gx: number; gy: number }>,
    _sources: LightSource[],
  ): void {
    const litAlpha = (x: number, y: number): number => {
      if (!st.visible[y]?.[x]) return 0;
      return 0.5 + 0.5 * tileBrightness(st, x, y);
    };

    playerSprite.setAlpha(litAlpha(st.player.x, st.player.y));
    if (st.patternDesync > 0) {
      playerSprite.setTint(0xddaaee);
    } else {
      playerSprite.clearTint();
    }

    for (const view of enemyViews) {
      if (!view.img.visible) continue;
      view.img.setAlpha(litAlpha(view.gx, view.gy));
    }
  }
}

// Re-export for bloom tuning / tests
export { irradiance } from '../../sim/light';
