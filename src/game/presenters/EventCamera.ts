import type { LoreId } from '../../data/lore';

/**
 * Event-driven camera cues — presentation only.
 *
 * DESIGN_PRINCIPLES §7 (juice with a budget):
 * - Amplify meaningful state changes; silence routine motion / status ticks.
 * - ≤ ~200ms for notice/combat punches; climaxes may linger slightly.
 * - Prefer one lead channel per beat (punch ≠ bloom ≠ pressure ≠ hush).
 * - Never delays input; world-layer zoom only (HUD stays 1:1).
 */

export type CameraIgnite = 'scan' | 'flare' | 'fauna';

/** Lead feel for the cue — keeps channels from all shouting at once. */
export type CameraProfile = 'punch' | 'snap' | 'pressure' | 'bloom' | 'reward' | 'hush';

export type CameraCue = {
  id: string;
  priority: number;
  profile: CameraProfile;
  shakeMs: number;
  shakeIntensity: number;
  vignette: number;
  vignetteMs: number;
  nudgePx: number;
  /** Peak world-layer scale (1 = none). */
  zoomScale: number;
  zoomMs: number;
  ignite?: CameraIgnite;
};

function cue(
  id: string,
  priority: number,
  profile: CameraProfile,
  partial: Omit<CameraCue, 'id' | 'priority' | 'profile'>,
): CameraCue {
  return { id, priority, profile, ...partial };
}

/**
 * Profile recipes (tuned once; per-event overrides stay rare):
 * - punch: threat to the operator (shake + zoom lead)
 * - snap: Notice Impact resolve (short, Pass 4 budget)
 * - pressure: shelf/Window stress (vignette lead; soft zoom)
 * - bloom: player power / milestone (zoom + vignette; little shake)
 * - reward: kill resolve (soft zoom; no trauma stack)
 * - hush: Quiet stance (vignette only — Quiet must not hog chrome)
 */
const CUES: Record<string, CameraCue> = {
  extract: cue('extract', 100, 'bloom', {
    shakeMs: 80,
    shakeIntensity: 0.002,
    vignette: 0.26,
    vignetteMs: 320,
    nudgePx: 4,
    zoomScale: 1.1,
    zoomMs: 360,
  }),
  ion_form: cue('ion_form', 90, 'pressure', {
    shakeMs: 70,
    shakeIntensity: 0.002,
    vignette: 0.28,
    vignetteMs: 220,
    nudgePx: 3,
    zoomScale: 1.06,
    zoomMs: 240,
    ignite: 'scan',
  }),
  ion_clear: cue('ion_clear', 85, 'pressure', {
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.2,
    vignetteMs: 200,
    nudgePx: 0,
    zoomScale: 1.04,
    zoomMs: 200,
    ignite: 'scan',
  }),
  flare: cue('flare', 88, 'bloom', {
    shakeMs: 60,
    shakeIntensity: 0.0022,
    vignette: 0.18,
    vignetteMs: 160,
    nudgePx: 5,
    zoomScale: 1.08,
    zoomMs: 200,
    ignite: 'flare',
  }),
  spore: cue('spore', 70, 'punch', {
    shakeMs: 100,
    shakeIntensity: 0.0035,
    vignette: 0.14,
    vignetteMs: 140,
    nudgePx: 5,
    zoomScale: 1.06,
    zoomMs: 180,
    ignite: 'fauna',
  }),
  hurt: cue('hurt', 80, 'punch', {
    shakeMs: 120,
    shakeIntensity: 0.005,
    vignette: 0.16,
    vignetteMs: 140,
    nudgePx: 8,
    zoomScale: 1.09,
    zoomMs: 180,
  }),
  kill: cue('kill', 65, 'reward', {
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.1,
    vignetteMs: 120,
    nudgePx: 2,
    zoomScale: 1.04,
    zoomMs: 140,
  }),
  tele: cue('tele', 75, 'punch', {
    shakeMs: 110,
    shakeIntensity: 0.004,
    vignette: 0.14,
    vignetteMs: 140,
    nudgePx: 6,
    zoomScale: 1.08,
    zoomMs: 180,
  }),
  uplink_wave: cue('uplink_wave', 82, 'punch', {
    shakeMs: 130,
    shakeIntensity: 0.0045,
    vignette: 0.18,
    vignetteMs: 160,
    nudgePx: 7,
    zoomScale: 1.07,
    zoomMs: 200,
  }),
  uplink_done: cue('uplink_done', 78, 'bloom', {
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.18,
    vignetteMs: 220,
    nudgePx: 2,
    zoomScale: 1.05,
    zoomMs: 240,
  }),
  handshake: cue('handshake', 60, 'bloom', {
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.14,
    vignetteMs: 180,
    nudgePx: 0,
    zoomScale: 1.04,
    zoomMs: 200,
  }),
  approach_shear: cue('approach_shear', 72, 'pressure', {
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.16,
    vignetteMs: 160,
    nudgePx: 2,
    zoomScale: 1.04,
    zoomMs: 180,
  }),
  quiet: cue('quiet', 45, 'hush', {
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.14,
    vignetteMs: 180,
    nudgePx: 0,
    zoomScale: 1,
    zoomMs: 0,
  }),
  elite: cue('elite', 68, 'reward', {
    shakeMs: 50,
    shakeIntensity: 0.002,
    vignette: 0.14,
    vignetteMs: 160,
    nudgePx: 3,
    zoomScale: 1.05,
    zoomMs: 180,
  }),
  desync: cue('desync', 55, 'pressure', {
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.16,
    vignetteMs: 160,
    nudgePx: 2,
    zoomScale: 1.04,
    zoomMs: 180,
  }),
  notice: cue('notice', 50, 'snap', {
    shakeMs: 90,
    shakeIntensity: 0.003,
    vignette: 0.12,
    vignetteMs: 120,
    nudgePx: 4,
    zoomScale: 1.05,
    zoomMs: 160,
  }),
  hatch: cue('hatch', 58, 'bloom', {
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.12,
    vignetteMs: 160,
    nudgePx: 2,
    zoomScale: 1.04,
    zoomMs: 180,
  }),
};

