// The Shattered March's deeper areas: their own enemies (docs/region1-areas.md). Each is added to the enemy types
// (enemies.js TYPES) and model kits (kits.js KITS) when this module loads (regions.js imports it), so an area's mix
// can name them like any other. Harder than Ashfall Ward's: more health, harder hits, and a trick each.
//
// The Sump Lines: Sump Wretch, Hook Warden, Promethium Torcher, Bilge Hulk (heavy)
// Saint Orsk's Spire: Flagellant, Spire Castellan, Augur, Bell-Warden (heavy)
//
// The hooks a type can carry (enemies.js): heavy (treated as a War Servitor: holds, gold, shoves), elems (its hits
// always carry these), onReceive(e, info) -> info (a guard), rate(e) (attack speed), think(e, dt, p, dist) -> true
// when it acted this frame (a blink).
import * as THREE from 'three';
import { NUM } from './scale.js';
import { TYPES } from './enemies.js';
import { angDiff } from './actor.js';
import { KITS, strip, plate, basic, CLOTH, HEAVY_CLOTH, PLATE } from './kits.js';
import { box, cyl, cone, rbox, pivot } from './mesh.js';

// ---------- shared bits ----------
const V = new THREE.Vector3();
const tipPos = (e) => (e.rig.tip ? e.rig.tip.getWorldPosition(new THREE.Vector3()) : e.pos.clone().setY(1.2));
const turnTo = (k) => (e) => { if (e.target) e.yaw += angDiff(e.yaw, e.yawTo(e.target.pos)) * k; };
const glint = (rgb, sound) => (e, g) => {
  g.fx.burst(tipPos(e), 12, rgb, 2.5, 0.4, 0.45);
  e.rig.flash(rgb[0], rgb[1], rgb[2]);
  if (sound) g.audio.play(sound, 0.3);
};
// events every `step` s from t0 to t1 calling fn(e, g, k) with k 0..1 along the run
const every = (t0, t1, step, fn) => { const out = []; for (let t = t0; t <= t1 + 1e-6; t += step) { const k = (t - t0) / (t1 - t0 || 1); out.push({ t: +t.toFixed(3), fn: (e, g) => fn(e, g, k) }); } return out; };
// a hit landing on every player near (x, z) the way a shot does (blockable, never parried; rolls dodge it):
// for strikes that aren't swings (a lance from the sky, a ring of sound)
const areaHit = (e, g, x, z, test, q) => {
  for (const t of g.allPlayers()) if (t.alive && test(t, Math.hypot(t.pos.x - x, t.pos.z - z))) g.projectileHit(t, { dmg: q.dmg * NUM * (e.dmgScale || 1), knock: q.knock, src: [x, z], elems: e.elems, buildMul: e.elemBuild });
};
// a cone of spray (flame, bile) from the weapon's tip along the way it faces
const spray = (rgb, len, wide, n, add = true) => (e, g) => {
  const f = e.fwd(V).clone(), from = tipPos(e), side = new THREE.Vector3(f.z, 0, -f.x);
  for (let i = 0; i < n; i++) {
    const sp = len * (1.6 + Math.random() * 1.2), s = (Math.random() - 0.5) * wide;
    (add ? g.fx.add : g.fx.norm).spawn({
      x: from.x, y: from.y, z: from.z, vx: (f.x + side.x * s) * sp, vy: (Math.random() - 0.3) * 1.2, vz: (f.z + side.z * s) * sp,
      life: 0.32 + Math.random() * 0.12, size: 0.18, size1: 0.75, r: rgb[0], g: rgb[1] * (0.8 + Math.random() * 0.4), b: rgb[2], drag: 1.2, alpha: add ? 0.85 : 0.7,
    });
  }
};

// a heavy's stomp behind it (as the War Servitor's)
const STOMP = {
  dur: 1.25, range: 3.0, track: [0.1, 1], sfx: [0.6, 'slam'], recover: 0.35, armor: true, unparryable: true, rear: true,
  keys: [
    [0.5, { legL: [-1.3, 0, 0.1], shinL: [1.2, 0, 0], torso: [-0.25, 0, 0], armL: [-0.5, 0, 0.8], armR: [-0.3, 0, -0.8], by: 0.12 }],
    [0.62, { legL: [-0.3, 0, 0.1], shinL: [0.2, 0, 0], torso: [0.3, 0, 0], armL: [-0.2, 0, 0.5], armR: [-0.2, 0, -0.5], by: -0.25 }],
  ],
  hits: [{ t0: 0.6, t1: 0.68, shape: 'circle', offset: 0, radius: 2.8, dmg: 20, poise: 45, knock: 'heavy' }],
  onTime: [
    { t: 0.1, fn: (e, g) => { e.tele = g.fx.telegraph(e.pos.x, e.pos.z, 2.8, 0.55); } },
    { t: 0.62, fn: (e, g) => g.impact(e.pos.x, e.pos.z, 3.0, 0.45) },
  ],
};

// =====================================================================================================
// THE SUMP LINES
// =====================================================================================================

// ---------- Sump Wretch: claws, a pounce, a cone of bile ----------
const CLAW_WIND_R = { torso: [0.2, -0.7, 0], armR: [-1.9, 0, -1.0], foreR: [-0.6, 0, 0], handR: [0.6, 0, 0], armL: [-0.6, 0, 0.5], foreL: [-1.2, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0], by: -0.12 };
const CLAW_RAKE_R = { torso: [0.45, 0.6, 0], armR: [-0.9, 0, 0.9], foreR: [-0.2, 0, 0], handR: [0.9, 0, 0], armL: [-0.4, 0, 0.4], foreL: [-1.1, 0, 0], legL: [-0.6, 0, 0], legR: [0.45, 0, 0], shinR: [0.4, 0, 0], by: -0.2 };
const CLAW_WIND_L = { torso: [0.35, 0.75, 0], armL: [-1.9, 0, 1.0], foreL: [-0.6, 0, 0], handL: [0.6, 0, 0], armR: [-0.9, 0, 0.7], foreR: [-0.4, 0, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], by: -0.16 };
const CLAW_RAKE_L = { torso: [0.5, -0.65, 0], armL: [-0.9, 0, -0.9], foreL: [-0.2, 0, 0], handL: [0.9, 0, 0], armR: [-0.5, 0, 0.3], foreR: [-1.0, 0, 0], legL: [0.4, 0, 0], legR: [-0.6, 0, 0], shinL: [0.4, 0, 0], by: -0.22 };
const CROUCH = { torso: [0.75, 0, 0], head: [-0.6, 0, 0], armR: [-0.4, 0, -0.5], foreR: [-1.0, 0, 0], armL: [-0.4, 0, 0.5], foreL: [-1.0, 0, 0], legL: [-1.2, 0, 0], legR: [-1.2, 0, 0], shinL: [1.6, 0, 0], shinR: [1.6, 0, 0], by: -0.42 };
const LEAP = { torso: [0.2, 0, 0], head: [-0.3, 0, 0], armR: [-2.7, 0, -0.4], foreR: [-0.3, 0, 0], armL: [-2.7, 0, 0.4], foreL: [-0.3, 0, 0], legL: [-0.9, 0, 0], legR: [0.3, 0, 0], shinL: [1.2, 0, 0], shinR: [0.9, 0, 0], by: 0.45 };
const LAND = { torso: [0.85, 0, 0], head: [-0.5, 0, 0], armR: [-1.0, 0, 0.2], foreR: [-0.2, 0, 0], armL: [-1.0, 0, -0.2], foreL: [-0.2, 0, 0], legL: [-1.0, 0, 0], legR: [0.5, 0, 0], shinL: [1.3, 0, 0], shinR: [0.7, 0, 0], by: -0.4 };
const SWELL = { torso: [-0.35, 0, 0], head: [-0.55, 0, 0], armR: [-0.3, 0, -0.9], foreR: [-0.5, 0, 0], armL: [-0.3, 0, 0.9], foreL: [-0.5, 0, 0], legL: [-0.2, 0, 0], legR: [0.2, 0, 0], by: 0.04 };
const RETCH = { torso: [0.65, 0, 0], head: [0.3, 0, 0], armR: [-0.2, 0, -0.6], foreR: [-0.3, 0, 0], armL: [-0.2, 0, 0.6], foreL: [-0.3, 0, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], shinR: [0.4, 0, 0], by: -0.18 };
const bile = [0.55, 0.9, 0.2];
const bileFrom = (e, g) => { // (from the mouth, not the claws)
  const f = e.fwd(V).clone(), s = e.rig.root.scale.y || 1, from = e.pos.clone().addScaledVector(f, 0.35 * s).setY(1.25 * s), side = new THREE.Vector3(f.z, 0, -f.x);
  for (let i = 0; i < 7; i++) {
    const sp = 5 + Math.random() * 3, w = (Math.random() - 0.5) * 0.8;
    g.fx.norm.spawn({ x: from.x, y: from.y, z: from.z, vx: (f.x + side.x * w) * sp, vy: -0.5 - Math.random() * 1.5, vz: (f.z + side.z * w) * sp, life: 0.45, size: 0.16, size1: 0.5, r: bile[0], g: bile[1], b: bile[2], grav: 6, drag: 1.5, alpha: 0.85 });
  }
};
const WRETCH_MOVES = {
  rake: {
    parry: true, dur: 1.2, range: 1.9, track: [0.4, 7], sfx: [0.36, 'swing'], trail: [0.38, 0.8], recover: 0.3,
    keys: [[0.34, CLAW_WIND_R], [0.48, CLAW_RAKE_R], [0.6, CLAW_WIND_L], [0.74, CLAW_RAKE_L], [1.0, CLAW_RAKE_L]],
    hits: [{ t0: 0.4, t1: 0.5, range: 2.0, arc: 2.2, dmg: 15, poise: 14 }, { t0: 0.66, t1: 0.76, range: 2.0, arc: 2.2, dmg: 15, poise: 14 }],
    move: [[0.32, 0.5, 0.7], [0.6, 0.74, 0.5]], stopAt: 0.9,
    onTime: [{ t: 0.58, fn: turnTo(0.6) }],
  },
  pounce: {
    dur: 1.65, range: 5.6, minRange: 2.6, track: [0.55, 4.5], sfx: [0.55, 'swing'], trail: [0.7, 0.92], recover: 0.55,
    keys: [[0.45, CROUCH], [0.62, LEAP], [0.84, LAND], [1.3, LAND]],
    hits: [{ t0: 0.8, t1: 0.92, range: 1.9, arc: 1.8, dmg: 27, poise: 32 }],
    move: [[0.55, 0.86, 3.4]], stopAt: 0.7,
    onTime: [{ t: 0.2, fn: glint([0.55, 1, 0.3]) }, { t: 0.86, fn: (e, g) => g.fx.dust(e.pos, 8, 1.2, [0.25, 0.3, 0.22]) }],
  },
  retch: {
    unparryable: true, dur: 1.6, range: 3.2, maxRange: 3.6, track: [0.6, 3.2], recover: 0.45,
    keys: [[0.5, SWELL], [0.7, RETCH], [1.15, RETCH], [1.4, { ...RETCH, torso: [0.3, 0, 0], head: [0, 0, 0] }]],
    hits: [0, 1, 2].map((i) => ({ t0: 0.72 + i * 0.14, t1: 0.8 + i * 0.14, range: 3.3, arc: 1.0, dmg: 8, poise: 6 })),
    onTime: [
      { t: 0.15, fn: (e, g) => { e.rig.flash(0.5, 1, 0.3); g.audio.play('hurt', 0.25); } },
      ...every(0.25, 0.65, 0.08, (e, g) => g.fx.add.spawn({ x: e.pos.x, y: 1.3 * (e.rig.root.scale.y || 1), z: e.pos.z, vy: 0.5, life: 0.3, size: 0.3, size1: 0.05, r: bile[0], g: bile[1], b: bile[2], alpha: 0.6 })),
      ...every(0.7, 1.12, 0.05, bileFrom),
    ],
  },
};

