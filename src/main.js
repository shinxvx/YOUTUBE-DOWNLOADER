import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import { App } from './app.js';

const canvas = document.getElementById('game');
const app = new App(canvas);
window.__eidra = app; // handy for automated playtests
app.start();
