import * as THREE from 'three';
import { Actor, angDiff } from './actor.js';
import { buildHumanoid } from './models.js';
import { locomotion, P } from './anims.js';
import { Trail } from './fx.js';

let UID = 1;

const glint = (red) => (e, g) => {
  const p = e.rig.tip.getWorldPosition(new THREE.Vector3());
  g.fx.burst(p, red ? 14 : 8, red ? [1, 0.15, 0.1] : [1, 1, 0.85], 2.5, 0.35, red ? 0.5 : 0.35);
  if (red) g.audio.play('clang', 0.25);
};

// ---------- move sets ----------
const SWORD_WIND = { torso: [0.05, -0.6, 0], armR: [-2.5, 0, -0.75], foreR: [-0.35, 0, 0], handR: [1.1, 0, 0], legL: [-0.25, 0, 0], legR: [0.2, 0, 0] };
const SWORD_STRIKE = { torso: [0.3, 0.6, 0], armR: [-1.05, 0, 0.8], foreR: [-0.1, 0, 0], handR: [1.25, 0, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], shinR: [0.4, 0, 0], by: -0.1 };
const BACK_WIND = { torso: [0.15, 0.75, 0], armR: [-1.45, 0, 1.05], foreR: [-0.25, 0, 0], handR: [1.4, 0, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0] };
const BACK_STRIKE = { torso: [0.22, -0.65, 0], armR: [-1.45, 0, -1.25], foreR: [0, 0, 0], handR: [1.45, 0, 0], legL: [0.3, 0, 0], legR: [-0.45, 0, 0], by: -0.1 };
const OVER_WIND = { torso: [-0.25, -0.1, 0], armR: [-3.0, 0, -0.2], foreR: [-0.6, 0, 0], handR: [1.0, 0, 0], armL: [-2.4, 0, 0.3], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.2 };
const OVER_STRIKE = { torso: [0.6, 0, 0], armR: [-0.95, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.0, 0, 0.1], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], shinL: [0.45, 0, 0], shinR: [0.5, 0, 0], by: -0.28 };

const GRUNT_MOVES = {
  slash: {
    dur: 1.25, range: 2.0, track: [0.5, 5], sfx: [0.55, 'swing'], trail: [0.54, 0.7], recover: 0.35,
    keys: [[0.5, SWORD_WIND], [0.66, SWORD_STRIKE], [0.95, SWORD_STRIKE]],
    hits: [{ t0: 0.57, t1: 0.68, range: 2.1, arc: 2.2, dmg: 18, poise: 20 }],
    move: [[0.42, 0.66, 0.9]], stopAt: 1.0,
  },
  double: {
    dur: 1.7, range: 2.0, track: [0.5, 5], sfx: [0.52, 'swing'], trail: [0.52, 1.02], recover: 0.4,
    keys: [[0.48, SWORD_WIND], [0.63, SWORD_STRIKE], [0.86, BACK_WIND], [1.0, BACK_STRIKE], [1.3, BACK_STRIKE]],
    hits: [{ t0: 0.54, t1: 0.65, range: 2.1, arc: 2.2, dmg: 16, poise: 18 }, { t0: 0.9, t1: 1.01, range: 2.1, arc: 2.4, dmg: 16, poise: 18 }],
    move: [[0.4, 0.63, 0.8], [0.8, 0.98, 0.7]], stopAt: 1.0,
    onTime: [{ t: 0.8, fn: (e, g) => { if (e.target) e.yaw += angDiff(e.yaw, e.yawTo(e.target.pos)) * 0.6; } }],
  },
  leap: {
    dur: 1.55, range: 5.5, minRange: 3.2, track: [0.62, 4], sfx: [0.62, 'heavySwing'], trail: [0.7, 0.92], recover: 0.5,
    keys: [[0.55, OVER_WIND], [0.8, { ...OVER_WIND, by: 0.25, legL: [-0.8, 0, 0], shinL: [1.0, 0, 0] }], [0.9, OVER_STRIKE], [1.25, OVER_STRIKE]],
    hits: [{ t0: 0.84, t1: 0.94, range: 2.1, arc: 1.4, dmg: 24, poise: 30 }],
    move: [[0.6, 0.88, 3.8]], stopAt: 1.1,
    onTime: [{ t: 0.9, fn: (e, g) => g.fx.dust(e.pos, 6, 1.2) }],
  },
};