// ---------- Hook Warden: a long chain-gaff that drags you in ----------
const HOOK_WIND = { torso: [0.1, -0.5, 0], armR: [0.5, 0, -0.3], foreR: [-1.7, 0, 0], handR: [1.25, 0, 0], armL: [-0.7, 0, 0.1], foreL: [-0.6, 0, 0], legL: [-0.4, 0, 0], legR: [0.35, 0, 0], shinR: [0.45, 0, 0], by: -0.12 };
const HOOK_PULL = { torso: [0.05, -0.75, 0], armR: [0.8, 0, -0.35], foreR: [-1.9, 0, 0], handR: [1.2, 0, 0], armL: [-0.5, 0, 0.15], foreL: [-0.5, 0, 0], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], shinR: [0.55, 0, 0], by: -0.18 };
const HOOK_THRUST = { torso: [0.4, 0.3, 0], armR: [-1.55, 0, 0], foreR: [0, 0, 0], handR: [1.45, 0, 0], armL: [-1.25, 0, 0], legL: [-0.75, 0, 0], legR: [0.6, 0, 0], shinR: [0.5, 0, 0], by: -0.2 };
const HOOK_YANK = { torso: [-0.15, -0.5, 0], armR: [-0.6, 0, -0.4], foreR: [-1.3, 0, 0], handR: [1.3, 0, 0], armL: [-0.5, 0, 0.1], foreL: [-1.0, 0, 0], legL: [0.3, 0, 0], legR: [-0.3, 0, 0], by: -0.08 };
const REAP_A = { torso: [0.2, -1.0, 0], armR: [-1.3, 0, -1.4], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.0, 0, -0.4], legL: [-0.45, 0, 0], legR: [0.4, 0, 0], by: -0.18 };
const REAP_B = { torso: [0.3, 1.0, 0], armR: [-1.3, 0, 1.25], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.0, 0, 0.5], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], by: -0.24 };
const SINK_UP = { torso: [-0.3, -0.1, 0], armR: [-3.0, 0, -0.15], foreR: [-0.5, 0, 0], handR: [1.0, 0, 0], armL: [-2.7, 0, 0.2], foreL: [-0.4, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0.02 };
const SINK_DOWN = { torso: [0.7, 0, 0], armR: [-1.0, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.4, 0, 0], armL: [-1.1, 0, 0.1], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinL: [0.45, 0, 0], shinR: [0.55, 0, 0], by: -0.3 };
const HOOK_MOVES = {
  gaff: {
    parry: true, dur: 1.65, range: 3.7, track: [0.74, 4.5], sfx: [0.76, 'swing'], trail: [0.76, 0.96], recover: 0.4,
    keys: [[0.35, HOOK_WIND], [0.74, HOOK_PULL], [0.86, HOOK_THRUST], [1.08, HOOK_THRUST], [1.3, HOOK_YANK]],
    // caught on the hook: dragged in toward him (a negative shove)
    hits: [{ t0: 0.8, t1: 0.94, range: 3.9, arc: 0.6, dmg: 20, poise: 22, knockback: -17 }],
    move: [[0.68, 0.86, 0.6]], stopAt: 2.2,
    onTime: [{ t: 0.3, fn: glint([1, 0.7, 0.25], 'swing') }, { t: 1.1, fn: (e, g) => g.audio.play('clang', 0.25) }],
  },
  reap: {
    parry: true, dur: 2.0, range: 3.2, track: [0.55, 5], sfx: [0.6, 'swing'], trail: [0.6, 1.3], recover: 0.45,
    keys: [[0.5, REAP_A], [0.72, REAP_B], [0.98, REAP_B], [1.1, REAP_A], [1.5, REAP_A]],
    hits: [{ t0: 0.6, t1: 0.74, range: 3.3, arc: 2.6, dmg: 18, poise: 16 }, { t0: 1.14, t1: 1.28, range: 3.3, arc: 2.6, dmg: 20, poise: 18 }],
    move: [[0.55, 0.72, 0.5], [1.05, 1.25, 0.5]],
    onTime: [{ t: 0.95, fn: turnTo(0.7) }],
  },
  sink: {
    dur: 1.85, range: 3.4, track: [0.85, 3.5], sfx: [0.98, 'heavySwing'], trail: [0.95, 1.12], recover: 0.5, parry: true,
    keys: [[0.8, SINK_UP], [1.05, SINK_DOWN], [1.5, SINK_DOWN]],
    hits: [{ t0: 1.0, t1: 1.1, range: 3.5, arc: 0.9, dmg: 31, poise: 42, knock: 'heavy' }],
    move: [[0.85, 1.02, 0.6]],
    onTime: [{ t: 0.3, fn: glint([1, 0.7, 0.25]) }, { t: 1.06, fn: (e, g) => { const f = e.fwd(); g.impact(e.pos.x + f.x * 3, e.pos.z + f.z * 3, 1.6, 0.3); } }],
  },
};

// ---------- Promethium Torcher: a held cone of flame, a burning canister ----------
const FLAMER_AIM = { torso: [0.15, 0.2, 0], armR: [-0.9, 0, -0.15], foreR: [-0.7, 0, 0], handR: [1.5, 0, 0], armL: [-1.1, 0, 0.3], foreL: [-0.7, 0, 0], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], shinR: [0.4, 0, 0], by: -0.12 };
const FLAMER_KICK = { ...FLAMER_AIM, torso: [0.05, 0.2, 0], by: -0.08, legL: [-0.4, 0, 0] };
const LOB_BACK = { torso: [-0.15, -0.6, 0], armL: [0.9, 0, 0.3], foreL: [-0.4, 0, 0], armR: [-0.6, 0, -0.3], foreR: [-0.9, 0, 0], legL: [0.2, 0, 0], legR: [-0.3, 0, 0], by: -0.06 };
const LOB_OUT = { torso: [0.3, 0.4, 0], armL: [-2.2, 0, 0.2], foreL: [-0.2, 0, 0], armR: [-0.6, 0, -0.3], foreR: [-0.9, 0, 0], legL: [-0.6, 0, 0], legR: [0.45, 0, 0], by: -0.14 };
const fireOrange = [1, 0.5, 0.12];
const TORCHER_MOVES = {
  gout: {
    ranged: true, unparryable: true, dur: 2.05, range: 5.6, track: [0.7, 2.6], tracks: [[0.7, 1.6, 0.9]], recover: 0.45,
    keys: [[0.5, FLAMER_AIM], [0.7, FLAMER_AIM], [0.76, FLAMER_KICK], [1.6, FLAMER_KICK], [1.8, FLAMER_AIM]],
    hits: [0, 1, 2, 3, 4, 5].map((i) => ({ t0: 0.76 + i * 0.14, t1: 0.84 + i * 0.14, range: 5.7, arc: 0.8, dmg: 7, poise: 4 })),
    onTime: [
      { t: 0.25, fn: (e, g) => { g.fx.burst(tipPos(e), 10, [0.4, 0.6, 1], 1.5, 0.3, 0.25); g.audio.play('fire', 0.4); } }, // the pilot flares blue
      { t: 0.76, fn: (e, g) => g.audio.play('fire', 0.9) },
      ...every(0.76, 1.58, 0.04, spray(fireOrange, 3.2, 0.7, 4)),
      ...every(0.8, 1.58, 0.12, (e, g) => { const f = e.fwd(V); for (const d of [2, 3.5, 5]) g.fx.flame({ x: e.pos.x + f.x * d, y: 0.15, z: e.pos.z + f.z * d }, 1); }),
    ],
  },
  canister: {
    ranged: true, dur: 1.5, range: 11, minRange: 4, track: [0.75, 3.5], sfx: [0.7, 'swing'], recover: 0.4,
    keys: [[0.55, LOB_BACK], [0.8, LOB_OUT], [1.15, LOB_OUT]],
    onTime: [{ t: 0.8, fn: (e, g) => {
      // a fuel can rolls along the floor in flames
      const f = e.fwd().clone(), pos = new THREE.Vector3(e.pos.x + f.x * 0.8, 0.3, e.pos.z + f.z * 0.8);
      g.addProj(g.foeCrit(e, { kind: 'fire', pos, vel: f.multiplyScalar(9), life: 1.3, r: 0.75, dmg: 18 * NUM * (e.dmgScale || 1), mesh: null, elems: { fire: 0.5 } }));
      g.audio.play('fire', 0.7);
    } }],
  },
  bash: {
    parry: true, dur: 1.0, range: 1.7, maxRange: 2.2, track: [0.35, 6], sfx: [0.38, 'swing'], recover: 0.3,
    keys: [[0.35, { torso: [0, -0.7, 0], armR: [-0.6, 0, -0.6], foreR: [-1.1, 0, 0], armL: [-0.4, 0, 0.6] }], [0.5, { torso: [0.25, 0.6, 0], armR: [-1.2, 0, 0.5], foreR: [-0.5, 0, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0] }]],
    hits: [{ t0: 0.42, t1: 0.52, range: 1.9, arc: 2.0, dmg: 13, poise: 14, knockback: 10 }],
  },
};

