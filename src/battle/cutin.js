import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { settings } from '../systems/settings.js';
import { state } from '../systems/state.js';
import { text } from '../ui/widgets.js';

// Technique cut-in (hissatsu style): the stage gives way to a speed-line field in the
// technique's colour, the user's portrait sweeps in and the technique name slams onto screen.
export function techniqueCutIn(scene, { portrait, name, school, color = 0x9b6bff, short = false }) {
  const D = 3000; // above every HUD layer except dialogue
  const dur = short ? 650 : 1250;
  const objs = [];
  const bg = scene.add.graphics().setDepth(D);
  objs.push(bg);
  const c = Phaser.Display.Color.IntegerToColor(color);
  const dark = Phaser.Display.Color.GetColor(c.red * 0.25, c.green * 0.25, c.blue * 0.3);
  bg.fillGradientStyle(dark, color, dark, color, 0.96, 0.96, 0.96, 0.96);
  bg.fillRect(0, 140, GAME_W, 360);
  bg.fillStyle(0x000000, 0.9).fillRect(0, 130, GAME_W, 12).fillRect(0, 498, GAME_W, 12);
  const lines = scene.add.graphics().setDepth(D + 1);
  objs.push(lines);
  let t = 0;
  const drawLines = () => {
    lines.clear();
    for (let i = 0; i < 46; i++) {
      const y = 150 + ((i * 53 + t * 1.4) % 340);
      const len = 120 + ((i * 97) % 260);
      const x = ((i * 211 - t * 3.2) % (GAME_W + 400)) + GAME_W;
      lines.fillStyle(0xffffff, 0.06 + (i % 5) * 0.04);
      lines.fillRect(x % (GAME_W + 400) - 200, y, len, 2 + (i % 3));
    }
  };
  drawLines();
  const pKey = `portrait:${portrait}`;
  const p = scene.add.image(-260, 320, scene.textures.exists(pKey) ? pKey : '__DEFAULT').setDisplaySize(380, 380).setDepth(D + 2);
  objs.push(p);
  if (portrait === 'kai' && state.sealStage >= 1 && state.sealStage <= 3) {
    const m = scene.add.image(-260, 320, `mark_overlay_${state.sealStage}`).setDisplaySize(380, 380).setDepth(D + 3).setBlendMode(Phaser.BlendModes.ADD);
    objs.push(m);
    scene.tweens.add({ targets: m, x: 300, duration: 260, ease: 'Cubic.easeOut' });
  }
  const sub = text(scene, GAME_W + 40, 250, (school || '').toUpperCase(), { size: 18, bold: true, color: '#ffffff', origin: [0, 0.5] }).setDepth(D + 4).setAlpha(0.85);
  const big = text(scene, GAME_W + 40, 320, name, { size: 64, title: true, bold: true, italic: true, color: '#ffffff', origin: [0, 0.5], stroke: '#000000', strokeThickness: 8 }).setDepth(D + 4);
  objs.push(sub, big);
  const flash = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0xffffff, 0).setOrigin(0).setDepth(D + 5);
  objs.push(flash);

  scene.tweens.add({ targets: p, x: 300, duration: 260, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: [sub, big], x: 560, duration: 300, delay: 120, ease: 'Back.easeOut' });
  const tick = scene.time.addEvent({ delay: 16, loop: true, callback: () => { t += 16; drawLines(); } });
  return new Promise(res => {
    scene.time.delayedCall(dur, () => {
      if (!settings.reducedFlashing) flash.setAlpha(0.7);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 220 });
      scene.tweens.add({ targets: objs.filter(o => o !== flash), alpha: 0, duration: 200, onComplete: () => { tick.remove(); objs.forEach(o => o.destroy()); res(); } });
    });
  });
}

// Clash duel prompt: an enemy's committed attack meets the hero's answer.
// Deterministic rock-paper-scissors read from the telegraph; no reflex timing.
export const CLASH_TABLE = {
  thrust: { evade: 'best', parry: 'ok', counter: 'bad', hint: 'A straight lunge — step aside to make it miss.' },
  pounce: { parry: 'best', evade: 'ok', counter: 'bad', hint: 'A pounce from above — brace and parry it.' },
  sweep: { counter: 'best', parry: 'ok', evade: 'bad', hint: 'A wide sweep — cut inside it with a counter.' },
};

