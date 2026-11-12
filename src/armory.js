// The Last Crusade's armoury: every outfit piece built new (playerkits.js puts these in place of its old builders).
// Same slots, same ids (owned pieces carry over), same weapon lengths; four colour channels each: M.main (the big
// surfaces), M.trim (edges, bands, rims, tabards), M.detail (straps, hoses, leather, under-layers) and M.glow
// (visors, lenses, cores, lit edges). Purely visual.
// Body (models.js, bulk b): torso T from y 0 (hips) to 0.68, chest front z ≈ 0.135·b, shoulders at x ±0.27·b,
// y ≈ 0.6; head H at the neck, skull y 0.04..0.34, face front z ≈ 0.145; shins hang from the knee to y −0.47.
import * as THREE from 'three';
import { box, cyl, cone, rbox, pivot } from './mesh.js';
import { strip, plate, CLOTH, RIBBON, HEAVY_CLOTH } from './kits.js';

const PI = Math.PI;
const B = (p, w, h, d, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const k = rbox(w, h, d, m, x, y, z, rx, ry, rz); p.add(k); return k; };
const C = (p, rt, rb, h, m, x, y, z, rx = 0, ry = 0, rz = 0, seg = 8) => { const k = cyl(rt, rb, h, m, seg); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); p.add(k); return k; };
const K = (p, r, h, m, x, y, z, rx = 0, ry = 0, rz = 0, seg = 4) => { const k = cone(r, h, m, seg); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); p.add(k); return k; };
const ring = (p, R, t, m, x, y, z, rx = 0, ry = 0, seg = 14) => { const k = new THREE.Mesh(new THREE.TorusGeometry(R, t, 4, seg), m); k.position.set(x, y, z); k.rotation.set(rx, ry, 0); p.add(k); return k; };
const fore = (r, L) => r.j[L ? 'foreL' : 'foreR'], hand = (r, L) => r.j[L ? 'handL' : 'handR'], shin = (r, L) => r.j[L ? 'shinL' : 'shinR'];

