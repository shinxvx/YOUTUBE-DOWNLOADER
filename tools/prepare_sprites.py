"""Prepare runtime sprite sheets from the Vampire Hunters art pack (public/assets/vh).

The pack's files are never modified; output goes to public/assets/vh/gen/ with gen_manifest.json.

1) Battle sheets: in the prepared sheets many poses spill past their 128/96 px cell (sword arcs,
   Garran's lantern, Veyr's ribbons), so cutting on the grid chops them. Here every opaque
   connected component is re-assigned to the frame whose body it belongs to, and each frame is
   rebuilt in a larger padded cell. The original bottom-centre anchor is preserved.

2) Walking sheets: each atlas frame is rebuilt in its source frame, then re-aligned so the feet
   sit on one baseline and the head stays centred (removes jitter between frames and between
   directions), and downscaled with a high-quality filter into uniform 3x4 cells.

Run: python3 tools/prepare_sprites.py   (needs pillow, numpy, scipy)
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(ROOT, 'public/assets/vh')
OUT = os.path.join(PACK, 'gen')
os.makedirs(OUT, exist_ok=True)
manifest = json.load(open(os.path.join(PACK, 'manifest.json')))

WALK_CELL = 192          # 4x the logical 48 px footprint
WALK_BASELINE = 184      # feet line inside the walking cell
ALPHA = 24

gen = {'battle': {}, 'walk': {}}


def recut_battle(asset):
    img = np.asarray(Image.open(os.path.join(PACK, asset['path'])).convert('RGBA'))
    H, W = img.shape[:2]
    cw, ch, cols, rows = asset['frameWidth'], asset['frameHeight'], asset['columns'], asset['rows']
    mask = img[..., 3] > ALPHA
    labels, n = ndimage.label(mask, structure=np.ones((3, 3)))
    sizes = ndimage.sum(mask, labels, index=np.arange(1, n + 1))
    count = asset['frameCount'] if 'frameCount' in asset else cols * rows

    cell_of = lambda i: ((i % cols) * cw, (i // cols) * ch)
    # Anchor body of each cell: the component with the most pixels inside the cell.
    anchors = {}
    for i in range(count):
        x0, y0 = cell_of(i)
        sub = labels[y0:y0 + ch, x0:x0 + cw]
        ids, cnt = np.unique(sub[sub > 0], return_counts=True)
        if len(ids):
            anchors[i] = int(ids[np.argmax(cnt)])
    owners = {}
    for i, lab in anchors.items():
        owners.setdefault(lab, []).append(i)
    shared = {lab for lab, cells in owners.items() if len(cells) > 1}

    # Edge-to-edge distance from every pixel to each anchor body (local windows keep it fast).
    anim_of = {}
    for name, clip in asset['animations'].items():
        for f in clip['frames']:
            anim_of[f] = name
    dist = {}
    for i, lab in anchors.items():
        dist[i] = ndimage.distance_transform_edt(labels != lab)
    centers = ndimage.center_of_mass(mask, labels, index=np.arange(1, n + 1))

    assign = {}
    for lab in range(1, n + 1):
        if lab in shared:
            continue
        if lab in owners:
            assign[lab] = owners[lab][0]
            continue
        comp = labels == lab
        cy, cx = centers[lab - 1]
        best, bd = None, 1e18
        for i in anchors:
            d = dist[i][comp].min()
            gx, gy = cell_of(i)
            if gx <= cx < gx + cw and gy <= cy < gy + ch:
                d -= 4  # mild preference for the cell the piece sits in
            if d < bd:
                bd, best = d, i
        # Loose chunks floating away from a resting pose are generation artefacts:
        # in idle/hurt loops they flicker, so drop them.
        if anim_of.get(best) in ('idle', 'hurt', 'defeat', 'knockout') and bd > 12 and sizes[lab - 1] > 20:
            continue
        assign[lab] = best

    # Padding large enough for every frame's spill.
    frames = []
    for i in range(count):
        x0, y0 = cell_of(i)
        sel = np.zeros_like(mask)
        for lab, cell in assign.items():
            if cell == i:
                sel |= labels == lab
        # Components shared by two anchors are split along the grid.
        for lab in shared:
            part = labels == lab
            part[:, :x0] = False; part[:, x0 + cw:] = False; part[:y0, :] = False; part[y0 + ch:, :] = False
            sel |= part
        frames.append((x0, y0, sel))
    pad_l = pad_r = pad_t = 0
    for x0, y0, sel in frames:
        ys, xs = np.nonzero(sel)
        if len(xs) == 0:
            continue
        pad_l = max(pad_l, x0 - xs.min())
        pad_r = max(pad_r, xs.max() + 1 - (x0 + cw))
        pad_t = max(pad_t, y0 - ys.min())
    pad_x = int(np.ceil(max(pad_l, pad_r) / 8) * 8)
    pad_t = int(np.ceil(pad_t / 8) * 8)
    ncw, nch = cw + 2 * pad_x, ch + pad_t
    sheet = np.zeros((rows * nch, cols * ncw, 4), np.uint8)
    for i, (x0, y0, sel) in enumerate(frames):
        ys, xs = np.nonzero(sel)
        if len(xs) == 0:
            continue
        cx, cy = (i % cols) * ncw, (i // cols) * nch
        nx = xs - x0 + pad_x + cx
        ny = ys - y0 + pad_t + cy
        ok = (nx >= cx) & (nx < cx + ncw) & (ny >= cy) & (ny < cy + nch)
        sheet[ny[ok], nx[ok]] = img[ys[ok], xs[ok]]
    name = f"{asset['id']}.png"
    Image.fromarray(sheet).save(os.path.join(OUT, name), optimize=True)
    gen['battle'][asset['id']] = {
        'path': f'gen/{name}', 'frameWidth': ncw, 'frameHeight': nch,
        # Original bottom-centre anchor inside the padded cell.
        'originX': 0.5, 'originY': 1.0,
        'pad': {'x': pad_x, 'top': pad_t}, 'columns': cols, 'rows': rows,
    }
    return pad_x, pad_t


def prepare_walk(asset):
    src = Image.open(os.path.join(PACK, asset['path'])).convert('RGBA')
    atlas = json.load(open(os.path.join(PACK, asset['atlasPath'])))
    fw = asset['frameWidth']
    full = []
    for k in range(12):
        f = atlas['frames'][str(k)]
        r, s = f['frame'], f['spriteSourceSize']
        canvas = Image.new('RGBA', (fw, fw), (0, 0, 0, 0))
        canvas.alpha_composite(src.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), (s['x'], s['y']))
        full.append(np.asarray(canvas))
    # Per-frame metrics.
    def metrics(a):
        m = a[..., 3] > ALPHA
        ys, xs = np.nonzero(m)
        top, bottom = ys.min(), ys.max()
        head = m[top:top + max(8, int((bottom - top) * 0.38))]
        hy, hx = np.nonzero(head)
        return bottom, hx.mean() if len(hx) else xs.mean(), bottom - top
    mets = [metrics(a) for a in full]
    # Scale: tallest idle pose maps to the cell; keeps every frame the same scale.
    tallest = max(m[2] for m in mets)
    scale = (WALK_BASELINE - 6) / tallest
    cells = Image.new('RGBA', (WALK_CELL * 3, WALK_CELL * 4), (0, 0, 0, 0))
    for k, a in enumerate(full):
        bottom, headx, _ = mets[k]
        dir_row = k // 3
        idle_bottom = mets[dir_row * 3][0]
        im = Image.fromarray(a)
        nw = max(1, round(fw * scale))
        small = im.resize((nw, nw), Image.LANCZOS)
        # Feet: walking frames keep their small natural bob relative to the idle pose.
        bob = (bottom - idle_bottom) * scale
        bob = max(-3, min(3, bob))
        ox = round(WALK_CELL / 2 - headx * scale)
        oy = round(WALK_BASELINE + bob - bottom * scale)
        cx, cy = (k % 3) * WALK_CELL, dir_row * WALK_CELL
        layer = Image.new('RGBA', cells.size, (0, 0, 0, 0))
        layer.paste(small, (cx + ox, cy + oy), small)
        # Clip to the cell so neighbours never bleed.
        clip = Image.new('L', cells.size, 0)
        clip.paste(255, (cx, cy, cx + WALK_CELL, cy + WALK_CELL))
        layer.putalpha(Image.fromarray(np.minimum(np.asarray(layer)[..., 3], np.asarray(clip))))
        cells.alpha_composite(layer)
    name = f"{asset['id']}.png"
    cells.save(os.path.join(OUT, name), optimize=True)
    gen['walk'][asset['id']] = {
        'path': f'gen/{name}', 'frameWidth': WALK_CELL, 'frameHeight': WALK_CELL,
        'originX': 0.5, 'originY': WALK_BASELINE / WALK_CELL, 'logical': 48,
    }


for a in manifest['sprites']:
    if a['loadMethod'] == 'atlas':
        prepare_walk(a)
    else:
        px, pt = recut_battle(a)
        print(f"battle {a['id']:28s} pad x{px} top{pt}")
json.dump(gen, open(os.path.join(OUT, 'gen_manifest.json'), 'w'), indent=1)
print('walk sheets:', len(gen['walk']), 'battle sheets:', len(gen['battle']))
