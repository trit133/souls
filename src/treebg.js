// Skill tree backgrounds: one pixel-art scene per character, painted in code at about the game's resolution
// (~270 pixels tall) and scaled up crisp behind the tree. Detail runs along both edges; the middle stays near
// black so the nodes read clearly (the tree draws its own rings). A static layer is painted once per size;
// every frame adds the moving parts (embers, dust, smoke, runes, flicker). pixelfx effects (braziers, shadow
// flames, spirit flames, a rune circle, moonbeams) play on a second canvas at twice the resolution, like the
// game's own effects. Everything stops while the tree screen is closed.
//   Knight: the Hall of Fallen Kings. Rogue: the Shadow Realm. Spellsword: the Library Beyond.
import { createFrame, clearFrame, createFx, composite } from './pixelfx/core/index.js';
import * as brazier from './pixelfx/fx/fire/brazier.js';
import * as spiritFlame from './pixelfx/fx/fire/spirit-flame.js';
import * as shadowFlames from './pixelfx/fx/shadow/shadow-flames.js';
import * as runeCircle from './pixelfx/fx/arcane/rune-circle.js';
import * as godRays from './pixelfx/fx/weather/god-rays.js';

const FPS = 20;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };

// ---------- a tiny pixel painter on a 2D canvas (integer pixels, no smoothing) ----------
class Pix {
  constructor(ctx, W, H) { this.c = ctx; this.W = W; this.H = H; }
  rect(x, y, w, h, col) { if (w <= 0 || h <= 0) return; this.c.fillStyle = col; this.c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  px(x, y, col) { this.c.fillStyle = col; this.c.fillRect(Math.round(x), Math.round(y), 1, 1); }
  // ordered-dither blend of two colours over a box; f(x, y) -> 0..1 share of the second colour
  dither(x0, y0, w, h, a, b, f) {
    for (let y = Math.round(y0); y < y0 + h; y++) for (let x = Math.round(x0); x < x0 + w; x++) {
      const t = f(x, y);
      if (t <= 0) continue;
      if (t * 16 > BAYER[(y & 3) * 4 + (x & 3)]) this.px(x, y, b); else if (a) this.px(x, y, a);
    }
  }
  vgrad(x, y, w, h, a, b) { this.dither(x, y, w, h, a, b, (_, yy) => (yy - y) / h); }
  line(x0, y0, x1, y1, col) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, col);
  }
  ellipse(cx, cy, rx, ry, col, fill = false) {
    if (fill) { for (let y = -ry; y <= ry; y++) { const w = rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))); this.rect(cx - w, cy + y, w * 2 + 1, 1, col); } return; }
    const n = Math.ceil((rx + ry) * 3);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; this.px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, col); }
  }
  // dashed ring (engravings): every other `dash` pixels
  ring(cx, cy, r, col, dash = 0, ry = r) {
    const n = Math.ceil(r * 6.4);
    for (let i = 0; i < n; i++) if (!dash || ((i / dash) | 0) % 2 === 0) { const a = (i / n) * Math.PI * 2; this.px(cx + Math.cos(a) * r, cy + Math.sin(a) * ry, col); }
  }
  poly(pts, col) {
    const ys = pts.map((p) => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) this.rect(xs[k], y, xs[k + 1] - xs[k] + 1, 1, col);
    }
  }
  // a pointed gothic arch (filled), feet at y + h
  arch(x, y, w, h, col) {
    const r = w * 0.8, legs = h - w * 0.75;
    this.rect(x, y + h - legs, w, legs, col);
    for (let yy = 0; yy < h - legs; yy++) {
      const dy = h - legs - yy; // height above the springing line
      const half = Math.max(0, w / 2 - (r - Math.sqrt(Math.max(0, r * r - dy * dy * 1.6))) * 0.9);
      if (half > 0) this.rect(x + w / 2 - half, y + yy, half * 2, 1, col);
    }
  }
}

// ---------- shared pieces ----------
// a dark void in the middle where the tree sits: dithers the scene to black toward the centre
function centreDark(p, W, H, col, r0, r1) {
  const cx = W / 2, cy = H / 2;
  p.dither(0, 0, W, H, null, col, (x, y) => { const d = Math.hypot((x - cx) / 1.12, y - cy); return d < r0 ? 1 : d > r1 ? 0 : 1 - (d - r0) / (r1 - r0); });
}
// particles drawn on the low-res canvas each frame
class Motes {
  constructor() { this.ps = []; }
  add(o) { this.ps.push({ t: 0, ...o }); }
  step(dt, p) {
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const q = this.ps[i];
      q.t += dt;
      if (q.t > q.life) { this.ps.splice(i, 1); continue; }
      q.vx += (q.ax || 0) * dt; q.vy += (q.ay || 0) * dt;
      q.x += (q.vx + (q.wob ? Math.sin(q.t * q.wob + q.ph) * q.wa : 0)) * dt; q.y += q.vy * dt;
      const f = 1 - q.t / q.life, fade = Math.min(1, q.t * 4) * f;
      if (fade <= 0.05) continue;
      p.c.globalAlpha = fade * (q.a ?? 1);
      if (q.glyph) { for (const [gx, gy] of q.glyph) p.px(q.x + gx, q.y + gy, q.col); }
      else {
        if (q.halo) { p.c.globalAlpha *= 0.35; p.rect(q.x - 1, q.y - 1, 3, 3, q.halo); p.c.globalAlpha = fade * (q.a ?? 1); }
        p.px(q.x, q.y, q.col);
      }
    }
    p.c.globalAlpha = 1;
  }
}

// runes for floating glyphs: 3x4 pixel shapes
const GLYPHS = [
  [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [0, 3], [2, 3]], [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [2, 0], [2, 2]],
  [[1, 0], [0, 1], [2, 1], [1, 2], [1, 3]], [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [1, 3]], [[0, 0], [1, 0], [2, 1], [1, 2], [0, 3], [1, 3], [2, 3]],
];

