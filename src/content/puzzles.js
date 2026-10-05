// Tactical challenges (Classroom). Each must be won on the current turn.
// test/puzzles.test.mjs checks every one is solvable and not trivially so.
const filler = Array(30).fill('pebblit');

export const PUZZLES = [
  {
    id: 'pz_order',
    title: 'Order matters',
    goal: 'Win this turn.',
    lesson: 'Attacking ends your chance to play cards. Use techniques first, then attack.',
    reward: { coins: 60, cards: { t_heat_rush: 1 } },
    rules: {
      noMulligan: true, noDraw: true, firstPlayer: 1, startActive: 0, startTurn: 4,
      startNexus: [20, 2], startCap: { 0: 3 },
      startField: { 0: ['brasear', 'zippip'], 1: ['pebblit'] },
      startHand: { 0: ['t_flare', 't_heat_rush'], 1: [] },
    },
    deck: filler, oppDeck: filler,
  },
  {
    id: 'pz_guard',
    title: 'Through the wall',
    goal: 'Win this turn.',
    lesson: 'Guard creatures must be attacked first, and Sturdy only reduces attack damage — not technique damage.',
    reward: { coins: 80, cards: { t_rockfall: 1 } },
    rules: {
      noMulligan: true, noDraw: true, firstPlayer: 1, startActive: 0, startTurn: 6,
      startNexus: [20, 3], startCap: { 0: 5 },
      startField: { 0: ['arclyn', 'brasear', 'zippip'], 1: ['cragoon', null, null] },
      startHand: { 0: ['t_rockfall', 't_spark_step', 't_flare'], 1: [] },
    },
    deck: filler, oppDeck: filler,
  },
  {
    id: 'pz_evolve',
    title: 'Grow and strike',
    goal: 'Win this turn.',
    lesson: 'Evolving keeps damage and relics, gives new stats immediately, and the creature can still attack.',
    reward: { coins: 100, cards: { r_ember_fang: 1 } },
    rules: {
      noMulligan: true, noDraw: true, firstPlayer: 1, startActive: 0, startTurn: 8,
      startNexus: [20, 5], startCap: { 0: 4 },
      startField: { 0: ['mossbit', 'zippip', 'cindlet'], 1: ['ripplet', null, null] },
      startHand: { 0: ['thornook', 'arclyn', 'brasear', 't_heat_rush'], 1: [] },
    },
    deck: filler, oppDeck: filler,
  },
];
