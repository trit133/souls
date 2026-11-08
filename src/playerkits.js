// The player characters, built from swappable pieces (outfits.js): one builder per slot and piece, each taking a
// main and a trim colour. Every slot's first piece is the character as it always looked. The base body
// (models.js) takes its colours from the outfit too (outfitModel). Replaces the knight / rogue / mage kits.
import * as THREE from 'three';
import { box, cyl, cone, rbox, pivot } from './mesh.js';
import { KITS, strip, plate, basic, add, easeOut, CLOTH, RIBBON } from './kits.js';
import { colorMat, colorHex, colorById } from './outfits.js';

const lighten = (hex, f) => { const c = new THREE.Color(hex); c.lerp(new THREE.Color(0xffffff), f); return c.getHex(); };
const darken = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(1 - f); return c.getHex(); };
// glowing bits (blades, gems) stay unlit; an effect colour keeps its effect
const glowMat = (r, id, fallback) => (id && id !== 'default' && colorById(id)?.fx ? colorMat(r, id, fallback) : basic(colorHex(id, fallback)));

// the colours of one slot: materials for main and trim, plus their hex values
function slotMats(r, fit, slot, mainHex, trimHex) {
  const f = fit?.[slot] || {};
  return { piece: f.piece, main: colorMat(r, f.main, mainHex), trim: colorMat(r, f.trim, trimHex), mainHex: colorHex(f.main, mainHex), trimHex: colorHex(f.trim, trimHex), mainId: f.main, trimId: f.trim };
}

// ---------- the base body's colours from the outfit ----------
export function outfitModel(base, kind, fit) {
  const c = (slot, which, dflt) => colorHex(fit?.[slot]?.[which], dflt);
  if (kind === 'knight') return { ...base, head: 'none', shield: false, armor: c('chest', 'main', 0x8d939c), accent: c('chest', 'trim', 0x2d4a7a), cloth: c('legs', 'trim', 0x2c3e66), legs: { thigh: c('legs', 'trim', 0x2c3e66), shin: c('legs', 'main', 0x8d939c) }, outfit: fit };
  if (kind === 'rogue') return { ...base, armor: c('shirt', 'main', 0x4a3a2c), outfit: fit };
  if (kind === 'mage') return { ...base, armor: c('shirt', 'main', 0x7a86b0) === 0x7a86b0 ? 0x7a86b0 : lighten(c('shirt', 'main', 0x22305c), 0.15), legs: { thigh: c('pants', 'main', 0x2c3a66), shin: c('pants', 'trim', 0x7a86b0) }, outfit: fit };
  return base;
}

