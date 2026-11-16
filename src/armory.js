// The Last Crusade's armoury: every outfit piece built new (playerkits.js puts these in place of its old builders).
// Same slots, same ids (owned pieces carry over), same weapon lengths; four colour channels each: M.main (the big
// surfaces), M.trim (edges, bands, rims, tabards), M.detail (straps, hoses, leather, under-layers) and M.glow
// (visors, lenses, cores, lit edges). Purely visual.
// Body (models.js, bulk b): torso T from y 0 (hips) to 0.68, chest front z ≈ 0.135·b, shoulders at x ±0.27·b,
// y ≈ 0.6; head H at the neck, skull y 0.04..0.34, face front z ≈ 0.145; shins hang from the knee to y −0.47.
import * as THREE from 'three';
import { box, cyl, cone, rbox, pivot } from './mesh.js';
import { strip, plate, basic, CLOTH, RIBBON, HEAVY_CLOTH } from './kits.js';
import { colorMat } from './outfits.js';

const PI = Math.PI;
const B = (p, w, h, d, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const k = rbox(w, h, d, m, x, y, z, rx, ry, rz); p.add(k); return k; };
const C = (p, rt, rb, h, m, x, y, z, rx = 0, ry = 0, rz = 0, seg = 8) => { const k = cyl(rt, rb, h, m, seg); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); p.add(k); return k; };
const K = (p, r, h, m, x, y, z, rx = 0, ry = 0, rz = 0, seg = 4) => { const k = cone(r, h, m, seg); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); p.add(k); return k; };
const ring = (p, R, t, m, x, y, z, rx = 0, ry = 0, seg = 14) => { const k = new THREE.Mesh(new THREE.TorusGeometry(R, t, 4, seg), m); k.position.set(x, y, z); k.rotation.set(rx, ry, 0); p.add(k); return k; };
const fore = (r, L) => r.j[L ? 'foreL' : 'foreR'], hand = (r, L) => r.j[L ? 'handL' : 'handR'], shin = (r, L) => r.j[L ? 'shinL' : 'shinR'];

// ---------- detail helpers (the Templar's pieces) ----------
// a row of n rivets from x0 to x1 at height y, standing proud of a face at z
const rivets = (p, x0, x1, y, z, n, m, s = 0.016) => { for (let i = 0; i < n; i++) B(p, s, s, s, m, x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z); };
// a raised frame round a front-facing panel w x h centred at (x, y), its face at z
const frame = (p, w, h, x, y, z, m, t = 0.014, d = 0.012) => { B(p, w, t, d, m, x, y + h / 2 - t / 2, z); B(p, w, t, d, m, x, y - h / 2 + t / 2, z); B(p, t, h, d, m, x - w / 2 + t / 2, y, z); B(p, t, h, d, m, x + w / 2 - t / 2, y, z); };
// a vertical column of rivets
const rivetCol = (p, x, y0, y1, z, n, m, s = 0.016) => { for (let i = 0; i < n; i++) B(p, s, s, s, m, x, y0 + ((y1 - y0) * i) / Math.max(1, n - 1), z); };
const DARK = basic(0x050405); // (the dark behind a visor's slits)