// ---------- Bilge Hulk: a pump-drill arm, a slam, a charge ----------
const DRILL_BACK = { torso: [0.1, -0.55, 0], armR: [0.3, 0, -0.35], foreR: [-1.6, 0, 0], handR: [0.2, 0, 0], armL: [-0.9, 0, 0.5], foreL: [-0.6, 0, 0], legL: [-0.4, 0, 0], legR: [0.4, 0, 0], by: -0.12 };
const DRILL_IN = { torso: [0.4, 0.3, 0], armR: [-1.5, 0, 0], foreR: [-0.1, 0, 0], handR: [0.1, 0, 0], armL: [-0.5, 0, 0.6], foreL: [-0.8, 0, 0], legL: [-0.75, 0, 0], legR: [0.6, 0, 0], shinR: [0.4, 0, 0], by: -0.22 };
const DRILL_GRIND = { ...DRILL_IN, torso: [0.45, 0.22, 0.05], by: -0.25 };
const SLAM_UP = { torso: [-0.35, 0, 0], armR: [-3.0, 0, -0.25], foreR: [-0.6, 0, 0], armL: [-2.8, 0, 0.25], foreL: [-0.6, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0.05 };
const SLAM_DOWN = { torso: [0.8, 0, 0], armR: [-0.7, 0, 0.1], foreR: [0, 0, 0], armL: [-0.8, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.35 };
const CHARGE = { torso: [0.75, 0, 0], head: [-0.4, 0, 0], armR: [-1.4, 0, -0.1], foreR: [-0.2, 0, 0], armL: [-0.6, 0, 0.6], foreL: [-1.0, 0, 0], legL: [-0.9, 0, 0], legR: [0.7, 0, 0], shinL: [0.6, 0, 0], shinR: [0.5, 0, 0], by: -0.25 };
const grind = (e, g) => { g.fx.sparks(tipPos(e), e.fwd(V).clone(), 12, [1, 0.7, 0.3]); g.audio.play('clang', 0.3); };
const HULK_MOVES = {
  bore: {
    dur: 2.3, range: 3.0, track: [0.8, 2.4], sfx: [0.85, 'heavySwing'], trail: [0.9, 1.6], recover: 0.5, armor: true,
    keys: [[0.75, DRILL_BACK], [0.95, DRILL_IN], [1.15, DRILL_GRIND], [1.35, DRILL_IN], [1.55, DRILL_GRIND], [1.9, DRILL_IN]],
    hits: [0, 1, 2].map((i) => ({ t0: 0.95 + i * 0.25, t1: 1.05 + i * 0.25, range: 3.2, arc: 0.9, dmg: 15, poise: 22 })),
    move: [[0.85, 1.0, 1.0]], stopAt: 1.2,
    onTime: [{ t: 0.2, fn: glint([1, 0.6, 0.2], 'clang') }, ...[1.0, 1.25, 1.5].map((t) => ({ t, fn: grind }))],
  },
  wallow: {
    dur: 2.2, range: 3.6, track: [0.85, 2.4], sfx: [1.0, 'heavySwing'], trail: [1.0, 1.18], recover: 0.55, armor: true, unparryable: true,
    keys: [[0.85, SLAM_UP], [1.0, { ...SLAM_UP, by: 0.08 }], [1.14, SLAM_DOWN], [1.75, SLAM_DOWN]],
    hits: [{ t0: 1.1, t1: 1.2, shape: 'circle', offset: 2.5, radius: 2.2, dmg: 44, poise: 65, knock: 'heavy' }],
    move: [[0.9, 1.12, 0.8]],
    onTime: [{ t: 0.25, fn: glint([1, 0.15, 0.1], 'clang') }, { t: 1.14, fn: (e, g) => { const f = e.fwd(); g.impact(e.pos.x + f.x * 2.5, e.pos.z + f.z * 2.5, 3.4, 0.6); } }],
  },
  surge: {
    dur: 2.0, range: 8.5, minRange: 4, track: [0.7, 3], sfx: [0.7, 'heavySwing'], recover: 0.7, armor: true, unparryable: true,
    keys: [[0.55, { ...CHARGE, by: -0.15, torso: [0.4, 0, 0] }], [0.75, CHARGE], [1.3, CHARGE], [1.5, { ...CHARGE, torso: [0.3, 0, 0], by: -0.1 }]],
    hits: [{ t0: 0.8, t1: 1.32, range: 1.9, arc: 1.8, dmg: 34, poise: 55, knock: 'heavy' }],
    move: [[0.75, 1.32, 6.5]], stopAt: 0.6,
    onTime: [{ t: 0.3, fn: glint([1, 0.15, 0.1]) }, ...every(0.8, 1.3, 0.1, (e, g) => g.fx.dust(e.pos, 3, 1.0, [0.25, 0.28, 0.22]))],
  },
  stomp: STOMP,
};

// =====================================================================================================
// SAINT ORSK'S SPIRE
// =====================================================================================================

// ---------- Flagellant: two scourges, a flurry, a whirl, faster as it bleeds ----------
const LASH_R_UP = { torso: [0.1, -0.6, 0], armR: [-2.6, 0, -0.6], foreR: [-0.6, 0, 0], handR: [0.8, 0, 0], armL: [-0.6, 0, 0.5], foreL: [-1.2, 0, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0], by: -0.1 };
const LASH_R_DOWN = { torso: [0.45, 0.5, 0], armR: [-0.7, 0, 0.6], foreR: [-0.1, 0, 0], handR: [1.2, 0, 0], armL: [-0.8, 0, 0.3], foreL: [-1.0, 0, 0], legL: [-0.6, 0, 0], legR: [0.45, 0, 0], by: -0.2 };
const LASH_L_UP = { torso: [0.15, 0.6, 0], armL: [-2.6, 0, 0.6], foreL: [-0.6, 0, 0], handL: [0.8, 0, 0], armR: [-0.7, 0, 0.4], foreR: [-0.9, 0, 0], legL: [-0.3, 0, 0], legR: [0.4, 0, 0], by: -0.1 };
const LASH_L_DOWN = { torso: [0.45, -0.5, 0], armL: [-0.7, 0, -0.6], foreL: [-0.1, 0, 0], handL: [1.2, 0, 0], armR: [-0.6, 0, 0.3], foreR: [-1.0, 0, 0], legL: [0.45, 0, 0], legR: [-0.6, 0, 0], by: -0.2 };
const WHIRL = (a) => ({ hips: [0, a, 0], torso: [0.15, 0, 0], armR: [-1.5, 0, -1.4], foreR: [0, 0, 0], armL: [-1.5, 0, 1.4], foreL: [0, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: -0.12 });
const DOUBLE_UP = { torso: [-0.3, 0, 0], armR: [-3.0, 0, -0.3], foreR: [-0.6, 0, 0], armL: [-3.0, 0, 0.3], foreL: [-0.6, 0, 0], legL: [-0.8, 0, 0], legR: [0.3, 0, 0], shinL: [1.0, 0, 0], by: 0.3 };
const DOUBLE_DOWN = { torso: [0.75, 0, 0], armR: [-0.9, 0, 0.2], foreR: [0, 0, 0], armL: [-0.9, 0, -0.2], foreL: [0, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.3 };
const FLAG_MOVES = {
  flurry: {
    dur: 1.95, range: 2.3, track: [0.35, 7], tracks: [[0.5, 1.1, 3]], sfx: [0.38, 'swing'], trail: [0.38, 1.15], recover: 0.4,
    keys: [[0.3, LASH_R_UP], [0.44, LASH_R_DOWN], [0.54, LASH_L_UP], [0.64, LASH_L_DOWN], [0.74, LASH_R_UP], [0.84, LASH_R_DOWN], [0.96, LASH_L_UP], [1.1, LASH_L_DOWN], [1.4, LASH_L_DOWN]],
    // the first and last lashes can be parried; the two between come too fast
    hits: [[0.4, true], [0.6, false], [0.8, false], [1.04, true]].map(([t, parry]) => ({ t0: t, t1: t + 0.08, range: 2.4, arc: 2.0, dmg: 12, poise: 10, parry })),
    move: [[0.3, 1.1, 1.4]], stopAt: 1.0,
    onTime: [0.62, 0.82, 1.06].map((t) => ({ t, fn: (e, g) => g.audio.play('swing', 0.5) })),
  },
  whirl: {
    dur: 1.6, range: 2.4, track: [0.3, 5], sfx: [0.55, 'swing'], trail: [0.55, 1.0], recover: 0.4,
    keys: [[0.35, WHIRL(-0.6)], [0.55, WHIRL(0.6)], [0.75, WHIRL(3.1)], [0.95, WHIRL(6.28)], [1.25, { ...WHIRL(6.28), armR: [-0.5, 0, -0.5], armL: [-0.5, 0, 0.5] }]],
    hits: [{ t0: 0.62, t1: 0.96, shape: 'circle', offset: 0, radius: 2.6, dmg: 17, poise: 18, parry: false }],
    onTime: [{ t: 0.1, fn: glint([1, 0.2, 0.15]) }, ...every(0.6, 0.95, 0.07, (e, g) => g.fx.blood(e.pos.clone().setY(1.2), null, 2))],
  },
  lunge: {
    parry: true, dur: 1.65, range: 5.2, minRange: 2.6, track: [0.6, 4], sfx: [0.66, 'heavySwing'], trail: [0.72, 0.95], recover: 0.5,
    keys: [[0.5, { ...CROUCH, armR: [-1.5, 0, -0.5], armL: [-1.5, 0, 0.5] }], [0.72, DOUBLE_UP], [0.88, DOUBLE_DOWN], [1.3, DOUBLE_DOWN]],
    hits: [{ t0: 0.84, t1: 0.95, range: 2.3, arc: 1.5, dmg: 24, poise: 30 }],
    move: [[0.55, 0.88, 3.1]], stopAt: 0.9,
    onTime: [{ t: 0.9, fn: (e, g) => g.fx.dust(e.pos, 6, 1.0) }],
  },
};

// ---------- Spire Castellan: a tower shield that guards its front, a power-mace ----------
const MACE_UP = { torso: [-0.3, -0.2, 0], armR: [-3.0, 0, -0.3], foreR: [-0.7, 0, 0], handR: [0.9, 0, 0], armL: [-1.2, 0, 0.5], foreL: [-1.3, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0], by: 0.02 };
const MACE_DOWN = { torso: [0.6, 0.15, 0], armR: [-0.9, 0, 0.1], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.2, 0, 0.5], foreL: [-1.3, 0, 0], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], shinL: [0.4, 0, 0], shinR: [0.5, 0, 0], by: -0.28 };
const SHIELD_SET = { torso: [0.1, 0.6, 0], armL: [-1.0, 0, 0.9], foreL: [-1.5, 0, 0], armR: [-0.3, 0, -0.3], foreR: [-0.8, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: -0.1 };
const SHIELD_SHOVE = { torso: [0.35, -0.3, 0], armL: [-1.5, 0, -0.1], foreL: [-0.6, 0, 0], armR: [-0.3, 0, -0.3], foreR: [-0.8, 0, 0], legL: [-0.7, 0, 0], legR: [0.55, 0, 0], shinR: [0.4, 0, 0], by: -0.2 };
const SHIELD_CHARGE = { torso: [0.45, 0.1, 0], head: [-0.3, 0, 0], armL: [-1.4, 0, 0.3], foreL: [-1.0, 0, 0], armR: [-0.5, 0, -0.4], foreR: [-1.2, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinR: [0.4, 0, 0], by: -0.22 };
const MACE_SIDE_W = { torso: [0.1, -0.8, 0], armR: [-1.5, 0, -1.3], foreR: [-0.2, 0, 0], handR: [1.3, 0, 0], armL: [-1.2, 0, 0.5], foreL: [-1.3, 0, 0], legL: [-0.45, 0, 0], legR: [0.4, 0, 0], by: -0.14 };
const MACE_SIDE_S = { torso: [0.3, 0.8, 0], armR: [-1.3, 0, 1.1], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-1.2, 0, 0.5], foreL: [-1.3, 0, 0], legL: [-0.6, 0, 0], legR: [0.45, 0, 0], by: -0.2 };
const crackle = (e, g) => { const p = tipPos(e); for (let i = 0; i < 3; i++) g.fx.add.spawn({ x: p.x + (Math.random() - 0.5) * 0.3, y: p.y + (Math.random() - 0.5) * 0.3, z: p.z + (Math.random() - 0.5) * 0.3, life: 0.15, size: 0.12, size1: 0.02, r: 0.7, g: 0.85, b: 1 }); };
const CAST_MOVES = {
  bash: {
    parry: true, dur: 1.1, range: 2.3, maxRange: 2.9, track: [0.4, 6], sfx: [0.42, 'swing'], recover: 0.35,
    keys: [[0.38, SHIELD_SET], [0.5, SHIELD_SHOVE], [0.8, SHIELD_SHOVE]],
    hits: [{ t0: 0.46, t1: 0.56, range: 2.4, arc: 1.6, dmg: 15, poise: 22, knockback: 12 }],
    move: [[0.42, 0.55, 0.6]],
  },
  judgement: {
    unparryable: true, dur: 2.0, range: 3.4, track: [0.75, 3], sfx: [0.98, 'heavySwing'], trail: [0.98, 1.15], recover: 0.55,
    keys: [[0.8, MACE_UP], [0.95, { ...MACE_UP, by: 0.06 }], [1.1, MACE_DOWN], [1.6, MACE_DOWN]],
    hits: [{ t0: 1.05, t1: 1.15, shape: 'circle', offset: 2.1, radius: 1.6, dmg: 40, poise: 58, knock: 'heavy' }],
    move: [[0.9, 1.08, 0.6]],
    onTime: [
      { t: 0.75, fn: (e, g) => { const f = e.fwd(); e.tele = g.fx.telegraph(e.pos.x + f.x * 2.6, e.pos.z + f.z * 2.6, 1.6, 0.35 / (e.attackRate?.() || 1), 0xffc040); } },
      ...every(0.2, 1.0, 0.06, crackle),
      { t: 1.1, fn: (e, g) => { const f = e.fwd(); g.impact(e.pos.x + f.x * 2.6, e.pos.z + f.z * 2.6, 2.2, 0.5); g.fx.burst({ x: e.pos.x + f.x * 2.6, y: 0.4, z: e.pos.z + f.z * 2.6 }, 16, [0.7, 0.85, 1], 5, 0.4, 0.25); } },
    ],
  },
  advance: {
    dur: 2.3, range: 7.5, minRange: 3.5, track: [0.5, 3.5], tracks: [[0.6, 1.2, 1.5]], sfx: [0.55, 'heavySwing'], trail: [1.4, 1.58], recover: 0.5, armor: true,
    keys: [[0.5, SHIELD_SET], [0.62, SHIELD_CHARGE], [1.2, SHIELD_CHARGE], [1.35, MACE_SIDE_W], [1.52, MACE_SIDE_S], [1.9, MACE_SIDE_S]],
    hits: [{ t0: 0.65, t1: 1.2, range: 1.7, arc: 1.4, dmg: 16, poise: 26, knockback: 8, parry: false }, { t0: 1.44, t1: 1.56, range: 2.4, arc: 2.2, dmg: 26, poise: 30, parry: true }],
    move: [[0.6, 1.2, 5.0], [1.35, 1.5, 0.5]], stopAt: 1.1,
    onTime: [{ t: 0.2, fn: glint([1, 0.8, 0.3], 'clang') }, ...every(0.65, 1.2, 0.12, (e, g) => g.fx.dust(e.pos, 2, 0.8))],
  },
};
// the guard: struck from the front while not swinging, the shield takes most of it
const castellanGuard = (e, info) => {
  if (!info.srcPos || info.pctHp || ['attack', 'hurt', 'parried', 'riposted', 'held', 'frozen'].includes(e.state)) return info;
  if (Math.abs(angDiff(e.yaw, Math.atan2(info.srcPos.x - e.pos.x, info.srcPos.z - e.pos.z))) > 1.1) return info;
  const g = e.game, now = g.time;
  if (now - (e.guardFx || -9) > 0.12) {
    e.guardFx = now;
    const f = e.fwd(V), p = { x: e.pos.x + f.x * 0.6, y: 1.2 * (e.rig.root.scale.y || 1), z: e.pos.z + f.z * 0.6 };
    g.fx.sparks(p, f.clone(), 14, [1, 0.85, 0.5]); g.audio.play('clang', 0.5);
  }
  return { ...info, dmg: info.dmg * 0.4, poise: (info.poise || 0) * 0.15, noKnock: true };
};

// ---------- Augur: foretells where you'll be and strikes there; blinks away when you close in ----------
const RAISE = { torso: [-0.25, 0, 0], head: [-0.4, 0, 0], armR: [-2.9, 0, -0.2], foreR: [-0.2, 0, 0], handR: [0.4, 0, 0], armL: [-2.4, 0, 0.6], foreL: [-0.3, 0, 0], by: 0.06 };
const INVOKE = { torso: [0.35, 0, 0], head: [0.2, 0, 0], armR: [-1.4, 0, -0.1], foreR: [-0.3, 0, 0], handR: [1.2, 0, 0], armL: [-1.0, 0, 0.6], foreL: [-0.6, 0, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0], by: -0.14 };
const POINT = { torso: [0.1, 0.3, 0], armR: [-1.6, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.4, 0, 0.4], foreL: [-0.8, 0, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0], by: -0.06 };
const violet = [0.75, 0.45, 1];
const FORESEE = 1.15; // how far ahead it reads you (s)
const AUGUR_MOVES = {
  foretold: {
    ranged: true, dur: 2.0, range: 15, track: [0.4, 4], recover: 0.5,
    keys: [[0.4, RAISE], [1.1, RAISE], [1.4, INVOKE], [1.75, INVOKE]],
    onTime: [
      { t: 0.2, fn: (e) => { const p = e.target; if (p) e.seen0 = { x: p.pos.x, z: p.pos.z, t: e.game.time }; } },
      { t: 0.4, fn: (e, g) => {
        // where you'll be: your way and pace over the last moment, carried on FORESEE seconds (at most 7 m)
        const p = e.target; if (!p) return;
        const s = e.seen0, dt = Math.max(0.05, g.time - (s?.t ?? g.time)), vx = s ? (p.pos.x - s.x) / dt : 0, vz = s ? (p.pos.z - s.z) / dt : 0;
        let dx = vx * FORESEE, dz = vz * FORESEE; const d = Math.hypot(dx, dz); if (d > 7) { dx *= 7 / d; dz *= 7 / d; }
        let x = p.pos.x + dx, z = p.pos.z + dz;
        if (!g.world.walkable(x, z, 0.3)) { x = p.pos.x; z = p.pos.z; }
        e.mark = { x, z };
        e.tele = g.fx.telegraph(x, z, 1.7, 1.15 / (e.attackRate?.() || 1), 0xb070ff);
        g.audio.play('bow', 0.35);
      } },
      ...every(0.45, 1.5, 0.08, (e, g) => { if (e.mark) g.fx.add.spawn({ x: e.mark.x + (Math.random() - 0.5) * 2.4, y: 4 + Math.random() * 2, z: e.mark.z + (Math.random() - 0.5) * 2.4, vy: -6, life: 0.5, size: 0.12, size1: 0.04, r: violet[0], g: violet[1], b: violet[2] }); }),
      { t: 1.55, fn: (e, g) => {
        const m = e.mark; if (!m) return;
        // a lance of light falls on the mark
        for (let i = 0; i < 26; i++) g.fx.add.spawn({ x: m.x + (Math.random() - 0.5) * 0.5, y: Math.random() * 7, z: m.z + (Math.random() - 0.5) * 0.5, vy: -14, life: 0.3, size: 0.4, size1: 0.1, r: 0.92, g: 0.82, b: 1 });
        g.fx.burst({ x: m.x, y: 0.4, z: m.z }, 22, violet, 6, 0.5, 0.3); g.fx.shockwave(m.x, m.z, 2.2, 0xb070ff, 0.4);
        g.impact(m.x, m.z, 1.4, 0.35);
        areaHit(e, g, m.x, m.z, (t, d) => d < 1.7 + t.radius, { dmg: 32, knock: 'heavy' });
        e.mark = null;
      } },
    ],
  },
  bolt: {
    ranged: true, dur: 1.45, range: 13, minRange: 3, track: [0.85, 3.5], recover: 0.4,
    keys: [[0.5, { ...POINT, armR: [-2.0, 0, -0.2], torso: [-0.1, -0.2, 0] }], [0.9, POINT], [1.2, POINT]],
    onTime: [
      ...every(0.3, 0.85, 0.07, (e, g) => { const p = tipPos(e); g.fx.add.spawn({ x: p.x, y: p.y, z: p.z, vy: 0.3, life: 0.25, size: 0.25, size1: 0.05, r: violet[0], g: violet[1], b: violet[2] }); }),
      { t: 0.9, fn: (e, g) => {
        // a slow seeing-orb: dodge it sideways
        const p = e.target; if (!p) return;
        const from = new THREE.Vector3(e.pos.x, 1.4 * (e.rig.root.scale.y || 1), e.pos.z).addScaledVector(e.fwd(), 0.7);
        const dir = new THREE.Vector3(p.pos.x - from.x, 0, p.pos.z - from.z).normalize();
        if (Math.abs(angDiff(Math.atan2(dir.x, dir.z), e.yaw)) > 0.3) dir.copy(e.fwd());
        const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xd0a0ff }));
        mesh.position.copy(from); g.scene.add(mesh);
        g.addProj(g.foeCrit(e, { kind: 'orb', pos: from, vel: dir.multiplyScalar(8), life: 2.2, mesh, r: 0.45, dmg: 20 * NUM * (e.dmgScale || 1), elems: e.elems }));
        g.audio.play('bow', 0.5);
      } },
    ],
  },
  swipe: {
    parry: true, dur: 1.1, range: 1.9, maxRange: 2.4, track: [0.4, 6], sfx: [0.42, 'swing'], trail: [0.42, 0.56], recover: 0.3,
    keys: [[0.38, { torso: [0.1, -0.8, 0], armR: [-1.4, 0, -1.2], foreR: [-0.2, 0, 0], handR: [1.3, 0, 0] }], [0.54, { torso: [0.3, 0.8, 0], armR: [-1.3, 0, 1.1], foreR: [0, 0, 0], handR: [1.4, 0, 0], legL: [-0.4, 0, 0], legR: [0.4, 0, 0] }]],
    hits: [{ t0: 0.46, t1: 0.56, range: 2.0, arc: 2.2, dmg: 12, poise: 12, knockback: 9 }],
  },
};
// too close: it blinks away, 5-8 m off, somewhere it may go (2 s between blinks)
const augurThink = (e, dt, p, dist) => {
  e.blinkCd = (e.blinkCd ?? 1) - dt;
  if (e.state !== 'chase' || dist > 2.5 || e.blinkCd > 0) return false;
  const g = e.game, W = g.world, D = W.dungeon;
  for (let t = 0; t < 16; t++) {
    const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 3, x = p.pos.x + Math.cos(a) * r, z = p.pos.z + Math.sin(a) * r;
    if (!W.walkable(x, z, 0.6) || (D?.reach && !D.reach(x, z))) continue;
    const m = D?.modAt?.(x, z); if (e.roam && m && !e.roam.has(m.i)) continue;
    if (!W.lineClear(x, z, p.pos.x, p.pos.z)) continue;
    const puff = (px, pz) => { g.fx.burst({ x: px, y: 1.2, z: pz }, 20, violet, 4, 0.5, 0.25); g.fx.shockwave(px, pz, 1.4, 0xb070ff, 0.3); };
    puff(e.pos.x, e.pos.z);
    e.pos.x = x; e.pos.z = z; e.yaw = e.yawTo(p.pos);
    puff(x, z); g.audio.play('bow', 0.4);
    e.blinkCd = 2; e.cd = Math.min(e.cd, 0.35);
    return true;
  }
  e.blinkCd = 0.5;
  return false;
};

