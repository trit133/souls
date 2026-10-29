import * as THREE from 'three';
import { Actor, angDiff, clamp } from './actor.js';
import { buildHumanoid } from './models.js';
import { locomotion, P } from './anims.js';
import { Trail } from './fx.js';
import { ARENA } from './world.js';

// Varek, the Ashen Warden. Two phases. Every move has a readable windup and a
// punish window afterwards; heavy/AoE moves are unparryable and telegraphed.

const SW_WIND = { torso: [0.1, -1.05, 0], armR: [-1.45, 0, -1.45], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.6, 0, 0.5], legL: [-0.4, 0, 0], legR: [0.35, 0, 0], shinR: [0.4, 0, 0], by: -0.12 };
const SW_STRIKE = { torso: [0.3, 1.0, 0], armR: [-1.45, 0, 1.3], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.4, 0, 0.9], legL: [-0.6, 0, 0], legR: [0.5, 0, 0], shinR: [0.5, 0, 0], by: -0.2 };
const BH_WIND = { torso: [0.2, 1.15, 0], armR: [-1.45, 0, 1.45], foreR: [0, 0, 0], handR: [1.5, 0, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], by: -0.15 };
const BH_STRIKE = { torso: [0.3, -1.0, 0], armR: [-1.45, 0, -1.35], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.5, 0, 0.6], legL: [0.35, 0, 0], legR: [-0.5, 0, 0], shinL: [0.4, 0, 0], by: -0.2 };
const OH_RAISE = { torso: [-0.3, -0.1, 0], armR: [-3.0, 0, -0.2], foreR: [-0.5, 0, 0], handR: [1.0, 0, 0], armL: [-2.8, 0, 0.3], foreL: [-0.5, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0 };
const OH_HOLD = { torso: [-0.42, -0.1, 0], armR: [-3.15, 0, -0.2], foreR: [-0.7, 0, 0], handR: [0.9, 0, 0], armL: [-3.0, 0, 0.3], foreL: [-0.7, 0, 0], legL: [-0.35, 0, 0], legR: [0.35, 0, 0], by: 0.04 };
const OH_STRIKE = { torso: [0.75, 0, 0], armR: [-0.75, 0, 0.05], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-0.85, 0, 0.1], legL: [-0.85, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.35 };
const TH_WIND = { torso: [0.15, -0.55, 0], armR: [0.45, 0, -0.25], foreR: [-1.6, 0, 0], handR: [1.2, 0, 0], armL: [-1.0, 0, 0.3], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], shinL: [0.4, 0, 0], shinR: [0.7, 0, 0], by: -0.3 };
const TH_STRIKE = { torso: [0.4, 0.3, 0], armR: [-1.5, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.4, 0, 0.8], legL: [-0.9, 0, 0], legR: [0.7, 0, 0], shinR: [0.5, 0, 0], by: -0.25 };
const CROUCH = { torso: [0.5, 0, 0], armR: [-0.3, 0, -0.6], foreR: [-0.9, 0, 0], handR: [1.0, 0, 0], armL: [-0.2, 0, 0.6], legL: [-1.1, 0, 0], legR: [-1.0, 0, 0], shinL: [1.6, 0, 0], shinR: [1.5, 0, 0], by: -0.45 };
const AIR = { torso: [-0.2, 0, 0], armR: [-3.0, 0, -0.2], foreR: [-0.6, 0, 0], handR: [1.0, 0, 0], armL: [-2.8, 0, 0.3], legL: [-0.6, 0, 0], legR: [0.2, 0, 0], shinL: [1.0, 0, 0], shinR: [1.2, 0, 0], by: 0 };
const PLANT = { torso: [0.7, 0, 0], armR: [-1.0, 0, 0], foreR: [-0.4, 0, 0], handR: [2.6, 0, 0], armL: [-1.0, 0, -0.2], foreL: [-0.4, 0, 0], legL: [-0.9, 0, 0], legR: [0.3, 0, 0], shinL: [0.6, 0, 0], shinR: [1.4, 0, 0], by: -0.4 };
const ROAR = { torso: [-0.4, 0, 0], head: [-0.5, 0, 0], armR: [-0.3, 0, -1.2], foreR: [-0.3, 0, 0], armL: [-0.3, 0, 1.2], foreL: [-0.3, 0, 0], legL: [-0.3, 0, 0.15], legR: [0.3, 0, -0.15], by: -0.12 };

