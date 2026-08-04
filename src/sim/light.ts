import type { SectorId } from '../data/encounters';
import { EM_HIGH } from './emStress';
import { isQuietStance } from './mechanics/quietStance';
import { playerFovRadius } from './fov';
import type { GameState, Tile, TileKind, FieldLightSource } from './types';

/** Soft near-field distance (tiles) — prevents singularity at d=0. */
export const LIGHT_NEAR = 0.75;

/** Tone-mapped brightness at/above this counts as lit for darts / clear shots. */
export const LIT_THRESHOLD = 0.12;

/**
 * Soft shadow band — quiet-dimmed lamp puts the player here while still
 * technically above LIT_THRESHOLD at the lamp tile. Ambush fauna prefer this.
 */
export const SHADOW_THRESHOLD = 0.4;

/**
 * Inverse-square irradiance with soft cutoff at `radius`.
 * At d=0 → ~intensity; falls as 1/(1+(d/near)²); windowed to 0 at radius.
 */
export function irradiance(dist: number, radius: number, intensity: number): number {
  if (radius <= 0 || intensity <= 0) return 0;
  if (dist >= radius) return 0;
  const d = Math.max(0, dist);
  const invSq = 1 / (1 + (d * d) / (LIGHT_NEAR * LIGHT_NEAR));
  const t = 1 - d / radius;
  const window = t * t;
  return intensity * invSq * window;
}

/**
 * Supercover / Bresenham cells between two tile centers (exclusive of ends).
 * Returns transmittance 0–1: opaque walls block fully; scrub halves remaining light.
 */
export function lightTransmittance(
  tiles: Tile[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  if (x0 === x1 && y0 === y1) return 1;

  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  let transmit = 1;

  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    if (x === x1 && y === y1) break;
    if (y < 0 || x < 0 || y >= h || x >= w) return 0;
    const tile = tiles[y]![x]!;
    if (!tile.transparent) return 0;
    if (tile.kind === 'scrub' || tile.kind === 'scrub_nest') transmit *= 0.55;
    if (transmit < 0.02) return 0;
  }
  return transmit;
}

/** Tone-map HDR sum into 0–1 display brightness (Reinhard). */
export function toneMap(hdr: number): number {
  if (hdr <= 0) return 0;
  return hdr / (1 + hdr);
}

export function accumulateLight(
  tiles: Tile[][],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  radius: number,
  intensity: number,
): number {
  const dist = Math.hypot(tx - sx, ty - sy);
  const E = irradiance(dist, radius, intensity);
  if (E <= 0.001) return 0;
  const T = lightTransmittance(tiles, sx, sy, tx, ty);
  return E * T;
}

/** Ephemeral / world light emitters owned by the sim. */
export type SimLightSource = FieldLightSource;

/**
 * Biome ambient exitance (sim) — low enough that far tiles fail `isLit`
 * without a lamp/flare, while presentation still gets a soft floor.
 * EM-HIGH adds +0.08 wash (harder to hide).
 */
export const SECTOR_AMBIENT: Record<SectorId, number> = {
  plains: 0.12,
  flood: 0.1,
  canopy: 0.09,
  reef: 0.08,
  spire: 0.09,
  ruin: 0.09,
  beacon: 0.11,
  trench: 0.07,
  duct: 0.05,
  ash: 0.07,
  brine: 0.08,
  vault: 0.09,
  fissure: 0.07,
  approach: 0.06,
  ridge: 0.11,
};

function emptyGrid(w: number, h: number): number[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
}

function fovRadius(state: GameState): number {
  let base =
    playerFovRadius(state.player.probeTurns, state.player.lensTurns) +
    state.paddMods.fovBonus +
    (state.player.equip.utility === 'sensor_rig' ? 1 : 0);
  // Mirror quietStance.modifyFov without importing the registry (avoid cycles).
  if (isQuietStance(state) && state.doctrineQuiet < 5) base = Math.max(3, base - 1);
  return base;
}

function playerLamp(state: GameState): SimLightSource {
  const fov = fovRadius(state);
  let radius = Math.max(2.5, fov * 0.55);
  let intensity = 1.1;
  if (state.player.probeTurns > 0 || state.player.lensTurns > 0) {
    radius = Math.max(radius, 6.5);
    intensity = 1.45;
  }
  if (state.player.equip.utility === 'sensor_rig') {
    radius += 0.5;
    intensity += 0.15;
  }
  if (isQuietStance(state)) {
    intensity *= 0.45;
    radius = Math.max(2.2, radius - 0.8);
  }
  return {
    x: state.player.x,
    y: state.player.y,
    radius,
    intensity,
    color: 0xffd0a0,
  };
}

