import * as THREE from 'three';
import { ALLIES, NPCS, type AllyKind, type NpcKind } from '../data/npcs';
import { Material, Theme } from '../scenes/theme';
import { hopLift, hopSwing, poseHumanoid } from './poseHumanoid';
import { litPaint, tintLitMesh } from './litMaterial';

const Geo = {
  boot: new THREE.BoxGeometry(0.12, 0.06, 0.16),
  thigh: new THREE.BoxGeometry(0.1, 0.14, 0.12),
  shin: new THREE.BoxGeometry(0.09, 0.12, 0.11),
  torso: new THREE.BoxGeometry(0.28, 0.32, 0.18),
  collar: new THREE.BoxGeometry(0.24, 0.05, 0.16),
  belt: new THREE.BoxGeometry(0.3, 0.04, 0.2),
  helmet: new THREE.SphereGeometry(0.14, 8, 6),
  visor: new THREE.BoxGeometry(0.18, 0.07, 0.04),
  cheek: new THREE.BoxGeometry(0.07, 0.08, 0.08),
  upperArm: new THREE.BoxGeometry(0.09, 0.14, 0.09),
  forearm: new THREE.BoxGeometry(0.08, 0.13, 0.08),
  glove: new THREE.BoxGeometry(0.1, 0.06, 0.1),
  stripe: new THREE.BoxGeometry(0.24, 0.04, 0.2),
  lamp: new THREE.BoxGeometry(0.08, 0.08, 0.06),
  disc: new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8),
  lens: new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8),
  skid: new THREE.BoxGeometry(0.08, 0.05, 0.18),
  ring: new THREE.BoxGeometry(0.4, 0.03, 0.06),
  blade: new THREE.BoxGeometry(0.46, 0.02, 0.05),
  bar: new THREE.BoxGeometry(0.32, 0.02, 0.02),
  tool: new THREE.BoxGeometry(0.05, 0.22, 0.05),
  pack: new THREE.BoxGeometry(0.18, 0.16, 0.1),
};

function paint(hex: number, opacity = 1): THREE.MeshLambertMaterial {
  return litPaint(hex, { opacity });
}

function part(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  hex: number,
  x: number,
  y: number,
  z: number,
  name: string,
  opacity = 1,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, paint(hex, opacity));
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

function isDrone(kind: string): boolean {
  return kind === 'probe_drone';
}

function isHolo(kind: string): boolean {
  return kind === 'archive_holo';
}

function bodyColor(kind: NpcKind | AllyKind): number {
  if (kind in NPCS) return NPCS[kind as NpcKind].color;
  return ALLIES[kind as AllyKind].color;
}

function buildCrew(bob: THREE.Group, body: number, rim: number, accent: number, tech: boolean): void {
  const hipL = pivot(bob, 'hipL', -0.09, 0.28, 0);
  part(hipL, Geo.thigh, rim, 0, -0.07, 0, 'thighL');
  const kneeL = pivot(hipL, 'kneeL', 0, -0.14, 0);
  part(kneeL, Geo.shin, Material.suitDeep, 0, -0.06, 0, 'shinL');
  part(kneeL, Geo.boot, Material.visor, 0, -0.14, 0.02, 'bootL');
  const tapeL = part(kneeL, Geo.stripe, Theme.tape, 0, -0.1, 0.02, 'bootTapeL');
  tapeL.scale.set(0.32, 0.35, 0.45);

  const hipR = pivot(bob, 'hipR', 0.09, 0.28, 0);
  part(hipR, Geo.thigh, rim, 0, -0.07, 0, 'thighR');
  const kneeR = pivot(hipR, 'kneeR', 0, -0.14, 0);
  part(kneeR, Geo.shin, Material.suitDeep, 0, -0.06, 0, 'shinR');
  part(kneeR, Geo.boot, Material.visor, 0, -0.14, 0.02, 'bootR');
  const tapeR = part(kneeR, Geo.stripe, Theme.tape, 0, -0.1, 0.02, 'bootTapeR');
  tapeR.scale.set(0.32, 0.35, 0.45);

  const torso = pivot(bob, 'torso', 0, 0.42, 0);
  part(torso, Geo.torso, body, 0, 0, 0, 'torsoMesh');
  part(torso, Geo.collar, rim, 0, 0.16, 0.02, 'collar');
  part(torso, Geo.belt, rim, 0, -0.14, 0, 'belt');
  part(torso, Geo.lamp, accent, 0, -0.02, 0.12, 'chestLamp');
  part(bob, Geo.pack, rim, 0, 0.46, -0.14, 'pack');

  const shoulderL = pivot(bob, 'shoulderL', -0.22, 0.52, 0.02);
  part(shoulderL, Geo.upperArm, body, 0, -0.07, 0, 'upperArmL');
  const elbowL = pivot(shoulderL, 'elbowL', 0, -0.14, 0);
  part(elbowL, Geo.forearm, rim, 0, -0.06, 0.02, 'forearmL');
  part(elbowL, Geo.glove, rim, 0, -0.14, 0.02, 'gloveL');
  if (tech) part(elbowL, Geo.tool, Theme.biolum, 0, -0.26, 0.04, 'tool');

  const shoulderR = pivot(bob, 'shoulderR', 0.22, 0.52, 0.02);
  part(shoulderR, Geo.upperArm, body, 0, -0.07, 0, 'upperArmR');
  const elbowR = pivot(shoulderR, 'elbowR', 0, -0.14, 0);
  part(elbowR, Geo.forearm, rim, 0, -0.06, 0.02, 'forearmR');
  part(elbowR, Geo.glove, rim, 0, -0.14, 0.02, 'gloveR');

  const head = pivot(bob, 'head', 0, 0.66, 0.03);
  part(head, Geo.helmet, body, 0, 0, 0, 'helmet');
  part(head, Geo.cheek, rim, -0.11, -0.02, 0.02, 'sealL');
  part(head, Geo.cheek, rim, 0.11, -0.02, 0.02, 'sealR');
  part(head, Geo.visor, Theme.inkBright, 0, -0.01, 0.12, 'visor');
}