// ================= KNIGHT: the Hall of Fallen Kings =================
const KN = { void: '#060607', char: '#121214', char2: '#1a1b1f', slate: '#2a2d33', slate2: '#3a3e46', slate3: '#52575f', slate4: '#6e737a',
  gold: '#c8a24a', gold2: '#f0d27a', goldDk: '#6a5222', red: '#5a1418', red2: '#7c1c20', red3: '#9a2a28', steel: '#3c4a5c', steel2: '#5a6e86', moss: '#2e3a22', moss2: '#3e4e2a', moon: '#a8b8cc' };

// one half of the hall (the left); the right is its mirror image
function knightHalf(p, W, H) {
  const r = rng(11), sw = Math.round(Math.min(W * 0.26, H * 0.62));
  // back wall: tall arches fading into darkness
  for (let i = 0; i < 3; i++) {
    const x = 4 + i * sw * 0.42, w = sw * 0.3, top = H * (0.06 + i * 0.05);
    p.arch(x, top, w, H * 0.78 - top, KN.char2);
    p.arch(x + 3, top + 4, w - 6, H * 0.78 - top - 4, KN.void);
  }
  // a broken stained-glass window high up, with cold moonlight through it
  const wx = sw * 0.46, wy = H * 0.07, ww = sw * 0.3, wh = H * 0.32;
  p.arch(wx - 2, wy - 2, ww + 4, wh + 4, KN.slate);
  p.arch(wx, wy, ww, wh, KN.void);
  const panes = [KN.red2, KN.steel2, KN.gold, KN.red3, KN.steel, KN.goldDk];
  for (let y = wy + 4; y < wy + wh - 2; y += 4) for (let x = wx + 2; x < wx + ww - 2; x += 4) {
    if (r() < 0.28) continue; // broken out
    const inside = (() => { const c = p.c.getImageData(Math.round(x + 1), Math.round(y + 1), 1, 1).data; return c[0] + c[1] + c[2] < 40; })();
    if (inside) p.rect(x, y, 3, 3, panes[(r() * panes.length) | 0]);
  }
  p.rect(wx + ww / 2 - 1, wy + 2, 2, wh - 2, KN.slate2); p.rect(wx, wy + wh * 0.55, ww, 2, KN.slate2); // mullions
  // the outer pillar
  p.rect(0, 0, sw * 0.12, H, KN.slate);
  p.vgrad(0, 0, sw * 0.12, H, KN.char2, KN.slate2);
  for (let y = 6; y < H; y += 14) p.rect(0, y, sw * 0.12, 1, KN.char);
  p.rect(sw * 0.12 - 2, 0, 2, H, KN.slate3);
  // a torn crimson banner with a gold sword
  const bx = sw * 0.82, bw = sw * 0.16, bh = H * 0.42;
  p.rect(bx - 3, H * 0.03, bw + 6, 3, KN.goldDk);
  p.rect(bx, H * 0.03 + 3, bw, bh, KN.red);
  p.dither(bx, H * 0.03 + 3, bw, bh, null, KN.red2, (x) => 1 - Math.abs((x - bx) / bw - 0.5) * 2.2);
  for (let x = bx; x < bx + bw; x++) { // torn hem
    const tear = (r() * H * 0.08) | 0;
    p.rect(x, H * 0.03 + 3 + bh - tear, 1, tear, KN.void);
  }
  const sx = bx + bw / 2, sy = H * 0.1;
  p.rect(sx, sy, 1, bh * 0.55, KN.gold); p.rect(sx - 3, sy + 4, 7, 1, KN.gold); p.rect(sx - 1, sy, 3, 2, KN.gold2);
  for (let y = sy + 6; y < sy + bh * 0.55; y += 3) p.px(sx + 1, y, KN.goldDk);
  // the statue: a legendary knight, hands on the pommel of a sword planted in the floor
  const cx = sw * 0.42, base = H * 0.88, s = H / 270;
  const st = (x, y, w, h, c) => p.rect(cx + x * s, base - y * s, w * s, h * s, c);
  st(-40, 26, 80, 26, KN.slate2); st(-44, 30, 88, 6, KN.slate3); st(-40, 4, 80, 4, KN.slate); // plinth
  for (let i = -3; i <= 3; i++) st(i * 10 - 1, 18, 3, 3, KN.goldDk); // runes on the plinth
  st(-16, 112, 12, 84, KN.slate); st(4, 112, 12, 84, KN.slate); // legs
  st(-18, 60, 15, 10, KN.slate3); st(3, 60, 15, 10, KN.slate3); // knee plates
  st(-22, 150, 44, 46, KN.char2); st(-20, 150, 40, 2, KN.slate2); // tabard / skirt
  st(-24, 196, 48, 48, KN.slate2); // chest
  st(-18, 188, 36, 34, KN.slate); st(-18, 188, 36, 1, KN.slate3); // breastplate
  st(-7, 182, 14, 18, KN.goldDk); st(-5, 180, 10, 14, KN.red2); st(-1, 178, 2, 10, KN.gold); // heraldic shield
  st(-36, 204, 18, 16, KN.slate3); st(18, 204, 18, 16, KN.slate3); st(-36, 204, 18, 1, KN.slate4); st(18, 204, 18, 1, KN.slate4); st(-36, 190, 14, 10, KN.slate2); st(22, 190, 14, 10, KN.slate2); // pauldrons
  st(-30, 186, 10, 46, KN.slate2); st(20, 186, 10, 46, KN.slate2); // arms down to the pommel
  st(-12, 236, 24, 32, KN.slate2); st(-12, 236, 24, 1, KN.slate4); st(-10, 230, 20, 6, KN.char); st(-8, 226, 4, 2, KN.void); st(4, 226, 4, 2, KN.void); // helm, visor
  st(-2, 250, 4, 16, KN.slate4); // crest
  // the sword: crossguard at the hands, blade down into the floor
  st(-22, 142, 44, 5, KN.slate4); st(-3, 154, 6, 12, KN.slate3); st(-4, 158, 8, 5, KN.slate4); // guard, grip, pommel
  st(-5, 137, 10, 112, KN.slate3); st(-5, 137, 1, 112, KN.slate4); st(-1, 137, 2, 112, KN.slate2); // blade
  st(-22, 142, 6, 5, KN.slate3); st(16, 142, 6, 5, KN.slate3);
  // cracks and moss
  for (let i = 0; i < 9; i++) {
    let x = cx + (r() - 0.5) * 60 * s, y = base - (30 + r() * 200) * s;
    for (let k = 0; k < 8; k++) { p.px(x, y, KN.char); x += (r() - 0.5) * 3; y += 1 + r(); }
  }
  for (let i = 0; i < 70; i++) {
    const x = cx + (r() - 0.5) * 84 * s, y = base - r() * 40 * s;
    p.px(x, y, r() < 0.5 ? KN.moss : KN.moss2);
  }
  // the statue's far side falls into shadow
  p.dither(cx - 44 * s, base - 270 * s, 50 * s, 270 * s, null, KN.char, (x) => Math.max(0, 0.7 - (x - (cx - 44 * s)) / (60 * s)));
  // braziers sit at the plinth's front corners (played by pixelfx); warm light from below on the statue
  p.dither(cx - 46 * s, base - 120 * s, 92 * s, 120 * s, null, '#3a2a14', (x, y) => Math.max(0, 0.55 - (base - y) / (150 * s)) * (1 - Math.abs(x - cx) / (60 * s)));
  return { cx, base, sw, s, winX: wx + ww / 2, winY: wy + wh / 2 };
}