const SPEAR_WIND = { torso: [0.1, -0.45, 0], armR: [0.4, 0, -0.3], foreR: [-1.6, 0, 0], handR: [1.25, 0, 0], armL: [-0.8, 0, 0.1], foreL: [-0.6, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0], shinR: [0.4, 0, 0], by: -0.1 };
const SPEAR_STRIKE = { torso: [0.35, 0.25, 0], armR: [-1.5, 0, 0], foreR: [0, 0, 0], handR: [1.45, 0, 0], armL: [-1.2, 0, 0], legL: [-0.7, 0, 0], legR: [0.55, 0, 0], shinR: [0.5, 0, 0], by: -0.18 };

const SPEAR_MOVES = {
  thrust: {
    dur: 1.15, range: 3.3, track: [0.48, 4.5], sfx: [0.5, 'swing'], trail: [0.5, 0.66], recover: 0.35,
    keys: [[0.5, SPEAR_WIND], [0.62, SPEAR_STRIKE], [0.9, SPEAR_STRIKE]],
    hits: [{ t0: 0.54, t1: 0.66, range: 3.4, arc: 0.6, dmg: 17, poise: 18 }],
    move: [[0.45, 0.62, 0.7]], stopAt: 2.0,
  },
  double: {
    dur: 1.6, range: 3.3, track: [0.48, 4.5], sfx: [0.5, 'swing'], trail: [0.5, 1.02], recover: 0.4,
    keys: [[0.48, SPEAR_WIND], [0.6, SPEAR_STRIKE], [0.82, SPEAR_WIND], [0.96, SPEAR_STRIKE], [1.25, SPEAR_STRIKE]],
    hits: [{ t0: 0.52, t1: 0.63, range: 3.4, arc: 0.6, dmg: 14, poise: 16 }, { t0: 0.88, t1: 0.99, range: 3.5, arc: 0.6, dmg: 16, poise: 16 }],
    move: [[0.45, 0.6, 0.5], [0.85, 0.96, 0.6]], stopAt: 2.0,
    onTime: [{ t: 0.75, fn: (e) => { if (e.target) e.yaw += angDiff(e.yaw, e.yawTo(e.target.pos)) * 0.7; } }],
  },
  sweep: {
    dur: 1.1, range: 2.2, maxRange: 2.2, track: [0.4, 6], sfx: [0.42, 'swing'], trail: [0.42, 0.58], recover: 0.3,
    keys: [[0.4, { torso: [0.2, -0.9, 0], armR: [-1.3, 0, -1.3], foreR: [0, 0, 0], handR: [1.5, 0, 0], by: -0.2, legL: [-0.4, 0, 0], legR: [0.4, 0, 0] }],
      [0.55, { torso: [0.3, 0.9, 0], armR: [-1.3, 0, 1.2], foreR: [0, 0, 0], handR: [1.5, 0, 0], by: -0.25, legL: [-0.4, 0, 0], legR: [0.4, 0, 0] }]],
    hits: [{ t0: 0.44, t1: 0.57, range: 2.9, arc: 2.8, dmg: 13, poise: 14, knockback: 8 }],
  },
};

const ARCHER_MOVES = {
  shoot: {
    dur: 1.55, range: 17, minRange: 3, track: [0.95, 3.2], recover: 0.4, ranged: true,
    keys: [
      [0.3, { armL: [-1.55, 0, 0.1], foreL: [0, 0, 0], armR: [-1.5, 0, -0.1], foreR: [-0.6, 0, 0], handR: [1.6, 0, 0], torso: [0, 0.9, 0], head: [0, -0.8, 0], hips: [0, 0, 0] }],
      [0.95, { armL: [-1.57, 0, 0.1], foreL: [0, 0, 0], armR: [-1.55, 0, -0.4], foreR: [-2.3, 0, 0], handR: [2.2, 0, 0], torso: [0, 1.0, 0], head: [0, -0.95, 0] }],
      [1.08, { armL: [-1.57, 0, 0.1], foreL: [0, 0, 0], armR: [-1.4, 0, -1.0], foreR: [-0.8, 0, 0], handR: [1.6, 0, 0], torso: [0, 1.0, 0], head: [0, -0.95, 0] }],
      [1.4, { armL: [-1.2, 0, 0.1], armR: [-0.5, 0, -0.4], torso: [0, 0.5, 0], head: [0, -0.4, 0] }],
    ],
    onTime: [
      { t: 0.65, fn: (e, g) => g.audio.play('bow', 0.5) },
      { t: 1.0, fn: (e, g) => { if (e.rig.arrow) e.rig.arrow.visible = false; g.spawnArrow(e); } },
      { t: 1.4, fn: (e) => { if (e.rig.arrow) e.rig.arrow.visible = true; } },
    ],
  },
  bash: {
    dur: 1.0, range: 1.7, maxRange: 2.2, track: [0.35, 6], sfx: [0.38, 'swing'], recover: 0.3,
    keys: [[0.35, { armL: [-1.0, 0, 1.2], foreL: [-0.3, 0, 0], torso: [0, 0.6, 0] }], [0.48, { armL: [-1.4, 0, -0.5], foreL: [0, 0, 0], torso: [0.2, -0.5, 0], ...{ legL: [-0.5, 0, 0], legR: [0.4, 0, 0] } }]],
    hits: [{ t0: 0.4, t1: 0.5, range: 1.8, arc: 2.0, dmg: 9, poise: 10, knockback: 9 }],
  },
};

