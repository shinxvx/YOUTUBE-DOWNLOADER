// Speed Cam: só fontes + câmera virtual (e o som), sem nada de gravar/transmitir, para não pesar.
'use strict';
const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, shell, session } = require('electron');
const path = require('node:path');

// continuar desenhando e tocando com a janela minimizada ou atrás de outra
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,BackgroundVideoTrackOptimization,MediaSessionService');

if (!app.requestSingleInstanceLock()) app.quit();

let janela = null;
let saindo = false;
const paginas = new Map(); // id da fonte -> BrowserWindow escondida (fonte de link/URL)

function criarJanela() {
  janela = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 760,
    minHeight: 520,
    title: 'Speed Cam',
    backgroundColor: '#0f1115',
    icon: path.join(__dirname, 'build', 'icone.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true, // a janela só carrega o index.html local; precisa do Node para a câmera virtual
      contextIsolation: false,
      sandbox: false,
      backgroundThrottling: false,
      webSecurity: false, // vídeo de outro site (link direto) pode ir para a câmera
    },
  });
  janela.setMenu(null);
  janela.loadFile(path.join(__dirname, 'index.html'));
  janela.on('closed', () => { janela = null; app.quit(); });
}

app.on('second-instance', () => { if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); } });

app.whenReady().then(() => {
  // a própria janela pode usar câmera, microfone e captura sem perguntar
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));
  session.defaultSession.setPermissionCheckHandler(() => true);
  criarJanela();
});
app.on('before-quit', () => { saindo = true; });
app.on('window-all-closed', () => app.quit());

ipcMain.handle('telas', async () => {
  const fontes = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 }, fetchWindowIcons: false });
  return fontes
    .filter((f) => f.name !== 'Speed Cam')
    .map((f) => ({ id: f.id, nome: f.name, tipo: f.id.startsWith('screen:') ? 'screen' : 'window', foto: f.thumbnail.isEmpty() ? '' : f.thumbnail.toDataURL() }));
});

ipcMain.handle('arquivo', async () => {
  const r = await dialog.showOpenDialog(janela, {
    title: 'Escolher vídeo, imagem ou áudio',
    properties: ['openFile'],
    filters: [
      { name: 'Vídeo, imagem ou áudio', extensions: ['mp4', 'webm', 'mkv', 'mov', 'm4v', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ],
  });
  return r.canceled ? null : r.filePaths[0];
});

// Fonte de link: abre a página numa janela escondida (como a Fonte de Navegador do OBS) e devolve
// o id para a tela capturar a imagem e o som dela.
ipcMain.handle('pagina-abrir', async (_e, id, url, w, h) => {
  let win = paginas.get(id);
  if (!win) {
    win = new BrowserWindow({
      show: false,
      useContentSize: true,
      width: w,
      height: h,
      title: 'Speed Cam — página',
      autoHideMenuBar: true,
      webPreferences: { backgroundThrottling: false, partition: 'persist:paginas' },
    });
    win.setMenu(null);
    win.webContents.setWindowOpenHandler(({ url: u }) => { win.loadURL(u); return { action: 'deny' }; });
    win.on('close', (ev) => { if (!saindo && paginas.get(id) === win) { ev.preventDefault(); win.hide(); } });
    paginas.set(id, win);
  }
  win.setContentSize(w, h);
  win.loadURL(url).catch(() => {}); // página com erro continua capturável (mostra a mensagem)
  return win.webContents.getMediaSourceId(janela.webContents);
});
ipcMain.handle('pagina-mostrar', (_e, id) => { const w = paginas.get(id); if (w) { w.show(); w.focus(); } });
ipcMain.handle('pagina-recarregar', (_e, id) => { const w = paginas.get(id); if (w) w.webContents.reload(); });
ipcMain.handle('pagina-fechar', (_e, id) => {
  const w = paginas.get(id);
  paginas.delete(id);
  if (w && !w.isDestroyed()) w.destroy();
});

ipcMain.handle('abrir-link', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });
