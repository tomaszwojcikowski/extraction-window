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
import {
  collectOccluderShadows,
  lightCastsOccluderShadow,
} from './occluderShadows';
import { marchPoolRays, marchPoolRaysAt, type PoolRay } from './poolReach';
import {
  applyShroudRevealFrom,
  cloneShroudGrid,
  moveBlendDirtyCells,
  shroudRevealEase,
} from './moveBlendDirty';

export type LightSource = FieldLightSource & { color: number };
export { moveBlendDirtyCells } from './moveBlendDirty';

const MAX_SOURCES = 12;

/** Additive washes per pool — two soft shells, not onion rings. */
const POOL_SCALES = [1.05, 0.58] as const;
/** Relative alpha per wash (outer → body). */
const POOL_ALPHA = [0.14, 0.28] as const;

function poolSeed(x: number, y: number, radius: number): number {
  return ((Math.floor(x * 17) ^ Math.floor(y * 31) ^ Math.floor(radius * 10)) >>> 0) || 1;
}

/** Deterministic ±~14% radius wobble so pools aren't rotationally perfect. */
function rayWobble(i: number, seed: number): number {
  const n = ((i * 1103515245 + seed * 12345) >>> 0) % 1000;
  return 0.86 + (n / 1000) * 0.28;
}

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

/** Pull chroma toward grey — survey memory keeps silhouette, loses hue. */
function desaturate(base: number, amount: number): number {
  const br = (base >> 16) & 0xff;
  const bg = (base >> 8) & 0xff;
  const bb = base & 0xff;
  const t = Math.min(1, Math.max(0, amount));
  const gray = Math.round(br * 0.3 + bg * 0.59 + bb * 0.11);
  const r = Math.round(br + (gray - br) * t);
  const g = Math.round(bg + (gray - bg) * t);
  const b = Math.round(bb + (gray - bb) * t);
  return (r << 16) | (g << 8) | b;
}

function withColor(s: FieldLightSource, fallback = LightTemp.lamp): LightSource {
  return { ...s, color: s.color ?? fallback };
}

function cloneGrid(src: number[][]): number[][] {
  return src.map((row) => row.slice());
}

function lerpTint(a: number, b: number, t: number): number {
  const u = Math.min(1, Math.max(0, t));
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * u) << 16) |
    (Math.round(ag + (bg - ag) * u) << 8) |
    Math.round(ab + (bb - ab) * u)
  );
}

