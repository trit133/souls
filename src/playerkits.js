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
    },
    radiant(r, M, T, hips) {
      KNIGHT.chest.plate(r, M, T, hips);
      const { bulk: b } = r.dims;
      for (const x of [-0.16, 0, 0.16]) strip(r, T, x * b, 0.66, -0.16 * b, 0.18 * b, [0.42, 0.4, 0.26], r.m(lighten(M.mainHex, 0.4)), { trim: M.trim, lx: [-0.1, 1.2], lx2: [-0.3, 0.7], taper: 0.92 });
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
      return [1.0, 0.25];
    },
    dawn(r, M, g) {
      KNIGHT.sword.longsword(r, { ...M, main: basic(0xffe08a) }, g);
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
    },
    wraith(r, M, T, H) {
      ROGUE.cloak.tattered(r, M, T, H);
      const ghost = new THREE.MeshBasicMaterial({ color: 0x9aa0c0, transparent: true, opacity: 0.45, depthWrite: false });
      for (const [x, y, z] of [[0.2, 0.62, -0.12], [-0.2, 0.62, -0.12], [0.08, 0.7, -0.18], [-0.08, 0.7, -0.18]]) strip(r, T, x, y, z, 0.05, [0.22, 0.2, 0.18, 0.14], ghost, { spring: { ...RIBBON, k: 18, drag: 0.3, flutter: 0.25 }, lx: [-0.2, 1.7], taper: 0.75, th: 0.02 });
      strip(r, H, 0, 0.32, -0.12, 0.07, [0.2, 0.18, 0.14], ghost, { spring: { ...RIBBON, k: 18, drag: 0.3, flutter: 0.25 }, rx: 0.8, lx: [-0.3, 1.5], taper: 0.7, th: 0.02 });
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
    },
    bone(r, M, H, T) {
      const bone = colorMat(r, M.mainId, 0xd8d0bc), ember = basic(0xff2a1a);
      H.add(box(0.19, 0.2, 0.03, bone, 0, 0.17, 0.168));
      H.add(box(0.15, 0.04, 0.032, bone, 0, 0.05, 0.166));
      for (const s of [1, -1]) { H.add(box(0.05, 0.035, 0.02, basic(0x0a0404), s * 0.048, 0.195, 0.182)); H.add(box(0.03, 0.02, 0.02, ember, s * 0.048, 0.195, 0.19)); }
      H.add(rbox(0.01, 0.09, 0.034, M.trim, 0.03, 0.24, 0.17, 0, 0, 0.4));
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
    },
  },
  band: {
    cloth(r, M, arm) {
      const { bulk: b } = r.dims;
      arm.add(box(0.135 * b, 0.05, 0.145 * b, M.main, 0, -0.2, 0));
      strip(r, arm, 0.07 * b, -0.2, 0, 0.03, [0.1, 0.08], M.trim, { spring: RIBBON, lx: [-0.3, 0.8], th: 0.015 });
    },
    bracer(r, M, arm) {
      const { bulk: b } = r.dims;
      arm.add(box(0.14 * b, 0.12, 0.15 * b, M.main, 0, -0.2, 0));
      arm.add(box(0.05, 0.04, 0.02, M.trim, 0, -0.2, 0.08 * b));
      arm.add(box(0.145 * b, 0.015, 0.155 * b, M.trim, 0, -0.15, 0));
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
        return g;
      };
    },
    spectral(r, M) {
      const glow = glowMat(r, M.mainId, 0xff3a2a);
      return ROGUE.knives.curved(r, { ...M, main: glow, mainHex: colorHex(M.mainId, 0xff3a2a) });
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
    },
    starcape(r, M, T, rune, hips) {
      MAGE.shirt.runecoat(r, M, T, rune, hips);
      const { bulk: b } = r.dims, star = basic(0xffffff), night = colorMat(r, M.mainId === 'default' ? 'voidcloth' : M.mainId, 0x141030);
      const panels = [-0.13, 0.13].map((x) => strip(r, T, x * b, 0.66, -0.16 * b, 0.2 * b, [0.4, 0.38, 0.24], night, { trim: M.trim, lx: [-0.1, 1.25], lx2: [-0.3, 0.7], taper: 0.9 }));
      for (const segs of panels) segs.forEach((pv, i) => { for (let k = 0; k < 3; k++) pv.add(box(0.02, 0.02, 0.03, star, (Math.random() - 0.5) * 0.14, -0.06 - Math.random() * (0.3 - i * 0.05), 0)); });
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
      return [0.42, 0.0];
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
      return 0.68;
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
