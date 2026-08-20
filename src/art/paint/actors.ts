import { ENEMIES, type EnemyKind } from '../../data/enemies';
import { Material, Theme } from '../../scenes/theme';
import { actorPalette } from '../palette';
import type { Frame } from '../pack';
import { bodyShades, Px } from '../px';
import { bevelRect, finishSprite, volume } from '../shade';
import { HOVER_SHAPES, silhouetteFor, type Silhouette } from '../silhouette';

function eyes(px: Px, cx: number, y: number, spread: number, size: number, ion: boolean): void {
  const glow = ion ? Theme.biolum : Theme.rust;
  const hot = ion ? Theme.arcWhite : Theme.arc;
  const s = Math.max(2, size);
  px.fillRect(cx - spread - s - 1, y - 1, s + 2, s + 2, Theme.groundDeep);
  px.fillRect(cx + spread - 1, y - 1, s + 2, s + 2, Theme.groundDeep);
  px.fillRect(cx - spread - s, y, s, s, glow);
  px.fillRect(cx + spread, y, s, s, glow);
  px.set(cx - spread - s + 1, y, hot);
  px.set(cx + spread + 1, y, hot);
}

function jointLeg(
  px: Px,
  x: number,
  hipY: number,
  footY: number,
  kick: number,
  deep: number,
  rim: number,
): void {
  const fx = x + kick;
  px.fillRect(x, hipY, 3, Math.max(2, footY - hipY - 3), deep);
  px.fillRect(fx - 1, footY - 3, 5, 3, rim);
  px.fillRect(fx - 2, footY - 1, 7, 2, deep);
}