function tileEmitter(kind: TileKind): Omit<SimLightSource, 'x' | 'y'> | null {
  switch (kind) {
    case 'beacon':
      return { radius: 5, intensity: 1.15, color: 0xff9933 };
    case 'shuttle':
      return { radius: 6, intensity: 1.15, color: 0xffcc66 };
    case 'exit':
      return { radius: 2.5, intensity: 0.7, color: 0x66aa88 };
    case 'poi':
      return { radius: 3, intensity: 0.75, color: 0x88aaff };
    case 'quest':
      return { radius: 3.5, intensity: 0.9, color: 0xff9933 };
    case 'hazard':
    case 'vent':
    case 'brine_pool':
      return { radius: 2.4, intensity: 0.6, color: 0x66ffcc };
    default:
      return null;
  }
}

/** All emitters that contribute to the illumination grid this turn. */
export function collectLightSources(state: GameState): SimLightSource[] {
  const sources: SimLightSource[] = [playerLamp(state), ...state.lightSources];

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (!state.explored[y]![x] && !(x === state.player.x && y === state.player.y)) continue;
      const light = tileEmitter(state.tiles[y]![x]!.kind);
      if (light) sources.push({ x, y, ...light });
    }
  }

  for (const item of state.items) {
    if (item.kind === 'nav_core') {
      sources.push({ x: item.x, y: item.y, radius: 2.5, intensity: 0.85, color: 0xb088ff });
    } else if (item.kind === 'relay_key') {
      sources.push({ x: item.x, y: item.y, radius: 2.2, intensity: 0.7, color: 0x9999ff });
    }
  }

  for (const ally of state.allies) {
    if (ally.alive && ally.kind === 'probe_drone') {
      sources.push({ x: ally.x, y: ally.y, radius: 3.2, intensity: 0.65, color: 0x99bbff });
    }
  }

  if (state.handshake?.active && state.beaconPos) {
    sources.push({
      x: state.beaconPos.x,
      y: state.beaconPos.y,
      radius: 5,
      intensity: 1.2,
      color: 0xff9933,
    });
  }

  return sources;
}

export function addLightSource(state: GameState, src: SimLightSource): void {
  state.lightSources.push({ ...src });
}

/** Decay ephemeral sources by one turn. */
export function tickLightSources(state: GameState): void {
  const next: SimLightSource[] = [];
  for (const s of state.lightSources) {
    if (s.life === undefined) {
      next.push(s);
      continue;
    }
    const life = s.life - 1;
    if (life > 0) next.push({ ...s, life });
  }
  state.lightSources = next;
}

/**
 * Rebuild per-tile HDR illumination from lamp + world + ephemeral sources.
 * Ambient includes EM-HIGH scan wash so quiet hiding is harder when contaminated.
 */
export function rebuildIllumination(state: GameState): void {
  if (!state.illumination || state.illumination.length !== state.height) {
    state.illumination = emptyGrid(state.width, state.height);
  }
  let ambient = SECTOR_AMBIENT[state.sectorId] ?? 0.3;
  if (state.tutorialActive) ambient = Math.max(ambient, 0.22);
  if (state.emStress >= EM_HIGH) ambient += 0.08;

  const sources = collectLightSources(state);
  for (let y = 0; y < state.height; y++) {
    const row = state.illumination[y]!;
    for (let x = 0; x < state.width; x++) {
      let hdr = ambient * 0.85;
      for (const s of sources) {
        hdr += accumulateLight(state.tiles, s.x, s.y, x, y, s.radius, s.intensity);
      }
      row[x] = hdr;
    }
  }
}

export function isLit(state: GameState, x: number, y: number): boolean {
  if (y < 0 || x < 0 || y >= state.height || x >= state.width) return false;
  const hdr = state.illumination[y]?.[x] ?? 0;
  return toneMap(hdr) >= LIT_THRESHOLD;
}

/** True when tone-mapped brightness is in the soft-shadow band (quiet / far lamp). */
export function inShadow(state: GameState, x: number, y: number): boolean {
  if (y < 0 || x < 0 || y >= state.height || x >= state.width) return true;
  return tileBrightness(state, x, y) < SHADOW_THRESHOLD;
}

export function tileBrightness(state: GameState, x: number, y: number): number {
  const hdr = state.illumination[y]?.[x] ?? 0;
  return toneMap(hdr);
}
