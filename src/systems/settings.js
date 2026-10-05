import { SETTINGS_KEY } from '../config.js';

export const TEXT_SPEEDS = { slow: 22, normal: 45, fast: 90, instant: 0 };

const DEFAULTS = {
  textSpeed: 'normal',
  battleSpeed: 1,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  reducedShake: false,
  reducedFlashing: false,
  difficulty: 'standard', // 'story' | 'standard'
  skipSeenAnimations: false,
  keys: {
    up: ['UP', 'W'],
    down: ['DOWN', 'S'],
    left: ['LEFT', 'A'],
    right: ['RIGHT', 'D'],
    confirm: ['Z', 'ENTER', 'SPACE'],
    cancel: ['X', 'BACKSPACE'],
    menu: ['ESC', 'M'],
  },
};

function load() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULTS), ...parsed, keys: { ...DEFAULTS.keys, ...(parsed.keys || {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export const settings = load();
const listeners = new Set();

export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
  for (const fn of listeners) fn(settings);
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetKeys() {
  settings.keys = structuredClone(DEFAULTS.keys);
  saveSettings();
}