function paintShape(
  px: Px,
  shape: Silhouette,
  color: number,
  frame: number,
  bob: number,
  kind: EnemyKind,
  ion: boolean,
): void {
  const { deep, mid, lit, rim } = bodyShades(color);
  const threat = ion ? Theme.biolum : Theme.rust;

  switch (shape) {
    case 'scuttler': {
      const gait = frame === 1 ? 2 : frame === 2 ? -2 : 0;
      for (let i = 0; i < 6; i++) {
        const lx = 7 + i * 6;
        const out = i === 0 || i === 5 ? 4 : i === 1 || i === 4 ? 2 : 0;
        const kick = (i + frame) % 2 === 0 ? gait : -gait;
        jointLeg(px, lx, 30 + bob + out, 42 + bob, kick, deep, rim);
      }
      px.fillEllipse(24, 32 + bob, 16, 8, mid);
      volume(px, mid, lit, deep);
      px.fillRect(12, 28 + bob, 24, 2, lit);
      px.fillRect(10, 31 + bob, 4, 3, deep);
      px.fillRect(34, 31 + bob, 4, 3, deep);
      px.fillRect(16, 34 + bob, 16, 1, rim);
      eyes(px, 24, 29 + bob, 5, 3, ion);
      break;
    }
    case 'crawler_body': {
      const stomp = frame === 1 ? 2 : frame === 2 ? -1 : 0;
      for (let i = 0; i < 8; i++) {
        const lx = 3 + i * 5;
        const out = i === 0 || i === 7 ? 5 : i === 1 || i === 6 ? 2 : 0;
        const alt = (i + frame) % 2 === 0 ? stomp : 0;
        jointLeg(px, lx, 28 + bob + out, 42 + bob - alt, 0, deep, rim);
      }
      px.fillEllipse(24, 30 + bob, 20, 10, mid);
      volume(px, mid, lit, deep);
      bevelRect(px, 10, 24 + bob, 8, 4, lit, mid, deep);
      bevelRect(px, 20, 23 + bob, 8, 4, lit, mid, deep);
      bevelRect(px, 30, 24 + bob, 8, 4, lit, mid, deep);
      px.fillRect(8, 32 + bob, 5, 4, rim);
      px.fillRect(35, 32 + bob, 5, 4, rim);
      eyes(px, 24, 27 + bob, 7, 3, ion);
      break;
    }
    case 'spore_body': {
      const sway = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      px.fillEllipse(24, 39 + bob, 16, 6, mid);
      volume(px, mid, lit, deep);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI;
        px.set(24 + Math.round(Math.cos(ang) * 14), 39 + bob + Math.round(Math.sin(ang) * 3), threat);
      }
      ;[13, 24, 35].forEach((sx, si) => {
        const lean = sway * (si === 0 ? -1 : si === 2 ? 1 : 0);
        px.fillRect(sx + lean, 16 + bob, 2, 22, rim);
        px.fillRect(sx + lean + 1, 16 + bob, 1, 22, mid);
        px.fillDisc(sx + lean + 1, 14 + bob, 5, mid);
        volume(px, mid, lit, deep);
        px.fillDisc(sx + lean + 1, 14 + bob, 3, threat);
        px.set(sx + lean + 1, 13 + bob, Theme.arcWhite);
      });
      break;
    }
    case 'bloom': {
      const r = 10 + frame * 3;
      px.fillDisc(24, 26 + bob, r + 3, mid);
      volume(px, mid, lit, deep);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + frame * 0.25;
        const sx = Math.round(24 + Math.cos(ang) * (r + 4));
        const sy = Math.round(26 + bob + Math.sin(ang) * (r + 4));
        px.fillRect(sx - 1, sy - 1, 3, 3, rim);
        px.set(sx, sy, threat);
      }
      px.fillDisc(18, 20 + bob, 4, lit);
      px.fillDisc(24, 26 + bob, 3 + frame, Theme.arcWhite);
      break;
    }
    case 'darter': {
      const mastling = kind === 'mastling';
      const wing = mastling
        ? frame === 1
          ? 18
          : frame === 2
            ? 11
            : 15
        : frame === 1
          ? 16
          : frame === 2
            ? 7
            : 12;
      px.fillTriangle(20, 18 + bob, 20 - wing, 8 + bob, 22, 28 + bob, mid);
      px.fillTriangle(28, 18 + bob, 28 + wing, 8 + bob, 26, 28 + bob, mid);
      px.fillEllipse(24, 24 + bob, mastling ? 8 : 6, mastling ? 13 : 14, mid);
      volume(px, mid, lit, deep);
      px.fillTriangle(20, 20 + bob, 20 - wing + 4, 12 + bob, 22, 26 + bob, lit);
      px.fillTriangle(28, 20 + bob, 28 + wing - 4, 12 + bob, 26, 26 + bob, lit);
      if (mastling) {
        px.fillRect(16, 22 + bob, 16, 4, deep);
        px.fillRect(20, 36 + bob, 8, 4, threat);
      } else {
        px.fillTriangle(21, 36 + bob, 27, 36 + bob, 24, 44 + bob, threat);
      }
      eyes(px, 24, (mastling ? 12 : 13) + bob, 2, 3, ion);
      break;
    }
    case 'crouched': {
      if (kind === 'skitter') {
        px.fillEllipse(24, 30 + bob, 15, 8, mid);
        for (let i = 0; i < 5; i++) {
          const lx = 8 + i * 8;
          const kick = frame === 1 && i % 2 === 0 ? 2 : -1;
          jointLeg(px, lx, 34 + bob, 43 + bob, kick, deep, rim);
        }
        volume(px, mid, lit, deep);
        px.fillRect(17, 28 + bob, 14, 2, threat);
        eyes(px, 24, 27 + bob, 5, 2, ion);
      } else if (kind === 'reef_skitter') {
        px.fillEllipse(28, 30 + bob, 14, 9, mid);
        px.fillTriangle(18, 16 + bob, 28, 2 + bob, 36, 16 + bob, mid);
        px.fillRect(8, 26 + bob, 16, 10, mid);
        volume(px, mid, lit, deep);
        px.fillTriangle(22, 14 + bob, 28, 5 + bob, 33, 14 + bob, lit);
        jointLeg(px, 12, 36 + bob, 43 + bob, 0, deep, rim);
        jointLeg(px, 34, 36 + bob, 43 + bob, 0, deep, rim);
        px.fillRect(4, 30 + bob, 6, 3, threat);
        eyes(px, 16, 28 + bob, 2, 3, ion);
      } else {
        const crouch = frame === 2 ? 2 : frame === 1 ? -1 : 0;
        px.fillEllipse(32, 28 + bob, 13, 10, mid);
        px.fillRect(8, 24 + bob, 22, 12, mid);
        px.fillTriangle(2, 28 + bob, 14, 20 + bob, 14, 36 + bob, mid);
        volume(px, mid, lit, deep);
        jointLeg(px, 18, 34 + bob, 42 + bob - crouch, 0, deep, rim);
        jointLeg(px, 34, 34 + bob, 42 + bob - crouch, 0, deep, rim);
        px.fillRect(4, 27 + bob, 6, 3, threat);
        eyes(px, 14, 26 + bob, 2, 3, ion);
      }
      break;
    }
    case 'annelid': {
      const pulse = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      for (let i = 4; i >= 0; i--) {
        const w = 11 - i * 1.4 + (i === frame ? 1 : 0);
        px.fillEllipse(24, 38 - i * 6 + bob + pulse, w, 5, mid);
      }
      volume(px, mid, lit, deep);
      px.fillDisc(24, 10 + bob, 8, mid);
      volume(px, mid, lit, deep);
      px.fillDisc(24, 10 + bob, 5, threat);
      px.fillDisc(24, 10 + bob, 2, Theme.groundDeep);
      px.set(24, 9 + bob, Theme.arcWhite);
      break;
    }
    case 'bulwark': {
      px.fillTriangle(4, 42 + bob, 10, 10 + bob, 38, 10 + bob, mid);
      px.fillRect(8, 10 + bob, 32, 28, mid);
      px.fillTriangle(44, 42 + bob, 38, 10 + bob, 10, 10 + bob, mid);
      volume(px, mid, lit, deep);
      px.fillRect(12, 22 + bob, 24, 2, deep);
      px.fillRect(12, 30 + bob, 24, 2, deep);
      px.fillRect(12, 16 + bob, 24, 3, Theme.tape);
      px.fillRect(12, 16 + bob, 24, 1, Theme.inkBright);
      eyes(px, 24, 20 + bob, 6, 3, ion);
      break;
    }
    case 'turret': {
      const swivel = frame === 1 ? 4 : frame === 2 ? -4 : 0;
      bevelRect(px, 10, 26 + bob, 28, 14, Theme.inkMute, Theme.panel, Theme.groundDeep);
      px.fillTriangle(6, 44 + bob, 12, 28 + bob, 36, 28 + bob, Theme.panelEdge);
      px.fillTriangle(42, 44 + bob, 36, 28 + bob, 12, 28 + bob, Theme.panelEdge);
      bevelRect(px, 12 + swivel, 10 + bob, 22, 16, lit, mid, deep);
      bevelRect(px, 32 + swivel, 16 + bob, 14, 6, Theme.inkMute, Theme.panelEdge, Theme.groundDeep);
      px.fillRect(44 + swivel, 16 + bob, 3, 6, Theme.tape);
      px.fillRect(16 + swivel, 18 + bob, 5, 4, threat);
      break;
    }
    case 'emitter': {
      if (kind === 'duct_drone') {
        bevelRect(px, 8, 12 + bob, 32, 22, Theme.inkMute, Theme.panel, Theme.groundDeep);
        px.fillRect(10, 14 + bob, 28, 4, mid);
        px.fillRect(2, 18 + bob, 8, 8, Theme.panelEdge);
        px.fillRect(38, 18 + bob, 8, 8, Theme.panelEdge);
        px.fillRect(16, 22 + bob, 16, 8, Theme.groundDeep);
        px.fillRect(18, 24 + bob, 12, 4, Theme.arcWhite);
        px.fillRect(12 - frame, 8 + bob, 24 + frame * 2, 3, Theme.panelEdge);
      } else {
        bevelRect(px, 12, 14 + bob, 24, 18, Theme.inkMute, Theme.panel, Theme.groundDeep);
        px.fillRect(2, 20 + bob, 12, 5, Theme.panelEdge);
        px.fillRect(34, 20 + bob, 12, 5, Theme.panelEdge);
        px.fillRect(2, 18 + bob, 3, 9, mid);
        px.fillRect(43, 18 + bob, 3, 9, mid);
        px.fillDisc(24, 23 + bob, 8, Theme.groundDeep);
        px.strokeDisc(24, 23 + bob, 8, Theme.panelEdge);
        px.fillDisc(24, 23 + bob, 4 + frame, Theme.arcWhite);
        px.fillRect(14 - frame * 2, 8 + bob, 20 + frame * 4, 3, Theme.panelEdge);
      }
      break;
    }
    case 'chassis': {
      bevelRect(px, 8, 10 + bob, 32, 28, Theme.inkMute, Theme.panel, Theme.groundDeep);
      px.fillRect(10, 12 + bob, 28, 5, mid);
      px.fillRect(10, 32 + bob, 28, 3, mid);
      px.fillRect(12, 20 + bob, 24, 9, Theme.groundDeep);
      px.fillRect(14 + frame * 6, 22 + bob, 7, 5, threat);
      px.fillRect(10, 38 + bob, 8, 5, Theme.panelEdge);
      px.fillRect(30, 38 + bob, 8, 5, Theme.panelEdge);
      px.fillRect(12, 13 + bob, 8, 2, Theme.inkBright);
      break;
    }
    case 'coil': {
      const lean = frame === 1 ? 3 : frame === 2 ? -3 : 0;
      px.fillEllipse(24, 34 + bob, 15, 8, mid);
      px.fillEllipse(24, 28 + bob, 11, 7, mid);
      px.fillRect(21 + lean, 10 + bob, 6, 16, mid);
      volume(px, mid, lit, deep);
      px.fillTriangle(16 + lean, 12 + bob, 32 + lean, 12 + bob, 24 + lean, 2 + bob, rim);
      px.fillRect(20 + lean, 11 + bob, 3, 4, threat);
      px.fillRect(25 + lean, 11 + bob, 3, 4, threat);
      eyes(px, 24 + lean, 7 + bob, 3, 2, ion);
      break;
    }
    case 'reacher': {
      const stretch = frame === 1 ? 6 : frame === 2 ? 2 : 0;
      px.fillRect(19, 8 + bob, 10, 22, mid);
      px.fillTriangle(19, 12 + bob, 1, 22 + stretch + bob, 19, 24 + bob, mid);
      px.fillTriangle(29, 12 + bob, 47, 22 + stretch + bob, 29, 24 + bob, mid);
      px.fillTriangle(17, 28 + bob, 31, 28 + bob, 24, 44 + bob, mid);
      volume(px, mid, lit, deep);
      px.fillRect(2, 20 + stretch + bob, 10, 2, lit);
      px.fillRect(36, 20 + stretch + bob, 10, 2, lit);
      px.set(2, 20 + stretch + bob, threat);
      px.set(45, 20 + stretch + bob, threat);
      eyes(px, 24, 11 + bob, 3, 3, ion);
      break;
    }
    case 'aperture': {
      px.fillDisc(24, 24 + bob, 18, mid);
      volume(px, mid, lit, deep);
      px.fillDisc(24, 24 + bob, 13, Theme.groundDeep);
      px.strokeDisc(24, 24 + bob, 16 - frame, color);
      px.strokeDisc(24, 24 + bob, 10 + frame, lit);
      px.fillDisc(24, 24 + bob, 6 + frame, mid);
      px.fillDisc(24, 24 + bob, 2, Theme.arcWhite);
      const pulse = frame * 2;
      px.fillRect(22, 2 + bob, 4, 6 + pulse / 2, threat);
      px.fillRect(22, 40 + bob - pulse / 2, 4, 6, threat);
      px.fillRect(2, 22 + bob, 6 + pulse / 2, 4, threat);
      px.fillRect(40 - pulse / 2, 22 + bob, 6, 4, threat);
      break;
    }
  }
}

