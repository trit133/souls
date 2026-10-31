// Elden Ring-style status buildup. Each hit from an infused weapon adds buildup to a
// per-enemy meter; when the meter passes the enemy's resistance the effect procs and
// the meter resets. Meters decay after a few seconds without buildup. Bosses get
// tougher (resistance x1.3) after every proc, like ER's rising resistance.

export const STATUS = {
  bleed: { name: 'Bleed', color: '#c0262a', rgb: [0.85, 0.08, 0.08], desc: 'Builds up per hit. When full: a burst of blood dealing a big chunk of max HP.' },
  poison: { name: 'Poison', color: '#6aa832', rgb: [0.4, 0.75, 0.2], desc: 'Builds up per hit. When full: slow damage over 10 seconds.' },
  frost: { name: 'Frost', color: '#7ac8ff', rgb: [0.55, 0.85, 1], desc: 'Builds up per hit. When full: a damage burst, and the enemy is slowed (movement and attacks) for 6 seconds.' },
  fire: { name: 'Fire', color: '#ff7a1a', rgb: [1, 0.45, 0.08], desc: 'Builds up per hit. When full: they burn — fast damage over 3.5 seconds.' },
};
export const STATUS_KEYS = Object.keys(STATUS);

// fraction of max HP (normal enemies / bosses) + flat
const FX = {
  bleed: { pct: 0.15, bossPct: 0.08, flat: 45 },
  frost: { pct: 0.1, bossPct: 0.06, flat: 25, slowDur: 6, slow: 0.65 },
  poison: { dur: 10, pct: 0.2, bossPct: 0.1, flat: 60 },
  fire: { dur: 3.5, pct: 0.25, bossPct: 0.105, flat: 50 },
};

export class StatusState {
  constructor(actor, resist) {
    this.a = actor;
    this.resist = {};
    for (const k of STATUS_KEYS) this.resist[k] = resist;
    this.meter = { bleed: 0, poison: 0, frost: 0, fire: 0 };
    this.idle = 0;
    this.dots = {}; // poison / fire: { t, dps }
    this.frostT = 0;
  }

  reset(resist) {
    for (const k of STATUS_KEYS) { this.meter[k] = 0; if (resist) this.resist[k] = resist; }
    this.dots = {}; this.frostT = 0; this.idle = 0;
  }

  slow() { return this.frostT > 0 ? FX.frost.slow : 1; }

  add(kind, amount, game) {
    if (!this.a.alive) return;
    if (this.a.puppet) { game.mp.send({ t: 'status', id: this.a.netId, kind, amount }); return; }
    this.idle = 0;
    this.meter[kind] += amount;
    if (this.meter[kind] >= this.resist[kind]) {
      this.meter[kind] = 0;
      this.proc(kind, game);
      if (this.a.isBoss) this.resist[kind] *= 1.3;
    }
  }

  proc(kind, game) {
    const a = this.a, boss = a.isBoss, f = FX[kind];
    const chest = { x: a.pos.x, y: 1.2 * a.rig.root.scale.y + a.y, z: a.pos.z };
    const pct = boss ? f.bossPct : f.pct;
    if (kind === 'bleed' || kind === 'frost') {
      const dmg = a.maxHp * pct + f.flat;
      game.statusDamage(a, dmg);
      if (kind === 'bleed') {
        game.fx.blood(chest, null, 40);
        game.fx.burst(chest, 30, STATUS.bleed.rgb, 6, 0.7, 0.3);
        game.audio.play('riposte');
      } else {
        this.frostT = f.slowDur;
        game.fx.burst(chest, 36, STATUS.frost.rgb, 5, 0.9, 0.3);
        game.audio.play('clang', 0.7);
      }
    } else {
      this.dots[kind] = { t: f.dur, dps: (a.maxHp * pct + f.flat) / f.dur };
      game.fx.burst(chest, 22, STATUS[kind].rgb, 3.5, 0.8, 0.28);
      game.audio.play(kind === 'fire' ? 'fire' : 'hurt', 0.6);
    }
    game.statusPopup(a, STATUS[kind].name.toUpperCase(), STATUS[kind].color);
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
      game.statusDamage(a, d.dps * dt, true);
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
    for (const k of STATUS_KEYS) if (this.meter[k] > 0.5) out.push({ k, v: Math.min(1, this.meter[k] / this.resist[k]) });
    return out;
  }
}
