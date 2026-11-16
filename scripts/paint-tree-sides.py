# The skill trees' side pieces, painted pixel by pixel at their true size (420 x 300; the Adept's right is its own
# script, paint-adept-right.py), each after Jonah's painting of the same side (public/tree/old). A left piece is pinned
# to the screen's left edge and faces the middle with its right side; a right piece the other way.
#   mage left:   the library: a wall of bookshelves (candles, jars, an hourglass, an armillary), a pillar, a red banner,
#                a gothic window onto the violet city, the floating book over its brass pedestal in a hologram, a
#                balustrade, steps, a stack of books, cables hanging toward the middle
#   knight left: the fortress: a tall tower with glowing coolant pipes, the wall and its gatehouse (portcullis, a lion
#                banner), a round tower with a cannon on top, a hanging lantern, a brazier, a spear rack, crates, a shield
#   knight right: the gate: a long wall with a big gun on its battlements and a radar dish, breaches glowing red, a
#                tall tower with red coolant tubes and a lion banner, the great gate between two braziers, barricades,
#                broken flags and rubble toward the middle, the wet ground reflecting it all
#   rogue left:  the ruined cathedral: a red reactor tube in its brass cage, pipes, tall broken arches, red banners, a
#                stair climbing to a lit lantern, ivy, a sword in the rubble, a glossy tiled floor
#   rogue right: the cathedral's face: tall gothic windows onto the violet city, a lion and cross banner, a red
#                reactor column, a fire bowl at the top of a stair, a shield and a spear leaning, a crumbling ruin
#                toward the middle
# Each writes its PNG to public/tree/ and its fires, lights and moving parts (in its own pixels) to src/treepainted.json.
# python3 scripts/paint-tree-sides.py [mage-left knight-left ...]
import sys, json, math, random, os
sys.path.insert(0, os.path.dirname(__file__))
from pixpaint import *

W, H, FLOOR = 420, 300, 262
OUT = {}
FIRE_C, CANDLE_C, RED_C, CYAN_C, VIOLET_C = '#ffb050', '#ffc878', '#ff3a3a', '#5ae0ff', '#b070ff'

class Piece(Canvas):
    def __init__(self, key, seed):
        super().__init__(W, H, seed); self.key = key; self.fx = {'native': True, 'fires': [], 'lights': [], 'anims': []}
    def fire(self, x, y): self.fx['fires'].append([x, y, 1]); self.light(x, y - 6, 34, FIRE_C, 1)
    def light(self, x, y, r, col, flick=0): self.fx['lights'].append([x, y, r, col, flick])
    def anim(self, *a): self.fx['anims'].append(list(a))
    def flame(self, xy): self.anim('flame', *xy)
    def done(self, path, edge):
        self.fx['edge'] = edge
        self.save(path); OUT[self.key] = self.fx


