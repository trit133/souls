// The Sunless Deep's armour (2026-11-26, rebuilt the same day): two new sets per class, a piece for every armour slot,
// each built from nothing (not on one of the plain pieces) so it has its own shape, and nothing in front of any face.
// Some give off particles (rig.emitters, run each frame by main.js armorFx): anything that burns, glows or sparkles in
// the wearer's chest glow's colour ('chest'), steam, smoke and dust in their own.
//   Templar  - the Foreman, a boiler-knight: an iron dome with a barred face cage and a smokestack venting behind,
//              boiler-drum shoulders with valve wheels, a barrel boiler for a chest with a furnace grate, a tank on the
//              back, piston-stack legs and hobnailed boots. The Glass-Wright: the head cased in angled glass plates
//              under one tall shard, shoulders of raw crystal clusters, a lopsided faceted breastplate split by a
//              glowing seam, crystal greaves with shards out of the knees
//   Shrike   - the Creeper: a head bound tight in wraps with one dim goggle lens, a cloak of ragged strips to the
//              ankles smoking at the hem, a harness of straps, hooks and pouches, wraps to the fingers ending in iron
//              claws. The Mirror: an oval mirror face in a high silver collar, a short cape of hanging mirror shards,
//              scale of mirror shards under a sash, a long curved shard down each forearm
//   Adept    - the Kiln, a glass-blower: a great heat shield on one shoulder and a bellows on the other, a thick
//              scorched apron-coat with a furnace grate at the chest and tongs at the belt, heat-wrapped legs and soot-
//              black boots. The Spore: shelf fungus grown out of the shoulders, a robe overgrown with moss and frilled
//              fungus down the front, legs of twisted roots with caps at the knees
// Each builder takes the same (r, M, ...) as the others of its slot (playerkits.js).
import * as THREE from 'three';
import { cyl, cone, rbox, pivot } from './mesh.js';
import { strip, plate, basic, RIBBON } from './kits.js';
import { colorMat } from './outfits.js';

const PI = Math.PI;
const B = (p, w, h, d, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const k = rbox(w, h, d, m, x, y, z, rx, ry, rz); p.add(k); return k; };
const C = (p, rt, rb, h, m, x, y, z, rx = 0, ry = 0, rz = 0, seg = 8) => { const k = cyl(rt, rb, h, m, seg); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); p.add(k); return k; };
const K = (p, r, h, m, x, y, z, rx = 0, ry = 0, rz = 0, seg = 4) => { const k = cone(r, h, m, seg); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); p.add(k); return k; };
const ring = (p, R, t, m, x, y, z, rx = 0, ry = 0, seg = 14) => { const k = new THREE.Mesh(new THREE.TorusGeometry(R, t, 4, seg), m); k.position.set(x, y, z); k.rotation.set(rx, ry, 0); p.add(k); return k; };
const oct = (p, s, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const k = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), m); k.position.set(x, y, z); k.scale.set(sx, sy, sz); p.add(k); return k; };
const dome = (p, R, m, x, y, z, sx = 1, sy = 1, sz = 1, seg = 9) => { const k = new THREE.Mesh(new THREE.SphereGeometry(R, seg, 4, 0, PI * 2, 0, PI / 2), m); k.position.set(x, y, z); k.scale.set(sx, sy, sz); p.add(k); return k; };
const rivets = (p, x0, x1, y, z, n, m, s = 0.016) => { for (let i = 0; i < n; i++) B(p, s, s, s, m, x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z); };
const DARK = basic(0x050405);
const fore = (r, L) => r.j[L ? 'foreL' : 'foreR'], hand = (r, L) => r.j[L ? 'handL' : 'handR'], shin = (r, L) => r.j[L ? 'shinL' : 'shinR'], leg = (r, L) => r.j[L ? 'legL' : 'legR'];

const glowOf = (r, M, dflt) => (M.glowId && M.glowId !== 'default' ? colorMat(r, M.glowId, dflt) : basic(M.glowHex ?? dflt));
const dark = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(1 - f); return c.getHex(); };
// a particle source on a piece: where (a point on the body), what kind, how many a second, its colour ('chest': the
// wearer's chest glow, looked up as it runs)
export function emitter(r, parent, x, y, z, kind, rate, color) {
  const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o);
  (r.emitters ||= []).push({ o, kind, rate, color, acc: Math.random() });
  return o;
}
// seer-glass: violet on every piece of the set alike (or the piece's own glow colour, if one's been picked for it);
// deep: a darker facet of it
const glassHex = (M) => (M.glowId && M.glowId !== 'default' ? M.glowHex : 0x9a80e0);
const crystalMat = (r, M, deep = false) => new THREE.MeshLambertMaterial({ color: deep ? dark(glassHex(M), 0.4) : glassHex(M), emissive: dark(glassHex(M), deep ? 0.85 : 0.72), flatShading: true });
const glassGlow = (r, M) => (M.glowId && M.glowId !== 'default' ? glowOf(r, M, 0xc8a8ff) : basic(0xd0b8ff));
const mirrorMat = () => new THREE.MeshLambertMaterial({ color: 0xe0e8ff, emissive: 0x34384c, flatShading: true });
const sideOf = (r, arm) => arm === r.j.armL;

