# A small pixel painter for the skill tree's side pieces (scripts/paint-*.py): an RGBA canvas painted pixel by pixel at
# the art's true size, the palettes taken from Jonah's paintings, and the parts the pieces are built from (stone walls,
# gothic windows, pillars, banners, bookshelves, candles, braziers, glowing tubes, towers, battlements, cannons,
# rubble, ivy, steps, chains, pipes). Everything is plain Python + Pillow.
from PIL import Image
import math, random

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
def hexc(h, a=255): h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
def pal(*cs): return [hexc(c) for c in cs]
CLEAR = (0, 0, 0, 0)

# ---------- palettes ----------
ST = pal('#140f1c', '#1f1729', '#2b2238', '#3a2f4b', '#4b3f5e', '#5e5274', '#73688a', '#8c82a2')    # violet stone (the Adept, the Shrike)
GS = pal('#0e0e12', '#18181e', '#24242c', '#33333d', '#45454f', '#585862', '#6e6e78', '#8a8a94')    # grey castle stone (the Templar)
BR = pal('#2e1c0a', '#5a3814', '#8a5a1e', '#b8822c', '#e0b048', '#fff0a8')                           # brass and gold
VI = pal('#1a0a30', '#2e1256', '#4a1e86', '#6e34b8', '#9a5ae6', '#c890ff', '#ecd8ff')                # violet glow
CY = pal('#0a2a36', '#126078', '#2aa0c4', '#5ae0ff', '#c8f8ff')                                      # cyan
RD = pal('#2a0608', '#4e0c10', '#781418', '#a42020', '#cc3628', '#e8603a')                           # banner red
GL = pal('#3a0606', '#7a0a0a', '#c01818', '#ff3a2a', '#ff9a80', '#ffe0d8')                           # red glow
SKY = pal('#140a2a', '#24124a', '#3a1e6a', '#5a3490', '#7e58b8', '#a888dc')
IVY = pal('#14200e', '#22381a', '#3a5a26', '#5e8a34', '#8ab84a')
WOOD = pal('#1a0e08', '#2e1a10', '#4a2c18', '#6a4024', '#8a5a34')
IRON = pal('#0c0c10', '#1a1a20', '#2a2a32', '#3e3e48', '#5a5a66', '#7a7a86')
FIRE = pal('#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6')
BOOK = [pal('#5a1418', '#7a1e22', '#a03028'), pal('#1a2a4a', '#24406a', '#3a5a8a'), pal('#1e3a24', '#2a5232', '#3e7044'), pal('#4a2a12', '#6a3e1a', '#8a5426'),
        pal('#3a1a4a', '#552a6a', '#7a3e8e'), pal('#5a4a1a', '#7a6624', '#a08a34'), pal('#2a2a30', '#3e3e46', '#56565e')]
BLACK = hexc('#08060c')