// ======================= TEMPLAR =======================
export const KNIGHT_ARMORY = {
  helmet: {
    // Crusader Bascinet: a tall pointed skull with a crest ridge, a pig-snout vox visor of stacked plates drilled with
    // breathing holes, a burning eye slit in a recessed frame, riveted cheek plates, a brass brow band, a lamed neck
    // guard, a two-ring gorget and cables
    great(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.28, 0.32, 0.3, M.main, 0, 0.2, -0.005);
      K(H, 0.2, 0.22, M.main, 0, 0.46, -0.01, 0, PI / 4);
      B(H, 0.025, 0.3, 0.34, M.trim, 0, 0.42, -0.01, 0, 0, 0); // (the crest ridge, front to back)
      B(H, 0.3, 0.035, 0.31, M.trim, 0, 0.3, -0.005); rivets(H, -0.12, 0.12, 0.3, 0.158, 7, M.detail);
      B(H, 0.22, 0.05, 0.03, DARK, 0, 0.245, 0.15); B(H, 0.18, 0.022, 0.02, M.glow, 0, 0.245, 0.158); frame(H, 0.24, 0.07, 0, 0.245, 0.162, M.trim, 0.012, 0.012);
      for (let i = 0; i < 3; i++) B(H, 0.19 - i * 0.03, 0.055, 0.13 - i * 0.025, M.main, 0, 0.17 - i * 0.045, 0.165 + i * 0.025, 0.25); // (the snout, stacked)
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) B(H, 0.022, 0.022, 0.02, DARK, -0.045 + k * 0.045, 0.1 + i * 0.035, 0.232, 0.25);
      B(H, 0.03, 0.15, 0.03, M.trim, 0, 0.14, 0.24, 0.25); // (a ridge down the snout)
      for (const s of [1, -1]) { B(H, 0.03, 0.2, 0.18, M.main, s * 0.15, 0.15, 0.06); rivetCol(H, s * 0.167, 0.08, 0.22, 0.06, 4, M.detail); B(H, 0.035, 0.05, 0.05, M.trim, s * 0.158, 0.2, 0.0); }
      for (let i = 0; i < 3; i++) B(H, 0.3 - i * 0.02, 0.04, 0.06, i % 2 ? M.trim : M.main, 0, 0.12 - i * 0.04, -0.16 - i * 0.02, -0.3); // (the neck guard's lames)
      B(H, 0.34, 0.06, 0.34, M.detail, 0, 0.06, 0); B(H, 0.35, 0.022, 0.35, M.trim, 0, 0.095, 0); B(H, 0.33, 0.022, 0.33, M.trim, 0, 0.035, 0);
      for (const s of [1, -1]) { B(H, 0.035, 0.035, 0.24, M.detail, s * 0.12, 0.09, 0.02, 0.5, s * 0.3); B(H, 0.045, 0.045, 0.04, M.trim, s * 0.13, 0.12, 0.12, 0.5, s * 0.3); }
    },
    // Flat-top Sallet: a squat helm under a flat riveted brim that sweeps back into a lamed tail, a full-width lit visor
    // band in a frame, a ribbed rebreather jaw with twin filter canisters, ear discs, a ridge over the crown
    barbute(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.27, 0.25, 0.29, M.main, 0, 0.19, 0);
      B(H, 0.34, 0.04, 0.42, M.trim, 0, 0.33, -0.04); rivets(H, -0.15, 0.15, 0.35, 0.16, 8, M.detail, 0.014);
      B(H, 0.04, 0.05, 0.36, M.main, 0, 0.37, -0.04); // (a low ridge over the crown)
      for (let i = 0; i < 3; i++) B(H, 0.3 - i * 0.03, 0.04, 0.09, i % 2 ? M.trim : M.main, 0, 0.3 - i * 0.035, -0.21 - i * 0.06, -0.35 - i * 0.12);
      B(H, 0.28, 0.08, 0.03, DARK, 0, 0.22, 0.148); B(H, 0.25, 0.026, 0.02, M.glow, 0, 0.22, 0.16); frame(H, 0.29, 0.09, 0, 0.22, 0.163, M.trim, 0.013, 0.012);
      B(H, 0.2, 0.11, 0.1, M.detail, 0, 0.08, 0.13);
      for (let i = 0; i < 4; i++) B(H, 0.21, 0.012, 0.11, M.trim, 0, 0.04 + i * 0.026, 0.135); // (its ribs)
      for (const s of [1, -1]) {
        C(H, 0.042, 0.042, 0.1, M.trim, s * 0.12, 0.07, 0.15, PI / 2); C(H, 0.03, 0.03, 0.02, M.glow, s * 0.12, 0.07, 0.205, PI / 2);
        for (const z of [0.12, 0.16]) ring(H, 0.045, 0.008, M.detail, s * 0.12, 0.07, z, 0, 0, 10);
        C(H, 0.05, 0.05, 0.025, M.trim, s * 0.15, 0.19, 0.0, 0, 0, PI / 2); C(H, 0.025, 0.025, 0.03, M.glow, s * 0.158, 0.19, 0.0, 0, 0, PI / 2);
      }
    },
    // Seraph Helm: a smooth sculpted face-mask with a brow ridge and cheek lines, three swept vanes either side each
    // fletched with feathers and lit at the tip, a halo emitter ring with nodes, a fluted gorget
    winged(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.25, 0.3, 0.28, M.main, 0, 0.19, -0.01);
      B(H, 0.18, 0.22, 0.04, M.trim, 0, 0.18, 0.148); B(H, 0.2, 0.03, 0.04, M.trim, 0, 0.255, 0.16);
      for (const s of [1, -1]) { B(H, 0.07, 0.02, 0.02, M.glow, s * 0.04, 0.22, 0.172); B(H, 0.012, 0.09, 0.012, M.main, s * 0.07, 0.14, 0.171, 0, 0, s * 0.2); }
      B(H, 0.03, 0.12, 0.02, M.detail, 0, 0.12, 0.17); B(H, 0.06, 0.03, 0.02, M.main, 0, 0.07, 0.17);
      for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
        const v = pivot(H, s * 0.13, 0.26 - i * 0.05, 0.02, 0, -s * 0.2, -s * (0.9 + i * 0.25)), L = 0.32 - i * 0.06;
        B(v, 0.025, L, 0.1, M.trim, 0, L / 2, -0.06, -0.6);
        for (let f = 0; f < 3; f++) B(v, 0.018, L * 0.3, 0.06, M.main, 0, L * (0.3 + f * 0.22), -0.13 - f * 0.012, -0.9); // (feathers)
        B(v, 0.03, 0.05, 0.1, M.glow, 0, L - 0.02, -0.24 + i * 0.03, -0.6);
      }
      const hp = pivot(H, 0, 0.3, -0.2); ring(hp, 0.24, 0.02, M.glow, 0, 0, 0, 0, 0, 20); ring(hp, 0.2, 0.008, M.trim, 0, 0, 0, 0, 0, 20);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; B(hp, i % 2 ? 0.03 : 0.05, i % 2 ? 0.03 : 0.05, 0.03, M.trim, Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0); }
      r.spinners.push({ obj: hp, axis: 'z', speed: 0.5 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; B(H, 0.04, 0.07, 0.03, M.trim, Math.sin(a) * 0.165, 0.065, Math.cos(a) * 0.165, 0, a, 0); }
    },
    // Crown of the Fallen Archon: a Spartan face: a solid faceplate cut through with tall slits, dark behind them but
    // for two burning eyes; a brow band and a nasal bar; spikes radiating out of the helm all round its crown and down
    // the back; riveted cheek guards; a mail aventail
    crowned(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.28, 0.31, 0.29, M.main, 0, 0.195, -0.005);
      B(H, 0.26, 0.06, 0.27, M.main, 0, 0.37, -0.01); // (the crown, rounded up)
      // the face: dark behind, the eyes, then the plate with its slits
      B(H, 0.23, 0.2, 0.03, DARK, 0, 0.17, 0.138);
      for (const s of [1, -1]) {
        B(H, 0.032, 0.026, 0.01, M.glow, s * 0.036, 0.215, 0.158); B(H, 0.016, 0.014, 0.012, basic(0xffffff), s * 0.036, 0.216, 0.161); // (an eye, its hot core)
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.06), new THREE.MeshBasicMaterial({ color: M.glowHex ?? 0xff5030, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
        halo.position.set(s * 0.036, 0.215, 0.163); H.add(halo);
      }
      for (let i = 0; i < 6; i++) B(H, 0.016, 0.18, 0.02, M.main, -0.09 + i * 0.036, 0.17, 0.168); // (the bars between the slits: an eye looks out through each middle pair)
      B(H, 0.26, 0.04, 0.035, M.trim, 0, 0.275, 0.165); rivets(H, -0.1, 0.1, 0.275, 0.185, 5, M.detail, 0.014); // (the brow band)
      B(H, 0.24, 0.04, 0.03, M.main, 0, 0.065, 0.165); B(H, 0.025, 0.2, 0.03, M.trim, 0, 0.17, 0.18); // (the chin plate, the nasal bar)
      for (const s of [1, -1]) { B(H, 0.035, 0.22, 0.17, M.main, s * 0.155, 0.16, 0.06); rivetCol(H, s * 0.174, 0.08, 0.24, 0.1, 4, M.detail); B(H, 0.04, 0.24, 0.02, M.trim, s * 0.155, 0.16, 0.148); }
      // the spikes: a fan over the crown from ear to ear, a smaller row behind it, a few down the back
      const SP = new THREE.Vector3(0, 0.22, -0.02);
      const spike = (ax, ay, az, len, rad) => {
        const d = new THREE.Vector3(ax, ay, az).normalize(), g = pivot(H, SP.x + d.x * 0.15, SP.y + d.y * 0.15, SP.z + d.z * 0.15);
        g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
        K(g, rad, len, M.trim, 0, len / 2, 0, 0, 0, 0, 5); C(g, rad * 1.3, rad * 1.5, 0.03, M.detail, 0, 0.005, 0, 0, 0, 0, 6);
      };
      for (let i = 0; i < 11; i++) { const a = -PI * 0.55 + (i / 10) * PI * 1.1; spike(Math.sin(a), Math.cos(a), 0.05, i % 2 ? 0.17 : 0.26, 0.028); }
      for (let i = 0; i < 7; i++) { const a = -PI * 0.42 + (i / 6) * PI * 0.84; spike(Math.sin(a) * 0.9, Math.cos(a) * 0.8, -0.6, 0.15, 0.022); }
      for (let i = 0; i < 3; i++) spike(0, 0.4 - i * 0.35, -1, 0.14 - i * 0.02, 0.022);
      for (let k = 0; k < 6; k++) strip(r, H, -0.13 + k * 0.052, 0.06, -0.1, 0.05, [0.1, 0.06], M.detail, { lx: [-0.4, 0.6], th: 0.02 });
      B(H, 0.32, 0.03, 0.32, M.trim, 0, 0.07, 0);
    },
  },
  pauldron: {
    // Riot Slabs: three flat edged slabs stacked down the shoulder, each riveted along its rim, a ridge over the top,
    // a strap with a buckle under them, a lit stud
    segmented(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.32);
      B(pv, 0.26 * b, 0.07, 0.32 * b, M.main, s * 0.02, 0.02, 0); B(pv, 0.27 * b, 0.02, 0.33 * b, M.trim, s * 0.02, 0.06, 0);
      B(pv, 0.03, 0.03, 0.34 * b, M.trim, s * 0.02, 0.075, 0); // (the ridge)
      rivets(pv, -0.13 * b + s * 0.02, 0.13 * b + s * 0.02, 0.04, 0.165 * b, 6, M.detail, 0.015);
      for (let i = 0; i < 2; i++) { plate(r, pv, s * (0.04 + i * 0.02), -0.03 - i * 0.07, 0, (0.25 - i * 0.02) * b, 0.07, (0.31 - i * 0.02) * b, M.main, { edge: M.trim }); rivets(pv, s * (0.04 + i * 0.02) - 0.1 * b, s * (0.04 + i * 0.02) + 0.1 * b, -0.03 - i * 0.07, (0.16 - i * 0.01) * b, 5, M.detail, 0.013); }
      B(pv, 0.04, 0.2, 0.06, M.detail, -s * 0.06, -0.06, 0.12); B(pv, 0.055, 0.045, 0.07, M.trim, -s * 0.06, -0.1, 0.125); B(pv, 0.02, 0.03, 0.075, M.detail, -s * 0.06, -0.1, 0.13);
      B(pv, 0.05, 0.03, 0.02, M.glow, s * 0.1, 0.035, 0.165);
    },
    // Hook Plates: an angular wedge over two layered under-plates, two hooked spikes curling up and back in three
    // segments, rivet rows, a lit vent behind a grille
    spiked(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.7, 0, 0, 0, -s * 0.2);
      B(pv, 0.24 * b, 0.12, 0.3 * b, M.main, s * 0.02, 0, 0, 0, 0, s * 0.25); B(pv, 0.25 * b, 0.02, 0.31 * b, M.trim, s * 0.03, 0.055, 0, 0, 0, s * 0.25);
      B(pv, 0.2 * b, 0.05, 0.31 * b, M.main, s * 0.08, -0.08, 0, 0, 0, s * 0.5); B(pv, 0.18 * b, 0.04, 0.3 * b, M.trim, s * 0.1, -0.12, 0, 0, 0, s * 0.6);
      for (const z of [-0.07, 0.07]) { const h = pivot(pv, s * 0.06, 0.06, z, 0, 0, -s * 0.3); C(h, 0.025, 0.03, 0.06, M.detail, 0, 0.01, 0); B(h, 0.04, 0.16, 0.04, M.trim, 0, 0.08, 0); B(h, 0.035, 0.08, 0.035, M.trim, -s * 0.03, 0.17, -0.02, -0.4, 0, s * 0.9); K(h, 0.016, 0.06, M.trim, -s * 0.08, 0.2, -0.04, 0, 0, s * 1.6, 4); }
      for (let i = 0; i < 4; i++) { B(pv, 0.02, 0.02, 0.02, M.detail, s * 0.12, -0.02, -0.11 + i * 0.075); B(pv, 0.018, 0.018, 0.018, M.detail, s * 0.15, -0.1, -0.11 + i * 0.075); }
      B(pv, 0.07, 0.03, 0.11, DARK, s * 0.13, 0.02, 0, 0, 0, s * 0.25); B(pv, 0.06, 0.02, 0.1, M.glow, s * 0.13, 0.025, 0, 0, 0, s * 0.25);
      for (let i = 0; i < 4; i++) B(pv, 0.075, 0.01, 0.012, M.trim, s * 0.135, 0.035, -0.04 + i * 0.027, 0, 0, s * 0.25);
    },
    // Lion-Skull: a lion's skull of iron with a heavy brow, a muzzle, fangs top and bottom, burning eyes, a nose, a
    // mane of cables that swings, over a layered plate
    lion(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.7, 0, 0, 0, -s * 0.25);
      B(pv, 0.24 * b, 0.1, 0.3 * b, M.main, s * 0.02, 0, 0); B(pv, 0.22 * b, 0.05, 0.29 * b, M.trim, s * 0.05, -0.07, 0); rivets(pv, s * 0.02 - 0.1 * b, s * 0.02 + 0.1 * b, 0.0, 0.155 * b, 5, M.detail, 0.013);
      const sk = pivot(pv, s * 0.06, 0.06, 0.1);
      B(sk, 0.15, 0.13, 0.14, M.trim, 0, 0, 0); B(sk, 0.17, 0.035, 0.05, M.trim, 0, 0.05, 0.06); // (the skull, its brow)
      B(sk, 0.11, 0.06, 0.09, M.trim, 0, -0.04, 0.08); B(sk, 0.04, 0.025, 0.03, M.detail, 0, -0.01, 0.13); // (the muzzle, the nose)
      for (const x of [-0.035, 0.035]) { B(sk, 0.035, 0.03, 0.02, DARK, x, 0.02, 0.072); B(sk, 0.025, 0.02, 0.02, M.glow, x, 0.02, 0.078); }
      for (const x of [-0.04, 0.04]) { K(sk, 0.012, 0.05, M.detail, x, -0.085, 0.11, PI, 0, 0, 3); K(sk, 0.01, 0.035, M.detail, x * 0.6, -0.06, 0.12, 0, 0, 0, 3); }
      B(sk, 0.1, 0.02, 0.07, M.detail, 0, -0.08, 0.06); // (the jaw)
      for (const z of [-0.1, -0.03, 0.04]) strip(r, pv, s * 0.12, 0.06, z, 0.03, [0.14, 0.1], M.detail, { ry: s * 1.4, spring: { ...CLOTH, k: 110 }, lx: [-0.4, 0.4], th: 0.03, taper: 0.8 });
    },
    // Reactor Drum: a finned drum laid along the shoulder on a bracket, banded with rings, its end-face a lit core
    // behind a spoked grille, coolant pipes with couplings into the back
    sunburst(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.7, 0, 0, 0, -s * 0.2);
      C(pv, 0.13 * b, 0.13 * b, 0.32 * b, M.main, s * 0.03, 0.02, 0, PI / 2, 0, 0, 12);
      for (const z of [-0.12, -0.06, 0, 0.06, 0.12]) ring(pv, 0.135 * b, 0.014, M.trim, s * 0.03, 0.02, z * b, 0, 0, 12);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2; B(pv, 0.015, 0.03, 0.28 * b, M.detail, s * 0.03 + Math.cos(a) * 0.14 * b, 0.02 + Math.sin(a) * 0.14 * b, 0); } // (fins)
      C(pv, 0.1, 0.1, 0.02, M.glow, s * 0.03, 0.02, 0.17 * b, PI / 2, 0, 0, 12); ring(pv, 0.11, 0.015, M.trim, s * 0.03, 0.02, 0.175 * b, 0, 0, 12);
      for (let k = 0; k < 4; k++) B(pv, 0.2, 0.012, 0.012, M.trim, s * 0.03, 0.02, 0.18 * b, 0, 0, (k / 4) * PI);
      C(pv, 0.03, 0.03, 0.2, M.detail, s * 0.03, 0.02, -0.25 * b, PI / 2); C(pv, 0.04, 0.04, 0.03, M.trim, s * 0.03, 0.02, -0.18 * b, PI / 2); C(pv, 0.022, 0.022, 0.16, M.detail, s * 0.03, -0.05, -0.22 * b, PI / 2);
      B(pv, 0.08, 0.1, 0.2 * b, M.detail, -s * 0.04, -0.07, 0); // (the bracket)
    },
  },
  chest: {
    // Cuirass & Gorget: an angled two-plate cuirass with a central ridge, raised rims and rivets, a back plate, an
    // armoured two-ring gorget, banded abdominal lames, a belt with a buckle and pouches, a tabard front and back;
    // ridged vambraces and knuckled gauntlets
    plate(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      for (const s of [1, -1]) { B(T, 0.24 * b, 0.34, 0.04, M.main, s * 0.11 * b, 0.48, f, 0, -s * 0.18); B(T, 0.016, 0.34, 0.03, M.trim, s * 0.22 * b, 0.48, f - 0.02, 0, -s * 0.18); rivetCol(T, s * 0.2 * b, 0.36, 0.6, f + 0.005, 4, M.detail); }
      B(T, 0.04, 0.34, 0.05, M.trim, 0, 0.48, f + 0.02);
      B(T, 0.46 * b, 0.32, 0.04, M.main, 0, 0.48, -f); B(T, 0.04, 0.32, 0.03, M.trim, 0, 0.48, -f - 0.02); // (the back plate and its spine)
      B(T, 0.36, 0.12, 0.34, M.main, 0, 0.68, -0.01); B(T, 0.38, 0.025, 0.36, M.trim, 0, 0.745, -0.01); B(T, 0.37, 0.022, 0.35, M.trim, 0, 0.66, -0.01);
      rivets(T, -0.15, 0.15, 0.7, 0.165, 7, M.detail, 0.014);
      for (let i = 0; i < 4; i++) { const w = (0.42 - i * 0.025) * b; B(T, w, 0.045, 0.28 * b, i % 2 ? M.trim : M.main, 0, 0.29 - i * 0.05, 0); rivets(T, -w / 2 + 0.02, w / 2 - 0.02, 0.29 - i * 0.05, 0.14 * b + 0.002, 2, M.detail, 0.012); }
      B(T, 0.44 * b, 0.05, 0.3 * b, M.detail, 0, 0.09, 0); B(T, 0.07, 0.05, 0.02, M.trim, 0, 0.09, 0.15 * b + 0.01); B(T, 0.03, 0.025, 0.02, M.glow, 0, 0.09, 0.15 * b + 0.02);
      for (const s of [1, -1]) { B(T, 0.07, 0.07, 0.05, M.detail, s * 0.15 * b, 0.07, 0.13 * b); B(T, 0.072, 0.018, 0.052, M.trim, s * 0.15 * b, 0.1, 0.13 * b); }
      B(T, 0.08, 0.06, 0.03, M.glow, 0, 0.58, f + 0.04); frame(T, 0.11, 0.09, 0, 0.58, f + 0.05, M.trim, 0.014, 0.014);
      strip(r, T, 0, 0.12, f + 0.01, 0.26 * b, [0.32, 0.3], M.trim, { lx: [-1.0, 0.06] });
      strip(r, T, 0, 0.12, -f - 0.01, 0.28 * b, [0.3, 0.26], M.trim, { lx: [-0.06, 1.1] });
      for (const L of [true, false]) {
        const fa = fore(r, L), hd = hand(r, L);
        B(fa, 0.15 * b, 0.22, 0.17 * b, M.main, 0, -0.17, 0); B(fa, 0.16 * b, 0.03, 0.18 * b, M.trim, 0, -0.06, 0); B(fa, 0.16 * b, 0.025, 0.18 * b, M.trim, 0, -0.27, 0);
        B(fa, 0.025, 0.2, 0.03, M.trim, 0, -0.17, 0.09 * b); rivetCol(fa, 0.05 * b, -0.1, -0.24, 0.09 * b, 3, M.detail, 0.013);
        B(hd, 0.13, 0.1, 0.13, M.detail, 0, 0.01, 0); for (let k = 0; k < 4; k++) B(hd, 0.03, 0.03, 0.04, M.main, -0.045 + k * 0.03, -0.03, 0.055);
        B(hd, 0.14, 0.04, 0.1, M.main, 0, 0.05, 0.02);
      }
    },
    // Coat of Plates: a long coat of rectangular plates riveted in rows down to the knees, a high collar with a lit
    // clasp, a belt with pouches and a lit buckle, lamed vambraces
    mail(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      B(T, 0.44 * b, 0.4, 0.26 * b, M.detail, 0, 0.46, 0);
      for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) { const x = (-0.15 + k * 0.1) * b, y = 0.62 - row * 0.085; B(T, 0.095 * b, 0.075, 0.03, row % 2 ? M.main : M.trim, x, y, f); B(T, 0.012, 0.012, 0.012, M.detail, x - 0.035 * b, y + 0.025, f + 0.02); B(T, 0.012, 0.012, 0.012, M.detail, x + 0.035 * b, y + 0.025, f + 0.02); }
      for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) B(T, 0.095 * b, 0.075, 0.03, row % 2 ? M.main : M.trim, (-0.15 + k * 0.1) * b, 0.62 - row * 0.085, -f);
      B(T, 0.34, 0.16, 0.34, M.main, 0, 0.72, -0.02); B(T, 0.36, 0.025, 0.36, M.trim, 0, 0.8, -0.02); B(T, 0.06, 0.06, 0.02, M.glow, 0, 0.72, 0.155);
      B(T, 0.42 * b, 0.07, 0.28 * b, M.detail, 0, 0.08, 0); B(T, 0.07, 0.06, 0.03, M.glow, 0, 0.08, f + 0.01); frame(T, 0.09, 0.075, 0, 0.08, f + 0.02, M.trim, 0.012, 0.012);
      for (const s of [1, -1]) { B(T, 0.08, 0.1, 0.06, M.detail, s * 0.16, 0.05, 0.1); B(T, 0.082, 0.025, 0.062, M.trim, s * 0.16, 0.09, 0.1); }
      for (const x of [-0.12, -0.04, 0.04, 0.12]) strip(r, hips, x * b, -0.04, 0.13 * b, 0.075 * b, [0.2, 0.18, 0.14], M.main, { trim: M.trim, lx: [-0.9, 0.1], th: 0.03 });
      strip(r, hips, 0, -0.04, -0.13 * b, 0.32 * b, [0.22, 0.2, 0.14], M.main, { trim: M.trim, lx: [-0.1, 0.9], th: 0.03 });
      for (const L of [true, false]) { for (let i = 0; i < 4; i++) B(fore(r, L), 0.15 * b - i * 0.004, 0.045, 0.17 * b - i * 0.004, i % 2 ? M.trim : M.main, 0, -0.05 - i * 0.065, 0); B(hand(r, L), 0.12, 0.09, 0.12, M.detail, 0, 0.01, 0); B(hand(r, L), 0.13, 0.035, 0.09, M.main, 0, 0.05, 0.02); }
    },
    // Martyr's Harness: cage ribs of metal over a quilted chest, a chained reliquary with a lit window in a frame at
    // the heart, buckled straps over the shoulders, a long cape in three panels
    radiant(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      B(T, 0.44 * b, 0.34, 0.26 * b, M.detail, 0, 0.48, 0);
      for (let i = 0; i < 5; i++) B(T, 0.44 * b, 0.008, 0.008, M.trim, 0, 0.34 + i * 0.07, f + 0.002); // (quilting)
      for (let i = 0; i < 4; i++) { B(T, 0.46 * b, 0.03, 0.03, M.main, 0, 0.36 + i * 0.08, f + 0.01); for (const s of [1, -1]) B(T, 0.02, 0.02, 0.02, M.detail, s * 0.2 * b, 0.36 + i * 0.08, f + 0.03); }
      B(T, 0.04, 0.34, 0.04, M.main, 0, 0.48, f + 0.02);
      B(T, 0.13, 0.16, 0.06, M.trim, 0, 0.47, f + 0.05); B(T, 0.08, 0.1, 0.02, M.glow, 0, 0.47, f + 0.085); frame(T, 0.1, 0.12, 0, 0.47, f + 0.09, M.main, 0.012, 0.012);
      K(T, 0.04, 0.05, M.trim, 0, 0.57, f + 0.05, 0, PI / 4, 0); // (the reliquary's peak)
      for (const s of [1, -1]) { B(T, 0.025, 0.28, 0.025, M.trim, s * 0.08, 0.6, f + 0.04, 0, 0, s * 0.5); for (let i = 0; i < 4; i++) ring(T, 0.014, 0.004, M.trim, s * (0.1 + i * 0.03), 0.62 - i * 0.04, f + 0.05, 0, 0, 6); }
      for (const s of [1, -1]) { B(T, 0.06, 0.04, 0.34, M.detail, s * 0.14 * b, 0.69, 0); B(T, 0.04, 0.03, 0.02, M.trim, s * 0.14 * b, 0.69, f + 0.02); }
      for (const x of [-0.16, 0, 0.16]) strip(r, T, x * b, 0.66, -0.16 * b, 0.18 * b, [0.42, 0.4, 0.26], M.trim, { trim: M.main, lx: [-0.1, 1.2], lx2: [-0.3, 0.7], taper: 0.92 });
      for (const L of [true, false]) { B(fore(r, L), 0.14 * b, 0.2, 0.16 * b, M.main, 0, -0.16, 0); for (const y of [-0.08, -0.24]) B(fore(r, L), 0.15 * b, 0.02, 0.17 * b, M.trim, 0, y, 0); B(hand(r, L), 0.12, 0.09, 0.12, M.detail, 0, 0.01, 0); }
    },
    // Reactor Carapace: rounded carapace plates over the chest, rimmed and riveted, round a lit vent behind a grille in
    // a frame, coolant pipes with couplings over the shoulders, a ribbed belly, finned vambraces
    dragonscale(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      for (let i = 0; i < 4; i++) { const y = 0.66 - i * 0.075, w = (0.5 - i * 0.03) * b;
        B(T, w, 0.075, 0.3 * b, M.main, 0, y, 0.015, 0.28); B(T, w + 0.01, 0.02, 0.3 * b + 0.01, M.trim, 0, y - 0.035, 0.03, 0.28); B(T, w - 0.02, 0.02, 0.29 * b, M.detail, 0, y - 0.05, 0.01);
        for (const s of [1, -1]) B(T, 0.016, 0.016, 0.016, M.detail, s * (w / 2 - 0.02), y, 0.17 * b + 0.01); }
      B(T, 0.14, 0.12, 0.03, M.glow, 0, 0.47, f + 0.025); for (let i = 0; i < 4; i++) B(T, 0.02, 0.13, 0.03, M.detail, -0.05 + i * 0.033, 0.47, f + 0.04);
      frame(T, 0.17, 0.15, 0, 0.47, f + 0.05, M.trim, 0.016, 0.014);
      for (const s of [1, -1]) { B(T, 0.04, 0.04, 0.4, M.detail, s * 0.13, 0.7, 0, -0.4, 0, 0); for (const z of [-0.08, 0.06]) B(T, 0.055, 0.055, 0.03, M.trim, s * 0.13, 0.7 + z * 0.4, z, -0.4, 0, 0); }
      B(T, 0.4 * b, 0.07, 0.26 * b, M.detail, 0, 0.08, 0); for (let i = 0; i < 3; i++) B(T, 0.4 * b, 0.012, 0.27 * b, M.trim, 0, 0.18 + i * 0.04, 0);
      for (const L of [true, false]) { C(fore(r, L), 0.085 * b, 0.08 * b, 0.22, M.main, 0, -0.17, 0, 0, 0, 0, 8); for (const y of [-0.09, -0.17, -0.25]) ring(fore(r, L), 0.088 * b, 0.01, M.trim, 0, y, 0, PI / 2, 0, 8); B(hand(r, L), 0.12, 0.09, 0.12, M.detail, 0, 0.01, 0); }
    },
  },
  legs: {
    // Servo Legs: rimmed thigh plates, knee cops with a fanned wing and a lit stud, ridged shin plates, a piston with
    // couplings up the back of each calf, armoured boots with toe caps, ankle plates and heavy soles
    greaves(r, M, hips) {
      const { bulk: b } = r.dims;
      for (const s of [1, -1]) { plate(r, hips, s * 0.12, -0.04, 0.12 * b, 0.13, 0.22, 0.03, M.main, { edge: M.trim, spring: { lx: [-0.9, 0.1] } }); }
      for (const L of [true, false]) { const sh = shin(r, L), o = L ? 1 : -1;
        B(sh, 0.16 * b, 0.12, 0.08, M.trim, 0, -0.02, 0.07); B(sh, 0.06, 0.06, 0.03, DARK, 0, -0.02, 0.112); B(sh, 0.04, 0.04, 0.02, M.glow, 0, -0.02, 0.122);
        B(sh, 0.03, 0.1, 0.07, M.main, o * 0.1 * b, -0.02, 0.05, 0, 0, o * 0.3); // (the cop's wing)
        B(sh, 0.15 * b, 0.26, 0.05, M.main, 0, -0.22, 0.07); B(sh, 0.025, 0.26, 0.02, M.trim, 0, -0.22, 0.1); rivetCol(sh, 0.06 * b, -0.12, -0.32, 0.098, 3, M.detail, 0.013); rivetCol(sh, -0.06 * b, -0.12, -0.32, 0.098, 3, M.detail, 0.013);
        C(sh, 0.025, 0.025, 0.3, M.detail, 0, -0.22, -0.09); C(sh, 0.035, 0.035, 0.08, M.trim, 0, -0.1, -0.09); C(sh, 0.032, 0.032, 0.03, M.trim, 0, -0.33, -0.09);
        const ft = -r.dims.shin + 0.04;
        B(sh, 0.17 * b, 0.1, 0.28 * b, M.main, 0, ft, 0.05); B(sh, 0.18 * b, 0.025, 0.3 * b, M.detail, 0, ft - 0.055, 0.05); // (the boot, its sole)
        B(sh, 0.17 * b, 0.03, 0.08, M.trim, 0, ft + 0.02, 0.17); B(sh, 0.15 * b, 0.05, 0.06, M.main, 0, ft + 0.06, 0.14, -0.4); // (the toe cap, a plate over the instep)
        for (const s of [1, -1]) B(sh, 0.02, 0.07, 0.08, M.trim, s * 0.09 * b, ft + 0.05, 0.0); }
    },
    // Plate Skirt & Boots: a skirt of vertical plate strips all round each rimmed, a studded belt with a lit buckle,
    // heavy boots with steel toe caps, cuffs and buckled straps
    mailskirt(r, M, hips) {
      const { bulk: b } = r.dims;
      for (let k = 0; k < 6; k++) { const a = -PI * 0.42 + (k / 5) * PI * 0.84; strip(r, hips, Math.sin(a) * 0.18 * b, -0.02, Math.cos(a) * 0.13 * b, 0.07, [0.24, 0.12], M.main, { trim: M.trim, ry: a, lx: [-0.9, 0.2], th: 0.025 }); }
      strip(r, hips, 0, -0.02, -0.13 * b, 0.3 * b, [0.24, 0.14], M.main, { trim: M.trim, lx: [-0.2, 0.9], th: 0.025 });
      B(hips, 0.42 * b, 0.07, 0.26 * b, M.detail, 0, 0.05, 0); rivets(hips, -0.18 * b, 0.18 * b, 0.05, 0.135 * b, 8, M.trim, 0.015);
      B(hips, 0.06, 0.05, 0.03, M.glow, 0, 0.05, 0.14 * b); frame(hips, 0.08, 0.07, 0, 0.05, 0.15 * b, M.trim, 0.012, 0.012);
      for (const L of [true, false]) { const sh = shin(r, L), ft = -r.dims.shin + 0.04;
        B(sh, 0.17 * b, 0.34, 0.19 * b, M.detail, 0, -0.29, 0.01); B(sh, 0.18 * b, 0.04, 0.2 * b, M.trim, 0, -0.13, 0.01);
        for (const y of [-0.22, -0.32]) { B(sh, 0.18 * b, 0.02, 0.2 * b, M.main, 0, y, 0.01); B(sh, 0.025, 0.025, 0.02, M.trim, 0.06 * b, y, 0.11 * b); }
        B(sh, 0.17 * b, 0.06, 0.12, M.trim, 0, ft, 0.12); B(sh, 0.18 * b, 0.025, 0.28 * b, M.detail, 0, ft - 0.04, 0.05); }
    },
    // Oath Greaves: layered tassets each sealed with wax and an oath strip, engraved shin plates banded and riveted,
    // knee guards with a lit gem, a carved boot with a heel spur
    kingsguard(r, M, hips) {
      const { bulk: b } = r.dims;
      for (const s of [1, -1]) for (let i = 0; i < 2; i++) plate(r, hips, s * 0.11, -0.04 - i * 0.1, 0.13 * b + i * 0.005, 0.14, 0.12, 0.03, i ? M.trim : M.main, { edge: M.trim, spring: { lx: [-0.9, 0.1] } });
      for (const s of [1, -1]) { B(hips, 0.06, 0.06, 0.03, M.detail, s * 0.11, -0.1, 0.16 * b); strip(r, hips, s * 0.11, -0.13, 0.165 * b, 0.035, [0.14, 0.08], M.glow, { lx: [-0.6, 0.2], th: 0.012 }); }
      B(hips, 0.42 * b, 0.05, 0.27 * b, M.detail, 0, 0.05, 0);
      for (const L of [true, false]) { const sh = shin(r, L), ft = -r.dims.shin + 0.03;
        B(sh, 0.15 * b, 0.36, 0.05, M.main, 0, -0.24, 0.07); for (let i = 0; i < 3; i++) B(sh, 0.12 * b, 0.015, 0.02, M.trim, 0, -0.12 - i * 0.09, 0.1);
        for (let i = 0; i < 3; i++) for (const s of [1, -1]) B(sh, 0.012, 0.012, 0.012, M.detail, s * 0.055 * b, -0.165 - i * 0.09, 0.1);
        B(sh, 0.16 * b, 0.1, 0.07, M.trim, 0, -0.03, 0.07); B(sh, 0.05, 0.05, 0.03, M.glow, 0, -0.04, 0.11); frame(sh, 0.07, 0.07, 0, -0.04, 0.115, M.main, 0.012, 0.01);
        B(sh, 0.16 * b, 0.08, 0.26 * b, M.detail, 0, ft, 0.05); B(sh, 0.165 * b, 0.02, 0.27 * b, M.trim, 0, ft + 0.04, 0.05); K(sh, 0.015, 0.06, M.trim, 0, ft, -0.1, -PI / 2, 0, 0, 4); }
    },
    // Furnace Greaves: chunky shin housings with vent slots bleeding heat behind grilles, riveted thigh guards, slab
    // boots with ribbed soles and a coolant hose
    ember(r, M, hips) {
      const { bulk: b } = r.dims;
      for (const s of [1, -1]) { plate(r, hips, s * 0.12, -0.04, 0.12 * b, 0.14, 0.24, 0.035, M.detail, { edge: M.trim, spring: { lx: [-0.9, 0.1] } }); }
      for (const L of [true, false]) { const sh = shin(r, L), ft = -r.dims.shin + 0.04;
        B(sh, 0.18 * b, 0.36, 0.2 * b, M.main, 0, -0.22, 0.01);
        for (let i = 0; i < 4; i++) { B(sh, 0.14 * b, 0.025, 0.02, DARK, 0, -0.08 - i * 0.07, 0.112 * b); B(sh, 0.13 * b, 0.015, 0.02, M.glow, 0, -0.08 - i * 0.07, 0.115 * b); }
        for (const s of [1, -1]) rivetCol(sh, s * 0.075 * b, -0.06, -0.34, 0.11 * b, 5, M.trim, 0.014);
        B(sh, 0.19 * b, 0.04, 0.21 * b, M.trim, 0, -0.04, 0.01); B(sh, 0.19 * b, 0.03, 0.21 * b, M.trim, 0, -0.38, 0.01);
        C(sh, 0.018, 0.018, 0.3, M.detail, 0.08 * b, -0.22, -0.1); for (const y of [-0.1, -0.34]) C(sh, 0.026, 0.026, 0.025, M.trim, 0.08 * b, y, -0.1);
        B(sh, 0.19 * b, 0.1, 0.3 * b, M.main, 0, ft, 0.05); for (let i = 0; i < 3; i++) B(sh, 0.2 * b, 0.012, 0.31 * b, M.detail, 0, ft - 0.05 + i * 0.012, 0.05); B(sh, 0.19 * b, 0.04, 0.06, M.trim, 0, ft + 0.03, 0.19); }
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

// ======================= SHRIKE =======================
// every cloak builds the head inside its hood: the dark neck, the head, the face in shadow
const rogueHead = (r, M, H) => { B(H, 0.1, 0.08, 0.1, M.detail, 0, 0.03, 0); B(H, 0.26, 0.28, 0.28, r.mats.dark, 0, 0.18, 0); B(H, 0.2, 0.21, 0.02, basic(0x060505), 0, 0.17, 0.146); };
export const ROGUE_ARMORY = {
  cloak: {
    // Ash Poncho: a square poncho hanging front and back past the hips, fringed, under a peaked hood with a long
    // point trailing down the back
    tattered(r, M, T, H) {
      const { bulk: b } = r.dims; rogueHead(r, M, H);
      B(H, 0.32, 0.3, 0.32, M.main, 0, 0.21, -0.02); for (const s of [1, -1]) B(H, 0.05, 0.28, 0.12, M.main, s * 0.14, 0.16, 0.12);
      B(H, 0.3, 0.06, 0.12, M.main, 0, 0.35, 0.1, -0.3); B(H, 0.32, 0.02, 0.02, M.trim, 0, 0.32, 0.16, -0.3);
      strip(r, pivot(H, 0, 0.34, -0.15), 0, 0, 0, 0.14, [0.16, 0.16, 0.12], M.main, { rx: 1.3, taper: 0.5, th: 0.06, lx: [-0.4, 0.9] });
      B(T, 0.62 * b, 0.12, 0.4 * b, M.main, 0, 0.66, -0.01);
      strip(r, T, 0, 0.64, 0.19 * b, 0.5 * b, [0.34, 0.3], M.main, { trim: M.trim, lx: [-1.0, 0.2], taper: 0.95 });
      strip(r, T, 0, 0.64, -0.19 * b, 0.56 * b, [0.36, 0.34], M.main, { trim: M.trim, lx: [-0.1, 1.1], taper: 0.95 });
      for (let k = 0; k < 5; k++) { const x = (-0.2 + k * 0.1) * b; strip(r, T, x, 0.0, -0.2 * b, 0.05, [0.08], M.detail, { lx: [-0.3, 0.6], th: 0.012 }); strip(r, T, x, 0.06, 0.2 * b, 0.05, [0.08], M.detail, { lx: [-0.6, 0.3], th: 0.012 }); }
      B(T, 0.06, 0.06, 0.03, M.glow, 0.1, 0.64, 0.21 * b);
    },
    // Scout Cape: a short cape to the shoulder blades, a high wrapped cowl round the jaw, a low hood, a buckled
    // strap across the chest
    mantle(r, M, T, H) {
      const { bulk: b } = r.dims; rogueHead(r, M, H);
      B(H, 0.3, 0.2, 0.3, M.main, 0, 0.26, -0.03); B(H, 0.31, 0.03, 0.31, M.trim, 0, 0.17, -0.03);
      for (let i = 0; i < 3; i++) B(H, 0.32 - i * 0.02, 0.05, 0.32 - i * 0.02, i % 2 ? M.trim : M.main, 0, 0.04 + i * 0.045, 0.01);
      B(T, 0.58 * b, 0.12, 0.38 * b, M.main, 0, 0.7, -0.01);
      for (const s of [1, -1]) strip(r, T, s * 0.15 * b, 0.68, -0.19 * b, 0.26 * b, [0.2, 0.12], M.main, { trim: M.trim, ry: s * 0.25, lx: [-0.1, 1.0], taper: 0.8 });
      for (const s of [1, -1]) strip(r, T, s * 0.27 * b, 0.68, 0, 0.16, [0.14], M.main, { trim: M.trim, ry: s * 1.4, lx: [-0.3, 0.6] });
      B(T, 0.04, 0.42, 0.025, M.detail, 0, 0.48, 0.15 * b, 0, 0, 0.55); B(T, 0.06, 0.05, 0.03, M.trim, 0, 0.5, 0.16 * b); B(T, 0.025, 0.025, 0.02, M.glow, 0, 0.5, 0.175 * b);
    },
    // Ghost-Field: a smooth hard hood like a shell, a generator pack on the back with lit coils, field trails of
    // light streaming off the shoulders and the crown
    wraith(r, M, T, H) {
      const { bulk: b } = r.dims; rogueHead(r, M, H);
      B(H, 0.3, 0.3, 0.3, M.main, 0, 0.2, -0.02); B(H, 0.22, 0.06, 0.12, M.main, 0, 0.36, 0.06, -0.4);
      for (const s of [1, -1]) B(H, 0.04, 0.24, 0.12, M.main, s * 0.13, 0.18, 0.12);
      B(H, 0.025, 0.3, 0.31, M.trim, 0, 0.21, -0.02);
      B(T, 0.56 * b, 0.1, 0.36 * b, M.main, 0, 0.67, -0.01);
      const gen = pivot(T, 0, 0.48, -0.17 * b); B(gen, 0.22, 0.28, 0.1, M.detail, 0, 0, -0.03);
      for (let i = 0; i < 3; i++) { ring(gen, 0.06, 0.012, M.glow, 0, 0.09 - i * 0.08, -0.09, 0, 0, 8); B(gen, 0.24, 0.02, 0.11, M.trim, 0, 0.13 - i * 0.12, -0.03); }
      const ghost = new THREE.MeshBasicMaterial({ color: M.glowHex, transparent: true, opacity: 0.4, depthWrite: false });
      for (const [x, y, z] of [[0.22, 0.66, -0.1], [-0.22, 0.66, -0.1], [0.07, 0.6, -0.24], [-0.07, 0.6, -0.24]]) strip(r, T, x * b, y, z * b, 0.05, [0.24, 0.22, 0.2, 0.16], ghost, { spring: { ...RIBBON, k: 16, drag: 0.3, flutter: 0.3 }, lx: [-0.2, 1.7], taper: 0.7, th: 0.015 });
      strip(r, H, 0, 0.34, -0.12, 0.05, [0.22, 0.18, 0.14], ghost, { spring: { ...RIBBON, k: 16, drag: 0.3, flutter: 0.3 }, rx: 0.8, lx: [-0.3, 1.5], taper: 0.7, th: 0.015 });
    },
    // Blade Cloak: long blade-shaped feathers of metal hanging in ranks down the back, a ruff of quills at the
    // neck, a beaked hood with a hooked brim
    raven(r, M, T, H) {
      const { bulk: b } = r.dims; rogueHead(r, M, H);
      B(H, 0.31, 0.3, 0.31, M.main, 0, 0.2, -0.02); for (const s of [1, -1]) B(H, 0.05, 0.26, 0.13, M.main, s * 0.135, 0.16, 0.12);
      B(H, 0.1, 0.05, 0.12, M.trim, 0, 0.35, 0.15, -0.5); K(H, 0.035, 0.1, M.trim, 0, 0.32, 0.23, PI * 0.62, 0, 0);
      for (let k = 0; k < 11; k++) { const a = -PI * 0.8 + (k / 10) * PI * 1.6, x = Math.sin(a) * 0.22 * b, z = Math.cos(a) * 0.16 * b; K(T, 0.03, 0.18, k % 2 ? M.trim : M.main, x, 0.76, z, -Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); }
      for (let row = 0; row < 3; row++) for (let k = 0; k < 6 - row; k++) {
        const x = (-0.2 + row * 0.04 + k * 0.08) * b;
        strip(r, T, x, 0.62 - row * 0.2, -(0.18 + row * 0.01) * b, 0.07, [0.22 + row * 0.04, 0.12], row % 2 ? M.trim : M.main, { trim: row === 2 ? M.glow : null, lx: [-0.1, 1.1], taper: 0.3, th: 0.02, rz: (k - (5 - row) / 2) * 0.05 });
      }
    },
  },
  mask: {
    // Gas-Mask: two round lit goggles in heavy rims, a snout filter canister, hoses curling down to the collar
    wrap(r, M, H, T) {
      B(H, 0.22, 0.2, 0.03, M.main, 0, 0.15, 0.158);
      for (const s of [1, -1]) { C(H, 0.045, 0.045, 0.04, M.trim, s * 0.055, 0.2, 0.17, PI / 2, 0, 0, 8); C(H, 0.032, 0.032, 0.02, M.glow, s * 0.055, 0.2, 0.19, PI / 2, 0, 0, 8); }
      C(H, 0.05, 0.06, 0.08, M.trim, 0, 0.09, 0.2, PI / 2 + 0.3, 0, 0, 8); C(H, 0.052, 0.052, 0.02, M.detail, 0, 0.08, 0.24, PI / 2 + 0.3, 0, 0, 8);
      for (const s of [1, -1]) { B(H, 0.03, 0.03, 0.14, M.detail, s * 0.07, 0.04, 0.14, 0.9, s * 0.3); }
      B(H, 0.3, 0.025, 0.32, M.detail, 0, 0.2, -0.0);
    },
    // Slit-Visor: a flat sloped faceplate with a single lit slit, a framed edge and a riveted chin
    iron(r, M, H, T) {
      B(H, 0.24, 0.26, 0.04, M.main, 0, 0.17, 0.16, -0.1);
      for (const [w, h, x, y] of [[0.25, 0.02, 0, 0.3], [0.02, 0.26, 0.12, 0.17], [0.02, 0.26, -0.12, 0.17]]) B(H, w, h, 0.045, M.trim, x, y, 0.162, -0.1);
      B(H, 0.2, 0.03, 0.02, M.detail, 0, 0.21, 0.183, -0.1); B(H, 0.18, 0.015, 0.02, M.glow, 0, 0.21, 0.188, -0.1);
      B(H, 0.16, 0.06, 0.06, M.main, 0, 0.06, 0.16); for (const x of [-0.05, 0, 0.05]) B(H, 0.02, 0.02, 0.02, M.detail, x, 0.06, 0.195);
    },
    // Skull Face: a cracked skull plate with one big lit optic in a brass housing, the other socket dark, a row
    // of teeth
    bone(r, M, H, T) {
      const bone = colorMat(r, M.mainId, 0xd8d0bc);
      B(H, 0.2, 0.18, 0.03, bone, 0, 0.19, 0.163); B(H, 0.14, 0.06, 0.03, bone, 0, 0.07, 0.165);
      B(H, 0.05, 0.045, 0.02, basic(0x0a0404), -0.05, 0.2, 0.18);
      C(H, 0.04, 0.045, 0.06, M.trim, 0.05, 0.2, 0.19, PI / 2, 0, 0, 8); C(H, 0.028, 0.028, 0.02, M.glow, 0.05, 0.2, 0.225, PI / 2, 0, 0, 8);
      B(H, 0.02, 0.04, 0.03, basic(0x0a0404), 0, 0.14, 0.18);
      for (let i = 0; i < 5; i++) B(H, 0.018, 0.03, 0.02, i % 2 ? M.detail : bone, -0.04 + i * 0.02, 0.1, 0.18);
      B(H, 0.01, 0.08, 0.034, M.detail, -0.035, 0.26, 0.17, 0, 0, 0.5);
    },
    // Fox Sensor: a pointed visor with two tall sensor fins for ears, slanted lit eyes, a long snout, markings
    kitsune(r, M, H, T) {
      const white = colorMat(r, M.mainId, 0xf0eadc);
      B(H, 0.22, 0.16, 0.03, white, 0, 0.19, 0.162); B(H, 0.1, 0.06, 0.1, white, 0, 0.1, 0.2, 0.15); B(H, 0.04, 0.03, 0.03, M.detail, 0, 0.11, 0.26);
      for (const s of [1, -1]) {
        const e = pivot(H, s * 0.1, 0.3, 0.06, -0.2, 0, -s * 0.25); B(e, 0.06, 0.18, 0.03, white, 0, 0.09, 0); B(e, 0.03, 0.12, 0.035, M.trim, 0, 0.08, 0.005); B(e, 0.02, 0.03, 0.035, M.glow, 0, 0.17, 0.005);
        B(H, 0.07, 0.018, 0.02, M.glow, s * 0.055, 0.2, 0.18, 0, 0, s * 0.35); B(H, 0.012, 0.07, 0.035, M.trim, s * 0.085, 0.15, 0.18, 0, 0, s * 0.5);
      }
    },
  },
  shirt: {
    // Webbing Rig: an X of webbing across the chest loaded with pouches, a vox box with a lit diode, wraps on the
    // forearms and shins
    jerkin(r, M, T) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      for (const s of [1, -1]) B(T, 0.05, 0.56, 0.02, M.detail, 0, 0.4, f + 0.005, 0, 0, s * 0.6);
      for (const [x, y] of [[-0.1, 0.32], [0.1, 0.32], [-0.12, 0.5], [0.12, 0.5]]) B(T, 0.08, 0.09, 0.04, M.trim, x * b, y, f + 0.02);
      B(T, 0.07, 0.08, 0.04, M.detail, 0.08, 0.6, f + 0.02); B(T, 0.02, 0.02, 0.02, M.glow, 0.09, 0.62, f + 0.045);
      B(T, 0.4 * b, 0.06, 0.27 * b, M.detail, 0, 0.07, 0); for (const s of [1, -1]) B(T, 0.08, 0.1, 0.07, M.trim, s * 0.16, 0.03, 0.09);
      for (const L of [true, false]) { for (const y of [-0.07, -0.15, -0.23]) B(fore(r, L), 0.125 * b, 0.035, 0.135 * b, M.trim, 0, y, 0, 0, 0, 0.12); for (const y of [-0.1, -0.2, -0.3]) B(shin(r, L), 0.14 * b, 0.035, 0.16 * b, M.trim, 0, y, 0, 0, 0, 0.1); }
    },
    // Flak Vest: a thick padded vest with a high collar, side plates, a segmented front and shoulder straps; flak
    // guards on the forearms
    brigandine(r, M, T) {
      const { bulk: b } = r.dims, f = 0.15 * b;
      B(T, 0.5 * b, 0.42, 0.31 * b, M.main, 0, 0.46, 0);
      for (let i = 0; i < 4; i++) B(T, 0.36 * b, 0.07, 0.02, i % 2 ? M.main : M.trim, 0, 0.6 - i * 0.085, f + 0.005);
      B(T, 0.34, 0.1, 0.33, M.main, 0, 0.72, -0.01); B(T, 0.35, 0.025, 0.34, M.trim, 0, 0.77, -0.01);
      for (const s of [1, -1]) { B(T, 0.03, 0.3, 0.3 * b, M.detail, s * 0.255 * b, 0.45, 0); B(T, 0.025, 0.025, 0.02, M.glow, s * 0.12 * b, 0.68, f + 0.005); }
      B(T, 0.42 * b, 0.06, 0.28 * b, M.detail, 0, 0.07, 0);
      for (const L of [true, false]) { B(fore(r, L), 0.14 * b, 0.17, 0.15 * b, M.main, 0, -0.18, 0); B(fore(r, L), 0.145 * b, 0.02, 0.155 * b, M.trim, 0, -0.1, 0); }
    },
    // Sash & Bandolier: a wide sash over one shoulder with a hanging tail, a bandolier of six knives in sheaths
    // with lit pommels the other way, a wound waist cloth
    assassin(r, M, T) {
      const { bulk: b } = r.dims, f = 0.14 * b;
      B(T, 0.1, 0.6, 0.02, M.trim, 0, 0.4, f + 0.005, 0, 0, -0.62); strip(r, T, 0.18 * b, 0.14, f - 0.01, 0.08, [0.18, 0.14], M.trim, { spring: RIBBON, lx: [-1, 0.3], th: 0.015 });
      B(T, 0.04, 0.6, 0.02, M.detail, 0, 0.4, f + 0.015, 0, 0, 0.62);
      for (let k = 0; k < 6; k++) { const x = -0.17 + k * 0.068, y = 0.64 - k * 0.075; B(T, 0.03, 0.11, 0.025, M.detail, x * b, y, f + 0.03, 0, 0, 0.62); B(T, 0.02, 0.025, 0.02, M.glow, x * b - 0.03, y + 0.05, f + 0.035); }
      for (let i = 0; i < 3; i++) B(T, (0.42 - i * 0.01) * b, 0.035, 0.28 * b, i % 2 ? M.trim : M.main, 0, 0.12 - i * 0.04, 0, 0, 0, (i - 1) * 0.06);
      for (const L of [true, false]) for (const y of [-0.08, -0.18]) B(fore(r, L), 0.13 * b, 0.05, 0.14 * b, M.main, 0, y, 0);
    },
    // Bodyglove: a tight ribbed suit with lit circuit lines down the chest, arms and legs, a hard collar
    shadowweave(r, M, T) {
      const { bulk: b } = r.dims, f = 0.137 * b;
      B(T, 0.47 * b, 0.4, 0.28 * b, M.main, 0, 0.46, 0);
      for (let i = 0; i < 5; i++) B(T, 0.12, 0.012, 0.01, M.detail, 0, 0.32 + i * 0.06, f + 0.008);
      for (const s of [1, -1]) { B(T, 0.012, 0.3, 0.01, M.glow, s * 0.1 * b, 0.46, f + 0.01); B(T, 0.08, 0.012, 0.01, M.glow, s * 0.06 * b, 0.6, f + 0.01); B(T, 0.012, 0.1, 0.01, M.glow, s * 0.03, 0.3, f + 0.01, 0, 0, s * 0.6); }
      B(T, 0.3, 0.07, 0.3, M.trim, 0, 0.72, -0.01);
      for (const L of [true, false]) { B(fore(r, L), 0.012, 0.26, 0.01, M.glow, 0, -0.16, 0.07 * b); B(shin(r, L), 0.012, 0.36, 0.01, M.glow, 0.05, -0.2, 0.085 * b); B(fore(r, L), 0.13 * b, 0.04, 0.14 * b, M.trim, 0, -0.28, 0); }
    },
  },
  band: {
    // Wraps: cloth wound in a spiral from elbow to shoulder, a loose end flying
    cloth(r, M, arm) {
      const { bulk: b } = r.dims;
      for (let i = 0; i < 4; i++) B(arm, 0.135 * b, 0.035, 0.145 * b, i % 2 ? M.trim : M.main, 0, -0.08 - i * 0.05, 0, 0, 0, 0.18);
      B(arm, 0.04, 0.04, 0.04, M.detail, 0.075 * b, -0.2, 0.02);
      strip(r, arm, 0.075 * b, -0.2, 0.02, 0.03, [0.12, 0.1], M.trim, { spring: RIBBON, lx: [-0.3, 0.8], th: 0.012 });
    },
    // Data Bracer: a hard housing with a lit screen, three keys and a cable
    bracer(r, M, arm) {
      const { bulk: b } = r.dims;
      B(arm, 0.145 * b, 0.14, 0.155 * b, M.main, 0, -0.18, 0); B(arm, 0.15 * b, 0.02, 0.16 * b, M.trim, 0, -0.11, 0);
      B(arm, 0.02, 0.08, 0.1, M.detail, 0.078 * b, -0.18, 0); B(arm, 0.02, 0.06, 0.08, M.glow, 0.085 * b, -0.18, 0);
      for (const y of [-0.13, -0.16, -0.19]) B(arm, 0.02, 0.018, 0.02, M.trim, 0.075 * b, y, -0.065);
      B(arm, 0.03, 0.12, 0.03, M.detail, 0, -0.06, -0.075 * b);
    },
    // Cable Serpent: a thick cable coiled round the arm, a serpent's head at the end with lit eyes
    serpent(r, M, arm) {
      const { bulk: b } = r.dims;
      for (let k = 0; k < 8; k++) { const a = k * 0.95, y = -0.06 - k * 0.025; B(arm, 0.04, 0.03, 0.05, k % 2 ? M.trim : M.main, Math.cos(a) * 0.072 * b, y, Math.sin(a) * 0.078 * b, 0, -a, 0); }
      const hd = pivot(arm, 0.075 * b, -0.27, 0.03); B(hd, 0.05, 0.035, 0.08, M.main, 0, 0, 0.02); B(hd, 0.045, 0.012, 0.05, M.detail, 0, -0.02, 0.03);
      for (const x of [-0.015, 0.015]) B(hd, 0.012, 0.012, 0.012, M.glow, x, 0.015, 0.05);
    },
    // Wrist Blade: a housing on the outer arm with a long blade sliding out past the elbow, lit along its edge
    blade(r, M, arm) {
      const { bulk: b } = r.dims;
      B(arm, 0.15 * b, 0.1, 0.16 * b, M.main, 0, -0.2, 0); B(arm, 0.04, 0.16, 0.06, M.detail, 0.085 * b, -0.18, 0);
      B(arm, 0.015, 0.34, 0.05, M.trim, 0.1 * b, -0.04, 0); B(arm, 0.017, 0.3, 0.012, M.glow, 0.1 * b, -0.05, 0.028);
      K(arm, 0.02, 0.08, M.trim, 0.1 * b, 0.17, 0, 0, 0, 0, 4);
    },
  },
  // knives: a factory (hand) => group; the tip sits at z 0.5, the base at 0.12 (set by the kit)
  knives: {
    // Mono-Knife: a straight tanto with a chisel point and a lit mono-edge, a ribbed grip
    curved(r, M) {
      return (hand) => {
        const g = new THREE.Group(); hand.add(g);
        B(g, 0.04, 0.045, 0.15, M.trim, 0, 0, 0); for (const z of [-0.05, -0.01, 0.03]) B(g, 0.046, 0.05, 0.012, M.detail, 0, 0, z);
        B(g, 0.06, 0.06, 0.03, M.detail, 0, 0, -0.09); B(g, 0.08, 0.07, 0.025, M.detail, 0, 0, 0.085);
        B(g, 0.02, 0.07, 0.3, M.main, 0, 0.005, 0.25); B(g, 0.02, 0.05, 0.08, M.main, 0, 0.015, 0.43, -0.45);
        B(g, 0.022, 0.012, 0.36, M.glow, 0, -0.03, 0.28);
        return g;
      };
    },
    // Needle Spike: a long square needle with a ring guard, a lit band, a weighted pommel
    stiletto(r, M) {
      return (hand) => {
        const g = new THREE.Group(); hand.add(g);
        B(g, 0.035, 0.035, 0.15, M.detail, 0, 0, 0); ring(g, 0.04, 0.01, M.trim, 0, 0, 0.09, 0, 0, 8);
        C(g, 0.035, 0.035, 0.05, M.trim, 0, 0, -0.1, PI / 2, 0, 0, 6);
        K(g, 0.016, 0.44, M.main, 0, 0, 0.32, PI / 2, PI / 4, 0); B(g, 0.03, 0.03, 0.02, M.glow, 0, 0, 0.13);
        return g;
      };
    },
    // Phase Emitter: a hilt with two prongs holding a blade of light between them
    spectral(r, M) {
      return (hand) => {
        const g = new THREE.Group(); hand.add(g);
        C(g, 0.025, 0.025, 0.16, M.detail, 0, 0, 0, PI / 2, 0, 0, 6); B(g, 0.07, 0.05, 0.04, M.main, 0, 0, 0.09);
        for (const s of [1, -1]) B(g, 0.015, 0.015, 0.14, M.trim, 0, s * 0.03, 0.17);
        B(g, 0.016, 0.04, 0.34, M.glow, 0, 0, 0.29); K(g, 0.02, 0.06, M.glow, 0, 0, 0.49, PI / 2, PI / 4, 0);
        return g;
      };
    },
    // Chain Fang: a hooked blade with a running row of teeth down both edges, a knuckle guard
    fang(r, M) {
      return (hand) => {
        const g = new THREE.Group(); hand.add(g);
        B(g, 0.04, 0.04, 0.14, M.detail, 0, 0, 0); B(g, 0.02, 0.1, 0.02, M.trim, 0, -0.05, 0, 0, 0, 0); B(g, 0.02, 0.02, 0.14, M.trim, 0, -0.1, 0);
        B(g, 0.022, 0.08, 0.3, M.main, 0, 0.005, 0.24); B(g, 0.02, 0.05, 0.12, M.main, 0, 0.04, 0.42, -0.5);
        for (let k = 0; k < 6; k++) { B(g, 0.026, 0.02, 0.025, M.detail, 0, -0.05, 0.12 + k * 0.05); B(g, 0.026, 0.015, 0.02, M.glow, 0, 0.05, 0.14 + k * 0.045); }
        return g;
      };
    },
  },
};

// ======================= ADEPT =======================
const leg = (r, L) => r.j[L ? 'legL' : 'legR'];
const oct = (p, s, m, x, y, z) => { const k = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), m); k.position.set(x, y, z); p.add(k); return k; };
export const MAGE_ARMORY = {
  shoulder: {
    // Psy-Collar: a tall stiff collar rising behind the head, lit nodes up its edge, small caps on both shoulders
    mantle(r, M, T, rune, H) {
      const { bulk: b, sw } = r.dims;
      for (const s of [1, -1]) { B(T, 0.06, 0.34, 0.2, M.main, s * 0.15, 0.86, -0.08, 0.15, 0, s * -0.3); B(T, 0.065, 0.02, 0.21, M.trim, s * 0.2, 1.02, -0.06, 0.15, 0, s * -0.3); for (let i = 0; i < 3; i++) B(T, 0.02, 0.03, 0.03, M.glow, s * (0.17 + i * 0.012), 0.78 + i * 0.08, 0.03, 0, 0, 0); }
      B(T, 0.3, 0.34, 0.05, M.main, 0, 0.86, -0.17, -0.15); B(T, 0.31, 0.02, 0.06, M.trim, 0, 1.02, -0.19, -0.15);
      for (const s of [1, -1]) { const pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.3); B(pv, 0.2 * b, 0.07, 0.26 * b, M.detail, s * 0.02, 0, 0); B(pv, 0.21 * b, 0.02, 0.27 * b, M.trim, s * 0.02, -0.035, 0); }
    },
    // Coil Pauldron: one great rounded pauldron on the casting arm wound in copper coils, a lit node, a cable
    // to the spine; a plain cap on the other
    pauldron(r, M, T, rune) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, -sw, 0.68, 0, 0, 0, 0.3);
      C(pv, 0.15 * b, 0.17 * b, 0.12, M.main, -0.02, 0.02, 0, 0, 0, 0, 8); C(pv, 0.12 * b, 0.15 * b, 0.06, M.main, -0.02, 0.1, 0, 0, 0, 0, 8);
      for (let i = 0; i < 4; i++) ring(pv, 0.16 * b, 0.014, M.trim, -0.02, -0.03 + i * 0.035, 0, PI / 2, 0, 10);
      oct(pv, 0.04, M.glow, -0.02, 0.16, 0); B(pv, 0.03, 0.03, 0.22, M.detail, 0.06, 0.06, -0.12, 0.6, 0, 0);
      const o = pivot(T, sw, 0.68, 0, 0, 0, -0.3); B(o, 0.2 * b, 0.07, 0.26 * b, M.main, 0.02, 0, 0); B(o, 0.21 * b, 0.02, 0.27 * b, M.trim, 0.02, -0.035, 0);
    },
    // Crystal Array: an emitter cap on each shoulder with crystals floating and turning above it
    crystal(r, M, T, rune) {
      const { bulk: b, sw } = r.dims;
      for (const s of [1, -1]) {
        const pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.3); B(pv, 0.2 * b, 0.06, 0.24 * b, M.main, s * 0.02, 0, 0); ring(pv, 0.07, 0.015, M.trim, s * 0.02, 0.04, 0, PI / 2, 0, 10); B(pv, 0.05, 0.02, 0.05, M.detail, s * 0.02, 0.04, 0);
        const orb = pivot(pv, s * 0.02, 0.2, 0);
        for (let k = 0; k < 3; k++) { const a = (k / 3) * PI * 2, c = K(orb, 0.035, 0.13, M.glow, Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09); c.rotation.set(0.3 * Math.sin(a), 0, 0.3 * Math.cos(a)); }
        oct(orb, 0.035, M.trim, 0, 0.02, 0);
        r.spinners.push({ obj: orb, axis: 'y', speed: s * 1.6 });
      }
    },
    // Flame Vanes: three tall swept vanes rising behind each shoulder like burning wings, lit along their edges
    phoenix(r, M, T, rune) {
      const { bulk: b, sw } = r.dims;
      for (const s of [1, -1]) {
        const pv = pivot(T, s * (sw - 0.04), 0.7, -0.14 * b, -0.3, 0, -s * 0.2); B(pv, 0.18 * b, 0.08, 0.2 * b, M.detail, 0, 0, 0.06);
        for (let i = 0; i < 3; i++) { const v = pivot(pv, s * 0.03 * i, 0.02, -0.02, -0.2 - i * 0.12, 0, -s * (0.25 + i * 0.35)); B(v, 0.03, 0.34 - i * 0.07, 0.08, M.main, 0, (0.34 - i * 0.07) / 2, 0); B(v, 0.035, 0.34 - i * 0.07, 0.02, M.glow, 0, (0.34 - i * 0.07) / 2, -0.045); K(v, 0.03, 0.08, M.trim, 0, 0.36 - i * 0.07, 0); }
      }
    },
  },
  shirt: {
    // Circuit Greatcoat: a long coat with wide lapels and a belt, front skirts to the knee traced with lit circuits
    runecoat(r, M, T, rune, hips) {
      const { bulk: b } = r.dims, f = 0.142 * b;
      B(T, 0.48 * b, 0.42, 0.29 * b, M.main, 0, 0.47, 0);
      for (const s of [1, -1]) { B(T, 0.05, 0.3, 0.03, M.trim, s * 0.06, 0.5, f + 0.01, 0, 0, s * 0.3); B(T, 0.012, 0.18, 0.01, M.glow, s * 0.14 * b, 0.38, f + 0.005); B(T, 0.05, 0.012, 0.01, M.glow, s * 0.12 * b, 0.47, f + 0.005); }
      B(T, 0.34, 0.12, 0.32, M.main, 0, 0.74, -0.02); B(T, 0.42 * b, 0.06, 0.27 * b, M.detail, 0, 0.08, 0); B(T, 0.06, 0.05, 0.03, M.trim, 0, 0.08, f);
      for (const s of [1, -1]) {
        const segs = strip(r, hips, s * 0.1 * b, -0.02, 0.14 * b, 0.17 * b, [0.28, 0.24], M.main, { trim: M.trim, lx: [-1.0, 0.06] });
        segs[0].add(box(0.012, 0.2, 0.012, M.glow, -s * 0.03, -0.12, 0.02)); segs[0].add(box(0.05, 0.012, 0.012, M.glow, -s * 0.01, -0.22, 0.02));
        strip(r, hips, s * 0.1 * b, -0.02, -0.14 * b, 0.19 * b, [0.3, 0.28], M.main, { trim: M.trim, lx: [-0.06, 1.1] });
      }
      for (const L of [true, false]) { B(fore(r, L), 0.14 * b, 0.07, 0.15 * b, M.trim, 0, -0.26, 0); }
    },
    // Choir Robe: a long robe to the ankles under a deep hood thrown back, wide sleeves, a rope belt with a
    // lit censer charm, a glowing hem
    robe(r, M, T, rune, hips) {
      const { bulk: b } = r.dims;
      B(T, 0.5 * b, 0.42, 0.3 * b, M.main, 0, 0.47, 0);
      B(T, 0.3, 0.16, 0.14, M.main, 0, 0.66, -0.2 * b, -0.3); B(T, 0.32, 0.02, 0.15, M.trim, 0, 0.74, -0.18 * b, -0.3);
      B(T, 0.04, 0.4, 0.02, M.trim, 0, 0.47, 0.152 * b);
      B(T, 0.42 * b, 0.04, 0.28 * b, M.detail, 0, 0.1, 0); strip(r, T, 0.08, 0.1, 0.14 * b, 0.025, [0.16, 0.1], M.detail, { spring: RIBBON, lx: [-0.8, 0.3], th: 0.02 });
      const ch = pivot(T, -0.1, 0.06, 0.15 * b); B(ch, 0.05, 0.06, 0.05, M.trim, 0, -0.03, 0); B(ch, 0.03, 0.03, 0.055, M.glow, 0, -0.03, 0);
      for (const [x, z, ry] of [[0, 0.14, 0], [0, -0.14, 0], [0.18, 0, 1.4], [-0.18, 0, -1.4]]) {
        const segs = strip(r, hips, x * b, 0, z * b, 0.26, [0.36, 0.3], M.main, { trim: M.glow, ry, lx: z > 0 ? [-0.9, 0.1] : [-0.1, 0.9], taper: 1.1 });
      }
      for (const L of [true, false]) { B(fore(r, L), 0.19 * b, 0.16, 0.2 * b, M.main, 0, -0.24, 0); B(fore(r, L), 0.2 * b, 0.02, 0.21 * b, M.trim, 0, -0.32, 0); }
    },
    // Void Cape: a fitted tunic, and from both shoulders a long cape whose inside is the void, stars burning in it
    starcape(r, M, T, rune, hips) {
      const { bulk: b } = r.dims, f = 0.142 * b;
      B(T, 0.47 * b, 0.4, 0.28 * b, M.main, 0, 0.47, 0); B(T, 0.47 * b, 0.03, 0.29 * b, M.trim, 0, 0.3, 0);
      for (let i = 0; i < 3; i++) B(T, 0.03, 0.03, 0.02, M.glow, 0, 0.42 + i * 0.07, f + 0.005);
      B(T, 0.42 * b, 0.06, 0.27 * b, M.detail, 0, 0.08, 0);
      for (const s of [1, -1]) { B(T, 0.1, 0.06, 0.06, M.trim, s * 0.2 * b, 0.7, 0.05); B(T, 0.04, 0.04, 0.02, M.glow, s * 0.2 * b, 0.7, 0.085); }
      const stars = [[-0.05, -0.08], [0.06, -0.18], [-0.02, -0.3], [0.04, -0.06], [-0.06, -0.22], [0.02, -0.12]];
      for (const s of [1, -1]) {
        const segs = strip(r, T, s * 0.12 * b, 0.68, -0.16 * b, 0.22 * b, [0.42, 0.4, 0.28], M.detail, { trim: M.trim, ry: s * 0.08, lx: [-0.1, 1.25], lx2: [-0.3, 0.7], taper: 0.9 });
        segs.forEach((pv, i) => stars.forEach(([x, y], k) => { if ((k + i) % 2 === 0) pv.add(box(0.02, 0.02, 0.03, M.glow, x * s, y, 0)); }));
      }
    },
    // Magos Robe: a red-priest robe with a cog plate on the chest, a cable spine, and mechadendrite cables
    // falling from the back of the skull like dreadlocks
    archmage(r, M, T, rune, hips) {
      const { bulk: b } = r.dims, f = 0.145 * b, H = r.j.head;
      B(T, 0.5 * b, 0.42, 0.3 * b, M.main, 0, 0.47, 0); B(T, 0.36, 0.12, 0.34, M.trim, 0, 0.73, -0.02);
      const cog = pivot(T, 0, 0.5, f + 0.01); C(cog, 0.08, 0.08, 0.025, M.trim, 0, 0, 0, PI / 2, 0, 0, 10);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2; B(cog, 0.03, 0.03, 0.025, M.trim, Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0); }
      C(cog, 0.035, 0.035, 0.03, M.glow, 0, 0, 0.01, PI / 2, 0, 0, 8);
      for (let i = 0; i < 5; i++) B(T, 0.08, 0.04, 0.04, M.detail, 0, 0.66 - i * 0.12, -0.16 * b);
      for (const [x, z, ry] of [[0, 0.14, 0], [0, -0.14, 0], [0.18, 0, 1.4], [-0.18, 0, -1.4]]) strip(r, hips, x * b, 0, z * b, 0.26, [0.38, 0.32], M.main, { trim: M.trim, ry, lx: z > 0 ? [-0.9, 0.1] : [-0.1, 0.9], taper: 1.08 });
      for (let k = 0; k < 6; k++) { const a = -0.8 + k * 0.32; strip(r, H, Math.sin(a) * 0.12, 0.26, -0.12 + Math.abs(Math.sin(a)) * 0.03, 0.03, [0.16, 0.14, 0.1], M.detail, { trim: k % 2 ? M.glow : null, rz: a * 0.4, lx: [-0.3, 1.2], th: 0.03, taper: 0.9 }); }
      for (const L of [true, false]) { B(fore(r, L), 0.18 * b, 0.14, 0.19 * b, M.main, 0, -0.24, 0); B(fore(r, L), 0.185 * b, 0.025, 0.195 * b, M.trim, 0, -0.31, 0); }
    },
  },
  pants: {
    // Fatigues: cargo pockets on the thighs, knee pads, the trousers tucked into lace boots
    trousers(r, M) {
      const { bulk: b } = r.dims;
      for (const L of [true, false]) { const lg = leg(r, L), sh = shin(r, L), s = L ? 1 : -1;
        B(lg, 0.04, 0.1, 0.1, M.detail, s * 0.075 * b, -0.24, 0.0); B(lg, 0.045, 0.02, 0.105, M.trim, s * 0.075 * b, -0.19, 0);
        B(sh, 0.13 * b, 0.1, 0.06, M.trim, 0, -0.02, 0.07); B(sh, 0.03, 0.03, 0.02, M.glow, 0, -0.02, 0.1);
        B(sh, 0.15 * b, 0.16, 0.17 * b, M.detail, 0, -0.36, 0.0); for (const y of [-0.31, -0.35, -0.39]) B(sh, 0.04, 0.01, 0.02, M.trim, 0, y, 0.09 * b); }
    },
    // Greaved Boots: tall boots with a shaped greave over each shin, a lit knee gem in a socket, a heavy sole
    greaves(r, M) {
      const { bulk: b } = r.dims;
      for (const L of [true, false]) { const sh = shin(r, L);
        B(sh, 0.15 * b, 0.36, 0.17 * b, M.detail, 0, -0.27, 0); B(sh, 0.13 * b, 0.32, 0.04, M.main, 0, -0.24, 0.08); K(sh, 0.06, 0.08, M.main, 0, -0.42, 0.09, PI, PI / 4, 0);
        B(sh, 0.1, 0.09, 0.05, M.trim, 0, -0.04, 0.08); oct(sh, 0.025, M.glow, 0, -0.04, 0.11);
        B(sh, 0.17 * b, 0.04, 0.24 * b, M.trim, 0, -r.dims.shin + 0.02, 0.03); }
    },
    // Circuit Leggings: tight leggings with lit circuit traces running down the outside and the shins, ribbed
    // knees, slipper boots
    runed(r, M) {
      const { bulk: b } = r.dims;
      for (const L of [true, false]) { const lg = leg(r, L), sh = shin(r, L), s = L ? 1 : -1;
        B(lg, 0.012, 0.36, 0.012, M.glow, s * 0.07 * b, -0.2, 0.02); B(lg, 0.04, 0.012, 0.012, M.glow, s * 0.055 * b, -0.1, 0.02);
        for (let i = 0; i < 3; i++) B(sh, 0.135 * b, 0.015, 0.15 * b, M.trim, 0, -0.01 - i * 0.03, 0);
        B(sh, 0.012, 0.3, 0.012, M.glow, 0, -0.22, 0.08 * b); B(sh, 0.012, 0.012, 0.06, M.glow, 0, -0.08, 0.06 * b);
        B(sh, 0.145 * b, 0.08, 0.2 * b, M.detail, 0, -r.dims.shin + 0.04, 0.02); }
    },
    // Astral Leggings: two rings turning round each shin like orbits, a planet bead on each, a lit anklet
    astral(r, M) {
      const { bulk: b } = r.dims;
      for (const L of [true, false]) { const sh = shin(r, L);
        for (let i = 0; i < 2; i++) { const o = pivot(sh, 0, -0.12 - i * 0.14, 0, 0.3 - i * 0.6, 0, 0.2); ring(o, 0.12, 0.008, M.trim, 0, 0, 0, PI / 2, 0, 14); oct(o, 0.022, M.glow, 0.12, 0, 0); r.spinners.push({ obj: o, axis: 'y', speed: (L ? 1 : -1) * (1.6 + i) }); }
        B(sh, 0.15 * b, 0.03, 0.17 * b, M.glow, 0, -0.4, 0); B(sh, 0.14 * b, 0.06, 0.2 * b, M.detail, 0, -r.dims.shin + 0.03, 0.02); }
    },
  },
  // the wand in her casting hand (right): returns [tip z, base z] as before
  wand: {
    // Focus Rod: a rod ending in three prongs that cradle a lit focus
    rune(r, M, g) {
      C(g, 0.022, 0.026, 0.34, M.main, 0, 0, 0.1, PI / 2, 0, 0, 6); B(g, 0.05, 0.05, 0.03, M.trim, 0, 0, -0.06); B(g, 0.05, 0.05, 0.03, M.detail, 0, 0, 0.12);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * PI * 2; B(g, 0.015, 0.015, 0.12, M.trim, Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.32, Math.sin(a) * 0.3, -Math.cos(a) * 0.3, 0); }
      oct(g, 0.045, M.glow, 0, 0, 0.38);
      return [0.42, 0.0];
    },
    // Bone Fetish: a femur wired with cable, knuckle bones, a small skull at the tip with lit eyes
    bone(r, M, g) {
      const bone = colorMat(r, M.mainId, 0xd8d0bc);
      B(g, 0.04, 0.04, 0.34, bone, 0, 0, 0.12); B(g, 0.06, 0.06, 0.04, bone, 0, 0, -0.05);
      for (const z of [0.02, 0.1, 0.18]) B(g, 0.05, 0.015, 0.05, M.detail, 0, 0, z, 0, 0, 0.4);
      B(g, 0.08, 0.08, 0.08, bone, 0, 0.01, 0.34); B(g, 0.06, 0.03, 0.05, bone, 0, -0.03, 0.38);
      for (const s of [1, -1]) B(g, 0.02, 0.02, 0.02, M.glow, s * 0.02, 0.025, 0.38);
      strip(r, pivot(g, 0, 0, 0.26), 0, 0, 0, 0.02, [0.08, 0.06], M.trim, { rx: PI / 2, spring: RIBBON, lx: [-0.6, 0.6], th: 0.012 });
      return [0.42, 0.0];
    },
    // Star Emitter: an antenna rod with a small dish, star nodes turning round its tip
    starfall(r, M, g) {
      B(g, 0.03, 0.03, 0.36, M.main, 0, 0, 0.1); B(g, 0.045, 0.045, 0.06, M.detail, 0, 0, -0.04);
      C(g, 0.07, 0.02, 0.03, M.trim, 0, 0, 0.3, PI / 2, 0, 0, 8); oct(g, 0.03, M.glow, 0, 0, 0.36);
      const orbit = pivot(g, 0, 0, 0.36); for (let k = 0; k < 3; k++) { const a = (k / 3) * PI * 2; oct(orbit, 0.018, M.glow, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0); }
      r.spinners.push({ obj: orbit, axis: 'z', speed: 3.5 });
      return [0.4, 0.0];
    },
    // Plasma Torch: a fuel canister for a grip, a ribbed barrel and a nozzle breathing a tongue of plasma
    ember(r, M, g) {
      C(g, 0.04, 0.04, 0.16, M.main, 0, 0, 0.0, PI / 2, 0, 0, 8); for (const z of [-0.05, 0.05]) ring(g, 0.042, 0.008, M.trim, 0, 0, z, 0, 0, 8);
      C(g, 0.025, 0.025, 0.2, M.detail, 0, 0, 0.18, PI / 2, 0, 0, 6); C(g, 0.035, 0.025, 0.05, M.trim, 0, 0, 0.3, PI / 2, 0, 0, 6);
      K(g, 0.03, 0.12, M.glow, 0, 0, 0.38, PI / 2, 0, 0); oct(g, 0.022, M.glow, 0, 0, 0.34);
      return [0.44, 0.0];
    },
  },
  // the sword in her fighting hand (left): returns the blade length as before
  sword: {
    // Power Blade: a field grip with two emitter prongs and a blade of light between them
    runeblade(r, M, g) {
      B(g, 0.045, 0.045, 0.18, M.detail, 0, 0, 0); B(g, 0.06, 0.06, 0.04, M.trim, 0, 0, -0.11);
      B(g, 0.08, 0.06, 0.06, M.main, 0, 0, 0.11); for (const s of [1, -1]) B(g, 0.015, 0.02, 0.16, M.trim, 0, s * 0.04, 0.2);
      B(g, 0.025, 0.065, 0.58, M.glow, 0, 0, 0.43); K(g, 0.04, 0.07, M.glow, 0, 0, 0.74, PI / 2, PI / 4, 0);
      return 0.72;
    },
    // Arming Sword: a plain steel blade, a straight cross with lit ends, a lit fuller
    steel(r, M, g) {
      B(g, 0.04, 0.04, 0.16, M.detail, 0, 0, 0); B(g, 0.05, 0.05, 0.04, M.trim, 0, 0, -0.1);
      B(g, 0.2, 0.035, 0.035, M.trim, 0, 0, 0.09); for (const s of [1, -1]) B(g, 0.025, 0.04, 0.04, M.glow, s * 0.1, 0, 0.09);
      B(g, 0.022, 0.07, 0.52, M.main, 0, 0, 0.37); K(g, 0.05, 0.09, M.main, 0, 0, 0.66, PI / 2, PI / 4, 0); B(g, 0.024, 0.014, 0.4, M.glow, 0, 0, 0.33);
      return 0.68;
    },
    // Moon Edge: a sickle hooking out from the hilt, its spine in trim and its edge lit
    moonblade(r, M, g) {
      B(g, 0.045, 0.045, 0.18, M.detail, 0, 0, 0); ring(g, 0.045, 0.012, M.trim, 0, 0, 0.1, 0, 0, 10);
      const mk = (R, t, m, dy) => { const geo = new THREE.TorusGeometry(R, t, 3, 12, 1.9); geo.rotateZ(-PI / 2); geo.rotateY(-PI / 2); geo.translate(0, R + dy, 0.12); const k = new THREE.Mesh(geo, m); k.scale.x = 0.6; g.add(k); };
      mk(0.32, 0.03, M.main, 0); mk(0.36, 0.012, M.glow, -0.04); mk(0.29, 0.012, M.trim, 0.02);
      return 0.62;
    },
    // Void Edge: a black jagged blade with a lit void core and barbs down the edge
    voidedge(r, M, g) {
      B(g, 0.045, 0.045, 0.18, M.detail, 0, 0, 0); B(g, 0.06, 0.07, 0.06, M.trim, 0, 0, 0.1); for (const s of [1, -1]) K(g, 0.025, 0.1, M.trim, 0, s * 0.07, 0.1, 0, 0, s > 0 ? 0 : PI);
      B(g, 0.03, 0.09, 0.6, M.main, 0, 0, 0.44); B(g, 0.032, 0.03, 0.56, M.glow, 0, 0, 0.44); K(g, 0.045, 0.1, M.main, 0, 0, 0.78, PI / 2, PI / 4, 0);
      for (let k = 0; k < 4; k++) K(g, 0.02, 0.06, M.main, 0, k % 2 ? 0.05 : -0.05, 0.28 + k * 0.12, k % 2 ? -0.6 : 0.6, 0, 0, 3);
      return 0.74;
    },
  },
};

