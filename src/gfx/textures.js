// Small generated textures for lighting, particles and effects (original, procedural).

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  scene.textures.addCanvas(key, c);
}

function radial(g, w, h, stops) {
  const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  for (const [o, c] of stops) grd.addColorStop(o, c);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

export function makeTextures(scene) {
  canvasTex(scene, 'px', 2, 2, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 2, 2); });

  // Soft light falloff used by the lighting layer.
  canvasTex(scene, 'light', 256, 256, (g, w, h) => radial(g, w, h, [
    [0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.75)'], [0.55, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)'],
  ]));
  canvasTex(scene, 'glow', 64, 64, (g, w, h) => radial(g, w, h, [
    [0, 'rgba(255,255,255,0.95)'], [0.3, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)'],
  ]));
  canvasTex(scene, 'spark', 8, 8, (g) => {
    g.fillStyle = '#fff'; g.fillRect(3, 0, 2, 8); g.fillRect(0, 3, 8, 2);
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(2, 2, 4, 4);
  });
  canvasTex(scene, 'mote', 4, 4, (g) => { g.fillStyle = '#fff'; g.fillRect(1, 0, 2, 4); g.fillRect(0, 1, 4, 2); });
  canvasTex(scene, 'shadow', 40, 14, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.7, 'rgba(0,0,0,0.3)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(1, 0, 0, h / w, 0, 0);
    g.fillStyle = grd; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); g.fill();
  });

  // Tileable fog: soft blobs wrapped around the edges.
  canvasTex(scene, 'fog', 256, 256, (g, w, h) => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 60; i++) {
      const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 50;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
        const grd = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grd.addColorStop(0, 'rgba(255,255,255,0.10)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
  });

  // Slash arc for battle impacts.
  canvasTex(scene, 'slash', 160, 160, (g, w, h) => {
    g.translate(w / 2, h / 2);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.08 + i * 0.06})`;
      g.lineWidth = 2 + (14 - i) * 0.9;
      g.beginPath();
      g.arc(0, 0, 60 - i * 0.8, -Math.PI * 0.85, -Math.PI * 0.15);
      g.stroke();
    }
  });

  // Ring used for Veil/flame bursts.
  canvasTex(scene, 'ring', 128, 128, (g, w, h) => {
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6;
    g.beginPath(); g.arc(w / 2, h / 2, 56, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 12;
    g.beginPath(); g.arc(w / 2, h / 2, 50, 0, Math.PI * 2); g.stroke();
  });

  // Pixel-art blood anchor lantern (temporary procedural art, see ASSETS.md).
  canvasTex(scene, 'anchor_lantern', 40, 64, (g) => {
    const P = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x * 2, y * 2, w * 2, h * 2); };
    P('#2b1d14', 9, 0, 2, 5);            // hanging cord
    P('#5a3b1e', 5, 5, 10, 2);           // cap
    P('#3a2614', 6, 7, 8, 1);
    P('#4a1010', 5, 8, 10, 15);          // glass body
    P('#8c1a1a', 6, 9, 8, 13);
    P('#d23434', 7, 11, 6, 9);
    P('#ff7a5a', 8, 13, 4, 5);           // blood flame core
    P('#ffd2b0', 9, 14, 2, 2);
    P('#5a3b1e', 5, 23, 10, 2);          // base
    P('#3a2614', 7, 25, 6, 2);
    P('#2b1d14', 9, 27, 2, 4);           // tassel
    P('#7a1515', 8, 29, 4, 2);
    // frame bars
    P('#3a2614', 5, 8, 1, 15); P('#3a2614', 14, 8, 1, 15); P('#3a2614', 9, 8, 2, 15);
  });

  // Interaction marker.
  canvasTex(scene, 'marker', 12, 14, (g) => {
    g.fillStyle = '#f0d79a';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(12, 0); g.lineTo(6, 8); g.closePath(); g.fill();
    g.fillStyle = '#7a5a20';
    g.fillRect(5, 10, 2, 2);
  });

  // Vignette for battle and cinematic framing.
  canvasTex(scene, 'vignette', 512, 288, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.85)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });

  // Vertical sky gradient (dawn) used as additive warm wash.
  canvasTex(scene, 'dawnwash', 4, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,170,90,0.55)');
    grd.addColorStop(0.5, 'rgba(255,200,140,0.18)');
    grd.addColorStop(1, 'rgba(255,220,180,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}

// Overlay drawn on top of Kai's portrait to show the seal's growth by stage.
// Kai's left shoulder is on the viewer's right.
export function makeMarkOverlays(scene) {
  const veins = [
    [], // stage 0: the painted mark only
    [[[200, 200], [214, 182], [226, 170], [244, 160]], [[205, 214], [222, 222], [240, 236], [254, 246]]],
    [[[190, 175], [180, 160], [174, 146]], [[244, 160], [252, 150], [256, 140]], [[160, 230], [140, 238], [120, 248]]],
    [[[174, 146], [168, 132], [166, 118]], [[120, 248], [100, 254]], [[200, 200], [180, 200], [160, 206]]],
  ];
  for (let stage = 1; stage <= 3; stage++) {
    canvasTex(scene, `mark_overlay_${stage}`, 256, 256, (g) => {
      g.lineCap = 'round';
      for (let s = 1; s <= stage; s++) {
        for (const path of veins[s]) {
          for (const [lw, a] of [[7, 0.18], [3, 0.55], [1.4, 0.95]]) {
            g.strokeStyle = `rgba(190,130,255,${a})`;
            g.lineWidth = lw;
            g.beginPath();
            g.moveTo(path[0][0], path[0][1]);
            for (const [x, y] of path.slice(1)) g.lineTo(x, y);
            g.stroke();
          }
        }
      }
      const grd = g.createRadialGradient(212, 205, 0, 212, 205, 60);
      grd.addColorStop(0, `rgba(170,110,255,${0.12 * stage})`);
      grd.addColorStop(1, 'rgba(170,110,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    });
  }
}
