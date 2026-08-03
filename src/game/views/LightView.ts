import Phaser from 'phaser';
import type { GameState, TileKind } from '../../sim/types';
import { fovDistance } from '../../sim/fov';
import { isQuietStance } from '../../sim/mechanics/quietStance';
import { BIOME_AMBIENT, BIOME_FLOOR_TINT, Theme } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';

export type LightSource = {
  x: number;
  y: number;
  /** Falloff radius in tiles (Euclidean). */
  radius: number;
  /** Phaser tint color. */
  color: number;
  /** Peak contribution 0–1. */
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

function falloff(dist: number, radius: number): number {
  if (radius <= 0) return 0;
  if (dist >= radius) return 0;
  const t = 1 - dist / radius;
  return t * t;
}

/**
 * Field lighting — ambient biome + world/FX sources applied via tint/alpha.
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

  /** Soft bloom discs at light positions (scrolls with map layer). */
  drawBloom(sources: LightSource[], visible: boolean[][]): void {
    this.lightsGfx.clear();
    for (const s of sources) {
      const row = visible[s.y];
      if (!row?.[s.x]) continue;
      const wx = s.x * TILE_DRAW + TILE_DRAW / 2;
      const wy = s.y * TILE_DRAW + TILE_DRAW / 2;
      const r = Math.max(8, s.radius * TILE_DRAW * 0.55);
      const a = Math.min(0.22, 0.08 + s.intensity * 0.14);
      this.lightsGfx.fillStyle(s.color, a);
      this.lightsGfx.fillCircle(wx, wy, r);
      this.lightsGfx.fillStyle(s.color, a * 0.45);
      this.lightsGfx.fillCircle(wx, wy, r * 0.45);
    }
  }

  collectWorldSources(st: GameState, animFrame: number): LightSource[] {
    const sources: LightSource[] = [];
    if (st.status === 'playing') {
      let radius = 3.5;
      let intensity = 0.72;
      if (st.player.probeTurns > 0 || st.player.lensTurns > 0) {
        radius = 5.5;
        intensity = 0.85;
      }
      if (isQuietStance(st)) {
        radius = Math.max(2.5, radius - 1);
        intensity *= 0.85;
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
          radius: 2.2,
          color: 0xcc88ff,
          intensity: 0.35 + (st.patternDesync % 2) * 0.2,
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
          radius: 2,
          color: 0xb088ff,
          intensity: 0.55,
        });
      } else if (item.kind === 'relay_key') {
        sources.push({
          x: item.x,
          y: item.y,
          radius: 2,
          color: 0x9999ff,
          intensity: 0.45,
        });
      }
    }

    if (st.objectives.hasNavCore) {
      sources.push({
        x: st.player.x,
        y: st.player.y,
        radius: 2,
        color: 0xb088ff,
        intensity: 0.4,
      });
    }

    if (st.handshake?.active) {
      sources.push({
        x: st.player.x,
        y: st.player.y,
        radius: 4.5,
        color: Theme.storm,
        intensity: 0.7 + (st.handshake.progress % 2) * 0.15,
      });
    }

    return sources;
  }

  /** Cap weakest FX when total exceeds budget (world lights kept). */
  private trimSources(): void {
    if (this.fx.length <= MAX_SOURCES) return;
    this.fx.sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0));
    this.fx = this.fx.slice(0, MAX_SOURCES);
  }

  allSources(st: GameState, animFrame: number): LightSource[] {
    const world = this.collectWorldSources(st, animFrame);
    const combined = [...world, ...this.fx];
    if (combined.length <= MAX_SOURCES) return combined;
    // Prefer player + strong world lights; drop weakest FX first
    const permanent = world;
    const fxSorted = [...this.fx].sort((a, b) => b.intensity - a.intensity);
    const room = Math.max(0, MAX_SOURCES - permanent.length);
    return [...permanent, ...fxSorted.slice(0, room)];
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

        let brightness = biome.ambient;
        let colorPull = 0;
        let colorAcc = ambientTint;
        for (const s of sources) {
          const d = fovDistance(s.x, s.y, x, y);
          const f = falloff(d, s.radius) * s.intensity;
          if (f <= 0) continue;
          brightness += f;
          colorPull += f;
          colorAcc = multiplyTint(colorAcc, s.color, Math.min(1, f * 1.2));
        }
        brightness = Math.min(1, brightness);

        const isTerrain = kind === 'floor' || kind === 'scrub' || kind === 'rubble';
        let tint = isTerrain ? floorTint : 0xffffff;
        tint = multiplyTint(tint, ambientTint, 0.35);
        if (colorPull > 0.05) {
          tint = multiplyTint(tint, colorAcc, Math.min(0.55, colorPull * 0.5));
        }
        tint = blendTowardWhite(tint, brightness * 0.22);
        img.setTint(tint);
        img.setAlpha(0.4 + 0.6 * brightness);
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
      let brightness = biome.ambient;
      for (const s of sources) {
        brightness += falloff(fovDistance(s.x, s.y, x, y), s.radius) * s.intensity;
      }
      return 0.55 + 0.45 * Math.min(1, brightness);
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
      return { radius: 4, color: Theme.storm, intensity: 0.75 * pulse };
    case 'shuttle':
      return { radius: 5, color: 0xffcc66, intensity: 0.7 };
    case 'exit':
      return { radius: 2, color: 0x66aa88, intensity: 0.45 };
    case 'poi':
      return { radius: 2.5, color: Theme.quest, intensity: 0.5 * pulse };
    case 'hazard':
    case 'vent':
      return { radius: 2, color: Theme.ionHazard, intensity: 0.4 * pulse };
    default:
      return null;
  }
}