function paintKnight(p, W, H) {
  p.rect(0, 0, W, H, KN.void);
  p.vgrad(0, 0, W, H, KN.void, KN.char);
  // the floor: a great stone circle with royal crests, in perspective
  const fy = H * 0.86;
  p.rect(0, fy, W, H - fy, KN.char2);
  p.dither(0, fy, W, H - fy, null, KN.slate, (x, y) => 0.25 + 0.4 * ((y - fy) / (H - fy)));
  // the left half, then mirror it for the right
  const side = document.createElement('canvas'); side.width = W; side.height = H;
  const sp = new Pix(side.getContext('2d'), W, H);
  const info = knightHalf(sp, W, H);
  p.c.drawImage(side, 0, 0);
  p.c.save(); p.c.translate(W, 0); p.c.scale(-1, 1); p.c.drawImage(side, 0, 0); p.c.restore();
  // the middle stays dark
  centreDark(p, W, H, KN.void, H * 0.36, H * 0.6);
  return info;
}

// ================= ROGUE: the Shadow Realm =================
const RG = { void: '#030204', v1: '#0a0610', v2: '#120a1c', v3: '#1c1028', v4: '#2a1a3a', stone: '#1e1c24', stone2: '#2c2a34', stone3: '#3e3c48', stone4: '#5a5866',
  crim: '#7a0c14', crim2: '#b8141e', crim3: '#ff3a3a', bone: '#26242c', bone2: '#36343e', root: '#0c080e', smoke: '#3a1a52' };