// ---------- Bell-Warden: two bells on chains; the Toll sends a ring of sound out ----------
const BELLS_UP = { torso: [-0.35, 0, 0], armR: [-2.9, 0, -0.5], foreR: [-0.3, 0, 0], armL: [-2.9, 0, 0.5], foreL: [-0.3, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0.06 };
const BELLS_CLASH = { torso: [0.55, 0, 0], armR: [-1.4, 0, 0.35], foreR: [-0.2, 0, 0], armL: [-1.4, 0, -0.35], foreL: [-0.2, 0, 0], legL: [-0.6, 0, 0], legR: [0.5, 0, 0], shinL: [0.4, 0, 0], shinR: [0.5, 0, 0], by: -0.3 };
const BELL_WIND = { torso: [0.15, -1.05, 0], armR: [-1.3, 0, -1.5], foreR: [0, 0, 0], armL: [-0.5, 0, 0.6], legL: [-0.4, 0, 0], legR: [0.4, 0, 0], by: -0.15 };
const BELL_SWEEP = { torso: [0.3, 1.05, 0], armR: [-1.3, 0, 1.3], foreR: [0, 0, 0], armL: [-0.5, 0, 0.3], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], by: -0.2 };
const TOLL_R = 7.5, TOLL_DUR = 0.6;
const toll = (e, g, k) => {
  // the ring's edge at this moment: anyone it passes over (not inside it already) is struck once
  const a = e.atk; if (!a) return;
  const r = TOLL_R * k, hit = (a.tolled ||= new Set());
  for (const t of g.allPlayers()) {
    const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
    if (!t.alive || hit.has(t) || Math.abs(d - r) > 0.9) continue;
    hit.add(t);
    g.projectileHit(t, { dmg: 28 * NUM * (e.dmgScale || 1), knock: 'heavy', src: [e.pos.x, e.pos.z], elems: e.elems, buildMul: e.elemBuild });
  }
};
const BELL_MOVES = {
  toll: {
    dur: 2.5, range: 6, track: [0.8, 2], sfx: [1.0, 'heavySwing'], recover: 0.6, armor: true, unparryable: true,
    keys: [[0.8, BELLS_UP], [1.0, { ...BELLS_UP, by: 0.1 }], [1.12, BELLS_CLASH], [1.9, BELLS_CLASH]],
    onTime: [
      { t: 0.25, fn: glint([1, 0.85, 0.4], 'clang') },
      { t: 1.12, fn: (e, g) => { g.audio.play('clang', 1); g.audio.play('slam', 0.8); g.fx.addShake(0.5); g.fx.shockwave(e.pos.x, e.pos.z, TOLL_R, 0xffd070, TOLL_DUR); g.fx.shockwave(e.pos.x, e.pos.z, TOLL_R * 0.7, 0xffe8b0, TOLL_DUR * 0.8); } },
      ...every(1.12, 1.12 + TOLL_DUR, 0.03, toll),
    ],
  },
  swing: {
    dur: 1.95, range: 3.8, track: [0.8, 2.6], sfx: [0.86, 'heavySwing'], trail: [0.86, 1.05], recover: 0.5, armor: true,
    keys: [[0.8, BELL_WIND], [1.02, BELL_SWEEP], [1.4, BELL_SWEEP]],
    hits: [{ t0: 0.88, t1: 1.03, range: 3.9, arc: 3.0, dmg: 33, poise: 46, knockback: 12 }],
    move: [[0.75, 1.0, 0.6]],
    onTime: [{ t: 0.2, fn: glint([1, 0.85, 0.4]) }, { t: 0.98, fn: (e, g) => g.audio.play('clang', 0.6) }],
  },
  crush: {
    dur: 2.25, range: 3.8, track: [0.85, 2.4], sfx: [1.0, 'heavySwing'], trail: [1.0, 1.18], recover: 0.55, armor: true, unparryable: true,
    keys: [[0.85, BELLS_UP], [1.0, { ...BELLS_UP, by: 0.08 }], [1.14, { ...BELLS_CLASH, armR: [-0.8, 0, 0.1], armL: [-0.8, 0, -0.1] }], [1.75, { ...BELLS_CLASH, armR: [-0.8, 0, 0.1], armL: [-0.8, 0, -0.1] }]],
    hits: [{ t0: 1.1, t1: 1.2, shape: 'circle', offset: 2.6, radius: 2.2, dmg: 48, poise: 70, knock: 'heavy' }],
    move: [[0.9, 1.12, 0.8]],
    onTime: [{ t: 0.25, fn: glint([1, 0.15, 0.1], 'clang') }, { t: 1.14, fn: (e, g) => { const f = e.fwd(); g.impact(e.pos.x + f.x * 2.6, e.pos.z + f.z * 2.6, 3.4, 0.6); g.audio.play('clang', 0.8); } }],
  },
  stomp: STOMP,
};

