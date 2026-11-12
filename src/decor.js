// Set dressing and ambient life, added to every room after its layout is built (world.js calls decorate()).
// Nothing here changes where you can walk: props go just outside the walkable area or lie flat on the floor
// (flat ones have no collision), so every layout and fight plays exactly as before. Static props are merged
// with the rest of the module (cheap); a few things move (crows that take off as you come near, rats along
// the walls, swaying cages and spectators, flickering candles) and only update while you are close.
// The four boss arenas get their own themed dressing in arena().
import * as THREE from 'three';

const PI = Math.PI;

// ---------- materials (made once, shared by every room) ----------
let M = null;
function mats() {
  if (M) return M;
  const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
  M = {
    // (The Last Crusade: drab fatigues, crusade red, black cult robes, grey flesh)
    rag: L(0x3e3e32), ragDark: L(0x26261e), ragRed: L(0x5a1414), robe: L(0x1e1c1e), robeDark: L(0x121012), skin: L(0x6a625a),
    blood: L(0x3a0a0a), bloodDark: L(0x240606), iron: L(0x3a3a40), ironDark: L(0x26262a), rust: L(0x5a3a26),
    wax: L(0xd8ccb0), marble: L(0x9a968e), moss: L(0x34443a), crow: L(0x2a2a2e), rat: L(0x3a3a40), straw: L(0x5e5a46),
    slag: L(0x2a1a14), lava: new THREE.MeshBasicMaterial({ color: 0xff6a1a }), lavaCore: new THREE.MeshBasicMaterial({ color: 0xffc23d }),
    moon: new THREE.MeshBasicMaterial({ color: 0x9ab8ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    poolGlow: new THREE.MeshBasicMaterial({ color: 0x3a5a8a, transparent: true, opacity: 0.55, depthWrite: false }),
    gold: L(0x7a5e2a), petal: L(0xd8b8c8),
    optic: L(0x000000, { emissive: 0xff2a1a }), opticBlue: L(0x000000, { emissive: 0x7ad0ff }),
  };
  return M;
}

// ---------- placing things ----------
// random points just outside the walkable area of the current module (on its rim), away from the doorways
// (a dungeon chamber is a square cell: mod.cx, mod.half; a module in a chain spans x = ±xs)
const spanX = (mod, xs) => Math.min(xs, mod.half ?? xs);
function rimSpots(w, mod, n, inner = 0.35, outer = 2.6, xs = 18) {
  const out = [];
  for (let tries = 0; out.length < n && tries < n * 60; tries++) {
    const x = mod.cx + (w.rand() * 2 - 1) * spanX(mod, xs), z = mod.z0 - 2 - w.rand() * (mod.len - 4);
    if (w.area(x, z, -inner) || !w.area(x, z, -outer)) continue;
    if (Object.values(w.gates).some((g) => Math.abs(z - g.z) < 4.5 && Math.abs(x - g.x) < 6)) continue;
    if (!mod.dungeon && (Math.abs(z - mod.z0) < 4 || Math.abs(z - mod.z1) < 4)) continue;
    if (mod.dungeon && w.moduleAt(x, z) !== mod) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 1.6)) continue;
    out.push({ x, z });
  }
  return out;
}
// flat spots well inside the walkable area (for things that lie on the floor)
function floorSpots(w, mod, n) {
  const out = [];
  for (let tries = 0; out.length < n && tries < n * 40; tries++) {
    const x = mod.cx + (w.rand() * 2 - 1) * spanX(mod, 14), z = mod.z0 - 3 - w.rand() * (mod.len - 6);
    if (!w.area(x, z, 1.0)) continue;
    if (mod.dungeon && (w.moduleAt(x, z) !== mod || mod.lanes?.(x, z) < 1.4)) continue;
    out.push({ x, z });
  }
  return out;
}
// a thin strip just inside the walls (for things with no collision: bones, corpses, candles, sacks)
function wallSpots(w, mod, n, xs = 16) {
  const out = [];
  for (let tries = 0; out.length < n && tries < n * 80; tries++) {
    const x = mod.cx + (w.rand() * 2 - 1) * spanX(mod, xs), z = mod.z0 - 4 - w.rand() * (mod.len - 8);
    if (!w.area(x, z, 0.35) || w.area(x, z, 1.3)) continue;
    if (Object.values(w.gates).some((g) => Math.abs(z - g.z) < 5 && Math.abs(x - g.x) < 8)) continue;
    if (mod.dungeon && (w.moduleAt(x, z) !== mod || mod.lanes?.(x, z) < 1.4)) continue;
    if (w.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.5)) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 1.8)) continue;
    out.push({ x, z });
  }
  return out;
}
// a sword or spear left stuck in the ground
const stuckBlade = (w, x, z) => { const b = w.box(0.06, 1.1, 0.14, w.mats.metal, x, 0.45, z, w.rand() * 3); b.rotation.z = (w.rand() - 0.5) * 0.5; b.rotation.x = (w.rand() - 0.5) * 0.4; w.box(0.36, 0.06, 0.08, w.mats.metal, x, 0.95, z, b.rotation.y); };
// a little of everything that can lie by the walls
function litter(w, mod, n, kinds = ['bones', 'corpse', 'blade', 'sacks']) {
  for (const p of wallSpots(w, mod, n)) {
    const k = kinds[(w.rand() * kinds.length) | 0];
    if (k === 'bones') bones(w, p.x, p.z, w.rand() < 0.6);
    else if (k === 'corpse') corpse(w, p.x, p.z, w.rand() * 6);
    else if (k === 'blade') stuckBlade(w, p.x, p.z);
    else if (k === 'sacks') sacks(w, p.x, p.z);
    else if (k === 'candles') candles(w, p.x, p.z, 4, mod.ground === 'crypt');
    else if (k === 'blood') bloodStain(w, p.x, p.z, 0.8);
  }
}

// the direction from a rim spot back toward the path (so figures face the action)
let FACE = { x: 0, z: null };
const faceIn = (w, p) => Math.atan2(FACE.x - p.x, FACE.z === null ? 0.001 : FACE.z - p.z);

