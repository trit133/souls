// The Sunless Deep's enemies (region 2: docs/region2-design.md). Each joins the enemy types (enemies.js TYPES) and
// model kits (kits.js KITS) when this module loads (regions.js imports it). Every area has a fodder enemy, a ranged
// one, an assassin and a heavy, harder area by area, each with a trick:
//
// Lanternhold (the mining town): Shaft Rat (packs), Rivet Gunner (bursts, then vents steam to reload), Shaft Creeper
//   (unseen outside light, pounces and slips back into the dark), Ore Hauler (heavy: its slam brings the roof down)
// The Wormways (the tunnels): Burrow Grub (bursts in acid when it dies), Spore Lobber (poison clouds), Burrower
//   (travels under the floor and erupts under you), Borer Thrall (heavy: a drill charge, digs in and comes up under you)
// Glasshallow (the crystal city): Glass Acolyte (shatters when it dies), Prism Lancer (a beam that can bounce off the
//   crystal pillars), Mirror Shade (splits in three; only the real one casts a shadow), Shardback (heavy: crystal
//   plates that take the blows until they crack off)
//
// Hooks a type can carry (enemies.js): think(e, dt, p, dist) -> true when it acted, frame(e, dt) every frame (looks),
// onDie(e), onReceive(e, info) -> info, rate(e), noGold.
import * as THREE from 'three';
import { NUM } from './scale.js';
import { TYPES } from './enemies.js';
import { angDiff } from './actor.js';
import { KITS, strip, basic } from './kits.js';
import { box, cyl, cone, rbox } from './mesh.js';

// ---------- shared bits ----------
const V = new THREE.Vector3();
const tipPos = (e) => (e.rig.tip ? e.rig.tip.getWorldPosition(new THREE.Vector3()) : e.pos.clone().setY(1.2 + (e.pos.y || 0)));
const turnTo = (k) => (e) => { if (e.target) e.yaw += angDiff(e.yaw, e.yawTo(e.target.pos)) * k; };
const glint = (rgb, sound) => (e, g) => { g.fx.burst(tipPos(e), 12, rgb, 2.5, 0.4, 0.45); e.rig.flash(rgb[0], rgb[1], rgb[2]); if (sound) g.audio.play(sound, 0.3); };
const every = (t0, t1, step, fn) => { const out = []; for (let t = t0; t <= t1 + 1e-6; t += step) { const k = (t - t0) / (t1 - t0 || 1); out.push({ t: +t.toFixed(3), fn: (e, g) => fn(e, g, k) }); } return out; };
const S = (e) => e.rig.root.scale.y || 1;
const Y = (e) => e.pos.y || 0;
// a strike on every player near (x, z) the way a shot lands (blockable, never parried; rolls dodge it)
const areaHit = (e, g, x, z, test, q) => {
  for (const t of g.allPlayers()) if (t.alive && test(t, Math.hypot(t.pos.x - x, t.pos.z - z))) g.projectileHit(t, { dmg: q.dmg * NUM * (e.dmgScale || 1), knock: q.knock, src: [x, z], elems: q.elems || e.elems, buildMul: e.elemBuild });
};
// a lingering patch on the ground (acid, spores): hurts anyone standing in it every half second, fades out
const hazard = (g, x, z, r, dur, color, q) => {
  const w = g.world, y = w.floorAt(x, z) + 0.05;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 18), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.set(x, y, z); g.scene.add(disc);
  let t = 0, tick = 0.25;
  const H = { x, z, update: (dt) => {
    t += dt; tick -= dt;
    disc.material.opacity = 0.5 * Math.min(1, (dur - t) / 0.6);
    if (Math.random() < dt * (q.cloud ? 26 : 10)) g.fx.norm.spawn({ x: x + (Math.random() - 0.5) * r * 1.6, y: y + (q.cloud ? 0.4 + Math.random() * 1.2 : 0.05), z: z + (Math.random() - 0.5) * r * 1.6, vy: q.cloud ? 0.3 : 0.6, life: q.cloud ? 1.4 : 0.6, size: q.cloud ? 0.6 : 0.15, size1: q.cloud ? 1.2 : 0.05, r: q.rgb[0], g: q.rgb[1], b: q.rgb[2], alpha: q.cloud ? 0.35 : 0.7, drag: 1 });
    if (tick <= 0) {
      tick = 0.5;
      for (const p of g.allPlayers()) if (p.alive && Math.hypot(p.pos.x - x, p.pos.z - z) < r + p.radius * 0.5 && Math.abs((p.pos.y || 0) - y) < 1.5) g.projectileHit(p, { dmg: q.dmg * NUM, knock: 'none', src: [x, z], elems: q.elems });
    }
    if (t >= dur) { g.scene.remove(disc); disc.geometry.dispose(); const i = w.ambient.indexOf(H); if (i >= 0) w.ambient.splice(i, 1); }
  } };
  w.ambient.push(H);
};
// a heavy's stomp behind it
const STOMP = {
  dur: 1.25, range: 3.0, track: [0.1, 1], sfx: [0.6, 'slam'], recover: 0.35, armor: true, unparryable: true, rear: true,
  keys: [
    [0.5, { legL: [-1.3, 0, 0.1], shinL: [1.2, 0, 0], torso: [-0.25, 0, 0], armL: [-0.5, 0, 0.8], armR: [-0.3, 0, -0.8], by: 0.12 }],
    [0.62, { legL: [-0.3, 0, 0.1], shinL: [0.2, 0, 0], torso: [0.3, 0, 0], armL: [-0.2, 0, 0.5], armR: [-0.2, 0, -0.5], by: -0.25 }],
  ],
  hits: [{ t0: 0.6, t1: 0.68, shape: 'circle', offset: 0, radius: 2.8, dmg: 26, poise: 45, knock: 'heavy' }],
  onTime: [{ t: 0.1, fn: (e, g) => { e.tele = g.fx.telegraph(e.pos.x, e.pos.z, 2.8, 0.55); } }, { t: 0.62, fn: (e, g) => g.impact(e.pos.x, e.pos.z, 3.0, 0.45) }],
};

// poses
const P_WIND_R = { torso: [0.1, -0.9, 0], armR: [-2.2, 0, -0.6], foreR: [-0.6, 0, 0], handR: [0.5, 0, 0], armL: [-0.6, 0, 0.5], foreL: [-0.9, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0], by: -0.1 };
const P_CUT_R = { torso: [0.5, 0.7, 0], armR: [-0.7, 0, 0.6], foreR: [-0.2, 0, 0], handR: [1.0, 0, 0], armL: [-0.4, 0, 0.4], foreL: [-1.0, 0, 0], legL: [-0.6, 0, 0], legR: [0.45, 0, 0], shinR: [0.4, 0, 0], by: -0.2 };
const P_WIND_L = { torso: [0.3, 0.8, 0], armL: [-2.0, 0, 0.7], foreL: [-0.5, 0, 0], armR: [-0.8, 0, -0.4], foreR: [-0.5, 0, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], by: -0.14 };
const P_CUT_L = { torso: [0.5, -0.6, 0], armL: [-0.8, 0, -0.6], foreL: [-0.2, 0, 0], armR: [-0.5, 0, 0.3], foreR: [-0.9, 0, 0], legL: [0.4, 0, 0], legR: [-0.6, 0, 0], shinL: [0.4, 0, 0], by: -0.2 };
const P_RAISE = { torso: [-0.35, 0, 0], armR: [-3.0, 0, -0.2], foreR: [-0.5, 0, 0], handR: [0.8, 0, 0], armL: [-2.8, 0, 0.3], foreL: [-0.5, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0.02 };
const P_SLAM = { torso: [0.8, 0, 0], armR: [-0.7, 0, 0.05], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-0.8, 0, 0.1], legL: [-0.85, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.35 };
const P_THRUST_W = { torso: [0.15, -0.55, 0], armR: [0.45, 0, -0.25], foreR: [-1.6, 0, 0], handR: [1.2, 0, 0], armL: [-1.0, 0, 0.3], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], shinL: [0.4, 0, 0], shinR: [0.7, 0, 0], by: -0.3 };
const P_THRUST = { torso: [0.45, 0.3, 0], armR: [-1.5, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.4, 0, 0.8], legL: [-0.9, 0, 0], legR: [0.7, 0, 0], shinR: [0.5, 0, 0], by: -0.25 };
const P_CROUCH = { torso: [0.75, 0, 0], head: [-0.6, 0, 0], armR: [-0.4, 0, -0.5], foreR: [-1.0, 0, 0], armL: [-0.4, 0, 0.5], foreL: [-1.0, 0, 0], legL: [-1.2, 0, 0], legR: [-1.2, 0, 0], shinL: [1.6, 0, 0], shinR: [1.6, 0, 0], by: -0.42 };
const P_LEAP = { torso: [0.2, 0, 0], head: [-0.3, 0, 0], armR: [-2.7, 0, -0.4], foreR: [-0.3, 0, 0], armL: [-2.7, 0, 0.4], foreL: [-0.3, 0, 0], legL: [-0.9, 0, 0], legR: [0.3, 0, 0], shinL: [1.2, 0, 0], shinR: [0.9, 0, 0], by: 0.45 };
const P_LAND = { torso: [0.85, 0, 0], head: [-0.5, 0, 0], armR: [-1.0, 0, 0.2], foreR: [-0.2, 0, 0], armL: [-1.0, 0, -0.2], foreL: [-0.2, 0, 0], legL: [-1.0, 0, 0], legR: [0.5, 0, 0], shinL: [1.3, 0, 0], shinR: [0.7, 0, 0], by: -0.4 };
const P_AIM = { torso: [0.1, 0.35, 0], armR: [-1.55, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.3, 0, 0.6], foreL: [-0.6, 0, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0], by: -0.06 };
const P_LOB = { torso: [-0.3, -0.4, 0], armR: [-2.8, 0, -0.3], foreR: [-0.8, 0, 0], armL: [-0.8, 0, 0.5], legL: [0.3, 0, 0], legR: [-0.3, 0, 0], by: 0 };
const P_TOSS = { torso: [0.4, 0.3, 0], armR: [-1.6, 0, 0.2], foreR: [-0.1, 0, 0], armL: [-0.5, 0, 0.5], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], by: -0.12 };

