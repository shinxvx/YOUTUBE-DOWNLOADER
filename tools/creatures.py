"""Placeholder pixel-art Eidra (48x48, facing left like a GBA opponent sprite
mirrored for the player side). Each lineage shares a body plan; later stages
are larger and gain features."""
from pixel import Sprite, ell, poly, rect, combo, hexrgb

OUT = '#1a1426'
W = H = 48
GROUND = 45


def eye(s, x, y, big=False, color='#1a1426', glow=None):
    if big:
        s.flat(rect(x, y, x + 2, y + 3), color)
        s.dot(x, y, '#ffffff')
        s.dot(x + 1, y, '#ffffff')
        if glow:
            s.dot(x + 1, y + 3, glow)
    else:
        s.flat(rect(x, y, x + 1, y + 2), color)
        s.dot(x, y, '#ffffff')


def flame(s, cx, base, h, w, c1='#ff7a2a', c2='#ffd65a'):
    s.part(poly((cx - w, base), (cx, base - h), (cx + w, base), (cx + w // 2, base + 2), (cx - w // 2, base + 2)), c1, outline=OUT)
    s.part(poly((cx - w // 2, base), (cx, base - h // 2 - 1), (cx + w // 2, base)), c2, shade=False)


# --------------------------------------------------------------- Ember line
def cindlet(s):
    # small sand mammal with huge ears and an ember-tipped tail
    s.part(poly((30, 34), (44, 22), (42, 32), (36, 38)), '#e8a35a', outline=OUT)  # tail
    flame(s, 43, 24, 8, 3)
    s.part(ell(26, 36, 9, 7), '#e8a35a', outline=OUT)  # body
    s.part(combo(rect(19, 40, 22, 45), rect(28, 40, 31, 45)), '#c27a3a', outline=OUT)
    s.part(poly((12, 20), (9, 6), (19, 17)), '#e8a35a', outline=OUT)  # ear L
    s.part(poly((22, 17), (27, 4), (29, 20)), '#e8a35a', outline=OUT)  # ear R
    s.flat(poly((13, 17), (11, 9), (17, 16)), '#ff9d6a')
    s.flat(poly((24, 16), (27, 8), (27, 18)), '#ff9d6a')
    s.part(ell(19, 26, 9, 7), '#f0b46a', outline=OUT)  # head
    s.part(ell(14, 29, 4, 3), '#fbe2b4', shade=False)  # muzzle
    s.dot(11, 28, OUT)
    eye(s, 16, 23)
    eye(s, 22, 23)
    s.flat(rect(24, 30, 26, 31), '#ff7a3a')  # cheek ember


def brasear(s):
    s.part(poly((32, 30), (46, 14), (44, 28), (38, 36)), '#c8622e', outline=OUT)
    flame(s, 45, 16, 10, 3)
    s.part(ell(28, 33, 13, 8), '#d9773a', outline=OUT)
    for x in (15, 21, 31, 37):
        s.part(rect(x, 37, x + 3, 45), '#a8502a', outline=OUT)
    s.part(poly((9, 16), (6, 1), (16, 12)), '#d9773a', outline=OUT)
    s.part(poly((19, 12), (24, 0), (26, 15)), '#d9773a', outline=OUT)
    s.flat(poly((7, 4), (9, 2), (8, 7)), '#ffd65a')
    s.flat(poly((23, 2), (25, 1), (24, 6)), '#ffd65a')
    s.part(ell(16, 22, 10, 8), '#e08a46', outline=OUT)
    s.part(poly((6, 23), (2, 30), (12, 28)), '#fbe2b4', shade=False)
    s.dot(3, 28, OUT)
    eye(s, 12, 19, big=True, glow='#ff7a2a')
    eye(s, 19, 19, big=True, glow='#ff7a2a')
    flame(s, 25, 28, 6, 3)  # cheek tuft
    s.flat(combo(rect(26, 30, 34, 31), rect(30, 34, 38, 35)), '#7a3418')  # stripes


def solmara(s):
    s.part(poly((34, 30), (47, 10), (46, 28), (40, 38)), '#b8481e', outline=OUT)
    flame(s, 46, 12, 11, 3)
    s.part(ell(30, 32, 15, 9), '#c85a26', outline=OUT)
    for x in (14, 21, 33, 40):
        s.part(rect(x, 36, x + 4, 46), '#94401c', outline=OUT)
    # incandescent mane: ring of flame petals
    for (cx, cy, h) in ((6, 16, 9), (11, 9, 10), (19, 6, 10), (27, 9, 9), (31, 16, 8), (29, 25, 7), (5, 25, 7)):
        flame(s, cx, cy + 6, h, 4, '#ff6a1a', '#ffe070')
    s.part(ell(17, 20, 10, 9), '#e07a36', outline=OUT)
    s.part(poly((7, 21), (3, 28), (14, 27)), '#fbe2b4', shade=False)
    s.dot(4, 26, OUT)
    eye(s, 12, 17, big=True, glow='#ffe070')
    eye(s, 19, 17, big=True, glow='#ffe070')
    s.flat(poly((15, 10), (17, 6), (19, 10)), '#fff4a0')  # sun mark
    s.flat(combo(rect(28, 28, 36, 29), rect(32, 33, 42, 34)), '#7a2c10')


# --------------------------------------------------------------- Tide line (starter)
def ripplet(s):
    s.part(poly((30, 38), (44, 30), (40, 42)), '#9fe0ff', outline=OUT)  # tail fin
    s.part(ell(25, 37, 10, 7), '#4aa6e8', outline=OUT)
    s.part(combo(ell(18, 44, 3, 2), ell(31, 44, 3, 2)), '#3884c8', outline=OUT)
    s.part(ell(20, 27, 10, 8), '#5ab8f0', outline=OUT)
    # translucent fins on the head
    s.part(poly((12, 22), (4, 14), (10, 26)), '#bdf0ff', outline='#2a6ab0')
    s.part(poly((27, 21), (36, 12), (30, 26)), '#bdf0ff', outline='#2a6ab0')
    s.part(ell(21, 31, 6, 3), '#d8f4ff', shade=False)
    eye(s, 16, 24, big=True)
    eye(s, 23, 24, big=True)
    s.flat(rect(19, 32, 21, 32), OUT)


def neruvin(s):
    s.part(poly((33, 34), (47, 22), (46, 40), (38, 42)), '#9fe0ff', outline=OUT)
    s.part(ell(27, 34, 13, 9), '#3f95dc', outline=OUT)
    s.part(combo(ell(17, 43, 4, 3), ell(33, 43, 4, 3)), '#2f74b8', outline=OUT)
    s.part(poly((22, 26), (30, 10), (34, 28)), '#bdf0ff', outline='#2a6ab0')  # dorsal fin
    s.part(ell(17, 23, 10, 9), '#4aa6e8', outline=OUT)
    s.part(poly((8, 18), (0, 8), (6, 24)), '#bdf0ff', outline='#2a6ab0')
    s.part(ell(14, 29, 7, 3), '#d8f4ff', shade=False)
    eye(s, 11, 19, big=True)
    eye(s, 18, 19, big=True)
    for x in (26, 31, 36):
        s.flat(rect(x, 33, x + 1, 34), '#d8f4ff')


def abyssail(s):
    s.part(poly((34, 30), (47, 8), (47, 44), (40, 44)), '#7fd0ff', outline=OUT)  # sail tail
    s.part(ell(28, 32, 14, 10), '#2e78c4', outline=OUT)
    s.part(poly((18, 24), (30, 0), (36, 24)), '#9fe0ff', outline='#1a4a90')  # tall sail fin
    s.flat(combo(rect(27, 6, 28, 22), rect(31, 10, 32, 22)), '#4aa6e8')
    s.part(combo(ell(17, 43, 5, 3), ell(35, 43, 5, 3)), '#215a9a', outline=OUT)
    s.part(ell(15, 22, 11, 9), '#3a8ad8', outline=OUT)
    s.part(poly((5, 16), (0, 2), (10, 14)), '#bdf0ff', outline='#1a4a90')
    s.part(ell(12, 28, 8, 3), '#d8f4ff', shade=False)
    eye(s, 8, 18, big=True, glow='#9fe0ff')
    eye(s, 15, 18, big=True, glow='#9fe0ff')
    for (x, y) in ((24, 34), (30, 37), (36, 33)):
        s.flat(ell(x, y, 1, 1), '#d8f4ff')


# --------------------------------------------------------------- Grove line (starter)
def mossbit(s):
    s.part(ell(24, 36, 11, 9), '#6aa04a', outline=OUT)  # body
    s.part(combo(ell(16, 44, 3, 2), ell(32, 44, 3, 2)), '#4a7a32', outline=OUT)
    s.part(ell(24, 29, 12, 6), '#4d8a3a', outline=OUT)  # moss cap
    for x in (15, 20, 26, 31):
        s.flat(ell(x, 27, 1, 1), '#9ad66a')
    # sprouts
    s.part(poly((22, 24), (19, 12), (24, 22)), '#3a7a2a', outline=OUT)
    s.part(ell(17, 12, 4, 3), '#8ad65a', outline=OUT)
    s.part(ell(28, 14, 4, 3), '#8ad65a', outline=OUT)
    s.flat(rect(24, 16, 25, 24), '#3a7a2a')
    eye(s, 18, 33, big=True)
    eye(s, 26, 33, big=True)
    s.flat(rect(22, 39, 24, 39), OUT)


def thornook(s):
    s.part(ell(26, 34, 14, 10), '#5a8e3e', outline=OUT)
    for x in (14, 22, 30, 36):
        s.part(rect(x, 38, x + 3, 45), '#3e6a2a', outline=OUT)
    s.part(ell(26, 26, 14, 6), '#3e7a30', outline=OUT)
    for (x, y) in ((14, 21), (20, 17), (28, 16), (35, 19)):
        s.part(poly((x - 2, y + 5), (x, y - 3), (x + 2, y + 5)), '#c8e070', outline=OUT)  # thorns
    s.part(ell(13, 32, 8, 7), '#6a9e48', outline=OUT)  # head
    s.part(poly((6, 28), (2, 20), (9, 26)), '#a0742e', outline=OUT)  # little horn
    eye(s, 9, 29, big=True)
    eye(s, 15, 29, big=True)
    s.flat(rect(9, 35, 12, 35), OUT)


def elderhorn(s):
    s.part(ell(28, 33, 16, 11), '#4e7e36', outline=OUT)
    for x in (13, 21, 32, 40):
        s.part(rect(x, 38, x + 4, 46), '#34561f', outline=OUT)
    s.part(ell(28, 25, 15, 6), '#2f6a28', outline=OUT)
    for (x, y) in ((20, 22), (28, 20), (36, 22)):
        s.flat(ell(x, y, 2, 1), '#9ad66a')
    # branching antlers made of branches with leaves
    s.part(combo(poly((10, 18), (4, 2), (7, 2), (13, 16)), poly((6, 8), (0, 6), (1, 4), (7, 6)), poly((16, 16), (22, 0), (25, 1), (19, 17)), poly((21, 7), (28, 4), (28, 6), (22, 9))), '#8a5a2a', outline=OUT)
    for (x, y) in ((2, 4), (5, 0), (24, 0), (28, 4)):
        s.part(ell(x, y + 1, 2, 2), '#8ad65a', outline=OUT)
    s.part(ell(14, 26, 9, 8), '#5e9040', outline=OUT)
    s.part(ell(10, 31, 5, 3), '#a8d080', shade=False)
    eye(s, 10, 22, big=True, glow='#c8ff8a')
    eye(s, 16, 22, big=True, glow='#c8ff8a')


# --------------------------------------------------------------- Volt line
def zippip(s):
    s.part(poly((30, 36), (40, 30), (36, 34), (46, 26), (38, 40)), '#7ae8ff', outline=OUT)  # spark tail
    s.part(ell(25, 37, 9, 7), '#f0a83a', outline=OUT)
    s.part(combo(rect(19, 41, 21, 45), rect(29, 41, 31, 45)), '#b8741a', outline=OUT)
    s.part(ell(21, 28, 9, 7), '#f6b84a', outline=OUT)
    # copper coil antennae instead of ears
    s.part(combo(rect(15, 14, 16, 22), rect(13, 12, 17, 13), rect(26, 13, 27, 21), rect(26, 11, 30, 12)), '#b0603a', outline=OUT)
    s.part(combo(ell(14, 11, 2, 2), ell(30, 10, 2, 2)), '#7ae8ff', outline=OUT)
    s.flat(combo(rect(20, 33, 30, 33), rect(23, 36, 33, 36)), '#8a4a10')  # stripes
    eye(s, 16, 25, big=True)
    eye(s, 22, 25, big=True)
    s.flat(rect(19, 31, 21, 31), OUT)


def arclyn(s):
    s.part(poly((32, 30), (42, 22), (38, 30), (47, 20), (40, 38)), '#9ff0ff', outline=OUT)
    s.part(ell(27, 33, 12, 8), '#e8a030', outline=OUT)
    for x in (18, 24, 31, 36):
        s.part(rect(x, 37, x + 2, 45), '#b08414', outline=OUT)
    s.part(ell(16, 23, 9, 8), '#f0aa3a', outline=OUT)
    s.part(combo(rect(9, 6, 10, 16), rect(6, 4, 10, 5), rect(19, 4, 20, 15), rect(19, 2, 24, 3)), '#b0603a', outline=OUT)
    s.part(combo(ell(6, 4, 2, 2), ell(24, 2, 2, 2)), '#7ae8ff', outline=OUT)
    s.flat(poly((25, 28), (31, 30), (27, 31), (33, 34)), '#8a4a10')  # bolt stripe
    eye(s, 12, 20, big=True, glow='#9ff0ff')
    eye(s, 18, 20, big=True, glow='#9ff0ff')


def tempestrix(s):
    # winged storm beast
    s.part(poly((24, 22), (46, 2), (40, 14), (47, 14), (36, 26)), '#9ff0ff', outline=OUT)  # wing
    s.part(ell(28, 32, 14, 9), '#d89020', outline=OUT)
    for x in (16, 23, 33, 39):
        s.part(rect(x, 36, x + 3, 46), '#a07810', outline=OUT)
    s.part(poly((38, 34), (47, 30), (44, 36), (47, 40), (40, 40)), '#9ff0ff', outline=OUT)
    s.part(ell(15, 21, 10, 9), '#e89a30', outline=OUT)
    s.part(combo(rect(7, 4, 8, 14), rect(3, 2, 8, 3), rect(18, 3, 19, 13), rect(18, 1, 24, 2)), '#b0603a', outline=OUT)
    s.part(combo(ell(3, 2, 2, 2), ell(24, 1, 2, 1)), '#7ae8ff', outline=OUT)
    s.flat(poly((22, 28), (30, 30), (25, 31), (33, 35)), '#8a4a10')
    eye(s, 10, 18, big=True, glow='#9ff0ff')
    eye(s, 17, 18, big=True, glow='#9ff0ff')
    s.flat(poly((4, 26), (8, 24), (6, 28)), '#fff4a0')


# --------------------------------------------------------------- Stone line
def pebblit(s):
    s.part(ell(24, 37, 11, 8), '#a89070', outline=OUT)
    s.part(combo(ell(17, 44, 3, 2), ell(31, 44, 3, 2)), '#7a6448', outline=OUT)
    s.part(poly((15, 31), (19, 23), (29, 22), (34, 31)), '#8a7458', outline=OUT)  # rock shell
    s.flat(combo(rect(20, 26, 21, 27), rect(27, 25, 28, 26)), '#c8b490')
    eye(s, 19, 35, big=True)
    eye(s, 26, 35, big=True)
    s.flat(rect(22, 40, 25, 40), OUT)


def cragoon(s):
    s.part(ell(26, 34, 15, 10), '#988060', outline=OUT)
    for x in (13, 20, 30, 37):
        s.part(rect(x, 38, x + 4, 45), '#6e5a40', outline=OUT)
    s.part(poly((12, 28), (16, 16), (26, 12), (36, 16), (40, 28)), '#7a6650', outline=OUT)
    s.part(poly((22, 14), (24, 4), (29, 13)), '#c8b490', outline=OUT)  # crystal spike
    s.flat(combo(rect(18, 20, 19, 22), rect(32, 21, 33, 23)), '#c8b490')
    eye(s, 16, 31, big=True)
    eye(s, 23, 31, big=True)
    s.flat(rect(17, 37, 22, 37), OUT)


def monolithor(s):
    s.part(rect(10, 18, 38, 44), '#8a7458', outline=OUT)  # monolith body
    s.part(combo(rect(5, 30, 11, 46), rect(37, 30, 43, 46)), '#6a5640', outline=OUT)  # arms
    s.part(poly((12, 18), (18, 4), (30, 2), (36, 18)), '#9a8466', outline=OUT)
    s.part(poly((21, 6), (24, 0), (27, 6)), '#ffe8a0', outline=OUT)
    s.flat(combo(rect(14, 26, 34, 26), rect(14, 36, 34, 36), rect(24, 26, 24, 44)), '#5a4a36')  # carved lines
    s.flat(combo(rect(16, 12, 19, 14), rect(28, 12, 31, 14)), '#ffd65a')  # glowing eyes
    s.flat(poly((18, 30), (24, 28), (30, 30), (24, 34)), '#ffd65a')


# --------------------------------------------------------------- Veil line
def wispin(s):
    s.part(poly((16, 30), (32, 30), (34, 44), (28, 40), (24, 46), (20, 40), (14, 44)), '#b08ae0', outline=OUT)
    s.part(ell(24, 26, 10, 9), '#c8a4f0', outline=OUT)
    s.part(poly((24, 17), (20, 6), (30, 12)), '#e2b8ff', outline=OUT)  # curl
    eye(s, 19, 24, big=True, color='#3e1f66')
    eye(s, 26, 24, big=True, color='#3e1f66')
    s.flat(ell(24, 31, 1, 1), '#3e1f66')


def mirravel(s):
    s.part(poly((12, 26), (36, 26), (40, 46), (32, 40), (24, 46), (16, 40), (8, 46)), '#9a6ad0', outline=OUT)  # cloak
    s.part(ell(24, 21, 11, 10), '#b48ae0', outline=OUT)
    s.part(ell(24, 21, 7, 6), '#e8f0ff', outline='#3e1f66')  # mirror face
    s.flat(poly((20, 18), (23, 16), (21, 20)), '#ffffff')
    s.part(combo(poly((14, 14), (8, 2), (19, 11)), poly((34, 14), (40, 2), (29, 11))), '#7a4ab0', outline=OUT)
    eye(s, 20, 21, color='#3e1f66')
    eye(s, 26, 21, color='#3e1f66')


def noctilume(s):
    s.part(poly((2, 18), (14, 26), (6, 34), (16, 32)), '#5a3a9a', outline=OUT)  # wings
    s.part(poly((46, 18), (34, 26), (42, 34), (32, 32)), '#5a3a9a', outline=OUT)
    s.part(poly((12, 24), (36, 24), (40, 46), (24, 42), (8, 46)), '#4a2a80', outline=OUT)
    s.part(ell(24, 18, 11, 10), '#6a4aa8', outline=OUT)
    s.part(combo(poly((15, 10), (12, 0), (21, 8)), poly((33, 10), (36, 0), (27, 8))), '#3e1f66', outline=OUT)
    s.part(ell(24, 7, 3, 3), '#fff4c0', outline='#e0b040')  # lantern moon
    eye(s, 19, 17, big=True, color='#fff4c0', glow='#e2b8ff')
    eye(s, 26, 17, big=True, color='#fff4c0', glow='#e2b8ff')
    for (x, y) in ((14, 34), (24, 36), (32, 32)):
        s.flat(ell(x, y, 1, 1), '#e2b8ff')


# --------------------------------------------------------------- Tide line 2
def shellip(s):
    s.part(ell(24, 39, 11, 6), '#f0a08a', outline=OUT)  # soft body
    s.part(combo(ell(14, 44, 3, 1), ell(34, 44, 3, 1)), '#d07a68', outline=OUT)
    s.part(poly((12, 36), (16, 24), (24, 20), (32, 24), (36, 36)), '#7ab8d8', outline=OUT)  # shell
    s.flat(combo(rect(18, 26, 18, 35), rect(24, 22, 24, 35), rect(30, 26, 30, 35)), '#4a88b0')
    eye(s, 18, 38)
    eye(s, 28, 38)


def corallop(s):
    s.part(ell(26, 37, 14, 8), '#e88a78', outline=OUT)
    for x in (12, 20, 30, 38):
        s.part(rect(x, 41, x + 2, 45), '#c06a58', outline=OUT)
    s.part(poly((12, 32), (16, 18), (26, 14), (38, 18), (40, 32)), '#5aa0c8', outline=OUT)
    for (x, y, h) in ((18, 18, 8), (26, 14, 10), (34, 18, 7)):
        s.part(combo(rect(x - 1, y - h, x + 1, y), rect(x - 3, y - h + 3, x - 1, y - h + 4)), '#ff8a9a', outline=OUT)  # coral
    eye(s, 16, 35, big=True)
    eye(s, 23, 35, big=True)


def reefwarden(s):
    s.part(ell(26, 36, 17, 9), '#d87868', outline=OUT)
    for x in (10, 18, 32, 40):
        s.part(rect(x, 40, x + 3, 46), '#a85848', outline=OUT)
    s.part(poly((8, 32), (12, 14), (26, 8), (40, 14), (44, 32)), '#4a90c0', outline=OUT)
    for (x, y, h) in ((14, 16, 10), (22, 10, 10), (30, 10, 12), (38, 16, 9)):
        s.part(combo(rect(x - 1, y - h, x + 1, y), rect(x + 1, y - h + 4, x + 4, y - h + 5)), '#ff7a8a', outline=OUT)
    s.part(ell(12, 30, 7, 6), '#e88a78', outline=OUT)
    eye(s, 8, 28, big=True, glow='#9fe0ff')
    eye(s, 14, 28, big=True, glow='#9fe0ff')
    s.flat(combo(rect(20, 22, 32, 22), rect(18, 28, 36, 28)), '#2a6a98')


# --------------------------------------------------------------- Grove line 2
def budwing(s):
    s.part(poly((24, 30), (8, 22), (14, 34)), '#9ae07a', outline=OUT)  # leaf wings
    s.part(poly((26, 30), (42, 22), (36, 34)), '#9ae07a', outline=OUT)
    s.part(ell(25, 34, 8, 8), '#ffd0e0', outline=OUT)  # bud body
    s.part(poly((19, 30), (25, 22), (31, 30)), '#ff8ab0', outline=OUT)  # petals cap
    s.part(combo(rect(21, 41, 22, 45), rect(28, 41, 29, 45)), '#5a9a3a', outline=OUT)
    eye(s, 21, 33)
    eye(s, 27, 33)
    s.flat(poly((24, 37), (26, 37), (25, 38)), '#e8a020')


def florafin(s):
    s.part(poly((22, 26), (2, 12), (8, 30)), '#7ad05a', outline=OUT)
    s.part(poly((30, 26), (46, 12), (40, 30)), '#7ad05a', outline=OUT)
    s.part(ell(26, 32, 11, 10), '#ffc0d4', outline=OUT)
    for (x, y) in ((18, 22), (26, 18), (34, 22)):
        s.part(ell(x, y, 4, 4), '#ff7aa8', outline=OUT)
    s.part(poly((32, 38), (46, 40), (38, 44)), '#7ad05a', outline=OUT)  # fin tail
    s.part(combo(rect(20, 41, 22, 45), rect(29, 41, 31, 45)), '#4a8a2a', outline=OUT)
    eye(s, 21, 30, big=True)
    eye(s, 28, 30, big=True)


def canopyra(s):
    s.part(poly((20, 22), (0, 4), (2, 28), (12, 30)), '#5ab04a', outline=OUT)
    s.part(poly((32, 22), (47, 4), (46, 28), (38, 30)), '#5ab04a', outline=OUT)
    s.part(ell(26, 33, 13, 11), '#ffb0c8', outline=OUT)
    s.part(ell(26, 16, 15, 7), '#3a8a3a', outline=OUT)  # canopy crown
    for (x, y) in ((16, 12), (24, 9), (32, 10), (38, 15)):
        s.part(ell(x, y, 3, 3), '#ff6aa0', outline=OUT)
    s.part(combo(rect(17, 42, 20, 46), rect(32, 42, 35, 46)), '#3a7a2a', outline=OUT)
    eye(s, 20, 29, big=True, glow='#c8ff8a')
    eye(s, 28, 29, big=True, glow='#c8ff8a')
    s.flat(poly((24, 36), (28, 36), (26, 38)), '#c06a20')


# --------------------------------------------------------------- singles
def kilnox(s):
    s.part(ell(26, 34, 14, 10), '#6a4a3a', outline=OUT)  # kiln body
    s.part(ell(26, 34, 6, 5), '#ff7a2a', shade=False)  # furnace belly
    s.part(ell(26, 35, 3, 2), '#ffe070', shade=False)
    for x in (15, 34):
        s.part(rect(x, 40, x + 3, 45), '#4a3226', outline=OUT)
    s.part(rect(20, 14, 26, 24), '#5a3a2e', outline=OUT)  # chimney
    flame(s, 23, 13, 8, 3)
    eye(s, 17, 28, big=True, glow='#ff7a2a')
    eye(s, 31, 28, big=True, glow='#ff7a2a')


def drizzlet(s):
    s.part(ell(24, 14, 13, 7), '#d8e8f8', outline=OUT)  # cloud
    s.part(ell(16, 16, 7, 5), '#c8dcf0', outline=OUT)
    s.part(ell(24, 32, 9, 10), '#5ab8f0', outline=OUT)  # drop body
    s.part(poly((24, 18), (17, 28), (31, 28)), '#5ab8f0', shade=False)
    for x in (12, 36):
        s.flat(poly((x, 30), (x - 1, 33), (x + 1, 33)), '#9fe0ff')
    eye(s, 20, 30, big=True)
    eye(s, 26, 30, big=True)
    s.flat(rect(23, 37, 25, 37), OUT)


def briarimp(s):
    s.part(ell(24, 34, 9, 9), '#7a5aa0', outline=OUT)
    s.part(combo(rect(19, 41, 21, 45), rect(27, 41, 29, 45)), '#4a3a6a', outline=OUT)
    s.part(combo(poly((14, 26), (6, 14), (18, 22)), poly((34, 26), (42, 14), (30, 22))), '#3a7a2a', outline=OUT)  # briar horns
    for (x, y) in ((9, 17), (39, 17)):
        s.flat(ell(x, y, 1, 1), '#ff5a7a')
    s.part(ell(24, 26, 6, 3), '#4a8a32', outline=OUT)  # leaf hat
    eye(s, 19, 31, big=True, color='#ffd65a')
    eye(s, 26, 31, big=True, color='#ffd65a')
    s.flat(poly((21, 38), (27, 38), (24, 40)), '#2a1a3a')


def coilisk(s):
    s.part(ell(30, 40, 12, 5), '#3a5a8a', outline=OUT)  # coil
    s.part(ell(28, 34, 9, 4), '#4a6aa0', outline=OUT)
    s.part(poly((24, 32), (16, 20), (20, 18), (28, 30)), '#4a6aa0', outline=OUT)  # neck
    s.part(ell(16, 18, 7, 5), '#5a7ab8', outline=OUT)
    s.flat(combo(poly((26, 39), (30, 37), (28, 40), (33, 38)), poly((24, 34), (28, 32), (26, 35))), '#ffe14a')
    eye(s, 13, 16, color='#ffe14a')
    s.flat(poly((9, 20), (5, 22), (9, 21)), '#ff5a7a')


def cairnox(s):
    s.part(ell(26, 36, 16, 9), '#8a8070', outline=OUT)
    for x in (12, 20, 31, 38):
        s.part(rect(x, 40, x + 3, 46), '#5a5244', outline=OUT)
    for (x, y, r) in ((18, 27, 6), (28, 24, 7), (37, 29, 5), (27, 16, 5)):
        s.part(ell(x, y, r, r - 1), '#a09888', outline=OUT)  # stacked cairn stones
    s.part(ell(10, 33, 7, 6), '#9a9080', outline=OUT)
    s.part(poly((6, 28), (2, 22), (9, 27)), '#e8e0c8', outline=OUT)
    eye(s, 7, 31, big=True)
    eye(s, 12, 31, big=True)


def hushowl(s):
    s.part(ell(24, 32, 11, 12), '#6a5a8a', outline=OUT)
    s.part(combo(poly((13, 30), (6, 42), (16, 40)), poly((35, 30), (42, 42), (32, 40))), '#4e3e70', outline=OUT)
    s.part(ell(24, 34, 7, 8), '#a898c8', shade=False)
    s.part(combo(poly((14, 22), (12, 12), (20, 20)), poly((34, 22), (36, 12), (28, 20))), '#4e3e70', outline=OUT)
    s.part(combo(ell(19, 26, 4, 4), ell(29, 26, 4, 4)), '#fff4c0', outline='#3e1f66')
    s.flat(combo(rect(19, 25, 20, 27), rect(28, 25, 29, 27)), '#2a1a3a')
    s.flat(poly((23, 30), (25, 30), (24, 33)), '#e0a030')
    s.part(combo(rect(19, 43, 21, 45), rect(27, 43, 29, 45)), '#e0a030', outline=OUT)


# --------------------------------------------------------------- legendaries
def aurivane(s):
    s.part(ell(24, 24, 22, 22), '#fff4c0', shade=False, light=False)  # halo
    s.part(ell(24, 24, 19, 19), '#ffe9a0', shade=False, light=False)
    s.part(poly((22, 26), (2, 8), (6, 30), (14, 32)), '#9ae07a', outline=OUT)
    s.part(poly((26, 26), (46, 8), (42, 30), (34, 32)), '#9ae07a', outline=OUT)
    s.part(ell(24, 32, 11, 10), '#f8f0d8', outline=OUT)
    for x in (17, 23, 29):
        s.part(rect(x, 38, x + 2, 46), '#d8c8a0', outline=OUT)
    s.part(ell(24, 18, 8, 8), '#fff8e8', outline=OUT)
    s.part(combo(poly((19, 12), (14, 0), (22, 9)), poly((29, 12), (34, 0), (26, 9))), '#5ac05a', outline=OUT)
    eye(s, 20, 17, big=True, color='#2a6a3a', glow='#c8ff8a')
    eye(s, 26, 17, big=True, color='#2a6a3a', glow='#c8ff8a')
    s.flat(ell(24, 31, 3, 3), '#8ad65a')


def noxeral(s):
    s.part(poly((24, 2), (46, 20), (38, 46), (10, 46), (2, 20)), '#2a1a4a', outline=OUT)  # cloak of night
    s.part(ell(24, 26, 14, 14), '#3e2a6a', outline=OUT)
    for (x, y) in ((10, 20), (38, 20), (14, 38), (34, 38), (24, 8)):
        s.flat(ell(x, y, 1, 1), '#e2b8ff')  # memory stars
    s.part(ell(24, 22, 8, 7), '#5a4a8a', outline=OUT)
    s.part(combo(poly((17, 18), (10, 4), (21, 14)), poly((31, 18), (38, 4), (27, 14))), '#1a0a30', outline=OUT)
    s.part(ell(24, 34, 5, 5), '#c8b8ff', outline='#1a0a30')  # hourglass gem
    s.flat(poly((22, 31), (26, 31), (24, 34), (26, 37), (22, 37), (24, 34)), '#3e1f66')
    eye(s, 20, 20, big=True, color='#e2b8ff', glow='#ffffff')
    eye(s, 26, 20, big=True, color='#e2b8ff', glow='#ffffff')


def concordia(s):
    s.part(ell(24, 26, 20, 18), '#f0f0ff', shade=False, light=False)
    cols = ['#e8603c', '#3b8fe0', '#4dae4a', '#e8c330', '#a08458', '#9a5cd0']
    import math
    for i, c in enumerate(cols):
        a = -math.pi / 2 + i * math.pi / 3
        x, y = 24 + int(16 * math.cos(a)), 26 + int(15 * math.sin(a))
        s.part(ell(x, y, 3, 3), c, outline=OUT)
    s.part(ell(24, 30, 10, 11), '#d8d0c0', outline=OUT)
    s.part(ell(24, 20, 8, 7), '#ece4d4', outline=OUT)
    s.part(poly((20, 14), (24, 4), (28, 14)), '#c8b490', outline=OUT)
    s.part(combo(rect(18, 38, 20, 46), rect(28, 38, 30, 46)), '#a09070', outline=OUT)
    eye(s, 20, 19, big=True, color='#3a3a5a')
    eye(s, 26, 19, big=True, color='#3a3a5a')
    s.flat(rect(22, 30, 26, 32), '#ffffff')


# --------------------------------------------------------------- artificial (story)
def hollow(s):
    s.part(poly((10, 44), (14, 16), (24, 6), (34, 16), (38, 44), (30, 38), (24, 46), (18, 38)), '#3a3a4a', outline='#ff3a6a')
    s.flat(combo(rect(18, 18, 30, 18), rect(16, 26, 32, 26), rect(18, 34, 30, 34)), '#ff3a6a')
    s.part(combo(rect(17, 12, 20, 14), rect(28, 12, 31, 14)), '#ff3a6a', shade=False)


ALL = {
    'cindlet': cindlet, 'brasear': brasear, 'solmara': solmara,
    'ripplet': ripplet, 'neruvin': neruvin, 'abyssail': abyssail,
    'mossbit': mossbit, 'thornook': thornook, 'elderhorn': elderhorn,
    'zippip': zippip, 'arclyn': arclyn, 'tempestrix': tempestrix,
    'pebblit': pebblit, 'cragoon': cragoon, 'monolithor': monolithor,
    'wispin': wispin, 'mirravel': mirravel, 'noctilume': noctilume,
    'shellip': shellip, 'corallop': corallop, 'reefwarden': reefwarden,
    'budwing': budwing, 'florafin': florafin, 'canopyra': canopyra,
    'kilnox': kilnox, 'drizzlet': drizzlet, 'briarimp': briarimp,
    'coilisk': coilisk, 'cairnox': cairnox, 'hushowl': hushowl,
    'aurivane': aurivane, 'noxeral': noxeral, 'concordia': concordia,
    'hollow': hollow,
}


def build(name):
    s = Sprite(W, H)
    ALL[name](s)
    s.outline_all(OUT)
    return s
