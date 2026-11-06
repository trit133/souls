// A burning title logo. The flames on each letter use the fire library (fire/_lib.js), whose tongue, lick, puff,
// smoke and ember recipes are adapted from Sprite Fusion's open-source fire, MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, hex, mix, clamp, TAU, WHITE, FONTS } from "../../core/index.js";
import { noiseFor, hotFirst, burn } from "../fire/_lib.js";

export const meta = {
  name: "Fire title",
  desc: "A title in chunky bevelled pixel capitals, extruded deep, turning in 3D with real perspective as a wave bobs through it; every letter burns, and a shine sweeps across.",
  tags: ["ui", "title", "logo", "text", "fire", "3d", "loop"],
  size: [300, 146],
  origin: [150, 116],
  duration: 6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    text: "ASHEN VIGIL",
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    side: ["#1c0806", "#3a120a", "#5e1c0c", "#87300f", "#b04a16"],
    outline: "#0c0403",
    scale: 4,
    depth: 10,
    turn: 0.46,
    flames: 1,
    seed: 3,
  },
};

const D = meta.duration, NL = noiseFor(D), K = 250; // K: camera distance in px, for perspective

// the text as a bitmap in logo pixels (font pixels x scale), with each column's letter index
function layout(text, s) {
  const F = FONTS.big, cols = [];
  let x = 0;
  const letters = [];
  for (const ch of text) {
    const g = F.glyphs[ch] ?? F.glyphs[ch.toUpperCase()];
    if (!g) { x += F.space + F.gap; continue; }
    // the runs of ink along the glyph's top row: two or more (H, N, V), or a single 1 px one (L), are points
    // that each get a small flame; a solid top edge gets one fire across it
    const runs = [];
    g.rows[0].forEach((v, c) => { if (v && !g.rows[0][c - 1]) runs.push([c, c + 1]); else if (v) runs[runs.length - 1][1] = c + 1; });
    const pointed = runs.length > 1 || (runs.length === 1 && runs[0][1] - runs[0][0] === 1 && g.w > 1);
    letters.push({ x0: x * s, x1: (x + g.w) * s, points: pointed ? runs.map(([a, b]) => ((x + (a + b) / 2) * s)) : null });
    for (let c = 0; c < g.w; c++) cols[x + c] = { rows: g.rows.map((r) => r[c]), i: letters.length - 1 };
    x += g.w + F.gap;
  }
  const w = (x - F.gap) * s, h = F.h * s;
  const owner = new Int16Array(w).fill(-1), ink = new Uint8Array(w * h);
  for (let fx = 0; fx < cols.length; fx++) {
    const col = cols[fx];
    if (!col) continue;
    for (let sx = 0; sx < s; sx++) {
      owner[fx * s + sx] = col.i;
      for (let fy = 0; fy < F.h; fy++) if (col.rows[fy]) for (let sy = 0; sy < s; sy++) ink[(fy * s + sy) * w + fx * s + sx] = 1;
    }
  }
  return { w, h, owner, ink, letters };
}
const cache = new Map();
const logoFor = (text, s) => cache.get(text + s) ?? cache.set(text + s, layout(text, s)).get(text + s);

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), SIDE = fit(o.side, 5), OUT = hex(o.outline), s = o.scale | 0, DEP = o.depth | 0;
  const L = logoFor(o.text, s), W = L.w, Hh = L.h, ph = (t / D) * TAU;
  // the turn: the logo yaws one way and back over the loop, and nods a little
  const yaw = o.turn * Math.sin(ph), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const nod = 0.62 + 0.16 * Math.sin(ph * 2 + 1); // how far the extrusion drops below the face, per layer
  // the wave: each letter bobs in turn, twice per loop
  const bob = L.letters.map((_, i) => Math.round(3.4 * Math.sin(ph * 2 - i * 0.62)));
  const lift = L.letters.map((_, i) => Math.max(0, Math.sin(ph * 2 - i * 0.62))); // 1 at the top of the bob
  // a shine band crossing the face once per loop
  const shineX = ((t / D) * 1.6 - 0.3) * (W + Hh);

  // logo space (0..W, 0..Hh, top-left of the face) <-> screen: centred on x = 0, letters' foot on y = 0
  const proj = (X, Y) => { const xc = X - W / 2, z = 1 + (xc * sy) / K; return [(xc * cy) / z, (Y - Hh) / z]; };
  // flames behind the letters: a fire standing on each letter's top edge, or a smaller one on each point
  if (o.flames > 0) {
    L.letters.forEach((le, i) => {
      const tall = 0.75 + 0.35 * lift[i];
      if (le.points) {
        le.points.forEach((px, k) => {
          const [x, y] = proj(px, bob[i]);
          burn(p, t, [[-1.2, 3, 0.7 * tall, 1.6, 1], [0, 3, tall, 2, 0]], {
            H, D, NL, S: o.seed * 31 + i * 7 + k * 101, x, y, height: 14 * o.flames, lean: 0.14, spread: 3,
            puffs: 2, licks: 2, smoke: 0.5, smokeSize: 2.4, smokeLife: [1, 1.6], embers: 0.8, glow: 0.18, glowR: 16, wind: 2.5,
          });
        });
        return;
      }
      const mid = (le.x0 + le.x1) / 2, [x, y] = proj(mid, bob[i]);
      const half = ((le.x1 - le.x0) / 2) * cy;
      burn(p, t, [[-half * 0.55, 3, 0.62 * tall, 2.6, 1], [half * 0.6, 3, 0.7 * tall, 2.6, 1], [0, 3, tall, 3.3, 0]], {
        H, D, NL, S: o.seed * 31 + i * 7, x, y, height: 20 * o.flames, lean: 0.14, spread: half,
        puffs: 3, licks: 2.5, smoke: 0.8, smokeSize: 3.2, smokeLife: [1.2, 2], embers: 1.4, glow: 0.3, glowR: 26, wind: 2.5,
      });
    });
  }

  // the letters: ray-step from each screen pixel into the extrusion so the turn and perspective stay crisp
  // each pixel is traced once into a buffer; the rim and shading read the buffer. Where a column lands in the
  // logo depends only on the column and the layer, so that's worked out per column, not per pixel
  const gx0 = Math.floor(-W * 0.62), gx1 = Math.ceil(W * 0.62), gy0 = Math.floor(-Hh - 8), gy1 = Math.ceil(DEP * 1.4 + 6);
  const BW = gx1 - gx0, BH = gy1 - gy0, NDL = DEP + 1;
  const colX = new Int32Array(BW * NDL), colZ = new Float32Array(BW * NDL);
  for (let i = 0; i < BW; i++) for (let d = 0; d < NDL; d++) {
    const sx = gx0 + i + 0.5 + d * sy * 1.5, X = (sx / (1 - (sx * sy) / (K * cy))) / cy + W / 2, Xf = Math.floor(X);
    colX[i * NDL + d] = Xf >= 0 && Xf < W && L.owner[Xf] >= 0 ? Xf : -1;
    colZ[i * NDL + d] = 1 + ((X - W / 2) * sy) / K;
  }
  const bd = new Int8Array(BW * BH).fill(-1), bx = new Int16Array(BW * BH), byy = new Int16Array(BW * BH);
  for (let j = 0; j < BH; j++) {
    const y = gy0 + j + 0.5;
    for (let i = 0; i < BW; i++) {
      for (let d = 0; d < NDL; d++) {
        const X = colX[i * NDL + d];
        if (X < 0) continue;
        const Y = Math.floor((y - d * nod) * colZ[i * NDL + d] + Hh - bob[L.owner[X]]);
        if (Y >= 0 && Y < Hh && L.ink[Y * W + X]) { const k = j * BW + i; bd[k] = d; bx[k] = X; byy[k] = Y; break; }
      }
    }
  }
  const at = (x, y) => {
    const i = Math.floor(x - gx0), j = Math.floor(y - gy0);
    if (i < 0 || j < 0 || i >= BW || j >= BH) return null;
    const k = j * BW + i;
    return bd[k] < 0 ? null : { d: bd[k], X: bx[k] + 0.5, Y: byy[k] + 0.5, i: L.owner[bx[k]] };
  };
  p.shade(gx0, gy0, gx1, gy1, (x, y, out) => {
    const h = at(x, y);
    if (!h) {
      // a dark rim round the whole silhouette
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) return OUT;
      return;
    }
    if (h.d > 0) {
      // the sides: lit warm near the face, falling to near-black at the back; firelight catches the top step
      const k = 1 - h.d / (DEP + 1);
      return SIDE[clamp(Math.round(k * 4 + (h.d === 1 ? 0.6 : 0)), 0, 4)];
    }
    // the face: hot at the top cooling to ember at the foot, flickering with the fire; each stroke lit on its
    // top-left edge and shaded on its bottom-right, so the letters read as solid bevelled bars
    const inkL = (dx, dy) => { const X = Math.floor(h.X) + dx, Y = Math.floor(h.Y) + dy; return X >= 0 && X < W && Y >= 0 && Y < Hh && L.owner[X] === h.i && L.ink[Y * W + X]; };
    const row = Math.floor(h.Y / s); // 0..6 font rows
    const fl = NL(t, 5, o.seed + h.i * 3) * 0.6;
    let k = 1.4 + row * 0.6 - fl - lift[h.i] * 0.6;
    if (!inkL(0, -1) || !inkL(-1, 0)) k -= 1.3;
    else if (!inkL(0, 1) || !inkL(1, 0)) k += 1.1;
    let c = H[clamp(Math.round(k), 1, 7)];
    const sh = Math.abs(h.X + h.Y * 0.6 - shineX);
    if (sh < 2.5) c = mix(c, WHITE, sh < 1.2 ? 0.75 : 0.4);
    out.k = 0.08;
    return c;
  });

  // warm light pooled round the whole logo
  p.glow(0, -Hh * 0.6, W * 0.42, mix(H[4], H[3], 0.5), 0.12);
}
