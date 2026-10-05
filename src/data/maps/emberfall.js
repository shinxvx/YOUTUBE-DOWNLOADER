// Emberfall village square. The painted backdrop supplies the art; this file authors
// everything the illustration does not: walkable areas, occluding foreground cut-outs,
// light sources, interactables and spawn points. Coordinates are in backdrop pixels.

export const EMBERFALL = {
  id: 'emberfall',
  name: 'Emberfall',
  backdrop: 'environment:emberfall',
  width: 1536,
  height: 1024,

  // Union of polygons the player's feet may stand in.
  walkable: [
    // Main plaza
    [[548, 548], [640, 520], [700, 508], [1010, 500], [1088, 506], [1128, 540], [1160, 590], [1236, 624],
      [1416, 640], [1430, 688], [1330, 744], [1180, 812], [1060, 852], [1000, 846], [930, 812], [800, 760],
      [752, 760], [700, 716], [640, 668], [580, 622], [536, 590]],
    // West walkway past the red maple to the bridge
    [[176, 468], [300, 462], [420, 470], [470, 492], [552, 540], [552, 596], [520, 584], [470, 548], [420, 516], [300, 508], [176, 514]],
    // Stairs down to the lower square
    [[752, 752], [810, 756], [940, 812], [1004, 846], [980, 892], [900, 930], [790, 920], [720, 860], [706, 800]],
    // Lower square
    [[600, 900], [720, 860], [800, 912], [960, 900], [980, 1024], [560, 1024]],
    // Grand stairs up to the shelter terrace
    [[1096, 520], [1150, 470], [1214, 404], [1262, 330], [1300, 262], [1330, 200], [1350, 130], [1404, 130],
      [1400, 196], [1372, 270], [1332, 344], [1286, 420], [1220, 486], [1180, 540], [1140, 560]],
  ],

  // Static blockers inside walkable areas (lantern posts, planters). Circles: [x, y, r]
  blockers: [
    [736, 696, 16],
    [1196, 826, 14],
  ],

  // Foreground cut-outs re-drawn above actors whose feet are north of `baseline`.
  occluders: [
    { x: 690, y: 560, w: 96, h: 150, baseline: 702 },      // plaza lantern post + banner
    { x: 1150, y: 700, w: 100, h: 140, baseline: 832 },    // south-east lantern post
    { x: 520, y: 600, w: 200, h: 170, baseline: 700, poly: [[520, 640], [560, 600], [640, 650], [720, 700], [760, 770], [700, 770], [610, 700], [540, 690]] }, // stone wall + fence
    { x: 1360, y: 640, w: 176, h: 240, baseline: 760 },    // south-east planters / fence
  ],

  // Light sources (backdrop pixels). r = radius, c = colour, f = flicker.
  lights: [
    { x: 742, y: 646, r: 150, c: 0xffb56b, id: 'lamp_plaza' },
    { x: 1182, y: 776, r: 130, c: 0xffb56b, id: 'lamp_southeast' },
    { x: 420, y: 466, r: 120, c: 0xffb56b, id: 'lamp_bridge' },
    { x: 712, y: 404, r: 110, c: 0xffc27a, id: 'lamp_shop1' },
    { x: 862, y: 470, r: 120, c: 0xffc27a, id: 'lamp_shop2' },
    { x: 1006, y: 330, r: 110, c: 0xffc27a, id: 'lamp_shop3' },
    { x: 1206, y: 480, r: 120, c: 0xffc27a, id: 'lamp_clinic1' },
    { x: 1352, y: 520, r: 120, c: 0xffc27a, id: 'lamp_clinic2' },
    { x: 1276, y: 280, r: 100, c: 0xffc27a, id: 'lamp_stairs1' },
    { x: 1380, y: 314, r: 90, c: 0xffc27a, id: 'lamp_stairs2' },
    { x: 1300, y: 140, r: 100, c: 0xffc27a, id: 'lamp_shelter' },
    { x: 622, y: 844, r: 110, c: 0xffb56b, id: 'lamp_lower' },
    { x: 568, y: 540, r: 100, c: 0xffc27a, id: 'lamp_maple' },
    { x: 160, y: 480, r: 100, c: 0xffc27a, id: 'lamp_west' },
    { x: 1450, y: 620, r: 100, c: 0xffc27a, id: 'lamp_east' },
  ],

  moon: { x: 360, y: 44 },

  spawns: {
    start: { x: 790, y: 640, facing: 'up' },
    clinicDoor: { x: 1300, y: 640, facing: 'up' },
    shelter: { x: 1376, y: 150, facing: 'up' },
    plazaCenter: { x: 880, y: 640, facing: 'down' },
  },

  locations: [
    { name: 'Emberfall — Festival Square', poly: [[548, 500], [1160, 500], [1430, 640], [1000, 860], [540, 600]] },
    { name: 'Emberfall — Maple Walk', poly: [[170, 460], [560, 460], [560, 600], [170, 520]] },
    { name: 'Emberfall — Lower Square', poly: [[560, 860], [1010, 840], [1000, 1024], [560, 1024]] },
    { name: 'Emberfall — Shelter Stairs', poly: [[1090, 120], [1420, 120], [1420, 520], [1090, 560]] },
  ],
};