const BRUTE_MOVES = {
  slam: {
    dur: 2.15, range: 3.4, track: [0.85, 2.4], sfx: [1.0, 'heavySwing'], trail: [1.0, 1.18], recover: 0.5, armor: true, unparryable: true,
    keys: [
      [0.85, { torso: [-0.35, 0, 0], armR: [-3.0, 0, -0.25], foreR: [-0.6, 0, 0], handR: [0.8, 0, 0], armL: [-2.8, 0, 0.25], foreL: [-0.6, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0.05 }],
      [1.0, { torso: [-0.4, 0, 0], armR: [-3.1, 0, -0.25], foreR: [-0.7, 0, 0], handR: [0.8, 0, 0], armL: [-2.9, 0, 0.25], foreL: [-0.7, 0, 0], by: 0.05 }],
      [1.14, { torso: [0.8, 0, 0], armR: [-0.7, 0, 0.1], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-0.8, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.35 }],
      [1.75, { torso: [0.75, 0, 0], armR: [-0.7, 0, 0.1], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-0.8, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.35 }],
    ],
    hits: [{ t0: 1.1, t1: 1.2, shape: 'circle', offset: 2.6, radius: 1.8, dmg: 36, poise: 60, knock: 'heavy' }],
    move: [[0.9, 1.12, 0.8]],
    onTime: [
      { t: 0.25, fn: glint(true) },
      { t: 1.14, fn: (e, g) => { const f = e.fwd(); g.impact(e.pos.x + f.x * 2.6, e.pos.z + f.z * 2.6, 3.2, 0.55); } },
    ],
  },
  sweep: {
    dur: 1.75, range: 3.2, track: [0.75, 2.8], sfx: [0.8, 'heavySwing'], trail: [0.8, 1.0], recover: 0.45, armor: true,
    keys: [
      [0.75, { torso: [0.15, -1.0, 0], armR: [-1.4, 0, -1.4], foreR: [0, 0, 0], handR: [1.5, 0, 0], legL: [-0.4, 0, 0], legR: [0.4, 0, 0], by: -0.15 }],
      [0.98, { torso: [0.3, 1.0, 0], armR: [-1.4, 0, 1.25], foreR: [0, 0, 0], handR: [1.5, 0, 0], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], by: -0.2 }],
      [1.4, { torso: [0.25, 0.9, 0], armR: [-1.1, 0, 1.0], foreR: [-0.2, 0, 0], handR: [1.3, 0, 0], by: -0.15 }],
    ],
    hits: [{ t0: 0.82, t1: 0.98, range: 3.3, arc: 2.9, dmg: 26, poise: 40, knockback: 10 }],
    move: [[0.7, 0.95, 0.6]],
    onTime: [{ t: 0.15, fn: glint(false) }],
  },
  stomp: {
    dur: 1.25, range: 2.8, track: [0.1, 1], sfx: [0.6, 'slam'], recover: 0.35, armor: true, unparryable: true, rear: true,
    keys: [
      [0.5, { legL: [-1.3, 0, 0.1], shinL: [1.2, 0, 0], torso: [-0.25, 0, 0], armL: [-0.5, 0, 0.8], armR: [-0.3, 0, -0.8], by: 0.12 }],
      [0.62, { legL: [-0.3, 0, 0.1], shinL: [0.2, 0, 0], torso: [0.3, 0, 0], armL: [-0.2, 0, 0.5], armR: [-0.2, 0, -0.5], by: -0.25 }],
    ],
    hits: [{ t0: 0.6, t1: 0.68, shape: 'circle', offset: 0, radius: 2.5, dmg: 14, poise: 40, knock: 'heavy' }],
    onTime: [
      { t: 0.1, fn: (e, g) => { e.tele = g.fx.telegraph(e.pos.x, e.pos.z, 2.5 * 1, 0.55); } },
      { t: 0.62, fn: (e, g) => g.impact(e.pos.x, e.pos.z, 2.8, 0.4) },
    ],
  },
};

