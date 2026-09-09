import { CapsuleGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Shared rounded primitives so v2 rigs are not a stack of hard cubes. */
export function roundBox(w: number, h: number, d: number, radius?: number): RoundedBoxGeometry {
  const m = Math.min(w, h, d);
  const r = Math.min(radius ?? m * 0.22, m * 0.42);
  return new RoundedBoxGeometry(w, h, d, 2, r);
}

export function cap(radius: number, length: number): CapsuleGeometry {
  return new CapsuleGeometry(radius, length, 3, 8);
}

export function ball(radius: number, width = 12, height = 9): SphereGeometry {
  return new SphereGeometry(radius, width, height);
}

export function tube(top: number, bottom: number, height: number, segs = 12): CylinderGeometry {
  return new CylinderGeometry(top, bottom, height, segs);
}
