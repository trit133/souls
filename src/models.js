import * as THREE from 'three';

// Low-poly procedural humanoids. Every model faces +Z; the character's right
// side is -X. Joint rotations (radians, Euler XYZ):
//   arm/leg .x negative  -> swing forward      torso .x positive -> lean forward
//   arm .z (right arm) negative -> raise outward     shin .x positive -> bend knee
//   torso/hips .y positive -> twist toward character's left (+X)

export const JOINTS = ['hips', 'torso', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'legR', 'shinR'];

function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

function cyl(rt, rb, h, material, seg = 6) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
}

export class Rig {
  constructor() {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.j = {};
    this.cur = {};
    this.materials = [];
    this.scalars = { by: 0, guard: 0 };
    this.tip = new THREE.Object3D();
    this.base = new THREE.Object3D();
    this.tipL = null; this.baseL = null;
    this.shield = null;
    this.flashT = 0;
    this.flashColor = new THREE.Color(1, 1, 1);
  }

  m(color, opts) { const x = mat(color, opts); this.materials.push(x); return x; }

  // Damp every joint toward the target pose. `rate` is ~1/time-constant.
  apply(pose, dt, rate = 14) {
    const k = 1 - Math.exp(-rate * dt);
    for (const name of JOINTS) {
      const t = pose[name] || ZERO;
      const c = this.cur[name] || (this.cur[name] = [0, 0, 0]);
      if (pose.snap && pose.snap[name]) { c[0] = t[0]; c[1] = t[1]; c[2] = t[2]; }
      else { c[0] += (t[0] - c[0]) * k; c[1] += (t[1] - c[1]) * k; c[2] += (t[2] - c[2]) * k; }
      if (c[0] > Math.PI) c[0] -= Math.PI * 2; // rolls spin the hips a full turn
      const o = this.j[name];
      if (o) o.rotation.set(c[0], c[1], c[2]);
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
  }

  flash(r = 1, g = 1, b = 1) { this.flashT = 0.12; this.flashColor.setRGB(r, g, b); this._flashing = true; }

  tipWorld(out) { return this.tip.getWorldPosition(out); }
}

const ZERO = [0, 0, 0];
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Build a humanoid.
 * opts: scale, skin, cloth, armor, accent, head: 'helm'|'hood'|'horned'|'bare'|'cap',
 *       weapon: 'sword'|'daggers'|'greatsword'|'spear'|'club'|'bow'|'rusty', shield, eyes
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

  const hipH = 0.95; r.hipH = hipH;
  const thigh = 0.48, shin = 0.47, torsoH = 0.68, upper = 0.36, fore = 0.34;
  const hw = 0.13 * bulk, sw = 0.27 * bulk;

  r.root.scale.setScalar(S);
  const hips = new THREE.Group(); r.body.add(hips); r.j.hips = hips;
  hips.add(box(0.36 * bulk, 0.2, 0.22 * bulk, cloth, 0, 0.02, 0));

  for (const side of [1, -1]) {
    const leg = new THREE.Group(); leg.position.set(hw * side, -0.04, 0); hips.add(leg);
    leg.add(box(0.15 * bulk, thigh, 0.17 * bulk, cloth, 0, -thigh / 2, 0));
    const sh = new THREE.Group(); sh.position.y = -thigh; leg.add(sh);
    sh.add(box(0.13 * bulk, shin, 0.15 * bulk, armor, 0, -shin / 2, 0));
    sh.add(box(0.15 * bulk, 0.08, 0.26 * bulk, dark, 0, -shin + 0.0, 0.05));
    r.j[side > 0 ? 'legL' : 'legR'] = leg;
    r.j[side > 0 ? 'shinL' : 'shinR'] = sh;
  }

