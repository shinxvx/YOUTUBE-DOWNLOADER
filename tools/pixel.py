"""Tiny pixel-art toolkit used by gen_art.py.

Shapes are drawn as separate parts. Each part gets GBA-style treatment:
a light rim on the upper-left, a shade rim on the lower-right, and a dark
outline where it borders transparency.
"""
from PIL import Image, ImageDraw
import random


def hexrgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def mix(c1, c2, t):
    return tuple(int(round(c1[i] * (1 - t) + c2[i] * t)) for i in range(3)) + (255,)


def darker(c, t=0.35):
    return mix(c, (20, 16, 40, 255), t)


def lighter(c, t=0.35):
    return mix(c, (255, 250, 230, 255), t)


class Sprite:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        # which part id owns each pixel (for outlines between parts)
        self.owner = [[-1] * w for _ in range(h)]
        self.parts = 0

    def _mask(self):
        return Image.new('L', (self.w, self.h), 0)

    def part(self, draw_fn, color, shade=True, light=True, outline=None, rim=1):
        """draw_fn(ImageDraw) paints white on a mask; the part is then colored."""
        m = self._mask()
        draw_fn(ImageDraw.Draw(m))
        self.apply_mask(m, color, shade, light, outline, rim)
        return m

    def apply_mask(self, m, color, shade=True, light=True, outline=None, rim=1):
        color = hexrgb(color) if isinstance(color, str) else color
        dk = darker(color, 0.38)
        lt = lighter(color, 0.38)
        px = m.load()
        w, h = self.w, self.h
        inside = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y] > 127
        pid = self.parts
        self.parts += 1
        out = self.img.load()
        for y in range(h):
            for x in range(w):
                if not inside(x, y):
                    continue
                c = color
                if shade and any(not inside(x + d, y + d) for d in range(1, rim + 2)):
                    c = dk
                elif light and any(not inside(x - d, y - d) for d in range(1, rim + 1)):
                    c = lt
                out[x, y] = c
                self.owner[y][x] = pid
        if outline:
            oc = hexrgb(outline) if isinstance(outline, str) else outline
            edge = []
            for y in range(h):
                for x in range(w):
                    if inside(x, y):
                        continue
                    if any(inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                        edge.append((x, y))
            for x, y in edge:
                if out[x, y][3] == 0 or self.owner[y][x] != -1:
                    out[x, y] = oc
                    self.owner[y][x] = pid

    def flat(self, draw_fn, color):
        """Unshaded detail (eyes, marks)."""
        m = self._mask()
        draw_fn(ImageDraw.Draw(m))
        c = hexrgb(color) if isinstance(color, str) else color
        px = m.load()
        out = self.img.load()
        for y in range(self.h):
            for x in range(self.w):
                if px[x, y] > 127:
                    out[x, y] = c

    def dot(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.img.load()[x, y] = hexrgb(color) if isinstance(color, str) else color

    def outline_all(self, color='#1a1426'):
        """Closing outline around the whole silhouette."""
        oc = hexrgb(color)
        src = self.img.copy().load()
        out = self.img.load()
        for y in range(self.h):
            for x in range(self.w):
                if src[x, y][3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h and src[nx, ny][3]:
                        out[x, y] = oc
                        break

    def save(self, path, scale=1):
        im = self.img
        if scale != 1:
            im = im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        im.save(path)


def ell(cx, cy, rx, ry):
    return lambda d: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)


def poly(*pts):
    return lambda d: d.polygon(list(pts), fill=255)


def rect(x0, y0, x1, y1):
    return lambda d: d.rectangle([x0, y0, x1, y1], fill=255)


def combo(*fns):
    def f(d):
        for fn in fns:
            fn(d)
    return f


def dither_rect(img, x0, y0, x1, y1, c1, c2, rng=None, density=0.5):
    px = img.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if 0 <= x < img.width and 0 <= y < img.height:
                if (x + y) % 2 == 0 and (rng is None or rng.random() < density * 2):
                    px[x, y] = c2
                else:
                    px[x, y] = c1