// run fn (which adds props at x, z) and lift everything it added onto the terrain there: outside the walkable area
// the ground steps up into walls, and props at y = 0 would be buried
function at(w, x, z, fn) {
  const g = w.cur.group, n0 = g.children.length, f0 = w.fires.length, l0 = w.lights.length;
  fn();
  const y = w.groundY(x, z);
  if (!y) return;
  for (let i = n0; i < g.children.length; i++) g.children[i].position.y += y;
  for (let i = f0; i < w.fires.length; i++) w.fires[i].y += y;
  for (let i = l0; i < w.lights.length; i++) w.lights[i].y += y;
}
const lift = (fn) => (w, x, z, ...rest) => at(w, x, z, () => fn(w, x, z, ...rest));

// ---------- props ----------
function flat(w, geo, mat, x, z, ry = 0, y = 0.03) {
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -PI / 2; m.rotation.z = ry; m.position.set(x, y, z); return w.add(m);
}
const bloodStain = lift(function bloodStain(w, x, z, s = 1) {
  const m = mats();
  flat(w, new THREE.CircleGeometry(0.55 * s, 7), m.blood, x, z, w.rand() * 6);
  for (let i = 0; i < 3; i++) flat(w, new THREE.CircleGeometry(0.16 * s, 5), m.bloodDark, x + (w.rand() - 0.5) * 1.2 * s, z + (w.rand() - 0.5) * 1.2 * s, 0, 0.035);
});
const bones = lift(function bones(w, x, z, skull = true) {
  for (let i = 0; i < 4; i++) w.box(0.08, 0.08, 0.42, w.mats.bone, x + (w.rand() - 0.5) * 0.7, 0.05, z + (w.rand() - 0.5) * 0.7, w.rand() * 3);
  if (skull) { w.box(0.2, 0.18, 0.22, w.mats.bone, x, 0.1, z); w.box(0.05, 0.04, 0.02, mats().robeDark, x - 0.05, 0.12, z + 0.11); w.box(0.05, 0.04, 0.02, mats().robeDark, x + 0.05, 0.12, z + 0.11); }
});
// a fallen soldier lying on its side
const corpse = lift(function corpse(w, x, z, ry) {
  const m = mats(), g = new THREE.Group(), cloth = w.rand() < 0.4 ? m.ragRed : m.rag;
  const b = (sx, sy, sz, mat, px, py, pz, rz = 0) => { const k = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); k.position.set(px, py, pz); k.rotation.z = rz; g.add(k); };
  b(0.5, 0.22, 0.32, cloth, 0, 0.12, 0); b(0.2, 0.2, 0.2, (Math.sin(x * 7.3 + z * 3.1) > 0 ? m.iron : m.skin), 0.38, 0.12, 0.02);
  b(0.34, 0.06, 0.34, m.ironDark, -0.05, 0.25, 0); // (a breastplate)
  b(0.55, 0.14, 0.12, m.ragDark, -0.48, 0.08, 0.08); b(0.5, 0.14, 0.12, m.ragDark, -0.46, 0.08, -0.1, 0.2);
  b(0.4, 0.1, 0.1, cloth, 0.1, 0.08, 0.25, 0.4); b(0.6, 0.04, 0.06, w.mats.metal, 0.35, 0.05, -0.4, 0);
  g.position.set(x, 0, z); g.rotation.y = ry; w.add(g);
});
const skullStake = lift(function skullStake(w, x, z) {
  w.cyl(0.04, 0.06, 1.8, w.mats.logDark, x, 0.9, z, 4);
  w.box(0.24, 0.22, 0.26, w.mats.bone, x, 1.88, z);
  w.box(0.06, 0.05, 0.03, mats().optic, x + 0.05, 1.9, z + 0.13); // (a dead servo-skull's eye, still burning)
  w.box(0.3, 0.04, 0.04, w.mats.metal, x, 1.76, z);
});
const gravestone = lift(function gravestone(w, x, z, ry) {
  const s = w.box(0.7, 0.9 + w.rand() * 0.4, 0.18, w.mats.stoneDark, x, null, z, ry);
  s.rotation.z = (w.rand() - 0.5) * 0.3;
  w.box(0.9, 0.1, 0.4, w.mats.stoneDark, x, 0.05, z, ry);
});
const cart = lift(function cart(w, x, z, ry) {
  const g = new THREE.Group(), add = (mesh, px, py, pz, rx = 0, rz = 0) => { mesh.position.set(px, py, pz); mesh.rotation.set(rx, 0, rz); g.add(mesh); };
  add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.1), w.mats.plank), 0, 0.55, 0, 0, 0.12);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.08), w.mats.plank), 0, 0.75, 0.52, 0, 0.12);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 8), w.mats.logDark), 0.4, 0.45, 0.62, PI / 2);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 8), w.mats.logDark), -0.9, 0.3, -0.5, PI / 2, 0.7);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), w.mats.log), 1.5, 0.3, 0, 0, -0.3);
  g.position.set(x, 0, z); g.rotation.y = ry; w.add(g);
});
const sacks = lift(function sacks(w, x, z) {
  for (let i = 0; i < 3; i++) { const s = w.box(0.5, 0.42, 0.36, mats().straw, x + (i - 1) * 0.42, 0.21, z + (w.rand() - 0.5) * 0.3, w.rand()); s.scale.y = 0.8 + w.rand() * 0.3; }
});
// a cluster of candles; the flames are tiny fires (only drawn when near)
const candles = lift(function candles(w, x, z, n = 4, cold = false) {
  for (let i = 0; i < n; i++) {
    const px = x + (w.rand() - 0.5) * 0.7, pz = z + (w.rand() - 0.5) * 0.7, h = 0.15 + w.rand() * 0.25;
    w.cyl(0.05, 0.06, h, mats().wax, px, h / 2, pz, 5);
    w.fires.push({ x: px, z: pz, y: h + 0.04, scale: 0.12, color: cold ? 0x8ab4ff : 0xffb050, cold });
  }
});
const lanternPost = lift(function lanternPost(w, x, z) {
  w.cyl(0.06, 0.08, 2.4, w.mats.logDark, x, 1.2, z, 5);
  w.box(0.6, 0.06, 0.06, w.mats.logDark, x + 0.3, 2.35, z);
  w.box(0.24, 0.2, 0.22, mats().iron, x + 0.55, 2.2, z);
  w.box(0.2, 0.06, 0.2, w.mats.glowAmber, x + 0.55, 2.08, z);
  const f = { x: x + 0.55, z, y: 2.1, scale: 0.18, lamp: true };
  w.fires.push(f); w.lights.push({ x: x + 0.55, y: 2.1, z, color: 0xffa04a, power: 5, range: 7, src: f });
});
// a robed figure: kneeling pilgrim, standing spectator or praying statue. `sway` makes it breathe (not merged)
const robed = lift(function robed(w, x, z, ry, o = {}) {
  const m = mats(), g = new THREE.Group(), mat = o.mat || m.robe, s = o.s || 1;
  const kneel = o.kneel;
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.38 * s, (kneel ? 0.85 : 1.55) * s, 6), mat); body.position.y = (kneel ? 0.42 : 0.78) * s; g.add(body);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.2 * s, 0.42 * s, 6), mat); hood.position.y = (kneel ? 0.98 : 1.68) * s; g.add(hood);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.14 * s, 0.05 * s), m.robeDark); face.position.set(0, (kneel ? 0.92 : 1.62) * s, 0.14 * s); g.add(face);
  if (mat !== w.mats.stoneDark && mat !== m.marble) for (const ex of [-0.04, 0.04]) { const eye = new THREE.Mesh(new THREE.BoxGeometry(0.035 * s, 0.03 * s, 0.03 * s), m.optic); eye.position.set(ex * s, (kneel ? 0.93 : 1.63) * s, 0.17 * s); g.add(eye); } // (cult optics)
  if (o.pray) { const hands = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.22 * s, 0.12 * s), mat); hands.position.set(0, (kneel ? 0.62 : 1.15) * s, 0.28 * s); g.add(hands); }
  if (o.chain) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.3, 0.04), m.ironDark); c.position.set(0, 0.9, -0.42); c.rotation.x = 0.5; g.add(c); w.cyl(0.08, 0.1, 2, w.mats.logDark, x - Math.sin(ry) * 0.75, 1, z - Math.cos(ry) * 0.75, 5); }
  g.position.set(x, 0, z); g.rotation.y = ry;
  if (o.sway) {
    g.userData.noMerge = true; g.traverse((k) => { k.userData.noMerge = true; });
    w.add(g);
    const ph = w.rand() * 6;
    let base = null;
    w.ambient.push({ x, z, update: (dt, t) => { base ??= g.position.y; g.rotation.x = Math.sin(t * 1.3 + ph) * 0.05; g.position.y = base + Math.sin(t * 2.6 + ph) * 0.015; } });
  } else w.add(g);
  return g;
});
// a cage hanging from a gallows arm, swinging gently (with something inside)
const cage = lift(function cage(w, x, z, ry) {
  const m = mats();
  w.cyl(0.1, 0.12, 4.2, w.mats.logDark, x, 2.1, z, 5);
  w.box(1.6, 0.12, 0.12, w.mats.logDark, x + Math.cos(ry) * 0.7, 4.1, z - Math.sin(ry) * 0.7, ry);
  const hx = x + Math.cos(ry) * 1.35, hz = z - Math.sin(ry) * 1.35;
  const piv = new THREE.Group(); piv.position.set(hx, 4.05, hz); piv.userData.noMerge = true;
  const g = new THREE.Group(); g.position.y = -1.6; piv.add(g);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), m.ironDark); ch.position.y = 1.25; g.add(ch);
  for (const [bx, bz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3], [0, -0.32], [0, 0.32], [-0.32, 0], [0.32, 0]]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.04), m.iron); bar.position.set(bx, 0.35, bz); g.add(bar); }
  for (const y of [-0.2, 0.9]) { const ring = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.7), m.iron); ring.position.y = y; g.add(ring); }
  const sk = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), w.mats.bone); sk.position.set(0.05, -0.08, 0.05); g.add(sk);
  piv.traverse((k) => { k.userData.noMerge = true; });
  w.add(piv);
  const ph = w.rand() * 6;
  w.ambient.push({ x: hx, z: hz, update: (dt, t) => { piv.rotation.z = Math.sin(t * 0.9 + ph) * 0.08; piv.rotation.x = Math.sin(t * 0.7 + ph * 2) * 0.05; } });
});
// ---------- creatures ----------
// crows on the ground that take off and leave when you come near, and come back later
function crows(w, x, z, n = 3) {
  const m = mats(), birds = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); g.userData.noMerge = true;
    // a servo-skull: a bone skull in a brass rig, one red optic, a dangling cable and two grav-vanes
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.2), w.mats.bone); body.position.y = 0.16; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.22), m.gold); head.position.set(0, 0.25, 0); g.add(head);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), m.optic); beak.position.set(0.04, 0.17, 0.11); g.add(beak);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.02), m.crow); cable.position.set(0, 0.0, -0.04); g.add(cable);
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.1), m.crow), wr = wl.clone(); wl.position.set(-0.17, 0.2, 0); wr.position.set(0.17, 0.2, 0); g.add(wl, wr);
    g.traverse((k) => { k.userData.noMerge = true; });
    const home = { x: x + (w.rand() - 0.5) * 1.4, z: z + (w.rand() - 0.5) * 1.4 };
    home.y = w.groundY(home.x, home.z);
    g.position.set(home.x, home.y, home.z); g.rotation.y = w.rand() * 6; w.add(g);
    birds.push({ g, wl, wr, home, fly: 0, vx: 0, vz: 0, ph: w.rand() * 6, peck: w.rand() * 3 });
  }
  w.ambient.push({
    x, z, update: (dt, t, fx, focus) => {
      for (const b of birds) {
        const d = Math.hypot(focus.x - b.home.x, focus.z - b.home.z);
        if (!b.fly && d < 4.5) { b.fly = 0.001; const a = Math.atan2(b.home.x - focus.x, b.home.z - focus.z) + (Math.random() - 0.5); b.vx = Math.sin(a) * 5; b.vz = Math.cos(a) * 5; b.g.rotation.y = a; }
        if (b.fly) {
          b.fly += dt;
          b.g.position.x += b.vx * dt; b.g.position.z += b.vz * dt; b.g.position.y += (2.5 + b.fly) * dt;
          const f = Math.sin(t * 30 + b.ph) * 0.9; b.wl.rotation.z = f; b.wr.rotation.z = -f;
          b.g.visible = b.fly < 4;
          if (b.fly > 9 && d > 9) { b.fly = 0; b.g.visible = true; b.g.position.set(b.home.x, b.home.y, b.home.z); b.wl.rotation.z = b.wr.rotation.z = 0; }
        } else {
          // hop and peck
          b.peck -= dt;
          if (b.peck < 0) { b.peck = 1 + Math.random() * 3; b.g.rotation.y += (Math.random() - 0.5) * 2; }
          b.g.rotation.x = b.peck < 0.25 ? 0.6 : 0;
        }
      }
    },
  });
}
// a rat that darts along the rim between two points, pauses, darts back
function rat(w, a, b) {
  const m = mats(), g = new THREE.Group(); g.userData.noMerge = true;
  // a scuttle-drone: a little iron carapace on stub legs, two red optics, a trailing cable
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.24), m.rat); body.position.y = 0.07; g.add(body);
  for (const sx of [-0.1, 0.1]) for (const sz of [-0.08, 0.08]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), m.ironDark); leg.position.set(sx, 0.03, sz); g.add(leg); }
  for (const sx of [-0.03, 0.03]) { const eye = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.02), m.optic); eye.position.set(sx, 0.09, 0.12); g.add(eye); }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.28), m.ironDark); tail.position.set(0, 0.04, -0.26); g.add(tail);
  g.traverse((k) => { k.userData.noMerge = true; });
  const ry = w.groundY(a.x, a.z);
  g.position.set(a.x, ry, a.z); w.add(g);
  const st = { u: 0, dir: 1, wait: w.rand() * 3 };
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  w.ambient.push({
    x: a.x, z: a.z, update: (dt) => {
      if (st.wait > 0) { st.wait -= dt; return; }
      st.u += st.dir * dt * 3.5 / len;
      if (st.u >= 1 || st.u <= 0) { st.u = Math.max(0, Math.min(1, st.u)); st.dir *= -1; st.wait = 1.5 + Math.random() * 4; }
      g.position.set(a.x + (b.x - a.x) * st.u, ry, a.z + (b.z - a.z) * st.u);
      g.rotation.y = Math.atan2((b.x - a.x) * st.dir, (b.z - a.z) * st.dir);
    },
  });
}
// particles that drift round a point while you are near: moths, fireflies, ash, petals, dust
function drift(w, x, z, kind, rate = 3, spread = 6) {
  const C = { moth: [0.75, 0.7, 0.55], firefly: [0.75, 1, 0.35], ash: [0.45, 0.42, 0.4], ember: [1, 0.55, 0.15], petal: [0.7, 0.88, 1.0], dust: [0.7, 0.68, 0.6], spark: [1, 0.75, 0.3] }[kind];
  let acc = 0;
  w.ambient.push({
    x, z, update: (dt, t, fx) => {
      for (acc += dt * rate; acc >= 1; acc--) {
        const px = x + (Math.random() - 0.5) * spread, pz = z + (Math.random() - 0.5) * spread;
        if (kind === 'firefly') fx.add.spawn({ x: px, y: 0.4 + Math.random() * 1.4, z: pz, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.6, life: 2 + Math.random() * 2, size: 0.12, size1: 0.02, r: C[0], g: C[1], b: C[2] });
        else if (kind === 'moth') fx.add.spawn({ x: px * 0.2 + x * 0.8, y: 1.5 + Math.random(), z: pz * 0.2 + z * 0.8, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1, vz: (Math.random() - 0.5) * 2, life: 0.8, size: 0.07, size1: 0.07, r: C[0], g: C[1], b: C[2], drag: 1 });
        else if (kind === 'ash' || kind === 'petal' || kind === 'dust') fx.norm.spawn({ x: px, y: 3 + Math.random() * 3, z: pz, vx: (Math.random() - 0.5) * 0.5 + 0.2, vy: kind === 'dust' ? -0.1 : -0.5, vz: (Math.random() - 0.5) * 0.5, life: 5, size: kind === 'petal' ? 0.09 : 0.06, size1: 0.05, r: C[0], g: C[1], b: C[2], alpha: kind === 'dust' ? 0.5 : 0.85 });
        else fx.add.spawn({ x: px, y: 0.3, z: pz, vx: (Math.random() - 0.5) * 0.8, vy: 1 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 0.8, life: 1.2 + Math.random(), size: 0.08, size1: 0.02, r: C[0], g: C[1], b: C[2] });
      }
    },
  });
}