// =====================================================================================================
// the types (health as designed; NUM applied below, as enemies.js does for its own)
// =====================================================================================================
const NEW_TYPES = {
  wretch: {
    name: 'Sump Wretch', hp: 190, poise: 14, scale: 1.0, radius: 0.45, run: 4.4, walk: 2.0, aggro: 12, prefer: 1.6, style: 'daggers', turn: 8,
    cd: [0.4, 1.2], moves: WRETCH_MOVES, weights: { rake: 3, pounce: 1.5, retch: 1.5 }, elems: { poison: 0.3 },
    model: { cloth: 0x3a4032, armor: 0x4a4a3e, skin: 0x7a8a6a, head: 'bare', weapon: 'daggers', eyes: 0xa8ff4a, bulk: 1.12, kit: 'wretch' },
  },
  hook: {
    name: 'Hook Warden', hp: 170, poise: 20, scale: 1.08, radius: 0.47, run: 3.6, walk: 1.8, aggro: 12, prefer: 3.0, style: 'spear', turn: 6,
    cd: [0.7, 1.6], moves: HOOK_MOVES, weights: { gaff: 3, reap: 2, sink: 1.5 }, backoff: 1.8,
    model: { cloth: 0x2a2e2a, armor: 0x4a4038, skin: 0x7a6e66, head: 'bare', weapon: 'spear', eyes: 0xffb040, kit: 'hook' },
  },
  torcher: {
    name: 'Promethium Torcher', hp: 130, poise: 12, scale: 1.0, radius: 0.45, run: 3.4, walk: 2.0, aggro: 14, prefer: 5, style: 'spear', turn: 5,
    cd: [0.9, 1.9], moves: TORCHER_MOVES, weights: { gout: 3, canister: 1.5, bash: 1.5 }, ranged: true, backoff: 3.2, elems: { fire: 0.35 },
    model: { cloth: 0x4a4232, armor: 0x5a4a32, skin: 0x7a6e66, head: 'bare', weapon: 'spear', eyes: 0xff8a2a, kit: 'torcher' },
  },
  hulk: {
    name: 'Bilge Hulk', heavy: true, hp: 420, poise: 100, scale: 1.6, radius: 0.85, run: 2.8, walk: 1.4, aggro: 12, prefer: 2.4, style: 'club', turn: 2.4,
    cd: [0.9, 1.8], moves: HULK_MOVES, weights: { bore: 3, wallow: 2, surge: 1.5, stomp: 3 }, superArmor: true,
    model: { cloth: 0x2e3228, armor: 0x4e5248, skin: 0x6a7a5e, head: 'bare', weapon: 'club', bulk: 1.45, eyes: 0xa8ff4a, kit: 'hulk' },
  },
  flagellant: {
    name: 'Flagellant', hp: 240, poise: 16, scale: 1.0, radius: 0.45, run: 4.6, walk: 2.2, aggro: 12, prefer: 1.8, style: 'daggers', turn: 9,
    cd: [0.3, 1.0], moves: FLAG_MOVES, weights: { flurry: 3, whirl: 1.5, lunge: 1.5 }, elems: { bleed: 0.3 },
    // bleeding, it gets faster: a third quicker under half health, a mist of blood off it
    rate: (e) => (e.hp < e.maxHp * 0.5 ? 1.3 : 1),
    think: (e, dt) => { if (e.hp < e.maxHp * 0.5 && Math.random() < dt * 10) e.game.fx.blood(e.pos.clone().setY(1.0 + Math.random() * 0.6), null, 1); return false; },
    model: { cloth: 0x3a2a22, armor: 0x4a3a32, skin: 0x9a8070, head: 'bare', weapon: 'daggers', eyes: 0xff3a24, kit: 'flagellant' },
  },
  castellan: {
    name: 'Spire Castellan', hp: 320, poise: 60, scale: 1.12, radius: 0.55, run: 2.9, walk: 1.4, aggro: 11, prefer: 2.0, style: 'sword', turn: 4,
    cd: [0.8, 1.6], moves: CAST_MOVES, weights: { bash: 2, judgement: 2, advance: 1.2 }, onReceive: castellanGuard,
    model: { cloth: 0x1e1c22, armor: 0x2a2a30, skin: 0x7a6e66, head: 'bare', weapon: 'club', bulk: 1.12, eyes: 0xffc040, kit: 'castellan' },
  },
  augur: {
    name: 'Augur', hp: 160, poise: 10, scale: 1.1, radius: 0.45, run: 3.2, walk: 1.8, aggro: 15, prefer: 8, style: 'staff', turn: 5,
    cd: [1.0, 2.0], moves: AUGUR_MOVES, weights: { foretold: 3, bolt: 2, swipe: 1 }, ranged: true, backoff: 4, think: augurThink,
    model: { cloth: 0x2a2236, armor: 0x3a3048, skin: 0x8a7a70, head: 'bare', weapon: 'psystaff', eyes: 0xc890ff, kit: 'augur' },
  },
  bellwarden: {
    name: 'Bell-Warden', heavy: true, hp: 560, poise: 120, scale: 1.7, radius: 0.9, run: 2.6, walk: 1.3, aggro: 12, prefer: 2.6, style: 'club', turn: 2.2,
    cd: [1.0, 2.0], moves: BELL_MOVES, weights: { toll: 1.6, swing: 3, crush: 2, stomp: 3 }, superArmor: true,
    model: { cloth: 0x2a2420, armor: 0x3a3632, skin: 0x7a6e66, head: 'bare', weapon: 'club', bulk: 1.5, eyes: 0xffc040, kit: 'bellwarden' },
  },
};
for (const [k, T] of Object.entries(NEW_TYPES)) { T.hp *= NUM; TYPES[k] = T; }
export const FOE_NAMES = Object.fromEntries(Object.entries(TYPES).map(([k, T]) => [k, T.name]).filter(([, n]) => n));

// =====================================================================================================
// the models (kits.js): what each wears and carries. Purely visual.
// =====================================================================================================
const setWeapon = (r, g, base, tip) => { r.wpnR = g; r.base.position.set(0, 0, base); g.add(r.base); r.tip.position.set(0, 0, tip); g.add(r.tip); };

