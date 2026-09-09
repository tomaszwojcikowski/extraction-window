import * as THREE from 'three';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import type { EnemyTier } from '../sim/types';
import { HOVER_SHAPES, silhouetteFor, type Silhouette } from '../art/silhouette';
import { Material, Theme } from '../scenes/theme';
import { hopLift, hopSquash, hopSwing } from './poseHumanoid';
import { litPaint, tintLitMesh } from './litMaterial';
import { ball, cap, roundBox, tube } from './softGeo';

const Geo = {
  body: roundBox(0.42, 0.22, 0.32),
  long: roundBox(0.55, 0.2, 0.28),
  hunk: roundBox(0.48, 0.38, 0.34, 0.08),
  plate: roundBox(0.52, 0.42, 0.3, 0.06),
  plateSmall: roundBox(0.22, 0.1, 0.2, 0.03),
  leg: cap(0.035, 0.09),
  shin: cap(0.03, 0.05),
  boot: roundBox(0.09, 0.05, 0.12, 0.02),
  stub: cap(0.03, 0.06),
  mandible: roundBox(0.05, 0.04, 0.14, 0.015),
  claw: roundBox(0.05, 0.05, 0.1, 0.015),
  head: roundBox(0.28, 0.22, 0.26, 0.06),
  snout: roundBox(0.14, 0.1, 0.22, 0.03),
  eye: ball(0.035, 8, 6),
  sphere: ball(0.18, 12, 9),
  puff: ball(0.14, 11, 8),
  spore: ball(0.07, 10, 8),
  wing: roundBox(0.42, 0.03, 0.22, 0.01),
  vein: roundBox(0.3, 0.02, 0.04, 0.008),
  sting: cap(0.03, 0.12),
  seg: roundBox(0.2, 0.16, 0.2, 0.05),
  ridge: roundBox(0.16, 0.06, 0.1, 0.02),
  disc: tube(0.22, 0.22, 0.08, 12),
  lens: tube(0.1, 0.1, 0.06, 12),
  ring: tube(0.16, 0.16, 0.04, 12),
  post: cap(0.08, 0.12),
  crown: roundBox(0.08, 0.16, 0.08, 0.02),
  bar: roundBox(0.36, 0.05, 0.08, 0.015),
  tendril: cap(0.02, 0.14),
  bolt: ball(0.03, 8, 6),
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

const HIP_NAMES = ['hipL', 'hipR', 'hip2', 'hip3', 'hip4', 'hip5'] as const;
const SEG_NAMES = ['seg0', 'seg1', 'seg2', 'coil0', 'coil1', 'coil2'] as const;

function paint(hex: number): THREE.MeshLambertMaterial {
  return litPaint(hex);
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
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const z = (t - 0.5) * span;
    const side = i % 2 === 0 ? -1 : 1;
    const hip = pivot(bob, i === 0 ? 'hipL' : i === 1 ? 'hipR' : `hip${i}`, side * 0.16, midY, z);
    part(hip, Geo.leg, deep, 0, -0.08, 0, `leg${i}`);
    const knee = pivot(hip, i === 0 ? 'kneeL' : i === 1 ? 'kneeR' : `knee${i}`, 0, -0.14, 0);
    part(knee, Geo.shin, deep, 0, -0.04, 0, `shin${i}`);
    part(knee, Geo.boot, deep, 0, -0.09, 0.03, `boot${i}`);
  }
}

function crown(bob: THREE.Group, brand: string | undefined, y: number): void {
  if (!brand) return;
  const hex = brand === 'flarebound' ? Theme.arc : brand === 'warded' ? Theme.tape : Theme.flag;
  part(bob, Geo.crown, hex, 0, y, 0, 'crown');
}

