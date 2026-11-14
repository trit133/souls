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

// How a weapon feels in the hands (all of it visual): heft 0..1 shapes the swing's curve (anims.js sample: the
// wind-up hangs, the blade carries through the strike); fk / fd are the follow-through spring the upper body
// chases the pose with (softer = lags and overshoots more, the way a heavy blade drags the arms); grip is where the
// left hand holds the weapon (z along it from the right hand): always, through every swing (swing: true; the walk
// carries it one-handed), or only when a pose asks (grip: 1); lead is how
// much of the rig's lag the swing is sampled ahead by (a fast stab wants less than a slow sweep).
export const FEEL = {
  sword: { heft: 0.35, fk: 320, fd: 19, lead: 0.5, grip: { z: -0.15 } },
  greatsword: { heft: 0.8, fk: 220, fd: 14, lead: 0.42, grip: { z: -0.22, swing: true } },
  psystaff: { heft: 0.45, fk: 300, fd: 18, lead: 0.35, grip: { z: -0.45, always: true } },
  wristblade: { heft: 0.05, fk: 460, fd: 25, lead: 0.25 },
  daggers: { heft: 0.1, fk: 420, fd: 23, lead: 0.45 },
  spellknife: { heft: 0.1, fk: 420, fd: 23, lead: 0.45 },
  spear: { heft: 0.4, fk: 300, fd: 18, grip: { z: 0.55, always: true } },
  maul: { heft: 1, fk: 190, fd: 13, grip: { z: 0.45, swing: true } },
  club: { heft: 0.9, fk: 200, fd: 13 },
  rusty: { heft: 0.45, fk: 300, fd: 18 },
  axe: { heft: 0.7, fk: 240, fd: 15 },
  bow: { heft: 0.2, fk: 360, fd: 20 },
};
const FEEL_DEFAULT = { heft: 0.3, fk: 320, fd: 19 };
const LEAD = 0.45; // how much of that lag a swing is sampled ahead by, unless the weapon says (anim-strip.mjs times the swings)

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
    this.scalars = { by: 0, guard: 0, grip: 0 };
    this.feel = FEEL_DEFAULT; this.grip = null;
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

  // the weapon in hand: its weight in the swing, its spring, where the left hand grips it (FEEL)
  setFeel(kind) { const f = FEEL[kind] || FEEL_DEFAULT; this.feel = f; this.grip = f.grip || null; }

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
          f.v[i] += (this.feel.fk * (c[i] - f.p[i]) - this.feel.fd * f.v[i]) * h;
          f.p[i] += f.v[i] * h;
        }
        o.rotation.set(f.p[0], f.p[1], f.p[2]);
      } else o.rotation.set(c[0], c[1], c[2]);
    }
    for (const s in this.scalars) {
      let t = pose[s] ?? 0;
      if (s === 'grip') t = this.grip ? (this.grip.always ? 1 : Math.min(1, Math.max(0, t))) : 0;
      else if (s === 'guard') t = Math.min(1, Math.max(0, t));
      this.scalars[s] += (t - this.scalars[s]) * k;
    }
    this.body.position.y = this.hipH + this.scalars.by;
    this.gripW = 0;
    if (this.scalars.grip > 0.01) this.solveGrip(this.scalars.grip);
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

  // how far the drawn pose trails the one asked for, at pose damping `rate`: the damping's own lag plus the
  // follow-through spring's. A swing is sampled that much ahead so the blade is where the hit is when it lands.
  lead(rate) { return Math.min(0.12, (1 / rate + this.feel.fd / this.feel.fk) * (globalThis.__leadScale ?? this.feel.lead ?? LEAD)); }

  // Two hands on one weapon: the left arm is solved (two bones) so its hand closes on the grip point of the weapon
  // in the right hand, the elbow kept out and down, blended in by w (0..1). Visual only, like everything here.
  solveGrip(w) {
    const T = this.j.torso, arm = this.j.armL, fore = this.j.foreL, hand = this.j.handL, wpn = this.wpnR;
    if (!T || !arm || !fore || !wpn || !this.grip) return;
    wpn.updateWorldMatrix(true, false);
    const tgt = G1.set(0, 0, this.grip.z).applyMatrix4(wpn.matrixWorld);
    T.worldToLocal(tgt);                       // (the arm hangs from the torso)
    const S = arm.position, d = G2.subVectors(tgt, S), a = this.dims.upper, b = this.dims.fore + 0.04, reach = (a + b) * 0.995;
    // out of reach (a thrust that runs the right arm out, a wind-up far to the right): the hand lets go instead of
    // the arm straining after it, and the pose's own left arm shows through
    w *= Math.max(0, Math.min(1, 1 - (d.length() - reach - 0.03) / 0.22));
    this.gripW = w;
    if (w <= 0.001) return;
    const dist = Math.min(Math.max(d.length(), Math.abs(a - b) + 0.01), reach);
    d.normalize();
    // the elbow: off the shoulder-to-hand line toward the pole (out to the left, down, a little back)
    const pole = G3.set(0.5, -1, -0.35);
    pole.addScaledVector(d, -pole.dot(d));
    if (pole.lengthSq() < 1e-6) pole.set(1, 0, 0).addScaledVector(d, -d.x);
    pole.normalize();
    const ca = Math.min(1, Math.max(-1, (a * a + dist * dist - b * b) / (2 * a * dist))), sa = Math.sqrt(1 - ca * ca);
    const u = G4.copy(d).multiplyScalar(ca).addScaledVector(pole, sa);        // upper arm, shoulder to elbow
    const f = G5.copy(d).multiplyScalar(dist).addScaledVector(u, -a).normalize(); // forearm, elbow to hand
    // the upper arm: its -y onto u, then twisted about u so the elbow's hinge (local x) bends the forearm onto f
    const q = GQ1.setFromUnitVectors(DOWN, u);
    const z1 = G6.set(0, 0, 1).applyQuaternion(q), fp = G7.copy(f).addScaledVector(u, -f.dot(u)).normalize();
    const twist = Math.atan2(G8.crossVectors(z1, fp).dot(u), z1.dot(fp));
    q.premultiply(GQ2.setFromAxisAngle(u, twist));
    const bend = -Math.acos(Math.min(1, Math.max(-1, u.dot(f))));
    if (w >= 1) { arm.quaternion.copy(q); fore.rotation.set(bend, 0, 0); } else { arm.quaternion.slerp(q, w); fore.rotation.x += (bend - fore.rotation.x) * w; }
    // the hand turned the way the right hand holds it
    fore.updateWorldMatrix(true, false); this.j.handR.updateWorldMatrix(true, false);
    const qh = GQ3.setFromRotationMatrix(fore.matrixWorld).invert().multiply(GQ4.setFromRotationMatrix(this.j.handR.matrixWorld));
    if (w >= 1) hand.quaternion.copy(qh); else hand.quaternion.slerp(qh, w);
  }

  flash(r = 1, g = 1, b = 1) { this.flashT = 0.12; this.flashColor.setRGB(r, g, b); this._flashing = true; this.kick(1.4); }

  tipWorld(out) { return this.tip.getWorldPosition(out); }
}