function paintRogue(p, W, H) {
  const r = rng(23), s = H / 270, sw = Math.min(W * 0.26, H * 0.62);
  p.rect(0, 0, W, H, RG.void);
  // the void: violet mist thickening toward the edges
  p.dither(0, 0, W, H, null, RG.v1, (x, y) => Math.min(1, Math.abs(x / W - 0.5) * 2.4 + Math.abs(y / H - 0.5) * 0.8 - 0.3));
  p.dither(0, 0, W, H, null, RG.v2, (x, y) => Math.abs(x / W - 0.5) * 2.4 - 0.9 + Math.sin(y * 0.05 + x * 0.02) * 0.15);
  // floating broken archways and shattered columns, both sides
  const arch = (x, y, w, h, broken) => {
    p.arch(x, y, w, h, RG.stone2); p.arch(x + 4 * s, y + 4 * s, w - 8 * s, h - 4 * s, RG.void);
    p.rect(x - 2, y + h, w + 4, 4 * s, RG.stone3);
    if (broken) p.poly([[x + w * 0.5, y - 2], [x + w + 2, y - 2], [x + w + 2, y + h * 0.45], [x + w * 0.7, y + h * 0.2]], RG.void);
    for (let i = 0; i < 3; i++) p.rect(x + r() * w, y + h + 4 * s + r() * 12 * s, 3 * s, 2 * s, RG.stone2); // falling chips
  };
  arch(sw * 0.35, H * 0.08, sw * 0.38, H * 0.42, true);
  arch(W - sw * 0.75, H * 0.12, sw * 0.4, H * 0.38, false);
  const column = (x, y, h, w) => { p.rect(x, y, w, h, RG.stone2); p.rect(x, y, 2, h, RG.stone3); p.rect(x - 2, y + h, w + 4, 3, RG.stone3); p.poly([[x, y], [x + w, y], [x + w * 0.6, y - 6 * s], [x + w * 0.3, y - 2]], RG.stone2); };
  column(sw * 0.05, H * 0.18, H * 0.5, 12 * s);
  column(W - sw * 0.12, H * 0.08, H * 0.42, 12 * s);
  column(sw * 0.82, H * 0.55, H * 0.22, 9 * s);
  column(W - sw * 0.92, H * 0.6, H * 0.2, 9 * s);
  // black chains strung between the columns, sagging into the dark
  const chain = (x0, y0, x1, y1, sag) => {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3);
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag; p.rect(x, y, 2, 2, i % 2 ? RG.stone : RG.stone3); }
  };
  chain(sw * 0.05 + 12 * s, H * 0.22, sw * 0.4, H * 0.08 + H * 0.42, 18 * s);
  chain(sw * 0.82, H * 0.56, sw * 0.05 + 12 * s, H * 0.5, 14 * s);
  chain(W - sw * 0.12, H * 0.12, W - sw * 0.7, H * 0.5, 22 * s);
  chain(W - sw * 0.92 + 9 * s, H * 0.62, W - sw * 0.12, H * 0.45, 12 * s);
  // ruined stairs climbing to nowhere
  for (let i = 0; i < 6; i++) p.rect(sw * 0.55 + i * 7 * s, H * 0.86 - i * 6 * s, 9 * s, 3 * s, i === 4 ? RG.void : RG.stone2);
  for (let i = 0; i < 5; i++) p.rect(W - sw * 0.6 - i * 7 * s, H * 0.92 - i * 6 * s, 9 * s, 3 * s, i === 2 ? RG.void : RG.stone2);
  // floating platforms wrapped in black thorn roots
  const plat = (x, y, w) => {
    p.poly([[x, y], [x + w, y], [x + w * 0.8, y + 8 * s], [x + w * 0.5, y + 16 * s], [x + w * 0.2, y + 8 * s]], RG.stone);
    p.rect(x, y, w, 2, RG.stone3);
    for (let i = 0; i < 4; i++) { let rx = x + r() * w, ry = y + 2; for (let k = 0; k < 14; k++) { p.px(rx, ry, RG.root); if (k % 4 === 2) p.px(rx + 1, ry - 1, RG.stone4); rx += (r() - 0.5) * 3; ry += 1; } }
  };
  plat(sw * 0.15, H * 0.8, 50 * s); plat(W - sw * 0.55, H * 0.72, 44 * s); plat(sw * 0.6, H * 0.3, 30 * s);
  // the hooded statue (left): a hollow of black under the hood
  const hx = sw * 0.24, hb = H * 0.96;
  const hs = (x, y, w, h, c) => p.rect(hx + x * s, hb - y * s, w * s, h * s, c);
  p.poly([[hx - 34 * s, hb], [hx + 34 * s, hb], [hx + 22 * s, hb - 150 * s], [hx - 22 * s, hb - 150 * s]], RG.stone2); // robe
  p.poly([[hx - 26 * s, hb - 145 * s], [hx + 26 * s, hb - 145 * s], [hx + 16 * s, hb - 200 * s], [hx, hb - 212 * s], [hx - 16 * s, hb - 200 * s]], RG.stone3); // hood
  p.poly([[hx - 12 * s, hb - 150 * s], [hx + 12 * s, hb - 150 * s], [hx + 9 * s, hb - 192 * s], [hx - 9 * s, hb - 192 * s]], RG.void); // the hollow
  for (let i = -2; i <= 2; i++) hs(i * 12 - 1, 140, 2, 130, RG.stone); // folds
  hs(-22, 100, 44, 8, RG.stone3); // clasped hands
  p.dither(hx - 34 * s, hb - 212 * s, 68 * s, 212 * s, null, RG.v3, (x) => (x - (hx - 34 * s)) / (68 * s) * 0.5); // lit from the right, faintly violet
  // the skeletal stone hand (right) holding a crimson dagger-crystal
  const kx = W - sw * 0.32, kb = H;
  // forearm: two bones rising out of the dark, joined at a knobbly wrist
  p.poly([[kx - 16 * s, kb], [kx - 6 * s, kb], [kx - 6 * s, kb - 72 * s], [kx - 14 * s, kb - 72 * s]], RG.bone);
  p.poly([[kx + 2 * s, kb], [kx + 12 * s, kb], [kx + 14 * s, kb - 72 * s], [kx + 4 * s, kb - 72 * s]], RG.bone);
  p.rect(kx - 14 * s, kb - 72 * s, 1, 72 * s, RG.bone2); p.rect(kx + 4 * s, kb - 72 * s, 1, 72 * s, RG.bone2);
  p.ellipse(kx - 10 * s, kb - 74 * s, 6 * s, 4 * s, RG.bone2, true); p.ellipse(kx + 9 * s, kb - 74 * s, 6 * s, 4 * s, RG.bone2, true);
  p.dither(kx - 20 * s, kb - 40 * s, 40 * s, 40 * s, null, RG.void, (_, y) => (y - (kb - 40 * s)) / (40 * s)); // fading into the void
  // the hand: small carpal bones, then finger bones curled round the hilt, knuckle by knuckle
  for (let i = 0; i < 5; i++) p.ellipse(kx - 14 * s + i * 7 * s, kb - 82 * s, 3 * s, 3 * s, i % 2 ? RG.bone : RG.bone2, true);
  for (let i = 0; i < 4; i++) {
    const fx = kx - 16 * s + i * 9 * s;
    p.rect(fx, kb - 98 * s, 6 * s, 12 * s, RG.bone); p.rect(fx, kb - 98 * s, 6 * s, 1, RG.stone4); // first joint
    p.rect(fx, kb - 112 * s, 6 * s, 12 * s, RG.bone2); p.rect(fx + 1 * s, kb - 112 * s, 4 * s, 1, RG.stone4); // second, over the hilt
    p.ellipse(fx + 3 * s, kb - 99 * s, 3 * s, 2 * s, RG.stone3, true); // knuckle
  }
  p.poly([[kx - 26 * s, kb - 84 * s], [kx - 18 * s, kb - 86 * s], [kx - 16 * s, kb - 104 * s], [kx - 24 * s, kb - 102 * s]], RG.bone2); // thumb
  // the crystal: a long crimson dagger shape pointing up
  p.poly([[kx - 6 * s, kb - 110 * s], [kx + 6 * s, kb - 110 * s], [kx + 4 * s, kb - 190 * s], [kx, kb - 214 * s], [kx - 4 * s, kb - 190 * s]], RG.crim);
  p.poly([[kx - 1 * s, kb - 112 * s], [kx + 3 * s, kb - 112 * s], [kx + 2 * s, kb - 195 * s], [kx, kb - 210 * s]], RG.crim2);
  p.rect(kx - 14 * s, kb - 116 * s, 28 * s, 5 * s, RG.crim); // crossguard
  // shadow figures trapped in the stone (faint)
  const ghost = (x, y, h) => { p.ellipse(x, y, 3 * s, 4 * s, RG.v4, true); p.poly([[x - 6 * s, y + 4 * s], [x + 6 * s, y + 4 * s], [x + 9 * s, y + h], [x - 9 * s, y + h]], RG.v3); p.rect(x - 10 * s, y + 8 * s, 4 * s, 2, RG.v4); };
  ghost(sw * 0.54, H * 0.16, 26 * s); ghost(W - sw * 0.55, H * 0.2, 24 * s); ghost(sw * 0.12, H * 0.3, 20 * s);
  // the middle stays dark
  centreDark(p, W, H, RG.void, H * 0.34, H * 0.6);
  return { crystal: [kx, kb - 160 * s], hood: [hx, hb - 172 * s], sw, s };
}

