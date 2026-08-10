import Phaser from 'phaser';
import { Theme } from './theme';
import { shade } from './tex/color';

/**
 * Optional WebGL-only camera atmosphere. Gameplay lighting and FOV remain
 * ordinary scene objects, so Canvas/headless renderers retain full readability.
 */
export type CameraAtmosphere = {
  pulse(strength: number, duration: number): void;
  destroy(): void;
};

export function addCameraAtmosphere(
  scene: Phaser.Scene,
  strength = 0.07,
): CameraAtmosphere | null {
  const filters = scene.cameras.main.filters?.external;
  if (!filters || typeof filters.addVignette !== 'function') return null;

  const vignette = filters.addVignette(0.5, 0.5, 0.72, strength, Theme.groundDeep);
  return {
    pulse(pulseStrength: number, duration: number): void {
      scene.tweens.killTweensOf(vignette);
      scene.tweens.add({
        targets: vignette,
        strength: pulseStrength,
        duration: duration / 2,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    },
    destroy(): void {
      scene.tweens.killTweensOf(vignette);
      filters.remove(vignette);
    },
  };
}

// --- Field-kit primitives ---------------------------------------------------
// Everything below is drawn as if it were bolted, painted, taped or corroded
// onto salvaged survey hardware. Light comes from above: top edges catch a
// highlight, bottom edges drop a hard shadow line. No elbows, no pills.

type G = Phaser.GameObjects.Graphics;

/** Deterministic scuff/pit hash so chrome grain is stable between redraws. */
function grain(i: number, salt: number): number {
  const n = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Painted alloy plate with a machined top bevel and a hard bottom shadow. */
export function drawPlate(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; alpha?: number; bevel?: number } = {},
): void {
  const fill = opts.fill ?? Theme.panel;
  const alpha = opts.alpha ?? 1;
  const bevel = opts.bevel ?? 0.5;
  g.fillStyle(fill, alpha);
  g.fillRect(x, y, w, h);
  // Motivated key light from above.
  g.fillStyle(Theme.panelEdge, 0.85 * bevel);
  g.fillRect(x, y, w, 1);
  g.fillStyle(Theme.inkDim, 0.16 * bevel);
  g.fillRect(x, y + 1, w, 1);
  g.fillStyle(Theme.groundDeep, 0.85 * bevel);
  g.fillRect(x, y + h - 1, w, 1);
  g.fillStyle(Theme.groundDeep, 0.45 * bevel);
  g.fillRect(x + w - 1, y + 1, 1, h - 2);
  g.fillStyle(Theme.panelEdge, 0.35 * bevel);
  g.fillRect(x, y + 1, 1, h - 2);
}

/** Countersunk bolt head — 3px, lit from above. */
export function drawBolt(g: G, x: number, y: number): void {
  g.fillStyle(Theme.groundDeep, 0.9);
  g.fillRect(x - 1, y - 1, 3, 3);
  g.fillStyle(Theme.panelEdge, 0.9);
  g.fillRect(x - 1, y - 1, 3, 1);
  g.fillStyle(Theme.inkDim, 0.5);
  g.fillRect(x, y, 1, 1);
}

/** Reflective hazard tape — diagonal bars, used sparingly and only as warning. */
export function drawTapeStrip(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  alpha = 0.85,
): void {
  g.fillStyle(Theme.groundDeep, 0.9);
  g.fillRect(x, y, w, h);
  const step = 7;
  for (let i = -h; i < w; i += step) {
    g.fillStyle(color, alpha);
    g.fillTriangle(x + i, y + h, x + i + h, y, x + i + h + 3, y);
    g.fillTriangle(x + i, y + h, x + i + 3, y + h, x + i + h + 3, y);
  }
}

/** Silkscreen registration ticks — a ruler stencilled onto the case. */
export function drawStencilTicks(
  g: G,
  x: number,
  y: number,
  length: number,
  vertical: boolean,
  color = Theme.inkMute,
): void {
  for (let i = 0; i < length; i += 8) {
    const major = i % 32 === 0;
    g.fillStyle(color, major ? 0.7 : 0.32);
    if (vertical) g.fillRect(x, y + i, major ? 6 : 3, 1);
    else g.fillRect(x + i, y, 1, major ? 6 : 3);
  }
}

/**
 * Brine corrosion creeping across a surface. `amount` 0–1 drives pit count and
 * bite — the Shear Pressure chrome uses this to physically degrade the frame.
 */
export function drawCorrosion(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  amount: number,
  salt = 1,
): void {
  const a = Math.max(0, Math.min(1, amount));
  if (a <= 0.001) return;
  const pits = Math.floor(a * 46);
  for (let i = 0; i < pits; i++) {
    const px = x + grain(i, salt) * w;
    const py = y + grain(i + 91, salt) * h;
    const size = grain(i + 17, salt) > 0.82 ? 2 : 1;
    const hot = grain(i + 43, salt) > 0.7;
    g.fillStyle(hot ? Theme.rust : Theme.biolumDeep, 0.2 + a * 0.55);
    g.fillRect(Math.floor(px), Math.floor(py), size, size);
  }
}

/**
 * Field-kit menu backdrop — a scuffed equipment case lid, not a bridge console.
 */
export function drawMenuChrome(
  _scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  accent: number = Theme.tape,
): void {
  g.clear();
  // Wet basalt behind the kit, catching a little more light down the middle.
  g.fillGradientStyle(
    shade(Theme.groundDeep, 0.85),
    shade(Theme.groundDeep, 1.4),
    shade(Theme.groundDeep, 1.85),
    shade(Theme.groundDeep, 0.7),
    1,
  );
  g.fillRect(0, 0, width, height);
  // Ash/spray flecks catching the low light.
  for (let i = 0; i < 90; i++) {
    const fx = grain(i, 3) * width;
    const fy = grain(i + 400, 3) * height;
    g.fillStyle(i % 9 === 0 ? Theme.biolum : Theme.inkDim, i % 9 === 0 ? 0.22 : 0.08);
    g.fillRect(Math.floor(fx), Math.floor(fy), 1, 1);
  }

  const px = 34;
  const py = 38;
  const pw = width - 68;
  const ph = height - 76;

  // Case lid: painted alloy, worn back to metal along the top rail.
  drawPlate(g, px, py, pw, ph, { fill: Theme.panel, alpha: 0.97 });
  g.fillStyle(Theme.ground, 0.85);
  g.fillRect(px + 8, py + 22, pw - 16, ph - 44);
  g.fillStyle(Theme.panelEdge, 0.3);
  g.fillRect(px + 8, py + 22, pw - 16, 1);

  // Paint scuffs down to bare metal.
  for (let i = 0; i < 26; i++) {
    const sx = px + 12 + grain(i, 7) * (pw - 30);
    const sy = py + 26 + grain(i + 55, 7) * (ph - 56);
    const sw = 2 + Math.floor(grain(i + 13, 7) * 14);
    g.fillStyle(Theme.panelEdge, 0.14 + grain(i + 31, 7) * 0.16);
    g.fillRect(Math.floor(sx), Math.floor(sy), sw, 1);
  }

  // Top rail: stencil label field + one strip of hazard tape (warning only).
  drawPlate(g, px + 8, py + 6, pw - 16, 13, { fill: Theme.ground });
  drawTapeStrip(g, px + pw - 132, py + 7, 118, 11, accent, 0.8);
  g.fillStyle(Theme.inkMute, 0.55);
  g.fillRect(px + 14, py + 12, 78, 1);
  g.fillRect(px + 98, py + 12, 34, 1);

  // Bolts at every corner of the lid and rail.
  for (const [bx, by] of [
    [px + 5, py + 5],
    [px + pw - 6, py + 5],
    [px + 5, py + ph - 6],
    [px + pw - 6, py + ph - 6],
  ]) {
    drawBolt(g, bx!, by!);
  }

  // Machinist rule down the left edge; cable channel down the right.
  drawStencilTicks(g, px + 12, py + 34, ph - 70, true);
  g.fillStyle(Theme.groundDeep, 0.8);
  g.fillRect(px + pw - 16, py + 30, 4, ph - 62);
  g.fillStyle(Theme.panelEdge, 0.5);
  g.fillRect(px + pw - 16, py + 30, 1, ph - 62);
  for (let y = py + 40; y < py + ph - 40; y += 26) {
    g.fillStyle(Theme.inkMute, 0.35);
    g.fillRect(px + pw - 18, y, 8, 1);
  }

  // Condensation beading on the lower plate.
  for (let i = 0; i < 30; i++) {
    const dx = px + 20 + grain(i, 21) * (pw - 40);
    const dy = py + ph - 60 + grain(i + 9, 21) * 46;
    g.fillStyle(Theme.biolum, 0.1 + grain(i + 3, 21) * 0.12);
    g.fillRect(Math.floor(dx), Math.floor(dy), 1, 1);
  }
}

/**
 * In-run HUD rails — bolted brackets top and bottom of the map viewport.
 * `corrosion` (0–1) is driven by Shear Pressure so the kit visibly degrades.
 */
function drawShearLegGlyphs(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  leg: ShearLegGlyph,
  accent: number,
  animFrame: number,
  corrosion: number,
): void {
  const pulse = 0.45 + (animFrame % 4) * 0.14;
  const stormX = x;
  const busX = x + 52;
  const stormHot = leg === 'storm' || leg === 'both';
  const busHot = leg === 'bus' || leg === 'both';

  // Window / storm tick marks
  g.lineStyle(1, Theme.arc, (stormHot ? 0.85 : 0.28) * pulse * (0.5 + corrosion * 0.5));
  for (let i = 0; i < 3; i++) {
    const tx = stormX + i * 4;
    g.beginPath();
    g.moveTo(tx, y + 1);
    g.lineTo(tx, y + 4);
    g.strokePath();
  }

  // Bus reserve capsule
  g.lineStyle(1, Theme.tape, (busHot ? 0.85 : 0.28) * pulse * (0.5 + corrosion * 0.5));
  g.strokeRect(busX, y, 10, 5);
  if (busHot) {
    g.fillStyle(Theme.tape, 0.35 * pulse);
    g.fillRect(busX + 1, y + 1, 8, 3);
  }
}

export type ShearLegGlyph = 'storm' | 'bus' | 'both';

export function drawHudStripChrome(
  g: Phaser.GameObjects.Graphics,
  opts: {
    y: number;
    height: number;
    width: number;
    side: 'top' | 'bottom';
    corrosion?: number;
    accent?: number;
    /** Which clock leg drives shear — pulsing sub-glyphs on the top strip tape. */
    drainingLeg?: ShearLegGlyph;
    animFrame?: number;
  },
): void {
  const { y, height, width, side } = opts;
  const corrosion = opts.corrosion ?? 0;
  const accent = opts.accent ?? Theme.tape;
  g.clear();

  drawPlate(g, 0, y, width, height, { fill: Theme.groundDeep, alpha: 0.98, bevel: 0 });
  // Instrument face sits slightly proud of the case.
  const faceY = side === 'top' ? y : y + 3;
  const faceH = side === 'top' ? height - 3 : height - 3;
  drawPlate(g, 0, faceY, width, faceH, { fill: Theme.panel, alpha: 0.95 });

  if (side === 'top') {
    // Machined lip where the viewport starts — the map is a window in the case.
    g.fillStyle(Theme.panelEdge, 0.9);
    g.fillRect(0, y + height - 2, width, 1);
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(0, y + height - 1, width, 1);
    drawStencilTicks(g, 12, y + height - 8, width - 150, false, Theme.inkMute);
    drawTapeStrip(g, width - 128, y + 4, 116, 6, accent, 0.55);
    if (corrosion >= 0.25 && opts.drainingLeg) {
      drawShearLegGlyphs(
        g,
        width - 118,
        y + 5,
        opts.drainingLeg,
        accent,
        opts.animFrame ?? 0,
        corrosion,
      );
    }
  } else {
    g.fillStyle(Theme.panelEdge, 0.9);
    g.fillRect(0, y + 2, width, 1);
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(0, y, width, 2);
    drawStencilTicks(g, 12, y + 6, width - 150, false, Theme.inkMute);
  }

  for (let bx = 8; bx < width; bx += 96) {
    drawBolt(g, bx, side === 'top' ? y + 6 : y + height - 7);
  }

  // Calm (value < 0.25) stays quiet — no corrosion etch on the strip.
  if (corrosion >= 0.25) {
    drawCorrosion(g, 0, side === 'top' ? y + height - 14 : y + 4, width, 14, corrosion, 5);
  }
}

/** Modal panel — kit / PADD / help, drawn as a labelled equipment case. */
export function drawFieldPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: number = Theme.tape,
): void {
  g.clear();
  // Drop shadow so the case reads as a physical object over the field.
  g.fillStyle(Theme.groundDeep, 0.55);
  g.fillRect(x + 3, y + 4, w, h);
  drawPlate(g, x, y, w, h, { fill: Theme.panel, alpha: 0.99 });
  g.fillStyle(Theme.ground, 0.9);
  g.fillRect(x + 6, y + 16, w - 12, h - 24);

  // Painted spine stripe identifies the case — the only saturated colour here.
  g.fillStyle(accent, 0.9);
  g.fillRect(x + 6, y + 6, 4, h - 12);
  g.fillStyle(Theme.groundDeep, 0.35);
  g.fillRect(x + 6, y + 6, 4, 1);

  // Stencil header rule + serial ticks.
  g.fillStyle(Theme.inkMute, 0.6);
  g.fillRect(x + 16, y + 12, w - 32, 1);
  drawStencilTicks(g, x + 16, y + h - 10, w - 40, false);

  for (const [bx, by] of [
    [x + 5, y + 5],
    [x + w - 6, y + 5],
    [x + 5, y + h - 6],
    [x + w - 6, y + h - 6],
  ]) {
    drawBolt(g, bx!, by!);
  }
}

/**
 * Status chip — a stencilled label plate with a painted colour tab, not a
 * solid LCARS pill. Text stays bone-on-dark so chips never shout over the map.
 */
export function drawStencilBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
): void {
  drawPlate(g, x, y, w, h, { fill: Theme.panel });
  g.fillStyle(fill, 0.95);
  g.fillRect(x + 1, y + 1, 3, h - 2);
  g.fillStyle(fill, 0.35);
  g.fillRect(x + 1, y + h - 2, w - 2, 1);
}

