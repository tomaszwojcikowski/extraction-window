import * as THREE from 'three';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import type { EnemyTier } from '../sim/types';
import { HOVER_SHAPES, silhouetteFor, type Silhouette } from '../art/silhouette';
import { Material, Theme } from '../scenes/theme';

const Geo = {
  body: new THREE.BoxGeometry(0.42, 0.22, 0.32),
  long: new THREE.BoxGeometry(0.55, 0.2, 0.28),
  hunk: new THREE.BoxGeometry(0.48, 0.38, 0.34),
  plate: new THREE.BoxGeometry(0.52, 0.42, 0.3),
  leg: new THREE.BoxGeometry(0.07, 0.2, 0.07),
  boot: new THREE.BoxGeometry(0.09, 0.05, 0.12),
  stub: new THREE.BoxGeometry(0.06, 0.12, 0.06),
  head: new THREE.BoxGeometry(0.28, 0.22, 0.26),
  snout: new THREE.BoxGeometry(0.14, 0.1, 0.22),
  eye: new THREE.BoxGeometry(0.06, 0.06, 0.04),
  sphere: new THREE.SphereGeometry(0.18, 8, 6),
  puff: new THREE.SphereGeometry(0.14, 7, 5),
  wing: new THREE.BoxGeometry(0.4, 0.03, 0.2),
  sting: new THREE.BoxGeometry(0.06, 0.06, 0.18),
  seg: new THREE.BoxGeometry(0.2, 0.16, 0.2),
  disc: new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8),
  lens: new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8),
  post: new THREE.BoxGeometry(0.16, 0.28, 0.16),
  crown: new THREE.BoxGeometry(0.08, 0.16, 0.08),
  bar: new THREE.BoxGeometry(0.36, 0.05, 0.08),
};

const SCALE: Record<Silhouette, number> = {
  scuttler: 0.82,
  crawler_body: 1.02,
  spore_body: 0.92,
  bloom: 0.96,
  darter: 0.88,
  crouched: 1,
  annelid: 1.02,
  bulwark: 1.12,
  turret: 0.98,
  emitter: 0.94,
  chassis: 1.18,
  coil: 1.08,
  reacher: 1.14,
  aperture: 1.04,
};

function paint(hex: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: hex });
}

function part(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  hex: number,
  x: number,
  y: number,
  z: number,
  name: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, paint(hex));
  mesh.position.set(x, y, z);
  mesh.name = name;
  mesh.userData.baseColor = hex;
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

function shades(color: number): { mid: number; deep: number; lit: number } {
  return { mid: color, deep: Material.recess, lit: Theme.ink };
}

function eyes(parent: THREE.Object3D, ion: boolean, y: number, z: number, spread: number): void {
  const glow = ion ? Theme.biolum : Theme.rust;
  part(parent, Geo.eye, glow, -spread, y, z, 'eyeL');
  part(parent, Geo.eye, glow, spread, y, z, 'eyeR');
}

function legs(bob: THREE.Group, count: number, midY: number, span: number, deep: number): void {
  const hipY = midY;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const z = (t - 0.5) * span;
    const side = i % 2 === 0 ? -1 : 1;
    const hip = pivot(bob, i === 0 ? 'hipL' : i === 1 ? 'hipR' : `hip${i}`, side * 0.16, hipY, z);
    part(hip, Geo.leg, deep, 0, -0.1, 0, `leg${i}`);
    part(hip, Geo.boot, deep, 0, -0.2, 0.02, `boot${i}`);
  }
}

function crown(bob: THREE.Group, brand: string | undefined, y: number): void {
  if (!brand) return;
  const hex = brand === 'flarebound' ? Theme.arc : brand === 'warded' ? Theme.tape : Theme.flag;
  part(bob, Geo.crown, hex, 0, y, 0, 'crown');
}

