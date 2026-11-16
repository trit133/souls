// Elemental damage shown on the weapon: any element a player deals a fair amount of (skill tree + Infusions),
// or that an enemy carries, puts its pixel effect on the blade. Bleed drips red, fire burns, frost radiates white cold, poison drips green. Two or three at once
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

export const comboName = (key) => (key === ALL ? 'Gilded' : COMBOS[key]?.name || SOLO[key]?.name || '');

const a = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3();
const lerp3 = (c, d, t) => [c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t, c[2] + (d[2] - c[2]) * t];

// how strongly an element burns on the weapon, from how much of it a light hit deals (as the damage numbers show it):
// 0 at the first showing (15), 1 at 200 (the roaring tier), on to 1.5 by 400
// 15-50 a few embers; 50-100 flames licking up the blade and a soft glow; 100-200 fire the length of it, heavy embers
// and smoke; 200+ engulfed: big roaring flames, sparks streaming off, a strong glow. Each swing's trail takes the
// element's colour and, past the first tier, leaves a ribbon of it hanging in the air that burns out (frost: glitter
// that falls and shatters; bleed: a crimson spatter; poison: a drifting green haze)
export const powT = (amt) => Math.max(0, Math.min(1.5, amt <= 200 ? (amt - 15) / 185 : 1 + (amt - 200) / 400));
// a teammate's packed amounts ("f210b40": the first letter of each element and its amount)
const LETTER = { b: 'bleed', f: 'fire', r: 'frost', p: 'poison' };
export const packPow = (pow) => Object.entries(pow || {}).map(([k, v]) => `${k === 'frost' ? 'r' : k[0]}${v}`).join('');
export const unpackPow = (str) => { const out = {}; for (const [, l, n] of String(str || '').matchAll(/([bfrp])(\d+)/g)) out[LETTER[l]] = +n; return out; };
const TRAIL = { fire: [1, 0.12, 0.04], frost: [0.75, 0.92, 1], bleed: [0.65, 0.02, 0.04], poison: [0.4, 0.95, 0.2] };
const _c = new THREE.Color();

export class WeaponFx {
  constructor(game) { this.game = game; this.t = 0; }

