// Varek's crowd (modules.js FINAL_MODULES.throne): stone stands round his arena, packed with the March's own (the
// enemy types of region one, in their colours and sizes), cheering him on. Visual only: they can't be hit, never come
// down and never get in the way.
//
// They're drawn as instances (a few meshes for the lot: legs, torso, head, glowing eyes, arms, weapons), each figure's
// pieces posed every frame, so a hundred and more cost little. What they do follows the fight (polled, so the boss's
// own code is untouched; every screen in a party sees the same):
//   - before it starts: a low murmur, the odd fist raised;
//   - while he fights: swaying, weapons waving, bursts of cheering;
//   - he lands a hit on you: a roar, arms up, jumping;
//   - he's staggered (parried, riposted, broken, held): quiet, and they bang their weapons in time on the stands;
//   - his second phase: the stands erupt;
//   - he dies: they fall silent, arms down, heads bowed, and stay that way.
import * as THREE from 'three';
import { wallTex } from './ground.js';
import { TYPES } from './enemies.js';

const PI = Math.PI;
const vh = (x, z, k = 0) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
// who's in the stands (region one's enemies), how many of each
const MIX = [['grunt', 5], ['spear', 3], ['archer', 3], ['wretch', 4], ['hook', 2], ['torcher', 2], ['flagellant', 4], ['castellan', 2], ['augur', 1.5], ['brute', 0.6], ['hulk', 0.5], ['bellwarden', 0.4]];
const STAGGERED = new Set(['parried', 'riposted', 'broken', 'held', 'stagger', 'frozen']);

