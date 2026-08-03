import Phaser from 'phaser';

const TILE = 16;

/** Generate minimal 16×16 textures at runtime. */
export function registerTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const mk = (key: string, color: number, border = 0x111111) => {
    g.clear();
    g.fillStyle(border, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(color, 1);
    g.fillRect(1, 1, TILE - 2, TILE - 2);
    g.generateTexture(key, TILE, TILE);
  };

  mk('t_wall', 0x2a2e38);
  mk('t_floor', 0x1a2030);
  mk('t_hazard', 0x3a2a50);
  mk('t_exit', 0x2a4a3a);
  mk('t_beacon', 0x3a4a6a);
  mk('t_shuttle', 0x4a6a3a);
  mk('t_fog', 0x0a0c10);
  mk('t_player', 0x5ec8ff);
  mk('t_enemy', 0xe05050);
  mk('t_item', 0xe0c040);
  mk('t_quest', 0xff80ff);

  g.destroy();
}

export { TILE };
