import Phaser from 'phaser';
import type { FieldLightSource, GameState } from '../../sim/types';
import {
  accumulateLight,
  collectLightSources,
  irradiance,
  SHADOW_THRESHOLD,
  tileBrightness,
  toneMap,
} from '../../sim/light';
import { BIOME_AMBIENT, BIOME_FLOOR_TINT, LightTemp, Theme } from '../../scenes/theme';
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

function withColor(s: FieldLightSource, fallback = LightTemp.lamp): LightSource {
  return { ...s, color: s.color ?? fallback };
}

/**
 * Field lighting — draws from the sim illumination grid + shared emitters.
 *
 * Three physical claims this view has to sell:
 *  1. light has a *glow* — Phaser PointLights (engine soft radial falloff);
 *     tile tint from Dijkstra flood keeps walls honest in gameplay brightness;
 *  2. light comes *from* somewhere — actors drop a contact shadow away from
 *     whichever emitter is actually brightest on their tile;
 *  3. light *arrives* — sector entry sweeps in behind a front (`applySweep`)
 *     and a flare has an ignition beat (`ignite`) instead of a state change.
 *
 * FOV still gates fog; brightness still matches gameplay `isLit` / quiet dim.
 */
export class LightView {
  private fx: LightSource[] = [];
  private lastTurn = -1;
  private readonly scene: Phaser.Scene;
  private readonly lightParent: Phaser.GameObjects.Container;
  /** Soft bloom via Phaser PointLight (WebGL), pooled per visible emitter. */
  private pointLights: Phaser.GameObjects.PointLight[] = [];
  /** Brief ignition flares still drawn with Graphics. */
  private readonly lightsGfx: Phaser.GameObjects.Graphics;
  private readonly shadowGfx: Phaser.GameObjects.Graphics | null;
  /** Cached per-tile presentation so sweeps/gates avoid a full relight. */
  private alphaGrid: number[][] = [];
  private tintGrid: number[][] = [];

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    shadowParent?: Phaser.GameObjects.Container,
  ) {
    this.scene = scene;
    this.lightParent = parent;
    this.lightsGfx = scene.add.graphics();
    this.lightsGfx.setDepth(1);
    this.lightsGfx.setBlendMode(Phaser.BlendModes.ADD);
    parent.add(this.lightsGfx);
    if (shadowParent) {
      this.shadowGfx = scene.add.graphics();
      shadowParent.add(this.shadowGfx);
    } else {
      this.shadowGfx = null;
    }
  }

  destroy(): void {
    this.fx = [];
    for (const pl of this.pointLights) pl.destroy();
    this.pointLights = [];
    this.lightsGfx.destroy();
    this.shadowGfx?.destroy();
  }

  clearFx(): void {
    this.fx = [];
    this.alphaGrid = [];
    this.tintGrid = [];
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

  /**
   * Soft bloom via Phaser PointLights — established engine radial falloff.
   * Wall occlusion for gameplay stays on the Dijkstra illumination grid;
   * PointLights sell the glow without custom ray-march shells.
   */
  drawBloom(
    sources: LightSource[],
    visible: boolean[][],
    _tiles?: GameState['tiles'],
  ): void {
    this.lightsGfx.clear();
    let used = 0;
    for (const s of sources) {
      const row = visible[s.y];
      if (!row?.[s.x]) continue;
      const wx = s.x * TILE_DRAW + TILE_DRAW / 2;
      const wy = s.y * TILE_DRAW + TILE_DRAW / 2;
      const personal =
        s.color === LightTemp.lamp || s.color === LightTemp.lampQuiet;
      const radiusPx = s.radius * TILE_DRAW * (personal ? 0.92 : 1.05);
      const intensity = personal
        ? Math.min(0.48, 0.18 + s.intensity * 0.22)
        : Math.min(0.95, 0.28 + s.intensity * 0.4);
      const attenuation = personal ? 0.14 : 0.09;

      let pl = this.pointLights[used];
      if (!pl) {
        pl = this.scene.add.pointlight(wx, wy, s.color, radiusPx, intensity, attenuation);
        pl.setBlendMode(Phaser.BlendModes.ADD);
        this.lightParent.add(pl);
        this.pointLights.push(pl);
      } else {
        pl.setPosition(wx, wy);
        pl.radius = radiusPx;
        pl.intensity = intensity;
        pl.attenuation = attenuation;
        const r = (s.color >> 16) & 0xff;
        const g = (s.color >> 8) & 0xff;
        const b = s.color & 0xff;
        pl.color.setTo(r, g, b);
        pl.setVisible(true);
      }
      used++;
    }
    for (let i = used; i < this.pointLights.length; i++) {
      this.pointLights[i]!.setVisible(false);
    }
  }

  /**
   * Contact shadows. Each actor is shaded away from the brightest emitter on
   * its tile — silhouette first, so a threat's shadow arrives before its sprite.
   */
  drawContactShadows(
    st: GameState,
    actors: Iterable<{ gx: number; gy: number; tall?: boolean }>,
    sources: LightSource[],
  ): void {
    const g = this.shadowGfx;
    if (!g) return;
    g.clear();
    for (const actor of actors) {
      const { gx, gy } = actor;
      if (!st.visible[gy]?.[gx]) continue;
      const brightness = tileBrightness(st, gx, gy);
      if (brightness < 0.06) continue;

      let vx = 0;
      let vy = 0;
      let key = 0;
      for (const s of sources) {
        const dist = Math.hypot(gx - s.x, gy - s.y);
        // A lamp on your own tile lights you from every side: no cast, just contact.
        if (dist < 0.75) continue;
        const E = irradiance(dist, s.radius, s.intensity);
        if (E <= 0.004) continue;
        vx += ((gx - s.x) / dist) * E;
        vy += ((gy - s.y) / dist) * E;
        key = Math.max(key, E);
      }
      const wx = gx * TILE_DRAW + TILE_DRAW / 2;
      const wy = gy * TILE_DRAW + TILE_DRAW / 2 + TILE_DRAW * 0.28;
      const alpha = Math.min(0.5, 0.12 + brightness * 0.4);

      const len = Math.hypot(vx, vy);
      if (key > 0.05 && len > 0.0001) {
        // Cast body: a tapering silhouette thrown away from the key light.
        const dirX = vx / len;
        const dirY = vy / len;
        const throwLen =
          TILE_DRAW * (0.25 + Math.min(0.6, key * 0.5)) * (actor.tall ? 1.3 : 1);
        const px = -dirY;
        const py = dirX;
        const halfNear = TILE_DRAW * 0.19;
        const halfFar = TILE_DRAW * 0.09;
        const fx = wx + dirX * throwLen;
        const fy = wy + dirY * throwLen * 0.6;
        g.fillStyle(Theme.groundDeep, alpha * 0.75);
        g.fillPoints(
          [
            new Phaser.Math.Vector2(wx + px * halfNear, wy + py * halfNear),
            new Phaser.Math.Vector2(wx - px * halfNear, wy - py * halfNear),
            new Phaser.Math.Vector2(fx - px * halfFar, fy - py * halfFar),
            new Phaser.Math.Vector2(fx + px * halfFar, fy + py * halfFar),
          ],
          true,
        );
      }
      // Contact patch — darkest right under the feet.
      g.fillStyle(Theme.groundDeep, alpha);
      g.fillEllipse(wx, wy, TILE_DRAW * 0.44, TILE_DRAW * 0.18);
    }
  }

  /**
   * Flare / beacon ignition beat: a hard-edged front leaving the source, plus
   * a bloom-out. Matches `irradiance()`'s windowed falloff rather than a fade.
   */
  ignite(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    radiusTiles: number,
    color: number,
  ): void {
    const g = scene.add.graphics();
    g.setBlendMode(Phaser.BlendModes.ADD);
    parent.add(g);
    const wx = x * TILE_DRAW + TILE_DRAW / 2;
    const wy = y * TILE_DRAW + TILE_DRAW / 2;
    const maxR = radiusTiles * TILE_DRAW;
    const state = { t: 0 };
    scene.tweens.add({
      targets: state,
      t: 1,
      duration: 420,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const t = state.t;
        const r = maxR * t;
        g.clear();
        // Hard front — the moment the room changes.
        g.lineStyle(Math.max(1, 4 * (1 - t)), blendTowardWhite(color, 0.6), 1 - t);
        g.strokeCircle(wx, wy, r);
        g.lineStyle(1, color, (1 - t) * 0.7);
        g.strokeCircle(wx, wy, r * 0.72);
        // Chemical core burning down.
        g.fillStyle(blendTowardWhite(color, 0.75), Math.max(0, 0.9 - t * 1.1));
        g.fillCircle(wx, wy, TILE_DRAW * 0.5 * (1 - t * 0.4));
      },
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Bloom sources: sim emitters (lamp/quiet/flare/world) + brief presentation FX.
   */
  allSources(st: GameState, animFrame: number): LightSource[] {
    const pulse = 0.85 + (animFrame % 3) * 0.08;
    const sim = collectLightSources(st).map((s) => {
      const colored = withColor(s);
      // Living / unstable emitters breathe; engineered ones hold steady.
      if (
        s.life === undefined &&
        (s.color === LightTemp.fauna || s.color === LightTemp.marker || s.color === LightTemp.beacon)
      ) {
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
        color: Theme.rust,
        intensity: 0.75 * pulse,
      });
    }

    if (st.patternDesync > 0) {
      sim.push({
        x: st.player.x,
        y: st.player.y,
        radius: 2.5,
        color: LightTemp.pattern,
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

  /** Blocking neighbours — cheap ambient occlusion where floor meets wall. */
  private contactOcclusion(st: GameState, x: number, y: number): number {
    let blocked = 0;
    if (st.tiles[y - 1]?.[x]?.transparent === false) blocked++;
    if (st.tiles[y + 1]?.[x]?.transparent === false) blocked++;
    if (st.tiles[y]?.[x - 1]?.transparent === false) blocked++;
    if (st.tiles[y]?.[x + 1]?.transparent === false) blocked++;
    return blocked;
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
    if (this.alphaGrid.length !== st.height) {
      this.alphaGrid = Array.from({ length: st.height }, () => new Array<number>(st.width).fill(0));
      this.tintGrid = Array.from({ length: st.height }, () => new Array<number>(st.width).fill(0));
    }

    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const img = tileSprites[y]![x]!;
        const kind = st.tiles[y]![x]!.kind;
        if (!st.explored[y]![x]) {
          img.setTexture('t_fog');
          img.clearTint();
          img.setAlpha(1);
          this.alphaGrid[y]![x] = 1;
          this.tintGrid[y]![x] = 0xffffff;
          continue;
        }

        img.setTexture(tileKey(kind, x, y));
        if (!st.visible[y]![x]) {
          // Survey memory is cold, flat and clearly *remembered*, not lit.
          img.setTint(Theme.memory);
          img.setAlpha(0.26);
          this.alphaGrid[y]![x] = 0.26;
          this.tintGrid[y]![x] = Theme.memory;
          continue;
        }

        // Prefer sim illumination grid so quiet/flare/EM match gameplay
        const brightness =
          st.illumination?.[y]?.[x] !== undefined
            ? tileBrightness(st, x, y)
            : toneMap(biome.ambient * 0.85);
        const { colorAcc, colorPull } = this.sampleColor(st, x, y, sources);

        const isTerrain =
          kind === 'floor' ||
          kind === 'scrub' ||
          kind === 'scrub_nest' ||
          kind === 'rubble' ||
          kind === 'tripwire';
        let tint = isTerrain ? floorTint : 0xffffff;
        tint = multiplyTint(tint, ambientTint, 0.28);
        if (colorPull > 0.04) {
          tint = multiplyTint(tint, colorAcc, Math.min(0.78, colorPull * 0.62));
        }
        if (brightness < SHADOW_THRESHOLD) {
          // The shadow band the ambush AI actually reads: cold and drained.
          tint = multiplyTint(tint, 0x5a7080, 0.62 * (1 - brightness / SHADOW_THRESHOLD));
        }
        tint = blendTowardWhite(tint, Math.pow(brightness, 1.3) * 0.55);

        const occlusion = 1 - this.contactOcclusion(st, x, y) * 0.05;
        // Steeper than linear: unlit floor recedes, lit floor reads as surface.
        const alpha = Math.min(1, (0.13 + 0.87 * Math.pow(brightness, 0.7)) * occlusion);
        img.setTint(tint);
        img.setAlpha(alpha);
        this.alphaGrid[y]![x] = alpha;
        this.tintGrid[y]![x] = tint;
      }
    }
  }

  /**
   * First light: gate the already-computed tile presentation behind an
   * expanding front so a new sector *arrives* instead of appearing.
   * `radius` is in tiles from the player; pass null to release the gate.
   */
  applySweep(
    st: GameState,
    tileSprites: Phaser.GameObjects.Image[][],
    radius: number | null,
  ): void {
    if (!this.alphaGrid.length) return;
    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const img = tileSprites[y]?.[x];
        if (!img) continue;
        const base = this.alphaGrid[y]?.[x] ?? 1;
        const tint = this.tintGrid[y]?.[x] ?? 0xffffff;
        if (radius === null) {
          img.setAlpha(base);
          img.setTint(tint);
          continue;
        }
        const d = Math.hypot(x - st.player.x, y - st.player.y);
        const behind = radius - d;
        if (behind <= 0) {
          img.setAlpha(0);
          continue;
        }
        img.setAlpha(base * Math.min(1, behind / 2.6));
        // Hot leading edge — you can see the light land on each surface.
        img.setTint(behind < 1.4 ? blendTowardWhite(tint, 0.55) : tint);
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
      playerSprite.setTint(LightTemp.pattern);
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
