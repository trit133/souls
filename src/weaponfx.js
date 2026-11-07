// Status effects shown on the weapon: any status above 5% (skill tree + Infusions) puts its pixel effect on
// the blade. Bleed drips red, fire burns, frost radiates white cold, poison drips green. Two or three at once
// blend into a named combination with its own colours (all the motions together); all four flash gold.
// Particles go through the pixel pass, so they come out as pixel art.
import * as THREE from 'three';

const MOTION = { bleed: ['drip'], fire: ['flame'], frost: ['radiate'], poison: ['drip', 'bubble'] };
const SOLO = {
  bleed: { name: 'Bleed', main: [0.78, 0.04, 0.04], acc: [1, 0.25, 0.2] },
  fire: { name: 'Fire', main: [1, 0.42, 0.06], acc: [1, 0.8, 0.3] },
  frost: { name: 'Frost', main: [0.85, 0.95, 1], acc: [0.55, 0.85, 1] },
  poison: { name: 'Poison', main: [0.35, 0.82, 0.18], acc: [0.6, 1, 0.35] },
};
// every combination of two or three gets its own name and palette
export const COMBOS = {
  'bleed+fire': { name: 'Bloodfire', main: [0.7, 0.03, 0.05], acc: [1, 0.35, 0.05] },
  'bleed+frost': { name: 'Crimson Rime', main: [0.95, 0.3, 0.35], acc: [0.9, 0.97, 1] },
  'bleed+poison': { name: 'Black Blood', main: [0.32, 0.04, 0.12], acc: [0.5, 0.85, 0.15] },
  'fire+frost': { name: 'Frostfire', main: [0.4, 0.75, 1], acc: [1, 0.55, 0.15] },
  'fire+poison': { name: 'Venom Flame', main: [0.55, 0.92, 0.12], acc: [1, 0.55, 0.1] },
  'frost+poison': { name: 'Rime Venom', main: [0.62, 1, 0.72], acc: [0.88, 1, 0.92] },
  'bleed+fire+frost': { name: 'Ember Blood Ice', main: [1, 0.25, 0.45], acc: [0.75, 0.9, 1] },
  'bleed+fire+poison': { name: 'Plague Fire', main: [0.6, 0.12, 0.05], acc: [0.7, 1, 0.2] },
  'bleed+frost+poison': { name: 'Frozen Plague', main: [0.5, 0.15, 0.35], acc: [0.7, 1, 0.85] },
  'fire+frost+poison': { name: 'Elemental Venom', main: [0.35, 1, 0.7], acc: [1, 0.6, 0.2] },
};
const ALL = 'bleed+fire+frost+poison';

export const statusKey = (pct) => ['bleed', 'fire', 'frost', 'poison'].filter((k) => (pct?.[k] || 0) > 5).join('+');
export const comboName = (key) => (key === ALL ? 'Gilded' : COMBOS[key]?.name || SOLO[key]?.name || '');

const a = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3();
const lerp3 = (c, d, t) => [c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t, c[2] + (d[2] - c[2]) * t];

export class WeaponFx {
  constructor(game) { this.game = game; this.t = 0; }

  // actor: the local player or a teammate; key: e.g. 'bleed+fire'
  emit(actor, key, dt) {
    if (!key || !actor.rig?.root.visible || !actor.alive) return;
    const fx = this.game.fx, gold = key === ALL;
    const parts = key.split('+'), look = gold ? null : parts.length > 1 ? COMBOS[key] : SOLO[key];
    const motions = new Set(parts.flatMap((k) => MOTION[k]));
    const blades = [[actor.rig.base, actor.rig.tip], [actor.rig.baseL, actor.rig.tipL]].filter(([u, v]) => u && v);
    actor.wfxAcc = (actor.wfxAcc || 0) + dt * (gold ? 70 : 34) * blades.length;
    while (actor.wfxAcc >= 1) {
      actor.wfxAcc -= 1;
      const [u, v] = blades[(Math.random() * blades.length) | 0];
      u.getWorldPosition(a); v.getWorldPosition(b);
      p.copy(a).lerp(b, 0.15 + Math.random() * 0.85);
      let main, acc;
      if (gold) {
        // all four: flashing gold, strobing to white
        const s = 0.5 + 0.5 * Math.sin(this.t * 22 + Math.random());
        main = lerp3([1, 0.72, 0.12], [1, 1, 0.85], s); acc = lerp3([1, 0.9, 0.4], [1, 0.6, 0.05], s);
      } else { main = look.main; acc = look.acc; }
      const pick = gold ? ['flame', 'radiate', 'radiate', 'drip'][(Math.random() * 4) | 0] : [...motions][(Math.random() * motions.size) | 0];
      if (pick === 'drip') {
        fx.norm.spawn({ x: p.x, y: p.y, z: p.z, vx: 0, vy: -0.3, vz: 0, life: 0.45 + Math.random() * 0.4, size: 0.1, size1: 0.06, r: main[0], g: main[1], b: main[2], grav: 9, alpha: 0.95 });
      } else if (pick === 'bubble') {
        fx.add.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.3, vy: 0.4 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.3, life: 0.4, size: 0.08, size1: 0.14, r: acc[0], g: acc[1], b: acc[2], alpha: 0.6 });
      } else if (pick === 'flame') {
        const c = Math.random() < 0.7 ? main : acc;
        fx.add.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.4, vy: 0.9 + Math.random() * 0.9, vz: (Math.random() - 0.5) * 0.4, life: 0.22 + Math.random() * 0.2, size: 0.3, size1: 0.05, r: c[0], g: c[1], b: c[2], alpha: 0.85 });
      } else {
        // radiate: cold sparkles drifting off the blade in every direction
        const th = Math.random() * Math.PI * 2, ph = (Math.random() - 0.5) * Math.PI;
        const c = Math.random() < 0.6 ? main : acc, sp = 0.5 + Math.random() * 0.5;
        fx.add.spawn({ x: p.x, y: p.y, z: p.z, vx: Math.cos(th) * Math.cos(ph) * sp, vy: Math.sin(ph) * sp, vz: Math.sin(th) * Math.cos(ph) * sp, life: 0.4 + Math.random() * 0.3, size: 0.13, size1: 0.02, r: c[0], g: c[1], b: c[2], drag: 1.5 });
      }
    }
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    if (g.player) this.emit(g.player, g.player.wfxKey, dt);
    for (const r of g.mp.peers.values()) this.emit(r, r.s?.w || '', dt);
  }
}
