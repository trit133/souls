// Life on the painted maps (worldmap.js): pixel effects over the art, drawn on a small canvas scaled up with hard
// pixels so they read as pixel art over the painting. Smoke rising off burning towns, flickering fires and torches,
// embers off the lava, mist drifting over marsh and mountain, sparkles round the Seat of Augury and on the glass,
// glints on the water and rivers, green steam out of the Sump Lines, white clouds drifting over, crows circling.
// The spots are in the art's own pixels (both maps are 1672 x 941); it only runs while the map is open.
const ART_W = 1672, ART_H = 941, DOWN = 2; // (the effects at half the art's size)
const K = 4 / DOWN; // (the numbers below were made for a quarter-size canvas: speeds and sizes times this)
export const FX_W = Math.round(ART_W / DOWN), FX_H = Math.round(ART_H / DOWN);

// ---------- what each map has, where ----------
const WORLD = [
  // the Shattered March: burning towns and a smoking crater
  ['fire', 150, 615], ['smoke', 150, 600, { n: 1 }], ['fire', 268, 492], ['smoke', 270, 470], ['fire', 712, 645], ['fire', 735, 655], ['smoke', 722, 625, { big: 1 }],
  ['smoke', 505, 555], ['torch', 520, 600], ['torch', 480, 610],
  // the Forge Reaches: the black citadel's smoke, lava glowing and spitting embers
  ['smoke', 1440, 170, { big: 1, dark: 1 }], ['smoke', 1350, 290, { dark: 1 }], ['smoke', 1520, 230, { dark: 1 }],
  ...[[1385, 300], [1300, 352], [1400, 340], [1505, 345], [1230, 372], [1460, 410], [1190, 425], [1105, 352], [1560, 330], [1330, 440]].map(([x, y]) => ['lava', x, y]),
  ...[[1385, 300], [1400, 340], [1505, 345], [1230, 372], [1460, 410], [1190, 425]].map(([x, y]) => ['embers', x, y]),
  // the Drowned Choir: mist over the fen
  ...[[90, 100], [330, 60], [70, 260], [260, 360], [450, 130], [180, 190], [400, 280], [520, 30]].map(([x, y]) => ['mist', x, y, { r: 70 }]),
  // the Seat of Augury: violet light round the spire, frost glittering
  ['sparkle', 1079, 80, { r: 60, col: 'violet', n: 3 }], ['pulse', 1079, 60, { col: 'violet' }], ['sparkle', 1000, 130, { r: 140, col: 'frost', n: 1 }],
  // the Glass Wastes: the crystals catching the light
  ...[[1236, 560], [1266, 620], [1196, 722], [1266, 782], [1096, 890], [1360, 640]].map(([x, y]) => ['sparkle', x, y, { r: 22, col: 'glass', n: 1 }]),
  // the seas: glints on the water; the cinder sea's red cracks
  ['glints', 1560, 600, { r: 150, col: 'sea' }], ['glints', 1600, 250, { r: 90, col: 'sea' }], ['glints', 200, 800, { r: 160, col: 'ember' }],
  // over everything
  ['clouds', 0, 0], ['crows', 640, 560, { r: 60 }], ['crows', 1300, 520, { r: 45 }],
];
const REGION_R1 = [
  // Ashfall Ward burning: fires in the town and its chimneys smoking; the burnt farm to the north-west
  ['fire', 265, 615], ['fire', 205, 650], ['fire', 390, 590], ['smoke', 300, 560, { big: 1 }], ['smoke', 420, 520, { big: 1 }], ['smoke', 230, 600], ['torch', 330, 640],
  ['fire', 172, 482], ['smoke', 172, 465], ['fire', 742, 240], ['smoke', 742, 220],
  // the Sump Lines: green steam out of the cutting, a lamp or two
  ['steam', 896, 345, { big: 1 }], ['steam', 960, 370], ['steam', 1010, 330], ['torch', 1030, 410, { col: 'green' }],
  // Saint Orsk's Spire in the sun: a glint off the spire's tip, its windows lit
  ['glint', 1328, 42], ['torch', 1300, 160], ['torch', 1360, 165], ['torch', 1240, 170],
  // the Bastion's gate: braziers either side
  ['torch', 1512, 352, { big: 1 }], ['torch', 1562, 352, { big: 1 }], ['smoke', 1537, 300],
  // the Ashflow and the old front: water glinting, a field gun's last smoke
  ...[[1060, 230], [1010, 300], [1120, 360], [1250, 395], [1160, 440], [1080, 500], [230, 790], [300, 840], [150, 770]].map(([x, y]) => ['glints', x, y, { r: 22, col: 'river' }]),
  ['smoke', 790, 740, { n: 1 }],
  // mist in the mountains and over the graveyard
  ...[[150, 150], [300, 260], [1486, 750], [1616, 600], [1216, 650], [1050, 40], [1640, 300]].map(([x, y]) => ['mist', x, y, { r: 60 }]),
  ['mist', 966, 650, { r: 30, faint: 1 }],
  // over everything: clouds' shadows, crows round the gallows
  ['clouds', 0, 0], ['crows', 850, 160, { r: 40 }], ['crows', 330, 520, { r: 55 }],
];
export const MAP_FX = { world: WORLD, r1: REGION_R1 };