// ======================= TEMPLAR =======================
export const KNIGHT_ARMORY = {
  helmet: {
    // Crusader Bascinet: a tall pointed skull, a pig-snout vox visor drilled with breathing holes, a burning eye
    // slit, a brass brow band, a cabled gorget
    great(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.28, 0.32, 0.3, M.main, 0, 0.2, -0.005);
      K(H, 0.2, 0.22, M.main, 0, 0.46, -0.01, 0, PI / 4);
      B(H, 0.3, 0.035, 0.31, M.trim, 0, 0.3, -0.005);
      B(H, 0.18, 0.025, 0.02, M.glow, 0, 0.245, 0.152);
      B(H, 0.19, 0.15, 0.13, M.main, 0, 0.14, 0.16, 0.25);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) B(H, 0.025, 0.025, 0.02, M.detail, -0.05 + k * 0.05, 0.1 + i * 0.035, 0.225, 0.25);
      B(H, 0.34, 0.07, 0.34, M.detail, 0, 0.06, 0); B(H, 0.35, 0.025, 0.35, M.trim, 0, 0.1, 0);
      for (const s of [1, -1]) B(H, 0.035, 0.035, 0.24, M.detail, s * 0.12, 0.09, 0.02, 0.5, s * 0.3);
    },
    // Flat-top Sallet: a squat helm under a flat brim that sweeps out into a tail, a full-width lit visor band, a
    // rebreather jaw with twin filter canisters
    barbute(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.27, 0.25, 0.29, M.main, 0, 0.19, 0);
      B(H, 0.34, 0.04, 0.42, M.trim, 0, 0.33, -0.04); B(H, 0.3, 0.06, 0.12, M.main, 0, 0.28, -0.2, -0.35);
      B(H, 0.28, 0.08, 0.03, M.detail, 0, 0.22, 0.148); B(H, 0.25, 0.03, 0.02, M.glow, 0, 0.22, 0.16);
      B(H, 0.2, 0.11, 0.1, M.detail, 0, 0.08, 0.13);
      for (const s of [1, -1]) { C(H, 0.04, 0.04, 0.1, M.trim, s * 0.12, 0.07, 0.15, PI / 2); C(H, 0.03, 0.03, 0.02, M.glow, s * 0.12, 0.07, 0.2, PI / 2); }
      for (const s of [1, -1]) B(H, 0.03, 0.09, 0.09, M.trim, s * 0.145, 0.19, 0);
    },
    // Seraph Helm: a smooth sculpted face-mask, three swept vanes either side with lit tips, a halo emitter ring
    winged(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.25, 0.3, 0.28, M.main, 0, 0.19, -0.01);
      B(H, 0.18, 0.22, 0.04, M.trim, 0, 0.18, 0.148); B(H, 0.07, 0.02, 0.02, M.glow, -0.04, 0.22, 0.172); B(H, 0.07, 0.02, 0.02, M.glow, 0.04, 0.22, 0.172);
      B(H, 0.03, 0.12, 0.02, M.detail, 0, 0.12, 0.17);
      for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
        const v = pivot(H, s * 0.13, 0.26 - i * 0.05, 0.02, 0, -s * 0.2, -s * (0.9 + i * 0.25));
        B(v, 0.025, 0.32 - i * 0.06, 0.1, M.trim, 0, (0.32 - i * 0.06) / 2, -0.06, -0.6);
        B(v, 0.03, 0.05, 0.1, M.glow, 0, 0.3 - i * 0.06, -0.24 + i * 0.03, -0.6);
      }
      const hp = pivot(H, 0, 0.3, -0.2); ring(hp, 0.24, 0.02, M.glow, 0, 0, 0, 0, 0, 20);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2; B(hp, 0.05, 0.05, 0.03, M.trim, Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0); }
      r.spinners.push({ obj: hp, axis: 'z', speed: 0.5 });
    },
    // Archon Crown-Helm: a skull-faced visor with burning sockets, a tall crown of eight blades on a ring, a mail
    // aventail
    crowned(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.27, 0.3, 0.29, M.main, 0, 0.19, 0);
      B(H, 0.2, 0.2, 0.04, M.trim, 0, 0.18, 0.15); B(H, 0.14, 0.05, 0.04, M.trim, 0, 0.07, 0.152);
      for (const s of [1, -1]) { B(H, 0.06, 0.05, 0.02, M.detail, s * 0.05, 0.22, 0.172); B(H, 0.035, 0.03, 0.02, M.glow, s * 0.05, 0.22, 0.18); }
      for (let i = 0; i < 3; i++) B(H, 0.02, 0.04, 0.02, M.detail, -0.03 + i * 0.03, 0.08, 0.175);
      const cr = pivot(H, 0, 0.36, 0); ring(cr, 0.16, 0.025, M.trim, 0, 0, 0, PI / 2, 0, 16);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2; K(cr, 0.03, k % 2 ? 0.14 : 0.24, M.trim, Math.cos(a) * 0.16, k % 2 ? 0.07 : 0.12, Math.sin(a) * 0.16, 0, 0, 0); }
      B(cr, 0.05, 0.05, 0.04, M.glow, 0, 0.03, 0.17);
      for (let k = 0; k < 6; k++) strip(r, H, -0.13 + k * 0.052, 0.06, -0.1, 0.05, [0.1, 0.06], M.detail, { lx: [-0.4, 0.6], th: 0.02 });
    },
  },
  pauldron: {
    // Riot Slabs: three flat slabs stacked down the shoulder, each edged, a strap under them
    segmented(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.32);
      B(pv, 0.26 * b, 0.07, 0.32 * b, M.main, s * 0.02, 0.02, 0); B(pv, 0.27 * b, 0.02, 0.33 * b, M.trim, s * 0.02, 0.06, 0);
      for (let i = 0; i < 2; i++) plate(r, pv, s * (0.04 + i * 0.02), -0.03 - i * 0.07, 0, (0.25 - i * 0.02) * b, 0.07, (0.31 - i * 0.02) * b, M.main, { edge: M.trim });
      B(pv, 0.04, 0.2, 0.06, M.detail, -s * 0.06, -0.06, 0.12);
      B(pv, 0.05, 0.03, 0.02, M.glow, s * 0.1, 0.035, 0.165);
    },
    // Hook Plates: an angular wedge with two hooked spikes curling up and back, rivet rows, a lit vent
    spiked(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.7, 0, 0, 0, -s * 0.2);
      B(pv, 0.24 * b, 0.12, 0.3 * b, M.main, s * 0.02, 0, 0, 0, 0, s * 0.25);
      B(pv, 0.2 * b, 0.05, 0.31 * b, M.main, s * 0.08, -0.08, 0, 0, 0, s * 0.5);
      for (const z of [-0.07, 0.07]) { const h = pivot(pv, s * 0.06, 0.06, z, 0, 0, -s * 0.3); B(h, 0.04, 0.16, 0.04, M.trim, 0, 0.08, 0); B(h, 0.04, 0.08, 0.04, M.trim, -s * 0.03, 0.17, -0.02, -0.4, 0, s * 0.9); }
      for (let i = 0; i < 4; i++) B(pv, 0.02, 0.02, 0.02, M.detail, s * 0.12, -0.02, -0.11 + i * 0.075);
      B(pv, 0.06, 0.02, 0.1, M.glow, s * 0.13, 0.02, 0, 0, 0, s * 0.25);
    },
    // Lion-Skull: a lion's skull of iron with a jaw, burning eyes and a mane of cables that swings
    lion(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.7, 0, 0, 0, -s * 0.25);
      B(pv, 0.24 * b, 0.1, 0.3 * b, M.main, s * 0.02, 0, 0);
      const sk = pivot(pv, s * 0.06, 0.06, 0.1); B(sk, 0.15, 0.13, 0.14, M.trim, 0, 0, 0); B(sk, 0.11, 0.05, 0.08, M.trim, 0, -0.05, 0.08);
      for (const x of [-0.035, 0.035]) B(sk, 0.03, 0.025, 0.02, M.glow, x, 0.02, 0.075);
      for (const x of [-0.04, 0.04]) K(sk, 0.012, 0.05, M.detail, x, -0.08, 0.1, PI, 0, 0, 3);
      for (const z of [-0.1, -0.03, 0.04]) strip(r, pv, s * 0.12, 0.06, z, 0.03, [0.14, 0.1], M.detail, { ry: s * 1.4, spring: { ...CLOTH, k: 110 }, lx: [-0.4, 0.4], th: 0.03, taper: 0.8 });
    },
    // Reactor Drum: a finned drum laid along the shoulder, its end-face lit, pipes into the back
    sunburst(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.7, 0, 0, 0, -s * 0.2);
      C(pv, 0.13 * b, 0.13 * b, 0.32 * b, M.main, s * 0.03, 0.02, 0, PI / 2, 0, 0, 10);
      for (const z of [-0.1, -0.03, 0.04, 0.11]) ring(pv, 0.135 * b, 0.015, M.trim, s * 0.03, 0.02, z * b, 0, 0, 10);
      C(pv, 0.09, 0.09, 0.02, M.glow, s * 0.03, 0.02, 0.17 * b, PI / 2);
      C(pv, 0.03, 0.03, 0.2, M.detail, s * 0.03, 0.02, -0.25 * b, PI / 2);
    },
  },
  chest: {
    // Cuirass & Gorget: an angled two-plate cuirass with a central ridge, an armoured gorget, banded abdominal
    // lames, a tabard hanging front and back; vambraces and gauntlets
    plate(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      for (const s of [1, -1]) B(T, 0.24 * b, 0.34, 0.04, M.main, s * 0.11 * b, 0.48, f, 0, -s * 0.18);
      B(T, 0.04, 0.34, 0.05, M.trim, 0, 0.48, f + 0.02);
      B(T, 0.36, 0.12, 0.34, M.main, 0, 0.68, -0.01); B(T, 0.38, 0.03, 0.36, M.trim, 0, 0.74, -0.01);
      for (let i = 0; i < 3; i++) B(T, (0.4 - i * 0.03) * b, 0.05, 0.27 * b, M.detail, 0, 0.27 - i * 0.06, 0);
      B(T, 0.08, 0.06, 0.03, M.glow, 0, 0.58, f + 0.04);
      strip(r, T, 0, 0.12, f + 0.01, 0.26 * b, [0.32, 0.3], M.trim, { lx: [-1.0, 0.06] });
      strip(r, T, 0, 0.12, -f - 0.01, 0.28 * b, [0.3, 0.26], M.trim, { lx: [-0.06, 1.1] });
      for (const L of [true, false]) { B(fore(r, L), 0.15 * b, 0.22, 0.17 * b, M.main, 0, -0.17, 0); B(fore(r, L), 0.16 * b, 0.03, 0.18 * b, M.trim, 0, -0.06, 0); B(hand(r, L), 0.13, 0.1, 0.13, M.detail, 0, 0.01, 0); }
    },
    // Coat of Plates: a long coat of rectangular plates riveted in rows down to the knees, a high collar, a belt
    // with pouches and a lit buckle
    mail(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) B(T, 0.1 * b, 0.075, 0.03, row % 2 ? M.main : M.trim, (-0.15 + k * 0.1) * b, 0.62 - row * 0.085, f);
      B(T, 0.34, 0.16, 0.34, M.main, 0, 0.72, -0.02);
      B(T, 0.42 * b, 0.07, 0.28 * b, M.detail, 0, 0.08, 0); B(T, 0.07, 0.06, 0.03, M.glow, 0, 0.08, f + 0.01);
      for (const s of [1, -1]) B(T, 0.08, 0.1, 0.06, M.detail, s * 0.16, 0.05, 0.1);
      for (const x of [-0.12, -0.04, 0.04, 0.12]) strip(r, hips, x * b, -0.04, 0.13 * b, 0.075 * b, [0.2, 0.18, 0.14], M.main, { trim: M.trim, lx: [-0.9, 0.1], th: 0.03 });
      strip(r, hips, 0, -0.04, -0.13 * b, 0.32 * b, [0.22, 0.2, 0.14], M.main, { trim: M.trim, lx: [-0.1, 0.9], th: 0.03 });
      for (const L of [true, false]) { for (let i = 0; i < 3; i++) B(fore(r, L), 0.14 * b, 0.05, 0.16 * b, i % 2 ? M.trim : M.main, 0, -0.06 - i * 0.08, 0); B(hand(r, L), 0.12, 0.09, 0.12, M.detail, 0, 0.01, 0); }
    },
    // Martyr's Harness: cage ribs of metal over a padded chest, a chained reliquary with a lit window at the heart,
    // a long cape in three panels
    radiant(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      B(T, 0.44 * b, 0.34, 0.26 * b, M.detail, 0, 0.48, 0);
      for (let i = 0; i < 4; i++) { B(T, 0.46 * b, 0.03, 0.03, M.main, 0, 0.36 + i * 0.08, f + 0.01); }
      B(T, 0.04, 0.34, 0.04, M.main, 0, 0.48, f + 0.02);
      B(T, 0.13, 0.16, 0.06, M.trim, 0, 0.47, f + 0.05); B(T, 0.08, 0.1, 0.02, M.glow, 0, 0.47, f + 0.085);
      for (const s of [1, -1]) B(T, 0.025, 0.28, 0.025, M.trim, s * 0.08, 0.6, f + 0.04, 0, 0, s * 0.5);
      for (const x of [-0.16, 0, 0.16]) strip(r, T, x * b, 0.66, -0.16 * b, 0.18 * b, [0.42, 0.4, 0.26], M.trim, { trim: M.main, lx: [-0.1, 1.2], lx2: [-0.3, 0.7], taper: 0.92 });
      for (const L of [true, false]) { B(fore(r, L), 0.14 * b, 0.2, 0.16 * b, M.main, 0, -0.16, 0); B(hand(r, L), 0.12, 0.09, 0.12, M.detail, 0, 0.01, 0); }
    },
    // Reactor Carapace: rounded horizontal carapace plates over the chest round a lit vent with a grille, coolant
    // pipes over the shoulders
    dragonscale(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      for (let i = 0; i < 4; i++) { const y = 0.66 - i * 0.075, w = (0.5 - i * 0.03) * b;
        B(T, w, 0.075, 0.3 * b, M.main, 0, y, 0.015, 0.28); B(T, w + 0.01, 0.02, 0.3 * b + 0.01, M.trim, 0, y - 0.035, 0.03, 0.28); B(T, w - 0.02, 0.02, 0.29 * b, M.detail, 0, y - 0.05, 0.01); }
      B(T, 0.14, 0.12, 0.03, M.glow, 0, 0.47, f + 0.025); for (let i = 0; i < 4; i++) B(T, 0.02, 0.13, 0.03, M.detail, -0.05 + i * 0.033, 0.47, f + 0.04);
      for (const s of [1, -1]) B(T, 0.04, 0.04, 0.4, M.detail, s * 0.13, 0.7, 0, -0.4, 0, 0);
      B(T, 0.4 * b, 0.07, 0.26 * b, M.detail, 0, 0.08, 0);
      for (const L of [true, false]) { C(fore(r, L), 0.085 * b, 0.08 * b, 0.22, M.main, 0, -0.17, 0, 0, 0, 0, 8); B(hand(r, L), 0.12, 0.09, 0.12, M.detail, 0, 0.01, 0); }
    },
  },
  legs: {
    // Servo Legs: thigh plates, knee cops with a lit stud, shin plates, a piston up the back of each calf, armoured
    // boots
    greaves(r, M, hips) {
      const { bulk: b } = r.dims;
      for (const s of [1, -1]) plate(r, hips, s * 0.12, -0.04, 0.12 * b, 0.13, 0.22, 0.03, M.main, { edge: M.trim, spring: { lx: [-0.9, 0.1] } });
      for (const L of [true, false]) { const sh = shin(r, L);
        B(sh, 0.16 * b, 0.12, 0.08, M.trim, 0, -0.02, 0.07); B(sh, 0.04, 0.04, 0.02, M.glow, 0, -0.02, 0.115);
        B(sh, 0.15 * b, 0.26, 0.05, M.main, 0, -0.22, 0.07);
        C(sh, 0.025, 0.025, 0.3, M.detail, 0, -0.22, -0.09); C(sh, 0.035, 0.035, 0.08, M.trim, 0, -0.1, -0.09);
        B(sh, 0.17 * b, 0.1, 0.28 * b, M.main, 0, -r.dims.shin + 0.04, 0.05); B(sh, 0.17 * b, 0.03, 0.08, M.trim, 0, -r.dims.shin + 0.06, 0.17); }
    },
    // Plate Skirt & Boots: a skirt of vertical plate strips all round, heavy boots with steel toe caps
    mailskirt(r, M, hips) {
      const { bulk: b } = r.dims;
      for (let k = 0; k < 6; k++) { const a = -PI * 0.42 + (k / 5) * PI * 0.84; strip(r, hips, Math.sin(a) * 0.18 * b, -0.02, Math.cos(a) * 0.13 * b, 0.07, [0.24, 0.12], M.main, { trim: M.trim, ry: a, lx: [-0.9, 0.2], th: 0.025 }); }
      strip(r, hips, 0, -0.02, -0.13 * b, 0.3 * b, [0.24, 0.14], M.main, { trim: M.trim, lx: [-0.2, 0.9], th: 0.025 });
      B(hips, 0.42 * b, 0.07, 0.26 * b, M.detail, 0, 0.05, 0); B(hips, 0.06, 0.05, 0.03, M.glow, 0, 0.05, 0.14 * b);
      for (const L of [true, false]) { const sh = shin(r, L); B(sh, 0.17 * b, 0.34, 0.19 * b, M.detail, 0, -0.29, 0.01); B(sh, 0.17 * b, 0.06, 0.12, M.trim, 0, -r.dims.shin + 0.04, 0.12); }
    },
    // Oath Greaves: layered tassets each sealed with wax and an oath strip, engraved shin plates, a lit gem
    kingsguard(r, M, hips) {
      const { bulk: b } = r.dims;
      for (const s of [1, -1]) for (let i = 0; i < 2; i++) plate(r, hips, s * 0.11, -0.04 - i * 0.1, 0.13 * b + i * 0.005, 0.14, 0.12, 0.03, i ? M.trim : M.main, { edge: M.trim, spring: { lx: [-0.9, 0.1] } });
      for (const s of [1, -1]) { B(hips, 0.06, 0.06, 0.03, M.detail, s * 0.11, -0.1, 0.16 * b); strip(r, hips, s * 0.11, -0.13, 0.165 * b, 0.035, [0.14, 0.08], M.glow, { lx: [-0.6, 0.2], th: 0.012 }); }
      for (const L of [true, false]) { const sh = shin(r, L); B(sh, 0.15 * b, 0.36, 0.05, M.main, 0, -0.24, 0.07); for (let i = 0; i < 3; i++) B(sh, 0.12 * b, 0.015, 0.02, M.trim, 0, -0.12 - i * 0.09, 0.1); B(sh, 0.05, 0.05, 0.03, M.glow, 0, -0.04, 0.1); B(sh, 0.16 * b, 0.08, 0.26 * b, M.detail, 0, -r.dims.shin + 0.03, 0.05); }
    },
    // Furnace Greaves: chunky shin housings with vent slots bleeding heat, dark thigh guards, slab boots
    ember(r, M, hips) {
      const { bulk: b } = r.dims;
      for (const s of [1, -1]) plate(r, hips, s * 0.12, -0.04, 0.12 * b, 0.14, 0.24, 0.035, M.detail, { edge: M.trim, spring: { lx: [-0.9, 0.1] } });
      for (const L of [true, false]) { const sh = shin(r, L); B(sh, 0.18 * b, 0.36, 0.2 * b, M.main, 0, -0.22, 0.01); for (let i = 0; i < 4; i++) B(sh, 0.13 * b, 0.02, 0.02, M.glow, 0, -0.08 - i * 0.07, 0.115 * b); B(sh, 0.19 * b, 0.04, 0.21 * b, M.trim, 0, -0.04, 0.01); B(sh, 0.19 * b, 0.1, 0.3 * b, M.main, 0, -r.dims.shin + 0.04, 0.05); }
    },
  },
  // swords: [length, base z] exactly as before
  sword: {
    // Broad Power Sword: a wide blade with a lit channel, a guard-emitter with a glowing node, a cabled grip
    longsword(r, M, g) {
      B(g, 0.05, 0.05, 0.22, M.detail, 0, 0, 0); B(g, 0.07, 0.07, 0.06, M.trim, 0, 0, -0.13);
      B(g, 0.3, 0.07, 0.08, M.trim, 0, 0, 0.13); B(g, 0.06, 0.06, 0.03, M.glow, 0, 0.045, 0.13);
      B(g, 0.035, 0.13, 0.82, M.main, 0, 0, 0.58); B(g, 0.037, 0.03, 0.74, M.glow, 0, 0, 0.56);
      K(g, 0.07, 0.12, M.main, 0, 0, 1.0, PI / 2, 0, 0);
      return [1.05, 0.25];
    },
    // Chain-Cleaver: a cleaver blade widening to a square tip, a row of teeth, a motor housing at the cross
    falchion(r, M, g) {
      B(g, 0.05, 0.05, 0.22, M.detail, 0, 0, 0);
      B(g, 0.12, 0.13, 0.18, M.trim, 0, 0.02, 0.17); B(g, 0.05, 0.05, 0.05, M.glow, 0.065, 0.03, 0.17);
      B(g, 0.035, 0.12, 0.42, M.main, 0, 0.0, 0.48); B(g, 0.035, 0.2, 0.36, M.main, 0, 0.04, 0.82);
      for (let i = 0; i < 9; i++) B(g, 0.04, 0.03, 0.05, M.detail, 0, -0.075 + (i > 4 ? -0.0 : 0), 0.3 + i * 0.075);
      return [1.0, 0.25];
    },
    // Sunfire Claymore: a long blade under a flame-shaped guard, a burning core down the middle
    dawn(r, M, g) {
      B(g, 0.05, 0.05, 0.26, M.detail, 0, 0, -0.02);
      for (const s of [1, -1]) { B(g, 0.14, 0.05, 0.05, M.trim, s * 0.08, 0, 0.13, 0, 0, s * 0.3); K(g, 0.03, 0.12, M.trim, s * 0.16, 0.04, 0.13, 0, 0, -s * 0.6); }
      B(g, 0.03, 0.1, 0.85, M.main, 0, 0, 0.6); B(g, 0.034, 0.035, 0.8, M.glow, 0, 0, 0.58);
      return [1.05, 0.25];
    },
    // Cryo Sabre: a curved blade in three segments with a coolant spine, a canister grip
    frostbrand(r, M, g) {
      C(g, 0.035, 0.035, 0.22, M.detail, 0, 0, 0, PI / 2); C(g, 0.05, 0.05, 0.08, M.trim, 0, 0, -0.1, PI / 2);
      B(g, 0.12, 0.05, 0.05, M.trim, 0, 0, 0.12);
      for (let i = 0; i < 3; i++) { B(g, 0.03, 0.08, 0.3, M.main, 0, 0.012 * i * i, 0.3 + i * 0.27, -0.04 * i); B(g, 0.032, 0.015, 0.28, M.glow, 0, 0.045 + 0.012 * i * i, 0.3 + i * 0.27, -0.04 * i); }
      return [1.05, 0.25];
    },
  },
  shield: {
    // Tower Aegis: a tall plank of plate with a lit vision slit, a raised cross, a heavy rim and bolts
    heater(r, M, T) {
      const sh = new THREE.Group();
      B(sh, 0.5, 0.8, 0.06, M.main, 0, -0.04, 0);
      for (const [w, h, x, y] of [[0.54, 0.04, 0, 0.36], [0.54, 0.04, 0, -0.44], [0.04, 0.84, 0.25, -0.04], [0.04, 0.84, -0.25, -0.04]]) B(sh, w, h, 0.08, M.trim, x, y, 0);
      B(sh, 0.3, 0.035, 0.03, M.glow, 0, 0.27, 0.04); B(sh, 0.34, 0.07, 0.04, M.detail, 0, 0.27, 0.03);
      B(sh, 0.07, 0.42, 0.04, M.trim, 0, -0.08, 0.04); B(sh, 0.28, 0.07, 0.04, M.trim, 0, 0.0, 0.04);
      for (const [x, y] of [[-0.19, 0.3], [0.19, 0.3], [-0.19, -0.38], [0.19, -0.38]]) B(sh, 0.035, 0.035, 0.03, M.detail, x, y, 0.045);
      return sh;
    },
    // Boarding Buckler: a small round shield with a heavy rim, a lit boss and grip bolts
    round(r, M, T) {
      const sh = new THREE.Group();
      C(sh, 0.32, 0.32, 0.06, M.main, 0, 0, 0, PI / 2, 0, 0, 12);
      ring(sh, 0.32, 0.04, M.trim, 0, 0, 0, 0, 0, 14);
      C(sh, 0.12, 0.14, 0.08, M.detail, 0, 0, 0.05, PI / 2, 0, 0, 8); C(sh, 0.06, 0.06, 0.03, M.glow, 0, 0, 0.1, PI / 2, 0, 0, 8);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * PI * 2; B(sh, 0.04, 0.04, 0.03, M.trim, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.04); }
      return sh;
    },
    // Sun Kite: a tall kite tapering to a point round a lit reactor, rays of the trim colour
    kite(r, M, T) {
      const sh = new THREE.Group();
      B(sh, 0.52, 0.5, 0.06, M.main, 0, 0.12, 0);
      for (const [w, y] of [[0.42, -0.2], [0.3, -0.32], [0.18, -0.43], [0.08, -0.52]]) B(sh, w, 0.12, 0.06, M.main, 0, y, 0);
      B(sh, 0.56, 0.04, 0.08, M.detail, 0, 0.38, 0);
      C(sh, 0.11, 0.11, 0.04, M.glow, 0, 0.1, 0.05, PI / 2, 0, 0, 10); ring(sh, 0.13, 0.02, M.detail, 0, 0.1, 0.05, 0, 0, 12);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2; B(sh, 0.03, 0.1, 0.03, M.trim, Math.cos(a) * 0.2, 0.1 + Math.sin(a) * 0.2, 0.04, 0, 0, a - PI / 2); }
      return sh;
    },
    // Drake Pavise: a tall rectangular pavise with a drake's head in relief (burning eyes), spikes along the foot
    dragon(r, M, T) {
      const sh = new THREE.Group();
      B(sh, 0.56, 0.86, 0.07, M.main, 0, -0.06, 0); B(sh, 0.2, 0.86, 0.09, M.detail, 0, -0.06, 0);
      B(sh, 0.16, 0.2, 0.06, M.trim, 0, 0.16, 0.07); B(sh, 0.1, 0.08, 0.08, M.trim, 0, 0.06, 0.09);
      for (const s of [1, -1]) { B(sh, 0.035, 0.025, 0.02, M.glow, s * 0.04, 0.2, 0.105); K(sh, 0.025, 0.12, M.trim, s * 0.07, 0.3, 0.07, 0, 0, s * 0.4); }
      for (let k = 0; k < 4; k++) K(sh, 0.03, 0.1, M.trim, -0.21 + k * 0.14, -0.53, 0, PI, 0, 0);
      return sh;
    },
  },
};
