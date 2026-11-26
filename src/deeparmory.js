// The Sunless Deep's armour (2026-11-26): two new sets per class, a piece for every armour slot, some giving off
// particles (rig.emitters, run each frame by main.js armorFx; in the piece's glow colour where they glow):
//   Templar  - the Foreman (a miner-knight: a lamp on the helm with dust drifting in its light, steam venting from
//              boilers on the shoulders and back) and the Glass-Wright (crystal-grown plate that sparkles)
//   Shrike   - the Creeper (lamp-black wraps, pinprick eyes, smoke curling off the cloak) and the Mirror (silver silk
//              and shards of mirror that glint)
//   Adept    - the Kiln (a glass-blower's leathers, embers rising off the shoulders, coals at the chest) and the Spore
//              (a robe grown over with glowing caps, spores drifting round them)
// Each builder takes the same (r, M, ...) as the others of its slot (playerkits.js), and builds on one of the
// class's plain pieces underneath.
import * as THREE from 'three';
import { box, cyl, cone, rbox, pivot } from './mesh.js';
import { strip, plate, basic, CLOTH, RIBBON } from './kits.js';
import { colorMat } from './outfits.js';

const glowOf = (r, M, dflt) => (M.glowId && M.glowId !== 'default' ? colorMat(r, M.glowId, dflt) : basic(M.glowHex ?? dflt));
const dark = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(1 - f); return c.getHex(); };
// a particle source on a piece: where (a point on the body), what kind, how many a second, its colour
export function emitter(r, parent, x, y, z, kind, rate, color) {
  const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o);
  (r.emitters ||= []).push({ o, kind, rate, color, acc: Math.random() });
  return o;
}
const crystalMat = (r, M) => new THREE.MeshLambertMaterial({ color: M.glowHex ?? 0xb090ff, emissive: dark(M.glowHex ?? 0xb090ff, 0.6), flatShading: true });