// ---------- the effects ----------
const COL = {
  violet: ['#e0b8ff', '#b070ff', '#ffffff'], frost: ['#ffffff', '#cfe8ff'], glass: ['#ffffff', '#a8fff0', '#c8f0ff'], sea: ['#d8f0f0', '#9ad0d8'],
  ember: ['#ff9a4a', '#ffd070'], river: ['#e8f0f0', '#a8c8d0'], green: '#9aff8a',
};
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class MapFx {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.parts = []; this.list = []; this.on = false; this.t = 0;
    canvas.width = FX_W; canvas.height = FX_H;
  }
  start(key) {
    this.list = (MAP_FX[key] || []).map(([kind, x, y, o = {}]) => ({ kind, x: x / DOWN, y: y / DOWN, o, acc: Math.random() }));
    this.parts = []; this.clouds = null;
    if (!this.on) { this.on = true; this.last = performance.now(); const loop = (now) => { if (!this.on) return; this.step(Math.min(0.05, (now - this.last) / 1000)); this.last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }
  stop() { this.on = false; this.c.clearRect(0, 0, FX_W, FX_H); }

  // emitters put out particles; each kind its own rate
  step(dt) {
    this.t += dt;
    const c = this.c, t = this.t;
    c.clearRect(0, 0, FX_W, FX_H);
    for (const E of this.list) {
      const o = E.o, rate = { fire: 30, smoke: o.big ? 5 : 3, steam: o.big ? 6 : 3.5, embers: 4, mist: 0.35, sparkle: 1.2 * (o.n || 1), glints: 3, lava: 0, torch: 0, pulse: 0, glint: 0, clouds: 0, crows: 0 }[E.kind] ?? 0;
      E.acc += rate * dt;
      while (E.acc >= 1) { E.acc -= 1; this.emit(E); }
      // the steady ones, drawn straight from time
      if (E.kind === 'lava') { const f = 0.5 + 0.5 * Math.sin(t * 3 + E.x); c.fillStyle = `rgba(255,${120 + Math.floor(f * 80)},40,${0.4 + f * 0.4})`; c.fillRect(Math.round(E.x) - 2 * K, Math.round(E.y) - K, 4 * K, 3 * K - 1); c.fillStyle = `rgba(255,230,140,${0.5 + f * 0.5})`; c.fillRect(Math.round(E.x), Math.round(E.y), 1 + (f > 0.6 ? K : 0), 2); }
      if (E.kind === 'torch') { const f = Math.random(), s = o.big ? 3 : 2, g = o.col === 'green'; c.fillStyle = g ? 'rgba(150,255,140,0.22)' : 'rgba(255,160,60,0.24)'; c.fillRect(Math.round(E.x) - 4, Math.round(E.y) - 4, 8 + s, 8 + s); c.fillStyle = g ? `rgba(150,255,140,${0.7 + f * 0.3})` : `rgba(255,${150 + Math.floor(f * 90)},60,${0.8 + f * 0.2})`; c.fillRect(Math.round(E.x), Math.round(E.y) - (f > 0.7 ? 1 : 0), s, s + (f > 0.5 ? 1 : 0)); c.fillStyle = '#fff4c0'; c.fillRect(Math.round(E.x) + (s >> 1), Math.round(E.y) + 1, 1, 1); }
      if (E.kind === 'pulse') { const f = 0.5 + 0.5 * Math.sin(t * 2.2); c.fillStyle = `rgba(190,120,255,${0.18 + f * 0.25})`; for (let k = 0; k < 8; k++) { const w = 3 + k * 2 + Math.round(f * 3); c.fillRect(Math.round(E.x) - w, Math.round(E.y) - k * 3, w * 2, 2); } c.fillStyle = `rgba(255,240,255,${0.6 + f * 0.4})`; c.fillRect(Math.round(E.x), Math.round(E.y) - 6, 2, 4); }
      if (E.kind === 'glint') { const ph = (t * 0.6) % 3; if (ph < 0.5) { const k = Math.sin(ph / 0.5 * Math.PI); c.fillStyle = `rgba(255,248,210,${k})`; c.fillRect(Math.round(E.x), Math.round(E.y) - 4, 1, 9); c.fillRect(Math.round(E.x) - 4, Math.round(E.y), 9, 1); } }
      if (E.kind === 'crows') for (let k = 0; k < 3; k++) {
        const a = t * (0.5 + k * 0.13) + k * 2.1, r = (o.r || 40) / DOWN * (0.7 + k * 0.2), x = Math.round(E.x + Math.cos(a) * r), y = Math.round(E.y + Math.sin(a) * r * 0.45), flap = Math.sin(t * 9 + k) > 0;
        c.fillStyle = '#14100e'; c.fillRect(x - 1, y, 2, 2); c.fillRect(x - 3, y - (flap ? 2 : 0), 2, 1); c.fillRect(x + 1, y - (flap ? 2 : 0), 2, 1);
      }
    }
    // the particles
    const keep = [];
    for (const P of this.parts) {
      P.age += dt; if (P.age >= P.life) continue;
      P.x += P.vx * K * dt; P.y += P.vy * K * dt; P.vx += (P.ax || 0) * dt;
      const k = P.age / P.life, a = Math.min(1, P.a0 * 1.45) * (P.fadeIn ? Math.min(1, k * 4) : 1) * (1 - k), s = Math.max(1, Math.round((P.s0 + (P.s1 - P.s0) * k) * (P.s1 > 1 ? K : 1)));
      c.fillStyle = typeof P.col === 'function' ? P.col(k, a) : P.col.replace('A', a.toFixed(3));
      if (P.cross) { const x = Math.round(P.x), y = Math.round(P.y), L = k < 0.5 ? 3 : 2; c.fillRect(x - L, y, L * 2 + 1, 1); c.fillRect(x, y - L, 1, L * 2 + 1); }
      else if (s > 3) { c.beginPath(); c.arc(Math.round(P.x), Math.round(P.y), s / 2, 0, Math.PI * 2); c.fill(); } // (a puff of smoke or mist round, now there are pixels enough)
      else c.fillRect(Math.round(P.x - s / 2), Math.round(P.y - s / 2), s, s);
      keep.push(P);
    }
    this.parts = keep.length > 1400 ? keep.slice(-1400) : keep;
    // clouds last, over everything: white, thick but see-through, drifting across the map (the place names sit above)
    if (this.list.some((E) => E.kind === 'clouds')) {
      this.clouds ||= Array.from({ length: 6 }, (_, k) => this.cloud(FX_W * (k / 6) + rnd(-30, 30)));
      c.save();
      for (const C of this.clouds) {
        C.x += C.v * dt; if (C.x > FX_W) Object.assign(C, this.cloud(-C.img.width));
        c.globalAlpha = C.a; c.drawImage(C.img, Math.round(C.x), Math.round(C.y));
      }
      c.restore();
    }
  }

  // a cloud: a flat base with billows heaped on top, drawn once at full strength (so the overlaps don't stack), then
  // shaded: grey along the base, bright white where the light catches the tops
  cloud(x) {
    const w = Math.round(rnd(110, 190)), h = Math.round(w * rnd(0.42, 0.55)), cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d'), base = h * 0.86, puffs = [];
    for (let px = w * 0.1; px < w * 0.9; px += rnd(6, 10)) puffs.push([px, base - h * 0.12, h * rnd(0.1, 0.16)]); // (the base, a row of small ones)
    const n = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { // (the billows: biggest in the middle, smaller to the sides)
      const u = (i + rnd(0.2, 0.8)) / n, r = h * (0.16 + 0.24 * Math.sin(u * Math.PI)) * rnd(0.85, 1.15);
      puffs.push([w * (0.1 + 0.8 * u), base - r * rnd(0.7, 1), r]);
    }
    const blob = (dx, dy, k, col) => { g.fillStyle = col; g.beginPath(); for (const [px, py, r] of puffs) { const R = r * k; g.moveTo(px + dx + R, py + dy); g.arc(px + dx, py + dy, R, 0, Math.PI * 2); } g.fill(); };
    blob(0, 0, 1, '#aeb6c4'); // (the shade underneath)
    blob(-1, -2, 0.94, '#dfe4ec'); blob(-2, -4, 0.84, '#f6f8fc'); blob(-3, -6, 0.6, '#ffffff');
    g.clearRect(0, base, w, h - base); // (flat along the bottom)
    g.fillStyle = '#aeb6c4'; g.fillRect(w * 0.12, base - 2, w * 0.76, 2);
    // hard pixel edges: anything half there is in, the rest out
    const d = g.getImageData(0, 0, w, h); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; g.putImageData(d, 0, 0);
    return { img: cv, x, y: rnd(-h * 0.3, FX_H - h * 0.7), v: rnd(5, 10), a: rnd(0.62, 0.72) };
  }

  emit(E) {
    const o = E.o, add = (p) => this.parts.push({ age: 0, ax: 0, ...p });
    switch (E.kind) {
      case 'fire': add({ x: E.x + rnd(-3, 3), y: E.y + rnd(-0.5, 0.5), vx: rnd(-1, 1), vy: rnd(-7, -3), life: rnd(0.25, 0.6), s0: 2, s1: 1, a0: 1, col: (k) => (k < 0.3 ? 'rgba(255,240,170,1)' : k < 0.6 ? 'rgba(255,160,50,0.95)' : 'rgba(200,60,30,0.8)') }); break;
      case 'smoke': { const dark = o.dark; add({ x: E.x + rnd(-1, 1), y: E.y, vx: rnd(1, 3), vy: rnd(-5, -3), ax: 0.6, life: rnd(3.5, 6) * (o.big ? 1.3 : 1), s0: 1, s1: o.big ? 6 : 4, a0: dark ? 0.55 : 0.42, fadeIn: 1, col: dark ? 'rgba(26,22,22,A)' : 'rgba(70,66,64,A)' }); break; }
      case 'steam': add({ x: E.x + rnd(-2, 2), y: E.y, vx: rnd(0.5, 2.5), vy: rnd(-4, -2), ax: 0.4, life: rnd(3, 5), s0: 1, s1: o.big ? 4 : 3, a0: 0.34, fadeIn: 1, col: 'rgba(150,230,140,A)' }); break;
      case 'embers': add({ x: E.x + rnd(-3, 3), y: E.y, vx: rnd(-2, 2), vy: rnd(-9, -4), life: rnd(0.8, 1.6), s0: 1, s1: 1, a0: 1, col: pick(['rgba(255,190,80,A)', 'rgba(255,120,40,A)', 'rgba(255,230,150,A)']) }); break;
      case 'mist': { const r = (o.r || 60) / DOWN; add({ x: E.x + rnd(-r, r), y: E.y + rnd(-r * 0.5, r * 0.5), vx: rnd(0.8, 2), vy: rnd(-0.3, 0.3), life: rnd(7, 11), s0: 5, s1: o.faint ? 7 : 12, a0: o.faint ? 0.12 : 0.16, fadeIn: 1, col: 'rgba(220,226,228,A)' }); break; }
      case 'sparkle': { const r = (o.r || 30) / DOWN, cols = COL[o.col] || ['#ffffff'], col = pick(cols); add({ x: E.x + rnd(-r, r), y: E.y + rnd(-r, r), vx: 0, vy: o.col === 'violet' ? rnd(-3, -1) : 0, life: rnd(0.5, 1.1), s0: 1, s1: 1, a0: 1, cross: Math.random() < 0.5, col: hexA(col) }); break; }
      case 'glints': { const r = (o.r || 40) / DOWN, col = pick(COL[o.col] || ['#ffffff']); add({ x: E.x + rnd(-r, r), y: E.y + rnd(-r * 0.6, r * 0.6), vx: rnd(-0.5, 0.5), vy: 0, life: rnd(0.4, 0.9), s0: 1, s1: 1, a0: o.col === 'ember' ? 0.8 : 0.9, col: hexA(col) }); break; }
      default: break;
    }
  }
}
// '#rrggbb' as an 'rgba(r,g,b,A)' template
function hexA(h) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},A)`; }
