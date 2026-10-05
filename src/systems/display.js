import { GAME_W, GAME_H, WORLD_ZOOM } from '../config.js';
import { settings } from './settings.js';
import { desktop } from './storage.js';

// Render resolution. The canvas really renders at the chosen size (crisp text and sprites at
// 1080p/1440p); every scene lays out in 1280x720 units and its camera zooms by the UI scale.
export const RESOLUTIONS = ['auto', '1280x720', '1600x900', '1920x1080', '2560x1440', '3840x2160'];
export const RESOLUTION_LABEL = r => (r === 'auto' ? 'Match screen' : r.replace('x', ' × '));

export function targetSize() {
  const r = settings.resolution || 'auto';
  if (r !== 'auto') {
    const [w, h] = r.split('x').map(Number);
    return { w, h };
  }
  // Match the display: the largest 16:9 size that fits the window (or the screen).
  const sw = Math.max(window.innerWidth, 640) * (window.devicePixelRatio || 1);
  const sh = Math.max(window.innerHeight, 360) * (window.devicePixelRatio || 1);
  const s = Math.min(sw / GAME_W, sh / GAME_H);
  return { w: Math.round(GAME_W * s / 2) * 2, h: Math.round(GAME_H * s / 2) * 2 };
}

export const uiScale = game => game.scale.width / GAME_W;

// Current UI scale, used to render text at the real output resolution.
let GAME = null;
export let currentScale = 1;
export const bindGame = game => { GAME = game; currentScale = game.scale.width / GAME_W; };
export const textResolution = () => Math.max(1.25, (GAME ? GAME.scale.width / GAME_W : currentScale) * 1.25);

// Call in every scene's create(). mode 'ui': layout space 1280x720 anchored top-left.
// mode 'world': keeps follow/centre behaviour and multiplies the world zoom.
export function fitCamera(scene, mode = 'ui', baseZoom = WORLD_ZOOM) {
  const apply = () => {
    const s = uiScale(scene.game);
    const cam = scene.cameras.main;
    if (mode === 'ui') {
      cam.setOrigin(0, 0);
      cam.setZoom(s);
      cam.setScroll(0, 0);
    } else {
      cam.setZoom(baseZoom * s);
    }
    scene.uiScale = s;
    currentScale = s;
  };
  apply();
  scene.game.events.on('display-changed', apply);
  scene.events.once('shutdown', () => scene.game.events.off('display-changed', apply));
  scene.events.once('destroy', () => scene.game.events.off('display-changed', apply));
}

export function applyResolution(game) {
  const { w, h } = targetSize();
  if (game.scale.width !== w || game.scale.height !== h) game.scale.resize(w, h);
  currentScale = w / GAME_W;
  if (desktop && settings.resolution !== 'auto' && !desktop.isFullscreen()) {
    const dpr = window.devicePixelRatio || 1;
    desktop.setWindowSize(Math.round(w / dpr), Math.round(h / dpr));
  }
  game.events.emit('display-changed');
}

// Re-evaluate "Match screen" when the window changes size (e.g. entering fullscreen).
export function watchWindow(game) {
  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { if ((settings.resolution || 'auto') === 'auto') applyResolution(game); }, 150);
  });
}
