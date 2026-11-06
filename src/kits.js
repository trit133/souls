// Per-character detail for buildHumanoid (models.js): extra plates, cloth, straps and weapons,
// plus the hinged parts that swing in the wind (rig.spring) and rattle (rig.kick).
// Purely visual: hit-boxes are circles around the actor, never these meshes.
import * as THREE from 'three';
import { box, cyl, cone, rbox, pivot } from './mesh.js';

const basic = (c) => new THREE.MeshBasicMaterial({ color: c });

// spring presets
const CLOTH = { k: 55, d: 6, drag: 0.13, inertia: 0.013, turn: 0.06, flutter: 0.07 };
const HEAVY_CLOTH = { k: 70, d: 8, drag: 0.08, inertia: 0.01, turn: 0.04, flutter: 0.03 };
const RIBBON = { k: 28, d: 3.5, drag: 0.22, inertia: 0.016, turn: 0.1, flutter: 0.16 };
const PLATE = { k: 520, d: 10, drag: 0, wind: 0, inertia: 0.003, turn: 0, flutter: 0, rattle: 1, lx: [-0.35, 0.35], lz: [-0.3, 0.3] };

// A strip of cloth hanging from (x, y, z) on `parent`: one hinged segment per length, each
// child of the last, so it bends and waves. Widths taper by `taper` per segment.
function strip(r, parent, x, y, z, w, lens, m, o = {}) {
  const sp = o.spring || CLOTH, th = o.th ?? 0.025;
  let p = parent, px = x, py = y, pz = z, ww = w;
  const segs = [];
  lens.forEach((len, i) => {
    const pv = pivot(p, px, py, pz, i === 0 ? o.rx || 0 : o.bend || 0, i === 0 ? o.ry || 0 : 0, i === 0 ? o.rz || 0 : 0);
    pv.add(box(ww, len, th, m, 0, -len / 2, 0));
    if (o.trim && i === lens.length - 1) pv.add(box(ww * 1.02, 0.035, th * 1.4, o.trim, 0, -len + 0.02, 0));
    if (o.rune && i === lens.length - 1) pv.add(box(ww * 0.25, len * 0.5, th * 1.6, o.rune, 0, -len * 0.5, 0));
    const lim = i === 0 ? o.lx : o.lx2 || o.lx;
    r.spring(pv, { ...sp, k: sp.k * (i ? 0.75 : 1), lx: lim, lz: o.lz });
    segs.push(pv);
    p = pv; px = 0; py = -len; pz = 0; ww *= o.taper ?? 1;
  });
  return segs;
}

// a stiff plate that rattles (pivot at its top edge)
function plate(r, parent, x, y, z, w, h, d, m, o = {}) {
  const pv = pivot(parent, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0);
  pv.add(box(w, h, d, m, 0, -h / 2, 0));
  if (o.edge) pv.add(box(w * 1.02, 0.025, d * 1.2, o.edge, 0, -h + 0.012, 0));
  r.spring(pv, { ...PLATE, ...(o.spring || {}) });
  return pv;
}

