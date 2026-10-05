// Steamworks integration layer — NOT connected in this version.
//
// The game calls these functions at the points where Steam features would
// hook in. They are deliberate no-ops: there is no App ID yet and no Steam
// SDK bundled. To connect later:
//   1. Get an App ID from Steamworks and add steam_appid.txt next to the exe
//      for local testing (never ship a made-up ID).
//   2. Add a native binding (e.g. steamworks.js) in the Electron main process
//      and expose it through electron/preload.cjs.
//   3. Implement the functions below on top of that bridge.
//   4. Steam Cloud: point the Auto-Cloud root at the saves folder
//      (%APPDATA%/Eidra Nexus Academy/saves) in the Steamworks settings.
//   5. Achievements: create them in Steamworks with the IDs in ACHIEVEMENTS.

export const ACHIEVEMENTS = {
  FIRST_BOND: 'Chose a partner',
  ADMISSION: 'Won the admission duel',
  INITIATE: 'Earned the Initiate License',
  FIRST_EVOLUTION: 'Evolved a creature in a duel',
};

export const steam = {
  available: false,
  userName() {
    return null;
  },
  unlock(_id) {
    // no-op until Steamworks is connected
  },
  cloudSync() {
    // no-op: local saves are the source of truth
  },
};
