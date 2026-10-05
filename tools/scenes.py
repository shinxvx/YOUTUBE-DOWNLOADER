"""Placeholder location backgrounds and the Aster Island map.

Everything is painted at 240x160 (GBA-like density) and saved 2x (480x320).
"""
import math
import random
from PIL import Image, ImageDraw
from pixel import hexrgb, mix, darker, lighter

W, H = 240, 160
OUT = hexrgb('#1a1426')


class Canvas:
    def __init__(self, w=W, h=H, bg='#000000'):
        self.img = Image.new('RGBA', (w, h), hexrgb(bg))
        self.d = ImageDraw.Draw(self.img)
        self.px = self.img.load()
        self.w, self.h = w, h

    def c(self, col):
        return hexrgb(col) if isinstance(col, str) else col

    def rect(self, x0, y0, x1, y1, col, outline=None):
        self.d.rectangle([x0, y0, x1, y1], fill=self.c(col), outline=self.c(outline) if outline else None)

    def poly(self, pts, col, outline=None):
        self.d.polygon(pts, fill=self.c(col), outline=self.c(outline) if outline else None)

    def ell(self, cx, cy, rx, ry, col, outline=None):
        self.d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=self.c(col), outline=self.c(outline) if outline else None)

    def line(self, pts, col, w=1):
        self.d.line(pts, fill=self.c(col), width=w)

    def dot(self, x, y, col):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = self.c(col)

    def gradient(self, y0, y1, c0, c1, bands=8):
        a, b = self.c(c0), self.c(c1)
        for i in range(bands):
            ya = y0 + (y1 - y0) * i // bands
            yb = y0 + (y1 - y0) * (i + 1) // bands
            self.rect(0, ya, self.w, yb, mix(a, b, i / max(1, bands - 1)))

    def dither(self, x0, y0, x1, y1, c1, c2, step=2):
        a, b = self.c(c1), self.c(c2)
        for y in range(y0, y1):
            for x in range(x0, x1):
                if 0 <= x < self.w and 0 <= y < self.h:
                    self.px[x, y] = b if (x // step + y // step) % 2 == 0 and (x + y) % 2 == 0 else a

    def save(self, path):
        self.img.resize((self.w * 2, self.h * 2), Image.NEAREST).save(path)


# ------------------------------------------------------------------ pieces

def sky(cv, top='#78b8f0', bottom='#c8e8ff', horizon=70):
    cv.gradient(0, horizon, top, bottom, 6)


def clouds(cv, rng, n=4, y=(8, 40)):
    for _ in range(n):
        x = rng.randint(0, cv.w)
        yy = rng.randint(*y)
        for k in range(3):
            cv.ell(x + k * 8, yy - (k == 1) * 3, 8, 4, '#ffffff')
        cv.rect(x - 4, yy + 2, x + 22, yy + 4, '#e8f0ff')


def sea(cv, y0, y1, rng, col='#3a8ad8'):
    cv.gradient(y0, y1, lighter(hexrgb(col), 0.2), darker(hexrgb(col), 0.2), 4)
    for _ in range((y1 - y0) * 3):
        x = rng.randint(0, cv.w - 6)
        y = rng.randint(y0, y1 - 1)
        cv.line([(x, y), (x + rng.randint(2, 5), y)], '#bfe8ff')


def tree(cv, x, y, r=10, col='#3a8a3a'):
    cv.rect(x - 2, y, x + 1, y + r, '#6a4a2a', outline='#3a2414')
    cv.ell(x, y - r // 3, r, r - 2, darker(hexrgb(col), 0.3))
    cv.ell(x - 1, y - r // 3 - 1, r - 1, r - 3, col)
    cv.ell(x - r // 3, y - r // 2 - 1, r // 2, r // 3, lighter(hexrgb(col), 0.3))


def pine(cv, x, y, h=18, col='#2a6a3a'):
    cv.rect(x - 1, y, x + 1, y + 4, '#5a3a1a')
    for i in range(3):
        w = h // 2 - i * 2
        yy = y - i * (h // 4)
        cv.poly([(x - w, yy), (x, yy - h // 2), (x + w, yy)], col if i % 2 == 0 else lighter(hexrgb(col), 0.15), outline=OUT)


def building(cv, x0, y0, x1, y1, wall='#e8dcc0', roof='#c0503a', windows=True, door=True, roof_h=12):
    cv.rect(x0, y0, x1, y1, wall, outline=OUT)
    cv.rect(x0 + 1, y1 - 3, x1 - 1, y1 - 1, darker(hexrgb(wall), 0.2))
    cv.poly([(x0 - 4, y0), ((x0 + x1) // 2, y0 - roof_h), (x1 + 4, y0)], roof, outline=OUT)
    cv.line([(x0 - 2, y0 - 1), (x1 + 2, y0 - 1)], darker(hexrgb(roof), 0.3))
    if windows:
        for wx in range(x0 + 5, x1 - 6, 12):
            for wy in range(y0 + 5, y1 - 14, 12):
                cv.rect(wx, wy, wx + 5, wy + 6, '#5a8ac8', outline=OUT)
                cv.dot(wx + 1, wy + 1, '#c8e8ff')
    if door:
        mx = (x0 + x1) // 2
        cv.rect(mx - 4, y1 - 12, mx + 4, y1, '#7a4a2a', outline=OUT)
        cv.dot(mx + 2, y1 - 6, '#ffd65a')


def floor_tiles(cv, y0, c1='#c8b490', c2='#b0a078', size=12):
    for y in range(y0, cv.h, size // 2):
        off = (y // (size // 2)) % 2 * (size // 2)
        for x in range(-size, cv.w + size, size):
            cv.rect(x + off, y, x + off + size - 1, y + size // 2 - 1, c1 if ((x + off) // size + y) % 2 else c2)
            cv.line([(x + off, y), (x + off + size - 1, y)], darker(hexrgb(c1), 0.15))


def wall_bg(cv, y1, col='#e8dcc0', trim='#8a6a4a'):
    cv.rect(0, 0, cv.w, y1, col)
    cv.rect(0, y1 - 6, cv.w, y1, trim)
    for x in range(0, cv.w, 24):
        cv.line([(x, 0), (x, y1 - 7)], darker(hexrgb(col), 0.06))


def window_big(cv, x, y, w, h, sky_top='#78b8f0', sky_bottom='#c8e8ff'):
    cv.rect(x - 2, y - 2, x + w + 2, y + h + 2, '#6a4a2a', outline=OUT)
    for i in range(4):
        cv.rect(x, y + h * i // 4, x + w, y + h * (i + 1) // 4, mix(hexrgb(sky_top), hexrgb(sky_bottom), i / 3))
    cv.line([(x + w // 2, y), (x + w // 2, y + h)], '#6a4a2a', 2)
    cv.line([(x, y + h // 2), (x + w, y + h // 2)], '#6a4a2a', 2)


def shelf(cv, x, y, w, rng):
    cv.rect(x, y, x + w, y + 3, '#7a4a2a', outline=OUT)
    bx = x + 2
    while bx < x + w - 4:
        bw = rng.randint(3, 5)
        bh = rng.randint(8, 12)
        col = rng.choice(['#c0503a', '#3a6ab0', '#4a8a3a', '#e0b040', '#8a4ab0', '#e8dcc0'])
        cv.rect(bx, y - bh, bx + bw - 1, y - 1, col, outline=OUT)
        bx += bw + 1


# ------------------------------------------------------------------ locations

def dorm(rng):
    cv = Canvas()
    wall_bg(cv, 100, '#e8d8c0', '#9a7a5a')
    window_big(cv, 150, 20, 60, 46)
    floor_tiles(cv, 100, '#c8a078', '#b08a64', 16)
    # bed
    cv.rect(20, 80, 100, 118, '#e8e8f0', outline=OUT)
    cv.rect(20, 92, 100, 118, '#5a8ac8', outline=OUT)
    cv.rect(22, 82, 44, 92, '#ffffff', outline=OUT)
    cv.rect(16, 70, 22, 120, '#7a4a2a', outline=OUT)
    # desk & save journal
    cv.rect(120, 80, 170, 86, '#8a5a32', outline=OUT)
    cv.rect(124, 86, 128, 112, '#6a4022', outline=OUT)
    cv.rect(162, 86, 166, 112, '#6a4022', outline=OUT)
    cv.rect(138, 72, 154, 80, '#c0503a', outline=OUT)
    cv.rect(140, 73, 152, 74, '#ffd65a')
    shelf(cv, 30, 40, 60, rng)
    cv.ell(200, 106, 10, 5, '#e0b040', outline=OUT)  # rug
    return cv


def plaza(rng):
    cv = Canvas()
    sky(cv, '#70b0f0', '#d0ecff', 64)
    clouds(cv, rng, 4)
    building(cv, 10, 30, 80, 80, '#f0e4c8', '#3a6ab0')
    building(cv, 160, 34, 230, 80, '#f0e4c8', '#c0503a')
    building(cv, 92, 18, 148, 80, '#e8e0f0', '#5a4ab0', roof_h=16)
    cv.rect(116, 0, 124, 18, '#e8e0f0', outline=OUT)
    cv.ell(120, 8, 5, 5, '#ffffff', outline=OUT)  # clock
    cv.line([(120, 8), (120, 5)], OUT)
    cv.line([(120, 8), (122, 8)], OUT)
    floor_tiles(cv, 80, '#d8c8a0', '#c8b488', 14)
    # fountain
    cv.ell(120, 112, 34, 12, '#9aa0b0', outline=OUT)
    cv.ell(120, 110, 28, 8, '#5ab0f0')
    cv.rect(116, 88, 124, 108, '#b8bcc8', outline=OUT)
    cv.ell(120, 88, 10, 4, '#b8bcc8', outline=OUT)
    for dx in (-6, 0, 6):
        cv.line([(120 + dx, 84), (120 + dx * 2, 96)], '#bfe8ff')
    for x in (30, 210):
        tree(cv, x, 96, 12)
    # notice board
    cv.rect(58, 92, 84, 112, '#8a5a32', outline=OUT)
    for i, col in enumerate(['#ffffff', '#ffe8a0', '#c8e8ff']):
        cv.rect(61 + i * 7, 95, 66 + i * 7, 104, col, outline=OUT)
    return cv


def classroom(rng):
    cv = Canvas()
    wall_bg(cv, 104, '#e0e8d8', '#6a8a5a')
    cv.rect(40, 14, 200, 70, '#2a5a3a', outline='#7a4a2a')  # board
    cv.rect(38, 70, 202, 74, '#7a4a2a', outline=OUT)
    for i, txt in enumerate(range(5)):
        cv.line([(50, 24 + i * 9), (50 + rng.randint(40, 120), 24 + i * 9)], '#e8f0e0')
    cv.ell(170, 40, 12, 12, '#2a5a3a', outline='#e8f0e0')  # affinity circle
    floor_tiles(cv, 104, '#b89870', '#a88860', 16)
    for row in range(2):
        for col in range(4):
            x = 20 + col * 56 + row * 8
            y = 112 + row * 22
            cv.rect(x, y, x + 36, y + 6, '#9a6a3a', outline=OUT)
            cv.rect(x + 2, y + 6, x + 4, y + 16, '#6a4022')
            cv.rect(x + 32, y + 6, x + 34, y + 16, '#6a4022')
    return cv


def arena(rng):
    cv = Canvas()
    cv.gradient(0, 60, '#1a1a3a', '#3a3a6a', 5)
    for i in range(30):
        cv.dot(rng.randint(0, 239), rng.randint(0, 40), '#ffffff')
    # stands
    for i in range(5):
        y = 30 + i * 8
        cv.rect(0, y, 240, y + 7, '#5a5a7a' if i % 2 else '#4a4a6a')
        for x in range(2, 240, 6):
            cv.dot(x + (i % 2) * 3, y + 3, rng.choice(['#e8603c', '#3b8fe0', '#4dae4a', '#e8c330', '#ffffff', '#9a5cd0']))
    cv.rect(0, 70, 240, 160, '#3a6a4a')
    # duel field with glowing rings
    cv.ell(120, 112, 100, 34, '#4a8a5a', outline='#9fe0ff')
    cv.ell(120, 112, 70, 22, '#5a9a6a', outline='#9fe0ff')
    cv.line([(120, 78), (120, 146)], '#9fe0ff')
    for x in (30, 210):
        cv.rect(x - 3, 40, x + 3, 100, '#8a8aa8', outline=OUT)
        cv.ell(x, 40, 7, 4, '#ffe8a0', outline=OUT)
    return cv


def shop(rng):
    cv = Canvas()
    wall_bg(cv, 100, '#f0dcc0', '#c0603a')
    floor_tiles(cv, 100, '#c8a078', '#b8906a', 12)
    for y in (34, 62, 90):
        shelf(cv, 10, y, 70, rng)
        shelf(cv, 160, y, 70, rng)
    # counter
    cv.rect(70, 86, 170, 120, '#a8643a', outline=OUT)
    cv.rect(70, 86, 170, 92, '#c87a4a', outline=OUT)
    # card packs on display
    for i, col in enumerate(['#e8603c', '#3b8fe0', '#4dae4a', '#e8c330', '#a08458', '#9a5cd0']):
        x = 80 + i * 14
        cv.rect(x, 72, x + 10, 86, col, outline=OUT)
        cv.rect(x + 2, 75, x + 8, 77, '#ffffff')
    cv.rect(96, 8, 144, 24, '#3a2a5a', outline=OUT)
    cv.rect(100, 12, 140, 20, '#ffd65a')
    return cv


def lab(rng):
    cv = Canvas()
    wall_bg(cv, 100, '#d8e0ec', '#5a6a8a')
    # essence tubes
    for i, col in enumerate(['#9fe0ff', '#b6ee8a', '#ffc27a']):
        x = 20 + i * 26
        cv.rect(x, 20, x + 16, 92, '#e8f4ff', outline=OUT)
        cv.rect(x + 2, 40, x + 14, 90, col)
        for b in range(3):
            cv.ell(x + 8 + rng.randint(-3, 3), 50 + b * 12, 2, 2, '#ffffff')
        cv.rect(x - 2, 92, x + 18, 98, '#6a6a8a', outline=OUT)
    # big screen with lineage diagram
    cv.rect(110, 16, 226, 72, '#1a2a4a', outline=OUT)
    for i in range(3):
        cv.ell(130 + i * 38, 44, 8, 8, '#2a4a7a', outline='#9fe0ff')
        if i < 2:
            cv.line([(139 + i * 38, 44), (159 + i * 38, 44)], '#9fe0ff')
    floor_tiles(cv, 100, '#b8c0cc', '#a8b0bc', 16)
    cv.rect(110, 98, 220, 108, '#e8ecf4', outline=OUT)
    cv.rect(114, 108, 118, 134, '#6a6a8a')
    cv.rect(212, 108, 216, 134, '#6a6a8a')
    return cv


def garden(rng):
    cv = Canvas()
    sky(cv, '#88c8f0', '#e0f4e0', 60)
    clouds(cv, rng, 3)
    cv.rect(0, 60, 240, 160, '#5aa04a')
    cv.dither(0, 60, 240, 160, '#5aa04a', '#6ab05a', 2)
    for x in range(0, 240, 22):
        tree(cv, x + rng.randint(-4, 4), 56 + rng.randint(-4, 4), 12, '#3a8a3a')
    # glowing essence spring
    cv.ell(120, 112, 40, 14, '#3a8a5a', outline=OUT)
    cv.ell(120, 110, 34, 10, '#9fe0d0')
    cv.ell(120, 108, 20, 5, '#e0fff0')
    for _ in range(26):
        x = rng.randint(70, 170)
        y = rng.randint(70, 104)
        cv.dot(x, y, rng.choice(['#e0fff0', '#b6ee8a', '#fff4a0']))
    for _ in range(30):
        x = rng.randint(0, 239)
        y = rng.randint(124, 158)
        cv.dot(x, y, rng.choice(['#ff8ab0', '#fff4a0', '#ffffff']))
    return cv


def library(rng):
    cv = Canvas()
    wall_bg(cv, 108, '#c8b090', '#6a4a2a')
    for col in range(5):
        x = 8 + col * 46
        cv.rect(x, 8, x + 40, 104, '#7a4a2a', outline=OUT)
        for y in (30, 54, 78, 102):
            shelf(cv, x + 2, y, 36, rng)
    floor_tiles(cv, 108, '#8a5a3a', '#7a4a2a', 16)
    cv.rect(80, 116, 160, 124, '#9a6a3a', outline=OUT)
    cv.ell(120, 112, 6, 4, '#ffe8a0', outline=OUT)  # lamp
    cv.rect(119, 112, 121, 116, '#5a3a1a')
    return cv


def port(rng):
    cv = Canvas()
    sky(cv, '#f0a878', '#ffe0b0', 56)
    clouds(cv, rng, 3, (6, 30))
    sea(cv, 56, 120, rng)
    # pier
    cv.rect(0, 112, 240, 160, '#9a6a3a')
    for x in range(0, 240, 10):
        cv.line([(x, 112), (x, 160)], '#7a4a2a')
    cv.rect(0, 110, 240, 113, '#c88a4a', outline=OUT)
    # ship
    cv.poly([(130, 104), (210, 104), (200, 118), (140, 118)], '#7a3a2a', outline=OUT)
    cv.rect(166, 50, 169, 104, '#5a3a1a')
    cv.poly([(170, 54), (200, 92), (170, 92)], '#f0f0f0', outline=OUT)
    cv.poly([(165, 58), (140, 92), (165, 92)], '#e8e0d0', outline=OUT)
    for x in (20, 60):
        cv.rect(x, 96, x + 16, 110, '#b07a4a', outline=OUT)
        cv.line([(x, 103), (x + 16, 103)], '#7a4a2a')
    return cv


def lighthouse(rng, night=True):
    cv = Canvas()
    cv.gradient(0, 100, '#141432', '#3a2a5a', 6)
    for _ in range(40):
        cv.dot(rng.randint(0, 239), rng.randint(0, 70), '#ffffff')
    sea(cv, 100, 160, rng, '#1a3a6a')
    # cliff
    cv.poly([(120, 160), (140, 96), (200, 90), (240, 96), (240, 160)], '#5a5a6a', outline=OUT)
    # tower
    cv.poly([(166, 96), (172, 26), (188, 26), (194, 96)], '#e8e0d0', outline=OUT)
    for y in (40, 60, 80):
        cv.rect(169, y, 191, y + 6, '#c0503a')
    cv.rect(168, 16, 192, 26, '#3a3a5a', outline=OUT)
    cv.ell(180, 21, 5, 4, '#e2b8ff')  # strange violet glow
    cv.poly([(166, 16), (180, 6), (194, 16)], '#c0503a', outline=OUT)
    cv.poly([(185, 18), (240, 4), (240, 36)], (226, 184, 255, 90))
    return cv


def reserve(rng):
    cv = Canvas()
    sky(cv, '#88c0e8', '#d8f0d0', 50)
    for x in range(-10, 250, 14):
        pine(cv, x + rng.randint(-3, 3), 52 + rng.randint(-2, 4), 26, '#2a6a3a')
    cv.rect(0, 64, 240, 160, '#4a8a3a')
    cv.dither(0, 64, 240, 160, '#4a8a3a', '#5a9a4a', 2)
    for x in range(0, 240, 30):
        pine(cv, x + rng.randint(-6, 6), 90 + rng.randint(-4, 4), 34, '#1e5a2e')
    # lagoon
    cv.ell(150, 132, 60, 16, '#3a7ab8', outline=OUT)
    cv.ell(150, 130, 50, 10, '#5a9ad8')
    # path
    cv.poly([(40, 160), (70, 100), (80, 100), (64, 160)], '#c8a878')
    return cv


def core(rng):
    cv = Canvas()
    cv.gradient(0, 160, '#0a0a1a', '#2a1a3a', 6)
    # circuitry & essence lines
    for i in range(12):
        y = rng.randint(10, 150)
        cv.line([(0, y), (240, y + rng.randint(-10, 10))], '#3a2a5a')
    cv.ell(120, 80, 46, 46, '#1a1a2a', outline='#ff3a6a')
    cv.ell(120, 80, 30, 30, '#2a1a3a', outline='#e2b8ff')
    cv.ell(120, 80, 12, 12, '#e2b8ff')
    cv.ell(120, 80, 6, 6, '#ffffff')
    for k in range(8):
        a = k * math.pi / 4
        cv.line([(120 + int(48 * math.cos(a)), 80 + int(48 * math.sin(a))), (120 + int(110 * math.cos(a)), 80 + int(110 * math.sin(a)))], '#ff3a6a')
    return cv


def title_bg(rng):
    cv = Canvas()
    cv.gradient(0, 100, '#1a1a4a', '#e88a6a', 10)
    for _ in range(40):
        cv.dot(rng.randint(0, 239), rng.randint(0, 50), '#ffffff')
    sea(cv, 100, 160, rng, '#2a5a9a')
    # island silhouette with lighthouse & academy
    cv.poly([(20, 112), (60, 92), (110, 86), (170, 88), (220, 104), (230, 112)], '#2a3a4a')
    cv.rect(96, 66, 140, 90, '#3a4a5a')
    cv.poly([(92, 66), (118, 50), (144, 66)], '#3a4a5a')
    cv.rect(190, 60, 196, 98, '#3a4a5a')
    cv.ell(193, 58, 4, 4, '#e2b8ff')
    cv.ell(120, 100, 26, 4, '#f0a878')
    return cv


SCENES = {
    'dorm': dorm, 'plaza': plaza, 'classroom': classroom, 'arena': arena, 'shop': shop, 'lab': lab,
    'garden': garden, 'library': library, 'port': port, 'lighthouse': lighthouse, 'reserve': reserve,
    'core': core, 'title': title_bg,
}


# ------------------------------------------------------------------ island map

MAP_POINTS = {
    'dorm': (68, 100), 'plaza': (112, 84), 'classroom': (140, 64), 'arena': (164, 92), 'shop': (92, 66),
    'lab': (176, 56), 'garden': (60, 64), 'library': (122, 50), 'port': (138, 128), 'lighthouse': (208, 36),
    'reserve': (40, 40), 'core': (112, 108),
}


def island_map(rng, silenced=False):
    cv = Canvas()
    cv.rect(0, 0, W, H, '#2a6ab0')
    for _ in range(300):
        x, y = rng.randint(0, 238), rng.randint(0, 158)
        cv.line([(x, y), (x + 2, y)], '#3a7ac0')
    # coastline: noisy blob
    pts = []
    cx, cy = 120, 82
    for k in range(48):
        a = k * 2 * math.pi / 48
        r = 1 + 0.12 * math.sin(a * 3 + 1) + 0.07 * math.sin(a * 7) + rng.uniform(-0.03, 0.03)
        pts.append((cx + 104 * r * math.cos(a), cy + 66 * r * math.sin(a)))
    shallow = [(cx + (x - cx) * 1.06, cy + (y - cy) * 1.08) for x, y in pts]
    cv.poly(shallow, '#5aa0d8')
    cv.poly(pts, '#e8d8a0', outline=OUT)
    inner = [(cx + (x - cx) * 0.93, cy + (y - cy) * 0.9) for x, y in pts]
    grass = '#7a8a6a' if silenced else '#6ab04a'
    cv.poly(inner, grass)
    cv.dither(20, 16, 220, 150, grass, '#7ac05a' if not silenced else '#8a9a7a', 2)
    # re-mask outside the island
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).polygon(inner, fill=255)
    base = cv.img.copy()
    cv.img.paste(base, (0, 0), mask)
    # redraw beach ring lightly over dither spill
    ring = Image.new('L', (W, H), 0)
    ImageDraw.Draw(ring).polygon(pts, fill=255)
    ImageDraw.Draw(ring).polygon(inner, fill=0)
    beach = Image.new('RGBA', (W, H), hexrgb('#e8d8a0'))
    cv.img.paste(beach, (0, 0), ring)
    sea_mask = Image.new('L', (W, H), 255)
    ImageDraw.Draw(sea_mask).polygon(shallow, fill=0)
    water = Image.new('RGBA', (W, H), hexrgb('#2a6ab0'))
    cv.img.paste(water, (0, 0), sea_mask)
    cv.d = ImageDraw.Draw(cv.img)
    cv.px = cv.img.load()
    for _ in range(160):
        x, y = rng.randint(0, 238), rng.randint(0, 158)
        if sea_mask.getpixel((x, y)):
            cv.line([(x, y), (x + 2, y)], '#4a8ad0')
    # forest north-west (reserve) and mountains
    for _ in range(26):
        x, y = rng.randint(22, 70), rng.randint(24, 56)
        if mask.getpixel((x, y)):
            pine(cv, x, y, 12, '#5a6a5a' if silenced else '#2a6a3a')
    cv.poly([(186, 60), (200, 40), (214, 60)], '#8a8aa0', outline=OUT)
    cv.poly([(196, 46), (200, 40), (204, 46)], '#ffffff')
    # paths between points
    order = ['dorm', 'plaza', 'shop', 'garden', 'reserve']
    order2 = ['plaza', 'library', 'classroom', 'lab', 'lighthouse']
    order3 = ['plaza', 'arena']
    order4 = ['plaza', 'core', 'port']
    for chain in (order, order2, order3, order4):
        for a, b in zip(chain, chain[1:]):
            cv.line([MAP_POINTS[a], MAP_POINTS[b]], '#d8c890', 3)
    # building icons
    icon = {
        'dorm': ('#e8dcc0', '#3a6ab0'), 'plaza': ('#e8e0f0', '#5a4ab0'), 'classroom': ('#f0e4c8', '#4a8a3a'),
        'arena': ('#c8c8d8', '#c0503a'), 'shop': ('#f0dcc0', '#e08a3a'), 'lab': ('#d8e0ec', '#3a8ad8'),
        'library': ('#c8b090', '#7a4a2a'), 'port': ('#b07a4a', '#3a6ab0'),
    }
    for k, (wall, roof) in icon.items():
        x, y = MAP_POINTS[k]
        building(cv, x - 6, y - 6, x + 6, y + 2, wall, roof, windows=False, door=False, roof_h=6)
    # garden spring
    x, y = MAP_POINTS['garden']
    cv.ell(x, y, 7, 4, '#9fe0d0', outline=OUT)
    # lighthouse
    x, y = MAP_POINTS['lighthouse']
    cv.poly([(x - 3, y + 8), (x - 2, y - 8), (x + 2, y - 8), (x + 3, y + 8)], '#e8e0d0', outline=OUT)
    cv.rect(x - 2, y - 2, x + 2, y, '#c0503a')
    cv.ell(x, y - 9, 2, 2, '#e2b8ff')
    # core entrance (sealed hatch)
    x, y = MAP_POINTS['core']
    cv.ell(x, y, 5, 3, '#3a2a4a', outline='#ff3a6a' if silenced else OUT)
    return cv


def app_icon():
    cv = Canvas(64, 64, '#00000000')
    cv.img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    cv.d = ImageDraw.Draw(cv.img)
    cv.px = cv.img.load()
    cv.w, cv.h = 64, 64
    cv.ell(32, 32, 30, 30, '#1a1a3a', outline=OUT)
    cv.ell(32, 32, 26, 26, '#2a2a5a')
    # card with star
    cv.poly([(20, 12), (44, 12), (46, 52), (18, 52)], '#f0e8d0', outline=OUT)
    cv.rect(22, 16, 42, 36, '#3b8fe0')
    cv.poly([(32, 18), (35, 25), (42, 26), (36, 30), (38, 36), (32, 32), (26, 36), (28, 30), (22, 26), (29, 25)], '#ffd65a', outline=OUT)
    for i, col in enumerate(['#e8603c', '#3b8fe0', '#4dae4a', '#e8c330', '#a08458', '#9a5cd0']):
        cv.rect(22 + i * 3 + i // 2, 42, 24 + i * 3 + i // 2, 46, col)
    return cv.img
