import * as THREE from 'three';
import { Theme } from '../scenes/theme';

/** Key light sits SE of the surveyor, matching the rest 3/4 camera. */
export const FIELD_KEY_OFFSET = { x: 7.5, y: 14, z: 8.5 };
export const FIELD_SHADOW_EXTENT = 14;

export function createFieldHemi(): THREE.HemisphereLight {
  return new THREE.HemisphereLight(0x8ea8ba, Theme.groundDeep, 0.32);
}

export function createFieldKeyLight(): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xf0ebe0, 0.62);
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