/** Presentation bloom gain — scrub scatters, brine reflects, ash chokes, duct swallows. */
function biomeBloomGain(sectorId: SectorId): number {
  const a = BIOME_AMBIENT[sectorId].ambient;
  // Wider spread than linear ambient alone so tint-off sectors still diverge.
  let gain = 0.4 + a * 1.12;
  if (sectorId === 'plains' || sectorId === 'canopy' || sectorId === 'ridge') {
    // Scrub scatter — soft extra spill under open / littered canopy.
    gain *= 1.1;
  }
  if (sectorId === 'brine' || sectorId === 'flood' || sectorId === 'reef') {
    // Standing water throws spill farther (cool reflection).
    gain *= 1.08;
  }
  if (sectorId === 'ash' || sectorId === 'approach') {
    gain *= 0.8;
  }
  if (sectorId === 'duct') {
    gain *= 0.68;
  }
  return Math.min(1.18, Math.max(0.42, gain));
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
 *     Tile steps carry the personal lamp with the hop (`captureMoveFrom` /
 *     `setMoveLightProgress`) so bloom and wash do not snap ahead of the sprite.
 *     Tiles leaving FOW ease in from a fog wash across that same hop.
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
  /** True where the last paint showed FOW (`t_fog`) — hop blends fade these in. */
  private shroudGrid: boolean[][] = [];
  /** Per-source flood energy grids — colour/casts match gameplay wrap + scrub. */
  private sourceEnergy: number[][][] = [];
  private sourceEnergyKey = '';
  /**
   * Lamp carry during a tile step — bloom follows the surveyor instead of
   * snapping to the destination while the sprite is still mid-hop.
   */
  private lampCarry: { x: number; y: number } | null = null;
  private moveBlend: {
    fromAlpha: number[][];
    fromTint: number[][];
    toAlpha: number[][];
    toTint: number[][];
    fromShroud: boolean[][];
    lampFrom: { x: number; y: number };
    lampTo: { x: number; y: number };
    t: number;
    locked: boolean;
    /** Cells whose wash changes across the hop — skip the rest each frame. */
    dirty: { x: number; y: number }[];
  } | null = null;

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
    this.endMoveLight();
  }

  /** True while a locked step blend is driving presentation. */
  hasMoveBlend(): boolean {
    return this.moveBlend?.locked === true;
  }

  /** Captured but not yet locked — dest wash should fill caches without painting sprites. */
  hasPendingMoveBlend(): boolean {
    return this.moveBlend !== null && !this.moveBlend.locked;
  }

  /**
   * Snapshot the current tile wash as the blend start. Call before destination
   * `applyTileLighting` so the lamp can travel with the hop.
   */
  captureMoveFrom(from: { x: number; y: number }, to: { x: number; y: number }): void {
    if (!this.alphaGrid.length) {
      this.moveBlend = null;
      this.lampCarry = null;
      return;
    }
    this.moveBlend = {
      fromAlpha: cloneGrid(this.alphaGrid),
      fromTint: cloneGrid(this.tintGrid),
      toAlpha: [],
      toTint: [],
      fromShroud: cloneShroudGrid(this.shroudGrid),
      lampFrom: { x: from.x, y: from.y },
      lampTo: { x: to.x, y: to.y },
      t: 0,
      locked: false,
      dirty: [],
    };
    // Carry stays null until lock — destination lighting must use sim lamp coords.
    this.lampCarry = null;
  }

  /**
   * After destination lighting filled the caches, lock the blend end and show
   * the start frame so the wash doesn't pop ahead of the sprite.
   */
  lockMoveBlend(
    tileSprites: Phaser.GameObjects.Image[][],
    sectorId: SectorId,
  ): void {
    const blend = this.moveBlend;
    if (!blend || blend.locked) return;
    blend.toAlpha = cloneGrid(this.alphaGrid);
    blend.toTint = cloneGrid(this.tintGrid);
    // Re-tint shroud (unexplored) tiles to match the sector's fog temperature.
    // This keeps the hop reveal from feeling like a constant neutral overlay.
    const fogTint = multiplyTint(Theme.fog, BIOME_FLOOR_TINT[sectorId], 0.35);
    applyShroudRevealFrom(
      blend.fromAlpha,
      blend.fromTint,
      blend.fromShroud,
      fogTint,
    );
    blend.dirty = moveBlendDirtyCells(blend.fromAlpha, blend.toAlpha, blend.fromTint, blend.toTint);
    blend.locked = true;
    this.setMoveLightProgress(0, tileSprites);
  }

  /**
   * During a hop, restore destination tile art under the lerped wash so FOV
   * expands with the step. Newly explored cells keep a fog wash at t=0 and
   * ease in instead of blinking from `t_fog` to full tile.
   */
  paintMoveTextures(
    st: GameState,
    tileSprites: Phaser.GameObjects.Image[][],
    tileKey: (kind: string, x: number, y: number) => string,
  ): void {
    if (!this.moveBlend?.locked) return;
    const floorTint = BIOME_FLOOR_TINT[st.sectorId];
    const fogTint = multiplyTint(Theme.fog, floorTint, 0.35);
    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const img = tileSprites[y]?.[x];
        if (!img) continue;
        if (!st.explored[y]![x]) {
          img.setTexture('t_fog');
          img.setTint(fogTint);
          continue;
        }
        img.setTexture(tileKey(st.tiles[y]![x]!.kind, x, y));
      }
    }
  }

  /** Drive lamp carry + tile wash with the move tween (0 → 1). */
  setMoveLightProgress(t: number, tileSprites: Phaser.GameObjects.Image[][]): void {
    const blend = this.moveBlend;
    if (!blend?.locked) return;
    const u = Math.min(1, Math.max(0, t));
    blend.t = u;
    this.lampCarry = {
      x: blend.lampFrom.x + (blend.lampTo.x - blend.lampFrom.x) * u,
      y: blend.lampFrom.y + (blend.lampTo.y - blend.lampFrom.y) * u,
    };
    const dirty = blend.dirty;
    if (dirty.length === 0) return;
    for (let i = 0; i < dirty.length; i++) {
      const { x, y } = dirty[i]!;
      const img = tileSprites[y]?.[x];
      if (!img) continue;
      const a0 = blend.fromAlpha[y]?.[x] ?? 1;
      const a1 = blend.toAlpha[y]?.[x] ?? 1;
      const t0 = blend.fromTint[y]?.[x] ?? 0xffffff;
      const t1 = blend.toTint[y]?.[x] ?? 0xffffff;
      const s = blend.fromShroud[y]?.[x] ? shroudRevealEase(u) : u;
      img.setAlpha(a0 + (a1 - a0) * s);
      img.setTint(lerpTint(t0, t1, s));
    }
  }

  endMoveLight(): void {
    this.moveBlend = null;
    this.lampCarry = null;
  }

  /** Fractional lamp position while stepping, else null. */
  lampCarryAt(): { x: number; y: number } | null {
    return this.lampCarry;
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
   * without re-walking Dijkstra every tick. Mid-hop the carried lamp is already
   * in `sources[0]` — flood from that rounded tile so energy matches bloom.
   */
  private ensureSourceEnergy(st: GameState, sources: LightSource[]): void {
    const key = `${st.turn}:${st.width}x${st.height}:${sources
      .map(
        (s) =>
          `${Math.round(s.x)},${Math.round(s.y)},${s.radius.toFixed(2)},${s.intensity.toFixed(2)}`,
      )
      .join('|')}`;
    if (key === this.sourceEnergyKey && this.sourceEnergy.length === sources.length) return;
    this.sourceEnergyKey = key;
    this.sourceEnergy = sources.map((s) => {
      const grid = Array.from({ length: st.height }, () =>
        Array.from({ length: st.width }, () => 0),
      );
      floodAddLight(
        st.tiles,
        Math.round(s.x),
        Math.round(s.y),
        s.radius,
        s.intensity,
        grid,
      );
      return grid;
    });
  }

  private energyAt(sourceIndex: number, x: number, y: number): number {
    return this.sourceEnergy[sourceIndex]?.[y]?.[x] ?? 0;
  }

  private shellPointsAt(
    rays: PoolRay[],
    cx: number,
    cy: number,
    scale: number,
    seed = 1,
  ): Phaser.Math.Vector2[] {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < rays.length; i++) {
      const a = (i / rays.length) * Math.PI * 2;
      const d = rays[i]!.hit * scale * rayWobble(i, seed);
      pts.push(
        new Phaser.Math.Vector2(
          (cx + Math.cos(a) * d) * TILE_DRAW,
          (cy + Math.sin(a) * d) * TILE_DRAW,
        ),
      );
    }
    return pts;
  }

  private shellPoints(rays: PoolRay[], sx: number, sy: number, scale: number): Phaser.Math.Vector2[] {
    return this.shellPointsAt(rays, sx + 0.5, sy + 0.5, scale, poolSeed(sx, sy, scale));
  }

  /**
   * Wall- and scrub-aware bloom. Ray-marched pools stop at geometry, die in
   * thicket, and spill down corridors. Drawn as a few uneven washes — not
   * concentric AI onion rings. Personal lamp stays soft; flares keep a hotter core.
   * Wall sconces bloom from the fixture face (not the floor emission cell).
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
      const isSconce = s.fixture === 'sconce';
      const mountX = s.mountX ?? s.x;
      const mountY = s.mountY ?? s.y;
      // Carry uses fractional tile coords — index FOV with integers or bloom drops out mid-hop.
      const vx = Math.round(s.x);
      const vy = Math.round(s.y);
      const mvx = Math.round(mountX);
      const mvy = Math.round(mountY);
      if (!visible[vy]?.[vx] && !(isSconce && visible[mvy]?.[mvx])) continue;

      let cx = s.x + 0.5;
      let cy = s.y + 0.5;
      if (isSconce) {
        const into = 0.42;
        cx = mountX + 0.5 + (s.x - mountX) * into;
        cy = mountY + 0.5 + (s.y - mountY) * into;
      }
      const wx = cx * TILE_DRAW;
      const wy = cy * TILE_DRAW;
      const seed = poolSeed(cx, cy, s.radius);

      const personal =
        s.color === LightTemp.lamp ||
        isSconce;
      const gain = Math.min(1.35, Math.sqrt(Math.max(0.05, s.intensity))) * biomeGain;
      const aCore = personal
        ? Math.min(isSconce ? 0.14 : 0.18, 0.04 + s.intensity * 0.09) * biomeGain
        : Math.min(0.28, 0.07 + s.intensity * 0.14) * biomeGain;

      if (tiles) {
        // Always march from the continuous centre so a carried lamp doesn't quantize.
        const rays = marchPoolRaysAt(tiles, cx, cy, s.radius);
        let attenSum = 0;
        for (const ray of rays) attenSum += ray.atten;
        const atten = rays.length ? attenSum / rays.length : 1;
        for (let k = 0; k < POOL_SCALES.length; k++) {
          const scale = POOL_SCALES[k]!;
          const shellAlpha = aCore * POOL_ALPHA[k]! * (0.45 + 0.55 * atten);
          this.lightsGfx.fillStyle(s.color, Math.min(0.28, shellAlpha));
          this.lightsGfx.fillPoints(this.shellPointsAt(rays, cx, cy, scale, seed + k * 19), true);
        }
      } else {
        this.lightsGfx.fillStyle(s.color, aCore * 0.08);
        this.lightsGfx.fillCircle(wx, wy, s.radius * TILE_DRAW * 0.5);
        this.lightsGfx.fillStyle(s.color, aCore * 0.14);
        this.lightsGfx.fillCircle(wx, wy, s.radius * TILE_DRAW * 0.3);
      }

      // One soft core — no nested white spark competing with tile wash.
      const core = Math.max(
        personal ? 4 : 5,
        TILE_DRAW * (isSconce ? 0.16 : personal ? 0.16 : 0.2) * gain,
      );
      this.lightsGfx.fillStyle(s.color, aCore * (isSconce ? 0.32 : personal ? 0.26 : 0.28));
      this.lightsGfx.fillCircle(wx, wy, core);
    }
  }

  /**
   * One shadow language: wall/occluder floor umbra from flood-lit faces, plus a
   * single contact plant under bodies and kit. No actor cast wedges — those
   * fought the occluders and read as a second lighting system.
   */
  drawDynamicShadows(
    st: GameState,
    actors: Iterable<{
      gx: number;
      gy: number;
      /** Ground kit — short contact plant. */
      item?: boolean;
      /** Fauna / peers — body plant. */
      body?: boolean;
    }>,
    sources: LightSource[],
    /** First-light reveal radius; null/omit = full FOV only. */
    sweepRadius: number | null = null,
  ): void {
    const g = this.shadowGfx;
    if (!g) return;
    g.clear();
    this.ensureSourceEnergy(st, sources);

    const focusX = this.lampCarry?.x ?? st.player.x;
    const focusY = this.lampCarry?.y ?? st.player.y;
    const occluderLights = sources.map((s) => ({
      x: s.x,
      y: s.y,
      radius: s.radius,
      intensity: s.intensity,
      castsOccluderShadow: lightCastsOccluderShadow(s),
    }));
    const quads = collectOccluderShadows(
      st.tiles,
      st.visible,
      occluderLights,
      (i, x, y) => this.energyAt(i, x, y),
      focusX,
      focusY,
    );
    for (const q of quads) {
      const sampleX = Math.min(
        st.width - 1,
        Math.max(0, Math.floor((q.x0 + q.x1 + q.x2 + q.x3) / 4)),
      );
      const sampleY = Math.min(
        st.height - 1,
        Math.max(0, Math.floor((q.y0 + q.y1 + q.y2 + q.y3) / 4)),
      );
      if (!st.visible[sampleY]?.[sampleX]) continue;
      if (
        sweepRadius !== null &&
        Math.hypot(sampleX - focusX, sampleY - focusY) > sweepRadius
      ) {
        continue;
      }
      const brightness = tileBrightness(st, sampleX, sampleY);
      const inShadowBand = brightness < SHADOW_THRESHOLD;
      const alpha = Math.min(0.42, q.weight * (inShadowBand ? 0.1 : 0.26));
      if (alpha < 0.03) continue;
      g.fillStyle(Theme.groundDeep, alpha);
      g.fillPoints(
        [
          new Phaser.Math.Vector2(q.x0 * TILE_DRAW, q.y0 * TILE_DRAW),
          new Phaser.Math.Vector2(q.x1 * TILE_DRAW, q.y1 * TILE_DRAW),
          new Phaser.Math.Vector2(q.x2 * TILE_DRAW, q.y2 * TILE_DRAW),
          new Phaser.Math.Vector2(q.x3 * TILE_DRAW, q.y3 * TILE_DRAW),
        ],
        true,
      );
    }

    for (const actor of actors) {
      if (!actor.body && !actor.item) continue;
      const { gx, gy } = actor;
      const tx = Math.round(gx);
      const ty = Math.round(gy);
      if (tx < 0 || ty < 0 || tx >= st.width || ty >= st.height) continue;
      if (!st.visible[ty]?.[tx]) continue;
      if (sweepRadius !== null && Math.hypot(gx - focusX, gy - focusY) > sweepRadius) {
        continue;
      }
      const brightness = tileBrightness(st, tx, ty);
      if (brightness < 0.03) continue;

      const footBias = actor.item ? 0.18 : 0.28;
      const wx = gx * TILE_DRAW + TILE_DRAW / 2;
      const wy = gy * TILE_DRAW + TILE_DRAW / 2 + TILE_DRAW * footBias;
      const inShadowBand = brightness < SHADOW_THRESHOLD;
      const alpha = Math.min(
        actor.body ? 0.5 : 0.42,
        (inShadowBand ? 0.08 : 0.1) + brightness * (inShadowBand ? 0.2 : 0.32),
      );
      const contactW = TILE_DRAW * (actor.item ? 0.28 : 0.36);
      const contactH = TILE_DRAW * (actor.item ? 0.11 : 0.14);
      g.fillStyle(Theme.groundDeep, alpha * 0.65);
      g.fillEllipse(wx, wy, contactW, contactH);
    }
  }

  /** @deprecated Use drawDynamicShadows — kept as alias for any external callers. */
  drawContactShadows(
    st: GameState,
    actors: Iterable<{
      gx: number;
      gy: number;
      item?: boolean;
      body?: boolean;
    }>,
    sources: LightSource[],
  ): void {
    this.drawDynamicShadows(st, actors, sources);
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
   * `bodyAt` supplies mid-hop positions for movers whose bloom should travel.
   */
  allSources(
    st: GameState,
    animFrame: number,
    bodyAt?: {
      enemy?: (id: number) => { x: number; y: number } | null;
      ally?: (id: number) => { x: number; y: number } | null;
    },
  ): LightSource[] {
    const pulse = 0.85 + (animFrame % 3) * 0.08;
    const carry = this.lampCarry;
    const sim = collectLightSources(st).map((s, i) => {
      const colored = withColor(s);
      // Personal lamp is always first from collectLightSources — carry it with the hop.
      const placed =
        i === 0 && carry
          ? { ...colored, x: carry.x, y: carry.y }
          : colored;
      // Living / unstable emitters breathe; engineered ones hold steady.
      if (
        s.life === undefined &&
        (s.color === LightTemp.fauna || s.color === LightTemp.marker || s.color === LightTemp.beacon)
      ) {
        return { ...placed, intensity: placed.intensity * pulse };
      }
      return placed;
    });

    // Probe drones: sim coords are the destination — slide bloom with the view.
    for (const ally of st.allies) {
      if (!ally.alive || ally.kind !== 'probe_drone') continue;
      const pos = bodyAt?.ally?.(ally.id) ?? { x: ally.x, y: ally.y };
      const src = sim.find(
        (s) =>
          s.color === LightTemp.pattern &&
          s.radius === 3.2 &&
          Math.round(s.x) === ally.x &&
          Math.round(s.y) === ally.y,
      );
      if (src) {
        src.x = pos.x;
        src.y = pos.y;
      }
    }

    for (const en of st.enemies) {
      if (!en.alive || en.tier !== 'boss') continue;
      const pos = bodyAt?.enemy?.(en.id) ?? { x: en.x, y: en.y };
      sim.push({
        x: pos.x,
        y: pos.y,
        radius: 3.2,
        color: Theme.rust,
        intensity: 0.75 * pulse,
      });
    }

    if (st.patternDesync > 0) {
      sim.push({
        x: carry?.x ?? st.player.x,
        y: carry?.y ?? st.player.y,
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

  /** Blocking neighbours — ambient occlusion where floor meets mass (incl. diagonals). */
  private contactOcclusion(st: GameState, x: number, y: number): number {
    let blocked = 0;
    const solid = (tx: number, ty: number): boolean =>
      st.tiles[ty]?.[tx]?.transparent === false;
    if (solid(x, y - 1)) blocked += 1.0;
    if (solid(x, y + 1)) blocked += 1.0;
    if (solid(x - 1, y)) blocked += 1.0;
    if (solid(x + 1, y)) blocked += 1.0;
    if (solid(x - 1, y - 1)) blocked += 0.45;
    if (solid(x + 1, y - 1)) blocked += 0.45;
    if (solid(x - 1, y + 1)) blocked += 0.45;
    if (solid(x + 1, y + 1)) blocked += 0.45;
    return blocked;
  }

  applyTileLighting(
    st: GameState,
    tileSprites: Phaser.GameObjects.Image[][],
    tileKey: (kind: string, x: number, y: number) => string,
    sources: LightSource[],
    opts: { paintSprites?: boolean } = {},
  ): void {
    const paint = opts.paintSprites !== false;
    const biome = BIOME_AMBIENT[st.sectorId];
    const floorTint = BIOME_FLOOR_TINT[st.sectorId];
    const fogTint = multiplyTint(Theme.fog, floorTint, 0.35);
    const ambientTint = biome.tint;
    const reflect =
      st.sectorId === 'brine' || st.sectorId === 'flood' || st.sectorId === 'reef' ? 1.24 : 1;
    const scatter =
      st.sectorId === 'plains' || st.sectorId === 'canopy' || st.sectorId === 'ridge' ? 1.06 : 1;
    const choke =
      st.sectorId === 'duct'
        ? 0.76
        : st.sectorId === 'ash' || st.sectorId === 'approach'
          ? 0.82
          : 1;
    this.ensureSourceEnergy(st, sources);
    if (this.alphaGrid.length !== st.height) {
      this.alphaGrid = Array.from({ length: st.height }, () => new Array<number>(st.width).fill(0));
      this.tintGrid = Array.from({ length: st.height }, () => new Array<number>(st.width).fill(0));
      this.shroudGrid = Array.from({ length: st.height }, () => new Array<boolean>(st.width).fill(true));
    }

    for (let y = 0; y < st.height; y++) {
      for (let x = 0; x < st.width; x++) {
        const img = tileSprites[y]![x]!;
        const kind = st.tiles[y]![x]!.kind;
        if (!st.explored[y]![x]) {
          if (paint) {
            img.setTexture('t_fog');
            img.setTint(fogTint);
            img.setAlpha(1);
          }
          this.alphaGrid[y]![x] = 1;
          this.tintGrid[y]![x] = fogTint;
          this.shroudGrid[y]![x] = true;
          continue;
        }

        this.shroudGrid[y]![x] = false;

        if (paint) img.setTexture(tileKey(kind, x, y));
        if (!st.visible[y]![x]) {
          // Explored-unseen: keep the remembered tile art, wash it cold and flat.
          const isTerrain =
            kind === 'floor' ||
            kind === 'scrub' ||
            kind === 'scrub_nest' ||
            kind === 'rubble' ||
            kind === 'tripwire';
          const isHazard = kind === 'hazard' || kind === 'vent' || kind === 'brine_pool';
          const isWall = kind === 'wall' || kind === 'sealed';
          const hazardTint =
            kind === 'brine_pool' ? multiplyTint(Theme.arcWhite, Theme.biolum, 0.35) : Theme.arc;
          let mem = isTerrain ? floorTint : isHazard ? hazardTint : isWall ? floorTint : 0xffffff;
          mem = desaturate(mem, isWall ? 0.85 : 0.72);
          mem = multiplyTint(mem, Theme.memoryWash, 0.42);
          mem = multiplyTint(mem, Theme.memory, 0.28);
          const memoryAlpha = isWall ? 0.5 : 0.4;
          if (paint) {
            img.setTint(mem);
            img.setAlpha(memoryAlpha);
          }
          this.alphaGrid[y]![x] = memoryAlpha;
          this.tintGrid[y]![x] = mem;
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
        tint = multiplyTint(tint, ambientTint, 0.22);
        if (colorPull > 0.04) {
          tint = multiplyTint(tint, colorAcc, Math.min(0.55, colorPull * 0.48));
        }
        if (brightness < SHADOW_THRESHOLD) {
          const wash =
            st.sectorId === 'duct'
              ? 0.62
              : st.sectorId === 'ash' || st.sectorId === 'approach'
                ? 0.58
                : 0.45;
          tint = multiplyTint(tint, Theme.shadowWash, wash * (1 - brightness / SHADOW_THRESHOLD));
        }
        // Gentler lift — lit floor stays warm metal, not chalk-white.
        tint = blendTowardWhite(tint, Math.pow(brightness, 1.05) * 0.38 * reflect);
        if (st.emStress >= EM_HIGH) {
          // Sickly scan wash — intensity already in sim ambient; hue is present-only.
          tint = multiplyTint(tint, LightTemp.scan, 0.12);
        }

        const occlusion = 1 - Math.min(0.55, this.contactOcclusion(st, x, y) * 0.07);
        // Softer response curve: dark stays readable, bright doesn't punch.
        const alpha = Math.min(
          1,
          (0.2 + 0.78 * Math.pow(brightness, 0.85)) * occlusion * choke * scatter,
        );
        if (paint) {
          img.setTint(tint);
          img.setAlpha(alpha);
        }
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
    actorViews: Iterable<{ img: Phaser.GameObjects.Image; gx: number; gy: number }>,
    sources: LightSource[],
  ): void {
    this.ensureSourceEnergy(st, sources);

    const litAlpha = (x: number, y: number): number => {
      const tx = Math.round(x);
      const ty = Math.round(y);
      if (!st.visible[ty]?.[tx]) return 0;
      return 0.58 + 0.42 * tileBrightness(st, tx, ty);
    };

    const keyTint = (x: number, y: number): number | null => {
      const tx = Math.round(x);
      const ty = Math.round(y);
      let pull = 0;
      let acc = 0xffffff;
      for (let i = 0; i < sources.length; i++) {
        const E = this.energyAt(i, tx, ty);
        if (E <= 0.008) continue;
        pull += E;
        acc = multiplyTint(acc, sources[i]!.color, Math.min(1, E * 0.7));
      }
      if (pull < 0.06) return null;
      return multiplyTint(0xffffff, acc, Math.min(0.36, pull * 0.32));
    };

    // Mid-hop: sample from the carried lamp so alpha matches wash/tint, not dest tile.
    const playerLight = this.lampCarry ?? { x: st.player.x, y: st.player.y };
    if (!playerSprite.getData('dying')) {
      playerSprite.setAlpha(litAlpha(playerLight.x, playerLight.y));
      if (st.patternDesync > 0) {
        playerSprite.setTint(LightTemp.pattern);
      } else {
        const tint = keyTint(playerLight.x, playerLight.y);
        if (tint !== null) playerSprite.setTint(tint);
        else playerSprite.clearTint();
      }
    }

    for (const view of actorViews) {
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
export { marchPoolRays, marchPoolRaysAt } from './poolReach';
