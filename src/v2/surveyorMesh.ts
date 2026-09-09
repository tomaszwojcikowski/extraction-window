import * as THREE from 'three';
import { Material, Theme } from '../scenes/theme';
import { poseHumanoid } from './poseHumanoid';
import { litPaint, tintLitMesh } from './litMaterial';
import { ball, cap, roundBox } from './softGeo';

/** Longer than Phaser MOVE_MS so a 3D stride can read. */
export const SURVEYOR_HOP_MS = 280;

/** Shared geos — v2 field only; do not dispose with the rig. */
const Geo = {
  boot: roundBox(0.14, 0.07, 0.2, 0.02),
  thigh: cap(0.055, 0.08),
  shin: cap(0.05, 0.07),
  pad: roundBox(0.13, 0.06, 0.08, 0.02),
  torso: roundBox(0.32, 0.34, 0.22, 0.05),
  plate: roundBox(0.16, 0.12, 0.06, 0.02),
  collar: roundBox(0.28, 0.06, 0.18, 0.02),
  belt: roundBox(0.34, 0.05, 0.24, 0.015),
  pouch: roundBox(0.08, 0.1, 0.07, 0.02),
  pack: roundBox(0.26, 0.28, 0.16, 0.04),
  packCan: cap(0.04, 0.1),
  helmet: ball(0.15, 12, 10),
  cheek: roundBox(0.08, 0.1, 0.1, 0.02),
  visor: roundBox(0.2, 0.09, 0.05, 0.015),
  visorRim: roundBox(0.22, 0.11, 0.03, 0.01),
  seam: roundBox(0.08, 0.05, 0.06, 0.015),
  upperArm: cap(0.05, 0.08),
  forearm: cap(0.045, 0.075),
  glove: roundBox(0.11, 0.07, 0.11, 0.025),
  stripe: roundBox(0.28, 0.045, 0.22, 0.01),
  lamp: roundBox(0.09, 0.09, 0.07, 0.02),
  antenna: cap(0.012, 0.14),
  phaserGrip: roundBox(0.06, 0.1, 0.06, 0.015),
  phaserBody: roundBox(0.08, 0.07, 0.16, 0.02),
  phaserBarrel: cap(0.018, 0.12),
  phaserTape: roundBox(0.09, 0.03, 0.05, 0.008),
  phaserMuzzle: roundBox(0.045, 0.045, 0.045, 0.012),
};

