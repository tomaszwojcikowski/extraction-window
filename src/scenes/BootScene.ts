import Phaser from 'phaser';
import { loadFieldArt, promoteFieldArt } from './atlasLoad';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    loadFieldArt(this);
  }

  create(): void {
    promoteFieldArt(this);
    this.scene.start('Title');
  }
}
