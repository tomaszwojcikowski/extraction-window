import Phaser from 'phaser';
import { ENEMIES, type EnemyKind } from './data/enemies';
import { enemyTextureKey, registerTextures, TILE_DRAW } from './scenes/textures';
import { drawThreatZones } from './game/views/ThreatView';
import { createGame } from './sim/state';
import { moveEnemies } from './sim/ai';
import type { GameState } from './sim/types';

/**
 * Throwaway review harness. Bakes the real textures so every enemy can be
 * compared side by side, and renders the real threat overlay against synthetic
 * armed encounters so the telegraph geometry can be eyeballed.
 */

const BLOCK = 9;
const TELEGRAPH_KINDS: EnemyKind[] = ['serpent', 'wraith', 'rift', 'sentinel', 'drone'];

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
    this.buildTelegraphBoards();
  }

  private buildSpriteGrid(): void {
    const sheet = document.getElementById('sheet')!;

    for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
      const def = ENEMIES[kind];
      const cell = document.createElement('div');
      cell.className = 'cell';

      for (let frame = 0; frame < 3; frame++) {
        const src = this.textures.get(enemyTextureKey(kind, frame)).getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = 46;
        canvas.height = 46;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(src as CanvasImageSource, 0, 0, 46, 46);
        cell.appendChild(canvas);
      }

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = kind;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${def.behavior}${def.hunt ? `/${def.hunt}` : ''}`;
      meta.style.color = `#${def.color.toString(16).padStart(6, '0')}`;
      cell.append(name, meta);
      sheet.appendChild(cell);
    }
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
      dot.fillCircle(st.player.x * TILE_DRAW + 23, st.player.y * TILE_DRAW + 23, 8);
      dot.fillStyle(ENEMIES[kind].color, 1);
      dot.fillCircle(enemy.x * TILE_DRAW + 23, enemy.y * TILE_DRAW + 23, 10);

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