// ================= SPELLSWORD: the Library Beyond =================
const MG = { void: '#04040c', ind: '#0a0a1c', ind2: '#121430', mid: '#1a1e44', ame: '#2e1e4e', ame2: '#4a2e72', wood: '#1c120e', wood2: '#2e1e16', wood3: '#46301e',
  gold: '#b08a3a', gold2: '#e8c870', cyan: '#3ad8e8', cyan2: '#a8f4ff', vio: '#8a6ae0', star: '#c8d0ff',
  books: ['#4a1a1e', '#1e2e52', '#1e3a2a', '#3a1e4a', '#4a3418', '#2a2a3a', '#5a2a18', '#18324a'] };

function shelfStack(p, x, w, H, s, r, lean = 0) {
  p.rect(x - 3 * s, 0, w + 6 * s, H, MG.wood);
  p.rect(x - 3 * s, 0, 3 * s, H, MG.wood3); p.rect(x + w, 0, 3 * s, H, MG.wood2);
  for (let y = H; y > -20; y -= 22 * s) {
    p.rect(x - 3 * s, y, w + 6 * s, 3 * s, MG.wood3); p.rect(x - 3 * s, y, w + 6 * s, 1, MG.gold);
    // a shelf of books, now and then a crystal, a globe or a relic
    let bx = x + 1;
    while (bx < x + w - 3) {
      const roll = r();
      if (roll < 0.012 && bx < x + w - 12 * s) { // crystal
        p.poly([[bx + 4 * s, y - 16 * s], [bx + 8 * s, y - 6 * s], [bx + 4 * s, y], [bx, y - 6 * s]], MG.vio); p.px(bx + 4 * s, y - 12 * s, MG.cyan2);
        bx += 10 * s; continue;
      }
      if (roll < 0.022 && bx < x + w - 14 * s) { // celestial globe
        p.ellipse(bx + 6 * s, y - 9 * s, 5 * s, 5 * s, MG.mid, true); p.ellipse(bx + 6 * s, y - 9 * s, 6 * s, 2 * s, MG.gold); p.rect(bx + 5 * s, y - 3 * s, 2 * s, 3 * s, MG.gold);
        bx += 13 * s; continue;
      }
      const bw = Math.max(2, Math.round((2 + r() * 3) * s)), bh = (12 + r() * 7) * s, c = MG.books[(r() * MG.books.length) | 0];
      p.rect(bx, y - bh, bw, bh, c);
      if (r() < 0.5) p.rect(bx, y - bh + 2 * s, bw, 1, MG.gold);
      if (r() < 0.3) p.rect(bx, y - 4 * s, bw, 1, MG.gold);
      bx += bw + (r() < 0.15 ? 1 : 0);
    }
  }
}

function paintMage(p, W, H) {
  const r = rng(37), s = H / 270, sw = Math.min(W * 0.26, H * 0.62);
  p.rect(0, 0, W, H, MG.void);
  p.vgrad(0, 0, W, H, MG.ind, MG.void);
  // gothic windows onto a star-filled void, between the shelves
  const win = (x, y, w, h) => {
    p.arch(x - 3 * s, y - 3 * s, w + 6 * s, h + 6 * s, MG.wood2);
    p.arch(x, y, w, h, MG.ind);
    p.dither(x, y, w, h, null, MG.ame, (xx, yy) => 0.15 + 0.25 * Math.sin(xx * 0.08 + yy * 0.05));
    for (let i = 0; i < w * h / 40; i++) { const sx = x + r() * w, sy = y + r() * h; p.px(sx, sy, r() < 0.2 ? MG.cyan2 : MG.star); }
    p.rect(x + w / 2 - 1, y + w * 0.4, 2, h - w * 0.4, MG.wood2); p.rect(x, y + h * 0.55, w, 2, MG.wood2);
  };
  win(sw * 0.62, H * 0.12, sw * 0.28, H * 0.5);
  win(W - sw * 0.9, H * 0.12, sw * 0.28, H * 0.5);
  // shelves rising off the top on both edges
  shelfStack(p, 4 * s, sw * 0.5, H, s, r);
  shelfStack(p, W - sw * 0.5 - 4 * s, sw * 0.5, H, s, r);
  // spiral stairs winding up into the dark behind the windows
  for (let i = 0; i < 14; i++) {
    const t = i / 13, a = t * Math.PI * 1.6;
    p.rect(sw * 0.66 + Math.cos(a) * 12 * s, H * 0.98 - t * H * 0.3, 14 * s, 2 * s, MG.wood2);
    p.rect(W - sw * 0.66 - Math.cos(a) * 12 * s - 14 * s, H * 0.98 - t * H * 0.3, 14 * s, 2 * s, MG.wood2);
  }
  // the carved pedestal (left) under the floating spellbook
  const px0 = sw * 0.72, pb = H * 0.94;
  p.rect(px0 - 14 * s, pb - 8 * s, 28 * s, 8 * s, MG.wood3); p.rect(px0 - 8 * s, pb - 44 * s, 16 * s, 36 * s, MG.wood2);
  p.rect(px0 - 12 * s, pb - 50 * s, 24 * s, 6 * s, MG.wood3); p.rect(px0 - 12 * s, pb - 50 * s, 24 * s, 1, MG.gold);
  for (let y = pb - 40 * s; y < pb - 12 * s; y += 6 * s) p.rect(px0 - 6 * s, y, 12 * s, 1, MG.gold);
  // the crystal chamber (right) holding the staff
  const cx0 = W - sw * 0.72, cb = H * 0.94;
  p.rect(cx0 - 16 * s, cb - 8 * s, 32 * s, 8 * s, MG.wood3); p.rect(cx0 - 16 * s, cb - 96 * s, 32 * s, 5 * s, MG.wood3);
  p.dither(cx0 - 14 * s, cb - 91 * s, 28 * s, 83 * s, null, MG.ame, () => 0.35);
  p.rect(cx0 - 14 * s, cb - 91 * s, 1, 83 * s, MG.cyan); p.rect(cx0 + 13 * s, cb - 91 * s, 1, 83 * s, MG.vio);
  p.rect(cx0 - 1 * s, cb - 84 * s, 2 * s, 70 * s, MG.wood3); // the staff
  p.ellipse(cx0, cb - 84 * s, 4 * s, 4 * s, MG.gold, true); p.ellipse(cx0, cb - 84 * s, 2 * s, 2 * s, MG.vio, true);
  // the astronomical clock in the upper architecture (dim gold)
  const kx = W / 2, ky = -H * 0.02, kr = H * 0.16;
  p.ellipse(kx, ky, kr, kr, MG.ind2, true);
  for (const f of [1, 0.82, 0.6]) p.ring(kx, ky, kr * f, MG.gold, f === 0.82 ? 2 : 0);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; p.line(kx + Math.cos(a) * kr * 0.84, ky + Math.sin(a) * kr * 0.84, kx + Math.cos(a) * kr * 0.96, ky + Math.sin(a) * kr * 0.96, i % 6 ? MG.wood3 : MG.gold2); }
  p.line(kx, ky, kx + kr * 0.5, ky + kr * 0.55, MG.gold2);
  // the middle stays dark
  centreDark(p, W, H, MG.void, H * 0.36, H * 0.6);
  return { book: [px0, pb - 74 * s], staff: [cx0, cb - 50 * s], clock: [kx, ky, kr], sw, s, wins: [[sw * 0.62, H * 0.12, sw * 0.28, H * 0.5], [W - sw * 0.9, H * 0.12, sw * 0.28, H * 0.5]] };
}