// the stands, round an arena at (cx, cz) of radius r (angles as decor.js: x = cx + cos a·R, z = cz − sin a·R; north
// is a = π/2). The far side (north, east and west) climbs in four tiers to a back wall, with a gap for the throne; the
// near side (toward the camera) is one low tier either side of the way in, so it never hides the fight
export function buildStands(w, cx, cz, r, enc) {
  const M = w.mats;
  const stone = wallTex(new THREE.MeshLambertMaterial({ color: 0x5a5650, flatShading: true }), 'stone');
  const seat = wallTex(new THREE.MeshLambertMaterial({ color: 0x46423e, flatShading: true }), 'stone', 1.5);
  const gold = new THREE.MeshLambertMaterial({ color: 0x8a6a2a, flatShading: true });
  const P = (a, R) => ({ x: cx + Math.cos(a) * R, z: cz - Math.sin(a) * R });
  const ryOf = (a) => Math.atan2(Math.cos(a), -Math.sin(a)); // (a box's local z along the radius)
  const seg = (a, R, wd, h, dp, mat, y0 = 0) => { const p = P(a, R); const b = w.box(wd, h, dp, mat, p.x, y0 + h / 2, p.z, ryOf(a)); b.userData.noSettle = true; return b; };
  const N0 = -0.45, N1 = PI + 0.45, GAP = 0.2, IN = 0.22; // the far side's span, the throne's gap, the way in
  const spots = [];
  // the parapet round the floor (a gap for the way in and for the throne)
  for (let a = 0; a < 2 * PI; a += 0.06) {
    if (Math.abs(a - 1.5 * PI) < IN || Math.abs(a - PI / 2) < 0.12) continue;
    seg(a + 0.03, r + 1.05, 0.06 * (r + 1.05) + 0.06, 1.1, 0.5, stone);
    if (Math.round(a / 0.06) % 6 === 0) seg(a + 0.03, r + 1.05, 0.7, 1.35, 0.7, M.stoneDark);
  }
  // the far side: four tiers and a back wall
  const tier = (k) => ({ R0: r + 1.6 + k * 1.7, h: 1.5 + k * 1.0 });
  for (let k = 0; k < 4; k++) {
    const { R0, h } = tier(k), Rm = R0 + 0.85, da = 1.9 / Rm;
    for (let a = N0; a < N1; a += da) {
      const am = a + da / 2;
      if (Math.abs(am - PI / 2) < GAP + (k > 1 ? 0.04 : 0)) continue;
      seg(am, Rm, da * (R0 + 1.7) + 0.08, h, 1.7, k % 2 ? seat : stone);
      seg(am, R0 + 0.12, da * R0 + 0.08, 0.1, 0.26, M.stoneDark, h); // (a lip along the front of each)
      if (k < 3) spots.push({ a: am, R: Rm, y: h, k });
    }
  }
  const back = r + 1.6 + 4 * 1.7 + 0.4;
  for (let a = N0; a < N1; a += 0.08) {
    if (Math.abs(a + 0.04 - PI / 2) < GAP + 0.06) continue;
    seg(a + 0.04, back, 0.08 * back + 0.1, 6.4, 0.8, stone);
  }
  // buttresses and standards along the back wall, braziers on the top tier that light when he ignites
  for (let a = N0 + 0.12; a < N1; a += 0.34) {
    if (Math.abs(a - PI / 2) < GAP + 0.1) continue;
    seg(a, back + 0.5, 1.1, 7.2, 1.2, M.stoneDark);
    const p = P(a, back - 0.6); w.banner(p.x, p.z, true);
  }
  for (const a of [0.05, 0.75, 1.2, 1.95, 2.4, PI - 0.05]) {
    const p = P(a, tier(3).R0 + 0.9), y = tier(3).h, n0 = w.cur.group.children.length, f0 = w.fires.length, l0 = w.lights.length;
    w.brazier(p.x, p.z, { cond: () => enc.active && enc.boss?.ignited, power: 10, scale: 1 });
    for (let i = n0; i < w.cur.group.children.length; i++) { w.cur.group.children[i].position.y += y; w.cur.group.children[i].userData.noSettle = true; }
    for (let i = f0; i < w.fires.length; i++) w.fires[i].y += y;
    for (let i = l0; i < w.lights.length; i++) w.lights[i].y += y;
  }
  w.obstacles.splice(w.obstacles.length - 6, 6); // (braziers up in the stands: nothing to bump into)
  // the near side: one low tier either side of the way in
  for (const [a0, a1] of [[N1, 1.5 * PI - IN - 0.08], [1.5 * PI + IN + 0.08, 2 * PI + N0]]) {
    const R0 = r + 1.6, Rm = R0 + 0.85, da = 1.9 / Rm;
    for (let a = a0; a < a1; a += da) {
      const am = a + da / 2;
      seg(am, Rm, da * (R0 + 1.7) + 0.08, 1.2, 1.7, stone);
      spots.push({ a: am, R: Rm, y: 1.2, k: 0, near: true });
    }
  }
  // gold caps on the back wall's buttresses
  for (let a = N0 + 0.12; a < N1; a += 0.34) if (Math.abs(a - PI / 2) >= GAP + 0.1) seg(a, back + 0.5, 1.2, 0.15, 1.3, gold, 7.2);

  const crowd = new Crowd(w, enc, cx, cz, spots, P);
  w.crowd = crowd.figs; w.crowdObj = crowd;
  w.ambient.push({ x: cx, z: cz, update: (dt, t) => crowd.update(dt, t) });
  return crowd;
}