// =====================================================================================================
// LANTERNHOLD
// =====================================================================================================
// ---------- Shaft Rat: a scrawny miner with a hand pick, in packs ----------
const RAT_MOVES = {
  jab: {
    parry: true, dur: 0.85, range: 1.8, track: [0.3, 8], sfx: [0.3, 'swing'], trail: [0.3, 0.45], recover: 0.25,
    keys: [[0.26, P_WIND_R], [0.4, P_CUT_R], [0.65, P_CUT_R]],
    hits: [{ t0: 0.32, t1: 0.44, range: 1.9, arc: 1.8, dmg: 17, poise: 12 }],
    move: [[0.25, 0.42, 1.2]], stopAt: 0.8,
  },
  hack: {
    parry: true, dur: 1.35, range: 1.9, track: [0.34, 7], sfx: [0.34, 'swing'], trail: [0.36, 0.9], recover: 0.3,
    keys: [[0.3, P_RAISE], [0.46, P_SLAM], [0.66, P_RAISE], [0.82, P_SLAM], [1.1, P_SLAM]],
    hits: [{ t0: 0.42, t1: 0.52, range: 1.9, arc: 1.4, dmg: 18, poise: 14 }, { t0: 0.78, t1: 0.88, range: 1.9, arc: 1.4, dmg: 20, poise: 16 }],
    move: [[0.3, 0.5, 0.8], [0.66, 0.84, 0.7]], stopAt: 0.9,
    onTime: [{ t: 0.62, fn: turnTo(0.6) }],
  },
};

// ---------- Rivet Gunner: three rivets in a burst, then he has to vent his tank ----------
const rivet = (e, g) => {
  const p = e.target; if (!p) return;
  const from = new THREE.Vector3(e.pos.x, 1.3 * S(e) + Y(e), e.pos.z).addScaledVector(e.fwd(), 0.8);
  const to = new THREE.Vector3(p.pos.x + (Math.random() - 0.5) * 0.6, 1.0 + (p.pos.y || 0), p.pos.z + (Math.random() - 0.5) * 0.6);
  const dir = to.sub(from).normalize();
  if (Math.abs(angDiff(Math.atan2(dir.x, dir.z), e.yaw)) > 0.35) { const f = e.fwd(); dir.set(f.x, dir.y, f.z).normalize(); }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd890 }));
  mesh.position.copy(from); mesh.lookAt(from.clone().add(dir)); g.scene.add(mesh);
  g.addProj(g.foeCrit(e, { kind: 'arrow', pos: from, vel: dir.multiplyScalar(22), life: 1.2, mesh, r: 0.3, dmg: 14 * NUM * (e.dmgScale || 1), elems: e.elems }));
  g.fx.sparks(from, null, 5, [1, 0.85, 0.5]); g.audio.play('bow', 0.5); g.audio.play('clang', 0.15);
};
const vent = (e, g) => { const s = S(e); for (let i = 0; i < 3; i++) g.fx.norm.spawn({ x: e.pos.x - Math.sin(e.yaw) * 0.3 * s, y: 1.5 * s + Y(e), z: e.pos.z - Math.cos(e.yaw) * 0.3 * s, vx: (Math.random() - 0.5) * 1.5, vy: 2.5, vz: (Math.random() - 0.5) * 1.5, life: 0.9, size: 0.3, size1: 1.0, r: 0.85, g: 0.88, b: 0.9, alpha: 0.5, drag: 1 }); };
const RIVET_MOVES = {
  burst: {
    ranged: true, dur: 2.9, range: 12, minRange: 2.5, track: [0.2, 4], recover: 0.3,
    keys: [[0.4, P_AIM], [1.2, P_AIM], [1.5, { ...P_AIM, torso: [0.2, 0.35, 0] }], [2.8, { ...P_AIM, armR: [-0.6, 0, -0.2], torso: [0.3, 0, 0] }]],
    onTime: [
      { t: 0.15, fn: glint([1, 0.8, 0.4]) },
      { t: 0.55, fn: rivet }, { t: 0.75, fn: rivet }, { t: 0.95, fn: rivet },
      // the vent: 1.5 s of steam from his tank while he can't fire (your way in)
      { t: 1.2, fn: (e, g) => g.audio.play('fog', 0.4) },
      ...every(1.25, 2.7, 0.06, vent),
    ],
  },
  bash: {
    parry: true, dur: 1.1, range: 1.8, maxRange: 2.4, track: [0.35, 6], sfx: [0.36, 'swing'], recover: 0.3,
    keys: [[0.32, P_WIND_L], [0.48, P_CUT_L], [0.8, P_CUT_L]],
    hits: [{ t0: 0.4, t1: 0.5, range: 1.9, arc: 2.0, dmg: 16, poise: 18, knockback: 9 }],
  },
};

// ---------- Shaft Creeper: unseen outside the light; drops on you, stabs three times, slips back into the dark ----------
const CREEPER_MOVES = {
  pounce: {
    dur: 1.5, range: 6.5, minRange: 2.4, track: [0.45, 5], sfx: [0.45, 'swing'], trail: [0.6, 0.85], recover: 0.35,
    keys: [[0.38, P_CROUCH], [0.55, P_LEAP], [0.78, P_LAND], [1.2, P_LAND]],
    hits: [{ t0: 0.74, t1: 0.86, range: 1.9, arc: 1.8, dmg: 30, poise: 30 }],
    move: [[0.45, 0.8, 4.4]], stopAt: 0.7,
    onTime: [{ t: 0.4, fn: (e, g) => g.audio.play('roll', 0.5) }, { t: 0.82, fn: (e, g) => g.fx.dust(e.pos, 6, 0.9) }],
  },
  stab3: {
    parry: true, dur: 1.15, range: 1.7, track: [0.25, 8], sfx: [0.25, 'swing'], trail: [0.25, 0.8], recover: 0.2,
    keys: [[0.22, P_THRUST_W], [0.32, P_THRUST], [0.44, { ...P_THRUST_W, armL: [-1.5, 0, 0], foreL: [0, 0, 0] }], [0.54, { ...P_THRUST, armL: [-1.5, 0, 0] }], [0.66, P_THRUST_W], [0.76, P_THRUST], [1.0, P_THRUST]],
    hits: [{ t0: 0.28, t1: 0.36, range: 1.8, arc: 1.2, dmg: 12, poise: 8 }, { t0: 0.5, t1: 0.58, range: 1.8, arc: 1.2, dmg: 12, poise: 8, parry: false }, { t0: 0.72, t1: 0.8, range: 1.8, arc: 1.2, dmg: 16, poise: 14 }],
    move: [[0.2, 0.8, 1.6]], stopAt: 0.8,
    onTime: [{ t: 0.46, fn: (e, g) => g.audio.play('swing', 0.7) }, { t: 0.68, fn: (e, g) => g.audio.play('swing', 0.8) }],
  },
};
// lit: inside a player's cone (5 m ahead) or close round them (2.5 m), or near a burning light; checked a few times a second
const litFor = (e, g) => {
  if ((e.litAt = (e.litAt ?? 0) - 1) > 0) return e.lit;
  e.litAt = 6;
  let lit = false;
  for (const p of g.allPlayers()) {
    const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
    if (d < 2.5 || (d < 6 && Math.abs(angDiff(p.yaw, Math.atan2(dx, dz))) < 0.6)) { lit = true; break; }
  }
  if (!lit) for (const L of g.world.lights) { if (Math.abs(L.x - e.pos.x) < 3 && Math.abs(L.z - e.pos.z) < 3 && (L.power || 0) >= 4 && (!L.src?.cond || L.src.cond())) { lit = true; break; } }
  if (e.state === 'attack' || e.state === 'hurt' || e.hpShow > 3.6) lit = true; // (struck or striking: you see it)
  return (e.lit = lit);
};
const creeperFrame = (e, dt) => {
  if (e.wasAtk && e.state !== 'attack') e.fleeT = 1.6 + Math.random(); // (a strike done: back into the dark a moment)
  e.wasAtk = e.state === 'attack';
  const g = e.game, lit = !e.alive || litFor(e, g);
  e.shown = (e.shown ?? 1) + ((lit ? 1 : 0) - (e.shown ?? 1)) * Math.min(1, dt * 6);
  const on = e.shown > 0.5;
  if (e.rig.body.visible !== on) e.rig.body.visible = on;
  if (e.rig.shadow) e.rig.shadow.visible = on;
  // in the dark: only two pinpricks of eye
  if (!e.eyesOnly) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffe080 }), gr = new THREE.Group();
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.03), m); b.position.set(s * 0.06, 0, 0); gr.add(b); }
    e.rig.root.add(gr); e.eyesOnly = gr;
  }
  e.eyesOnly.visible = !on && e.alive;
  e.eyesOnly.position.set(0, 1.72, 0.16);
};
// after a strike it slips back into the dark for a moment before coming again
const creeperThink = (e, dt, p, dist) => {
  if ((e.fleeT = (e.fleeT || 0) - dt) <= 0 || dist > 7) return false;
  const dx = (e.pos.x - p.pos.x) / (dist || 1), dz = (e.pos.z - p.pos.z) / (dist || 1);
  const sp = e.T.run * 0.9 * e.status.slow() * e.spdScale;
  e.move((dx * 0.8 - dz * 0.5) * sp * dt, (dz * 0.8 + dx * 0.5) * sp * dt);
  e.turnToward(e.yawTo(p.pos), e.T.turn, dt);
  return true;
};

