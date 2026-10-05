// Characters, locations and where people are during the day.
export const PERIODS = ['Morning', 'Afternoon', 'Evening'];

export const CHARACTERS = {
  mira: { name: 'Mira', role: 'First-year · Habitat researcher', affinity: 'Grove / Tide', deck: 'mira_study', ai: 'defensive',
    bio: 'Curious and warm, Mira studies how Eidra live in the wild. She became your first friend on the island.' },
  ren: { name: 'Ren', role: 'First-year · Rival', affinity: 'Volt / Ember', deck: 'ren_admission', ai: 'aggressive',
    bio: 'Fast, proud and fiercely competitive. Ren believes strength means winning alone.' },
  soren: { name: 'Soren', role: 'Third-year · Veteran', affinity: 'Stone', deck: 'soren_spar', ai: 'defensive',
    bio: 'A patient senior who helps new students. He has noticed duels behaving strangely.' },
  elara: { name: 'Prof. Elara', role: 'Professor of Bonds', affinity: 'Grove / Tide', deck: 'elara_tutorial', ai: 'novice',
    bio: 'A researcher of the bond between people and Eidra. She runs the first-year lessons.' },
  vael: { name: 'Director Vael', role: 'Director of Nexus Academy', affinity: 'Veil', deck: null, ai: 'expert',
    bio: 'Charismatic and respected. He lost his family in the Silence of Aster and swears to prevent another.' },
  iris: { name: 'Iris', role: 'Second-year', affinity: 'Veil', deck: 'quill', ai: 'balanced',
    bio: 'Reserved and sharp. She searches the records for her brother, a former student who vanished.' },
  lucan: { name: 'Lucan', role: 'Former student', affinity: 'Veil', deck: null, ai: 'expert', bio: "Iris's missing brother." },
  juno: { name: 'Juno', role: 'Second-year · Academy News', affinity: 'Volt', deck: 'juno', ai: 'aggressive',
    bio: 'Runs the student newspaper and never misses a scoop.' },
  pip: { name: 'Pip', role: 'First-year', affinity: 'Grove', deck: 'pip', ai: 'novice',
    bio: 'A nervous first-year who loves Grove Eidra but doubts every play.' },
  nell: { name: 'Nell', role: 'Card shop keeper', affinity: 'Ember', deck: 'nell', ai: 'balanced',
    bio: 'Runs the academy card shop and duels anyone who haggles.' },
  quill: { name: 'Quill', role: 'Librarian', affinity: 'Veil', deck: 'quill', ai: 'balanced',
    bio: 'Keeper of the academy archives. Speaks softly, remembers everything.' },
  marlo: { name: 'Marlo', role: 'Harbor master', affinity: 'Tide', deck: 'marlo', ai: 'defensive',
    bio: 'An old sailor who has watched every ferry arrive for forty years.' },
  hollis: { name: 'Ranger Hollis', role: 'Reserve warden', affinity: 'Stone / Grove', deck: 'hollis', ai: 'defensive',
    bio: 'Looks after the wild Eidra in the nature reserve.' },
};

// Destinations on the island map. `unlock` is a story flag.
export const LOCATIONS = {
  dorm: { name: 'Dormitory', desc: 'Rest, save and read your messages.', unlock: 'partner_chosen' },
  plaza: { name: 'Central Plaza', desc: 'Meetings, news and challenges.', unlock: 'partner_chosen' },
  classroom: { name: 'Classroom', desc: 'Lessons and tactical challenges.', unlock: 'partner_chosen' },
  arena: { name: 'Arena', desc: 'Official duels and tournaments.', unlock: 'partner_chosen' },
  shop: { name: 'Card Shop', desc: 'Card packs and single cards.', unlock: 'partner_chosen' },
  library: { name: 'Library', desc: 'History, clues and Eidra records.', unlock: 'partner_chosen' },
  garden: { name: 'Essence Garden', desc: 'Where Eidra gather around the spring.', unlock: 'partner_chosen' },
  port: { name: 'Port', desc: 'Visitors, ferries and events.', unlock: 'partner_chosen' },
  lab: { name: 'Laboratory', desc: 'Research, card creation and evolution studies.', unlock: 'act2' },
  lighthouse: { name: 'Old Lighthouse', desc: 'Closed. Something hums inside.', unlock: 'act3' },
  reserve: { name: 'Nature Reserve', desc: 'Expeditions into the wild.', unlock: 'act2' },
  core: { name: 'Underground Core', desc: '???', unlock: 'act6', hidden: true },
};