const impact = (r, shake) => (b, g) => { const f = b.fwd(); g.impact(b.pos.x + f.x * r, b.pos.z + f.z * r, 3.5, shake); };

export const BOSS_MOVES = {
  sweep: {
    dur: 1.8, track: [0.66, 3.4], sfx: [0.66, 'heavySwing'], trail: [0.68, 0.92],
    keys: [[0.66, SW_WIND], [0.88, SW_STRIKE], [1.35, SW_STRIKE]],
    hits: [{ t0: 0.72, t1: 0.9, range: 4.9, arc: 3.0, dmg: 30, poise: 40 }],
    move: [[0.6, 0.88, 1.3]], stopAt: 1.6,
  },
  combo2: {
    dur: 2.5, track: [0.66, 3.4], tracks: [[1.0, 1.28, 3.0]], sfx: [0.66, 'heavySwing'], trail: [0.68, 1.5],
    keys: [[0.66, SW_WIND], [0.88, SW_STRIKE], [1.28, BH_WIND], [1.46, BH_STRIKE], [1.95, BH_STRIKE]],
    hits: [{ t0: 0.72, t1: 0.9, range: 4.9, arc: 3.0, dmg: 28, poise: 40 }, { t0: 1.32, t1: 1.48, range: 4.9, arc: 3.0, dmg: 28, poise: 40 }],
    move: [[0.6, 0.88, 1.2], [1.2, 1.45, 1.4]], stopAt: 1.6,
    onTime: [{ t: 1.28, fn: (b, g) => g.audio.play('heavySwing', 1) }],
  },
  combo3: {
    dur: 3.3, track: [0.6, 3.6], tracks: [[0.95, 1.2, 3.2], [1.6, 2.05, 2.6]], sfx: [0.6, 'heavySwing'], trail: [0.62, 2.4],
    keys: [[0.6, SW_WIND], [0.8, SW_STRIKE], [1.2, BH_WIND], [1.37, BH_STRIKE], [1.75, OH_RAISE], [2.12, OH_HOLD], [2.27, OH_STRIKE], [2.8, OH_STRIKE]],
    hits: [
      { t0: 0.65, t1: 0.82, range: 4.9, arc: 3.0, dmg: 26, poise: 40 },
      { t0: 1.23, t1: 1.39, range: 4.9, arc: 3.0, dmg: 26, poise: 40 },
      { t0: 2.2, t1: 2.32, range: 5.0, arc: 0.9, dmg: 40, poise: 60, knock: 'heavy' },
    ],
    move: [[0.55, 0.8, 1.1], [1.1, 1.37, 1.2], [2.1, 2.27, 1.0]], stopAt: 1.6,
    onTime: [
      { t: 1.2, fn: (b, g) => g.audio.play('heavySwing', 1) },
      { t: 2.15, fn: (b, g) => g.audio.play('heavySwing', 1) },
      { t: 2.27, fn: (b, g) => { impact(4.2, 0.6)(b, g); g.spawnFireWave(b, 4.2); } },
    ],
  },
  overhead: {
    // the delayed swing: he holds at the top, baiting an early roll
    dur: 2.35, track: [1.0, 3.2], sfx: [1.02, 'heavySwing'], trail: [1.04, 1.24],
    keys: [[0.55, OH_RAISE], [1.05, OH_HOLD], [1.18, OH_STRIKE], [1.8, OH_STRIKE]],
    hits: [{ t0: 1.1, t1: 1.22, range: 5.0, arc: 0.95, dmg: 44, poise: 60, knock: 'heavy' }],
    move: [[0.95, 1.16, 0.9]], stopAt: 1.6,
    onTime: [{ t: 1.18, fn: (b, g) => { impact(4.2, 0.65)(b, g); if (b.phase2) g.spawnFireWave(b, 4.2); } }],
  },
  thrust: {
    dur: 1.85, track: [0.6, 4.2], sfx: [0.62, 'heavySwing'], trail: [0.62, 0.9],
    keys: [[0.58, TH_WIND], [0.82, TH_STRIKE], [1.3, TH_STRIKE]],
    hits: [{ t0: 0.66, t1: 0.86, range: 4.7, arc: 0.6, dmg: 34, poise: 45 }],
    move: [[0.6, 0.84, 7.0]], stopAt: 2.0,
    onTime: [{ t: 0.62, fn: (b, g) => g.fx.dust(b.pos, 8, 1.5) }],
  },
  leap: {
    dur: 2.75, unparryable: true, track: [0.55, 6], trail: [1.2, 1.4], leap: [0.55, 1.35],
    keys: [[0.5, CROUCH], [0.75, AIR], [1.25, AIR], [1.38, OH_STRIKE], [2.2, OH_STRIKE]],
    hits: [{ t0: 1.35, t1: 1.45, shape: 'circle', offset: 0.8, radius: 3.5, dmg: 42, poise: 80, knock: 'heavy' }],
    onTime: [
      { t: 0.1, fn: (b, g) => g.audio.play('roar', 0.35) },
      { t: 0.55, fn: (b, g) => b.beginLeap() },
      { t: 1.36, fn: (b, g) => { g.impact(b.pos.x, b.pos.z, 4.5, 0.9); g.audio.play('slam'); if (b.phase2) g.spawnFireRing(b.pos.x, b.pos.z, 9, 1.0, 20); } },
    ],
  },
  spin: {
    dur: 1.9, unparryable: true, sfx: [0.7, 'heavySwing'], trail: [0.7, 1.1], spin: [0.68, 1.08, -Math.PI * 2],
    keys: [[0.6, { ...SW_WIND, torso: [0.2, 1.2, 0], armR: [-1.45, 0, -0.6] }], [0.75, { ...SW_STRIKE, torso: [0.2, 0, 0], armR: [-1.45, 0, -1.4] }], [1.1, { ...SW_STRIKE, torso: [0.2, 0, 0], armR: [-1.45, 0, -1.4] }], [1.4, SW_STRIKE]],
    hits: [{ t0: 0.7, t1: 1.08, shape: 'circle', offset: 0, radius: 4.6, dmg: 24, poise: 40, knockback: 12 }],
    onTime: [{ t: 0.05, fn: (b, g) => b.glint(true) }],
  },
  ember: {
    dur: 2.5, unparryable: true, unblockable: true, track: [0.3, 2],
    keys: [[0.45, OH_RAISE], [0.7, PLANT], [2.0, PLANT]],
    hits: [{ t0: 1.45, t1: 1.55, shape: 'circle', offset: 0, radius: 5.2, dmg: 38, poise: 80, knock: 'heavy' }],
    onTime: [
      { t: 0.7, fn: (b, g) => { g.audio.play('slam', 0.6); b.tele = g.fx.telegraph(b.pos.x, b.pos.z, 5.2, 0.8, 0xff6a1a); } },
      { t: 1.47, fn: (b, g) => { g.impact(b.pos.x, b.pos.z, 6, 1.0); g.audio.play('fire'); g.fx.burst({ x: b.pos.x, y: 0.5, z: b.pos.z }, 80, [1, 0.5, 0.1], 9, 1.0, 0.5); g.fx.scorch(b.pos.x, b.pos.z, 5); } },
    ],
  },
  roar: {
    dur: 2.7, unparryable: true, unblockable: true,
    keys: [[0.5, { ...CROUCH, by: -0.3 }], [0.9, ROAR], [2.1, ROAR]],
    hits: [{ t0: 0.92, t1: 1.0, shape: 'circle', offset: 0, radius: 6, dmg: 10, poise: 50, knock: 'heavy' }],
    onTime: [
      { t: 0.9, fn: (b, g) => { g.audio.play('roar', 1.2); g.fx.shockwave(b.pos.x, b.pos.z, 9, 0xffa040, 0.6); g.fx.addShake(1.0); b.ignite(); } },
    ],
  },
};

