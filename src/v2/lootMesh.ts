import * as THREE from 'three';
import type { ItemKind } from '../data/items';
import { lootStampFor, type LootStamp } from '../game/presenters/itemTexture';
import { Theme } from '../scenes/theme';

const Geo = {
  crate: new THREE.BoxGeometry(0.38, 0.3, 0.32),
  lid: new THREE.BoxGeometry(0.4, 0.06, 0.34),
  tape: new THREE.BoxGeometry(0.22, 0.05, 0.08),
  keyBlade: new THREE.BoxGeometry(0.07, 0.34, 0.07),
  keyBit: new THREE.BoxGeometry(0.18, 0.06, 0.06),
  core: new THREE.OctahedronGeometry(0.2, 0),
  lens: new THREE.SphereGeometry(0.08, 8, 6),
  pack: new THREE.BoxGeometry(0.26, 0.2, 0.18),
  crossV: new THREE.BoxGeometry(0.06, 0.16, 0.06),
  crossH: new THREE.BoxGeometry(0.16, 0.06, 0.06),
  cell: new THREE.BoxGeometry(0.16, 0.28, 0.14),
  stick: new THREE.BoxGeometry(0.06, 0.26, 0.06),
  cap: new THREE.SphereGeometry(0.08, 7, 5),
  shaft: new THREE.BoxGeometry(0.06, 0.24, 0.06),
  head: new THREE.ConeGeometry(0.11, 0.16, 5),
  fold: new THREE.BoxGeometry(0.32, 0.16, 0.24),
  stripe: new THREE.BoxGeometry(0.32, 0.04, 0.24),
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

function buildStamp(bob: THREE.Group, stamp: LootStamp): void {
  switch (stamp) {
    case 'key':
      part(bob, Geo.keyBlade, Theme.flag, 0, 0.24, 0, 'blade');
      part(bob, Geo.keyBit, Theme.inkBright, 0, 0.34, 0, 'bit');
      part(bob, Geo.keyBit, Theme.inkBright, 0, 0.14, 0, 'bit2');
      break;
    case 'core':
      part(bob, Geo.core, Theme.arcWhite, 0, 0.22, 0, 'core');
      part(bob, Geo.lens, Theme.inkBright, 0, 0.22, 0, 'lens');
      break;
    case 'med':
      part(bob, Geo.pack, Theme.ink, 0, 0.16, 0, 'pack');
      part(bob, Geo.crossV, Theme.safe, 0, 0.18, 0.1, 'crossV');
      part(bob, Geo.crossH, Theme.safe, 0, 0.18, 0.1, 'crossH');
      break;
    case 'energy':
      part(bob, Geo.cell, Theme.panelEdge, 0, 0.2, 0, 'cell');
      part(bob, Geo.tape, Theme.tape, 0, 0.24, 0.05, 'stripe');
      break;
    case 'flare':
      part(bob, Geo.stick, Theme.panelEdge, 0, 0.18, 0, 'stick');
      part(bob, Geo.cap, Theme.arc, 0, 0.34, 0, 'cap');
      part(bob, Geo.tape, Theme.tape, 0, 0.1, 0, 'wrap');
      break;
    case 'tool':
      part(bob, Geo.shaft, Theme.panelEdge, 0, 0.18, 0, 'shaft');
      part(bob, Geo.head, Theme.biolum, 0, 0.34, 0, 'head');
      break;
    case 'wear':
      part(bob, Geo.fold, Theme.panel, 0, 0.14, 0, 'fold');
      part(bob, Geo.stripe, Theme.tape, 0, 0.22, 0, 'tape');
      break;
    default:
      part(bob, Geo.crate, Theme.inkMute, 0, 0.16, 0, 'crate');
      part(bob, Geo.lid, Theme.inkDim, 0, 0.32, 0, 'lid');
      part(bob, Geo.tape, Theme.tape, 0, 0.22, 0.14, 'seal');
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
  bob.position.y = Math.sin(now / 380) * 0.02;
  bob.rotation.y = Math.sin(now / 900) * 0.12;
}

export function tintLoot(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const base = obj.userData.baseColor;
    if (typeof base !== 'number') return;
    (obj.material as THREE.MeshBasicMaterial).color.setHex(base).multiply(multiply);
  });
}

export function disposeLoot(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
