import { ENEMIES, type EnemyKind } from '../../data/enemies';
import { Material, Theme } from '../../scenes/theme';
import { actorPalette } from '../palette';
import { bodyShades, Px } from '../px';
import { HOVER_SHAPES, silhouetteFor, type Silhouette } from '../silhouette';
import type { Frame } from '../pack';

function eyes(px: Px, cx: number, y: number, spread: number, size: number, ion: boolean): void {
  const glow = ion ? Theme.biolum : Theme.rust;
  const hot = ion ? Theme.arcWhite : Theme.arc;
  const s = Math.max(1, size);
  px.fillRect(cx - spread - s - 1, y - 1, s + 2, s + 2, Theme.groundDeep);
  px.fillRect(cx + spread - 1, y - 1, s + 2, s + 2, Theme.groundDeep);
  px.fillRect(cx - spread - s, y, s, s, glow);
  px.fillRect(cx + spread, y, s, s, glow);
  if (s > 2) {
    px.fillRect(cx - spread - s + 1, y + 1, s - 2, s - 2, hot);
    px.fillRect(cx + spread + 1, y + 1, s - 2, s - 2, hot);
  }
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
      const leg = frame === 1 ? 2 : frame === 2 ? -1 : 0;
      for (let i = 0; i < 6; i++) {
        const lx = 6 + i * 7;
        const out = i === 0 || i === 5 ? 3 : i === 1 || i === 4 ? 1 : 0;
        px.fillRect(lx, 32 + bob + out, 3, 8 - leg, deep);
        px.fillRect(lx - 2, 39 - leg + bob + out, 7, 2, deep);
        px.fillRect(lx - 2, 40 - leg + bob + out, 7, 1, rim);
      }
      px.fillEllipse(24, 33 + bob, 18, 7, rim);
      px.fillEllipse(24, 32 + bob, 14, 5, mid);
      px.fillRect(14, 29 + bob, 16, 2, lit);
      px.fillRect(8, 31 + bob, 5, 4, deep);
      px.fillRect(35, 31 + bob, 5, 4, deep);
      eyes(px, 24, 30 + bob, 6, 3, ion);
      break;
    }
    case 'crawler_body': {
      const stomp = frame === 1 ? 2 : frame === 2 ? -1 : 0;
      for (let i = 0; i < 8; i++) {
        const lx = 2 + i * 6;
        const out = i === 0 || i === 7 ? 4 : i === 1 || i === 6 ? 2 : 0;
        const alt = (i + frame) % 2 === 0 ? stomp : 0;
        px.fillRect(lx, 30 + bob + out, 4, 10 - alt, deep);
        px.fillRect(lx - 2, 38 - alt + bob + out, 8, 3, deep);
        px.fillRect(lx - 2, 40 - alt + bob + out, 8, 1, rim);
      }
      px.fillEllipse(24, 31 + bob, 22, 9, rim);
      px.fillEllipse(24, 30 + bob, 18, 6, mid);
      px.fillRect(10, 26 + bob, 8, 3, lit);
      px.fillRect(20, 25 + bob, 8, 3, lit);
      px.fillRect(30, 26 + bob, 8, 3, lit);
      px.fillRect(6, 28 + bob, 6, 5, deep);
      px.fillRect(36, 28 + bob, 6, 5, deep);
      px.fillRect(10, 33 + bob, 5, 4, rim);
      px.fillRect(33, 33 + bob, 5, 4, rim);
      eyes(px, 24, 28 + bob, 7, 4, ion);
      break;
    }
    case 'spore_body': {
      const sway = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      px.fillEllipse(24, 40 + bob, 17, 5, deep);
      px.fillEllipse(24, 39 + bob, 13, 3, mid, 200);
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI;
        px.fillRect(24 + Math.round(Math.cos(ang) * 13) - 1, 39 + bob + Math.round(Math.sin(ang) * 2), 2, 2, threat);
      }
      ;[14, 24, 34].forEach((sx, si) => {
        const lean = sway * (si === 0 ? -1 : si === 2 ? 1 : 0);
        px.fillRect(sx + lean - 1, 14 + bob, 3, 26, rim);
        px.fillRect(sx + lean, 15 + bob, 1, 24, mid);
        px.fillDisc(sx + lean, 13 + bob, 5, deep);
        px.fillDisc(sx + lean, 13 + bob, 3, threat);
        px.fillDisc(sx + lean, 12 + bob, 1, Theme.arcWhite);
      });
      break;
    }
    case 'bloom': {
      const r = 11 + frame * 3;
      px.fillDisc(24, 26 + bob, r + 5, deep);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + frame * 0.2;
        const sx = Math.round(24 + Math.cos(ang) * (r + 3));
        const sy = Math.round(26 + bob + Math.sin(ang) * (r + 3));
        px.fillRect(sx - 1, sy - 1, 4, 4, rim);
        px.fillRect(sx, sy, 2, 2, threat);
      }
      px.fillDisc(24, 26 + bob, r, mid);
      px.fillDisc(18, 20 + bob, 5, lit);
      px.fillDisc(24, 26 + bob, 4 + frame, Theme.arcWhite);
      px.fillRect(23, 26 - r + bob, 2, r * 2, threat);
      px.fillRect(24 - r, 25 + bob, r * 2, 2, threat);
      break;
    }
    case 'darter': {
      const mastling = kind === 'mastling';
      const wing = mastling
        ? frame === 1
          ? 20
          : frame === 2
            ? 12
            : 16
        : frame === 1
          ? 18
          : frame === 2
            ? 8
            : 13;
      px.fillTriangle(20, 16 + bob, 20 - wing, 4 + bob, 22, 28 + bob, lit);
      px.fillTriangle(28, 16 + bob, 28 + wing, 4 + bob, 26, 28 + bob, lit);
      px.fillTriangle(20, 18 + bob, 20 - wing + 3, 8 + bob, 21, 26 + bob, rim);
      px.fillTriangle(28, 18 + bob, 28 + wing - 3, 8 + bob, 27, 26 + bob, rim);
      px.fillEllipse(24, 24 + bob, mastling ? 9 : 7, mastling ? 14 : 16, rim);
      px.fillEllipse(24, 24 + bob, mastling ? 6 : 4, mastling ? 11 : 13, mid);
      if (mastling) {
        px.fillRect(15, 23 + bob, 18, 5, deep);
        px.fillRect(20, 37 + bob, 8, 5, threat);
      } else {
        px.fillTriangle(21, 37 + bob, 27, 37 + bob, 24, 45 + bob, threat);
      }
      eyes(px, 24, (mastling ? 13 : 14) + bob, 2, 4, ion);
      break;
    }
    case 'crouched': {
      if (kind === 'skitter') {
        px.fillEllipse(24, 31 + bob, 17, 8, rim);
        for (let i = 0; i < 5; i++) {
          const lx = 8 + i * 8;
          const kick = frame === 1 && i % 2 === 0 ? 2 : 0;
          px.fillRect(lx, 37 + bob - kick, 3, 7 + kick, rim);
          px.fillRect(lx - 1, 42 + bob, 5, 2, rim);
        }
        px.fillEllipse(24, 30 + bob, 13, 5, mid);
        px.fillRect(18, 29 + bob, 12, 3, threat);
        eyes(px, 24, 28 + bob, 5, 3, ion);
      } else if (kind === 'reef_skitter') {
        px.fillEllipse(28, 31 + bob, 16, 9, rim);
        px.fillTriangle(20, 16 + bob, 28, 2 + bob, 36, 16 + bob, rim);
        px.fillRect(6, 28 + bob, 20, 12, rim);
        px.fillEllipse(28, 30 + bob, 12, 6, mid);
        px.fillRect(8, 30 + bob, 16, 7, mid);
        px.fillTriangle(23, 14 + bob, 28, 4 + bob, 33, 14 + bob, lit);
        px.fillRect(12, 38 + bob, 5, 6, deep);
        px.fillRect(34, 38 + bob, 5, 6, deep);
        px.fillRect(4, 32 + bob, 6, 3, threat);
        eyes(px, 16, 30 + bob, 2, 3, ion);
      } else {
        const crouch = frame === 2 ? 2 : frame === 1 ? -1 : 0;
        px.fillEllipse(32, 29 + bob, 14, 10, rim);
        px.fillRect(8, 26 + bob, 22, 12, rim);
        px.fillTriangle(2, 30 + bob, 14, 22 + bob, 14, 38 + bob, rim);
        px.fillEllipse(32, 28 + bob, 10, 7, mid);
        px.fillRect(10, 28 + bob, 18, 8, mid);
        px.fillRect(18, 36 + bob, 5, 7 - crouch, deep);
        px.fillRect(34, 36 + bob, 5, 7 - crouch, deep);
        px.fillRect(4, 29 + bob, 6, 4, threat);
        eyes(px, 15, 27 + bob, 2, 3, ion);
      }
      break;
    }
    case 'annelid': {
      const pulse = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      for (let i = 0; i < 5; i++) {
        const w = 24 - i * 3 + (i === frame ? 2 : 0);
        px.fillEllipse(24, 38 - i * 7 + bob + pulse, w / 2, 6, rim);
        px.fillEllipse(24, 38 - i * 7 + bob + pulse, (w - 6) / 2, 3, mid);
        px.fillRect(24 - (w - 8) / 2, 38 - i * 7 + bob + pulse, w - 8, 1, deep);
      }
      px.fillDisc(24, 8 + bob, 11, rim);
      px.fillDisc(24, 8 + bob, 7 - (frame === 1 ? 1 : 0), threat);
      px.fillDisc(24, 8 + bob, 3, Theme.groundDeep);
      px.fillDisc(24, 8 + bob, 1, Theme.arcWhite);
      break;
    }
    case 'bulwark': {
      px.fillTriangle(1, 42 + bob, 8, 12 + bob, 40, 12 + bob, deep);
      px.fillRect(5, 12 + bob, 38, 28, deep);
      px.fillTriangle(47, 42 + bob, 40, 12 + bob, 8, 12 + bob, deep);
      px.fillRect(9, 16 + bob, 30, 22, rim);
      px.fillRect(11, 18 + bob, 26, 18, mid);
      px.fillRect(11, 24 + bob, 26, 3, deep);
      px.fillRect(11, 31 + bob, 26, 3, deep);
      px.fillRect(11, 18 + bob, 26, 3, Theme.tape);
      eyes(px, 24, 21 + bob, 6, 4, ion);
      break;
    }
    case 'turret': {
      const swivel = frame === 1 ? 4 : frame === 2 ? -4 : 0;
      px.fillTriangle(4, 44 + bob, 12, 26 + bob, 36, 26 + bob, Theme.panelEdge);
      px.fillTriangle(44, 44 + bob, 36, 26 + bob, 12, 26 + bob, Theme.panelEdge);
      px.fillRect(12, 28 + bob, 24, 12, Theme.panel);
      px.fillRect(14, 30 + bob, 20, 8, deep);
      px.fillRect(11 + swivel, 10 + bob, 24, 18, mid);
      px.fillRect(13 + swivel, 12 + bob, 20, 6, Theme.panelEdge);
      px.fillRect(33 + swivel, 18 + bob, 14, 6, Theme.panelEdge);
      px.fillRect(44 + swivel, 18 + bob, 3, 6, Theme.tape);
      px.fillRect(15 + swivel, 20 + bob, 6, 5, threat);
      break;
    }
    case 'emitter': {
      if (kind === 'duct_drone') {
        px.fillRect(6, 10 + bob, 36, 26, Theme.panelEdge);
        px.fillRect(9, 13 + bob, 30, 20, Theme.panel);
        px.fillRect(9, 13 + bob, 30, 5, mid);
        px.fillRect(1, 18 + bob, 9, 8, Theme.panelEdge);
        px.fillRect(38, 18 + bob, 9, 8, Theme.panelEdge);
        px.fillRect(14, 22 + bob, 20, 10, Theme.groundDeep);
        px.fillRect(18, 24 + bob, 12, 6, Theme.arcWhite);
        px.fillRect(10 - frame, 6 + bob, 28 + frame * 2, 4, Theme.panelEdge);
      } else {
        px.fillRect(10, 12 + bob, 28, 22, Theme.panelEdge);
        px.fillRect(12, 14 + bob, 24, 18, Theme.panel);
        px.fillRect(1, 20 + bob, 12, 5, Theme.panelEdge);
        px.fillRect(35, 20 + bob, 12, 5, Theme.panelEdge);
        px.fillRect(1, 18 + bob, 4, 10, mid);
        px.fillRect(43, 18 + bob, 4, 10, mid);
        px.fillDisc(24, 23 + bob, 10, Theme.groundDeep);
        px.fillDisc(24, 23 + bob, 5 + frame, Theme.arcWhite);
        px.fillRect(12 - frame * 2, 6 + bob, 24 + frame * 4, 4, Theme.panelEdge);
      }
      break;
    }
    case 'chassis': {
      px.fillRect(6, 8 + bob, 36, 32, Theme.panelEdge);
      px.fillRect(9, 11 + bob, 30, 26, Theme.panel);
      px.fillRect(9, 11 + bob, 30, 6, mid);
      px.fillRect(9, 33 + bob, 30, 4, mid);
      px.fillRect(11, 20 + bob, 26, 10, Theme.groundDeep);
      px.fillRect(13 + frame * 6, 22 + bob, 8, 6, threat);
      px.fillRect(8, 40 + bob, 8, 5, Theme.panelEdge);
      px.fillRect(32, 40 + bob, 8, 5, Theme.panelEdge);
      px.fillRect(10, 12 + bob, 8, 2, Theme.inkBright);
      break;
    }
    case 'coil': {
      const lean = frame === 1 ? 4 : frame === 2 ? -3 : 0;
      px.fillEllipse(24, 36 + bob, 17, 7, rim);
      px.fillEllipse(24, 30 + bob, 13, 6, rim);
      px.fillRect(20 + lean, 10 + bob, 8, 18, rim);
      px.fillEllipse(24, 35 + bob, 13, 4, mid);
      px.fillEllipse(24, 30 + bob, 9, 4, mid);
      px.fillRect(22 + lean, 11 + bob, 5, 16, mid);
      px.fillTriangle(14 + lean, 12 + bob, 34 + lean, 12 + bob, 24 + lean, 1 + bob, rim);
      px.fillRect(20 + lean, 12 + bob, 3, 5, threat);
      px.fillRect(25 + lean, 12 + bob, 3, 5, threat);
      eyes(px, 24 + lean, 7 + bob, 3, 3, ion);
      break;
    }
    case 'reacher': {
      const stretch = frame === 1 ? 6 : frame === 2 ? 2 : 0;
      px.fillRect(18, 6 + bob, 12, 26, rim);
      px.fillTriangle(18, 10 + bob, 0, 22 + stretch + bob, 18, 24 + bob, rim);
      px.fillTriangle(30, 10 + bob, 48, 22 + stretch + bob, 30, 24 + bob, rim);
      px.fillTriangle(16, 28 + bob, 32, 28 + bob, 24, 46 + bob, rim);
      px.fillRect(20, 9 + bob, 8, 20, mid);
      px.fillTriangle(19, 30 + bob, 29, 30 + bob, 24, 42 + bob, mid);
      px.fillRect(2, 20 + stretch + bob, 12, 3, lit);
      px.fillRect(34, 20 + stretch + bob, 12, 3, lit);
      px.fillRect(1, 21 + stretch + bob, 4, 2, threat);
      px.fillRect(43, 21 + stretch + bob, 4, 2, threat);
      eyes(px, 24, 11 + bob, 3, 4, ion);
      break;
    }
    case 'aperture': {
      const pulse = frame * 2;
      px.fillDisc(24, 24 + bob, 22, rim);
      px.fillDisc(24, 24 + bob, 17, Theme.groundDeep);
      px.fillDisc(24, 24 + bob, 19 - frame, mid);
      px.fillDisc(24, 24 + bob, 16 - frame, Theme.groundDeep);
      px.fillDisc(24, 24 + bob, 12 + frame, lit);
      px.fillDisc(24, 24 + bob, 10 + frame, Theme.groundDeep);
      px.fillDisc(24, 24 + bob, 7 + frame, mid);
      px.fillDisc(24, 24 + bob, 3, Theme.arcWhite);
      px.fillRect(22, 1 + bob, 4, 7 + pulse / 2, threat);
      px.fillRect(22, 40 + bob - pulse / 2, 4, 7, threat);
      px.fillRect(1, 22 + bob, 7 + pulse / 2, 4, threat);
      px.fillRect(40 - pulse / 2, 22 + bob, 7, 4, threat);
      break;
    }
  }
}

