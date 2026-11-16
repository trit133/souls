# The Adept's right-hand skill tree piece, painted pixel by pixel at its true size (410 x 300: one pixel of art is one
# pixel of the image, so the game blows it up crisp). After Jonah's painting (public/tree/old): a library's corner past
# the middle: beaded chains hanging into the dark, a stone pillar, a tall gothic window onto a violet city of spires,
# the brass-caged crystal reactor on its pedestal (the game spins a jewel in it), a console, a red banner with a gold
# cross, tall bookshelves (candles, a purple jar, an hourglass, an armillary, a chest), a balustrade, stone steps, a
# red velvet curtain and ivy. Writes public/tree/adept right.png
# python3 scripts/paint-adept-right.py
from PIL import Image
import math, random

W, H = 410, 300
random.seed(7)
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
px = img.load()

def hexc(h, a=255): h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[int(x), int(y)] = c
def rect(x0, y0, x1, y1, c):
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)): put(x, y, c)
def dith(x0, y0, x1, y1, a, b, f):
    # a two-colour ordered dither: f(x, y) the share of b (0..1)
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            put(x, y, b if f(x, y) * 16 > BAYER[y % 4][x % 4] + 0.5 else a)
def ramp(cols, t):
    t = max(0, min(0.999, t)); return cols[int(t * len(cols))]
def hline(x0, x1, y, c):
    for x in range(int(x0), int(x1)): put(x, y, c)
def vline(x, y0, y1, c):
    for y in range(int(y0), int(y1)): put(x, y, c)
def line(x0, y0, x1, y1, c):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1): put(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)
def ellipse(cx, cy, rx, ry, c, fill=False, arc=None):
    if fill:
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if ((x - cx) / max(rx, .5)) ** 2 + ((y - cy) / max(ry, .5)) ** 2 <= 1: put(x, y, c)
        return
    n = int(2 * math.pi * max(rx, ry)) * 2 + 8
    for i in range(n):
        a = 2 * math.pi * i / n
        if arc and not arc(a): continue
        put(round(cx + math.cos(a) * rx), round(cy + math.sin(a) * ry), c)

# ---------- the palette (after the painting) ----------
ST = [hexc(c) for c in ['#140f1c', '#1f1729', '#2b2238', '#3a2f4b', '#4b3f5e', '#5e5274', '#73688a', '#8c82a2']]  # stone, dark to light
BR = [hexc(c) for c in ['#2e1c0a', '#5a3814', '#8a5a1e', '#b8822c', '#e0b048', '#fff0a8']]  # brass
VI = [hexc(c) for c in ['#1a0a30', '#2e1256', '#4a1e86', '#6e34b8', '#9a5ae6', '#c890ff', '#ecd8ff']]  # violet glow
CY = [hexc(c) for c in ['#0a2a36', '#126078', '#2aa0c4', '#5ae0ff', '#c8f8ff']]  # cyan
RD = [hexc(c) for c in ['#2a0608', '#4e0c10', '#781418', '#a42020', '#cc3628', '#e8603a']]  # banner / curtain red
SKY = [hexc(c) for c in ['#140a2a', '#24124a', '#3a1e6a', '#5a3490', '#7e58b8', '#a888dc']]
IVY = [hexc(c) for c in ['#14200e', '#22381a', '#3a5a26', '#5e8a34', '#8ab84a']]
WOOD = [hexc(c) for c in ['#1a0e08', '#2e1a10', '#4a2c18', '#6a4024']]
BOOK = [['#5a1418', '#7a1e22', '#a03028'], ['#1a2a4a', '#24406a', '#3a5a8a'], ['#1e3a24', '#2a5232', '#3e7044'], ['#4a2a12', '#6a3e1a', '#8a5426'],
        ['#3a1a4a', '#552a6a', '#7a3e8e'], ['#5a4a1a', '#7a6624', '#a08a34'], ['#2a2a30', '#3e3e46', '#56565e']]
BOOK = [[hexc(c) for c in b] for b in BOOK]
BLACK = hexc('#08060c')

FLOOR_Y = 262