function buildShape(bob: THREE.Group, shape: Silhouette, kind: EnemyKind, ion: boolean, color: number): void {
  const { mid, deep, lit } = shades(color);
  switch (shape) {
    case 'scuttler':
      part(bob, Geo.body, mid, 0, 0.22, 0, 'torso');
      part(bob, Geo.bar, lit, 0, 0.3, 0.02, 'carapace');
      legs(bob, 4, 0.2, 0.28, deep);
      eyes(bob, ion, 0.28, 0.16, 0.08);
      break;
    case 'crawler_body':
      part(bob, Geo.long, mid, 0, 0.24, 0, 'torso');
      part(bob, Geo.bar, lit, 0, 0.34, 0, 'ridge');
      legs(bob, 6, 0.22, 0.4, deep);
      eyes(bob, ion, 0.3, 0.14, 0.1);
      break;
    case 'spore_body':
      part(bob, Geo.post, deep, 0, 0.16, 0, 'stalk');
      part(bob, Geo.puff, mid, 0, 0.4, 0, 'cap');
      part(bob, Geo.puff, ion ? Theme.biolum : Theme.rust, 0, 0.48, 0.04, 'core');
      break;
    case 'bloom':
      part(bob, Geo.sphere, mid, 0, 0.32, 0, 'torso');
      part(bob, Geo.stub, ion ? Theme.biolum : Theme.rust, 0.16, 0.4, 0.08, 'lobeL');
      part(bob, Geo.stub, ion ? Theme.biolum : Theme.rust, -0.16, 0.4, 0.08, 'lobeR');
      part(bob, Geo.eye, Theme.arcWhite, 0, 0.36, 0.16, 'core');
      break;
    case 'darter': {
      part(bob, Geo.body, mid, 0, 0.36, 0, 'torso');
      const wingL = pivot(bob, 'wingL', -0.12, 0.4, -0.02);
      part(wingL, Geo.wing, lit, -0.16, 0, 0, 'wingMeshL');
      const wingR = pivot(bob, 'wingR', 0.12, 0.4, -0.02);
      part(wingR, Geo.wing, lit, 0.16, 0, 0, 'wingMeshR');
      if (kind === 'mastling') part(bob, Geo.bar, deep, 0, 0.32, 0.04, 'mast');
      else part(bob, Geo.sting, ion ? Theme.biolum : Theme.rust, 0, 0.22, 0.22, 'sting');
      eyes(bob, ion, 0.42, 0.16, 0.06);
      break;
    }
    case 'crouched':
      part(bob, Geo.hunk, mid, 0.04, 0.28, -0.04, 'torso');
      part(bob, Geo.snout, mid, 0, 0.3, 0.2, 'snout');
      legs(bob, 2, 0.22, 0.12, deep);
      part(bob, Geo.bar, ion ? Theme.biolum : Theme.rust, 0, 0.34, 0.08, 'stripe');
      eyes(bob, ion, 0.34, 0.28, 0.07);
      break;
    case 'annelid':
      part(bob, Geo.seg, mid, 0, 0.14, -0.22, 'seg0');
      part(bob, Geo.seg, mid, 0, 0.2, -0.02, 'seg1');
      part(bob, Geo.seg, mid, 0, 0.26, 0.18, 'seg2');
      part(bob, Geo.sphere, ion ? Theme.biolum : Theme.rust, 0, 0.34, 0.32, 'maw');
      part(bob, Geo.eye, Theme.arcWhite, 0, 0.36, 0.42, 'core');
      break;
    case 'bulwark':
      part(bob, Geo.plate, mid, 0, 0.32, 0, 'torso');
      part(bob, Geo.bar, Theme.tape, 0, 0.42, 0.04, 'tape');
      part(bob, Geo.post, deep, -0.16, 0.14, 0.04, 'legL');
      part(bob, Geo.post, deep, 0.16, 0.14, 0.04, 'legR');
      eyes(bob, ion, 0.4, 0.16, 0.09);
      break;
    case 'turret':
      part(bob, Geo.hunk, Theme.panel, 0, 0.16, 0, 'base');
      const head = pivot(bob, 'head', 0, 0.36, 0);
      part(head, Geo.head, mid, 0, 0.08, 0, 'cupola');
      part(head, Geo.sting, Theme.tape, 0, 0.08, 0.2, 'barrel');
      part(head, Geo.eye, ion ? Theme.biolum : Theme.rust, 0, 0.1, 0.14, 'sight');
      break;
    case 'emitter':
      part(bob, Geo.disc, Theme.panel, 0, 0.28, 0, 'hull');
      const lens = part(bob, Geo.lens, Theme.arcWhite, 0, 0.28, 0.16, 'lens');
      lens.rotation.x = Math.PI / 2;
      part(bob, Geo.bar, Theme.panelEdge, 0, 0.34, 0, 'rail');
      part(bob, Geo.stub, mid, -0.22, 0.28, 0, 'finL');
      part(bob, Geo.stub, mid, 0.22, 0.28, 0, 'finR');
      break;
    case 'chassis':
      part(bob, Geo.plate, Theme.panel, 0, 0.32, 0, 'torso');
      part(bob, Geo.bar, mid, 0, 0.48, 0.02, 'brow');
      part(bob, Geo.post, Theme.panelEdge, -0.16, 0.12, 0.04, 'hipL');
      part(bob, Geo.post, Theme.panelEdge, 0.16, 0.12, 0.04, 'hipR');
      part(bob, Geo.eye, ion ? Theme.biolum : Theme.rust, 0, 0.36, 0.16, 'sight');
      break;
    case 'coil':
      part(bob, Geo.seg, mid, 0, 0.16, -0.16, 'coil0');
      part(bob, Geo.seg, mid, 0.08, 0.28, 0, 'coil1');
      part(bob, Geo.seg, mid, 0, 0.4, 0.16, 'coil2');
      part(bob, Geo.snout, ion ? Theme.biolum : Theme.rust, 0, 0.44, 0.32, 'fang');
      eyes(bob, ion, 0.46, 0.28, 0.07);
      break;
    case 'reacher':
      part(bob, Geo.body, mid, 0, 0.42, 0, 'torso');
      const armL = pivot(bob, 'hipL', -0.2, 0.44, 0.04);
      part(armL, Geo.leg, deep, 0, -0.08, 0.12, 'reachL');
      const armR = pivot(bob, 'hipR', 0.2, 0.44, 0.04);
      part(armR, Geo.leg, deep, 0, -0.08, 0.12, 'reachR');
      part(bob, Geo.head, mid, 0, 0.58, 0.06, 'head');
      eyes(bob, ion, 0.6, 0.18, 0.07);
      break;
    case 'aperture':
      part(bob, Geo.disc, mid, 0, 0.34, 0, 'ring');
      const iris = part(bob, Geo.lens, Theme.scanWash, 0, 0.34, 0.02, 'iris');
      iris.rotation.x = Math.PI / 2;
      part(bob, Geo.stub, ion ? Theme.biolum : Theme.rust, 0.18, 0.4, 0.08, 'spoke0');
      part(bob, Geo.stub, ion ? Theme.biolum : Theme.rust, -0.18, 0.4, 0.08, 'spoke1');
      part(bob, Geo.stub, ion ? Theme.biolum : Theme.rust, 0, 0.4, 0.18, 'spoke2');
      break;
  }
}