function paintCrown(px: Px): void {
  px.fillTriangle(8, 10, 14, 0, 20, 10, Theme.tape);
  px.fillTriangle(18, 10, 24, -1, 30, 10, Theme.tape);
  px.fillTriangle(28, 10, 34, 0, 40, 10, Theme.tape);
  px.fillRect(8, 10, 32, 3, Theme.groundDeep);
  px.fillRect(10, 10, 8, 1, Theme.inkBright);
}

function paintEnemy(kind: EnemyKind, frame: number): Px {
  const px = new Px();
  px.contactShadow();
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
  px.outline(Theme.groundDeep);
  px.snap(actorPalette(def.color));
  return px;
}

function paintPlayer(frame: number): Px {
  const px = new Px();
  px.contactShadow();
  const bob = frame === 1 ? -2 : 0;
  const stride = frame === 2 ? 1 : frame === 1 ? -1 : 0;
  px.fillRect(12, 12 + bob, 24, 28, Material.suitDeep);
  px.fillRect(9 + stride, 20 + bob, 7, 15, Material.suitDeep);
  px.fillRect(32 - stride, 20 + bob, 7, 15, Material.suitDeep);
  px.fillRect(15, 15 + bob, 18, 22, Material.suitLit);
  px.fillRect(15, 7 + bob, 18, 13, Material.suitMid);
  px.fillRect(18, 10 + bob, 13, 6, Theme.inkBright);
  px.fillRect(20 + frame, 12 + bob, 7, 2, Theme.biolum);
  px.fillRect(18, 22 + bob, 6, 4, Theme.ink);
  px.fillRect(22, 26 + bob, 10, 8, Material.suitMid);
  px.fillRect(16, 28 + bob, 4, 3, Theme.tape);
  px.fillRect(15 + (frame === 2 ? 1 : 0), 36, 7, 5, Material.visor);
  px.fillRect(27 - (frame === 2 ? 1 : 0), 36, 7, 5, Material.visor);
  px.fillRect(34, 24 + bob, 3, 6, Theme.safe);
  px.fillRect(11, 18 + bob, 4, 10, Material.suitMid);
  px.outline(Theme.groundDeep);
  px.snap(actorPalette());
  return px;
}