// ---------- Ore Hauler: a huge miner in a steam frame; a drill, and a slam that brings rocks down from the roof ----------
const rockfall = (e, g) => {
  // stones fall round him where the roof shook loose: four or five marked circles, each lands a moment later
  const n = 4 + (Math.random() < 0.5 ? 1 : 0), p = e.target;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, d = 1.8 + Math.random() * 5;
    let x = e.pos.x + Math.cos(a) * d, z = e.pos.z + Math.sin(a) * d;
    if (k === 0 && p) { x = p.pos.x + (Math.random() - 0.5); z = p.pos.z + (Math.random() - 0.5); } // (one where you stand)
    if (!g.world.walkable(x, z, 0.2)) continue;
    const delay = 0.7 + k * 0.12, tele = g.fx.telegraph(x, z, 1.3, delay, 0xd8a060);
    setTimeout(() => {
      if (!e.game || g.world !== e.game.world) return;
      const y = g.world.floorAt(x, z);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), g.world.mats.rockDark); rock.position.set(x, y + 0.3, z); g.scene.add(rock);
      setTimeout(() => g.scene.remove(rock), 2500);
      g.fx.dust({ x, z }, 10, 1.1); g.fx.addShake(0.15); g.audio.play('slam', 0.3);
      areaHit(e, g, x, z, (t, dd) => dd < 1.3 + t.radius * 0.5, { dmg: 26, knock: 'heavy' });
      tele.dead = true;
    }, delay * 1000);
  }
};
const HAULER_MOVES = {
  drill: {
    dur: 2.1, range: 2.6, track: [0.55, 2.6], sfx: [0.6, 'heavySwing'], recover: 0.5, armor: true,
    keys: [[0.55, P_THRUST_W], [0.75, P_THRUST], [1.6, P_THRUST], [1.9, P_THRUST_W]],
    hits: [0, 1, 2, 3].map((i) => ({ t0: 0.75 + i * 0.2, t1: 0.82 + i * 0.2, range: 2.7, arc: 1.2, dmg: 11, poise: 18 })),
    move: [[0.55, 0.78, 1.0]],
    onTime: [{ t: 0.15, fn: glint([1, 0.7, 0.3]) }, ...every(0.75, 1.55, 0.05, (e, g) => g.fx.sparks(tipPos(e), null, 3, [1, 0.7, 0.3]))],
  },
  slam: {
    dur: 2.3, range: 3.4, track: [0.9, 2.2], sfx: [0.95, 'heavySwing'], recover: 0.55, armor: true, unparryable: true,
    keys: [[0.8, P_RAISE], [1.0, { ...P_RAISE, by: 0.08 }], [1.12, P_SLAM], [1.8, P_SLAM]],
    hits: [{ t0: 1.1, t1: 1.2, shape: 'circle', offset: 2.2, radius: 2.0, dmg: 40, poise: 70, knock: 'heavy' }],
    move: [[0.9, 1.1, 0.7]],
    onTime: [{ t: 0.2, fn: glint([1, 0.2, 0.1], 'clang') }, { t: 1.12, fn: (e, g) => { const f = e.fwd(); g.impact(e.pos.x + f.x * 2.2, e.pos.z + f.z * 2.2, 3.4, 0.7); rockfall(e, g); } }],
  },
  charge: {
    dur: 1.9, range: 7, minRange: 3.2, track: [0.6, 3], recover: 0.6, armor: true, unparryable: true, cool: 7,
    keys: [[0.55, P_THRUST_W], [0.75, { ...P_THRUST, torso: [0.7, 0, 0] }], [1.3, { ...P_THRUST, torso: [0.7, 0, 0] }]],
    hits: [{ t0: 0.75, t1: 1.25, shape: 'circle', offset: 0.9, radius: 1.4, dmg: 32, poise: 60, knockback: 14 }],
    move: [[0.72, 1.25, 7]], stopAt: 0.9,
    onTime: [{ t: 0.1, fn: glint([1, 0.2, 0.1]) }, ...every(0.75, 1.25, 0.08, (e, g) => g.fx.dust(e.pos, 3, 0.8))],
  },
  stomp: STOMP,
};

// =====================================================================================================
// THE WORMWAYS
// =====================================================================================================
const acid = [0.6, 0.95, 0.25];
// ---------- Burrow Grub: a fat pale larva; bursts in acid when it dies ----------
const GRUB_MOVES = {
  bite: {
    parry: true, dur: 1.1, range: 1.6, track: [0.4, 5], sfx: [0.42, 'swing'], recover: 0.35,
    keys: [[0.4, P_CROUCH], [0.55, { ...P_LAND, by: -0.3 }], [0.9, P_CROUCH]],
    hits: [{ t0: 0.5, t1: 0.6, range: 1.7, arc: 1.6, dmg: 19, poise: 12 }],
    move: [[0.4, 0.56, 1.4]], stopAt: 0.6,
  },
  spit: {
    dur: 1.4, range: 4, minRange: 2, track: [0.5, 4], recover: 0.4,
    keys: [[0.5, { ...P_CROUCH, head: [0.3, 0, 0] }], [0.7, P_LAND], [1.1, P_CROUCH]],
    onTime: [{ t: 0.72, fn: (e, g) => { const f = e.fwd(); const x = e.pos.x + f.x * 3, z = e.pos.z + f.z * 3; g.fx.burst({ x, y: 0.4 + Y(e), z }, 14, acid, 3, 0.5, 0.25); hazard(g, x, z, 1.1, 2.5, 0x6ac83a, { dmg: 5, rgb: acid, elems: { poison: 0.5 } }); } }],
  },
};
const grubDie = (e) => {
  const g = e.game, x = e.pos.x, z = e.pos.z;
  g.fx.burst({ x, y: 0.5 + Y(e), z }, 26, acid, 4, 0.6, 0.3); g.audio.play('hurt', 0.4);
  areaHit(e, g, x, z, (t, d) => d < 1.6 + t.radius * 0.5, { dmg: 14, knock: 'light', elems: { poison: 0.5 } });
  hazard(g, x, z, 1.5, 3, 0x6ac83a, { dmg: 5, rgb: acid, elems: { poison: 0.5 } });
};

// ---------- Spore Lobber: lobs spore pods that burst into a lingering poison cloud ----------
const spore = [0.75, 0.85, 0.35];
const lobPod = (e, g) => {
  const p = e.target; if (!p) return;
  const x = p.pos.x + (Math.random() - 0.5) * 1.2, z = p.pos.z + (Math.random() - 0.5) * 1.2;
  const from = new THREE.Vector3(e.pos.x, 1.8 * S(e) + Y(e), e.pos.z), to = new THREE.Vector3(x, g.world.floorAt(x, z), z);
  const pod = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), new THREE.MeshBasicMaterial({ color: 0xb8d060 })); pod.position.copy(from); g.scene.add(pod);
  const tele = g.fx.telegraph(x, z, 2.0, 1.0, 0x9ad040);
  let t = 0; const dur = 1.0, w = g.world;
  const H = { x: e.pos.x, z: e.pos.z, update: (dt) => {
    t += dt; const k = Math.min(1, t / dur);
    pod.position.lerpVectors(from, to, k); pod.position.y += Math.sin(k * Math.PI) * 3.5;
    if (k >= 1) {
      g.scene.remove(pod); tele.dead = true; const i = w.ambient.indexOf(H); if (i >= 0) w.ambient.splice(i, 1);
      g.fx.burst({ x, y: to.y + 0.5, z }, 24, spore, 3, 0.8, 0.4); g.audio.play('fire', 0.25);
      areaHit(e, g, x, z, (tt, d) => d < 2.0 + tt.radius * 0.5, { dmg: 16, knock: 'light', elems: { poison: 0.6 } });
      hazard(g, x, z, 2.0, 4, 0x8aa040, { dmg: 6, rgb: spore, cloud: true, elems: { poison: 0.6 } });
    }
  } };
  w.ambient.push(H);
  g.audio.play('bow', 0.4);
};
const LOBBER_MOVES = {
  lob: {
    ranged: true, dur: 1.6, range: 12, minRange: 3, track: [0.5, 3], recover: 0.4,
    keys: [[0.55, P_LOB], [0.75, P_TOSS], [1.2, P_TOSS]],
    onTime: [{ t: 0.2, fn: glint(spore) }, { t: 0.74, fn: lobPod }],
  },
  swipe: {
    parry: true, dur: 1.1, range: 1.8, maxRange: 2.4, track: [0.4, 6], sfx: [0.42, 'swing'], recover: 0.3,
    keys: [[0.38, P_WIND_R], [0.52, P_CUT_R], [0.85, P_CUT_R]],
    hits: [{ t0: 0.44, t1: 0.54, range: 1.9, arc: 2.0, dmg: 15, poise: 12, knockback: 8 }],
  },
};

