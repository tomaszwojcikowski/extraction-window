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

/** Rays per light pool — enough to read as a soft wall-cut shape, not a star. */
const POOL_RAYS = 48;
const POOL_STEP = 0.28;
/** Additive shells per pool — fewer shells = less banding; rays carry the silhouette. */
const POOL_SHELLS = 7;

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
 *  1. light has a *shape* — pools are ray-marched against the tile grid, so a
 *     wall cuts the pool instead of a circle fading over it;
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
    this.lightsGfx = scene.add.graphics();
    this.lightsGfx.setDepth(1);
    // Additive: light is energy landing on a surface, not paint over it.
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
   * Ray-march how far the source actually reaches in each direction before a
   * wall eats it. One pass per source; every shell reuses these distances.
   */
  private poolReach(
    tiles: GameState['tiles'],
    sx: number,
    sy: number,
    radius: number,
  ): number[] {
    const cx = sx + 0.5;
    const cy = sy + 0.5;
    const reach: number[] = [];
    for (let i = 0; i < POOL_RAYS; i++) {
      const a = (i / POOL_RAYS) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      let hit = radius;
      for (let t = POOL_STEP; t <= radius; t += POOL_STEP) {
        const tile = tiles[Math.floor(cy + dy * t)]?.[Math.floor(cx + dx * t)];
        if (!tile) {
          hit = t;
          break;
        }
        if (!tile.transparent) {
          // Stop just inside the blocker so the pool laps the wall face.
          hit = Math.max(POOL_STEP, t - POOL_STEP * 0.5);
          break;
        }
      }
      reach.push(hit);
    }
    return reach;
  }

  private shellPoints(reach: number[], sx: number, sy: number, scale: number): Phaser.Math.Vector2[] {
    const cx = sx + 0.5;
    const cy = sy + 0.5;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < reach.length; i++) {
      const a = (i / reach.length) * Math.PI * 2;
      const d = reach[i]! * scale;
      pts.push(
        new Phaser.Math.Vector2(
          (cx + Math.cos(a) * d) * TILE_DRAW,
          (cy + Math.sin(a) * d) * TILE_DRAW,
        ),
      );
    }
    return pts;
  }

  /**
   * Wall-aware bloom. Ray-marched pools stop at geometry and spill down corridors.
   * Personal lamp (hooded work light) stays soft; flares/beacons keep a hotter core.
   */
  drawBloom(
    sources: LightSource[],
    visible: boolean[][],
    tiles?: GameState['tiles'],
  ): void {
    this.lightsGfx.clear();
    for (const s of sources) {
      const row = visible[s.y];
      if (!row?.[s.x]) continue;
      const wx = s.x * TILE_DRAW + TILE_DRAW / 2;
      const wy = s.y * TILE_DRAW + TILE_DRAW / 2;
      const personal =
        s.color === LightTemp.lamp || s.color === LightTemp.lampQuiet;
      const gain = Math.min(1.5, Math.sqrt(Math.max(0.05, s.intensity)));
      // Personal lamp: readable pool without a white-hot blob on the sprite.
      const aCore = personal
        ? Math.min(0.34, 0.07 + s.intensity * 0.16)
        : Math.min(0.62, 0.12 + s.intensity * 0.3);

      if (tiles) {
        // Stacked shells cut to the room's shape. Each shell's alpha is the
        // *increment* of `irradiance()` between two radii, so the additive
        // stack reproduces the sim's windowed inverse-square falloff.
        const reach = this.poolReach(tiles, s.x, s.y, s.radius);
        const peak = irradiance(s.radius / POOL_SHELLS, s.radius, 1) || 1;
        let prev = 0;
        for (let k = POOL_SHELLS; k >= 1; k--) {
          const scale = k / POOL_SHELLS;
          // Milder gamma — mid-field stays visible without banding into rings.
          const f = Math.pow(Math.min(1, irradiance(scale * s.radius, s.radius, 1) / peak), 0.62);
          const inc = f - prev;
          prev = f;
          if (inc <= 0.001) continue;
          this.lightsGfx.fillStyle(s.color, aCore * inc);
          this.lightsGfx.fillPoints(this.shellPoints(reach, s.x, s.y, scale), true);
        }
      } else {
        this.lightsGfx.fillStyle(s.color, aCore * 0.14);
        this.lightsGfx.fillCircle(wx, wy, s.radius * TILE_DRAW * 0.44);
        this.lightsGfx.fillStyle(s.color, aCore * 0.24);
        this.lightsGfx.fillCircle(wx, wy, s.radius * TILE_DRAW * 0.27);
      }

      // Emitter filament — soft for the hooded lamp, hot for flares / tech.
      if (personal) {
        const core = Math.max(3, TILE_DRAW * 0.14 * gain);
        this.lightsGfx.fillStyle(s.color, aCore * 0.45);
        this.lightsGfx.fillCircle(wx, wy, core);
      } else {
        const core = Math.max(5, TILE_DRAW * 0.26 * gain);
        this.lightsGfx.fillStyle(s.color, aCore * 0.55);
        this.lightsGfx.fillCircle(wx, wy, core);
        this.lightsGfx.fillStyle(blendTowardWhite(s.color, 0.7), Math.min(0.9, aCore * 1.6));
        this.lightsGfx.fillCircle(wx, wy, core * 0.4);
      }
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
          tint = multiplyTint(tint, Theme.shadowWash, 0.62 * (1 - brightness / SHADOW_THRESHOLD));
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