export function clashPrompt(scene, controls, { hero, enemy, type, canCounter }) {
  const D = 2600;
  const objs = [];
  const shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x05040a, 0.55).setOrigin(0).setDepth(D);
  objs.push(shade);
  const band = scene.add.graphics().setDepth(D + 1);
  band.fillStyle(0x8a1020, 0.92).fillRect(0, 190, GAME_W, 230);
  band.fillStyle(0x000000, 0.9).fillRect(0, 184, GAME_W, 6).fillRect(0, 420, GAME_W, 6);
  objs.push(band);
  const hp = scene.add.image(150, 305, `portrait:${hero.portrait}`).setDisplaySize(200, 200).setDepth(D + 2);
  const ep = scene.add.image(GAME_W - 150, 305, enemy.portrait ? `portrait:${enemy.portrait}` : '__DEFAULT').setDisplaySize(200, 200).setDepth(D + 2).setFlipX(true);
  objs.push(hp, ep);
  const title = text(scene, GAME_W / 2, 222, 'CLASH!', { size: 54, title: true, bold: true, italic: true, color: '#ffe9c2', origin: 0.5, stroke: '#000', strokeThickness: 8 }).setDepth(D + 3);
  const hint = text(scene, GAME_W / 2, 282, `${enemy.name}: ${CLASH_TABLE[type].hint}`, { size: 17, color: '#ffffff', origin: 0.5, wrap: 640, align: 'center' }).setDepth(D + 3);
  objs.push(title, hint);
  const opts = [
    { id: 'parry', label: 'Parry', key: '1' },
    { id: 'evade', label: 'Evade', key: '2' },
    { id: 'counter', label: canCounter ? 'Counter (4 FP)' : 'Counter (needs 4 FP)', key: '3', disabled: !canCounter },
  ];
  let idx = 0;
  const btns = opts.map((o, i) => {
    const x = GAME_W / 2 - 215 + i * 215, y = 368;
    const g = scene.add.graphics().setDepth(D + 3);
    const t = text(scene, x, y, `${o.key}  ${o.label}`, { size: 19, bold: true, color: o.disabled ? '#8a7f7f' : '#ffffff', origin: 0.5 }).setDepth(D + 4);
    const zone = scene.add.zone(x, y, 200, 46).setInteractive().setDepth(D + 5);
    objs.push(g, t, zone);
    return { o, g, t, zone, x, y };
  });
  const draw = () => btns.forEach((b, i) => {
    b.g.clear();
    b.g.fillStyle(i === idx ? 0xf0d79a : 0x1a0b10, i === idx ? 0.95 : 0.85).fillRoundedRect(b.x - 100, b.y - 23, 200, 46, 8);
    b.g.lineStyle(2, 0xf0d79a, 1).strokeRoundedRect(b.x - 100, b.y - 23, 200, 46, 8);
    b.t.setColor(b.o.disabled ? '#8a7f7f' : i === idx ? '#1a0b10' : '#ffffff');
  });
  draw();
  scene.tweens.add({ targets: title, scale: { from: 1.6, to: 1 }, duration: 220, ease: 'Back.easeOut' });
  return new Promise(res => {
    const done = id => {
      scene.events.off('update', poll);
      objs.forEach(o => o.destroy());
      res(id);
    };
    const pick = i => { if (!btns[i].o.disabled) { scene.game.events.emit('sfx', 'confirm'); done(btns[i].o.id); } else scene.game.events.emit('sfx', 'cancel'); };
    btns.forEach((b, i) => {
      b.zone.on('pointerover', () => { idx = i; draw(); });
      b.zone.on('pointerdown', () => pick(i));
    });
    const keys = scene.input.keyboard.addKeys('ONE,TWO,THREE');
    const poll = () => {
      if (controls.pressed('left')) { idx = (idx + 2) % 3; draw(); scene.game.events.emit('sfx', 'move'); }
      else if (controls.pressed('right')) { idx = (idx + 1) % 3; draw(); scene.game.events.emit('sfx', 'move'); }
      else if (controls.pressed('confirm')) pick(idx);
      else if (Phaser.Input.Keyboard.JustDown(keys.ONE)) pick(0);
      else if (Phaser.Input.Keyboard.JustDown(keys.TWO)) pick(1);
      else if (Phaser.Input.Keyboard.JustDown(keys.THREE)) pick(2);
    };
    scene.events.on('update', poll);
    scene.clashOpen = { pick, opts, type };
  }).then(id => { scene.clashOpen = null; return id; });
}
