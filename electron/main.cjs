// Veil of Dawn — desktop shell (Electron).
// Serves the built game from dist/ through a private app:// protocol, stores saves and
// settings as JSON files in the user's data folder, and owns window/fullscreen state.
const { app, BrowserWindow, protocol, net, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

app.setName('Veil of Dawn');
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

const DIST = path.join(__dirname, '..', 'dist');
// The game is fully offline: only its own files, plus data/blob URLs Phaser creates.
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src 'self' blob:";
let win = null;

// ------------------------------------------------------------------ storage
const dataDir = () => path.join(app.getPath('userData'), 'saves');
const safeName = key => key.replace(/[^a-zA-Z0-9._-]/g, '_');
function fileFor(key) { return path.join(dataDir(), `${safeName(key)}.json`); }

ipcMain.on('storage:get', (e, key) => {
  try { e.returnValue = fs.readFileSync(fileFor(key), 'utf8'); } catch { e.returnValue = null; }
});
ipcMain.on('storage:set', (e, key, value) => {
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    const f = fileFor(key);
    fs.writeFileSync(`${f}.tmp`, value, 'utf8');
    fs.renameSync(`${f}.tmp`, f); // atomic replace: a crash never leaves half a save
    e.returnValue = true;
  } catch { e.returnValue = false; }
});
ipcMain.on('storage:remove', (e, key) => {
  try { fs.unlinkSync(fileFor(key)); } catch { /* already gone */ }
  e.returnValue = true;
});
ipcMain.on('storage:keys', (e) => {
  try { e.returnValue = fs.readdirSync(dataDir()).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)); } catch { e.returnValue = []; }
});

// ------------------------------------------------------------------ window
const windowStateFile = () => path.join(app.getPath('userData'), 'window.json');
function readWindowState() {
  try { return JSON.parse(fs.readFileSync(windowStateFile(), 'utf8')); } catch { return { fullscreen: false }; }
}
function writeWindowState(s) {
  try { fs.writeFileSync(windowStateFile(), JSON.stringify(s)); } catch { /* ignore */ }
}

ipcMain.on('window:isFullscreen', e => { e.returnValue = !!win?.isFullScreen(); });
ipcMain.on('window:setFullscreen', (e, on) => {
  win?.setFullScreen(!!on);
  writeWindowState({ ...readWindowState(), fullscreen: !!on });
  e.returnValue = true;
});
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('app:info', e => { e.returnValue = { version: app.getVersion(), platform: process.platform, savesDir: dataDir() }; });
ipcMain.on('app:openSaves', () => { fs.mkdirSync(dataDir(), { recursive: true }); shell.openPath(dataDir()); });

function createWindow() {
  const st = readWindowState();
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    useContentSize: true,
    backgroundColor: '#07070d',
    title: 'Veil of Dawn',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    fullscreen: !!st.fullscreen,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const toggle = input.key === 'F11' || (input.key === 'Enter' && input.alt);
    if (toggle) {
      const on = !win.isFullScreen();
      win.setFullScreen(on);
      writeWindowState({ ...readWindowState(), fullscreen: on });
      event.preventDefault();
    }
    if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  // The game never navigates away or opens windows.
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const q = process.env.VOD_QUERY || '';
  win.loadURL(`app://game/index.html${q}`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    protocol.handle('app', (req) => {
      const { pathname } = new URL(req.url);
      const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
      const file = path.normalize(path.join(DIST, rel));
      if (!file.startsWith(DIST)) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(file).toString()).then(res => {
        const headers = new Headers(res.headers);
        headers.set('Content-Security-Policy', CSP);
        return new Response(res.body, { status: res.status, headers });
      });
    });
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