// ================= KNIGHT =================
const KNIGHT = {
  helmet: {
    great(r, M, H, plume = true) {
      const hi = r.m(lighten(M.mainHex, 0.3)), dark = r.mats.dark;
      H.add(box(0.1, 0.08, 0.1, r.mats.skin, 0, 0.03, 0));
      H.add(box(0.27, 0.3, 0.29, M.main, 0, 0.19, 0));
      H.add(box(0.2, 0.03, 0.02, dark, 0, 0.2, 0.15));
      H.add(box(0.04, 0.12, 0.26, M.trim, 0, 0.38, -0.02));
      H.add(box(0.29, 0.05, 0.05, hi, 0, 0.25, 0.15));
      for (const s of [1, -1]) { H.add(box(0.03, 0.14, 0.12, M.main, s * 0.14, 0.12, 0.09)); H.add(box(0.02, 0.02, 0.02, dark, s * 0.05, 0.12, 0.15)); }
      if (plume) strip(r, pivot(H, 0, 0.42, -0.06), 0, 0, 0, 0.06, [0.14, 0.13, 0.12], M.trim, { rx: Math.PI - 1.5, bend: 0.55, spring: { ...CLOTH, k: 80 }, lx: [-0.6, 0.6], th: 0.05, taper: 0.85 });
    },
    barbute(r, M, H) {
      const dark = r.mats.dark;
      H.add(box(0.1, 0.08, 0.1, r.mats.skin, 0, 0.03, 0));
      H.add(box(0.27, 0.3, 0.29, M.main, 0, 0.19, -0.005));
      H.add(box(0.24, 0.05, 0.27, M.main, 0, 0.36, -0.005));
      H.add(box(0.05, 0.16, 0.02, dark, 0, 0.16, 0.148)); // the T: a slit down
      H.add(box(0.18, 0.035, 0.02, dark, 0, 0.22, 0.148)); // and across
      H.add(box(0.035, 0.1, 0.03, M.trim, 0, 0.29, 0.152)); // nasal
      H.add(box(0.28, 0.025, 0.3, M.trim, 0, 0.05, 0)); // a trim band at the neck
      // flair: a raised crest ridge with rivets, edged cheek plates, a short horsehair tail at the back
      H.add(box(0.035, 0.05, 0.28, M.trim, 0, 0.385, -0.005));
      for (const z of [-0.1, 0, 0.1]) H.add(box(0.03, 0.03, 0.03, r.m(lighten(M.trimHex, 0.4)), 0, 0.42, z));
      for (const s of [1, -1]) { H.add(box(0.02, 0.2, 0.02, M.trim, s * 0.138, 0.15, 0.13)); for (const y of [0.1, 0.22]) H.add(box(0.025, 0.025, 0.025, r.m(lighten(M.trimHex, 0.4)), s * 0.14, y, 0.06)); }
      strip(r, pivot(H, 0, 0.36, -0.14), 0, 0, 0, 0.05, [0.12, 0.1], r.m(darken(M.trimHex, 0.2)), { rx: 0.6, spring: { ...CLOTH, k: 70 }, lx: [-0.4, 0.8], th: 0.04, taper: 0.7 });
    },
    winged(r, M, H) {
      KNIGHT.helmet.great(r, M, H, false);
      const glow = basic(0xffe9a0), white = r.m(0xf4eee0);
      for (const s of [1, -1]) {
        const w = pivot(H, s * 0.15, 0.27, -0.02, 0, s * 0.35, -s * 0.5);
        [0.22, 0.17, 0.12].forEach((L, i) => w.add(rbox(0.03, L, 0.06, i ? white : M.trim, s * 0.02 * i, L / 2 + 0.02, -0.05 * i, -0.25 - i * 0.2, 0, 0)));
        r.spring(w, { k: 300, d: 9, drag: 0.02, wind: 0.3, flutter: 0.02, rattle: 0.5, lx: [-0.2, 0.2], lz: [-0.2, 0.2] });
      }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 4, 18), glow);
      const hp = pivot(H, 0, 0.36, -0.2, 0.3, 0, 0); hp.add(halo);
      r.spinners.push({ obj: hp, axis: 'z', speed: 0.6 });
    },
      // a closed helm under a gold crown, the visor slit burning
    crowned(r, M, H) {
      KNIGHT.helmet.great(r, M, H, false);
      const gold = M.trimId && M.trimId !== 'default' ? M.trim : r.m(0xc8a040), ember = glowMat(r, null, 0xff7a2a);
      H.add(box(0.2, 0.03, 0.025, ember, 0, 0.2, 0.152));
      const crown = new THREE.Group(); crown.position.y = 0.36; H.add(crown);
      crown.add(box(0.3, 0.05, 0.31, gold, 0, 0, 0));
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, c = cone(0.03, k % 2 ? 0.08 : 0.13, gold, 4); c.position.set(Math.cos(a) * 0.14, 0.06, Math.sin(a) * 0.14); crown.add(c); }
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) crown.add(box(0.03, 0.03, 0.03, basic(0xd42a2a), Math.cos(a) * 0.155, 0, Math.sin(a) * 0.155));
    },
  },
  pauldron: {
    segmented(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.66, 0, 0, 0, -s * 0.3);
      pv.add(box(0.23 * b, 0.11, 0.29 * b, M.main, s * 0.02, 0, 0));
      pv.add(box(0.235 * b, 0.025, 0.295 * b, M.trim, s * 0.02, 0.05, 0));
      plate(r, pv, s * 0.035, -0.04, 0, 0.21 * b, 0.07, 0.27 * b, M.main, { edge: M.trim });
      plate(r, pv, s * 0.05, -0.1, 0, 0.19 * b, 0.065, 0.25 * b, M.main, { edge: M.trim });
    },
    spiked(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.25);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16 * b, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), M.main); cap.scale.set(1.1, 0.8, 1.15); pv.add(cap);
      pv.add(box(0.3 * b, 0.03, 0.34 * b, M.trim, 0, -0.005, 0));
      for (const [x, z] of [[0, 0], [0.06, 0.08], [0.06, -0.08]]) { const sp = cone(0.035, 0.14, M.trim, 4); sp.position.set(s * x, 0.15, z); sp.rotation.z = -s * 0.4; pv.add(sp); }
      plate(r, pv, s * 0.04, -0.06, 0, 0.2 * b, 0.07, 0.26 * b, M.main, { edge: M.trim });
      // flair: a studded trim band and two swept side spikes
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; pv.add(box(0.025, 0.025, 0.025, r.m(lighten(M.trimHex, 0.4)), Math.cos(a) * 0.15 * b, 0.0, Math.sin(a) * 0.17 * b)); }
      for (const z of [0.12, -0.12]) { const sp = cone(0.025, 0.12, M.trim, 4); sp.position.set(s * 0.12, 0.05, z); sp.rotation.set(z * 4, 0, -s * 1.1); pv.add(sp); }
    },
      // a lion's head roaring from the shoulder, its mane swaying
    lion(r, M, T, s) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.25);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16 * b, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), M.main); cap.scale.set(1.1, 0.8, 1.15); pv.add(cap);
      pv.add(box(0.12, 0.1, 0.08, M.trim, s * 0.02, 0.06, 0.14)); pv.add(box(0.07, 0.05, 0.06, M.trim, s * 0.02, 0.03, 0.19)); // muzzle
      for (const x of [-0.03, 0.03]) pv.add(box(0.02, 0.02, 0.02, basic(0xffc23d), s * 0.02 + x, 0.09, 0.185)); // eyes
      for (const z of [-0.08, 0, 0.08]) strip(r, pv, s * 0.12, 0.06, z + 0.04, 0.06, [0.1, 0.08], M.trim, { ry: s * 1.4, spring: { ...CLOTH, k: 120 }, lx: [-0.4, 0.4], th: 0.03, taper: 0.7 });
      plate(r, pv, s * 0.04, -0.06, 0, 0.2 * b, 0.07, 0.26 * b, M.main, { edge: M.trim });
    },
    // gilded rays fanning out round a glowing sun stone
    sunburst(r, M, T, s) {
      KNIGHT.pauldron.segmented(r, M, T, s);
      const { sw } = r.dims, sun = pivot(T, s * (sw + 0.06), 0.72, 0, 0, 0, -s * 0.3), gold = r.m(0xd8a830);
      for (let k = 0; k < 7; k++) { const a = -0.3 + (k / 6) * Math.PI * 0.9; sun.add(rbox(0.025, 0.14, 0.025, gold, Math.cos(a) * 0.1 * s, Math.sin(a) * 0.1 + 0.04, 0, 0, 0, -s * (Math.PI / 2 - a))); }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), glowMat(r, M.trimId, 0xffe08a)); gem.position.set(0, 0.04, 0.02); sun.add(gem);
    },
  },
  chest: {
    plate(r, M, T, hips) {
      const { bulk: b } = r.dims, hi = r.m(lighten(M.mainHex, 0.3)), gold = r.m(0xb89a4a), dark = r.mats.dark;
      T.add(box(0.06, 0.3, 0.025, hi, 0, 0.5, 0.14 * b));
      T.add(box(0.48 * b, 0.045, 0.29 * b, hi, 0, 0.31, 0));
      T.add(box(0.3, 0.09, 0.3, M.main, 0, 0.67, 0));
      T.add(box(0.31, 0.03, 0.31, hi, 0, 0.71, 0));
      T.add(box(0.38 * b, 0.07, 0.24 * b, dark, 0, 0.06, 0));
      T.add(box(0.08, 0.06, 0.025, gold, 0, 0.06, 0.125 * b));
      strip(r, T, 0, 0.3, 0.148 * b, 0.27 * b, [0.3, 0.3], M.trim, { trim: gold, lx: [-1.0, 0.06] });
      strip(r, T, 0, 0.32, -0.15 * b, 0.3 * b, [0.3, 0.26], M.trim, { trim: gold, lx: [-0.06, 1.1] });
      // elbows and gauntlets go with the chest
      for (const L of [true, false]) {
        const fa = r.j[L ? 'foreL' : 'foreR'], hd = r.j[L ? 'handL' : 'handR'];
        fa.add(box(0.14 * b, 0.09, 0.16 * b, hi, 0, -0.02, 0));
        fa.add(box(0.13 * b, 0.12, 0.14 * b, M.main, 0, -r.dims.fore + 0.06, 0));
        hd.add(box(0.12, 0.09, 0.12, M.main, 0, 0.01, 0));
      }
    },
    mail(r, M, T, hips) {
      const { bulk: b } = r.dims, ring = r.m(darken(M.mainHex, 0.25)), dark = r.mats.dark;
      // chain rows over the chest, a belt, and a long split surcoat
      for (let y = 0.34; y < 0.66; y += 0.06) T.add(box(0.47 * b, 0.025, 0.28 * b, ring, 0, y, 0));
      T.add(box(0.3, 0.09, 0.3, ring, 0, 0.67, 0));
      T.add(box(0.38 * b, 0.07, 0.24 * b, dark, 0, 0.06, 0));
      for (const s of [1, -1]) strip(r, T, s * 0.08, 0.32, 0.148 * b, 0.14 * b, [0.34, 0.34], M.trim, { trim: r.m(lighten(M.trimHex, 0.25)), lx: [-1.0, 0.06], taper: 0.95 });
      strip(r, T, 0, 0.32, -0.15 * b, 0.3 * b, [0.34, 0.3], M.trim, { lx: [-0.06, 1.1] });
      for (const L of [true, false]) {
        const fa = r.j[L ? 'foreL' : 'foreR'], hd = r.j[L ? 'handL' : 'handR'];
        for (const y of [-0.05, -0.13, -0.21]) fa.add(box(0.13 * b, 0.03, 0.15 * b, ring, 0, y, 0));
        hd.add(box(0.12, 0.09, 0.12, r.m(0x3a2a1c), 0, 0.01, 0));
      }
      // flair: a heraldic cross on the surcoat, a studded belt, a padded collar
      T.add(box(0.05, 0.2, 0.012, r.m(lighten(M.trimHex, 0.45)), 0, 0.3, 0.16 * b));
      T.add(box(0.14, 0.04, 0.012, r.m(lighten(M.trimHex, 0.45)), 0, 0.34, 0.16 * b));
      for (const x of [-0.14, -0.07, 0, 0.07, 0.14]) T.add(box(0.025, 0.025, 0.02, r.m(0xc8a040), x * b, 0.06, 0.125 * b));
      T.add(box(0.33, 0.06, 0.33, M.trim, 0, 0.74, 0));
    },
    radiant(r, M, T, hips) {
      KNIGHT.chest.plate(r, M, T, hips);
      const { bulk: b } = r.dims;
      for (const x of [-0.16, 0, 0.16]) strip(r, T, x * b, 0.66, -0.16 * b, 0.18 * b, [0.42, 0.4, 0.26], r.m(lighten(M.mainHex, 0.4)), { trim: M.trim, lx: [-0.1, 1.2], lx2: [-0.3, 0.7], taper: 0.92 });
    },
      // overlapping dragon scales with a glowing heart stone
    dragonscale(r, M, T, hips) {
      KNIGHT.chest.plate(r, M, T, hips);
      const { bulk: b } = r.dims, scale = r.m(darken(M.mainHex, 0.15));
      for (let row = 0; row < 4; row++) for (let k = 0; k < 5 - (row % 2); k++) { const x = (-0.16 + k * 0.08 + (row % 2) * 0.04) * b; T.add(rbox(0.07, 0.06, 0.02, scale, x, 0.62 - row * 0.07, 0.15 * b, -0.35, 0, 0)); }
      const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), glowMat(r, null, 0xff4a1a)); heart.position.set(0, 0.45, 0.17 * b); T.add(heart);
    },
  },
  legs: {
    greaves(r, M, hips) {
      const { bulk: b } = r.dims, hi = r.m(lighten(M.mainHex, 0.3));
      for (const s of [1, -1]) {
        plate(r, hips, s * 0.09, -0.04, 0.12 * b, 0.15, 0.22, 0.03, M.main, { edge: hi, spring: { lx: [-0.9, 0.1] } });
        plate(r, hips, s * 0.2, -0.02, 0, 0.03, 0.2, 0.17, M.main, { edge: hi, spring: { lz: s > 0 ? [-0.1, 0.6] : [-0.6, 0.1] } });
      }
      for (const L of [true, false]) {
        const sh = r.j[L ? 'shinL' : 'shinR'];
        sh.add(box(0.15 * b, 0.11, 0.07, hi, 0, -0.03, 0.08));
        sh.add(box(0.16 * b, 0.06, 0.22 * b, M.main, 0, -r.dims.shin + 0.06, 0.06));
      }
    },
    mailskirt(r, M, hips) {
      const { bulk: b } = r.dims, ring = r.m(darken(M.mainHex, 0.25)), boot = r.m(0x3a2a1c);
      for (const x of [-0.14, -0.05, 0.05, 0.14]) strip(r, hips, x, -0.04, 0.12 * b, 0.1, [0.22, 0.14], ring, { lx: [-0.9, 0.1], th: 0.03 });
      strip(r, hips, 0, -0.04, -0.12 * b, 0.32, [0.24, 0.14], ring, { lx: [-0.1, 0.9], th: 0.03 });
      for (const L of [true, false]) {
        const sh = r.j[L ? 'shinL' : 'shinR'];
        sh.add(box(0.15 * b, 0.3, 0.17 * b, boot, 0, -0.3, 0.01));
        sh.add(box(0.16 * b, 0.04, 0.18 * b, M.trim, 0, -0.16, 0.01));
      }
      // flair: a belt with a buckle and a pouch, quilted knee pads
      hips.add(box(0.4 * b, 0.06, 0.25 * b, r.m(0x3a2a1c), 0, 0.06, 0));
      hips.add(box(0.07, 0.06, 0.02, r.m(0xc8a040), 0, 0.06, 0.13 * b));
      hips.add(box(0.08, 0.1, 0.06, r.m(0x4a3626), 0.14, 0.0, 0.1));
      for (const L of [true, false]) r.j[L ? 'shinL' : 'shinR'].add(box(0.15 * b, 0.1, 0.06, M.trim, 0, -0.03, 0.08));
    },
      // the king's guard: a fan of gold-edged tassets and lions on the knees
    kingsguard(r, M, hips) {
      KNIGHT.legs.greaves(r, M, hips);
      const { bulk: b } = r.dims, gold = r.m(0xd8a830);
      for (const s of [1, -1]) plate(r, hips, s * 0.05, -0.12, 0.13 * b, 0.12, 0.16, 0.03, M.main, { edge: gold, spring: { lx: [-0.9, 0.1] } });
      for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; sh.add(box(0.09, 0.08, 0.04, gold, 0, -0.03, 0.12)); sh.add(box(0.04, 0.03, 0.03, gold, 0, -0.05, 0.14)); }
    },
    // greaves with molten cracks glowing down the shins
    ember(r, M, hips) {
      KNIGHT.legs.greaves(r, M, hips);
      const { bulk: b } = r.dims, lava = glowMat(r, M.trimId === 'default' ? null : M.trimId, 0xff6a1a);
      for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; for (const [x, y, rz] of [[-0.02, -0.15, 0.4], [0.025, -0.24, -0.5], [-0.01, -0.33, 0.3]]) sh.add(rbox(0.012, 0.09, 0.01, lava, x, y, 0.08 * b + 0.005, 0, 0, rz)); }
    },
  },
  sword: {
    longsword(r, M, g) {
      const dark = r.mats.dark;
      g.add(box(0.05, 0.05, 0.22, r.m(0x3a2616), 0, 0, 0));
      g.add(box(0.26, 0.05, 0.05, M.trim, 0, 0, 0.12));
      g.add(box(0.03, 0.08, 0.9, r.m(lighten(M.mainHex, 0.35)), 0, 0, 0.12 + 0.45));
      g.add(box(0.07, 0.07, 0.06, M.trim, 0, 0, -0.13));
      for (const z of [-0.06, 0.0, 0.06]) g.add(box(0.06, 0.06, 0.02, dark, 0, 0, z));
      g.add(box(0.035, 0.025, 0.7, M.main, 0, 0, 0.55));
      return [1.05, 0.25];
    },
    falchion(r, M, g) {
      g.add(box(0.05, 0.05, 0.22, r.m(0x3a2616), 0, 0, 0));
      g.add(box(0.3, 0.05, 0.06, M.trim, 0, 0, 0.12));
      g.add(box(0.06, 0.06, 0.06, M.trim, 0, 0, -0.13));
      const steel = r.m(lighten(M.mainHex, 0.35));
      g.add(box(0.03, 0.09, 0.4, steel, 0, 0, 0.35));
      g.add(rbox(0.03, 0.14, 0.4, steel, 0, 0.025, 0.72, 0.06));
      g.add(rbox(0.032, 0.03, 0.75, M.main, 0, -0.04, 0.55, 0));
      // flair: curled quillons, an etched line down the blade, a tassel off the pommel
      for (const s of [1, -1]) g.add(rbox(0.04, 0.06, 0.04, M.trim, s * 0.17, 0.03, 0.12, 0, 0, s * 0.6));
      g.add(box(0.034, 0.012, 0.6, r.m(lighten(M.mainHex, 0.6)), 0, 0.03, 0.6));
      strip(r, pivot(g, 0, 0, -0.16), 0, 0, 0, 0.03, [0.1, 0.08], r.m(0x8a2a22), { rx: Math.PI / 2, spring: RIBBON, lx: [-0.5, 0.5], th: 0.02 });
      return [1.0, 0.25];
    },
    dawn(r, M, g) {
      KNIGHT.sword.longsword(r, { ...M, main: basic(0xffe08a) }, g);
      return [1.05, 0.25];
    },
      // a blade of blue ice, crystals growing from its edge
    frostbrand(r, M, g) {
      const ice = glowMat(r, M.mainId === 'default' ? null : M.mainId, 0x9ad8ff), core = basic(0xe8f8ff), crystal = glowMat(r, null, 0xc8ecff);
      g.add(box(0.05, 0.05, 0.22, r.m(0x2a3a4a), 0, 0, 0));
      g.add(box(0.28, 0.05, 0.06, M.trim, 0, 0, 0.12)); g.add(box(0.07, 0.07, 0.06, M.trim, 0, 0, -0.13));
      g.add(box(0.035, 0.1, 0.92, ice, 0, 0, 0.58)); g.add(box(0.012, 0.03, 0.85, core, 0, 0, 0.58));
      for (const [y, z, h] of [[0.06, 0.4, 0.1], [-0.06, 0.6, 0.08], [0.06, 0.82, 0.07]]) { const c = cone(0.025, h, crystal, 4); c.position.set(0, y, z); c.rotation.x = y > 0 ? -0.8 : 0.8; g.add(c); }
      return [1.05, 0.25];
    },
  },
  shield: {
    heater(r, M, T) {
      const sh = new THREE.Group(), hi = r.m(0xb9bfc9);
      sh.add(box(0.5, 0.66, 0.06, M.main));
      sh.add(box(0.54, 0.04, 0.08, M.trim, 0, 0.33, 0)); sh.add(box(0.04, 0.6, 0.08, M.trim, 0.25, 0.03, 0)); sh.add(box(0.04, 0.6, 0.08, M.trim, -0.25, 0.03, 0));
      sh.add(box(0.1, 0.56, 0.08, M.trim, 0, 0.02, 0)); sh.add(box(0.46, 0.09, 0.08, M.trim, 0, 0.1, 0));
      const pt = box(0.36, 0.2, 0.06, M.main, 0, -0.38, 0); pt.scale.x = 0.7; sh.add(pt);
      const boss = cyl(0.08, 0.1, 0.07, hi, 8); boss.rotation.x = Math.PI / 2; boss.position.set(0, 0.1, 0.06); sh.add(boss);
      return sh;
    },
    round(r, M, T) {
      const sh = new THREE.Group();
      const face = cyl(0.36, 0.36, 0.06, M.main, 12); face.rotation.x = Math.PI / 2; sh.add(face);
      for (const x of [-0.14, 0, 0.14]) sh.add(box(0.012, 0.62, 0.065, r.m(darken(M.mainHex, 0.3)), x, 0, 0));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 4, 16), M.trim); sh.add(rim);
      const boss = cyl(0.11, 0.13, 0.1, M.trim, 8); boss.rotation.x = Math.PI / 2; boss.position.z = 0.06; sh.add(boss);
      // flair: a ring of rivets and a painted spiral of the trim colour
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; sh.add(box(0.03, 0.03, 0.03, r.m(lighten(M.trimHex, 0.4)), Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.04)); }
      for (let k = 0; k < 9; k++) { const a = k * 0.7, rr = 0.06 + k * 0.022; sh.add(box(0.05, 0.05, 0.012, M.trim, Math.cos(a) * rr, Math.sin(a) * rr, 0.035)); }
      return sh;
    },
    kite(r, M, T) {
      const sh = new THREE.Group(), glow = basic(0xffe9a0);
      sh.add(box(0.5, 0.62, 0.06, M.main, 0, 0.08, 0));
      for (const [w, y] of [[0.4, -0.3], [0.28, -0.42], [0.16, -0.52]]) sh.add(box(w, 0.14, 0.06, M.main, 0, y, 0));
      sh.add(box(0.54, 0.04, 0.08, M.trim, 0, 0.4, 0));
      sh.add(box(0.06, 0.9, 0.08, M.trim, 0, -0.06, 0)); sh.add(box(0.42, 0.06, 0.08, M.trim, 0, 0.12, 0));
      const sun = cyl(0.11, 0.11, 0.05, glow, 10); sun.rotation.x = Math.PI / 2; sun.position.set(0, 0.12, 0.05); sh.add(sun);
      return sh;
    },
      // a heater shield bearing a dragon with burning eyes
    dragon(r, M, T) {
      const sh = KNIGHT.shield.heater(r, M, T), gold = r.m(0xd8a830), eye = basic(0xff3a1a);
      sh.add(box(0.12, 0.16, 0.04, gold, 0, 0.18, 0.06)); // head
      for (const s of [1, -1]) { sh.add(rbox(0.22, 0.04, 0.04, gold, s * 0.12, 0.08, 0.06, 0, 0, s * 0.5)); sh.add(rbox(0.16, 0.04, 0.04, gold, s * 0.13, -0.02, 0.06, 0, 0, s * 0.9)); sh.add(box(0.025, 0.02, 0.02, eye, s * 0.03, 0.2, 0.085)); }
      sh.add(rbox(0.04, 0.22, 0.04, gold, 0, -0.08, 0.06, 0, 0, 0.3)); // tail
      return sh;
    },
  },
};
KITS.knight = {
  weapon: true,
  build(r, o) {
    const fit = o.outfit || {}, T = r.j.torso, H = r.j.head, hips = r.j.hips;
    const S = (slot, m, t) => slotMats(r, fit, slot, m, t);
    const helm = S('helmet', 0x8d939c, 0x3f63a3); (KNIGHT.helmet[helm.piece] || KNIGHT.helmet.great)(r, helm, H);
    for (const [slot, s] of [['pauldronL', 1], ['pauldronR', -1]]) { const M = S(slot, 0x8d939c, 0xb9bfc9); (KNIGHT.pauldron[M.piece] || KNIGHT.pauldron.segmented)(r, M, T, s); }
    const ch = S('chest', 0x8d939c, 0x2d4a7a); (KNIGHT.chest[ch.piece] || KNIGHT.chest.plate)(r, ch, T, hips);
    const lg = S('legs', 0x8d939c, 0x2c3e66); (KNIGHT.legs[lg.piece] || KNIGHT.legs.greaves)(r, lg, hips);
    const shM = S('shield', 0x3a5078, 0xb89a4a); const sh = (KNIGHT.shield[shM.piece] || KNIGHT.shield.heater)(r, shM, T); T.add(sh); r.shield = sh;
    const swM = S('sword', 0x8c929c, 0xb89a4a);
    const g = new THREE.Group(); r.j.handR.add(g); r.wpnR = g;
    const [len, baseZ] = (KNIGHT.sword[swM.piece] || KNIGHT.sword.longsword)(r, swM, g);
    r.base.position.set(0, 0, baseZ); g.add(r.base); r.tip.position.set(0, 0, len); g.add(r.tip);
  },
};

