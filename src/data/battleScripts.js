// Scripted moments that interrupt a battle. `B` is the battle script API (BattleScene.makeApi).
export const BATTLE_SCRIPTS = {
  async garran_awakening(B) {
    B.music(null);
    await B.say('narrator', 'A figure stumbles into the square, a lantern pole raised like a spear.');
    await B.say('hana', 'Get away from my boy!');
    await B.say('garran', 'Ah. The mother hen.');
    B.sfx('heavy');
    B.flash(220, 160, 20, 20);
    B.shake(350, 0.012);
    await B.say('narrator', 'Garran\'s claw tears across Hana\'s shoulder. She falls against the fountain steps and does not get up.');
    await B.say('kai', 'HANA!');
    await B.awaken();
    await B.say('garran', 'What—? My blood… it won\'t close. What are you doing to me, vessel?!');
    await B.say('narrator', 'Three lanterns flare red above the square — Garran\'s blood anchors, laid bare by the violet light.');
    await B.elaraArrives();
    await B.say('elara', 'Step away from him, Lantern Eater.');
    await B.say('garran', 'The White Inferno. They sent a Dawncrowned for one little village?');
    await B.say('elara', 'They sent me for you.');
    await B.say('elara', 'You — breathe. Use that power, then let it go; don\'t let it carry you. The red lanterns are his blood anchors. Break them and his wounds stay open.');
    await B.say('kai', 'Hana—');
    await B.say('elara', 'She\'s breathing. Keep her that way. End this.');
    B.music('boss');
    await B.tip('veil');
  },

  async garran_defeated(B) {
    await B.say('garran', 'You think… this is a victory? He has waited eighteen years, vessel. The king always collects what is his.');
    await B.say('narrator', 'Garran collapses into ash and cooling wax. Somewhere far to the north, a bell that isn\'t there rings once.');
    await B.voiceMoment();
    await B.say('voice', 'At last, you have opened your eyes.');
    await B.say('kai', '…Who said that?');
    await B.say('elara', 'Said what?');
    await B.say('kai', '…Nothing. Hana — I need to get to Hana.');
  },
};

export const BATTLE_TIPS = {
  basics: 'The turn order runs along the top: faster fighters act more often.\n\nAttack, or spend Focus on Cadence techniques. Guard halves damage until your next turn and restores 3 Focus.\n\nThe yellow bar under an enemy is its Resolve. Empty it to Stagger the enemy: it loses its next action and takes 50% more damage.',
  windup: 'The enemy is winding up a heavy blow at the named ally. Read the telegraph: when it lands you will get a CLASH.',
  clash: 'CLASH! A committed attack can be answered.\n\n• Straight lunges and thrusts — EVADE.\n• Pounces from above — PARRY.\n• Wide sweeps — COUNTER (costs 4 Focus).\n\nA perfect read cancels the hit and cracks the attacker\'s Resolve. A partial read halves it. Choose with ← → and Z, the number keys, or the mouse.',
  bleed: 'Blood Hounds inflict Bleed, which drains HP at the start of each turn. Ember Salves cure it — or end the fight quickly.',
  priority: 'Two enemies. Choose targets with the arrow keys or the mouse. Fast enemies act more often; removing them first can save a lot of HP.',
  telegraph: 'Gloom Stalkers mark their prey before they pounce. A HUNTED ally will face a Clash — pounces are answered with a PARRY.',
  regen: 'Garran is a vampire. The green numbers on his turn are regeneration, and the hanging lanterns feed it.\n\nYour festival blade has no Dawnstone and cannot stop him. Hold on.',
  veil: 'VEIL ARTS AWAKENED.\n\nSeal Rend suppresses regeneration and is strong against blood anchors. Veilpiercer hits very hard.\n\nVeil Arts raise Veil Strain. At 70 or more Kai is Strained: lower defense, costlier Veil Arts. Guard to bring Strain down — it never takes control away from you.\n\nElara fights beside you. Her White Funeral seals every anchor at once.',
};