// ---------- Burrower: travels under the floor; cracks open under your feet, it bursts up with two sickles ----------
const BURROW_MOVES = {
  reap: {
    parry: true, dur: 1.15, range: 1.9, track: [0.3, 7], sfx: [0.3, 'swing'], trail: [0.3, 0.8], recover: 0.25,
    keys: [[0.28, P_WIND_R], [0.4, P_CUT_R], [0.56, P_WIND_L], [0.68, P_CUT_L], [0.95, P_CUT_L]],
    hits: [{ t0: 0.34, t1: 0.44, range: 2.0, arc: 2.2, dmg: 18, poise: 14 }, { t0: 0.62, t1: 0.72, range: 2.0, arc: 2.2, dmg: 20, poise: 16 }],
    move: [[0.26, 0.44, 0.8], [0.54, 0.7, 0.7]], stopAt: 0.9,
  },
};
// under the floor: a moving mound of dirt (can't be struck), then the ground cracks where you stand and it erupts
const burrowThink = (e, dt, p, dist) => {
  const g = e.game;
  e.surfT = (e.surfT ?? 4) - dt;
  if (!e.under) {
    if (e.surfT > 0 || dist < 3 || e.state !== 'chase') return false;
    e.under = true; e.cracks = 0; e.rig.body.visible = false; if (e.rig.shadow) e.rig.shadow.visible = false;
    g.fx.dust(e.pos, 14, 1.2, [0.35, 0.3, 0.25]); g.audio.play('roll', 0.6);
    return true;
  }
  // tunnelling toward you
  if (e.cracks <= 0) {
    const sp = 6.2 * e.status.slow();
    if (dist > 0.8) { const dx = (p.pos.x - e.pos.x) / dist, dz = (p.pos.z - e.pos.z) / dist; e.move(dx * sp * dt, dz * sp * dt); }
    if (Math.random() < dt * 20) g.fx.dust(e.pos, 2, 0.5, [0.35, 0.3, 0.25]);
    if (dist < 1.2 || (e.underT = (e.underT || 0) + dt) > 4) { e.cracks = 0.8; e.crackAt = { x: p.pos.x, z: p.pos.z }; e.tele = g.fx.telegraph(p.pos.x, p.pos.z, 1.6, 0.8, 0xc89a50); g.audio.play('slam', 0.25); }
    return true;
  }
  // the cracks spread under your feet, then it bursts up
  e.cracks -= dt;
  if (Math.random() < dt * 30) g.fx.dust({ x: e.crackAt.x + (Math.random() - 0.5) * 2, z: e.crackAt.z + (Math.random() - 0.5) * 2 }, 1, 0.3, [0.35, 0.3, 0.25]);
  if (e.cracks <= 0) {
    e.under = false; e.underT = 0; e.surfT = 5 + Math.random() * 2;
    e.pos.x = e.crackAt.x; e.pos.z = e.crackAt.z; e.rig.body.visible = true; if (e.rig.shadow) e.rig.shadow.visible = true;
    if (e.tele) { e.tele.dead = true; e.tele = null; }
    g.impact(e.pos.x, e.pos.z, 2, 0.4);
    areaHit(e, g, e.pos.x, e.pos.z, (t, d) => d < 1.6 + t.radius * 0.5, { dmg: 34, knock: 'heavy' });
    e.cd = 0.4;
  }
  return true;
};
const burrowGuard = (e, info) => (e.under ? { ...info, dmg: 0, poise: 0, noKnock: true } : info);

// ---------- Borer Thrall: a cultist fused into a small boring engine, a drill for a head ----------
const THRALL_MOVES = {
  drillcharge: {
    dur: 2.2, range: 9, minRange: 3, track: [0.7, 2.5], recover: 0.6, armor: true, unparryable: true, cool: 6,
    keys: [[0.65, P_THRUST_W], [0.85, { ...P_THRUST, torso: [0.9, 0, 0], head: [0.6, 0, 0] }], [1.6, { ...P_THRUST, torso: [0.9, 0, 0] }]],
    hits: [{ t0: 0.85, t1: 1.55, shape: 'circle', offset: 1.0, radius: 1.3, dmg: 36, poise: 60, knockback: 12 }],
    move: [[0.85, 1.55, 9.5]], stopAt: 0.9, through: true,
    onTime: [{ t: 0.15, fn: glint([1, 0.3, 0.1], 'clang') }, ...every(0.85, 1.55, 0.05, (e, g) => { g.fx.sparks(tipPos(e), null, 4, [1, 0.7, 0.3]); g.fx.dust(e.pos, 2, 0.6); })],
  },
  spin: {
    dur: 1.8, range: 3.2, track: [0.6, 2], sfx: [0.7, 'heavySwing'], recover: 0.5, armor: true, unparryable: true, spin: [0.7, 1.1, -Math.PI * 2],
    keys: [[0.6, { ...P_WIND_R, torso: [0.2, 1.2, 0] }], [0.75, P_CUT_R], [1.15, P_CUT_R]],
    hits: [{ t0: 0.7, t1: 1.1, shape: 'circle', offset: 0, radius: 3.2, dmg: 30, poise: 50, knockback: 11 }],
    onTime: [{ t: 0.15, fn: glint([1, 0.3, 0.1]) }],
  },
  bore: {
    dur: 2.0, range: 2.6, track: [0.5, 2.6], sfx: [0.55, 'heavySwing'], recover: 0.45, armor: true,
    keys: [[0.5, P_THRUST_W], [0.7, P_THRUST], [1.5, P_THRUST]],
    hits: [0, 1, 2, 3].map((i) => ({ t0: 0.7 + i * 0.2, t1: 0.77 + i * 0.2, range: 2.8, arc: 1.1, dmg: 12, poise: 20 })),
    onTime: every(0.7, 1.45, 0.05, (e, g) => g.fx.sparks(tipPos(e), null, 3, [1, 0.7, 0.3])),
  },
  stomp: STOMP,
};
// it digs in and comes up under you, now and then (between swings)
const thrallThink = (e, dt, p, dist) => {
  e.digCd = (e.digCd ?? 8) - dt;
  if (e.digCd > 0 && !e.under) return false;
  if (!e.under) { if (dist < 5) return false; e.digCd = 10 + Math.random() * 4; }
  return burrowThink(e, dt, p, dist);
};

// =====================================================================================================
// GLASSHALLOW
// =====================================================================================================
const violet = [0.75, 0.55, 1], cyan = [0.5, 0.9, 1];
// ---------- Glass Acolyte: crystal grown through its skin, a glass sickle; it shatters when it dies ----------
const ACOLYTE_MOVES = {
  slash2: {
    parry: true, dur: 1.25, range: 2.0, track: [0.32, 7], sfx: [0.32, 'swing'], trail: [0.34, 0.9], recover: 0.3,
    keys: [[0.3, P_WIND_R], [0.44, P_CUT_R], [0.62, P_WIND_L], [0.76, P_CUT_L], [1.0, P_CUT_L]],
    hits: [{ t0: 0.36, t1: 0.46, range: 2.1, arc: 2.2, dmg: 22, poise: 16 }, { t0: 0.7, t1: 0.8, range: 2.1, arc: 2.2, dmg: 24, poise: 18 }],
    move: [[0.28, 0.46, 0.8], [0.6, 0.78, 0.7]], stopAt: 0.9,
    onTime: [{ t: 0.6, fn: turnTo(0.5) }],
  },
  lunge: {
    dur: 1.35, range: 4.5, minRange: 2, track: [0.45, 5], sfx: [0.48, 'swing'], trail: [0.5, 0.66], recover: 0.4, unparryable: true,
    keys: [[0.45, P_THRUST_W], [0.6, P_THRUST], [1.0, P_THRUST]],
    hits: [{ t0: 0.5, t1: 0.64, shape: 'circle', offset: 0.9, radius: 1.1, dmg: 30, poise: 30 }],
    move: [[0.46, 0.64, 5]], stopAt: 0.8,
    onTime: [{ t: 0.05, fn: glint(violet) }],
  },
};
const acolyteDie = (e) => {
  const g = e.game, x = e.pos.x, z = e.pos.z, w0 = g.world.dungeon;
  const tele = g.fx.telegraph(x, z, 1.7, 0.45, 0xb090ff);
  setTimeout(() => {
    if (g.world.dungeon !== w0) return; // (the raid's over)
    tele.dead = true;
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2; g.fx.add.spawn({ x, y: 1 + Y(e), z, vx: Math.cos(a) * 6, vy: 1 + Math.random() * 2, vz: Math.sin(a) * 6, life: 0.4, size: 0.18, size1: 0.04, r: violet[0], g: violet[1], b: violet[2] }); }
    g.audio.play('clang', 0.5); g.fx.shockwave(x, z, 1.7, 0xb090ff, 0.3);
    areaHit(e, g, x, z, (t, d) => d < 1.7 + t.radius * 0.5, { dmg: 20, knock: 'light' });
  }, 450);
};

