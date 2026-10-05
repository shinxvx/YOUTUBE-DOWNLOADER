// Save storage. In the desktop app saves are JSON files in the user data
// folder (atomic write + .bak backup, handled by the Electron main process).
// The browser fallback (development only) uses localStorage.
import { migrate, saveMeta } from '../game/state.js';

const host = typeof window !== 'undefined' ? window.eidraHost : null;
export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
const LS = 'eidra-save-';

export async function writeSave(slot, game) {
  const data = { meta: saveMeta(game), game };
  if (host) return host.saveWrite(slot, data);
  localStorage.setItem(LS + slot, JSON.stringify(data));
  return true;
}

export async function readSave(slot) {
  let res = null;
  if (host) res = await host.saveRead(slot);
  else {
    const t = localStorage.getItem(LS + slot);
    res = t ? { data: JSON.parse(t), fromBackup: false } : null;
  }
  if (!res || !res.data || !res.data.game) return null;
  return { game: migrate(res.data.game), fromBackup: res.fromBackup };
}

export async function listSaves() {
  if (host) return host.saveList();
  const out = {};
  for (const s of SLOTS) {
    const t = localStorage.getItem(LS + s);
    if (t) {
      try {
        out[s] = JSON.parse(t).meta;
      } catch {
        // ignore unreadable entries
      }
    }
  }
  return out;
}

export async function deleteSave(slot) {
  if (host) return host.saveDelete(slot);
  localStorage.removeItem(LS + slot);
  return true;
}

export const DEFAULT_SETTINGS = { master: 0.8, music: 0.6, sfx: 0.8, animSpeed: 1, textSpeed: 1, windowScale: 3, fullscreen: false };

export async function readSettings() {
  let s = null;
  try {
    s = host ? await host.settingsRead() : JSON.parse(localStorage.getItem('eidra-settings') || 'null');
  } catch {
    s = null;
  }
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function writeSettings(s) {
  if (host) return host.settingsWrite(s);
  localStorage.setItem('eidra-settings', JSON.stringify(s));
  return true;
}
