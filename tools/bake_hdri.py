"""Bake the dawn HDRI (assets-src/hdri/*.exr) into game-ready assets.

Outputs (public/assets/sky/):
  dawn_panorama.png        tone-mapped sky band (upper hemisphere to just below the horizon)
  dawn_light.json          image-based lighting values (sun/sky/horizon colours, sun position)

Requires: pip install openexr numpy pillow
Run:      python3 tools/bake_hdri.py
"""
import json
import os

import numpy as np
import OpenEXR
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets-src/hdri/citrus_orchard_puresky_2k.exr')
OUT = os.path.join(ROOT, 'public/assets/sky')
os.makedirs(OUT, exist_ok=True)

hdr = OpenEXR.File(SRC).channels()['RGB'].pixels[..., :3].astype(np.float32)
H, W, _ = hdr.shape
lum = hdr @ np.array([0.2126, 0.7152, 0.0722], np.float32)
sun_y, sun_x = np.unravel_index(np.argmax(lum), lum.shape)
horizon = H // 2


def aces(x):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)


def to_srgb(lin):
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)


# Dawn grade: warm the low sun, cool the zenith slightly.
rows = np.linspace(0, 1, H)[:, None, None]
warm = np.array([1.20, 0.92, 0.72], np.float32)
cool = np.array([0.95, 0.98, 1.06], np.float32)
grade = cool + (warm - cool) * np.clip((rows - 0.15) / 0.35, 0, 1)
exposure = 0.56
ldr = to_srgb(aces(hdr * exposure * grade))

# 1) Panorama band: from high clouds to a little under the horizon.
top, bottom = int(H * 0.12), int(horizon + H * 0.05)
pano = (ldr[top:bottom] * 255).astype(np.uint8)
Image.fromarray(pano).save(os.path.join(OUT, 'dawn_panorama.png'), optimize=True)

# 3) Image-based lighting values.
def avg(region):
    c = region.reshape(-1, 3).mean(0)
    return '#%02x%02x%02x' % tuple(int(min(1, v) * 255) for v in c)

r = 20
light = {
    'source': 'citrus_orchard_puresky_2k.exr (Poly Haven, CC0)',
    'sunColor': avg(ldr[sun_y - r:sun_y + r, sun_x - r:sun_x + r]),
    'skyColor': avg(ldr[:int(H * 0.3)]),
    'horizonColor': avg(ldr[horizon - 40:horizon, sun_x - 300:sun_x + 300]),
    'sunU': float(sun_x / W),
    'sunElevationDeg': float((horizon - sun_y) / H * 180),
    'panorama': {'width': int(pano.shape[1]), 'height': int(pano.shape[0]), 'sunX': int(sun_x), 'sunY': int(sun_y - top)},
    'exposure': exposure,
}
with open(os.path.join(OUT, 'dawn_light.json'), 'w') as f:
    json.dump(light, f, indent=2)
print(json.dumps(light, indent=2))