// ================= TEMPLAR =================
export const deepKnight = (KNIGHT) => ({
  helmet: {
    // Foreman's Helm: a riveted miner's helm over the bascinet, a great lamp on the brow throwing a cone of light,
    // dust drifting in it
    foreman(r, M, H) {
      KNIGHT.helmet.barbute(r, M, H);
      H.add(box(0.31, 0.06, 0.33, M.trim, 0, 0.36, 0)); H.add(box(0.36, 0.025, 0.38, M.trim, 0, 0.33, 0)); // the brim
      const lamp = glowOf(r, M, 0xffd890);
      H.add(cyl(0.06, 0.06, 0.06, r.mats.dark, 6).rotateX(Math.PI / 2).translateY(0).translateZ(0));
      const L = new THREE.Group(); L.position.set(0, 0.36, 0.17); H.add(L);
      L.add(cyl(0.065, 0.065, 0.08, M.detail, 8).rotateX(Math.PI / 2)); L.add(box(0.09, 0.09, 0.01, lamp, 0, 0, 0.045));
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 10, 1, true), new THREE.MeshBasicMaterial({ color: M.glowHex ?? 0xffd890, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      beam.rotation.x = -Math.PI / 2; beam.position.z = 0.5; L.add(beam);
      emitter(r, L, 0, 0, 0.45, 'dust', 6, M.glowHex ?? 0xffd890);
    },
    // Glass-Wright's Helm: a smooth helm with a crest of seer-glass crystals growing up out of it, sparkling
    glasshelm(r, M, H) {
      KNIGHT.helmet.great(r, M, H, false);
      const c = crystalMat(r, M);
      for (const [x, z, h, rz] of [[0, -0.02, 0.3, 0], [0.07, 0.02, 0.2, -0.3], [-0.07, 0.02, 0.2, 0.3], [0.04, -0.1, 0.16, -0.5], [-0.04, -0.1, 0.16, 0.5]]) { const k = cone(0.045, h, c, 4); k.position.set(x, 0.38 + h / 2, z); k.rotation.z = rz; H.add(k); }
      H.add(box(0.2, 0.03, 0.02, glowOf(r, M, 0xb090ff), 0, 0.2, 0.152));
      emitter(r, H, 0, 0.55, 0, 'sparkle', 5, M.glowHex ?? 0xb090ff);
    },
  },
  pauldron: {
    // Boiler Caps: round copper caps riveted down, a stubby pipe venting steam now and then
    boiler(r, M, T, s) {
      KNIGHT.pauldron.segmented(r, M, T, s);
      const { sw } = r.dims, pv = pivot(T, s * (sw + 0.02), 0.74, 0, 0, 0, -s * 0.3);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), M.trim); cap.scale.set(1.1, 0.7, 1.1); pv.add(cap);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; pv.add(box(0.025, 0.025, 0.025, M.detail, Math.cos(a) * 0.13, 0.01, Math.sin(a) * 0.13)); }
      const pipe = cyl(0.025, 0.025, 0.14, M.detail, 6); pipe.position.set(-s * 0.02, 0.1, -0.06); pv.add(pipe);
      emitter(r, pv, -s * 0.02, 0.2, -0.06, 'steam', 3, 0xd8dcdc);
    },
    // Shard Guard: a pauldron grown through with crystal spikes, sparkling
    shardguard(r, M, T, s) {
      KNIGHT.pauldron.spiked(r, M, T, s);
      const { sw } = r.dims, pv = pivot(T, s * (sw + 0.04), 0.76, 0, 0, 0, -s * 0.3), c = crystalMat(r, M);
      for (const [x, z, h, rz] of [[0, 0, 0.26, -0.3], [0.06, 0.08, 0.18, -0.7], [0.05, -0.08, 0.2, -0.6]]) { const k = cone(0.04, h, c, 4); k.position.set(s * x, h / 2, z); k.rotation.z = s * rz; pv.add(k); }
      emitter(r, pv, 0, 0.2, 0, 'sparkle', 3, M.glowHex ?? 0xb090ff);
    },
  },
  chest: {
    // Foreman's Rig: a riveted cuirass with a pressure gauge on the chest and a small boiler on the back, venting
    foreman(r, M, T, hips) {
      KNIGHT.chest.mail(r, M, T, hips);
      const { bulk: b } = r.dims, brass = M.trim;
      const g = new THREE.Group(); g.position.set(0.08 * b, 0.48, 0.15 * b); T.add(g);
      g.add(cyl(0.065, 0.065, 0.03, brass, 10).rotateX(Math.PI / 2)); g.add(cyl(0.05, 0.05, 0.035, glowOf(r, M, 0xffd890), 10).rotateX(Math.PI / 2));
      const boiler = cyl(0.12, 0.12, 0.42, M.trim, 8); boiler.position.set(0, 0.42, -0.24 * b); T.add(boiler);
      for (const y of [0.28, 0.56]) { const band = cyl(0.125, 0.125, 0.03, M.detail, 8); band.position.set(0, y, -0.24 * b); T.add(band); }
      const stack = cyl(0.035, 0.04, 0.2, M.detail, 6); stack.position.set(0.06, 0.72, -0.26 * b); T.add(stack);
      emitter(r, T, 0.06, 0.84, -0.26 * b, 'steam', 4, 0xd8dcdc);
      T.add(box(0.06, 0.04, 0.01, glowOf(r, M, 0xff8a3a), -0.08 * b, 0.36, 0.152 * b)); // (the boiler's lit sight-glass, at the front)
    },
    // Vein Plate: a cuirass split by a seam of seer-glass down the chest, glowing, crystal at the collar
    vein(r, M, T, hips) {
      KNIGHT.chest.plate(r, M, T, hips);
      const { bulk: b } = r.dims, c = crystalMat(r, M), glow = glowOf(r, M, 0xb090ff);
      for (let k = 0; k < 5; k++) T.add(rbox(0.03, 0.09, 0.02, glow, (k % 2 ? 0.02 : -0.02) * b, 0.62 - k * 0.08, 0.155 * b, 0, 0, (k % 2 ? 0.4 : -0.4)));
      for (const [x, h] of [[-0.14, 0.14], [0.14, 0.16], [-0.06, 0.1], [0.07, 0.1]]) { const k = cone(0.035, h, c, 4); k.position.set(x * b, 0.68 + h / 2, 0.04); T.add(k); }
      emitter(r, T, 0, 0.5, 0.17 * b, 'sparkle', 4, M.glowHex ?? 0xb090ff);
    },
  },
  legs: {
    // Foreman's Boots: heavy hobnailed boots, knee lamps, a tool belt
    foreman(r, M, hips) {
      KNIGHT.legs.mailskirt(r, M, hips);
      const { bulk: b } = r.dims, lamp = glowOf(r, M, 0xffd890);
      for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; sh.add(box(0.17 * b, 0.12, 0.2 * b, M.detail, 0, -r.dims.shin + 0.08, 0.03)); sh.add(box(0.05, 0.04, 0.02, lamp, 0, -0.04, 0.12)); }
      for (const x of [-0.12, 0.12]) hips.add(box(0.06, 0.12, 0.05, M.trim, x, 0.02, 0.13 * b));
    },
    // Shard Greaves: greaves with crystals growing out of the knees
    shard(r, M, hips) {
      KNIGHT.legs.greaves(r, M, hips);
      const c = crystalMat(r, M);
      for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; for (const [x, h, rz] of [[0, 0.14, 0], [0.04, 0.09, -0.5], [-0.04, 0.09, 0.5]]) { const k = cone(0.03, h, c, 4); k.position.set(x, 0.02 + h / 2, 0.1); k.rotation.set(0.4, 0, rz); sh.add(k); } }
    },
  },
});