const WEIGHTS = (b, d, behind) => {
  const w = [];
  const near = d < 3.4, mid = d >= 2.6 && d < 8.5;
  if (behind && d < 4.2) w.push(['spin', b.lastMove === 'spin' ? 2 : 7]);
  if (near) {
    w.push(['sweep', 2.5]);
    w.push([b.phase2 ? 'combo3' : 'combo2', 3]);
    w.push(['overhead', 2.4]);
    if (b.phase2 && b.emberCd <= 0) w.push(['ember', 3]);
  }
  if (mid) w.push(['thrust', near ? 0.6 : 3]);
  if (d > 6 && b.leapCd <= 0) w.push(['leap', d > 9 ? 6 : 2]);
  return w.map(([n, x]) => [n, n === b.lastMove ? x * 0.3 : x]);
};

export class Boss extends Actor {
  constructor(game) {
    const rig = buildHumanoid({
      scale: 2.1, cloth: 0x2a2624, armor: 0x3c3c44, accent: 0x5a1a14, skin: 0x5a5048, head: 'horned',
      weapon: 'greatsword', eyes: 0xffb040, pauldrons: true, cape: true, bulk: 1.25,
    });
    super(game, rig, { x: ARENA.x, z: ARENA.z - 3, hp: 1300, radius: 1.05, poise: 170, yaw: 0 });
    this.uid = 'BOSS';
    this.isBoss = true;
    this.name = 'Varek, the Ashen Warden';
    this.trail = new Trail(game.scene, 0xd8d8e8, 18, 0.5);
    this.sfxVol = 1.2;
    this.reset();
  }

