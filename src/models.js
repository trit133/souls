import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl } from './mesh.js';
import './playerkits.js'; // the player characters' kits (pieces from their outfits)
import { KITS } from './kits.js';

// Low-poly procedural humanoids. Every model faces +Z; the character's right
// side is -X. Joint rotations (radians, Euler XYZ):
//   arm/leg .x negative  -> swing forward      torso .x positive -> lean forward
//   arm .z (right arm) negative -> raise outward     shin .x positive -> bend knee
//   torso/hips .y positive -> twist toward character's left (+X)
//
// Everything here is visual. Hits are circles around the actor (actor.js), so
// parts, springs and follow-through never change gameplay.

export const JOINTS = ['hips', 'torso', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'legR', 'shinR'];
// upper-body joints get an underdamped follow-through on top of the pose damping
const FOLLOW = new Set(['torso', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR']);
const FK = 320, FD = 19; // follow-through spring: stiffness, damping (a little overshoot)

function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
}

// shared wind: a slowly turning direction with gusts (world space, m/s of "air")
let windT = 0;
const wind = new THREE.Vector3();
function windAt(t) {
  const a = 0.7 + Math.sin(t * 0.05) * 0.8;
  const g = 1.1 + Math.sin(t * 0.61) * 0.6 + Math.sin(t * 1.73 + 1.3) * 0.35 + Math.max(0, Math.sin(t * 0.23)) * 1.2;
  return wind.set(Math.cos(a) * g, 0, Math.sin(a) * g);
}

// A hinged part (cloth panel, plume, strap, armor plate). It swings toward where the
// air pushes it (wind minus the body's velocity), lags behind acceleration and turns,
// and can be jolted by kick(). Limits keep cloth from passing through the body.
class Spring {
  constructor(obj, o = {}) {
    this.obj = obj;
    this.rx = obj.rotation.x; this.rz = obj.rotation.z;
    this.k = o.k ?? 70; this.d = o.d ?? 7;
    this.drag = o.drag ?? 0.12; this.inertia = o.inertia ?? 0.012; this.turn = o.turn ?? 0.05;
    this.windK = o.wind ?? 1; this.flutter = o.flutter ?? 0.06;
    this.rattle = o.rattle ?? 0;
    this.lx = o.lx ?? [-1.2, 1.2]; this.lz = o.lz ?? [-1.0, 1.0];
    this.ax = 0; this.az = 0; this.vx = 0; this.vz = 0;
    this.ph = Math.random() * 20;
  }
}

export class Rig {
  constructor() {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.j = {};
    this.cur = {};
    this.fol = {};
    this.materials = [];
    this.scalars = { by: 0, guard: 0 };
    this.tip = new THREE.Object3D();
    this.base = new THREE.Object3D();
    this.tipL = null; this.baseL = null;
    this.shield = null;
    this.flashT = 0;
    this.flashColor = new THREE.Color(1, 1, 1);
    this.springs = [];
    this.spinners = [];   // { obj, axis, speed } turned every frame (orbiting glyphs)
    this.glowMats = [];   // { mat, lo, hi } brightened by setGlow()
    this.onStep = null;   // footstep callback (knight armor rattle sound)
    this.t = 0;
    this._lp = null; this._lv = new THREE.Vector3(); this._acc = new THREE.Vector3(); this._ly = 0; this._yr = 0;
    this._step = 0; this._lean = [0, 0];
    this.fx = null;       // per-kit visual extras, e.g. the rogue's idle dagger twirl
  }

  m(color, opts) { const x = mat(color, opts); this.materials.push(x); return x; }

  spring(obj, o) { const s = new Spring(obj, o); this.springs.push(s); return s; }

  // jolt the hinged parts: armor plates rattle hard, cloth only a little
  kick(a = 1) {
    for (const s of this.springs) {
      const r = s.rattle || 0.15;
      s.vx += (Math.random() - 0.5) * a * r * 18;
      s.vz += (Math.random() - 0.5) * a * r * 18;
    }
  }

  // 0..1: rune glow (Spellsword's mana)
  setGlow(f) {
    for (const g of this.glowMats) g.mat.color.copy(g.lo).lerp(g.hi, f);
  }

  // Damp every joint toward the target pose. `rate` is ~1/time-constant.
  apply(pose, dt, rate = 14) {
    if (this.poseMod) pose = this.poseMod(pose);
    const k = 1 - Math.exp(-rate * dt);
    for (const name of JOINTS) {
      const t = pose[name] || ZERO;
      const c = this.cur[name] || (this.cur[name] = [0, 0, 0]);
      const snap = pose.snap && pose.snap[name];
      if (snap) { c[0] = t[0]; c[1] = t[1]; c[2] = t[2]; }
      else { c[0] += (t[0] - c[0]) * k; c[1] += (t[1] - c[1]) * k; c[2] += (t[2] - c[2]) * k; }
      if (c[0] > Math.PI) c[0] -= Math.PI * 2; // rolls spin the hips a full turn
      const o = this.j[name];
      if (!o) continue;
      if (FOLLOW.has(name) && dt > 0) {
        // follow-through: an underdamped spring chasing the damped pose (overshoots a little)
        const f = this.fol[name] || (this.fol[name] = { p: c.slice(), v: [0, 0, 0] });
        const h = Math.min(dt, 1 / 30);
        for (let i = 0; i < 3; i++) {
          if (snap) { f.p[i] = c[i]; f.v[i] = 0; continue; }
          f.v[i] += (FK * (c[i] - f.p[i]) - FD * f.v[i]) * h;
          f.p[i] += f.v[i] * h;
        }
        o.rotation.set(f.p[0], f.p[1], f.p[2]);
      } else o.rotation.set(c[0], c[1], c[2]);
    }
    for (const s in this.scalars) {
      const t = pose[s] ?? 0;
      this.scalars[s] += (t - this.scalars[s]) * k;
    }
    this.body.position.y = this.hipH + this.scalars.by;
    if (this.shield) {
      const g = this.scalars.guard;
      this.shield.position.set(lerp(0.44, 0.1, g), lerp(0.22, 0.32, g), lerp(0.02, 0.45, g));
      this.shield.rotation.set(lerp(0.1, 0, g), lerp(Math.PI / 2, 0.05, g), 0);
    }
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      const f = this.flashT / 0.12;
      for (const mm of this.materials) mm.emissive.copy(this.flashColor).multiplyScalar(f * 0.8);
    } else if (this._flashing) {
      for (const mm of this.materials) mm.emissive.setRGB(0, 0, 0);
    }
    this._flashing = this.flashT > 0;
    if (dt > 0) this.secondary(dt);
  }

  // body motion -> lean, cloth, plates, footsteps
  secondary(dt) {
    this.t += dt; windT += dt * 0.5; // shared clock, advanced by everyone (only its look matters)
    const p = this.root.position, yaw = this.root.rotation.y;
    if (!this._lp) { this._lp = p.clone(); this._ly = yaw; }
    const inv = 1 / Math.max(dt, 1 / 120);
    const vx = (p.x - this._lp.x) * inv, vz = (p.z - this._lp.z) * inv;
    this._lp.copy(p);
    // teleports (respawn, new room) shouldn't fling the cloth
    const fast = Math.hypot(vx, vz) > 30;
    const ax = fast ? 0 : (vx - this._lv.x) * inv, az = fast ? 0 : (vz - this._lv.z) * inv;
    this._acc.x += (ax - this._acc.x) * Math.min(1, dt * 12); this._acc.z += (az - this._acc.z) * Math.min(1, dt * 12);
    if (!fast) this._lv.set(vx, 0, vz); else this._lv.set(0, 0, 0);
    let dy = yaw - this._ly; this._ly = yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this._yr += (dy * inv - this._yr) * Math.min(1, dt * 10);
    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    const toLocal = (x, z) => [x * cy - z * sy, x * sy + z * cy]; // -> [local x (left), local z (forward)]
    const [lvx, lvz] = toLocal(this._lv.x, this._lv.z);
    const [lax, laz] = toLocal(this._acc.x, this._acc.z);
    const w = windAt(windT);
    const [wx, wz] = toLocal(w.x, w.z);
    const airX = wx - lvx, airZ = wz - lvz, air = Math.hypot(airX, airZ);
    const speed = Math.hypot(lvx, lvz);

    // whole-body lean into acceleration and turns
    const tl = [clamp(laz * 0.006, -0.12, 0.12), clamp(-lax * 0.006 + this._yr * speed * 0.012, -0.12, 0.12)];
    this._lean[0] += (tl[0] - this._lean[0]) * Math.min(1, dt * 8);
    this._lean[1] += (tl[1] - this._lean[1]) * Math.min(1, dt * 8);
    this.body.rotation.x = this._lean[0]; this.body.rotation.z = this._lean[1];

    // footsteps: the legs cross once per step
    const lg = (this.cur.legL?.[0] ?? 0) - (this.cur.legR?.[0] ?? 0);
    const sg = lg > 0.05 ? 1 : lg < -0.05 ? -1 : 0;
    if (sg && sg !== this._step) {
      if (this._step && speed > 1.2) { this.kick(0.35 + speed * 0.06); this.onStep?.(speed); }
      this._step = sg;
    }

    const h = Math.min(dt, 1 / 30);
    for (const s of this.springs) {
      // where the air and inertia want the part to hang
      const fl = s.flutter * (0.3 + air * 0.35) * Math.sin(this.t * 11 + s.ph);
      const tx = s.rx + s.windK * (-s.drag * airZ) + s.inertia * laz + fl;
      const tz = s.rz + s.windK * (s.drag * airX) - s.inertia * lax - s.turn * this._yr + fl * 0.6;
      s.vx += (s.k * (tx - s.rx - s.ax) - s.d * s.vx) * h;
      s.vz += (s.k * (tz - s.rz - s.az) - s.d * s.vz) * h;
      s.ax += s.vx * h; s.az += s.vz * h;
      if (s.ax < s.lx[0]) { s.ax = s.lx[0]; s.vx *= -0.3; } else if (s.ax > s.lx[1]) { s.ax = s.lx[1]; s.vx *= -0.3; }
      if (s.az < s.lz[0]) { s.az = s.lz[0]; s.vz *= -0.3; } else if (s.az > s.lz[1]) { s.az = s.lz[1]; s.vz *= -0.3; }
      s.obj.rotation.x = s.rx + s.ax; s.obj.rotation.z = s.rz + s.az;
    }
    for (const sp of this.spinners) sp.obj.rotation[sp.axis] += sp.speed * dt;
    this.fx?.(dt, speed);
  }

  flash(r = 1, g = 1, b = 1) { this.flashT = 0.12; this.flashColor.setRGB(r, g, b); this._flashing = true; this.kick(1.4); }

  tipWorld(out) { return this.tip.getWorldPosition(out); }
}