/**
 * Lore → cue. Intentionally omits routine ticks:
 * bleed ticks, ion pulses, uplink hold ticks, Quiet-off, PB soft stress
 * (approach already cues via LOG-EVT-APPROACH).
 */
const LOG_TO_CUE: ReadonlyArray<readonly [LoreId, keyof typeof CUES]> = [
  ['LOG-EXTRACT', 'extract'],
  ['LOG-ION-FRONT', 'ion_form'],
  ['LOG-ION-CLEAR', 'ion_clear'],
  ['LOG-USE-FLARE', 'flare'],
  ['LOG-SPORE-BURST', 'spore'],
  ['LOG-HURT', 'hurt'],
  // Enemy beams that damage the operator — same punch as hurt (one cue if both fire).
  ['LOG-BEAM-FIRE', 'hurt'],
  ['LOG-OVERWATCH-FIRE', 'hurt'],
  ['LOG-UPLINK-WAVE-HIT', 'uplink_wave'],
  ['LOG-UPLINK-WAVE-REPEL', 'uplink_wave'],
  ['LOG-TELE-POUNCE', 'tele'],
  ['LOG-BOSS-TELE', 'tele'],
  ['LOG-KILL', 'kill'],
  ['LOG-ELITE-DOWN', 'elite'],
  ['LOG-BOSS-DOWN', 'elite'],
  ['LOG-EVT-SHEAR', 'approach_shear'],
  ['LOG-EVT-APPROACH', 'approach_shear'],
  ['LOG-USED-KEY', 'handshake'],
  ['LOG-HS-START', 'handshake'],
  ['LOG-UPLINK-START', 'uplink_done'],
  ['LOG-USE-JAMMER', 'quiet'],
  ['LOG-QUIET-ON', 'quiet'],
  ['LOG-PB-DESYNC', 'desync'],
  ['LOG-SEALED-OPEN', 'hatch'],
  ['LOG-SEALED-PRY', 'hatch'],
];

/**
 * Pick at most one camera cue for this turn’s new logs.
 * Returns null when nothing warrants a kick (routine movement / ticks).
 */
export function pickCameraCue(
  logs: readonly LoreId[],
  opts?: { noticeImpact?: boolean },
): CameraCue | null {
  let best: CameraCue | null = null;
  const seen = new Set(logs);
  for (const [loreId, cueKey] of LOG_TO_CUE) {
    if (!seen.has(loreId)) continue;
    const next = CUES[cueKey]!;
    if (!best || next.priority > best.priority) best = next;
  }
  if (opts?.noticeImpact) {
    const notice = CUES.notice!;
    if (!best || notice.priority > best.priority) best = notice;
  }
  return best;
}