  get target() { return this.game.player; }
  critable() { return this.state === 'parried' || this.state === 'broken'; }

  reset() {
    this.alive = true; this.hp = this.maxHp; this.poise = this.maxPoise; this.poiseT = 0;
    this.pos.set(ARENA.x, 0, ARENA.z - 3); this.yaw = 0; this.y = 0;
    this.phase2 = false; this.ignited = false; this.atkSpeed = 1; this.trackMul = 1;
    this.leapCd = 4; this.emberCd = 0; this.gap = 1; this.lastMove = null; this.phase = 0; this.speed = 0;
    this.atk = null; this.kb.set(0, 0, 0); this.strafe = 1; this.strafeT = 0;
    this.rig.root.visible = true; this.rig.root.position.y = 0;
    if (this.rig.bladeMat) this.rig.bladeMat.emissive.setRGB(0, 0, 0);
    this.trail.setColor(0xd8d8e8);
    this.setState('dormant');
  }

  wake() { this.setState('rise'); }

  glint(red) {
    const p = this.rig.tip.getWorldPosition(new THREE.Vector3());
    this.game.fx.burst(p, 18, red ? [1, 0.15, 0.1] : [1, 1, 0.9], 3, 0.45, 0.7);
    if (red) this.game.audio.play('clang', 0.3);
  }

  ignite() {
    this.ignited = true;
    if (this.rig.bladeMat) this.rig.bladeMat.emissive.setRGB(0.9, 0.35, 0.05);
    this.trail.setColor(0xff7a20);
    this.game.audio.startMusic(2);
  }

  beginLeap() {
    const p = this.game.player.pos;
    // land just short of where the player is standing at takeoff
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    const land = Math.max(0, d - 1.2);
    let tx = this.pos.x + dx / d * land, tz = this.pos.z + dz / d * land;
    const ad = Math.hypot(tx - ARENA.x, tz - ARENA.z), lim = ARENA.r - 2.5;
    if (ad > lim) { tx = ARENA.x + (tx - ARENA.x) / ad * lim; tz = ARENA.z + (tz - ARENA.z) / ad * lim; }
    this.leapFrom = { x: this.pos.x, z: this.pos.z };
    this.leapTo = { x: tx, z: tz };
    this.yaw = Math.atan2(dx, dz);
    const f = this.fwd();
    this.tele = this.game.fx.telegraph(tx + f.x * 0.8, tz + f.z * 0.8, 3.5, 0.8 / this.atkSpeed);
  }

  chooseMove(d, behind) {
    const w = WEIGHTS(this, d, behind);
    if (!w.length) return null;
    let r = Math.random() * w.reduce((s, x) => s + x[1], 0);
    for (const [n, x] of w) if ((r -= x) <= 0) return n;
    return w[0][0];
  }

