// Persistent key/value storage. In the desktop app saves are JSON files in the user's
// data folder (via the Electron preload); during development it falls back to localStorage.
const native = typeof window !== 'undefined' ? window.vhNative : null;

export const isDesktop = !!native;

export const storage = native ? native.storage : {
  getItem: k => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  removeItem: k => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  keys: () => { try { return Object.keys(localStorage); } catch { return []; } },
};

export const desktop = native;