function paintCrown(px: Px): void {
  px.fillTriangle(8, 10, 14, 1, 20, 10, Theme.tape);
  px.fillTriangle(18, 10, 24, 0, 30, 10, Theme.tape);
  px.fillTriangle(28, 10, 34, 1, 40, 10, Theme.tape);
  px.fillRect(8, 10, 32, 3, Theme.groundDeep);
  px.fillRect(10, 10, 8, 1, Theme.inkBright);
  px.set(14, 3, Theme.inkBright);
  px.set(24, 2, Theme.inkBright);
  px.set(34, 3, Theme.inkBright);
}

function paintEnemy(kind: EnemyKind, frame: number): Px {
  const px = new Px();
  const def = ENEMIES[kind];
  const shape = silhouetteFor(kind);
  const ion = def.damageType === 'ion';
  const bob = HOVER_SHAPES.has(shape)
    ? frame === 1
      ? -3
      : frame === 2
        ? 2
        : 0
    : frame === 2
      ? 1
      : 0;
  paintShape(px, shape, def.color, frame, bob, kind, ion);
  if (def.brand) paintCrown(px);
  finishSprite(px, actorPalette(def.color));
  return px;
}

function paintPlayer(frame: number): Px {
  const px = new Px();
  const bob = frame === 1 ? -2 : 0;
  const stride = frame === 2 ? 2 : frame === 1 ? -2 : 0;
  // Pack
  bevelRect(px, 28, 16 + bob, 10, 14, Material.suitMid, Material.suitDeep, Theme.groundDeep);
  px.fillRect(30, 18 + bob, 6, 3, Theme.tape);
  // Helmet
  px.fillEllipse(23, 13 + bob, 10, 8, Material.suitMid);
  volume(px, Material.suitMid, Material.suitLit, Material.suitDeep);
  px.fillRect(16, 11 + bob, 14, 5, Material.visor);
  px.fillRect(18, 12 + bob, 10, 2, Theme.inkBright);
  px.fillRect(20 + frame, 12 + bob, 5, 1, Theme.biolum);
  // Torso
  bevelRect(px, 14, 18 + bob, 20, 16, Material.suitLit, Material.suitMid, Material.suitDeep);
  px.fillRect(20, 22 + bob, 8, 4, Theme.ink);
  px.set(24, 23 + bob, Theme.biolum);
  px.fillRect(16, 20 + bob, 4, 2, Theme.tape);
  // Arms
  bevelRect(px, 8 + stride, 20 + bob, 7, 14, Material.suitLit, Material.suitMid, Material.suitDeep);
  bevelRect(px, 33 - stride, 20 + bob, 7, 14, Material.suitLit, Material.suitMid, Material.suitDeep);
  // Legs + boots
  bevelRect(px, 16 + Math.min(0, stride), 33 + bob, 7, 10, Material.suitMid, Material.suitDeep, Theme.groundDeep);
  bevelRect(px, 25 + Math.max(0, stride), 33 + bob, 7, 10, Material.suitMid, Material.suitDeep, Theme.groundDeep);
  px.fillRect(15 + Math.min(0, stride), 41, 9, 4, Material.visor);
  px.fillRect(24 + Math.max(0, stride), 41, 9, 4, Material.visor);
  px.fillRect(36, 24 + bob, 3, 5, Theme.safe);
  finishSprite(px, actorPalette());
  return px;
}