// ---------- per room ----------
// each regular room: what lies about and who is there
const ROOMS = {
  ruins: (w, mod) => {
    litter(w, mod, 8, ['bones', 'corpse', 'blade', 'candles']);
    for (const p of rimSpots(w, mod, 9)) (w.rand() < 0.5 ? gravestone : corpse)(w, p.x, p.z, w.rand() * 6);
    for (const p of rimSpots(w, mod, 6)) bones(w, p.x, p.z);
    const pil = rimSpots(w, mod, 3); for (const p of pil) robed(w, p.x, p.z, faceIn(w, p), { kneel: true, pray: true, sway: true });
    if (pil[0]) candles(w, pil[0].x + 0.6, pil[0].z + 0.5, 4);
    const c = rimSpots(w, mod, 2); for (const p of c) crows(w, p.x, p.z, 3);
    for (const p of floorSpots(w, mod, 3)) bloodStain(w, p.x, p.z, 0.8);
  },
  camp: (w, mod) => {
    litter(w, mod, 10, ['sacks', 'bones', 'blade', 'corpse']);
    for (const p of rimSpots(w, mod, 4, 0.3, 2.2, 14)) sacks(w, p.x, p.z);
    for (const p of wallSpots(w, mod, 2)) cage(w, p.x + (p.x < 0 ? -0.6 : 0.6), p.z, p.x < 0 ? 0 : PI);
    for (const p of wallSpots(w, mod, 2)) robed(w, p.x, p.z, faceIn(w, p), { kneel: true, chain: true, sway: true, mat: mats().ragDark });
    for (const p of wallSpots(w, mod, 2)) crows(w, p.x, p.z, 3);
    for (const p of rimSpots(w, mod, 2, 0.3, 2.2, 14)) robed(w, p.x, p.z, faceIn(w, p), { kneel: true, chain: true, sway: true, mat: mats().ragDark });
    for (const p of rimSpots(w, mod, 3, 0.3, 2.2, 14)) skullStake(w, p.x, p.z);
    for (const p of floorSpots(w, mod, 4)) bones(w, p.x, p.z, w.rand() < 0.4);
    const r = rimSpots(w, mod, 2, 0.3, 2.2, 14); if (r.length === 2) rat(w, r[0], r[1]);
    drift(w, mod.cx, mod.z0 - mod.len * 0.3, 'ember', 1.5, 10);
  },
  bridge: (w, mod) => {
    litter(w, mod, 4, ['bones', 'blade']);
    // crows on the posts and the landing; banners whipping in the chasm wind
    for (const p of rimSpots(w, mod, 2, 0.05, 0.5, 8)) crows(w, p.x, p.z, 2);
    for (const p of rimSpots(w, mod, 2, 0.05, 0.5, 8)) corpse(w, p.x, p.z, w.rand() * 6);
    for (const p of rimSpots(w, mod, 2, 0.05, 0.5, 8)) lanternPost(w, p.x, p.z);
    drift(w, mod.cx, mod.z0 - mod.len / 2, 'dust', 2, 14);
  },
  village: (w, mod) => {
    litter(w, mod, 9, ['corpse', 'blade', 'blood', 'sacks']);
    for (const p of rimSpots(w, mod, 4, 0.3, 2.4, 14)) cart(w, p.x, p.z, w.rand() * 6);
    for (const p of rimSpots(w, mod, 6, 0.3, 2.4, 14)) corpse(w, p.x, p.z, w.rand() * 6);
    for (const p of rimSpots(w, mod, 3, 0.3, 2.4, 14)) robed(w, p.x, p.z, faceIn(w, p), { kneel: true, sway: true, mat: mats().ragDark });
    for (const p of rimSpots(w, mod, 2, 0.3, 2.4, 14)) crows(w, p.x, p.z, 4);
    for (const p of floorSpots(w, mod, 4)) bloodStain(w, p.x, p.z, 0.7);
    drift(w, mod.cx, mod.z0 - mod.len / 2, 'ash', 5, 26);
  },
  crypt: (w, mod) => {
    litter(w, mod, 10, ['bones', 'candles', 'bones']);
    for (const p of rimSpots(w, mod, 6, 0.2, 1.6, 9)) bones(w, p.x, p.z);
    for (const p of rimSpots(w, mod, 3, 0.2, 1.6, 9)) candles(w, p.x, p.z, 5, true);
    for (const p of rimSpots(w, mod, 2, 0.2, 1.6, 9)) robed(w, p.x, p.z, faceIn(w, p), { pray: true, mat: w.mats.stoneDark, s: 1.15 }); // weeping statues
    const r = rimSpots(w, mod, 4, 0.2, 1.6, 9); if (r.length >= 2) rat(w, r[0], r[1]); if (r.length >= 4) rat(w, r[2], r[3]);
    drift(w, mod.cx, mod.z0 - mod.len / 2, 'dust', 4, 12);
  },
  bog: (w, mod) => {
    litter(w, mod, 7, ['bones', 'corpse', 'blade']);
    for (const p of rimSpots(w, mod, 3, 0.3, 2.4, 14)) corpse(w, p.x, p.z, w.rand() * 6);
    for (const p of rimSpots(w, mod, 2, 0.3, 2.4, 14)) cage(w, p.x, p.z, p.x < 0 ? 0 : PI);
    for (const p of rimSpots(w, mod, 3, 0.3, 2.4, 14)) skullStake(w, p.x, p.z);
    for (const z of [0.25, 0.55, 0.85]) drift(w, mod.cx, mod.z0 - mod.len * z, 'firefly', 3, 22);
    for (const p of rimSpots(w, mod, 1, 0.3, 2.4, 14)) crows(w, p.x, p.z, 3);
  },
  gate: (w, mod) => {
    litter(w, mod, 9, ['corpse', 'blade', 'bones', 'blood']);
    for (const p of rimSpots(w, mod, 3, 0.3, 2.4, 12)) corpse(w, p.x, p.z, w.rand() * 6);
    for (const p of rimSpots(w, mod, 3, 0.3, 2.4, 12)) skullStake(w, p.x, p.z);
    for (const p of rimSpots(w, mod, 2, 0.3, 2.4, 12)) sacks(w, p.x, p.z);
    for (const p of rimSpots(w, mod, 2, 0.3, 2.4, 12)) lanternPost(w, p.x, p.z);
    for (const p of floorSpots(w, mod, 3)) bloodStain(w, p.x, p.z, 0.9);
    for (const p of rimSpots(w, mod, 1, 0.3, 2.4, 12)) crows(w, p.x, p.z, 4);
  },
};

