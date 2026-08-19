import Phaser from 'phaser';
import type { SectorId } from './data/encounters';
import { ENEMIES, type EnemyKind } from './data/enemies';
import {
  enemyTextureKey,
  registerTextures,
  TILE_DRAW,
  wallStyleForSector,
  wallTextureKey,
} from './scenes/textures';
import { drawMeter, drawStencilBadge } from './scenes/atmosphere';
import { Theme, ThemeCss, crackTextureKey, floorTextureKey } from './scenes/theme';
import { drawThreatZones } from './game/views/ThreatView';
import { paintPhaserBeamFrame } from './game/presenters/ActionFeedback';
import { drawPhaserLanes } from './game/presenters/PhaserLanes';
import { createGame } from './sim/state';
import { moveEnemies } from './sim/ai';
import type { GameState } from './sim/types';

/**
 * Review harness for the art gates. It bakes the real textures — never a
 * hand-drawn approximation — so a silhouette collision, a biome that only
 * differs by tint, or an unpainted telegraph shows up here instead of in a run.
 */

const BLOCK = 9;
const TELEGRAPH_KINDS: EnemyKind[] = ['serpent', 'wraith', 'rift', 'sentinel', 'drone'];

const SECTORS: SectorId[] = [
  'plains',
  'ridge',
  'canopy',
  'flood',
  'brine',
  'reef',
  'ash',
  'fissure',
  'approach',
  'trench',
  'ruin',
  'duct',
  'spire',
  'vault',
  'beacon',
];

/** Terrain that changes the rules, plus the three wall families. */
const STRUCTURE: Array<[label: string, key: string]> = [
  ['hazard', 't_hazard'],
  ['vent', 't_vent'],
  ['brine_pool', 't_brine_pool'],
  ['scrub', 't_scrub'],
  ['scrub_nest', 't_scrub_nest'],
  ['rubble', 't_rubble'],
  ['sealed', 't_sealed'],
  ['tripwire', 't_tripwire'],
  ['exit', 't_exit'],
  ['shuttle', 't_shuttle'],
  ['beacon prop', 't_beacon'],
  ['landmark', 't_landmark'],
];

function openRoom(seed: number): GameState {
  const st = createGame(seed) as GameState;
  for (let y = 0; y < st.height; y++) {
    for (let x = 0; x < st.width; x++) {
      st.tiles[y]![x] = { kind: 'floor', walkable: true, transparent: true };
      st.visible[y]![x] = true;
      st.explored[y]![x] = true;
    }
  }
  return st;
}

class SheetScene extends Phaser.Scene {
  create(): void {
    registerTextures(this);
    this.buildSpriteGrid();
    this.buildTerrainGrid('terrain');
    this.buildTerrainGrid('terrainFlat');
    this.buildCrackGrid();
    this.buildStructureGrid();
    this.buildChromeGrid();
    this.buildPhaserArtifacts();
    this.buildTelegraphBoards();
  }

