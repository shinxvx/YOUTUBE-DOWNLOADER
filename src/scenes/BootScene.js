import Phaser from 'phaser';
import { GAME_W, GAME_H, VOD } from '../config.js';
import { queueManifestAssets, buildOverworldTextures, registerAnimations, setManifest } from '../gfx/assets.js';
import { makeTextures, makeMarkOverlays } from '../gfx/textures.js';
import { audio } from '../audio/audio.js';
import { applyDawnLight } from '../systems/lighting.js';

// Loads the manifest, then every asset it lists, then prepares runtime textures.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.json('manifest', `${VOD}/manifest.json`);
  }

  create() {
    const manifest = this.cache.json.get('manifest');
    setManifest(manifest);
    document.getElementById('boot')?.remove();

    const bar = this.add.graphics();
    const label = this.add.text(GAME_W / 2, GAME_H / 2 - 30, 'VEIL OF DAWN', { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#cbbfa4' }).setOrigin(0.5);
    const sub = this.add.text(GAME_W / 2, GAME_H / 2 + 40, '', { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#7d7462' }).setOrigin(0.5);
    this.load.on('progress', p => {
      bar.clear();
      bar.fillStyle(0x222536).fillRect(GAME_W / 2 - 200, GAME_H / 2 + 10, 400, 6);
      bar.fillStyle(0xc9a45c).fillRect(GAME_W / 2 - 200, GAME_H / 2 + 10, 400 * p, 6);
    });
    this.load.on('fileprogress', f => sub.setText(f.key));
    queueManifestAssets(this, manifest);
    this.load.image('sky:dawn_panorama', 'assets/sky/dawn_panorama.png');
    this.load.image('sky:emberfall_haze', 'assets/sky/emberfall_dawn_haze.png');
    this.load.json('sky:dawn_light', 'assets/sky/dawn_light.json');
    this.load.once('complete', () => {
      sub.setText('Preparing sprites…');
      this.time.delayedCall(30, () => {
        buildOverworldTextures(this, manifest);
        registerAnimations(this, manifest);
        makeTextures(this);
        makeMarkOverlays(this);
        // Soft gradients and the photographic sky look best with linear filtering.
        for (const k of ['light', 'glow', 'fog', 'vignette', 'dawnwash', 'sky:dawn_panorama', 'sky:emberfall_haze']) {
          this.textures.get(k)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
        applyDawnLight(this.cache.json.get('sky:dawn_light'));
        label.destroy(); sub.destroy(); bar.destroy();
        this.game.events.on('sfx', name => audio.sfx(name));
        const params = new URLSearchParams(location.search);
        if (params.has('test') && params.get('battle')) {
          // Developer shortcut: jump straight into an encounter.
          this.scene.start('Battle', { encounterId: params.get('battle'), onEnd: () => this.scene.start('Title') });
          return;
        }
        this.scene.start(params.has('gallery') ? 'Gallery' : 'Title');
      });
    });
    this.load.start();
  }
}
