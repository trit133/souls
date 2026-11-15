// The training ring's summoning pads (modules.js TRAINING_ARENA lays them): stand on one for 3 s and an enemy is
// called into the ring across from it, at the other end of the dummy: the amber pad a small one (a Zealot, a Pike
// Zealot, a Needle Gunner, a Sump Wretch, a Hook Warden, a Torcher, a Flagellant, an Augur), the red pad a big one (a
// War Servitor, a Bilge Hulk, a Spire Castellan, a Bell-Warden). One a stand: step off and back on for another. At
// most MAX in the ring at once. They fight for real but are worth nothing: no gold, emeralds, hearts or quest kills
// (main.js onEnemyKilled skips a trainee).
import { Enemy, TYPES } from './enemies.js';
import { rollDefenses } from './defenses.js';

export const PAD_HOLD = 3, MAX_TRAINEES = 6;
const POOLS = {
  small: ['grunt', 'spear', 'archer', 'wretch', 'hook', 'torcher', 'flagellant', 'augur'],
  large: ['brute', 'hulk', 'castellan', 'bellwarden'],
};
const NAMES = { grunt: 'Zealot', spear: 'Pike Zealot', archer: 'Needle Gunner', brute: 'War Servitor' };
export const foeName = (type) => NAMES[type] || TYPES[type]?.name || type;

export class TrainPads {
  constructor(game) { this.game = game; this.n = 0; }

  get pads() { return this.game.world.trainPads || []; }
  trainees() { return this.game.enemies.filter((e) => e.trainee && e.alive); }

  // each frame in the ring: charge the pad you stand on, call the enemy when it's full; returns the prompt line
  update(dt) {
    const p = this.game.player, t = this.game.time;
    let line = null;
    for (const P of this.pads) {
      const on = p?.alive && Math.hypot(p.pos.x - P.x, p.pos.z - P.z) < P.r && Math.abs((p.pos.y || 0) - P.y) < 0.6;
      const full = this.trainees().length >= MAX_TRAINEES;
      if (on && P.armed && !full) {
        P.t += dt;
        line = `Hold still: calling ${P.size === 'large' ? 'a big' : 'a small'} enemy · ${Math.max(0, PAD_HOLD - P.t).toFixed(1)} s`;
        if (P.t >= PAD_HOLD) { this.spawn(P); P.armed = false; P.t = 0; }
      } else if (on) line = full ? `The ring is full (${MAX_TRAINEES}): finish some off first` : 'Step off and back on to call another';
      else { P.t = Math.max(0, P.t - dt * 2); P.armed = true; }
      // the pad lights up as it charges, the rune spinning faster
      const k = P.t / PAD_HOLD;
      P.glow.scale.setScalar(0.15 + 0.85 * k);
      P.glow.material.opacity = 0.18 + 0.55 * k + (on && P.armed ? Math.sin(t * 14) * 0.08 : 0);
      P.rune.rotation.z += dt * (0.4 + 6 * k);
    }
    return line;
  }

  // the enemy comes in across the dummy from the pad, in a red flash, already after you
  spawn(P) {
    const g = this.game, pool = POOLS[P.size].filter((k) => TYPES[k]), type = pool[Math.floor(Math.random() * pool.length)];
    const yaw = Math.atan2(P.x - P.sx, P.z - P.sz);
    const e = new Enemy(g, type, P.sx, P.sz, yaw, { mod: 0, tier: 0, players: 1 });
    e.trainee = true; e.roam = null;
    e.netId = 5000 + this.n++; g.netMap && (g.netMap[e.netId] = e);
    e.def = rollDefenses(Math.random, { type, tier: 0 });
    e.setElems(null);
    g.enemies.push(e);
    e.alert();
    const at = e.pos.clone().setY((e.pos.y || 0) + 0.3);
    g.vfx('redPoof', at); g.fx.dust(e.pos, 14, 1.4); g.fx.addShake(P.size === 'large' ? 0.5 : 0.25);
    g.audio.play(P.size === 'large' ? 'roar' : 'fog', 0.6);
    g.ui.toast(`${foeName(type).toUpperCase()} ANSWERS`, 2);
    return e;
  }
}
