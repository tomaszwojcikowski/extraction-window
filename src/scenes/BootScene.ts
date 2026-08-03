import Phaser from 'phaser';
import { registerTextures } from './textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    registerTextures(this);
    this.scene.start('Title');
  }
}