// ================= ROGUE =================
const ROGUE = {
  cloak: {
    tattered(r, M, T, H, o = {}) {
      const { bulk: b } = r.dims;
      ROGUE.hood(r, M, H);
      T.add(box(0.58 * b, 0.15, 0.36 * b, M.main, 0, 0.66, -0.01));
      for (const s of [1, -1]) T.add(rbox(0.2, 0.17, 0.04, M.main, s * 0.12, 0.55, 0.16 * b, 0, 0, s * 0.25));
      const back = -0.17 * b;
      strip(r, T, 0, 0.66, back, 0.22, [0.42, 0.36, 0.22], M.main, { trim: M.trim, lx: [-0.1, 1.35], lx2: [-0.35, 0.8], taper: 0.92 });
      for (const s of [1, -1]) strip(r, T, s * 0.19, 0.66, back + 0.02, 0.2, [0.4, 0.3, 0.17], M.main, { trim: M.trim, ry: s * 0.5, lx: [-0.1, 1.3], lx2: [-0.35, 0.8], taper: 0.85, lz: s > 0 ? [-0.2, 0.7] : [-0.7, 0.2] });
      T.add(box(0.2, 0.3, 0.01, r.m(0x4a2422), 0, 0.5, back + 0.02));
    },
    mantle(r, M, T, H) {
      const { bulk: b } = r.dims;
      ROGUE.hood(r, M, H);
      T.add(box(0.6 * b, 0.16, 0.38 * b, M.main, 0, 0.66, -0.01));
      strip(r, T, 0, 0.66, -0.18 * b, 0.5 * b, [0.26], M.main, { trim: M.trim, lx: [-0.1, 1.0], taper: 0.9 });
      for (const s of [1, -1]) strip(r, T, s * 0.24, 0.66, 0, 0.14, [0.22], M.main, { trim: M.trim, ry: s * 1.2, lx: [-0.3, 0.6] });
      // flair: a fur collar and a brooch clasping the mantle at the chest
      for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) T.add(box(0.11, 0.08, 0.1, r.m(lighten(M.trimHex, 0.2)), x * b, 0.75, -0.04));
      T.add(box(0.08, 0.08, 0.03, r.m(0xc8a040), 0, 0.62, 0.17 * b)); T.add(box(0.04, 0.04, 0.035, basic(0x8a2a22), 0, 0.62, 0.175 * b));
    },
    wraith(r, M, T, H) {
      ROGUE.cloak.tattered(r, M, T, H);
      const ghost = new THREE.MeshBasicMaterial({ color: 0x9aa0c0, transparent: true, opacity: 0.45, depthWrite: false });
      for (const [x, y, z] of [[0.2, 0.62, -0.12], [-0.2, 0.62, -0.12], [0.08, 0.7, -0.18], [-0.08, 0.7, -0.18]]) strip(r, T, x, y, z, 0.05, [0.22, 0.2, 0.18, 0.14], ghost, { spring: { ...RIBBON, k: 18, drag: 0.3, flutter: 0.25 }, lx: [-0.2, 1.7], taper: 0.75, th: 0.02 });
      strip(r, H, 0, 0.32, -0.12, 0.07, [0.2, 0.18, 0.14], ghost, { spring: { ...RIBBON, k: 18, drag: 0.3, flutter: 0.25 }, rx: 0.8, lx: [-0.3, 1.5], taper: 0.7, th: 0.02 });
    },
      // a cloak of black feathers, ragged tips and a feathered collar
    raven(r, M, T, H) {
      ROGUE.cloak.tattered(r, M, T, H);
      const { bulk: b } = r.dims, feather = r.m(darken(M.mainHex, 0.3)), sheen = r.m(lighten(M.trimHex, 0.1));
      for (let k = 0; k < 9; k++) { const x = (-0.24 + k * 0.06) * b; T.add(rbox(0.05, 0.14, 0.02, k % 2 ? feather : sheen, x, 0.7, -0.05 + Math.abs(x) * 0.4, 0.5, 0, x * 2)); }
      for (let k = 0; k < 7; k++) { const x = (-0.18 + k * 0.06) * b; T.add(rbox(0.045, 0.16, 0.015, feather, x, -0.45, -0.2 * b, 0.1, 0, (k - 3) * 0.08)); }
    },
  },
  // the deep hood and the shadowed face inside it (every cloak has one)
  hood(r, M, H) {
    H.add(box(0.1, 0.08, 0.1, r.mats.dark, 0, 0.03, 0));
    H.add(box(0.31, 0.32, 0.33, M.main, 0, 0.19, -0.01));
    H.add(rbox(0.33, 0.09, 0.16, M.main, 0, 0.34, 0.11, -0.25));
    for (const s of [1, -1]) H.add(box(0.06, 0.27, 0.16, M.main, s * 0.135, 0.15, 0.11));
    H.add(box(0.2, 0.21, 0.04, basic(0x060505), 0, 0.17, 0.158));
    const tip = pivot(H, 0, 0.3, -0.16);
    strip(r, tip, 0, 0, 0, 0.12, [0.13, 0.12], M.main, { rx: 0.9, bend: 0.3, taper: 0.6, th: 0.08, lx: [-0.5, 0.9] });
  },
  mask: {
    wrap(r, M, H, T) {
      for (const s of [1, -1]) H.add(box(0.035, 0.018, 0.02, basic(0xc8b48a), s * 0.048, 0.195, 0.17));
      H.add(box(0.2, 0.06, 0.05, M.main, 0, 0.085, 0.158));
      H.add(box(0.2, 0.015, 0.052, M.trim, 0, 0.11, 0.158));
      for (const s of [1, -1]) strip(r, T, s * 0.05, 0.72, -0.16, 0.07, [0.18, 0.16, 0.14], M.trim, { spring: RIBBON, lx: [-0.2, 1.6], rz: s * 0.15, taper: 0.85 });
    },
    iron(r, M, H, T) {
      for (const s of [1, -1]) H.add(box(0.035, 0.018, 0.02, basic(0xc8b48a), s * 0.048, 0.195, 0.17));
      H.add(box(0.2, 0.1, 0.04, M.main, 0, 0.1, 0.16));
      for (const y of [0.08, 0.11]) H.add(box(0.12, 0.012, 0.045, r.mats.dark, 0, y, 0.162));
      for (const s of [1, -1]) H.add(box(0.025, 0.025, 0.045, M.trim, s * 0.085, 0.13, 0.163));
      // flair: a brow ridge, rivets at the cheeks, a leather strap round the hood
      H.add(box(0.21, 0.025, 0.04, M.trim, 0, 0.155, 0.165));
      for (const s of [1, -1]) for (const y of [0.07, 0.13]) H.add(box(0.018, 0.018, 0.045, r.m(lighten(M.trimHex, 0.5)), s * 0.09, y, 0.165));
      H.add(box(0.33, 0.03, 0.34, r.m(0x3a2a1c), 0, 0.1, -0.01));
    },
    bone(r, M, H, T) {
      const bone = colorMat(r, M.mainId, 0xd8d0bc), ember = basic(0xff2a1a);
      H.add(box(0.19, 0.2, 0.03, bone, 0, 0.17, 0.168));
      H.add(box(0.15, 0.04, 0.032, bone, 0, 0.05, 0.166));
      for (const s of [1, -1]) { H.add(box(0.05, 0.035, 0.02, basic(0x0a0404), s * 0.048, 0.195, 0.182)); H.add(box(0.03, 0.02, 0.02, ember, s * 0.048, 0.195, 0.19)); }
      H.add(rbox(0.01, 0.09, 0.034, M.trim, 0.03, 0.24, 0.17, 0, 0, 0.4));
    },
      // a white fox mask with red markings and slit eyes that glow
    kitsune(r, M, H, T) {
      const white = colorMat(r, M.mainId, 0xf0eadc), red = M.trimId && M.trimId !== 'default' ? M.trim : r.m(0xc42a24);
      H.add(box(0.2, 0.2, 0.03, white, 0, 0.16, 0.168));
      H.add(box(0.1, 0.07, 0.06, white, 0, 0.09, 0.19)); // snout
      for (const s of [1, -1]) { const ear = cone(0.045, 0.12, white, 4); ear.position.set(s * 0.08, 0.31, 0.16); H.add(ear); H.add(rbox(0.06, 0.015, 0.035, basic(0xffd040), s * 0.05, 0.195, 0.186, 0, 0, s * 0.3)); H.add(rbox(0.012, 0.07, 0.035, red, s * 0.075, 0.13, 0.186, 0, 0, s * 0.5)); }
      H.add(box(0.012, 0.06, 0.035, red, 0, 0.24, 0.186));
    },
  },
  shirt: {
    jerkin(r, M, T) {
      const { bulk: b } = r.dims, steel = r.m(0xc4cad3), grip = r.m(0x2a1c14), wrap = r.m(0xa8977c);
      T.add(rbox(0.05, 0.52, 0.02, M.trim, 0, 0.42, 0.145 * b, 0, 0, 0.62));
      T.add(rbox(0.05, 0.52, 0.02, M.trim, 0, 0.42, 0.145 * b, 0, 0, -0.62));
      T.add(box(0.38 * b, 0.065, 0.24 * b, M.trim, 0, 0.07, 0));
      T.add(box(0.06, 0.05, 0.03, steel, 0, 0.07, 0.125 * b));
      for (const s of [1, -1]) T.add(box(0.09, 0.1, 0.08, M.trim, s * 0.16, 0.03, 0.08));
      T.add(rbox(0.06, 0.34, 0.05, grip, -0.1, 0.05, -0.14, 0, 0, 0.9));
      for (const L of [true, false]) {
        const fa = r.j[L ? 'foreL' : 'foreR'], sh = r.j[L ? 'shinL' : 'shinR'];
        for (const y of [-0.07, -0.17, -0.27]) fa.add(box(0.125 * b, 0.035, 0.135 * b, wrap, 0, y, 0));
        for (const y of [-0.1, -0.22, -0.34]) sh.add(box(0.14 * b, 0.035, 0.16 * b, wrap, 0, y, 0));
      }
    },
    brigandine(r, M, T) {
      const { bulk: b } = r.dims, stud = r.m(lighten(M.trimHex, 0.4));
      T.add(box(0.48 * b, 0.4, 0.29 * b, M.main, 0, 0.47, 0));
      for (let y = 0.34; y < 0.64; y += 0.08) for (const x of [-0.12, -0.04, 0.04, 0.12]) T.add(box(0.025, 0.025, 0.02, stud, x, y, 0.15 * b));
      T.add(box(0.32, 0.1, 0.32, M.trim, 0, 0.72, 0));
      T.add(box(0.4 * b, 0.07, 0.25 * b, M.trim, 0, 0.07, 0));
      for (const L of [true, false]) { const fa = r.j[L ? 'foreL' : 'foreR']; fa.add(box(0.13 * b, 0.16, 0.14 * b, M.trim, 0, -0.2, 0)); }
      // flair: shoulder straps with buckles, pouches on the belt, a dagger sheath across the back
      for (const s of [1, -1]) { T.add(box(0.06, 0.3, 0.03, M.trim, s * 0.15, 0.6, 0.15 * b)); T.add(box(0.05, 0.04, 0.035, stud, s * 0.15, 0.5, 0.16 * b)); }
      for (const s of [1, -1]) T.add(box(0.08, 0.09, 0.07, M.trim, s * 0.17, 0.02, 0.09));
      T.add(rbox(0.06, 0.36, 0.05, r.m(0x2a1c14), 0.06, 0.4, -0.16, 0, 0, -0.7));
    },
      // a crimson sash and a bandolier of throwing knives
    assassin(r, M, T) {
      ROGUE.shirt.jerkin(r, M, T);
      const { bulk: b } = r.dims, sash = r.m(0x8a1a16), steel = r.m(0xc4cad3);
      T.add(rbox(0.09, 0.56, 0.025, sash, 0, 0.4, 0.15 * b, 0, 0, -0.62));
      strip(r, T, 0.18 * b, 0.12, 0.12 * b, 0.07, [0.16, 0.12], sash, { spring: RIBBON, lx: [-1, 0.3], th: 0.015 });
      for (let k = 0; k < 4; k++) { const t = 0.25 + k * 0.12; T.add(rbox(0.02, 0.1, 0.02, steel, -0.16 + k * 0.08, 0.6 - k * 0.09, 0.165 * b, 0, 0, 0.62)); }
    },
    // a shirt of shadow cloth, violet runes running through it
    shadowweave(r, M, T) {
      ROGUE.shirt.jerkin(r, M, T);
      const { bulk: b } = r.dims, rune = glowMat(r, M.trimId === 'default' ? null : M.trimId, 0xa86aff);
      for (const [x, y, h, rz] of [[-0.08, 0.5, 0.18, 0.2], [0.08, 0.5, 0.18, -0.2], [0, 0.36, 0.1, 0], [-0.12, 0.3, 0.08, 0.8], [0.12, 0.3, 0.08, -0.8]]) T.add(rbox(0.015, h, 0.01, rune, x * b, y, 0.15 * b, 0, 0, rz));
      for (const L of [true, false]) r.j[L ? 'foreL' : 'foreR'].add(box(0.13 * r.dims.bulk, 0.015, 0.14 * r.dims.bulk, rune, 0, -0.12, 0));
    },
  },
  band: {
    cloth(r, M, arm) {
      const { bulk: b } = r.dims;
      arm.add(box(0.135 * b, 0.05, 0.145 * b, M.main, 0, -0.2, 0));
      strip(r, arm, 0.07 * b, -0.2, 0, 0.03, [0.1, 0.08], M.trim, { spring: RIBBON, lx: [-0.3, 0.8], th: 0.015 });
      // flair: a little knot where it is tied
      arm.add(box(0.04, 0.04, 0.04, M.trim, 0.075 * b, -0.2, 0.02));
    },
    bracer(r, M, arm) {
      const { bulk: b } = r.dims;
      arm.add(box(0.14 * b, 0.12, 0.15 * b, M.main, 0, -0.2, 0));
      arm.add(box(0.05, 0.04, 0.02, M.trim, 0, -0.2, 0.08 * b));
      arm.add(box(0.145 * b, 0.015, 0.155 * b, M.trim, 0, -0.15, 0));
      // flair: a second strap and a row of studs
      arm.add(box(0.145 * b, 0.015, 0.155 * b, M.trim, 0, -0.25, 0));
      for (const y of [-0.17, -0.2, -0.23]) arm.add(box(0.02, 0.02, 0.02, r.m(lighten(M.trimHex, 0.5)), 0.075 * b, y, 0));
    },
      // a coiled serpent of bronze with ruby eyes
    serpent(r, M, arm) {
      const { bulk: b } = r.dims, bronze = r.m(0xa8743a);
      for (let k = 0; k < 6; k++) { const a = k * 1.1, y = -0.14 - k * 0.025; arm.add(rbox(0.04, 0.025, 0.04, k % 2 ? bronze : M.main, Math.cos(a) * 0.07 * b, y, Math.sin(a) * 0.075 * b, 0, -a, 0)); }
      arm.add(box(0.05, 0.03, 0.05, bronze, 0.065 * b, -0.12, 0.03)); for (const z of [0.01, 0.05]) arm.add(box(0.012, 0.012, 0.012, basic(0xff2a3a), 0.085 * b, -0.11, z));
    },
    // a bracer hiding a blade that juts along the arm
    blade(r, M, arm) {
      ROGUE.band.bracer(r, M, arm);
      const { bulk: b } = r.dims, sp = cone(0.02, 0.22, r.m(0xd8dce4), 4); sp.position.set(0.08 * b, -0.08, 0); arm.add(sp);
      arm.add(box(0.03, 0.06, 0.04, M.trim, 0.08 * b, -0.2, 0));
    },
  },
  knives: {
    curved(r, M) {
      const steel = M.main, edge = r.m(lighten(M.mainHex, 0.5)), steelDk = r.m(darken(M.mainHex, 0.5)), grip = M.trim, wrap = r.m(0xa8977c);
      return (hand) => {
        const g = new THREE.Group(); hand.add(g);
        g.add(box(0.04, 0.04, 0.14, grip, 0, 0, 0));
        for (const z of [-0.04, 0.0, 0.04]) g.add(box(0.046, 0.046, 0.015, wrap, 0, 0, z));
        g.add(box(0.06, 0.06, 0.04, steelDk, 0, 0, -0.09));
        g.add(box(0.15, 0.03, 0.035, steelDk, 0, 0, 0.08));
        for (const s of [1, -1]) g.add(rbox(0.03, 0.06, 0.03, steelDk, s * 0.075, 0.02, 0.085, 0, 0, s * 0.5));
        g.add(box(0.02, 0.066, 0.15, steel, 0, 0, 0.17));
        g.add(rbox(0.02, 0.058, 0.13, steel, 0, 0.012, 0.3, -0.18));
        g.add(rbox(0.018, 0.04, 0.11, steel, 0, 0.038, 0.41, -0.42));
        g.add(box(0.024, 0.018, 0.2, steelDk, 0, -0.004, 0.22));
        g.add(rbox(0.022, 0.012, 0.25, edge, 0, 0.035, 0.27, -0.12));
        return g;
      };
    },
    stiletto(r, M) {
      return (hand) => {
        const g = new THREE.Group(); hand.add(g);
        g.add(box(0.035, 0.035, 0.14, M.trim, 0, 0, 0));
        g.add(box(0.1, 0.03, 0.03, M.trim, 0, 0, 0.08));
        g.add(box(0.05, 0.05, 0.04, M.trim, 0, 0, -0.09));
        const sp = cone(0.018, 0.46, M.main, 4); sp.rotation.x = Math.PI / 2; sp.position.z = 0.32; g.add(sp);
        // flair: rings up the grip and a tassel off the pommel
        for (const z of [-0.04, 0.0, 0.04]) g.add(box(0.045, 0.045, 0.012, r.m(lighten(M.trimHex, 0.5)), 0, 0, z));
        strip(r, pivot(g, 0, 0, -0.11), 0, 0, 0, 0.025, [0.08, 0.06], r.m(0x8a2a22), { rx: Math.PI / 2, spring: RIBBON, lx: [-0.5, 0.5], th: 0.015 });
        return g;
      };
    },
    spectral(r, M) {
      const glow = glowMat(r, M.mainId, 0xff3a2a);
      return ROGUE.knives.curved(r, { ...M, main: glow, mainHex: colorHex(M.mainId, 0xff3a2a) });
    },
      // fangs of bone, serrated, with a beast-tooth guard
    fang(r, M) {
      const bone = colorMat(r, M.mainId, 0xe8dcc0), dark = r.m(0x2a1c14);
      return (hand) => {
        const g = new THREE.Group(); hand.add(g);
        g.add(box(0.04, 0.04, 0.14, M.trim, 0, 0, 0)); g.add(box(0.05, 0.05, 0.04, bone, 0, 0, -0.09));
        for (const s of [1, -1]) { const t = cone(0.02, 0.08, bone, 4); t.position.set(s * 0.05, 0, 0.08); t.rotation.z = -s * 1.2; g.add(t); }
        g.add(rbox(0.025, 0.07, 0.24, bone, 0, 0.01, 0.22, -0.1)); g.add(rbox(0.022, 0.05, 0.14, bone, 0, 0.04, 0.38, -0.35));
        for (let k = 0; k < 5; k++) g.add(box(0.026, 0.02, 0.02, dark, 0, -0.03, 0.14 + k * 0.05));
        return g;
      };
    },
  },
};
KITS.rogue = {
  weapon: true,
  build(r, o) {
    const fit = o.outfit || {}, T = r.j.torso, H = r.j.head;
    const S = (slot, m, t) => slotMats(r, fit, slot, m, t);
    const cl = S('cloak', 0x2c2a30, 0x4a4650); (ROGUE.cloak[cl.piece] || ROGUE.cloak.tattered)(r, cl, T, H);
    const mk = S('mask', 0x3a2224, 0x8a2420); (ROGUE.mask[mk.piece] || ROGUE.mask.wrap)(r, mk, H, T);
    const sh = S('shirt', 0x4a3a2c, 0x4a3626); (ROGUE.shirt[sh.piece] || ROGUE.shirt.jerkin)(r, sh, T);
    for (const [slot, j] of [['bandL', 'armL'], ['bandR', 'armR']]) { const M = S(slot, 0xa8977c, 0x4a3626); (ROGUE.band[M.piece] || ROGUE.band.cloth)(r, M, r.j[j]); }
    const kn = S('knives', 0xc4cad3, 0x2a1c14);
    const dagger = (ROGUE.knives[kn.piece] || ROGUE.knives.curved)(r, kn);
    r.wpnR = dagger(r.j.handR);
    r.base.position.set(0, 0, 0.12); r.wpnR.add(r.base);
    r.tip.position.set(0, 0.05, 0.5); r.wpnR.add(r.tip);
    r.wpnL = dagger(r.j.handL);
    r.tipL = new THREE.Object3D(); r.tipL.position.set(0, 0.05, 0.5); r.wpnL.add(r.tipL);
    r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.12; r.wpnL.add(r.baseL);
    // a lower, coiled stance (visual only); idle: flip the right dagger end over end every few seconds
    r.poseMod = (p) => ({ ...p, by: (p.by ?? 0) - 0.05, torso: add(p.torso, [0.08, 0, 0]), head: add(p.head, [-0.07, 0, 0]) });
    let idleT = 0, flip = -1;
    r.fx = (dt) => {
      if (r.idle) idleT += dt; else { idleT = 0; flip = -1; r.wpnR.rotation.x = r.reverse ? Math.PI : 0; }
      if (flip < 0 && idleT > 3.2) { flip = 0; idleT = 0; }
      if (flip >= 0) {
        flip += dt / 0.5;
        r.wpnR.rotation.x = -Math.PI * 2 * easeOut(Math.min(1, flip));
        if (flip >= 1) { flip = -1; r.wpnR.rotation.x = 0; }
      }
    };
  },
};

