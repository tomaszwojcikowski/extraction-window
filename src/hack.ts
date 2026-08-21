import Phaser from 'phaser';
import { ThemeCss } from './scenes/theme';
import { loadFieldArt, promoteFieldArt } from './scenes/atlasLoad';
import { GameScene } from './scenes/GameScene';
import { EndScene } from './scenes/EndScene';

/**
 * Direct entry for the lattice-lock minigame.
 * Skips title and drill bay, plants a locked terminal on the surveyor, and
 * opens the splice modal. `r` rolls a new lock. `?seed=` pins the map.
 */
class HackBoot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    loadFieldArt(this);
  }

  create(): void {
    promoteFieldArt(this);
    const params = new URLSearchParams(window.location.search);
    const raw = Number(params.get('seed'));
    const seed = Number.isFinite(raw) && raw > 0 ? raw : (Date.now() % 100000);
    this.scene.start('Game', { seed, skipTutorial: true, openHack: true });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  backgroundColor: ThemeCss.groundDeep,
  pixelArt: true,
  scene: [HackBoot, GameScene, EndScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
    roundPixels: true,
  },
});