  const torso = new THREE.Group(); hips.add(torso); r.j.torso = torso;
  torso.add(box(0.34 * bulk, 0.3, 0.21 * bulk, cloth, 0, 0.17, 0));
  torso.add(box(0.46 * bulk, 0.36, 0.27 * bulk, armor, 0, 0.48, 0));
  if (o.tabard) torso.add(box(0.3 * bulk, 0.62, 0.02, accent, 0, 0.18, 0.15 * bulk));
  if (o.pauldrons) {
    for (const s of [1, -1]) {
      const p = box(0.2 * bulk, 0.12, 0.26 * bulk, armor, s * sw, torsoH - 0.02, 0);
      p.rotation.z = -s * 0.25; torso.add(p);
    }
  }
  if (o.cape) {
    const cape = box(0.44 * bulk, 0.95, 0.03, accent, 0, 0.1, -0.15 * bulk);
    cape.rotation.x = 0.12; torso.add(cape); r.cape = cape;
  }

  const head = new THREE.Group(); head.position.y = torsoH + 0.02; torso.add(head); r.j.head = head;
  const ht = o.head || 'bare';
  head.add(box(0.1, 0.08, 0.1, skin, 0, 0.03, 0));
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
  } else if (ht === 'cap') {
    head.add(box(0.24, 0.26, 0.25, skin, 0, 0.17, 0));
    const cap = cyl(0.03, 0.18, 0.18, armor, 6); cap.position.y = 0.36; head.add(cap);
  } else {
    head.add(box(0.24, 0.27, 0.25, skin, 0, 0.17, 0));
  }
  if (o.eyes) {
    const em = new THREE.MeshBasicMaterial({ color: o.eyes });
    for (const s of [1, -1]) head.add(box(0.045, 0.03, 0.02, em, s * 0.06, 0.2, 0.15));
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

  attachWeapon(r, o.weapon, o);
  if (o.shield) {
    const sh = new THREE.Group();
    const face = r.m(0x5d6a7c);
    sh.add(box(0.5, 0.66, 0.06, face));
    sh.add(box(0.12, 0.66, 0.08, r.m(0xb89a4a)));
    sh.add(box(0.5, 0.1, 0.08, r.m(0xb89a4a), 0, 0.08, 0));
    const pt = box(0.36, 0.2, 0.06, face, 0, -0.38, 0); pt.scale.x = 0.7; sh.add(pt);
    torso.add(sh); r.shield = sh;
  }

  // blob shadow (stays on the ground; lives under root, not body)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42 * bulk, 16), SHADOW_MAT);
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; r.root.add(shadow);
  r.shadow = shadow;
  return r;
}

export const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });

function attachWeapon(r, kind, o) {
  const hand = r.j.handR;
  const g = new THREE.Group(); hand.add(g);
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
    put(len, 0.25);
  } else if (kind === 'greatsword') {
    g.add(box(0.07, 0.07, 0.42, grip, 0, 0, -0.05));
    g.add(box(0.46, 0.08, 0.08, gold, 0, 0, 0.18));
    const bl = r.m(0x5a5a62, { emissive: 0x000000 });
    r.bladeMat = bl;
    g.add(box(0.05, 0.2, 1.75, bl, 0, 0, 0.18 + 0.88));
    put(2.0, 0.4);
  } else if (kind === 'daggers') {
    g.add(box(0.04, 0.04, 0.14, grip, 0, 0, 0));
    g.add(box(0.12, 0.04, 0.04, gold, 0, 0, 0.08));
    g.add(box(0.02, 0.06, 0.38, steel, 0, 0, 0.29));
    put(0.5, 0.12);
    const g2 = new THREE.Group(); r.j.handL.add(g2);
    g2.add(box(0.04, 0.04, 0.14, grip, 0, 0, 0));
    g2.add(box(0.12, 0.04, 0.04, gold, 0, 0, 0.08));
    g2.add(box(0.02, 0.06, 0.38, steel, 0, 0, 0.29));
    r.tipL = new THREE.Object3D(); r.tipL.position.z = 0.5; g2.add(r.tipL);
    r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.12; g2.add(r.baseL);
  } else if (kind === 'spear') {
    const shaft = box(0.04, 0.04, 2.3, grip, 0, 0, 0.45); g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), steel);
    head.rotation.x = Math.PI / 2; head.position.z = 1.72; g.add(head);
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
