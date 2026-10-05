// Emberfall — top-down map authored from the pack's tiles and generated props.
// Tile coordinates (32 px). Layout, west to east:
//   north street with Hana's clinic and shops · festival square with the yagura tower ·
//   lower square to the south · river with the red bridge · shrine hill (torii, stairs,
//   shrine hall used as the shelter) on the east bank. Pine forest frames the village.

const W = 56, H = 40;
const props = [];
const add = p => props.push(p);

// --- Forest border (pines), leaving gaps only where the map is closed by water.
for (let x = 1; x < W; x += 2) { add({ t: 'pine', x: x + (x % 4 ? 0.3 : 0), y: 2 }); add({ t: 'pine', x, y: 40 }); }
for (let y = 4; y < H; y += 2) { add({ t: 'pine', x: 1, y }); add({ t: 'pine', x: 55, y }); }
for (const [x, y] of [[3, 4], [5, 3.6], [12, 3.8], [22, 4], [30, 3.7], [34, 4.2], [3, 38], [8, 37.6], [13, 38.2], [34, 37.8], [43, 38], [48, 37], [52, 36], [53, 30], [52, 23.5], [42, 34], [45, 31.5]]) add({ t: 'pine', x, y });

// --- Buildings (x, y = top-left of the roof in tiles)
add({ t: 'house', id: 'clinic', x: 4, y: 6, w: 7, roof: 3, wall: 2, door: 3, windows: [1, 5], lanterns: [2, 4], sign: { x: 1 }, noren: '#f2f0e6', roofTile: 12, wallTile: 18 });
add({ t: 'house', id: 'shop', x: 14, y: 6, w: 6, roof: 3, wall: 2, door: 2, windows: [0, 4], lanterns: [1, 4], noren: '#7a1f2b', roofTile: 13, wallTile: 19 });
add({ t: 'house', id: 'inn', x: 23, y: 6, w: 8, roof: 3, wall: 2, door: 4, windows: [1, 2, 6], lanterns: [3, 5], noren: '#2a3a6a', roofTile: 14, wallTile: 18 });
add({ t: 'house', id: 'house_sw', x: 4, y: 27, w: 7, roof: 3, wall: 2, door: 3, windows: [1, 5], lanterns: [3], roofTile: 15, wallTile: 22 });
add({ t: 'house', id: 'house_w', x: 4, y: 17, w: 5, roof: 2, wall: 2, door: 2, windows: [0, 4], roofTile: 16, wallTile: 19 });
add({ t: 'house', id: 'mill', x: 43, y: 25, w: 7, roof: 3, wall: 2, door: 2, windows: [5], lanterns: [2], roofTile: 17, wallTile: 21 });
add({ t: 'house', id: 'shrine_hall', x: 42, y: 3, w: 10, roof: 3, wall: 2, door: 4.5, windows: [1, 2, 7, 8], lanterns: [3, 6], noren: '#f2f0e6', roofTile: 14, wallTile: 22 });

// --- Festival square
add({ t: 'yagura', x: 21.5, y: 17.5 });
add({ t: 'stall', x: 15, y: 16.5, color: '#b0302a' });
add({ t: 'stall', id: 'stall_shrine', x: 27, y: 16.5, color: '#2a4a8a' });
add({ t: 'lanternPost', x: 12.6, y: 14.8 });
add({ t: 'lanternPost', x: 31.4, y: 14.8 });
add({ t: 'lanternPost', id: 'lamp_plaza', x: 12.6, y: 25.6 });
add({ t: 'lanternPost', id: 'lamp_southeast', x: 31.4, y: 25.6 });
add({ t: 'lanternPost', id: 'lamp_bridge', x: 35, y: 17.4 });
add({ t: 'maple', x: 3.2, y: 13.5 });
add({ t: 'maple', x: 11.5, y: 12.4 });
add({ t: 'bush', x: 13.5, y: 12.6 }); add({ t: 'bush', x: 21, y: 12.6 }); add({ t: 'bush', x: 31.8, y: 12.6 });