# ================= the Adept, left: the library =================
def mage_left():
    c = Piece('mage-left', 21)
    c.blocks(0, 0, 330, FLOOR, ST, 2)
    c.dith(290, 0, 330, FLOOR, ST[2], ST[1], lambda x, y: (x - 290) / 40)
    # the shelves along the left
    S = [32, 66, 100, 134, 168, 202, 236]
    c.shelves(0, 118, S, mids=(60,))
    c.clear(6, 2, 36, 32); c.hourglass(20, 6, 31); c.anim('sand', 20, 18, 27)
    c.clear(76, 36, 100, 66); c.jar(78, 38, 96, 65); c.anim('bubbles', 80, 46, 94, 63, VIOLET_C); c.light(87, 52, 14, VIOLET_C)
    c.clear(14, 68, 50, 100); c.armillary(31, 81, 11); c.anim('gimbal', 31, 81, 11)
    c.clear(4, 108, 32, 134); [c.flame(c.candle(x, 134, h)) for x, h in [(7, 9), (15, 13), (23, 8)]]; c.light(17, 122, 16, CANDLE_C, 1)
    c.clear(86, 144, 110, 168); [c.flame(c.candle(x, 168, h)) for x, h in [(89, 11), (98, 8)]]; c.light(94, 156, 12, CANDLE_C, 1)
    c.clear(6, 172, 30, 202); c.jar(8, 174, 28, 201); c.anim('bubbles', 10, 182, 26, 199, VIOLET_C); c.light(18, 188, 15, VIOLET_C)
    c.clear(70, 212, 100, 236); c.chest(72, 222, 98, 236)
    c.ivy(4, 0, 90, 0, 14); c.ivy(112, 0, 140, 104, 120)
    # a pillar with a candle sconce
    c.pillar(120, 142, 0, FLOOR, ST, bands=(44, 160))
    c.rect(140, 118, 150, 122, BR[2]); c.flame(c.candle(144, 118, 10, holder=False)); c.light(145, 108, 12, CANDLE_C, 1)
    c.ivy(126, 0, 110, 120, 142, 3)
    # the banner, and the window behind the book
    c.banner(152, 182, 6, 92, 'cross')
    c.gothic_window(196, 256, 22, 58, 156, ST)
    # the floating book's pedestal, the hologram over it, the book
    BX = 226
    c.rect(BX - 16, 206, BX + 16, FLOOR, ST[4]); c.vline(BX - 16, 206, FLOOR, ST[6]); c.vline(BX + 15, 206, FLOOR, ST[2])
    c.banner(BX - 9, BX + 9, 214, 244, 'cross', rod=False)
    c.rect(BX - 20, 198, BX + 20, 206, BR[2]); c.hline(BX - 20, BX + 20, 198, BR[4]); c.hline(BX - 20, BX + 20, 205, BR[1])
    for x in range(BX - 18, BX + 19, 6): c.put(x, 202, CY[3])
    c.ellipse(BX, 196, 10, 3, CY[2], fill=True); c.ellipse(BX, 195, 6, 2, CY[4], fill=True)
    for y in range(176, 196):  # a beam of light up from the plate
        for x in range(BX - 3, BX + 4):
            if (y + x) % 3: c.put(x, y, CY[3] if abs(x - BX) < 2 else CY[2])
    for (hx0, hy0, hx1, hy1) in [(BX - 14, 96, BX + 14, 166), (BX - 30, 120, BX - 16, 150), (BX + 18, 108, BX + 32, 140)]:  # the hologram panels
        c.dith(hx0, hy0, hx1, hy1, CY[0], CY[1], lambda x, y: 0.45)
        for x in (hx0, hx1 - 1): c.vline(x, hy0, hy1, CY[3])
        c.hline(hx0, hx1, hy0, CY[3]); c.hline(hx0, hx1, hy1 - 1, CY[3])
        mx = (hx0 + hx1) // 2
        for y in range(hy0 + 5, hy1 - 4, 9): c.ellipse(mx, y, 3, 3, CY[3]); c.put(mx, y, CY[4])
        c.vline(mx, hy0 + 3, hy1 - 3, CY[2])
    for side, sg in ((-1, -1), (1, 1)):  # the open book
        pts = [(BX, 182), (BX + sg * 20, 176), (BX + sg * 21, 186), (BX, 190)]
        c.poly(pts, hexc('#e8e0c8')); c.line(BX, 190, BX + sg * 21, 187, hexc('#8a6a4a'))
        for k in range(4): c.line(BX + sg * 4, 181 + k * 2, BX + sg * 17, 178 + k * 2, CY[2])
    c.poly([(BX - 23, 186), (BX + 23, 186), (BX + 20, 191), (BX - 20, 191)], VI[3]); c.vline(BX, 180, 191, WOOD[2])
    c.light(BX, 182, 46, CYAN_C); c.light(BX, 200, 20, CYAN_C)
    c.anim('orbit', BX, 186, 42, 9, 4, CYAN_C, 1.1); c.anim('orbit', BX, 160, 34, 7, 3, VIOLET_C, -0.8); c.anim('orbit', BX, 202, 30, 6, 3, '#a8f4ff', 1.6)
    c.anim('sparks', BX, 172, 30, CYAN_C)
    # the balustrade toward the middle, the steps, cyan seams, a stack of books, cables hanging
    RX0, RX1, RT = 246, 330, 224
    c.rect(RX0, RT, RX1, RT + 6, ST[5]); c.hline(RX0, RX1, RT, ST[7]); c.hline(RX0, RX1, RT + 5, ST[3])
    for x in range(RX0 + 6, RX1 - 2, 9):
        for y in range(RT + 6, FLOOR):
            t = (y - RT - 6) / (FLOOR - RT - 6); hw = 1 + int(2.2 * math.sin(t * math.pi))
            for xx in range(x - hw, x + hw + 1): c.put(xx, y, ST[5] if xx < x else ST[4])
    for nx in (RX1 - 10,):
        c.rect(nx, RT - 14, nx + 10, FLOOR, ST[4]); c.vline(nx, RT - 14, FLOOR, ST[6]); c.rect(nx - 2, RT - 18, nx + 12, RT - 14, ST[5]); c.hline(nx - 2, nx + 12, RT - 18, ST[7])
    c.steps(330, FLOOR, [10, 12, 16], ST, 18, left=True)
    for x in range(10, 340):
        if (x // 9) % 2 == 0: c.put(x, FLOOR + 5, CY[3]); c.put(x, FLOOR + 6, CY[2])
    c.light(170, FLOOR + 5, 20, CYAN_C); c.light(300, FLOOR + 5, 20, CYAN_C)
    for i, (w, h) in enumerate([(26, 5), (22, 6), (24, 5), (20, 5)]):  # a stack of books on the floor
        B = BOOK[(i * 3) % len(BOOK)]; y = FLOOR - 5 * (i + 1) - i
        c.rect(150 + i, y, 150 + i + w, y + h, B[1]); c.hline(150 + i, 150 + i + w, y, B[2]); c.vline(150 + i + w - 1, y, y + h, hexc('#e8e0c8'))
    c.flame(c.candle(184, FLOOR, 12)); c.flame(c.candle(192, FLOOR, 8)); c.light(188, FLOOR - 14, 14, CANDLE_C, 1)
    c.strand(250, 330, 30, BR[3], BR[2]); c.strand(262, 324, 46, RD[3], RD[4], 2); c.strand(280, 334, 20, CY[2], CY[1], 4)
    c.done('public/tree/Adept Left.png', 300)


# ================= the Templar, left: the fortress =================
def knight_left():
    c = Piece('knight-left', 31)
    G = GS
    # the round tower on the right with the cannon on top, drawn first (behind the wall)
    TX0, TX1 = 214, 290
    c.blocks(TX0, 64, TX1, FLOOR, G, 3, 14, 8)
    for x in range(TX0, TX1):  # rounded: shade toward its edges
        t = (x - TX0) / (TX1 - TX0)
        if t < 0.18 or t > 0.82:
            for y in range(64, FLOOR):
                if (abs(t - 0.5) - 0.32) * 40 > BAYER[y % 4][x % 4]: c.put(x, y, G[2])
    c.battlements(TX0 - 4, TX1 + 4, 64, G, 9, 5, 9)
    for sy in (110, 170): c.rect(250, sy, 254, sy + 14, G[0])
    # the cannon: a long double barrel on a turret, cyan coolant along it
    c.rect(222, 42, 268, 56, IRON[3]); c.hline(222, 268, 42, IRON[5]); c.ellipse(244, 48, 14, 10, IRON[2], fill=True); c.ellipse(244, 46, 10, 6, IRON[4], fill=True)
    for by, ln in ((30, 120), (38, 112)):
        c.rect(250, by, 250 + ln, by + 6, IRON[3]); c.hline(250, 250 + ln, by, IRON[5]); c.hline(250, 250 + ln, by + 5, IRON[1])
        c.rect(250 + ln - 6, by - 1, 250 + ln, by + 7, IRON[4])
        for x in range(262, 250 + ln - 10, 9): c.put(x, by + 2, CY[3]); c.put(x + 1, by + 2, CY[2])
    c.light(330, 36, 20, CYAN_C)
    c.lantern(272, 150, 16); c.line(272, 144, 288, 140, IRON[3]); c.rect(286, 136, 292, 146, IRON[3])
    c.light(272, 158, 30, FIRE_C, 1)
    # the curtain wall and its gatehouse
    c.blocks(58, 92, TX0 + 2, FLOOR, G, 3, 16, 9)
    c.battlements(56, TX0, 92, G, 8, 5, 8)
    sp = c.arch(96, 146, 140, FLOOR, G, fill=G[0], thick=6)
    c.portcullis(97, 145, sp - 22, FLOOR - 2, GL[3]); c.light(121, 220, 26, RED_C)
    c.banner(160, 190, 104, 196, 'lion')
    # the tall tower on the left, its coolant pipes glowing blue, a red strip light
    c.blocks(0, 0, 62, FLOOR, G, 4, 15, 9)
    c.battlements(-2, 66, 22, G, 7, 5, 9)
    c.line(30, 0, 30, -1, G[3])
    c.rect(36, 0, 40, 22, IRON[3]); c.poly([(40, 2), (58, 7), (40, 12)], RD[3])  # a pennant on its pole
    for px_ in (8, 16):
        c.vline(px_, 30, 200, IRON[2]); c.vline(px_ + 1, 30, 200, CY[2]); c.vline(px_ + 2, 30, 200, IRON[1])
        for y in range(40, 200, 22): c.rect(px_ - 1, y, px_ + 4, y + 3, BR[2])
    c.rect(40, 34, 48, 76, IRON[1])
    for y in range(36, 75, 4): c.rect(42, y, 46, y + 2, GL[3])
    c.light(44, 55, 18, RED_C)
    for cx in (30, 46):  # two capsule lamps by the gate, cyan
        c.rect(cx - 5, 150, cx + 6, 182, IRON[2]); c.rect(cx - 4, 154, cx + 5, 178, CY[1]); c.rect(cx - 2, 156, cx + 3, 176, CY[3]); c.vline(cx - 3, 156, 176, CY[4])
        c.rect(cx - 6, 148, cx + 7, 152, BR[2]); c.rect(cx - 6, 180, cx + 7, 184, BR[2])
        c.light(cx, 166, 18, CYAN_C)
    # the brazier on a stone block before the gate
    c.rect(62, 214, 92, FLOOR, G[4]); c.hline(62, 92, 214, G[6]); c.vline(91, 214, FLOOR, G[2])
    r = c.brazier(77, 196, IRON, 12, 10); c.fire(*r)
    # a rack of spears, crates, a shield, a barricade, rubble
    c.rect(4, 214, 56, 218, WOOD[3]); c.rect(4, 244, 56, 248, WOOD[3])
    for i, x in enumerate(range(8, 54, 8)): c.spear(x, 192 + (i % 2) * 4, 252, lean=2)
    for x0, y0, w, h in ((2, 236, 22, 26), (24, 244, 18, 18), (8, 220, 16, 16)):
        c.rect(x0, y0, x0 + w, y0 + h, WOOD[3]); c.rect(x0 + 1, y0 + 1, x0 + w - 1, y0 + h - 1, WOOD[2]); c.line(x0 + 1, y0 + 1, x0 + w - 2, y0 + h - 2, WOOD[3]); c.hline(x0, x0 + w, y0, WOOD[4])
    c.put(13, 250, CY[3]); c.put(14, 250, CY[4]); c.light(13, 250, 8, CYAN_C)
    c.poly([(150, 226), (174, 226), (174, 244), (162, 258), (150, 244)], RD[3]); c.vline(162, 228, 254, BR[4]); c.hline(152, 172, 236, BR[4])
    for x in range(150, 175): c.put(x, 226, BR[3])
    for x0 in (184, 206):  # a barricade of crossed timbers
        c.line(x0, 230, x0 + 18, FLOOR - 2, WOOD[3]); c.line(x0 + 18, 230, x0, FLOOR - 2, WOOD[3]); c.line(x0 + 1, 230, x0 + 19, FLOOR - 2, WOOD[2])
    c.hline(180, 230, 240, WOOD[3])
    for x in range(0, 330): c.rect(x, FLOOR, x + 1, H, G[3] if (x + FLOOR) % 9 else G[2])
    c.floor_tiles(0, FLOOR, 330, H, G)
    c.rubble(236, 330, FLOOR, G, 12, 8); c.rubble(100, 180, FLOOR, G, 5, 5)
    c.done('public/tree/knight left.png', 300)


# ================= the Templar, right: the gate =================
def knight_right():
    c = Piece('knight-right', 41)
    G = GS
    # the long wall
    c.blocks(118, 100, W, FLOOR, G, 3, 16, 9)
    c.battlements(116, W, 100, G, 8, 5, 8)
    for bx in (150, 210, 270):  # buttresses
        c.rect(bx, 150, bx + 14, FLOOR, G[4]); c.vline(bx, 150, FLOOR, G[6]); c.vline(bx + 13, 150, FLOOR, G[2]); c.poly([(bx, 150), (bx + 14, 150), (bx + 14, 140)], G[5])
    for hx, hy in ((182, 170), (240, 200), (196, 228)):  # breaches, red-lit inside
        c.ellipse(hx, hy, 7, 6, G[0], fill=True); c.ellipse(hx, hy, 4, 3, GL[1], fill=True); c.put(hx, hy, GL[3])
        for a in range(0, 360, 60): c.line(hx, hy, hx + math.cos(math.radians(a)) * 10, hy + math.sin(math.radians(a)) * 9, G[1])
        c.light(hx, hy, 10, RED_C)
    for (x0, y0) in ((228, 116), (262, 128)):  # banners down the wall
        c.banner(x0, x0 + 14, y0, y0 + 50, 'cross', rod=True)
    # the big gun on the battlements, pointing at the middle
    c.rect(150, 72, 230, 96, IRON[2]); c.hline(150, 230, 72, IRON[4]); c.rect(170, 58, 220, 74, IRON[3]); c.hline(170, 220, 58, IRON[5])
    c.rect(60, 62, 176, 74, IRON[3]); c.hline(60, 176, 62, IRON[5]); c.hline(60, 176, 73, IRON[1]); c.rect(56, 60, 70, 76, IRON[4])
    for x in range(76, 168, 2): c.put(x, 67, GL[3] if x % 4 else GL[2])
    c.light(110, 67, 26, RED_C)
    # the radar on its turret
    c.blocks(250, 52, 290, 100, G, 4, 10, 8); c.battlements(248, 292, 52, G, 6, 4, 6)
    c.ellipse(270, 28, 16, 12, IRON[4], arc=lambda a: math.cos(a) < 0.3); c.ellipse(270, 28, 13, 9, IRON[3], fill=True); c.line(270, 28, 278, 44, IRON[3]); c.vline(270, 36, 46, IRON[3])
    c.put(270, 28, GL[3]); c.put(271, 28, GL[4]); c.light(270, 28, 10, RED_C)
    # the tower on the right: red coolant tubes, a lion banner, the gate
    c.blocks(318, 0, W, FLOOR, G, 4, 15, 9)
    c.glow_tube(378, 396, 26, 140, GL, BR, 3); c.light(387, 84, 30, RED_C)
    c.glow_tube(404, 416, 150, 196, GL, BR, 1); c.light(410, 172, 14, RED_C)
    c.banner(326, 360, 30, 140, 'lion')
    sp = c.arch(338, 398, 168, FLOOR, G, fill=G[0], thick=6)
    c.portcullis(339, 397, sp - 28, FLOOR - 2)
    for x in (346, 368, 390): c.vline(x, sp, FLOOR - 4, GL[3]); c.light(x, 230, 8, RED_C)
    for x in (322, 412):  # braziers flanking the gate
        c.rect(x - 9, 226, x + 10, FLOOR, G[4]); c.hline(x - 9, x + 10, 226, G[6])
        r = c.brazier(x, 208, IRON, 9, 8); c.fire(*r)
    # the low broken wall, barricades and flags toward the middle
    c.blocks(70, 190, 120, FLOOR, G, 3, 12, 8)
    for x in range(70, 120):
        top = 190 + int(10 * abs(math.sin(x * 0.35))) + (x < 86) * (86 - x)
        for y in range(190, top): c.put(x, y, CLEAR)
    for x0 in (20, 52, 90, 128):
        c.line(x0, 236, x0 + 18, FLOOR - 2, WOOD[3]); c.line(x0 + 18, 236, x0, FLOOR - 2, WOOD[3]); c.line(x0 + 1, 236, x0 + 19, FLOOR - 2, WOOD[2]); c.hline(x0 - 2, x0 + 22, 246, WOOD[3])
    for fx, fy in ((40, 200), (64, 210)):
        c.line(fx, fy, fx + 6, FLOOR - 4, WOOD[2]); c.poly([(fx, fy), (fx + 14, fy + 4), (fx + 2, fy + 12)], RD[3])
    c.rubble(0, 140, FLOOR, G, 10, 6)
    # the wet ground: dark slabs, the red lights and the fires reflected
    c.floor_tiles(0, FLOOR, W, H, G, gloss=(346, 368, 390, 322, 412), gloss_col=GL[1])
    c.done('public/tree/knight right.png', 120)


# ================= the Shrike, left: the ruined cathedral =================
def rogue_left():
    c = Piece('rogue-left', 51)
    P = ST
    c.blocks(0, 0, 300, FLOOR, P, 3, 16, 9)
    # the two tall arches, dark inside
    for ax0, ax1, top in ((110, 168, 30), (182, 240, 44)):
        sp = c.arch(ax0, ax1, top, FLOOR - 24, P, fill=P[0], thick=7)
        for y in range(int(sp), FLOOR - 24, 2):
            for x in range(ax0 + 6, ax1 - 6, 14): c.put(x, y, P[1])
    c.pillar(100, 112, 0, FLOOR, P, bands=(60, 150)); c.pillar(170, 182, 20, FLOOR, P, bands=(80,)); c.pillar(242, 254, 30, FLOOR, P, bands=(100,))
    # the ruin breaking off toward the middle: broken tops, drips of stone
    for x in range(240, 330):
        top = int(40 + 30 * abs(math.sin(x * 0.11)) + (x - 240) * 0.6)
        for y in range(top, FLOOR):
            if c.get(x, y)[3] == 0 or x >= 300:
                c.put(x, y, P[3] if (x + y) % 11 else P[2])
        for k in range(random.randint(0, 2)): c.vline(x, top, top + random.randint(3, 12), P[4])
    c.pillar(296, 306, 120, FLOOR, P, bands=(170,), base=True)
    # the red reactor on the left in its brass cage, pipes from it, a panel of red lights
    c.glow_tube(16, 44, 46, 140, GL, BR, 3); c.light(30, 92, 34, RED_C); c.anim('bubbles', 19, 50, 42, 138, RED_C)
    c.rect(10, 140, 50, 170, P[4]); c.hline(10, 50, 140, P[6]); c.rect(18, 148, 28, 162, IRON[1]); c.rect(32, 148, 42, 162, IRON[1])
    for x in (20, 23, 34, 37): c.vline(x, 150, 160, CY[3] if x < 30 else CY[2])
    c.pipe([(46, 60), (70, 60), (70, 20), (96, 20)]); c.pipe([(46, 120), (62, 120), (62, 180), (96, 180)])
    c.rect(4, 200, 30, 240, P[4]); c.rect(8, 206, 26, 230, IRON[1])
    for y in range(209, 228, 5): c.rect(11, y, 23, y + 3, GL[3])
    c.light(17, 218, 16, RED_C)
    # banners: a great one between the arches, a small one lower
    c.banner(150, 196, 0, 86, 'cross'); c.banner(86, 104, 120, 164, 'cross', rod=True)
    # the stair climbing to the right toward a lit lantern on a pedestal
    for i in range(10):
        y0 = FLOOR - (i + 1) * 6
        c.rect(150 + i * 12, y0, 280, y0 + 6, P[5] if i % 2 else P[4]); c.hline(150 + i * 12, 280, y0, P[6])
    c.rect(196, 168, 214, 200, P[4]); c.hline(196, 214, 168, P[6])
    lx, ly = c.lantern(205, 150, 16); c.light(lx, ly, 34, FIRE_C, 1)
    c.cloth(232, 260, 220, 240); c.cloth(60, 110, 250, 262)
    # ivy, a sword in the rubble, a glossy floor
    for x0 in (102, 172, 244): c.ivy(x0, 30, 80, x0 - 6, x0 + 10)
    c.ivy_clump(96, 120, 0, 10)
    c.rubble(240, 330, FLOOR, P, 12, 7); c.sword_in_ground(318, FLOOR - 2, 28)
    c.floor_tiles(0, FLOOR, 340, H, P, gloss=(205, 120, 280), gloss_col=hexc('#6a5a8a'))
    c.done('public/tree/shrike left.png', 300)


# ================= the Shrike, right: the cathedral's face =================
def rogue_right():
    c = Piece('rogue-right', 61)
    P = ST
    c.blocks(120, 0, W, FLOOR, P, 3, 16, 9)
    # the broken vault hanging over the middle
    for x in range(110, 220):
        bot = int(28 + 16 * abs(math.sin(x * 0.09)) - (x - 110) * 0.05)
        for y in range(0, bot): c.put(x, y, P[4] if y < bot - 2 else P[2])
        if x % 9 == 0: c.vline(x, bot, bot + random.randint(4, 14), P[3])
    # the tall windows onto the city
    c.gothic_window(150, 204, 46, 80, 190, P)
    c.gothic_window(246, 300, 30, 64, 176, P)
    c.pillar(208, 240, 20, FLOOR, P, bands=(90, 190))
    c.pillar(304, 320, 0, FLOOR, P, bands=(70,))
    for wx in (177, 273): c.cloth(wx - 26, wx - 8, 84, 104); c.cloth(wx + 8, wx + 26, 92, 110)
    # the lion banner, the red column with its pipes
    c.banner(322, 356, 30, 170, 'lion')
    c.glow_tube(372, 400, 0, 150, GL, BR, 4); c.light(386, 70, 34, RED_C); c.anim('bubbles', 375, 4, 398, 148, RED_C)
    c.pipe([(370, 160), (360, 160), (360, 230), (330, 230)]); c.pipe([(402, 40), (414, 40), (414, 210)])
    # the fire bowl at the top of a short stair, a shield and a spear leaning
    c.rect(270, 214, 330, FLOOR, P[4]); c.hline(270, 330, 214, P[6])
    for i in range(4): c.rect(244 + i * 7, FLOOR - (i + 1) * 12, 272, FLOOR - i * 12, P[5] if i % 2 else P[4])
    c.rect(288, 196, 312, 214, P[5]); c.hline(288, 312, 196, P[6])
    r = c.brazier(300, 182, BR, 12, 10); c.fire(*r)
    c.poly([(352, 222), (380, 222), (380, 242), (366, 258), (352, 242)], hexc('#d8d0c0')); c.vline(366, 224, 254, RD[3]); c.vline(367, 224, 254, RD[3]); c.hline(354, 378, 234, RD[3])
    for x in range(352, 381): c.put(x, 222, BR[3])
    c.spear(398, 200, 258, lean=-6)
    c.ivy(214, 20, 90, 208, 240)
    # a low crumbling ruin toward the middle: broken pillars and a wall's stub
    for x in range(20, 150):
        top = int(214 + 20 * abs(math.sin(x * 0.07)) - max(0, 60 - x) * 0.2)
        for y in range(top, FLOOR): c.put(x, y, P[3] if (x * 3 + y) % 13 else P[2])
    for x0, h in ((40, 50), (76, 64), (112, 80)):
        c.pillar(x0, x0 + 9, FLOOR - h, FLOOR, P, base=False, flutes=0)
        c.rubble(x0 - 4, x0 + 14, FLOOR - h + 2, P, 2, 4)
    c.rubble(0, 260, FLOOR, P, 14, 7)
    c.floor_tiles(0, FLOOR, W, H, P, gloss=(300, 386), gloss_col=GL[1])
    c.done('public/tree/shrike right.png', 120)


PIECES = {'mage-left': mage_left, 'knight-left': knight_left, 'knight-right': knight_right, 'rogue-left': rogue_left, 'rogue-right': rogue_right}
for k in (sys.argv[1:] or PIECES): PIECES[k]()
path = 'src/treepainted.json'
old = json.load(open(path)) if os.path.exists(path) else {}
old.update(OUT)
json.dump(old, open(path, 'w'), indent=1)
print('wrote', path, list(OUT))