function paintContact(role: 'npc' | 'ally', kind: string, frame: number): Px {
  const px = new Px();
  const ally = role === 'ally';
  const body = ally
    ? Material.allyShell
    : kind === 'archive_holo'
      ? Material.contactHolo
      : Material.contactSuit;
  const rim = ally ? Material.allyRim : Material.contactRim;
  const bob = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const stride = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  if (kind.includes('drone')) {
    bevelRect(px, 10, 14 + bob, 28, 20, Theme.inkMute, rim, Theme.groundDeep);
    px.fillRect(14, 18 + bob, 20, 12, body);
    volume(px, body, Theme.inkBright, rim);
    px.fillRect(12 + stride, 12 + bob, 24, 2, Theme.biolum);
    px.fillDisc(24, 24 + bob, 3, Theme.inkBright);
  } else {
    bevelRect(px, 15 + stride, 8 + bob, 18, 28, body, rim, Theme.groundDeep);
    px.fillRect(17 + stride, 10 + bob, 14, 22, body);
    volume(px, body, Theme.inkBright, rim);
    bevelRect(px, 10 + stride, 18 + bob, 7, 14, body, rim, Theme.groundDeep);
    bevelRect(px, 31 + stride, 18 + bob, 7, 14, body, rim, Theme.groundDeep);
    px.fillRect(16 + stride, 38, 7, 4, Theme.groundDeep);
    px.fillRect(25 + stride, 38, 7, 4, Theme.groundDeep);
  }
  px.fillRect(18 + stride, 14 + bob, 4, 3, Theme.inkBright);
  px.fillRect(26 + stride, 14 + bob, 4, 3, Theme.inkBright);
  px.fillRect(21 + stride, 24 + bob, 7, 4, ally ? Theme.safe : Theme.biolum);
  if (kind === 'archive_holo') {
    px.fillRect(12, 12 + bob, 24, 1, Theme.biolum);
    px.fillRect(14, 28 + bob, 20, 1, Theme.biolum);
  }
  finishSprite(px, actorPalette());
  return px;
}

