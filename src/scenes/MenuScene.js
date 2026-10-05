import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { CHARACTERS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { SKILLS } from '../data/skills.js';
import { Controls } from '../systems/input.js';
import { state, memberStats, SEAL_STAGES, formatPlaytime, addItem } from '../systems/state.js';
import { XP_CURVE } from '../data/characters.js';
import { SettingsPanel, SaveLoadPanel } from '../ui/panels.js';
import { panel, text, bar, MenuList } from '../ui/widgets.js';
import { isDesktop, desktop } from '../systems/storage.js';

const PROFILE_TEXT = {
  kai: CHARACTERS.kai.bio,
  mira_thorn: 'Kai\'s childhood friend and Hana\'s apprentice. Practical and warm; she ties festival ribbons on people "so they don\'t wander off."',
  hana_thorn: 'Emberfall\'s healer and Kai\'s guardian. She raised him from the night he was brought to her as an infant.',
  lyra_fen: 'A Warden apprentice with a storm Cadence and a sharp tongue. Escorting Emberfall\'s survivors to Firstlight Bastion.',
  elara_ashen: 'Second Seat of the Dawncrowned, the White Inferno. She recognised the mark the moment it woke.',
  garran: 'The Lantern Eater. A Court vampire who hid his blood anchors in hanging lanterns. He called Kai "the vessel."',
};
const PROFILE_PORTRAIT = { kai: 'kai', mira_thorn: 'mira_thorn', hana_thorn: 'hana_thorn', lyra_fen: 'lyra_fen', elara_ashen: 'elara_ashen', garran: 'garran' };
const PROFILE_NAME = { kai: 'Kai', mira_thorn: 'Mira Thorn', hana_thorn: 'Hana Thorn', lyra_fen: 'Lyra Fen', elara_ashen: 'Elara Ashen', garran: 'Garran' };

// Pause menu over exploration.
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(data) {
    this.from = data.from || 'World';
    this.controls = new Controls(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05060c, 0.72).setOrigin(0);
    panel(this, 30, 30, 250, GAME_H - 60);
    text(this, 56, 50, 'Menu', { size: 26, title: true, color: '#f0d79a' });
    this.list = new MenuList(this, 40, 100, [
      { label: 'Party', id: 'party' },
      { label: 'Items', id: 'items' },
      { label: 'Journal', id: 'journal' },
      { label: 'Save', id: 'save' },
      { label: 'Load', id: 'load' },
      { label: 'Settings', id: 'settings' },
      { label: 'Return to Title', id: 'title' },
      ...(isDesktop ? [{ label: 'Quit to Desktop', id: 'quit' }] : []),
      { label: 'Close', id: 'close' },
    ], {
      width: 220, lineH: 40, size: 20,
      onSelect: it => this.select(it.id),
      onCancel: () => this.close(),
      onChange: it => this.preview(it.id),
    });
    text(this, 56, GAME_H - 96, `Playtime  ${formatPlaytime(state.playtime)}`, { size: 14, color: '#a79f8c' });
    text(this, 56, GAME_H - 72, state.location, { size: 14, color: '#a79f8c' });
    this.content = [];
    this.modal = null;
    this.sub = null;
    this.preview('party');
  }

  clearContent() { for (const o of this.content) o.destroy(); this.content = []; this.sub?.destroy(); this.sub = null; }
  add_(o) { this.content.push(o); return o; }

  preview(id) {
    if (this.modal) return;
    this.clearContent();
    const x = 300, y = 30, w = GAME_W - 330, h = GAME_H - 60;
    this.add_(panel(this, x, y, w, h));
    if (id === 'party') this.drawParty(x, y, w);
    else if (id === 'items') this.drawItems(x, y, w, false);
    else if (id === 'journal') this.drawJournal(x, y, w, false);
    else {
      const msg = { save: 'Record your progress in one of three slots.', load: 'Return to a previous save or autosave.', settings: 'Text speed, battle speed, audio, accessibility and difficulty.', title: 'Return to the title screen. Unsaved progress since your last save will be lost.', quit: 'Close the game. Unsaved progress since your last save will be lost.', close: 'Return to Emberfall.' }[id];
      this.add_(text(this, x + 30, y + 30, msg || '', { size: 18, wrap: w - 60, color: '#d8d0bc' }));
    }
  }

  drawParty(x, y) {
    let yy = y + 26;
    for (const m of state.party) {
      const def = CHARACTERS[m.id];
      const st = memberStats(m);
      this.add_(this.add.image(x + 100, yy + 96, `portrait:${def.portrait}`).setDisplaySize(160, 160));
      if (m.id === 'kai' && state.sealStage >= 1 && state.sealStage <= 3) {
        this.add_(this.add.image(x + 100, yy + 96, `mark_overlay_${state.sealStage}`).setDisplaySize(160, 160).setBlendMode(Phaser.BlendModes.ADD));
      }
      this.add_(text(this, x + 200, yy + 10, def.name, { size: 28, title: true, color: '#f0d79a' }));
      this.add_(text(this, x + 200, yy + 48, `${def.role} · Level ${m.level}   (next: ${XP_CURVE(m.level) - m.xp} XP)`, { size: 15, color: '#a79f8c' }));
      this.add_(text(this, x + 200, yy + 78, `HP ${m.hp}/${st.hp}`, { size: 16 }));
      this.add_(bar(this, x + 330, yy + 84, 200, 10, 0xd9534f).set(m.hp / st.hp).g);
      this.add_(text(this, x + 200, yy + 102, `Focus ${m.focus}/${st.focus}`, { size: 16 }));
      this.add_(bar(this, x + 330, yy + 108, 200, 10, 0x4fa3d9).set(m.focus / st.focus).g);
      this.add_(text(this, x + 200, yy + 132, `ATK ${st.atk}   DEF ${st.def}   SPD ${st.spd}   RES ${st.res}`, { size: 16, color: '#d8d0bc' }));
      this.add_(text(this, x + 200, yy + 158, `Weapon: ${state.weapon}`, { size: 15, color: '#d8d0bc' }));
      if (m.id === 'kai') {
        this.add_(text(this, x + 560, yy + 78, `Seal Stage: ${SEAL_STAGES[state.sealStage]}`, { size: 16, color: '#d3b8ff' }));
        const skills = [...def.cadence, ...(state.sealStage >= 1 ? def.veil : [])].map(s => SKILLS[s].name).join(', ');
        this.add_(text(this, x + 560, yy + 104, `Techniques: ${skills}`, { size: 14, color: '#d8d0bc', wrap: 330 }));
      }
      this.add_(text(this, x + 30, yy + 196, def.bio, { size: 15, color: '#cfc7b4', wrap: 860, italic: true }));
      yy += 260;
    }
  }

  drawItems(x, y, w, interactive) {
    this.add_(text(this, x + 30, y + 24, 'Items', { size: 24, title: true, color: '#f0d79a' }));
    const ids = Object.keys(state.inventory).filter(id => state.inventory[id] > 0);
    const desc = this.add_(text(this, x + 30, y + 560, '', { size: 16, wrap: w - 60, color: '#d8d0bc' }));
    if (!ids.length) { this.add_(text(this, x + 30, y + 70, 'Nothing yet.', { size: 16, color: '#a79f8c' })); return; }
    const items = ids.map(id => ({ label: `${ITEMS[id].name}${ITEMS[id].type === 'key' ? '  ◆' : `  ×${state.inventory[id]}`}`, id }));
    if (!interactive) {
      items.forEach((it, i) => this.add_(text(this, x + 56, y + 70 + i * 34, it.label, { size: 18 })));
      desc.setText('Select Items to use a tonic on Kai or read item descriptions.');
      return;
    }
    this.sub = new MenuList(this, x + 24, y + 70, items, {
      width: w - 60, lineH: 34, size: 18,
      onChange: it => desc.setText(ITEMS[it.id].desc),
      onSelect: it => {
        const def = ITEMS[it.id];
        if (!def.field) { desc.setText(`${def.desc}\n(Can't be used here.)`); return; }
        const m = state.party[0];
        const st = memberStats(m);
        m.hp = Math.min(st.hp, m.hp + (def.heal || 0));
        addItem(it.id, -1);
        this.game.events.emit('sfx', 'heal');
        this.select('items');
      },
      onCancel: () => { this.sub.destroy(); this.sub = null; this.list.setActive(true); this.preview('items'); },
    });
    desc.setText(ITEMS[items[0].id].desc);
  }

  drawJournal(x, y, w, interactive) {
    this.add_(text(this, x + 30, y + 24, 'Journal', { size: 24, title: true, color: '#f0d79a' }));
    this.add_(text(this, x + 30, y + 66, 'Current objective', { size: 13, color: '#c9a45c', bold: true }));
    this.add_(text(this, x + 30, y + 86, state.objective, { size: 17, wrap: w - 60 }));
    this.add_(text(this, x + 30, y + 150, 'Profiles', { size: 13, color: '#c9a45c', bold: true }));
    const ids = state.journal.profiles.filter(id => PROFILE_TEXT[id]);
    const portrait = this.add_(this.add.image(x + w - 120, y + 260, `portrait:${PROFILE_PORTRAIT[ids[0]]}`).setDisplaySize(180, 180));
    const desc = this.add_(text(this, x + 260, y + 176, PROFILE_TEXT[ids[0]], { size: 16, wrap: w - 520, color: '#d8d0bc' }));
    const show = id => { portrait.setTexture(`portrait:${PROFILE_PORTRAIT[id]}`).setDisplaySize(180, 180); desc.setText(PROFILE_TEXT[id]); };
    const items = ids.map(id => ({ label: PROFILE_NAME[id], id }));
    if (!interactive) {
      items.forEach((it, i) => this.add_(text(this, x + 56, y + 176 + i * 32, it.label, { size: 18 })));
      return;
    }
    this.sub = new MenuList(this, x + 24, y + 176, items, {
      width: 210, lineH: 32, size: 18,
      onChange: it => show(it.id),
      onSelect: () => {},
      onCancel: () => { this.sub.destroy(); this.sub = null; this.list.setActive(true); this.preview('journal'); },
    });
  }

  select(id) {
    if (id === 'close') return this.close();
    if (id === 'quit') return desktop.quit();
    if (id === 'party') return;
    if (id === 'items' || id === 'journal') {
      this.clearContent();
      const x = 300, y = 30, w = GAME_W - 330;
      this.add_(panel(this, x, y, w, GAME_H - 60));
      this.list.setActive(false);
      if (id === 'items') this.drawItems(x, y, w, true);
      else this.drawJournal(x, y, w, true);
      return;
    }
    if (id === 'save' || id === 'load') {
      this.list.setActive(false);
      this.modal = new SaveLoadPanel(this, id, () => this.endModal(), () => this.afterLoad(), 600);
      return;
    }
    if (id === 'settings') {
      this.list.setActive(false);
      this.modal = new SettingsPanel(this, () => this.endModal(), 600);
      return;
    }
    if (id === 'title') {
      this.scene.stop(this.from);
      this.scene.stop('UI');
      this.scene.stop();
      this.scene.start('Title');
    }
  }

  endModal() {
    this.modal = null;
    this.time.delayedCall(0, () => this.list.setActive(true));
  }

  afterLoad() {
    this.scene.stop('UI');
    this.scene.stop(this.from);
    this.scene.stop();
    this.scene.start('World');
  }

  close() {
    this.scene.resume(this.from);
    this.scene.get(this.from).controls?.rebuild();
    this.scene.stop();
  }

  update() {
    if (!this.modal && !this.sub && this.controls.pressed('menu')) { this.close(); return; }
    if (this.modal) this.modal.handle(this.controls);
    else if (this.sub) this.sub.handle(this.controls);
    else this.list.handle(this.controls);
  }
}
