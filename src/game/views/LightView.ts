import Phaser from 'phaser';
import type { SectorId } from '../../data/encounters';
import type { FieldLightSource, GameState } from '../../sim/types';
import {
  collectLightSources,
  floodAddLight,
  irradiance,
  SHADOW_THRESHOLD,
  tileBrightness,
  toneMap,
} from '../../sim/light';
import { EM_HIGH } from '../../sim/emStress';
import { BIOME_AMBIENT, BIOME_FLOOR_TINT, LightTemp, Theme } from '../../scenes/theme';
import { TILE_DRAW } from '../../scenes/textures';
import { castReachTiles } from './castShadows';
import { marchPoolRays, type PoolRay } from './poolReach';

export type LightSource = FieldLightSource & { color: number };

const MAX_SOURCES = 12;

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

/** Presentation bloom gain — duct swallows, plains lifts, ash chokes. */
function biomeBloomGain(sectorId: SectorId): number {
  const a = BIOME_AMBIENT[sectorId].ambient;
  // Map 0.17–0.44 → ~0.72–1.05 without touching gameplay thresholds.
  return 0.55 + a * 1.15;
}

/**
 * Field lighting — draws from the sim illumination grid + shared emitters.
 *
 * Three physical claims this view has to sell:
 *  1. light has a *shape* — pools are ray-marched against the tile grid; walls
 *     cut the pool and scrub attenuates it the same way flood light does;
 *  2. light comes *from* somewhere — tile hue, casts, and actor tints weight
 *     emitters by flood energy (wrap + scrub), not bare circles;
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
  /** Per-source flood energy grids — colour/casts match gameplay wrap + scrub. */
  private sourceEnergy: number[][][] = [];
  private sourceEnergyKey = '';

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
    this.sourceEnergy = [];
    this.sourceEnergyKey = '';
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
   * Rebuild flood contribution per emitter when the source set changes.
   * Cached across anim frames within a turn so colour stays flood-honest
   * without re-walking Dijkstra every tick.
   */
  private ensureSourceEnergy(st: GameState, sources: LightSource[]): void {
    const key = `${st.turn}:${st.width}x${st.height}:${sources
      .map((s) => `${s.x},${s.y},${s.radius.toFixed(2)},${s.intensity.toFixed(2)}`)
      .join('|')}`;
    if (key === this.sourceEnergyKey && this.sourceEnergy.length === sources.length) return;
    this.sourceEnergyKey = key;
    this.sourceEnergy = sources.map((s) => {
      const grid = Array.from({ length: st.height }, () =>
        Array.from({ length: st.width }, () => 0),
      );
      floodAddLight(st.tiles, s.x, s.y, s.radius, s.intensity, grid);
      return grid;
    });
  }

  private energyAt(sourceIndex: number, x: number, y: number): number {
    return this.sourceEnergy[sourceIndex]?.[y]?.[x] ?? 0;
  }

  private shellPoints(rays: PoolRay[], sx: number, sy: number, scale: number): Phaser.Math.Vector2[] {
    const cx = sx + 0.5;
    const cy = sy + 0.5;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < rays.length; i++) {
      const a = (i / rays.length) * Math.PI * 2;
      const d = rays[i]!.hit * scale;
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
   * Wall- and scrub-aware bloom. Ray-marched pools stop at geometry, die in
   * thicket, and spill down corridors. Personal lamp stays soft; flares keep a hotter core.
   */
  drawBloom(
    sources: LightSource[],
    visible: boolean[][],
    tiles?: GameState['tiles'],
    sectorId: SectorId = 'plains',
  ): void {
    this.lightsGfx.clear();
    const biomeGain = biomeBloomGain(sectorId);
    for (const s of sources) {
      const row = visible[s.y];
      if (!row?.[s.x]) continue;
      const wx = s.x * TILE_DRAW + TILE_DRAW / 2;
      const wy = s.y * TILE_DRAW + TILE_DRAW / 2;
      const personal =
        s.color === LightTemp.lamp || s.color === LightTemp.lampQuiet;
      const gain = Math.min(1.5, Math.sqrt(Math.max(0.05, s.intensity))) * biomeGain;
      const aCore = personal
        ? Math.min(0.34, 0.07 + s.intensity * 0.16) * biomeGain
        : Math.min(0.62, 0.12 + s.intensity * 0.3) * biomeGain;

      if (tiles) {
        const rays = marchPoolRays(tiles, s.x, s.y, s.radius);
        const peak = irradiance(s.radius / POOL_SHELLS, s.radius, 1) || 1;
        let prev = 0;
        for (let k = POOL_SHELLS; k >= 1; k--) {
          const scale = k / POOL_SHELLS;
          const f = Math.pow(Math.min(1, irradiance(scale * s.radius, s.radius, 1) / peak), 0.62);
          const inc = f - prev;
          prev = f;
          if (inc <= 0.001) continue;
          // Mean ray atten so scrub-choked directions don't glow full-strength.
          let attenSum = 0;
          for (const ray of rays) attenSum += ray.atten;
          const atten = rays.length ? attenSum / rays.length : 1;
          this.lightsGfx.fillStyle(s.color, aCore * inc * (0.3 + 0.7 * atten));
          this.lightsGfx.fillPoints(this.shellPoints(rays, s.x, s.y, scale), true);
        }
      } else {
        this.lightsGfx.fillStyle(s.color, aCore * 0.14);
        this.lightsGfx.fillCircle(wx, wy, s.radius * TILE_DRAW * 0.44);
        this.lightsGfx.fillStyle(s.color, aCore * 0.24);
        this.lightsGfx.fillCircle(wx, wy, s.radius * TILE_DRAW * 0.27);
      }

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
   * Contact + cast shadows under actors.
   * Key light is flood energy — same wrap/scrub model as tile brightness — so
   * a flare around a corner can cast, but one behind scrub/stone cannot fake it.
   */
  drawContactShadows(
    st: GameState,
    actors: Iterable<{ gx: number; gy: number; tall?: boolean }>,
    sources: LightSource[],
  ): void {
    const g = this.shadowGfx;
    if (!g) return;
    g.clear();
    this.ensureSourceEnergy(st, sources);
    for (const actor of actors) {
      const { gx, gy } = actor;
      if (!st.visible[gy]?.[gx]) continue;
      const brightness = tileBrightness(st, gx, gy);
      if (brightness < 0.06) continue;

      let vx = 0;
      let vy = 0;
      let key = 0;
      for (let i = 0; i < sources.length; i++) {
        const s = sources[i]!;
        const dist = Math.hypot(gx - s.x, gy - s.y);
        if (dist < 0.75) continue;
        const E = this.energyAt(i, gx, gy);
        if (E <= 0.004) continue;
        vx += ((gx - s.x) / dist) * E;
        vy += ((gy - s.y) / dist) * E;
        key = Math.max(key, E);
      }
      const wx = gx * TILE_DRAW + TILE_DRAW / 2;
      const wy = gy * TILE_DRAW + TILE_DRAW / 2 + TILE_DRAW * 0.28;
      const inShadowBand = brightness < SHADOW_THRESHOLD;
      const alpha = Math.min(
        0.55,
        (inShadowBand ? 0.08 : 0.14) + brightness * (inShadowBand ? 0.22 : 0.42),
      );

      const len = Math.hypot(vx, vy);
      if (key > 0.05 && len > 0.0001 && !inShadowBand) {
        const dirX = vx / len;
        const dirY = vy / len;
        const wantTiles =
          (0.35 + Math.min(0.85, key * 0.65)) * (actor.tall ? 1.35 : 1);
        const reach = castReachTiles(st.tiles, gx, gy, dirX, dirY, wantTiles);
        if (reach > 0.12) {
          const throwLen = reach * TILE_DRAW;
          const px = -dirY;
          const py = dirX;
          const halfNear = TILE_DRAW * 0.2;
          const halfFar = TILE_DRAW * Math.max(0.05, 0.1 * (reach / wantTiles));
          const fx = wx + dirX * throwLen;
          const fy = wy + dirY * throwLen * 0.65;
          g.fillStyle(Theme.groundDeep, alpha * 0.82);
          g.fillPoints(
            [
              new Phaser.Math.Vector2(wx + px * halfNear, wy + py * halfNear),
              new Phaser.Math.Vector2(wx - px * halfNear, wy - py * halfNear),
              new Phaser.Math.Vector2(fx - px * halfFar, fy - py * halfFar),
              new Phaser.Math.Vector2(fx + px * halfFar, fy + py * halfFar),
            ],
            true,
          );
          g.fillStyle(Theme.groundDeep, alpha * 0.35);
          g.fillEllipse(fx, fy, TILE_DRAW * 0.22, TILE_DRAW * 0.1);
        }
      }
      g.fillStyle(Theme.groundDeep, alpha);
      g.fillEllipse(wx, wy, TILE_DRAW * 0.48, TILE_DRAW * 0.2);
    }
  }

  /** Cached lighting tint from the last `applyTileLighting` pass. */
  tileTintAt(x: number, y: number): number | undefined {
    return this.tintGrid[y]?.[x];
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
        g.lineStyle(Math.max(1, 4 * (1 - t)), blendTowardWhite(color, 0.6), 1 - t);
        g.strokeCircle(wx, wy, r);
        g.lineStyle(1, color, (1 - t) * 0.7);
        g.strokeCircle(wx, wy, r * 0.72);
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
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i]!;
      const E = this.energyAt(i, x, y);
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
    const reflect =
      st.sectorId === 'brine' || st.sectorId === 'flood' || st.sectorId === 'reef' ? 1.14 : 1;
    const choke =
      st.sectorId === 'ash' || st.sectorId === 'approach' || st.sectorId === 'duct' ? 0.88 : 1;
    this.ensureSourceEnergy(st, sources);
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
          img.setTint(Theme.memory);
          img.setAlpha(0.26);
          this.alphaGrid[y]![x] = 0.26;
          this.tintGrid[y]![x] = Theme.memory;
          continue;
        }

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
          const wash = st.sectorId === 'ash' || st.sectorId === 'approach' ? 0.72 : 0.62;
          tint = multiplyTint(tint, Theme.shadowWash, wash * (1 - brightness / SHADOW_THRESHOLD));
        }
        tint = blendTowardWhite(tint, Math.pow(brightness, 1.3) * 0.55 * reflect);
        if (st.emStress >= EM_HIGH) {
          // Sickly scan wash — intensity already in sim ambient; hue is present-only.
          tint = multiplyTint(tint, LightTemp.scan, 0.16);
        }

        const occlusion = 1 - this.contactOcclusion(st, x, y) * 0.05;
        const alpha = Math.min(1, (0.13 + 0.87 * Math.pow(brightness, 0.7)) * occlusion * choke);
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
        img.setTint(behind < 1.4 ? blendTowardWhite(tint, 0.55) : tint);
      }
    }
  }

  applyActorLighting(
    st: GameState,
    playerSprite: Phaser.GameObjects.Image,
    enemyViews: Iterable<{ img: Phaser.GameObjects.Image; gx: number; gy: number }>,
    sources: LightSource[],
  ): void {
    this.ensureSourceEnergy(st, sources);

    const litAlpha = (x: number, y: number): number => {
      if (!st.visible[y]?.[x]) return 0;
      return 0.5 + 0.5 * tileBrightness(st, x, y);
    };

    const keyTint = (x: number, y: number): number | null => {
      let pull = 0;
      let acc = 0xffffff;
      for (let i = 0; i < sources.length; i++) {
        const E = this.energyAt(i, x, y);
        if (E <= 0.008) continue;
        pull += E;
        acc = multiplyTint(acc, sources[i]!.color, Math.min(1, E * 0.85));
      }
      if (pull < 0.06) return null;
      return multiplyTint(0xffffff, acc, Math.min(0.5, pull * 0.42));
    };

    playerSprite.setAlpha(litAlpha(st.player.x, st.player.y));
    if (st.patternDesync > 0) {
      playerSprite.setTint(LightTemp.pattern);
    } else {
      const tint = keyTint(st.player.x, st.player.y);
      if (tint !== null) playerSprite.setTint(tint);
      else playerSprite.clearTint();
    }

    for (const view of enemyViews) {
      if (!view.img.visible) continue;
      view.img.setAlpha(litAlpha(view.gx, view.gy));
      const tint = keyTint(view.gx, view.gy);
      if (tint !== null) view.img.setTint(tint);
      else view.img.clearTint();
    }
  }
}

// Re-export for bloom tuning / tests
export { irradiance } from '../../sim/light';
export { castReachTiles } from './castShadows';
export { marchPoolRays } from './poolReach';
