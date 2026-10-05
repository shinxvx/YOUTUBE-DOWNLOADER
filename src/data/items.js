export const ITEMS = {
  tonic: {
    name: 'Lantern Tonic', type: 'consumable', battle: true, field: true, heal: 50,
    desc: 'Hana\'s honey-and-ginger tonic. Restores 50 HP.',
  },
  ember_salve: {
    name: 'Ember Salve', type: 'consumable', battle: true, field: true, heal: 100, cure: ['bleed', 'burn'],
    desc: 'A warm resin salve. Restores 100 HP and cures Bleed and Burn.',
  },
  focus_draught: {
    name: 'Focus Draught', type: 'consumable', battle: true, field: false, focus: 10,
    desc: 'Bitter tea brewed for night watches. Restores 10 Focus.',
  },
  calming_incense: {
    name: 'Calming Incense', type: 'consumable', battle: true, field: false, strain: -40,
    desc: 'Shrine incense. Reduces Veil Strain by 40.',
  },
  festival_ribbon: {
    name: 'Festival Ribbon', type: 'key',
    desc: 'A Firstlight Festival ribbon Mira tied around your wrist. "So you don\'t wander off."',
  },
  cloth_keepsake: {
    name: 'Cloth Keepsake', type: 'key',
    desc: 'A small square of faded blue cloth with uneven stitching. Hana kept it from the night you came to Emberfall.',
  },
};
