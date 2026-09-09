import * as THREE from 'three';
import { Material, Theme } from '../scenes/theme';
import type { TileKind } from '../sim/types';

const Geo = {
  bush: new THREE.SphereGeometry(0.18, 7, 5),
  stem: new THREE.BoxGeometry(0.04, 0.16, 0.04),
  nest: new THREE.CylinderGeometry(0.2, 0.24, 0.1, 8),
  brick: new THREE.BoxGeometry(0.28, 0.14, 0.2),
  slab: new THREE.BoxGeometry(0.36, 0.12, 0.28),
  grate: new THREE.BoxGeometry(0.42, 0.16, 0.42),
  slat: new THREE.BoxGeometry(0.32, 0.03, 0.05),
  pool: new THREE.CylinderGeometry(0.22, 0.26, 0.08, 8),
  rim: new THREE.BoxGeometry(0.5, 0.08, 0.08),
  peg: new THREE.BoxGeometry(0.08, 0.12, 0.08),
  wire: new THREE.BoxGeometry(0.7, 0.02, 0.02),
  hatch: new THREE.BoxGeometry(0.42, 0.08, 0.42),
  rail: new THREE.BoxGeometry(0.08, 0.28, 0.42),
  stripe: new THREE.BoxGeometry(0.06, 0.2, 0.06),
  hull: new THREE.BoxGeometry(0.7, 0.16, 0.32),
  nose: new THREE.ConeGeometry(0.12, 0.22, 5),
  post: new THREE.BoxGeometry(0.1, 0.42, 0.1),
  disc: new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8),
  rock: new THREE.BoxGeometry(0.28, 0.32, 0.24),
  flag: new THREE.BoxGeometry(0.04, 0.28, 0.04),
  pennant: new THREE.BoxGeometry(0.16, 0.1, 0.02),
  desk: new THREE.BoxGeometry(0.4, 0.18, 0.28),
  screen: new THREE.BoxGeometry(0.28, 0.16, 0.04),
  lamp: new THREE.BoxGeometry(0.06, 0.06, 0.06),
  crack: new THREE.BoxGeometry(0.36, 0.04, 0.08),
  tape: new THREE.BoxGeometry(0.16, 0.03, 0.1),
};

const FIELD_PROPS = new Set<TileKind>([
  'hazard',
  'scrub',
  'rubble',
  'vent',
  'tripwire',
  'sump',
  'scrub_nest',
  'exit',
  'beacon',
  'shuttle',
  'landmark',
  'quest',
  'console',
]);

export function isFieldProp(kind: TileKind): boolean {
  return FIELD_PROPS.has(kind);
}

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