# ---------- the back wall: dark stone blocks behind the window, the reactor and the shelves ----------
def stone_wall(x0, y0, x1, y1, base=2):
    rect(x0, y0, x1, y1, ST[base])
    bh = 9
    for row, y in enumerate(range(y0, y1, bh)):
        off = (row % 2) * 9
        hline(x0, x1, y, ST[base - 1])
        for x in range(x0 - off, x1, 18):
            vline(x, y, min(y + bh, y1), ST[base - 1])
            # a little light on each block's top-left, a speck or two of wear
            hline(max(x0, x + 1), min(x1, x + 17), y + 1, ST[base + 1])
            for _ in range(2):
                sx, sy = x + random.randint(2, 15), y + random.randint(2, bh - 2)
                if x0 <= sx < x1 and sy < y1: put(sx, sy, ST[base + random.choice([-1, 1])])
stone_wall(118, 0, W, FLOOR_Y, 2)
# deep shade toward the middle edge of the wall
dith(118, 0, 150, FLOOR_Y, ST[1], ST[2], lambda x, y: (x - 118) / 32)

# ---------- the window: a tall gothic arch onto a violet city of spires ----------
WX0, WX1, WTOP, WSPRING, WBOT = 134, 214, 20, 60, 172
WCX, WR = (WX0 + WX1) / 2, (WX1 - WX0) / 2
def in_win(x, y):
    if x < WX0 or x >= WX1 or y >= WBOT: return False
    if y >= WSPRING: return True
    # a pointed arch: two arcs meeting at the top
    r = WR * 1.35
    return (x - (WX1 - r)) ** 2 + (y - WSPRING) ** 2 <= r * r and (x - (WX0 + r)) ** 2 + (y - WSPRING) ** 2 <= r * r
for y in range(WTOP - 4, WBOT):
    for x in range(WX0, WX1):
        if in_win(x, y): put(x, y, ramp(SKY, (y - WTOP) / (WBOT - WTOP) * 1.1))
# clouds drifting across the sky, a pale glow behind the spires
for cy, cx0, cx1 in [(48, 140, 190), (66, 160, 214), (84, 134, 176)]:
    for x in range(cx0, cx1):
        h = 2 + int(2 * math.sin(x * 0.35 + cy))
        for y in range(cy - h, cy + 1):
            if in_win(x, y): put(x, y, SKY[4] if y < cy - h + 2 else SKY[3])
for y in range(110, WBOT):
    for x in range(WX0, WX1):
        if in_win(x, y) and (y - 110) / 60 * 16 > BAYER[y % 4][x % 4] + 5: put(x, y, SKY[4])