function buildShape(bob: THREE.Group, shape: Silhouette, kind: EnemyKind, ion: boolean, color: number): void {
  const { mid, deep, lit } = shades(color);
  const glow = ion ? Theme.biolum : Theme.rust;
  switch (shape) {
    case 'scuttler': {
      part(bob, Geo.body, mid, 0, 0.22, 0, 'torso');
      part(bob, Geo.bar, lit, 0, 0.3, 0.02, 'carapace');
      part(bob, Geo.plateSmall, deep, 0, 0.26, -0.12, 'abdomen');
      legs(bob, 4, 0.2, 0.28, deep);
      eyes(bob, ion, 0.28, 0.16, 0.08);
      const jaw = pivot(bob, 'jaw', 0, 0.22, 0.16);
      part(jaw, Geo.mandible, glow, -0.05, 0, 0.04, 'mandibleL');
      part(jaw, Geo.mandible, glow, 0.05, 0, 0.04, 'mandibleR');
      break;
    }
    case 'crawler_body':
      part(bob, Geo.long, mid, 0, 0.24, 0, 'torso');
      part(bob, Geo.bar, lit, 0, 0.34, 0, 'ridge');
      part(bob, Geo.plateSmall, deep, 0, 0.28, -0.18, 'tail');
      part(bob, Geo.ridge, glow, 0, 0.36, 0.08, 'keel');
      legs(bob, 6, 0.22, 0.4, deep);
      eyes(bob, ion, 0.3, 0.14, 0.1);
      break;
    case 'spore_body':
      part(bob, Geo.post, deep, 0, 0.16, 0, 'stalk');
      part(bob, Geo.puff, mid, 0, 0.4, 0, 'cap');
      part(bob, Geo.puff, glow, 0, 0.48, 0.04, 'core');
      part(bob, Geo.spore, glow, 0.12, 0.44, 0.08, 'spore0');
      part(bob, Geo.spore, glow, -0.1, 0.42, -0.06, 'spore1');
      part(bob, Geo.tendril, deep, 0.08, 0.22, 0.08, 'gill');
      break;
    case 'bloom':
      part(bob, Geo.sphere, mid, 0, 0.32, 0, 'torso');
      part(bob, Geo.stub, glow, 0.16, 0.4, 0.08, 'lobeL');
      part(bob, Geo.stub, glow, -0.16, 0.4, 0.08, 'lobeR');
      part(bob, Geo.stub, glow, 0, 0.46, -0.1, 'lobeF');
      part(bob, Geo.tendril, deep, 0.1, 0.2, 0.1, 'tendrilL');
      part(bob, Geo.tendril, deep, -0.1, 0.2, 0.1, 'tendrilR');
      part(bob, Geo.eye, Theme.arcWhite, 0, 0.36, 0.16, 'core');
      break;
    case 'darter': {
      part(bob, Geo.body, mid, 0, 0.36, 0, 'torso');
      const wingL = pivot(bob, 'wingL', -0.12, 0.4, -0.02);
      part(wingL, Geo.wing, lit, -0.16, 0, 0, 'wingMeshL');
      part(wingL, Geo.vein, deep, -0.12, 0.01, 0, 'veinL');
      const wingR = pivot(bob, 'wingR', 0.12, 0.4, -0.02);
      part(wingR, Geo.wing, lit, 0.16, 0, 0, 'wingMeshR');
      part(wingR, Geo.vein, deep, 0.12, 0.01, 0, 'veinR');
      if (kind === 'mastling') part(bob, Geo.bar, deep, 0, 0.32, 0.04, 'mast');
      else part(bob, Geo.sting, glow, 0, 0.22, 0.22, 'sting');
      part(bob, Geo.claw, deep, 0, 0.28, -0.18, 'tail');
      eyes(bob, ion, 0.42, 0.16, 0.06);
      break;
    }
    case 'crouched': {
      part(bob, Geo.hunk, mid, 0.04, 0.28, -0.04, 'torso');
      part(bob, Geo.snout, mid, 0, 0.3, 0.2, 'snout');
      part(bob, Geo.ridge, glow, 0.08, 0.44, -0.04, 'earL');
      part(bob, Geo.ridge, glow, -0.08, 0.44, -0.04, 'earR');
      legs(bob, 2, 0.22, 0.12, deep);
      part(bob, Geo.bar, glow, 0, 0.34, 0.08, 'stripe');
      const jaw = pivot(bob, 'jaw', 0, 0.24, 0.28);
      part(jaw, Geo.claw, deep, -0.05, 0, 0.04, 'fangL');
      part(jaw, Geo.claw, deep, 0.05, 0, 0.04, 'fangR');
      eyes(bob, ion, 0.34, 0.28, 0.07);
      break;
    }
    case 'annelid':
      part(bob, Geo.seg, mid, 0, 0.14, -0.22, 'seg0');
      part(bob, Geo.ridge, deep, 0, 0.22, -0.22, 'ring0');
      part(bob, Geo.seg, mid, 0, 0.2, -0.02, 'seg1');
      part(bob, Geo.ridge, deep, 0, 0.28, -0.02, 'ring1');
      part(bob, Geo.seg, mid, 0, 0.26, 0.18, 'seg2');
      part(bob, Geo.sphere, glow, 0, 0.34, 0.32, 'maw');
      part(bob, Geo.mandible, Theme.arcWhite, -0.06, 0.32, 0.42, 'toothL');
      part(bob, Geo.mandible, Theme.arcWhite, 0.06, 0.32, 0.42, 'toothR');
      part(bob, Geo.eye, Theme.arcWhite, 0, 0.36, 0.42, 'core');
      break;
    case 'bulwark': {
      part(bob, Geo.plate, mid, 0, 0.32, 0, 'torso');
      part(bob, Geo.bar, Theme.tape, 0, 0.42, 0.04, 'tape');
      part(bob, Geo.plateSmall, deep, -0.2, 0.4, 0.02, 'pauldronL');
      part(bob, Geo.plateSmall, deep, 0.2, 0.4, 0.02, 'pauldronR');
      const hipL = pivot(bob, 'hipL', -0.16, 0.2, 0.04);
      part(hipL, Geo.post, deep, 0, -0.06, 0, 'legL');
      const hipR = pivot(bob, 'hipR', 0.16, 0.2, 0.04);
      part(hipR, Geo.post, deep, 0, -0.06, 0, 'legR');
      eyes(bob, ion, 0.4, 0.16, 0.09);
      break;
    }
    case 'turret': {
      part(bob, Geo.hunk, Theme.panel, 0, 0.16, 0, 'base');
      part(bob, Geo.bolt, Theme.panelEdge, -0.16, 0.08, 0.12, 'boltL');
      part(bob, Geo.bolt, Theme.panelEdge, 0.16, 0.08, 0.12, 'boltR');
      const head = pivot(bob, 'head', 0, 0.36, 0);
      part(head, Geo.head, mid, 0, 0.08, 0, 'cupola');
      part(head, Geo.ring, Theme.panelEdge, 0, 0.08, 0.12, 'collar');
      part(head, Geo.sting, Theme.tape, 0, 0.08, 0.22, 'barrel');
      part(head, Geo.eye, glow, 0, 0.1, 0.16, 'sight');
      break;
    }
    case 'emitter': {
      part(bob, Geo.disc, Theme.panel, 0, 0.28, 0, 'hull');
      const lens = part(bob, Geo.lens, Theme.arcWhite, 0, 0.28, 0.16, 'lens');
      lens.rotation.x = Math.PI / 2;
      part(bob, Geo.bar, Theme.panelEdge, 0, 0.34, 0, 'rail');
      part(bob, Geo.stub, mid, -0.22, 0.28, 0, 'finL');
      part(bob, Geo.stub, mid, 0.22, 0.28, 0, 'finR');
      part(bob, Geo.stub, mid, 0, 0.28, -0.2, 'finF');
      part(bob, Geo.ring, glow, 0, 0.36, 0, 'halo');
      break;
    }
    case 'chassis': {
      part(bob, Geo.plate, Theme.panel, 0, 0.32, 0, 'torso');
      part(bob, Geo.bar, mid, 0, 0.48, 0.02, 'brow');
      part(bob, Geo.ridge, Theme.tape, 0, 0.36, 0.16, 'visorBar');
      const hipL = pivot(bob, 'hipL', -0.16, 0.18, 0.04);
      part(hipL, Geo.post, Theme.panelEdge, 0, -0.06, 0, 'treadL');
      const hipR = pivot(bob, 'hipR', 0.16, 0.18, 0.04);
      part(hipR, Geo.post, Theme.panelEdge, 0, -0.06, 0, 'treadR');
      part(bob, Geo.bolt, Theme.panelEdge, -0.18, 0.2, 0.14, 'boltL');
      part(bob, Geo.bolt, Theme.panelEdge, 0.18, 0.2, 0.14, 'boltR');
      part(bob, Geo.eye, glow, 0, 0.36, 0.16, 'sight');
      break;
    }
    case 'coil':
      part(bob, Geo.seg, mid, 0, 0.16, -0.16, 'coil0');
      part(bob, Geo.ridge, deep, 0, 0.24, -0.16, 'coilRing0');
      part(bob, Geo.seg, mid, 0.08, 0.28, 0, 'coil1');
      part(bob, Geo.seg, mid, 0, 0.4, 0.16, 'coil2');
      part(bob, Geo.snout, glow, 0, 0.44, 0.32, 'fang');
      part(bob, Geo.claw, glow, 0, 0.4, 0.42, 'tongue');
      eyes(bob, ion, 0.46, 0.28, 0.07);
      break;
    case 'reacher': {
      part(bob, Geo.body, mid, 0, 0.42, 0, 'torso');
      const armL = pivot(bob, 'hipL', -0.2, 0.44, 0.04);
      part(armL, Geo.leg, deep, 0, -0.08, 0.1, 'reachL');
      const clawL = pivot(armL, 'kneeL', 0, -0.12, 0.18);
      part(clawL, Geo.claw, glow, 0, 0, 0.05, 'clawL');
      const armR = pivot(bob, 'hipR', 0.2, 0.44, 0.04);
      part(armR, Geo.leg, deep, 0, -0.08, 0.1, 'reachR');
      const clawR = pivot(armR, 'kneeR', 0, -0.12, 0.18);
      part(clawR, Geo.claw, glow, 0, 0, 0.05, 'clawR');
      part(bob, Geo.head, mid, 0, 0.58, 0.06, 'crownHead');
      eyes(bob, ion, 0.6, 0.18, 0.07);
      break;
    }
    case 'aperture': {
      part(bob, Geo.disc, mid, 0, 0.34, 0, 'ring');
      const iris = part(bob, Geo.lens, Theme.scanWash, 0, 0.34, 0.02, 'iris');
      iris.rotation.x = Math.PI / 2;
      part(bob, Geo.ring, glow, 0, 0.34, 0.06, 'irisRing');
      part(bob, Geo.stub, glow, 0.18, 0.4, 0.08, 'spoke0');
      part(bob, Geo.stub, glow, -0.18, 0.4, 0.08, 'spoke1');
      part(bob, Geo.stub, glow, 0, 0.4, 0.18, 'spoke2');
      part(bob, Geo.stub, glow, 0, 0.4, -0.16, 'spoke3');
      break;
    }
  }
}

