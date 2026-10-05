// Starter decks (one per partner) and NPC decks. Every list has 30 cards.
const D = (spec) => Object.entries(spec).flatMap(([id, n]) => Array(n).fill(id));

export const STARTER_DECKS = {
  cindlet: D({
    cindlet: 2, brasear: 2, solmara: 2, kilnox: 1, shellip: 1, zippip: 2, arclyn: 1, cairnox: 1, pebblit: 2, drizzlet: 2,
    t_flare: 2, t_ignite: 2, t_heat_rush: 2, t_spark_step: 2, t_seed_search: 1,
    r_ember_fang: 2, r_academy_badge: 1, l_caldera: 1, t_mend: 1,
  }),
  ripplet: D({
    ripplet: 2, neruvin: 2, abyssail: 2, shellip: 2, corallop: 2, drizzlet: 2, cairnox: 2, t_thunderclap: 1, t_undercurrent: 1,
    t_mend: 2, t_riptide: 2, t_tidal_renewal: 1, t_seed_search: 2, t_bramble_wall: 1,
    r_pearl_band: 2, r_tide_shell: 1, l_tidal_basin: 1, r_academy_badge: 1, t_static_bolt: 1,
  }),
  mossbit: D({
    mossbit: 2, thornook: 2, elderhorn: 2, budwing: 2, florafin: 2, ripplet: 1, briarimp: 2, cairnox: 2, pebblit: 2,
    t_overgrowth: 2, t_bramble_wall: 2, t_seed_search: 2, t_rockfall: 1, t_wild_growth: 1,
    r_leaf_cloak: 2, r_academy_badge: 1, l_verdant_glade: 1, t_fortify: 1,
  }),
};

export const NPC_DECKS = {
  // Ren — Volt/Ember, aggressive
  ren_admission: D({
    zippip: 2, arclyn: 2, coilisk: 2, cindlet: 2, brasear: 1, kilnox: 1, pebblit: 2,
    t_flare: 2, t_spark_step: 2, t_static_bolt: 2, t_heat_rush: 2, t_ignite: 1,
    r_spark_plug: 2, r_ember_fang: 2, l_storm_plateau: 1, r_academy_badge: 2, t_recharge: 2,
  }),
  // Mira — Grove/Tide
  mira_study: D({
    mossbit: 2, thornook: 2, budwing: 2, florafin: 2, ripplet: 2, neruvin: 1, shellip: 2, drizzlet: 1,
    t_mend: 2, t_overgrowth: 2, t_bramble_wall: 2, t_seed_search: 2, t_riptide: 1,
    r_leaf_cloak: 2, r_pearl_band: 2, l_verdant_glade: 1, t_tidal_renewal: 2,
  }),
  // Professor Elara — tutorial deck, simple
  elara_tutorial: D({
    shellip: 2, budwing: 2, pebblit: 2, mossbit: 2, ripplet: 2, drizzlet: 2, briarimp: 2,
    t_mend: 2, t_bramble_wall: 2, t_fortify: 2, t_seed_search: 2,
    r_academy_badge: 2, r_pearl_band: 2, l_academy_arena: 2, t_wild_growth: 2,
  }),
  // Soren — Stone & evolutions
  soren_spar: D({
    pebblit: 2, cragoon: 2, monolithor: 1, cairnox: 2, mossbit: 2, thornook: 2, shellip: 2,
    t_fortify: 2, t_rockfall: 2, t_bedrock: 1, t_earthen_wall: 1, t_seed_search: 2,
    r_granite_plate: 2, r_bastion_crest: 2, l_stone_bastion: 1, t_mend: 2, r_academy_badge: 2,
  }),

  // Juno — Volt newshound
  juno: D({
    zippip: 2, arclyn: 2, tempestrix: 1, coilisk: 2, wispin: 2, hushowl: 1, pebblit: 2,
    t_spark_step: 2, t_static_bolt: 2, t_recharge: 2, t_hex_mark: 2, t_thunderclap: 1,
    r_spark_plug: 2, r_storm_coil: 1, l_storm_plateau: 2, r_academy_badge: 2, t_fates_coin: 2,
  }),
  // Pip — nervous first-year, Grove
  pip: D({
    budwing: 2, florafin: 2, mossbit: 2, thornook: 1, briarimp: 2, shellip: 2, ripplet: 2,
    t_mend: 2, t_bramble_wall: 2, t_seed_search: 2, t_wild_growth: 2, t_overgrowth: 1,
    r_leaf_cloak: 2, r_academy_badge: 2, l_verdant_glade: 2, t_fortify: 2,
  }),
  // Nell — shopkeeper, Ember
  nell: D({
    cindlet: 2, brasear: 2, kilnox: 2, drizzlet: 2, coilisk: 2, pebblit: 2,
    t_flare: 2, t_ignite: 2, t_wildfire: 1, t_heat_rush: 2, t_mend: 2,
    r_coal_charm: 2, r_ember_fang: 2, l_caldera: 2, r_academy_badge: 1, t_spark_step: 2,
  }),
  // Quill — librarian, Veil
  quill: D({
    wispin: 2, mirravel: 2, noctilume: 1, hushowl: 2, ripplet: 2, shellip: 2, pebblit: 1,
    t_hex_mark: 2, t_dread: 1, t_veilstep: 2, t_fates_coin: 2, t_riptide: 2,
    r_mirror_mask: 2, r_shadow_lantern: 2, l_veil_fog: 2, t_mend: 2, r_academy_badge: 1,
  }),
  // Marlo — harbor master, Tide
  marlo: D({
    shellip: 2, corallop: 2, reefwarden: 1, ripplet: 2, neruvin: 2, drizzlet: 2, pebblit: 2, cairnox: 1,
    t_mend: 2, t_riptide: 2, t_tidal_renewal: 2, t_undercurrent: 2,
    r_pearl_band: 2, r_tide_shell: 2, l_tidal_basin: 2, r_bond_ribbon: 1, t_earthen_wall: 1,
  }),
  // Hollis — reserve ranger, Stone/Grove
  hollis: D({
    pebblit: 2, cragoon: 2, cairnox: 2, mossbit: 2, thornook: 2, budwing: 2,
    t_fortify: 2, t_rockfall: 2, t_bedrock: 2, t_seed_search: 2, t_bramble_wall: 2,
    r_granite_plate: 2, r_bastion_crest: 2, l_stone_bastion: 2, r_heartwood: 2,
  }),
};