# the city: spires and towers in silhouette, lit windows
random.seed(3)
spires = [(140, 132, 4), (148, 112, 5), (156, 124, 3), (163, 96, 6), (172, 118, 4), (180, 88, 5), (188, 106, 4), (196, 120, 5), (204, 100, 4), (210, 128, 3)]
for sx, top, w in spires:
    for y in range(top, WBOT):
        hw = w if y > top + w * 3 else max(0, (y - top) // 3)
        for x in range(sx - hw, sx + hw + 1):
            if in_win(x, y): put(x, y, SKY[0] if x > sx - hw else SKY[1])
    for _ in range(4):
        wx, wy = sx + random.randint(-w + 1, w - 1), random.randint(top + w * 3 + 2, WBOT - 4)
        if in_win(wx, wy): put(wx, wy, hexc('#ffb860') if random.random() < 0.6 else VI[5])
for x in range(WX0, WX1):  # a low wall of roofs along the bottom
    for y in range(WBOT - 10 + int(2 * math.sin(x * 0.7)), WBOT):
        if in_win(x, y): put(x, y, SKY[0])
# the tracery: a mullion and a transom, a quatrefoil in the arch, the stone frame
for y in range(WTOP, WBOT):
    for x in range(WX0, WX1):
        if in_win(x, y) and (abs(x - WCX) < 1.5 or abs(y - 104) < 1.2): put(x, y, ST[4] if abs(x - WCX) < 0.6 else ST[3])
ellipse(WCX, 42, 9, 9, ST[4]); ellipse(WCX, 42, 8, 8, ST[3])
for a in range(4): ellipse(WCX + math.cos(a * math.pi / 2) * 5, 42 + math.sin(a * math.pi / 2) * 5, 4, 4, ST[4])
for y in range(WTOP - 6, WBOT + 8):
    for x in range(WX0 - 7, WX1 + 7):
        if in_win(x, y): continue
        # the frame: within a few pixels of the opening
        near = any(in_win(x + dx, y + dy) for dx, dy in [(-6, 0), (6, 0), (0, 6), (0, -6), (-4, 4), (4, 4), (-4, -4), (4, -4)])
        if near: put(x, y, ST[5] if (x < WCX and y < WBOT) else ST[4])
for x in range(WX0 - 8, WX1 + 8): put(x, WBOT + 2, ST[6]); put(x, WBOT + 3, ST[5]); put(x, WBOT + 8, ST[2])  # the sill
rect(WX0 - 8, WBOT + 4, WX1 + 8, WBOT + 8, ST[4])
# ivy spilling over the sill
for x in range(WX0 + 30, WX0 + 56):
    for y in range(WBOT + 2, WBOT + 2 + int(6 + 5 * math.sin(x * 0.6))):
        if random.random() < 0.7: put(x, y, IVY[random.randint(1, 4)])

# ---------- the pillar between the dark and the window ----------
PX0, PX1 = 100, 128
for y in range(0, FLOOR_Y):
    for x in range(PX0, PX1):
        t = (x - PX0) / (PX1 - PX0)
        c = ST[3] if t < 0.15 else ST[5] if t < 0.4 else ST[4] if t < 0.75 else ST[3]
        if (x - PX0) in (7, 14, 21): c = ST[2]  # fluting
        put(x, y, c)
    put(PX0, y, ST[1]); put(PX1 - 1, y, ST[1])
for y0 in (40, 150):  # carved bands with a gold ring
    rect(PX0 - 4, y0, PX1 + 4, y0 + 8, ST[4]); hline(PX0 - 4, PX1 + 4, y0, ST[6]); hline(PX0 - 4, PX1 + 4, y0 + 7, ST[2])
    hline(PX0 - 3, PX1 + 3, y0 + 3, BR[3]); hline(PX0 - 3, PX1 + 3, y0 + 4, BR[2])
# its gothic base
rect(PX0 - 6, 226, PX1 + 6, FLOOR_Y, ST[4]); hline(PX0 - 6, PX1 + 6, 226, ST[6]); rect(PX0 - 8, 248, PX1 + 8, FLOOR_Y, ST[3]); hline(PX0 - 8, PX1 + 8, 248, ST[5])
for x in range(PX0 - 4, PX1 + 4, 6): line(x, 236, x + 3, 230, BR[3]); line(x + 3, 230, x + 6, 236, BR[3])

# ---------- the banner: red with a gold cross, hung from a brass rod, fringed ----------
BX0, BX1, BTOP, BBOT = 262, 294, 6, 112
hline(BX0 - 4, BX1 + 4, BTOP - 2, BR[3]); hline(BX0 - 4, BX1 + 4, BTOP - 1, BR[2]); put(BX0 - 5, BTOP - 2, BR[4]); put(BX1 + 4, BTOP - 2, BR[4])
for y in range(BTOP, BBOT + 16):
    for x in range(BX0, BX1):
        tip = BBOT + 16 - abs(x - (BX0 + BX1) / 2) * 1.0  # the pointed end
        if y > tip: continue
        fold = math.sin((x - BX0) * 0.55) * 0.5 + 0.5
        put(x, y, ramp(RD[1:5], fold * 0.8 + (0.2 if y < 20 else 0)))
    # a gold border down each side
    put(BX0 + 1, y, BR[3]) if y < BBOT + 2 else None; put(BX1 - 2, y, BR[3]) if y < BBOT + 2 else None
cx, cy = (BX0 + BX1) // 2, 46
for y in range(cy - 22, cy + 30): put(cx, y, BR[4]); put(cx + 1, y, BR[3])
for x in range(cx - 11, cx + 13): put(x, cy - 6, BR[4]); put(x, cy - 5, BR[3])
for ex, ey in [(cx, cy - 23), (cx - 12, cy - 6), (cx + 13, cy - 6), (cx, cy + 30)]: ellipse(ex, ey, 2, 2, BR[4], fill=True)
for x in range(BX0, BX1):  # the gold fringe along the point
    y = int(BBOT + 16 - abs(x - (BX0 + BX1) / 2))
    put(x, y, BR[3]); put(x, y + 1, BR[2]) if x % 2 else None

# ---------- the bookshelves ----------
SX0, SMID, SX1 = 298, 354, W
rect(SX0, 0, SX1, FLOOR_Y, WOOD[1])
SHELVES = [32, 66, 100, 134, 168, 202, 236]
def books(x0, x1, base, tall=26):
    x = x0
    while x < x1 - 2:
        w = random.choice([3, 3, 4, 4, 5, 6]); h = random.randint(tall - 9, tall)
        if x + w > x1: break
        B = random.choice(BOOK)
        lean = random.random() < 0.08
        for yy in range(base - h, base):
            for xx in range(x, x + w):
                sx = xx + ((base - yy) // 6 if lean else 0)
                if sx >= x1: continue
                put(sx, yy, B[0] if xx == x else B[2] if xx == x + 1 else B[1])
        # gold bands across the spine
        for by in (base - h + 3, base - 4):
            for xx in range(x, x + w): put(xx + ((base - by) // 6 if lean else 0), by, BR[3] if xx > x else BR[2])
        put(x + 1, base - h + 1, BR[4])
        x += w + (1 if random.random() < 0.2 else 0)
random.seed(11)
for i, base in enumerate(SHELVES):
    # each shelf's back and its board
    rect(SX0 + 3, base - 31, SX1, base, WOOD[0])
    books(SX0 + 4, SMID - 2, base, 27)
    books(SMID + 4, SX1, base, 27)
    rect(SX0, base, SX1, base + 3, WOOD[3]); hline(SX0, SX1, base, BR[2]); hline(SX0, SX1, base + 3, WOOD[0])
# the uprights, brass-capped
for x0 in (SX0, SMID - 2):
    rect(x0, 0, x0 + 4, FLOOR_Y, WOOD[2]); vline(x0, 0, FLOOR_Y, WOOD[0]); vline(x0 + 1, 0, FLOOR_Y, WOOD[3])
    for y in SHELVES: rect(x0 - 1, y - 2, x0 + 5, y + 4, BR[2]); hline(x0 - 1, x0 + 5, y - 2, BR[4])
# the things on the shelves (each cleared of books first)
def clear(x0, y0, x1, y1): rect(x0, y0, x1, y1, WOOD[0])
# a purple jar, glowing (shelf 2, left)
clear(304, 70, 322, 100)
rect(306, 76, 320, 99, VI[2]); dith(306, 76, 320, 99, VI[3], VI[4], lambda x, y: 0.7 - abs(x - 313) / 10)
ellipse(313, 76, 7, 2, BR[3], fill=True); rect(310, 70, 317, 75, BR[2]); hline(310, 317, 70, BR[4]); rect(305, 98, 321, 100, BR[3])
vline(308, 78, 97, VI[6])
# an armillary sphere (shelf 2, right)
clear(360, 68, 404, 100)
for r, ry in [(13, 13), (13, 4), (4, 13)]: ellipse(382, 82, r, ry, BR[3])
ellipse(382, 82, 13, 13, BR[4], arc=lambda a: math.sin(a) < -0.3)
line(374, 94, 390, 70, BR[2]); ellipse(382, 82, 2, 2, BR[5], fill=True)
rect(379, 95, 386, 100, BR[2]); hline(376, 389, 99, BR[3])
# candles: shelf 4 left (a pair), shelf 1 right, shelf 6 left, shelf 3 right (singles)
def candle(x, base, h):
    rect(x, base - h, x + 3, base, hexc('#e8dcc0')); vline(x, base - h, base, hexc('#b8a888')); put(x + 1, base - h - 1, hexc('#3a2a1a'))
    put(x + 1, base - h - 2, hexc('#ffb040')); put(x + 1, base - h - 3, hexc('#fff2b0'))
    for dy in range(2):  # wax dripping
        put(x + 2, base - h + dy, hexc('#fff6e0'))
    rect(x - 2, base - 2, x + 5, base, BR[2])
clear(318, 112, 340, 134); candle(320, 134, 9); candle(328, 134, 13); candle(335, 134, 7)
clear(388, 8, 404, 32); candle(392, 32, 10)
clear(302, 184, 316, 202); candle(306, 202, 11)
clear(364, 110, 378, 134); candle(368, 134, 8)
clear(330, 218, 350, 236); candle(334, 236, 9); candle(342, 236, 12)
# an hourglass (shelf 5, right)
clear(380, 140, 400, 168)
rect(381, 141, 399, 144, BR[3]); rect(381, 165, 399, 168, BR[3]); vline(382, 144, 165, BR[2]); vline(397, 144, 165, BR[2])
for y in range(144, 165):
    hw = int(abs(y - 154.5) * 0.7) + 1
    for x in range(390 - hw, 390 + hw + 1): put(x, y, hexc('#2a2440') if (y < 154 and y < 150) or (y >= 154 and y < 160) else VI[4] if y >= 160 or (y >= 150 and y < 154) else hexc('#2a2440'))
    put(390 - hw, y, hexc('#8c86a8')); put(390 + hw, y, hexc('#5a5478'))
# a small brass-bound chest (shelf 5, left)
clear(318, 150, 344, 168)
rect(320, 156, 342, 168, WOOD[3]); rect(320, 152, 342, 157, WOOD[2]); hline(320, 342, 152, BR[3]); hline(320, 342, 157, BR[3])
vline(325, 152, 168, BR[2]); vline(337, 152, 168, BR[2]); rect(329, 158, 333, 162, BR[4])
# ivy down the shelves' outer edge
for x0, y0, ln in [(402, 0, 120), (396, 0, 70)]:
    x = x0
    for y in range(y0, y0 + ln):
        x += random.choice([-1, 0, 0, 1]); x = max(392, min(W - 1, x))
        put(x, y, IVY[1])
        if y % 4 == 0:
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (-2, 1), (2, 1)]: put(x + dx, y + dy, IVY[random.randint(2, 4)])

# ---------- the reactor: a crystal in a brass-caged glass tube on a pedestal ----------
TCX = 230
# the pipes behind it first: copper runs into the wall, banded in cyan
def pipe(points):
    # a copper pipe 4 pixels thick, lit along one side, with cyan-lit couplings every so often and at the bends
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        horiz = y0 == y1
        n = int(max(abs(x1 - x0), abs(y1 - y0)))
        for i in range(n + 1):
            x, y = round(x0 + (x1 - x0) * i / max(n, 1)), round(y0 + (y1 - y0) * i / max(n, 1))
            for k in range(4):
                c = [BR[1], BR[3], BR[2], BR[0]][k]
                put(x, y - 1 + k, c) if horiz else put(x - 1 + k, y, c)
            if i % 16 == 8:
                for k in range(-2, 4):
                    for j in range(3): put(x + j - 1, y - 1 + k, CY[2] if j != 1 else CY[3]) if horiz else put(x - 1 + k, y + j - 1, CY[2] if j != 1 else CY[3])
        rect(x1 - 2, y1 - 2, x1 + 4, y1 + 4, BR[2]); put(x1, y1, BR[4])  # an elbow
pipe([(198, 238), (186, 238), (186, 200), (176, 190), (150, 190)])
pipe([(262, 232), (276, 232), (276, 180), (296, 180)])
pipe([(204, 252), (160, 252), (150, 244), (130, 244)])
# the pedestal
rect(TCX - 32, 214, TCX + 32, FLOOR_Y, ST[4]); hline(TCX - 32, TCX + 32, 214, ST[6]); rect(TCX - 36, 250, TCX + 36, FLOOR_Y, ST[3]); hline(TCX - 36, TCX + 36, 250, ST[5])
for x in range(TCX - 30, TCX + 30, 8): line(x, 224, x + 4, 218, BR[3]); line(x + 4, 218, x + 8, 224, BR[3])  # a gold arcade
rect(TCX - 4, 226, TCX + 4, 248, CY[0])
for y in range(228, 247, 3): rect(TCX - 2, y, TCX + 3, y + 2, CY[3] if y % 6 else CY[4])  # its cyan light strip
rect(TCX - 34, 206, TCX + 34, 214, BR[2]); hline(TCX - 34, TCX + 34, 206, BR[4]); hline(TCX - 34, TCX + 34, 213, BR[1])
for x in range(TCX - 30, TCX + 31, 6): put(x, 209, BR[5])
# the glass tube, violet, the crystal in it (the game spins a bigger one over it)
GX0, GX1, GY0, GY1 = TCX - 24, TCX + 24, 98, 206
for y in range(GY0, GY1):
    for x in range(GX0, GX1):
        t = abs(x - TCX) / 24
        put(x, y, ramp(VI[1:6], 0.75 - t * 0.6 + 0.08 * math.sin(y * 0.2)))
for x0 in (GX0 + 5, GX0 + 7, GX1 - 9): vline(x0, GY0 + 4, GY1 - 4, VI[6] if x0 != GX0 + 7 else VI[5])  # highlights down the glass
for _ in range(40): put(random.randint(GX0 + 3, GX1 - 3), random.randint(GY0 + 4, GY1 - 4), VI[6])  # motes
for y in range(150 - 26, 150 + 27):  # the crystal
    hw = int((1 - abs(y - 150) / 26) * 10)
    for x in range(TCX - hw, TCX + hw + 1): put(x, y, VI[5] if x < TCX else VI[4])
    put(TCX - hw, y, VI[6]); put(TCX + hw, y, VI[3])
vline(GX0, GY0, GY1, BR[2]); vline(GX1 - 1, GY0, GY1, BR[2])
for gx in (GX0 - 3, GX1 + 2):  # the cage's uprights
    rect(gx, GY0 - 4, gx + 2, GY1 + 2, BR[3]); vline(gx, GY0 - 4, GY1 + 2, BR[4])
for by in (GY0, GY1 - 4):  # its bands
    rect(GX0 - 4, by, GX1 + 4, by + 4, BR[2]); hline(GX0 - 4, GX1 + 4, by, BR[4]); hline(GX0 - 4, GX1 + 4, by + 3, BR[1])
    for x in range(GX0 - 2, GX1 + 3, 5): put(x, by + 2, BR[5])  # rivets
# the dome over it, a spire and a wide brass ring
for y in range(66, GY0):
    hw = int(26 * math.sqrt(max(0, 1 - ((GY0 - y) / 32) ** 2)))
    for x in range(TCX - hw, TCX + hw): put(x, y, ramp(BR[1:5], 0.3 + (1 - abs(x - TCX + 6) / max(hw, 1)) * 0.6))
for y in range(68, GY0, 7): hline(TCX - int(26 * math.sqrt(max(0, 1 - ((GY0 - y) / 32) ** 2))), TCX + int(26 * math.sqrt(max(0, 1 - ((GY0 - y) / 32) ** 2))), y, BR[1])
rect(TCX - 2, 46, TCX + 2, 68, BR[3]); vline(TCX - 2, 46, 68, BR[4]); ellipse(TCX, 52, 4, 4, BR[4], fill=True); put(TCX, 40, BR[5]); vline(TCX, 41, 46, BR[3])
ellipse(TCX, 88, 46, 7, BR[1]); ellipse(TCX, 88, 45, 6, BR[3]); ellipse(TCX, 88, 45, 6, BR[4], arc=lambda a: math.sin(a) > 0)
for a in range(0, 360, 45): put(TCX + math.cos(math.radians(a)) * 45, 88 + math.sin(math.radians(a)) * 6, CY[3])
# a little console beside it, its screen lit cyan
rect(262, 212, 286, 250, ST[3]); hline(262, 286, 212, ST[5]); rect(264, 200, 284, 214, BR[2]); hline(264, 284, 200, BR[4])
rect(266, 202, 282, 211, CY[1])
for y in range(203, 211, 2):
    for x in range(267, 281):
        if random.random() < 0.55: put(x, y, CY[3] if random.random() < 0.7 else CY[4])
rect(268, 222, 280, 246, ST[2])
for y in range(224, 245, 4): hline(270, 278, y, BR[2])

# ---------- the balustrade along the front ----------
RX0, RX1, RTOP = 52, 262, 228
rect(RX0, RTOP, RX1, RTOP + 6, ST[5]); hline(RX0, RX1, RTOP, ST[7]); hline(RX0, RX1, RTOP + 5, ST[3])
for x in range(RX0 + 8, RX1 - 4, 9):  # balusters: little stone vases
    for y in range(RTOP + 6, FLOOR_Y):
        t = (y - RTOP - 6) / (FLOOR_Y - RTOP - 6)
        hw = 1 + int(2.2 * math.sin(t * math.pi) + (1 if t > 0.85 else 0))
        for xx in range(x - hw, x + hw + 1): put(xx, y, ST[5] if xx < x else ST[4])
        put(x - hw, y, ST[6])
for nx in (RX0, RX1 - 10):  # newel posts with caps
    rect(nx, RTOP - 14, nx + 10, FLOOR_Y, ST[4]); vline(nx, RTOP - 14, FLOOR_Y, ST[6]); vline(nx + 9, RTOP - 14, FLOOR_Y, ST[2])
    rect(nx - 2, RTOP - 18, nx + 12, RTOP - 14, ST[5]); hline(nx - 2, nx + 12, RTOP - 18, ST[7])
    for y in range(RTOP - 26, RTOP - 18):  # a finial
        hw = (y - (RTOP - 26)) // 2
        for x in range(nx + 5 - hw, nx + 5 + hw + 1): put(x, y, ST[5])
    hline(nx + 1, nx + 9, RTOP + 12, BR[3])

# ---------- the floor: stone steps down toward the middle, a cyan seam in the top step ----------
for i, (y0, y1, xstart) in enumerate([(FLOOR_Y, 272, 34), (272, 284, 16), (284, H, 0)]):
    for y in range(y0, y1):
        for x in range(xstart, W):
            put(x, y, ST[5] if y == y0 else ST[4] if y < y0 + 3 else ST[3])
    for x in range(xstart + 6, W, 22): vline(x, y0 + 1, y1, ST[2])
    hline(xstart, W, y1 - 1, ST[2])
for x in range(60, 300, 1):
    if (x // 9) % 2 == 0: put(x, FLOOR_Y + 5, CY[3]); put(x, FLOOR_Y + 6, CY[2])
# a sheen of the reactor's glow on the step tops
for y in (FLOOR_Y + 1, 273, 285):
    for x in range(TCX - 34, TCX + 34):
        if (1 - abs(x - TCX) / 34) * 16 > BAYER[y % 4][x % 4] + 4: put(x, y, VI[3] if abs(x - TCX) > 12 else VI[4])

# ---------- the red velvet curtain, drawn down over the bottom right corner ----------
for y in range(196, H):
    t = (y - 196) / (H - 196)
    xl = int(W - 8 - t * 78 - 10 * math.sin(t * 3))
    for x in range(xl, W):
        u = x - xl
        # deep folds of varying width, gathered toward the tie-back, darker at the outside edge
        fold = math.sin(u * 0.33 + math.sin(u * 0.09) * 2.2 - y * 0.05) * 0.5 + 0.5
        shade = fold * 0.9 - (0.25 if u < 3 else 0) + (0.1 if 214 < y < 236 else 0)
        put(x, y, ramp(RD[0:6], max(0, shade)))
    put(xl, y, RD[0]); put(xl + 1, y, BR[3]) if y > 210 else None
for x in range(W - 90, W):  # the gold fringe along its hem
    if (x % 3) != 2: put(x, H - 2, BR[4]); put(x, H - 1, BR[2])
# its tie-back cord
line(W - 30, 228, W - 4, 214, BR[3]); line(W - 30, 229, W - 4, 215, BR[2]); ellipse(W - 31, 230, 2, 3, BR[4], fill=True)

# ---------- chains and cables hanging into the dark toward the middle ----------
def strand(xa, xb, sag, c1, c2, step=3):
    for i in range(0, int(xb - xa) + 1):
        x = xa + i
        y = int(sag * math.sin(math.pi * i / (xb - xa)))
        put(x, y, c1 if (i // step) % 2 else c2); put(x, y + 1, BR[0] if (i // step) % 2 else c1)
strand(4, 100, 52, BR[3], BR[2])
strand(26, 112, 36, RD[3], RD[4], 2)
strand(48, 132, 64, BR[4], BR[3], 2)
strand(70, 128, 22, CY[2], CY[1], 4)
for hx, hy, ln in [(28, 0, 70), (88, 0, 44)]:  # two chains hanging straight down, a lamp-weight at the end
    for y in range(hy, hy + ln): put(hx, y, BR[3] if (y // 2) % 2 else BR[2]); put(hx + 1, y, BR[1])
    ellipse(hx, hy + ln + 2, 2, 3, BR[3], fill=True); put(hx, hy + ln + 1, BR[5])

# a thin dark outline round everything, against the dark middle (like the painting's)
src = img.copy(); sp = src.load()
for y in range(H):
    for x in range(W):
        if sp[x, y][3] == 0 and any(0 <= x + dx < W and 0 <= y + dy < H and sp[x + dx, y + dy][3] for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]):
            px[x, y] = BLACK
img.save('public/tree/adept right.png')
print('saved', img.size)