// ================= TEMPLAR =================
export const deepKnight = () => ({
  helmet: {
    // Foreman's Helm: an iron dome riveted to a deep skirt, a cage of bars over the face (the dark and two lit eyes
    // behind it), a valve wheel at one ear, pipes down the nape, a smokestack out of the back venting steam
    foreman(r, M, H) {
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      C(H, 0.175, 0.185, 0.17, M.main, 0, 0.17, 0, 0, 0, 0, 10);
      dome(H, 0.178, M.main, 0, 0.255, 0, 1, 0.85, 1, 10);
      ring(H, 0.182, 0.014, M.trim, 0, 0.255, 0, PI / 2, 0, 16); ring(H, 0.19, 0.016, M.trim, 0, 0.09, 0, PI / 2, 0, 16);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * PI * 2; B(H, 0.018, 0.018, 0.018, M.detail, Math.sin(a) * 0.186, 0.255, Math.cos(a) * 0.186); }
      B(H, 0.03, 0.03, 0.34, M.trim, 0, 0.4, 0); // (a ridge over the crown, front to back)
      // the face cage: the dark behind, two eyes, bars across and down
      B(H, 0.2, 0.15, 0.02, DARK, 0, 0.17, 0.172); for (const s of [1, -1]) B(H, 0.04, 0.02, 0.01, glowOf(r, M, 0xff8a3a), s * 0.05, 0.2, 0.178);
      for (let k = 0; k < 5; k++) B(H, 0.016, 0.17, 0.018, M.trim, -0.08 + k * 0.04, 0.17, 0.185);
      for (const y of [0.1, 0.17, 0.245]) B(H, 0.21, 0.016, 0.018, M.trim, 0, y, 0.187);
      // a valve wheel at the left ear, pipes down the nape, the stack
      C(H, 0.02, 0.02, 0.05, M.detail, 0.2, 0.18, 0, 0, 0, PI / 2); ring(H, 0.045, 0.01, M.trim, 0.225, 0.18, 0, 0, PI / 2, 10);
      for (const s of [1, -1]) B(H, 0.03, 0.03, 0.18, M.detail, s * 0.08, 0.08, -0.16, 0.8);
      const st = pivot(H, 0.05, 0.34, -0.12, -0.35, 0, 0);
      C(st, 0.035, 0.045, 0.22, M.detail, 0, 0.11, 0); ring(st, 0.05, 0.012, M.trim, 0, 0.2, 0, PI / 2, 0, 10);
      emitter(r, st, 0, 0.26, 0, 'steam', 3, 0xd8dcdc);
    },
    // Glass-Wright's Helm: the head cased in angled plates of seer-glass over dark iron, a visor plate with a lit slit
    // in it, faceted cheeks, a faceted cap, and one tall shard crowning the back with two smaller beside it
    glasshelm(r, M, H) {
      const c = crystalMat(r, M), cd = crystalMat(r, M, true);
      B(H, 0.13, 0.1, 0.13, M.detail, 0, 0.03, 0);
      B(H, 0.26, 0.3, 0.28, M.detail, 0, 0.19, -0.01);
      B(H, 0.25, 0.15, 0.03, c, 0, 0.22, 0.142, -0.18); B(H, 0.19, 0.022, 0.012, glassGlow(r, M), 0, 0.22, 0.16, -0.18);
      B(H, 0.2, 0.1, 0.03, cd, 0, 0.1, 0.13, 0.35);
      for (const s of [1, -1]) { B(H, 0.03, 0.22, 0.22, c, s * 0.14, 0.17, 0.02, 0, s * 0.18, s * 0.08); B(H, 0.03, 0.16, 0.12, cd, s * 0.135, 0.2, -0.12, 0, -s * 0.3, 0); }
      oct(H, 0.18, c, 0, 0.34, -0.01, 0.8, 0.45, 0.85);
      K(H, 0.055, 0.42, c, 0, 0.56, -0.13, -0.4); for (const s of [1, -1]) K(H, 0.035, 0.24, c, s * 0.07, 0.47, -0.14, -0.5, 0, -s * 0.35);
      emitter(r, H, 0, 0.72, -0.2, 'sparkle', 4, 'chest');
    },
  },
  pauldron: {
    // Boiler Drums: a riveted drum lying front to back over the shoulder, banded at its ends and middle, a valve wheel
    // on top that lets out steam, a plate hung under it
    boiler(r, M, T, s) {
      const { sw, bulk: b } = r.dims, pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.25);
      C(pv, 0.14 * b, 0.14 * b, 0.32 * b, M.main, s * 0.03, 0.03, 0, PI / 2, 0, 0, 10);
      for (const z of [-0.155, 0, 0.155]) { const k = ring(pv, 0.142 * b, 0.016, M.trim, s * 0.03, 0.03, z * b, 0, 0, 12); void k; }
      for (const z of [-0.155, 0.155]) for (let k = 0; k < 6; k++) { const a = (k / 6) * PI * 2; B(pv, 0.016, 0.016, 0.016, M.detail, s * 0.03 + Math.cos(a) * 0.12 * b, 0.03 + Math.sin(a) * 0.12 * b, z * b + Math.sign(z) * 0.006); }
      C(pv, 0.018, 0.018, 0.07, M.detail, s * 0.03, 0.2, 0); ring(pv, 0.055, 0.011, M.trim, s * 0.03, 0.235, 0, PI / 2, 0, 10);
      for (let k = 0; k < 3; k++) B(pv, 0.1, 0.01, 0.01, M.trim, s * 0.03, 0.235, 0, 0, (k / 3) * PI, 0);
      plate(r, pv, s * 0.05, -0.08, 0, 0.22 * b, 0.1, 0.28 * b, M.detail, { edge: M.trim, rz: s * 0.3 });
      emitter(r, pv, s * 0.03, 0.26, 0, 'steam', 1.5, 0xd8dcdc);
    },
    // Shard Guard: no plate at all, the shoulder a cluster of raw crystal grown out in every direction, on a dark band
    shardguard(r, M, T, s) {
      const { sw, bulk: b } = r.dims, pv = pivot(T, s * sw, 0.7, 0, 0, 0, -s * 0.25), c = crystalMat(r, M);
      B(pv, 0.2 * b, 0.05, 0.26 * b, M.detail, s * 0.02, -0.07, 0);
      oct(pv, 0.13 * b, crystalMat(r, M, true), s * 0.03, 0.02, 0, 1.2, 0.8, 1.3);
      for (const [x, y, z, h, rx, rz] of [[0.05, 0.08, 0, 0.3, 0, -0.35], [0.1, 0.02, 0.09, 0.2, 0.6, -0.9], [0.1, 0.03, -0.1, 0.22, -0.6, -0.8], [0.0, 0.08, -0.1, 0.18, -0.5, -0.1], [0.12, -0.06, 0, 0.16, 0, -1.4], [-0.02, 0.06, 0.1, 0.14, 0.5, 0.1]])
        K(pv, 0.04, h, c, s * x, y + h * 0.4, z, rx, 0, s * rz);
      emitter(r, pv, s * 0.05, 0.25, 0, 'sparkle', 2.5, 'chest');
    },
  },
  chest: {
    // Foreman's Boiler: the chest a riveted barrel of iron banded three times, a furnace door with its grate glowing
    // at the front, pipes up over both shoulders and down the back into a tank with a smokestack, a heavy collar, a
    // skirt of riveted plates, riveted pipe-section vambraces and iron gauntlets
    foreman(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.16 * b, coal = glowOf(r, M, 0xff6a1a);
      const bar = C(T, 0.245 * b, 0.225 * b, 0.5, M.main, 0, 0.44, 0, 0, 0, 0, 12); bar.scale.z = 0.68;
      for (const y of [0.24, 0.44, 0.64]) { const k = ring(T, 0.245 * b, 0.016, M.trim, 0, y, 0, PI / 2, 0, 16); k.scale.y = 0.68; }
      dome(T, 0.245 * b, M.main, 0, 0.68, 0, 1, 0.3, 0.68, 12);
      C(T, 0.16, 0.18, 0.08, M.trim, 0, 0.76, -0.01, 0, 0, 0, 10);
      // the furnace door
      B(T, 0.18, 0.16, 0.03, M.detail, 0, 0.42, f + 0.005); B(T, 0.15, 0.12, 0.02, DARK, 0, 0.42, f + 0.014);
      for (let k = 0; k < 4; k++) B(T, 0.022, 0.11, 0.014, coal, -0.045 + k * 0.03, 0.42, f + 0.022);
      for (const [w, h, x, y] of [[0.19, 0.02, 0, 0.5], [0.19, 0.02, 0, 0.34], [0.02, 0.17, 0.09, 0.42], [0.02, 0.17, -0.09, 0.42]]) B(T, w, h, 0.03, M.trim, x, y, f + 0.024);
      for (const y of [0.47, 0.37]) B(T, 0.04, 0.025, 0.035, M.detail, -0.1, y, f + 0.02); // (its hinges)
      emitter(r, T, 0, 0.44, f + 0.04, 'ember', 3, 'chest');
      // pipes over the shoulders into the tank on the back
      for (const s of [1, -1]) { B(T, 0.035, 0.035, 0.36 * b, M.detail, s * 0.13, 0.78, 0); B(T, 0.035, 0.1, 0.035, M.detail, s * 0.13, 0.72, f - 0.02); B(T, 0.035, 0.2, 0.035, M.detail, s * 0.13, 0.66, -f - 0.02); }
      C(T, 0.11, 0.11, 0.42, M.trim, 0, 0.45, -f - 0.1, 0, 0, 0, 8); for (const y of [0.28, 0.62]) C(T, 0.115, 0.115, 0.03, M.detail, 0, y, -f - 0.1, 0, 0, 0, 8);
      const st = C(T, 0.035, 0.045, 0.2, M.detail, 0.06, 0.74, -f - 0.12, 0, 0, 0, 6); void st;
      emitter(r, T, 0.06, 0.86, -f - 0.12, 'steam', 4, 0xd8dcdc);
      B(T, 0.46 * b, 0.07, 0.31 * b, M.detail, 0, 0.12, 0); B(T, 0.08, 0.06, 0.03, M.trim, 0, 0.12, 0.16 * b);
      for (const x of [-0.13, 0, 0.13]) plate(r, hips, x * b, -0.04, 0.14 * b, 0.12 * b, 0.2, 0.03, M.main, { edge: M.trim, spring: { lx: [-0.9, 0.1] } });
      plate(r, hips, 0, -0.04, -0.14 * b, 0.36 * b, 0.2, 0.03, M.main, { edge: M.trim, spring: { lx: [-0.1, 0.9] } });
      for (const L of [true, false]) {
        const fa = fore(r, L), hd = hand(r, L);
        C(fa, 0.085 * b, 0.078 * b, 0.24, M.main, 0, -0.16, 0, 0, 0, 0, 8); for (const y of [-0.05, -0.27]) C(fa, 0.09 * b, 0.09 * b, 0.03, M.trim, 0, y, 0, 0, 0, 0, 8);
        B(hd, 0.13, 0.1, 0.13, M.detail, 0, 0.01, 0); B(hd, 0.14, 0.04, 0.09, M.main, 0, 0.05, 0.03); rivets(hd, -0.045, 0.045, 0.05, 0.08, 4, M.trim, 0.014);
      }
    },
    // Vein Plate: a lopsided breastplate of faceted seer-glass plates over dark iron, split down the middle by a
    // glowing seam, crystal studding the collar, a crystal back plate, glass tassets, crystal vambraces
    vein(r, M, T, hips) {
      const { bulk: b } = r.dims, f = 0.145 * b, c = crystalMat(r, M), cd = crystalMat(r, M, true), glow = glassGlow(r, M);
      B(T, 0.46 * b, 0.46, 0.28 * b, M.detail, 0, 0.46, 0);
      B(T, 0.24 * b, 0.4, 0.04, c, 0.11 * b, 0.48, f, 0.05, -0.28, 0.06);   // (the big plate over the left breast)
      B(T, 0.18 * b, 0.24, 0.04, cd, -0.11 * b, 0.56, f, -0.1, 0.32, -0.1);  // (smaller, higher on the right)
      B(T, 0.2 * b, 0.16, 0.04, c, -0.1 * b, 0.33, f, 0.25, 0.22, 0.12);
      for (let k = 0; k < 6; k++) B(T, 0.03, 0.085, 0.02, glow, (k % 2 ? 0.02 : -0.02) * b, 0.66 - k * 0.075, f + 0.02, 0, 0, k % 2 ? 0.4 : -0.4);
      B(T, 0.44 * b, 0.4, 0.04, M.main, 0, 0.48, -f); for (const [x, rz] of [[-0.12, 0.3], [0, 0], [0.12, -0.3]]) B(T, 0.04, 0.3, 0.03, cd, x * b, 0.5, -f - 0.025, 0, 0, rz); // (the back: iron, crystal ribs)
      for (let k = 0; k < 7; k++) { const a = -1.4 + k * 0.47; K(T, 0.03, 0.1 + (k % 2) * 0.04, c, Math.sin(a) * 0.16 * b, 0.74, Math.cos(a) * 0.12 * b - 0.03, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.6); }
      B(T, 0.44 * b, 0.06, 0.3 * b, M.detail, 0, 0.12, 0); oct(T, 0.035, glow, 0, 0.12, 0.16 * b);
      for (const x of [-0.12, 0.12]) plate(r, hips, x * b, -0.04, 0.14 * b, 0.14 * b, 0.2, 0.03, c, { spring: { lx: [-0.9, 0.1] } });
      for (const L of [true, false]) { oct(fore(r, L), 0.1 * b, c, 0, -0.17, 0, 0.9, 1.5, 0.9); B(hand(r, L), 0.12, 0.09, 0.12, M.detail, 0, 0.01, 0); B(hand(r, L), 0.1, 0.03, 0.03, glow, 0, 0.04, 0.06); }
      emitter(r, T, 0, 0.5, f + 0.04, 'sparkle', 3, 'chest');
    },
  },
  legs: {
    // Foreman's Boots: thighs and shins in stacked iron rings like a piston's sleeve, a piston rod down each shin, a
    // ram at the knee, a tool belt of pouches, huge hobnailed boots with a thick sole and a toe cap
    foreman(r, M, hips) {
      const { bulk: b } = r.dims;
      B(hips, 0.42 * b, 0.06, 0.27 * b, M.detail, 0, 0.04, 0); for (const x of [-0.15, 0.15, -0.05]) B(hips, 0.07, 0.09, 0.05, M.trim, x * b, -0.02, 0.13 * b);
      for (const L of [true, false]) {
        const lg = leg(r, L), sh = shin(r, L), ft = -r.dims.shin + 0.05;
        for (let i = 0; i < 4; i++) C(lg, (0.105 - i * 0.004) * b, (0.1 - i * 0.004) * b, 0.07, i % 2 ? M.trim : M.main, 0, -0.08 - i * 0.085, 0, 0, 0, 0, 8);
        C(sh, 0.055, 0.055, 0.1, M.trim, 0, -0.02, 0.06, PI / 2, 0, 0, 8); C(sh, 0.035, 0.035, 0.02, M.detail, 0, -0.02, 0.115, PI / 2, 0, 0, 8);
        for (let i = 0; i < 4; i++) C(sh, (0.095 - i * 0.003) * b, (0.09 - i * 0.003) * b, 0.06, i % 2 ? M.trim : M.main, 0, -0.1 - i * 0.07, 0.01, 0, 0, 0, 8);
        C(sh, 0.018, 0.018, 0.26, M.detail, 0, -0.22, 0.105); C(sh, 0.03, 0.03, 0.04, M.trim, 0, -0.1, 0.105);
        B(sh, 0.21 * b, 0.13, 0.32 * b, M.detail, 0, ft + 0.02, 0.05); B(sh, 0.22 * b, 0.045, 0.34 * b, r.m(0x1e1c1a), 0, ft - 0.06, 0.05);
        B(sh, 0.2 * b, 0.07, 0.08, M.main, 0, ft + 0.01, 0.19); B(sh, 0.21 * b, 0.025, 0.22 * b, M.trim, 0, ft + 0.09, 0.03);
        for (let k = 0; k < 4; k++) B(sh, 0.02, 0.015, 0.02, M.trim, 0.08 * b, ft - 0.08, -0.08 + k * 0.08);
      }
    },
    // Shard Greaves: glass plates on the thighs and shins over dark iron, shards bursting out of the knees, dark boots
    // with crystal at the toe
    shard(r, M, hips) {
      const { bulk: b } = r.dims, c = crystalMat(r, M), cd = crystalMat(r, M, true);
      B(hips, 0.42 * b, 0.06, 0.27 * b, M.detail, 0, 0.04, 0);
      for (const L of [true, false]) {
        const lg = leg(r, L), sh = shin(r, L), ft = -r.dims.shin + 0.04;
        B(lg, 0.17 * b, 0.32, 0.18 * b, M.detail, 0, -0.22, 0); B(lg, 0.15 * b, 0.26, 0.04, cd, 0, -0.2, 0.09, 0.08, 0, L ? 0.06 : -0.06);
        B(sh, 0.15 * b, 0.36, 0.17 * b, M.detail, 0, -0.25, 0); B(sh, 0.13 * b, 0.28, 0.04, c, 0, -0.24, 0.09, -0.05);
        for (const [x, h, rx, rz] of [[0, 0.18, 0.9, 0], [0.05, 0.12, 0.6, -0.7], [-0.05, 0.12, 0.6, 0.7], [0.02, 0.1, 1.3, -0.3]]) K(sh, 0.035, h, c, x, 0.0 + h * 0.3, 0.1, rx, 0, rz);
        B(sh, 0.18 * b, 0.1, 0.28 * b, M.detail, 0, ft, 0.05); K(sh, 0.05, 0.12, c, 0, ft, 0.2, PI / 2, PI / 4, 0);
      }
      emitter(r, shin(r, true), 0, 0.05, 0.12, 'sparkle', 1.2, 'chest');
    },
  },
});

