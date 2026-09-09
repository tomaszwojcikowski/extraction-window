import * as THREE from 'three';
import { Material, Theme } from '../scenes/theme';
import { litPaint, tintLitMesh } from './litMaterial';
import { ball, roundBox } from './softGeo';

const Geo = {
  plate: roundBox(0.16, 0.22, 0.05, 0.02),
  hood: roundBox(0.18, 0.08, 0.12, 0.03),
  bulb: ball(0.055, 10, 8),
  cage: roundBox(0.14, 0.02, 0.1, 0.008),
  tape: roundBox(0.06, 0.04, 0.06, 0.012),
};

function part(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  hex: number,
  x: number,
  y: number,
  z: number,
  name: string,
  glow?: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, litPaint(hex, { glow }));
  mesh.position.set(x, y, z);
  mesh.name = name;
  mesh.userData.baseColor = glow ?? hex;
  parent.add(mesh);
  return mesh;
}

/**
 * Bulkhead sconce — local +Z is into the corridor.
 * Emission sits on the facing floor in the sim; the mesh bolts to the wall face.
 */
export function createSconce(color: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'sconce';
  part(root, Geo.plate, Material.deck, 0, 0, -0.02, 'plate');
  part(root, Geo.hood, Material.deckLit, 0, 0.08, 0.04, 'hood');
  part(root, Geo.bulb, color, 0, 0, 0.05, 'bulb', color);
  part(root, Geo.cage, Theme.panelEdge, 0, -0.06, 0.04, 'cage');
  part(root, Geo.tape, Theme.tape, 0, 0.12, 0, 'tape');
  root.userData.sconceColor = color;
  return root;
}

export function poseSconce(rig: THREE.Group, now: number): void {
  const bulb = rig.getObjectByName('bulb');
  if (!bulb) return;
  const pulse = 1 + Math.sin(now / 220) * 0.06;
  bulb.scale.setScalar(pulse);
}

export function tintSconce(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => tintLitMesh(obj, multiply));
}

export function disposeSconce(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