// Who is where (by period index) when no story event says otherwise.
export const SCHEDULE = {
  mira: ['garden', 'library', 'plaza'],
  ren: ['arena', 'arena', 'plaza'],
  soren: ['library', 'classroom', 'arena'],
  elara: ['classroom', 'classroom', null],
  juno: ['plaza', 'plaza', 'port'],
  pip: ['classroom', 'garden', 'dorm'],
  nell: ['shop', 'shop', 'shop'],
  quill: ['library', 'library', 'library'],
  marlo: ['port', 'port', 'port'],
};

// People who are only around once the story has introduced them.
export const INTRO_FLAG = {
  mira: 'met_mira', ren: 'met_ren', soren: 'met_soren', elara: 'partner_chosen', juno: 'partner_chosen',
  pip: 'class1_done', nell: 'partner_chosen', quill: 'partner_chosen', marlo: 'partner_chosen',
};

// Small talk. Lines are picked by friendship level (0..) and chapter.
export const TALK = {
  mira: [
    { expr: 'happy', text: "The spring is so lively today! I counted twelve Budwings before breakfast." },
    { expr: 'neutral', text: "Did you know Ripplets hum when they're happy? I'm writing a paper on it. Well... a page." },
    { expr: 'happy', text: "Your partner trusts you already. You can see it in the way it stands next to you." },
  ],
  ren: [
    { expr: 'angry', text: "Don't get comfortable. I'm going to be the top first-year, and I don't need help to get there." },
    { expr: 'neutral', text: "Volt creatures win by tempo. Hit first, hit often. Simple." },
  ],
  soren: [
    { expr: 'neutral', text: "Evolutions are about patience. Keep a creature alive one more turn and it becomes something greater." },
    { expr: 'happy', text: "If you ever need a sparring partner, find me. Teaching helps me think." },
  ],
  elara: [
    { expr: 'neutral', text: "A Nexus Card does not cage an Eidra. It records a bond. Never forget that difference." },
    { expr: 'happy', text: "You're adapting quickly. Keep asking questions — that's what this academy is for." },
  ],
  juno: [
    { expr: 'happy', text: "Academy News, special edition! The new first-years are already causing a stir. Got a quote for me?" },
    { expr: 'surprised', text: "Rumor has it the old lighthouse lit up last month. With nobody inside. Spooky, right?" },
  ],
  pip: [
    { expr: 'sad', text: "I-I keep losing because I play everything at once. Is that bad? It feels bad." },
    { expr: 'happy', text: "Professor Elara says Mossbits evolve faster when you're patient with them. Like me, maybe?" },
  ],
  nell: [
    { expr: 'happy', text: "Packs are fresh! The odds are posted right there — no tricks in my shop." },
    { expr: 'neutral', text: "Duplicate cards? Hold onto them. Rumor says the lab will turn them into fragments one day." },
  ],
  quill: [
    { expr: 'neutral', text: "The archives remember the Silence of Aster. Twenty years ago, entire habitats went quiet overnight." },
    { expr: 'neutral', text: "Speak softly. The Hushowls are sleeping in the rafters." },
  ],
  marlo: [
    { expr: 'happy', text: "Forty years on this pier and I've never seen a first-year as eager as you." },
    { expr: 'neutral', text: "The tide's been odd lately. Comes in too slow, goes out too fast. The sea's tired." },
  ],
};
