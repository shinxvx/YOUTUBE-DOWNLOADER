// Story events. Each event lives at a location and becomes available when
// its conditions hold. Essential events stay available until completed, so
// the campaign can never be lost by letting days pass.
//
// Script ops (run by src/game/script.js):
//   { n }                       narration
//   { s, e, t }                 speaker id ('you' = player), expression, text
//   { choice: [{ t, do }] }     player choice
//   { flag } / { unflag }       story flags
//   { give: { coins, cards } }  rewards (also shown on the reward screen)
//   { friend: { id: n } }       friendship
//   { duel: {...}, win, lose }  start a duel
//   { choosePartner: true }     partner selection screen
//   { license }                 license promotion
//   { bg }, { fx }, { music }, { banner }, { register }, { message }, { quest }, { tutorial }
//   { if: { flag | notFlag }, then, else }
// Text may use {name} (player) and {partner} (partner's name).

export const EVENTS = [
  // ------------------------------------------------------------ ACT 1 — The Arrival
  {
    id: 'arrival', chapter: 1, auto: true, at: 'port', when: { notFlag: 'partner_chosen' }, essential: true,
    label: 'Arrival', cost: 0,
    script: [
      { music: 'title' },
      { bg: 'port' },
      { n: 'The ferry slows as Aster Island rises from the morning haze: white cliffs, green hills, and an old lighthouse standing alone on the eastern point.' },
      { n: 'In your pocket, the letter still feels unreal. A full scholarship to Nexus Academy.' },
      { s: 'marlo', e: 'happy', t: "Welcome to Aster, kid! Mind the gap — the pier's older than me." },
      { s: 'elara', e: 'happy', t: "You must be {name}. I'm Professor Elara. I teach the study of bonds — and I'll be guiding you this week." },
      { s: 'elara', e: 'neutral', t: 'Before anything else, every new student meets a partner. Come. The Essence Garden is this way.' },
      { music: 'day' },
      { bg: 'garden' },
      { n: 'A spring of pale light bubbles at the heart of the garden. Small Eidra drift around it, curious about the newcomer.' },
      { s: 'elara', e: 'neutral', t: 'Eidra are living beings bound to Essence, the energy that flows through this island. A Nexus Card records the signature of a bond between you and one of them.' },
      { s: 'elara', e: 'neutral', t: 'The card does not imprison them. In a duel it lets them project a temporary form, and that form can be hurt without the Eidra ever being harmed.' },
      { s: 'elara', e: 'happy', t: 'Three young Eidra have been waiting near the spring all morning. Perhaps one of them is waiting for you.' },
      { choosePartner: true },
      { s: 'elara', e: 'happy', t: '{partner} chose you as much as you chose it. Here is your Nexus deck — thirty cards built around your new partner.' },
      { give: { coins: 300 } },
      { s: 'mira', e: 'surprised', t: 'Oh! Sorry, sorry — I was counting Budwings and walked straight into you. Is that a new partner? It looks so happy!' },
      { s: 'mira', e: 'happy', t: "I'm Mira, first-year like you. I study Eidra habitats. Well, I try to." },
      { flag: 'met_mira' },
      { s: 'elara', e: 'neutral', t: 'Mira, would you show {name} around? {name}, my first lesson starts whenever you are ready. Find me in the Classroom.' },
      { s: 'mira', e: 'happy', t: "Of course! The island map is easy: just pick where you want to go. Come find me if you need anything!" },
      { quest: { id: 'q_first_lesson', state: 'active' } },
      { n: 'Tip: choosing a destination on the map is free. Lessons, duels and important events take one period of the day.' },
    ],
  },
  {
    id: 'first_class', chapter: 1, at: 'classroom', when: { flag: 'partner_chosen', notFlag: 'class1_done' }, essential: true,
    label: 'First lesson', cost: 1, people: ['elara'],
    objective: "Attend Professor Elara's first lesson in the Classroom.",
    script: [
      { s: 'elara', e: 'happy', t: 'Welcome, everyone. Today: the rules of a Nexus duel. {name}, would you help me demonstrate?' },
      { tutorial: 'rules' },
      { s: 'elara', e: 'neutral', t: "Let's practice. I'll use a gentle deck and start with only 12 Nexus. Remember: build your field, evolve when you can, and attack only after you've played your cards." },
      { duel: { opp: 'elara', deck: 'elara_tutorial', ai: 'novice', mandatory: true, tutorial: true, rules: { startNexus: [20, 12] }, reward: { coins: 80 } },
        win: [{ s: 'elara', e: 'happy', t: 'Wonderful. You read the field instead of rushing. That is the heart of a good duelist.' }] },
      { music: 'day' },
      { s: 'ren', e: 'angry', t: "A tutorial win? Please. Anyone can beat a practice deck." },
      { s: 'ren', e: 'neutral', t: "I'm Ren. Admission duels are tonight at the Arena. You're mine. Don't be late." },
      { flag: 'met_ren' },
      { s: 'elara', e: 'sad', t: 'Ren... is enthusiastic. The admission duel is real, {name}: it decides your first ranking. Prepare well.' },
      { flag: 'class1_done' },
      { quest: { id: 'q_first_lesson', state: 'done' } },
      { quest: { id: 'q_admission', state: 'active' } },
    ],
  },
  {
    id: 'admission', chapter: 1, at: 'arena', when: { flag: 'class1_done', notFlag: 'admission_won', period: [2] }, essential: true,
    label: 'Admission duel', cost: 1, people: ['ren'],
    objective: 'Win the admission duel against Ren at the Arena (Evening).',
    waitText: 'Admission duels start in the Evening.',
    script: [
      { music: 'tension' },
      { n: 'The arena lights hum to life. Students fill the stands; somewhere a referee calls your name.' },
      { s: 'ren', e: 'happy', t: "You came. Good. I'll show everyone how a real duelist fights." },
      { s: 'mira', e: 'happy', t: 'You can do it, {name}! Trust {partner}!' },
      { duel: { opp: 'ren', deck: 'ren_admission', ai: 'balanced', mandatory: true, reward: { coins: 150, cards: { r_academy_badge: 1, coilisk: 1 } } },
        win: [
          { s: 'ren', e: 'angry', t: "...Tch. Lucky draw. Next time I won't hold back." },
          { friend: { ren: 1 } },
        ] },
      { music: 'day' },
      { s: 'soren', e: 'happy', t: "Good duel. I'm Soren, third-year. You let your creatures grow instead of throwing them away. Rare for a first-year." },
      { s: 'soren', e: 'neutral', t: "Though... did the projections feel slow to fade to you? Never mind. Get some rest." },
      { flag: 'met_soren' },
      { flag: 'admission_won' },
      { quest: { id: 'q_admission', state: 'done' } },
      { quest: { id: 'q_ceremony', state: 'active' } },
      { message: { from: 'Academy Office', text: 'Congratulations on passing admission. The Welcome Ceremony takes place in the Central Plaza tomorrow (Morning or Afternoon).' } },
    ],
  },
  {
    id: 'ceremony', chapter: 1, at: 'plaza', when: { flag: 'admission_won', notFlag: 'ceremony_done', period: [0, 1], minDayAfter: 'admission_won' }, essential: true,
    label: 'Welcome Ceremony', cost: 1, people: ['vael', 'elara'],
    objective: 'Attend the Welcome Ceremony in the Central Plaza (Morning or Afternoon).',
    waitText: 'The ceremony is held tomorrow, in the Morning or Afternoon.',
    script: [
      { n: 'The plaza is packed. A tall man in a dark high-collared coat steps up beside the fountain, and the crowd falls silent.' },
      { s: 'vael', e: 'happy', t: 'Students of Nexus Academy. Welcome to Aster Island. I am Director Vael.' },
      { s: 'vael', e: 'neutral', t: 'Twenty years ago this island suffered the Silence of Aster. Habitats went dark overnight. Eidra faded. Families — mine among them — lost everything.' },
      { s: 'vael', e: 'neutral', t: 'This academy exists so that it never happens again. Your duels, your research, your bonds: all of it makes Aster stronger.' },
      { s: 'vael', e: 'happy', t: 'This afternoon, two students will open the season with a demonstration duel. {name}, top of this year\'s admissions, and Soren, our senior representative.' },
      { s: 'mira', e: 'surprised', t: "{name}! That's you! In front of the whole school!" },
      { s: 'juno', e: 'happy', t: 'Academy News, front page! Smile, {name}!' },
      { flag: 'met_vael' },
      { flag: 'ceremony_done' },
      { quest: { id: 'q_ceremony', state: 'done' } },
      { quest: { id: 'q_demo', state: 'active' } },
    ],
  },
  {
    id: 'demonstration', chapter: 1, at: 'arena', when: { flag: 'ceremony_done', notFlag: 'act1_done' }, essential: true,
    label: 'Demonstration duel', cost: 1, people: ['soren', 'vael'],
    objective: 'Duel Soren in the demonstration at the Arena.',
    script: [
      { music: 'tension' },
      { s: 'soren', e: 'happy', t: "Don't be nervous. This is a demonstration — show them what a bond looks like, win or lose." },
      { duel: { opp: 'soren', deck: 'soren_spar', ai: 'defensive', mandatory: false, reward: { coins: 120, cards: { t_fortify: 1 } } },
        win: [{ s: 'soren', e: 'happy', t: 'Well fought. The crowd loved it.' }],
        lose: [{ s: 'soren', e: 'neutral', t: "You pushed me harder than I expected. That's what a demonstration is for." }] },
      { n: 'The last projections begin to fade — and then stop. For a heartbeat, they hang in the air, flickering.' },
      { fx: 'pulse' },
      { n: 'A deep pulse rolls across the island. Far to the east, the old lighthouse flashes violet.' },
      { s: 'you', t: '{partner}...? It is trembling, staring toward the lighthouse.' },
      { fx: 'flash' },
      { n: 'One of the blank cards in your case glows. For an instant a projection rises from it — a shape you have never seen, vast and dark, with an hourglass of light at its heart.' },
      { n: 'Then it is gone. The card is blank again.' },
      { s: 'elara', e: 'surprised', t: 'A projection from an empty card? That should be impossible...' },
      { s: 'vael', e: 'neutral', t: 'A power fluctuation from the old grid. Nothing to worry about. Please, everyone, a round of applause for our duelists.' },
      { s: 'ren', e: 'surprised', t: "...Did anyone else see that thing?" },
      { music: 'day' },
      { s: 'elara', e: 'neutral', t: '{name}. Whatever that was, it answered your partner. I want to study it — quietly, for now.' },
      { s: 'elara', e: 'happy', t: 'But first, this belongs to you. Your Initiate License. You are officially a student duelist of Nexus Academy.' },
      { license: 'initiate' },
      { give: { coins: 200, cards: { t_seed_search: 1, r_bond_ribbon: 1 } } },
      { quest: { id: 'q_demo', state: 'done' } },
      { flag: 'act1_done' },
      { banner: 'ACT 1 COMPLETE — The Arrival' },
      { n: 'Act 2, "The First Competition", is in development. You can keep playing freely: practice in the Arena, solve tactical challenges, help other students and build your collection.' },
      { message: { from: 'Prof. Elara', text: 'The projection you saw is not in any record I have. Keep your blank card safe. More soon. — E.' } },
    ],
  },

  // ------------------------------------------------------------ optional (Act 1+)
  {
    id: 'mira_research', chapter: 1, at: 'garden', when: { flag: 'class1_done', notFlag: 'mira_research_done', period: [0, 1] },
    label: "Mira's field study", cost: 1, people: ['mira'],
    script: [
      { s: 'mira', e: 'happy', t: "{name}! Perfect timing. I'm testing how Grove and Tide Eidra cooperate in a duel. Will you be my sparring partner?" },
      { choice: [
        { t: 'Of course!', do: [
          { duel: { opp: 'mira', deck: 'mira_study', ai: 'defensive', mandatory: false, reward: { coins: 80, cards: { r_leaf_cloak: 1 } } },
            win: [{ s: 'mira', e: 'happy', t: 'Amazing! My notes say: "Mira needs more Guard creatures." Thank you!' }],
            lose: [{ s: 'mira', e: 'happy', t: 'I won? I won! Sorry — that was really useful data. Thank you!' }] },
          { friend: { mira: 1 } },
          { flag: 'mira_research_done' },
        ] },
        { t: 'Maybe later.', do: [{ s: 'mira', e: 'neutral', t: "No problem! I'll be around the garden in the mornings." }] },
      ] },
    ],
  },
  {
    id: 'pip_help', chapter: 1, at: 'classroom', when: { flag: 'class1_done', notFlag: 'pip_help_done' },
    label: "Pip's problem", cost: 1, people: ['pip'],
    quest: 'q_pip',
    script: [
      { s: 'pip', e: 'sad', t: 'Um... {name}? You did so well in the lesson. I keep losing because I panic and play everything at once.' },
      { s: 'pip', e: 'sad', t: 'Could you duel me? And, um, tell me what I do wrong?' },
      { quest: { id: 'q_pip', state: 'active' } },
      { duel: { opp: 'pip', deck: 'pip', ai: 'novice', mandatory: false, reward: { coins: 60, cards: { budwing: 1 } } },
        win: [{ s: 'pip', e: 'surprised', t: 'You waited for Mossbit to grow before attacking... Patience is a strategy too!' }],
        lose: [{ s: 'pip', e: 'happy', t: 'I... won? Because I waited a turn? I think I get it now!' }] },
      { friend: { pip: 1 } },
      { flag: 'pip_help_done' },
      { quest: { id: 'q_pip', state: 'done' } },
    ],
  },
  {
    id: 'juno_scoop', chapter: 1, at: 'plaza', when: { flag: 'admission_won', notFlag: 'juno_scoop_done' },
    label: 'An interview', cost: 0, people: ['juno'],
    script: [
      { s: 'juno', e: 'happy', t: 'The admission winner! One quote for Academy News, please. What does your partner mean to you?' },
      { choice: [
        { t: '"We grow stronger together."', do: [{ s: 'juno', e: 'happy', t: 'Ooh, sincere. Front page material!' }, { friend: { juno: 1 } }] },
        { t: '"Victory is all that matters."', do: [{ s: 'juno', e: 'surprised', t: "Bold! Ren's going to love that one..." }] },
        { t: '"No comment."', do: [{ s: 'juno', e: 'sad', t: 'A mystery! Fine, I\'ll write "the silent prodigy".' }] },
      ] },
      { flag: 'juno_scoop_done' },
    ],
  },
];