  // actor: the local player or a teammate; key: e.g. 'bleed+fire'; pow: how much of each a hit deals (none: the
  // first tier, as an enemy's)
  emit(actor, key, dt, rate = 1, pow = null) {
    if (!key || !actor.rig?.root.visible || !actor.alive) { if (pow || actor._trailTinted) this.trailColor(actor, null, 0); return; }
    const fx = this.game.fx, gold = key === ALL;
    const parts = key.split('+'), look = gold ? null : parts.length > 1 ? COMBOS[key] : SOLO[key];
    const T = {}; let top = 0;
    for (const k of parts) { T[k] = pow ? powT(pow[k] || 15) : 0; top = Math.max(top, T[k]); }
    const motions = new Set(parts.flatMap((k) => MOTION[k]));
    const blades = [[actor.rig.base, actor.rig.tip], [actor.rig.baseL, actor.rig.tipL]].filter(([u, v]) => u && v);
    // the swing: the trail in the element's colour, and the ribbon it leaves behind
    const tcol = gold ? [1, 0.8, 0.2] : parts.length === 1 ? TRAIL[parts[0]] : look.main;
    if (pow) this.trailColor(actor, tcol, Math.min(1, top * 1.4 + 0.15)); // (a player's: an enemy's swing keeps its own)
    if (pow && actor.trailOn && top > 0.15) this.ribbon(actor, blades, parts, T, look, gold, dt, rate);
    actor.wfxAcc = (actor.wfxAcc || 0) + dt * (gold ? 70 : 34) * blades.length * rate * (1 + 2.2 * top);
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
      const el = parts.find((k) => MOTION[k].includes(pick)) || parts[0], t = T[el] || 0;
      if (pick === 'drip') {
        fx.norm.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * t, vy: -0.3 - t * 0.6, vz: (Math.random() - 0.5) * t, life: 0.45 + Math.random() * 0.4, size: 0.1 + t * 0.1, size1: 0.06, r: main[0], g: main[1], b: main[2], grav: 9, alpha: 0.95 });
      } else if (pick === 'bubble') {
        fx.add.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.3, vy: 0.4 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.3, life: 0.4 + t * 0.4, size: 0.08 + t * 0.1, size1: 0.14 + t * 0.25, r: acc[0], g: acc[1], b: acc[2], alpha: 0.6 });
        if (t > 0.5 && Math.random() < 0.3) fx.norm.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.6, vy: 0.3, vz: (Math.random() - 0.5) * 0.6, life: 1.2, size: 0.3, size1: 0.8, r: 0.3, g: 0.6, b: 0.15, drag: 2, alpha: 0.25 }); // (a toxic haze)
      } else if (pick === 'flame') {
        // the fire: taller, bigger, longer-lived the more of it; hot white at the heart past the first tiers
        const c = Math.random() < 0.7 ? main : acc, hot = t > 0.5 && Math.random() < 0.12;
        // (most of a big fire drawn solid, so it stays red and orange rather than blowing out to white)
        const pool = Math.random() < Math.min(0.65, t * 0.6) ? fx.norm : fx.add, deep = pool === fx.norm;
        pool.spawn({ x: p.x + (Math.random() - 0.5) * t * 0.1, y: p.y, z: p.z + (Math.random() - 0.5) * t * 0.1, vx: (Math.random() - 0.5) * (0.4 + t * 0.6), vy: 0.9 + Math.random() * 0.9 + t * 1.8, vz: (Math.random() - 0.5) * (0.4 + t * 0.6),
          life: 0.22 + Math.random() * 0.2 + t * 0.3, size: 0.26 + t * 0.32, size1: 0.04 + t * 0.06, r: hot ? 1 : deep ? Math.min(1, c[0]) : c[0] * 0.8, g: hot ? 0.9 : deep ? c[1] * (0.4 + Math.random() * 0.6) : c[1] * 0.7, b: hot ? 0.5 : deep ? 0.02 : c[2] * 0.6, alpha: deep ? 0.9 : 0.75 });
        if (t > 0.3 && Math.random() < 0.18 * t) fx.add.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 3, vy: 1.5 + Math.random() * 3, vz: (Math.random() - 0.5) * 3, life: 0.6 + Math.random() * 0.5, size: 0.07, size1: 0.02, r: 1, g: 0.85, b: 0.4, grav: -1, drag: 1 }); // (sparks)
        if (t > 0.5 && Math.random() < 0.12) fx.norm.spawn({ x: p.x, y: p.y + 0.2, z: p.z, vx: (Math.random() - 0.5) * 0.3, vy: 0.8 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.3, life: 1 + Math.random(), size: 0.25, size1: 0.7, r: 0.12, g: 0.1, b: 0.09, drag: 1.5, alpha: 0.35 }); // (smoke)
        if (t > 0.25 && Math.random() < 0.15) fx.add.spawn({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0.2, vz: 0, life: 0.18, size: 0.5 + t * 0.4, size1: 0.4, r: c[0] * 0.5, g: c[1] * 0.25, b: c[2] * 0.1, alpha: 0.1 }); // (the glow round it)
      } else {
        // radiate: cold sparkles drifting off the blade in every direction; with more frost, a mist and ice crystals
        const th = Math.random() * Math.PI * 2, ph = (Math.random() - 0.5) * Math.PI;
        const c = Math.random() < 0.6 ? main : acc, sp = 0.5 + Math.random() * 0.5 + t * 0.6;
        fx.add.spawn({ x: p.x, y: p.y, z: p.z, vx: Math.cos(th) * Math.cos(ph) * sp, vy: Math.sin(ph) * sp, vz: Math.sin(th) * Math.cos(ph) * sp, life: 0.4 + Math.random() * 0.3 + t * 0.3, size: 0.13 + t * 0.12, size1: 0.02, r: c[0], g: c[1], b: c[2], drag: 1.5 });
        if (t > 0.4 && Math.random() < 0.25) fx.norm.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.3, vy: -0.15, vz: (Math.random() - 0.5) * 0.3, life: 1.2, size: 0.35, size1: 0.9, r: 0.75, g: 0.88, b: 1, drag: 2, alpha: 0.22 }); // (cold mist)
      }
    }
  }

  // the swing's trail in the element's colour (k: how far from the weapon's own toward it); back to its own without
  trailColor(actor, col, k) {
    const tr = actor.trail; if (!tr?.setColor) return;
    if (actor._trailBase == null) actor._trailBase = tr.baseHex ?? actor.c?.trail ?? 0xffffff;
    if (!col || k <= 0) { if (actor._trailTinted) { tr.setColor(actor._trailBase); actor._trailTinted = false; } return; }
    _c.set(actor._trailBase).lerp(_c.clone().setRGB(col[0], col[1], col[2]), Math.min(1, k));
    tr.setColor(_c.getHex()); actor._trailTinted = true;
  }

  // a swing leaves its element hanging in the air where the blade passed: a ribbon of it along the blade each frame,
  // drifting a little and burning out over a second or so; the more of the element, the denser and bigger
  ribbon(actor, blades, parts, T, look, gold, dt, rate) {
    const fx = this.game.fx;
    for (const [u, v] of blades) {
      u.getWorldPosition(a); v.getWorldPosition(b);
      const el = parts[(Math.random() * parts.length) | 0], t = T[el] || 0, n = Math.ceil((2 + 6 * t) * rate * dt * 60);
      const col = gold ? [1, 0.8, 0.25] : el === 'fire' ? (Math.random() < 0.6 ? [0.95, 0.12, 0.03] : [1, 0.38, 0.06]) : TRAIL[el] || look.main;
      for (let i = 0; i < n; i++) {
        p.copy(a).lerp(b, Math.random());
        const life = 0.6 + Math.random() * 0.5 + t * 0.4;
        if (el === 'fire' || gold) (Math.random() < 0.75 ? fx.norm : fx.add).spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.3, vy: 0.4 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.3, life, size: 0.14 + t * 0.2, size1: 0.02, r: col[0], g: col[1], b: col[2], drag: 1.2, alpha: 0.85 });
        else if (el === 'frost') fx.add.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.4, vy: -0.2 - Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.4, life, size: 0.12 + t * 0.15, size1: 0.02, r: col[0], g: col[1], b: col[2], grav: 1.5, drag: 1 });
        else if (el === 'bleed') fx.norm.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.6, vy: Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.6, life, size: 0.1 + t * 0.12, size1: 0.06, r: col[0], g: col[1], b: col[2], grav: 8, alpha: 0.95 });
        else fx.norm.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.3, vy: 0.15, vz: (Math.random() - 0.5) * 0.3, life: life + 0.4, size: 0.15 + t * 0.2, size1: 0.45 + t * 0.4, r: col[0], g: col[1], b: col[2], drag: 2, alpha: 0.4 });
      }
    }
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    if (g.player) this.emit(g.player, g.player.wfxKey, dt, 1, g.player.wfxPow);
    for (const r of g.mp.peers.values()) this.emit(r, r.s?.w || '', dt, 1, r.s?.wp ? unpackPow(r.s.wp) : null);
    // enemies carrying elements: a lighter version, only near the player
    const me = g.player;
    if (me) for (const e of g.enemies) if (e.wfxKey && e.alive && Math.hypot(e.pos.x - me.pos.x, e.pos.z - me.pos.z) < 22) this.emit(e, e.wfxKey, dt, 0.5);
    for (const b of g.bosses || []) if (b.alive && b.active !== false && b.elems && Math.hypot(b.pos.x - me?.pos.x, b.pos.z - me?.pos.z) < 26) this.emit(b, Object.keys(b.elems).sort().join('+'), dt, 0.6);
  }
}