// ================= SHRIKE =================
export const deepRogue = (ROGUE) => ({
  cloak: {
    // Creeper's Shroud: a lamp-black shroud in strips, smoke curling off its hem
    smoke(r, M, T, H) {
      ROGUE.cloak.tattered(r, M, T, H);
      const { bulk: b } = r.dims, black = r.m(dark(M.mainHex, 0.55));
      for (const x of [-0.16, -0.05, 0.06, 0.17]) strip(r, T, x * b, 0.6, -0.15 * b, 0.07, [0.24, 0.22, 0.2], black, { lx: [-0.1, 1.3], taper: 0.7, th: 0.02 });
      emitter(r, T, 0, 0.0, -0.2 * b, 'smoke', 7, 0x1a1816);
    },
    // Mirror Silk: a cloak of silver silk with shards of mirror sewn along its edge, glinting
    mirror(r, M, T, H) {
      ROGUE.cloak.mantle(r, M, T, H);
      const { bulk: b } = r.dims, mir = new THREE.MeshLambertMaterial({ color: 0xe0e8ff, emissive: 0x30344a, flatShading: true });
      const silk = r.m(0xb8bcd0);
      for (const x of [-0.14, 0, 0.14]) strip(r, T, x * b, 0.62, -0.15 * b, 0.12, [0.28, 0.26], silk, { trim: mir, lx: [-0.1, 1.1], taper: 0.9 });
      for (let k = 0; k < 5; k++) T.add(rbox(0.05, 0.07, 0.01, mir, (-0.16 + k * 0.08) * b, 0.66, -0.17 * b, 0.2, 0, k * 0.4));
      emitter(r, T, 0, 0.5, -0.2 * b, 'glint', 3, 0xffffff);
    },
  },
  mask: {
    // Creeper's Wraps: the face wound in black bandages, two pinprick eyes, wisps of smoke
    creeper(r, M, H, T) {
      ROGUE.mask.wrap(r, M, H, T);
      const black = r.m(dark(M.mainHex, 0.6)), eye = glowOf(r, M, 0xffe080);
      H.add(box(0.27, 0.3, 0.27, black, 0, 0.17, 0));
      for (let i = 0; i < 4; i++) H.add(box(0.28, 0.025, 0.28, r.m(0x3a3430), 0, 0.06 + i * 0.08, 0));
      for (const s of [-1, 1]) H.add(box(0.035, 0.025, 0.02, eye, s * 0.055, 0.2, 0.14));
      emitter(r, H, 0, 0.32, -0.05, 'smoke', 3, 0x1a1816);
    },
    // Mirror Face: a smooth mirror where the face is, and nothing behind it
    mirror(r, M, H, T) {
      const mir = new THREE.MeshLambertMaterial({ color: 0xe0e8ff, emissive: 0x40465a, flatShading: true });
      H.add(box(0.1, 0.08, 0.1, r.mats.skin, 0, 0.03, 0));
      H.add(box(0.27, 0.31, 0.27, M.main, 0, 0.18, -0.01)); H.add(box(0.24, 0.27, 0.02, mir, 0, 0.18, 0.13));
      H.add(box(0.28, 0.04, 0.28, M.trim, 0, 0.34, -0.01));
      emitter(r, H, 0.05, 0.25, 0.15, 'glint', 1.5, 0xffffff);
    },
  },
  shirt: {
    // Creeper's Harness: black wraps and straps, a lamp-black hood of cloth over the shoulders
    creeper(r, M, T) {
      ROGUE.shirt.jerkin(r, M, T);
      const { bulk: b } = r.dims, black = r.m(dark(M.mainHex, 0.6)), iron = r.m(0x4a4a50);
      T.add(box(0.5 * b, 0.62, 0.3 * b, black, 0, 0.33, 0));
      for (const y of [0.18, 0.32, 0.46]) T.add(box(0.52 * b, 0.035, 0.32 * b, M.trim, 0, y, 0));
      for (const x of [-0.12, 0.12]) T.add(box(0.03, 0.05, 0.12, iron, x * b, 0.6, 0.12 * b));
    },
    // Mirror Scale: a vest of small mirror shards overlapping like scales, a few of them catching the light
    mirror(r, M, T) {
      ROGUE.shirt.brigandine(r, M, T);
      const { bulk: b } = r.dims, mir = new THREE.MeshLambertMaterial({ color: 0xd8e0f8, emissive: 0x282c40, flatShading: true });
      for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) T.add(rbox(0.07, 0.06, 0.01, mir, (-0.12 + k * 0.08 + (row % 2) * 0.04) * b, 0.56 - row * 0.09, 0.155 * b, -0.3, 0, 0));
      emitter(r, T, 0, 0.45, 0.17 * b, 'glint', 2, 0xffffff);
    },
  },
  band: {
    // Creeper's Spikes: black wraps with iron nails driven through them
    spike(r, M, arm) {
      ROGUE.band.cloth(r, M, arm);
      const black = r.m(dark(M.mainHex, 0.5)), iron = r.m(0x5a5a62);
      arm.add(box(0.15, 0.22, 0.16, black, 0, -0.16, 0));
      for (const [x, y] of [[0.08, -0.1], [0.08, -0.2], [-0.08, -0.15]]) { const k = cone(0.02, 0.08, iron, 4); k.position.set(x, y, 0); k.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2; arm.add(k); }
    },
    // Shard Bracer: a silver bracer set with one long shard of mirror
    shard(r, M, arm) {
      ROGUE.band.bracer(r, M, arm);
      const mir = new THREE.MeshLambertMaterial({ color: 0xe0e8ff, emissive: 0x30344a, flatShading: true });
      arm.add(rbox(0.03, 0.24, 0.07, mir, 0.08, -0.18, 0, 0, 0, 0.1));
    },
  },
});