// ---------- boss arenas ----------
// cx, cz, r: the arena circle (world). Things go on the rim (outside r) or flat on the floor.
// points on a circle round the arena, skipping any on or next to walkable ground (the doorways and corridors)
let W = null;
const around = (cx, cz, r, n, from = 0, to = PI * 2) => Array.from({ length: n }, (_, i) => { const a = from + (to - from) * (i + 0.5) / n; return { x: cx + Math.cos(a) * r, z: cz - Math.sin(a) * r, a }; })
  .filter((p) => !W || !W.area(p.x, p.z, -0.9));
const ARENAS = {
  // the Executioner's Pit: a sunken killing ground watched by a hooded crowd
  pit: (w, cx, cz, r, enc) => {
    const m = mats();
    // the crowd on the far rim, swaying, silent
    for (const p of [...around(cx, cz, r + 2.6, 5, -0.7, 0.5), ...around(cx, cz, r + 2.6, 5, PI - 0.5, PI + 0.7)]) robed(w, p.x, p.z, Math.atan2(cx - p.x, cz - p.z), { sway: true, s: 1 + w.rand() * 0.15, mat: w.rand() < 0.3 ? m.ragRed : m.robe });
    for (const p of around(cx, cz, r + 3.2, 11, 0.15, PI - 0.15)) robed(w, p.x, p.z, Math.atan2(cx - p.x, cz - p.z), { sway: true, s: 1 + w.rand() * 0.15, mat: w.rand() < 0.3 ? m.ragRed : m.robe });
    for (const p of around(cx, cz, r + 4.6, 8, 0.4, PI - 0.4)) robed(w, p.x, p.z, Math.atan2(cx - p.x, cz - p.z), { sway: true, s: 1.1, mat: m.robeDark });
    // spikes round the rim
    for (const p of around(cx, cz, r + 1.6, 48)) at(w, p.x, p.z, () => { const s = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.7, 4), w.mats.logDark); s.position.set(p.x, 0.75, p.z); s.rotation.set(Math.cos(p.a) * 0.4, 0, -Math.sin(p.a) * 0.4); w.add(s); });
    // the block, the axe in it, a basket; gallows with cages; blood soaked into the sand
    w.box(0.5, 0.06, 1.2, m.iron, cx + 0.5, 0.85, cz - 7.5, 0.6); // the axe left in the block
    w.box(0.7, 0.5, 0.7, m.straw, cx - 1.6, 0.25, cz - 7.5); w.ob(cx - 1.6, cz - 7.5, 0.5); // the basket
    for (const [x, ry] of [[-11.5, 0], [11.5, PI]]) cage(w, cx + x, cz + 2, ry);
    for (let i = 0; i < 7; i++) bloodStain(w, cx + (w.rand() - 0.5) * r * 1.4, cz + (w.rand() - 0.5) * r * 1.4, 0.8 + w.rand() * 0.8);
    for (const p of around(cx, cz, r + 1.2, 6, PI + 0.3, PI * 2 - 0.3)) bones(w, p.x, p.z);
    for (const p of around(cx, cz, r + 2.4, 4, 0.5, PI - 0.5)) at(w, p.x, p.z, () => w.torch(p.x, p.z));
    crows(w, cx - r - 2, cz + 4, 4);
  },
  // the Moonlit Cloister: broken arches, moonbeams through them, a still pool, candles, praying sisters
  cloister: (w, cx, cz, r, enc) => {
    const m = mats();
    for (const p of around(cx, cz, r + 2.6, 7, 0.2, PI - 0.2)) at(w, p.x, p.z, () => {
      const ry = Math.atan2(cx - p.x, cz - p.z) + PI / 2;
      for (const s of [-1, 1]) w.box(0.6, 5.5, 0.6, w.mats.stone, p.x + Math.cos(ry) * s * 1.1, 2.75, p.z - Math.sin(ry) * s * 1.1);
      if (w.rand() < 0.7) w.box(2.8, 0.5, 0.6, w.mats.stone, p.x, 5.6, p.z, ry);
    });
    // shafts of moonlight slanting into the arena
    for (const p of around(cx, cz, r * 0.55, 4, 0.3, PI * 2)) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 12, 6, 1, true), m.moon);
      beam.position.set(p.x, 6, p.z); beam.rotation.z = 0.35; beam.userData.noMerge = true; w.add(beam);
    }
    // a pale glowing pool, petals drifting down, candles round the fountain, statues of sisters at prayer
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20), m.poolGlow); pool.rotation.x = -PI / 2; pool.position.set(cx, 0.05, cz - 6); pool.userData.noMerge = true; w.add(pool);
    for (const p of around(cx, cz - 6, 2.0, 6)) candles(w, p.x, p.z, 2, true);
    for (const p of around(cx, cz, r + 1.4, 8, PI + 0.2, PI * 2 - 0.2)) candles(w, p.x, p.z, 3, true);
    for (const p of around(cx, cz, r + 3.4, 4, 0.6, PI - 0.6)) robed(w, p.x, p.z, Math.atan2(cx - p.x, cz - p.z), { pray: true, mat: m.marble, s: 1.3 });
    for (const p of [...around(cx, cz, r + 2.2, 3, -0.6, 0.4), ...around(cx, cz, r + 2.2, 3, PI - 0.4, PI + 0.6)]) at(w, p.x, p.z, () => { w.cyl(0.5, 0.55, 1 + w.rand() * 2.5, w.mats.stone, p.x, null, p.z); w.box(0.9, 0.3, 0.9, w.mats.stone, p.x + 0.8, 0.15, p.z + 0.4, w.rand()); });
    drift(w, cx, cz, 'petal', 4, r * 2);
  },
  // the Slag Forge: lava channels round the floor, anvils, cauldrons pouring slag, chimneys
  forge: (w, cx, cz, r, enc) => {
    const m = mats();
    // glowing channels just outside the arena, cracked slag crust
    for (const p of around(cx, cz, r + 1.5, 26)) at(w, p.x, p.z, () => {
      const lav = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.7), w.rand() < 0.3 ? m.lavaCore : m.lava); lav.position.set(p.x, 0.04, p.z); lav.rotation.y = p.a + PI / 2; lav.userData.noMerge = true; w.add(lav);
      w.box(0.8, 0.12, 0.5, m.slag, p.x + Math.cos(p.a) * 0.7, 0.06, p.z - Math.sin(p.a) * 0.7, p.a);
    });
    w.lights.push({ x: cx, y: 1.5, z: cz - r, color: 0xff5a1a, power: 10, range: 18, src: {} });
    // cauldrons hanging from frames, pouring slag; chimneys smoking; anvils
    for (const p of around(cx, cz, r + 3.5, 3, 0.4, PI - 0.4)) at(w, p.x, p.z, () => {
      const gy = w.groundY(p.x, p.z);
      for (const s of [-1, 1]) w.cyl(0.15, 0.18, 5, m.iron, p.x + s * 1.4, 2.5, p.z, 5);
      w.box(3.0, 0.2, 0.2, m.iron, p.x, 5, p.z);
      w.cyl(0.9, 0.6, 1.0, m.ironDark, p.x, 3.4, p.z, 8);
      w.box(0.25, 3.0, 0.25, m.lava, p.x + 0.5, 1.6, p.z).userData.noMerge = true;
      w.ambient.push({ x: p.x, z: p.z, update: (dt, t, fx) => { if (Math.random() < dt * 20) fx.add.spawn({ x: p.x + 0.5, y: gy + 0.2, z: p.z, vx: (Math.random() - 0.5) * 2.5, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 2.5, life: 0.7, size: 0.1, size1: 0.02, r: 1, g: 0.6, b: 0.2, grav: 6 }); } });
    });
    for (const p of around(cx, cz, r + 5, 2, 0.9, PI - 0.9)) at(w, p.x, p.z, () => {
      const gy = w.groundY(p.x, p.z);
      w.cyl(1.0, 1.4, 9, w.mats.stoneDark, p.x, 4.5, p.z, 6);
      w.ambient.push({ x: p.x, z: p.z, update: (dt, t, fx) => { if (Math.random() < dt * 6) fx.norm.spawn({ x: p.x, y: gy + 9, z: p.z, vx: 0.4, vy: 1.2, life: 3, size: 0.6, size1: 1.6, r: 0.18, g: 0.16, b: 0.15, alpha: 0.6, drag: 0.4 }); } });
    });
    for (const p of around(cx, cz, r + 1.8, 4, PI + 0.4, PI * 2 - 0.4)) at(w, p.x, p.z, () => { w.box(1.2, 0.6, 0.6, m.ironDark, p.x, 0.3, p.z, p.a); w.box(0.5, 0.4, 0.5, m.iron, p.x, 0.75, p.z, p.a); });
    drift(w, cx, cz, 'spark', 6, r * 2);
  },
  // the Throne of Ash: a ruined throne, torn standards, a ring of braziers that flare when Varek ignites
  throne: (w, cx, cz, r, enc) => {
    const m = mats();
    // the throne before the great statue
    const tz = cz - r - 2.2;
    at(w, cx, tz, () => {
    w.box(4.2, 0.6, 3.2, w.mats.stoneDark, cx, 0.3, tz); w.box(3.6, 0.5, 2.6, w.mats.stone, cx, 0.85, tz);
    w.box(2.2, 1.2, 1.6, w.mats.stoneDark, cx, 1.7, tz - 0.3); w.box(2.4, 3.6, 0.5, w.mats.stoneDark, cx, 3.4, tz - 1.0);
    for (const s of [-1, 1]) { w.box(0.4, 1.4, 1.6, w.mats.stone, cx + s * 1.2, 2.2, tz - 0.3); w.cyl(0.18, 0.18, 1.2, m.gold, cx + s * 1.2, 5.6, tz - 1.0, 6); }
    w.box(1.6, 0.6, 0.4, m.ragRed, cx, 2.6, tz - 0.7);
    });
    // torn standards round the rim
    for (const p of around(cx, cz, r + 2.4, 8, 0.15, PI - 0.15)) at(w, p.x, p.z, () => w.banner(p.x, p.z, true));
    for (const p of around(cx, cz, r + 1.5, 6, PI + 0.3, PI * 2 - 0.3)) { if (w.rand() < 0.6) corpse(w, p.x, p.z, w.rand() * 6); else bones(w, p.x, p.z); }
    // braziers that only light once his blade ignites
    for (const p of around(cx, cz, r + 3.6, 6, 0.2, PI - 0.2)) at(w, p.x, p.z, () => w.brazier(p.x, p.z, { cond: () => enc.active && enc.boss?.ignited, power: 10, scale: 1 }));
    for (let i = 0; i < 6; i++) bloodStain(w, cx + (w.rand() - 0.5) * r * 1.3, cz + (w.rand() - 0.5) * r * 1.3, 1);
    for (let i = 0; i < 26; i++) { const a = w.rand() * PI * 2, d = w.rand() * r * 0.9; flat(w, new THREE.PlaneGeometry(1.4 + w.rand(), 1.0 + w.rand()), w.rand() < 0.5 ? w.mats.stoneDark : w.mats.stone, cx + Math.cos(a) * d, cz + Math.sin(a) * d, w.rand() * 3, 0.025); }
    for (const p of around(cx, cz, r - 1.2, 14)) stuckBlade(w, p.x + (w.rand() - 0.5), p.z + (w.rand() - 0.5));
    for (const p of [...around(cx, cz, r + 2.8, 3, -0.7, 0.3), ...around(cx, cz, r + 2.8, 3, PI - 0.3, PI + 0.7)]) at(w, p.x, p.z, () => { w.cyl(0.6, 0.7, 2 + w.rand() * 4, w.mats.stone, p.x, null, p.z); w.box(1.2, 0.5, 1.2, w.mats.stoneDark, p.x, 0.25, p.z); });
    drift(w, cx, cz, 'ash', 6, r * 2);
  },
};