const ZERO = [0, 0, 0];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/**
 * Build a humanoid.
 * opts: scale, skin, cloth, armor, accent, head: 'helm'|'hood'|'horned'|'bare'|'cap'|'hair'|'none',
 *       weapon: 'sword'|'daggers'|'greatsword'|'spear'|'club'|'bow'|'rusty'|..., shield, eyes,
 *       kit: name in kits.js that adds detail and hinged parts
 */
export function buildHumanoid(o) {
  const r = new Rig();
  const S = o.scale || 1;
  const bulk = o.bulk || 1;
  const skin = r.m(o.skin || 0x8a7a68);
  const cloth = r.m(o.cloth || 0x4a3c2c);
  const armor = r.m(o.armor || o.cloth || 0x6a6a70);
  const accent = r.m(o.accent || 0x7a2020);
  const dark = r.m(0x1c1814);
  r.mats = { skin, cloth, armor, accent, dark };

  const hipH = 0.95; r.hipH = hipH;
  const thigh = 0.48, shin = 0.47, torsoH = 0.68, upper = 0.36, fore = 0.34;
  const hw = 0.13 * bulk, sw = 0.27 * bulk;
  r.dims = { bulk, thigh, shin, torsoH, upper, fore, hw, sw };

  r.root.scale.setScalar(S);
  const hips = new THREE.Group(); r.body.add(hips); r.j.hips = hips;
  hips.add(box(0.36 * bulk, 0.2, 0.22 * bulk, cloth, 0, 0.02, 0));

  for (const side of [1, -1]) {
    const leg = new THREE.Group(); leg.position.set(hw * side, -0.04, 0); hips.add(leg);
    leg.add(box(0.15 * bulk, thigh, 0.17 * bulk, o.legs ? r.m(o.legs.thigh) : cloth, 0, -thigh / 2, 0));
    const sh = new THREE.Group(); sh.position.y = -thigh; leg.add(sh);
    sh.add(box(0.13 * bulk, shin, 0.15 * bulk, o.legs ? r.m(o.legs.shin) : armor, 0, -shin / 2, 0));
    sh.add(box(0.15 * bulk, 0.08, 0.26 * bulk, dark, 0, -shin + 0.0, 0.05));
    r.j[side > 0 ? 'legL' : 'legR'] = leg;
    r.j[side > 0 ? 'shinL' : 'shinR'] = sh;
  }

  const torso = new THREE.Group(); hips.add(torso); r.j.torso = torso;
  torso.add(box(0.34 * bulk, 0.3, 0.21 * bulk, cloth, 0, 0.17, 0));
  torso.add(box(0.46 * bulk, 0.36, 0.27 * bulk, armor, 0, 0.48, 0));
  if (o.tabard && !o.kit) torso.add(box(0.3 * bulk, 0.62, 0.02, accent, 0, 0.18, 0.15 * bulk));
  if (o.pauldrons && !o.kit) {
    for (const s of [1, -1]) {
      const p = box(0.2 * bulk, 0.12, 0.26 * bulk, armor, s * sw, torsoH - 0.02, 0);
      p.rotation.z = -s * 0.25; torso.add(p);
    }
  }
  if (o.cape && !o.kit) {
    const cape = box(0.44 * bulk, 0.95, 0.03, accent, 0, 0.1, -0.15 * bulk);
    cape.rotation.x = 0.12; torso.add(cape); r.cape = cape;
  }

  const head = new THREE.Group(); head.position.y = torsoH + 0.02; torso.add(head); r.j.head = head;
  const ht = o.head || 'bare';
  if (ht !== 'none') head.add(box(0.1, 0.08, 0.1, skin, 0, 0.03, 0));
  if (ht === 'helm' || ht === 'horned') {
    head.add(box(0.27, 0.3, 0.29, armor, 0, 0.19, 0));
    head.add(box(0.2, 0.03, 0.02, dark, 0, 0.2, 0.15));
    if (ht === 'helm') head.add(box(0.04, 0.12, 0.26, accent, 0, 0.38, -0.02));
    if (ht === 'horned') {
      for (const s of [1, -1]) {
        const h1 = cyl(0.02, 0.06, 0.32, r.m(0xcfc2a0), 5);
        h1.position.set(s * 0.17, 0.36, 0); h1.rotation.z = -s * 0.7; head.add(h1);
      }
    }
  } else if (ht === 'hood') {
    head.add(box(0.24, 0.26, 0.26, skin, 0, 0.17, 0));
    const hood = cyl(0.04, 0.2, 0.36, cloth, 5); hood.position.set(0, 0.24, -0.02); head.add(hood);
    head.add(box(0.26, 0.1, 0.1, accent, 0, 0.07, 0.09));
  } else if (ht === 'hair') {
    head.add(box(0.24, 0.26, 0.25, skin, 0, 0.17, 0));
    head.add(box(0.27, 0.12, 0.28, accent, 0, 0.3, -0.01));
    head.add(box(0.27, 0.42, 0.08, accent, 0, 0.08, -0.14));
  } else if (ht === 'cap') {
    head.add(box(0.24, 0.26, 0.25, skin, 0, 0.17, 0));
    const cap = cyl(0.03, 0.18, 0.18, armor, 6); cap.position.y = 0.36; head.add(cap);
  } else if (ht !== 'none') {
    head.add(box(0.24, 0.27, 0.25, skin, 0, 0.17, 0));
  }
  if (o.eyes) {
    const em = new THREE.MeshBasicMaterial({ color: o.eyes });
    // helmets have a visor slit at the same spot, so eyes sit just in front of it
    const ez = o.eyeZ ?? (ht === 'helm' || ht === 'horned' ? 0.172 : 0.15);
    for (const s of [1, -1]) head.add(box(0.045, 0.03, 0.02, em, s * 0.06, 0.2, ez));
    if (o.eyeGlow) {
      // bright white core inside a red halo
      const halo = new THREE.MeshBasicMaterial({ color: o.eyeGlow });
      for (const s of [1, -1]) head.add(box(0.08, 0.06, 0.012, halo, s * 0.06, 0.2, ez - 0.008));
    }
  }

  for (const side of [1, -1]) {
    const arm = new THREE.Group(); arm.position.set(sw * side, torsoH - 0.08, 0); torso.add(arm);
    arm.add(box(0.12 * bulk, upper, 0.13 * bulk, armor, 0, -upper / 2, 0));
    const fa = new THREE.Group(); fa.position.y = -upper; arm.add(fa);
    fa.add(box(0.11 * bulk, fore, 0.12 * bulk, cloth, 0, -fore / 2, 0));
    const hand = new THREE.Group(); hand.position.y = -fore - 0.04; fa.add(hand);
    hand.add(box(0.1, 0.1, 0.1, skin));
    const L = side > 0;
    r.j[L ? 'armL' : 'armR'] = arm; r.j[L ? 'foreL' : 'foreR'] = fa; r.j[L ? 'handL' : 'handR'] = hand;
  }

  if (!(o.kit && KITS[o.kit]?.weapon)) attachWeapon(r, o.weapon, o);
  if (o.shield && !o.kit) {
    const sh = new THREE.Group();
    const face = r.m(0x5d6a7c);
    sh.add(box(0.5, 0.66, 0.06, face));
    sh.add(box(0.12, 0.66, 0.08, r.m(0xb89a4a)));
    sh.add(box(0.5, 0.1, 0.08, r.m(0xb89a4a), 0, 0.08, 0));
    const pt = box(0.36, 0.2, 0.06, face, 0, -0.38, 0); pt.scale.x = 0.7; sh.add(pt);
    torso.add(sh); r.shield = sh;
  }
  if (o.kit) KITS[o.kit]?.build(r, o);

  // blob shadow (stays on the ground; lives under root, not body)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42 * bulk, 16), SHADOW_MAT);
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; r.root.add(shadow);
  r.shadow = shadow;
  compact(r.body, new Set([r.arrow].filter(Boolean)));
  return r;
}