function paint(hex: number, glow?: number): THREE.MeshLambertMaterial {
  return litPaint(hex, { glow });
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

function buildLeg(bob: THREE.Group, side: 'L' | 'R'): void {
  const x = side === 'L' ? -0.11 : 0.11;
  const hip = pivot(bob, `hip${side}`, x, 0.3, 0.01);
  part(hip, Geo.thigh, Material.suitMid, 0, -0.08, 0, `thigh${side}`);
  const knee = pivot(hip, `knee${side}`, 0, -0.16, 0);
  part(knee, Geo.shin, Material.suitDeep, 0, -0.07, 0, `shin${side}`);
  part(knee, Geo.pad, Theme.tape, 0, -0.02, 0.06, `kneePad${side}`);
  part(knee, Geo.boot, Material.visor, 0, -0.16, 0.03, `boot${side}`);
  const tape = part(knee, Geo.stripe, Theme.tape, 0, -0.12, 0.03, `bootTape${side}`);
  tape.scale.set(0.38, 0.4, 0.5);
}

function buildArm(bob: THREE.Group, side: 'L' | 'R'): void {
  const x = side === 'L' ? -0.24 : 0.24;
  const shoulder = pivot(bob, `shoulder${side}`, x, 0.54, 0.02);
  part(shoulder, Geo.upperArm, Material.suitLit, 0, -0.08, 0, `upperArm${side}`);
  const elbow = pivot(shoulder, `elbow${side}`, 0, -0.16, 0);
  part(elbow, Geo.forearm, Material.suitMid, 0, -0.07, 0.02, `forearm${side}`);
  const glove = part(elbow, Geo.glove, Material.suitLit, 0, -0.16, 0.02, `glove${side}`);
  if (side === 'R') buildPhaser(glove);
}

/** Survey Phaser — hidden until worn. Local +Z is the barrel. */
function buildPhaser(glove: THREE.Object3D): void {
  const gun = new THREE.Group();
  gun.name = 'phaser';
  gun.visible = false;
  gun.position.set(0.03, -0.02, 0.1);
  gun.rotation.x = -0.18;
  glove.add(gun);
  part(gun, Geo.phaserGrip, Material.suitDeep, 0, 0.02, -0.02, 'phaserGrip');
  part(gun, Geo.phaserBody, Material.visor, 0, 0.04, 0.08, 'phaserBody');
  const barrel = part(gun, Geo.phaserBarrel, Theme.panelEdge, 0, 0.05, 0.2, 'phaserBarrel');
  barrel.rotation.x = Math.PI / 2;
  part(gun, Geo.phaserTape, Theme.tape, 0, 0.07, 0.04, 'phaserTape');
  part(gun, Geo.phaserMuzzle, Theme.scanWash, 0, 0.05, 0.3, 'phaserMuzzle', Theme.arcWhite);
}

/**
 * Blocky Halcyon surveyor — helmet, visor glass, tape harness, field pack lamp.
 * Local +Z is the face (south / toward the 3/4 camera at rest).
 * Lambert × sim flood tint; form comes from the field key light, not PointLights.
 */
export function createSurveyor(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'surveyor';

  const bob = new THREE.Group();
  bob.name = 'bob';
  root.add(bob);

  buildLeg(bob, 'L');
  buildLeg(bob, 'R');

  const torso = pivot(bob, 'torso', 0, 0.44, 0);
  part(torso, Geo.torso, Material.suitLit, 0, 0, 0, 'torsoMesh');
  part(torso, Geo.stripe, Theme.tape, 0, 0.1, 0, 'harness');
  part(torso, Geo.collar, Material.suitMid, 0, 0.18, 0.02, 'collar');
  part(torso, Geo.belt, Material.suitDeep, 0, -0.14, 0, 'belt');
  part(torso, Geo.plate, Theme.ink, 0, -0.02, 0.13, 'chest');
  part(torso, Geo.lamp, Theme.biolum, 0, -0.02, 0.17, 'chestLamp', Theme.biolum);
  part(torso, Geo.pouch, Material.suitDeep, -0.16, -0.12, 0.08, 'pouchL');
  part(torso, Geo.pouch, Material.suitDeep, 0.16, -0.12, 0.08, 'pouchR');

  buildArm(bob, 'L');
  buildArm(bob, 'R');

  const pack = pivot(bob, 'packPivot', 0, 0.48, -0.18);
  part(pack, Geo.pack, Material.suitDeep, 0, 0, 0, 'pack');
  const packRail = part(pack, Geo.stripe, Theme.tape, 0, 0.08, 0, 'packRail');
  packRail.scale.set(0.72, 0.7, 0.55);
  part(pack, Geo.packCan, Material.suitMid, -0.1, 0.02, -0.04, 'packCanL');
  part(pack, Geo.packCan, Material.suitMid, 0.1, 0.02, -0.04, 'packCanR');
  part(pack, Geo.lamp, Theme.biolum, 0, -0.02, -0.1, 'packLamp', Theme.arcWhite);

  const antenna = pivot(pack, 'antenna', 0.09, 0.16, 0);
  part(antenna, Geo.antenna, Theme.panelEdge, 0, 0.09, 0, 'antennaRod');
  part(antenna, Geo.seam, Theme.tape, 0, 0.2, 0, 'antennaTip', Theme.tape);

  const head = pivot(bob, 'head', 0, 0.7, 0.04);
  part(head, Geo.helmet, Material.suitMid, 0, 0, 0, 'helmet');
  part(head, Geo.cheek, Material.suitDeep, -0.12, -0.02, 0.02, 'sealL');
  part(head, Geo.cheek, Material.suitDeep, 0.12, -0.02, 0.02, 'sealR');
  part(head, Geo.visorRim, Material.suitDeep, 0, -0.01, 0.11, 'visorRim');
  part(head, Geo.visor, Theme.biolum, 0, -0.01, 0.14, 'visor', Theme.biolum);
  part(head, Geo.seam, Theme.arcWhite, 0, 0.01, 0.17, 'visorGlint', Theme.arcWhite);

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
  armed = false,
): void {
  const bob = rig.getObjectByName('bob');
  const hipL = rig.getObjectByName('hipL');
  const hipR = rig.getObjectByName('hipR');
  const shoulderL = rig.getObjectByName('shoulderL');
  const shoulderR = rig.getObjectByName('shoulderR');
  if (!bob || !hipL || !hipR || !shoulderL || !shoulderR) return;

  poseHumanoid(
    {
      bob,
      hipL,
      hipR,
      kneeL: rig.getObjectByName('kneeL') ?? undefined,
      kneeR: rig.getObjectByName('kneeR') ?? undefined,
      shoulderL,
      shoulderR,
      elbowL: rig.getObjectByName('elbowL') ?? undefined,
      elbowR: rig.getObjectByName('elbowR') ?? undefined,
      torso: rig.getObjectByName('torso') ?? undefined,
      head: rig.getObjectByName('head') ?? undefined,
      pack: rig.getObjectByName('packPivot') ?? undefined,
      antenna: rig.getObjectByName('antenna') ?? undefined,
    },
    now,
    hopT,
    strideSign,
    { idleBob: 0.02, hopBob: 0.075, swingAmp: 0.78, armed },
  );
}

export function setSurveyorArmed(rig: THREE.Group, armed: boolean): void {
  const gun = rig.getObjectByName('phaser');
  if (gun) gun.visible = armed;
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
  root.traverse((obj) => tintLitMesh(obj, multiply));
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
  'kneeL',
  'kneeR',
  'shoulderL',
  'shoulderR',
  'elbowL',
  'elbowR',
  'head',
  'phaser',
] as const;
