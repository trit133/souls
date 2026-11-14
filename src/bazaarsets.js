// The Bazaar's ten set pieces (bazaar.js lays them out): each a trader and the place they trade from, built in its own
// frame (origin on the floor in the middle of it, +z towards the camera), each sitting or standing in their own way:
//   grist    Mother Grist, cross-legged on a threadbare carpet under a lean-to, a cook-pot on the boil
//   vesk     Brother Vesk, standing behind a heavy iron desk, a reliquary cabinet of lit niches behind him
//   kettle   Old Kettle, on a stool at a workbench under a striped tent, a grinding wheel throwing sparks
//   sorrow   Mama Sorrow, kneeling on cushions in a round tent, hands circling a glowing crystal ball
//   krell    Sergeant Krell, on an ammo crate in a little fort of crates, sandbags and racked guns, cigar glowing
//   tobias   Fat Tobias, behind a food cart, chopping, the grill smoking, meat hanging from the awning
//   pip      Pip the Rat-King, perched on top of a junk pile in a scrap crown, legs swinging, rats running round it
//   kessa    Kessa, leaning in the open door of a rusted shipping container, flipping a coin
//   ostrava  Lady Ostrava, in a high-backed chair under a velvet canopy, fanning herself, a servo-skull with a lantern
//   pilgrim  The Pilgrim, hooded and still beside a shrine on a handcart, a bell swaying on its pole
// Each build(g, r, ctx) adds the place to g and returns { rig, at: [x, y, z], pose(t, look), tick(t, dt), light }:
// the trader stands (or sits) at `at` in g's frame; `light` is the colour of the lamp over them.
// Also here: the ground clutter and the backdrop (the night sky, a moon, the hive's skyline with its lights).
import * as THREE from 'three';
import { buildHumanoid } from './models.js';

const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const B = (c) => new THREE.MeshBasicMaterial({ color: c });
const GLOW = (c, o = 0.9) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
function box(g, w, h, d, mat, x, y, z, ry = 0, rx = 0, rz = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
function cyl(g, rt, rb, h, mat, x, y, z, seg = 8, rx = 0, rz = 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// ---------- poses (merged with each trader's own motion) ----------
const STAND = { legL: [0, 0, 0.03], legR: [0, 0, -0.03], shinL: [0.05, 0, 0], shinR: [0.05, 0, 0], armL: [0.05, 0, 0.12], armR: [0.05, 0, -0.12], foreL: [-0.2, 0, 0], foreR: [-0.2, 0, 0], torso: [0.03, 0, 0], head: [0, 0, 0], hips: [0, 0, 0], by: 0 };
const CHAIR = { ...STAND, legL: [-1.55, 0, 0.1], legR: [-1.55, 0, -0.1], shinL: [1.55, 0, 0], shinR: [1.55, 0, 0], by: -0.47 };
const CROSS = { ...STAND, legL: [-1.25, 0, 0.85], legR: [-1.25, 0, -0.85], shinL: [2.4, 0, 0], shinR: [2.4, 0, 0], by: -0.8 };
const KNEEL = { ...STAND, legL: [0.15, 0, 0.05], legR: [0.15, 0, -0.05], shinL: [1.75, 0, 0], shinR: [1.75, 0, 0], by: -0.42 };

// a rug on the floor: a field, a border, a few stripes
function rug(g, w, d, field, border, x = 0, z = 0) {
  box(g, w, 0.02, d, L(border), x, 0.011, z); box(g, w - 0.16, 0.022, d - 0.16, L(field), x, 0.012, z);
  for (let i = 1; i < 4; i++) box(g, w - 0.3, 0.024, 0.04, L(border), x, 0.013, z - d / 2 + (i * d) / 4);
}
// a crate, a barrel, a sack
const crate = (g, s, x, y, z, ry = 0, c = 0x5a4430) => { const m = box(g, s, s * 0.8, s, L(c), x, y + s * 0.4, z, ry); box(g, s * 1.02, s * 0.1, s * 0.2, L(0x3a2a1a), x, y + s * 0.4, z, ry); return m; };
const barrel = (g, x, y, z, c = 0x4a3a2a, h = 0.75) => { cyl(g, 0.26, 0.26, h, L(c), x, y + h / 2, z, 8); for (const k of [0.2, 0.8]) cyl(g, 0.27, 0.27, 0.05, L(0x2a2a2e), x, y + h * k, z, 8); };
const sack = (g, x, y, z, c = 0x7a6a4a) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), L(c)); m.scale.set(1, 0.75, 0.9); m.position.set(x, y + 0.16, z); g.add(m); box(g, 0.08, 0.1, 0.08, L(0x5a4a30), x, y + 0.36, z); };
const candle = (g, x, y, z, h = 0.14) => { cyl(g, 0.025, 0.03, h, L(0xd8ccb0), x, y + h / 2, z, 5); box(g, 0.025, 0.05, 0.025, B(0xffd080), x, y + h + 0.03, z); };

function person(o, dress) { const rig = buildHumanoid({ scale: 1, ...o }); dress?.(rig, rig.j); rig.idle = true; return rig; }

