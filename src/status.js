// Elden Ring-style status buildup. Elemental damage adds buildup to a meter (enemies show an icon while a status
// is building, players see theirs over the health bar); when the meter passes the threshold the effect procs and
// the meter resets. After its first proc, a status takes twice the buildup on that enemy or player.
import { NUM } from './scale.js';

export const STATUS = {
  bleed: { name: 'Bleed', color: '#c0262a', rgb: [0.85, 0.08, 0.08], desc: 'Bleed damage builds it up. When full: a burst of blood dealing a big chunk of max HP.' },
  poison: { name: 'Poison', color: '#6aa832', rgb: [0.4, 0.75, 0.2], desc: 'Poison damage builds it up. When full: slow damage over 10 seconds.' },
  frost: { name: 'Frost', color: '#7ac8ff', rgb: [0.55, 0.85, 1], desc: 'Frost damage builds it up. When full: a damage burst, and the enemy is slowed (movement and attacks) for 6 seconds.' },
  fire: { name: 'Fire', color: '#ff7a1a', rgb: [1, 0.45, 0.08], desc: 'Fire damage builds it up. When full: they burn — fast damage over 3.5 seconds.' },
};
export const STATUS_KEYS = Object.keys(STATUS);
export const HIT_MAX = 0.15; // the most of an enemy's meter one hit can fill (so even huge elemental damage takes 7+ hits)

// fraction of max HP (normal enemies / bosses) + flat
const FX = {
  bleed: { pct: 0.15, bossPct: 0.08, flat: 45 * NUM },
  frost: { pct: 0.1, bossPct: 0.06, flat: 25 * NUM, slowDur: 6, slow: 0.65 },
  poison: { dur: 10, pct: 0.2, bossPct: 0.1, flat: 60 * NUM },
  fire: { dur: 3.5, pct: 0.25, bossPct: 0.105, flat: 50 * NUM },
};
// on players: share of max HP
const PFX = {
  bleed: { pct: 0.15 },
  frost: { pct: 0.06, slowDur: 4, slow: 0.65 },
  poison: { dur: 10, pct: 0.15 },
  fire: { dur: 3.5, pct: 0.15 },
};

export class StatusState {
  constructor(actor, resist) {
    this.a = actor;
    this.base = resist;
    this.resist = {};
    for (const k of STATUS_KEYS) this.resist[k] = resist;
    this.meter = { bleed: 0, poison: 0, frost: 0, fire: 0 };
    this.idle = 0;
    this.dots = {}; // poison / fire: { t, dps }
    this.procd = {}; this.procAt = {}; this.hitAt = {};
    this.frostT = 0;
  }

  reset(resist) {
    if (resist) this.base = resist;
    for (const k of STATUS_KEYS) { this.meter[k] = 0; this.resist[k] = this.base; }
    this.procd = {}; this.procAt = {}; this.hitAt = {};
    this.dots = {}; this.frostT = 0; this.idle = 0;
  }

  slow() { return this.frostT > 0 ? (this.a.isPlayer ? PFX : FX).frost.slow : 1; }

  add(kind, amount, game) {
    if (!this.a.alive) return;
    if (this.a.puppet) { game.mp.send({ t: 'status', id: this.a.netId, kind, amount }); return; }
    this.idle = 0;
    if (!this.a.isPlayer) amount = Math.min(amount, this.base * HIT_MAX); // one hit fills at most 15% of an enemy's first meter (so the doubled one takes twice the hits)
    this.meter[kind] += amount;
    if (amount > 0) this.hitAt[kind] = performance.now(); // (the HUD icon flashes)
    if (this.meter[kind] >= this.resist[kind]) {
      this.meter[kind] = 0;
      this.proc(kind, game);
      this.procAt[kind] = performance.now();
      if (!this.procd[kind]) { this.procd[kind] = true; this.resist[kind] *= 2; } // twice as hard after the first
    }
  }

  proc(kind, game) {
    const a = this.a, boss = a.isBoss, f = FX[kind];
    if (a.isPlayer) return this.procPlayer(kind, game);
    const chest = { x: a.pos.x, y: 1.2 * a.rig.root.scale.y + a.y, z: a.pos.z };
    const pct = boss ? f.bossPct : f.pct;
    if (kind === 'bleed' || kind === 'frost') {
      const dmg = a.maxHp * pct + f.flat;
      game.statusDamage(a, dmg, false, kind);
      if (kind === 'bleed') game.audio.play('riposte');
      else { this.frostT = f.slowDur; game.audio.play('clang', 0.7); }
    } else {
      this.dots[kind] = { t: f.dur, dps: (a.maxHp * pct + f.flat) / f.dur };
      game.audio.play(kind === 'fire' ? 'fire' : 'hurt', 0.6);
    }
    // the burst and its popup show on every screen
    game.vfx('statusProc', { e: a.netId }, kind);
  }

  procPlayer(kind, game) {
    const a = this.a, f = PFX[kind];
    if (kind === 'bleed' || kind === 'frost') {
      game.statusDamage(a, a.maxHp * f.pct, false, kind);
      if (kind === 'frost') this.frostT = f.slowDur;
      game.audio.play(kind === 'bleed' ? 'riposte' : 'clang', 0.7);
    } else {
      this.dots[kind] = { t: f.dur, dps: (a.maxHp * f.pct) / f.dur };
      game.audio.play(kind === 'fire' ? 'fire' : 'hurt', 0.6);
    }
    game.vfx('statusProc', game.myRef(), kind);
  }

  update(dt, game) {
    const a = this.a;
    this.idle += dt;
    if (this.idle > 2.5) for (const k of STATUS_KEYS) this.meter[k] = Math.max(0, this.meter[k] - 15 * dt);
    if (this.frostT > 0) {
      this.frostT -= dt;
      if (a.alive && Math.random() < dt * 14) game.fx.add.spawn({ x: a.pos.x + (Math.random() - 0.5) * 0.8, y: 0.2 + Math.random() * 1.6 * a.rig.root.scale.y, z: a.pos.z + (Math.random() - 0.5) * 0.8, vy: 0.4, life: 0.7, size: 0.16, size1: 0.03, r: 0.6, g: 0.85, b: 1 });
    }
    for (const k of ['poison', 'fire']) {
      const d = this.dots[k];
      if (!d) continue;
      d.t -= dt;
      if (d.t <= 0 || !a.alive) { delete this.dots[k]; continue; }
      game.statusDamage(a, d.dps * dt, true, k);
      if (Math.random() < dt * (k === 'fire' ? 30 : 10)) {
        const p = { x: a.pos.x + (Math.random() - 0.5) * 0.6, y: 0.3 + Math.random() * 1.4 * a.rig.root.scale.y, z: a.pos.z + (Math.random() - 0.5) * 0.6 };
        if (k === 'fire') game.fx.flame(p, 0.6);
        else game.fx.norm.spawn({ ...p, vy: 0.6, life: 0.9, size: 0.35, size1: 0.6, r: 0.35, g: 0.6, b: 0.15, alpha: 0.6, drag: 1 });
      }
    }
  }

  // meters to draw (0..1), only those with buildup
  bars() {
    const out = [];
    const now = performance.now();
    for (const k of STATUS_KEYS) {
      const flash = now - (this.procAt[k] || -1e9) < 600, hit = now - (this.hitAt?.[k] || -1e9) < 260;
      if (this.meter[k] > 0.5 || flash) out.push({ k, v: Math.min(1, this.meter[k] / this.resist[k]), flash, hit });
    }
    return out;
  }
}
