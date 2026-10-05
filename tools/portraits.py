"""Placeholder pixel-art character portraits (64x64 busts, 5 expressions)."""
from pixel import Sprite, ell, poly, rect, combo, hexrgb, darker

OUT = '#1a1426'
W = H = 64
EXPRESSIONS = ['neutral', 'happy', 'angry', 'surprised', 'sad']

SKIN = {'light': '#f8d8c0', 'tan': '#e0b090', 'brown': '#b07a50', 'deep': '#7a5034', 'pale': '#f0e0d8'}

CHARACTERS = {
    'mira': dict(skin='light', hair='#3aa08a', eyes='#2a7a5a', style='bob', outfit='#3a8a5a', collar='#f0e8c8', acc='leafclip'),
    'ren': dict(skin='tan', hair='#2a2a3a', streak='#ffd64a', eyes='#d0601a', style='spiky', outfit='#c0402a', collar='#ffd64a', acc='scarf'),
    'soren': dict(skin='brown', hair='#5a3a26', eyes='#5a4a2a', style='messy', outfit='#6a5a48', collar='#e8dcc0', acc='glasses'),
    'elara': dict(skin='light', hair='#c8c0e8', eyes='#4a5ab0', style='braid', outfit='#f0f0f8', collar='#7a8ad0', acc='labcoat'),
    'vael': dict(skin='pale', hair='#2a2438', temples='#a0a0b0', eyes='#8a2a4a', style='slick', outfit='#2a1a3a', collar='#c8a050', acc='highcollar'),
    'iris': dict(skin='pale', hair='#2a1a3e', eyes='#9a5cd0', style='long_cover', outfit='#3a2a5a', collar='#e2b8ff', acc='ribbon'),
    'lucan': dict(skin='pale', hair='#2a1a3e', eyes='#9a5cd0', style='long_messy', outfit='#5a5a6a', collar='#9aa0b0', acc='none'),
    'juno': dict(skin='tan', hair='#f0a020', eyes='#3a6ad0', style='ponytail', outfit='#e8c330', collar='#2a2a3a', acc='cap'),
    'marlo': dict(skin='deep', hair='#e0e0e0', eyes='#2a3a5a', style='bald_beard', outfit='#2a4a7a', collar='#e8e8f0', acc='none'),
    'pip': dict(skin='light', hair='#a0d060', eyes='#4a8a2a', style='bowl', outfit='#4a8a3a', collar='#f0e8c8', acc='none'),
    'nell': dict(skin='brown', hair='#c8402a', eyes='#7a3a1a', style='bun', outfit='#e08a3a', collar='#fff0d8', acc='apron'),
    'quill': dict(skin='pale', hair='#8a8aa8', eyes='#3a3a6a', style='long_straight', outfit='#4a3a6a', collar='#c8b8e8', acc='glasses'),
    'hollis': dict(skin='tan', hair='#6a4a2a', eyes='#3a5a2a', style='short', outfit='#5a6a3a', collar='#c8b890', acc='hat'),
}


def face(s, c, expr):
    skin = SKIN[c['skin']]
    # neck & shoulders
    s.part(rect(27, 42, 37, 52), darker(hexrgb(skin), 0.15), outline=OUT, light=False)
    s.part(poly((8, 64), (12, 52), (22, 48), (42, 48), (52, 52), (56, 64)), c['outfit'], outline=OUT)
    s.part(poly((24, 48), (32, 58), (40, 48)), c['collar'], outline=OUT)
    s.flat(poly((28, 48), (32, 53), (36, 48)), skin)
    # head
    s.part(combo(ell(32, 30, 13, 15), poly((20, 34), (32, 47), (44, 34))), skin, outline=OUT)
    s.part(combo(ell(19, 32, 2, 3), ell(45, 32, 2, 3)), skin, outline=OUT)  # ears