Object.assign(KITS, {
  // a Sump Wretch: hunched and swollen, a rebreather grown into the face, blisters that glow, one arm a fan of hooked
  // claws (the other has shorter ones), rags and a drowned man's harness
  wretch: {
    weapon: true,
    build(r, o) {
      const { bulk: b } = r.dims;
      const rag = r.m(0x3a4032), ragDk = r.m(0x262a22), hose = r.m(0x1a1c18), brass = r.m(0x6a5a2e), bone = r.m(0xb8b098), flesh = r.m(0x6a7a5a);
      const blister = basic(0xa8ff4a), T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // a hump of swollen flesh on the back, blisters glowing in it
      T.add(rbox(0.36 * b, 0.26, 0.2, flesh, 0, 0.58, -0.14 * b, 0.4, 0, 0));
      for (const [x, y, z] of [[-0.1, 0.66, -0.24], [0.08, 0.56, -0.25], [0.12, 0.72, -0.2], [-0.04, 0.48, -0.22]]) T.add(box(0.05, 0.05, 0.03, blister, x * b, y, z * b));
      // the face: a rebreather snout fused into the skin, hoses into the chest, a wet glint of eyes
      H.add(box(0.26, 0.24, 0.26, flesh, 0, 0.16, 0));
      H.add(box(0.16, 0.12, 0.12, hose, 0, 0.1, 0.15));
      const can = cyl(0.045, 0.045, 0.08, brass, 6); can.rotation.x = Math.PI / 2; can.position.set(0, 0.09, 0.24); H.add(can);
      for (const s of [1, -1]) H.add(rbox(0.03, 0.03, 0.24, hose, s * 0.08, 0.02, 0.1, 0.9, 0, 0));
      H.add(box(0.05, 0.05, 0.03, blister, 0.1, 0.27, 0.06));
      // the harness and rags, torn and dripping
      T.add(rbox(0.05, 0.5, 0.02, hose, 0, 0.42, 0.142 * b, 0, 0, 0.55)); T.add(box(0.06, 0.06, 0.03, brass, 0.06, 0.46, 0.16 * b));
      for (let i = 0; i < 3; i++) strip(r, hips, -0.1 + i * 0.1, -0.04, 0.13 * b, 0.09, [0.16 + Math.random() * 0.08, 0.1], i % 2 ? ragDk : rag, { lx: [-0.9, 0.1], taper: 0.8 });
      strip(r, T, 0, 0.7, -0.17 * b, 0.3, [0.26, 0.22], ragDk, { lx: [-0.1, 1.1], taper: 0.75 });
      // claws: three long hooks off the right hand, two shorter off the left
      const claws = (hand, n, len) => {
        const g = new THREE.Group(); hand.add(g);
        g.add(box(0.12, 0.08, 0.1, flesh, 0, 0, 0.04));
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * 0.045, c = rbox(0.022, 0.025, len, bone, x, -0.01, 0.06 + len / 2, 0.25, (i - (n - 1) / 2) * 0.12, 0);
          g.add(c); g.add(rbox(0.018, 0.02, 0.08, bone, x * 1.3, -0.06, 0.08 + len, 0.9, 0, 0)); // the hook at the end
        }
        return g;
      };
      setWeapon(r, claws(r.j.handR, 3, 0.36), 0.08, 0.46);
      r.wpnL = claws(r.j.handL, 2, 0.24);
      r.tipL = new THREE.Object3D(); r.tipL.position.z = 0.34; r.wpnL.add(r.tipL);
      r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.06; r.wpnL.add(r.baseL);
      if (Math.random() < 0.5) T.add(box(0.12, 0.1, 0.1, ragDk, -0.2 * b, 0.1, 0.06)); // a sack
      if (Math.random() < 0.4) for (let i = 0; i < 3; i++) r.j.foreR.add(box(0.13 * b, 0.025, 0.14 * b, hose, 0, -0.06 - i * 0.08, 0)); // wire bindings
    },
  },
  // a Hook Warden: a long oilskin coat in panels, a diving-helmet rebreather with a round grille and a lamp, a lantern
  // on the belt, waders, and a 3.5 m chain-gaff (an iron hook on a pole, chain wound round it)
  hook: {
    weapon: true,
    build(r, o) {
      const { bulk: b } = r.dims;
      const oil = r.m(0x2a2e2a), oilDk = r.m(0x1c201c), brass = r.m(0x7a5e2e), iron = r.m(0x4a4a50), haft = r.m(0x2a2420), chain = r.m(0x5a5a60), wader = r.m(0x22261e);
      const lamp = basic(0xffc060), T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // the diving helmet: a brass dome, a round face grille, a lamp on top
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), brass); dome.position.set(0, 0.18, 0); H.add(dome);
      H.add(box(0.18, 0.18, 0.04, iron, 0, 0.17, 0.16)); for (let i = 0; i < 3; i++) H.add(box(0.15, 0.02, 0.02, oilDk, 0, 0.11 + i * 0.06, 0.185));
      H.add(box(0.06, 0.06, 0.06, iron, 0, 0.36, 0.06)); H.add(box(0.04, 0.04, 0.02, lamp, 0, 0.36, 0.1));
      H.add(box(0.3, 0.06, 0.3, iron, 0, 0.02, 0)); // the collar
      // the coat: high collar, two long back panels, front flaps
      T.add(box(0.4 * b, 0.12, 0.3 * b, oil, 0, 0.7, 0));
      for (const s of [1, -1]) strip(r, T, s * 0.09, 0.66, -0.15 * b, 0.18, [0.4, 0.38, 0.2], oil, { spring: HEAVY_CLOTH, lx: [-0.1, 1.0], taper: 0.95, ry: s * 0.1 });
      for (const s of [1, -1]) strip(r, hips, s * 0.1, -0.02, 0.13 * b, 0.13, [0.3, 0.2], oilDk, { spring: HEAVY_CLOTH, lx: [-0.9, 0.1] });
      T.add(box(0.36 * b, 0.06, 0.24 * b, oilDk, 0, 0.07, 0));
      // a lantern on the belt
      const lp = pivot(T, 0.2 * b, 0.04, 0.08); lp.add(box(0.08, 0.12, 0.08, iron, 0, -0.08, 0)); lp.add(box(0.06, 0.08, 0.06, lamp, 0, -0.08, 0));
      r.spring(lp, { ...PLATE, k: 120, d: 3, rattle: 0.8, lx: [-0.6, 0.6], lz: [-0.4, 0.4] });
      for (const L of ['shinL', 'shinR']) r.j[L].add(box(0.15 * b, 0.36, 0.17 * b, wader, 0, -0.22, 0.005));
      // the chain-gaff
      const g = new THREE.Group(); r.j.handR.add(g);
      g.add(box(0.045, 0.045, 2.5, haft, 0, 0, 0.55));
      for (let i = 0; i < 9; i++) g.add(rbox(0.07, 0.03, 0.05, chain, 0, 0, 0.1 + i * 0.13, 0, 0, (i % 2) * 1.57)); // chain wound round the haft
      g.add(box(0.08, 0.08, 0.16, iron, 0, 0, 1.72)); // the socket
      g.add(rbox(0.04, 0.04, 0.3, iron, 0, 0, 1.92)); // the spike
      g.add(rbox(0.04, 0.22, 0.04, iron, 0, 0.1, 1.86)); g.add(rbox(0.04, 0.04, 0.14, iron, 0, 0.2, 1.8, 0.6, 0, 0)); // the hook, curling back
      g.add(box(0.05, 0.05, 0.04, r.m(0xa8a8b0), 0, 0, 2.08));
      setWeapon(r, g, 1.2, 2.06);
      if (Math.random() < 0.5) strip(r, g, 0, -0.05, 1.68, 0.03, [0.12, 0.12, 0.1], chain, { spring: { ...PLATE, k: 90, d: 3, rattle: 1, lx: [-0.8, 0.8], lz: [-0.8, 0.8] }, th: 0.03 }); // a loose length of chain
      if (Math.random() < 0.4) T.add(box(0.2, 0.26, 0.1, iron, 0, 0.45, -0.2 * b)); // an air tank
    },
  },
  // a Promethium Torcher: a quilted fire-suit, a hood with smoked goggles and a breathing grille, two fuel tanks on the
  // back with hazard bands and hoses to a squat flamer with a pilot light that never goes out
  torcher: {
    weapon: true,
    build(r, o) {
      const { bulk: b } = r.dims;
      const quilt = r.m(0x4a4232), quiltDk = r.m(0x322c22), tank = r.m(0x6a2a18), hazard = r.m(0x9a7a1e), hose = r.m(0x1a1a1a), iron = r.m(0x3a3a40), brass = r.m(0x7a5e2e);
      const lens = basic(0xff8a2a), pilot = basic(0x7ab0ff), T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // the hood and goggles
      H.add(box(0.29, 0.3, 0.3, quilt, 0, 0.18, -0.01)); H.add(box(0.31, 0.04, 0.31, quiltDk, 0, 0.26, -0.01));
      for (const s of [1, -1]) { H.add(box(0.08, 0.07, 0.04, brass, s * 0.065, 0.2, 0.15)); H.add(box(0.06, 0.05, 0.02, lens, s * 0.065, 0.2, 0.17)); }
      H.add(box(0.12, 0.08, 0.06, iron, 0, 0.08, 0.16)); for (let i = 0; i < 3; i++) H.add(box(0.1, 0.012, 0.02, hose, 0, 0.06 + i * 0.025, 0.195));
      // quilting lines on the suit, an apron of plate
      for (let i = 0; i < 4; i++) T.add(box(0.34 * b, 0.012, 0.02, quiltDk, 0, 0.3 + i * 0.1, 0.142 * b));
      strip(r, hips, 0, -0.04, 0.13 * b, 0.26, [0.22, 0.14], quiltDk, { spring: HEAVY_CLOTH, lx: [-0.9, 0.08] });
      // two tanks on the back, banded in hazard yellow, a hose looping to the flamer
      for (const s of [1, -1]) {
        const c = cyl(0.085, 0.085, 0.48, tank, 8); c.position.set(s * 0.1, 0.45, -0.22 * b); T.add(c);
        T.add(box(0.18, 0.04, 0.18, hazard, s * 0.1, 0.55, -0.22 * b)); T.add(box(0.05, 0.06, 0.05, brass, s * 0.1, 0.72, -0.22 * b));
      }
      strip(r, T, 0.18, 0.36, -0.12, 0.04, [0.16, 0.16, 0.14], hose, { spring: { ...CLOTH, k: 90 }, rx: 0.6, lx: [-0.8, 0.8], th: 0.04 });
      // the flamer: a squat body, a long nozzle, a pilot light at the muzzle
      const g = new THREE.Group(); r.j.handR.add(g);
      g.add(box(0.06, 0.12, 0.08, hose, 0, -0.06, 0)); // the grip
      g.add(box(0.12, 0.13, 0.42, iron, 0, 0.04, 0.2));
      const can = cyl(0.06, 0.06, 0.2, tank, 8); can.position.set(0, -0.07, 0.24); can.rotation.x = Math.PI / 2; g.add(can);
      g.add(box(0.06, 0.06, 0.44, iron, 0, 0.06, 0.62)); g.add(box(0.09, 0.09, 0.06, brass, 0, 0.06, 0.84));
      g.add(box(0.05, 0.05, 0.04, pilot, 0, -0.01, 0.86)); // the pilot light
      setWeapon(r, g, 0.6, 0.9);
      if (Math.random() < 0.4) T.add(box(0.06, 0.06, 0.02, r.m(0x8a1a12), 0.1, 0.56, 0.165 * b)); // a seal
      if (Math.random() < 0.5) for (const s of [1, -1]) r.j[s > 0 ? 'foreL' : 'foreR'].add(box(0.14 * b, 0.16, 0.15 * b, quiltDk, 0, -0.22, 0)); // gauntlets
    },
  },
  // a Bilge Hulk: a feral pump servitor, plate grown over flesh, a cluster of intake stacks on the back, the right arm a
  // pump-drill (a spiral bit on pistons with a fuel tank), hoses hanging, one green eye-lens
  hulk: {
    weapon: true,
    build(r, o) {
      const { bulk: b } = r.dims;
      const plateM = r.m(0x4e5248), plateDk = r.m(0x2e322a), flesh = r.m(0x6a7a5e), hose = r.m(0x1a1c18), rust = r.m(0x5a3622), hazard = r.m(0x9a7a1e);
      const glow = basic(0xa8ff4a), T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // the carapace, uneven, with flesh bulging between plates
      T.add(rbox(0.5 * b, 0.26, 0.4 * b, plateDk, 0.02, 0.74, -0.08, -0.35, 0, 0.06)); // a hunch of plate over the shoulders
      T.add(rbox(0.3 * b, 0.12, 0.3 * b, plateM, -0.06, 0.88, -0.16, -0.5, 0, -0.1));
      T.add(rbox(0.3 * b, 0.18, 0.2, flesh, -0.12, 0.5, 0.12 * b, 0.2, 0, 0.3));
      plate(r, T, 0.1, 0.48, 0.16 * b, 0.2, 0.2, 0.03, plateM, { edge: hazard, spring: { lx: [-0.6, 0.15] } });
      // intake stacks on the back
      for (const [x, h] of [[-0.18, 0.5], [0, 0.62], [0.16, 0.44]]) { const st = cyl(0.06, 0.08, h, plateDk, 7); st.position.set(x * b, 0.8 + h / 2, -0.2 * b); T.add(st); T.add(box(0.12, 0.03, 0.12, glow, x * b, 0.8 + h, -0.2 * b)); }
      // a low skull of a head under a brow plate, one eye-lens
      H.add(box(0.28, 0.22, 0.28, flesh, 0, 0.12, 0.02)); H.add(box(0.32, 0.08, 0.3, plateM, 0, 0.24, 0.02));
      H.add(box(0.07, 0.07, 0.03, glow, 0.06, 0.16, 0.16)); H.add(box(0.2, 0.06, 0.04, hose, 0, 0.05, 0.15));
      // hoses off the belt, a plate loincloth
      for (const s of [1, -1]) strip(r, hips, s * 0.18, -0.02, 0.1, 0.05, [0.12, 0.12, 0.1], hose, { spring: { ...PLATE, k: 150, d: 4, rattle: 0.8, lx: [-0.7, 0.4], lz: [-0.5, 0.5] }, th: 0.05 });
      strip(r, hips, 0, -0.05, 0.13 * b, 0.26, [0.24, 0.14], plateDk, { spring: HEAVY_CLOTH, lx: [-0.9, 0.1] });
      // the pump-drill on the right arm: a housing on the forearm, pistons, a tank, a spiral bit
      const fa = r.j.foreR; fa.add(box(0.2 * b, 0.3, 0.2 * b, plateM, 0, -0.18, 0));
      const g = new THREE.Group(); r.j.handR.add(g);
      const housing = cyl(0.13, 0.15, 0.36, plateDk, 8); housing.rotation.x = Math.PI / 2; housing.position.z = 0.12; g.add(housing);
      for (const s of [1, -1]) g.add(box(0.04, 0.04, 0.34, iron(r), s * 0.15, 0.06, 0.12));
      const tk = cyl(0.06, 0.06, 0.24, rust, 7); tk.position.set(0, 0.17, 0.08); tk.rotation.x = Math.PI / 2; g.add(tk); g.add(box(0.14, 0.03, 0.03, hazard, 0, 0.23, 0.08));
      const bit = new THREE.Group(); bit.position.z = 0.3; g.add(bit);
      for (let i = 0; i < 4; i++) { const c = cone(0.12 - i * 0.025, 0.16, r.m(0x8a8a90), 6); c.rotation.x = Math.PI / 2; c.position.z = 0.08 + i * 0.13; c.rotation.z = i * 0.5; bit.add(c); }
      setWeapon(r, g, 0.3, 0.85);
      r.spinners.push({ obj: bit, axis: 'z', speed: 18 }); // (the bit always turns)
      if (Math.random() < 0.5) { T.add(box(0.12, 0.12, 0.12, r.m(0xbab09a), -0.26 * b, 0.86, 0.04)); } // a skull on a spike
    },
  },
  // a Flagellant: bare scarred chest, a hood with a crown of iron nails, purity seals pinned into the skin, a loincloth
  // of red rags, a barbed scourge in each hand (a handle and three weighted chains)
  flagellant: {
    weapon: true,
    build(r, o) {
      const { bulk: b } = r.dims;
      const hood = r.m(0x2a1c18), rag = r.m(0x5a1412), ragDk = r.m(0x3a0c0a), iron = r.m(0x4a4844), wax = r.m(0x8a1a12), parch = r.m(0xc8bca0), scar = r.m(0x6a2a24), grip = r.m(0x2a1c14);
      const T = r.j.torso, H = r.j.head, hips = r.j.hips;
      H.add(box(0.28, 0.28, 0.29, hood, 0, 0.18, -0.01));
      const pk = cone(0.15, 0.24, hood, 4); pk.position.set(0, 0.42, -0.04); pk.rotation.y = Math.PI / 4; H.add(pk);
      H.add(box(0.2, 0.08, 0.02, r.m(0x1a1410), 0, 0.16, 0.15)); // the face in shadow
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, n = cone(0.015, 0.13, iron, 3); n.position.set(Math.sin(a) * 0.15, 0.36, Math.cos(a) * 0.15); H.add(n); } // the crown of nails
      // scars across the chest and back, seals pinned in
      for (const [x, y, rz] of [[-0.06, 0.5, 0.6], [0.06, 0.42, -0.5], [0, 0.32, 0.3], [0.1, 0.58, -0.8]]) { T.add(rbox(0.16, 0.015, 0.02, scar, x, y, 0.142 * b, 0, 0, rz)); T.add(rbox(0.16, 0.015, 0.02, scar, x, y, -0.142 * b, 0, 0, -rz)); }
      for (const s of [1, -1]) { T.add(box(0.07, 0.07, 0.03, wax, s * 0.12, 0.6, 0.16 * b)); strip(r, T, s * 0.12, 0.56, 0.17 * b, 0.04, [0.14, 0.08], parch, { lx: [-0.6, 0.2], th: 0.012 }); }
      T.add(box(0.36 * b, 0.05, 0.24 * b, iron, 0, 0.06, 0)); // a chain belt
      for (let i = 0; i < 4; i++) strip(r, hips, -0.14 + i * 0.09, -0.04, 0.13 * b, 0.08, [0.2 + Math.random() * 0.08, 0.1], i % 2 ? ragDk : rag, { lx: [-0.9, 0.1] });
      strip(r, hips, 0, -0.04, -0.12 * b, 0.28, [0.24, 0.12], rag, { lx: [-0.1, 0.9] });
      // the scourges: a handle, three chains that swing, iron barbs at their ends
      const scourge = (hand) => {
        const g = new THREE.Group(); hand.add(g);
        g.add(box(0.045, 0.045, 0.22, grip, 0, 0, 0.04)); g.add(box(0.07, 0.07, 0.04, iron, 0, 0, 0.16));
        for (const x of [-0.03, 0, 0.03]) {
          const segs = strip(r, g, x, 0, 0.18, 0.02, [0.14, 0.14, 0.12], iron, { spring: { ...PLATE, k: 60, d: 2.5, rattle: 1, lx: [-1.2, 1.2], lz: [-1.0, 1.0] }, rx: -Math.PI / 2 + 0.2, th: 0.02 });
          segs[segs.length - 1].add(box(0.05, 0.05, 0.05, r.m(0x6a6a70), 0, -0.13, 0));
        }
        return g;
      };
      setWeapon(r, scourge(r.j.handR), 0.12, 0.55);
      r.wpnL = scourge(r.j.handL);
      r.tipL = new THREE.Object3D(); r.tipL.position.z = 0.55; r.wpnL.add(r.tipL);
      r.baseL = new THREE.Object3D(); r.baseL.position.z = 0.12; r.wpnL.add(r.baseL);
      if (Math.random() < 0.4) { T.add(rbox(0.03, 0.9, 0.03, iron, 0, 0.6, -0.16 * b, 0, 0, 0.1)); T.add(box(0.3, 0.03, 0.03, iron, 0.03, 0.95, -0.16 * b)); } // a penitent's iron cross on the back
    },
  },
  // a Spire Castellan: black plate with gold trim, a tall pointed great helm with a burning eye-slit, a tabard with the
  // Augury Eye, a tower shield on the left arm with the Eye in gold, and a crackling power-mace
  castellan: {
    weapon: true,
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const plateM = r.m(0x2a2a30), plateHi = r.m(0x3e3e46), gold = r.m(0x8a6a2a), cloth = r.m(0x1e1c22), tab = r.m(0x3a2a50), haft = r.m(0x1a1814);
      const slit = basic(0xffc040), arc = basic(0x9ad0ff), T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // the great helm, pointed, a cross of eye-slits
      H.add(box(0.29, 0.34, 0.3, plateM, 0, 0.2, 0));
      const pk = cone(0.16, 0.26, plateM, 4); pk.position.set(0, 0.5, 0); pk.rotation.y = Math.PI / 4; H.add(pk);
      H.add(box(0.2, 0.025, 0.02, slit, 0, 0.22, 0.155)); H.add(box(0.025, 0.12, 0.02, slit, 0, 0.18, 0.155));
      H.add(box(0.3, 0.025, 0.31, gold, 0, 0.36, 0));
      // pauldrons in lames, gold edged
      for (const s of [1, -1]) {
        const pv = pivot(T, s * sw, 0.66, 0, 0, 0, -s * 0.35);
        pv.add(box(0.26 * b, 0.13, 0.32 * b, plateM, s * 0.03, 0, 0)); pv.add(box(0.27 * b, 0.025, 0.33 * b, gold, s * 0.03, 0.07, 0));
        plate(r, pv, s * 0.05, -0.05, 0, 0.24 * b, 0.08, 0.3 * b, plateHi, { edge: gold, spring: { k: 400 } });
      }
      // breastplate, gold trim, the tabard with the Eye
      T.add(box(0.4 * b, 0.36, 0.03, plateHi, 0, 0.48, 0.14 * b)); T.add(box(0.4 * b, 0.025, 0.035, gold, 0, 0.64, 0.14 * b));
      strip(r, hips, 0, -0.04, 0.14 * b, 0.24, [0.3, 0.22], tab, { spring: HEAVY_CLOTH, lx: [-0.9, 0.08], trim: gold, rune: slit });
      strip(r, hips, 0, -0.04, -0.13 * b, 0.3, [0.32, 0.24], cloth, { spring: HEAVY_CLOTH, lx: [-0.08, 0.9] });
      for (const s of [1, -1]) plate(r, hips, s * 0.13, -0.04, 0.06, 0.14, 0.24, 0.16, plateM, { edge: gold, spring: { k: 380, lx: [-0.9, 0.1] } });
      // the tower shield on the left forearm: tall, a gold rim, the Eye
      // (carried on the chest's left, square to the front, as the Templar's is: it turns with the body)
      const sh = new THREE.Group(); sh.position.set(0.24 * b, 0.32, 0.24 * b); sh.rotation.set(0.04, -0.28, 0); T.add(sh);
      sh.add(box(0.5, 0.96, 0.07, plateM, 0, 0, 0));
      for (const y of [0.47, -0.47]) sh.add(box(0.52, 0.04, 0.08, gold, 0, y, 0));
      for (const x of [0.25, -0.25]) sh.add(box(0.03, 0.96, 0.08, gold, x, 0, 0));
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 4, 12), gold); eye.position.set(0, 0.12, 0.045); sh.add(eye);
      sh.add(box(0.06, 0.06, 0.03, slit, 0, 0.12, 0.05));
      const pt = box(0.36, 0.2, 0.07, plateM, 0, -0.56, 0); pt.scale.x = 0.7; sh.add(pt); // the point
      r.shield = sh;
      // the power-mace: a haft, a flanged head, a coil that crackles blue
      const g = new THREE.Group(); r.j.handR.add(g);
      g.add(box(0.05, 0.05, 0.8, haft, 0, 0, 0.25)); g.add(box(0.07, 0.07, 0.08, gold, 0, 0, -0.14));
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(rbox(0.04, 0.16, 0.22, plateHi, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.74, 0, 0, a)); }
      g.add(box(0.1, 0.1, 0.26, plateM, 0, 0, 0.74)); g.add(box(0.12, 0.12, 0.03, arc, 0, 0, 0.6)); g.add(box(0.06, 0.06, 0.06, gold, 0, 0, 0.9));
      setWeapon(r, g, 0.4, 0.88);
      for (const L of ['shinL', 'shinR']) { r.j[L].add(box(0.15 * b, 0.32, 0.17 * b, plateM, 0, -0.22, 0.01)); r.j[L].add(box(0.16 * b, 0.06, 0.08, gold, 0, -0.03, 0.08)); }
    },
  },
  // an Augur: a tall robed seer, eyes sewn shut, a brass oracle-eye on the brow that glows, a halo of prayer-scrolls
  // turning round its head, violet light leaking from the seams of the robe, a censer-staff
  augur: {
    weapon: true,
    build(r, o) {
      const { bulk: b } = r.dims;
      const robe = r.m(0x2a2236), robeDk = r.m(0x1c1626), gold = r.m(0x8a6a2a), parch = r.m(0xc8bca0), stitch = r.m(0x1a1210), haft = r.m(0x1a1814), skin = r.m(0x8a7a70);
      const light = basic(0xc890ff), eyeGlow = basic(0xe0c0ff), T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // the head: a bare, shaved skull, the eyes sewn shut, the oracle-eye on the brow in brass rings
      H.add(box(0.24, 0.27, 0.26, skin, 0, 0.17, 0));
      for (const s of [1, -1]) { H.add(box(0.07, 0.012, 0.02, stitch, s * 0.06, 0.18, 0.135)); for (let i = 0; i < 3; i++) H.add(box(0.008, 0.035, 0.02, stitch, s * 0.06 - 0.025 + i * 0.025, 0.18, 0.137)); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 10), gold); ring.position.set(0, 0.27, 0.135); H.add(ring);
      H.add(box(0.05, 0.05, 0.03, eyeGlow, 0, 0.27, 0.14));
      // the cowl, a high collar
      H.add(box(0.3, 0.2, 0.3, robe, 0, 0.26, -0.04)); T.add(box(0.36, 0.16, 0.3, robe, 0, 0.72, -0.02));
      // a halo of scrolls turning round its head
      const halo = new THREE.Group(); halo.position.set(0, 0.32, -0.02); H.add(halo);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, sc = box(0.04, 0.12, 0.04, parch, Math.cos(a) * 0.3, Math.sin(i * 2.1) * 0.03, Math.sin(a) * 0.3); halo.add(sc); halo.add(box(0.05, 0.02, 0.05, gold, Math.cos(a) * 0.3, 0.07, Math.sin(a) * 0.3)); }
      r.spinners.push({ obj: halo, axis: 'y', speed: 0.8 });
      // the robe to the ground: panels front and back, light in the seams
      T.add(box(0.03, 0.5, 0.02, light, 0, 0.36, 0.142 * b)); T.add(box(0.36 * b, 0.05, 0.25 * b, gold, 0, 0.08, 0));
      for (const s of [1, -1]) strip(r, hips, s * 0.08, -0.02, 0.13 * b, 0.16, [0.32, 0.32, 0.2], robe, { spring: HEAVY_CLOTH, lx: [-0.9, 0.2], taper: 1.05 });
      for (const s of [1, -1]) strip(r, hips, s * 0.08, -0.02, -0.13 * b, 0.16, [0.32, 0.32, 0.2], robeDk, { spring: HEAVY_CLOTH, lx: [-0.2, 0.9], taper: 1.05 });
      for (const s of [1, -1]) strip(r, hips, s * 0.17, -0.02, 0, 0.04, [0.3, 0.3], light, { spring: HEAVY_CLOTH, lx: [-0.5, 0.5], th: 0.01 });
      for (const s of [1, -1]) strip(r, T, s * 0.1, 0.48, 0.155 * b, 0.04, [0.18, 0.12], parch, { lx: [-0.6, 0.2], th: 0.012 }); // prayer strips
      // the censer-staff: a long haft, a gold crook at the top, a censer swinging on a chain under it, smoking
      const g = new THREE.Group(); r.j.handR.add(g);
      g.add(box(0.045, 0.045, 1.9, haft, 0, 0, 0.4));
      for (const z of [-0.3, 0.6, 1.2]) g.add(box(0.06, 0.06, 0.05, gold, 0, 0, z));
      g.add(rbox(0.04, 0.04, 0.24, gold, 0, 0.08, 1.4, -0.7, 0, 0));
      const cp = pivot(g, 0, 0.12, 1.5); const cs = new THREE.Group(); cp.add(cs);
      cs.add(box(0.012, 0.18, 0.012, gold, 0, -0.09, 0)); cs.add(box(0.12, 0.12, 0.12, gold, 0, -0.22, 0)); cs.add(box(0.07, 0.04, 0.07, light, 0, -0.15, 0));
      r.spring(cp, { ...PLATE, k: 60, d: 2, rattle: 0.6, lx: [-0.9, 0.9], lz: [-0.9, 0.9] });
      setWeapon(r, g, 0.9, 1.5);
      if (Math.random() < 0.5) for (let i = 0; i < 3; i++) T.add(box(0.05, 0.08, 0.03, r.m(0x8a1a12), -0.12 + i * 0.12, 0.6, 0.16 * b)); // wax seals in a row
    },
  },
  // a Bell-Warden: a giant in bronze-plated harness and chains, a bell-cage on its back with a censer burning inside,
  // a hood of chainmail, a bronze bell on a chain from each fist
  bellwarden: {
    weapon: true,
    build(r, o) {
      const { bulk: b, sw } = r.dims;
      const bronze = r.m(0x7a5a2a), bronzeDk = r.m(0x4a3a1e), iron = r.m(0x3a3632), mail = r.m(0x4a4a50), cloth = r.m(0x2a2420), chainM = r.m(0x5a5a60);
      const ember = basic(0xffa040), T = r.j.torso, H = r.j.head, hips = r.j.hips;
      // a mail hood and a bronze face-mask with a mouth-grille
      H.add(box(0.3, 0.3, 0.3, mail, 0, 0.18, -0.01)); H.add(box(0.22, 0.22, 0.04, bronze, 0, 0.16, 0.16));
      for (let i = 0; i < 3; i++) H.add(box(0.14, 0.015, 0.02, bronzeDk, 0, 0.08 + i * 0.03, 0.185));
      for (const s of [1, -1]) H.add(box(0.05, 0.03, 0.02, ember, s * 0.06, 0.2, 0.185));
      // pauldrons of bell-bronze, crossed chains over the chest
      for (const s of [1, -1]) { const pv = pivot(T, s * sw, 0.68, 0, 0, 0, -s * 0.4); pv.add(box(0.3 * b, 0.16, 0.34 * b, bronze, s * 0.03, 0, 0)); pv.add(box(0.31 * b, 0.03, 0.35 * b, bronzeDk, s * 0.03, -0.06, 0)); }
      for (const s of [1, -1]) for (let i = 0; i < 6; i++) T.add(rbox(0.06, 0.03, 0.05, chainM, s * (-0.15 + i * 0.06) * b, 0.66 - i * 0.07, 0.15 * b, 0, 0, s * 0.7 + (i % 2) * 1.57));
      // the bell-cage on its back, a censer burning in it
      const cage = new THREE.Group(); cage.position.set(0, 0.8, -0.3 * b); T.add(cage);
      for (const [x, z] of [[-0.16, -0.12], [0.16, -0.12], [-0.16, 0.12], [0.16, 0.12]]) cage.add(box(0.03, 0.6, 0.03, iron, x, 0, z));
      cage.add(box(0.38, 0.04, 0.3, iron, 0, 0.3, 0)); cage.add(box(0.38, 0.04, 0.3, iron, 0, -0.3, 0));
      const cbell = cone(0.1, 0.18, bronzeDk, 8); cbell.position.y = 0.1; cage.add(cbell); cage.add(box(0.08, 0.06, 0.08, ember, 0, -0.04, 0));
      // a heavy loincloth, plates over it
      strip(r, hips, 0, -0.05, 0.13 * b, 0.3, [0.3, 0.2], cloth, { spring: HEAVY_CLOTH, lx: [-0.9, 0.08] });
      strip(r, hips, 0, -0.05, -0.13 * b, 0.34, [0.3, 0.2], cloth, { spring: HEAVY_CLOTH, lx: [-0.08, 0.9] });
      // the bells: a chain from each fist to a bronze bell (it swings with the spring)
      const bellOn = (hand) => {
        const g = new THREE.Group(); hand.add(g);
        g.add(box(0.12, 0.12, 0.12, iron, 0, 0, 0));
        const segs = strip(r, g, 0, -0.04, 0.04, 0.04, [0.16, 0.16], chainM, { spring: { ...PLATE, k: 140, d: 4, rattle: 0.6, lx: [-0.8, 0.8], lz: [-0.8, 0.8] }, rx: -1.2, th: 0.04 });
        const end = segs[segs.length - 1];
        const bell = cone(0.22, 0.36, bronze, 10); bell.position.y = -0.3; end.add(bell);
        end.add(box(0.36, 0.04, 0.36, bronzeDk, 0, -0.46, 0)); end.add(box(0.08, 0.1, 0.08, iron, 0, -0.48, 0)); // the lip, the clapper
        return { g, end };
      };
      const R = bellOn(r.j.handR), L = bellOn(r.j.handL);
      r.wpnR = R.g; r.base.position.set(0, -0.1, 0); R.end.add(r.base); r.tip.position.set(0, -0.48, 0); R.end.add(r.tip);
      r.wpnL = L.g; r.tipL = new THREE.Object3D(); r.tipL.position.y = -0.48; L.end.add(r.tipL); r.baseL = new THREE.Object3D(); r.baseL.position.y = -0.1; L.end.add(r.baseL);
      for (const L2 of ['foreL', 'foreR']) r.j[L2].add(box(0.16 * b, 0.2, 0.17 * b, bronzeDk, 0, -0.2, 0));
    },
  },
});
function iron(r) { return r.m(0x4a4a50); }