class Canvas:
    def __init__(self, w, h, seed=1):
        self.W, self.H = w, h
        self.img = Image.new('RGBA', (w, h), CLEAR)
        self.px = self.img.load()
        random.seed(seed)

    # ---------- primitives ----------
    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.W and 0 <= y < self.H: self.px[x, y] = c
    def get(self, x, y): return self.px[x, y] if 0 <= x < self.W and 0 <= y < self.H else CLEAR
    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1)):
            for x in range(int(x0), int(x1)): self.put(x, y, c)
    def hline(self, x0, x1, y, c):
        for x in range(int(x0), int(x1)): self.put(x, y, c)
    def vline(self, x, y0, y1, c):
        for y in range(int(y0), int(y1)): self.put(x, y, c)
    def line(self, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1): self.put(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c)
    def dith(self, x0, y0, x1, y1, a, b, f):
        for y in range(int(y0), int(y1)):
            for x in range(int(x0), int(x1)):
                self.put(x, y, b if f(x, y) * 16 > BAYER[y % 4][x % 4] + 0.5 else a)
    def ellipse(self, cx, cy, rx, ry, c, fill=False, arc=None):
        if fill:
            for y in range(int(cy - ry), int(cy + ry) + 1):
                for x in range(int(cx - rx), int(cx + rx) + 1):
                    if ((x - cx) / max(rx, .5)) ** 2 + ((y - cy) / max(ry, .5)) ** 2 <= 1: self.put(x, y, c)
            return
        n = int(2 * math.pi * max(rx, ry)) * 2 + 8
        for i in range(n):
            a = 2 * math.pi * i / n
            if arc and not arc(a): continue
            self.put(cx + math.cos(a) * rx, cy + math.sin(a) * ry, c)
    def poly(self, pts, c):
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            xs = []
            for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
                if (y0 <= y < y1) or (y1 <= y < y0): xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]): self.hline(round(a), round(b) + 1, y, c)
    @staticmethod
    def ramp(cols, t): t = max(0, min(0.999, t)); return cols[int(t * len(cols))]

    # ---------- surfaces ----------
    def blocks(self, x0, y0, x1, y1, P, base=2, bw=18, bh=9, wear=2):
        """a wall of dressed stone blocks"""
        self.rect(x0, y0, x1, y1, P[base])
        for row, y in enumerate(range(int(y0), int(y1), bh)):
            off = (row % 2) * (bw // 2)
            self.hline(x0, x1, y, P[base - 1])
            for x in range(int(x0) - off, int(x1), bw):
                if x >= x0: self.vline(x, y, min(y + bh, y1), P[base - 1])  # (never outside the wall)
                self.hline(max(x0, x + 1), min(x1, x + bw - 1), y + 1, P[base + 1])
                for _ in range(wear):
                    sx, sy = x + random.randint(2, bw - 3), y + random.randint(2, bh - 2)
                    if x0 <= sx < x1 and sy < y1: self.put(sx, sy, P[base + random.choice([-1, 1])])
    def floor_tiles(self, x0, y0, x1, y1, P, gloss=(), gloss_col=None):
        """a tiled floor, rows of slabs, glossy streaks where light falls on it (gloss: x positions)"""
        for y in range(int(y0), int(y1)):
            for x in range(int(x0), int(x1)):
                self.put(x, y, P[5] if y == y0 else P[3] if (y - y0) % 8 else P[2])
        for row, y in enumerate(range(int(y0), int(y1), 8)):
            for x in range(int(x0) + (row % 2) * 9, int(x1), 18): self.vline(x, y + 1, min(y + 8, y1), P[2])
        # a light's reflection: short horizontal glints in the slabs under it, fewer and shorter further down
        for gx in gloss:
            for y in range(int(y0) + 3, int(y1), 3):
                k = 1 - (y - y0) / max(1, (y1 - y0))
                w = int(2 + 7 * k)
                if random.random() < 0.8:
                    x = gx + random.randint(-3, 3)
                    for xx in range(x - w, x + w + 1, 1 if k > 0.5 else 2):
                        if self.get(xx, y)[3]: self.put(xx, y, gloss_col or P[6])
    def steps(self, xr, y0, rows, P, step_in=16, left=True):
        """stone steps: rows of (height); each lower row reaching further out toward the middle"""
        y = y0
        for i, h in enumerate(rows):
            reach = step_in * (i + 1)
            xa, xb = (0, xr + reach) if left else (xr - reach, self.W)
            for yy in range(y, y + h):
                for x in range(xa, xb): self.put(x, yy, P[5] if yy == y else P[4] if yy < y + 3 else P[3])
            for x in range(xa + 6, xb, 22): self.vline(x, y + 1, y + h, P[2])
            self.hline(xa, xb, y + h - 1, P[2])
            y += h

    # ---------- architecture ----------
    def gothic_window(self, x0, x1, top, spring, bot, P, sky=True, city=True, pointed=1.3, lights=('#ffb860', '#c890ff')):
        cx, r = (x0 + x1) / 2, (x1 - x0) / 2
        R = r * pointed
        def inside(x, y):
            if x < x0 or x >= x1 or y >= bot or y < top - 2: return False
            if y >= spring: return True
            return (x - (x1 - R)) ** 2 + (y - spring) ** 2 <= R * R and (x - (x0 + R)) ** 2 + (y - spring) ** 2 <= R * R
        for y in range(int(top) - 4, int(bot)):
            for x in range(int(x0), int(x1)):
                if inside(x, y): self.put(x, y, self.ramp(SKY, (y - top) / (bot - top) * 1.1))
        for x in range(int(x0), int(x1)):
            for y in range(int(spring + (bot - spring) * 0.55), int(bot)):
                if inside(x, y) and ((y - spring) / (bot - spring)) * 16 > BAYER[y % 4][x % 4] + 9: self.put(x, y, SKY[4])
        if city:
            sx = x0 + 3
            while sx < x1 - 2:
                w = random.randint(2, 5); topy = random.randint(int(spring + (bot - spring) * 0.25), int(bot - 14))
                for y in range(topy, int(bot)):
                    hw = w if y > topy + w * 3 else max(0, (y - topy) // 3)
                    for x in range(sx - hw, sx + hw + 1):
                        if inside(x, y): self.put(x, y, SKY[0] if x > sx - hw else SKY[1])
                for _ in range(3):
                    lx, ly = sx + random.randint(-w + 1, w - 1), random.randint(topy + w * 3 + 2, int(bot) - 3)
                    if inside(lx, ly): self.put(lx, ly, hexc(random.choice(lights)))
                sx += w * 2 + random.randint(1, 4)
        # tracery: mullion, transom, a round light in the arch
        for y in range(int(top), int(bot)):
            for x in range(int(x0), int(x1)):
                if inside(x, y) and (abs(x - cx) < 1 or abs(y - (spring + 6)) < 0.6): self.put(x, y, P[4])
        self.ellipse(cx, top + (spring - top) * 0.55, max(3, r * 0.22), max(3, r * 0.22), P[4])
        # the frame
        for y in range(int(top) - 6, int(bot) + 1):
            for x in range(int(x0) - 6, int(x1) + 6):
                if inside(x, y): continue
                if any(inside(x + dx, y + dy) for dx, dy in [(-5, 0), (5, 0), (0, 5), (0, -5), (-4, 4), (4, 4), (-4, -4), (4, -4)]):
                    self.put(x, y, P[5] if x < cx else P[4])
        self.rect(x0 - 7, bot, x1 + 7, bot + 5, P[4]); self.hline(x0 - 7, x1 + 7, bot, P[6]); self.hline(x0 - 7, x1 + 7, bot + 5, P[2])
        return inside
    def pillar(self, x0, x1, y0, y1, P, bands=(), base=True, flutes=3):
        for y in range(int(y0), int(y1)):
            for x in range(int(x0), int(x1)):
                t = (x - x0) / (x1 - x0)
                c = P[3] if t < 0.15 else P[5] if t < 0.4 else P[4] if t < 0.75 else P[3]
                if flutes and (x - x0) % max(3, (x1 - x0) // (flutes + 1)) == 0 and 0 < x - x0 < x1 - x0 - 2: c = P[2]
                self.put(x, y, c)
            self.put(x0, y, P[1]); self.put(x1 - 1, y, P[1])
        for b in bands:
            self.rect(x0 - 3, b, x1 + 3, b + 7, P[4]); self.hline(x0 - 3, x1 + 3, b, P[6]); self.hline(x0 - 3, x1 + 3, b + 6, P[2])
            self.hline(x0 - 2, x1 + 2, b + 3, BR[3])
        if base:
            self.rect(x0 - 5, y1 - 30, x1 + 5, y1, P[4]); self.hline(x0 - 5, x1 + 5, y1 - 30, P[6])
            self.rect(x0 - 7, y1 - 12, x1 + 7, y1, P[3]); self.hline(x0 - 7, x1 + 7, y1 - 12, P[5])
    def arch(self, x0, x1, top, bot, P, fill=None, thick=6):
        """a round-topped arch opening (dark inside, or `fill`), its stone voussoirs round it"""
        cx, r = (x0 + x1) / 2, (x1 - x0) / 2
        spring = top + r
        for y in range(int(top), int(bot)):
            for x in range(int(x0), int(x1)):
                if y >= spring or (x - cx) ** 2 + (y - spring) ** 2 <= r * r: self.put(x, y, fill or P[0])
        for i in range(0, 180, 9):
            a = math.radians(180 + i)
            for t in range(thick):
                rr = r + t
                self.put(cx + math.cos(a) * rr, spring + math.sin(a) * rr, P[5] if t < 2 else P[4])
            self.line(cx + math.cos(a) * r, spring + math.sin(a) * r, cx + math.cos(a) * (r + thick), spring + math.sin(a) * (r + thick), P[2])
        for x in (x0 - thick, x1):
            self.rect(x, spring, x + thick, bot, P[4]); self.vline(x, spring, bot, P[5])
        return spring
    def battlements(self, x0, x1, y, P, mw=8, gap=6, mh=8):
        self.rect(x0, y, x1, y + 6, P[4]); self.hline(x0, x1, y, P[6]); self.hline(x0, x1, y + 5, P[2])
        x = x0
        while x < x1:
            self.rect(x, y - mh, min(x + mw, x1), y, P[4]); self.hline(x, min(x + mw, x1), y - mh, P[6]); self.vline(x, y - mh, y, P[5]); self.vline(min(x + mw, x1) - 1, y - mh, y, P[2])
            x += mw + gap
    def portcullis(self, x0, x1, top, bot, glow=None):
        for x in range(int(x0) + 2, int(x1), 6): self.vline(x, top, bot, IRON[3]); self.vline(x + 1, top, bot, IRON[2])
        for y in range(int(top) + 4, int(bot), 8): self.hline(x0, x1, y, IRON[3])
        for x in range(int(x0) + 2, int(x1), 6): self.put(x, bot - 1, IRON[5]); self.put(x, bot - 2, IRON[4])
        if glow:
            for y in range(int(top) + 6, int(bot) - 4, 10):
                for x in range(int(x0) + 5, int(x1) - 2, 12): self.put(x, y, glow)

    # ---------- furnishings ----------
    def banner(self, x0, x1, top, bot, emblem='cross', P=RD, rod=True):
        if rod:
            self.hline(x0 - 4, x1 + 4, top - 2, BR[3]); self.hline(x0 - 4, x1 + 4, top - 1, BR[2]); self.put(x0 - 5, top - 2, BR[4]); self.put(x1 + 4, top - 2, BR[4])
        mid = (x0 + x1) / 2
        for y in range(int(top), int(bot) + int((x1 - x0) / 2)):
            for x in range(int(x0), int(x1)):
                if y > bot + (x1 - x0) / 2 - abs(x - mid): continue
                fold = math.sin((x - x0) * 0.55) * 0.5 + 0.5
                self.put(x, y, self.ramp(P[1:5], fold * 0.8 + (0.15 if y < top + 12 else 0)))
            if y < bot: self.put(x0 + 1, y, BR[3]); self.put(x1 - 2, y, BR[3])
        for x in range(int(x0), int(x1)):
            y = int(bot + (x1 - x0) / 2 - abs(x - mid)); self.put(x, y, BR[3])
        cx, cy, s = int(mid), int(top + (bot - top) * 0.42), (x1 - x0) / 32
        if emblem == 'cross':
            for y in range(int(cy - 20 * s), int(cy + 26 * s)): self.put(cx, y, BR[4]); self.put(cx + 1, y, BR[3])
            for x in range(int(cx - 10 * s), int(cx + 12 * s)): self.put(x, cy - 6 * s, BR[4]); self.put(x, cy - 5 * s, BR[3])
            for ex, ey in [(cx, cy - 21 * s), (cx - 11 * s, cy - 6 * s), (cx + 12 * s, cy - 6 * s), (cx, cy + 26 * s)]: self.ellipse(ex, ey, max(1, 2 * s), max(1, 2 * s), BR[4], fill=True)
        elif emblem == 'lion':
            # a rampant lion in gold: body, raised paws, mane, tail
            L = [(0, -10), (3, -12), (5, -9), (4, -6), (6, -2), (5, 4), (8, 9), (4, 9), (2, 5), (-2, 6), (-4, 10), (-7, 10), (-4, 3), (-5, -3), (-8, -6), (-6, -8), (-3, -5), (-2, -9)]
            self.poly([(cx + x * s * 1.3, cy + y * s * 1.3) for x, y in L], BR[4])
            self.ellipse(cx + 2 * s, cy - 11 * s, 3 * s, 3 * s, BR[3], fill=True)
            self.line(cx + 7 * s, cy + 3 * s, cx + 11 * s, cy - 4 * s, BR[4]); self.ellipse(cx + 11 * s, cy - 5 * s, 1.5 * s, 1.5 * s, BR[5], fill=True)
            self.put(cx + 3 * s, cy - 12 * s, RD[0])
    def books(self, x0, x1, base, tall=26):
        x = x0
        while x < x1 - 2:
            w = random.choice([3, 3, 4, 4, 5, 6]); h = random.randint(tall - 9, tall)
            if x + w > x1: break
            B = random.choice(BOOK); lean = random.random() < 0.08
            for yy in range(base - h, base):
                for xx in range(x, x + w):
                    sx = xx + ((base - yy) // 6 if lean else 0)
                    if sx < x1: self.put(sx, yy, B[0] if xx == x else B[2] if xx == x + 1 else B[1])
            for by in (base - h + 3, base - 4):
                for xx in range(x, x + w): self.put(xx + ((base - by) // 6 if lean else 0), by, BR[3] if xx > x else BR[2])
            self.put(x + 1, base - h + 1, BR[4])
            x += w + (1 if random.random() < 0.2 else 0)
    def shelves(self, x0, x1, shelves, mids=()):
        self.rect(x0, 0, x1, shelves[-1] + 4, WOOD[1])
        for base in shelves:
            self.rect(x0 + 3, base - 31, x1, base, WOOD[0])
            edges = [x0 + 4] + [m + 4 for m in mids]; ends = [m - 2 for m in mids] + [x1 - 1]
            for a, b in zip(edges, ends): self.books(a, b, base, 27)
            self.rect(x0, base, x1, base + 3, WOOD[3]); self.hline(x0, x1, base, BR[2]); self.hline(x0, x1, base + 3, WOOD[0])
        for u in (x0,) + tuple(m - 2 for m in mids) + (x1 - 4,):
            self.rect(u, 0, u + 4, shelves[-1] + 4, WOOD[2]); self.vline(u, 0, shelves[-1] + 4, WOOD[0]); self.vline(u + 1, 0, shelves[-1] + 4, WOOD[3])
            for y in shelves: self.rect(u - 1, y - 2, u + 5, y + 4, BR[2]); self.hline(u - 1, u + 5, y - 2, BR[4])
    def clear(self, x0, y0, x1, y1): self.rect(x0, y0, x1, y1, WOOD[0])
    def candle(self, x, base, h, holder=True):
        """a candle; returns where its flame tip is (for the game's flicker)"""
        self.rect(x, base - h, x + 3, base, hexc('#e8dcc0')); self.vline(x, base - h, base, hexc('#b8a888')); self.put(x + 1, base - h - 1, hexc('#3a2a1a'))
        self.put(x + 1, base - h - 2, hexc('#ffb040')); self.put(x + 1, base - h - 3, hexc('#fff2b0'))
        self.put(x + 2, base - h, hexc('#fff6e0')); self.put(x + 2, base - h + 1, hexc('#fff6e0'))
        if holder: self.rect(x - 2, base - 2, x + 5, base, BR[2])
        return (x + 1, base - h - 3)
    def jar(self, x0, y0, x1, y1, P=VI):
        cx = (x0 + x1) // 2
        self.rect(x0 + 1, y0 + 6, x1 - 1, y1 - 1, P[2]); self.dith(x0 + 1, y0 + 6, x1 - 1, y1 - 1, P[3], P[4], lambda x, y: 0.7 - abs(x - cx) / ((x1 - x0) * 0.7))
        self.ellipse(cx, y0 + 6, (x1 - x0) // 2, 2, BR[3], fill=True); self.rect(cx - 3, y0, cx + 4, y0 + 5, BR[2]); self.hline(cx - 3, cx + 4, y0, BR[4]); self.rect(x0, y1 - 2, x1, y1, BR[3])
        self.vline(x0 + 3, y0 + 8, y1 - 2, P[6])
    def armillary(self, cx, cy, r):
        for rx, ry in [(r, r), (r, r * 0.3), (r * 0.3, r)]: self.ellipse(cx, cy, rx, ry, BR[3])
        self.ellipse(cx, cy, r, r, BR[4], arc=lambda a: math.sin(a) < -0.3)
        self.line(cx - r * 0.6, cy + r, cx + r * 0.6, cy - r, BR[2]); self.ellipse(cx, cy, 2, 2, BR[5], fill=True)
        self.rect(cx - 3, cy + r + 1, cx + 4, cy + r + 6, BR[2]); self.hline(cx - 6, cx + 7, cy + r + 5, BR[3])
    def hourglass(self, cx, top, bot, sand=VI[4]):
        mid = (top + bot) / 2
        self.rect(cx - 9, top, cx + 10, top + 3, BR[3]); self.rect(cx - 9, bot - 3, cx + 10, bot, BR[3]); self.vline(cx - 8, top + 3, bot - 3, BR[2]); self.vline(cx + 8, top + 3, bot - 3, BR[2])
        for y in range(int(top) + 3, int(bot) - 3):
            hw = int(abs(y - mid) * 0.7) + 1
            for x in range(cx - hw, cx + hw + 1): self.put(x, y, sand if (mid - 4 < y < mid) or y > bot - 9 else hexc('#2a2440'))
            self.put(cx - hw, y, hexc('#8c86a8')); self.put(cx + hw, y, hexc('#5a5478'))
    def chest(self, x0, y0, x1, y1):
        self.rect(x0, y0 + 5, x1, y1, WOOD[3]); self.rect(x0, y0, x1, y0 + 6, WOOD[2]); self.hline(x0, x1, y0, BR[3]); self.hline(x0, x1, y0 + 5, BR[3])
        self.vline(x0 + 5, y0, y1, BR[2]); self.vline(x1 - 6, y0, y1, BR[2]); self.rect((x0 + x1) // 2 - 2, y0 + 6, (x0 + x1) // 2 + 2, y0 + 10, BR[4])
    def ivy(self, x0, y0, length, xmin=0, xmax=None, dense=4):
        xmax = self.W - 1 if xmax is None else xmax
        x = x0
        for y in range(int(y0), int(y0 + length)):
            x += random.choice([-1, 0, 0, 1]); x = max(xmin, min(xmax, x))
            self.put(x, y, IVY[1])
            if y % dense == 0:
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (-2, 1), (2, 1)]: self.put(x + dx, y + dy, IVY[random.randint(2, 4)])
    def ivy_clump(self, x0, x1, y0, depth):
        for x in range(int(x0), int(x1)):
            for y in range(int(y0), int(y0 + depth * (0.5 + 0.5 * math.sin(x * 0.6)))):
                if random.random() < 0.7: self.put(x, y, IVY[random.randint(1, 4)])
    def strand(self, xa, xb, sag, c1, c2, step=3, y0=0):
        for i in range(0, int(xb - xa) + 1):
            x = xa + i; y = y0 + int(sag * math.sin(math.pi * i / (xb - xa)))
            self.put(x, y, c1 if (i // step) % 2 else c2); self.put(x, y + 1, BR[0] if (i // step) % 2 else c1)
    def pipe(self, points, P=BR, coupling=CY):
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            horiz = y0 == y1; n = int(max(abs(x1 - x0), abs(y1 - y0)))
            for i in range(n + 1):
                x, y = round(x0 + (x1 - x0) * i / max(n, 1)), round(y0 + (y1 - y0) * i / max(n, 1))
                for k in range(4):
                    c = [P[1], P[3], P[2], P[0]][k]
                    self.put(x, y - 1 + k, c) if horiz else self.put(x - 1 + k, y, c)
                if coupling and i % 16 == 8:
                    for k in range(-2, 4):
                        for j in range(3):
                            cc = coupling[2] if j != 1 else coupling[3]
                            self.put(x + j - 1, y - 1 + k, cc) if horiz else self.put(x - 1 + k, y + j - 1, cc)
            self.rect(x1 - 2, y1 - 2, x1 + 4, y1 + 4, P[2]); self.put(x1, y1, P[4])
    def glow_tube(self, x0, x1, y0, y1, G=GL, cage=BR, bands=2):
        """a tall glass tube full of glowing fluid in a brass cage (the Shrike's red ones, the Adept's violet)"""
        cx = (x0 + x1) / 2
        for y in range(int(y0), int(y1)):
            for x in range(int(x0), int(x1)):
                t = abs(x - cx) / ((x1 - x0) / 2)
                self.put(x, y, self.ramp(G[1:5], 0.85 - t * 0.7 + 0.06 * math.sin(y * 0.3)))
        for xx in (x0 + 3, x0 + 4, x1 - 5): self.vline(xx, y0 + 3, y1 - 3, G[5] if xx != x0 + 4 else G[4])
        for _ in range(int((x1 - x0) * (y1 - y0) / 30)): self.put(random.randint(int(x0) + 2, int(x1) - 3), random.randint(int(y0) + 2, int(y1) - 3), G[5])
        self.vline(x0, y0, y1, cage[2]); self.vline(x1 - 1, y0, y1, cage[2])
        for by in [y0 - 3] + [y0 + (y1 - y0) * k / bands for k in range(1, bands)] + [y1 - 1]:
            self.rect(x0 - 3, by, x1 + 3, by + 4, cage[2]); self.hline(x0 - 3, x1 + 3, by, cage[4]); self.hline(x0 - 3, x1 + 3, by + 3, cage[1])
            for x in range(int(x0) - 1, int(x1) + 2, 5): self.put(x, by + 2, cage[5])
    def brazier(self, cx, rim, P=IRON, wide=12, legs=16):
        """an iron fire bowl on a short stand; the game puts its pixel fire on the rim: returns the rim's middle"""
        for y in range(int(rim), int(rim) + 8):
            hw = int(wide * math.sqrt(max(0, 1 - ((y - rim) / 8) ** 2)))
            for x in range(cx - hw, cx + hw + 1): self.put(x, y, P[3] if x < cx else P[2])
        self.hline(cx - wide - 1, cx + wide + 2, rim, P[5]); self.hline(cx - wide, cx + wide + 1, rim + 1, FIRE[3])
        for x in range(cx - wide + 2, cx + wide - 1, 2): self.put(x, rim - 1, FIRE[random.choice([4, 5, 6])])  # coals glowing over the rim
        for x in range(cx - wide + 3, cx + wide - 2, 4): self.put(x, rim + 3, P[5])
        for dx in (-6, 0, 6): self.line(cx + dx * 0.5, rim + 8, cx + dx, rim + 8 + legs, P[2])
        self.hline(cx - 9, cx + 10, rim + 8 + legs, P[3])
        return (cx, rim)
    def lantern(self, cx, top, h=14, glow=FIRE):
        self.vline(cx, top - 6, top, IRON[3])
        self.rect(cx - 5, top, cx + 6, top + 2, BR[2]); self.rect(cx - 4, top + h - 2, cx + 5, top + h, BR[2])
        for y in range(top + 2, top + h - 2):
            for x in range(cx - 4, cx + 5): self.put(x, y, glow[5] if abs(x - cx) < 2 else glow[4])
        for x in (cx - 4, cx, cx + 4): self.vline(x, top + 2, top + h - 2, BR[1])
        self.put(cx, top + h // 2, glow[7])
        return (cx, top + h // 2)
    def rubble(self, x0, x1, ybase, P, n=10, big=6):
        for _ in range(n):
            w = random.randint(3, big); h = random.randint(2, max(3, big - 2)); x = random.randint(int(x0), int(x1) - w)
            y = ybase - h
            self.rect(x, y, x + w, ybase, P[4]); self.hline(x, x + w, y, P[6]); self.vline(x + w - 1, y, ybase, P[2]); self.put(x, y, P[5])
    def spear(self, x, y0, y1, lean=0):
        self.line(x, y0, x + lean, y1, WOOD[3]); self.line(x + 1, y0, x + lean + 1, y1, WOOD[2])
        self.poly([(x - 2, y0 + 2), (x + 1, y0 - 7), (x + 4, y0 + 2)], IRON[5]); self.put(x + 1, y0 - 5, IRON[5])
    def sword_in_ground(self, x, ytip, length=26, P=IRON):
        self.vline(x, ytip - length, ytip, P[5]); self.vline(x + 1, ytip - length, ytip, P[3])
        self.hline(x - 4, x + 6, ytip - length, BR[3]); self.vline(x, ytip - length - 7, ytip - length, WOOD[3]); self.put(x, ytip - length - 8, BR[4])
    def cloth(self, x0, x1, ytop, ybot, P=RD):
        for x in range(int(x0), int(x1)):
            yb = ybot - int(3 * math.sin(x * 0.4))
            for y in range(int(ytop + 2 * math.sin(x * 0.3)), yb):
                self.put(x, y, self.ramp(P[1:5], 0.5 + 0.4 * math.sin((x - x0) * 0.5)))
            self.put(x, yb, BR[3] if x % 2 else BR[2])

    def outline(self):
        """a thin dark edge round everything against the clear middle (like the paintings')"""
        src = self.img.copy(); sp = src.load()
        for y in range(self.H):
            for x in range(self.W):
                if sp[x, y][3] == 0 and any(0 <= x + dx < self.W and 0 <= y + dy < self.H and sp[x + dx, y + dy][3] for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]):
                    self.px[x, y] = BLACK
    def save(self, path):
        self.outline(); self.img.save(path); print('saved', path, self.img.size)

