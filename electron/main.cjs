// Electron main process: window, fullscreen toggle, focus events and the
// file-based save system (user data folder, atomic writes, backups).
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Squirrel (Windows installer) runs the app with these flags on install,
// update and uninstall: create/remove shortcuts and exit right away.
function handleSquirrelEvent() {
  if (process.platform !== 'win32') return false;
  const cmd = process.argv[1];
  if (!cmd || !cmd.startsWith('--squirrel-')) return false;
  const { spawn } = require('child_process');
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  const exeName = path.basename(process.execPath);
  const run = (args) => {
    try {
      spawn(updateExe, args, { detached: true });
    } catch {
      // nothing else to do from here
    }
  };
  if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') run(['--createShortcut', exeName]);
  else if (cmd === '--squirrel-uninstall') run(['--removeShortcut', exeName]);
  setTimeout(() => app.quit(), 1000);
  return true;
}
const squirrelStartup = handleSquirrelEvent();

const BASE_W = 480;
const BASE_H = 320;
let win = null;

function saveDir() {
  const dir = path.join(app.getPath('userData'), 'saves');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const SLOT_RE = /^[a-z0-9_-]{1,32}$/;
function slotPath(slot) {
  if (!SLOT_RE.test(slot)) throw new Error('bad slot name');
  return path.join(saveDir(), `${slot}.json`);
}

// Write to a temp file, keep the previous good save as .bak, then rename.
function atomicWrite(file, text) {
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (fs.existsSync(file)) {
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'));
      fs.copyFileSync(file, `${file}.bak`);
    } catch {
      // current file is corrupt: keep the older .bak as the backup
    }
  }
  fs.renameSync(tmp, file);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

ipcMain.handle('save:write', (_e, slot, data) => {
  atomicWrite(slotPath(slot), JSON.stringify(data));
  return true;
});

ipcMain.handle('save:read', (_e, slot) => {
  const file = slotPath(slot);
  const main = readJson(file);
  if (main) return { data: main, fromBackup: false };
  const bak = readJson(`${file}.bak`);
  if (bak) return { data: bak, fromBackup: true };
  return null;
});

ipcMain.handle('save:list', () => {
  const out = {};
  for (const f of fs.readdirSync(saveDir())) {
    const m = /^([a-z0-9_-]+)\.json$/.exec(f);
    if (!m) continue;
    const d = readJson(path.join(saveDir(), f)) || readJson(path.join(saveDir(), `${f}.bak`));
    if (d) out[m[1]] = d.meta || {};
  }
  return out;
});

ipcMain.handle('save:delete', (_e, slot) => {
  const file = slotPath(slot);
  for (const f of [file, `${file}.bak`]) if (fs.existsSync(f)) fs.unlinkSync(f);
  return true;
});

ipcMain.handle('settings:read', () => readJson(path.join(app.getPath('userData'), 'settings.json')));
ipcMain.handle('settings:write', (_e, data) => {
  atomicWrite(path.join(app.getPath('userData'), 'settings.json'), JSON.stringify(data));
  return true;
});

ipcMain.handle('win:fullscreen', (_e, on) => {
  if (win) win.setFullScreen(typeof on === 'boolean' ? on : !win.isFullScreen());
  return win ? win.isFullScreen() : false;
});

ipcMain.handle('win:size', (_e, scale) => {
  if (!win || win.isFullScreen()) return;
  const s = Math.max(1, Math.min(6, Number(scale) || 3));
  win.setContentSize(BASE_W * s, BASE_H * s);
  win.center();
});

ipcMain.handle('app:quit', () => app.quit());

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: BASE_W * 3,
    height: BASE_H * 3,
    useContentSize: true,
    minWidth: BASE_W,
    minHeight: BASE_H,
    backgroundColor: '#10131c',
    title: 'Eidra: Nexus Academy',
    icon: path.join(__dirname, '..', 'dist', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAspectRatio(BASE_W / BASE_H);
  win.on('blur', () => win.webContents.send('win:focus', false));
  win.on('focus', () => win.webContents.send('win:focus', true));
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.alt && input.key === 'Enter') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

if (!squirrelStartup) app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