export const TYPES = {
  grunt: {
    hp: 140, poise: 15, scale: 1, radius: 0.45, run: 3.7, walk: 1.7, aggro: 11, prefer: 1.7, style: 'sword', turn: 7,
    cd: [0.6, 1.6], moves: GRUNT_MOVES, weights: { slash: 3, double: 2, leap: 1.5 },
    model: { cloth: 0x4a3c2c, armor: 0x5a5046, skin: 0x8a8576, head: 'bare', weapon: 'rusty', eyes: 0xff7a2a },
  },
  spear: {
    hp: 120, poise: 15, scale: 1, radius: 0.45, run: 3.5, walk: 1.8, aggro: 11, prefer: 2.9, style: 'spear', turn: 6,
    cd: [0.8, 1.8], moves: SPEAR_MOVES, weights: { thrust: 3, double: 2, sweep: 2 }, backoff: 1.7,
    model: { cloth: 0x3c3a30, armor: 0x6a6052, skin: 0x8a8576, head: 'cap', weapon: 'spear', eyes: 0xff7a2a },
  },
  archer: {
    hp: 46, poise: 10, scale: 1, radius: 0.42, run: 3.3, walk: 2.2, aggro: 16, prefer: 9, style: 'bow', turn: 6,
    cd: [1.2, 2.4], moves: ARCHER_MOVES, weights: { shoot: 1, bash: 1 }, ranged: true, backoff: 5,
    model: { cloth: 0x2e3a26, armor: 0x3e4a32, skin: 0x8a8576, head: 'hood', weapon: 'bow', accent: 0x3e4a32, eyes: 0xff7a2a },
  },
  brute: {
    hp: 280, poise: 80, scale: 1.45, radius: 0.75, run: 2.9, walk: 1.5, aggro: 12, prefer: 2.4, style: 'club', turn: 2.6,
    cd: [0.9, 1.9], moves: BRUTE_MOVES, weights: { slam: 2, sweep: 3, stomp: 3 }, superArmor: true,
    model: { cloth: 0x5a4030, armor: 0x6b5a48, skin: 0x7a6a58, head: 'horned', weapon: 'club', bulk: 1.35, eyes: 0xff3a1a, pauldrons: true },
  },
};

export class Enemy extends Actor {
  constructor(game, type, x, z, yaw = 0, opts = {}) {
    const T = TYPES[type];
    const rig = buildHumanoid({ ...T.model, scale: T.scale });
    super(game, rig, { x, z, yaw, hp: T.hp, radius: T.radius, poise: T.poise });
    this.uid = 'E' + UID++;
    this.type = type;
    this.T = T;
    this.home = { x, z, yaw };
    this.sitting = !!opts.sit;
    this.patrol = opts.patrol || null;
    this.cd = 0.5;
    this.token = false;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.phase = Math.random() * 6;
    this.speed = 0;
    this.trackMul = 1;
    this.trail = new Trail(game.scene, type === 'brute' ? 0xffb080 : 0xffe0c0, 12, 0.4);
    this.hpShow = 0;
    this.lastMove = null;
    this.flinches = []; this.armorT = 0; this.urgent = false; this.atkSpeed = 1;
    this.setState(this.sitting ? 'sit' : 'idle');
  }

  get target() { return this.game.player; }

  critable() { return this.state === 'parried'; }

  alert() {
    if (this.state !== 'idle' && this.state !== 'sit' && this.state !== 'return') return;
    this.setState('alert');
    for (const o of this.game.enemies) {
      if (o !== this && o.alive && (o.state === 'idle' || o.state === 'sit') && this.distTo(o) < 6) {
        o.alertDelay = 0.2 + Math.random() * 0.5;
      }
    }
  }

