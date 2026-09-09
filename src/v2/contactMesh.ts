import * as THREE from 'three';
import { ALLIES, NPCS, type AllyKind, type NpcKind } from '../data/npcs';
import { Material, Theme } from '../scenes/theme';

const Geo = {
  boot: new THREE.BoxGeometry(0.11, 0.06, 0.15),
  leg: new THREE.BoxGeometry(0.1, 0.2, 0.11),
  torso: new THREE.BoxGeometry(0.28, 0.32, 0.18),
  helmet: new THREE.SphereGeometry(0.14, 8, 6),
  visor: new THREE.BoxGeometry(0.18, 0.07, 0.04),
  arm: new THREE.BoxGeometry(0.08, 0.24, 0.08),
  glove: new THREE.BoxGeometry(0.09, 0.06, 0.09),
  stripe: new THREE.BoxGeometry(0.24, 0.04, 0.2),
  lamp: new THREE.BoxGeometry(0.08, 0.08, 0.06),
  disc: new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8),
  lens: new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8),
  skid: new THREE.BoxGeometry(0.08, 0.05, 0.18),
  ring: new THREE.BoxGeometry(0.4, 0.03, 0.06),
  bar: new THREE.BoxGeometry(0.32, 0.02, 0.02),
  tool: new THREE.BoxGeometry(0.05, 0.22, 0.05),
};

function paint(hex: number, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
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
  const hipL = pivot(bob, 'hipL', -0.07, 0.26, 0);
  part(hipL, Geo.leg, rim, 0, -0.1, 0, 'legL');
  part(hipL, Geo.boot, Material.visor, 0, -0.23, 0.02, 'bootL');
  const tapeL = part(hipL, Geo.stripe, Theme.tape, 0, -0.18, 0.02, 'bootTapeL');
  tapeL.scale.set(0.35, 0.4, 0.5);

  const hipR = pivot(bob, 'hipR', 0.07, 0.26, 0);
  part(hipR, Geo.leg, rim, 0, -0.1, 0, 'legR');
  part(hipR, Geo.boot, Material.visor, 0, -0.23, 0.02, 'bootR');
  const tapeR = part(hipR, Geo.stripe, Theme.tape, 0, -0.18, 0.02, 'bootTapeR');
  tapeR.scale.set(0.35, 0.4, 0.5);

  part(bob, Geo.torso, body, 0, 0.4, 0, 'torso');
  part(bob, Geo.lamp, accent, 0, 0.38, 0.12, 'chestLamp');

  const shoulderL = pivot(bob, 'shoulderL', -0.18, 0.5, 0);
  part(shoulderL, Geo.arm, body, 0, -0.12, 0, 'armL');
  part(shoulderL, Geo.glove, rim, 0, -0.26, 0.01, 'gloveL');
  if (tech) part(shoulderL, Geo.tool, Theme.biolum, 0, -0.38, 0.04, 'tool');

  const shoulderR = pivot(bob, 'shoulderR', 0.18, 0.5, 0);
  part(shoulderR, Geo.arm, body, 0, -0.12, 0, 'armR');
  part(shoulderR, Geo.glove, rim, 0, -0.26, 0.01, 'gloveR');

  part(bob, Geo.helmet, body, 0, 0.64, 0.03, 'helmet');
  part(bob, Geo.visor, Theme.inkBright, 0, 0.63, 0.14, 'visor');
}

function buildHolo(bob: THREE.Group, body: number): void {
  const fade = 0.58;
  part(bob, Geo.torso, body, 0, 0.42, 0, 'torso', fade);
  part(bob, Geo.helmet, body, 0, 0.64, 0.02, 'helmet', fade);
  part(bob, Geo.visor, Theme.arcWhite, 0, 0.63, 0.14, 'visor', 0.9);
  part(bob, Geo.arm, body, -0.18, 0.4, 0, 'armL', fade);
  part(bob, Geo.arm, body, 0.18, 0.4, 0, 'armR', fade);
  part(bob, Geo.bar, Theme.biolum, 0, 0.58, 0.02, 'scanTop', 0.85);
  part(bob, Geo.bar, Theme.biolum, 0, 0.32, 0.02, 'scanMid', 0.85);
}

function buildDrone(bob: THREE.Group, body: number, rim: number): void {
  part(bob, Geo.disc, body, 0, 0.28, 0, 'shell');
  part(bob, Geo.ring, Theme.biolum, 0, 0.34, 0, 'ring');
  part(bob, Geo.lens, Theme.inkBright, 0, 0.28, 0.16, 'lens');
  part(bob, Geo.skid, rim, -0.12, 0.18, 0, 'skidL');
  part(bob, Geo.skid, rim, 0.12, 0.18, 0, 'skidR');
}

/**
 * Field contacts — crew, archive holo, probe drone.
 * MeshBasicMaterial × flood tint; no PointLights.
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
  const hipL = rig.getObjectByName('hipL');
  const hipR = rig.getObjectByName('hipR');
  const shoulderL = rig.getObjectByName('shoulderL');
  const shoulderR = rig.getObjectByName('shoulderR');
  const ring = rig.getObjectByName('ring');
  const scan = rig.getObjectByName('scanTop');

  if (hopT === null) {
    bob.position.y = Math.sin(now / (hover ? 320 : 440)) * (hover ? 0.05 : 0.014);
    if (hipL) hipL.rotation.x = 0;
    if (hipR) hipR.rotation.x = 0;
    if (shoulderL) shoulderL.rotation.x = 0;
    if (shoulderR) shoulderR.rotation.x = 0;
    if (ring) ring.rotation.y = now / 400;
    if (scan) scan.position.y = 0.58 + Math.sin(now / 280) * 0.04;
    return;
  }

  const swing = Math.sin(hopT * Math.PI) * 0.62 * strideSign;
  bob.position.y = Math.sin(hopT * Math.PI) * (hover ? 0.07 : 0.045);
  if (hipL) hipL.rotation.x = swing;
  if (hipR) hipR.rotation.x = -swing;
  if (shoulderL) shoulderL.rotation.x = -swing * 0.8;
  if (shoulderR) shoulderR.rotation.x = swing * 0.8;
}

export function tintContact(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const base = obj.userData.baseColor;
    if (typeof base !== 'number') return;
    (obj.material as THREE.MeshBasicMaterial).color.setHex(base).multiply(multiply);
  });
}

export function disposeContact(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