// ---------- The Last Crusade: structures round every room's edge ----------
// Placed without the level's random stream (a position hash picks what goes where) and with no collision: they
// stand outside the walkable area, so layouts stay exactly as they were. Gothic buttresses, pipe runs with valves,
// hanging cable bundles, statues of armoured saints, wrecked servitors, gun emplacements, cogitator stacks and
// chained reliquaries.
const hh = (x, z, k = 0) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
const STRUCT = {
  buttress: lift((w, x, z, ry) => {
    const m = mats();
    w.box(0.9, 4.2, 0.9, w.mats.stoneDark, x, 2.1, z, ry); w.box(1.1, 0.3, 1.1, w.mats.stone, x, 0.15, z, ry);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4), w.mats.stoneDark); cap.position.set(x, 4.8, z); cap.rotation.y = ry + PI / 4; w.add(cap);
    for (const y of [1.2, 2.8]) w.box(0.96, 0.14, 0.96, m.ironDark, x, y, z, ry);
    w.box(0.08, 0.6, 0.06, m.optic, x + Math.sin(ry) * 0.47, 3.4, z + Math.cos(ry) * 0.47, ry); // a lit slit
  }),
  pipes: lift((w, x, z, ry) => {
    const m = mats(), c = Math.cos(ry), sn = Math.sin(ry);
    for (const [y, r] of [[0.5, 0.2], [0.95, 0.14]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3.2, 8), y > 0.6 ? m.rust : m.ironDark); p.rotation.z = PI / 2; p.rotation.y = ry; p.position.set(x, y, z); w.add(p); }
    for (const t of [-1.2, 1.2]) w.box(0.3, 1.1, 0.5, m.ironDark, x + c * t, 0.55, z - sn * t, ry);
    const v = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 4, 10), m.gold); v.position.set(x, 0.5, z + 0.05); v.rotation.y = ry; w.add(v);
  }),
  cables: lift((w, x, z, ry) => {
    const m = mats();
    w.box(0.2, 3.4, 0.2, m.ironDark, x, 1.7, z, ry); w.box(1.6, 0.14, 0.14, m.ironDark, x, 3.4, z, ry);
    for (let i = 0; i < 4; i++) { const h = 0.8 + hh(x, z, i) * 1.4; w.box(0.04, h, 0.04, m.crow, x + Math.cos(ry) * (0.2 + i * 0.3), 3.4 - h / 2, z - Math.sin(ry) * (0.2 + i * 0.3), ry); }
  }),
  saint: (w, x, z, ry) => at(w, x, z, () => {
    // a statue of an armoured saint: a robed stone figure on a plinth with a sword point-down and a halo
    const m = mats();
    w.box(1.0, 0.5, 1.0, w.mats.stone, x, 0.25, z, ry);
    robed(w, x, z, ry, { pray: true, mat: w.mats.stone, s: 1.35 });
    w.box(0.08, 1.4, 0.08, w.mats.metal, x + Math.sin(ry) * 0.35, 1.0, z + Math.cos(ry) * 0.35, ry);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 4, 14), m.gold); halo.position.set(x - Math.sin(ry) * 0.1, 2.75, z - Math.cos(ry) * 0.1); halo.rotation.y = ry; w.add(halo);
  }),
  servitor: lift((w, x, z, ry) => {
    // a wrecked servitor: a slumped plated hulk, one arm a dead claw, its optic still red
    const m = mats();
    w.box(0.9, 0.7, 0.6, m.iron, x, 0.4, z, ry + 0.3); w.box(0.4, 0.35, 0.35, m.ironDark, x, 0.9, z, ry + 0.5);
    w.box(0.08, 0.06, 0.04, m.optic, x + Math.sin(ry) * 0.18, 0.95, z + Math.cos(ry) * 0.18, ry);
    w.box(0.9, 0.18, 0.18, m.rust, x + Math.cos(ry) * 0.6, 0.15, z - Math.sin(ry) * 0.6, ry + 0.6);
    for (let i = 0; i < 3; i++) w.box(0.05, 0.05, 0.6, m.crow, x - 0.2 + i * 0.12, 0.08, z + 0.4, ry + i * 0.4);
  }),
  emplacement: lift((w, x, z, ry) => {
    // a gun emplacement: a ring of sandbags and a heavy barrel on a tripod
    const m = mats();
    for (let i = 0; i < 7; i++) { const a = ry + (i / 7) * PI * 1.4 - 0.7; w.box(0.6, 0.3, 0.35, m.straw, x + Math.sin(a) * 0.9, 0.15 + (i % 2) * 0.05, z + Math.cos(a) * 0.9, a); }
    w.box(0.14, 0.14, 1.2, m.ironDark, x + Math.sin(ry) * 0.3, 0.75, z + Math.cos(ry) * 0.3, ry);
    w.box(0.3, 0.3, 0.4, m.iron, x, 0.7, z, ry);
    for (let i = 0; i < 3; i++) { const a = i * 2.1; const l = w.box(0.05, 0.8, 0.05, m.ironDark, x + Math.cos(a) * 0.2, 0.35, z + Math.sin(a) * 0.2); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); }
  }),
  cogitator: lift((w, x, z, ry) => {
    const m = mats();
    w.box(0.9, 1.8, 0.6, m.ironDark, x, 0.9, z, ry); w.box(0.7, 0.5, 0.5, m.iron, x, 2.05, z, ry);
    const fx = Math.sin(ry) * 0.31, fz = Math.cos(ry) * 0.31;
    w.box(0.5, 0.35, 0.02, w.mats.glowWindow, x + fx, 1.3, z + fz, ry);
    for (let i = 0; i < 3; i++) w.box(0.08, 0.06, 0.02, i % 2 ? m.optic : w.mats.glowAmber, x + fx + Math.cos(ry) * (-0.2 + i * 0.2), 0.7, z + fz - Math.sin(ry) * (-0.2 + i * 0.2), ry);
  }),
  reliquary: lift((w, x, z, ry) => {
    // a chained reliquary: an iron casket on a plinth, chains to the ground, a seal on its lid
    const m = mats();
    w.box(1.0, 0.4, 0.7, w.mats.stoneDark, x, 0.2, z, ry); w.box(0.8, 0.5, 0.5, m.ironDark, x, 0.65, z, ry); w.box(0.84, 0.08, 0.54, m.gold, x, 0.92, z, ry);
    w.box(0.1, 0.1, 0.04, m.blood, x, 0.98, z, ry);
    for (const s2 of [-1, 1]) { const c = w.box(0.05, 0.9, 0.05, m.ironDark, x + Math.cos(ry) * s2 * 0.45, 0.5, z - Math.sin(ry) * s2 * 0.45, ry); c.rotation.z = s2 * 0.5; }
  }),
};
const STRUCT_KINDS = { camp: ['emplacement', 'pipes', 'servitor', 'cables'], ruins: ['saint', 'buttress', 'reliquary', 'cables'], bridge: ['cables', 'pipes'], village: ['servitor', 'cogitator', 'pipes', 'emplacement'],
  crypt: ['saint', 'reliquary', 'buttress', 'buttress'], bog: ['pipes', 'servitor', 'cables'], gate: ['buttress', 'emplacement', 'cogitator', 'saint'] };
