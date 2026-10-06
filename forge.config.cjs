// Electron Forge packaging. Only the built renderer (dist/), the Electron
// main process and package.json go into the app; sources stay out.
const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'EidraNexusAcademy',
    // must match electron-builder's productFilename: the NSIS installer and the
    // portable launcher start "<productName>.exe"
    executableName: 'Eidra Nexus Academy',
    appBundleId: 'com.eidra.nexusacademy',
    icon: path.join(__dirname, 'build', 'icon'),
    asar: true,
    ignore: (p) => {
      if (!p) return false;
      return !(p === '/package.json' || p.startsWith('/dist') || p.startsWith('/electron'));
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'EidraNexusAcademy',
        setupExe: 'EidraNexusAcademy-Setup.exe',
        setupIcon: path.join(__dirname, 'build', 'icon.ico'),
      },
    },
    { name: '@electron-forge/maker-zip', platforms: ['win32', 'linux', 'darwin'] },
  ],
};