// ---------- pixelfx effects on the fine canvas ----------
class FxLayer {
  constructor(ctx) { this.ctx = ctx; this.list = []; }
  add(mod, x, y, opts = {}) {
    const [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin;
    const fx = createFx(mod, { ...opts, x: ox, y: oy, seed: opts.seed ?? ((Math.random() * 1e6) | 0) });
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    this.list.push({ fx, x, y, ox, oy, w, h, cv, cx: cv.getContext('2d'), frame: createFrame(w, h), img: new ImageData(w, h), alpha: opts.alpha ?? 1 });
  }
  step(dt) {
    const c = this.ctx;
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    for (const e of this.list) {
      e.fx.update(dt);
      clearFrame(e.frame); e.fx.draw(e.frame); composite(e.frame, e.img.data, null);
      e.cx.putImageData(e.img, 0, 0);
      c.globalAlpha = e.alpha;
      c.drawImage(e.cv, Math.round(e.x - e.ox), Math.round(e.y - e.oy));
    }
    c.globalAlpha = 1;
  }
}

export class TreeBackground {
  constructor(wrap) {
    this.wrap = wrap;
    this.cv = document.createElement('canvas'); this.cv.className = 'tree-bg';
    this.fxc = document.createElement('canvas'); this.fxc.className = 'tree-bg';
    wrap.prepend(this.fxc); wrap.prepend(this.cv);
    this.kind = null; this.raf = 0; this.t = 0;
  }

  // paint the scene for `kind` at the wrap's size (about 270 pixels tall)
  setup(kind) {
    const r = this.cv.getBoundingClientRect(); // a little bigger than the wrap, so it can drift (parallax)
    const S = Math.max(1, Math.round(r.height / 270)), W = Math.max(160, Math.round(r.width / S)), H = Math.max(120, Math.round(r.height / S));
    if (this.kind === kind && this.W === W && this.H === H) return;
    this.kind = kind; this.W = W; this.H = H;
    this.cv.width = W; this.cv.height = H;
    this.fxc.width = W * 2; this.fxc.height = H * 2;
    this.static = document.createElement('canvas'); this.static.width = W; this.static.height = H;
    const p = new Pix(this.static.getContext('2d'), W, H);
    this.info = kind === 'knight' ? paintKnight(p, W, H) : kind === 'rogue' ? paintRogue(p, W, H) : paintMage(p, W, H);
    this.motes = new Motes(); this.acc = 0; this.spawn = {};
    this.fx = new FxLayer(this.fxc.getContext('2d'));
    const I = this.info, F = 2; // fine canvas: twice the pixels
    if (kind === 'knight') {
      const rx = (x) => W - x; // the mirrored side
      for (const x of [I.cx - 50 * I.s, I.cx + 50 * I.s]) for (const xx of [x, rx(x)]) this.fx.add(brazier, xx * F, (I.base + 2) * F, { seed: (xx * 7) | 0 });
      this.fx.add(godRays, I.winX * F + 70, I.winY * F + 150, { alpha: 0.18, palette: ['#06080c', '#121a24', '#26364a', '#4a6278', '#7a92aa', '#b4c6d8', '#e4eef8'] });
      this.fx.add(godRays, rx(I.winX) * F - 70, I.winY * F + 150, { alpha: 0.18, seed: 9, palette: ['#06080c', '#121a24', '#26364a', '#4a6278', '#7a92aa', '#b4c6d8', '#e4eef8'] });
    } else if (kind === 'rogue') {
      for (const [x, y] of [[I.sw * 0.25, H * 0.99], [W - I.sw * 0.15, H * 0.99], [I.sw * 0.72, H * 0.86], [W - I.sw * 0.62, H * 0.95]]) this.fx.add(shadowFlames, x * F, y * F, { alpha: 0.9 });
      this.fx.add(spiritFlame, I.crystal[0] * F, (I.crystal[1] + 40 * I.s) * F, { alpha: 0.55, palette: ['#100204', '#2a0408', '#4a060c', '#7a0a14', '#a8121c', '#d42a2a', '#ff5a4a', '#ffa890', '#ffe0d8'] });
    } else {
      this.fx.add(runeCircle, I.book[0] * F, (I.book[1] + 30 * I.s) * F, { alpha: 0.7 });
      this.fx.add(spiritFlame, I.staff[0] * F, (I.staff[1] + 26 * I.s) * F, { alpha: 0.6, palette: ['#06040e', '#140a2a', '#24124a', '#3a1e72', '#5a2ea0', '#7a4ad0', '#a87af0', '#d8c0ff', '#ffffff'] });
    }
  }