export const TUTORIALS = {
  rules: [
    { title: 'Goal', text: 'Each duelist has a Nexus with 20 points. Reduce your rival\'s Nexus to 0 to win.' },
    { title: 'Essence', text: 'You start with 1 Essence capacity. It grows by 1 at the start of each of your turns, up to 6, and refills every turn. Unused Essence is lost.' },
    { title: 'Your turn', text: '1) Start-of-turn effects. 2) Essence grows and refills. 3) Draw a card. 4) Main phase: summon, evolve, equip relics, use techniques, set terrain. 5) Combat. 6) End-of-turn effects.' },
    { title: 'Creatures', text: 'Up to 3 creatures on your field. A creature cannot attack on the turn it arrives (unless it has Quick). Each ready creature attacks once per turn.' },
    { title: 'Combat', text: 'Choose an enemy creature to attack. Damage stays between turns and there is no counter-attack. You may hit the Nexus only when the rival has no creatures. Once you attack, you cannot play more cards that turn.' },
    { title: 'Evolution', text: 'Place an evolution card on a creature of the same lineage that was already on the field at the start of your turn. It keeps its damage, statuses and relic.' },
    { title: 'Affinities', text: 'Ember beats Grove, Grove beats Tide, Tide beats Ember: an attack with advantage deals +1 damage to the creature.' },
    { title: 'Statuses', text: 'Burn: 1 damage at its owner\'s turn start. Shield: absorbs damage. Stun: cannot attack next turn. Hex: -1 attack until the end of its owner\'s next turn. Guard: must be attacked first. Sturdy: takes less attack damage.' },
  ],
};

// Journal entries (quests). State is stored in the save.
export const QUESTS = {
  q_first_lesson: { title: 'First lesson', text: "Attend Professor Elara's lesson in the Classroom.", main: true },
  q_admission: { title: 'Admission duel', text: 'Defeat Ren in the admission duel at the Arena, in the Evening.', main: true },
  q_ceremony: { title: 'Welcome Ceremony', text: 'Attend the ceremony in the Central Plaza the next day (Morning or Afternoon).', main: true },
  q_demo: { title: 'Demonstration', text: 'Duel Soren in the demonstration at the Arena.', main: true },
  q_pip: { title: "Pip's problem", text: 'Help Pip, a nervous first-year, learn patience in the Classroom.', main: false },
  q_puzzles: { title: 'Tactical challenges', text: 'Solve the tactical challenges in the Classroom.', main: false },
};