  update(dt) {
    this.t += dt;
    const p = this.game.player;
    const dist = this.distTo(p) - this.radius - p.radius;
    const toP = this.yawTo(p.pos);
    let pose = null, rate = 10;
    this.leapCd -= dt; this.emberCd -= dt;
    const loco = (s) => locomotion('greatsword', this.phase, s, false, this.game.time);

    switch (this.state) {
      case 'dormant': {
        pose = { ...P.rest, armR: [-0.9, 0, -0.1], foreR: [-0.5, 0, 0], handR: [2.4, 0, 0], head: [0.6, 0, 0] };
        rate = 20;
        break;
      }
      case 'rise': {
        pose = this.t < 1.2 ? { ...P.rest, armR: [-0.9, 0, -0.1], foreR: [-0.5, 0, 0], handR: [2.4, 0, 0], head: [0.2, 0, 0] } : { ...loco(0), head: [-0.3, 0, 0] };
        rate = this.t < 1.2 ? 3 : 4;
        this.turnToward(toP, 1.5, dt);
        if (this.t > 2.4) { this.setState('neutral'); this.gap = 0.4; }
        break;
      }
      case 'neutral': {
        if (!p.alive) { pose = loco(0); break; }
        if (!this.phase2 && this.hp <= this.maxHp * 0.55) {
          this.phase2 = true; this.atkSpeed = 1.12; this.trackMul = 1.2;
          this.lastMove = 'roar';
          this.startAttack(BOSS_MOVES.roar);
          this.game.ui.toast('', 0);
          break;
        }
        this.gap -= dt;
        const behind = Math.abs(angDiff(this.yaw, toP)) > 1.5;
        // punish healing at mid range
        const punish = p.state === 'heal' && dist < 9 && this.gap < 0.6;
        if (this.gap <= 0 || punish || (behind && dist < 3 && this.gap < 0.5)) {
          const m = punish ? (dist > 4 ? (this.leapCd <= 0 && dist > 6 ? 'leap' : 'thrust') : 'sweep') : this.chooseMove(dist, behind);
          if (m) {
            this.lastMove = m;
            if (m === 'leap') this.leapCd = 7;
            if (m === 'ember') this.emberCd = 9;
            this.counterAtk = this.counter; this.counter = false;
            this.startAttack(BOSS_MOVES[m]);
            break;
          }
        }
        // movement: close distance, otherwise slow circle
        const walk = this.phase2 ? 2.7 : 2.2;
        let mx = 0, mz = 0, sp = 0;
        const dx = Math.sin(toP), dz = Math.cos(toP);
        if (dist > 2.6) { mx = dx; mz = dz; sp = dist > 9 ? walk * 1.5 : walk; }
        else {
          this.strafeT -= dt;
          if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 1.5; this.strafe = -this.strafe; }
          mx = -dz * this.strafe; mz = dx * this.strafe; sp = walk * 0.5;
        }
        this.move(mx * sp * dt, mz * sp * dt);
        this.speed += (sp - this.speed) * Math.min(1, dt * 6);
        this.turnToward(toP, 3.2, dt);
        this.phase += dt * (2 + this.speed * 1.4);
        pose = loco(this.speed / 4.5);
        break;
      }
      case 'attack': {
        const d = this.atk.def;
        const adt = dt * this.atkSpeed * (this.counterAtk ? 1.15 : 1);
        const going = this.runAttack(adt, [p], p.alive ? toP : null);
        if (this.state !== 'attack') { pose = loco(0); break; }
        const t = this.atk.t;
        if (d.leap && this.leapTo) {
          const [t0, t1] = d.leap;
          const u = clamp((t - t0) / (t1 - t0), 0, 1);
          if (t >= t0 && t <= t1 + adt) {
            const e = u * u * (3 - 2 * u);
            this.pos.x = this.leapFrom.x + (this.leapTo.x - this.leapFrom.x) * e;
            this.pos.z = this.leapFrom.z + (this.leapTo.z - this.leapFrom.z) * e;
            this.y = Math.sin(u * Math.PI) * 5.5;
          }
          if (t > t1) this.y = 0;
        }
        if (d.spin) {
          const [t0, t1, ang] = d.spin;
          if (t >= t0 && t < t1) this.yaw += ang * adt / (t1 - t0);
        }
        pose = this.attackPose(loco(0));
        rate = 18;
        this.trailOn = this.inWindow(d.trail);
        if (!going) {
          this.y = 0; this.leapTo = null;
          if (this.tele) { this.tele.dead = true; this.tele = null; }
          this.setState('neutral');
          const g = this.phase2 ? [0.25, 0.8] : [0.45, 1.2];
          this.gap = g[0] + Math.random() * (g[1] - g[0]);
        }
        break;
      }
      case 'broken': {
        pose = { ...P.rest, armR: [-0.9, 0, -0.1], foreR: [-0.5, 0, 0], handR: [2.4, 0, 0], head: [0.5, 0, 0], torso: [0.6, 0, 0] };
        rate = 9;
        if (this.t > 2.8) { this.setState('neutral'); this.gap = 0.3; }
        break;
      }
      case 'parried': {
        pose = { ...loco(0), ...P.stagger };
        rate = 12;
        if (this.t > 1.8) { this.setState('neutral'); this.gap = 0.2; }
        break;
      }
      case 'riposted': {
        pose = this.t < 0.5 ? { ...loco(0), ...P.stagger } : (this.t < 2.0 ? P.knockdown : { ...loco(0) });
        rate = this.t < 0.5 ? 12 : 6;
        if (this.t > 0.5 && this.hp <= 0 && this.alive) { this.die(); break; }
        if (this.t > 2.8) { this.setState('neutral'); this.gap = 0.2; }
        break;
      }
      case 'dead': {
        pose = this.t < 1.2 ? { ...P.rest, head: [0.8, 0, 0], torso: [0.7, 0, 0] } : P.dead;
        rate = 4;
        if (this.t < 3.5 && Math.random() < dt * 60) {
          this.game.fx.ember({ x: this.pos.x, y: 0.5 + Math.random() * 2.5, z: this.pos.z }, 2.5, 2.2, 1.5);
        }
        if (this.t > 2.5) this.rig.root.position.y = -(this.t - 2.5) * 0.4;
        if (this.t > 6) this.rig.root.visible = false;
        break;
      }
    }

