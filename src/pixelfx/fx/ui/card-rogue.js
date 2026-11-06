import { fit, hex, mix, clamp, ease, seg, bump, burst, sparkle, WHITE } from "../../core/index.js";

export const meta = {
  name: "Card rogue",
  desc: "Two slit eyes swell out of a dark haze at the back of a card and blink, as two daggers slide in from the bottom corners and ring; then all of it dithers away.",
  tags: ["ui", "card", "hover", "eyes", "dagger", "shadow", "rogue"],
  size: [96, 44],
  origin: [0, 0],
  duration: 3.6,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    eyes: ["#16300f", "#3f8a1e", "#8fd04a", "#d8ff8a", "#ffffff"],
    steel: ["#1c2230", "#4a5468", "#9aa6ba", "#d0d8e6", "#ffffff"],
    grip: ["#1a0f0a", "#3b2216", "#6a421e"],
    guard: ["#5a3a10", "#c48412", "#ffe066"],
    haze: "#0a0610",
    w: 96,
    h: 44,
    seed: 4,
  },
};

const IN = 0.9, OUT0 = 2.7, OUT1 = 3.5; // fade in over IN, fade out between OUT0 and OUT1

// one eye: a pointed almond, its inner corner dipping (a scowl), a slit pupil, a lit rim; a: 0..1 alpha, s: scale
function eye(p, cx, cy, s, a, dir, blink, E) {
  const rx = 4.6 * s, ry = 1.9 * s * (1 - blink);
  if (rx < 0.6 || a <= 0) return;
  // dots, so the fades break it up in pixels: slit pupil, dark rim, lit upper iris
  for (let y = Math.floor(cy - 2.6 * s - 1); y <= cy + 2.6 * s + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy - u * dir * 0.9 * s) / Math.max(ry, 0.35), sh = Math.pow(Math.abs(u), 1.6) + v * v;
      if (sh <= 1) p.dot(x + 0.5, y + 0.5, Math.abs(u) < 0.12 && ry > 0.8 ? E[0] : sh > 0.62 ? E[1] : v < -0.1 ? E[3] : E[2], a);
    }
  p.glow(cx, cy, 6 + 7 * s, E[2], 0.45 * a);
  if (s > 0.7 && blink < 0.5) p.px(cx - dir * rx * 0.35, cy - ry * 0.4 + 0.5, WHITE); // a catchlight
}

// a dagger from its pommel (x, y) pointing along angle ang, length L; a: alpha, glint: 0..1 along the blade or -1
function dagger(p, x, y, ang, L, a, glint, S, G, D) {
  if (a <= 0) return;
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const at = (d, o) => [x + ux * d + nx * o, y + uy * d + ny * o];
  const dot = (d, o, c) => { const [px, py] = at(d, o); p.dot(px, py, c, a); };
  const grip = Math.max(3, L * 0.26), blade = L - grip - 1;
  dot(0, 0, D[2]); dot(0, 1, D[2]); dot(0, -1, D[1]); // pommel
  for (let d = 1; d < grip; d += 0.5) dot(d, 0, Math.floor(d) % 2 ? D[1] : D[2]); // wrapped grip
  for (let o = -2.5; o <= 2.5; o += 0.5) dot(grip, o, Math.abs(o) > 2 ? G[0] : G[1]); // crossguard
  dot(grip, -2.5, G[2]);
  for (let d = grip + 1; d <= grip + blade; d += 0.5) {
    const u = (d - grip) / blade, half = 1.4 * (1 - u * u);
    dot(d, -half, S[3]); // lit edge
    if (half > 0.6) dot(d, half, S[1]); // dark edge
    dot(d, 0, S[2]); // fuller
    if (glint >= 0 && Math.abs(u - glint) < 0.09) { dot(d, 0, WHITE); dot(d, -half, WHITE); }
  }
  const [tx, ty] = at(grip + blade, 0);
  if (glint >= 0) { const [gx, gy] = at(grip + 1 + blade * glint, 0); p.glow(gx, gy, 5, S[3], 0.5 * a); }
  return [tx, ty];
}

export function draw(p, t, o) {
  const W = o.w, H = o.h, E = fit(o.eyes, 5), S = fit(o.steel, 5), G = fit(o.guard, 3), D = fit(o.grip, 3), HZ = hex(o.haze);
  const fade = t < OUT0 ? ease.outQuad(seg(t, 0, IN)) : 1 - ease.inQuad(seg(t, OUT0, OUT1));
  if (fade <= 0) return;
  const cx = W / 2, cy = H * (H > 30 ? 0.42 : 0.45), sc = clamp(H / 44, 0.45, 1.1);

  // the haze they come out of: a dark pool behind, swelling with the fade, and wisps curling off it
  const R0 = Math.min(H * 0.48, (10 + 12 * fade) * sc * 1.3);
  p.disc(cx, cy, R0, HZ, 0.3 * fade);
  p.disc(cx, cy, R0 * 0.7, HZ, 0.3 * fade);
  burst(6, o.seed + 9, (r) => {
    const a0 = r.range(0, 6.3), d = (6 + 10 * fade) * sc + r.range(0, 6) + t * 4, s = r.range(3, 6) * sc;
    const wx = clamp(cx + Math.cos(a0 + t * 0.4) * d * 1.6, s, W - s), wy = clamp(cy + Math.sin(a0 + t * 0.4) * d * 0.6, s, H - s);
    p.disc(wx, wy, s, HZ, 0.22 * fade);
  });

  // the eyes: they start small and far, and swell forward; one blink in the middle
  const grow = ease.outQuart(seg(t, 0.05, 1.1)), es = (0.45 + 0.95 * grow) * sc;
  const blink = bump(t, 1.75, 1.95) > 0.4 ? 1 : 0;
  const sep = (5 + 7.5 * grow) * sc * 1.15;
  eye(p, cx - sep, cy, es, fade, 1, blink, E);
  eye(p, cx + sep, cy, es, fade, -1, blink, E);

  // the daggers: from the bottom corners in, points angled up at the eyes, settling with a little overshoot
  const L = clamp(H * 0.62, 11, 26), slide = ease.outBack(seg(t, 0.2, 0.75), 1.4);
  const pull = 1 - fade; // they slip back out as everything fades
  const glint = t > 0.95 && t < 1.5 ? seg(t, 0.95, 1.5) : -1;
  for (const side of [-1, 1]) {
    const ang = side < 0 ? -0.62 : Math.PI + 0.62;
    const restX = side < 0 ? W * 0.06 : W * 0.94, restY = H - 2;
    const off = (1 - slide + pull * 0.6) * (L + 8);
    const px = restX - Math.cos(ang) * off, py = restY - Math.sin(ang) * off;
    const tip = dagger(p, px, py, ang, L, fade, glint, S, G, D);
    // a ring of steel the moment each one lands
    const ring = bump(t, 0.6, 0.95);
    if (tip && ring > 0) sparkle(p, tip[0], tip[1], Math.round(2 * ring + 0.4), S[3], S[2], 0.45 * ring);
  }

  // motes drifting up through the haze
  burst(8, o.seed + 30, (r) => {
    const x = cx + r.range(-1, 1) * W * 0.35, y = cy + H * 0.4 - ((t * r.range(5, 11) + r.range(0, H)) % (H * 0.9));
    p.dot(x, y, r.chance(0.5) ? E[1] : E[2], 0.5 * fade);
  });
}
