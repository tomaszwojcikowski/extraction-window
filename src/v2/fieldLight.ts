import * as THREE from 'three';
import { Theme } from '../scenes/theme';

/** Key light sits SE of the surveyor, matching the rest 3/4 camera. */
export const FIELD_KEY_OFFSET = { x: 7.5, y: 14, z: 8.5 };
export const FIELD_SHADOW_EXTENT = 14;
export const FIELD_HEMI_INTENSITY = 1.05;
export const FIELD_KEY_INTENSITY = 1.55;
/** Hemi ground — not Theme.groundDeep, or camera-facing crate sides crush to black. */
export const FIELD_HEMI_GROUND = 0x3d484e;
export const FIELD_FOG_NEAR = 16;
export const FIELD_FOG_FAR = 40;
export const FIELD_FOG_COLOR = 0x1a2226;

export function createFieldHemi(): THREE.HemisphereLight {
  return new THREE.HemisphereLight(0xb7c8d4, FIELD_HEMI_GROUND, FIELD_HEMI_INTENSITY);
}

export function createFieldKeyLight(): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xf4efe4, FIELD_KEY_INTENSITY);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -0.0009;
  light.shadow.normalBias = 0.04;
  light.shadow.radius = 2.2;
  const cam = light.shadow.camera;
  cam.left = -FIELD_SHADOW_EXTENT;
  cam.right = FIELD_SHADOW_EXTENT;
  cam.top = FIELD_SHADOW_EXTENT;
  cam.bottom = -FIELD_SHADOW_EXTENT;
  cam.near = 1;
  cam.far = 48;
  return light;
}

export function placeFieldKeyLight(light: THREE.DirectionalLight, x: number, z: number): void {
  light.position.set(x + FIELD_KEY_OFFSET.x, FIELD_KEY_OFFSET.y, z + FIELD_KEY_OFFSET.z);
  light.target.position.set(x, 0, z);
  light.target.updateMatrixWorld();
  light.shadow.camera.updateProjectionMatrix();
}

export function createFieldFog(): THREE.Fog {
  return new THREE.Fog(FIELD_FOG_COLOR, FIELD_FOG_NEAR, FIELD_FOG_FAR);
}