export const SETS = {
  // ================= Mother Grist =================
  grist(g, r) {
    rug(g, 2.0, 1.6, 0x5a2a1a, 0x8a6a3a, 0, 0.1);
    // the lean-to: two poles at the back, a patched tarp slanting down behind her
    for (const sx of [-1, 1]) cyl(g, 0.035, 0.04, 1.9, L(0x4a3020), sx * 1.0, 0.95, -0.75, 5);
    box(g, 2.2, 0.04, 1.3, L(0x6a5a3a), 0, 1.45, -0.95, 0, -0.65); box(g, 0.5, 0.045, 0.4, L(0x4a5a3a), -0.4, 1.47, -0.8, 0, -0.65); box(g, 0.35, 0.045, 0.3, L(0x7a3a2a), 0.5, 1.4, -0.95, 0, -0.65);
    // scrap heaps either side of her, rags hung on a line
    const scrap = [L(0x6a5e52), L(0x4a4038), L(0x7a6a50), L(0x5a4a3a), L(0x8a5a3a)];
    for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) box(g, 0.12 + r() * 0.2, 0.06 + r() * 0.12, 0.1 + r() * 0.16, scrap[i % 5], sx * (0.75 + r() * 0.3), 0.05 + (i % 3) * 0.08, -0.35 + r() * 0.45, r() * 3, r() * 0.5, r() * 0.5);
    box(g, 2.0, 0.015, 0.015, L(0x3a2a1a), 0, 1.6, -0.55);
    for (let i = 0; i < 5; i++) box(g, 0.16, 0.3 + r() * 0.2, 0.02, L([0x5a3a2a, 0x4a4a3a, 0x6a2a1a, 0x3a3a4a, 0x7a6a4a][i]), -0.7 + i * 0.35, 1.4, -0.55);
    // the cook-pot on a tripod over a little fire
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; box(g, 0.02, 0.6, 0.02, L(0x2a2a2e), 0.72 + Math.cos(a) * 0.15, 0.28, 0.65 + Math.sin(a) * 0.15, 0, Math.sin(a) * 0.3, -Math.cos(a) * 0.3); }
    cyl(g, 0.14, 0.11, 0.16, L(0x2e2a28), 0.72, 0.36, 0.65, 8); const stew = cyl(g, 0.12, 0.12, 0.02, B(0x9a7a3a), 0.72, 0.44, 0.65, 8);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 5), GLOW(0xffa040)); flame.position.set(0.72, 0.13, 0.65); g.add(flame);
    // the scales and her cane on the carpet
    const sc = grp(g, -0.6, 0.02, 0.5), brass = L(0xa8843a);
    box(sc, 0.03, 0.34, 0.03, brass, 0, 0.17, 0); box(sc, 0.42, 0.025, 0.025, brass, 0, 0.34, 0);
    for (const sx of [-1, 1]) { box(sc, 0.01, 0.14, 0.01, brass, sx * 0.2, 0.27, 0); cyl(sc, 0.07, 0.05, 0.02, brass, sx * 0.2, 0.2, 0, 8); }
    box(g, 0.9, 0.03, 0.03, L(0x4a3020), 0.15, 0.04, 0.55, 0.4);
    const rig = person({ scale: 0.84, skin: 0x9a8070, cloth: 0x4a3c2c, armor: 0x3e342a, accent: 0x6a4a2a, head: 'hood', eyes: 0xffd27a, bulk: 1.08 }, (rig, j) => {
      const rag = L(0x5a4630), rag2 = L(0x3a2e22);
      box(j.torso, 0.5, 0.18, 0.36, rag, 0, 0.62, 0, 0, 0.1); box(j.torso, 0.42, 0.3, 0.04, rag2, 0, 0.32, 0.16, 0, 0.05);
      for (let i = 0; i < 6; i++) box(j.torso, 0.04, 0.05, 0.04, i % 2 ? brass : L(0xd8ccb0), -0.14 + i * 0.056, 0.42 - Math.abs(i - 2.5) * 0.02, 0.17);
      box(j.head, 0.04, 0.04, 0.06, L(0xc8b090), 0.02, 0.12, 0.15);
      const drone = grp(j.torso, 0.24, 0.72, -0.02); rig.drone = drone;
      box(drone, 0.16, 0.08, 0.2, L(0x3a3a40), 0, 0, 0); box(drone, 0.1, 0.05, 0.08, L(0x5a5a62), 0, 0.06, 0.04);
      rig.droneEye = box(drone, 0.04, 0.03, 0.02, B(0xff3a1a), 0, 0.01, 0.11);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(drone, 0.02, 0.1, 0.02, L(0x3a3a40), sx * 0.09, -0.05, sz * 0.07, 0, sz * 0.4, sx * 0.4);
    });
    return { rig, at: [0, 0.02, 0.05], light: 0xffb060, lightAt: [0, 1.2, 0.6],
      pose: (t) => { const rock = Math.sin(t * 1.3) * 0.06, cackle = Math.max(0, Math.sin(t * 0.45) - 0.92) * 12;
        return { ...CROSS, torso: [0.45 + rock * 0.4 + Math.sin(t * 22) * 0.04 * cackle, 0.1, rock], head: [-0.35 - Math.sin(t * 22) * 0.06 * cackle, Math.sin(t * 0.7) * 0.25, 0],
          armR: [-0.7, 0, -0.25], foreR: [-0.6, 0, 0], handR: [0.3, 0, 0], armL: [-0.55 + Math.sin(t * 0.9) * 0.15, 0, 0.3], foreL: [-1.0, 0, 0], handL: [0.4, 0, 0] }; },
      tick: (t) => { rig.droneEye.visible = Math.sin(t * 2.1) > -0.85; rig.drone.rotation.y = Math.sin(t * 0.8) * 0.5; flame.scale.y = 1 + Math.sin(t * 13) * 0.2; stew.material.color.setHSL(0.11, 0.45, 0.42 + Math.sin(t * 3) * 0.04); } };
  },

  // ================= Brother Vesk =================
  vesk(g, r, ctx) {
    const iron = L(0x2a2a30), red = L(0x5a1014), brass = L(0xb89a4a);
    rug(g, 2.2, 1.8, 0x2a0e10, 0x6a5020, 0, 0);
    // the desk: heavy iron, riveted, a red runner and three lit glass cases on it
    box(g, 1.7, 0.82, 0.7, iron, 0, 0.41, 0.45); box(g, 1.78, 0.06, 0.78, L(0x3a3a40), 0, 0.85, 0.45);
    for (let i = 0; i < 6; i++) box(g, 0.04, 0.04, 0.02, brass, -0.7 + i * 0.28, 0.7, 0.81);
    box(g, 1.7, 0.02, 0.3, red, 0, 0.885, 0.45);
    for (const [x, c] of [[-0.55, 0x4a9aff], [0, 0xb05aff], [0.55, 0xffa82a]]) {
      box(g, 0.32, 0.3, 0.3, new THREE.MeshBasicMaterial({ color: 0x9ab0c8, transparent: true, opacity: 0.18, depthWrite: false }), x, 1.05, 0.45);
      box(g, 0.1, 0.1, 0.1, B(c), x, 0.98, 0.45, 0.6, 0.3); box(g, 0.34, 0.03, 0.32, brass, x, 1.21, 0.45);
    }
    candle(g, 0.8, 0.89, 0.25); candle(g, 0.72, 0.89, 0.3, 0.2);
    // behind him: a tall reliquary cabinet with lit niches and bars across them
    box(g, 1.7, 2.3, 0.45, L(0x1e1c20), 0, 1.15, -0.85); box(g, 1.8, 0.12, 0.5, brass, 0, 2.32, -0.85);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const x = -0.5 + col * 0.5, y = 0.55 + row * 0.6;
      box(g, 0.36, 0.42, 0.05, L(0x0e0c0e), x, y, -0.61); box(g, 0.1, 0.12, 0.08, B([0xffd36a, 0xc890ff, 0x6ab4ff][(row + col) % 3]), x, y - 0.06, -0.62);
      for (let b = 0; b < 3; b++) box(g, 0.02, 0.42, 0.02, iron, x - 0.12 + b * 0.12, y, -0.58);
    }
    const rig = person({ scale: 1.18, skin: 0x8a7a70, cloth: 0x1c181a, armor: 0x2e2a2c, accent: 0x6a1412, head: 'helm', eyes: 0xff5a2a, bulk: 0.86 }, (rig, j) => {
      const robe = L(0x1c181a);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.95, 8, 1, true), robe); skirt.material.side = THREE.DoubleSide; skirt.position.y = -0.48; j.hips.add(skirt);
      box(j.torso, 0.5, 0.22, 0.34, robe, 0, 0.74, -0.02); box(j.torso, 0.06, 0.66, 0.02, red, 0, 0.3, 0.14);
      box(j.head, 0.25, 0.22, 0.03, L(0x5a5a62), 0, 0.2, 0.155); box(j.head, 0.2, 0.025, 0.02, B(0xff5a2a), 0, 0.22, 0.17); box(j.head, 0.02, 0.12, 0.02, L(0x1a1a1e), 0.06, 0.24, 0.172, 0, 0, 0.4);
      const chain = grp(j.handL, 0, -0.06, 0); rig.chain = chain;
      for (let i = 0; i < 5; i++) box(chain, 0.025, 0.06, 0.025, brass, 0, -0.05 - i * 0.065, 0);
      const censer = grp(chain, 0, -0.4, 0); cyl(censer, 0.07, 0.09, 0.12, brass, 0, -0.04, 0, 8); cyl(censer, 0.02, 0.07, 0.07, brass, 0, 0.05, 0, 8);
      rig.ember = box(censer, 0.06, 0.03, 0.06, B(0xff7a2a), 0, 0.02, 0);
    });
    const smoke = [];
    if (ctx.alive) for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x8a8090, transparent: true, opacity: 0.3, depthWrite: false })); ctx.scene.add(m); smoke.push({ m, t: i / 6 }); }
    const V = new THREE.Vector3();
    return { rig, at: [0, 0, -0.2], light: 0xff8a5a, lightAt: [0, 2.0, 0.8], look: true,
      pose: (t, look) => ({ ...STAND, torso: [0.05 + Math.sin(t * 0.6) * 0.02, look * 0.25, 0], head: [-0.05, look * 0.55, 0], armR: [-0.45, 0, 0.35], foreR: [-1.5, 0, 0], handR: [0.4, 0, 0], armL: [-0.15, 0, 0.18], foreL: [-0.35, 0, 0], handL: [0, 0, 0] }),
      tick: (t, dt) => {
        rig.chain.rotation.x = Math.sin(t * 1.6) * 0.35; rig.chain.rotation.z = Math.cos(t * 1.6) * 0.12;
        rig.ember.material.color.setHSL(0.06, 1, 0.5 + Math.sin(t * 9) * 0.1);
        rig.ember.getWorldPosition(V);
        for (const s of smoke) { s.t = (s.t + dt * 0.35) % 1; s.m.position.set(V.x + Math.sin(s.t * 9 + s.m.id) * 0.08, V.y + s.t, V.z); s.m.scale.setScalar(0.6 + s.t * 2.2); s.m.material.opacity = 0.32 * (1 - s.t); }
      } };
  },

  // ================= Old Kettle =================
  kettle(g, r) {
    // the striped tent: an A-frame of alternating panels over a ridge pole, open at the front
    const A = L(0xb8a07a), Bc = L(0x6a2a1a);
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 6; i++) box(g, 1.63, 0.03, 0.3, i % 2 ? A : Bc, sx * 0.58, 1.58, -0.85 + i * 0.3, 0, 0, sx * -0.78); // the slope, in stripes front to back
      for (const z of [-1.0, 0.7]) cyl(g, 0.03, 0.03, 2.2, L(0x3a2a1a), sx * 1.15, 1.1, z, 5);
    }
    cyl(g, 0.035, 0.035, 2.1, L(0x3a2a1a), 0, 2.15, -0.25, 5, Math.PI / 2);
    // the workbench in front of him, a vice, a grinding wheel, tools on a pegboard behind
    box(g, 1.5, 0.08, 0.7, L(0x5a4430), 0, 0.82, 0.35); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.07, 0.8, 0.07, L(0x2e2a28), sx * 0.66, 0.4, 0.35 + sz * 0.28);
    box(g, 0.18, 0.12, 0.18, L(0x74767c), -0.5, 0.92, 0.4); box(g, 0.05, 0.14, 0.2, L(0x74767c), -0.56, 1.02, 0.4); box(g, 0.05, 0.14, 0.2, L(0x74767c), -0.44, 1.02, 0.4);
    const wheel = cyl(g, 0.16, 0.16, 0.04, L(0x8a8a90), 0.45, 1.06, 0.38, 12, 0, Math.PI / 2); box(g, 0.12, 0.1, 0.16, L(0x3a3a40), 0.45, 0.92, 0.38);
    box(g, 1.3, 0.9, 0.04, L(0x2a2420), 0, 1.3, -0.95);
    for (let i = 0; i < 6; i++) box(g, 0.04, 0.22 + (i % 3) * 0.08, 0.03, L(0x8a8a90), -0.5 + i * 0.2, 1.35, -0.92);
    for (let i = 0; i < 5; i++) box(g, 0.08, 0.06, 0.1, L([0x8a5a2a, 0x6a6a70, 0x4a8a5a][i % 3]), -0.2 + i * 0.12, 0.9, 0.2); // bits and gears
    const stool = grp(g, 0, 0, -0.45); cyl(stool, 0.2, 0.2, 0.06, L(0x4a3020), 0, 0.44, 0, 8); for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; box(stool, 0.04, 0.44, 0.04, L(0x3a2a1a), Math.cos(a) * 0.14, 0.22, Math.sin(a) * 0.14); }
    const sparks = []; for (let i = 0; i < 8; i++) { const s = box(g, 0.025, 0.025, 0.025, B(0xffd060), 0.45, 1.06, 0.55); sparks.push({ s, t: i / 8 }); }
    const rig = person({ scale: 0.98, skin: 0x8a7060, cloth: 0x3a3a3a, armor: 0x5a4a3a, accent: 0x8a5a2a, head: 'cap', eyes: 0x9ae0ff, bulk: 1.25 }, (rig, j) => {
      const brass = L(0xb08a4a), piston = L(0x6a6a72);
      box(j.head, 0.28, 0.08, 0.06, L(0x2a2a2e), 0, 0.2, 0.13); for (const sx of [-1, 1]) cyl(j.head, 0.05, 0.05, 0.05, B(0x9ae0ff), sx * 0.07, 0.2, 0.17, 8, Math.PI / 2); // goggles
      box(j.torso, 0.4, 0.5, 0.04, L(0x5a4a3a), 0, 0.3, 0.15); // apron
      cyl(j.armR, 0.08, 0.07, 0.34, brass, 0, -0.17, 0, 6); cyl(j.foreR, 0.06, 0.07, 0.32, piston, 0, -0.16, 0, 6); box(j.foreR, 0.03, 0.26, 0.03, brass, 0.06, -0.16, 0); // the servitor arm
      box(j.handR, 0.05, 0.05, 0.22, L(0x4a3020), 0, -0.02, 0.08); box(j.handR, 0.1, 0.07, 0.07, L(0x74767c), 0, -0.02, 0.2); // a hammer
      box(j.torso, 0.12, 0.2, 0.12, piston, 0, 0.55, -0.16); for (const sx of [-1, 1]) cyl(j.torso, 0.025, 0.025, 0.3, brass, sx * 0.08, 0.7, -0.18, 5); // a little boiler on his back
    });
    return { rig, at: [0, 0, -0.45], light: 0xffd090, lightAt: [0, 1.9, 0.4],
      pose: (t) => { const tap = Math.max(0, Math.sin(t * 5)) ** 3; return { ...CHAIR, torso: [0.35, -0.1, 0], head: [0.25, Math.sin(t * 0.4) * 0.2, 0], armR: [-1.1 - tap * 0.6, 0, -0.1], foreR: [-0.9 + tap * 0.4, 0, 0], handR: [0.4, 0, 0], armL: [-0.9, 0, 0.25], foreL: [-0.7, 0, 0], handL: [0.3, 0, 0] }; },
      tick: (t, dt) => { wheel.rotation.y += dt * 18; for (const s of sparks) { s.t = (s.t + dt * 1.6) % 1; s.s.position.set(0.45 + s.t * 0.4 * Math.sin(s.s.id), 1.06 + s.t * 0.25 - s.t * s.t * 0.6, 0.55 + s.t * 0.3); s.s.visible = Math.sin(t * 0.7) > -0.3; } } };
  },

  // ================= Mama Sorrow =================
  sorrow(g, r) {
    const cloth = L(0x3a1a4a), gold = L(0xc8a040);
    // the round tent, open at the front, a cone roof with a gold band, charms hung off its rim
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 16, 1, true, Math.PI * 0.32, Math.PI * 1.36), cloth); wall.material.side = THREE.DoubleSide; wall.position.y = 0.8; g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.9, 16), L(0x2a1238)); roof.position.y = 2.05; g.add(roof);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.035, 4, 24), gold); band.rotation.x = Math.PI / 2; band.position.y = 1.62; g.add(band);
    cyl(g, 0.02, 0.02, 0.4, gold, 0, 2.6, 0, 5); box(g, 0.1, 0.1, 0.02, B(0xc890ff), 0, 2.84, 0, 0.78);
    const charms = [];
    for (let i = 0; i < 7; i++) { const a = Math.PI * 0.25 + (i / 6) * Math.PI * 0.5, h = grp(g, Math.sin(a) * 1.15, 1.6, Math.cos(a) * 1.15); box(h, 0.01, 0.3, 0.01, gold, 0, -0.15, 0); box(h, 0.06, 0.06, 0.02, i % 2 ? gold : B(0xc890ff), 0, -0.32, 0); charms.push(h); }
    rug(g, 1.9, 1.7, 0x4a1a3a, 0xa08040, 0, 0);
    for (const [x, z, c] of [[-0.35, -0.55, 0x6a2a6a], [0.35, -0.5, 0x8a3a3a], [0, -0.75, 0x4a2a6a]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 4), L(c)); m.scale.set(1, 0.4, 1); m.position.set(x, 0.1, z); g.add(m); }
    // the low table and the crystal ball
    cyl(g, 0.38, 0.38, 0.05, L(0x2a1a14), 0, 0.42, 0.3, 12); cyl(g, 0.06, 0.08, 0.4, L(0x2a1a14), 0, 0.2, 0.3, 6); box(g, 0.8, 0.01, 0.8, L(0x4a1a4a), 0, 0.45, 0.3, 0.6);
    cyl(g, 0.08, 0.1, 0.05, gold, 0, 0.48, 0.3, 8); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), GLOW(0xb88aff, 0.85)); ball.position.set(0, 0.62, 0.3); g.add(ball);
    for (const [x, z] of [[-0.3, 0.2], [0.3, 0.25], [-0.2, 0.5], [0.25, 0.5]]) candle(g, x, 0.445, z, 0.08 + r() * 0.08);
    const rig = person({ scale: 0.92, skin: 0xa88a70, cloth: 0x4a1a3a, armor: 0x3a1a2a, accent: 0xa08040, head: 'hair', eyes: 0xd8b0ff, bulk: 0.9 }, (rig, j) => {
      box(j.head, 0.29, 0.14, 0.3, L(0x6a1a4a), 0, 0.32, -0.01); box(j.head, 0.29, 0.04, 0.3, gold, 0, 0.26, -0.01); // the headscarf and its band
      for (const sx of [-1, 1]) box(j.head, 0.03, 0.08, 0.03, gold, sx * 0.13, 0.08, 0.02); // earrings
      box(j.torso, 0.52, 0.22, 0.34, L(0x5a2a5a), 0, 0.6, 0); for (let i = 0; i < 7; i++) box(j.torso, 0.035, 0.035, 0.03, i % 2 ? gold : B(0xc890ff), -0.15 + i * 0.05, 0.42 - Math.abs(i - 3) * 0.025, 0.16); // shawl, beads
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 0.45, 10, 1, true), L(0x4a1a3a)); skirt.material.side = THREE.DoubleSide; skirt.position.y = -0.2; j.hips.add(skirt);
    });
    return { rig, at: [0, 0.03, -0.2], light: 0xb070ff, lightAt: [0, 1.3, 0.5],
      pose: (t) => ({ ...KNEEL, torso: [0.3, 0, 0], head: [0.45, Math.sin(t * 0.3) * 0.1, 0],
        armR: [-1.2 + Math.sin(t * 1.4) * 0.15, 0, -0.35 + Math.cos(t * 1.4) * 0.2], foreR: [-0.5, 0, 0], handR: [0.8, 0, 0], armL: [-1.2 + Math.cos(t * 1.4) * 0.15, 0, 0.35 + Math.sin(t * 1.4) * 0.2], foreL: [-0.5, 0, 0], handL: [0.8, 0, 0] }),
      tick: (t) => { ball.material.opacity = 0.7 + Math.sin(t * 2.3) * 0.15; ball.scale.setScalar(1 + Math.sin(t * 2.3) * 0.05); charms.forEach((h, i) => { h.rotation.z = Math.sin(t * 1.2 + i) * 0.15; }); } };
  },

  // ================= Sergeant Krell =================
  krell(g, r) {
    const wood = [0x5a4430, 0x4a5a3a, 0x3a4a3a, 0x5a5040];
    // the fort: a back wall of crates two high, crates and sandbags round the sides
    for (let i = 0; i < 5; i++) { crate(g, 0.5, -1.0 + i * 0.5, 0, -0.95, 0, wood[i % 4]); if (i !== 2) crate(g, 0.48, -1.0 + i * 0.5, 0.4, -0.95, r() * 0.2, wood[(i + 1) % 4]); }
    for (const sx of [-1, 1]) { crate(g, 0.5, sx * 1.15, 0, -0.35, 0.2 * sx, wood[2]); for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), L(0x6a5e44)); m.scale.set(1.2, 0.5, 0.8); m.position.set(sx * 1.15, 0.1 + i * 0.16, 0.35); g.add(m); } }
    // racked guns against the wall, a tattered flag
    for (let i = 0; i < 4; i++) { const gun = grp(g, -0.55 + i * 0.18, 0.95, -0.62); gun.rotation.x = -0.25; box(gun, 0.05, 0.9, 0.05, L(0x2a2a2e), 0, 0, 0); box(gun, 0.07, 0.25, 0.09, L(0x4a3020), 0, -0.35, 0); box(gun, 0.04, 0.12, 0.08, L(0x2a2a2e), 0, 0.05, 0.05); }
    cyl(g, 0.03, 0.03, 2.4, L(0x3a3a3e), 0.9, 1.2, -0.9, 5); const flag = box(g, 0.6, 0.38, 0.02, L(0x5a1414), 1.2, 2.15, -0.9); box(g, 0.12, 0.1, 0.025, L(0xc8a040), 1.15, 2.18, -0.89);
    crate(g, 0.55, 0, 0, -0.2, 0, 0x3a4a3a); box(g, 0.3, 0.04, 0.2, L(0xc8a040), 0, 0.46, -0.08); // his ammo crate
    crate(g, 0.4, 0.55, 0, 0.35, 0.4, wood[3]); box(g, 0.12, 0.2, 0.12, L(0x2a3a2a), 0.55, 0.42, 0.35); // a box and a bottle on it
    const rig = person({ scale: 1.08, skin: 0x9a7a62, cloth: 0x3a3e30, armor: 0x4a4a3a, accent: 0x5a1414, head: 'bare', eyes: 0xd8c8a0, bulk: 1.3 }, (rig, j) => {
      box(j.head, 0.12, 0.05, 0.02, L(0x111111), 0.06, 0.2, 0.135); box(j.head, 0.25, 0.015, 0.01, L(0x111111), 0, 0.23, 0.13, 0, 0, 0.3); // eye-patch and strap
      box(j.head, 0.26, 0.06, 0.27, L(0x2a2a20), 0, 0.29, 0); // cropped hair
      rig.cigar = box(j.head, 0.12, 0.025, 0.025, L(0x6a4a2a), -0.05, 0.07, 0.17, 0.3); rig.tip = box(j.head, 0.03, 0.03, 0.03, B(0xff6a1a), -0.1, 0.07, 0.22);
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.7, 8, 1, true), L(0x3a3e30)); coat.material.side = THREE.DoubleSide; coat.position.y = -0.3; j.hips.add(coat);
      const brass = L(0xa8843a); cyl(j.armL, 0.08, 0.07, 0.34, brass, 0, -0.17, 0, 6); cyl(j.foreL, 0.07, 0.06, 0.32, L(0x6a6a72), 0, -0.16, 0, 6); box(j.handL, 0.12, 0.08, 0.1, brass, 0, 0, 0); // the iron arm
      for (let i = 0; i < 3; i++) box(j.torso, 0.08, 0.04, 0.02, [B(0xc8a040), B(0xc81a14), B(0x6ab4ff)][i], -0.12 + i * 0.09, 0.5, 0.15); // medals
    });
    return { rig, at: [0, 0.44, -0.2], light: 0xffc070, lightAt: [0.3, 1.8, 0.6],
      pose: (t) => { const puff = Math.max(0, Math.sin(t * 0.5) - 0.8) * 5; return { ...CHAIR, torso: [0.45, 0.1, 0], head: [-0.15 - puff * 0.1, Math.sin(t * 0.25) * 0.3, 0],
        armR: [-0.7, 0, -0.1], foreR: [-1.2, 0, 0], handR: [0.2, 0, 0], armL: [-0.75 - puff * 0.6, 0, 0.1], foreL: [-1.1 - puff * 0.6, 0, 0], handL: [0, 0, 0] }; },
      tick: (t) => { rig.tip.material.color.setHSL(0.05, 1, 0.45 + Math.max(0, Math.sin(t * 0.5) - 0.8) * 1.5); flag.rotation.y = Math.sin(t * 1.3) * 0.15; } };
  },

  // ================= Fat Tobias =================
  tobias(g, r) {
    // the cart: a wooden body on two wheels, a canopy on posts with meat hung from its bar, a grill smoking on top
    box(g, 1.7, 0.6, 0.75, L(0x6a4a2a), 0, 0.62, 0.3); box(g, 1.76, 0.06, 0.8, L(0x4a3020), 0, 0.95, 0.3);
    for (const sx of [-1, 1]) { cyl(g, 0.32, 0.32, 0.07, L(0x3a2a1a), sx * 0.7, 0.32, 0.72, 10, 0, Math.PI / 2).rotation.set(0, 0, Math.PI / 2); cyl(g, 0.035, 0.035, 1.5, L(0x3a2a1a), sx * 0.82, 1.7, 0.6, 5); cyl(g, 0.035, 0.035, 1.5, L(0x3a2a1a), sx * 0.82, 1.7, -0.05, 5); }
    box(g, 1.9, 0.05, 0.9, L(0x8a2a1a), 0, 2.45, 0.28, 0, -0.08); for (let i = 0; i < 7; i++) box(g, 0.27, 0.12, 0.02, i % 2 ? L(0xc8a060) : L(0x8a2a1a), -0.8 + i * 0.27, 2.36, 0.74);
    box(g, 1.6, 0.03, 0.03, L(0x2a2a2e), 0, 2.2, 0.55);
    const meats = []; for (let i = 0; i < 5; i++) { const h = grp(g, -0.6 + i * 0.3, 2.2, 0.55); box(h, 0.01, 0.15, 0.01, L(0x2a2a2e), 0, -0.08, 0); box(h, 0.1 + r() * 0.06, 0.24 + r() * 0.12, 0.08, L([0x6a1a14, 0x8a3a2a, 0x5a2a1a][i % 3]), 0, -0.3, 0); meats.push(h); }
    box(g, 0.8, 0.08, 0.5, L(0x2a2a2e), -0.35, 1.02, 0.3); for (let i = 0; i < 6; i++) box(g, 0.1, 0.03, 0.1, B(0xff5a1a), -0.65 + i * 0.12, 1.07, 0.25 + (i % 2) * 0.1); // the grill and its coals
    for (let i = 0; i < 3; i++) box(g, 0.14, 0.05, 0.06, L(0x8a4a2a), -0.5 + i * 0.16, 1.1, 0.35, 0.3); // sausages
    cyl(g, 0.16, 0.14, 0.24, L(0x4a4a50), 0.45, 1.1, 0.25, 8); cyl(g, 0.13, 0.13, 0.02, B(0xa86a3a), 0.45, 1.22, 0.25, 8); // a stew pot
    const smoke = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: 0x7a7070, transparent: true, opacity: 0.3, depthWrite: false })); g.add(m); smoke.push({ m, t: i / 6 }); }
    barrel(g, 1.15, 0, -0.1, 0x5a3a2a, 0.7); sack(g, -1.1, 0, -0.2, 0x8a7a5a);
    const rig = person({ scale: 1.04, skin: 0xb08a70, cloth: 0x6a5a4a, armor: 0x5a4a3a, accent: 0x8a2a1a, head: 'bare', eyes: 0x6a4a3a, bulk: 1.65 }, (rig, j) => {
      box(j.torso, 0.5, 0.6, 0.05, L(0xd8ccb0), 0, 0.28, 0.17); box(j.torso, 0.52, 0.06, 0.06, L(0x8a2a1a), 0, 0.02, 0.17); // the apron, stained
      box(j.head, 0.27, 0.08, 0.27, L(0x8a2a1a), 0, 0.3, 0); box(j.head, 0.06, 0.12, 0.04, L(0x8a2a1a), 0.1, 0.26, -0.13, 0.3); // a rag tied round his head
      box(j.head, 0.18, 0.04, 0.02, L(0x3a2a1a), 0, 0.08, 0.13); // the moustache
      box(j.handR, 0.04, 0.04, 0.12, L(0x3a2a1a), 0, -0.02, 0.05); box(j.handR, 0.02, 0.14, 0.18, L(0xc8ccd4), 0, -0.02, 0.2); // the cleaver
    });
    return { rig, at: [0, 0, -0.5], light: 0xff9a4a, lightAt: [0, 1.9, 0.9],
      pose: (t) => { const chop = Math.max(0, Math.sin(t * 4)) ** 2; return { ...STAND, torso: [0.2, -0.1, 0], head: [0.1, Math.sin(t * 0.5) * 0.25, 0], armR: [-1.3 - chop * 0.8, 0, -0.1], foreR: [-0.6 + chop * 0.5, 0, 0], handR: [0.3, 0, 0], armL: [-0.9, 0, 0.3], foreL: [-0.8, 0, 0], handL: [0.2, 0, 0] }; },
      tick: (t, dt) => { for (const s of smoke) { s.t = (s.t + dt * 0.3) % 1; s.m.position.set(-0.35 + Math.sin(s.t * 6 + s.m.id) * 0.15, 1.15 + s.t * 1.4, 0.3); s.m.scale.setScalar(0.7 + s.t * 2.5); s.m.material.opacity = 0.3 * (1 - s.t); } meats.forEach((h, i) => { h.rotation.z = Math.sin(t * 0.9 + i) * 0.08; }); } };
  },

  // ================= Pip the Rat-King =================
  pip(g, r) {
    // the junk pile: barrels, crates, tyres and scrap heaped into a mound, a rag flag on a stick at the top
    barrel(g, -0.5, 0, -0.2, 0x4a4a3a, 0.7); barrel(g, 0.5, 0, -0.3, 0x5a3a2a, 0.75); crate(g, 0.6, 0, 0, -0.55, 0.2, 0x4a3a2a); crate(g, 0.55, 0, 0.6, -0.1, 0.5, 0x5a4a3a);
    crate(g, 0.5, -0.2, 0.75, -0.35, 0.3, 0x3a3a2a); barrel(g, 0.25, 0.75, -0.45, 0x6a2a1a, 0.5);
    for (const [x, y, z] of [[-0.75, 0.1, 0.25], [0.8, 0.1, 0.3], [-0.2, 0.08, 0.45]]) { const ty = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 6, 10), L(0x1a1a1a)); ty.position.set(x, y, z); ty.rotation.x = Math.PI / 2 - 0.2; g.add(ty); }
    for (let i = 0; i < 14; i++) box(g, 0.1 + r() * 0.2, 0.05 + r() * 0.1, 0.1 + r() * 0.2, L([0x6a5e52, 0x4a4038, 0x7a6a50, 0x8a5a3a][i % 4]), (r() - 0.5) * 1.6, r() * 0.3, (r() - 0.5) * 1.0, r() * 3, r(), r());
    cyl(g, 0.02, 0.02, 1.2, L(0x4a3020), -0.45, 1.6, -0.5, 5); const flag = box(g, 0.4, 0.26, 0.02, L(0x7a6a4a), -0.25, 2.05, -0.5);
    const can = grp(g, 0.5, 0.75, -0.3); cyl(can, 0.08, 0.08, 0.16, L(0x6a6a70), 0, 0.08, 0, 8); const lamp = box(can, 0.1, 0.06, 0.1, B(0xffc060), 0, 0.17, 0);
    const rats = []; for (let i = 0; i < 5; i++) { const rt = grp(g, 0, 0.04, 0); box(rt, 0.12, 0.06, 0.07, L(0x3a3230), 0, 0, 0); box(rt, 0.14, 0.015, 0.015, L(0x6a5050), -0.12, 0, 0); box(rt, 0.02, 0.02, 0.02, B(0xff3a1a), 0.06, 0.02, 0.03); rats.push({ rt, a: (i / 5) * Math.PI * 2, s: 0.6 + r() * 0.5 }); }
    const rig = person({ scale: 0.66, skin: 0xb89a80, cloth: 0x5a4a3a, armor: 0x4a3a2a, accent: 0x7a6a4a, head: 'hair', eyes: 0xffe0a0, bulk: 0.85 }, (rig, j) => {
      const tin = L(0x9a8a6a); for (let i = 0; i < 5; i++) box(j.head, 0.04, 0.1 + (i % 2) * 0.06, 0.04, tin, -0.12 + i * 0.06, 0.4, 0); box(j.head, 0.28, 0.04, 0.28, tin, 0, 0.34, 0); // the scrap crown
      box(j.torso, 0.4, 0.2, 0.3, L(0x6a5a3a), 0, 0.55, 0, 0, 0.1); // a too-big coat
      const pet = grp(j.torso, -0.2, 0.68, 0); box(pet, 0.12, 0.07, 0.08, L(0x3a3230), 0, 0, 0); box(pet, 0.02, 0.02, 0.02, B(0xff3a1a), 0.06, 0.02, 0.03); // a rat on his shoulder
    });
    return { rig, at: [0, 0.98, -0.35], light: 0xffc060, lightAt: [0, 2.0, 0.6],
      pose: (t) => ({ ...CHAIR, legL: [-1.2 + Math.sin(t * 3) * 0.4, 0, 0.1], legR: [-1.2 - Math.sin(t * 3) * 0.4, 0, -0.1], shinL: [0.6, 0, 0], shinR: [0.6, 0, 0], torso: [0.25, Math.sin(t * 0.6) * 0.2, 0], head: [0, Math.sin(t * 1.1) * 0.4, 0],
        armR: [-0.4, 0, -0.5], foreR: [-0.4, 0, 0], armL: [-1.4 + Math.sin(t * 2) * 0.3, 0, 0.6], foreL: [-1.6, 0, 0], handL: [0.5, 0, 0] }),
      tick: (t, dt) => { for (const q of rats) { q.a += dt * q.s; q.rt.position.set(Math.cos(q.a) * 1.15, 0.04, Math.sin(q.a) * 0.75); q.rt.rotation.y = -q.a; } flag.rotation.y = Math.sin(t * 2) * 0.3; lamp.material.color.setHSL(0.1, 1, 0.55 + Math.sin(t * 8) * 0.05); } };
  },

  // ================= Kessa =================
  kessa(g, r) {
    // the container: corrugated walls, roof and floor, open at the front, one door swung out, crates inside
    const rust = L(0x6a3a22), rust2 = L(0x5a2e1a);
    box(g, 1.6, 1.9, 0.06, rust, 0, 0.95, -1.2); box(g, 1.7, 0.08, 2.5, rust2, 0, 1.92, -0.0); box(g, 1.6, 0.08, 2.4, L(0x2e2a26), 0, 0.04, -0.0);
    for (const sx of [-1, 1]) { box(g, 0.06, 1.9, 2.4, rust, sx * 0.8, 0.95, 0); for (let i = 0; i < 10; i++) box(g, 0.08, 1.85, 0.05, rust2, sx * 0.82, 0.95, -1.1 + i * 0.24); }
    box(g, 0.06, 1.85, 0.8, rust, 1.25, 0.95, 1.55, 0.95); for (let i = 0; i < 3; i++) box(g, 0.04, 1.8, 0.04, L(0x8a8a90), 1.2 + i * 0.05, 0.95, 1.35 + i * 0.18, 0.95); // the open door and its bars
    box(g, 0.5, 0.05, 0.05, L(0xe0c040), 0, 1.75, 1.2); box(g, 1.62, 0.1, 0.06, L(0xe0c040), 0, 1.85, 1.2); // stencilled hazard strip
    crate(g, 0.55, -0.35, 0.05, -0.8, 0.1, 0x3a4a3a); crate(g, 0.5, 0.35, 0.05, -0.75, -0.2, 0x4a3a2a); crate(g, 0.45, -0.3, 0.5, -0.8, 0.3, 0x5a4430);
    for (let i = 0; i < 4; i++) box(g, 0.08, 0.08, 0.08, B([0x6aff9a, 0xc890ff, 0x6ab4ff, 0xffa82a][i]), -0.4 + i * 0.25, 0.6 + (i % 2) * 0.1, -0.5); // contraband, glowing
    const lamp = box(g, 0.12, 0.12, 0.12, B(0x8affc0), 0, 1.75, -0.6);
    const rig = person({ scale: 1.0, skin: 0xb89880, cloth: 0x2a2a30, armor: 0x3a3436, accent: 0x9a1a1a, head: 'hood', eyes: 0xa0ffd0, bulk: 0.9 }, (rig, j) => {
      box(j.torso, 0.42, 0.12, 0.3, L(0x9a1a1a), 0, 0.62, 0.02); box(j.torso, 0.1, 0.3, 0.02, L(0x9a1a1a), 0.1, 0.4, 0.15); // the red scarf
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.85, 8, 1, true), L(0x2a2a30)); coat.material.side = THREE.DoubleSide; coat.position.y = -0.38; j.hips.add(coat);
      rig.coin = box(j.handR, 0.06, 0.06, 0.012, B(0xffd060), 0, 0.08, 0.06);
    });
    return { rig, at: [0.55, 0.08, 1.0], ry: -0.5, light: 0x8affc0, lightAt: [0, 1.6, 0.6],
      pose: (t) => ({ ...STAND, legL: [-0.15, 0, 0.12], legR: [0.2, 0, -0.25], shinR: [0.3, 0, 0], torso: [0, -0.2, -0.12], head: [0.05, 0.5, 0.1],
        armL: [0.1, 0, 0.35], foreL: [-1.6, 0, 0], handL: [0.3, 0, 0], armR: [-0.5, 0, -0.2], foreR: [-1.4, 0, 0], handR: [0.6, 0, 0] }),
      tick: (t) => { const k = (t * 0.9) % 1; rig.coin.position.y = 0.08 + Math.sin(k * Math.PI) * 0.35; rig.coin.rotation.x = k * 20; lamp.material.color.setHSL(0.4, 1, 0.6 + Math.sin(t * 15) * Math.max(0, Math.sin(t * 0.7) - 0.9) * 2); } };
  },

  // ================= Lady Ostrava =================
  ostrava(g, r) {
    const gold = L(0xc8a040), velvet = L(0x5a1030), wood = L(0x2a1a14);
    rug(g, 2.0, 1.8, 0x3a0e1e, 0xc8a040, 0, 0);
    // the canopy: four gilt posts, a velvet roof with a fringe, drapes at the back corners
    for (const [x, z] of [[-0.9, 0.7], [0.9, 0.7], [-0.9, -0.8], [0.9, -0.8]]) { cyl(g, 0.035, 0.035, 2.4, gold, x, 1.2, z, 6); box(g, 0.1, 0.1, 0.1, gold, x, 2.44, z); }
    box(g, 1.95, 0.06, 1.65, velvet, 0, 2.38, -0.05); for (let i = 0; i < 12; i++) box(g, 0.14, 0.16, 0.02, i % 2 ? gold : velvet, -0.88 + i * 0.16, 2.28, 0.76);
    for (const sx of [-1, 1]) box(g, 0.35, 2.2, 0.04, velvet, sx * 0.75, 1.15, -0.82, sx * 0.2);
    // the chair: a high carved back with a gilt crest, arms, a cushion
    const ch = grp(g, 0, 0, -0.3); box(ch, 0.7, 0.08, 0.6, wood, 0, 0.44, 0); box(ch, 0.62, 0.06, 0.52, velvet, 0, 0.5, 0); box(ch, 0.7, 1.3, 0.08, wood, 0, 1.05, -0.28); box(ch, 0.56, 1.05, 0.04, velvet, 0, 1.05, -0.23);
    box(ch, 0.5, 0.18, 0.06, gold, 0, 1.75, -0.28); box(ch, 0.12, 0.12, 0.06, B(0xc8102a), 0, 1.75, -0.24);
    for (const sx of [-1, 1]) { box(ch, 0.08, 0.06, 0.55, wood, sx * 0.36, 0.72, 0.02); box(ch, 0.06, 0.28, 0.06, wood, sx * 0.36, 0.58, 0.25); for (const sz of [-1, 1]) box(ch, 0.06, 0.44, 0.06, wood, sx * 0.3, 0.22, sz * 0.25); }
    // a side table with a goblet; the servo-skull with its lantern
    cyl(g, 0.2, 0.2, 0.04, wood, 0.7, 0.6, 0.15, 10); cyl(g, 0.04, 0.06, 0.6, wood, 0.7, 0.3, 0.15, 6); cyl(g, 0.04, 0.03, 0.12, gold, 0.7, 0.68, 0.15, 6);
    const skull = grp(g, -0.65, 1.5, 0.3); box(skull, 0.16, 0.16, 0.16, L(0xd8ccb0), 0, 0, 0); box(skull, 0.12, 0.03, 0.02, B(0xff3a1a), 0, 0.02, 0.09); box(skull, 0.02, 0.2, 0.02, L(0x2a2a2e), 0, -0.18, 0); const lan = box(skull, 0.1, 0.12, 0.1, B(0xffe0a0), 0, -0.32, 0);
    const rig = person({ scale: 1.04, skin: 0xd8c0a8, cloth: 0x5a1030, armor: 0x3a0a20, accent: 0xc8a040, head: 'hair', eyes: 0xc8d0ff, bulk: 0.86 }, (rig, j) => {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 0.75, 10, 1, true), velvet); skirt.material.side = THREE.DoubleSide; skirt.position.set(0, -0.25, 0.25); skirt.rotation.x = -0.9; j.hips.add(skirt);
      box(j.torso, 0.5, 0.3, 0.06, gold, 0, 0.78, -0.12, 0, 0.3); // the high collar
      for (let i = 0; i < 5; i++) box(j.head, 0.035, 0.06 + (i === 2 ? 0.06 : 0), 0.03, gold, -0.1 + i * 0.05, 0.38, 0.06); box(j.head, 0.03, 0.03, 0.03, B(0x6ab4ff), 0, 0.44, 0.07); // the tiara
      rig.fan = grp(j.handR, 0, 0, 0.08); for (let i = 0; i < 5; i++) box(rig.fan, 0.04, 0.22, 0.01, i % 2 ? gold : L(0x2a0a1a), 0, 0.11, 0, 0, 0, (i - 2) * 0.22);
    });
    return { rig, at: [0, 0.06, -0.25], light: 0xffc8a0, lightAt: [0, 2.0, 0.5],
      pose: (t) => ({ ...CHAIR, torso: [-0.05, 0, 0], head: [-0.15, Math.sin(t * 0.3) * 0.2, 0.05],
        armR: [-1.0, 0, -0.2], foreR: [-1.4 + Math.sin(t * 6) * 0.15, 0, 0], handR: [0.2, 0, Math.sin(t * 6) * 0.3], armL: [-0.4, 0, 0.35], foreL: [-0.4, 0, 0], handL: [0, 0, 0] }),
      tick: (t) => { skull.position.y = 1.5 + Math.sin(t * 1.4) * 0.08; skull.rotation.y = Math.sin(t * 0.5) * 0.6; lan.material.color.setHSL(0.12, 0.8, 0.75 + Math.sin(t * 9) * 0.05); } };
  },

  // ================= The Pilgrim =================
  pilgrim(g, r) {
    const wood = L(0x4a3020), gold = L(0xc8a040);
    // the handcart: a bed on two wheels, shafts forward, a little shrine on it with an icon and candles, a bell on a pole
    box(g, 1.3, 0.1, 0.8, wood, -0.3, 0.55, -0.2); for (const sz of [-1, 1]) { box(g, 1.3, 0.2, 0.05, wood, -0.3, 0.68, -0.2 + sz * 0.38); const w = cyl(g, 0.34, 0.34, 0.06, L(0x3a2a1a), -0.3, 0.34, -0.2 + sz * 0.48, 10); w.rotation.x = Math.PI / 2; }
    for (const sz of [-1, 1]) box(g, 1.0, 0.05, 0.05, wood, 0.75, 0.5, -0.2 + sz * 0.3, 0, 0, 0.25);
    const sh = grp(g, -0.35, 0.6, -0.2); box(sh, 0.6, 0.7, 0.45, L(0x2a2420), 0, 0.35, 0); box(sh, 0.66, 0.06, 0.5, gold, 0, 0.72, 0);
    for (const sx of [-1, 1]) box(sh, 0.06, 0.45, 0.5, gold, sx * 0.2, 0.92, 0, 0, 0, sx * -0.6); box(sh, 0.4, 0.4, 0.04, L(0x111014), 0, 0.35, 0.23); box(sh, 0.16, 0.26, 0.03, B(0xffe0a0), 0, 0.37, 0.25);
    for (const x of [-0.18, 0.18]) candle(sh, x, 0, 0.3, 0.12);
    cyl(g, 0.025, 0.025, 1.6, wood, -0.85, 1.4, -0.2, 5); box(g, 0.5, 0.03, 0.03, wood, -0.65, 2.15, -0.2);
    const bell = grp(g, -0.45, 2.13, -0.2); box(bell, 0.01, 0.12, 0.01, L(0x2a2a2e), 0, -0.06, 0); cyl(bell, 0.04, 0.1, 0.14, gold, 0, -0.18, 0, 8);
    const rig = person({ scale: 1.12, skin: 0x4a4038, cloth: 0x4a4436, armor: 0x3a3428, accent: 0x6a5a3a, head: 'hood', eyes: 0xe8e0c0, bulk: 0.95 }, (rig, j) => {
      box(j.head, 0.22, 0.18, 0.05, L(0x0a0808), 0, 0.17, 0.12); // the hood's shadow over his face
      box(j.head, 0.3, 0.12, 0.3, L(0x4a4436), 0, 0.33, -0.02); // a deep hood
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.44, 0.95, 8, 1, true), L(0x4a4436)); robe.material.side = THREE.DoubleSide; robe.position.y = -0.48; j.hips.add(robe);
      box(j.torso, 0.06, 0.4, 0.02, L(0xc8a040), 0, 0.35, 0.15); // a prayer cord
      cyl(j.handR, 0.025, 0.03, 2.0, wood, 0, 0.3, 0.05, 5); rig.lantern = box(j.handR, 0.1, 0.12, 0.1, B(0xffe0a0), 0, 1.25, 0.05);
    });
    return { rig, at: [0.55, 0, 0.35], ry: -0.25, light: 0xffe0a0, lightAt: [0.2, 1.8, 0.8],
      pose: (t) => ({ ...STAND, torso: [0.12 + Math.sin(t * 0.5) * 0.02, 0, 0], head: [0.35, 0, 0], armR: [-0.35, 0, -0.18], foreR: [-1.25, 0, 0], handR: [1.2, 0, 0], armL: [-0.3, 0, 0.1], foreL: [-1.3, 0, 0], handL: [0.4, 0, 0] }),
      tick: (t) => { bell.rotation.z = Math.sin(t * 1.1) * 0.25; rig.lantern.material.color.setHSL(0.12, 0.8, 0.72 + Math.sin(t * 7) * 0.05); } };
  },
};

