import { fit, hex, mix, clamp, ease, seg, bump, burst, sparkle, flare, WHITE } from "../../core/index.js";

export const meta = {
  name: "Card glimmer",
  desc: "A slanted band of silver light sweeps a card; its frame lights up as the band passes, star glints pop in its wake, and a flare winks in the far corner.",
  tags: ["ui", "card", "hover", "shine", "glint", "steel", "knight"],
  size: [96, 44],
  origin: [0, 0],
  duration: 1.3,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#2a3448", "#4a5d80", "#7d95bd", "#a9bcd8", "#dbe6f7", "#ffffff"],
    gold: "#ffe2a0",
    w: 96,
    h: 44,
    seed: 2,
  },
};

const SWEEP = 0.75; // the band crosses the card in this long

export function draw(p, t, o) {
  const C = fit(o.palette, 6), W = o.w, H = o.h, gold = mix(C[4], hex(o.gold), 0.6);
  const slant = 0.55; // the band leans: x shifts this much per px of height
  // where the band's centre crosses y = 0 at time t: from off the left to off the right, fast in, easing out
  const bx = (tt) => -H * slant - 6 + ease.inOutCubic(seg(tt, 0, SWEEP)) * (W + H * slant + 12);
  const k = bump(t, 0, SWEEP + 0.15);

  // the band: a white-hot core over the card, gold-silver flanks, and light round it
  if (k > 0) {
    const b = bx(t);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.abs(x + 0.5 - (b + (H - y) * slant));
        if (d > 7) continue;
        if (d < 1.5) p.blend(x + 0.5, y + 0.5, WHITE, 0.55 * k);
        else if (d < 3.5) p.blend(x + 0.5, y + 0.5, gold, 0.28 * k);
        p.light(x + 0.5, y + 0.5, d < 3.5 ? C[4] : C[3], k * (d < 1.5 ? 0.5 : d < 3.5 ? 0.3 : 0.1));
      }
    }
  }

  // the frame: each edge pixel catches the light the moment the band crosses it, then cools
  const span = W + H * slant + 12;
  const crossAt = (x, y) => {
    const q = clamp((x - (H - y) * slant + H * slant + 6) / span); // how far across the sweep this pixel sits
    const u = q < 0.5 ? Math.cbrt(q / 4) : 1 - Math.cbrt(2 - 2 * q) / 2; // undo the inOutCubic
    return u * SWEEP;
  };
  const edge = (x, y) => {
    const a = t - crossAt(x, y);
    if (a < -0.02 || a > 0.32) return;
    const e = 1 - Math.max(0, a) / 0.32;
    if (e > 0.75) p.px(x, y, e > 0.92 ? WHITE : gold);
    else p.dot(x, y, e > 0.4 ? gold : C[3], 0.35 + e);
    p.light(x + 0.5, y + 0.5, C[4], 0.35 * e);
  };
  for (let x = 0; x < W; x++) { edge(x, 0); edge(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { edge(0, y); edge(W - 1, y); }

  // glints popping in the band's wake: each waits for the band to pass, then grows and shrinks
  burst(Math.max(3, Math.round(W / 16)), o.seed, (r, i) => {
    const y = r.range(H * 0.15, H * 0.85), x = r.range(W * 0.08, W * 0.92);
    const pass = clamp(((x - (H - y) * slant + H * slant + 6) / (W + H * slant + 12)), 0, 1);
    const t0 = pass * SWEEP * 0.85 + r.range(0.02, 0.1), life = r.range(0.28, 0.42), u = (t - t0) / life;
    if (u <= 0 || u >= 1) return;
    const arm = Math.round((H > 30 ? 3 : 2) * Math.sin(Math.PI * u) + 0.4);
    sparkle(p, x, y, arm, i % 2 ? gold : C[4], C[3], 0.35);
  });

  // a flare winks in the far corner as the band leaves
  const f = bump(t, SWEEP * 0.8, SWEEP + 0.45);
  const FL = Math.min(H * 0.3, 8);
  if (f > 0) flare(p, W - 2 - FL, H - 2 - FL, FL * f, 0.6 * f, ["#4a5d80", "#a9bcd8", "#ffe2a0", "#ffffff"]);
}