// ================= the region weapons' skins (weapons.js), one slot each =================
// each builds into a group in the right hand, blade along +z, and returns [tip, base] for the swing trail
KNIGHT_ARMORY.greatsword = {
  // Dragon Slab: a slab of raw iron as tall as a man, a heavy chamfered tip, a plain wrapped grip and a block guard
  slab(r, M, g) {
    B(g, 0.06, 0.06, 0.52, M.detail, 0, 0, -0.08); B(g, 0.09, 0.09, 0.08, M.trim, 0, 0, -0.36);
    B(g, 0.16, 0.42, 0.1, M.trim, 0, 0, 0.22);
    B(g, 0.07, 0.36, 1.85, M.main, 0, 0, 1.2); B(g, 0.07, 0.26, 0.2, M.main, 0, -0.05, 2.2, 0.5);
    for (const z of [0.6, 1.1, 1.7]) B(g, 0.072, 0.04, 0.08, M.detail, 0, 0.12, z); // nicks and old rivets
    B(g, 0.074, 0.02, 1.7, M.detail, 0, -0.16, 1.15); // the edge, darker where it's been ground
    return [2.3, 0.35];
  },
  // Relic Slab: the slab with a reliquary housing at the cross, a burning seal and chained scripture
  relic(r, M, g) {
    KNIGHT_ARMORY.greatsword.slab(r, M, g);
    B(g, 0.18, 0.24, 0.2, M.trim, 0, 0, 0.42); B(g, 0.08, 0.08, 0.06, M.glow, 0.06, 0.06, 0.42);
    B(g, 0.03, 0.3, 0.03, M.detail, 0.06, -0.24, 0.42); B(g, 0.01, 0.16, 0.08, r.m(0xd8c8a0), 0.065, -0.42, 0.42);
    B(g, 0.075, 0.03, 1.5, M.glow, 0, 0.06, 1.25); // a channel burning up the flat
    return [2.3, 0.35];
  },
  // Molten Slab: black iron cracked open, lava glowing through
  molten(r, M, g) {
    KNIGHT_ARMORY.greatsword.slab(r, M, g);
    for (let i = 0; i < 7; i++) B(g, 0.076, 0.02, 0.22, M.glow, 0, -0.12 + ((i * 37) % 24) / 100, 0.5 + i * 0.25, 0, 0, 0.4 * (i % 2 ? 1 : -1));
    B(g, 0.12, 0.12, 0.12, M.glow, 0, 0, -0.4);
    return [2.3, 0.35];
  },
  // Void Slab: a jagged black edge with a violet void core and teeth along the back
  void(r, M, g) {
    B(g, 0.06, 0.06, 0.52, M.detail, 0, 0, -0.08); B(g, 0.2, 0.46, 0.08, M.trim, 0, 0, 0.22, 0, 0, 0.785);
    B(g, 0.07, 0.34, 1.9, M.main, 0, 0, 1.22); B(g, 0.074, 0.08, 1.7, M.glow, 0, 0, 1.2);
    for (let i = 0; i < 8; i++) K(g, 0.05, 0.14, M.trim, 0, 0.2, 0.4 + i * 0.22, 0, 0, 0);
    K(g, 0.17, 0.4, M.main, 0, 0, 2.3, PI / 2, 0, 0);
    return [2.4, 0.35];
  },
};
// the Wrist Blade: one short knife held point-down in the right fist, the blade lying back along the forearm (built
// along +z from the grip; playerkits.js turns it over into the reverse grip)
ROGUE_ARMORY.wristblade = {
  // Gutting Knife: a plain clip-point blade, a wrapped grip and a ring pommel to hook a finger through
  hidden(r, M, g) {
    B(g, 0.04, 0.045, 0.14, M.trim, 0, 0, 0); for (const z of [-0.045, -0.005, 0.035]) B(g, 0.046, 0.05, 0.012, M.detail, 0, 0, z);
    ring(g, 0.035, 0.01, M.detail, 0, 0, -0.1, PI / 2, 0, 8); B(g, 0.07, 0.055, 0.025, M.detail, 0, 0, 0.08);
    B(g, 0.018, 0.06, 0.22, M.main, 0, 0.004, 0.2); B(g, 0.018, 0.045, 0.07, M.main, 0, 0.012, 0.34, -0.5);
    B(g, 0.02, 0.012, 0.26, M.glow, 0, -0.026, 0.21);
    return [0.38, 0.1];
  },
  // Twin Prong: a forked blade, two narrow tines off one riveted grip
  twin(r, M, g) {
    B(g, 0.045, 0.05, 0.15, M.trim, 0, 0, 0); for (const z of [-0.04, 0.03]) B(g, 0.05, 0.02, 0.02, M.detail, 0, 0.03, z);
    B(g, 0.09, 0.06, 0.03, M.detail, 0, 0, 0.085);
    for (const s of [1, -1]) { B(g, 0.016, 0.03, 0.24, M.main, 0, s * 0.02, 0.21); K(g, 0.016, 0.06, M.main, 0, s * 0.02, 0.36, PI / 2, 0, 0); }
    return [0.38, 0.1];
  },
  // Phase Knife: a short emitter hilt and a blade of hard light
  phase(r, M, g) {
    B(g, 0.045, 0.045, 0.15, M.detail, 0, 0, 0); for (const z of [-0.04, 0.02]) C(g, 0.03, 0.03, 0.02, M.trim, 0, 0, z, PI / 2);
    B(g, 0.06, 0.07, 0.04, M.trim, 0, 0, 0.09);
    B(g, 0.022, 0.065, 0.28, M.glow, 0, 0, 0.24); K(g, 0.03, 0.06, M.glow, 0, 0, 0.41, PI / 2, PI / 4, 0);
    return [0.42, 0.1];
  },
  // Bone Fang: a hooked blade of serrated bone lashed to a leather grip
  fang(r, M, g) {
    B(g, 0.045, 0.05, 0.15, M.detail, 0, 0, 0); for (const z of [-0.04, 0.0, 0.04]) B(g, 0.05, 0.054, 0.01, M.trim, 0, 0, z);
    for (let i = 0; i < 3; i++) B(g, 0.02, 0.06 - i * 0.008, 0.1, M.main, 0, 0.004 - i * 0.012, 0.12 + i * 0.09, -0.15 * i);
    for (let i = 0; i < 3; i++) K(g, 0.014, 0.035, M.main, 0, -0.035 - i * 0.012, 0.12 + i * 0.09, PI, 0, 0);
    K(g, 0.02, 0.07, M.main, 0, -0.03, 0.38, PI / 2 + 0.5, 0, 0);
    return [0.4, 0.1];
  },
};
MAGE_ARMORY.staff = {
  // Focus Staff: a dark shaft bound in brass, a caged focus crystal at the head
  focus(r, M, g) {
    C(g, 0.03, 0.035, 2.0, M.main, 0, 0, 0.1, PI / 2);
    for (const z of [-0.7, -0.1, 0.5]) C(g, 0.042, 0.042, 0.06, M.trim, 0, 0, z, PI / 2);
    C(g, 0.05, 0.03, 0.1, M.trim, 0, 0, -0.92, PI / 2);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2; B(g, 0.02, 0.02, 0.26, M.trim, Math.cos(a) * 0.07, Math.sin(a) * 0.07, 1.22); }
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), M.glow); c.position.set(0, 0, 1.24); c.scale.z = 1.6; g.add(c);
    return [1.3, 0.3];
  },
  // Bone Staff: a long femur-white shaft wired together, a small skull with lit eyes at the head
  bone(r, M, g) {
    for (let i = 0; i < 4; i++) C(g, 0.034, 0.03, 0.5, M.main, 0, 0, -0.78 + i * 0.5, PI / 2);
    for (const z of [-0.53, -0.03, 0.47]) C(g, 0.045, 0.045, 0.05, M.trim, 0, 0, z, PI / 2);
    B(g, 0.16, 0.15, 0.16, M.main, 0, 0, 1.2); B(g, 0.1, 0.05, 0.08, M.main, 0, -0.08, 1.24);
    for (const s of [1, -1]) B(g, 0.035, 0.035, 0.02, M.glow, s * 0.04, 0.02, 1.285);
    return [1.3, 0.3];
  },
  // Storm Rod: a metal rod wound in coils, a sparking orb held in prongs
  storm(r, M, g) {
    C(g, 0.03, 0.03, 2.0, M.detail, 0, 0, 0.1, PI / 2);
    for (let i = 0; i < 6; i++) C(g, 0.05, 0.05, 0.04, M.trim, 0, 0, 0.3 + i * 0.1, PI / 2);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2; B(g, 0.02, 0.02, 0.24, M.trim, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 1.2, Math.sin(a) * 0.3, -Math.cos(a) * 0.3, 0); }
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.glow); o.position.set(0, 0, 1.24); g.add(o);
    return [1.32, 0.3];
  },
  // Seer's Staff: a pale shaft and a great ring at the head with an open eye in it
  seer(r, M, g) {
    C(g, 0.03, 0.035, 2.0, M.main, 0, 0, 0.1, PI / 2);
    ring(g, 0.2, 0.025, M.trim, 0, 0, 1.3, 0, PI / 2, 16);
    B(g, 0.03, 0.14, 0.2, M.main, 0, 0, 1.3); B(g, 0.035, 0.06, 0.06, M.glow, 0, 0, 1.3);
    for (const s of [1, -1]) K(g, 0.03, 0.12, M.trim, 0, s * 0.24, 1.3, s > 0 ? 0 : PI, 0, 0);
    return [1.5, 0.3];
  },
};