// a locked trader: the same figure, flat grey and still
const GREY = L(0x5e5c5a), GREY_LIT = new THREE.MeshBasicMaterial({ color: 0x4a4846 });
export function greyOut(obj) { obj.traverse((o) => { if (!o.isMesh) return; o.material = o.material instanceof THREE.MeshBasicMaterial ? GREY_LIT : GREY; }); }

// ---------- the market floor's clutter ----------
// crates, barrels, sacks, bottles, coiled cables, puddles, rags, little lanterns; never inside `keep` (circles the
// stalls and the walk in front of them stand in)
export function clutter(g, r, area, keep, lights) {
  const free = (x, z, rad) => keep.every((k) => Math.hypot(x - k.x, z - k.z) > k.r + rad);
  let n = 0;
  for (let tries = 0; tries < 900 && n < area.n; tries++) {
    const x = area.x0 + r() * (area.x1 - area.x0), z = area.z0 + r() * (area.z1 - area.z0), y = area.y, kind = Math.floor(r() * 9);
    if (!free(x, z, 0.4)) continue;
    keep.push({ x, z, r: 0.3 }); n++;
    if (kind === 0) crate(g, 0.35 + r() * 0.25, x, y, z, r() * 3, [0x5a4430, 0x4a5a3a, 0x3a3a2a][n % 3]);
    else if (kind === 1) barrel(g, x, y, z, [0x4a3a2a, 0x5a2e1a, 0x3a4a4a][n % 3], 0.5 + r() * 0.3);
    else if (kind === 2) sack(g, x, y, z, [0x7a6a4a, 0x6a5a3a][n % 2]);
    else if (kind === 3) { for (let i = 0; i < 3; i++) cyl(g, 0.04, 0.05, 0.22, L([0x2a4a2a, 0x4a2a1a, 0x3a3a5a][i]), x + (i - 1) * 0.1, y + 0.11, z + (i % 2) * 0.06, 6); }
    else if (kind === 4) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 4, 12), L(0x1e1e22)); c.rotation.x = Math.PI / 2; c.position.set(x, y + 0.04, z); g.add(c); }
    else if (kind === 5) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.35 + r() * 0.3, 10), new THREE.MeshBasicMaterial({ color: 0x1a2028, transparent: true, opacity: 0.7, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.scale.y = 0.6; p.position.set(x, y + 0.02, z); g.add(p); }
    else if (kind === 6) box(g, 0.5 + r() * 0.4, 0.02, 0.3 + r() * 0.3, L([0x5a3a2a, 0x3a3a4a, 0x6a2a1a][n % 3]), x, y + 0.012, z, r() * 3);
    else if (kind === 7 && lights.length < 6) { cyl(g, 0.07, 0.08, 0.16, L(0x2a2a2e), x, y + 0.08, z, 6); box(g, 0.08, 0.08, 0.08, B(0xffc060), x, y + 0.2, z); lights.push([x, y + 0.35, z]); }
    else { crate(g, 0.3, x, y, z, r() * 3, 0x4a3a2a); crate(g, 0.26, x, y + 0.24, z, r() * 3, 0x5a4430); }
  }
}

