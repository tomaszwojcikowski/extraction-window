import * as THREE from 'three';
import { Material, Theme } from '../scenes/theme';

/** Longer than Phaser MOVE_MS so a 3D stride can read. */
export const SURVEYOR_HOP_MS = 220;

/** Shared geos — v2 field only; do not dispose with the rig. */
const Geo = {
  boot: new THREE.BoxGeometry(0.13, 0.07, 0.18),
  leg: new THREE.BoxGeometry(0.11, 0.22, 0.13),
  torso: new THREE.BoxGeometry(0.3, 0.34, 0.2),
  plate: new THREE.BoxGeometry(0.16, 0.12, 0.06),
  pack: new THREE.BoxGeometry(0.24, 0.26, 0.14),
  helmet: new THREE.SphereGeometry(0.15, 8, 6),
  visor: new THREE.BoxGeometry(0.2, 0.09, 0.05),
  seam: new THREE.BoxGeometry(0.08, 0.05, 0.06),
  arm: new THREE.BoxGeometry(0.09, 0.28, 0.09),
  glove: new THREE.BoxGeometry(0.1, 0.07, 0.1),
  stripe: new THREE.BoxGeometry(0.28, 0.045, 0.22),
  lamp: new THREE.BoxGeometry(0.09, 0.09, 0.07),
  antenna: new THREE.BoxGeometry(0.03, 0.16, 0.03),
};

function paint(hex: number, glow?: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: glow ?? hex });
}

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
  const mesh = new THREE.Mesh(geo, paint(hex, glow));
  mesh.position.set(x, y, z);
  mesh.name = name;
  mesh.userData.baseColor = glow ?? hex;
  parent.add(mesh);
  return mesh;
}

function pivot(parent: THREE.Object3D, name: string, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * Blocky Halcyon surveyor — helmet, visor glass, tape harness, field pack lamp.
 * Local +Z is the face (south / toward the 3/4 camera at rest).
 * Unlit MeshBasicMaterial so flood tint matches the sim, not mesh lamps.
 */
export function createSurveyor(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'surveyor';

  const bob = new THREE.Group();
  bob.name = 'bob';
  root.add(bob);

  const hipL = pivot(bob, 'hipL', -0.08, 0.29, 0.01);
  part(hipL, Geo.leg, Material.suitMid, 0, -0.11, 0, 'legL');
  part(hipL, Geo.boot, Material.visor, 0, -0.255, 0.02, 'bootL');
  const tapeL = part(hipL, Geo.stripe, Theme.tape, 0, -0.21, 0.02, 'bootTapeL');
  tapeL.scale.set(0.4, 0.45, 0.55);

  const hipR = pivot(bob, 'hipR', 0.08, 0.29, 0.01);
  part(hipR, Geo.leg, Material.suitMid, 0, -0.11, 0, 'legR');
  part(hipR, Geo.boot, Material.visor, 0, -0.255, 0.02, 'bootR');
  const tapeR = part(hipR, Geo.stripe, Theme.tape, 0, -0.21, 0.02, 'bootTapeR');
  tapeR.scale.set(0.4, 0.45, 0.55);

  part(bob, Geo.torso, Material.suitLit, 0, 0.42, 0, 'torso');
  part(bob, Geo.stripe, Theme.tape, 0, 0.52, 0, 'harness');
  part(bob, Geo.plate, Theme.ink, 0, 0.4, 0.12, 'chest');
  part(bob, Geo.lamp, Theme.biolum, 0, 0.4, 0.16, 'chestLamp', Theme.biolum);

  const shoulderL = pivot(bob, 'shoulderL', -0.2, 0.52, 0);
  part(shoulderL, Geo.arm, Material.suitLit, 0, -0.14, 0, 'armL');
  part(shoulderL, Geo.glove, Material.suitLit, 0, -0.3, 0.01, 'gloveL');

  const shoulderR = pivot(bob, 'shoulderR', 0.2, 0.52, 0);
  part(shoulderR, Geo.arm, Material.suitLit, 0, -0.14, 0, 'armR');
  part(shoulderR, Geo.glove, Material.suitLit, 0, -0.3, 0.01, 'gloveR');

  part(bob, Geo.pack, Material.suitDeep, 0, 0.46, -0.16, 'pack');
  const packRail = part(bob, Geo.stripe, Theme.tape, 0, 0.54, -0.16, 'packRail');
  packRail.scale.set(0.7, 0.7, 0.7);
  part(bob, Geo.lamp, Theme.biolum, 0, 0.44, -0.24, 'packLamp', Theme.arcWhite);
  part(bob, Geo.antenna, Theme.panelEdge, 0.08, 0.64, -0.16, 'antenna');
  part(bob, Geo.seam, Theme.tape, 0.08, 0.73, -0.16, 'antennaTip', Theme.tape);

  part(bob, Geo.helmet, Material.suitMid, 0, 0.68, 0.04, 'helmet');
  part(bob, Geo.visor, Theme.biolum, 0, 0.67, 0.16, 'visor', Theme.biolum);
  part(bob, Geo.seam, Theme.arcWhite, 0, 0.69, 0.19, 'visorGlint', Theme.arcWhite);
  part(bob, Geo.seam, Material.suitLit, -0.14, 0.7, 0.04, 'sealL');
  part(bob, Geo.seam, Material.suitLit, 0.14, 0.7, 0.04, 'sealR');

  root.scale.setScalar(1.15);
  return root;
}

/**
 * `hopT` is 0–1 through a tile hop (`null` = idle). `strideSign` flips left/right lead.
 */
export function poseSurveyor(
  rig: THREE.Group,
  now: number,
  hopT: number | null,
  strideSign: number,
): void {
  const bob = rig.getObjectByName('bob');
  const hipL = rig.getObjectByName('hipL');
  const hipR = rig.getObjectByName('hipR');
  const shoulderL = rig.getObjectByName('shoulderL');
  const shoulderR = rig.getObjectByName('shoulderR');
  const torso = rig.getObjectByName('torso');
  if (!bob || !hipL || !hipR || !shoulderL || !shoulderR) return;

  if (hopT === null) {
    bob.position.y = Math.sin(now / 420) * 0.018;
    hipL.rotation.x = 0;
    hipR.rotation.x = 0;
    shoulderL.rotation.x = 0;
    shoulderR.rotation.x = 0;
    if (torso) torso.rotation.x = 0;
    return;
  }

  const swing = Math.sin(hopT * Math.PI) * 0.78 * strideSign;
  bob.position.y = Math.sin(hopT * Math.PI) * 0.055;
  hipL.rotation.x = swing;
  hipR.rotation.x = -swing;
  shoulderL.rotation.x = -swing * 0.85;
  shoulderR.rotation.x = swing * 0.85;
  if (torso) torso.rotation.x = 0.1;
}

export function disposeSurveyor(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}

export function tintSurveyor(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const base = obj.userData.baseColor;
    if (typeof base !== 'number') return;
    const mat = obj.material as THREE.MeshBasicMaterial;
    mat.color.setHex(base).multiply(multiply);
  });
}

export const SURVEYOR_PARTS = [
  'helmet',
  'visor',
  'pack',
  'packLamp',
  'torso',
  'harness',
  'bob',
  'hipL',
  'hipR',
  'shoulderL',
  'shoulderR',
] as const;
