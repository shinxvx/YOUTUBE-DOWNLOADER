// Image loading. Paths are relative so they work from file:// in the app.
import { CARD_LIST } from '../content/cards.js';

const images = {};

function load(key, src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      images[key] = im;
      resolve();
    };
    im.onerror = () => {
      console.warn('missing image', src);
      resolve();
    };
    im.src = src;
  });
}

export const LOCATION_BG = ['dorm', 'plaza', 'classroom', 'arena', 'shop', 'lab', 'garden', 'library', 'port', 'lighthouse', 'reserve', 'core', 'title'];
export const PORTRAITS = ['mira', 'ren', 'soren', 'elara', 'vael', 'iris', 'lucan', 'juno', 'marlo', 'pip', 'nell', 'quill', 'hollis'];
export const EXPRESSIONS = ['neutral', 'happy', 'angry', 'surprised', 'sad'];

export async function loadAll(onProgress) {
  const jobs = [];
  for (const c of CARD_LIST) if (c.type === 'creature') jobs.push(['cr:' + c.id, `assets/creatures/${c.id}.png`]);
  jobs.push(['cr:hollow', 'assets/creatures/hollow.png']);
  for (const l of LOCATION_BG) jobs.push(['bg:' + l, `assets/locations/${l}.png`]);
  for (const p of PORTRAITS) for (const e of EXPRESSIONS) jobs.push([`pt:${p}:${e}`, `assets/portraits/${p}_${e}.png`]);
  jobs.push(['map', 'assets/map/island.png'], ['map:silenced', 'assets/map/island_silenced.png'], ['icon', 'assets/icon.png']);
  let done = 0;
  await Promise.all(jobs.map(([k, src]) => load(k, src).then(() => onProgress && onProgress(++done / jobs.length))));
}

export function image(key) {
  return images[key];
}

export const creatureImg = (id) => images['cr:' + id];
export const portraitImg = (who, expr = 'neutral') => images[`pt:${who}:${expr}`] || images[`pt:${who}:neutral`];