function structures(w, mod, key) {
  const kinds = STRUCT_KINDS[key]; if (!kinds) return;
  const placed = [], half = mod.half ?? 18, x0 = mod.cx - Math.min(half, 20) - 2, x1 = mod.cx + Math.min(half, 20) + 2, z0 = mod.z1 + 1, z1 = mod.z0 - 1;
  for (let x = x0; x <= x1; x += 1.7) for (let z = z1; z >= z0; z -= 1.7) {
    if (placed.length >= 7) return;
    if (w.area(x, z, -0.6) || !w.area(x, z, -3.0)) continue; // just outside the walkable edge
    if (mod.dungeon && w.moduleAt(x, z) !== mod) continue;
    if (Object.values(w.gates).some((g) => Math.abs(z - g.z) < 5 && Math.abs(x - g.x) < 7)) continue;
    if (w.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.2)) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 4.5)) continue;
    if (hh(x, z, 9) < 0.45) continue;
    // face the room: toward the nearest walkable ground
    let ry = 0, best = 9;
    for (let a = 0; a < 8; a++) { const ang = (a / 8) * PI * 2, tx = x + Math.sin(ang) * 2.5, tz = z + Math.cos(ang) * 2.5; if (w.area(tx, tz, 0.3)) { const d = a; if (d < best) { best = d; ry = ang; } } }
    STRUCT[kinds[Math.floor(hh(x, z, 3) * kinds.length)]](w, x, z, ry);
    placed.push({ x, z });
  }
}

// called by World.build after each module's own build
export function decorate(w, key, mod) {
  mats();
  FACE = mod.dungeon ? { x: mod.cx, z: mod.cz } : { x: 0, z: null }; // figures face the room's middle
  if (ROOMS[key]) ROOMS[key](w, mod);
  structures(w, mod, key);
}
export { crows, candles, bones, corpse, robed, skullStake, lanternPost, bloodStain, cage, sacks, cart, drift };
// called by the arena builders: theme is 'pit' | 'cloister' | 'forge' | 'throne'
export function decorateArena(w, theme, cx, cz, r, enc) { mats(); W = w; ARENAS[theme]?.(w, cx, cz, r, enc); W = null; }

// per frame (from World.update): only things near the player move
export function updateAmbient(w, dt, time, fx, focus) {
  if (!focus) return;
  for (const a of w.ambient) if (Math.abs(a.z - focus.z) < 30 && Math.abs(a.x - focus.x) < 30) a.update(dt, time, fx, focus);
}