export const KITS = {
  // ---------------- players ----------------
  knight: {
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const { armor, cloth, accent, dark } = r.mats;
      const hi = r.m(0xb9bfc9), gold = r.m(0xb89a4a), blue = r.m(0x3f63a3);
      const T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // breastplate: central ridge, lower edge, gorget
      T.add(box(0.06, 0.3, 0.025, hi, 0, 0.5, 0.14 * b));
      T.add(box(0.48 * b, 0.045, 0.29 * b, hi, 0, 0.31, 0));
      T.add(box(0.3, 0.09, 0.3, armor, 0, 0.67, 0));
      T.add(box(0.31, 0.03, 0.31, hi, 0, 0.71, 0));
      // belt + buckle
      T.add(box(0.38 * b, 0.07, 0.24 * b, dark, 0, 0.06, 0));
      T.add(box(0.08, 0.06, 0.025, gold, 0, 0.06, 0.125 * b));
      // segmented pauldrons: a fixed cap and two lames that rattle
      for (const s of [1, -1]) {
        const pv = pivot(T, s * sw, 0.66, 0, 0, 0, -s * 0.3);
        pv.add(box(0.23 * b, 0.11, 0.29 * b, armor, s * 0.02, 0, 0));
        pv.add(box(0.235 * b, 0.025, 0.295 * b, hi, s * 0.02, 0.05, 0));
        plate(r, pv, s * 0.035, -0.04, 0, 0.21 * b, 0.07, 0.27 * b, armor, { edge: hi });
        plate(r, pv, s * 0.05, -0.1, 0, 0.19 * b, 0.065, 0.25 * b, armor, { edge: hi });
      }
      // tassets over the hips
      for (const s of [1, -1]) {
        plate(r, hips, s * 0.09, -0.04, 0.12 * b, 0.15, 0.22, 0.03, armor, { edge: hi, spring: { lx: [-0.9, 0.1] } });
        plate(r, hips, s * 0.2, -0.02, 0, 0.03, 0.2, 0.17, armor, { edge: hi, spring: { lz: s > 0 ? [-0.1, 0.6] : [-0.6, 0.1] } });
      }
      // tabard front and back, with a gold hem
      strip(r, T, 0, 0.3, 0.148 * b, 0.27 * b, [0.3, 0.3], accent, { trim: gold, lx: [-1.0, 0.06] });
      strip(r, T, 0, 0.32, -0.15 * b, 0.3 * b, [0.3, 0.26], accent, { trim: gold, lx: [-0.06, 1.1] });
      // helm: visor ridge, breaths, cheek guards, a plume that bounces
      H.add(box(0.29, 0.05, 0.05, hi, 0, 0.25, 0.15));
      for (const s of [1, -1]) {
        H.add(box(0.03, 0.14, 0.12, armor, s * 0.14, 0.12, 0.09));
        H.add(box(0.02, 0.02, 0.02, dark, s * 0.05, 0.12, 0.15));
      }
      const pl = pivot(H, 0, 0.42, -0.06);
      strip(r, pl, 0, 0, 0, 0.06, [0.14, 0.13, 0.12], blue, { rx: Math.PI - 1.5, bend: 0.55, spring: { ...CLOTH, k: 80 }, lx: [-0.6, 0.6], th: 0.05, taper: 0.85 });
      // elbows, gauntlets, knees, sabatons
      for (const L of [true, false]) {
        const fa = r.j[L ? 'foreL' : 'foreR'], hd = r.j[L ? 'handL' : 'handR'], sh = r.j[L ? 'shinL' : 'shinR'];
        fa.add(box(0.14 * b, 0.09, 0.16 * b, hi, 0, -0.02, 0));
        fa.add(box(0.13 * b, 0.12, 0.14 * b, armor, 0, -r.dims.fore + 0.06, 0));
        hd.add(box(0.12, 0.09, 0.12, armor, 0, 0.01, 0));
        sh.add(box(0.15 * b, 0.11, 0.07, hi, 0, -0.03, 0.08));
        sh.add(box(0.16 * b, 0.06, 0.22 * b, armor, 0, -r.dims.shin + 0.06, 0.06));
      }
      // shield: blue field, gold rim and cross, a steel boss
      const sh = new THREE.Group();
      const field = r.m(0x3a5078);
      sh.add(box(0.5, 0.66, 0.06, field));
      sh.add(box(0.54, 0.04, 0.08, gold, 0, 0.33, 0)); sh.add(box(0.04, 0.6, 0.08, gold, 0.25, 0.03, 0)); sh.add(box(0.04, 0.6, 0.08, gold, -0.25, 0.03, 0));
      sh.add(box(0.1, 0.56, 0.08, gold, 0, 0.02, 0)); sh.add(box(0.46, 0.09, 0.08, gold, 0, 0.1, 0));
      const pt = box(0.36, 0.2, 0.06, field, 0, -0.38, 0); pt.scale.x = 0.7; sh.add(pt);
      const boss = cyl(0.08, 0.1, 0.07, hi, 8); boss.rotation.x = Math.PI / 2; boss.position.set(0, 0.1, 0.06); sh.add(boss);
      T.add(sh); r.shield = sh;
      // sword detail: pommel, wrapped grip, fuller
      const g = r.wpnR;
      g.add(box(0.07, 0.07, 0.06, gold, 0, 0, -0.13));
      for (const z of [-0.06, 0.0, 0.06]) g.add(box(0.06, 0.06, 0.02, dark, 0, 0, z));
      g.add(box(0.035, 0.025, 0.7, r.m(0x8c929c), 0, 0, 0.55));
    },
  },

  rogue: {
    weapon: true,
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const cloak = r.m(0x2c2a30), lining = r.m(0x4a2422), leather = r.m(0x4a3626), wrap = r.m(0xa8977c);
      const scarf = r.m(0x8a2420), steel = r.m(0xc4cad3), steelDk = r.m(0x5e646c), edge = r.m(0xeef3f8), grip = r.m(0x2a1c14);
      const T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // deep hood: a shell with an overhanging brim around a shadowed face, two faint eye glints
      H.add(box(0.1, 0.08, 0.1, r.mats.dark, 0, 0.03, 0));
      H.add(box(0.31, 0.32, 0.33, cloak, 0, 0.19, -0.01));
      H.add(rbox(0.33, 0.09, 0.16, cloak, 0, 0.34, 0.11, -0.25));
      for (const s of [1, -1]) H.add(box(0.06, 0.27, 0.16, cloak, s * 0.135, 0.15, 0.11));
      H.add(box(0.2, 0.21, 0.04, basic(0x060505), 0, 0.17, 0.158));
      for (const s of [1, -1]) H.add(box(0.035, 0.018, 0.02, basic(0xc8b48a), s * 0.048, 0.195, 0.17));
      H.add(box(0.2, 0.06, 0.05, r.m(0x3a2224), 0, 0.085, 0.158)); // dark wrap over the mouth
      H.add(box(0.2, 0.015, 0.052, scarf, 0, 0.11, 0.158));
      const tip = pivot(H, 0, 0.3, -0.16);
      strip(r, tip, 0, 0, 0, 0.12, [0.13, 0.12], cloak, { rx: 0.9, bend: 0.3, taper: 0.6, th: 0.08, lx: [-0.5, 0.9] });
      // mantle over the shoulders, drape points in front
      T.add(box(0.58 * b, 0.15, 0.36 * b, cloak, 0, 0.66, -0.01));
      for (const s of [1, -1]) T.add(rbox(0.2, 0.17, 0.04, cloak, s * 0.12, 0.55, 0.16 * b, 0, 0, s * 0.25));
      // leather jerkin: crossed straps, belt, pouches, a sheath at the back
      T.add(rbox(0.05, 0.52, 0.02, leather, 0, 0.42, 0.145 * b, 0, 0, 0.62));
      T.add(rbox(0.05, 0.52, 0.02, leather, 0, 0.42, 0.145 * b, 0, 0, -0.62));
      T.add(box(0.38 * b, 0.065, 0.24 * b, leather, 0, 0.07, 0));
      T.add(box(0.06, 0.05, 0.03, steel, 0, 0.07, 0.125 * b));
      for (const s of [1, -1]) T.add(box(0.09, 0.1, 0.08, leather, s * 0.16, 0.03, 0.08));
      T.add(rbox(0.06, 0.34, 0.05, grip, -0.1, 0.05, -0.14, 0, 0, 0.9));
      // the cloak: three tattered panels from the shoulders, the sides wrapping round
      const back = -0.17 * b, hem = r.m(0x4a4650);
      strip(r, T, 0, 0.66, back, 0.22, [0.42, 0.36, 0.22], cloak, { trim: hem, lx: [-0.1, 1.35], lx2: [-0.35, 0.8], taper: 0.92 });
      for (const s of [1, -1]) {
        strip(r, T, s * 0.19, 0.66, back + 0.02, 0.2, [0.4, 0.3, 0.17], cloak, { trim: hem, ry: s * 0.5, lx: [-0.1, 1.3], lx2: [-0.35, 0.8], taper: 0.85, lz: s > 0 ? [-0.2, 0.7] : [-0.7, 0.2] });
      }
      // a red lining shows on the inside of the middle panel's top
      T.add(box(0.2, 0.3, 0.01, lining, 0, 0.5, back + 0.02));
      // scarf tails off the back of the neck: light, they stream in the wind
      for (const s of [1, -1]) strip(r, T, s * 0.05, 0.72, -0.16, 0.07, [0.18, 0.16, 0.14], scarf, { spring: RIBBON, lx: [-0.2, 1.6], rz: s * 0.15, taper: 0.85 });
      // wraps on forearms and shins
      for (const L of [true, false]) {
        const fa = r.j[L ? 'foreL' : 'foreR'], sh = r.j[L ? 'shinL' : 'shinR'];
        for (const y of [-0.07, -0.17, -0.27]) fa.add(box(0.125 * b, 0.035, 0.135 * b, wrap, 0, y, 0));
        for (const y of [-0.1, -0.22, -0.34]) sh.add(box(0.14 * b, 0.035, 0.16 * b, wrap, 0, y, 0));
      }
      // curved daggers: wrapped grip, pommel, swept guard, a blade that curves up to the point
      const dagger = (hand) => {
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
      r.wpnR = dagger(r.j.handR);
      r.base.position.set(0, 0, 0.12); r.wpnR.add(r.base);
      r.tip.position.set(0, 0.05, 0.5); r.wpnR.add(r.tip);
      r.wpnL = dagger(r.j.handL);
      r.tipL = new THREE.Object3D(); r.tipL.position.set(0, 0.05, 0.5); r.wpnL.add(r.tipL);
      r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.12; r.wpnL.add(r.baseL);

      // a lower, coiled stance (visual only)
      r.poseMod = (p) => ({ ...p, by: (p.by ?? 0) - 0.05, torso: add(p.torso, [0.08, 0, 0]), head: add(p.head, [-0.07, 0, 0]) });
      // idle: flip the right dagger end over end every few seconds
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
  },

  mage: {
    weapon: true,
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const { armor, cloth, accent, dark } = r.mats;
      const coat = r.m(0x22305c), trim = r.m(0xb89a4a), leather = r.m(0x3a2a20), grip = r.m(0x2a1c14), steel = r.m(0xc4cad3);
      // runes glow brighter with mana (setGlow); glyphs and the blade always glow
      const rune = basic(0x8fd8ff);
      r.glowMats.push({ mat: rune, lo: new THREE.Color(0x1c2d5c), hi: new THREE.Color(0x9fe4ff) });
      const glyph = basic(0xa8e8ff), blade = basic(0x7ab4ff), core = basic(0xe8f6ff);
      const T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // high collar and lapels
      T.add(box(0.38 * b, 0.17, 0.06, coat, 0, 0.75, -0.13 * b));
      for (const s of [1, -1]) T.add(rbox(0.06, 0.16, 0.2, coat, s * 0.17, 0.74, -0.03, 0, 0, s * -0.2));
      for (const s of [1, -1]) T.add(rbox(0.09, 0.36, 0.02, trim, s * 0.08, 0.5, 0.142 * b, 0, 0, s * 0.18));
      // chest runes and a rune sash
      for (const [x, y] of [[0, 0.56], [-0.06, 0.46], [0.06, 0.46], [0, 0.38]]) T.add(box(0.035, 0.035, 0.02, rune, x, y, 0.145 * b));
      T.add(box(0.38 * b, 0.06, 0.24 * b, leather, 0, 0.07, 0));
      for (const s of [1, -1]) T.add(box(0.05, 0.08, 0.05, rune, s * 0.15, 0.05, 0.1));
      // left shoulder mantle with a rune
      const m = pivot(T, sw, 0.66, 0, 0, 0, -0.3);
      m.add(box(0.24 * b, 0.12, 0.3 * b, coat, 0.02, 0, 0));
      m.add(box(0.25 * b, 0.025, 0.31 * b, trim, 0.02, -0.06, 0));
      m.add(box(0.05, 0.05, 0.02, rune, 0.04, 0, 0.16 * b));
      // split coat tails behind, short flaps in front, gold hems, runes on the tails
      for (const s of [1, -1]) {
        strip(r, T, s * 0.1, 0.3, -0.14 * b, 0.18, [0.36, 0.32], coat, { trim, rune, lx: [-0.08, 1.25], ry: s * 0.12, taper: 0.9 });
        strip(r, T, s * 0.1, 0.3, 0.14 * b, 0.15, [0.28, 0.16], coat, { trim, lx: [-1.0, 0.06] });
      }
      // head: silver hair with bangs, glowing eyes, a rune mark under one eye, a ponytail that swings
      const { skin } = r.mats, hair = r.m(0xc8ccd8), hairDk = r.m(0x8a90a4);
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
      // rune blade in the right hand (casting focus)
      const g = new THREE.Group(); r.j.handR.add(g); r.wpnR = g;
      g.add(box(0.045, 0.045, 0.18, grip, 0, 0, 0));
      g.add(box(0.06, 0.06, 0.05, trim, 0, 0, -0.11));
      g.add(box(0.22, 0.045, 0.045, trim, 0, 0, 0.1));
      for (const s of [1, -1]) g.add(box(0.04, 0.04, 0.04, rune, s * 0.11, 0, 0.1));
      g.add(box(0.03, 0.08, 0.72, blade, 0, 0, 0.47));
      g.add(box(0.012, 0.03, 0.66, core, 0, 0, 0.47));
      r.base.position.set(0, 0, 0.2); g.add(r.base);
      r.tip.position.set(0, 0, 0.85); g.add(r.tip);
      // the knife she fights with, in the left hand
      const g2 = new THREE.Group(); r.j.handL.add(g2); r.wpnL = g2;
      g2.add(box(0.04, 0.04, 0.14, grip, 0, 0, 0));
      g2.add(box(0.13, 0.035, 0.04, trim, 0, 0, 0.08));
      g2.add(box(0.02, 0.06, 0.36, steel, 0, 0, 0.28));
      g2.add(box(0.022, 0.02, 0.3, rune, 0, 0, 0.28));
      r.tipL = new THREE.Object3D(); r.tipL.position.z = 0.5; g2.add(r.tipL);
      r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.12; g2.add(r.baseL);
      // three glyphs orbiting the off hand
      const orbit = pivot(r.j.handL, 0, 0, 0);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        orbit.add(rbox(0.04, 0.04, 0.012, glyph, Math.cos(a) * 0.17, 0.04 * Math.sin(a * 2), Math.sin(a) * 0.17, 0, a, 0.78));
      }
      r.spinners.push({ obj: orbit, axis: 'y', speed: 3.2 });
      r.setGlow(1);
    },
  },

  // ---------------- enemies ----------------
  grunt: {
    build(r, o) {
      const { bulk: b } = r.dims;
      const rag = r.m(0x5a4a36), rust = r.m(0x6a4a34), iron = r.m(0x55524c);
      const T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // a dented half-helm or a rag headband
      if (Math.random() < 0.6) { H.add(box(0.27, 0.12, 0.28, iron, 0, 0.3, -0.005)); H.add(box(0.05, 0.05, 0.05, rust, 0.08, 0.34, 0.12)); }
      else H.add(box(0.26, 0.05, 0.27, rag, 0, 0.27, 0));
      // mail patch, shoulder strap, torn tunic strips that swing
      T.add(box(0.3 * b, 0.18, 0.02, iron, 0.02, 0.5, 0.142 * b));
      T.add(rbox(0.05, 0.5, 0.02, r.m(0x3a2a1c), 0, 0.42, 0.146 * b, 0, 0, 0.6));
      const n = 3 + (Math.random() * 2 | 0);
      for (let i = 0; i < n; i++) {
        const x = -0.15 + (0.3 * i) / (n - 1);
        strip(r, hips, x, -0.06, 0.12 * b, 0.07, [0.14 + Math.random() * 0.08, 0.08], rag, { lx: [-0.9, 0.1] });
      }
      strip(r, hips, 0, -0.04, -0.12 * b, 0.26, [0.2, 0.1], rag, { lx: [-0.1, 0.9] });
    },
  },
  spear: {
    build(r, o) {
      const { bulk: b } = r.dims;
      const scarf = r.m(0x6a3a24), strap = r.m(0x3a2a1c), plume = r.m(0x8a2a20);
      const T = r.j.torso, H = r.j.head;
      T.add(box(0.3, 0.08, 0.3, scarf, 0, 0.68, 0));
      for (const s of [1, -1]) strip(r, T, s * 0.05, 0.68, -0.15, 0.08, [0.2, 0.16], scarf, { spring: RIBBON, lx: [-0.2, 1.5], taper: 0.85 });
      T.add(rbox(0.05, 0.5, 0.02, strap, 0, 0.42, 0.142 * b, 0, 0, -0.6));
      T.add(box(0.38 * b, 0.06, 0.24 * b, strap, 0, 0.07, 0));
      const pp = pivot(H, 0, 0.45, 0);
      strip(r, pp, 0, 0, 0, 0.05, [0.1, 0.1], plume, { rx: Math.PI - 0.6, bend: 0.4, lx: [-0.6, 0.6], th: 0.04, spring: { ...CLOTH, k: 90 } });
    },
  },
  archer: {
    build(r, o) {
      const { bulk: b } = r.dims;
      const cloak = r.m(0x26301f), quiver = r.m(0x4a3220), fletch = r.m(0xd8d0b8), strap = r.m(0x3a2a1c);
      const T = r.j.torso;
      // cloak in two panels, quiver of arrows on the back, a bracer
      for (const s of [1, -1]) strip(r, T, s * 0.11, 0.66, -0.16 * b, 0.2, [0.4, 0.3], cloak, { lx: [-0.1, 1.3], ry: s * 0.25, taper: 0.85 });
      const q = pivot(T, 0.08, 0.55, -0.2, 0, 0, 0.35);
      q.add(box(0.13, 0.42, 0.12, quiver, 0, -0.12, 0));
      for (const x of [-0.03, 0.0, 0.03]) q.add(box(0.02, 0.12, 0.02, fletch, x, 0.13, 0.01 * (x * 30)));
      T.add(rbox(0.05, 0.5, 0.02, strap, 0, 0.42, 0.142 * b, 0, 0, 0.62));
      r.j.foreL.add(box(0.13 * b, 0.14, 0.14 * b, quiver, 0, -0.22, 0));
    },
  },
  brute: {
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const fur = r.m(0x5e4c38), furHi = r.m(0x7a6650), iron = r.m(0x4a4844), plateM = r.m(0x6b5a48);
      const T = r.j.torso, hips = r.j.hips;
      // fur mantle
      T.add(box(0.66 * b, 0.18, 0.4 * b, fur, 0, 0.68, -0.02));
      for (const [x, z] of [[-0.22, 0.1], [0.0, 0.16], [0.22, 0.1], [-0.25, -0.12], [0.25, -0.12]]) T.add(box(0.12, 0.08, 0.1, furHi, x * b, 0.75, z * b));
      // belly plates that rattle, a chain across the chest
      plate(r, T, -0.08, 0.44, 0.15 * b, 0.16, 0.16, 0.03, plateM, { edge: iron, spring: { lx: [-0.6, 0.15] } });
      plate(r, T, 0.08, 0.44, 0.15 * b, 0.16, 0.16, 0.03, plateM, { edge: iron, spring: { lx: [-0.6, 0.15] } });
      for (let i = 0; i < 6; i++) T.add(rbox(0.05, 0.05, 0.05, iron, -0.2 + i * 0.08, 0.62 - i * 0.05, 0.16 * b, 0, 0, 0.7));
      // hanging chains off the belt
      for (const s of [1, -1]) strip(r, hips, s * 0.16, -0.02, 0.1, 0.04, [0.1, 0.1, 0.08], iron, { spring: { ...PLATE, k: 160, d: 4, rattle: 0.8, lx: [-0.7, 0.4], lz: [-0.5, 0.5] }, th: 0.04 });
      strip(r, hips, 0, -0.05, 0.13 * b, 0.22, [0.22, 0.12], fur, { spring: HEAVY_CLOTH, lx: [-0.9, 0.1] });
    },
  },

  // ---------------- bosses ----------------
  varek: {
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const { armor, accent, dark } = r.mats;
      const hi = r.m(0x56565f);
      // ember cracks in the armor: dark until he ignites (boss.js setGlow)
      const ember = basic(0xff7a2a);
      r.glowMats.push({ mat: ember, lo: new THREE.Color(0x2a1612), hi: new THREE.Color(0xff8a30) });
      const T = r.j.torso, hips = r.j.hips, H = r.j.head;
      for (const [x, y, rz] of [[-0.1, 0.52, 0.5], [0.06, 0.44, -0.7], [0.12, 0.58, 0.3], [-0.04, 0.38, -0.2]]) T.add(rbox(0.12, 0.022, 0.02, ember, x, y, 0.15 * b, 0, 0, rz));
      H.add(box(0.12, 0.02, 0.02, ember, 0, 0.3, 0.15));
      // pauldron lames, tassets
      for (const s of [1, -1]) {
        const pv = pivot(T, s * sw, 0.66, 0, 0, 0, -s * 0.35);
        pv.add(box(0.26 * b, 0.13, 0.32 * b, armor, s * 0.03, 0, 0));
        pv.add(box(0.08, 0.14, 0.08, hi, s * 0.06, 0.1, 0));
        plate(r, pv, s * 0.05, -0.05, 0, 0.24 * b, 0.08, 0.3 * b, armor, { edge: hi, spring: { k: 400 } });
        plate(r, hips, s * 0.1, -0.04, 0.13 * b, 0.16, 0.26, 0.03, armor, { edge: hi, spring: { k: 380, lx: [-0.9, 0.1] } });
      }
      // a heavy torn cape in three panels and a front loincloth
      for (const x of [-0.17, 0, 0.17]) strip(r, T, x * b, 0.66, -0.16 * b, 0.19 * b, [0.4, 0.36, 0.2], accent, { spring: HEAVY_CLOTH, lx: [-0.1, 1.1], lx2: [-0.3, 0.6], taper: 0.9 });
      strip(r, hips, 0, -0.05, 0.13 * b, 0.22, [0.26, 0.18], accent, { spring: HEAVY_CLOTH, lx: [-0.9, 0.08] });
      r.setGlow(0);
    },
  },
  hask: {
    build(r, o) {
      const { bulk: b } = r.dims;
      const leather = r.m(0x4a3020), stain = r.m(0x5a1410), hoodM = r.m(0x1c1612), iron = r.m(0x4a4844);
      const T = r.j.torso, hips = r.j.hips, H = r.j.head;
      // tall executioner's hood
      H.add(box(0.29, 0.3, 0.3, hoodM, 0, 0.19, 0));
      const c = cone(0.17, 0.3, hoodM, 4); c.position.set(0, 0.46, -0.02); c.rotation.y = Math.PI / 4; H.add(c);
      // leather apron, stained, and a chain belt
      strip(r, T, 0, 0.5, 0.15 * b, 0.32 * b, [0.4, 0.34], leather, { spring: HEAVY_CLOTH, lx: [-0.9, 0.06] });
      T.add(box(0.12, 0.1, 0.01, stain, 0.06, 0.25, 0.16 * b));
      T.add(box(0.38 * b, 0.06, 0.24 * b, iron, 0, 0.06, 0));
      strip(r, hips, -0.17, -0.02, 0.06, 0.04, [0.1, 0.1], iron, { spring: { ...PLATE, k: 150, d: 4, lx: [-0.7, 0.4] }, th: 0.04 });
    },
  },
  vael: {
    build(r, o) {
      const { bulk: b } = r.dims;
      const { accent } = r.mats;
      const hair = r.m(0xd8d0c0), cloakM = r.m(0x2a2a44), trim = r.m(0x8a8ac8);
      const T = r.j.torso, H = r.j.head;
      // flowing pale hair out of the hood, a moon-trimmed cloak
      for (const s of [1, -1]) strip(r, H, s * 0.15, 0.16, 0.0, 0.06, [0.18, 0.16, 0.12], hair, { spring: RIBBON, lx: [-0.4, 1.2], th: 0.04, taper: 0.8 });
      strip(r, H, 0, 0.2, -0.15, 0.16, [0.2, 0.18, 0.14], hair, { spring: RIBBON, lx: [-0.2, 1.4], th: 0.04, taper: 0.85 });
      for (const x of [-0.16, 0, 0.16]) strip(r, T, x * b, 0.66, -0.16 * b, 0.18 * b, [0.42, 0.38, 0.22], cloakM, { trim, lx: [-0.1, 1.35], lx2: [-0.35, 0.8], taper: 0.88 });
    },
  },
  gorrath: {
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const stone = r.m(0x5e5a50), moss = r.m(0x4a5a34), hide = r.m(0x3a3a2a);
      const T = r.j.torso, hips = r.j.hips;
      // stone plates with moss on top, spines down the back
      for (const s of [1, -1]) {
        const pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.4);
        pv.add(box(0.3 * b, 0.16, 0.34 * b, stone, s * 0.03, 0, 0));
        pv.add(box(0.28 * b, 0.05, 0.3 * b, moss, s * 0.03, 0.09, 0));
      }
      T.add(box(0.4 * b, 0.3, 0.04, stone, 0, 0.5, 0.15 * b));
      T.add(box(0.38 * b, 0.05, 0.05, moss, 0, 0.66, 0.15 * b));
      for (let i = 0; i < 4; i++) { const c = cone(0.06, 0.2, stone, 4); c.position.set(0, 0.68 - i * 0.14, -0.17 * b); c.rotation.x = -1.2; T.add(c); }
      strip(r, hips, 0, -0.05, 0.13 * b, 0.26, [0.28, 0.16], hide, { spring: HEAVY_CLOTH, lx: [-0.9, 0.08] });
      strip(r, hips, 0, -0.05, -0.13 * b, 0.3, [0.26, 0.16], hide, { spring: HEAVY_CLOTH, lx: [-0.08, 0.9] });
    },
  },
};

const add = (a, b) => [(a?.[0] ?? 0) + b[0], (a?.[1] ?? 0) + b[1], (a?.[2] ?? 0) + b[2]];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