def eyes(s, c, expr):
    ec = c['eyes']
    y = 30
    for x in (24, 36):
        if expr == 'happy':
            s.flat(combo(rect(x, y + 2, x + 4, y + 2), rect(x - 1, y + 3, x - 1, y + 3), rect(x + 5, y + 3, x + 5, y + 3)), OUT)
            continue
        h = 6 if expr == 'surprised' else 5
        s.flat(rect(x, y, x + 4, y + h - 1), '#ffffff')
        s.flat(rect(x + 1, y + 1, x + 4, y + h - 1), ec)
        s.flat(rect(x + 2, y + 2, x + 3, y + h - 2), darker(hexrgb(ec), 0.5))
        s.dot(x + 1, y + 1, '#ffffff')
        s.flat(rect(x - 1, y - 1, x + 5, y - 1), OUT)  # lash line
        if expr == 'sad':
            s.flat(rect(x, y, x + 4, y), darker(hexrgb(SKIN[c['skin']]), 0.25))
    # brows
    if expr == 'angry':
        s.flat(combo(poly((22, 25), (29, 28), (29, 27), (22, 24)), poly((42, 25), (35, 28), (35, 27), (42, 24))), OUT)
    elif expr == 'sad':
        s.flat(combo(poly((22, 27), (29, 24), (29, 25), (22, 28)), poly((42, 27), (35, 24), (35, 25), (42, 28))), OUT)
    elif expr == 'surprised':
        s.flat(combo(rect(23, 23, 28, 23), rect(36, 23, 41, 23)), OUT)
    else:
        s.flat(combo(rect(23, 25, 28, 25), rect(36, 25, 41, 25)), OUT)


def mouth(s, c, expr):
    if expr == 'happy':
        s.flat(poly((28, 39), (36, 39), (32, 43)), '#9a3a3a')
        s.flat(rect(29, 39, 35, 39), '#ffffff')
    elif expr == 'angry':
        s.flat(rect(29, 41, 35, 41), OUT)
        s.flat(rect(28, 42, 28, 42), OUT)
    elif expr == 'surprised':
        s.flat(ell(32, 41, 2, 2), '#7a2a2a')
    elif expr == 'sad':
        s.flat(combo(rect(29, 41, 35, 41), rect(28, 42, 28, 42), rect(36, 42, 36, 42)), OUT)
    else:
        s.flat(rect(30, 40, 34, 40), '#9a4a4a')
    s.flat(rect(32, 36, 32, 37), darker(hexrgb(SKIN[c['skin']]), 0.25))  # nose
    if expr in ('happy', 'surprised'):
        s.flat(combo(rect(21, 37, 23, 37), rect(41, 37, 43, 37)), '#f0a0a0')  # blush


def hair_back(s, c):
    h = c['hair']
    st = c['style']
    if st in ('long_cover', 'long_messy', 'long_straight'):
        s.part(poly((16, 22), (18, 12), (32, 8), (46, 12), (48, 22), (50, 58), (14, 58)), h, outline=OUT)
    elif st == 'braid':
        s.part(combo(ell(32, 24, 17, 15), poly((44, 34), (52, 60), (46, 62), (40, 40))), h, outline=OUT)
    elif st == 'ponytail':
        s.part(combo(ell(32, 24, 16, 14), poly((44, 18), (58, 30), (54, 44), (46, 30))), h, outline=OUT)
    elif st == 'bun':
        s.part(combo(ell(32, 25, 16, 14), ell(32, 9, 7, 6)), h, outline=OUT)
    elif st == 'bald_beard':
        pass
    else:
        s.part(ell(32, 25, 16, 14), h, outline=OUT)


