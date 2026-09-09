import type { Object3D } from 'three';

export function hopLift(u: number): number {
  return 4 * u * (1 - u);
}

export function hopSwing(u: number, sign: number, amp: number): number {
  return Math.sin(u * Math.PI) * amp * sign;
}

export function hopSquash(u: number): number {
  if (u < 0.12) return (0.12 - u) / 0.12;
  if (u > 0.88) return (u - 0.88) / 0.12;
  return 0;
}

export type HumanoidParts = {
  bob: Object3D;
  hipL: Object3D;
  hipR: Object3D;
  kneeL?: Object3D | undefined;
  kneeR?: Object3D | undefined;
  shoulderL: Object3D;
  shoulderR: Object3D;
  elbowL?: Object3D | undefined;
  elbowR?: Object3D | undefined;
  torso?: Object3D | undefined;
  head?: Object3D | undefined;
  pack?: Object3D | undefined;
  antenna?: Object3D | undefined;
};

export function poseHumanoid(
  parts: HumanoidParts,
  now: number,
  hopT: number | null,
  strideSign: number,
  opts?: { idleBob?: number; hopBob?: number; swingAmp?: number },
): void {
  const idleBob = opts?.idleBob ?? 0.02;
  const hopBob = opts?.hopBob ?? 0.07;
  const swingAmp = opts?.swingAmp ?? 0.78;
  const { bob, hipL, hipR, kneeL, kneeR, shoulderL, shoulderR, elbowL, elbowR, torso, head, pack, antenna } =
    parts;

  if (hopT === null) {
    const breathe = Math.sin(now / 420);
    const shift = Math.sin(now / 640);
    bob.position.y = breathe * idleBob;
    bob.rotation.z = shift * 0.03;
    bob.scale.set(1, 1, 1);
    hipL.rotation.x = 0;
    hipR.rotation.x = 0;
    if (kneeL) kneeL.rotation.x = 0.1 + breathe * 0.04;
    if (kneeR) kneeR.rotation.x = 0.1 - breathe * 0.04;
    shoulderL.rotation.x = -shift * 0.04;
    shoulderR.rotation.x = shift * 0.04;
    if (elbowL) elbowL.rotation.x = 0.18;
    if (elbowR) elbowR.rotation.x = 0.18;
    if (torso) {
      torso.rotation.x = breathe * 0.02;
      torso.rotation.z = 0;
    }
    if (head) {
      head.rotation.x = breathe * 0.03;
      head.rotation.y = Math.sin(now / 1100) * 0.08;
    }
    if (pack) pack.rotation.x = breathe * 0.04;
    if (antenna) antenna.rotation.z = Math.sin(now / 280) * 0.18;
    return;
  }

  const lift = hopLift(hopT);
  const swing = hopSwing(hopT, strideSign, swingAmp);
  const squash = hopSquash(hopT) * 0.08;
  bob.position.y = lift * hopBob;
  bob.rotation.z = swing * 0.08;
  bob.scale.set(1 + squash * 0.45, 1 - squash, 1 + squash * 0.45);
  hipL.rotation.x = swing;
  hipR.rotation.x = -swing;
  if (kneeL) kneeL.rotation.x = 0.12 + lift * 0.7;
  if (kneeR) kneeR.rotation.x = 0.12 + lift * 0.7;
  shoulderL.rotation.x = -swing * 0.9;
  shoulderR.rotation.x = swing * 0.9;
  if (elbowL) elbowL.rotation.x = 0.2 + lift * 0.35;
  if (elbowR) elbowR.rotation.x = 0.2 + lift * 0.35;
  if (torso) {
    torso.rotation.x = 0.08 + lift * 0.1;
    torso.rotation.z = -swing * 0.12;
  }
  if (head) {
    head.rotation.x = -lift * 0.12;
    head.rotation.y = 0;
  }
  if (pack) pack.rotation.x = -lift * 0.18;
  if (antenna) antenna.rotation.z = swing * 0.25;
}