function paintContact(role: 'npc' | 'ally', kind: string, frame: number): Px {
  const px = new Px();
  px.contactShadow();
  const ally = role === 'ally';
  const body = ally
    ? Material.allyShell
    : kind === 'archive_holo'
      ? Material.contactHolo
      : Material.contactSuit;
  const rim = ally ? Material.allyRim : Material.contactRim;
  const bob = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const stride = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  if (kind.includes('drone')) {
    px.fillRect(8, 14 + bob, 32, 22, rim);
    px.fillRect(12, 18 + bob, 24, 14, body);
    px.fillRect(10 + stride, 12 + bob, 28, 2, Theme.biolum);
    px.fillDisc(24, 24 + bob, 4, Theme.inkBright);
  } else {
    px.fillRect(13 + stride, 7 + bob, 22, 34, rim);
    px.fillRect(17 + stride, 10 + bob, 14, 27, body);
    px.fillRect(10 + stride, 18 + bob, 8, 16, body);
    px.fillRect(30 + stride, 18 + bob, 8, 16, body);
    px.fillRect(16 + stride, 36 + bob, 7, 5, Theme.groundDeep);
    px.fillRect(26 + stride, 36 + bob, 7, 5, Theme.groundDeep);
  }
  px.fillRect(18 + stride, 15 + bob, 5, 3, Theme.inkBright);
  px.fillRect(27 + stride, 15 + bob, 4, 3, Theme.inkBright);
  px.fillRect(21 + stride, 25 + bob, 8, 5, ally ? Theme.safe : Theme.biolum);
  if (kind === 'archive_holo') {
    px.fillRect(10, 12 + bob, 28, 1, Theme.biolum);
    px.fillRect(12, 28 + bob, 24, 1, Theme.biolum);
  }
  px.outline(Theme.groundDeep);
  px.snap(actorPalette());
  return px;
}

export function paintCrownOverlay(): Px {
  const px = new Px();
  paintCrown(px);
  px.outline(Theme.groundDeep);
  px.snap(actorPalette());
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