  start(kind) {
    this.setup(kind);
    if (this.raf) return;
    let last = performance.now();
    const tick = (now) => {
      if (this.wrap.offsetParent === null) { this.raf = 0; return; } // tree screen closed
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); // (a frame's timestamp can be older than `last`)
      this.acc += dt;
      if (this.acc >= 1 / FPS) { this.frame(this.acc); this.acc = 0; }
      last = now;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  // parallax: drift a tenth of the way with the tree as it is dragged, and scale a touch with the zoom
  // (dx, dy: how far the tree has moved on screen, px; z: its zoom)
  setView(dx, dy, z) {
    const r = this.wrap.getBoundingClientRect(), mx = r.width * 0.05, my = r.height * 0.05;
    const tx = Math.max(-mx, Math.min(mx, dx * 0.1)), ty = Math.max(-my, Math.min(my, dy * 0.1)), k = 1 + Math.min(0.05, Math.max(-0.03, (z - 1) * 0.02));
    for (const c of [this.cv, this.fxc]) c.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(3)})`;
  }

  every(key, rate, dt, fn) { this.spawn[key] = (this.spawn[key] || 0) + rate * dt; while (this.spawn[key] >= 1) { this.spawn[key]--; fn(); } }

  frame(dt) {
    this.t += dt;
    const { W, H, info: I, kind } = this, c = this.cv.getContext('2d'), p = new Pix(c, W, H), t = this.t, R = Math.random;
    c.drawImage(this.static, 0, 0);
    if (kind === 'knight') {
      // embers rising from the braziers, dust in the moonbeams, the odd spark; runes on the plinths breathe
      for (const x of [I.cx - 50 * I.s, I.cx + 50 * I.s, W - I.cx + 50 * I.s, W - I.cx - 50 * I.s]) this.every('e' + x, 3, dt, () => this.motes.add({ x: x + (R() - 0.5) * 8, y: I.base - 30 * I.s, vx: (R() - 0.5) * 6, vy: -(10 + R() * 14), life: 2 + R() * 2.5, col: R() < 0.3 ? KN.gold2 : '#ff9a3a', halo: '#a04010', wob: 2, wa: 4, ph: R() * 6 }));
      this.every('dust', 6, dt, () => { const left = R() < 0.5, x = left ? I.winX + (R() - 0.3) * 40 : W - I.winX - (R() - 0.3) * 40; this.motes.add({ x, y: H * (0.2 + R() * 0.6), vx: (left ? 1 : -1) * (1 + R() * 2), vy: 1 + R() * 2, life: 3 + R() * 3, col: '#8a9aaa', a: 0.6, wob: 1, wa: 2, ph: R() * 6 }); });
      this.every('spark', 0.6, dt, () => { const x = R() < 0.5 ? I.cx : W - I.cx; this.motes.add({ x, y: I.base - 40 * I.s, vx: (R() - 0.5) * 40, vy: -40 - R() * 30, ay: 60, life: 1, col: '#fff0b0', halo: '#ff9a3a' }); });
      const glow = 0.5 + 0.5 * Math.sin(t * 1.6);
      c.globalAlpha = 0.35 + 0.5 * glow;
      for (const x0 of [I.cx, W - I.cx]) for (let i = -3; i <= 3; i++) p.rect(x0 + (i * 10 - 1) * I.s, I.base - 18 * I.s, 3 * I.s, 3 * I.s, KN.gold2);
      c.globalAlpha = 1;
    } else if (kind === 'rogue') {
      // the crystal pulses; red sigils flicker in the stone; violet smoke ribbons and black flames drift up
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      c.globalAlpha = 0.08 + 0.12 * pulse; p.ellipse(I.crystal[0], I.crystal[1], 16 * I.s, 40 * I.s, RG.crim, true); c.globalAlpha = 1;
      c.globalAlpha = 0.6 + 0.4 * pulse; p.rect(I.crystal[0], I.crystal[1] - 40 * I.s, 1, 70 * I.s, RG.crim3); c.globalAlpha = 1;
      for (let i = 0; i < 7; i++) {
        const on = Math.sin(t * (1.3 + i * 0.37) + i * 2.1) > 0.55;
        if (!on) continue;
        const x = i < 4 ? I.sw * (0.1 + i * 0.22) : W - I.sw * (0.15 + (i - 4) * 0.25), y = H * (0.3 + ((i * 37) % 50) / 100);
        const g = GLYPHS[i % GLYPHS.length];
        for (const [gx, gy] of g) p.rect(x + gx * 2, y + gy * 2, 2, 2, i % 2 ? RG.crim2 : RG.crim);
      }
      this.every('smoke', 1.2, dt, () => { const left = R() < 0.5; this.motes.add({ x: left ? R() * I.sw : W - R() * I.sw, y: H + 2, vx: (left ? 1 : -1) * 3, vy: -(6 + R() * 6), life: 6 + R() * 3, col: RG.smoke, a: 0.7, wob: 1.5, wa: 10, ph: R() * 6, trail: true }); });
      this.every('spark', 4, dt, () => this.motes.add({ x: I.crystal[0] + (R() - 0.5) * 20, y: I.crystal[1] + (R() - 0.5) * 60, vx: (R() - 0.5) * 6, vy: -(4 + R() * 8), life: 2 + R() * 2, col: RG.crim3, halo: RG.crim, wob: 2, wa: 3, ph: R() * 6 }));
      this.every('ember', 3, dt, () => { const left = R() < 0.5; this.motes.add({ x: left ? R() * I.sw * 1.1 : W - R() * I.sw * 1.1, y: H * (0.4 + R() * 0.6), vx: 0, vy: -(3 + R() * 5), life: 3 + R() * 2, col: R() < 0.4 ? RG.crim2 : '#4a3a5a', wob: 1, wa: 3, ph: R() * 6 }); });
      // distortion at the edges of the void: wavering dark bands
      for (let y = 0; y < H; y += 2) { const w = 3 + Math.sin(y * 0.07 + t * 1.3) * 3 + Math.sin(y * 0.19 - t * 2.1) * 2; p.rect(0, y, w, 2, RG.void); p.rect(W - w, y, w, 2, RG.void); }
      // the smoke motes leave a short ribbon
      for (const q of this.motes.ps) if (q.trail) { c.globalAlpha = 0.25 * (1 - q.t / q.life); for (let k = 1; k < 8; k++) p.px(q.x - Math.sin((q.t - k * 0.08) * q.wob + q.ph) * q.wa * 0.3, q.y + k * 2, RG.v4); c.globalAlpha = 1; }
    } else {
      // runes stream up from the open book; small books bob round it; the gold rings orbit the staff;
      // stars twinkle and lightning flickers far off in the windows; the clock hand turns
      const bob = Math.sin(t * 1.4) * 2 * I.s, [bx, by] = I.book;
      c.globalAlpha = 0.25; p.ellipse(bx, by + 6 * I.s + bob, 30 * I.s, 16 * I.s, MG.cyan, true); c.globalAlpha = 1; // its glow
      p.poly([[bx - 26 * I.s, by - 2 * I.s + bob], [bx, by + 5 * I.s + bob], [bx, by + 15 * I.s + bob], [bx - 26 * I.s, by + 9 * I.s + bob]], '#4a1a1e'); // covers
      p.poly([[bx + 26 * I.s, by - 2 * I.s + bob], [bx, by + 5 * I.s + bob], [bx, by + 15 * I.s + bob], [bx + 26 * I.s, by + 9 * I.s + bob]], '#4a1a1e');
      p.poly([[bx - 24 * I.s, by - 3 * I.s + bob], [bx, by + 4 * I.s + bob], [bx, by + 12 * I.s + bob], [bx - 24 * I.s, by + 6 * I.s + bob]], '#c8c0a8');
      p.poly([[bx + 24 * I.s, by - 3 * I.s + bob], [bx, by + 4 * I.s + bob], [bx, by + 12 * I.s + bob], [bx + 24 * I.s, by + 6 * I.s + bob]], '#e0d8c0');
      for (let k = 0; k < 4; k++) { p.rect(bx - 20 * I.s, by + (1 + k * 2) * I.s + bob, 14 * I.s, 1, '#3ab8c8'); p.rect(bx + 6 * I.s, by + (1 + k * 2) * I.s + bob, 14 * I.s, 1, '#3ab8c8'); } // glowing lines of script
      p.rect(bx - 1, by + 4 * I.s + bob, 2, 8 * I.s, MG.wood3);
      const turn = (t * 0.5) % 1; // a page turning over
      if (turn < 0.5) { const f = turn * 2, px = bx + (1 - 2 * f) * 16 * I.s; p.line(bx, by + 4 * I.s + bob, px, by - 6 * I.s * Math.sin(f * Math.PI) + bob, '#f4eedc'); }
      for (let k = 0; k < 4; k++) { // smaller books hovering round
        const a = t * 0.6 + k * 1.6, x = bx + Math.cos(a) * 30 * I.s, y = by - 10 * I.s + Math.sin(a * 1.3) * 10 * I.s;
        p.rect(x - 4 * I.s, y - 2 * I.s, 8 * I.s, 5 * I.s, MG.books[k * 2]); p.rect(x - 4 * I.s, y - 2 * I.s, 8 * I.s, 1, MG.gold);
      }
      this.every('rune', 7, dt, () => this.motes.add({ x: bx + (R() - 0.5) * 24 * I.s, y: by, vx: (R() - 0.5) * 4, vy: -(8 + R() * 10), life: 2.5 + R() * 2, col: R() < 0.3 ? MG.cyan2 : MG.cyan, glyph: GLYPHS[(R() * GLYPHS.length) | 0], wob: 1.5, wa: 4, ph: R() * 6 }));
      const [sx, sy] = I.staff;
      for (let k = 0; k < 3; k++) { // gold rings orbiting the staff, purple energy along them
        const a = t * (0.9 + k * 0.4) + k * 2, rx = (12 + k * 3) * I.s, ry = (3 + k) * I.s, y = sy - 30 * I.s + k * 14 * I.s;
        p.ellipse(sx, y, rx, ry, MG.gold);
        p.rect(sx + Math.cos(a) * rx - 1, y + Math.sin(a) * ry - 1, 3, 3, MG.vio); p.px(sx + Math.cos(a) * rx, y + Math.sin(a) * ry, '#f0e0ff');
      }
      this.every('dust', 8, dt, () => { const left = R() < 0.5; this.motes.add({ x: left ? R() * I.sw * 1.2 : W - R() * I.sw * 1.2, y: R() * H, vx: (R() - 0.5) * 3, vy: -(1 + R() * 3), life: 3 + R() * 3, col: R() < 0.5 ? MG.vio : MG.cyan2, a: 0.8, wob: 1, wa: 3, ph: R() * 6 }); });
      for (const [wx, wy, ww, wh] of I.wins) { // twinkling stars, distant lightning
        for (let k = 0; k < 4; k++) { const tw = Math.sin(t * 3 + k * 5 + wx); if (tw > 0.7) p.px(wx + ((k * 37 + wx) % ww), wy + 6 + ((k * 53) % (wh - 10)), '#ffffff'); }
        if (Math.sin(t * 0.7 + wx) > 0.985) { c.globalAlpha = 0.5; p.rect(wx + 2, wy + ww * 0.4, ww - 4, wh - ww * 0.4 - 2, '#6a5ab0'); c.globalAlpha = 1; let x = wx + ww * (0.3 + 0.4 * ((t * 13) % 1)), y = wy + ww * 0.4; while (y < wy + wh * 0.8) { p.px(x, y, MG.cyan2); x += (Math.random() - 0.5) * 3; y += 1; } }
      }
      const [kx, ky, kr] = I.clock, ha = t * 0.15;
      p.line(kx, ky, kx + Math.cos(ha + 1) * kr * 0.75, ky + Math.abs(Math.sin(ha + 1)) * kr * 0.75, MG.cyan);
      // blue-violet currents along the floor
      for (let x = 0; x < I.sw * 1.3; x += 1) { const y = H * 0.97 + Math.sin(x * 0.1 + t * 2) * 2; c.globalAlpha = 0.5; p.px(x, y, MG.vio); p.px(W - x, y + 1, MG.cyan); c.globalAlpha = 1; }
    }
    this.motes.step(dt, p);
    this.fx.step(dt);
  }
}