// --- Lower square
add({ t: 'well', x: 26, y: 33 });
add({ t: 'barrel', x: 18.4, y: 33.2 }); add({ t: 'barrel', x: 19.1, y: 33.6 }); add({ t: 'barrel', x: 18.6, y: 34.3 });
add({ t: 'lanternPost', x: 16.4, y: 29.4 }); add({ t: 'lanternPost', x: 32, y: 36.2 });
add({ t: 'stoneLantern', x: 23, y: 36.4 });
add({ t: 'fence', x: 13, y: 37, len: 4 });

// --- River crossing and shrine hill
add({ t: 'bridge', x: 35, y: 18, w: 7, h: 3 });
add({ t: 'stairs', x: 45, y: 10, w: 3, h: 4 });
add({ t: 'torii', x: 46.5, y: 15.2 });
add({ t: 'stoneLantern', x: 43.6, y: 15 }); add({ t: 'stoneLantern', x: 49.4, y: 15 });
add({ t: 'stoneLantern', x: 42.5, y: 9.6 }); add({ t: 'stoneLantern', x: 51.5, y: 9.6 });
add({ t: 'maple', x: 41.5, y: 13 }); add({ t: 'maple', x: 52, y: 13.4 });
add({ t: 'lanternPost', x: 42.6, y: 21.8 });
add({ t: 'bush', x: 50, y: 21 }); add({ t: 'bush', x: 52, y: 19 }); add({ t: 'bush', x: 41.5, y: 30 });

export const EMBERFALL = {
  id: 'emberfall',
  name: 'Emberfall',
  w: W,
  h: H,
  base: 'grass',
  ground: [
    { k: 'moss', rect: [0, 0, W, 3] }, { k: 'moss', rect: [0, 37, W, 3] },
    { k: 'moss', rect: [0, 0, 2, H] }, { k: 'moss', rect: [54, 0, 2, H] },
    // north street
    { k: 'dirt', rect: [2, 11, 33, 3] },
    // festival square
    { k: 'cobble', rect: [12, 14, 20, 12] },
    // west lane to the small house
    { k: 'path', line: [[12, 20], [6, 21]], w: 2 },
    // to the lower square
    { k: 'path', rect: [21, 26, 3, 3] },
    { k: 'cobble', rect: [15, 29, 18, 8] },
    // east road to the bridge
    { k: 'cobble', rect: [32, 18, 4, 3] },
    // river (shallow banks, deep middle)
    { k: 'shallow', rect: [36, 0, 1, H] }, { k: 'water', rect: [37, 0, 3, H] }, { k: 'shallow', rect: [40, 0, 1, H] },
    // east bank paths: bridge -> torii -> stairs -> shrine plaza; bridge -> mill
    { k: 'path', rect: [41, 18, 7, 3] },
    { k: 'path', rect: [45, 14, 3, 5] },
    { k: 'flag', rect: [41, 8, 13, 2] },
    { k: 'path', line: [[44, 21], [45, 30]], w: 2 },
  ],
  props,
  moon: { x: 1500, y: -200 },
  spawns: { start: { x: 22 * 32, y: 22 * 32, facing: 'up' } },
  locations: [
    { name: 'Emberfall — Festival Square', poly: [[384, 448], [1024, 448], [1024, 832], [384, 832]] },
    { name: 'Emberfall — Clinic Street', poly: [[64, 320], [1120, 320], [1120, 448], [64, 448]] },
    { name: 'Emberfall — Lower Square', poly: [[448, 832], [1088, 832], [1088, 1200], [448, 1200]] },
    { name: 'Emberfall — Red Bridge', poly: [[1088, 544], [1344, 544], [1344, 672], [1088, 672]] },
    { name: 'Emberfall — Shrine Hill', poly: [[1312, 64], [1760, 64], [1760, 544], [1312, 544]] },
  ],
};