// ================= ADEPT =================
export const deepMage = (MAGE) => ({
  shoulder: {
    // Kiln Mantle: a glass-blower's thick leather mantle with a brass heat shield, embers rising off it
    kiln(r, M, T, rune, H) {
      MAGE.shoulder.pauldron(r, M, T, rune, H);
      const { sw } = r.dims, pv = pivot(T, sw + 0.02, 0.74, 0, 0, 0, -0.3);
      pv.add(box(0.26, 0.04, 0.32, M.trim, 0, 0.04, 0));
      for (let k = 0; k < 3; k++) pv.add(box(0.03, 0.02, 0.3, glowOf(r, M, 0xff8a3a), -0.08 + k * 0.08, 0.07, 0));
      emitter(r, pv, 0, 0.1, 0, 'ember', 6, M.glowHex ?? 0xff8a3a);
      emitter(r, T, -sw, 0.7, 0, 'ember', 3, M.glowHex ?? 0xff8a3a);
    },
    // Spore Crown: caps of glowing fungus grown up over both shoulders, spores drifting off them
    spore(r, M, T, rune, H) {
      MAGE.shoulder.mantle(r, M, T, rune, H);
      const { sw } = r.dims, cap = glowOf(r, M, 0x3ad8c8), stalk = r.m(0xb8b0a0);
      for (const s of [1, -1]) for (const [x, z, h, rr] of [[0, 0, 0.14, 0.09], [0.06, 0.07, 0.09, 0.06], [-0.04, -0.07, 0.11, 0.07]]) {
        const st = cyl(0.02, 0.025, h, stalk, 5); st.position.set(s * (sw + x), 0.72 + h / 2, z); T.add(st);
        const c = new THREE.Mesh(new THREE.SphereGeometry(rr, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), cap); c.position.set(s * (sw + x), 0.72 + h, z); T.add(c);
      }
      emitter(r, T, sw, 0.9, 0, 'spore', 3, M.glowHex ?? 0x3ad8c8); emitter(r, T, -sw, 0.9, 0, 'spore', 3, M.glowHex ?? 0x3ad8c8);
    },
  },
  shirt: {
    // Kiln Coat: a long scorched leather apron-coat, a belt of tongs, coals glowing in a brass grate at the chest
    kiln(r, M, T, rune, hips) {
      MAGE.shirt.robe(r, M, T, rune, hips);
      const { bulk: b } = r.dims, brass = M.trim, coal = glowOf(r, M, 0xff6a1a);
      T.add(box(0.16, 0.12, 0.04, brass, 0, 0.46, 0.15 * b)); for (let k = 0; k < 3; k++) T.add(box(0.03, 0.08, 0.045, coal, -0.05 + k * 0.05, 0.46, 0.155 * b));
      T.add(box(0.46 * b, 0.05, 0.3 * b, r.m(0x3a2a1c), 0, 0.12, 0));
      for (const x of [-0.12, 0.1]) T.add(rbox(0.02, 0.22, 0.02, r.m(0x4a4a50), x * b, 0.02, 0.14 * b, 0, 0, 0.15));
      emitter(r, T, 0, 0.5, 0.17 * b, 'ember', 4, M.glowHex ?? 0xff6a1a);
    },
    // Spore Robe: a robe grown over with moss and small glowing caps
    spore(r, M, T, rune, hips) {
      MAGE.shirt.robe(r, M, T, rune, hips);
      const { bulk: b } = r.dims, cap = glowOf(r, M, 0x3ad8c8), moss = r.m(0x4a5a46);
      for (const [x, y] of [[-0.14, 0.5], [0.12, 0.38], [-0.04, 0.24], [0.15, 0.6], [-0.16, 0.2]]) { T.add(box(0.1, 0.08, 0.03, moss, x * b, y, 0.15 * b)); const c = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), cap); c.position.set(x * b, y + 0.04, 0.17 * b); c.rotation.x = Math.PI / 2; T.add(c); }
      emitter(r, T, 0, 0.3, 0.17 * b, 'spore', 2, M.glowHex ?? 0x3ad8c8);
    },
  },
  pants: {
    // Kiln Leggings: heat-scarred leathers and iron-shod boots, embers falling from the knees
    kiln(r, M) {
      MAGE.pants.greaves(r, M);
      const { bulk: b } = r.dims, coal = glowOf(r, M, 0xff6a1a);
      for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; sh.add(rbox(0.012, 0.1, 0.01, coal, 0.02, -0.18, 0.085 * b, 0, 0, 0.4)); sh.add(box(0.16 * b, 0.1, 0.19 * b, r.m(0x3a3a3e), 0, -r.dims.shin + 0.06, 0.03)); }
      emitter(r, r.j.shinL, 0, -0.05, 0.09, 'ember', 2, M.glowHex ?? 0xff6a1a);
    },
    // Spore Leggings: wrapped in moss, a ring of tiny caps round each knee
    spore(r, M) {
      MAGE.pants.trousers(r, M);
      const { bulk: b } = r.dims, cap = glowOf(r, M, 0x3ad8c8);
      for (const L of [true, false]) { const sh = r.j[L ? 'shinL' : 'shinR']; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; const c = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 3, 0, Math.PI * 2, 0, Math.PI / 2), cap); c.position.set(Math.cos(a) * 0.09 * b, -0.02, Math.sin(a) * 0.09 * b); sh.add(c); } }
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
    const c = new THREE.Color(E.color), j = () => (Math.random() - 0.5);
    if (E.kind === 'ember') fx.add.spawn({ x: _v.x + j() * 0.15, y: _v.y, z: _v.z + j() * 0.15, vx: j() * 0.4, vy: 0.9 + Math.random() * 0.7, vz: j() * 0.4, life: 0.9, size: 0.07, size1: 0.02, r: c.r, g: c.g, b: c.b });
    else if (E.kind === 'smoke') fx.norm.spawn({ x: _v.x + j() * 0.3, y: _v.y, z: _v.z + j() * 0.3, vx: j() * 0.3, vy: 0.35, vz: j() * 0.3, life: 1.3, size: 0.18, size1: 0.45, r: c.r, g: c.g, b: c.b, alpha: 0.4, drag: 0.6 });
    else if (E.kind === 'steam') fx.norm.spawn({ x: _v.x, y: _v.y, z: _v.z, vx: j() * 0.3, vy: 1.2, vz: j() * 0.3, life: 0.9, size: 0.1, size1: 0.35, r: c.r, g: c.g, b: c.b, alpha: 0.45, drag: 1 });
    else if (E.kind === 'sparkle' || E.kind === 'glint') fx.add.spawn({ x: _v.x + j() * 0.3, y: _v.y + j() * 0.3, z: _v.z + j() * 0.3, vy: 0.1, life: E.kind === 'glint' ? 0.25 : 0.45, size: E.kind === 'glint' ? 0.12 : 0.07, size1: 0.01, r: c.r, g: c.g, b: c.b });
    else if (E.kind === 'spore') fx.add.spawn({ x: _v.x + j() * 0.2, y: _v.y, z: _v.z + j() * 0.2, vx: j() * 0.25, vy: 0.25, vz: j() * 0.25, life: 2.0, size: 0.05, size1: 0.03, r: c.r, g: c.g, b: c.b, alpha: 0.8 });
    else if (E.kind === 'dust') { const d = Math.random() * 0.5; fx.add.spawn({ x: _v.x + j() * 0.3 * d, y: _v.y + j() * 0.2, z: _v.z + j() * 0.3, vy: 0.05, vx: j() * 0.1, life: 1.2, size: 0.035, size1: 0.02, r: c.r, g: c.g, b: c.b, alpha: 0.7 }); }
  }
}