export function paintCrownOverlay(): Px {
  const px = new Px();
  paintCrown(px);
  finishSprite(px, actorPalette());
  return px;
}

export function actorFrames(): Frame[] {
  const frames: Frame[] = [];
  for (let f = 0; f < 3; f++) {
    frames.push({ key: f === 0 ? 't_player' : `t_player_${f}`, px: paintPlayer(f) });
  }
  for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
    for (let f = 0; f < 3; f++) {
      frames.push({
        key: f === 0 ? `t_enemy_${kind}` : `t_enemy_${kind}_${f}`,
        px: paintEnemy(kind, f),
      });
    }
  }
  for (const kind of ['archive_holo', 'stranded_ensign', 'field_tech', 'survey_contact'] as const) {
    for (let f = 0; f < 3; f++) {
      frames.push({
        key: f === 0 ? `t_npc_${kind}` : `t_npc_${kind}_${f}`,
        px: paintContact('npc', kind, f),
      });
    }
  }
  for (const kind of ['probe_drone', 'away_escort'] as const) {
    for (let f = 0; f < 3; f++) {
      frames.push({
        key: f === 0 ? `t_ally_${kind}` : `t_ally_${kind}_${f}`,
        px: paintContact('ally', kind, f),
      });
    }
  }
  frames.push({ key: 't_crown', px: paintCrownOverlay() });
  return frames;
}