def hair_front(s, c):
    h = c['hair']
    st = c['style']
    if st == 'bob':
        s.part(combo(poly((16, 30), (18, 14), (32, 10), (46, 14), (48, 30), (44, 40), (44, 24), (34, 18), (22, 24), (20, 40)), ell(32, 15, 14, 6)), h, outline=OUT)
    elif st == 'spiky':
        s.part(poly((16, 30), (12, 12), (22, 16), (20, 4), (30, 12), (34, 2), (38, 12), (48, 6), (44, 18), (52, 20), (46, 30), (44, 22), (36, 24), (34, 18), (28, 25), (22, 22), (20, 32)), h, outline=OUT)
        s.flat(poly((33, 4), (36, 12), (34, 16)), c['streak'])
    elif st == 'messy':
        s.part(poly((16, 30), (14, 14), (24, 8), (32, 10), (42, 7), (50, 16), (48, 30), (44, 22), (38, 24), (32, 18), (26, 24), (20, 22)), h, outline=OUT)
    elif st == 'braid':
        s.part(poly((17, 30), (18, 15), (32, 10), (46, 15), (47, 30), (44, 22), (32, 16), (20, 22)), h, outline=OUT)
    elif st == 'slick':
        s.part(poly((18, 28), (17, 15), (32, 9), (47, 15), (46, 28), (44, 18), (36, 15), (24, 16), (20, 20)), h, outline=OUT)
        s.flat(combo(rect(18, 20, 19, 28), rect(45, 20, 46, 28)), c['temples'])
    elif st == 'long_cover':
        # bangs swept over the right eye
        s.part(poly((17, 30), (18, 14), (32, 9), (46, 14), (48, 26), (46, 40), (40, 36), (34, 26), (32, 20), (22, 22), (20, 34)), h, outline=OUT)
    elif st == 'long_messy':
        s.part(poly((17, 30), (16, 14), (26, 8), (38, 8), (48, 16), (48, 30), (44, 24), (40, 28), (36, 20), (30, 26), (26, 20), (21, 26)), h, outline=OUT)
    elif st == 'long_straight':
        s.part(poly((17, 30), (18, 14), (32, 10), (46, 14), (47, 30), (44, 22), (33, 17), (32, 24), (31, 17), (20, 22)), h, outline=OUT)
    elif st == 'ponytail':
        s.part(poly((17, 28), (18, 14), (32, 10), (46, 14), (47, 28), (42, 20), (34, 20), (28, 16), (24, 22), (20, 22)), h, outline=OUT)
    elif st == 'bowl':
        s.part(combo(ell(32, 18, 16, 10), rect(16, 18, 48, 24)), h, outline=OUT)
    elif st == 'bun':
        s.part(poly((17, 28), (18, 14), (32, 10), (46, 14), (47, 28), (42, 20), (32, 18), (22, 20)), h, outline=OUT)
    elif st == 'short':
        s.part(poly((17, 28), (17, 14), (32, 10), (47, 14), (47, 28), (44, 20), (30, 18), (20, 20)), h, outline=OUT)
    elif st == 'bald_beard':
        s.part(poly((20, 36), (24, 46), (32, 50), (40, 46), (44, 36), (40, 42), (32, 44), (24, 42)), h, outline=OUT)
        s.flat(combo(rect(22, 24, 28, 25), rect(36, 24, 42, 25)), h)


def accessory(s, c, expr):
    a = c['acc']
    if a == 'leafclip':
        s.part(combo(ell(44, 16, 3, 2), ell(47, 19, 2, 3)), '#8ad65a', outline=OUT)
    elif a == 'scarf':
        s.part(poly((18, 48), (46, 48), (48, 54), (38, 54), (40, 64), (32, 64), (34, 54), (16, 54)), '#ffd64a', outline=OUT)
    elif a == 'glasses':
        s.flat(combo(rect(22, 28, 30, 28), rect(22, 36, 30, 36), rect(22, 28, 22, 36), rect(30, 28, 30, 36),
                     rect(34, 28, 42, 28), rect(34, 36, 42, 36), rect(34, 28, 34, 36), rect(42, 28, 42, 36), rect(30, 31, 34, 31)), OUT)
    elif a == 'labcoat':
        s.part(combo(poly((8, 64), (12, 52), (24, 48), (26, 64)), poly((56, 64), (52, 52), (40, 48), (38, 64))), '#ffffff', outline=OUT)
    elif a == 'highcollar':
        s.part(combo(poly((14, 52), (18, 40), (26, 46), (24, 54)), poly((50, 52), (46, 40), (38, 46), (40, 54))), c['outfit'], outline=OUT)
        s.part(ell(32, 56, 3, 3), c['collar'], outline=OUT)
    elif a == 'ribbon':
        s.part(combo(poly((40, 12), (46, 8), (46, 16)), poly((40, 12), (36, 6), (36, 14))), '#e2b8ff', outline=OUT)
    elif a == 'cap':
        s.part(combo(ell(32, 14, 15, 6), poly((16, 16), (6, 20), (18, 20))), '#2a6ad0', outline=OUT)
        s.flat(ell(32, 12, 3, 2), '#ffd64a')
    elif a == 'apron':
        s.part(poly((22, 52), (42, 52), (44, 64), (20, 64)), '#fff0d8', outline=OUT)
    elif a == 'hat':
        s.part(combo(ell(32, 14, 20, 4), ell(32, 10, 11, 7)), '#8a6a3a', outline=OUT)
        s.flat(rect(22, 13, 42, 14), '#5a3a1a')


def build(name, expr):
    c = CHARACTERS[name]
    s = Sprite(W, H)
    hair_back(s, c)
    face(s, c, expr)
    eyes(s, c, expr)
    mouth(s, c, expr)
    hair_front(s, c)
    accessory(s, c, expr)
    s.outline_all(OUT)
    return s