function build(bob: THREE.Group, kind: TileKind): void {
  switch (kind) {
    case 'scrub':
      part(bob, Geo.bush, Material.foliage, -0.12, 0.16, 0.04, 'bushL');
      part(bob, Geo.bush, Material.foliage, 0.14, 0.18, -0.04, 'bushR');
      part(bob, Geo.stem, Material.nest, 0, 0.1, 0.08, 'stem');
      part(bob, Geo.stem, Theme.safe, 0.08, 0.22, -0.06, 'frond');
      break;
    case 'scrub_nest':
      part(bob, Geo.bush, Material.foliage, 0, 0.16, 0, 'bush');
      part(bob, Geo.nest, Material.nest, 0, 0.1, 0, 'bowl');
      break;
    case 'rubble':
      part(bob, Geo.brick, Material.debris, -0.08, 0.08, 0.04, 'brickA');
      part(bob, Geo.slab, Material.debris, 0.1, 0.12, -0.04, 'brickB');
      part(bob, Geo.crack, Theme.rust, 0, 0.04, 0.1, 'scar');
      break;
    case 'vent':
      part(bob, Geo.grate, Material.conduit, 0, 0.08, 0, 'grate');
      part(bob, Geo.slat, Theme.biolumDeep, 0, 0.14, -0.08, 'slat0');
      part(bob, Geo.slat, Theme.biolum, 0, 0.16, 0, 'slat1');
      part(bob, Geo.slat, Theme.biolumDeep, 0, 0.14, 0.08, 'slat2');
      break;
    case 'hazard':
      part(bob, Geo.slab, Material.deck, 0, 0.06, 0, 'plate');
      part(bob, Geo.crack, Theme.biolum, 0.04, 0.12, 0, 'leak');
      part(bob, Geo.lamp, Theme.arcWhite, -0.08, 0.16, 0.06, 'spark');
      part(bob, Geo.tape, Theme.tape, -0.16, 0.08, 0.12, 'tape');
      break;
    case 'sump':
      part(bob, Geo.pool, Material.brine, 0, 0.05, 0, 'pool');
      part(bob, Geo.rim, Material.deck, 0, 0.08, -0.2, 'rimN');
      part(bob, Geo.rim, Material.deck, 0, 0.08, 0.2, 'rimS');
      part(bob, Geo.lamp, Theme.biolum, 0, 0.08, 0, 'sheen');
      break;
    case 'tripwire':
      part(bob, Geo.peg, Material.debris, -0.32, 0.08, 0, 'pegL');
      part(bob, Geo.peg, Material.debris, 0.32, 0.08, 0, 'pegR');
      part(bob, Geo.wire, Theme.flag, 0, 0.14, 0, 'wire');
      break;
    case 'exit':
      part(bob, Geo.rail, Material.deck, -0.22, 0.16, 0, 'railL');
      part(bob, Geo.rail, Material.deck, 0.22, 0.16, 0, 'railR');
      part(bob, Geo.hatch, Material.deckLit, 0, 0.06, 0, 'hatch');
      part(bob, Geo.stripe, Theme.safe, 0, 0.18, 0, 'mark');
      part(bob, Geo.tape, Theme.tape, 0, 0.04, 0.22, 'sill');
      break;
    case 'shuttle':
      part(bob, Geo.hull, Material.deck, 0, 0.14, 0, 'hull');
      part(bob, Geo.nose, Material.deck, 0, 0.14, 0.28, 'nose');
      part(bob, Geo.lamp, Theme.arcWhite, -0.16, 0.2, 0.08, 'portL');
      part(bob, Geo.lamp, Theme.arcWhite, 0.16, 0.2, 0.08, 'portR');
      break;
    case 'beacon':
      part(bob, Geo.slab, Material.deck, 0, 0.06, 0, 'base');
      part(bob, Geo.post, Material.deckLit, 0, 0.28, 0, 'mast');
      part(bob, Geo.disc, Theme.tape, 0, 0.5, 0, 'lamp');
      break;
    case 'landmark':
      part(bob, Geo.rock, Material.rock, 0, 0.18, 0, 'stone');
      part(bob, Geo.flag, Theme.flag, 0.06, 0.42, 0, 'pole');
      part(bob, Geo.pennant, Theme.flag, 0.14, 0.5, 0, 'pennant');
      break;
    case 'quest':
      part(bob, Geo.desk, Material.deck, 0, 0.1, 0, 'crate');
      part(bob, Geo.flag, Theme.flag, 0, 0.28, 0, 'pole');
      part(bob, Geo.pennant, Theme.flag, 0.08, 0.36, 0, 'pennant');
      break;
    case 'console':
      part(bob, Geo.desk, Material.deck, 0, 0.16, 0, 'desk');
      part(bob, Geo.screen, Theme.biolumDeep, 0, 0.3, 0.1, 'screen');
      part(bob, Geo.lamp, Theme.tape, 0, 0.38, 0, 'bezel');
      break;
    default:
      break;
  }
}

/** Walkable tile overlays — hatch, fauna scrub, vents, terminals. Walls stay boxes. */
export function createProp(kind: TileKind): THREE.Group | null {
  if (!isFieldProp(kind)) return null;
  const root = new THREE.Group();
  root.name = `prop:${kind}`;
  const bob = new THREE.Group();
  bob.name = 'bob';
  root.add(bob);
  build(bob, kind);
  root.userData.propKind = kind;
  return root;
}

export function poseProp(rig: THREE.Group, now: number): void {
  const kind = rig.userData.propKind as TileKind | undefined;
  const lamp = rig.getObjectByName('lamp');
  const spark = rig.getObjectByName('spark');
  const pennant = rig.getObjectByName('pennant');
  const sheen = rig.getObjectByName('sheen');
  const slat = rig.getObjectByName('slat1');
  const t = (now / 420) % 1;
  if (kind === 'beacon' && lamp) {
    const s = 1 + Math.sin(now / 180) * 0.12;
    lamp.scale.set(s, 1, s);
  }
  if (spark) spark.position.y = 0.16 + Math.abs(Math.sin(now / 90)) * 0.06;
  if (pennant) pennant.position.y = (kind === 'landmark' ? 0.5 : 0.36) + Math.sin(now / 260) * 0.03;
  if (sheen) sheen.position.y = 0.08 + (t > 0.5 ? 0.02 : 0);
  if (slat) slat.position.y = 0.16 + Math.sin(now / 200) * 0.02;
}

export function tintProp(root: THREE.Group, multiply: THREE.Color): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const base = obj.userData.baseColor;
    if (typeof base !== 'number') return;
    (obj.material as THREE.MeshBasicMaterial).color.setHex(base).multiply(multiply);
  });
}

export function disposeProp(root: THREE.Group): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
