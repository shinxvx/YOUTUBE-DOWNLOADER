// A destination: background, people present, events and activities.
import { VW, VH, rect, panel, text, textBlock, button, COLORS } from '../ui/core.js';
import { portraitImg } from '../ui/assets.js';
import { background } from '../ui/widgets.js';
import { LOCATIONS, CHARACTERS, TALK, PERIODS } from '../content/world.js';
import { NPC_DECKS } from '../content/decks.js';
import { CARDS } from '../content/cards.js';
import { PUZZLES } from '../content/puzzles.js';
import { TUTORIALS } from '../content/story.js';
import { advanceTime, rest, hasFlag, setFlag, LICENSES } from '../game/state.js';
import { eventsAt, waitingAt } from '../game/events.js';
import { peopleAt } from '../game/people.js';
import { runEvent, runDuel, say, choose, fill } from '../game/script.js';
import { BannerScene, TutorialScene } from './dialogue.js';
import { DeckEditorScene } from './deckeditor.js';
import { CollectionScene } from './collection.js';
import { JournalScene } from './journal.js';
import { ShopScene } from './shop.js';
import { SaveLoadScene } from './saveload.js';
import { MessagesScene } from './messages.js';
import { StageScene } from './stage.js';

const PRACTICE = ['juno', 'pip', 'nell', 'quill', 'marlo', 'hollis'];

export class LocationScene {
  constructor(id) {
    this.id = id;
    this.busy = false;
    this.talkIndex = {};
  }

  enter(g) {
    g.audio.play(g.game.period === 2 ? 'night' : 'day');
  }

  resume(g) {
    if (!this.busy) g.audio.play(g.game.period === 2 ? 'night' : 'day');
  }

  // Run an activity; spend time afterwards and autosave.
  async activity(g, cost, fn) {
    if (this.busy) return;
    this.busy = true;
    try {
      await fn();
      await this.spend(g, cost);
    } finally {
      this.busy = false;
    }
    g.audio.play(g.game.period === 2 ? 'night' : 'day');
  }

  async spend(g, cost) {
    const game = g.game;
    if (cost > 0) {
      const newDay = advanceTime(game, cost);
      if (newDay) {
        await say(g, null, 'Night falls over Aster. You head back to the dormitory and sleep.');
        await g.run(new BannerScene(`Day ${game.day}`, PERIODS[game.period]));
        if (this.id !== 'dorm') {
          // waking up in the dorm: return to the map
          await g.autosave();
          g.pop();
          return;
        }
      }
    }
    await g.autosave();
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    const game = g.game;
    const L = LOCATIONS[this.id];
    background(g, this.id, game.period);
    // title bar
    rect(ctx, 0, 0, VW, 22, 'rgba(16,20,40,0.85)');
    text(ctx, L.name, 10, 6, { size: 10, bold: true, color: COLORS.gold });
    text(ctx, `Day ${game.day} · ${PERIODS[game.period]} · ${game.coins} coins`, VW - 8, 7, { size: 8, align: 'right' });
    if (!isTop || this.busy) return;

    // people
    const people = peopleAt(game, this.id);
    text(ctx, people.length ? 'People here' : 'Nobody is around right now.', 12, 30, { size: 8, color: COLORS.textDim });
    people.forEach((p, i) => {
      const x = 10 + i * 60;
      const y = 42;
      const st = g.input.hit(`ppl-${p}`, x, y, 56, 70);
      panel(ctx, x, y, 56, 70, { fill: st.active ? '#34446a' : COLORS.window });
      const pt = portraitImg(p);
      if (pt) ctx.drawImage(pt, 8, 4, 48, 48, x + 4, y + 4, 48, 48);
      text(ctx, CHARACTERS[p].name.replace('Prof. ', '').replace('Director ', '').replace('Ranger ', ''), x + 28, y + 56, { align: 'center', size: 7 });
      if (g.input.pressed(`ppl-${p}`)) this.activityTalk(g, p);
    });

    // actions panel
    const ax = 300;
    let ay = 30;
    panel(ctx, ax - 6, ay - 4, VW - ax + 2, (this.panelH || 40) + 8);
    const ay0 = ay;
    const act = (id, label, cost, fn, opts = {}) => {
      const lbl = cost > 0 ? `${label}  [${cost} period]` : label;
      if (button(g, id, ax, ay, VW - ax - 10, 20, lbl, { size: 7, color: opts.color, disabled: opts.disabled, why: opts.why, tooltip: opts.tooltip })) fn();
      ay += 23;
    };
    for (const ev of eventsAt(game, this.id)) {
      act(`ev-${ev.id}`, `${ev.essential ? '! ' : ''}${ev.label}`, ev.cost, () => this.activity(g, ev.cost, () => runEvent(g, ev, this.id)), { color: ev.essential ? '#7a3a2a' : '#2a5a6a', tooltip: ev.cost ? 'This takes one period of the day.' : 'This does not take time.' });
    }
    for (const ev of waitingAt(game, this.id)) {
      text(ctx, `${ev.label}: ${ev.waitText || 'not now.'}`, ax, ay + 2, { size: 7, color: COLORS.gold });
      ay += 14;
    }
    this.locationActions(g, act);
    this.panelH = ay - ay0;
    // bottom bar
    textBlock(ctx, L.desc, 10, VH - 26, 280, { size: 7, color: COLORS.textDim });
    if (button(g, 'loc-map', 300, VH - 28, 56, 22, 'Map', { size: 8 }) || g.input.key('Escape')) {
      g.audio.sfx('back');
      g.pop();
      return;
    }
    if (button(g, 'loc-deck', 360, VH - 28, 56, 22, 'Decks', { size: 7 })) g.push(new DeckEditorScene());
    if (button(g, 'loc-journal', 420, VH - 28, 54, 22, 'Journal', { size: 7 })) g.push(new JournalScene());
  }

