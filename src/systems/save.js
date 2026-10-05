import { SAVE_PREFIX, SAVE_VERSION } from '../config.js';
import { state, snapshot, loadState, formatPlaytime } from './state.js';

// Three manual slots plus two rotating autosaves.
export const MANUAL_SLOTS = ['slot1', 'slot2', 'slot3'];
export const AUTO_SLOTS = ['auto1', 'auto2'];

function read(slot) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.state?.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

function write(slot, label) {
  const data = {
    savedAt: Date.now(),
    label,
    summary: {
      chapter: state.chapter,
      location: state.location,
      objective: state.objective,
      level: state.party[0]?.level ?? 1,
      playtime: state.playtime,
    },
    state: snapshot(),
  };
  try {
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function saveTo(slot) {
  return write(slot, 'Manual');
}

export function autosave(label = 'Autosave') {
  // Rotate: write into whichever autosave slot is older.
  const a = read('auto1'), b = read('auto2');
  const slot = !a ? 'auto1' : !b ? 'auto2' : (a.savedAt <= b.savedAt ? 'auto1' : 'auto2');
  return write(slot, label);
}

export function loadFrom(slot) {
  const data = read(slot);
  if (!data) return false;
  loadState(data.state);
  return true;
}

export function listSaves() {
  return [...MANUAL_SLOTS, ...AUTO_SLOTS].map(slot => ({ slot, data: read(slot) }));
}

export function latestSave() {
  let best = null;
  for (const s of listSaves()) if (s.data && (!best || s.data.savedAt > best.data.savedAt)) best = s;
  return best;
}

export function describeSave(entry) {
  if (!entry.data) return 'Empty';
  const s = entry.data.summary;
  const d = new Date(entry.data.savedAt);
  const when = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `Ch.${s.chapter} · ${s.location} · Lv ${s.level} · ${formatPlaytime(s.playtime)} · ${when}`;
}