// ======================= the Shrike's and the Adept's detail =======================
// Each piece keeps its shape and gains its detail on top (the same pass the Templar's pieces had, written as an extra
// layer so the silhouettes stay as they were): seams and stitching, buckles and rivets, straps, pockets, vents,
// filters, scales, coils, embroidery. Called after the piece itself with the same arguments.
const stitches = (p, x0, x1, y, z, n, m) => { for (let i = 0; i < n; i++) B(p, 0.012, 0.006, 0.008, m, x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z); };
const buckle = (p, x, y, z, M, rz = 0) => { B(p, 0.045, 0.04, 0.012, M.trim, x, y, z, 0, 0, rz); B(p, 0.022, 0.018, 0.016, M.detail, x, y, z + 0.002, 0, 0, rz); };
const ROGUE_DETAIL = {
  cloak: {
    tattered(r, M, T, H) { // the hood's rim and seam, toggles and patches on the poncho, a rope belt, torn fringe
      const { bulk: b } = r.dims;
      frame(H, 0.24, 0.27, 0, 0.17, 0.162, M.trim, 0.016, 0.02);
      stitches(H, -0.12, 0.12, 0.36, 0.1, 9, M.detail);
      for (const y of [0.56, 0.47]) { B(T, 0.025, 0.05, 0.02, M.trim, -0.06, y, 0.2 * b + 0.01); B(T, 0.04, 0.008, 0.008, M.detail, -0.06, y, 0.2 * b + 0.02); }
      for (const [x, y] of [[0.12, 0.5], [-0.15, 0.42]]) { B(T, 0.07, 0.06, 0.008, M.detail, x * b, y, 0.2 * b + 0.006); stitches(T, x * b - 0.03, x * b + 0.03, y + 0.03, 0.2 * b + 0.012, 4, M.trim); }
      B(T, 0.6 * b, 0.025, 0.42 * b, M.detail, 0, 0.3, -0.005); for (const s of [1, -1]) strip(r, T, s * 0.06, 0.29, 0.21 * b, 0.015, [0.12], M.detail, { spring: RIBBON, lx: [-0.6, 0.3], th: 0.01 });
    },
    mantle(r, M, T, H) { // the cowl's wraps, a clasp chain, pouches on the chest strap, the cape's hem stitched
      const { bulk: b } = r.dims;
      for (let i = 0; i < 4; i++) B(H, 0.325 - i * 0.02, 0.008, 0.325 - i * 0.02, M.detail, 0, 0.02 + i * 0.045, 0.01, 0, 0, 0.08);
      for (let i = 0; i < 4; i++) B(T, 0.015, 0.015, 0.02, M.trim, -0.06 + i * 0.04, 0.68, 0.2 * b);
      for (const [x, y] of [[-0.08, 0.38], [0.06, 0.58]]) { B(T, 0.06, 0.07, 0.04, M.detail, x, y, 0.16 * b, 0, 0, 0.55); B(T, 0.062, 0.02, 0.042, M.trim, x, y + 0.03, 0.16 * b, 0, 0, 0.55); }
      for (const s of [1, -1]) B(T, 0.025, 0.025, 0.025, M.trim, s * 0.25 * b, 0.7, 0.1);
    },
    wraith(r, M, T, H) { // vents and cables on the generator, emitters on the shoulders, seams down the hood
      const { bulk: b } = r.dims;
      for (const s of [1, -1]) { B(H, 0.012, 0.28, 0.012, M.detail, s * 0.08, 0.21, 0.13); C(T, 0.025, 0.03, 0.05, M.trim, s * 0.24 * b, 0.74, -0.04); C(T, 0.018, 0.018, 0.02, M.glow, s * 0.24 * b, 0.775, -0.04); }
      for (let i = 0; i < 4; i++) B(T, 0.18, 0.008, 0.02, M.trim, 0, 0.42 + i * 0.03, -0.17 * b - 0.09);
      for (const s of [1, -1]) B(T, 0.02, 0.02, 0.26, M.detail, s * 0.07, 0.64, -0.12 * b, -0.6, 0, 0);
    },
    raven(r, M, T, H) { // a vein down every quill, a skull clasp at the collar, rivets along the beak
      const { bulk: b } = r.dims;
      for (let k = 0; k < 11; k++) { const a = -PI * 0.8 + (k / 10) * PI * 1.6; B(T, 0.006, 0.12, 0.006, M.detail, Math.sin(a) * 0.23 * b, 0.8, Math.cos(a) * 0.17 * b, -Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); }
      B(T, 0.06, 0.06, 0.03, colorMat(r, null, 0xd8d0bc), 0, 0.72, 0.2 * b); for (const s of [1, -1]) B(T, 0.014, 0.014, 0.01, M.glow, s * 0.014, 0.73, 0.2 * b + 0.016);
      rivets(H, -0.04, 0.04, 0.37, 0.19, 3, M.detail, 0.012);
    },
  },
  mask: {
    wrap(r, M, H) { // rivets round the goggles, filter grille rings, hose couplings, cheek vents
      for (const s of [1, -1]) { for (let k = 0; k < 6; k++) { const a = (k / 6) * PI * 2; B(H, 0.01, 0.01, 0.01, M.detail, s * 0.055 + Math.cos(a) * 0.05, 0.2 + Math.sin(a) * 0.05, 0.192); } for (let i = 0; i < 3; i++) B(H, 0.03, 0.006, 0.01, M.detail, s * 0.095, 0.12 + i * 0.015, 0.175); C(H, 0.022, 0.022, 0.02, M.trim, s * 0.07, 0.08, 0.17, 0.9, s * 0.3); }
      for (let i = 0; i < 3; i++) ring(H, 0.045 - i * 0.012, 0.005, M.detail, 0, 0.078, 0.252, PI / 2 + 0.3, 0, 10);
    },
    iron(r, M, H) { // rivets round the frame, slatted vents in the cheeks, a ridged brow
      rivets(H, -0.1, 0.1, 0.29, 0.188, 6, M.detail, 0.013); rivetCol(H, 0.12, 0.08, 0.27, 0.188, 4, M.detail, 0.013); rivetCol(H, -0.12, 0.08, 0.27, 0.188, 4, M.detail, 0.013);
      for (const s of [1, -1]) for (let i = 0; i < 4; i++) B(H, 0.05, 0.007, 0.012, M.detail, s * 0.06, 0.1 + i * 0.018, 0.188, -0.1);
      B(H, 0.22, 0.025, 0.03, M.trim, 0, 0.255, 0.188, -0.1);
    },
    bone(r, M, H) { // cracks, a heavy brow, cheekbones, a stitched jaw
      const bone = colorMat(r, M.mainId, 0xd8d0bc);
      B(H, 0.21, 0.03, 0.035, bone, 0, 0.25, 0.168); for (const s of [1, -1]) B(H, 0.05, 0.025, 0.03, bone, s * 0.07, 0.15, 0.172, 0, 0, s * 0.3);
      for (const [x, y, rz] of [[0.06, 0.27, 0.8], [-0.07, 0.13, -0.6], [0.02, 0.07, 0.3]]) B(H, 0.006, 0.05, 0.034, M.detail, x, y, 0.17, 0, 0, rz);
      for (let i = 0; i < 5; i++) B(H, 0.006, 0.02, 0.01, M.detail, -0.04 + i * 0.02, 0.075, 0.183);
    },
    kitsune(r, M, H) { // painted markings, whiskers, a jewel on the brow
      for (const s of [1, -1]) { for (let i = 0; i < 3; i++) B(H, 0.05, 0.006, 0.01, M.trim, s * 0.07, 0.13 + i * 0.012, 0.21, 0, 0, s * (0.2 - i * 0.15)); B(H, 0.02, 0.05, 0.01, M.trim, s * 0.04, 0.25, 0.18, 0, 0, s * 0.5); }
      oct(H, 0.015, M.glow, 0, 0.26, 0.18); B(H, 0.06, 0.02, 0.012, M.trim, 0, 0.165, 0.248, 0.15);
    },
  },
  shirt: {
    jerkin(r, M, T) { // flaps and buckles on the pouches, D-rings on the webbing, an antenna, a belt buckle
      const { bulk: b } = r.dims, f = 0.14 * b;
      for (const [x, y] of [[-0.1, 0.32], [0.1, 0.32], [-0.12, 0.5], [0.12, 0.5]]) { B(T, 0.084, 0.03, 0.045, M.detail, x * b, y + 0.035, f + 0.022); B(T, 0.015, 0.02, 0.012, M.trim, x * b, y + 0.02, f + 0.045); }
      for (const s of [1, -1]) ring(T, 0.015, 0.004, M.trim, s * 0.08, 0.62, f + 0.02, 0, 0, 6);
      B(T, 0.006, 0.18, 0.006, M.detail, 0.1, 0.72, f + 0.01, 0, 0, -0.2); B(T, 0.012, 0.012, 0.012, M.glow, 0.118, 0.81, f + 0.01);
      buckle(T, 0, 0.07, 0.14 * b, M);
    },
    brigandine(r, M, T) { // rivets on every band, studs round the collar, pockets, side buckles
      const { bulk: b } = r.dims, f = 0.15 * b;
      for (let i = 0; i < 4; i++) rivets(T, -0.15 * b, 0.15 * b, 0.6 - i * 0.085, f + 0.017, 7, M.detail, 0.012);
      rivets(T, -0.15, 0.15, 0.74, 0.17, 7, M.detail, 0.013);
      for (const s of [1, -1]) { B(T, 0.07, 0.07, 0.03, M.trim, s * 0.13 * b, 0.22, f + 0.01); B(T, 0.072, 0.02, 0.032, M.detail, s * 0.13 * b, 0.25, f + 0.012); buckle(T, s * 0.255 * b, 0.45, 0.05, M, PI / 2); }
    },
    assassin(r, M, T) { // folds in the sash, knife hilts and guards, a buckle, gloves
      const { bulk: b } = r.dims, f = 0.14 * b;
      for (let i = 0; i < 4; i++) B(T, 0.1, 0.006, 0.01, M.detail, 0.12 - i * 0.08, 0.6 - i * 0.12, f + 0.012, 0, 0, -0.62);
      for (let k = 0; k < 6; k++) { const x = -0.17 + k * 0.068, y = 0.64 - k * 0.075; B(T, 0.04, 0.012, 0.02, M.trim, x * b - 0.02, y + 0.03, f + 0.04, 0, 0, 0.62); }
      buckle(T, 0, 0.1, 0.14 * b, M);
      for (const L of [true, false]) B(hand(r, L), 0.12, 0.09, 0.12, M.detail, 0, 0.01, 0);
    },
    shadowweave(r, M, T) { // ribbing down the sides, studs on the collar, pads on the knees
      const { bulk: b } = r.dims;
      for (const s of [1, -1]) for (let i = 0; i < 6; i++) B(T, 0.01, 0.012, 0.2 * b, M.detail, s * 0.235 * b, 0.3 + i * 0.06, 0);
      rivets(T, -0.12, 0.12, 0.72, 0.16, 5, M.glow, 0.012);
      for (const L of [true, false]) { B(shin(r, L), 0.12 * b, 0.08, 0.04, M.trim, 0, -0.03, 0.08); B(shin(r, L), 0.02, 0.02, 0.01, M.glow, 0, -0.03, 0.1); }
    },
  },
  band: {
    cloth(r, M, arm) { // a knot where it's tied, stitching along the wraps
      const { bulk: b } = r.dims;
      for (let i = 0; i < 4; i++) stitches(arm, -0.05 * b, 0.05 * b, -0.08 - i * 0.05, 0.075 * b, 4, M.detail);
      B(arm, 0.05, 0.03, 0.03, M.trim, 0.075 * b, -0.21, 0.03, 0, 0, 0.6);
    },
    bracer(r, M, arm) { // a bezel round the screen, rivets on the housing, couplings on the cable
      const { bulk: b } = r.dims;
      B(arm, 0.025, 0.1, 0.012, M.trim, 0.08 * b, -0.18, 0.055); B(arm, 0.025, 0.1, 0.012, M.trim, 0.08 * b, -0.18, -0.055);
      for (const y of [-0.13, -0.23]) for (const z of [-0.06, 0.06]) B(arm, 0.012, 0.012, 0.012, M.detail, -0.075 * b, y, z);
      for (const y of [-0.04, -0.1]) C(arm, 0.022, 0.022, 0.015, M.trim, 0, y, -0.075 * b);
    },
    serpent(r, M, arm) { // a ridge of scales down the coil, fangs
      const { bulk: b } = r.dims;
      for (let k = 0; k < 8; k++) { const a = k * 0.95; K(arm, 0.01, 0.025, M.trim, Math.cos(a) * 0.08 * b, -0.05 - k * 0.025, Math.sin(a) * 0.086 * b, 0, -a, 0, 3); }
      const hd = r.j[arm === r.j.armL ? 'armL' : 'armR'];
      for (const x of [-0.012, 0.012]) K(arm, 0.006, 0.025, colorMat(r, null, 0xf0eadc), 0.075 * b + x, -0.29, 0.07, PI, 0, 0, 3);
    },
    blade(r, M, arm) { // rivets on the housing, a piston behind the blade, teeth up its back
      const { bulk: b } = r.dims;
      rivetCol(arm, -0.08 * b, -0.16, -0.24, 0.0, 3, M.detail, 0.012);
      C(arm, 0.012, 0.012, 0.14, M.detail, 0.085 * b, -0.12, -0.035);
      for (let i = 0; i < 6; i++) K(arm, 0.008, 0.02, M.trim, 0.1 * b, -0.18 + i * 0.05, -0.028, -PI / 2, 0, 0, 3);
    },
  },
};
const MAGE_DETAIL = {
  shoulder: {
    mantle(r, M, T) { // a row of studs up the collar's spine, ribs across it, buckles on the caps
      const { bulk: b, sw } = r.dims;
      for (let i = 0; i < 5; i++) B(T, 0.28, 0.008, 0.055, M.trim, 0, 0.74 + i * 0.06, -0.165 - i * 0.01, -0.15);
      for (const s of [1, -1]) { rivets(T, s * 0.12, s * 0.18, 0.85, 0.0, 3, M.detail, 0.013); B(T, 0.04, 0.03, 0.015, M.trim, s * sw, 0.66, 0.11 * b); }
    },
    pauldron(r, M, T) { // copper wire turns between the coils, a terminal on top, rivets on the cap
      const { bulk: b, sw } = r.dims, pv = pivot(T, -sw, 0.68, 0, 0, 0, 0.3);
      for (let i = 0; i < 7; i++) ring(pv, 0.162 * b, 0.006, M.detail, -0.02, -0.04 + i * 0.018, 0, PI / 2, 0, 12);
      C(pv, 0.03, 0.03, 0.04, M.trim, -0.02, 0.13, 0); for (let k = 0; k < 4; k++) { const a = (k / 4) * PI * 2; B(pv, 0.014, 0.014, 0.014, M.detail, -0.02 + Math.cos(a) * 0.11 * b, 0.13, Math.sin(a) * 0.11 * b); }
      const o = pivot(T, sw, 0.68, 0, 0, 0, -0.3); rivets(o, -0.08 * b, 0.1 * b, 0.0, 0.135 * b, 4, M.detail, 0.012);
    },
    crystal(r, M, T) { // emitter vanes on the caps, a riveted rim
      const { bulk: b, sw } = r.dims;
      for (const s of [1, -1]) { const pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.3); for (let k = 0; k < 4; k++) { const a = (k / 4) * PI * 2 + PI / 4; B(pv, 0.012, 0.04, 0.035, M.trim, s * 0.02 + Math.cos(a) * 0.08, 0.05, Math.sin(a) * 0.08, 0, -a, 0); } rivets(pv, s * 0.02 - 0.08 * b, s * 0.02 + 0.08 * b, 0.0, 0.125 * b, 4, M.detail, 0.012); }
    },
    phoenix(r, M, T) { // feathered barbs on each vane, a mount plate with rivets
      const { bulk: b, sw } = r.dims;
      for (const s of [1, -1]) { const pv = pivot(T, s * (sw - 0.04), 0.7, -0.14 * b, -0.3, 0, -s * 0.2); rivets(pv, -0.06, 0.06, 0.045, 0.16, 3, M.trim, 0.014);
        for (let i = 0; i < 3; i++) { const v = pivot(pv, s * 0.03 * i, 0.02, -0.02, -0.2 - i * 0.12, 0, -s * (0.25 + i * 0.35)); for (let f = 0; f < 3; f++) B(v, 0.012, 0.06, 0.05, M.trim, 0, 0.08 + f * 0.08 - i * 0.02, -0.05, -0.6); } }
    },
  },
  shirt: {
    runecoat(r, M, T) { // buttons down the front, stitched lapels, cuffs, a pocket
      const { bulk: b } = r.dims, f = 0.142 * b;
      for (let i = 0; i < 4; i++) for (const s of [1, -1]) B(T, 0.018, 0.018, 0.012, M.trim, s * 0.05, 0.62 - i * 0.08, f + 0.012);
      for (const s of [1, -1]) stitches(T, s * 0.02, s * 0.1, 0.65, f + 0.028, 5, M.detail);
      B(T, 0.07, 0.06, 0.012, M.detail, -0.12 * b, 0.36, f + 0.006); B(T, 0.072, 0.018, 0.014, M.trim, -0.12 * b, 0.385, f + 0.008);
      for (const L of [true, false]) stitches(fore(r, L), -0.05 * b, 0.05 * b, -0.225, 0.08 * b, 4, M.detail);
    },
    robe(r, M, T) { // embroidery down the front band, tassels on the belt, a cowl seam
      const { bulk: b } = r.dims;
      for (let i = 0; i < 6; i++) { B(T, 0.03, 0.012, 0.01, M.glow, 0, 0.3 + i * 0.06, 0.152 * b + 0.012); B(T, 0.012, 0.03, 0.01, M.glow, 0, 0.3 + i * 0.06, 0.152 * b + 0.012); }
      for (const x of [0.04, 0.1]) strip(r, T, x, 0.08, 0.14 * b + 0.01, 0.012, [0.06, 0.05], M.trim, { spring: RIBBON, lx: [-0.6, 0.3], th: 0.008 });
      stitches(T, -0.14, 0.14, 0.73, -0.19 * b, 8, M.detail);
    },
    starcape(r, M, T) { // a clasp chain between the shoulders, quilting on the tunic
      const { bulk: b } = r.dims, f = 0.142 * b;
      for (let i = 0; i < 6; i++) ring(T, 0.012, 0.004, M.trim, -0.13 * b + i * 0.052 * b, 0.68, 0.07 + Math.sin((i / 5) * PI) * 0.03, 0, 0, 6);
      for (let i = 0; i < 4; i++) for (const s of [1, -1]) B(T, 0.1, 0.006, 0.008, M.detail, s * 0.1 * b, 0.36 + i * 0.07, f + 0.004, 0, 0, s * 0.6);
    },
    archmage(r, M, T) { // cog teeth on the collar, cable sockets up the spine, a censer at the belt
      const { bulk: b } = r.dims;
      for (let k = 0; k < 10; k++) B(T, 0.025, 0.02, 0.025, M.trim, -0.16 + k * 0.035, 0.8, 0.13);
      for (let i = 0; i < 5; i++) C(T, 0.016, 0.016, 0.02, M.glow, 0, 0.66 - i * 0.12, -0.16 * b - 0.03, PI / 2);
      const ch = pivot(T, 0.12, 0.06, 0.15 * b); B(ch, 0.05, 0.06, 0.05, M.trim, 0, -0.03, 0); B(ch, 0.03, 0.03, 0.055, M.glow, 0, -0.03, 0); B(ch, 0.006, 0.05, 0.006, M.detail, 0, 0.02, 0);
    },
  },
  pants: {
    trousers(r, M) { // pocket flaps and buttons, laces up the boots, stitched knees
      const { bulk: b } = r.dims;
      for (const L of [true, false]) { const lg = leg(r, L), sh = shin(r, L), s = L ? 1 : -1;
        B(lg, 0.012, 0.012, 0.012, M.trim, s * 0.1 * b, -0.21, 0.035); stitches(sh, -0.05 * b, 0.05 * b, 0.03, 0.1, 4, M.detail);
        for (let i = 0; i < 4; i++) B(sh, 0.05, 0.006, 0.01, M.detail, 0, -0.29 - i * 0.03, 0.09 * b, 0, 0, i % 2 ? 0.4 : -0.4); }
    },
    greaves(r, M) { // a ridge down each greave, rivets, straps round the calves
      const { bulk: b } = r.dims;
      for (const L of [true, false]) { const sh = shin(r, L);
        B(sh, 0.02, 0.3, 0.02, M.trim, 0, -0.24, 0.105); rivetCol(sh, 0.055 * b, -0.12, -0.36, 0.1, 4, M.detail, 0.012); rivetCol(sh, -0.055 * b, -0.12, -0.36, 0.1, 4, M.detail, 0.012);
        for (const y of [-0.18, -0.3]) { B(sh, 0.155 * b, 0.02, 0.175 * b, M.detail, 0, y, 0); B(sh, 0.025, 0.025, 0.012, M.trim, 0.075 * b, y, 0.03); } }
    },
    runed(r, M) { // little nodes along the traces, seams up the backs
      const { bulk: b } = r.dims;
      for (const L of [true, false]) { const lg = leg(r, L), sh = shin(r, L), s = L ? 1 : -1;
        for (const y of [-0.1, -0.25, -0.35]) B(lg, 0.02, 0.02, 0.02, M.glow, s * 0.07 * b, y, 0.025);
        for (const y of [-0.12, -0.28]) B(sh, 0.02, 0.02, 0.02, M.glow, 0, y, 0.085 * b);
        B(sh, 0.008, 0.3, 0.008, M.detail, 0, -0.22, -0.08 * b); }
    },
    astral(r, M) { // a star-chart band on each thigh, a clasp at the anklet
      const { bulk: b } = r.dims;
      for (const L of [true, false]) { const lg = leg(r, L), sh = shin(r, L);
        B(lg, 0.15 * b, 0.03, 0.17 * b, M.detail, 0, -0.18, 0); for (let i = 0; i < 4; i++) B(lg, 0.012, 0.012, 0.012, M.glow, -0.05 * b + i * 0.033 * b, -0.18, 0.09 * b);
        B(sh, 0.03, 0.03, 0.02, M.trim, 0, -0.4, 0.09 * b); }
    },
  },
};
// fold the detail into the pieces: each builder runs as before, then its detail on the same arguments
for (const [ARM, DET] of [[ROGUE_ARMORY, ROGUE_DETAIL], [MAGE_ARMORY, MAGE_DETAIL]]) for (const [slot, pieces] of Object.entries(DET)) for (const [id, extra] of Object.entries(pieces)) {
  const base = ARM[slot]?.[id]; if (!base) continue;
  ARM[slot][id] = function (...a) { const ret = base.apply(this, a); extra.apply(this, a); return ret; };
}
