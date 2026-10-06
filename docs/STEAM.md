# Steam preparation

Nothing is connected to Steam yet. The game runs fully without it. There is no App ID; one must
come from Steamworks.

## Integration points

`src/platform/steam.js` is the only module the game calls for platform features:

| Function | Purpose | Status |
| --- | --- | --- |
| `steam.unlock(id)` | achievements (`ACHIEVEMENTS` lists the planned IDs) | no-op |
| `steam.userName()` | Steam persona name (could pre-fill the player name) | returns `null` |
| `steam.cloudSync()` | hint after saving | no-op |

## To connect later

1. Create the app in Steamworks and get the real App ID.
2. Add a native Steamworks binding (for example `steamworks.js`) as a dependency of the Electron main process.
   Initialize it in `electron/main.cjs`, and expose a small API through `electron/preload.cjs`.
   Use `steam_appid.txt` only for local testing.
3. Implement `src/platform/steam.js` on top of that bridge, and keep the no-op path when Steam is
   not running (DRM-free builds and development).
4. **Steam Cloud**: use Auto-Cloud with the root `WinAppDataRoaming` and the path
   `Eidra Nexus Academy/saves`. Saves are already plain JSON files with atomic writes.
5. **Achievements**: create them in Steamworks with the IDs from `ACHIEVEMENTS`, then call
   `steam.unlock` where the matching flags are set (partner chosen, admission won, license earned…).
6. **Depot**: upload the contents of `out/EidraNexusAcademy-win32-x64/` (from `npm run package:win`).
   The launch option is `Eidra Nexus Academy.exe`.