export const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });

// Merge the static boxes under each group into one mesh per material (fewer draw calls).
// Groups (joints, pivots) and anything in `keep` stay separate.
function compact(obj, keep) {
  const kids = [...obj.children];
  const byMat = new Map();
  for (const c of kids) {
    if (c.isMesh && !keep.has(c) && c.geometry.index) {
      if (!byMat.has(c.material)) byMat.set(c.material, []);
      byMat.get(c.material).push(c);
    } else if (!c.isMesh) compact(c, keep);
  }
  for (const [m, list] of byMat) {
    if (list.length < 2) continue;
    const geos = list.map((c) => { c.updateMatrix(); const g = c.geometry.clone().applyMatrix4(c.matrix); return g; });
    const merged = mergeGeometries(geos.map((g) => (g.attributes.uv ? g : g)), false);
    if (!merged) continue;
    for (const c of list) { obj.remove(c); c.geometry.dispose(); }
    for (const g of geos) g.dispose();
    obj.add(new THREE.Mesh(merged, m));
  }
}

export function attachWeapon(r, kind, o) {
  const hand = r.j.handR;
  const g = new THREE.Group(); hand.add(g);
  r.wpnR = g;
  const steel = r.m(0xc8ccd2);
  const grip = r.m(0x3a2616);
  const gold = r.m(0xb89a4a);
  const put = (len, baseZ) => {
    r.base.position.set(0, 0, baseZ); g.add(r.base);
    r.tip.position.set(0, 0, len); g.add(r.tip);
  };
  if (kind === 'sword' || kind === 'rusty') {
    const blade = kind === 'rusty' ? r.m(0x8a6a50) : steel;
    const len = kind === 'rusty' ? 0.85 : 1.05;
    g.add(box(0.05, 0.05, 0.22, grip, 0, 0, 0));
    g.add(box(0.26, 0.05, 0.05, kind === 'rusty' ? grip : gold, 0, 0, 0.12));
    g.add(box(0.03, 0.08, len - 0.15, blade, 0, 0, 0.12 + (len - 0.15) / 2));
    if (kind === 'rusty') g.add(box(0.035, 0.03, 0.16, r.m(0x5a3a28), 0, 0.03, 0.5)); // notch of rust
    put(len, 0.25);
  } else if (kind === 'greatsword') {
    g.add(box(0.07, 0.07, 0.42, grip, 0, 0, -0.05));
    g.add(box(0.46, 0.08, 0.08, gold, 0, 0, 0.18));
    const bl = r.m(0x5a5a62, { emissive: 0x000000 });
    r.bladeMat = bl;
    g.add(box(0.05, 0.2, 1.75, bl, 0, 0, 0.18 + 0.88));
    g.add(box(0.06, 0.05, 1.5, r.m(0x2a2a30), 0, 0, 1.0)); // fuller
    put(2.0, 0.4);
  } else if (kind === 'axe') {
    // long-hafted executioner's axe; blade near the tip
    g.add(box(0.06, 0.06, 1.9, grip, 0, 0, 0.55));
    const head = r.m(0x6a6a72);
    r.bladeMat = head;
    g.add(box(0.05, 0.62, 0.42, head, 0, 0.22, 1.28));
    g.add(box(0.07, 0.12, 0.5, head, 0, -0.05, 1.28));
    g.add(box(0.08, 0.08, 0.1, gold, 0, 0, 1.52));
    g.add(box(0.055, 0.06, 0.4, r.m(0xa8a8b0), 0, 0.52, 1.28)); // bright edge
    put(1.6, 0.9);
  } else if (kind === 'maul') {
    // great stone maul
    g.add(box(0.08, 0.08, 1.7, grip, 0, 0, 0.5));
    const stone = r.m(0x6a665e);
    r.bladeMat = stone;
    g.add(box(0.5, 0.42, 0.5, stone, 0, 0, 1.38));
    g.add(box(0.56, 0.08, 0.56, r.m(0x3a3a3a), 0, 0, 1.12));
    g.add(box(0.52, 0.1, 0.3, r.m(0x4a5a34), 0, 0.2, 1.4)); // moss
    put(1.65, 0.9);
  } else if (kind === 'daggers') {
    g.add(box(0.04, 0.04, 0.14, grip, 0, 0, 0));
    g.add(box(0.12, 0.04, 0.04, gold, 0, 0, 0.08));
    g.add(box(0.02, 0.06, 0.38, steel, 0, 0, 0.29));
    put(0.5, 0.12);
    const g2 = new THREE.Group(); r.j.handL.add(g2); r.wpnL = g2;
    g2.add(box(0.04, 0.04, 0.14, grip, 0, 0, 0));
    g2.add(box(0.12, 0.04, 0.04, gold, 0, 0, 0.08));
    g2.add(box(0.02, 0.06, 0.38, steel, 0, 0, 0.29));
    r.tipL = new THREE.Object3D(); r.tipL.position.z = 0.5; g2.add(r.tipL);
    r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.12; g2.add(r.baseL);
  } else if (kind === 'spear') {
    const shaft = box(0.04, 0.04, 2.3, grip, 0, 0, 0.45); g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), steel);
    head.rotation.x = Math.PI / 2; head.position.z = 1.72; g.add(head);
    g.add(box(0.07, 0.07, 0.06, r.m(0x7a2a1e), 0, 0, 1.52)); // binding below the head
    put(1.85, 1.0);
  } else if (kind === 'club') {
    g.add(box(0.07, 0.07, 0.5, grip, 0, 0, 0.1));
    const c = cyl(0.17, 0.09, 0.85, r.m(0x5a4030), 6); c.rotation.x = Math.PI / 2; c.position.z = 0.75; g.add(c);
    for (let i = 0; i < 4; i++) {
      const sp = box(0.05, 0.05, 0.05, steel, Math.cos(i * 1.57) * 0.17, Math.sin(i * 1.57) * 0.17, 0.95); g.add(sp);
    }
    put(1.15, 0.4);
  } else if (kind === 'bow') {
    const bg = new THREE.Group(); r.j.handL.add(bg);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 4, 10, Math.PI * 0.9), grip);
    bow.rotation.set(0, Math.PI / 2, Math.PI / 2 + Math.PI * 0.05);
    bow.position.z = -0.12; bg.add(bow);
    bg.position.z = 0.05;
    const arrow = box(0.02, 0.02, 0.7, r.m(0xa08a60), 0, 0, 0.25); hand.add(arrow);
    r.arrow = arrow;
    put(0.6, 0.1);
  }
}
