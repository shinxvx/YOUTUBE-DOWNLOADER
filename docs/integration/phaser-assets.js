/** Supply the parsed manifest and your public-directory URL prefix. No dependencies here. */
const url = (base, path) => `${base.replace(/\/$/, '')}/${path}`;
export function preloadAssetPack(scene, manifest, base = 'assets/Veil_of_Dawn_Claude_Expanded') {
  for (const asset of manifest.sprites) {
    if (asset.loadMethod === 'atlas') {
      scene.load.atlas(asset.id, url(base, asset.path), url(base, asset.atlasPath));
    } else {
      scene.load.spritesheet(asset.id, url(base, asset.path), {
        frameWidth: asset.frameWidth, frameHeight: asset.frameHeight, margin: 0, spacing: 0
      });
    }
  }
  for (const p of manifest.portraits) scene.load.image(`portrait:${p.id}`, url(base, p.path));
  for (const e of manifest.environments) scene.load.image(`environment:${e.id}`, url(base, e.path));
  for (const l of manifest.logos) scene.load.image(`logo:${l.id}`, url(base, l.path));
  scene.load.image('environment_tiles', url(base, manifest.tiles.path));
}
export function registerAssetAnimations(scene, manifest) {
  for (const asset of manifest.sprites) {
    for (const [name, clip] of Object.entries(asset.animations)) {
      const key = `${asset.id}:${name}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key, frames: clip.frames.map(frame => ({ key: asset.id, frame: asset.loadMethod === 'atlas' ? String(frame) : frame })),
        frameRate: clip.fps, repeat: clip.repeat
      });
    }
  }
}
/** Example: const kai = scene.add.sprite(x,y,'kai_overworld').setOrigin(.5,1);
 * kai.play('kai_overworld:walk_down');
 * On movement stop: kai.play('kai_overworld:idle_down');
 * On battle attack completion return to idle; knockout/defeat hold the last frame.
 * Use a pixelArt rendering configuration and integer scale where possible.
 */

/** After creating an exploration sprite, apply asset.displayScale. The source is higher resolution; the logical footprint is 48x48. */
export function applyAssetDisplayScale(sprite, asset) {
  sprite.setOrigin(.5,1);
  if (asset.displayScale) sprite.setScale(asset.displayScale);
  return sprite;
}
