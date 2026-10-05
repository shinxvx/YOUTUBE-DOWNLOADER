// Narrow bridge between the game (renderer) and the main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eidraHost', {
  desktop: true,
  saveWrite: (slot, data) => ipcRenderer.invoke('save:write', slot, data),
  saveRead: (slot) => ipcRenderer.invoke('save:read', slot),
  saveList: () => ipcRenderer.invoke('save:list'),
  saveDelete: (slot) => ipcRenderer.invoke('save:delete', slot),
  settingsRead: () => ipcRenderer.invoke('settings:read'),
  settingsWrite: (data) => ipcRenderer.invoke('settings:write', data),
  setFullscreen: (on) => ipcRenderer.invoke('win:fullscreen', on),
  setWindowScale: (s) => ipcRenderer.invoke('win:size', s),
  quit: () => ipcRenderer.invoke('app:quit'),
  onFocus: (cb) => ipcRenderer.on('win:focus', (_e, v) => cb(v)),
});
