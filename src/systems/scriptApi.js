import { WORLD_ZOOM } from '../config.js';
import { ITEMS } from '../data/items.js';
import { state, addItem, addProfile } from './state.js';
import { settings } from './settings.js';
import { autosave } from './save.js';
import { Actor } from './actor.js';
import { audio } from '../audio/audio.js';

// The cutscene/scripting surface exposed to chapter scripts.
export function makeScriptApi(w) {
  const ui = () => w.ui;
  const closeBox = () => ui()?.dialogue?.close();
  const actor = id => (id === 'player' ? w.player : w.actors.get(id));
  const sleep = ms => new Promise(r => w.time.delayedCall(ms, r));

  const S = {
    say(speaker, str, opts) { return ui().dialogue.say(speaker, str, opts); },
    choose(speaker, str, options, opts) { return ui().dialogue.choose(speaker, str, options, opts); },
    async wait(ms) { closeBox(); await sleep(ms); },

    async fade(dir, ms = 600) {
      closeBox();
      const cam = w.cameras.main;
      await new Promise(res => {
        if (dir === 'out') { cam.once('camerafadeoutcomplete', res); cam.fadeOut(ms, 0, 0, 0); }
        else { cam.once('camerafadeincomplete', res); cam.fadeIn(ms, 0, 0, 0); }
      });
    },

    skyCinematic() { closeBox(); return ui().skyCinematic(); },

    async chapterCard(title, subtitle) { closeBox(); await ui().chapterCard(title, subtitle); },

    face(id, dir) { actor(id)?.face(dir); },

    async move(id, x, y, speed = 80) {
      closeBox();
      const a = actor(id);
      if (!a) return;
      const dx = x - a.x, dy = y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) return;
      a.walk(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
      await new Promise(res => w.tweens.add({
        targets: a, x, y, duration: (d / speed) * 1000,
        onUpdate: () => a.sync(),
        onComplete: res,
      }));
      a.idle();
    },

    place(id, x, y, facing) {
      const a = actor(id);
      if (!a) return;
      a.setPos(x, y);
      if (facing) a.face(facing);
      if (id === 'player') { w.cameras.main.centerOn(x, y - 24); state.pos = { x, y, facing: a.facing }; }
    },

    spawnNpc(id, sprite, x, y, facing = 'down') {
      actor(id)?.destroy();
      w.dataActors.delete(id);
      const a = new Actor(w, id, sprite, x, y, facing);
      a.blocking = true;
      w.actors.set(id, a);
      return a;
    },

    spawnEnemyActor(id, sprite, x, y, facing = 'down') {
      const a = S.spawnNpc(id, sprite, x, y, facing);
      a.blocking = false;
      return a;
    },

    despawn(id) {
      const a = actor(id);
      if (!a || id === 'player') return;
      a.destroy();
      w.actors.delete(id);
      w.dataActors.delete(id);
    },

    async emote(id, symbol) {
      const a = actor(id);
      if (!a) return;
      closeBox();
      await ui().bubble(a.x, a.y - 52, symbol);
    },

    async camPan(x, y, ms = 800) {
      closeBox();
      const cam = w.cameras.main;
      cam.stopFollow();
      await new Promise(res => { cam.pan(x, y, ms, 'Sine.easeInOut', false, (c, p) => { if (p === 1) res(); }); });
    },

    camFollow() {
      w.cameras.main.startFollow(w.player.sprite, true, 0.15, 0.15, 0, 24);
    },

    lockInput(v) { w.inputLocked = v; },

    shake(ms = 300, intensity = 0.005) {
      if (settings.reducedShake) intensity *= 0.25;
      if (intensity > 0) w.cameras.main.shake(ms, intensity);
    },

    flash(ms = 250, r = 255, g = 255, b = 255) {
      if (settings.reducedFlashing) { ui().tintPulse((r << 16) | (g << 8) | b, 0.25, ms * 2); return; }
      w.cameras.main.flash(ms, r, g, b);
    },

    sfx(name) { audio.sfx(name); },
    music(name) { if (name) audio.play(name); else audio.stopMusic(); },

    phase(name) {
      w.setPhase(name);
    },

    async lampFlare(id) {
      closeBox();
      w.lighting.flare(id.replace('lantern_', 'lamp_'));
      await sleep(500);
    },

    async markPulse() {
      closeBox();
      audio.sfx('veil');
      ui().tintPulse(0x8a4dff, settings.reducedFlashing ? 0.15 : 0.35, 900);
      S.shake(250, 0.003);
      const glow = w.lighting.addTempLight(w.player.x, w.player.y - 28, 70, 0xa970ff, 1200);
      glow.level = 0.9;
      await sleep(900);
    },

    async lanternsDie() {
      closeBox();
      await w.lighting.extinguishAll(() => audio.sfx('lanternOut'));
      w.lighting.setPreset('dark');
      await sleep(700);
    },

    give(id, qty = 1) {
      addItem(id, qty);
      const it = ITEMS[id];
      ui().toast(`Received: ${it?.name || id}${qty > 1 ? ` ×${qty}` : ''}`);
      audio.sfx('sparkle');
    },

    objective(text) {
      state.objective = text;
      ui().setObjective(text, true);
    },

    updateObjective() { w.updateObjective(); },
    refresh() { w.refresh(); },
    addProfile(id) { addProfile(id); },
    tutorial(id) { ui().tip(id); },

    autosave(label) {
      if (autosave(label)) ui().toast('Autosaved', 'save');
    },

    battle(encounterId) {
      closeBox();
      return new Promise(resolve => {
        const cam = w.cameras.main;
        audio.sfx('encounter');
        w.player.idle();
        cam.zoomTo(WORLD_ZOOM * 1.35, 420, 'Cubic.easeIn');
        cam.fadeOut(420, 10, 4, 20);
        cam.once('camerafadeoutcomplete', () => {
          w.scene.sleep('UI');
          w.scene.sleep();
          w.scene.launch('Battle', {
            encounterId,
            onEnd: (result) => {
              w.scene.wake('UI');
              w.scene.wake();
              cam.setZoom(WORLD_ZOOM);
              cam.fadeIn(500);
              audio.play(w.musicForPhase());
              resolve(result);
            },
          });
        });
      });
    },

    async endSlice() {
      closeBox();
      await ui().endCard();
      w.scene.stop('UI');
      w.scene.start('Title');
    },
  };
  return S;
}
