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
  // Sister Vael, the Twin Fang: a moon-masked assassin in a split midnight cloak, long silver braid, crescent daggers
  vael: {
    weapon: true,
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const night = r.m(0x23253c), cloakIn = r.m(0x2c2a52), silver = r.m(0xc8cce0), steel = r.m(0x464a5c);
      const mask = r.m(0xe6e2d6), hair = r.m(0xebe6da), sash = r.m(0x3c3a86), wrap = r.m(0x8a8aa8), grip = r.m(0x1c1626);
      const moon = basic(0xdfe8ff), edge = basic(0xb8d0ff);
      const T = r.j.torso, H = r.j.head;
      // a moon crescent facing the viewer, horns up
      const crescent = (R, tube, m, x, y, z) => {
        const c = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 3, 8, 2.4), m);
        c.position.set(x, y, z); c.rotation.z = -Math.PI / 2 - 1.2; return c;
      };
      // fitted cowl with a swept peak, the moon mask, a crescent on the brow
      H.add(box(0.1, 0.08, 0.1, night, 0, 0.03, 0));
      H.add(box(0.29, 0.3, 0.3, night, 0, 0.18, -0.01));
      const peak = cone(0.12, 0.2, night, 4); peak.position.set(0, 0.36, -0.08); peak.rotation.set(-0.7, Math.PI / 4, 0); H.add(peak);
      H.add(box(0.21, 0.22, 0.03, mask, 0, 0.17, 0.152));
      H.add(box(0.17, 0.05, 0.032, mask, 0, 0.05, 0.146));
      H.add(crescent(0.045, 0.011, moon, 0, 0.28, 0.17));
      for (const s of [1, -1]) H.add(box(0.06, 0.24, 0.16, night, s * 0.135, 0.16, 0.07));
      // a long braid swinging behind, banded in silver; two loose strands at the temples
      const braid = strip(r, H, 0, 0.14, -0.19, 0.08, [0.18, 0.18, 0.16, 0.14], hair, { spring: { ...RIBBON, k: 34 }, rx: 0.32, bend: -0.06, lx: [-0.3, 1.3], th: 0.06, taper: 0.88 });
      braid.forEach((pv, i) => pv.add(box(0.075, 0.025, 0.065, silver, 0, -0.03 - i * 0.002, 0)));
      for (const s of [1, -1]) strip(r, H, s * 0.12, 0.12, 0.12, 0.03, [0.12, 0.1], hair, { spring: RIBBON, lx: [-0.4, 0.9], th: 0.025, taper: 0.8 });
      // fitted bodice with silver lacing and a crescent at the heart, a high collar
      T.add(box(0.34 * b, 0.34, 0.02, night, 0, 0.46, 0.135 * b));
      for (const y of [0.34, 0.42, 0.5]) T.add(box(0.12, 0.012, 0.024, silver, 0, y, 0.14 * b));
      T.add(crescent(0.06, 0.013, moon, 0, 0.6, 0.15 * b));
      T.add(box(0.32, 0.1, 0.3, night, 0, 0.7, -0.01));
      // indigo sash, two ribbons trailing from the knot
      T.add(box(0.38 * b, 0.07, 0.25 * b, sash, 0, 0.07, 0));
      T.add(box(0.07, 0.07, 0.04, silver, 0.08, 0.07, 0.13 * b));
      for (const s of [0, 1]) strip(r, T, 0.08 + s * 0.04, 0.04, 0.13 * b, 0.05, [0.16, 0.14, 0.1], sash, { spring: RIBBON, lx: [-1.2, 0.2], th: 0.02, taper: 0.85 });
      // the cloak: two long split back panels and two shorter wings, silver hems, indigo inside
      for (const s of [1, -1]) {
        strip(r, T, s * 0.09, 0.66, -0.16 * b, 0.17, [0.44, 0.4, 0.3], night, { trim: silver, rx: 0.2, bend: 0.06, lx: [0.05, 1.35], lx2: [-0.1, 0.8], taper: 0.86, ry: s * 0.08 });
        strip(r, T, s * 0.2, 0.62, -0.1 * b, 0.14, [0.34, 0.26], night, { trim: silver, rx: 0.15, ry: s * 0.6, lx: [0, 1.2], taper: 0.8, lz: s > 0 ? [-0.2, 0.7] : [-0.7, 0.2] });
      }
      T.add(box(0.3, 0.32, 0.01, cloakIn, 0, 0.5, -0.17 * b));
      // half-cape over the left shoulder
      const hc = pivot(T, sw, 0.68, 0, 0, 0, -0.35);
      hc.add(box(0.16 * b, 0.06, 0.26 * b, night, 0.02, 0, 0));
      strip(r, hc, 0.06, -0.02, 0, 0.18, [0.22, 0.14], night, { trim: silver, lx: [-0.6, 0.6], taper: 0.8 });
      // wrapped forearms, armoured shins with silver knees
      for (const L of [true, false]) {
        const fa = r.j[L ? 'foreL' : 'foreR'], sh = r.j[L ? 'shinL' : 'shinR'];
        for (const y of [-0.06, -0.15, -0.24]) fa.add(box(0.12 * b, 0.03, 0.13 * b, wrap, 0, y, 0));
        sh.add(box(0.14 * b, 0.3, 0.16 * b, steel, 0, -0.22, 0.01));
        sh.add(box(0.15 * b, 0.07, 0.08, silver, 0, -0.03, 0.07));
      }
      // crescent daggers: wrapped grip, a moon-ring guard, a thin blade sweeping forward and up like a new moon
      const bladeGeo = new THREE.TorusGeometry(0.3, 0.02, 3, 10, 1.4);
      bladeGeo.rotateZ(-Math.PI / 2); bladeGeo.rotateY(-Math.PI / 2); bladeGeo.translate(0, 0.3, 0.1);
      const dagger = (hand) => {
        const g = new THREE.Group(); hand.add(g);
        g.add(box(0.04, 0.04, 0.15, grip, 0, 0, 0));
        for (const z of [-0.04, 0.02]) g.add(box(0.046, 0.046, 0.015, silver, 0, 0, z));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 4, 10), silver);
        ring.position.z = 0.085; g.add(ring);
        const blade = new THREE.Mesh(bladeGeo, r.m(0xe4eaf8)); blade.scale.x = 0.7; g.add(blade);
        g.add(rbox(0.012, 0.02, 0.06, edge, 0, 0.24, 0.39, 0.9));
        return g;
      };
      r.wpnR = dagger(r.j.handR);
      r.base.position.set(0, 0, 0.12); r.wpnR.add(r.base);
      r.tip.position.set(0, 0.25, 0.4); r.wpnR.add(r.tip);
      r.wpnL = dagger(r.j.handL);
      r.tipL = new THREE.Object3D(); r.tipL.position.set(0, 0.25, 0.4); r.wpnL.add(r.tipL);
      r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.12; r.wpnL.add(r.baseL);
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

// shared with the player kits (playerkits.js)
export { strip, plate, basic, add, easeOut, CLOTH, RIBBON, HEAVY_CLOTH, PLATE };