  releaseToken() { if (this.token) { this.token = false; this.game.tokens--; } }

  chooseMove(dist, behind) {
    const opts = [];
    for (const [name, w] of Object.entries(this.T.weights)) {
      const m = this.T.moves[name];
      if (dist > m.range + 0.4) continue;
      if (m.minRange && dist < m.minRange) continue;
      if (m.maxRange && dist > m.maxRange) continue;
      if (m.rear && !behind) continue;
      let ww = w;
      if (behind && m.rear) ww *= 4;
      if (name === this.lastMove) ww *= 0.4;
      opts.push([name, ww]);
    }
    if (!opts.length) return null;
    let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
    for (const [n, w] of opts) { if ((r -= w) <= 0) return n; }
    return opts[0][0];
  }

  update(dt) {
    this.t += dt;
    const p = this.game.player;
    const dist = this.distTo(p);
    const toP = this.yawTo(p.pos);
    const T = this.T;
    let pose = null, rate = 12;
    this.hpShow -= dt;
    if (this.alertDelay !== undefined) { this.alertDelay -= dt; if (this.alertDelay <= 0) { this.alertDelay = undefined; this.alert(); } }

    switch (this.state) {
      case 'sit':
      case 'idle': {
        if (this.state === 'sit') pose = P.rest;
        else {
          let s = 0;
          if (this.patrol) {
            const tgt = this.patrolIdx ? this.patrol : this.home;
            const d = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
            if (d < 0.4) { this.patrolWait = (this.patrolWait || 0) + dt; if (this.patrolWait > 2.5) { this.patrolWait = 0; this.patrolIdx = !this.patrolIdx; } }
            else {
              const y = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
              this.turnToward(y, 3, dt);
              const f = this.fwd(); this.move(f.x * T.walk * dt, f.z * T.walk * dt); s = T.walk / 4;
            }
          }
          this.phase += dt * (2 + s * 6);
          pose = locomotion(T.style, this.phase, s, false, this.game.time + this.phase);
        }
        const sense = this.state === 'sit' ? T.aggro * 0.6 : T.aggro;
        if (p.alive && dist < sense) this.alert();
        break;
      }
      case 'alert': {
        this.turnToward(toP, 8, dt);
        pose = { ...locomotion(T.style, 0, 0, false, 0), head: [-0.3, 0, 0], torso: [-0.15, 0, 0], armL: [-0.5, 0, 0.7], by: this.t < 0.25 ? -0.1 : 0 };
        rate = this.t < 0.3 ? 6 : 10;
        if (this.t > 0.55) { this.setState('chase'); this.cd = 0.3 + Math.random() * 0.6; }
        break;
      }
      case 'chase': {
        if (!p.alive) { this.setState('return'); break; }
        if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 30 && dist > 8) { this.setState('return'); break; }
        this.cd -= dt;
        const behind = Math.abs(angDiff(this.yaw, toP)) > 1.4;
        if (this.urgent && (this.urgentT -= dt) <= 0) this.urgent = false;
        // `urgent` = counterattack after being hit: ignores the 2-attacker limit and swings faster
        if (this.cd <= 0 && (T.ranged || this.urgent || this.game.tokens < this.game.maxTokens || this.token)) {
          const m = this.chooseMove(dist, behind);
          if (m) {
            if (!(T.ranged && m === 'shoot') && !this.token && !this.urgent) { this.game.tokens++; this.token = true; }
            this.atkSpeed = this.urgent ? 1.3 : 1;
            this.urgent = false;
            this.lastMove = m;
            this.trackMul = this.atkSpeed;
            this.startAttack(T.moves[m]);
            break;
          }
        }
        // spacing
        let mx = 0, mz = 0, sp = 0;
        const dx = (p.pos.x - this.pos.x) / (dist || 1), dz = (p.pos.z - this.pos.z) / (dist || 1);
        const waiting = !T.ranged && !this.token && this.game.tokens >= this.game.maxTokens;
        const want = waiting ? Math.max(T.prefer + 1.8, 3.6) : T.prefer;
        if (T.backoff && dist < T.backoff) { mx = -dx; mz = -dz; sp = T.walk * 1.2; }
        else if (dist > want + 0.6) { mx = dx; mz = dz; sp = dist > want + 4 ? T.run : T.run * 0.7; }
        else {
          this.strafeT -= dt;
          if (this.strafeT <= 0) { this.strafeT = 1.2 + Math.random() * 1.8; this.strafeDir = Math.random() < 0.5 ? -1 : 1; }
          mx = -dz * this.strafeDir; mz = dx * this.strafeDir;
          if (dist < want - 0.6) { mx -= dx * 0.8; mz -= dz * 0.8; }
          sp = T.walk;
        }
        // separation from other enemies
        for (const o of this.game.enemies) {
          if (o === this || !o.alive) continue;
          const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, od = Math.hypot(ox, oz);
          if (od < 2.2 && od > 0.01) { mx += ox / od * (2.2 - od) * 0.8; mz += oz / od * (2.2 - od) * 0.8; }
        }
        const ml = Math.hypot(mx, mz);
        if (ml > 0.01) this.move(mx / ml * sp * dt, mz / ml * sp * dt);
        this.speed += (sp - this.speed) * Math.min(1, dt * 8);
        this.turnToward(toP, T.turn, dt);
        this.phase += dt * (2.5 + this.speed * 1.6);
        pose = locomotion(T.style, this.phase, this.speed / 4, false, this.game.time);
        break;
      }
      case 'attack': {
        const d = this.atk.def;
        const going = this.runAttack(dt * (this.atkSpeed || 1), [p], p.alive ? toP : null);
        if (this.state !== 'attack') { pose = locomotion(T.style, 0, 0, false, 0); break; }
        pose = this.attackPose(locomotion(T.style, this.phase, 0, false, 0));
        rate = 22;
        this.trailOn = this.inWindow(d.trail);
        if (!going) {
          this.releaseToken();
          this.setState('recover');
          this.recoverT = d.recover ?? 0.3;
          this.cd = T.cd[0] + Math.random() * (T.cd[1] - T.cd[0]);
          if (this.tele) { this.tele.dead = true; this.tele = null; }
        }
        break;
      }
      case 'recover': {
        pose = locomotion(T.style, this.phase, 0, false, this.game.time);
        if (this.t > 0.15) this.turnToward(toP, T.turn * 0.5, dt);
        if (this.t >= this.recoverT) this.setState('chase');
        break;
      }
      case 'hurt': {
        pose = { ...locomotion(T.style, 0, 0, false, 0), ...P.hurt };
        rate = 20;
        if (this.t > (this.hurtDur || 0.4)) { this.setState('chase'); this.counter(); }
        break;
      }
      case 'parried': {
        pose = { ...locomotion(T.style, 0, 0, false, 0), ...P.stagger };
        rate = 16;
        if (this.t > 1.7) this.setState('chase');
        break;
      }
      case 'riposted': {
        pose = this.t < 0.55 ? { ...locomotion(T.style, 0, 0, false, 0), ...P.stagger } : (this.hp > 0 ? P.knockdown : P.dead);
        rate = this.t < 0.55 ? 14 : 9;
        if (this.t > 0.55 && this.hp <= 0 && this.alive) this.die(true);
        if (this.t > 2.0 && this.alive) this.setState('chase');
        break;
      }
      case 'dead': {
        pose = P.dead; rate = 8;
        if (this.t > 2.5) this.rig.root.position.y = -(this.t - 2.5) * 0.6;
        if (this.t > 4.5) this.rig.root.visible = false;
        break;
      }
      case 'return': {
        const d = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
        const y = Math.atan2(this.home.x - this.pos.x, this.home.z - this.pos.z);
        this.turnToward(y, 6, dt);
        if (d > 0.5) { const f = this.fwd(); this.move(f.x * T.run * dt, f.z * T.run * dt); }
        this.phase += dt * 8;
        pose = locomotion(T.style, this.phase, d > 0.5 ? 0.9 : 0, false, this.game.time);
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * dt * 0.3);
        if (d <= 0.5) { this.setState(this.sitting ? 'sit' : 'idle'); this.yaw = this.home.yaw; }
        if (p.alive && dist < T.aggro * 0.7 && this.t > 1.0) this.setState('chase');
        break;
      }
    }
    if (this.state !== 'attack') this.trailOn = false;
    if (this.armorT > 0) {
      this.armorT -= dt;
      if (Math.random() < dt * 25) this.game.fx.ember({ x: this.pos.x, y: 0.3 + Math.random() * 1.6 * this.T.scale, z: this.pos.z }, 0.8, 1.2);
    }
    if (this.state !== 'dead') this.regenPoise(dt);
    this.applyKnockback(dt);
    if (pose && this.state !== 'dead') this.syncRig(dt, pose, rate);
    else if (pose) { this.rig.apply(pose, dt, rate); }
    this.trail.update(dt, this.trailOn, this.rig.base, this.rig.tip);
  }

  // returns 'hit' etc. Called by game.resolveHit
  receive(info) {
    if (!this.alive) return 'none';
    this.hp -= info.dmg;
    this.hpShow = 4;
    this.rig.flash(1, 0.9, 0.8);
    if (this.state === 'idle' || this.state === 'sit' || this.state === 'return') { this.alert(); }
    if (this.hp <= 0) { this.die(); return 'kill'; }
    this.poise -= info.poise || 0;
    this.poiseT = 2.0;
    const armored = this.armorT > 0 || (this.state === 'attack' && (this.atk.def.armor || this.T.superArmor));
    const now = this.game.time;
    this.flinches = this.flinches.filter((t) => now - t < 3);
    if (this.poise <= 0 && (this.armorT > 0 || this.flinches.length >= 2)) {
      // stun-lock breaker: third flinch in 3s -> shrug it off, armor up and counter fast
      this.poise = this.maxPoise;
      if (!(this.armorT > 0)) {
        this.armorT = 1.6;
        this.game.fx.burst({ x: this.pos.x, y: 1.2 * this.T.scale, z: this.pos.z }, 18, [1, 0.5, 0.15], 4, 0.5, 0.3);
        this.game.audio.play('clang', 0.5);
      }
      if (this.state !== 'attack') { if (this.state === 'hurt') this.setState('chase'); this.counter(0); }
      return 'hit';
    }
    if (this.poise <= 0) {
      this.flinches.push(now);
      this.poise = this.maxPoise;
      if (this.state === 'attack') { this.releaseToken(); if (this.tele) { this.tele.dead = true; this.tele = null; } }
      this.atk = null;
      this.setState('hurt');
      this.hurtDur = this.type === 'brute' ? 1.1 : 0.45;
      const away = new THREE.Vector3(this.pos.x - info.srcPos.x, 0, this.pos.z - info.srcPos.z).normalize();
      this.kb.copy(away).multiplyScalar(this.type === 'brute' ? 3 : 5);
      return 'stagger';
    }
    if (this.state === 'chase' || this.state === 'recover') this.counter(0.15);
    if (!armored && this.state !== 'attack') {
      // small flinch without full stagger
      const away = new THREE.Vector3(this.pos.x - info.srcPos.x, 0, this.pos.z - info.srcPos.z).normalize();
      this.kb.copy(away).multiplyScalar(2);
    }
    return 'hit';
  }

  // queue a quick retaliation (used after flinching / being hit)
  counter(delay = 0) {
    this.urgent = true; this.urgentT = 2;
    this.cd = Math.min(this.cd, delay);
    if (this.state === 'recover') this.setState('chase');
  }

  onParried() {
    this.releaseToken();
    this.atk = null;
    if (this.tele) { this.tele.dead = true; this.tele = null; }
    this.setState('parried');
  }

  beginRiposted() { this.setState('riposted'); this.atk = null; }

  die(silent) {
    this.alive = false;
    this.hp = 0;
    this.releaseToken();
    if (this.tele) { this.tele.dead = true; this.tele = null; }
    this.atk = null;
    this.setState('dead');
    this.game.audio.play('enemyDie');
    if (this.game.player.lock === this) this.game.player.lock = null;
  }

  reset() {
    this.alive = true; this.hp = this.maxHp; this.poise = this.maxPoise;
    this.pos.set(this.home.x, 0, this.home.z); this.yaw = this.home.yaw;
    this.kb.set(0, 0, 0); this.atk = null; this.token = false; this.cd = 0.5; this.hpShow = 0;
    this.rig.root.visible = true; this.rig.root.position.y = 0;
    this.alertDelay = undefined; this.patrolIdx = false;
    this.flinches = []; this.armorT = 0; this.urgent = false; this.atkSpeed = 1;
    this.setState(this.sitting ? 'sit' : 'idle');
  }
}
