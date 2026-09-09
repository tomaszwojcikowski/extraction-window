import * as THREE from 'three';

/** Key light sits SE of the surveyor, matching the rest 3/4 camera. */
export const FIELD_KEY_OFFSET = { x: 4.2, y: 18, z: 4.8 };
export const FIELD_SHADOW_EXTENT = 14;
export const FIELD_HEMI_INTENSITY = 1.85;
export const FIELD_KEY_INTENSITY = 2.05;
/** Fill from the camera so the faces you see are not crushed by key shadows. */
export const FIELD_FILL_INTENSITY = 1.15;
/** Hemi ground — not Theme.groundDeep, or camera-facing crate sides crush to black. */
export const FIELD_HEMI_GROUND = 0x5c6c74;
export const FIELD_FOG_NEAR = 22;
export const FIELD_FOG_FAR = 52;
export const FIELD_FOG_COLOR = 0x314048;
export const FIELD_SHADOW_INTENSITY = 0.22;

export function createFieldHemi(): THREE.HemisphereLight {
  return new THREE.HemisphereLight(0xd0dce4, FIELD_HEMI_GROUND, FIELD_HEMI_INTENSITY);
}

export function createFieldFillLight(): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xd8e4ec, FIELD_FILL_INTENSITY);
  light.castShadow = false;
  return light;
}

export function placeFieldFillLight(
  light: THREE.DirectionalLight,
  camera: { position: THREE.Vector3 },
  target: THREE.Vector3,
): void {
  light.position.copy(camera.position);
  light.target.position.copy(target);
  light.target.updateMatrixWorld();
}

export function createFieldKeyLight(): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xf4efe4, FIELD_KEY_INTENSITY);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -0.0009;
  light.shadow.normalBias = 0.04;
  light.shadow.radius = 2.2;
  light.shadow.intensity = FIELD_SHADOW_INTENSITY;
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