// ---------- Prism Lancer: a beam from a lens-staff; it can bank the beam off a crystal pillar ----------
const beamMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const drawBeam = (g, a, b, y, c, o, w) => {
  const len = Math.hypot(b.x - a.x, b.z - a.z), m = new THREE.Mesh(new THREE.BoxGeometry(w, w, len), beamMat(c, o));
  m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2); m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); g.scene.add(m); return m;
};
const aimBeam = (e, g) => {
  const p = e.target; if (!p) return;
  // a straight line, or banked off a crystal pillar (world.prisms) that both of them can see, now and then
  const from = { x: e.pos.x, z: e.pos.z }, to = { x: p.pos.x, z: p.pos.z };
  let path = [from, to];
  const prisms = (g.world.prisms || []).filter((q) => Math.hypot(q.x - e.pos.x, q.z - e.pos.z) < 12 && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 12);
  if (prisms.length && Math.random() < 0.55) { const q = prisms[Math.floor(Math.random() * prisms.length)]; path = [from, q, to]; }
  // carried on past you to its full reach
  const a = path[path.length - 2], b = path[path.length - 1], d = Math.hypot(b.x - a.x, b.z - a.z) || 1, reach = 3;
  path[path.length - 1] = { x: b.x + (b.x - a.x) / d * reach, z: b.z + (b.z - a.z) / d * reach };
  e.beamPath = path;
  const y = 1.3 * S(e) + Y(e);
  e.beamTele = path.slice(1).map((q, i) => drawBeam(g, path[i], q, y, 0xb090ff, 0.25, 0.08));
  g.audio.play('bow', 0.3);
};
const fireBeam = (e, g) => {
  const path = e.beamPath; if (!path) return;
  for (const m of e.beamTele || []) g.scene.remove(m);
  const y = 1.3 * S(e) + Y(e), beams = path.slice(1).map((q, i) => drawBeam(g, path[i], q, y, 0xe0d0ff, 0.9, 0.22));
  setTimeout(() => beams.forEach((m) => g.scene.remove(m)), 220);
  for (let i = 1; i < path.length; i++) g.fx.burst({ x: path[i].x, y, z: path[i].z }, 10, cyan, 3, 0.4, 0.3);
  g.audio.play('parry', 0.3);
  for (const t of g.allPlayers()) {
    if (!t.alive) continue;
    for (let i = 1; i < path.length; i++) if (segDist(t.pos.x, t.pos.z, path[i - 1].x, path[i - 1].z, path[i].x, path[i].z) < 0.7 + t.radius * 0.5) { g.projectileHit(t, { dmg: 30 * NUM * (e.dmgScale || 1), knock: 'heavy', src: [path[i - 1].x, path[i - 1].z], elems: e.elems }); break; }
  }
  e.beamPath = null; e.beamTele = null;
};
const LANCER_MOVES = {
  beam: {
    ranged: true, dur: 1.9, range: 13, minRange: 3, track: [0.2, 3], recover: 0.45,
    keys: [[0.4, P_AIM], [1.4, P_AIM], [1.6, { ...P_AIM, torso: [0.3, 0.35, 0] }]],
    onTime: [{ t: 0.15, fn: glint(violet) }, { t: 0.55, fn: aimBeam }, ...every(0.6, 1.3, 0.08, (e, g) => g.fx.add.spawn({ ...tipPos(e), vy: 0.4, life: 0.25, size: 0.22, size1: 0.05, r: violet[0], g: violet[1], b: violet[2] })), { t: 1.35, fn: fireBeam }],
  },
  staff: {
    parry: true, dur: 1.15, range: 2.0, maxRange: 2.6, track: [0.4, 6], sfx: [0.42, 'swing'], recover: 0.3,
    keys: [[0.38, P_WIND_L], [0.52, P_CUT_L], [0.85, P_CUT_L]],
    hits: [{ t0: 0.46, t1: 0.56, range: 2.1, arc: 2.2, dmg: 18, poise: 14, knockback: 10 }],
  },
};

// ---------- Mirror Shade: splits into three; the copies break in one blow; only the real one casts a shadow ----------
const SHADE_MOVES = {
  cut3: {
    parry: true, dur: 1.2, range: 1.9, track: [0.26, 8], sfx: [0.26, 'swing'], trail: [0.26, 0.85], recover: 0.25,
    keys: [[0.24, P_WIND_R], [0.36, P_CUT_R], [0.5, P_WIND_L], [0.62, P_CUT_L], [0.74, P_WIND_R], [0.86, P_CUT_R], [1.05, P_CUT_R]],
    hits: [{ t0: 0.3, t1: 0.38, range: 2.0, arc: 2.0, dmg: 16, poise: 10 }, { t0: 0.56, t1: 0.64, range: 2.0, arc: 2.0, dmg: 16, poise: 10 }, { t0: 0.8, t1: 0.88, range: 2.0, arc: 2.0, dmg: 20, poise: 14 }],
    move: [[0.22, 0.9, 1.8]], stopAt: 0.9,
  },
  backstab: {
    dur: 1.3, range: 5, minRange: 1.5, track: [0.3, 8], recover: 0.35, unparryable: true,
    keys: [[0.3, P_CROUCH], [0.55, P_THRUST_W], [0.7, P_THRUST], [1.1, P_THRUST]],
    hits: [{ t0: 0.68, t1: 0.78, range: 1.9, arc: 1.2, dmg: 36, poise: 30 }],
    onTime: [{ t: 0.4, fn: (e, g) => {
      // a step through the glass: it comes out behind you
      const p = e.target; if (!p) return;
      const bx = p.pos.x - Math.sin(p.yaw) * 1.6, bz = p.pos.z - Math.cos(p.yaw) * 1.6;
      if (!g.world.walkable(bx, bz, 0.5)) return;
      g.fx.burst({ x: e.pos.x, y: 1.2 + Y(e), z: e.pos.z }, 16, violet, 3, 0.4, 0.25);
      e.pos.x = bx; e.pos.z = bz; e.yaw = e.yawTo(p.pos);
      g.fx.burst({ x: bx, y: 1.2 + Y(e), z: bz }, 16, violet, 3, 0.4, 0.25); g.audio.play('parry', 0.25);
    } }],
  },
};
// the split: the first time it sees you its two copies step out of it (they wait, hidden, as its reserves: main.js)
const shadeThink = (e) => {
  if (e.split || e.opts?.copyOf) return false;
  e.split = true;
  const g = e.game, copies = g.reserves.filter((r) => r.opts?.copyOf === e.opts?.shadeId);
  copies.forEach((c, k) => { const a = e.yaw + (k ? 1.6 : -1.6); g.activateReserve(c, e.pos.x + Math.sin(a) * 1.6, e.pos.z + Math.cos(a) * 1.6); c.rig.flash(0.8, 0.6, 1); });
  if (copies.length) { g.fx.burst({ x: e.pos.x, y: 1.2 + Y(e), z: e.pos.z }, 30, violet, 4, 0.6, 0.3); g.audio.play('parry', 0.4); }
  return false;
};
const copyFrame = (e) => {
  if (e.noShadowDone) return; e.noShadowDone = true;
  e.rig.root.traverse((o) => { o.userData.noShadow = true; o.castShadow = false; });
  if (e.rig.shadow) e.rig.shadow.visible = false;
};