// ================= SHRIKE =================
export const deepRogue = () => ({
  cloak: {
    // Creeper's Shroud: a black yoke and a hood thrown back, and from it a cloak of ragged strips hanging to the
    // ankles all round the back and sides, smoke curling off its hem
    smoke(r, M, T, H) {
      const { bulk: b } = r.dims, black = r.m(dark(M.mainHex, 0.55)), black2 = r.m(dark(M.mainHex, 0.7));
      B(T, 0.56 * b, 0.1, 0.34 * b, black, 0, 0.7, -0.01); B(T, 0.58 * b, 0.025, 0.36 * b, M.trim, 0, 0.66, -0.01);
      B(T, 0.28, 0.16, 0.18, black, 0, 0.8, -0.2 * b, -0.35); B(T, 0.22, 0.1, 0.12, black2, 0, 0.84, -0.27 * b, -0.6);
      const S = [[-0.2, -0.15, 0.08, 1.2], [-0.1, -0.17, 0.07, 1.42], [0, -0.17, 0.08, 1.3], [0.1, -0.17, 0.07, 1.45], [0.2, -0.15, 0.08, 1.15]];
      S.forEach(([x, z, w, L], i) => strip(r, T, x * b, 0.66, z * b, w, [L * 0.32, L * 0.3, L * 0.22, L * 0.16], i % 2 ? black : black2, { lx: [-0.1, 1.3], lx2: [-0.3, 0.6], taper: 0.75, th: 0.015 }));
      for (const s of [1, -1]) for (const [z, L] of [[-0.06, 1.1], [0.05, 0.9]]) strip(r, T, s * 0.25 * b, 0.66, z * b, 0.07, [L * 0.34, L * 0.3, L * 0.2], black, { ry: s * 1.4, lx: [-0.3, 1.0], taper: 0.7, th: 0.015, lz: s > 0 ? [-0.1, 0.6] : [-0.6, 0.1] });
      emitter(r, T, 0, -0.65, -0.2 * b, 'smoke', 6, 0x1a1816); emitter(r, T, 0.2, -0.45, -0.1 * b, 'smoke', 3, 0x1a1816);
    },
    // Mirror Silk: a silver mantle over the shoulders and a short cape of mirror shards hanging in rows on dark cords
    // behind it, chiming like mail, glinting
    mirror(r, M, T, H) {
      const { bulk: b } = r.dims, mir = mirrorMat(), silver = r.m(0xb8bcd0);
      B(T, 0.56 * b, 0.09, 0.34 * b, silver, 0, 0.72, -0.01); B(T, 0.58 * b, 0.02, 0.36 * b, M.trim, 0, 0.67, -0.01);
      for (const s of [1, -1]) B(T, 0.06, 0.05, 0.05, M.trim, s * 0.14, 0.72, 0.16 * b);
      for (let k = 0; k < 6; k++) { const x = (-0.2 + k * 0.08) * b; strip(r, T, x, 0.68, -0.17 * b, 0.07, [0.12, 0.12, 0.11, 0.09], mir, { lx: [-0.1, 1.0], th: 0.012, taper: 0.9 }); }
      emitter(r, T, 0, 0.45, -0.22 * b, 'glint', 3, 'chest');
    },
  },
  mask: {
    // Creeper's Wraps: the whole head bound tight in black wraps crossing every way, one round goggle lens glowing dim
    // over the right eye, the left stitched over, wrap ends trailing from the back
    creeper(r, M, H, T) {
      const black = r.m(dark(M.mainHex, 0.6)), band = r.m(dark(M.mainHex, 0.35));
      B(H, 0.28, 0.32, 0.28, black, 0, 0.18, 0);
      for (let i = 0; i < 6; i++) B(H, 0.29, 0.028, 0.29, band, 0, 0.05 + i * 0.055, 0, 0, 0, i % 2 ? 0.16 : -0.16);
      B(H, 0.29, 0.028, 0.29, band, 0, 0.2, 0, 0.5, 0, 0);
      C(H, 0.05, 0.05, 0.03, M.trim, -0.06, 0.2, 0.15, PI / 2, 0, 0, 10); C(H, 0.038, 0.038, 0.012, glowOf(r, M, 0xffe080), -0.06, 0.2, 0.163, PI / 2, 0, 0, 10);
      B(H, 0.06, 0.01, 0.01, M.trim, 0.06, 0.2, 0.142); for (let k = 0; k < 3; k++) B(H, 0.008, 0.03, 0.012, M.trim, 0.04 + k * 0.02, 0.2, 0.144);
      for (const x of [-0.04, 0.05]) strip(r, H, x, 0.16, -0.14, 0.035, [0.18, 0.14], black, { spring: RIBBON, lx: [-0.2, 1.2], th: 0.012 });
      emitter(r, H, 0, 0.3, -0.12, 'smoke', 2, 0x1a1816);
    },
    // Mirror Face: a hood of silver silk, an oval mirror where the face should be in a silver rim, a high silver
    // collar up round the jaw, a thin crest over the crown
    mirror(r, M, H, T) {
      const mir = mirrorMat(), silver = r.m(0xc8ccd8);
      B(H, 0.28, 0.3, 0.28, M.main, 0, 0.19, -0.01);
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mir); face.position.set(0, 0.2, 0.12); face.scale.set(0.95, 1.2, 0.25); H.add(face);
      const rim = ring(H, 0.12, 0.012, silver, 0, 0.2, 0.135, 0, 0, 16); rim.scale.set(0.95, 1.2, 1);
      C(H, 0.18, 0.16, 0.14, silver, 0, 0.06, 0, 0, 0, 0, 12); ring(H, 0.18, 0.012, M.trim, 0, 0.13, 0, PI / 2, 0, 14);
      B(H, 0.025, 0.04, 0.3, silver, 0, 0.35, -0.02);
      emitter(r, H, 0.04, 0.24, 0.16, 'glint', 1.5, 'chest');
    },
  },
  shirt: {
    // Creeper's Harness: tight black wraps, a harness of straps crossing front and back on an iron ring, iron hooks
    // hung off the straps, little pouches round the belt, wrapped forearms
    creeper(r, M, T) {
      const { bulk: b } = r.dims, f = 0.142 * b, black = r.m(dark(M.mainHex, 0.6)), band = r.m(dark(M.mainHex, 0.35)), iron = r.m(0x4a4a50);
      B(T, 0.44 * b, 0.62, 0.27 * b, black, 0, 0.4, 0);
      for (let i = 0; i < 5; i++) B(T, 0.45 * b, 0.025, 0.28 * b, band, 0, 0.2 + i * 0.1, 0, 0, 0, i % 2 ? 0.12 : -0.12);
      for (const z of [f + 0.008, -f - 0.008]) for (const s of [1, -1]) B(T, 0.045, 0.7, 0.02, M.detail, 0, 0.42, z, 0, 0, s * 0.55);
      ring(T, 0.035, 0.01, iron, 0, 0.44, f + 0.02, 0, 0, 10);
      for (const [x, y] of [[-0.12, 0.58], [0.13, 0.58], [-0.06, 0.3], [0.07, 0.3]]) { K(T, 0.012, 0.05, iron, x * b, y, f + 0.03, PI, 0, 0); B(T, 0.012, 0.02, 0.012, iron, x * b, y - 0.04, f + 0.04); }
      B(T, 0.42 * b, 0.05, 0.29 * b, M.detail, 0, 0.1, 0);
      for (const [x, z] of [[-0.16, 0.08], [0.16, 0.08], [0.06, 0.15], [-0.2, -0.05], [0.2, -0.05]]) { B(T, 0.06, 0.07, 0.05, M.trim, x * b, 0.07, z * b); B(T, 0.062, 0.015, 0.052, M.detail, x * b, 0.1, z * b); }
      for (const L of [true, false]) for (let i = 0; i < 4; i++) B(fore(r, L), 0.13 * b, 0.03, 0.14 * b, i % 2 ? black : band, 0, -0.06 - i * 0.06, 0, 0, 0, 0.15);
    },
    // Mirror Scale: silver silk under rows of overlapping mirror shards front and back, a sash across in the trim
    // colour with its tail hanging, silk cuffs
    mirror(r, M, T) {
      const { bulk: b } = r.dims, f = 0.145 * b, mir = mirrorMat(), silk = r.m(0xb8bcd0);
      B(T, 0.45 * b, 0.6, 0.28 * b, silk, 0, 0.4, 0);
      for (const z of [f, -f]) for (let row = 0; row < 6; row++) for (let k = 0; k < 5; k++) B(T, 0.075 * b, 0.065, 0.012, mir, (-0.17 + k * 0.085 + (row % 2) * 0.04) * b, 0.66 - row * 0.085, z + (z > 0 ? 0.006 : -0.006), z > 0 ? -0.3 : 0.3, 0, 0);
      B(T, 0.07, 0.72, 0.02, M.trim, 0, 0.4, f + 0.02, 0, 0, 0.62);
      strip(r, T, 0.17 * b, 0.12, f + 0.02, 0.06, [0.16, 0.12], M.trim, { spring: RIBBON, lx: [-0.8, 0.3], th: 0.015 });
      B(T, 0.43 * b, 0.05, 0.29 * b, M.trim, 0, 0.1, 0);
      for (const L of [true, false]) B(fore(r, L), 0.14 * b, 0.08, 0.15 * b, silk, 0, -0.26, 0);
      emitter(r, T, 0, 0.45, f + 0.03, 'glint', 2, 'chest');
    },
  },
  band: {
    // Creeper's Claws: wraps from the shoulder down to the fingers, and three short iron claws off each hand
    spike(r, M, arm) {
      const L = sideOf(r, arm), black = r.m(dark(M.mainHex, 0.55)), band = r.m(dark(M.mainHex, 0.3)), iron = r.m(0x5a5a62), b = r.dims.bulk;
      B(arm, 0.135 * b, 0.26, 0.145 * b, black, 0, -0.17, 0);
      for (let i = 0; i < 3; i++) B(arm, 0.14 * b, 0.025, 0.15 * b, band, 0, -0.08 - i * 0.08, 0, 0, 0, 0.2);
      B(fore(r, L), 0.125 * b, 0.28, 0.135 * b, black, 0, -0.16, 0);
      for (let i = 0; i < 3; i++) B(fore(r, L), 0.13 * b, 0.025, 0.14 * b, band, 0, -0.06 - i * 0.09, 0, 0, 0, -0.2);
      const hd = hand(r, L); B(hd, 0.11, 0.09, 0.115, black, 0, 0.0, 0.005);
      for (const x of [-0.035, 0, 0.035]) K(hd, 0.014, 0.1, iron, x, -0.08, 0.05, PI - 0.3, 0, 0);
    },
    // Shard Bracer: a silver band on the arm, and a silver bracer with one long curved shard of mirror running from
    // past the elbow to the wrist like a fin
    shard(r, M, arm) {
      const L = sideOf(r, arm), mir = mirrorMat(), silver = r.m(0xc8ccd8), b = r.dims.bulk, s = L ? 1 : -1, fa = fore(r, L);
      B(arm, 0.14 * b, 0.05, 0.15 * b, silver, 0, -0.22, 0); B(arm, 0.145 * b, 0.015, 0.155 * b, M.trim, 0, -0.2, 0);
      B(fa, 0.13 * b, 0.2, 0.14 * b, silver, 0, -0.17, 0); for (const y of [-0.07, -0.27]) B(fa, 0.135 * b, 0.02, 0.145 * b, M.trim, 0, y, 0);
      for (let k = 0; k < 4; k++) B(fa, 0.016, 0.11, 0.05 - k * 0.008, mir, s * 0.085 * b, 0.06 - k * 0.1, -0.02 - k * 0.012, 0.25 + k * 0.08, 0, 0);
      emitter(r, fa, s * 0.09, -0.1, 0, 'glint', 1, 'chest');
    },
  },
});

