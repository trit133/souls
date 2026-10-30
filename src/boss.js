import * as THREE from 'three';
import { Actor, angDiff, clamp } from './actor.js';
import { buildHumanoid } from './models.js';
import { locomotion, P } from './anims.js';
import { Trail } from './fx.js';
import { StatusState } from './status.js';
import { tierScale, TIER_EYES } from './progress.js';

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
    parry: true, dur: 1.8, track: [0.66, 3.4], sfx: [0.66, 'heavySwing'], trail: [0.68, 0.92],
    keys: [[0.66, SW_WIND], [0.88, SW_STRIKE], [1.35, SW_STRIKE]],
    hits: [{ t0: 0.72, t1: 0.9, range: 4.9, arc: 3.0, dmg: 30, poise: 40 }],
    move: [[0.6, 0.88, 1.3]], stopAt: 1.6,
  },
  combo2: {
    parry: true, dur: 2.5, track: [0.66, 3.4], tracks: [[1.0, 1.28, 3.0]], sfx: [0.66, 'heavySwing'], trail: [0.68, 1.5],
    keys: [[0.66, SW_WIND], [0.88, SW_STRIKE], [1.28, BH_WIND], [1.46, BH_STRIKE], [1.95, BH_STRIKE]],
    hits: [{ t0: 0.72, t1: 0.9, range: 4.9, arc: 3.0, dmg: 28, poise: 40 }, { t0: 1.32, t1: 1.48, range: 4.9, arc: 3.0, dmg: 28, poise: 40 }],
    move: [[0.6, 0.88, 1.2], [1.2, 1.45, 1.4]], stopAt: 1.6,
    onTime: [{ t: 1.28, fn: (b, g) => g.audio.play('heavySwing', 1) }],
  },
  combo3: {
    parry: true, dur: 3.3, track: [0.6, 3.6], tracks: [[0.95, 1.2, 3.2], [1.6, 2.05, 2.6]], sfx: [0.6, 'heavySwing'], trail: [0.62, 2.4],
    keys: [[0.6, SW_WIND], [0.8, SW_STRIKE], [1.2, BH_WIND], [1.37, BH_STRIKE], [1.75, OH_RAISE], [2.12, OH_HOLD], [2.27, OH_STRIKE], [2.8, OH_STRIKE]],
    hits: [
      { t0: 0.65, t1: 0.82, range: 4.9, arc: 3.0, dmg: 26, poise: 40 },
      { t0: 1.23, t1: 1.39, range: 4.9, arc: 3.0, dmg: 26, poise: 40 },
      { t0: 2.2, t1: 2.32, range: 5.0, arc: 0.9, dmg: 40, poise: 60, knock: 'heavy', parry: false },
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

const VAREK_WEIGHTS = (b, d, behind) => {
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
  // cfg: one of BOSSES; arena: {x, z, r}; mod: module index the boss is confined to
  constructor(game, cfg, arena, mod, tier = 0) {
    const scale = tierScale(tier);
    const rig = buildHumanoid({ ...cfg.model, eyes: TIER_EYES[tier] ?? cfg.model.eyes, eyeGlow: tier >= 3 ? 0xff1a10 : null });
    super(game, rig, { x: arena.x, z: arena.z - 3, hp: Math.round(cfg.hp * scale), radius: cfg.radius, poise: cfg.poise, yaw: 0 });
    this.tier = tier; this.dmgScale = scale; this.spdScale = scale;
    this.cfg = cfg;
    this.moves = cfg.moves;
    this.arena = arena;
    this.mod = mod;
    this.uid = 'BOSS_' + cfg.id;
    this.isBoss = true;
    this.name = cfg.name;
    this.trail = new Trail(game.scene, 0xd8d8e8, 18, 0.5);
    this.status = new StatusState(this, 260);
    this.sfxVol = 1.2;
    this.reset();
  }

  get target() { return this.game.player; }
  critable() { return this.state === 'parried' || this.state === 'broken'; }
  attackRate() { return this.atkSpeed * (this.counterAtk ? 1.15 : 1) * this.status.slow() * this.spdScale; }

  reset() {
    this.alive = true; this.hp = this.maxHp; this.poise = this.maxPoise; this.poiseT = 0;
    this.pos.set(this.arena.x, 0, this.arena.z - 3); this.yaw = 0; this.y = 0;
    this.phase2 = false; this.ignited = false; this.atkSpeed = 1; this.trackMul = 1;
    this.leapCd = 4; this.emberCd = 0; this.gap = 1; this.evadeCd = 0; this.seenAtk = null;
    this.status.reset(this.cfg.id === 'varek' ? 340 : 260); this.lastMove = null; this.phase = 0; this.speed = 0;
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
    if (this.cfg.phase2) this.game.audio.startMusic(2);
  }

  beginLeap() {
    const p = this.game.player.pos;
    // land just short of where the player is standing at takeoff
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    const land = Math.max(0, d - 1.2);
    let tx = this.pos.x + dx / d * land, tz = this.pos.z + dz / d * land;
    const A = this.arena;
    const ad = Math.hypot(tx - A.x, tz - A.z), lim = A.r - 2.5;
    if (ad > lim) { tx = A.x + (tx - A.x) / ad * lim; tz = A.z + (tz - A.z) / ad * lim; }
    this.leapFrom = { x: this.pos.x, z: this.pos.z };
    this.leapTo = { x: tx, z: tz };
    this.yaw = Math.atan2(dx, dz);
    const f = this.fwd();
    const lr = this.cfg.leapR || 3.5;
    this.tele = this.game.fx.telegraph(tx + f.x * 0.8, tz + f.z * 0.8, lr, (this.cfg.leapAir || 0.8) / this.atkSpeed);
  }

  chooseMove(d, behind) {
    const w = this.cfg.weights(this, d, behind);
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
    this.leapCd -= dt; this.emberCd -= dt; this.evadeCd -= dt;
    this.status.update(dt, this.game);
    const loco = (s) => locomotion('greatsword', this.phase, s, false, this.game.time);

    switch (this.state) {
      case 'dormant': {
        pose = this.cfg.kneels === false ? { ...loco(0), head: [0.45, 0, 0], torso: [0.2, 0, 0] } : { ...P.rest, armR: [-0.9, 0, -0.1], foreR: [-0.5, 0, 0], handR: [2.4, 0, 0], head: [0.6, 0, 0] };
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
        if (this.cfg.phase2 && !this.phase2 && this.hp <= this.maxHp * 0.55) {
          this.phase2 = true; this.atkSpeed = 1.12; this.trackMul = 1.2;
          this.lastMove = 'roar';
          this.startAttack(this.moves.roar);
          this.game.ui.toast('', 0);
          break;
        }
        this.gap -= dt;
        const behind = Math.abs(angDiff(this.yaw, toP)) > 1.5;
        // duelists roll the dice once per player swing to sidestep it
        if (this.cfg.evade && p.state === 'attack' && p.atk !== this.seenAtk) {
          this.seenAtk = p.atk;
          if (this.evadeCd <= 0 && dist < 3 && p.atk.t < 0.25 && Math.random() < 0.5) {
            this.evadeCd = 2.2; this.lastMove = 'evade'; this.counterAtk = false;
            this.startAttack(this.moves.evade);
            break;
          }
        }
        // punish healing at mid range
        const punish = p.state === 'heal' && dist < 9 && this.gap < 0.6;
        if (this.gap <= 0 || punish || (behind && dist < 3 && this.gap < 0.5)) {
          const m = punish ? this.cfg.punish(this, dist) : this.chooseMove(dist, behind);
          if (m) {
            this.lastMove = m;
            if (m === 'leap') this.leapCd = this.cfg.leapCd || 7;
            if (m === 'ember') this.emberCd = 9;
            this.counterAtk = this.counter; this.counter = false;
            this.startAttack(this.moves[m]);
            break;
          }
        }
        // movement: close distance, otherwise slow circle
        const walk = (this.phase2 ? 1.22 : 1) * this.cfg.walk;
        let mx = 0, mz = 0, sp = 0;
        const dx = Math.sin(toP), dz = Math.cos(toP);
        if (dist > 2.6) { mx = dx; mz = dz; sp = dist > 9 ? walk * 1.5 : walk; }
        else {
          this.strafeT -= dt;
          if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 1.5; this.strafe = -this.strafe; }
          mx = -dz * this.strafe; mz = dx * this.strafe; sp = walk * 0.5;
        }
        sp *= this.status.slow() * this.spdScale;
        this.move(mx * sp * dt, mz * sp * dt);
        this.speed += (sp - this.speed) * Math.min(1, dt * 6);
        this.turnToward(toP, 3.2, dt);
        this.phase += dt * (2 + this.speed * 1.4);
        pose = loco(this.speed / 4.5);
        break;
      }
      case 'attack': {
        const d = this.atk.def;
        const adt = dt * this.attackRate();
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
            this.y = Math.sin(u * Math.PI) * (this.cfg.leapH || 5.5);
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
          const g = this.phase2 ? [0.25, 0.8] : this.cfg.gap;
          this.gap = d.evade ? 0.05 : g[0] + Math.random() * (g[1] - g[0]);
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
    if (this.state === 'attack' && this.atk.def.evade && this.atk.t < 0.4) return 'none'; // sidestepped
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
    this.game.onBossDeath(this);
  }
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

// ---------- Brother Hask, the Pit Executioner (mini boss) ----------
// Lighter and faster than Varek: short windups, a 3-hit flurry, a delayed chop,
// an unparryable shoulder charge and a short hop slam. No second phase.
export const HASK_MOVES = {
  chop: {
    parry: true, dur: 1.4, track: [0.48, 4.2], sfx: [0.48, 'heavySwing'], trail: [0.5, 0.68],
    keys: [[0.48, SW_WIND], [0.64, SW_STRIKE], [1.0, SW_STRIKE]],
    hits: [{ t0: 0.52, t1: 0.66, range: 3.7, arc: 2.7, dmg: 24, poise: 30 }],
    move: [[0.42, 0.64, 1.2]], stopAt: 1.3,
  },
  flurry: {
    parry: true, dur: 2.2, track: [0.45, 4.2], tracks: [[0.72, 0.92, 4], [1.12, 1.32, 4]], sfx: [0.45, 'heavySwing'], trail: [0.47, 1.52],
    keys: [[0.45, SW_WIND], [0.6, SW_STRIKE], [0.92, BH_WIND], [1.04, BH_STRIKE], [1.32, SW_WIND], [1.46, SW_STRIKE], [1.85, SW_STRIKE]],
    hits: [
      { t0: 0.5, t1: 0.62, range: 3.7, arc: 2.7, dmg: 17, poise: 25 },
      { t0: 0.95, t1: 1.06, range: 3.7, arc: 2.7, dmg: 17, poise: 25 },
      { t0: 1.36, t1: 1.48, range: 3.8, arc: 2.7, dmg: 22, poise: 30 },
    ],
    move: [[0.4, 0.6, 0.8], [0.88, 1.04, 0.8], [1.3, 1.46, 0.9]], stopAt: 1.3,
    onTime: [{ t: 0.92, fn: (b, g) => g.audio.play('swing', 1) }, { t: 1.32, fn: (b, g) => g.audio.play('heavySwing', 0.9) }],
  },
  overhead: {
    dur: 1.95, track: [0.9, 3.5], sfx: [0.96, 'heavySwing'], trail: [0.98, 1.12],
    keys: [[0.42, OH_RAISE], [0.96, OH_HOLD], [1.07, OH_STRIKE], [1.5, OH_STRIKE]],
    hits: [{ t0: 1.0, t1: 1.1, range: 3.9, arc: 0.95, dmg: 34, poise: 50, knock: 'heavy' }],
    move: [[0.9, 1.06, 0.8]], stopAt: 1.3,
    onTime: [{ t: 1.07, fn: impact(3.2, 0.45) }],
  },
  charge: {
    dur: 1.7, unparryable: true, track: [0.5, 5], trail: [0.55, 0.85],
    keys: [[0.5, TH_WIND], [0.72, { ...TH_STRIKE, armR: [-0.5, 0, -0.5], foreR: [-0.8, 0, 0], torso: [0.6, -0.6, 0] }], [1.15, TH_STRIKE]],
    hits: [{ t0: 0.55, t1: 0.86, shape: 'circle', offset: 0.9, radius: 1.25, dmg: 22, poise: 40, knockback: 11 }],
    move: [[0.52, 0.86, 7.5]], stopAt: 0.9,
    onTime: [{ t: 0.05, fn: (b) => b.glint(true) }, { t: 0.55, fn: (b, g) => { g.fx.dust(b.pos, 8, 1.2); g.audio.play('roll', 1); } }],
  },
  leap: {
    dur: 2.25, unparryable: true, track: [0.45, 6], trail: [0.95, 1.15], leap: [0.45, 1.05],
    keys: [[0.4, CROUCH], [0.6, AIR], [0.98, AIR], [1.08, OH_STRIKE], [1.7, OH_STRIKE]],
    hits: [{ t0: 1.05, t1: 1.14, shape: 'circle', offset: 0.6, radius: 2.7, dmg: 30, poise: 60, knock: 'heavy' }],
    onTime: [
      { t: 0.45, fn: (b) => b.beginLeap() },
      { t: 1.06, fn: (b, g) => { g.impact(b.pos.x, b.pos.z, 3.4, 0.6); } },
    ],
  },
  spin: {
    dur: 1.6, unparryable: true, sfx: [0.55, 'heavySwing'], trail: [0.55, 0.9], spin: [0.55, 0.9, -Math.PI * 2],
    keys: [[0.48, { ...SW_WIND, torso: [0.2, 1.2, 0], armR: [-1.45, 0, -0.6] }], [0.6, { ...SW_STRIKE, torso: [0.2, 0, 0], armR: [-1.45, 0, -1.4] }], [0.92, { ...SW_STRIKE, torso: [0.2, 0, 0], armR: [-1.45, 0, -1.4] }], [1.2, SW_STRIKE]],
    hits: [{ t0: 0.57, t1: 0.9, shape: 'circle', offset: 0, radius: 3.6, dmg: 20, poise: 40, knockback: 11 }],
    onTime: [{ t: 0.05, fn: (b) => b.glint(true) }],
  },
};

const HASK_WEIGHTS = (b, d, behind) => {
  const w = [];
  const near = d < 2.8, mid = d >= 2.2 && d < 7.5;
  if (behind && d < 3.2) w.push(['spin', b.lastMove === 'spin' ? 2 : 6]);
  if (near) { w.push(['chop', 3]); w.push(['flurry', 3]); w.push(['overhead', 2]); }
  if (mid) w.push(['charge', near ? 0.5 : 2.5]);
  if (d > 5 && b.leapCd <= 0) w.push(['leap', d > 8 ? 5 : 2]);
  return w.map(([n, x]) => [n, n === b.lastMove ? x * 0.3 : x]);
};

export const BOSSES = {
  varek: {
    id: 'varek', name: 'Varek, the Ashen Warden', hp: 1300, poise: 170, radius: 1.05, walk: 2.2, gap: [0.45, 1.2],
    phase2: true, moves: BOSS_MOVES, weights: VAREK_WEIGHTS,
    punish: (b, dist) => (dist > 4 ? (b.leapCd <= 0 && dist > 6 ? 'leap' : 'thrust') : 'sweep'),
    model: { scale: 2.1, cloth: 0x2a2624, armor: 0x3c3c44, accent: 0x5a1a14, skin: 0x5a5048, head: 'horned', weapon: 'greatsword', eyes: 0xffb040, pauldrons: true, cape: true, bulk: 1.25 },
  },
  hask: {
    id: 'hask', name: 'Brother Hask, the Pit Executioner', hp: 700, poise: 115, radius: 0.8, walk: 3.0, gap: [0.3, 0.9],
    phase2: false, kneels: false, moves: HASK_MOVES, weights: HASK_WEIGHTS, leapH: 3.2, leapR: 2.7, leapAir: 0.6, leapCd: 6,
    punish: (b, dist) => (dist > 4 ? (b.leapCd <= 0 && dist > 5 ? 'leap' : 'charge') : 'chop'),
    model: { scale: 1.55, cloth: 0x2a221c, armor: 0x4a3a30, accent: 0x161210, skin: 0x7a6a5a, head: 'hood', weapon: 'axe', eyes: 0xff4a2a, bulk: 1.3 },
  },
};

// ---------- Sister Vael, the Twin Fang (mini boss) ----------
// Fast duelist: sidesteps some of your attacks, then punishes with lunges and dives.
const BACKSTEP = { torso: [-0.2, 0, 0], legL: [-0.6, 0, 0], legR: [0.4, 0, 0], shinL: [0.4, 0, 0], shinR: [0.7, 0, 0], armL: [0.3, 0, 0.5], armR: [0.3, 0, -0.5], by: -0.15 };
export const VAEL_MOVES = {
  slash2: {
    parry: true, dur: 1.05, track: [0.32, 6], tracks: [[0.46, 0.6, 6]], sfx: [0.32, 'swing'], trail: [0.34, 0.74],
    keys: [[0.32, SW_WIND], [0.44, SW_STRIKE], [0.6, BH_WIND], [0.7, BH_STRIKE], [0.9, BH_STRIKE]],
    hits: [{ t0: 0.36, t1: 0.46, range: 2.4, arc: 2.4, dmg: 14, poise: 18 }, { t0: 0.62, t1: 0.72, range: 2.4, arc: 2.4, dmg: 14, poise: 18 }],
    move: [[0.28, 0.44, 0.9], [0.55, 0.7, 0.8]], stopAt: 0.9,
    onTime: [{ t: 0.6, fn: (b, g) => g.audio.play('swing', 1) }],
  },
  flurry: {
    parry: true, dur: 1.75, track: [0.38, 6], tracks: [[0.5, 0.6, 6], [0.72, 0.82, 6], [0.94, 1.05, 6]], sfx: [0.38, 'swing'], trail: [0.38, 1.25],
    keys: [[0.38, SW_WIND], [0.48, SW_STRIKE], [0.6, BH_WIND], [0.7, BH_STRIKE], [0.82, SW_WIND], [0.92, SW_STRIKE], [1.02, { ...SW_WIND, torso: [0.2, 1.3, 0] }], [1.18, { ...SW_STRIKE, torso: [0.3, -0.4, 0], armR: [-1.45, 0, -1.4] }], [1.45, SW_STRIKE]],
    hits: [
      { t0: 0.4, t1: 0.5, range: 2.4, arc: 2.4, dmg: 11, poise: 14 },
      { t0: 0.62, t1: 0.72, range: 2.4, arc: 2.4, dmg: 11, poise: 14 },
      { t0: 0.84, t1: 0.94, range: 2.4, arc: 2.4, dmg: 11, poise: 14 },
      { t0: 1.1, t1: 1.2, shape: 'circle', offset: 0, radius: 2.7, dmg: 18, poise: 30, parry: false },
    ],
    move: [[0.35, 0.95, 1.8]], stopAt: 0.9,
    onTime: [0.6, 0.82, 1.08].map((t) => ({ t, fn: (b, g) => g.audio.play('swing', 0.9) })),
  },
  lunge: {
    dur: 1.3, unparryable: true, track: [0.42, 6], trail: [0.45, 0.62], sfx: [0.44, 'swing'],
    keys: [[0.42, TH_WIND], [0.58, TH_STRIKE], [0.95, TH_STRIKE]],
    hits: [{ t0: 0.45, t1: 0.62, shape: 'circle', offset: 0.8, radius: 1.05, dmg: 20, poise: 30 }],
    move: [[0.42, 0.62, 7]], stopAt: 0.8,
    onTime: [{ t: 0.05, fn: (b) => b.glint(true) }, { t: 0.44, fn: (b, g) => g.fx.dust(b.pos, 6, 0.8) }],
  },
  leap: {
    dur: 1.8, unparryable: true, track: [0.35, 7], trail: [0.75, 0.95], leap: [0.35, 0.85],
    keys: [[0.32, CROUCH], [0.5, AIR], [0.8, AIR], [0.9, OH_STRIKE], [1.35, OH_STRIKE]],
    hits: [{ t0: 0.85, t1: 0.93, shape: 'circle', offset: 0.5, radius: 2.2, dmg: 24, poise: 50, knock: 'heavy' }],
    onTime: [{ t: 0.35, fn: (b) => b.beginLeap() }, { t: 0.86, fn: (b, g) => g.impact(b.pos.x, b.pos.z, 2.6, 0.4) }],
  },
  spin: {
    dur: 1.2, unparryable: true, sfx: [0.4, 'swing'], trail: [0.4, 0.7], spin: [0.4, 0.7, -Math.PI * 2],
    keys: [[0.35, { ...SW_WIND, torso: [0.2, 1.2, 0] }], [0.45, { ...SW_STRIKE, torso: [0.2, 0, 0], armR: [-1.45, 0, -1.4], armL: [-1.45, 0, 1.4] }], [0.72, { ...SW_STRIKE, torso: [0.2, 0, 0], armR: [-1.45, 0, -1.4], armL: [-1.45, 0, 1.4] }], [0.95, SW_STRIKE]],
    hits: [{ t0: 0.42, t1: 0.7, shape: 'circle', offset: 0, radius: 2.8, dmg: 14, poise: 30, knockback: 9 }],
    onTime: [{ t: 0.05, fn: (b) => b.glint(true) }],
  },
  // sidestep away from an incoming swing (brief invulnerability), then counter
  evade: {
    dur: 0.55, evade: true,
    keys: [[0.1, BACKSTEP], [0.4, BACKSTEP]],
    move: [[0.02, 0.32, -3.6]],
    onTime: [{ t: 0.02, fn: (b, g) => { g.fx.dust(b.pos, 6, 0.8); g.audio.play('roll', 0.8); } }],
  },
};
const VAEL_WEIGHTS = (b, d, behind) => {
  const w = [];
  if (behind && d < 2.6) w.push(['spin', b.lastMove === 'spin' ? 2 : 6]);
  if (d < 2.2) { w.push(['slash2', 3]); w.push(['flurry', 2.5]); }
  if (d >= 1.8 && d < 7) w.push(['lunge', b.lastMove === 'evade' ? 6 : 3]);
  if (d > 5 && b.leapCd <= 0) w.push(['leap', d > 8 ? 5 : 2.5]);
  return w.map(([n, x]) => [n, n === b.lastMove ? x * 0.3 : x]);
};

// ---------- Gorrath, the Slag Colossus (mini boss) ----------
// Slow giant: huge unparryable slams and sweeps, a rear stomp, and thrown boulders at range.
// His quick backhand swat is the one parryable move.
export const GORRATH_MOVES = {
  swat: {
    parry: true, dur: 1.4, track: [0.42, 3.2], sfx: [0.42, 'heavySwing'], trail: [0.44, 0.6],
    keys: [[0.42, BH_WIND], [0.56, BH_STRIKE], [0.95, BH_STRIKE]],
    hits: [{ t0: 0.46, t1: 0.58, range: 3.9, arc: 2.4, dmg: 22, poise: 35, knockback: 8 }],
    move: [[0.4, 0.56, 0.6]], stopAt: 1.8,
  },
  slam: {
    dur: 2.35, unparryable: true, track: [1.0, 2.2], sfx: [1.04, 'heavySwing'], trail: [1.06, 1.24],
    keys: [[0.8, OH_RAISE], [1.05, OH_HOLD], [1.18, OH_STRIKE], [1.8, OH_STRIKE]],
    hits: [{ t0: 1.15, t1: 1.25, shape: 'circle', offset: 3.0, radius: 2.2, dmg: 40, poise: 70, knock: 'heavy' }],
    move: [[1.0, 1.16, 0.6]],
    onTime: [{ t: 0.1, fn: (b) => b.glint(true) }, { t: 1.18, fn: (b, g) => { const f = b.fwd(); g.impact(b.pos.x + f.x * 3, b.pos.z + f.z * 3, 4, 0.8); } }],
  },
  sweep: {
    dur: 2.05, unparryable: true, track: [0.8, 2.4], sfx: [0.86, 'heavySwing'], trail: [0.88, 1.08],
    keys: [[0.85, SW_WIND], [1.05, SW_STRIKE], [1.5, SW_STRIKE]],
    hits: [{ t0: 0.9, t1: 1.06, range: 4.3, arc: 3.0, dmg: 30, poise: 50, knockback: 12 }],
    move: [[0.8, 1.05, 0.8]],
    onTime: [{ t: 0.1, fn: (b) => b.glint(true) }],
  },
  stomp: {
    dur: 1.45, unparryable: true, track: [0.1, 1], sfx: [0.66, 'slam'],
    keys: [[0.55, { legL: [-1.3, 0, 0.1], shinL: [1.2, 0, 0], torso: [-0.25, 0, 0], armL: [-0.5, 0, 0.8], armR: [-0.3, 0, -0.8], by: 0.12 }],
      [0.68, { legL: [-0.3, 0, 0.1], shinL: [0.2, 0, 0], torso: [0.3, 0, 0], armL: [-0.2, 0, 0.5], armR: [-0.2, 0, -0.5], by: -0.25 }]],
    hits: [{ t0: 0.66, t1: 0.74, shape: 'circle', offset: 0, radius: 3.3, dmg: 18, poise: 50, knock: 'heavy' }],
    onTime: [
      { t: 0.1, fn: (b, g) => { b.tele = g.fx.telegraph(b.pos.x, b.pos.z, 3.3, 0.56); } },
      { t: 0.68, fn: (b, g) => g.impact(b.pos.x, b.pos.z, 3.6, 0.5) },
    ],
  },
  hurl: {
    dur: 2.0, unparryable: true, track: [0.95, 3],
    keys: [[0.8, { ...OH_RAISE, armL: [-3.0, 0, 0.3] }], [1.02, { ...TH_STRIKE, armL: [-1.5, 0, 0.2], armR: [-1.5, 0, -0.2] }], [1.5, TH_STRIKE]],
    onTime: [
      { t: 0.3, fn: (b, g) => g.audio.play('roar', 0.3) },
      { t: 1.0, fn: (b, g) => g.spawnRock(b) },
    ],
  },
};
const GORRATH_WEIGHTS = (b, d, behind) => {
  const w = [];
  if (behind && d < 3.6) w.push(['stomp', b.lastMove === 'stomp' ? 2 : 7]);
  if (d < 3.2) { w.push(['swat', 3]); w.push(['slam', 2.2]); w.push(['sweep', 2.2]); }
  if (d >= 3.2 && d < 6) w.push(['slam', 1.2]);
  if (d >= 4.5) w.push(['hurl', b.lastMove === 'hurl' ? 1 : 3.5]);
  return w.map(([n, x]) => [n, n === b.lastMove ? x * 0.3 : x]);
};

Object.assign(BOSSES, {
  vael: {
    id: 'vael', name: 'Sister Vael, the Twin Fang', hp: 540, poise: 75, radius: 0.6, walk: 3.6, gap: [0.25, 0.7],
    phase2: false, kneels: false, evade: true, moves: VAEL_MOVES, weights: VAEL_WEIGHTS, leapH: 3.5, leapR: 2.2, leapAir: 0.5, leapCd: 5,
    punish: (b, dist) => (dist > 4 ? (b.leapCd <= 0 && dist > 5 ? 'leap' : 'lunge') : 'slash2'),
    model: { scale: 1.25, cloth: 0x2a2a3a, armor: 0x4a4a5a, accent: 0x5a5a9a, skin: 0xb8a090, head: 'hood', weapon: 'daggers', eyes: 0xa0c8ff, cape: true, bulk: 0.95 },
  },
  gorrath: {
    id: 'gorrath', name: 'Gorrath, the Slag Colossus', hp: 980, poise: 230, radius: 1.15, walk: 1.9, gap: [0.6, 1.4],
    phase2: false, kneels: false, moves: GORRATH_MOVES, weights: GORRATH_WEIGHTS,
    punish: (b, dist) => (dist > 4 ? 'hurl' : 'swat'),
    model: { scale: 2.0, cloth: 0x3a3a2a, armor: 0x4a4a3a, accent: 0x2a2a1a, skin: 0x5a6a4a, head: 'horned', weapon: 'maul', eyes: 0x8aff4a, bulk: 1.5, pauldrons: true },
  },
});