/**
 * Blocky hostile — body plan from `silhouetteFor`, tint from `def.color`.
 * Local +Z is the face. Unlit MeshBasicMaterial so flood tint stays honest.
 */
export function createFauna(kind: EnemyKind, tier: EnemyTier = 'normal'): THREE.Group {
  const def = ENEMIES[kind];
  const shape = silhouetteFor(kind);
  const ion = def.damageType === 'ion';
  const root = new THREE.Group();
  root.name = `fauna:${kind}`;
  root.userData.silhouette = shape;
  root.userData.hover = HOVER_SHAPES.has(shape);
  const bob = new THREE.Group();
  bob.name = 'bob';
  root.add(bob);
  buildShape(bob, shape, kind, ion, def.color);
  crown(bob, def.brand, 0.62);
  let s = SCALE[shape];
  if (tier === 'elite') s *= 1.12;
  if (tier === 'boss') s *= 1.28;
  root.scale.setScalar(s);
  root.userData.baseScale = s;
  return root;
}

export function poseFauna(
  rig: THREE.Group,
  now: number,
  hopT: number | null,
  strideSign: number,
  windup: boolean,
): void {
  const bob = rig.getObjectByName('bob');
  if (!bob) return;
  const hover = Boolean(rig.userData.hover);
  const hipL = rig.getObjectByName('hipL');
  const hipR = rig.getObjectByName('hipR');
  const wingL = rig.getObjectByName('wingL');
  const wingR = rig.getObjectByName('wingR');
  const head = rig.getObjectByName('head');

  if (hopT === null) {
    bob.position.y = Math.sin(now / (hover ? 340 : 480)) * (hover ? 0.045 : 0.012);
    bob.position.z = windup ? 0.05 : 0;
    if (hipL) hipL.rotation.x = 0;
    if (hipR) hipR.rotation.x = 0;
    if (wingL) wingL.rotation.z = Math.sin(now / 90) * 0.18;
    if (wingR) wingR.rotation.z = -Math.sin(now / 90) * 0.18;
    if (head) head.rotation.y = windup ? 0.2 : Math.sin(now / 900) * 0.15;
    return;
  }

  const swing = Math.sin(hopT * Math.PI) * 0.55 * strideSign;
  bob.position.y = Math.sin(hopT * Math.PI) * (hover ? 0.08 : 0.04);
  bob.position.z = 0;
  if (hipL) hipL.rotation.x = swing;
  if (hipR) hipR.rotation.x = -swing;
  if (wingL) wingL.rotation.z = swing * 0.4;
  if (wingR) wingR.rotation.z = -swing * 0.4;
}

export function tintFauna(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const base = obj.userData.baseColor;
    if (typeof base !== 'number') return;
    const mat = obj.material as THREE.MeshBasicMaterial;
    mat.color.setHex(base).multiply(multiply);
  });
}

export function disposeFauna(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