    if (this.state !== 'attack') this.trailOn = false;
    if (this.state !== 'dead') this.regenPoise(dt);
    this.applyKnockback(dt);
    if (!pose) pose = this.state === 'attack' && this.atk ? this.attackPose(loco(0)) : loco(0);
    if (this.state !== 'dead') this.syncRig(dt, pose, rate); else this.rig.apply(pose, dt, rate);
    this.trail.update(dt, this.trailOn, this.rig.base, this.rig.tip);

    // burning blade
    if (this.ignited && this.alive && Math.random() < dt * 40) {
      const a = this.rig.base.getWorldPosition(_a), b = this.rig.tip.getWorldPosition(_b);
      const k = Math.random();
      this.game.fx.flame({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }, 0.5);
    }
  }

  receive(info) {
    if (!this.alive || this.state === 'dormant') return 'none';
    this.hp -= info.dmg;
    this.rig.flash(1, 0.85, 0.7);
    if (this.hp <= 0) {
      this.hp = 0;
      if (this.state !== 'riposted') this.die();
      return 'kill';
    }
    if (this.state === 'broken' || this.state === 'parried' || this.state === 'riposted') return 'hit';
    // being hit makes him retaliate sooner and a bit faster
    if (this.state === 'neutral') { this.gap = Math.min(this.gap, 0.3); this.counter = true; }
    this.poise -= info.poise || 0;
    this.poiseT = 4;
    if (this.poise <= 0) {
      this.poise = this.maxPoise;
      this.atk = null; this.y = 0; this.leapTo = null;
      if (this.tele) { this.tele.dead = true; this.tele = null; }
      this.setState('broken');
      this.game.audio.play('bigHit');
      this.game.fx.addShake(0.5);
      return 'break';
    }
    return 'hit';
  }

  onParried() {
    this.atk = null; this.y = 0;
    if (this.tele) { this.tele.dead = true; this.tele = null; }
    this.setState('parried');
  }

  beginRiposted() { this.setState('riposted'); this.atk = null; }

  die() {
    this.alive = false;
    this.atk = null; this.y = 0;
    this.setState('dead');
    if (this.game.player.lock === this) this.game.player.lock = null;
    this.game.onBossDeath();
  }
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