// ---------- Shardback: crystal plates (chest, back, shoulders) take most of a blow until each cracks off ----------
const plateGuard = (e, info) => {
  if (!e.plates) e.plates = { front: 3, back: 3 }; // (blows each side can take before its plate falls)
  if (!info.srcPos || info.pctHp) return info;
  const behind = Math.abs(angDiff(e.yaw, Math.atan2(info.srcPos.x - e.pos.x, info.srcPos.z - e.pos.z))) > 1.6, side = behind ? 'back' : 'front';
  if (e.plates[side] <= 0) return info;
  e.plates[side]--;
  const g = e.game, f = e.fwd(V).clone().multiplyScalar(behind ? -1 : 1);
  g.fx.sparks({ x: e.pos.x + f.x * 0.7, y: 1.4 * S(e) + Y(e), z: e.pos.z + f.z * 0.7 }, f, 12, violet); g.audio.play('clang', 0.6);
  const part = e.rig[side === 'front' ? 'plateF' : 'plateB'];
  if (e.plates[side] <= 0) { if (part) part.visible = false; g.fx.burst({ x: e.pos.x, y: 1.4 * S(e) + Y(e), z: e.pos.z }, 30, violet, 5, 0.6, 0.3); g.audio.play('bigHit', 0.6); g.ui.toastSmall?.('ITS PLATE CRACKS OFF'); }
  else if (part) part.scale.setScalar(0.85 + e.plates[side] * 0.05);
  return { ...info, dmg: info.dmg * 0.25, poise: (info.poise || 0) * 0.2, noKnock: true };
};
const crystalWall = (e, g) => {
  // a line of crystal rises across the floor in front of it for 4 s: it can't be crossed
  const f = e.fwd(), side = { x: f.z, z: -f.x }, cx = e.pos.x + f.x * 3, cz = e.pos.z + f.z * 3, pieces = [], solids = [];
  for (let k = -3; k <= 3; k++) {
    const x = cx + side.x * k * 0.8, z = cz + side.z * k * 0.8;
    if (!g.world.walkable(x, z, 0.2)) continue;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8 + Math.random(), 4), new THREE.MeshLambertMaterial({ color: 0x9a7ae0, emissive: 0x3a2070, flatShading: true }));
    m.position.set(x, g.world.floorAt(x, z) + 0.9, z); m.rotation.y = Math.random(); g.scene.add(m); pieces.push(m);
    const s = { x0: x - 0.35, x1: x + 0.35, z0: z - 0.35, z1: z + 0.35 }; g.world.solids.push(s); solids.push(s);
  }
  g.world.shashN = -1; g.fx.burst({ x: cx, y: 0.8, z: cz }, 26, violet, 4, 0.5, 0.3); g.audio.play('clang', 0.7);
  setTimeout(() => { pieces.forEach((m) => g.scene.remove(m)); g.world.solids = g.world.solids.filter((s) => !solids.includes(s)); g.world.shashN = -1; }, 4000);
};
const SHARD_MOVES = {
  spray: {
    dur: 1.9, range: 5, track: [0.7, 2.5], recover: 0.5, armor: true, unparryable: true,
    keys: [[0.7, P_WIND_R], [0.9, P_AIM], [1.4, P_AIM]],
    hits: [0, 1, 2].map((i) => ({ t0: 0.92 + i * 0.12, t1: 1.0 + i * 0.12, range: 5, arc: 1.1, dmg: 14, poise: 14 })),
    onTime: [{ t: 0.15, fn: glint(violet, 'clang') }, ...every(0.9, 1.3, 0.04, (e, g) => { const f = e.fwd(); const p = tipPos(e); for (let i = 0; i < 3; i++) g.fx.add.spawn({ ...p, vx: (f.x + (Math.random() - 0.5) * 0.8) * 10, vy: Math.random(), vz: (f.z + (Math.random() - 0.5) * 0.8) * 10, life: 0.4, size: 0.14, size1: 0.04, r: violet[0], g: violet[1], b: violet[2] }); })],
  },
  smash: {
    dur: 2.2, range: 3.4, track: [0.85, 2.2], sfx: [0.9, 'heavySwing'], recover: 0.55, armor: true, unparryable: true,
    keys: [[0.8, P_RAISE], [1.0, { ...P_RAISE, by: 0.08 }], [1.1, P_SLAM], [1.7, P_SLAM]],
    hits: [{ t0: 1.08, t1: 1.18, shape: 'circle', offset: 2.2, radius: 2.2, dmg: 46, poise: 70, knock: 'heavy' }],
    move: [[0.85, 1.08, 0.7]],
    onTime: [{ t: 0.2, fn: glint([1, 0.2, 0.1], 'clang') }, { t: 1.1, fn: (e, g) => { const f = e.fwd(); g.impact(e.pos.x + f.x * 2.2, e.pos.z + f.z * 2.2, 3.4, 0.6); } }],
  },
  wall: {
    dur: 1.6, range: 9, minRange: 4, track: [0.4, 3], recover: 0.4, armor: true, cool: 9,
    keys: [[0.5, P_RAISE], [0.75, P_SLAM], [1.3, P_SLAM]],
    onTime: [{ t: 0.1, fn: glint(violet) }, { t: 0.76, fn: crystalWall }],
  },
  stomp: STOMP,
};

// =====================================================================================================
// the types (health as designed; NUM applied below)
// =====================================================================================================
const NEW_TYPES = {
  // Lanternhold
  shaftrat: {
    name: 'Shaft Rat', hp: 200, poise: 10, scale: 0.92, radius: 0.42, run: 4.8, walk: 2.2, aggro: 12, prefer: 1.5, style: 'club', turn: 9,
    cd: [0.4, 1.1], moves: RAT_MOVES, weights: { jab: 3, hack: 2 },
    model: { cloth: 0x4a3a2a, armor: 0x5a4a3a, skin: 0x8a7a6a, head: 'cap', weapon: 'club', eyes: 0xffc060, bulk: 0.9, kit: 'shaftrat' },
  },
  rivet: {
    name: 'Rivet Gunner', hp: 240, poise: 14, scale: 1.0, radius: 0.46, run: 3.4, walk: 1.9, aggro: 15, prefer: 8, style: 'spear', turn: 5,
    cd: [0.8, 1.6], moves: RIVET_MOVES, weights: { burst: 3, bash: 1.5 }, ranged: true, backoff: 4,
    model: { cloth: 0x3a3a34, armor: 0x5a5244, skin: 0x7a6e66, head: 'bare', weapon: 'spear', eyes: 0xffd080, kit: 'rivet' },
  },
  creeper: {
    name: 'Shaft Creeper', hp: 220, poise: 12, scale: 1.02, radius: 0.42, run: 5.2, walk: 2.4, aggro: 13, prefer: 1.6, style: 'daggers', turn: 10,
    cd: [0.3, 0.9], moves: CREEPER_MOVES, weights: { pounce: 2, stab3: 3 }, think: creeperThink, frame: creeperFrame,
    model: { cloth: 0x141210, armor: 0x1e1a18, skin: 0x8a8480, head: 'bare', weapon: 'daggers', eyes: 0xffe080, bulk: 0.85, kit: 'creeper' },
  },
  hauler: {
    name: 'Ore Hauler', heavy: true, hp: 600, poise: 120, scale: 1.65, radius: 0.9, run: 2.7, walk: 1.3, aggro: 12, prefer: 2.4, style: 'club', turn: 2.3,
    cd: [0.9, 1.8], moves: HAULER_MOVES, weights: { drill: 3, slam: 2, charge: 1.5, stomp: 3 }, superArmor: true,
    model: { cloth: 0x3a3028, armor: 0x5a4a38, skin: 0x8a7a6a, head: 'bare', weapon: 'club', bulk: 1.5, eyes: 0xffb040, kit: 'hauler' },
  },
  // the Wormways
  grub: {
    name: 'Burrow Grub', hp: 180, poise: 8, scale: 0.95, radius: 0.5, run: 2.6, walk: 1.4, aggro: 10, prefer: 1.3, style: 'club', turn: 5,
    cd: [0.6, 1.4], moves: GRUB_MOVES, weights: { bite: 3, spit: 1.2 }, onDie: grubDie, elems: { poison: 0.3 },
    model: { cloth: 0xc8bca8, armor: 0xb0a490, skin: 0xd8ccb8, head: 'none', eyes: 0x8af050, bulk: 1.4, kit: 'grub' },
  },
  lobber: {
    name: 'Spore Lobber', hp: 260, poise: 12, scale: 1.0, radius: 0.46, run: 3.2, walk: 1.8, aggro: 14, prefer: 8, style: 'staff', turn: 5,
    cd: [1.0, 1.9], moves: LOBBER_MOVES, weights: { lob: 3, swipe: 1 }, ranged: true, backoff: 4.5, elems: { poison: 0.3 },
    model: { cloth: 0x3a4230, armor: 0x4e5a3a, skin: 0x8a9070, head: 'hood', weapon: 'psystaff', eyes: 0xc8f060, kit: 'lobber' },
  },
  burrower: {
    name: 'Burrower', hp: 300, poise: 16, scale: 1.05, radius: 0.46, run: 4.6, walk: 2.2, aggro: 13, prefer: 1.6, style: 'daggers', turn: 9,
    cd: [0.3, 0.9], moves: BURROW_MOVES, weights: { reap: 3 }, think: burrowThink, onReceive: burrowGuard,
    model: { cloth: 0x3a3026, armor: 0x5a4a3a, skin: 0x9a8a70, head: 'bare', weapon: 'daggers', eyes: 0xff9a3a, bulk: 0.95, kit: 'burrower' },
  },
  thrall: {
    name: 'Borer Thrall', heavy: true, hp: 820, poise: 130, scale: 1.6, radius: 0.88, run: 2.8, walk: 1.4, aggro: 12, prefer: 2.4, style: 'club', turn: 2.4,
    cd: [0.9, 1.8], moves: THRALL_MOVES, weights: { drillcharge: 1.6, spin: 2, bore: 3, stomp: 3 }, superArmor: true, think: thrallThink, onReceive: burrowGuard,
    model: { cloth: 0x2e2a26, armor: 0x4a4440, skin: 0x8a7a6a, head: 'none', weapon: 'club', bulk: 1.5, eyes: 0xff6a2a, kit: 'thrall' },
  },
  // Glasshallow
  acolyte: {
    name: 'Glass Acolyte', hp: 440, poise: 18, scale: 1.02, radius: 0.46, run: 4.2, walk: 2.0, aggro: 12, prefer: 1.8, style: 'sword', turn: 8,
    cd: [0.4, 1.1], moves: ACOLYTE_MOVES, weights: { slash2: 3, lunge: 1.5 }, onDie: acolyteDie,
    model: { cloth: 0xd8d4e0, armor: 0xb8b4c8, skin: 0xc8c0c8, head: 'hood', weapon: 'sword', eyes: 0xb090ff, kit: 'acolyte' },
  },
  lancer: {
    name: 'Prism Lancer', hp: 380, poise: 14, scale: 1.08, radius: 0.46, run: 3.2, walk: 1.8, aggro: 16, prefer: 8, style: 'staff', turn: 5,
    cd: [0.9, 1.8], moves: LANCER_MOVES, weights: { beam: 3, staff: 1 }, ranged: true, backoff: 4,
    model: { cloth: 0xc8c8d8, armor: 0x9a98b0, skin: 0xb8b0b8, head: 'bare', weapon: 'psystaff', eyes: 0x8ae0ff, kit: 'lancer' },
  },
  shade: {
    name: 'Mirror Shade', hp: 340, poise: 14, scale: 1.0, radius: 0.44, run: 4.8, walk: 2.3, aggro: 13, prefer: 1.6, style: 'daggers', turn: 10,
    cd: [0.3, 0.9], moves: SHADE_MOVES, weights: { cut3: 3, backstab: 1.4 }, think: shadeThink, companions: 2,
    model: { cloth: 0x8a8ca0, armor: 0xb8bcd0, skin: 0xd0d4e0, head: 'none', weapon: 'daggers', eyes: 0xd0a0ff, kit: 'shade' },
  },
  shardback: {
    name: 'Shardback', heavy: true, hp: 950, poise: 140, scale: 1.7, radius: 0.92, run: 2.6, walk: 1.3, aggro: 12, prefer: 2.6, style: 'club', turn: 2.2,
    cd: [1.0, 1.9], moves: SHARD_MOVES, weights: { spray: 2, smash: 3, wall: 1.2, stomp: 3 }, superArmor: true, onReceive: plateGuard,
    model: { cloth: 0x3a3448, armor: 0x5a5070, skin: 0x8a8090, head: 'bare', weapon: 'club', bulk: 1.5, eyes: 0xc8a0ff, kit: 'shardback' },
  },
};
// a Mirror Shade's copy: the same in every way but one blow breaks it, it casts no shadow, and it's worth nothing
NEW_TYPES.shadecopy = { ...NEW_TYPES.shade, name: 'Mirror Shade', hp: 1, think: null, frame: copyFrame, companions: 0, noGold: true, onDie: (e) => { const g = e.game; for (let i = 0; i < 14; i++) g.fx.add.spawn({ x: e.pos.x, y: 1 + Y(e), z: e.pos.z, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 6, life: 0.4, size: 0.16, size1: 0.03, r: 0.85, g: 0.85, b: 1 }); g.audio.play('clang', 0.4); } };
for (const [k, T] of Object.entries(NEW_TYPES)) { if (k !== 'shadecopy') T.hp *= NUM; TYPES[k] = T; }

