import * as THREE from 'three';

export function litPaint(
  hex: number,
  opts?: { glow?: number; opacity?: number },
): THREE.MeshLambertMaterial {
  const opacity = opts?.opacity ?? 1;
  const glow = opts?.glow;
  return new THREE.MeshLambertMaterial({
    color: glow ?? hex,
    emissive: glow ?? 0x000000,
    emissiveIntensity: glow ? 0.85 : 0,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
}

export function tintLitMesh(obj: THREE.Object3D, multiply: THREE.Color): void {
  if (!(obj instanceof THREE.Mesh)) return;
  const base = obj.userData.baseColor;
  if (typeof base !== 'number') return;
  const mat = obj.material as THREE.MeshLambertMaterial;
  mat.color.setHex(base).multiply(multiply);
  if (mat.emissiveIntensity > 0) mat.emissive.setHex(base).multiply(multiply);
}

export function markMeshShadows(root: THREE.Object3D, cast: boolean, receive: boolean): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = cast;
    obj.receiveShadow = receive;
  });
}