const ZERO = [0, 0, 0];
const DOWN = new THREE.Vector3(0, -1, 0);
const G1 = new THREE.Vector3(), G2 = new THREE.Vector3(), G3 = new THREE.Vector3(), G4 = new THREE.Vector3(), G5 = new THREE.Vector3(), G6 = new THREE.Vector3(), G7 = new THREE.Vector3(), G8 = new THREE.Vector3();
const GQ1 = new THREE.Quaternion(), GQ2 = new THREE.Quaternion(), GQ3 = new THREE.Quaternion(), GQ4 = new THREE.Quaternion();
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

  r.setFeel(o.arm || o.weapon);
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
  if (kind === 'rusty') {
    // a zealot's chain-blade: a dark housing with a running line of red teeth, a pistol grip and a fuel cell
    const len = 0.85, house = r.m(0x2e2e32), teeth = r.m(0x8a1a12), steelD = r.m(0x6a6c72);
    g.add(box(0.05, 0.06, 0.2, grip, 0, 0, 0));
    g.add(box(0.1, 0.1, 0.16, house, 0, 0.02, 0.15)); g.add(box(0.06, 0.04, 0.08, r.m(0x8a6a1e), 0, 0.08, 0.15)); // motor and its hazard tab
    g.add(box(0.05, 0.11, len - 0.2, house, 0, 0, 0.23 + (len - 0.2) / 2));
    g.add(box(0.03, 0.03, len - 0.22, steelD, 0, 0.065, 0.23 + (len - 0.22) / 2));
    for (let i = 0; i < 7; i++) g.add(box(0.04, 0.035, 0.05, teeth, 0, -0.07, 0.28 + i * 0.085)); // the teeth
    put(len, 0.25);
  } else if (kind === 'sword') {
    // a resonance blade: steel with a glowing blue core line, a brass guard and a power-cell pommel
    const len = 1.05;
    g.add(box(0.05, 0.05, 0.22, grip, 0, 0, 0)); g.add(box(0.07, 0.07, 0.06, r.m(0x4a8ab0), 0, 0, -0.12));
    g.add(box(0.28, 0.06, 0.06, gold, 0, 0, 0.12)); g.add(box(0.1, 0.1, 0.05, gold, 0, 0, 0.12));
    g.add(box(0.03, 0.09, len - 0.15, steel, 0, 0, 0.12 + (len - 0.15) / 2));
    g.add(box(0.034, 0.025, len - 0.3, new THREE.MeshBasicMaterial({ color: 0x8ad8ff }), 0, 0, 0.2 + (len - 0.3) / 2));
    put(len, 0.25);
  } else if (kind === 'greatsword') {
    g.add(box(0.07, 0.07, 0.42, grip, 0, 0, -0.05));
    g.add(box(0.46, 0.08, 0.08, gold, 0, 0, 0.18));
    const bl = r.m(0x5a5a62, { emissive: 0x000000 });
    r.bladeMat = bl;
    g.add(box(0.05, 0.2, 1.75, bl, 0, 0, 0.18 + 0.88));
    g.add(box(0.06, 0.05, 1.5, r.m(0x2a2a30), 0, 0, 1.0)); // fuller
    // a relic blade: reliquary housing at the cross, a skull pommel, chained purity seal
    g.add(box(0.16, 0.16, 0.14, r.m(0x3a3a40), 0, 0, 0.3)); g.add(box(0.06, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: 0xff7a2a }), 0, 0.09, 0.3));
    g.add(box(0.1, 0.1, 0.1, r.m(0xbab09a), 0, 0, -0.3));
    g.add(box(0.06, 0.06, 0.04, r.m(0x8a1a12), 0.06, -0.08, 0.22)); g.add(box(0.03, 0.16, 0.01, r.m(0xc8bca0), 0.06, -0.18, 0.22));
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
    // a chain-axe: a row of red teeth round the edge, a motor housing on the haft
    for (let i = 0; i < 6; i++) g.add(box(0.06, 0.05, 0.05, r.m(0x8a1a12), 0, 0.56, 1.1 + i * 0.07));
    g.add(box(0.12, 0.14, 0.2, r.m(0x2e2e32), 0, 0, 0.95)); g.add(box(0.06, 0.06, 0.06, r.m(0x8a6a1e), 0, 0.09, 0.95));
    put(1.6, 0.9);
  } else if (kind === 'maul') {
    // great stone maul
    g.add(box(0.08, 0.08, 1.7, grip, 0, 0, 0.5));
    // an industrial piston maul: an iron block head with a glowing slag core and banded ends
    const stone = r.m(0x4a4846);
    r.bladeMat = stone;
    g.add(box(0.5, 0.42, 0.5, stone, 0, 0, 1.38));
    g.add(box(0.56, 0.08, 0.56, r.m(0x2a2a2a), 0, 0, 1.12)); g.add(box(0.56, 0.08, 0.56, r.m(0x2a2a2a), 0, 0, 1.64));
    g.add(box(0.52, 0.12, 0.3, new THREE.MeshBasicMaterial({ color: 0xff6a1a }), 0, 0, 1.38)); // the slag core showing through
    for (const s of [-1, 1]) g.add(box(0.08, 0.5, 0.08, r.m(0x6a6c72), s * 0.2, 0, 0.9));
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
    // a shock-pike: a dark haft with grip bands, a power coil below a forked head whose prongs glow blue
    const shaft = box(0.045, 0.045, 2.3, r.m(0x26262a), 0, 0, 0.45); g.add(shaft);
    for (const z of [-0.2, 0.1, 0.4]) g.add(box(0.06, 0.06, 0.08, r.m(0x5a1414), 0, 0, z));
    for (let i = 0; i < 3; i++) g.add(box(0.09, 0.09, 0.03, r.m(0x8a5a2a), 0, 0, 1.4 + i * 0.05)); // the coil
    g.add(box(0.11, 0.05, 0.14, r.m(0x3a3a40), 0, 0, 1.56));
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), steel);
    head.rotation.x = Math.PI / 2; head.position.z = 1.72; g.add(head);
    const arc = new THREE.MeshBasicMaterial({ color: 0x8ad8ff });
    for (const s of [-1, 1]) { g.add(box(0.025, 0.025, 0.2, steel, s * 0.07, 0, 1.68)); g.add(box(0.03, 0.03, 0.05, arc, s * 0.07, 0, 1.79)); }
    put(1.85, 1.0);
  } else if (kind === 'club') {
    // a servitor's piston hammer: a hydraulic ram on a heavy haft, a hazard-striped head and exhaust ports
    g.add(box(0.08, 0.08, 0.5, r.m(0x26262a), 0, 0, 0.1));
    const c = cyl(0.12, 0.1, 0.7, r.m(0x4a4a50), 6); c.rotation.x = Math.PI / 2; c.position.z = 0.6; g.add(c);
    g.add(box(0.36, 0.3, 0.3, r.m(0x3a3a40), 0, 0, 0.98));
    g.add(box(0.38, 0.08, 0.32, r.m(0x9a7a1e), 0, 0.05, 0.98));
    for (let i = 0; i < 4; i++) {
      const sp = box(0.05, 0.05, 0.05, r.m(0xff6a2a, { emissive: 0x6a1a00 }), Math.cos(i * 1.57) * 0.17, Math.sin(i * 1.57) * 0.17, 0.85); g.add(sp);
    }
    put(1.15, 0.4);
  } else if (kind === 'bow') {
    // a needle rifle held out in the off hand (it stands where the bow stood): a long dark receiver, a scope, a
    // magazine and a glowing muzzle; the "arrow" in the right hand is a glowing needle round being chambered
    const bg = new THREE.Group(); r.j.handL.add(bg);
    const body = r.m(0x2a2a2e), metalD = r.m(0x55565c);
    bg.add(box(0.06, 0.95, 0.09, body, 0, 0.05, -0.1));
    bg.add(box(0.03, 0.4, 0.03, metalD, 0, 0.62, -0.1)); // barrel
    bg.add(box(0.05, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0x9ad06a }), 0, 0.84, -0.1)); // muzzle glow
    bg.add(box(0.05, 0.2, 0.05, metalD, 0, 0.25, -0.18)); // scope
    bg.add(box(0.05, 0.08, 0.1, body, 0, -0.1, 0.0)); // magazine
    bg.add(box(0.07, 0.25, 0.12, r.m(0x3a3228), 0, -0.45, -0.1)); // stock
    bg.position.z = 0.05;
    const arrow = box(0.02, 0.02, 0.7, new THREE.MeshBasicMaterial({ color: 0x9ad06a }), 0, 0, 0.25); hand.add(arrow);
    r.arrow = arrow;
    put(0.6, 0.1);
  }
}
