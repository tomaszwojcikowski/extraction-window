import * as THREE from 'three';
import { collectLightSources, LIGHT_TEMP, type SimLightSource } from '../sim/light';
import type { FieldLightSource, GameState } from '../sim/types';

export const MAX_SCONCE_SPOTS = 8;
export const MAX_POINT_LIGHTS = 6;
/** Physically-correct candela — 1.0 reads as a candle and leaves the field black. */
export const PLAYER_LAMP_INTENSITY = 10;
export const PLAYER_LAMP_DISTANCE = 5.6;

export type LocalLightPose = {
  color: number;
  intensity: number;
  distance: number;
  x: number;
  y: number;
  z: number;
  tx?: number;
  ty?: number;
  tz?: number;
  angle?: number;
};

export function isPlayerLamp(src: SimLightSource, state: GameState): boolean {
  return (
    src.fixture !== 'sconce' &&
    src.life === undefined &&
    src.x === state.player.x &&
    src.y === state.player.y &&
    src.color === LIGHT_TEMP.lamp
  );
}

/** Fixture on the wall face, beam aimed at the facing floor so it does not punch through. */
export function sconceWorldPose(src: FieldLightSource): {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  rotY: number;
} {
  const mx = src.mountX ?? src.x;
  const my = src.mountY ?? src.y;
  const dx = src.x - mx;
  const dy = src.y - my;
  const into = 0.52;
  return {
    x: mx + 0.5 + dx * into,
    y: 0.74,
    z: my + 0.5 + dy * into,
    tx: src.x + 0.5,
    ty: 0.04,
    tz: src.y + 0.5,
    rotY: Math.atan2(dx, dy),
  };
}

function visibility(state: GameState, src: SimLightSource): 'hidden' | 'memory' | 'lit' {
  if (isPlayerLamp(src, state)) return 'lit';
  const mx = src.mountX ?? src.x;
  const my = src.mountY ?? src.y;
  const explored =
    (state.explored[src.y]?.[src.x] ?? false) || (state.explored[my]?.[mx] ?? false);
  if (!explored) return 'hidden';
  const visible =
    (state.visible[src.y]?.[src.x] ?? false) || (state.visible[my]?.[mx] ?? false);
  return visible ? 'lit' : 'memory';
}

function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function threeIntensity(src: SimLightSource, band: 'lit' | 'memory'): number {
  const base = 4.2 + src.intensity * 5.5;
  return band === 'memory' ? base * 0.32 : base;
}

function pointDistance(src: SimLightSource): number {
  if (src.fixture === 'sconce') return Math.max(3.4, src.radius);
  return Math.min(Math.max(src.radius, 2.8), 3.6);
}

/**
 * Closest visible/remembered emitters around the surveyor.
 * Sconces become corridor spots; everything else is a short PointLight.
 * Player lamp is always the first point, at the live camera-follow position.
 */
export function localLightPoses(
  state: GameState,
  focusX: number,
  focusZ: number,
): { spots: LocalLightPose[]; points: LocalLightPose[] } {
  const sources = collectLightSources(state);
  const sconces: { src: SimLightSource; d: number; band: 'lit' | 'memory' }[] = [];
  const others: { src: SimLightSource; d: number; band: 'lit' | 'memory' }[] = [];

  for (const src of sources) {
    if (isPlayerLamp(src, state)) continue;
    const band = visibility(state, src);
    if (band === 'hidden') continue;
    const mx = (src.mountX ?? src.x) + 0.5;
    const mz = (src.mountY ?? src.y) + 0.5;
    const d = dist2(mx, mz, focusX, focusZ);
    if (src.fixture === 'sconce') sconces.push({ src, d, band });
    else others.push({ src, d, band });
  }

  sconces.sort((a, b) => a.d - b.d);
  others.sort((a, b) => a.d - b.d);

  const spots: LocalLightPose[] = sconces.slice(0, MAX_SCONCE_SPOTS).map(({ src, band }) => {
    const pose = sconceWorldPose(src);
    return {
      color: src.color ?? LIGHT_TEMP.sconce,
      intensity: threeIntensity(src, band) * 1.25,
      distance: Math.max(3.4, src.radius),
      x: pose.x,
      y: pose.y,
      z: pose.z,
      tx: pose.tx,
      ty: pose.ty,
      tz: pose.tz,
      angle: 1.05,
    };
  });

  const player: LocalLightPose = {
    color: LIGHT_TEMP.lamp,
    intensity: PLAYER_LAMP_INTENSITY,
    distance: PLAYER_LAMP_DISTANCE,
    x: focusX,
    y: 0.7,
    z: focusZ,
  };

  const points: LocalLightPose[] = [
    player,
    ...others.slice(0, MAX_POINT_LIGHTS - 1).map(({ src, band }) => ({
      color: src.color ?? LIGHT_TEMP.lamp,
      intensity: threeIntensity(src, band),
      distance: pointDistance(src),
      x: src.x + 0.5,
      y: 0.42,
      z: src.y + 0.5,
    })),
  ];

  return { spots, points };
}

export function applyLocalLight(light: THREE.Light, pose: LocalLightPose | null): void {
  if (!pose) {
    light.intensity = 0;
    light.visible = false;
    return;
  }
  light.visible = true;
  light.color.setHex(pose.color);
  light.intensity = pose.intensity;
  light.position.set(pose.x, pose.y, pose.z);
  if (light instanceof THREE.SpotLight) {
    light.distance = pose.distance;
    light.angle = pose.angle ?? 0.9;
    light.penumbra = 0.55;
    light.decay = 1.4;
    light.target.position.set(pose.tx ?? pose.x, pose.ty ?? 0, pose.tz ?? pose.z);
    light.target.updateMatrixWorld();
  } else if (light instanceof THREE.PointLight) {
    light.distance = pose.distance;
    light.decay = 1.4;
  }
}