// =====================================================================================================
// the models (kits.js): what each wears and carries. Purely visual.
// =====================================================================================================
const setWeapon = (r, g, base, tip) => { r.wpnR = g; r.base.position.set(0, 0, base); g.add(r.base); r.tip.position.set(0, 0, tip); g.add(r.tip); };
const pickaxe = (r, hand, haftM, headM) => { const g = new THREE.Group(); hand.add(g); g.add(box(0.05, 0.05, 0.7, haftM, 0, 0, 0.3)); g.add(rbox(0.06, 0.06, 0.5, headM, 0, 0.05, 0.62, Math.PI / 2, 0, 0)); g.add(rbox(0.05, 0.05, 0.14, headM, 0, -0.24, 0.66, 0.6, 0, 0)); return g; };
const lantern = (parent, x, y, z) => { const L = new THREE.Group(); L.position.set(x, y, z); parent.add(L); L.add(box(0.12, 0.16, 0.12, basic(0xffc860), 0, 0, 0)); L.add(box(0.15, 0.03, 0.15, basic(0x3a3028), 0, 0.09, 0)); L.add(box(0.15, 0.03, 0.15, basic(0x3a3028), 0, -0.09, 0)); return L; };

Object.assign(KITS, {
  // a Shaft Rat: a scrawny miner in a leather cap with a lamp, a dust mask, a hand pick
  shaftrat: { weapon: true, build(r) {
    const leather = r.m(0x4a3828), iron = r.m(0x6a6a70), haft = r.m(0x3a2a1e), H = r.j.head, T = r.j.torso;
    H.add(box(0.28, 0.08, 0.3, leather, 0, 0.3, 0)); H.add(box(0.06, 0.06, 0.04, basic(0xffe090), 0, 0.3, 0.16)); // the cap lamp
    H.add(box(0.2, 0.08, 0.06, r.m(0x8a8070), 0, 0.1, 0.13)); // the dust mask
    T.add(rbox(0.04, 0.5, 0.02, leather, 0, 0.4, 0.14, 0, 0, 0.6));
    setWeapon(r, pickaxe(r, r.j.handR, haft, iron), 0.1, 0.7);
  } },
  // a Rivet Gunner: a leather apron, a pressure tank on the back with a hose to a long pneumatic rivet gun, goggles
  rivet: { weapon: true, build(r) {
    const brass = r.m(0x8a6a2e), iron = r.m(0x4a4a50), hose = r.m(0x1a1a1a), apron = r.m(0x5a4430), H = r.j.head, T = r.j.torso;
    H.add(box(0.26, 0.06, 0.08, hose, 0, 0.22, 0.12)); for (const s of [-1, 1]) H.add(cyl(0.04, 0.04, 0.03, basic(0xffd080), 6).translateX(s * 0.06).translateY(0.22).translateZ(0.16));
    T.add(box(0.34, 0.5, 0.04, apron, 0, 0.3, 0.16));
    const tank = cyl(0.12, 0.12, 0.5, brass, 8); tank.position.set(0, 0.42, -0.2); T.add(tank);
    const g = new THREE.Group(); r.j.handR.add(g);
    g.add(box(0.1, 0.12, 0.3, iron, 0, 0, 0.1)); g.add(cyl(0.035, 0.035, 0.6, iron, 6).rotateX(Math.PI / 2).translateY(0.45));
    g.add(box(0.12, 0.12, 0.06, brass, 0, 0, 0.75)); g.add(box(0.04, 0.2, 0.04, hose, 0, -0.12, 0.05));
    setWeapon(r, g, 0.1, 0.8);
  } },
  // a Shaft Creeper: thin and lamp-black, a bandaged face, two long nails of iron
  creeper: { weapon: true, build(r) {
    const black = r.m(0x141210), wrap = r.m(0x3a3430), iron = r.m(0x5a5a62), H = r.j.head;
    H.add(box(0.26, 0.28, 0.26, black, 0, 0.17, 0)); for (let i = 0; i < 3; i++) H.add(box(0.27, 0.03, 0.27, wrap, 0, 0.08 + i * 0.09, 0));
    const spike = (hand) => { const g = new THREE.Group(); hand.add(g); g.add(box(0.03, 0.03, 0.45, iron, 0, 0, 0.22)); return g; };
    setWeapon(r, spike(r.j.handR), 0.05, 0.45); r.wpnL = spike(r.j.handL);
  } },
  // an Ore Hauler: a steam frame round a huge miner, a rock drill on the right arm, an ore bucket on the left, a boiler
  hauler: { weapon: true, build(r) {
    const { bulk: b } = r.dims;
    const iron = r.m(0x4a4440), brass = r.m(0x8a6a2e), rust = r.m(0x6a3a22), T = r.j.torso;
    T.add(box(0.5 * b, 0.6, 0.3, iron, 0, 0.42, -0.24 * b)); const boiler = cyl(0.16, 0.16, 0.5, brass, 8); boiler.position.set(0, 0.95, -0.28 * b); T.add(boiler);
    T.add(box(0.06, 0.06, 0.06, basic(0xff8a2a), 0.1, 0.95, -0.12 * b));
    for (const s of [-1, 1]) T.add(box(0.08, 0.7, 0.08, iron, s * 0.28 * b, 0.35, -0.05));
    const g = new THREE.Group(); r.j.handR.add(g);
    g.add(cyl(0.12, 0.14, 0.3, iron, 8).rotateX(Math.PI / 2).translateY(0.1)); g.add(cone(0.12, 0.7, rust, 6).rotateX(Math.PI / 2).translateY(0.55));
    setWeapon(r, g, 0.1, 0.85);
    const bk = new THREE.Group(); r.j.handL.add(bk); bk.add(box(0.4, 0.3, 0.36, rust, 0, -0.05, 0.12)); bk.add(box(0.42, 0.04, 0.38, iron, 0, 0.1, 0.12));
    lantern(T, 0.26 * b, 0.2, 0.14);
  } },
  // a Burrow Grub: the body a fat pale grub (the limbs folded under), rings of segments, a round mouth of teeth
  grub: { weapon: true, build(r) {
    const flesh = r.m(0xd8ccb8), fold = r.m(0xa89a84), mouth = r.m(0x3a1a14), T = r.j.torso, H = r.j.head;
    for (let i = 0; i < 4; i++) T.add(box(0.5 - i * 0.04, 0.12, 0.5 - i * 0.04, i % 2 ? fold : flesh, 0, 0.1 + i * 0.15, 0));
    H.add(box(0.36, 0.3, 0.36, flesh, 0, 0.1, 0.05)); H.add(box(0.2, 0.16, 0.04, mouth, 0, 0.08, 0.24));
    for (let i = 0; i < 5; i++) H.add(box(0.03, 0.05, 0.02, r.m(0xe8e0d0), -0.08 + i * 0.04, 0.16, 0.26));
    r.j.armL.visible = r.j.armR.visible = false;
    setWeapon(r, H, 0.1, 0.3);
  } },
  // a Spore Lobber: a hooded cultist overgrown with fungus, a sack of glowing pods on its back
  lobber: { weapon: true, build(r) {
    const cap = basic(0xc8f060), stalk = r.m(0xb8b0a0), sack = r.m(0x4a4030), T = r.j.torso, H = r.j.head;
    T.add(box(0.34, 0.4, 0.26, sack, 0, 0.42, -0.22));
    for (const [x, y, z] of [[-0.1, 0.62, -0.32], [0.1, 0.55, -0.34], [0, 0.7, -0.28]]) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), cap); p.position.set(x, y, z); T.add(p); }
    for (const [x, z] of [[-0.12, 0], [0.1, 0.05], [0.02, -0.1]]) { H.add(box(0.03, 0.12, 0.03, stalk, x, 0.4, z)); const c = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), cap); c.position.set(x, 0.46, z); H.add(c); }
    const g = new THREE.Group(); r.j.handR.add(g); g.add(box(0.04, 0.04, 1.3, r.m(0x3a2c20), 0, 0, 0.3)); const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), cap); head.position.z = 0.95; g.add(head);
    setWeapon(r, g, 0.1, 0.95);
  } },
  // a Burrower: hunched, dirt-caked, digging claws grown into two sickles, a carapace on its back
  burrower: { weapon: true, build(r) {
    const shell = r.m(0x5a4a3a), bone = r.m(0xc8b898), T = r.j.torso, H = r.j.head;
    T.add(rbox(0.46, 0.5, 0.2, shell, 0, 0.42, -0.16, 0.3, 0, 0)); for (let i = 0; i < 3; i++) T.add(box(0.48, 0.04, 0.22, r.m(0x3a3026), 0, 0.3 + i * 0.14, -0.2));
    H.add(box(0.12, 0.06, 0.06, bone, -0.06, 0.06, 0.14)); H.add(box(0.12, 0.06, 0.06, bone, 0.06, 0.06, 0.14));
    const sickle = (hand) => { const g = new THREE.Group(); hand.add(g); g.add(box(0.04, 0.04, 0.3, bone, 0, 0, 0.14)); g.add(rbox(0.035, 0.035, 0.34, bone, 0, -0.12, 0.3, 1.1, 0, 0)); return g; };
    setWeapon(r, sickle(r.j.handR), 0.05, 0.4); r.wpnL = sickle(r.j.handL);
  } },
  // a Borer Thrall: a body fused into a boring engine: a spinning drill where its head was, a boiler, treads on its legs
  thrall: { weapon: true, build(r) {
    const { bulk: b } = r.dims;
    const iron = r.m(0x3a3634), steel = r.m(0x8a8a94), flesh = r.m(0x8a7a6a), H = r.j.head, T = r.j.torso;
    const drill = cone(0.22, 0.7, steel, 7); drill.rotation.x = Math.PI / 2; drill.position.set(0, 0.1, 0.35); H.add(drill); r.drill = drill;
    H.add(cyl(0.24, 0.24, 0.2, iron, 8).rotateX(Math.PI / 2).translateY(0));
    T.add(box(0.52 * b, 0.56, 0.3, iron, 0, 0.42, -0.22 * b)); T.add(box(0.3, 0.2, 0.06, flesh, 0, 0.4, 0.17));
    for (const L of [r.j.legL, r.j.legR]) L.add(box(0.2, 0.5, 0.26, iron, 0, -0.3, 0));
    setWeapon(r, H, 0.2, 0.7);
  } },
  // a Glass Acolyte: white robes, crystal grown out through the skin of its shoulders and back, a glass sickle
  acolyte: { weapon: true, build(r) {
    const glass = new THREE.MeshLambertMaterial({ color: 0xb090ff, emissive: 0x3a2070, flatShading: true }), T = r.j.torso, robe = r.m(0xd8d4e0);
    for (const [x, y, z, rx, rz] of [[-0.2, 0.62, -0.08, -0.3, 0.5], [0.22, 0.6, -0.1, -0.2, -0.6], [0, 0.55, -0.18, -0.8, 0], [0.1, 0.4, -0.18, -0.6, -0.3]]) { const c = cone(0.06, 0.32, glass, 4); c.position.set(x, y, z); c.rotation.set(rx, 0, rz); T.add(c); }
    strip(r, r.j.hips, 0, 0, 0.08, 0.4, [0.3, 0.26], robe, { lx: [-0.5, 0.2], taper: 0.85 });
    const g = new THREE.Group(); r.j.handR.add(g); g.add(box(0.04, 0.04, 0.4, r.m(0xc8c0c8), 0, 0, 0.15)); g.add(rbox(0.03, 0.12, 0.5, glass, 0, -0.08, 0.5, 0.4, 0, 0));
    setWeapon(r, g, 0.1, 0.7);
  } },
  // a Prism Lancer: a tall lens-staff with a cut prism at its head, a silver half-mask
  lancer: { weapon: true, build(r) {
    const silver = r.m(0xc8c8d8), glass = new THREE.MeshLambertMaterial({ color: 0x8ae0ff, emissive: 0x1a5a70, flatShading: true }), H = r.j.head;
    H.add(box(0.27, 0.14, 0.04, silver, 0, 0.22, 0.13));
    const g = new THREE.Group(); r.j.handR.add(g); g.add(box(0.04, 0.04, 1.6, r.m(0x9a98b0), 0, 0, 0.4));
    const lens = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glass); lens.position.z = 1.25; g.add(lens);
    setWeapon(r, g, 0.1, 1.25);
  } },
  // a Mirror Shade: no face, a smooth mirror where the head is, robes of grey silk, two thin glass knives
  shade: { weapon: true, build(r) {
    const mirror = new THREE.MeshLambertMaterial({ color: 0xd8dcf0, emissive: 0x30324a, flatShading: true }), H = r.j.head, silk = r.m(0x8a8ca0);
    H.add(box(0.26, 0.3, 0.26, mirror, 0, 0.17, 0));
    strip(r, r.j.torso, 0, 0.66, -0.15, 0.32, [0.4, 0.4, 0.3], silk, { lx: [-0.1, 1.2], taper: 0.8 });
    const knife = (hand) => { const g = new THREE.Group(); hand.add(g); g.add(box(0.02, 0.06, 0.42, mirror, 0, 0, 0.22)); return g; };
    setWeapon(r, knife(r.j.handR), 0.05, 0.42); r.wpnL = knife(r.j.handL);
  } },
  // a Shardback: a giant armoured in crystal plates (one on the chest, one across the back) that crack off, a maul of
  // raw crystal
  shardback: { weapon: true, build(r) {
    const { bulk: b } = r.dims;
    const glass = new THREE.MeshLambertMaterial({ color: 0x9a7ae0, emissive: 0x2a1460, flatShading: true }), T = r.j.torso;
    const F = new THREE.Group(); T.add(F); F.add(box(0.5 * b, 0.5, 0.1, glass, 0, 0.42, 0.18 * b)); for (const s of [-1, 1]) F.add(cone(0.08, 0.35, glass, 4).translateX(s * 0.18).translateY(0.7).translateZ(0.2));
    const Bk = new THREE.Group(); T.add(Bk); Bk.add(box(0.54 * b, 0.6, 0.12, glass, 0, 0.42, -0.2 * b)); for (let i = 0; i < 4; i++) Bk.add(cone(0.09, 0.5, glass, 4).translateX(-0.2 + i * 0.13).translateY(0.8).translateZ(-0.24));
    r.plateF = F; r.plateB = Bk;
    for (const A of [r.j.armL, r.j.armR]) A.add(cone(0.1, 0.4, glass, 4).translateY(0.08));
    const g = new THREE.Group(); r.j.handR.add(g); g.add(box(0.06, 0.06, 0.8, r.m(0x4a4458), 0, 0, 0.3)); const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), glass); head.position.z = 0.8; g.add(head);
    setWeapon(r, g, 0.1, 0.9);
  } },
});