// ---------- the backdrop: the night sky, a moon, the hive's skyline and its lights ----------
export function backdrop(scene, r) {
  const bg = new THREE.Group(); scene.add(bg);
  const nf = (m) => { m.fog = false; return m; };
  // stars on a far dome above the skyline
  const N = 700, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const a = r() * Math.PI * 1.2 - Math.PI * 1.1, e = 0.04 + r() * r() * 0.6, R = 60; pos[i * 3] = Math.cos(a) * Math.cos(e) * R; pos[i * 3 + 1] = Math.sin(e) * R; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, nf(new THREE.PointsMaterial({ color: 0xd8dcff, size: 1.6, sizeAttenuation: false }))); bg.add(stars);
  // the moon, hazy, high on the left
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), nf(new THREE.MeshBasicMaterial({ color: 0xe8e0c8 }))); moon.position.set(-17, 13, -50); moon.lookAt(0, 2, 6); bg.add(moon);
  for (const [s, o] of [[1.5, 0.25], [2.4, 0.1]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(2.6 * s, 24), nf(GLOW(0xb8b0d0, o))); h.position.copy(moon.position).add(new THREE.Vector3(0, 0, -0.1)); h.lookAt(0, 2, 6); bg.add(h); }
  for (const [x, y, rr] of [[-0.8, 0.5, 0.5], [0.6, -0.4, 0.35], [0.2, 0.9, 0.25]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(rr, 10), nf(new THREE.MeshBasicMaterial({ color: 0xc8c0a8 }))); c.position.copy(moon.position).add(new THREE.Vector3(x, y, 0.05)); c.lookAt(0, 2, 6); bg.add(c); } // its craters
  // the skyline: rows of hive-towers in silhouette, lit windows, warning lamps, chimneys glowing at the top
  const tower = nf(new THREE.MeshBasicMaterial({ color: 0x03030a })), tower2 = nf(new THREE.MeshBasicMaterial({ color: 0x07060e }));
  const win = [0xffc060, 0xffa040, 0xffe0a0, 0x8ab0ff].map((c) => nf(new THREE.MeshBasicMaterial({ color: c })));
  const blink = [];
  for (const [row, z0, mat, hMax] of [[0, -44, tower, 9], [1, -32, tower2, 5]]) {
    for (let x = -60; x < 60; x += 2.5 + r() * 4) {
      const w = 2 + r() * 4, h = 3 + r() * hMax * (1 - Math.abs(x) / 120), z = z0 - r() * 6;
      box(bg, w, h, 3, mat, x, h / 2 - 2, z);
      if (r() < 0.4) box(bg, w * 0.4, h * 0.25, 2, mat, x, h + h * 0.12 - 2, z); // a spire
      for (let k = 0; k < Math.floor(h * w * 0.12); k++) if (r() < 0.55) box(bg, 0.3, 0.4, 0.05, win[Math.floor(r() * (row ? 3 : 4))], x - w / 2 + 0.3 + r() * (w - 0.6), -1 + r() * (h - 1.5), z + 1.55);
      if (r() < 0.35) { const l = box(bg, 0.35, 0.35, 0.35, nf(new THREE.MeshBasicMaterial({ color: 0xff2a1a })), x, h - 1.8, z); blink.push({ l, ph: r() * 6 }); }
      if (r() < 0.12) { box(bg, 0.8, 3, 0.8, mat, x + w * 0.3, h - 0.5, z); const c = box(bg, 0.9, 0.5, 0.9, nf(GLOW(0xff6a1a, 0.7)), x + w * 0.3, h + 1.1, z); blink.push({ l: c, ph: r() * 6, fire: true }); }
    }
  }
  // a glow on the horizon, searchlights sweeping the clouds
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(160, 8), nf(new THREE.MeshBasicMaterial({ color: 0x3a1a10, transparent: true, opacity: 0.5, depthWrite: false }))); glow.position.set(0, 2.5, -52); bg.add(glow);
  const beams = [];
  for (const x of [-28, 6, 34]) { const b = new THREE.Mesh(new THREE.ConeGeometry(2.2, 60, 10, 1, true), nf(GLOW(0xd8e0ff, 0.035))); b.geometry.translate(0, -30, 0); const p = grp(bg, x, -2, -40); b.rotation.x = Math.PI; p.add(b); beams.push({ p, ph: r() * 6 }); }
  return (t) => {
    for (const b of blink) b.l.visible = b.fire ? true : Math.sin(t * 2.2 + b.ph) > 0.3;
    for (const b of blink) if (b.fire) b.l.scale.y = 1 + Math.sin(t * 6 + b.ph) * 0.3;
    for (const b of beams) { b.p.rotation.z = Math.sin(t * 0.15 + b.ph) * 0.5; b.p.rotation.x = -0.15 + Math.sin(t * 0.11 + b.ph) * 0.1; }
  };
}
