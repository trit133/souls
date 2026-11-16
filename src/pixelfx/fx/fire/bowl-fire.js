// The tongue, lick, flame-puff, smoke, ember and spark recipe is adapted from Sprite Fusion's open-source fire
// (https://www.spritefusion.com/pixel-art-vfx/fire), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit } from "../../core/index.js";
import { noiseFor, hotFirst, burn, looped, drift, spark, ember } from "./_lib.js";

export const meta = {
  name: "Bowl Fire",
  desc: "The brazier's fire on its own, for a bowl that's already there (the skill tree's paintings): roaring tongues, smoke, sparks and embers streaming up, no iron.",
  tags: ["fire", "brazier", "flame", "light", "sparks", "ambient", "loop"],
  size: [112, 148],
  origin: [56, 136],
  duration: 3,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    seed: 8,
    height: 32,
  },
};

const D = meta.duration, NL = noiseFor(D), RIM = -1;
// the fire: [x, y from the rim, height share, half-width, back row?]
const TONGUES = [
  [-7, -1.5, 0.5, 2.0, 1],
  [7.2, -1.5, 0.55, 2.0, 1],
  [-3, -2.5, 0.84, 2.2, 1],
  [3.3, -2.5, 0.86, 2.2, 1],
  [-11.5, 0.5, 0.2, 1.5, 0],
  [11.5, 0.5, 0.22, 1.5, 0],
  [-8.3, 0, 0.34, 2.0, 0],
  [8.5, 0, 0.38, 2.0, 0],
  [-4.7, -0.5, 0.6, 2.8, 0],
  [4.9, -0.5, 0.64, 2.8, 0],
  [0, -1, 1, 3.6, 0],
];


export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), S = o.seed;
  const SPARKS = [H[1], H[2], H[4], H[5]], EMB = [H[1], H[2], H[4], H[6]];
  burn(p, t, TONGUES, {
    H, D, NL, S, x: 0, y: RIM, height: o.height ?? 32, lean: 0.1, spread: 7,
    puffs: 8, licks: 4, smoke: 14, smokeSize: 3, smokeLife: [1.6, 2.4], embers: 10, glowR: 58, glow: 1.4, wind: 3,
  });
  // sparks streaming up in the draught: fast streaks that slow, wander and cool to embers high above
  looped(t, D, 60, S + 600, (r) => {
    const side = r.range(-1, 1);
    return { x: side * 8, y: RIM - r.range(4, 18), vx: side * r.range(10, 40), vy: -r.range(70, 150), life: r.range(0.7, 1.7), a: r.range(0, 6.3), w: r.range(1.8, 3.2), m: r.range(3, 8), big: r.chance(0.12) };
  }, (q, age) => {
    const [x, y, vx, vy] = drift(q.x, q.y, q.vx, q.vy, age, 0, -22, 1.9, 1.9), k = 1 - age / q.life;
    // they bend and wander as the draught slows them
    const wob = q.m * (Math.sin(age * q.w + q.a) - Math.sin(q.a)) * Math.min(1, age * 1.5), wv = q.m * q.w * Math.cos(age * q.w + q.a) * Math.min(1, age * 1.5);
    if (Math.hypot(vx + wv, vy) > 40) spark(p, x + wob, y, vx + wv, vy, k, SPARKS);
    else ember(p, x + wob, y, k, q.big ? 2 : 1, EMB, age * 40 + q.a);
  });
}