  locationActions(g, act) {
    const game = g.game;
    switch (this.id) {
      case 'dorm': {
        const unread = game.messages.filter((m) => !m.read).length;
        act('dorm-msg', `Messages${unread ? ` (${unread} new)` : ''}`, 0, () => g.push(new MessagesScene()));
        act('dorm-save', 'Save game', 0, () => g.push(new SaveLoadScene('save')));
        act('dorm-rest', 'Rest until tomorrow', 0, () => this.activity(g, 0, async () => {
          const pick = await choose(g, ['Sleep until morning', 'Not yet'], 'Rest until tomorrow morning?');
          if (pick !== 0) return;
          rest(game);
          await g.run(new BannerScene(`Day ${game.day}`, 'Morning'));
        }));
        break;
      }
      case 'arena':
        act('ar-practice', 'Practice duel', 1, () => this.activity(g, 1, () => this.practiceDuel(g)), { disabled: !hasFlag(game, 'class1_done'), why: 'Attend your first lesson first.' });
        break;
      case 'shop':
        act('sh-open', 'Browse the shop', 0, () => g.push(new ShopScene()));
        break;
      case 'classroom':
        act('cl-rules', 'Review the rules', 0, () => g.push(new TutorialScene(TUTORIALS.rules)));
        act('cl-puzzle', 'Tactical challenges', 0, () => this.activity(g, 0, () => this.puzzles(g)), { disabled: !hasFlag(game, 'class1_done'), why: 'Unlocked after the first lesson.' });
        break;
      case 'library':
        act('lb-ency', 'Eidra encyclopedia', 0, () => g.push(new CollectionScene('ency')));
        act('lb-hist', 'Read: the Silence of Aster', 0, () => this.activity(g, 0, async () => {
          await say(g, null, 'Twenty years ago, in a single night, the habitats of Aster went silent. Springs dried, forests greyed, and many Eidra faded from sight.');
          await say(g, null, 'The cause was never confirmed. Records mention "an overload in the old grid beneath the lighthouse". The academy was rebuilt soon after, under a new director: Vael.');
        }));
        break;
      case 'garden':
        act('gd-observe', 'Observe the spring', 0, () => this.activity(g, 0, async () => {
          const partner = game.partner ? CARDS[game.partner].name : 'Your partner';
          await say(g, null, `${partner} wades into the glowing spring and splashes the others. Budwings drift overhead; a Shellip watches from the reeds.`);
        }));
        break;
      case 'port':
        act('pt-sea', 'Watch the ferries', 0, () => this.activity(g, 0, async () => {
          await say(g, null, 'Gulls circle over the pier. On the far cliff, the old lighthouse stands dark — or almost dark. A faint violet glimmer pulses in its lamp room.');
        }));
        break;
      default:
        break;
    }
  }

