// Launches the real Electron app (xvfb on Linux) and checks the desktop
// integration: window, preload bridge, file saves with atomic write + .bak.
//   npm run build && xvfb-run -a node tools/electron-check.mjs
import { _electron as electron } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'eidra-ud-'));
// EIDRA_EXE=path/to/packaged/binary checks a packaged build instead
const packaged = process.env.EIDRA_EXE;
const app = await electron.launch({
  executablePath: packaged || path.join(root, 'node_modules', 'electron', 'dist', 'electron'),
  args: [...(packaged ? [] : [root]), `--user-data-dir=${userData}`, '--no-sandbox'],
});
const win = await app.firstWindow();
const errors = [];
win.on('pageerror', (e) => errors.push(String(e)));
await win.waitForFunction(() => window.__eidra && window.__eidra.top, null, { timeout: 30000 });
const info = await win.evaluate(async () => {
  const h = window.eidraHost;
  const g = { version: 1, name: 'Probe', day: 3, period: 1, chapter: 1, license: 'initiate', partner: 'mossbit', playtime: 61 };
  await h.saveWrite('slot2', { meta: { name: 'Probe', day: 3, savedAt: Date.now() }, game: g });
  await h.saveWrite('slot2', { meta: { name: 'Probe', day: 4, savedAt: Date.now() }, game: { ...g, day: 4 } });
  const back = await h.saveRead('slot2');
  const list = await h.saveList();
  let badSlot = null;
  try {
    await h.saveWrite('../evil', {});
  } catch (e) {
    badSlot = 'rejected';
  }
  return { desktop: h.desktop, day: back.data.game.day, list: Object.keys(list), badSlot };
});
const saveDir = path.join(userData, 'saves');
const files = fs.readdirSync(saveDir).sort();
// corrupt the main file: the game must fall back to the .bak copy
fs.writeFileSync(path.join(saveDir, 'slot2.json'), '{broken');
const recovered = await win.evaluate(() => window.eidraHost.saveRead('slot2'));
await win.screenshot({ path: path.join(process.argv[2] || root, 'electron-title.png') });
const title = await win.title();
const imagesOk = await win.evaluate(() => {
  const im = new Image();
  return new Promise((r) => {
    im.onload = () => r(true);
    im.onerror = () => r(false);
    im.src = 'assets/creatures/cindlet.png';
  });
});
await app.close();
console.log({ title, packaged: !!packaged, imagesOk, ...info, files, recoveredFromBackup: recovered.fromBackup, recoveredDay: recovered.data.game.day, errors });
if (errors.length || !imagesOk || info.day !== 4 || !files.includes('slot2.json.bak') || !recovered.fromBackup || info.badSlot !== 'rejected') process.exitCode = 1;
