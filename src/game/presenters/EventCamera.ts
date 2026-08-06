import type { LoreId } from '../../data/lore';

/**
 * Event-driven camera cues — presentation only.
 * One strongest cue per turn (juice budget); never delays input.
 *
 * Aligns with DESIGN_PRINCIPLES: amplify meaningful state changes,
 * silence routine motion (no cue for ordinary WASD).
 *
 * Intensities are tuned to read clearly at 60fps without nausea —
 * Phaser shake ~0.003–0.006, world nudge ~4–10px.
 */

export type CameraIgnite = 'scan' | 'flare' | 'fauna';

export type CameraCue = {
  /** Stable id for tests / debug. */
  id: string;
  /** Higher wins when multiple logs fire in one turn. */
  priority: number;
  shakeMs: number;
  shakeIntensity: number;
  vignette: number;
  vignetteMs: number;
  /** Brief world-space nudge (px) — felt as a camera kick without zooming HUD. */
  nudgePx: number;
  ignite?: CameraIgnite;
};

const CUES: Record<string, CameraCue> = {
  extract: {
    id: 'extract',
    priority: 100,
    shakeMs: 160,
    shakeIntensity: 0.0035,
    vignette: 0.28,
    vignetteMs: 400,
    nudgePx: 6,
  },
  ion_form: {
    id: 'ion_form',
    priority: 90,
    shakeMs: 180,
    shakeIntensity: 0.0045,
    vignette: 0.3,
    vignetteMs: 280,
    nudgePx: 8,
    ignite: 'scan',
  },
  ion_clear: {
    id: 'ion_clear',
    priority: 85,
    shakeMs: 140,
    shakeIntensity: 0.0035,
    vignette: 0.24,
    vignetteMs: 240,
    nudgePx: 5,
    ignite: 'scan',
  },
  flare: {
    id: 'flare',
    priority: 88,
    shakeMs: 150,
    shakeIntensity: 0.0048,
    vignette: 0.22,
    vignetteMs: 200,
    nudgePx: 9,
    ignite: 'flare',
  },
  spore: {
    id: 'spore',
    priority: 70,
    shakeMs: 120,
    shakeIntensity: 0.0035,
    vignette: 0.18,
    vignetteMs: 180,
    nudgePx: 5,
    ignite: 'fauna',
  },
  hurt: {
    id: 'hurt',
    priority: 80,
    shakeMs: 140,
    shakeIntensity: 0.0055,
    vignette: 0.26,
    vignetteMs: 200,
    nudgePx: 10,
  },
  kill: {
    id: 'kill',
    priority: 65,
    shakeMs: 100,
    shakeIntensity: 0.003,
    vignette: 0.16,
    vignetteMs: 150,
    nudgePx: 5,
  },
  tele: {
    id: 'tele',
    priority: 75,
    shakeMs: 130,
    shakeIntensity: 0.0042,
    vignette: 0.2,
    vignetteMs: 180,
    nudgePx: 7,
  },
  uplink_wave: {
    id: 'uplink_wave',
    priority: 82,
    shakeMs: 160,
    shakeIntensity: 0.005,
    vignette: 0.28,
    vignetteMs: 240,
    nudgePx: 8,
  },
  uplink_done: {
    id: 'uplink_done',
    priority: 78,
    shakeMs: 110,
    shakeIntensity: 0.0032,
    vignette: 0.2,
    vignetteMs: 260,
    nudgePx: 5,
  },
  handshake: {
    id: 'handshake',
    priority: 60,
    shakeMs: 90,
    shakeIntensity: 0.0025,
    vignette: 0.16,
    vignetteMs: 200,
    nudgePx: 4,
  },
  approach_shear: {
    id: 'approach_shear',
    priority: 72,
    shakeMs: 120,
    shakeIntensity: 0.0035,
    vignette: 0.18,
    vignetteMs: 180,
    nudgePx: 6,
  },
  quiet: {
    id: 'quiet',
    priority: 45,
    shakeMs: 0,
    shakeIntensity: 0,
    vignette: 0.18,
    vignetteMs: 220,
    nudgePx: 0,
  },
  elite: {
    id: 'elite',
    priority: 68,
    shakeMs: 130,
    shakeIntensity: 0.004,
    vignette: 0.2,
    vignetteMs: 220,
    nudgePx: 7,
  },
  desync: {
    id: 'desync',
    priority: 55,
    shakeMs: 100,
    shakeIntensity: 0.0028,
    vignette: 0.18,
    vignetteMs: 180,
    nudgePx: 5,
  },
  notice: {
    id: 'notice',
    priority: 50,
    shakeMs: 110,
    shakeIntensity: 0.0035,
    vignette: 0.18,
    vignetteMs: 170,
    nudgePx: 5,
  },
  hatch: {
    id: 'hatch',
    priority: 58,
    shakeMs: 110,
    shakeIntensity: 0.0032,
    vignette: 0.16,
    vignetteMs: 170,
    nudgePx: 5,
  },
};

/** Lore → cue id (first match contributes; priority still picks winner). */
const LOG_TO_CUE: ReadonlyArray<readonly [LoreId, keyof typeof CUES]> = [
  ['LOG-EXTRACT', 'extract'],
  ['LOG-ION-FRONT', 'ion_form'],
  ['LOG-ION-CLEAR', 'ion_clear'],
  ['LOG-USE-FLARE', 'flare'],
  ['LOG-SPORE-BURST', 'spore'],
  ['LOG-HURT', 'hurt'],
  ['LOG-STATUS-BLEED', 'hurt'],
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
  ['LOG-PB-STRESS', 'desync'],
  ['LOG-SEALED-OPEN', 'hatch'],
  ['LOG-SEALED-PRY', 'hatch'],
];

/**
 * Pick at most one camera cue for this turn’s new logs.
 * Returns null when nothing warrants a kick (routine movement).
 */
export function pickCameraCue(
  logs: readonly LoreId[],
  opts?: { noticeImpact?: boolean },
): CameraCue | null {
  let best: CameraCue | null = null;
  const seen = new Set(logs);
  for (const [loreId, cueKey] of LOG_TO_CUE) {
    if (!seen.has(loreId)) continue;
    const cue = CUES[cueKey]!;
    if (!best || cue.priority > best.priority) best = cue;
  }
  if (opts?.noticeImpact) {
    const notice = CUES.notice!;
    if (!best || notice.priority > best.priority) best = notice;
  }
  return best;
}