/**
 * Shear arc shimmer across the field — invisible when Calm, faster and hotter
 * as pressure rises. Diegetic (the air is ionising), not a CRT retrace.
 */
export type ArcSweep = {
  setPressure(value: number, color: number): void;
  destroy(): void;
};

export function createArcSweep(scene: Phaser.Scene, depth: number): ArcSweep {
  const { width, height } = scene.scale;
  const line = scene.add
    .rectangle(0, 80, width, 1, Theme.arcWhite, 0)
    .setOrigin(0, 0.5)
    .setScrollFactor(0)
    .setDepth(depth);

  let travel: Phaser.Tweens.Tween | null = null;
  const restart = (duration: number) => {
    travel?.stop();
    travel = scene.tweens.add({
      targets: line,
      y: { from: 72, to: height - 120 },
      duration,
      ease: 'Linear',
      repeat: -1,
    });
  };
  restart(6400);

  let lastBucket = -1;
  return {
    setPressure(value: number, color: number): void {
      const v = Math.max(0, Math.min(1, value));
      line.setFillStyle(color, 1);
      line.setAlpha(v < 0.25 ? 0 : 0.05 + v * 0.22);
      const bucket = Math.floor(v * 4);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        restart(6400 - bucket * 1300);
      }
    },
    destroy(): void {
      travel?.stop();
      scene.tweens.killTweensOf(line);
      line.destroy();
    },
  };
}