function buildHolo(bob: THREE.Group, body: number): void {
  const fade = 0.58;
  part(bob, Geo.torso, body, 0, 0.42, 0, 'torso', fade);
  part(bob, Geo.helmet, body, 0, 0.64, 0.02, 'helmet', fade);
  part(bob, Geo.visor, Theme.arcWhite, 0, 0.63, 0.14, 'visor', 0.9);
  part(bob, Geo.upperArm, body, -0.18, 0.44, 0, 'armL', fade);
  part(bob, Geo.upperArm, body, 0.18, 0.44, 0, 'armR', fade);
  part(bob, Geo.bar, Theme.biolum, 0, 0.62, 0.02, 'scanTop', 0.85);
  part(bob, Geo.bar, Theme.biolum, 0, 0.46, 0.02, 'scanMid', 0.85);
  part(bob, Geo.bar, Theme.biolum, 0, 0.3, 0.02, 'scanLow', 0.7);
}

function buildDrone(bob: THREE.Group, body: number, rim: number): void {
  part(bob, Geo.disc, body, 0, 0.28, 0, 'shell');
  part(bob, Geo.ring, Theme.biolum, 0, 0.34, 0, 'ring');
  part(bob, Geo.lens, Theme.inkBright, 0, 0.28, 0.16, 'lens');
  part(bob, Geo.skid, rim, -0.12, 0.18, 0, 'skidL');
  part(bob, Geo.skid, rim, 0.12, 0.18, 0, 'skidR');
  part(bob, Geo.lamp, Theme.tape, 0, 0.28, -0.14, 'tailLamp');
  const rotor = pivot(bob, 'rotor', 0, 0.38, 0);
  part(rotor, Geo.blade, Theme.panelEdge, 0, 0, 0, 'blade');
}

/**
 * Field contacts — crew, archive holo, probe drone.
 * Lambert × flood tint; no PointLights.
 */
export function createContact(kind: NpcKind | AllyKind): THREE.Group {
  const root = new THREE.Group();
  root.name = `contact:${kind}`;
  const bob = new THREE.Group();
  bob.name = 'bob';
  root.add(bob);

  const ally = kind in ALLIES;
  const hover = isDrone(kind) || isHolo(kind);
  if (isDrone(kind)) {
    buildDrone(bob, Material.allyShell, Material.allyRim);
  } else if (isHolo(kind)) {
    buildHolo(bob, Material.contactHolo);
  } else {
    const accent = ally ? Theme.safe : Theme.biolum;
    const rim = ally ? Material.allyRim : Material.contactRim;
    buildCrew(bob, bodyColor(kind), rim, accent, kind === 'field_tech');
  }

  root.userData.hover = hover;
  root.userData.contactKind = kind;
  root.scale.setScalar(isDrone(kind) ? 0.92 : 1);
  root.userData.baseScale = root.scale.x;
  return root;
}

export function poseContact(
  rig: THREE.Group,
  now: number,
  hopT: number | null,
  strideSign: number,
): void {
  const bob = rig.getObjectByName('bob');
  if (!bob) return;
  const hover = Boolean(rig.userData.hover);

  if (hover) {
    const lift = hopT === null ? 0 : hopLift(hopT);
    const swing = hopT === null ? 0 : hopSwing(hopT, strideSign, 0.2);
    bob.position.y = (hopT === null ? Math.sin(now / 320) * 0.05 : lift * 0.08);
    bob.rotation.z = swing;
    bob.rotation.x = lift * 0.08;
    const ring = rig.getObjectByName('ring');
    if (ring) ring.rotation.y = now / 360;
    const rotor = rig.getObjectByName('rotor');
    if (rotor) rotor.rotation.y = now / 28;
    const scanTop = rig.getObjectByName('scanTop');
    if (scanTop) scanTop.position.y = 0.62 + Math.sin(now / 260) * 0.05;
    const scanMid = rig.getObjectByName('scanMid');
    if (scanMid) scanMid.position.y = 0.46 + Math.sin(now / 260 + 1) * 0.04;
    const scanLow = rig.getObjectByName('scanLow');
    if (scanLow) scanLow.position.y = 0.3 + Math.sin(now / 260 + 2) * 0.03;
    return;
  }

  const hipL = rig.getObjectByName('hipL');
  const hipR = rig.getObjectByName('hipR');
  const shoulderL = rig.getObjectByName('shoulderL');
  const shoulderR = rig.getObjectByName('shoulderR');
  if (!hipL || !hipR || !shoulderL || !shoulderR) return;

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
      pack: rig.getObjectByName('pack') ?? undefined,
    },
    now,
    hopT,
    strideSign,
    { idleBob: 0.016, hopBob: 0.055, swingAmp: 0.62 },
  );
}

export function tintContact(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => tintLitMesh(obj, multiply));
}

export function disposeContact(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
