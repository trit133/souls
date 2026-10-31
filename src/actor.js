import * as THREE from 'three';
import { sample, locomotion, P } from './anims.js';

export const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const _v = new THREE.Vector3();

// Common base for player, camp enemies and the boss.
export class Actor {
  constructor(game, rig, o) {
    this.game = game;
    this.rig = rig;
    this.pos = new THREE.Vector3(o.x || 0, 0, o.z || 0);
    this.yaw = o.yaw || 0;
    this.radius = o.radius || 0.45;
    this.maxHp = this.hp = o.hp || 100;
    this.maxPoise = this.poise = o.poise ?? 20;
    this.poiseT = 0;
    this.team = o.team || 'enemy';
    this.state = 'idle';
    this.t = 0;
    this.alive = true;
    this.kb = new THREE.Vector3();
    this.atk = null;
    this.y = 0; // vertical offset (jumps)
    this.trail = null;
    game.scene.add(rig.root);
  }

  fwd(out = _v) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  yawTo(p) { return Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }
  distTo(a) { return Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z); }

  turnToward(yaw, rate, dt) {
    const d = angDiff(this.yaw, yaw);
    const m = rate * dt;
    this.yaw += Math.abs(d) <= m ? d : Math.sign(d) * m;
  }

  setState(s) { this.state = s; this.t = 0; }

  move(dx, dz) {
    if (!dx && !dz) return;
    const w = this.game.world;
    const slow = w.slowAt(this.pos.x, this.pos.z); // bog water
    const to = _to.set(this.pos.x + dx * slow, 0, this.pos.z + dz * slow);
    // enemies and bosses are confined to the module they spawned in
    w.resolve(this.pos, to, this.radius, this.mod ?? null);
    this.pos.x = to.x; this.pos.z = to.z;
  }

  // ----- attacks -----
  // ---------- party play: on guests, enemies are puppets driven by host snapshots ----------
  applySnapshot(s) {
    this.net = { x: s[1], z: s[2], yaw: s[3] };
    if (s[4] !== this.state) { this.state = s[4]; this.t = 0; }
    if (s[5] < this.hp - 0.5) this.rig.flash(1, 0.9, 0.8);
    this.hp = s[5]; this.y = s[8] || 0;
    this.alive = s[4] !== 'dead';
    const def = s[6] ? this.moves[s[6]] : null;
    if (!def) this.atk = null;
    else if (!this.atk || this.atk.def !== def || s[7] < this.atk.t - 0.3) this.atk = { def, t: s[7], hit: new Set() };
    else this.atk.t = s[7];
    if (this.state === 'attack' && !this.atk) this.state = 'chase';
    this.seen = performance.now();
  }

  puppetUpdate(dt, style) {
    this.t += dt;
    if (this.net) {
      const k = 1 - Math.exp(-14 * dt), ox = this.pos.x, oz = this.pos.z;
      this.pos.x += (this.net.x - ox) * k; this.pos.z += (this.net.z - oz) * k;
      this.yaw += angDiff(this.yaw, this.net.yaw) * k;
      this.puppetSpeed = Math.hypot(this.pos.x - ox, this.pos.z - oz) / Math.max(dt, 1e-3);
    }
    if (this.atk) this.atk.t += dt * this.attackRate();
    const base = locomotion(style, this.phase = (this.phase || 0) + dt * (2.5 + (this.puppetSpeed || 0) * 1.6), (this.puppetSpeed || 0) / 4, false, this.game.time);
    let pose = base;
    if (this.state === 'attack' && this.atk) pose = this.attackPose(base);
    else if (this.state === 'dead') pose = P.dead;
    else if (this.state === 'sit' || this.state === 'dormant' || this.state === 'broken') pose = P.rest;
    else if (this.state === 'hurt' || this.state === 'parried' || this.state === 'riposted') pose = { ...base, ...P.stagger };
    if (this.state === 'dead') { this.rig.apply(pose, dt, 8); if (this.t > 4) this.rig.root.visible = false; } else this.syncRig(dt, pose, 18);
    this.trail?.update(dt, !!(this.atk && this.inWindow(this.atk.def.trail)), this.rig.base, this.rig.tip);
  }

  // a guest's hit on a puppet: the host applies the real damage
  puppetHit(info) {
    this.game.mp.send({ t: 'hit', id: this.netId, dmg: info.dmg, poise: info.poise || 0 });
    this.hp = Math.max(1, this.hp - info.dmg);
    this.hpShow = 4;
    this.rig.flash(1, 0.9, 0.8);
    return 'hit';
  }

  startAttack(def) {
    this.atk = { def, t: 0, hit: new Set(), sfx: false, glint: false };
    this.atkKey = this.moves ? Object.keys(this.moves).find((k) => this.moves[k] === def) : null;
    this.setState('attack');
  }

  // Advances the current attack; returns false once finished.
  runAttack(dt, targets, trackYaw = null) {
    const a = this.atk, d = a.def;
    a.t += dt;
    const t = a.t;
    if (trackYaw !== null && d.track && t < d.track[0]) this.turnToward(trackYaw, d.track[1] * (this.trackMul || 1), dt);
    if (trackYaw !== null && d.tracks) for (const [t0, t1, rate] of d.tracks) {
      if (t >= t0 && t < t1) this.turnToward(trackYaw, rate * (this.trackMul || 1), dt);
    }
    if (d.move) for (const [t0, t1, dist] of d.move) {
      const o0 = clamp((t - dt - t0) / (t1 - t0), 0, 1), o1 = clamp((t - t0) / (t1 - t0), 0, 1);
      if (o1 > o0) {
        let step = dist * (o1 - o0);
        // don't plough through the target
        if (d.stopAt && this.target && step > 0 && this.distTo(this.target) < d.stopAt + this.target.radius) step *= 0.1;
        const f = this.fwd(); this.move(f.x * step, f.z * step);
      }
    }
    if (d.sfx && !a.sfx && t >= d.sfx[0]) { a.sfx = true; this.game.audio.play(d.sfx[1], this.sfxVol || 1); }
    if (d.onTime) for (const ev of d.onTime) {
      if (!a['ev' + ev.t] && t >= ev.t) { a['ev' + ev.t] = true; ev.fn(this, this.game); }
      if (this.atk !== a) return false;
    }
    if (d.hits) for (let i = 0; i < d.hits.length; i++) {
      const h = d.hits[i];
      if (t < h.t0 || t - dt > h.t1) continue;
      for (const tg of targets) {
        const key = i + ':' + tg.uid;
        if (!tg.alive || a.hit.has(key)) continue;
        if (this.hitTest(h, tg)) {
          a.hit.add(key);
          this.game.resolveHit(this, tg, h, d);
          if (this.atk !== a) return false; // parried / interrupted mid-swing
        }
      }
    }
    return t < d.dur;
  }

  hitTest(h, tg) {
    const dx = tg.pos.x - this.pos.x, dz = tg.pos.z - this.pos.z;
    if (h.shape === 'circle') {
      const f = this.fwd();
      const cx = this.pos.x + f.x * (h.offset || 0), cz = this.pos.z + f.z * (h.offset || 0);
      return Math.hypot(tg.pos.x - cx, tg.pos.z - cz) <= h.radius + tg.radius;
    }
    const d = Math.hypot(dx, dz);
    if (d > h.range + tg.radius) return false;
    if (d < tg.radius + this.radius * 0.6) return true;
    const ang = Math.abs(angDiff(this.yaw, Math.atan2(dx, dz)));
    return ang <= h.arc / 2 + Math.atan2(tg.radius, d);
  }

  // playback speed of the current attack (enemies/bosses speed up when countering)
  attackRate() { return 1; }

  // The very next hit of the current attack, if it is parryable, plus the real
  // seconds until it lands. Later hits only count once earlier ones have passed.
  nextParry() {
    if (this.state !== 'attack' || !this.atk || !this.atk.def.hits) return null;
    const d = this.atk.def;
    for (let i = 0; i < d.hits.length; i++) {
      const h = d.hits[i];
      if (this.atk.t > h.t0) continue;
      if (!(h.parry ?? d.parry)) return null;
      return { h, i, tth: (h.t0 - this.atk.t) / this.attackRate() };
    }
    return null;
  }

  attackPose(base) { return sample(this.atk.def.keys, this.atk.t, base); }

  inWindow(w, t = this.atk?.t) { return w && t >= w[0] && t <= w[1]; }

  syncRig(dt, pose, rate) {
    this.rig.root.position.set(this.pos.x, this.y, this.pos.z);
    this.rig.root.rotation.y = this.yaw;
    if (this.rig.shadow) {
      this.rig.shadow.position.y = 0.02 - this.y / this.rig.root.scale.y;
      const s = 1 / (1 + this.y * 0.3); this.rig.shadow.scale.setScalar(s);
    }
    this.rig.apply(pose, dt, rate);
  }

  applyKnockback(dt) {
    if (this.kb.lengthSq() < 1e-4) return;
    this.move(this.kb.x * dt, this.kb.z * dt);
    this.kb.multiplyScalar(Math.exp(-8 * dt));
  }

  regenPoise(dt) {
    this.poiseT -= dt;
    if (this.poiseT <= 0) this.poise = Math.min(this.maxPoise, this.poise + this.maxPoise * dt * 0.8);
  }

  remove() { this.game.scene.remove(this.rig.root); this.trail?.dispose(this.game.scene); }
}
const _to = new THREE.Vector3();
