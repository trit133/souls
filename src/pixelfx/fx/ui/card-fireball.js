import { fit, hex, mix, clamp, ease, seg, bump, burst, stream, flare, sparkle, resolveOptions, WHITE, TAU } from "../../core/index.js";
import * as fireball from "../fire/fireball.js";
import { ember, spark } from "../fire/_lib.js";

export const meta = {
  name: "Card fireball",
  desc: "A staff swings in from a card's left edge, gathers violet light into its crystal, kicks back and hurls a huge fireball across the card and out the far side, leaving embers.",
  tags: ["ui", "card", "hover", "fireball", "staff", "magic", "mage"],
  size: [96, 44],
  origin: [0, 0],
  duration: 2.6,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    arcane: ["#2b1252", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff"],
    wood: ["#160c06", "#3a2412", "#6a421e", "#a0703a"],
    w: 96,
    h: 44,
    seed: 6,
  },
};

const IN = 0.35, FIRE = 0.95, FLY = 0.75, OUT0 = 1.75, OUT1 = 2.15;

export function draw(p, t, o) {
  const W = o.w, H = o.h, A = fit(o.arcane, 5), WD = fit(o.wood, 4), F = fit(o.palette, 9), HOT = [...F].reverse();
  const sc = clamp(H / 44, 0.45, 1.1);
  // the staff leans in from the bottom-left; its crystal rests here
  const tipX = W * 0.17, tipY = H * 0.46, ang = -0.42, ux = Math.cos(ang), uy = Math.sin(ang);
  const len = H * 1.25;
  const slideIn = ease.outBack(seg(t, 0, IN), 1.2), slideOut = ease.inCubic(seg(t, OUT0, OUT1));
  const kick = t > FIRE ? 3.5 * sc * Math.exp(-(t - FIRE) * 14) * (t < FIRE + 0.6 ? 1 : 0) : 0;
  const back = (1 - slideIn) * (len * 0.6 + 10) + slideOut * (len * 0.6 + 14) + kick;
  const cx = tipX - ux * back, cy = tipY - uy * back; // the crystal

  // charge: violet streaks pulled into the crystal, a spinning ring of rune dots, light swelling
  const charge = seg(t, IN * 0.8, FIRE);
  if (t > IN * 0.8 && t < FIRE) {
    stream(t, IN * 0.8, FIRE - 0.05, 40, o.seed, 0.22, (age, life, r) => {
      const a = r.range(0, TAU), d0 = r.range(10, 18) * sc, u = age / life, d = d0 * (1 - ease.inQuad(u));
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8, L = 2 + 3 * u;
      p.line(x, y, x - Math.cos(a) * L, y - Math.sin(a) * L * 0.8, u > 0.6 ? A[4] : A[3]);
    });
    const R = (5 + 2 * charge) * sc, n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 6;
      p.dot(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.75, i % 2 ? A[3] : A[4], 0.4 + 0.6 * charge);
    }
    p.glow(cx, cy, 10 + 10 * charge, A[2], 0.25 + 0.35 * charge);
  }

  // the staff: a shaft with iron bands, and a crook curling round the crystal
  if (slideOut < 1) {
    for (let d = 2; d < len; d += 0.5) {
      const x = cx - ux * d, y = cy - uy * d, band = Math.floor(d / (6 * sc)) % 4 === 0 && d > 6;
      // three px thick: lit top, the grain, a dark underside; violet-iron bands
      p.px(x + uy * 1, y - ux * 1, band ? A[3] : WD[3]);
      p.px(x, y, band ? A[1] : WD[2]);
      p.px(x - uy * 1, y + ux * 1, band ? A[0] : WD[1]);
    }
    const hook = 4.4 * sc;
    for (let a = 0.5; a < 4.4; a += 0.15) {
      const hx = cx + Math.cos(a + ang) * hook, hy = cy + Math.sin(a + ang) * hook;
      p.px(hx, hy, a < 1.6 ? WD[3] : WD[2]);
      p.px(hx + Math.cos(a + ang), hy + Math.sin(a + ang), WD[1]);
    }
    // the crystal: a little violet diamond, white-hot as it fires
    const hot = bump(t, FIRE - 0.05, FIRE + 0.2);
    const cs = Math.max(1.5, 2.2 * sc);
    for (let y = -cs * 1.5; y <= cs * 1.5; y++)
      for (let x = -cs; x <= cs; x++) {
        if (Math.abs(x) / cs + Math.abs(y) / (cs * 1.5) > 1) continue;
        p.px(cx + x, cy + y, hot > 0.5 ? WHITE : x < 0 && y < 0 ? A[4] : x > 0 && y > 0 ? A[1] : A[3]);
      }
    p.glow(cx, cy, 8, A[3], 0.25 + 0.5 * hot);
  }

  // release: a flare at the crystal and a flash over the whole card
  const rel = bump(t, FIRE - 0.02, FIRE + 0.22);
  if (rel > 0) {
    flare(p, tipX + 2, tipY, Math.min(14, H * 0.4) * rel, 0.7 * rel, ["#6b2cc0", "#ff8a2a", "#ffe26b", "#ffffff"]);
    p.glow(W * 0.4, H * 0.5, W * 0.6, HOT[3], 0.18 * rel);
  }

  // the fireball: the library's own, flown across the card and out the right side
  const ft = t - FIRE;
  const V = (W * 1.2 + 30) / FLY, hx = tipX + 4 + ft * V, hy = tipY - Math.sin(clamp(ft / FLY) * Math.PI) * H * 0.06;
  if (ft >= 0 && hx < W + 60) {
    const fo = resolveOptions(fireball.meta, { palette: o.palette, radius: clamp(H * 0.15, 3, 7), speed: V * 0.5, seed: o.seed });
    const { tx, ty, fx, cs, sn } = p;
    p.place(tx + hx, ty + hy);
    fireball.draw(p, (ft + 0.6) % fireball.meta.duration, fo);
    Object.assign(p, { tx, ty, fx, cs, sn });
  }

  // embers left smouldering along its path, drifting up and cooling
  burst(Math.round(W / 6), o.seed + 40, (r, i) => {
    const x = tipX + 6 + (i / (W / 6)) * (W - tipX - 6) + r.range(-2, 2), t0 = FIRE + (x - tipX - 4) / V, life = r.range(0.5, 1.1), age = t - t0;
    if (age < 0 || age > life) return;
    const k = 1 - age / life;
    ember(p, x + Math.sin(age * 4 + i) * 2, tipY + r.range(-2, 3) * sc - age * r.range(8, 16), k, r.chance(0.2) ? 2 : 1, [HOT[1], HOT[2], HOT[4], HOT[6]], age * 30 + i);
  });

  // it bursts out through the right edge: a spray of sparks there and a hot glow
  const tx0 = FIRE + (W - tipX - 4) / V, out = bump(t, tx0, tx0 + 0.35);
  if (out > 0) {
    p.glow(W - 1, tipY, H * 0.5, HOT[2], 0.35 * out);
    burst(10, o.seed + 70, (r) => {
      const age = t - tx0 - r.range(0, 0.06), life = r.range(0.2, 0.4);
      if (age < 0 || age > life) return;
      const a = r.range(2.2, 4.1), sp = r.range(40, 90);
      spark(p, W - 2 + Math.cos(a) * sp * age, tipY + Math.sin(a) * sp * age + 120 * age * age, Math.cos(a) * sp, Math.sin(a) * sp, 1 - age / life, [HOT[1], HOT[2], HOT[4], HOT[5]]);
    });
  }
}