// ================= ADEPT =================
export const deepMage = () => ({
  shoulder: {
    // Kiln Mantle: a great brass heat shield on the left shoulder, its outer rim rising high and scorched, glowing
    // along its cracks; a glass-blower's bellows strapped over the right, its nozzle out behind
    kiln(r, M, T, rune, H) {
      const { sw, bulk: b } = r.dims, wood = r.m(0x5a3e26), leather = r.m(0x3a2a1c), coal = glowOf(r, M, 0xff6a1a);
      const pv = pivot(T, -sw, 0.69, 0, 0, 0, 0.3);
      B(pv, 0.28 * b, 0.06, 0.36 * b, M.trim, -0.03, 0.04, 0); B(pv, 0.26 * b, 0.05, 0.32 * b, M.trim, -0.06, -0.03, 0, 0, 0, 0.35);
      B(pv, 0.04, 0.26, 0.38 * b, M.trim, -0.17, 0.14, 0, 0, 0, 0.35); B(pv, 0.045, 0.02, 0.39 * b, r.m(0x2a2420), -0.215, 0.27, 0, 0, 0, 0.35);
      rivets(pv, -0.14, 0.08, 0.075, 0.17 * b, 5, r.m(0x2a2420));
      for (const [y, z] of [[0.1, -0.08], [0.16, 0.06]]) B(pv, 0.046, 0.06, 0.012, coal, -0.17, y, z, 0, 0, 0.35);
      emitter(r, pv, -0.2, 0.28, 0, 'ember', 4, 'chest');
      const pr = pivot(T, sw, 0.7, 0, 0, 0, -0.25);
      B(pr, 0.2 * b, 0.03, 0.28 * b, wood, 0.02, 0.12, -0.02); B(pr, 0.2 * b, 0.03, 0.28 * b, wood, 0.02, 0.0, -0.02);
      for (let k = 0; k < 3; k++) B(pr, 0.17 * b, 0.03, 0.24 * b, leather, 0.02, 0.03 + k * 0.03, -0.02);
      K(pr, 0.03, 0.12, M.trim, 0.02, 0.06, -0.21, -PI / 2, 0, 0, 6);
      for (const s of [1, -1]) B(pr, 0.03, 0.18, 0.03, M.detail, 0.02, 0.06, s * 0.13);
    },
    // Spore Crown: shelf fungus grown out of both shoulders in three tiers, glowing gills under each, pale spots on
    // top, spores drifting off them
    spore(r, M, T, rune, H) {
      const { sw, bulk: b } = r.dims, cap = r.m(0x8a6a4a), gill = glowOf(r, M, 0x3ad8c8), spot = r.m(0xd8d0b8);
      for (const s of [1, -1]) {
        const pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.3);
        for (const [y, R, x, z] of [[0.04, 0.17, 0.04, 0.02], [-0.06, 0.12, 0.13, -0.06], [0.0, 0.09, 0.0, -0.15]]) {
          dome(pv, R * b, cap, s * x, y, z, 1, 0.55, 0.9, 10);
          const g = C(pv, (R - 0.012) * b, (R - 0.03) * b, 0.02, gill, s * x, y - 0.006, z, 0, 0, 0, 10); g.scale.z = 0.88;
          for (let k = 0; k < 4; k++) { const a = k * 1.7 + R * 20; B(pv, 0.028, 0.015, 0.028, spot, s * x + Math.cos(a) * R * 0.45, y + R * 0.42, z + Math.sin(a) * R * 0.45); }
        }
        emitter(r, pv, s * 0.08, 0.12, 0, 'spore', 2.5, 'chest');
      }
    },
  },
  shirt: {
    // Kiln Coat: a thick scorched leather coat, a heavy apron over it to the knees, a furnace grate glowing at the
    // chest, a belt hung with tongs and a blowpipe, a high leather collar, long gauntlet cuffs
    kiln(r, M, T, rune, hips) {
      const { bulk: b } = r.dims, f = 0.155 * b, apron = r.m(dark(M.mainHex, 0.35)), soot = r.m(0x1e1a18), coal = glowOf(r, M, 0xff6a1a), iron = r.m(0x4a4a50);
      B(T, 0.5 * b, 0.46, 0.31 * b, M.main, 0, 0.46, 0); B(T, 0.34, 0.14, 0.32, M.main, 0, 0.74, -0.02); B(T, 0.36, 0.025, 0.34, M.trim, 0, 0.8, -0.02);
      B(T, 0.36 * b, 0.5, 0.04, apron, 0, 0.42, f); for (const s of [1, -1]) B(T, 0.03, 0.3, 0.03, apron, s * 0.15 * b, 0.72, f - 0.03, -0.3, 0, s * 0.25);
      strip(r, hips, 0, -0.02, 0.16 * b, 0.34 * b, [0.28, 0.24], apron, { lx: [-0.9, 0.1], th: 0.035 });
      for (const [x, y] of [[-0.1, 0.3], [0.08, 0.55], [0.12, 0.25]]) B(T, 0.07, 0.05, 0.01, soot, x * b, y, f + 0.022);
      B(T, 0.17, 0.13, 0.03, M.trim, 0, 0.52, f + 0.02); B(T, 0.14, 0.1, 0.02, DARK, 0, 0.52, f + 0.03);
      for (let k = 0; k < 4; k++) B(T, 0.02, 0.09, 0.012, coal, -0.045 + k * 0.03, 0.52, f + 0.038);
      emitter(r, T, 0, 0.55, f + 0.05, 'ember', 3, 'chest');
      B(T, 0.46 * b, 0.06, 0.32 * b, M.detail, 0, 0.12, 0);
      for (const x of [-0.14, -0.1]) B(T, 0.015, 0.26, 0.015, iron, x * b, 0.0, f + 0.01, 0, 0, x < -0.12 ? 0.08 : -0.08);
      C(T, 0.014, 0.014, 0.4, iron, 0.18 * b, 0.0, 0.05, 0.1, 0, 0.12, 6);
      for (const [z, ry] of [[-0.15, 0]]) strip(r, hips, 0, -0.02, z * b, 0.36 * b, [0.3, 0.26], M.main, { trim: M.trim, ry, lx: [-0.1, 0.9], th: 0.03 });
      for (const L of [true, false]) { B(fore(r, L), 0.19 * b, 0.18, 0.2 * b, M.main, 0, -0.22, 0); B(fore(r, L), 0.2 * b, 0.025, 0.21 * b, M.trim, 0, -0.13, 0); B(hand(r, L), 0.12, 0.1, 0.12, M.detail, 0, 0.01, 0); }
    },
    // Spore Robe: a robe overgrown with lumps of moss, frilled shelves of fungus down the front with glowing gills,
    // mossy skirts, mossy cuffs with little caps
    spore(r, M, T, rune, hips) {
      const { bulk: b } = r.dims, f = 0.15 * b, moss = r.m(0x3e5236), moss2 = r.m(0x56683e), cap = r.m(0x9a7a56), gill = glowOf(r, M, 0x3ad8c8);
      B(T, 0.5 * b, 0.46, 0.3 * b, M.main, 0, 0.46, 0); B(T, 0.34, 0.12, 0.32, M.main, 0, 0.74, -0.02);
      for (const [x, y, z, w, h] of [[-0.16, 0.62, 1, 0.12, 0.1], [0.14, 0.42, 1, 0.1, 0.14], [-0.12, 0.26, 1, 0.14, 0.08], [0.1, 0.7, -1, 0.16, 0.1], [-0.1, 0.4, -1, 0.14, 0.16], [0.2, 0.2, -1, 0.1, 0.1], [0, 0.78, 1, 0.3, 0.06]])
        B(T, w, h, 0.04, (x * 10) % 2 > 0.5 ? moss : moss2, x * b, y, z * (f + 0.01));
      for (let i = 0; i < 5; i++) { const x = (i % 2 ? 0.035 : -0.035), y = 0.64 - i * 0.1; const sh = C(T, 0.06, 0.075, 0.022, cap, x, y, f + 0.02, 0, 0, 0, 9); sh.scale.z = 0.7; const g = C(T, 0.055, 0.055, 0.01, gill, x, y - 0.015, f + 0.02, 0, 0, 0, 9); g.scale.z = 0.66; }
      B(T, 0.44 * b, 0.05, 0.3 * b, moss, 0, 0.1, 0);
      for (const [x, z, ry] of [[0, 0.14, 0], [0, -0.14, 0], [0.18, 0, 1.4], [-0.18, 0, -1.4]]) strip(r, hips, x * b, 0, z * b, 0.26, [0.36, 0.3], M.main, { trim: moss2, ry, lx: z > 0 ? [-0.9, 0.1] : [-0.1, 0.9], taper: 1.1 });
      for (const L of [true, false]) { B(fore(r, L), 0.17 * b, 0.12, 0.18 * b, moss, 0, -0.24, 0); dome(fore(r, L), 0.03, gill, 0.06, -0.18, 0.06); }
      emitter(r, T, 0, 0.4, f + 0.04, 'spore', 2, 'chest');
    },
  },
  pants: {
    // Kiln Leggings: legs bound in heat-wraps crossing at the thigh and shin, soot-black boots with thick soles and
    // iron toecaps, embers dropping off the shins
    kiln(r, M) {
      const { bulk: b } = r.dims, wrap = r.m(dark(M.mainHex, 0.25)), soot = r.m(0x1a1716), iron = r.m(0x3a3a3e);
      for (const L of [true, false]) {
        const lg = leg(r, L), sh = shin(r, L), ft = -r.dims.shin + 0.06;
        B(lg, 0.15 * b, 0.36, 0.16 * b, M.main, 0, -0.22, 0); for (let i = 0; i < 4; i++) B(lg, 0.155 * b, 0.035, 0.165 * b, wrap, 0, -0.1 - i * 0.08, 0, 0, 0, i % 2 ? 0.2 : -0.2);
        B(sh, 0.14 * b, 0.26, 0.15 * b, M.main, 0, -0.18, 0); for (let i = 0; i < 3; i++) B(sh, 0.145 * b, 0.035, 0.155 * b, wrap, 0, -0.08 - i * 0.08, 0, 0, 0, i % 2 ? 0.2 : -0.2);
        B(sh, 0.17 * b, 0.2, 0.2 * b, soot, 0, ft + 0.04, 0.02); B(sh, 0.18 * b, 0.05, 0.3 * b, soot, 0, ft - 0.06, 0.05); B(sh, 0.17 * b, 0.05, 0.07, iron, 0, ft - 0.04, 0.17);
      }
      emitter(r, shin(r, true), 0, -0.15, 0.09, 'ember', 1.5, 'chest'); emitter(r, shin(r, false), 0, -0.15, 0.09, 'ember', 1.5, 'chest');
    },
    // Spore Leggings: legs of twisted roots winding round and round, a ring of small glowing caps at each knee, root
    // feet splaying out in front
    spore(r, M) {
      const { bulk: b } = r.dims, root = r.m(0x5a4030), root2 = r.m(0x6e5038), gill = glowOf(r, M, 0x3ad8c8);
      for (const L of [true, false]) {
        const lg = leg(r, L), sh = shin(r, L), ft = -r.dims.shin + 0.05;
        B(lg, 0.13 * b, 0.36, 0.14 * b, root, 0, -0.22, 0); B(sh, 0.12 * b, 0.34, 0.13 * b, root, 0, -0.22, 0);
        for (let k = 0; k < 4; k++) { const a = (k / 4) * PI * 2; for (const [j, y, len] of [[lg, -0.22, 0.38], [sh, -0.22, 0.36]]) B(j, 0.03, len, 0.03, k % 2 ? root2 : root, Math.cos(a) * 0.075 * b, y, Math.sin(a) * 0.075 * b, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
        for (let k = 0; k < 5; k++) { const a = (k / 5) * PI * 2; dome(sh, 0.028, gill, Math.cos(a) * 0.08 * b, -0.01, Math.sin(a) * 0.08 * b + 0.02); }
        B(sh, 0.15 * b, 0.08, 0.2 * b, root, 0, ft, 0.03);
        for (const x of [-0.05, 0, 0.05]) K(sh, 0.022, 0.12, root2, x, ft - 0.02, 0.15, PI / 2, 0, -x * 4, 5);
      }
    },
  },
});

// per frame (main.js): each player rig's emitters give off their particles at their place on the body
const _v = new THREE.Vector3();
export function armorFx(rig, fx, dt) {
  if (!rig?.emitters || !rig.root.visible) return;
  for (const E of rig.emitters) {
    E.acc += dt * E.rate;
    if (E.acc < 1) continue;
    E.acc -= 1;
    E.o.getWorldPosition(_v);
    const c = new THREE.Color(E.color === 'chest' ? rig.chestGlow ?? 0xff8a3a : E.color), j = () => (Math.random() - 0.5);
    if (E.kind === 'ember') fx.add.spawn({ x: _v.x + j() * 0.15, y: _v.y, z: _v.z + j() * 0.15, vx: j() * 0.4, vy: 0.9 + Math.random() * 0.7, vz: j() * 0.4, life: 0.9, size: 0.07, size1: 0.02, r: c.r, g: c.g, b: c.b });
    else if (E.kind === 'smoke') fx.norm.spawn({ x: _v.x + j() * 0.3, y: _v.y, z: _v.z + j() * 0.3, vx: j() * 0.3, vy: 0.35, vz: j() * 0.3, life: 1.3, size: 0.18, size1: 0.45, r: c.r, g: c.g, b: c.b, alpha: 0.4, drag: 0.6 });
    else if (E.kind === 'steam') fx.norm.spawn({ x: _v.x, y: _v.y, z: _v.z, vx: j() * 0.3, vy: 1.2, vz: j() * 0.3, life: 0.9, size: 0.1, size1: 0.35, r: c.r, g: c.g, b: c.b, alpha: 0.45, drag: 1 });
    else if (E.kind === 'sparkle' || E.kind === 'glint') fx.add.spawn({ x: _v.x + j() * 0.3, y: _v.y + j() * 0.3, z: _v.z + j() * 0.3, vy: 0.1, life: E.kind === 'glint' ? 0.25 : 0.45, size: E.kind === 'glint' ? 0.12 : 0.07, size1: 0.01, r: c.r, g: c.g, b: c.b });
    else if (E.kind === 'spore') fx.add.spawn({ x: _v.x + j() * 0.2, y: _v.y, z: _v.z + j() * 0.2, vx: j() * 0.25, vy: 0.25, vz: j() * 0.25, life: 2.0, size: 0.05, size1: 0.03, r: c.r, g: c.g, b: c.b, alpha: 0.8 });
    else if (E.kind === 'dust') { const d = Math.random() * 0.5; fx.add.spawn({ x: _v.x + j() * 0.3 * d, y: _v.y + j() * 0.2, z: _v.z + j() * 0.3, vy: 0.05, vx: j() * 0.1, life: 1.2, size: 0.035, size1: 0.02, r: c.r, g: c.g, b: c.b, alpha: 0.7 }); }
  }
}

// ================= the Sunless Deep's weapons (weapons.js), two skins each =================
// Their light is the wearer's chest glow's colour (r.chestGlow; or the skin's own glow, if one's been picked), and
// what burns on them gives off embers in it. Each builds into a group in the right hand along +z, returning [tip, base]
// (the Censer: [tip, base, the chain's pivot], the tip and base going on the chain)
const fire = (r, M) => (M.glowId && M.glowId !== 'default' ? M.glow : basic(r.chestGlow ?? M.glowHex ?? 0xff8a3a));
const fireHex = (r, M) => (M.glowId && M.glowId !== 'default' ? M.glowHex : r.chestGlow ?? M.glowHex ?? 0xff8a3a);
export const DEEP_WEAPONS = {
  knight: {
    pitbreaker: {
      // Pit-Breaker: a mine's rock-breaker on an iron-shod timber haft: a banded iron head with the piston's cylinder
      // run through it, its slag-glow showing at the seams, a gauge, steam pipes down the haft
      piston(r, M, g) {
        C(g, 0.045, 0.05, 1.5, M.detail, 0, 0, 0.42, PI / 2); // the haft
        for (const z of [-0.28, 0.05, 0.6]) C(g, 0.058, 0.058, 0.06, M.trim, 0, 0, z, PI / 2);
        B(g, 0.12, 0.12, 0.1, M.trim, 0, 0, -0.36);
        const z0 = 1.3;
        B(g, 0.4, 0.34, 0.42, M.main, 0, 0, z0); // the head
        for (const s of [-1, 1]) { B(g, 0.44, 0.06, 0.46, M.trim, 0, s * 0.15, z0); C(g, 0.1, 0.12, 0.16, M.main, 0, s * 0.27, z0); C(g, 0.12, 0.12, 0.04, M.trim, 0, s * 0.35, z0); } // the cylinder's two faces
        B(g, 0.42, 0.04, 0.3, fire(r, M), 0, 0, z0); // the slag-glow at the seam
        C(g, 0.05, 0.05, 0.03, r.m(0xd8d0b8), 0.21, 0.05, z0 - 0.05, 0); // a gauge
        B(g, 0.02, 0.02, 0.5, r.m(0x6a5a3a), 0.07, 0.05, 0.9); B(g, 0.02, 0.02, 0.5, r.m(0x6a5a3a), -0.07, 0.05, 0.9); // steam pipes
        emitter(r, g, 0, 0.2, z0, 'ember', 3, fireHex(r, M)); emitter(r, g, 0, 0.36, z0, 'steam', 1.2, 0xd8d8dc);
        return [z0 + 0.25, 0.3];
      },
      // Glass Ram: the same breaker with its head cast in black seer-glass, the light caught in it
      glass(r, M, g) {
        C(g, 0.045, 0.05, 1.5, M.detail, 0, 0, 0.42, PI / 2);
        for (const z of [-0.28, 0.6]) C(g, 0.058, 0.058, 0.06, M.trim, 0, 0, z, PI / 2);
        const z0 = 1.3, glass = new THREE.MeshLambertMaterial({ color: 0x2a2a3a, emissive: 0x0a0a14, flatShading: true });
        const h = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), glass); h.position.set(0, 0, z0); h.scale.set(1.1, 1.3, 0.9); g.add(h);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), fire(r, M)); core.position.set(0, 0, z0); g.add(core);
        for (const s of [-1, 1]) { C(g, 0.08, 0.1, 0.2, M.trim, 0, s * 0.3, z0); B(g, 0.05, 0.12, 0.05, fire(r, M), 0, s * 0.42, z0); }
        emitter(r, g, 0, 0, z0, 'sparkle', 4, fireHex(r, M)); emitter(r, g, 0, 0.3, z0, 'ember', 2, fireHex(r, M));
        return [z0 + 0.25, 0.3];
      },
    },
  },
  rogue: {
    chakrams: {
      // Seer-Glass Rings: a ring of pale glass, a band of brass where he grips it, a thread of light in the glass
      ring(r, M, g) {
        const glass = new THREE.MeshLambertMaterial({ color: M.mainHex ?? 0xc8e0f0, transparent: true, opacity: 0.75, emissive: 0x1a2a38 });
        const o = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.032, 4, 16), glass); o.position.set(0, 0, 0.2); o.rotation.y = PI / 2; g.add(o);
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 4, 16), fire(r, M)); t.position.copy(o.position); t.rotation.y = PI / 2; g.add(t);
        B(g, 0.06, 0.06, 0.08, M.trim, 0, 0, 0.01); // the grip band
        for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2 + 0.5; B(g, 0.02, 0.05, 0.02, glass, 0, Math.sin(a) * 0.235, 0.2 + Math.cos(a) * 0.235, a); } // teeth round the edge
        emitter(r, g, 0, 0, 0.4, 'glint', 1.5, fireHex(r, M));
        return [0.42, 0.02];
      },
      // Mirror Moons: two crescent blades of mirror-glass, a gap where the hand goes through
      mirror(r, M, g) {
        const mir = new THREE.MeshLambertMaterial({ color: 0xd8dce8, emissive: 0x282c38, flatShading: true });
        for (let k = 0; k < 9; k++) { const a = -2.4 + k * 0.6; B(g, 0.025, 0.09, 0.1 - Math.abs(k - 4) * 0.008, mir, 0, Math.sin(a) * 0.2, 0.2 + Math.cos(a) * 0.2, a); }
        for (let k = 0; k < 9; k++) { const a = -2.4 + k * 0.6; B(g, 0.027, 0.02, 0.07, fire(r, M), 0, Math.sin(a) * 0.15, 0.2 + Math.cos(a) * 0.15, a); }
        B(g, 0.05, 0.05, 0.1, M.trim, 0, 0, 0.02);
        emitter(r, g, 0, 0, 0.4, 'glint', 2, fireHex(r, M));
        return [0.42, 0.02];
      },
    },
  },
  mage: {
    censer: {
      // Miner's Censer: a black iron lantern on a chain, its panes glowing, a wooden grip with a hook
      miner(r, M, g) {
        C(g, 0.03, 0.035, 0.22, M.detail, 0, 0, 0, PI / 2); C(g, 0.04, 0.04, 0.03, M.trim, 0, 0, 0.1, PI / 2);
        const cp = new THREE.Group(); cp.position.z = 0.12; g.add(cp);
        for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 3, 6), M.trim); l.position.z = 0.04 + k * 0.075; l.rotation.y = k % 2 ? PI / 2 : 0; cp.add(l); }
        const z0 = 0.8;
        B(cp, 0.18, 0.18, 0.04, M.main, 0, 0, z0 - 0.1); B(cp, 0.18, 0.18, 0.04, M.main, 0, 0, z0 + 0.14);
        for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) B(cp, 0.025, 0.025, 0.24, M.main, x * 0.08, y * 0.08, z0 + 0.02);
        B(cp, 0.13, 0.13, 0.2, fire(r, M), 0, 0, z0 + 0.02); // the fire behind the panes
        B(cp, 0.06, 0.06, 0.06, M.main, 0, 0, z0 - 0.15);
        emitter(r, cp, 0, 0, z0 + 0.02, 'ember', 7, fireHex(r, M)); emitter(r, cp, 0, 0, z0 - 0.15, 'smoke', 1, 0x3a3634);
        return [z0 + 0.16, 0.1, cp];
      },
      // Glass Thurible: a globe of seer-glass in a brass cage, the fire drifting in it
      thurible(r, M, g) {
        C(g, 0.03, 0.035, 0.22, M.detail, 0, 0, 0, PI / 2); C(g, 0.04, 0.04, 0.03, M.trim, 0, 0, 0.1, PI / 2);
        const cp = new THREE.Group(); cp.position.z = 0.12; g.add(cp);
        for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 3, 6), M.trim); l.position.z = 0.04 + k * 0.075; l.rotation.y = k % 2 ? PI / 2 : 0; cp.add(l); }
        const z0 = 0.82;
        const glb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshLambertMaterial({ color: 0xb8d0e0, transparent: true, opacity: 0.45, emissive: 0x18202a })); glb.position.z = z0; cp.add(glb);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), fire(r, M)); core.position.z = z0; cp.add(core);
        for (let k = 0; k < 4; k++) { const a = k / 4 * PI * 2; const b = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.01, 3, 12, PI), M.trim); b.position.z = z0; b.rotation.set(0, PI / 2, a); cp.add(b); }
        B(cp, 0.08, 0.08, 0.05, M.trim, 0, 0, z0 - 0.15); B(cp, 0.06, 0.06, 0.04, M.trim, 0, 0, z0 + 0.15);
        emitter(r, cp, 0, 0, z0, 'ember', 6, fireHex(r, M)); emitter(r, cp, 0, 0, z0, 'sparkle', 2, fireHex(r, M));
        return [z0 + 0.15, 0.1, cp];
      },
    },
  },
};
