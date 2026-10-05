import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { UIScene } from './scenes/UIScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { GalleryScene } from './scenes/GalleryScene.js';
import { audio } from './audio/audio.js';
import { state } from './systems/state.js';
import { targetSize, watchWindow, bindGame } from './systems/display.js';

const initial = targetSize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: initial.w,
  height: initial.h,
  backgroundColor: '#07070d',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: false },
  fps: { smoothStep: false },
  scene: [BootScene, TitleScene, WorldScene, UIScene, MenuScene, BattleScene, GalleryScene],
});

bindGame(game);
watchWindow(game);

// Browsers only allow audio after a user gesture.
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// Read-only hooks used by tools/playthrough.mjs and for debugging in the console.
window.__VH = Object.assign(window.__VH || {}, { game, stateNow: () => state });
window.__VH_flags = () => state.flags;
