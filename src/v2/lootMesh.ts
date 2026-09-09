import * as THREE from 'three';
import type { ItemKind } from '../data/items';
import { lootStampFor, type LootStamp } from '../game/presenters/itemTexture';
import { Theme } from '../scenes/theme';
import { litPaint, tintLitMesh } from './litMaterial';
import { ball, cap, roundBox } from './softGeo';

const Geo = {
  crate: roundBox(0.38, 0.3, 0.32, 0.05),
  lid: roundBox(0.4, 0.06, 0.34, 0.02),
  corner: roundBox(0.08, 0.08, 0.08, 0.02),
  tape: roundBox(0.22, 0.05, 0.08, 0.015),
  lock: roundBox(0.08, 0.08, 0.06, 0.02),
  keyBlade: cap(0.03, 0.26),
  keyBit: roundBox(0.18, 0.06, 0.06, 0.02),
  keyRing: roundBox(0.12, 0.12, 0.03, 0.015),
  core: new THREE.OctahedronGeometry(0.2, 1),
  lens: ball(0.08, 12, 9),
  halo: roundBox(0.36, 0.03, 0.03, 0.01),
  pack: roundBox(0.26, 0.2, 0.18, 0.04),
  crossV: roundBox(0.06, 0.16, 0.06, 0.015),
  crossH: roundBox(0.16, 0.06, 0.06, 0.015),
  clasp: roundBox(0.08, 0.04, 0.04, 0.012),
  cell: roundBox(0.16, 0.28, 0.14, 0.04),
  terminal: cap(0.02, 0.04),
  stick: cap(0.03, 0.2),
  cap: ball(0.08, 12, 9),
  spark: ball(0.03, 8, 6),
  shaft: cap(0.03, 0.18),
  head: new THREE.ConeGeometry(0.11, 0.16, 8),
  grip: roundBox(0.08, 0.08, 0.08, 0.02),
  fold: roundBox(0.32, 0.16, 0.24, 0.04),
  stripe: roundBox(0.32, 0.04, 0.24, 0.012),
  buckle: roundBox(0.1, 0.06, 0.08, 0.02),
};

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

function buildStamp(bob: THREE.Group, stamp: LootStamp): void {
  switch (stamp) {
    case 'key':
      part(bob, Geo.keyBlade, Theme.flag, 0, 0.24, 0, 'blade');
      part(bob, Geo.keyBit, Theme.inkBright, 0, 0.34, 0, 'bit');
      part(bob, Geo.keyBit, Theme.inkBright, 0, 0.14, 0, 'bit2');
      part(bob, Geo.keyRing, Theme.tape, 0, 0.44, 0, 'ring');
      break;
    case 'core':
      part(bob, Geo.core, Theme.arcWhite, 0, 0.22, 0, 'core');
      part(bob, Geo.lens, Theme.inkBright, 0, 0.22, 0, 'lens');
      part(bob, Geo.halo, Theme.tape, 0, 0.22, 0, 'halo');
      break;
    case 'med':
      part(bob, Geo.pack, Theme.ink, 0, 0.16, 0, 'pack');
      part(bob, Geo.crossV, Theme.safe, 0, 0.18, 0.1, 'crossV');
      part(bob, Geo.crossH, Theme.safe, 0, 0.18, 0.1, 'crossH');
      part(bob, Geo.clasp, Theme.tape, 0, 0.26, 0.04, 'clasp');
      break;
    case 'energy':
      part(bob, Geo.cell, Theme.panelEdge, 0, 0.2, 0, 'cell');
      part(bob, Geo.tape, Theme.tape, 0, 0.24, 0.05, 'stripe');
      part(bob, Geo.terminal, Theme.arcWhite, -0.06, 0.36, 0, 'termL');
      part(bob, Geo.terminal, Theme.arcWhite, 0.06, 0.36, 0, 'termR');
      break;
    case 'flare':
      part(bob, Geo.stick, Theme.panelEdge, 0, 0.18, 0, 'stick');
      part(bob, Geo.cap, Theme.arc, 0, 0.34, 0, 'cap');
      part(bob, Geo.tape, Theme.tape, 0, 0.1, 0, 'wrap');
      part(bob, Geo.spark, Theme.arcWhite, 0, 0.42, 0, 'spark');
      break;
    case 'tool':
      part(bob, Geo.shaft, Theme.panelEdge, 0, 0.18, 0, 'shaft');
      part(bob, Geo.grip, Theme.ink, 0, 0.08, 0, 'grip');
      part(bob, Geo.head, Theme.biolum, 0, 0.34, 0, 'head');
      break;
    case 'wear':
      part(bob, Geo.fold, Theme.panel, 0, 0.14, 0, 'fold');
      part(bob, Geo.stripe, Theme.tape, 0, 0.22, 0, 'tape');
      part(bob, Geo.buckle, Theme.inkBright, 0, 0.14, 0.12, 'buckle');
      break;
    default:
      part(bob, Geo.crate, Theme.inkMute, 0, 0.16, 0, 'crate');
      part(bob, Geo.lid, Theme.inkDim, 0, 0.32, 0, 'lid');
      part(bob, Geo.tape, Theme.tape, 0, 0.22, 0.14, 'seal');
      part(bob, Geo.lock, Theme.flag, 0, 0.22, 0.18, 'lock');
      part(bob, Geo.corner, Theme.inkDim, -0.16, 0.06, -0.12, 'corner');
      break;
  }
}

/** Ground loot — stamp families from lootStampFor, not one mesh per ItemKind. */
export function createLoot(kind: ItemKind): THREE.Group {
  const root = new THREE.Group();
  const stamp = lootStampFor(kind);
  root.name = `loot:${stamp}`;
  const bob = new THREE.Group();
  bob.name = 'bob';
  root.add(bob);
  buildStamp(bob, stamp);
  root.userData.stamp = stamp;
  root.scale.setScalar(1.2);
  root.rotation.y = 0.4;
  return root;
}

export function poseLoot(rig: THREE.Group, now: number): void {
  const bob = rig.getObjectByName('bob');
  if (!bob) return;
  const stamp = rig.userData.stamp as LootStamp | undefined;
  bob.position.y = Math.sin(now / 380) * (stamp === 'core' ? 0.04 : 0.02);
  bob.rotation.y = stamp === 'core' ? now / 900 : Math.sin(now / 900) * 0.12;
  bob.rotation.z = stamp === 'key' ? Math.sin(now / 640) * 0.08 : 0;

  const core = rig.getObjectByName('core');
  if (core) core.rotation.x = now / 480;
  const halo = rig.getObjectByName('halo');
  if (halo) halo.rotation.y = now / 320;
  const cap = rig.getObjectByName('cap');
  if (cap) {
    const pulse = 1 + Math.sin(now / 240) * 0.14;
    cap.scale.setScalar(pulse);
  }
  const spark = rig.getObjectByName('spark');
  if (spark) spark.position.y = 0.42 + Math.abs(Math.sin(now / 160)) * 0.05;
}

export function tintLoot(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => tintLitMesh(obj, multiply));
}

export function disposeLoot(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
