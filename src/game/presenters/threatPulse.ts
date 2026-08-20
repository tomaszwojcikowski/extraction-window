/**
 * Ground-tell breathe. Last windup turn reads hotter than a slow global pulse.
 * Presentation-only; callers still paint on the 420ms lighting tick.
 */
export function windupThreatPulse(animFrame: number, windup: number): number {
  if (windup <= 1) return 1.05 + (animFrame % 2) * 0.18;
  if (windup === 2) return 0.86 + (animFrame % 3) * 0.1;
  return 0.72 + (animFrame % 4) * 0.09;
}

/** Stagger hatch so a ring does not blink as one UI plate. */
export function tileHatchPulse(animFrame: number, x: number, y: number): number {
  return 0.82 + ((animFrame + x + y) % 4) * 0.07;
}

/** Traveling beam spine — hotter on the step that matches the frame clock. */
export function beamLaneHot(animFrame: number, step: number, maxStep: number): boolean {
  if (maxStep <= 0) return true;
  return animFrame % (maxStep + 1) === step || step === maxStep;
}