class Crowd {
  constructor(w, enc, cx, cz, spots, P) {
    this.enc = enc; this.A = 0.25; this.roarT = 0; this.eruptT = 0; this.hush = 0; this.silent = false; this.cheerT = 3;
    this.lastHp = null; this.wasStag = false; this.wasP2 = false; this.beat = 0;
    const total = MIX.reduce((s, m) => s + m[1], 0);
    const pick = (u) => { for (const [k, n] of MIX) { if ((u -= n / total) <= 0) return k; } return 'grunt'; };
    this.figs = [];
    for (const s of spots) {
      // a figure or two per seat (the near side thinner), jostled a little
      const per = s.near ? 1 : 2;
      for (let j = 0; j < per; j++) {
        const a = s.a + (j - (per - 1) / 2) * (0.95 / s.R) + (vh(s.a, s.R, j) - 0.5) * 0.12 / s.R;
        if (vh(a, s.R, 7) < (s.near ? 0.3 : 0.14)) continue; // (an empty place)
        const type = pick(vh(a, s.R, 3)), T = TYPES[type];
        if (!T) continue;
        const big = !!T.heavy || type === 'brute';
        if (big && s.k === 0 && !s.near) continue; // (the big ones stand at the back)
        const m = T.model || {}, p = P(a, s.R + (vh(a, s.R, 4) - 0.5) * 0.4);
        const skin = new THREE.Color(m.skin ?? 0x7a6e66), cloth = new THREE.Color(m.cloth ?? 0x3a3430), armor = new THREE.Color(m.armor ?? 0x3a3632);
        this.figs.push({
          type, x: p.x, z: p.z, y: s.y, yaw: Math.atan2(cx - p.x, cz - p.z),
          s: Math.min(1.5, (T.scale || 1) * (big ? 0.95 : 1)) * (0.92 + vh(a, s.R, 5) * 0.16), wide: big ? 1.25 : 1,
          ph: vh(a, s.R, 6) * PI * 2, om: 4.5 + vh(a, s.R, 8) * 3, thr: vh(a, s.R, 9), both: vh(a, s.R, 10) < 0.3, armed: vh(a, s.R, 11) < 0.75,
          cloth, armor, head: m.head === 'bare' ? skin : armor, arm: m.head === 'bare' && vh(a, s.R, 12) < 0.5 ? skin : armor, eyes: new THREE.Color(m.eyes ?? 0xff4020),
        });
      }
    }
    const n = this.figs.length, lam = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const mk = (geo, count, mat = lam) => { const im = new THREE.InstancedMesh(geo, mat, count); im.userData.noMerge = true; im.userData.noSettle = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); w.add(im); return im; };
    this.legs = mk(new THREE.BoxGeometry(0.17, 0.78, 0.2).translate(0, 0.39, 0), n * 2);
    this.torso = mk(new THREE.BoxGeometry(0.48, 0.62, 0.3).translate(0, 0.31, 0), n);
    this.head = mk(new THREE.BoxGeometry(0.27, 0.28, 0.27).translate(0, 0.14, 0), n);
    this.eyes = mk(new THREE.BoxGeometry(0.17, 0.045, 0.02).translate(0, 0.16, 0.14), n, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.arms = mk(new THREE.BoxGeometry(0.13, 0.6, 0.13).translate(0, -0.28, 0), n * 2);
    this.weps = mk(new THREE.BoxGeometry(0.06, 0.95, 0.06).translate(0, -0.45, 0), n);
    this.figs.forEach((f, i) => {
      this.legs.setColorAt(i * 2, f.cloth); this.legs.setColorAt(i * 2 + 1, f.cloth);
      this.torso.setColorAt(i, f.cloth); this.head.setColorAt(i, f.head); this.eyes.setColorAt(i, f.eyes);
      this.arms.setColorAt(i * 2, f.arm); this.arms.setColorAt(i * 2 + 1, f.arm); this.weps.setColorAt(i, new THREE.Color(0x4a4a50));
    });
    this.m = { F: new THREE.Matrix4(), A: new THREE.Matrix4(), B: new THREE.Matrix4(), T: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), s: new THREE.Vector3(), zero: new THREE.Matrix4().makeScale(0, 0, 0), TO: new THREE.Matrix4(), AR: new THREE.Matrix4() };
    this.pose(0);
  }

  // what the fight's doing, and how the stands take it
  update(dt, t) {
    const enc = this.enc, B = enc.boss, game = B?.game, p = game?.player, audio = game?.audio;
    if (!this.silent && B && (enc.defeated || !B.alive)) { this.silent = true; this.hush = 0; this.roarT = 0; this.eruptT = 0; }
    if (!this.silent && enc.active && B) {
      // he hits you: a roar
      if (p && this.lastHp != null && p.hp < this.lastHp - 0.5) { if (this.roarT < 0.6) audio?.play('crowdRoar', 0.9); this.roarT = 1.5; }
      // he's staggered: quiet, weapons banging in time
      const stag = STAGGERED.has(B.state);
      if (stag && !this.wasStag) { this.hush = 2.6; this.beat = 0; }
      this.wasStag = stag;
      // his second phase: the stands erupt
      if (B.phase2 && !this.wasP2) { this.eruptT = 3.2; this.hush = 0; audio?.play('crowdRoar', 1.3); setTimeout(() => audio?.play('crowdRoar', 1.0), 700); }
      this.wasP2 = !!B.phase2;
      // and in between, a cheer now and then
      if ((this.cheerT -= dt) <= 0) { this.cheerT = 4 + Math.random() * 5; if (this.hush <= 0) audio?.play('crowdCheer', 0.6); }
    }
    if (p) this.lastHp = p.hp;
    this.roarT = Math.max(0, this.roarT - dt); this.eruptT = Math.max(0, this.eruptT - dt);
    if (this.hush > 0) {
      this.hush -= dt;
      const b = Math.floor(t * 7.5 / (2 * PI) + 0.25); // (a thud on each downbeat)
      if (b !== this.beat) { this.beat = b; audio?.play('crowdThud', 0.7); }
    }
    const want = this.silent ? 0 : !enc.active ? 0.25 : this.eruptT > 0 ? 1.25 : this.roarT > 0 ? 1.1 : this.hush > 0 ? 0.15 : 0.55;
    this.A += (want - this.A) * Math.min(1, dt * (want > this.A ? 6 : 2));
    this.pose(t);
  }

  // every figure's pieces for this moment
  pose(t) {
    const { F, A, T, TO, AR, q, e, v, s, zero } = this.m, Am = this.A, hush = this.hush > 0, silent = this.silent;
    const set = (im, i, M) => im.setMatrixAt(i, M);
    const frame = (M, x, y, z, rx, ry, rz) => M.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s.set(1, 1, 1));
    this.figs.forEach((f, i) => {
      const w = t * f.om + f.ph, still = silent ? 0 : 1;
      const bob = Math.sin(w) * 0.025 * (0.4 + Am) * still;
      const jump = Am > 0.85 && !hush ? Math.max(0, Math.sin(w * 1.2)) * 0.22 * Math.min(1, (Am - 0.8) * 2.5) : 0;
      const lean = silent ? 0.12 : hush ? 0.08 : -0.05 * Am + Math.sin(w * 0.5) * 0.04;
      F.compose(v.set(f.x, f.y + bob + jump, f.z), q.setFromEuler(e.set(0, f.yaw, Math.sin(w * 0.37) * 0.04 * still)), s.set(f.s * f.wide, f.s, f.s * f.wide));
      // legs
      for (const k of [0, 1]) { frame(T, (k ? 0.1 : -0.1), 0, 0, 0, 0, 0); set(this.legs, i * 2 + k, A.multiplyMatrices(F, T)); }
      // torso (leaning in to see), head (bowed when he's dead), eyes
      frame(T, 0, 0.78, 0, lean, 0, 0); const torso = TO.multiplyMatrices(F, T); set(this.torso, i, torso);
      frame(T, 0, 0.64, 0, silent ? 0.45 : -0.1 * Am + Math.sin(w * 0.8) * 0.05, Math.sin(w * 0.3 + f.ph) * 0.25 * still, 0); A.multiplyMatrices(torso, T);
      set(this.head, i, A); set(this.eyes, i, A);
      // arms: up and pumping with the mood; a weapon in the right hand, banged on the stands while he's staggered
      const raise = silent ? 0 : Math.max(0, Math.min(1, (Am - f.thr * 0.8) * 2.2 + 0.35 * Math.sin(w * 0.23 + f.ph * 2)));
      const pump = Math.sin(w * 1.4);
      let thR = -0.12 + (-2.55 - 0.35 * pump + 0.12) * raise, thL = f.both ? -0.1 + (-2.5 - 0.35 * Math.sin(w * 1.4 + 1.3) + 0.1) * raise : -0.1 + (-1.0 + 0.2 * pump) * raise * 0.6;
      if (hush) { const b = Math.max(0, Math.sin(t * 7.5)); thR = -1.9 + 1.5 * b * b; thL = -0.15; }
      if (silent) { thR = -0.04; thL = -0.04; }
      frame(T, 0.31, 0.56, 0, thR, 0, -0.18 * raise); const armR = AR.multiplyMatrices(torso, T); set(this.arms, i * 2, armR);
      frame(T, -0.31, 0.56, 0, thL, 0, 0.18 * raise * (f.both ? 1 : 0.4)); set(this.arms, i * 2 + 1, A.multiplyMatrices(torso, T));
      if (f.armed) { frame(T, 0, -0.56, 0, -0.35, 0, 0); set(this.weps, i, A.multiplyMatrices(armR, T)); } else set(this.weps, i, zero);
    });
    for (const im of [this.legs, this.torso, this.head, this.eyes, this.arms, this.weps]) im.instanceMatrix.needsUpdate = true;
  }
}