  private buildChromeGrid(): void {
    const host = document.getElementById('chrome');
    if (!host) return;

    const samples: Array<{ label: string; draw: (g: Phaser.GameObjects.Graphics) => void }> = [
      {
        label: 'HP full',
        draw: (g) => drawMeter(g, 10, 28, 120, 12, 1, Theme.safe, Theme.rust),
      },
      {
        label: 'HP critical',
        draw: (g) => drawMeter(g, 10, 28, 120, 12, 0.22, Theme.safe, Theme.rust),
      },
      {
        label: 'Power mid',
        draw: (g) => drawMeter(g, 10, 28, 120, 12, 0.55, Theme.tape, Theme.arc),
      },
      {
        label: 'Power low',
        draw: (g) => drawMeter(g, 10, 28, 120, 12, 0.28, Theme.arc, Theme.rust),
      },
      {
        label: 'badge QUIET',
        draw: (g) => drawStencilBadge(g, 18, 22, 92, 18, Theme.inkMute),
      },
      {
        label: 'badge LIT',
        draw: (g) => drawStencilBadge(g, 18, 22, 92, 18, Theme.tape),
      },
    ];

    samples.forEach((sample, i) => {
      const key = `chrome_${i}`;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(Theme.panel, 1);
      g.fillRect(0, 0, 140, 64);
      sample.draw(g);
      g.generateTexture(key, 140, 64);
      g.destroy();

      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.width = '156px';
      const canvas = document.createElement('canvas');
      canvas.width = 140;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.textures.get(key).getSourceImage() as CanvasImageSource, 0, 0);
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = sample.label;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = 'field kit';
      meta.style.color = ThemeCss.inkDim;
      cell.append(canvas, name, meta);
      host.appendChild(cell);
    });
  }

  /** One baked texture, blown up to the size it is actually played at. */
  private tile(key: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 46;
    canvas.height = 46;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const src = this.textures.get(key).getSourceImage();
    ctx.drawImage(src as CanvasImageSource, 0, 0, 46, 46);
    return canvas;
  }

  private cell(parent: string, tiles: string[], name: string, meta: string, tone?: number): void {
    const cell = document.createElement('div');
    cell.className = 'cell';
    for (const key of tiles) cell.appendChild(this.tile(key));

    const label = document.createElement('div');
    label.className = 'name';
    label.textContent = name;
    const sub = document.createElement('div');
    sub.className = 'meta';
    sub.textContent = meta;
    if (tone !== undefined) sub.style.color = `#${tone.toString(16).padStart(6, '0')}`;
    cell.append(label, sub);
    document.getElementById(parent)!.appendChild(cell);
  }

  private buildSpriteGrid(): void {
    for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
      const def = ENEMIES[kind];
      this.cell(
        'sheet',
        [0, 1, 2].map((frame) => enemyTextureKey(kind, frame)),
        kind,
        `${def.behavior}${def.hunt ? `/${def.hunt}` : ''}`,
        def.color,
      );
    }
  }

  private buildTerrainGrid(parent: string): void {
    for (const sector of SECTORS) {
      this.cell(
        parent,
        [0, 1, 2].map((variant) => floorTextureKey(sector, variant)),
        sector,
        wallStyleForSector(sector),
      );
    }
  }

  /** Floor + Arcing / Breaching crack overlays — motif must survive the fracture. */
  private buildCrackGrid(): void {
    const host = document.getElementById('cracks');
    if (!host) return;
    for (const sector of SECTORS) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      for (const urgent of [false, true]) {
        const canvas = document.createElement('canvas');
        canvas.width = 46;
        canvas.height = 46;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        const floor = this.textures.get(floorTextureKey(sector, 0)).getSourceImage();
        const crack = this.textures
          .get(crackTextureKey(sector, 0, urgent))
          .getSourceImage();
        ctx.drawImage(floor as CanvasImageSource, 0, 0, 46, 46);
        ctx.drawImage(crack as CanvasImageSource, 0, 0, 46, 46);
        cell.appendChild(canvas);
      }
      const label = document.createElement('div');
      label.className = 'name';
      label.textContent = sector;
      const sub = document.createElement('div');
      sub.className = 'meta';
      sub.textContent = 'Arcing / Breaching';
      sub.style.color = ThemeCss.arc;
      cell.append(label, sub);
      host.appendChild(cell);
    }
  }

  private buildStructureGrid(): void {
    for (const style of ['cliff', 'bulkhead', 'conduit'] as const) {
      this.cell('props', [`t_sconce_${style}`], `sconce / ${style}`, 'structure');
    }
    for (const sector of SECTORS) {
      this.cell(
        'props',
        [0, 1, 2, 3].flatMap((role) =>
          [0, 1, 2].map((wear) => wallTextureKey(sector, role, wear)),
        ),
        `wall / ${sector}`,
        wallStyleForSector(sector),
      );
    }
    for (const [label, key] of STRUCTURE) {
      const frames = this.textures.exists(`${key}_1`) ? [key, `${key}_1`, `${key}_2`] : [key];
      this.cell('props', frames, label, 'rule-changing');
    }
  }

  private drawMiniGrid(g: Phaser.GameObjects.Graphics, tiles: number): void {
    const size = tiles * TILE_DRAW;
    g.fillStyle(Theme.groundDeep, 1);
    g.fillRect(0, 0, size, size);
    g.lineStyle(1, Theme.panelEdge, 1);
    for (let i = 0; i <= tiles; i++) {
      g.lineBetween(i * TILE_DRAW, 0, i * TILE_DRAW, size);
      g.lineBetween(0, i * TILE_DRAW, size, i * TILE_DRAW);
    }
  }

  /** Survey phaser lane overlay + beam frames — real presenter geometry. */
  private buildPhaserArtifacts(): void {
    const host = document.getElementById('phaser');
    if (!host) return;

    const tiles = 7;
    const w = tiles * TILE_DRAW;
    const h = tiles * TILE_DRAW;
    const worldXY = (gx: number, gy: number) => ({
      x: gx * TILE_DRAW + TILE_DRAW / 2,
      y: gy * TILE_DRAW + TILE_DRAW / 2,
    });

    const samples: Array<{
      label: string;
      meta: string;
      dist: number;
      energy: number;
      beam?: boolean;
      animFrame?: number;
    }> = [
      { label: 'live · 2 tiles', meta: 'reticle · beam guide', dist: 2, energy: 40 },
      { label: 'live · 3 tiles', meta: 'far band · step dot', dist: 3, energy: 40, animFrame: 2 },
      { label: 'melee band', meta: 'adjacent · rust X', dist: 1, energy: 40 },
      { label: 'low power', meta: 'dim lanes · need 4 Power', dist: 2, energy: 2 },
      { label: 'beam fire', meta: 'tile flash · impact ring', dist: 2, energy: 40, beam: true },
    ];

    samples.forEach((sample, i) => {
      const st = openRoom(200 + i);
      const px = 2;
      const py = 3;
      st.player.x = px;
      st.player.y = py;
      st.player.equip.tool = 'phaser';
      st.player.energy = sample.energy;
      st.enemies = [
        {
          ...st.enemies[0]!,
          id: 1,
          kind: 'mite',
          x: px + sample.dist,
          y: py,
          alive: true,
          hp: 10,
          maxHp: 10,
        },
      ];

      const key = `phaser_${i}`;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      this.drawMiniGrid(g, tiles);

      const player = worldXY(px, py);
      const foe = worldXY(st.enemies[0]!.x, st.enemies[0]!.y);
      g.fillStyle(Theme.inkBright, 0.92);
      g.fillCircle(player.x, player.y, 6);
      g.fillStyle(ENEMIES.mite.color, 1);
      g.fillCircle(foe.x, foe.y, 7);

      drawPhaserLanes(g, st, sample.animFrame ?? 0, TILE_DRAW);

      if (sample.beam) {
        paintPhaserBeamFrame(
          g,
          worldXY,
          { x: px, y: py },
          { x: st.enemies[0]!.x, y: st.enemies[0]!.y },
          1,
        );
      }

      g.generateTexture(key, w, h);
      g.destroy();

      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.width = `${w + 12}px`;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.textures.get(key).getSourceImage() as CanvasImageSource, 0, 0);
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = sample.label;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = sample.meta;
      meta.style.color = ThemeCss.scanWash;
      cell.append(canvas, name, meta);
      host.appendChild(cell);
    });
  }

  private buildTelegraphBoards(): void {
    TELEGRAPH_KINDS.forEach((kind, index) => {
      const ox = (index % 3) * BLOCK * TILE_DRAW;
      const oy = Math.floor(index / 3) * BLOCK * TILE_DRAW;

      const st = openRoom(7);
      st.player.x = 3;
      st.player.y = 4;
      const enemy = {
        ...st.enemies[0]!,
        kind,
        x: 6,
        y: 4,
        alive: true,
        hp: 20,
        windup: 0,
        beamCooldown: 0,
      };
      st.enemies = [enemy];
      for (let i = 0; i < 4 && enemy.windup <= 0; i++) moveEnemies(st);

      const board = this.add.graphics().setPosition(ox, oy);
      board.fillStyle(0x182124, 1);
      board.fillRect(0, 0, BLOCK * TILE_DRAW - 4, BLOCK * TILE_DRAW - 4);
      board.lineStyle(1, 0x2a3438, 1);
      for (let i = 0; i <= BLOCK; i++) {
        board.strokeLineShape(
          new Phaser.Geom.Line(i * TILE_DRAW, 0, i * TILE_DRAW, BLOCK * TILE_DRAW),
        );
        board.strokeLineShape(
          new Phaser.Geom.Line(0, i * TILE_DRAW, BLOCK * TILE_DRAW, i * TILE_DRAW),
        );
      }

      drawThreatZones(this.add.graphics().setPosition(ox, oy), st, 0);

      const dot = this.add.graphics().setPosition(ox, oy);
      dot.fillStyle(0xffffff, 1);
      dot.fillCircle(st.player.x * TILE_DRAW + TILE_DRAW / 2, st.player.y * TILE_DRAW + TILE_DRAW / 2, 8);
      dot.fillStyle(ENEMIES[kind].color, 1);
      dot.fillCircle(enemy.x * TILE_DRAW + TILE_DRAW / 2, enemy.y * TILE_DRAW + TILE_DRAW / 2, 10);

      this.add.text(ox + 8, oy + BLOCK * TILE_DRAW - 26, `${kind} -> ${enemy.intent}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#dfe4d5',
      });
    });
  }
}

new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'game',
  width: 3 * BLOCK * TILE_DRAW,
  height: 2 * BLOCK * TILE_DRAW,
  backgroundColor: '#0c1214',
  pixelArt: true,
  scene: [SheetScene],
});