  async activityTalk(g, who) {
    if (this.busy) return;
    this.busy = true;
    const game = g.game;
    const stage = new StageScene(this.id);
    g.push(stage);
    try {
      const lines = TALK[who] || [{ expr: 'neutral', text: '...' }];
      const i = this.talkIndex[who] || 0;
      this.talkIndex[who] = i + 1;
      const line = lines[i % lines.length];
      await say(g, who, line.text, line.expr);
      const ch = CHARACTERS[who];
      const canDuel = hasFlag(game, 'class1_done') && ch.deck && NPC_DECKS[ch.deck] && who !== 'elara';
      const opts = ['Thanks, see you'];
      if (canDuel) opts.unshift('Friendly duel  [1 period]');
      if (opts.length > 1) {
        const pick = await choose(g, opts);
        if (canDuel && pick === 0) {
          const res = await runDuel(g, { opp: who, oppDeck: ch.deck, ai: ch.ai, mandatory: false, reward: { coins: 60, cards: randomCardFrom(ch.deck) } });
          game.friendship[who] = (game.friendship[who] || 0) + 1;
          await say(g, who, res === 'win' ? 'Good duel! Let\'s do it again sometime.' : 'That was fun! You\'ll get me next time.', res === 'win' ? 'happy' : 'happy');
          while (g.top !== stage) g.pop();
          g.pop();
          this.busy = false;
          await this.spend(g, 1);
          g.audio.play(game.period === 2 ? 'night' : 'day');
          return;
        }
      }
    } finally {
      if (g.scenes.includes(stage)) {
        while (g.top !== stage) g.pop();
        g.pop();
      }
      this.busy = false;
    }
  }

  async practiceDuel(g) {
    const game = g.game;
    const opp = PRACTICE[(game.day * 3 + game.period) % PRACTICE.length];
    const ch = CHARACTERS[opp];
    const stage = new StageScene('arena');
    g.push(stage);
    try {
      await say(g, null, `Your practice opponent today: ${ch.name} (${ch.affinity}).`);
      await runDuel(g, { opp, oppDeck: ch.deck, ai: ch.ai, mandatory: false, reward: { coins: 70, cards: randomCardFrom(ch.deck) } });
    } finally {
      while (g.top !== stage) g.pop();
      g.pop();
    }
  }

  async puzzles(g) {
    const game = g.game;
    const stage = new StageScene('classroom');
    g.push(stage);
    try {
      const labels = PUZZLES.map((p) => `${game.flags[`solved_${p.id}`] !== undefined ? '✓ ' : ''}${p.title}`);
      const pick = await choose(g, [...labels, 'Leave'], 'Professor Elara\'s tactical challenges. Win in a single turn!');
      if (pick >= PUZZLES.length) return;
      const pz = PUZZLES[pick];
      await say(g, 'elara', `${pz.title}. ${pz.lesson}`, 'neutral');
      const solved = game.flags[`solved_${pz.id}`] !== undefined;
      const res = await runDuel(g, {
        opp: 'elara', oppDeck: pz.oppDeck, playerDeck: pz.deck, ai: 'novice', rules: { ...pz.rules }, puzzle: { goal: pz.goal }, mandatory: false, bg: 'classroom',
        reward: solved ? null : pz.reward, noConcede: false,
      });
      if (res === 'win') {
        setFlag(game, `solved_${pz.id}`);
        await say(g, 'elara', solved ? 'Still sharp. Well done.' : 'Exactly right. Remember this lesson in real duels.', 'happy');
        if (PUZZLES.every((p) => game.flags[`solved_${p.id}`] !== undefined)) game.quests.q_puzzles = 'done';
        else game.quests.q_puzzles = 'active';
      } else await say(g, 'elara', 'Not quite. Read the cards again — every one of them matters. Try again whenever you like.', 'neutral');
    } finally {
      while (g.top !== stage) g.pop();
      g.pop();
    }
  }
}

// One random common/uncommon card from an NPC deck as a reward.
export function randomCardFrom(deckId) {
  const pool = (NPC_DECKS[deckId] || []).filter((id) => ['common', 'uncommon'].includes(CARDS[id].rarity));
  if (!pool.length) return {};
  const id = pool[Math.floor(Math.random() * pool.length)];
  return { [id]: 1 };
}

void LICENSES;
void fill;
