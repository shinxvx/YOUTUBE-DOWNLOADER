// Narrow bridge between the game and the desktop shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vodNative', {
  storage: {
    getItem: key => ipcRenderer.sendSync('storage:get', key),
    setItem: (key, value) => ipcRenderer.sendSync('storage:set', key, String(value)),
    removeItem: key => ipcRenderer.sendSync('storage:remove', key),
    keys: () => ipcRenderer.sendSync('storage:keys'),
  },
  isFullscreen: () => ipcRenderer.sendSync('window:isFullscreen'),
  setFullscreen: on => ipcRenderer.sendSync('window:setFullscreen', on),
  quit: () => ipcRenderer.send('app:quit'),
  info: () => ipcRenderer.sendSync('app:info'),
  openSavesFolder: () => ipcRenderer.send('app:openSaves'),
});
