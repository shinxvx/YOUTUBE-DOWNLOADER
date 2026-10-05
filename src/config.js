// Global constants shared by every scene.
export const GAME_W = 1280;
export const GAME_H = 720;

// Exploration camera zoom. Characters use a logical 48x48 footprint in world space,
// so on screen they occupy 48 * WORLD_ZOOM pixels.
export const WORLD_ZOOM = 2;
export const LOGICAL_SPRITE = 48;

export const ART = 'assets/vh';

export const FONT_UI = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
export const FONT_TITLE = 'Georgia, "Palatino Linotype", "Times New Roman", serif';

export const COLORS = {
  ink: 0x0b0d18,
  panel: 0x121628,
  panel2: 0x1b2038,
  gold: 0xc9a45c,
  goldLight: 0xf0d79a,
  violet: 0x9b6bff,
  violetLight: 0xd3b8ff,
  ember: 0xffa94d,
  hp: 0xd9534f,
  hpBack: 0x3a1418,
  focus: 0x4fa3d9,
  strain: 0xa560ff,
  resolve: 0xf2c14e,
  text: '#efe6d2',
  textDim: '#a79f8c',
  textGold: '#f0d79a',
  textViolet: '#d3b8ff',
  textRed: '#ff8a80',
  textGreen: '#9be39b',
};

export const SAVE_VERSION = 1;
export const SAVE_PREFIX = 'vampirehunters.save.';
export const SETTINGS_KEY = 'vampirehunters.settings';
