import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { EndScene } from './scenes/EndScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  backgroundColor: '#12140e',
  pixelArt: true,
  scene: [BootScene, TitleScene, GameScene, EndScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
    roundPixels: true,
  },
};

new Phaser.Game(config);