// ================= SPELLSWORD =================
const MAGE = {
  shoulder: {
    mantle(r, M, T, rune) {
      const { bulk: b, sw } = r.dims, m = pivot(T, sw, 0.66, 0, 0, 0, -0.3);
      m.add(box(0.24 * b, 0.12, 0.3 * b, M.main, 0.02, 0, 0));
      m.add(box(0.25 * b, 0.025, 0.31 * b, M.trim, 0.02, -0.06, 0));
      m.add(box(0.05, 0.05, 0.02, rune, 0.04, 0, 0.16 * b));
    },
    pauldron(r, M, T, rune) {
      const { bulk: b, sw } = r.dims, pv = pivot(T, sw, 0.67, 0, 0, 0, -0.3);
      pv.add(box(0.24 * b, 0.12, 0.3 * b, M.main, 0.02, 0, 0));
      pv.add(box(0.25 * b, 0.03, 0.31 * b, M.trim, 0.02, 0.06, 0));
      plate(r, pv, 0.04, -0.06, 0, 0.22 * b, 0.07, 0.28 * b, M.main, { edge: M.trim });
      // flair: an engraved rune that glows with her mana, and rivets along the edge
      pv.add(box(0.06, 0.06, 0.02, rune, 0.03, 0.02, 0.16 * b));
      for (const z of [-0.1, 0, 0.1]) pv.add(box(0.025, 0.025, 0.025, r.m(lighten(M.trimHex, 0.4)), 0.13 * b, 0.0, z * b));
    },
    crystal(r, M, T, rune, H) {
      MAGE.shoulder.mantle(r, M, T, rune);
      const { sw } = r.dims, crystal = glowMat(r, M.trimId, 0xc8a8ff);
      for (const s of [1, -1]) for (const [x, y, rz, h] of [[0.02, 0.06, -0.3, 0.26], [0.07, 0.03, -0.75, 0.2], [-0.03, 0.04, 0.15, 0.16]]) {
        const c = cone(0.045, h, crystal, 4); c.position.set(s * (sw + x), 0.7 + y, 0); c.rotation.z = s * rz; T.add(c);
      }
      const crown = pivot(H, 0, 0.42, 0);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, c = cone(0.035, 0.12, crystal, 4); c.position.set(Math.cos(a) * 0.17, 0.02 * Math.sin(a * 3), Math.sin(a) * 0.17); crown.add(c); }
      r.spinners.push({ obj: crown, axis: 'y', speed: 1.4 });
    },
      // feathers of living flame rise from a gilded pauldron
    phoenix(r, M, T, rune) {
      MAGE.shoulder.pauldron(r, M, T, rune);
      const { sw } = r.dims, fire = glowMat(r, M.trimId === 'default' ? null : M.trimId, 0xff8a2a), hot = basic(0xffe08a);
      const pv = pivot(T, sw + 0.04, 0.74, -0.04, 0, 0, -0.3);
      for (let k = 0; k < 5; k++) strip(r, pv, 0, 0, (k - 2) * 0.05, 0.035, [0.12, 0.1], k % 2 ? fire : hot, { rx: Math.PI - 0.5 + (k - 2) * 0.15, spring: { ...RIBBON, k: 40 }, lx: [-0.4, 0.4], th: 0.015, taper: 0.6 });
    },
  },
  shirt: {
    runecoat(r, M, T, rune, hips) {
      const { bulk: b } = r.dims, leather = r.m(0x3a2a20);
      T.add(box(0.38 * b, 0.17, 0.06, M.main, 0, 0.75, -0.13 * b));
      for (const s of [1, -1]) T.add(rbox(0.06, 0.16, 0.2, M.main, s * 0.17, 0.74, -0.03, 0, 0, s * -0.2));
      for (const s of [1, -1]) T.add(rbox(0.09, 0.36, 0.02, M.trim, s * 0.08, 0.5, 0.142 * b, 0, 0, s * 0.18));
      for (const [x, y] of [[0, 0.56], [-0.06, 0.46], [0.06, 0.46], [0, 0.38]]) T.add(box(0.035, 0.035, 0.02, rune, x, y, 0.145 * b));
      T.add(box(0.38 * b, 0.06, 0.24 * b, leather, 0, 0.07, 0));
      for (const s of [1, -1]) T.add(box(0.05, 0.08, 0.05, rune, s * 0.15, 0.05, 0.1));
      for (const s of [1, -1]) {
        strip(r, T, s * 0.1, 0.3, -0.14 * b, 0.18, [0.36, 0.32], M.main, { trim: M.trim, rune, lx: [-0.08, 1.25], ry: s * 0.12, taper: 0.9 });
        strip(r, T, s * 0.1, 0.3, 0.14 * b, 0.15, [0.28, 0.16], M.main, { trim: M.trim, lx: [-1.0, 0.06] });
      }
    },
    robe(r, M, T, rune, hips) {
      const { bulk: b } = r.dims;
      T.add(box(0.48 * b, 0.4, 0.29 * b, M.main, 0, 0.47, 0));
      T.add(box(0.36 * b, 0.12, 0.3, M.main, 0, 0.74, -0.02));
      T.add(box(0.4 * b, 0.07, 0.26 * b, M.trim, 0, 0.1, 0)); // sash
      strip(r, T, 0.12, 0.1, 0.13 * b, 0.06, [0.2, 0.16], M.trim, { lx: [-0.9, 0.2] });
      for (const [x, z, ry] of [[0, 0.13, 0], [0, -0.13, 0], [0.17, 0, 1.4], [-0.17, 0, -1.4]]) strip(r, hips, x * b, 0, z * b, 0.26, [0.4, 0.36], M.main, { trim: M.trim, ry, lx: z > 0 ? [-0.9, 0.1] : [-0.1, 0.9], taper: 1.05 });
      T.add(box(0.035, 0.035, 0.02, rune, 0, 0.56, 0.15 * b));
      // flair: a glowing rune hem, tassels on the sash, a collar mantle
      for (const x of [-0.1, -0.03, 0.04, 0.11]) hips.add(box(0.03, 0.03, 0.02, rune, x * b, -0.68, 0.14 * b));
      for (const x of [-0.06, 0.06]) strip(r, T, x, 0.06, 0.13 * b, 0.025, [0.14, 0.06], r.m(lighten(M.trimHex, 0.3)), { spring: RIBBON, lx: [-0.8, 0.3], th: 0.02 });
      T.add(box(0.5 * b, 0.07, 0.32 * b, M.trim, 0, 0.68, 0));
    },
    starcape(r, M, T, rune, hips) {
      MAGE.shirt.runecoat(r, M, T, rune, hips);
      const { bulk: b } = r.dims, star = basic(0xffffff), night = colorMat(r, M.mainId === 'default' ? 'voidcloth' : M.mainId, 0x141030);
      const panels = [-0.13, 0.13].map((x) => strip(r, T, x * b, 0.66, -0.16 * b, 0.2 * b, [0.4, 0.38, 0.24], night, { trim: M.trim, lx: [-0.1, 1.25], lx2: [-0.3, 0.7], taper: 0.9 }));
      for (const segs of panels) segs.forEach((pv, i) => { for (let k = 0; k < 3; k++) pv.add(box(0.02, 0.02, 0.03, star, (Math.random() - 0.5) * 0.14, -0.06 - Math.random() * (0.3 - i * 0.05), 0)); });
    },
      // the archmage's robe: a towering collar, gold chains and runes that glow all down it
    archmage(r, M, T, rune, hips) {
      MAGE.shirt.robe(r, M, T, rune, hips);
      const { bulk: b } = r.dims, gold = r.m(0xd8a830);
      for (const s of [1, -1]) T.add(rbox(0.06, 0.26, 0.24, M.main, s * 0.2, 0.86, -0.04, 0, 0, s * -0.35));
      for (let k = 0; k < 5; k++) T.add(box(0.03, 0.03, 0.02, gold, (-0.12 + k * 0.06) * b, 0.62 - Math.abs(k - 2) * 0.03, 0.155 * b));
      for (const y of [0.52, 0.44, 0.36, 0.28]) T.add(box(0.03, 0.03, 0.02, rune, 0, y, 0.15 * b));
    },
  },
  pants: {
    trousers(r, M) {
      const { bulk: b } = r.dims;
      for (const L of [true, false]) r.j[L ? 'shinL' : 'shinR'].add(box(0.145 * b, 0.05, 0.165 * b, M.trim, 0, -0.08, 0)); // boot cuffs
    },
    greaves(r, M) {
      const { bulk: b } = r.dims;
      for (const L of [true, false]) {
        const sh = r.j[L ? 'shinL' : 'shinR'];
        sh.add(box(0.15 * b, 0.28, 0.07, M.trim, 0, -0.2, 0.07));
        sh.add(box(0.15 * b, 0.1, 0.09, r.m(lighten(M.trimHex, 0.3)), 0, -0.03, 0.08));
      }
      // flair: a rune on each knee and buckled straps
      const rune = r.glowMats[0]?.mat;
      for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; if (rune) sh.add(box(0.04, 0.04, 0.02, rune, 0, -0.03, 0.13)); for (const y of [-0.15, -0.27]) sh.add(box(0.16 * b, 0.02, 0.1, r.m(0x3a2a1c), 0, y, 0.06)); }
    },
      // rune bands glowing round the shins
    runed(r, M) {
      MAGE.pants.trousers(r, M);
      const { bulk: b } = r.dims, rune = r.glowMats[0]?.mat || basic(0x9fe4ff);
      for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; for (const y of [-0.12, -0.24]) sh.add(box(0.14 * b, 0.02, 0.16 * b, rune, 0, y, 0)); }
    },
    // star-flecked legs with a shard turning round each knee
    astral(r, M) {
      MAGE.pants.trousers(r, M);
      const { bulk: b } = r.dims, star = basic(0xffffff), shard = glowMat(r, M.trimId === 'default' ? null : M.trimId, 0xc8a8ff);
      for (const L of [true, false]) {
        const leg = r.j[L ? 'legL' : 'legR'], sh = r.j[L ? 'shinL' : 'shinR'];
        for (let k = 0; k < 4; k++) leg.add(box(0.015, 0.015, 0.02, star, (Math.random() - 0.5) * 0.12, -0.08 - Math.random() * 0.35, 0.09 * b));
        const orbit = pivot(sh, 0, -0.02, 0); const c = cone(0.025, 0.08, shard, 4); c.position.set(0.14, 0, 0); orbit.add(c);
        r.spinners.push({ obj: orbit, axis: 'y', speed: L ? 2.2 : -2.2 });
      }
    },
  },
  // the wand in her casting hand (right): returns [tip z, base z]
  wand: {
    rune(r, M, g, glow) {
      g.add(box(0.04, 0.04, 0.42, M.main, 0, 0, 0.12));
      for (const z of [-0.02, 0.18]) g.add(box(0.05, 0.05, 0.03, M.trim, 0, 0, z));
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), glow); gem.position.z = 0.38; g.add(gem);
      return [0.42, 0.0];
    },
    bone(r, M, g, glow) {
      const bone = colorMat(r, M.mainId, 0xd8d0bc);
      g.add(rbox(0.045, 0.045, 0.4, bone, 0, 0, 0.12, 0.08));
      for (const z of [0.0, 0.1, 0.2]) g.add(box(0.055, 0.02, 0.055, M.trim, 0, 0, z));
      g.add(box(0.09, 0.09, 0.09, bone, 0, 0.02, 0.36));
      for (const s of [1, -1]) g.add(box(0.02, 0.02, 0.02, glow, s * 0.022, 0.04, 0.405));
      // flair: a ribbon tied below the skull
      strip(r, pivot(g, 0, 0, 0.28), 0, 0, 0, 0.025, [0.1, 0.08], r.m(0x8a2a22), { rx: Math.PI / 2, spring: RIBBON, lx: [-0.6, 0.6], th: 0.015 });
      return [0.42, 0.0];
    },
      // a silver wand with a star turning round its tip
    starfall(r, M, g, glow) {
      g.add(box(0.035, 0.035, 0.4, r.m(0xd8dce8), 0, 0, 0.12));
      for (const z of [0.0, 0.2]) g.add(box(0.05, 0.05, 0.025, M.trim, 0, 0, z));
      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), basic(0xffffff)); tip.position.z = 0.36; g.add(tip);
      const orbit = pivot(g, 0, 0, 0.36); const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), glowMat(r, M.mainId === 'default' ? null : M.mainId, 0xffe08a)); st.position.set(0.09, 0, 0); orbit.add(st);
      r.spinners.push({ obj: orbit, axis: 'z', speed: 4 });
      return [0.4, 0.0];
    },
    // charred wood crowned with a tongue of fire
    ember(r, M, g, glow) {
      g.add(rbox(0.045, 0.045, 0.38, r.m(0x2a1a12), 0, 0, 0.12, 0.05));
      g.add(box(0.06, 0.06, 0.03, M.trim, 0, 0, 0.28));
      const fire = glowMat(r, M.mainId === 'default' ? null : M.mainId, 0xff7a1a), hot = basic(0xffe08a);
      for (const [x, y, h, m] of [[0, 0, 0.14, fire], [0.02, 0.01, 0.1, hot], [-0.02, -0.01, 0.09, fire]]) { const c = cone(0.03, h, m, 4); c.rotation.x = Math.PI / 2; c.position.set(x, y, 0.36 + h / 2); g.add(c); }
      return [0.44, 0.0];
    },
  },
  // the sword in her fighting hand (left): returns the blade length
  sword: {
    runeblade(r, M, g) {
      const blade = glowMat(r, M.mainId, 0x7ab4ff), core = basic(lighten(colorHex(M.mainId, 0x7ab4ff), 0.8));
      g.add(box(0.045, 0.045, 0.18, r.m(0x2a1c14), 0, 0, 0));
      g.add(box(0.06, 0.06, 0.05, M.trim, 0, 0, -0.11));
      g.add(box(0.2, 0.045, 0.045, M.trim, 0, 0, 0.1));
      g.add(box(0.03, 0.08, 0.6, blade, 0, 0, 0.42));
      g.add(box(0.012, 0.03, 0.55, core, 0, 0, 0.42));
      return 0.72;
    },
    steel(r, M, g) {
      g.add(box(0.04, 0.04, 0.16, r.m(0x2a1c14), 0, 0, 0));
      g.add(box(0.18, 0.04, 0.04, M.trim, 0, 0, 0.09));
      g.add(box(0.05, 0.05, 0.04, M.trim, 0, 0, -0.1));
      g.add(box(0.025, 0.07, 0.56, M.main, 0, 0, 0.39));
      g.add(box(0.026, 0.02, 0.48, r.m(lighten(M.mainHex, 0.4)), 0, 0.02, 0.38));
      // flair: curled quillons and a glowing rune etched into the fuller
      for (const s of [1, -1]) g.add(rbox(0.03, 0.05, 0.03, M.trim, s * 0.1, 0.025, 0.09, 0, 0, s * 0.6));
      g.add(box(0.028, 0.012, 0.3, basic(0x9fe4ff), 0, 0.022, 0.3));
      return 0.68;
    },
      // a crescent of pale moonlight
    moonblade(r, M, g) {
      const light = glowMat(r, M.mainId === 'default' ? null : M.mainId, 0xd8e8ff);
      g.add(box(0.045, 0.045, 0.18, r.m(0x2a2a3a), 0, 0, 0));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10), M.trim); ring.position.z = 0.1; g.add(ring);
      const geo = new THREE.TorusGeometry(0.42, 0.025, 3, 12, 1.5); geo.rotateZ(-Math.PI / 2); geo.rotateY(-Math.PI / 2); geo.translate(0, 0.42, 0.12);
      const blade = new THREE.Mesh(geo, light); blade.scale.x = 0.7; g.add(blade);
      return 0.62;
    },
    // a black blade with a violet void burning down its core
    voidedge(r, M, g) {
      const black = colorMat(r, M.mainId === 'default' ? 'voidcloth' : M.mainId, 0x141018), core = glowMat(r, M.trimId === 'default' ? null : M.trimId, 0xa86aff);
      g.add(box(0.045, 0.045, 0.18, r.m(0x1a1420), 0, 0, 0));
      for (const s of [1, -1]) { const c = cone(0.03, 0.1, core, 4); c.position.set(s * 0.08, 0, 0.1); c.rotation.z = -s * Math.PI / 2; g.add(c); }
      g.add(box(0.035, 0.09, 0.62, black, 0, 0, 0.44)); g.add(box(0.012, 0.035, 0.58, core, 0, 0, 0.44));
      return 0.74;
    },
  },
};
KITS.mage = {
  weapon: true,
  build(r, o) {
    const fit = o.outfit || {}, T = r.j.torso, H = r.j.head, hips = r.j.hips;
    const S = (slot, m, t) => slotMats(r, fit, slot, m, t);
    const C = { runeLo: 0x1c2d5c, runeHi: 0x9fe4ff, glyph: 0xa8e8ff, hair: 0xc8ccd8, hairDk: 0x8a90a4 };
    const rune = basic(C.runeHi);
    r.glowMats.push({ mat: rune, lo: new THREE.Color(C.runeLo), hi: new THREE.Color(C.runeHi) });
    const glyph = basic(C.glyph);
    const shM = S('shirt', 0x22305c, 0xb89a4a); (MAGE.shirt[shM.piece] || MAGE.shirt.runecoat)(r, shM, T, rune, hips);
    const soM = S('shoulder', 0x22305c, 0xb89a4a); (MAGE.shoulder[soM.piece] || MAGE.shoulder.mantle)(r, soM, T, rune, H);
    const paM = S('pants', 0x2c3a66, 0x7a86b0); (MAGE.pants[paM.piece] || MAGE.pants.trousers)(r, paM);
    // head: silver hair with bangs, glowing eyes, a rune mark under one eye, a ponytail that swings
    const { skin } = r.mats, hair = r.m(C.hair), hairDk = r.m(C.hairDk);
    H.add(box(0.1, 0.08, 0.1, skin, 0, 0.03, 0));
    H.add(box(0.24, 0.26, 0.25, skin, 0, 0.17, 0));
    H.add(box(0.27, 0.1, 0.28, hair, 0, 0.32, -0.01));
    H.add(box(0.27, 0.2, 0.08, hair, 0, 0.2, -0.13));
    for (const s of [1, -1]) H.add(box(0.04, 0.2, 0.2, hair, s * 0.13, 0.22, -0.02));
    H.add(rbox(0.12, 0.08, 0.04, hairDk, 0.05, 0.27, 0.13, 0, 0, 0.3));
    H.add(rbox(0.1, 0.06, 0.04, hair, -0.07, 0.28, 0.13, 0, 0, -0.25));
    for (const s of [1, -1]) H.add(box(0.045, 0.025, 0.02, glyph, s * 0.06, 0.19, 0.13));
    H.add(box(0.02, 0.05, 0.015, rune, -0.065, 0.14, 0.128));
    const hp = pivot(H, 0, 0.3, -0.15);
    strip(r, hp, 0, 0, 0, 0.08, [0.14, 0.14, 0.12], hair, { rx: 0.35, bend: 0.15, taper: 0.8, th: 0.07, lx: [-0.3, 1.2] });
    // the wand in her casting hand
    const waM = S('wand', 0x3a2a20, 0xb89a4a);
    const g = new THREE.Group(); r.j.handR.add(g); r.wpnR = g;
    const [tip, base] = (MAGE.wand[waM.piece] || MAGE.wand.rune)(r, waM, g, glyph);
    r.base.position.set(0, 0, base); g.add(r.base); r.tip.position.set(0, 0, tip); g.add(r.tip);
    // the sword she fights with, in the left hand
    const swM = S('sword', 0x7ab4ff, 0xb89a4a);
    const g2 = new THREE.Group(); r.j.handL.add(g2); r.wpnL = g2;
    const len = (MAGE.sword[swM.piece] || MAGE.sword.runeblade)(r, swM, g2);
    r.tipL = new THREE.Object3D(); r.tipL.position.z = len; g2.add(r.tipL);
    r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.12; g2.add(r.baseL);
    // three glyphs orbiting the off hand
    const orbit = pivot(r.j.handL, 0, 0, 0);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; orbit.add(rbox(0.04, 0.04, 0.012, glyph, Math.cos(a) * 0.17, 0.04 * Math.sin(a * 2), Math.sin(a) * 0.17, 0, a, 0.78)); }
    r.spinners.push({ obj: orbit, axis: 'y', speed: 3.2 });
    r.setGlow(1);
  },
};