/**
 * Silhouette hostile — body plan from `silhouetteFor`, tint from `def.color`.
 * Local +Z is the face. Lambert × sim flood; no PointLights.
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
  const lift = hopT === null ? 0 : hopLift(hopT);
  const swing = hopT === null ? 0 : hopSwing(hopT, strideSign, 0.55);

  if (hopT === null) {
    bob.position.y = Math.sin(now / (hover ? 480 : 720)) * (hover ? 0.055 : 0.016);
    bob.position.z = windup ? 0.07 : 0;
    bob.rotation.x = windup ? 0.16 : Math.sin(now / 980) * (hover ? 0.05 : 0);
    bob.rotation.z = 0;
    bob.scale.set(1, 1, 1);
  } else {
    const squash = hopSquash(hopT) * 0.07;
    bob.position.y = lift * (hover ? 0.09 : 0.05);
    bob.position.z = 0;
    bob.rotation.x = lift * 0.08;
    bob.rotation.z = swing * 0.12;
    bob.scale.set(1 + squash * 0.4, 1 - squash, 1 + squash * 0.4);
  }

  HIP_NAMES.forEach((name, i) => {
    const hip = rig.getObjectByName(name);
    if (!hip) return;
    const phase = (i % 2 === 0 ? 1 : -1) * (i >= 2 ? -1 : 1);
    if (hopT === null) {
      hip.rotation.x = 0;
      hip.rotation.z = windup ? phase * 0.14 : 0;
    } else {
      hip.rotation.x = hopSwing(hopT, strideSign * phase, i < 2 ? 0.55 : 0.42);
      hip.rotation.z = 0;
    }
    const kneeName = i === 0 ? 'kneeL' : i === 1 ? 'kneeR' : `knee${i}`;
    const knee = hip.getObjectByName(kneeName);
    if (knee) knee.rotation.x = hopT === null ? 0.1 : 0.12 + lift * 0.55;
  });

  const wingL = rig.getObjectByName('wingL');
  const wingR = rig.getObjectByName('wingR');
  if (wingL && wingR) {
    const flap = hopT === null ? Math.sin(now / 160) * (windup ? 0.45 : 0.24) : hopSwing(hopT, 1, 0.38);
    wingL.rotation.z = flap;
    wingR.rotation.z = -flap;
    wingL.rotation.y = windup ? -0.18 : 0;
    wingR.rotation.y = windup ? 0.18 : 0;
  }

  const head = rig.getObjectByName('head');
  if (head) {
    head.rotation.y = windup ? 0.28 : Math.sin(now / 800) * 0.22;
    head.rotation.x = hopT !== null ? -lift * 0.1 : 0;
  }

  for (let i = 0; i < SEG_NAMES.length; i++) {
    const seg = rig.getObjectByName(SEG_NAMES[i]!);
    if (!seg) continue;
    const wave = hopT === null ? Math.sin(now / 420 + i * 0.9) : Math.sin(hopT * Math.PI + i * 0.7);
    seg.rotation.y = wave * 0.16;
    seg.position.x = wave * 0.025;
  }

  for (const name of ['lobeL', 'lobeR', 'lobeF', 'spore0', 'spore1', 'halo'] as const) {
    const lobe = rig.getObjectByName(name);
    if (!lobe) continue;
    const pulse = 1 + Math.sin(now / 280 + name.length) * (windup ? 0.22 : 0.1);
    lobe.scale.setScalar(pulse);
  }

  for (const name of ['finL', 'finR', 'finF', 'spoke0', 'spoke1', 'spoke2', 'spoke3'] as const) {
    const fin = rig.getObjectByName(name);
    if (!fin) continue;
    const wobble = hopT === null ? Math.sin(now / 380 + fin.position.x) * 0.12 : lift * 0.18;
    fin.rotation.z = wobble;
  }

  const iris = rig.getObjectByName('iris');
  if (iris) iris.rotation.z = now / 360;
  const lens = rig.getObjectByName('lens');
  if (lens && hopT === null) lens.rotation.z = Math.sin(now / 500) * 0.2;

  const jaw = rig.getObjectByName('jaw');
  if (jaw) jaw.rotation.x = hopT === null ? Math.sin(now / 210) * (windup ? 0.2 : 0.08) : lift * 0.22;

  const tongue = rig.getObjectByName('tongue');
  if (tongue) tongue.position.z = 0.42 + Math.sin(now / 180) * 0.03;
}

export function tintFauna(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => tintLitMesh(obj, multiply));
}

export function disposeFauna(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
