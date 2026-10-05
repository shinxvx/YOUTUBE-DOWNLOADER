// Chapter 1 — WHEN THE LANTERNS DIE (vertical slice: Emberfall).
// Entities are declared with `when(state)` guards; scripts are async functions that drive
// the world through the script API `S` (see systems/scriptApi.js).

import { state, flag, setFlag } from '../../systems/state.js';

const lanternsFixed = () => ['lantern_plaza', 'lantern_southeast', 'lantern_bridge'].filter(f => flag(f)).length;

export const CH1 = {
  // ---------------------------------------------------------------- interactables
  interactables: [
    { id: 'lantern_plaza', x: 403, y: 830, r: 34, when: s => s.phase === 'dusk' && !flag('lantern_plaza'), script: 'fixLantern', arg: 'lantern_plaza' },
    { id: 'lantern_southeast', x: 1005, y: 830, r: 34, when: s => s.phase === 'dusk' && !flag('lantern_southeast'), script: 'fixLantern', arg: 'lantern_southeast' },
    { id: 'lantern_bridge', x: 1120, y: 570, r: 34, when: s => s.phase === 'dusk' && !flag('lantern_bridge'), script: 'fixLantern', arg: 'lantern_bridge' },
    { id: 'clinic', x: 240, y: 362, r: 36, when: s => s.phase === 'dusk', script: 'hanaDusk', marker: () => !flag('met_hana') },
    { id: 'clinic_dark', x: 240, y: 362, r: 36, when: s => s.phase === 'dark', script: 'clinicDark', marker: () => false },
    { id: 'kids_dusk', x: 420, y: 548, r: 34, when: s => s.phase === 'dusk', script: 'kidsDusk', marker: () => !flag('kids_dusk') },
    { id: 'stall', x: 864, y: 540, r: 32, when: s => s.phase === 'dusk', script: 'stallDusk', marker: () => false },
    { id: 'shrine_blade', x: 864, y: 540, r: 34, when: s => s.phase === 'dark' && !flag('has_blade'), script: 'takeBlade' },
    { id: 'kids_dark', x: 622, y: 1072, r: 36, when: s => s.phase === 'dark' && flag('has_blade') && !flag('kids_safe'), script: 'kidsDark' },
    { id: 'river', x: 1138, y: 740, r: 30, when: s => s.phase !== 'dawn', script: 'riverLook', marker: () => false },
    { id: 'shelter_door', x: 1504, y: 266, r: 34, when: s => s.phase === 'dark' && flag('has_blade'), script: 'shelterDoor' },
    { id: 'clinic_dawn', x: 240, y: 362, r: 36, when: s => s.phase === 'dawn' && !flag('dawn_talk'), script: 'dawnClinic' },
  ],

  // Walk-in triggers (circle). once: run only one time (stored as flag `trig_<id>`).
  triggers: [
    { id: 'garran_reveal', x: 704, y: 720, r: 110, once: true, when: s => s.phase === 'dark' && flag('hana_shelter'), script: 'garranReveal' },
    { id: 'stairs_block', x: 1070, y: 620, r: 40, when: s => s.phase === 'dusk' && !flag('stairs_hint'), once: true, script: 'stairsHint' },
  ],

  // Enemies visible in exploration; contact starts the encounter.
  enemies: [
    { id: 'hound_bridge', sprite: 'blood_hound_overworld', x: 1240, y: 612, patrol: [[1170, 612], [1310, 612]], encounter: 'ch1_hound_bridge', when: s => s.phase === 'dark' && flag('has_blade') },
    { id: 'pair_lower_a', sprite: 'ash_thrall_overworld', x: 760, y: 1000, patrol: [[680, 1000], [900, 990]], encounter: 'ch1_pair_lower', link: 'pair_lower', when: s => s.phase === 'dark' && flag('has_blade') },
    { id: 'pair_lower_b', sprite: 'blood_hound_overworld', x: 900, y: 1110, patrol: [[820, 1120], [990, 1080]], encounter: 'ch1_pair_lower', link: 'pair_lower', when: s => s.phase === 'dark' && flag('has_blade') },
    { id: 'stalker_stairs', sprite: 'gloom_stalker_overworld', x: 1490, y: 560, patrol: [[1450, 590], [1530, 530]], encounter: 'ch1_stalker_stairs', guard: true, when: s => s.phase === 'dark' && flag('has_blade') },
  ],

  // Static/scripted NPCs. Only characters with walking art are placed as sprites;
  // villagers without art are voiced through doors and stalls (see ASSETS.md).
  npcs: [
    { id: 'mira', sprite: 'mira_thorn_overworld', x: 760, y: 690, facing: 'left', when: s => s.phase === 'dusk', script: 'miraDusk' },
    { id: 'elara', sprite: 'elara_ashen_overworld', x: 300, y: 404, facing: 'right', when: s => s.phase === 'dawn', script: 'elaraDawn' },
    { id: 'lyra', sprite: 'lyra_fen_overworld', x: 520, y: 410, facing: 'left', when: s => s.phase === 'dawn', script: 'lyraDawn' },
  ],

  // Movement limits by story state (returns a message if the move should be blocked).
  gates: [
    { id: 'bridge_dusk', poly: [[1150, 560], [1344, 560], [1344, 690], [1150, 690]], when: s => s.phase === 'dusk', message: 'The bridge to Shrine Hill is roped off until the festival bells. Better finish the lanterns.' },
    { id: 'bridge_dark', poly: [[1150, 560], [1344, 560], [1344, 690], [1150, 690]], when: s => s.phase === 'dark' && !flag('has_blade'), message: 'Thralls are on the stairs. You need something to fight with.' },
    { id: 'lower_dawn', poly: [[448, 900], [1088, 900], [1088, 1240], [448, 1240]], when: s => s.phase === 'dawn', message: 'Survivors are gathering by the clinic. Elara is waiting there.' },
  ],

  objectives: {
    dusk: () => {
      const n = lanternsFixed();
      const hana = flag('met_hana') ? '✓' : '·';
      return `Repair the loose lantern fittings (${n}/3)  ${hana} Visit Hana at the clinic`;
    },
  },

  // ---------------------------------------------------------------- scripts
  scripts: {
    async intro(S) {
      S.music('village');
      await S.chapterCard('Chapter 1', 'When the Lanterns Die');
      await S.say('narrator', 'Asterra — a province of mountains, lantern-lit villages and old shrines. Its people say the morning sun enters the world through a gate in the northern peaks.');
      await S.say('narrator', 'In Emberfall, on the eve of the Firstlight Festival, the lanterns still need fixing.');
      await S.fade('in', 900);
      await S.wait(300);
      await S.say('mira', 'Kai. Kai. You\'ve been glaring at that bracket for a full minute.');
      await S.say('kai', 'I\'m judging it. It knows what it did.');
      await S.say('mira', 'It\'s a lantern hook, not a vampire. Three fittings are still loose — the two lamp posts at the bottom of the square and the one by the bridge. Hana wants them lit before the bells.');
      S.face('player', 'left');
      await S.emote('player', '…');
      await S.say('kai', '…Right. Three fittings.');
      await S.say('mira', 'Your shoulder again?');
      await S.say('kai', 'Slept on it wrong. For nineteen years.');
      await S.say('mira', 'Hana has tonics for the stalls — and probably a lecture for you. Go see her at the clinic. I\'ll finish the ribbons.');
      S.tutorial('move');
      setFlag('intro_done');
      S.refresh();
      S.autosave('Festival Eve');
    },

    async miraDusk(S) {
      const n = lanternsFixed();
      if (n >= 3 && flag('met_hana')) return CH1.scripts.festivalStart(S);
      const lines = [
        ['mira', n === 0 ? 'Two square posts and the bridge lamp. I\'d write it on your hand, but you\'d smudge it.' : `${n} down. The square already looks warmer.`],
      ];
      if (!flag('met_hana')) lines.push(['mira', 'And don\'t skip Hana. She\'ll know.']);
      for (const [s, t] of lines) await S.say(s, t);
    },

    async fixLantern(S, id) {
      S.sfx('sparkle');
      await S.lampFlare(id);
      setFlag(id);
      const n = lanternsFixed();
      const flavor = {
        lantern_plaza: 'You tighten the bracket on the plaza post. The flame steadies and paints the banner gold.',
        lantern_southeast: 'The south-east post had a cracked pin. You wedge a new one in place and the lamp brightens.',
        lantern_bridge: 'The bridge lamp hisses as you clear the soot. Down below, the river catches the light like scattered coins.',
      }[id];
      await S.say('narrator', `${flavor} (${n}/3)`);
      if (id === 'lantern_bridge') await S.say('kai', '(The mark tightens, just for a heartbeat, when I look north along the river. …Probably nothing.)');
      S.updateObjective();
      if (n === 3 && !flag('met_hana')) await S.say('kai', 'That\'s the last fitting. Hana next — before she comes looking.');
      if (n === 3 && flag('met_hana')) await S.say('kai', 'That\'s all three. Mira will want to see.');
    },

    async hanaDusk(S) {
      S.face('player', 'up');
      if (flag('met_hana')) {
        await S.say('hana', 'Still here? The tonics won\'t carry themselves, and neither will you if you skip supper.');
        return;
      }
      await S.say('narrator', 'The clinic door opens before you can knock.');
      await S.say('hana', 'There\'s my lantern-fixer. Come here — let me look at you.');
      await S.say('kai', 'I\'m fine.');
      await S.say('hana', '"Fine" is what you say when you mean "don\'t ask." Is it the mark?');
      await S.say('kai', 'It\'s just… warm tonight. Like it\'s listening for something.');
      await S.say('hana', '…Then we\'ll listen too.');
      await S.say('hana', 'Here. Tonics for the stalls, and two for your pockets. Festivals make people reckless.');
      S.give('tonic', 2);
      await S.say('hana', 'And Kai — whatever that mark is, it isn\'t the measure of you. Go on. Mira\'s been watching the door.');
      setFlag('met_hana');
      S.updateObjective();
    },

    async kidsDusk(S) {
      if (!flag('kids_dusk')) {
        await S.say('nell', 'Kai! Corin says vampires can\'t cross running water.');
        await S.say('corin', 'They can\'t! That\'s why Emberfall has a river.');
        await S.say('kai', 'Then you two are perfectly safe. Unless they use the bridge.');
        await S.say('corin', '…Nell. They can use the bridge.');
        setFlag('kids_dusk');
      } else {
        await S.say('nell', 'We\'re guarding the honey cakes. Corin\'s on the left flank.');
      }
    },

    async stallDusk(S) {
      await S.say('narrator', 'A festival stall stacked with paper lanterns, honey cakes and a little shrine. A ceremonial blade rests on its stand, wrapped in Firstlight ribbon.');
    },

    async riverLook(S) {
      await S.say('narrator', 'The river runs fast and black beneath the bridge, carrying lantern reflections down toward the mill.');
    },

    async stairsHint(S) {
      setFlag('stairs_hint');
      await S.say('kai', '(Shrine Hill. Nobody crosses the bridge after dark unless the bells ring twice.)');
    },

    async festivalStart(S) {
      await S.say('mira', 'That\'s all three? Look at it, Kai — the whole square\'s glowing.');
      await S.fade('out', 700);
      S.phase('festival');
      S.place('player', 704, 700, 'right');
      S.spawnNpc('mira', 'mira_thorn_overworld', 760, 700, 'left');
      S.music('festival');
      await S.fade('in', 1200);
      await S.say('narrator', 'The festival bells ring out over Emberfall. Lantern light spills across the square, and for one evening nobody looks at the dark beyond the river.');
      await S.say('mira', 'When the first sky-lantern goes up, you make a wish. Out loud doesn\'t count.');
      await S.say('kai', 'Then I wish you\'d stop tying ribbons on me.');
      await S.say('mira', 'Denied. It\'s so you don\'t wander off.');
      S.give('festival_ribbon', 1, true);
      await S.wait(400);
      await S.markPulse();
      await S.say('kai', '(…It\'s burning.)');
      await S.say('mira', 'Kai?');
      await S.say('kai', 'Smoke from the stalls. I\'m fine.');
      await S.say('mira', 'You keep saying that word like it\'s a door you can lock.');
      await S.wait(500);
      S.music(null);
      await S.lanternsDie();
      await S.say('mira', '…Did the wind do that?');
      await S.say('kai', 'There\'s no wind.');
      S.sfx('scream');
      S.shake(400, 0.004);
      await S.say('villager', 'Thralls! Thralls in the square! Get to the shrine — across the bridge!', { name: 'Distant voice' });
      S.phase('dark');
      S.music('danger');
      await S.say('mira', 'Nell and Corin went down to the lower square — I\'ll get them to the shelter.');
      await S.say('kai', 'Mira, wait—');
      await S.move('mira', 720, 1010, 150);
      S.despawn('mira');
      await S.say('kai', 'I can\'t fight with lantern pins. The festival stall — the ceremonial blade.');
      setFlag('festival_done');
      S.objective('Take the ceremonial blade from the festival stall.');
      S.refresh();
      S.autosave('The Lanterns Die');
    },

    async takeBlade(S) {
      await S.say('narrator', 'The Firstlight ceremonial blade: dull-edged, ribbon-wrapped, older than the village. The only weapon in reach.');
      await S.say('kai', 'Decorative will have to do.');
      setFlag('has_blade');
      state.weapon = 'Ceremonial Blade';
      S.sfx('confirm');
      S.spawnEnemyActor('tutorial_thrall', 'ash_thrall_overworld', 1000, 640, 'left');
      await S.move('tutorial_thrall', 900, 600, 70);
      await S.say('kai', 'Stay back!');
      const result = await S.battle('ch1_tutorial');
      S.despawn('tutorial_thrall');
      if (result !== 'win') return;
      await S.say('kai', '(It was wearing Old Teodor\'s scarf.) …Focus. Mira went to the lower square.');
      S.objective('Find Nell and Corin in the lower square and get everyone to the shrine hall.');
      S.refresh();
      S.autosave('Ceremonial Blade');
    },

    async kidsDark(S) {
      if (!flag('pair_lower_cleared')) {
        await S.say('kai', '(Something is prowling the lower square. I have to deal with it first.)');
        return;
      }
      await S.say('nell', 'Kai! Mira told us to hide behind the water barrels and not come out for anyone.');
      await S.say('corin', 'You\'re not anyone. You\'re Kai.');
      await S.say('kai', 'Where is she?');
      await S.say('nell', 'She went back for old Berrin — he can\'t climb stairs. She said she\'d be right behind us.');
      await S.say('kai', 'Then let\'s make sure she has somewhere to come back to. Across the bridge to the shrine. Stay close to me.');
      setFlag('kids_safe');
      S.objective('Get Nell and Corin across the bridge to the shrine hall on Shrine Hill.');
      S.refresh();
    },

    async clinicDark(S) {
      await S.say('narrator', 'The clinic is dark and empty. Hana must already be at the shelter.');
    },

    async shelterDoor(S) {
      if (!flag('kids_safe')) {
        await S.say('villager', 'Kai? Is that you? We can\'t open the door yet — there are still children down in the lower square!', { name: 'Voice behind the door' });
        return;
      }
      if (flag('hana_shelter')) {
        await S.say('villager', 'We\'ve barred the door. Go — find Mira!', { name: 'Voice behind the door' });
        return;
      }
      await S.fade('out', 500);
      await S.fade('in', 500);
      await S.say('narrator', 'The shelter door scrapes open. Hands pull Nell and Corin inside.');
      await S.say('hana', 'Kai! Thank the lanterns. Where\'s Mira?');
      await S.say('nell', 'She went back for Berrin! She said she\'d be right behind us!');
      await S.say('hana', 'Then she\'s still down there.');
      await S.say('kai', 'I\'ll find her. Bar the door behind me.');
      await S.say('hana', 'Kai— Kai! Don\'t you dare play the hero alone—');
      setFlag('hana_shelter');
      S.objective('Return to the festival square and find Mira.');
      S.refresh();
      S.autosave('Shelter');
    },

    async garranReveal(S) {
      S.music(null);
      S.lockInput(true);
      S.spawnNpc('garran', 'garran_overworld', 640, 680, 'right');
      S.spawnNpc('mira', 'mira_thorn_overworld', 580, 668, 'right');
      S.spawnEnemyActor('captor', 'ash_thrall_overworld', 548, 690, 'right');
      await S.camPan(660, 660, 900);
      S.music('danger');
      await S.say('garran', 'Shh. Listen. Every lantern in this village sighed when it went out. Such a lovely sound.');
      await S.say('mira', 'Kai, don\'t— run!');
      S.face('garran', 'right');
      await S.say('garran', 'And there it is. I could smell it from the river.');
      await S.say('garran', 'The vessel. Walking out into the dark on its own two feet.');
      await S.say('kai', 'I\'m not anyone\'s vessel. Let her go.');
      await S.say('garran', 'You don\'t even know what you\'re carrying. How delicious.');
      await S.say('garran', 'Take the healer\'s girl north. Her memories will tell us everything about him. Gently — the king wants her whole.');
      await S.say('mira', 'Let go of me! Kai— Kai!');
      S.face('captor', 'left');
      S.move('captor', 40, 690, 180);
      await S.move('mira', 60, 668, 180);
      S.despawn('mira');
      S.despawn('captor');
      await S.say('kai', 'MIRA!');
      S.lockInput(false);
      S.camFollow();
      const result = await S.battle('ch1_garran');
      if (result !== 'win') return;
      S.despawn('garran');
      await CH1.scripts.dawnTransition(S);
    },

    async dawnTransition(S) {
      await S.fade('out', 1200);
      S.phase('dawn');
      S.place('player', 260, 420, 'right');
      S.music('dawn');
      const sky = S.skyCinematic();
      await S.wait(2600);
      await S.say('narrator', 'Dawn comes late to Emberfall. It comes all the same.');
      await S.say('narrator', 'For the first time in eighteen years, the mark on Kai\'s shoulder is awake to see it.');
      S.refresh();
      await sky.end();
      await S.fade('in', 1600);
      S.objective('Speak with Elara outside the clinic.');
      S.autosave('Dawn');
    },

    async elaraDawn(S) {
      if (flag('dawn_talk')) return CH1.scripts.departure(S);
      return CH1.scripts.dawnClinic(S);
    },

    async dawnClinic(S) {
      if (flag('dawn_talk')) return CH1.scripts.departure(S);
      await S.say('elara', 'Hana\'s wound is clean. Deep, but clean. She\'ll live — she\'s too stubborn not to.');
      await S.say('hana', 'I heard that.', { name: 'Hana (from inside)' });
      await S.say('kai', 'They took Mira. Berrin, the miller\'s girls, four more from the lower houses.');
      await S.say('elara', 'Garran\'s thralls carried them north-east, toward Brassveil. The Court doesn\'t take captives alive without a reason. That means there\'s still time.');
      await S.say('elara', 'That mark. How long has it been spreading?');
      await S.say('kai', 'It wasn\'t. Not until last night.');
      await S.say('elara', '…I see.');
      await S.say('kai', 'You know what it is.');
      await S.say('elara', 'I know it\'s been asleep for a long time, and I know it woke up angry. I won\'t guess at the rest in a village square.');
      await S.say('elara', 'I\'m Elara Ashen, of the Aurora Wardens. I\'m going after your people. Firstlight Bastion can give you a real blade and teach you to use it — and that mark needs someone who understands control.');
      const c = await S.choose('kai', 'You\'re asking me to join your order.', ['"I\'m not doing this for the Wardens."', '"Can you actually teach me to control it?"']);
      if (c === 0) {
        await S.say('elara', 'Good. Don\'t. I\'m asking you to come. What you do after that is yours to decide.');
      } else {
        await S.say('elara', 'I can teach you restraint. Control is something you\'ll have to choose, every time. That part I can\'t do for you.');
      }
      await S.say('narrator', 'Hana appears in the clinic doorway, pale and bandaged, holding a square of faded blue cloth.');
      await S.say('hana', 'Take this. It was with you the night you were brought to me. I\'ve kept it eighteen years.');
      S.give('cloth_keepsake', 1, true);
      await S.say('hana', 'You come home, Kai. With Mira. That\'s all I\'m asking.');
      await S.say('kai', 'Mira\'s alive. The others are alive. That\'s reason enough.');
      setFlag('dawn_talk');
      S.objective('Tell Elara when you are ready to leave for Firstlight Bastion.');
      S.refresh();
      await S.say('elara', 'Then we leave as soon as you\'re ready. Lyra will escort the survivors behind us.');
    },

    async lyraDawn(S) {
      if (!flag('met_lyra')) {
        await S.say('lyra', 'So you\'re the one who stared down a Court vampire with a festival prop. Lyra Fen. Storm Cadence, Third Seat\'s apprentice.');
        await S.say('kai', 'It was a very sturdy festival prop.');
        await S.say('lyra', 'Ha! Daigo\'s going to like you. Survivors are packed. I\'ll get them to the Bastion — try not to fall behind, ribbon boy.');
        setFlag('met_lyra');
        S.addProfile('lyra_fen');
      } else {
        await S.say('lyra', 'Wagons are loaded. Say the word and we roll.');
      }
    },

    async departure(S) {
      const c = await S.choose('elara', 'Ready to leave Emberfall?', ['Leave for Firstlight Bastion', 'Not yet']);
      if (c !== 0) return;
      S.autosave('Departure — Pre-Bastion');
      await S.fade('out', 1400);
      await S.say('voice', 'Walk north, then. I have waited such a long time.');
      await S.say('kai', '(That voice again. From inside the mark — or from somewhere far to the north.)');
      await S.endSlice();
    },
  },
};
