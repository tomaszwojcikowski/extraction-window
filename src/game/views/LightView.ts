import Phaser from 'phaser';
import type { GameState, TileKind } from '../../sim/types';
import { isQuietStance } from '../../sim/mechanics/quietStance';
import { BIOME_AMBIENT, BIOME_FLOOR_TINT, Theme } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';
import { accumulateLight, irradiance, toneMap } from './lightPhysics';

export type LightSource = {
  x: number;
  y: number;
  /** Soft clip radius in tiles (Euclidean). */
  radius: number;
  /** Phaser tint color (spectral tint of the emitter). */
  color: number;
  /** Peak luminous intensity (relative). */
  intensity: number;
  /** Turns remaining; omit for permanent world lights. */
  life?: number;
};

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

/**
 * Field lighting — inverse-square + LOS occlusion via tint/alpha.
 * Presentation-only; respects FOV (no light in fog; memory stays dim).
 */
export class LightView {
  private fx: LightSource[] = [];
  private lastTurn = -1;
  private readonly lightsGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.lightsGfx = scene.add.graphics();
    this.lightsGfx.setDepth(2);
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

  /** Decay turn-lived FX when the sim turn advances. */
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

  /**
   * Bloom discs sized by inverse-square core — brighter near the emitter.
   * Only drawn for visible tiles (no fog reveal).
   */
  drawBloom(sources: LightSource[], visible: boolean[][]): void {
    this.lightsGfx.clear();
    for (const s of sources) {
      const row = visible[s.y];
      if (!row?.[s.x]) continue;
      const wx = s.x * TILE_DRAW + TILE_DRAW / 2;
      const wy = s.y * TILE_DRAW + TILE_DRAW / 2;
      // Core radius from near-field strength; outer halo from soft clip radius
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

  collectWorldSources(st: GameState, animFrame: number): LightSource[] {
    const sources: LightSource[] = [];
    if (st.status === 'playing') {
      let radius = 4.2;
      let intensity = 1.1;
      if (st.player.probeTurns > 0 || st.player.lensTurns > 0) {
        radius = 6.5;
        intensity = 1.45;
      }
      if (isQuietStance(st)) {
        radius = Math.max(2.8, radius - 1.2);
        intensity *= 0.75;
      }
      sources.push({
        x: st.player.x,
        y: st.player.y,
        radius,
        color: 0xffd0a0,
        intensity,
      });
      if (st.patternDesync > 0) {
        sources.push({
          x: st.player.x,
          y: st.player.y,
          radius: 2.5,
          color: 0xcc88ff,
          intensity: 0.55 + (st.patternDesync % 2) * 0.25,
        });
      }
    }

    const pulse = 0.85 + (animFrame % 3) * 0.08;
    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        if (!st.explored[y]![x]) continue;
        const kind = st.tiles[y]![x]!.kind;
        const light = tileLight(kind, pulse);
        if (light) sources.push({ x, y, ...light });
      }
    }

    for (const item of st.items) {
      if (item.kind === 'nav_core') {
        sources.push({
          x: item.x,
          y: item.y,
          radius: 2.5,
          color: 0xb088ff,
          intensity: 0.85,
        });
      } else if (item.kind === 'relay_key') {
        sources.push({
          x: item.x,
          y: item.y,
          radius: 2.2,
          color: 0x9999ff,
          intensity: 0.7,
        });
      }
    }

    if (st.objectives.hasNavCore) {
      sources.push({
        x: st.player.x,
        y: st.player.y,
        radius: 2.4,
        color: 0xb088ff,
        intensity: 0.65,
      });
    }

    if (st.handshake?.active) {
      const hx = st.beaconPos?.x ?? st.player.x;
      const hy = st.beaconPos?.y ?? st.player.y;
      sources.push({
        x: hx,
        y: hy,
        radius: 5,
        color: Theme.storm,
        intensity: 1.1 + (st.handshake.progress % 2) * 0.2,
      });
    }

    return sources;
  }

  private trimSources(): void {
    if (this.fx.length <= MAX_SOURCES) return;
    this.fx.sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0));
    this.fx = this.fx.slice(0, MAX_SOURCES);
  }

  allSources(st: GameState, animFrame: number): LightSource[] {
    const world = this.collectWorldSources(st, animFrame);
    const combined = [...world, ...this.fx];
    if (combined.length <= MAX_SOURCES) return combined;
    const permanent = world;
    const fxSorted = [...this.fx].sort((a, b) => b.intensity - a.intensity);
    const room = Math.max(0, MAX_SOURCES - permanent.length);
    return [...permanent, ...fxSorted.slice(0, room)];
  }

  private sampleHdr(
    st: GameState,
    x: number,
    y: number,
    sources: LightSource[],
  ): { hdr: number; colorAcc: number; colorPull: number } {
    let hdr = 0;
    let colorPull = 0;
    let colorAcc = BIOME_AMBIENT[st.sectorId].tint;
    for (const s of sources) {
      const E = accumulateLight(st.tiles, s.x, s.y, x, y, s.radius, s.intensity);
      if (E <= 0.001) continue;
      hdr += E;
      colorPull += E;
      colorAcc = multiplyTint(colorAcc, s.color, Math.min(1, E * 0.9));
    }
    return { hdr, colorAcc, colorPull };
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

        const { hdr, colorAcc, colorPull } = this.sampleHdr(st, x, y, sources);
        // Ambient as base luminous exitance + direct irradiance
        const brightness = toneMap(biome.ambient * 0.85 + hdr);

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
    sources: LightSource[],
  ): void {
    const biome = BIOME_AMBIENT[st.sectorId];
    const litAlpha = (x: number, y: number): number => {
      if (!st.visible[y]?.[x]) return 0;
      let hdr = biome.ambient * 0.85;
      for (const s of sources) {
        hdr += accumulateLight(st.tiles, s.x, s.y, x, y, s.radius, s.intensity);
      }
      return 0.5 + 0.5 * toneMap(hdr);
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

function tileLight(
  kind: TileKind,
  pulse: number,
): Omit<LightSource, 'x' | 'y'> | null {
  switch (kind) {
    case 'beacon':
      return { radius: 5, color: Theme.storm, intensity: 1.2 * pulse };
    case 'shuttle':
      return { radius: 6, color: 0xffcc66, intensity: 1.15 };
    case 'exit':
      return { radius: 2.5, color: 0x66aa88, intensity: 0.7 };
    case 'poi':
      return { radius: 3, color: Theme.quest, intensity: 0.8 * pulse };
    case 'hazard':
    case 'vent':
      return { radius: 2.4, color: Theme.ionHazard, intensity: 0.65 * pulse };
    default:
      return null;
  }
}

// Re-export for tests / bloom tuning
export { irradiance };
