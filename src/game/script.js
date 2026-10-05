// Runs story scripts (see src/content/story.js for the op list).
import { CARDS } from '../content/cards.js';
import { NPC_DECKS, STARTER_DECKS } from '../content/decks.js';
import { CHARACTERS } from '../content/world.js';
import { TUTORIALS, QUESTS } from '../content/story.js';
import { validateDeck } from '../engine/deck.js';
import { setFlag, addCards, LICENSES } from './state.js';
import { DialogueScene, TutorialScene, BannerScene, FxScene } from '../scenes/dialogue.js';
import { DuelScene } from '../scenes/duel.js';
import { StageScene } from '../scenes/stage.js';
import { PartnerScene } from '../scenes/partner.js';
import { RewardScene } from '../scenes/reward.js';
import { DeckEditorScene } from '../scenes/deckeditor.js';

export function fill(g, str) {
  const game = g.game;
  return String(str)
    .replaceAll('{name}', game.name)
    .replaceAll('{partner}', game.partner ? CARDS[game.partner].name : 'your partner');
}

const DUEL_TIPS = {
  elara: 'Summon basic creatures early. Evolve a creature that has been on the field since your last turn, then attack.',
  ren: 'Ren plays fast Quick creatures and Volt techniques. Keep a Guard creature or high-HP basic in front, and remove his Coilisk early.',
  soren: 'Soren builds walls of Guard and Sturdy. Techniques ignore Sturdy, and Burn chips away at big creatures.',
  mira: 'Mira heals a lot. Focus one creature at a time so healing cannot keep up.',
  pip: 'Pip plays cautiously. Pressure him before his creatures evolve.',
};

export function playerDeck(g) {
  const game = g.game;
  const deck = game.decks[game.activeDeck];
  if (deck && validateDeck(deck.cards, game.collection).ok) return deck.cards;
  // fall back to any legal deck, then to the partner starter list
  for (const d of game.decks) if (validateDeck(d.cards, game.collection).ok) return d.cards;
  return STARTER_DECKS[game.partner] || STARTER_DECKS.cindlet;
}

export async function say(g, speaker, text, expr) {
  await g.run(new DialogueScene({ speaker, expr, text: fill(g, text) }));
}

export async function choose(g, choices, prompt) {
  return g.run(new DialogueScene({ choices: choices.map((c) => fill(g, c)), prompt: prompt && fill(g, prompt) }));
}

export async function giveRewards(g, reward, title = 'Rewards') {
  const game = g.game;
  if (!reward) return;
  if (reward.coins) game.coins += reward.coins;
  if (reward.cards) addCards(game, reward.cards);
  await g.run(new RewardScene(reward, title));
}

// Runs a duel with retry handling. Returns 'win' | 'lose' | 'draw'.
export async function runDuel(g, d) {
  const game = g.game;
  for (;;) {
    const scene = new DuelScene({
      opp: d.opp,
      deck: d.playerDeck || playerDeck(g),
      oppDeck: Array.isArray(d.oppDeck) ? d.oppDeck : NPC_DECKS[d.oppDeck] || NPC_DECKS[CHARACTERS[d.opp] && CHARACTERS[d.opp].deck],
      ai: d.ai,
      rules: d.rules,
      tutorial: d.tutorial,
      puzzle: d.puzzle,
      music: d.music,
      bg: d.bg || 'arena',
      playerName: game.name,
      noConcede: d.noConcede,
    });
    const res = await g.run(scene);
    const result = res ? res.result : 'lose';
    if (!d.puzzle) {
      if (result === 'win') game.stats.wins++;
      else if (result === 'lose') game.stats.losses++;
      else game.stats.draws++;
    }
    if (result === 'win') {
      if (d.reward) await giveRewards(g, d.reward, 'Victory rewards');
      return 'win';
    }
    if (!d.mandatory) {
      if (result === 'lose' && d.reward && !d.puzzle) await giveRewards(g, { coins: Math.floor((d.reward.coins || 0) / 3) }, 'Consolation');
      return result;
    }
    // mandatory: never block progress — retry, edit deck or read a tip
    for (;;) {
      const pick = await choose(g, ['Try again', 'Edit my deck', 'Read a tip'], result === 'draw' ? 'A draw! You can try again with no penalty.' : 'You lost, but this is not the end. What now?');
      if (pick === 0) break;
      if (pick === 1) {
        await g.run(new DeckEditorScene());
        break;
      }
      await say(g, null, DUEL_TIPS[d.opp] || 'Build your field before attacking, and evolve creatures that survived a turn.');
    }
  }
}

export async function runScript(g, script, ctx = {}) {
  const game = g.game;
  for (const op of script) {
    if (op.n !== undefined) await say(g, null, op.n);
    else if (op.s !== undefined) await say(g, op.s, op.t, op.e);
    else if (op.choice) {
      const i = await choose(g, op.choice.map((c) => c.t), op.prompt);
      await runScript(g, op.choice[i].do || [], ctx);
    } else if (op.flag) setFlag(game, op.flag);
    else if (op.unflag) delete game.flags[op.unflag];
    else if (op.give) await giveRewards(g, op.give);
    else if (op.friend) for (const [k, v] of Object.entries(op.friend)) game.friendship[k] = (game.friendship[k] || 0) + v;
    else if (op.duel) {
      const r = await runDuel(g, { ...op.duel, oppDeck: op.duel.deck });
      if (r === 'win' && op.win) await runScript(g, op.win, ctx);
      if (r !== 'win' && op.lose) await runScript(g, op.lose, ctx);
      if (ctx.stage) g.audio.play(ctx.music || 'day');
    } else if (op.choosePartner) await g.run(new PartnerScene());
    else if (op.license) {
      game.license = op.license;
      await g.run(new BannerScene(`License earned: ${LICENSES[op.license]}`, 'Nexus Academy'));
    } else if (op.bg) {
      if (ctx.stage) ctx.stage.bg = op.bg;
    } else if (op.music) {
      ctx.music = op.music;
      g.audio.play(op.music);
    } else if (op.fx) await g.run(new FxScene(op.fx));
    else if (op.banner) await g.run(new BannerScene(fill(g, op.banner)));
    else if (op.register) game.registered[op.register] = true;
    else if (op.message) game.messages.unshift({ ...op.message, day: game.day, read: false });
    else if (op.quest) {
      game.quests[op.quest.id] = op.quest.state;
      if (QUESTS[op.quest.id]) g.toast(`${op.quest.state === 'done' ? 'Completed' : 'New objective'}: ${QUESTS[op.quest.id].title}`);
    } else if (op.tutorial) await g.run(new TutorialScene(TUTORIALS[op.tutorial]));
    else if (op.if) {
      const ok = (!op.if.flag || game.flags[op.if.flag] !== undefined) && (!op.if.notFlag || game.flags[op.if.notFlag] === undefined);
      await runScript(g, ok ? op.then || [] : op.else || [], ctx);
    } else console.warn('unknown op', op);
  }
}

// Runs an event on a stage background (pushed under the dialogue).
export async function runEvent(g, ev, bg) {
  const stage = new StageScene(bg || ev.at);
  g.push(stage);
  const ctx = { stage, music: null };
  try {
    await runScript(g, ev.script, ctx);
  } finally {
    // pop the stage (and anything left above it)
    while (g.scenes.length && g.top !== stage) g.pop();
    g.pop();
  }
}
