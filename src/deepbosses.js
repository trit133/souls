// The Sunless Deep's bosses (region 2: docs/region2-design.md). Humanoid like the March's (boss.js runs them), each with
// its own mechanics on the boss's hooks: tick(b, dt) every frame, immune(b) (can't be struck), onReceive(b, info),
// reset(b), onDie(b); moves as boss.js's, and a 'roar' for the second phase.
//   - the Lamp-King (Lanternhold): snuffs every light in his undercroft and hunts you by his lantern's glow; throws
//     the lantern as a fire bomb; second phase, the lantern breaks open and the fire rides on his shoulders
//   - the Mother Borer (the Wormways): dives into the floor and erupts under you; her vent-hearts open after she
//     comes up (strike them then); second phase, faster, and she sprays acid as she surfaces
//   - the Glass Hierophant (Glasshallow): foresees three places you'll be; steps into a mirror-pillar and out of
//     another (break the pillars); shard rain on half the hall; second phase, two reflections echo his blows
//   - the Kilnfather (the Crucible's master): blows glass globes that harden into pillars; the lava rises in rings and
//     halves; his shell shatters and he strikes where you're going. Breaking his own pillars beside him hurts him
import * as THREE from 'three';
import { NUM } from './scale.js';
import { BOSSES } from './boss.js';
import { TYPES } from './enemies.js';
import { angDiff } from './actor.js';
import { KITS, basic } from './kits.js';
import { box, cyl, cone, rbox } from './mesh.js';
import { buildHumanoid } from './models.js';

const P = {
  swW: { torso: [0.1, -1.05, 0], armR: [-1.45, 0, -1.45], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.6, 0, 0.5], legL: [-0.4, 0, 0], legR: [0.35, 0, 0], shinR: [0.4, 0, 0], by: -0.12 },
  swS: { torso: [0.3, 1.0, 0], armR: [-1.45, 0, 1.3], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.4, 0, 0.9], legL: [-0.6, 0, 0], legR: [0.5, 0, 0], shinR: [0.5, 0, 0], by: -0.2 },
  bhW: { torso: [0.2, 1.15, 0], armR: [-1.45, 0, 1.45], foreR: [0, 0, 0], handR: [1.5, 0, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], by: -0.15 },
  bhS: { torso: [0.3, -1.0, 0], armR: [-1.45, 0, -1.35], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.5, 0, 0.6], legL: [0.35, 0, 0], legR: [-0.5, 0, 0], shinL: [0.4, 0, 0], by: -0.2 },
  ohR: { torso: [-0.3, -0.1, 0], armR: [-3.0, 0, -0.2], foreR: [-0.5, 0, 0], handR: [1.0, 0, 0], armL: [-2.8, 0, 0.3], foreL: [-0.5, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0 },
  ohS: { torso: [0.75, 0, 0], armR: [-0.75, 0, 0.05], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-0.85, 0, 0.1], legL: [-0.85, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.35 },
  thW: { torso: [0.15, -0.55, 0], armR: [0.45, 0, -0.25], foreR: [-1.6, 0, 0], handR: [1.2, 0, 0], armL: [-1.0, 0, 0.3], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], shinL: [0.4, 0, 0], shinR: [0.7, 0, 0], by: -0.3 },
  thS: { torso: [0.4, 0.3, 0], armR: [-1.5, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.4, 0, 0.8], legL: [-0.9, 0, 0], legR: [0.7, 0, 0], shinR: [0.5, 0, 0], by: -0.25 },
  crouch: { torso: [0.5, 0, 0], armR: [-0.3, 0, -0.6], foreR: [-0.9, 0, 0], handR: [1.0, 0, 0], armL: [-0.2, 0, 0.6], legL: [-1.1, 0, 0], legR: [-1.0, 0, 0], shinL: [1.6, 0, 0], shinR: [1.5, 0, 0], by: -0.45 },
  roar: { torso: [-0.4, 0, 0], head: [-0.5, 0, 0], armR: [-0.3, 0, -1.2], foreR: [-0.3, 0, 0], armL: [-0.3, 0, 1.2], foreL: [-0.3, 0, 0], legL: [-0.3, 0, 0.15], legR: [0.3, 0, -0.15], by: -0.12 },
  raiseL: { torso: [-0.2, 0.3, 0], armL: [-3.0, 0, 0.2], foreL: [-0.3, 0, 0], armR: [-0.6, 0, -0.4], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0.02 },
  throwL: { torso: [0.45, -0.4, 0], armL: [-1.4, 0, -0.2], foreL: [0, 0, 0], armR: [-0.4, 0, -0.5], legL: [-0.6, 0, 0], legR: [0.4, 0, 0], by: -0.15 },
};
const glint = (b, red) => b.glint(red);
const areaHit = (b, g, x, z, test, q) => {
  for (const t of g.allPlayers()) if (t.alive && test(t, Math.hypot(t.pos.x - x, t.pos.z - z))) g.projectileHit(t, { dmg: q.dmg * NUM * (b.dmgScale || 1), knock: q.knock || 'heavy', src: [x, z], elems: q.elems || b.elems, buildMul: b.elemBuild });
};
const every = (t0, t1, step, fn) => { const out = []; for (let t = t0; t <= t1 + 1e-6; t += step) { const k = (t - t0) / (t1 - t0 || 1); out.push({ t: +t.toFixed(3), fn: (b, g) => fn(b, g, k) }); } return out; };
const inArena = (b, x, z, m = 1.5) => Math.hypot(x - b.arena.x, z - b.arena.z) < b.arena.r - m;
const clampIn = (b, x, z, m = 2) => { const A = b.arena, d = Math.hypot(x - A.x, z - A.z), lim = A.r - m; return d > lim ? { x: A.x + (x - A.x) / d * lim, z: A.z + (z - A.z) / d * lim } : { x, z }; };
// where a player will be in `ahead` seconds, read from how they've moved this last moment
const foresee = (b, p, ahead) => {
  const s = b.seen, g = b.game, now = g.time;
  const vx = s && now > s.t ? (p.pos.x - s.x) / Math.max(0.05, now - s.t) : 0, vz = s && now > s.t ? (p.pos.z - s.z) / Math.max(0.05, now - s.t) : 0;
  let dx = vx * ahead, dz = vz * ahead; const d = Math.hypot(dx, dz); if (d > 7) { dx *= 7 / d; dz *= 7 / d; }
  return clampIn(b, p.pos.x + dx, p.pos.z + dz, 1.5);
};
const watch = (b) => { const p = b.target; if (p && (!b.seen || b.game.time - b.seen.t > 0.25)) b.seen = { x: p.pos.x, z: p.pos.z, t: b.game.time }; };
const lance = (b, g, x, z, r, dmg, rgb, color) => {
  for (let i = 0; i < 20; i++) g.fx.add.spawn({ x: x + (Math.random() - 0.5) * 0.5, y: Math.random() * 7, z: z + (Math.random() - 0.5) * 0.5, vy: -14, life: 0.3, size: 0.4, size1: 0.1, r: rgb[0], g: rgb[1], b: rgb[2] });
  g.fx.burst({ x, y: 0.4, z }, 20, rgb, 6, 0.5, 0.3); g.fx.shockwave(x, z, r + 0.4, color, 0.4); g.impact(x, z, r * 0.8, 0.3);
  areaHit(b, g, x, z, (t, d) => d < r + t.radius * 0.5, { dmg });
};
const weights = (list) => (b, d, behind) => list(b, d, behind).filter(Boolean).map(([n, x]) => [n, n === b.lastMove ? x * 0.3 : x]);

// =====================================================================================================
// THE LAMP-KING
// =====================================================================================================
const fireRGB = [1, 0.6, 0.2];
const LAMP_MOVES = {
  pick3: {
    parry: true, dur: 2.3, track: [0.5, 4], tracks: [[0.95, 1.15, 3.5], [1.4, 1.6, 3.5]], sfx: [0.5, 'heavySwing'], trail: [0.52, 1.75],
    keys: [[0.5, P.swW], [0.66, P.swS], [0.98, P.bhW], [1.12, P.bhS], [1.42, P.ohR], [1.6, P.ohS], [2.0, P.ohS]],
    hits: [{ t0: 0.56, t1: 0.68, range: 4.2, arc: 2.6, dmg: 26, poise: 30 }, { t0: 1.02, t1: 1.14, range: 4.2, arc: 2.6, dmg: 26, poise: 30 }, { t0: 1.56, t1: 1.66, range: 4.4, arc: 1.0, dmg: 36, poise: 50, knock: 'heavy', parry: false }],
    move: [[0.45, 0.66, 1.0], [0.95, 1.12, 1.0], [1.4, 1.6, 0.9]], stopAt: 1.4,
    onTime: [{ t: 0.98, fn: (b, g) => g.audio.play('heavySwing', 1) }, { t: 1.42, fn: (b, g) => g.audio.play('heavySwing', 1) }, { t: 1.6, fn: (b, g) => { const f = b.fwd(); g.impact(b.pos.x + f.x * 3.4, b.pos.z + f.z * 3.4, 2.6, 0.4); } }],
  },
  // a crack runs out along the floor from the strike, bursting up in a line
  crack: {
    dur: 2.3, unparryable: true, track: [0.8, 2.6], sfx: [0.9, 'heavySwing'],
    keys: [[0.8, P.ohR], [1.0, P.ohS], [1.8, P.ohS]],
    hits: [{ t0: 0.98, t1: 1.08, shape: 'circle', offset: 2.6, radius: 2.0, dmg: 34, poise: 60, knock: 'heavy' }],
    onTime: [
      { t: 0.1, fn: (b) => glint(b, true) },
      { t: 1.0, fn: (b, g) => { const f = b.fwd(); b.crackLine = { x: b.pos.x + f.x * 2.6, z: b.pos.z + f.z * 2.6, fx: f.x, fz: f.z, k: 0 }; g.impact(b.crackLine.x, b.crackLine.z, 3, 0.6); for (let k = 1; k <= 6; k++) g.fx.telegraph(b.crackLine.x + f.x * k * 1.7, b.crackLine.z + f.z * k * 1.7, 1.1, 0.12 * k + 0.05, 0xff8a3a); } },
      ...every(1.12, 1.72, 0.12, (b, g, k) => { const L = b.crackLine; if (!L) return; const n = Math.round(k * 5) + 1, x = L.x + L.fx * n * 1.7, z = L.z + L.fz * n * 1.7; g.fx.burst({ x, y: 0.3, z }, 12, fireRGB, 4, 0.4, 0.3); g.fx.dust({ x, z }, 4, 0.6); areaHit(b, g, x, z, (t, d) => d < 1.1 + t.radius * 0.5, { dmg: 24 }); }),
    ],
  },
  // the lantern on its chain, hurled: where it lands it bursts in a ring of fire; then he hauls it back
  toss: {
    dur: 2.2, unparryable: true, track: [0.85, 3],
    keys: [[0.8, P.raiseL], [1.0, P.throwL], [1.9, P.throwL]],
    onTime: [
      { t: 0.2, fn: (b, g) => { glint(b, true); g.audio.play('fire', 0.5); } },
      { t: 0.95, fn: (b, g) => {
        const p = b.target; if (!p) return;
        const to = clampIn(b, p.pos.x, p.pos.z, 1.5), tele = g.fx.telegraph(to.x, to.z, 3.2, 0.7, 0xff6a1a);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), basic(0xffb040)); g.scene.add(lamp);
        const from = new THREE.Vector3(b.pos.x, 3.5, b.pos.z); let t = 0;
        const W = g.world, H = { x: to.x, z: to.z, update: (dt) => {
          t += dt; const k = Math.min(1, t / 0.7);
          lamp.position.set(from.x + (to.x - from.x) * k, from.y * (1 - k) + Math.sin(k * Math.PI) * 4 + 0.4, from.z + (to.z - from.z) * k);
          g.fx.flame(lamp.position, 0.6);
          if (k >= 1) { g.scene.remove(lamp); tele.dead = true; W.ambient.splice(W.ambient.indexOf(H), 1); g.fx.burst(lamp.position, 40, fireRGB, 7, 0.7, 0.35); g.fx.addShake(0.4); g.spawnFireRing(to.x, to.z, 4.2, 0.8, 26); }
        } };
        W.ambient.push(H);
      } },
    ],
  },
  // he slams his hand on the lantern's shutter: every light in the undercroft goes out
  snuff: {
    dur: 1.6, unparryable: true, cool: 18,
    keys: [[0.5, { ...P.roar, armL: [-1.6, 0, 1.6], armR: [-1.6, 0, -1.6] }], [0.8, P.crouch], [1.4, P.crouch]],
    onTime: [{ t: 0.78, fn: (b, g) => { b.snuffT = 8; b.snuffCd = 20; g.audio.play('fog', 1); g.audio.play('slam', 0.6); g.ui.toastSmall?.('THE LIGHTS GO OUT · FOLLOW HIS LANTERN'); g.fx.shockwave(b.pos.x, b.pos.z, 14, 0x301008, 0.8); } }],
  },
  leap: {
    dur: 2.1, unparryable: true, track: [0.45, 6], trail: [0.95, 1.15], leap: [0.45, 1.05],
    keys: [[0.4, P.crouch], [0.6, P.ohR], [0.98, P.ohR], [1.08, P.ohS], [1.7, P.ohS]],
    hits: [{ t0: 1.05, t1: 1.14, shape: 'circle', offset: 0.6, radius: 3.0, dmg: 38, poise: 60, knock: 'heavy' }],
    onTime: [{ t: 0.45, fn: (b) => b.beginLeap() }, { t: 1.06, fn: (b, g) => g.impact(b.pos.x, b.pos.z, 3.6, 0.6) }],
  },
  roar: {
    dur: 2.6, unparryable: true, unblockable: true,
    keys: [[0.5, { ...P.crouch, by: -0.3 }], [0.9, P.roar], [2.1, P.roar]],
    hits: [{ t0: 0.92, t1: 1.0, shape: 'circle', offset: 0, radius: 6, dmg: 12, poise: 50, knock: 'heavy' }],
    onTime: [{ t: 0.9, fn: (b, g) => { g.audio.play('roar', 1.2); g.fx.shockwave(b.pos.x, b.pos.z, 9, 0xffa040, 0.6); g.fx.addShake(1.0); b.elems = { fire: 0.35 }; b.lanternBroke = true; if (b.rig.lanternCage) b.rig.lanternCage.visible = false; g.ui.toastSmall?.('THE LANTERN BREAKS · THE FIRE RIDES HIM'); } }],
  },
};
const lampTick = (b, dt) => {
  const g = b.game;
  watch(b);
  if (!b.glow) { b.glow = { x: b.pos.x, y: 4, z: b.pos.z, color: 0xff9a3a, power: 10, range: 10, src: {} }; g.world.lights.push(b.glow); }
  b.glow.x = b.pos.x; b.glow.z = b.pos.z; b.glow.y = (b.pos.y || 0) + 3.4;
  b.snuffT = Math.max(0, (b.snuffT || 0) - dt); b.snuffCd = Math.max(0, (b.snuffCd || 0) - dt);
  // his lantern: brighter in the dark (and as it brightens, a blow's coming), a ring of fire round him once it's broken
  const tel = b.state === 'attack' && b.atk && b.atk.t < (b.atk.def.hits?.[0]?.t0 ?? 1) ? 1.6 : 1;
  b.glow.power = (b.snuffT > 0 ? 16 : 10) * tel * (b.lanternBroke ? 1.4 : 1); b.glow.range = b.lanternBroke ? 13 : 10;
  if (b.lanternBroke && b.alive && Math.random() < dt * 30) g.fx.flame({ x: b.pos.x + (Math.random() - 0.5) * 1.2, y: (b.pos.y || 0) + 2.8 + Math.random(), z: b.pos.z + (Math.random() - 0.5) * 1.2 }, 0.6);
  if (!b.alive) b.snuffT = 0;
};

// =====================================================================================================
// THE MOTHER BORER
// =====================================================================================================
const acidRGB = [0.6, 0.95, 0.25];
const BORER_MOVES = {
  bite: {
    parry: true, dur: 2.0, track: [0.5, 4], tracks: [[1.0, 1.2, 3.5]], sfx: [0.5, 'heavySwing'], trail: [0.52, 1.35],
    keys: [[0.5, P.thW], [0.66, P.thS], [1.0, P.thW], [1.16, P.thS], [1.6, P.thS]],
    hits: [{ t0: 0.6, t1: 0.72, range: 4.0, arc: 1.6, dmg: 28, poise: 35 }, { t0: 1.1, t1: 1.22, range: 4.2, arc: 1.6, dmg: 32, poise: 40 }],
    move: [[0.45, 0.66, 1.4], [0.95, 1.16, 1.4]], stopAt: 1.4,
    onTime: every(0.6, 1.3, 0.06, (b, g) => g.fx.sparks(b.rig.tip.getWorldPosition(new THREE.Vector3()), null, 2, [1, 0.7, 0.3])),
  },
  // her body arcs round at head height: duck under it with a roll
  sweep: {
    dur: 1.9, unparryable: true, sfx: [0.7, 'heavySwing'], trail: [0.7, 1.1], spin: [0.7, 1.1, -Math.PI * 2],
    keys: [[0.6, { ...P.swW, torso: [0.2, 1.2, 0] }], [0.75, P.swS], [1.15, P.swS]],
    hits: [{ t0: 0.7, t1: 1.1, shape: 'circle', offset: 0, radius: 5.0, dmg: 30, poise: 50, knockback: 12 }],
    onTime: [{ t: 0.05, fn: (b) => glint(b, true) }],
  },
  // she sinks into the floor (she can't be struck) and tunnels after you; the ground cracks where you stand; she
  // erupts, and her vent-hearts stand open a moment
  dive: {
    dur: 3.4, unparryable: true, cool: 7,
    keys: [[0.4, P.crouch], [3.0, P.crouch], [3.2, P.roar]],
    onTime: [
      { t: 0.4, fn: (b, g) => { b.under = true; b.rig.root.visible = false; g.fx.dust(b.pos, 20, 2, [0.35, 0.3, 0.25]); g.impact(b.pos.x, b.pos.z, 3, 0.5); } },
      { t: 1.9, fn: (b, g) => { const p = b.target; if (!p) return; const at = clampIn(b, p.pos.x, p.pos.z, 2); b.eruptAt = at; b.tele = g.fx.telegraph(at.x, at.z, 2.8, 1.1, 0xc89a50); if (b.phase2) { const o = clampIn(b, at.x + 5, at.z, 2); b.eruptAt2 = o; g.fx.telegraph(o.x, o.z, 2.2, 1.1, 0x9ad040); } } },
      { t: 3.0, fn: (b, g) => {
        const at = b.eruptAt || b.pos; b.under = false; b.pos.x = at.x; b.pos.z = at.z; b.rig.root.visible = true;
        g.impact(at.x, at.z, 3.5, 0.9); g.fx.burst({ x: at.x, y: 1, z: at.z }, 40, [0.5, 0.4, 0.3], 7, 0.8, 0.4);
        areaHit(b, g, at.x, at.z, (t, d) => d < 2.8 + t.radius * 0.5, { dmg: 42 });
        if (b.eruptAt2) { const o = b.eruptAt2; g.fx.burst({ x: o.x, y: 0.6, z: o.z }, 24, acidRGB, 5, 0.6, 0.3); areaHit(b, g, o.x, o.z, (t, d) => d < 2.2 + t.radius * 0.5, { dmg: 26, elems: { poison: 0.6 } }); b.eruptAt2 = null; }
        b.exposed = 4; g.ui.toastSmall?.('HER VENTS ARE OPEN · STRIKE NOW');
      } },
    ],
  },
  // acid out of her vents, in a ring round her
  brood: {
    dur: 2.0, unparryable: true, track: [0.4, 2],
    keys: [[0.6, P.crouch], [0.9, P.roar], [1.6, P.roar]],
    onTime: [
      { t: 0.2, fn: (b, g) => g.audio.play('hurt', 0.6) },
      { t: 0.9, fn: (b, g) => { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.random() * 0.4, d = 4 + Math.random() * 3, x = b.pos.x + Math.cos(a) * d, z = b.pos.z + Math.sin(a) * d; if (!inArena(b, x, z)) continue; const tele = g.fx.telegraph(x, z, 1.6, 0.6, 0x9ad040); setTimeout(() => { tele.dead = true; g.fx.burst({ x, y: 0.5, z }, 16, acidRGB, 4, 0.5, 0.3); areaHit(b, g, x, z, (t, dd) => dd < 1.6 + t.radius * 0.5, { dmg: 22, elems: { poison: 0.6 } }); }, 600); } } },
    ],
  },
  roar: {
    dur: 2.4, unparryable: true, unblockable: true,
    keys: [[0.5, P.crouch], [0.9, P.roar], [2.0, P.roar]],
    hits: [{ t0: 0.92, t1: 1.0, shape: 'circle', offset: 0, radius: 6, dmg: 12, poise: 50, knock: 'heavy' }],
    onTime: [{ t: 0.9, fn: (b, g) => { g.audio.play('roar', 1.2); g.fx.shockwave(b.pos.x, b.pos.z, 9, 0x9ad040, 0.6); g.fx.addShake(1.0); b.atkSpeed = 1.18; b.elems = { poison: 0.3 }; } }],
  },
};
const borerTick = (b, dt) => {
  watch(b);
  b.exposed = Math.max(0, (b.exposed || 0) - dt);
  if (b.rig.vents) for (const v of b.rig.vents) v.color.setHex(b.exposed > 0 ? 0xfff070 : 0x5a8a3a);
  // tunnelling after you, under the floor
  if (b.under && b.alive) {
    const p = b.target, g = b.game;
    if (p && !b.eruptAt) { const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz); if (d > 0.5) { const at = clampIn(b, b.pos.x + dx / d * 7 * dt, b.pos.z + dz / d * 7 * dt, 2); b.pos.x = at.x; b.pos.z = at.z; } }
    if (Math.random() < dt * 25) g.fx.dust(b.pos, 2, 0.8, [0.35, 0.3, 0.25]);
  }
  if (b.state !== 'attack') { b.under = false; b.eruptAt = null; if (b.alive) b.rig.root.visible = true; }
};

// =====================================================================================================
// THE GLASS HIEROPHANT
// =====================================================================================================
const violet = [0.75, 0.55, 1];
const pillarsOf = (b) => b.game.enemies.filter((e) => e.type === 'mirrorpillar' && e.alive && Math.hypot(e.pos.x - b.arena.x, e.pos.z - b.arena.z) < b.arena.r + 2);
const HIERO_MOVES = {
  crozier: {
    parry: true, dur: 2.0, track: [0.45, 4.5], tracks: [[0.9, 1.1, 4]], sfx: [0.45, 'heavySwing'], trail: [0.47, 1.25],
    keys: [[0.45, P.swW], [0.6, P.swS], [0.9, P.bhW], [1.05, P.bhS], [1.6, P.bhS]],
    hits: [{ t0: 0.5, t1: 0.62, range: 3.8, arc: 2.6, dmg: 26, poise: 30 }, { t0: 0.96, t1: 1.08, range: 3.8, arc: 2.6, dmg: 28, poise: 34 }],
    move: [[0.4, 0.6, 1.0], [0.88, 1.05, 1.0]], stopAt: 1.3,
  },
  // three marks where you'll be, one after another along your way; a lance of light on each
  foresight: {
    dur: 2.6, unparryable: true, track: [0.3, 4],
    keys: [[0.4, P.raiseL], [2.0, P.raiseL], [2.3, P.throwL]],
    onTime: [
      { t: 0.25, fn: (b, g) => g.audio.play('bow', 0.6) },
      ...[0.5, 0.85, 1.2].map((t, k) => ({ t, fn: (b, g) => { const p = b.target; if (!p) return; const at = foresee(b, p, 1.0 + k * 0.35); (b.marks ||= [])[k] = at; g.fx.telegraph(at.x, at.z, 1.8, 1.3 - k * 0.1, 0xb070ff); } })),
      ...[1.8, 2.05, 2.3].map((t, k) => ({ t, fn: (b, g) => { const m = b.marks?.[k]; if (m) lance(b, g, m.x, m.z, 1.8, 30, [0.92, 0.82, 1], 0xb070ff); } })),
    ],
  },
  // he steps into a mirror-pillar and comes out of another (break them and he has nowhere to go)
  mirrorstep: {
    dur: 1.6, unparryable: true, cool: 6,
    keys: [[0.3, P.crouch], [1.3, P.thS]],
    onTime: [
      { t: 0.35, fn: (b, g) => {
        const ps = pillarsOf(b); if (ps.length < 2) { b.atk.t = 9; return; }
        const near = ps.reduce((a, q) => (Math.hypot(q.pos.x - b.pos.x, q.pos.z - b.pos.z) < Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) ? q : a));
        const p = b.target, far = ps.filter((q) => q !== near).reduce((a, q) => (!p || Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) ? q : a));
        g.fx.burst({ x: b.pos.x, y: 2, z: b.pos.z }, 30, violet, 4, 0.5, 0.3); b.inMirror = 0.7; b.rig.root.visible = false;
        const out = clampIn(b, far.pos.x + (b.arena.x - far.pos.x) * 0.12, far.pos.z + (b.arena.z - far.pos.z) * 0.12, 2);
        b.pos.x = out.x; b.pos.z = out.z; if (p) b.yaw = Math.atan2(p.pos.x - out.x, p.pos.z - out.z);
        g.audio.play('parry', 0.5);
      } },
      { t: 1.05, fn: (b, g) => { b.inMirror = 0; b.rig.root.visible = true; g.fx.burst({ x: b.pos.x, y: 2, z: b.pos.z }, 30, violet, 4, 0.5, 0.3); g.fx.shockwave(b.pos.x, b.pos.z, 3, 0xb070ff, 0.4); } },
    ],
  },
  // crystal rains on half the hall: the other half is safe
  shardrain: {
    dur: 3.0, unparryable: true, cool: 9,
    keys: [[0.5, P.raiseL], [2.4, P.raiseL], [2.7, P.roar]],
    onTime: [
      { t: 0.5, fn: (b, g) => {
        const a = Math.random() * Math.PI * 2, nx = Math.cos(a), nz = Math.sin(a), A = b.arena; b.rainN = { nx, nz };
        for (let k = 0; k < 18; k++) { const r = Math.random() * A.r, t = Math.random() * Math.PI * 2, x = A.x + Math.cos(t) * r, z = A.z + Math.sin(t) * r; if ((x - A.x) * nx + (z - A.z) * nz > 0) g.fx.telegraph(x, z, 1.6, 1.8, 0xb070ff); }
        g.ui.toastSmall?.('CRYSTAL FALLS · FIND THE SAFE HALF');
      } },
      ...every(2.0, 2.6, 0.06, (b, g) => { const A = b.arena, N = b.rainN; if (!N) return; for (let i = 0; i < 3; i++) { const r = Math.random() * A.r, t = Math.random() * Math.PI * 2, x = A.x + Math.cos(t) * r, z = A.z + Math.sin(t) * r; if ((x - A.x) * N.nx + (z - A.z) * N.nz > 0) g.fx.add.spawn({ x, y: 8, z, vy: -18, life: 0.4, size: 0.3, size1: 0.1, r: violet[0], g: violet[1], b: violet[2] }); } }),
      { t: 2.3, fn: (b, g) => { const A = b.arena, N = b.rainN; if (!N) return; g.audio.play('clang', 0.8); g.fx.addShake(0.4); areaHit(b, g, A.x, A.z, (t) => (t.pos.x - A.x) * N.nx + (t.pos.z - A.z) * N.nz > -0.6, { dmg: 34 }); b.rainN = null; } },
    ],
  },
  roar: {
    dur: 2.4, unparryable: true, unblockable: true,
    keys: [[0.5, P.crouch], [0.9, P.roar], [2.0, P.roar]],
    hits: [{ t0: 0.92, t1: 1.0, shape: 'circle', offset: 0, radius: 6, dmg: 12, poise: 50, knock: 'heavy' }],
    onTime: [{ t: 0.9, fn: (b, g) => { g.audio.play('roar', 1.2); g.fx.shockwave(b.pos.x, b.pos.z, 9, 0xb070ff, 0.6); g.fx.addShake(1.0); b.wantEchoes = true; g.ui.toastSmall?.('HIS REFLECTIONS STEP OUT OF THE GLASS'); } }],
  },
};
// second phase: two reflections stand round the hall from him and echo each blow half a second late
const echoes = (b) => {
  const g = b.game;
  if (b.wantEchoes && !b.echoes) {
    b.echoes = [0, 1].map(() => {
      const rig = buildHumanoid({ ...BOSSES.hierophant.model }); // (a fresh body of his for each)
      rig.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; o.userData.noShadow = true; } });
      g.scene.add(rig.root); return { rig, queue: [] };
    }).filter(Boolean);
  }
  if (!b.echoes) return;
  const A = b.arena, now = g.time;
  b.echoes.forEach((E, k) => {
    const a = Math.atan2(b.pos.x - A.x, b.pos.z - A.z) + (k ? 2.09 : -2.09), d = Math.hypot(b.pos.x - A.x, b.pos.z - A.z);
    const x = A.x + Math.sin(a) * d, z = A.z + Math.cos(a) * d;
    E.rig.root.visible = b.alive && b.rig.root.visible;
    E.rig.root.position.set(x, 0, z); E.rig.root.rotation.y = b.yaw + (k ? 2.09 : -2.09); E.rig.root.scale.copy(b.rig.root.scale);
    // copy his joints as they were half a second ago
    E.queue.push({ t: now, j: Object.fromEntries(Object.entries(b.rig.j).map(([n, o]) => [n, o.rotation.clone()])) });
    while (E.queue.length > 1 && now - E.queue[1].t > 0.5) E.queue.shift();
    const f = E.queue[0]; if (f) for (const [n, r] of Object.entries(f.j)) E.rig.j[n]?.rotation.copy(r);
    // his blows, echoed: a hit window of his that just landed lands here too, half a second on
    if (b.state === 'attack' && b.atk?.def.hits) for (const h of b.atk.def.hits) {
      const key = b.atk.def === E.lastDef && E.lastHit === h;
      if (!key && b.atk.t >= h.t0 && b.atk.t <= h.t1) { E.lastDef = b.atk.def; E.lastHit = h; const r = (h.radius || h.range || 3) * 0.9; setTimeout(() => { if (!b.alive) return; g.fx.shockwave(x, z, r, 0xb070ff, 0.3); areaHit(b, g, x, z, (t, dd) => dd < r + t.radius * 0.5, { dmg: (h.dmg || 20) * 0.7 }); }, 500); }
    }
  });
  if (!b.alive) { for (const E of b.echoes) g.scene.remove(E.rig.root); b.echoes = null; b.wantEchoes = false; }
};
const hieroTick = (b, dt) => { watch(b); b.inMirror = Math.max(0, (b.inMirror || 0) - dt); echoes(b); };

// =====================================================================================================
// THE KILNFATHER
// =====================================================================================================
const lavaRGB = [1, 0.5, 0.15];
const reserveOf = (g, type) => g.reserves.find((e) => e.type === type && e.reserve);
// a globe of molten glass blown from his pipe, flying to a spot, hardening there into a pillar for 20 s
const blowGlobe = (b, g, at) => {
  const glob = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), basic(0xffa040)); g.scene.add(glob);
  const from = b.rig.tip.getWorldPosition(new THREE.Vector3()); let t = 0;
  const W = g.world, tele = g.fx.telegraph(at.x, at.z, 1.4, 0.8, 0xff8a3a);
  const H = { x: at.x, z: at.z, update: (dt) => {
    t += dt; const k = Math.min(1, t / 0.8);
    glob.position.set(from.x + (at.x - from.x) * k, from.y * (1 - k) + Math.sin(k * Math.PI) * 3 + 0.6 * k, from.z + (at.z - from.z) * k);
    if (Math.random() < dt * 40) g.fx.ember(glob.position, 0.2, 0.6);
    if (k >= 1) {
      g.scene.remove(glob); tele.dead = true; W.ambient.splice(W.ambient.indexOf(H), 1);
      areaHit(b, g, at.x, at.z, (tt, d) => d < 1.4 + tt.radius * 0.5, { dmg: 22, elems: { fire: 0.5 } });
      const pillar = reserveOf(g, 'kilnpillar');
      if (pillar && !g.isGuest) { g.activateReserve(pillar, at.x, at.z); pillar.bornAt = g.time; }
      g.fx.burst({ x: at.x, y: 1, z: at.z }, 24, lavaRGB, 4, 0.5, 0.3); g.audio.play('clang', 0.6);
    }
  } };
  W.ambient.push(H);
};
// the lava rising: each pattern glows on the floor 1.6 s, then burns for 4 s (rings, then halves)
const LAVA_PATTERNS = [
  { name: 'inner', test: (d) => d < 8 },
  { name: 'outer', test: (d) => d > 11 },
  { name: 'half', test: (d, x, z, A, a) => (x - A.x) * Math.cos(a) + (z - A.z) * Math.sin(a) > 0 },
  { name: 'ring', test: (d) => d > 5 && d < 10 },
];
const lavaRise = (b, g) => {
  const A = b.arena, pat = LAVA_PATTERNS[(b.lavaN = ((b.lavaN ?? -1) + 1)) % LAVA_PATTERNS.length], a = Math.random() * Math.PI * 2;
  const cells = [];
  for (let x = A.x - A.r; x <= A.x + A.r; x += 2) for (let z = A.z - A.r; z <= A.z + A.r; z += 2) { const d = Math.hypot(x - A.x, z - A.z); if (d < A.r - 0.5 && pat.test(d, x, z, A, a)) cells.push({ x, z }); }
  const mat = new THREE.MeshBasicMaterial({ color: 0xff5a10, transparent: true, opacity: 0.25, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat, cells.length);
  const m4 = new THREE.Matrix4(); cells.forEach((c, i) => mesh.setMatrixAt(i, m4.makeTranslation(c.x, 0.08, c.z))); mesh.frustumCulled = false; g.scene.add(mesh);
  b.lava = { cells, mesh, mat, t: 0, warn: 1.6, burn: 4, test: (x, z) => { const d = Math.hypot(x - A.x, z - A.z); return d < A.r && pat.test(d, x, z, A, a); }, tick: 0 };
  g.ui.toastSmall?.('THE LAVA RISES'); g.audio.play('fire', 0.8);
};
const lavaUpdate = (b, dt) => {
  const L = b.lava, g = b.game; if (!L) return;
  L.t += dt;
  const burning = L.t > L.warn;
  L.mat.opacity = burning ? 0.8 + Math.sin(g.time * 9) * 0.1 : 0.15 + 0.2 * Math.abs(Math.sin(L.t * 8));
  L.mat.color.setHex(burning ? 0xff7a20 : 0xff4a10);
  if (burning) {
    if (Math.random() < dt * 30) { const c = L.cells[Math.floor(Math.random() * L.cells.length)]; if (c) g.fx.ember({ x: c.x + (Math.random() - 0.5) * 2, y: 0.2, z: c.z + (Math.random() - 0.5) * 2 }, 0.4, 1.5); }
    if ((L.tick -= dt) <= 0) { L.tick = 0.4; for (const p of g.allPlayers()) if (p.alive && L.test(p.pos.x, p.pos.z) && !p.rolling) g.projectileHit(p, { dmg: 14 * NUM * (b.dmgScale || 1), knock: 'none', src: [p.pos.x, p.pos.z - 1], elems: { fire: 0.6 } }); }
  }
  if (L.t > L.warn + L.burn || !b.alive) { g.scene.remove(L.mesh); L.mesh.geometry.dispose(); b.lava = null; }
};
const KILN_MOVES = {
  pipe3: {
    parry: true, dur: 2.4, track: [0.5, 4], tracks: [[0.95, 1.15, 3.5], [1.45, 1.65, 3.2]], sfx: [0.5, 'heavySwing'], trail: [0.52, 1.85],
    keys: [[0.5, P.swW], [0.68, P.swS], [1.0, P.bhW], [1.15, P.bhS], [1.45, P.thW], [1.65, P.thS], [2.1, P.thS]],
    hits: [{ t0: 0.58, t1: 0.7, range: 5.0, arc: 2.8, dmg: 30, poise: 35 }, { t0: 1.06, t1: 1.18, range: 5.0, arc: 2.8, dmg: 30, poise: 35 }, { t0: 1.58, t1: 1.7, shape: 'circle', offset: 2.4, radius: 1.5, dmg: 40, poise: 55, knock: 'heavy', parry: false }],
    move: [[0.45, 0.68, 1.0], [0.95, 1.15, 1.0], [1.45, 1.65, 2.2]], stopAt: 1.6,
    onTime: [{ t: 1.0, fn: (b, g) => g.audio.play('heavySwing', 1) }, { t: 1.45, fn: (b, g) => g.audio.play('heavySwing', 1) }],
  },
  // he dips the pipe in the lava and blows: a globe of glass that hardens into a pillar where it lands
  gather: {
    dur: 2.2, unparryable: true, track: [0.8, 2], cool: 5,
    keys: [[0.6, { ...P.crouch, armR: [-0.4, 0, -0.2], foreR: [-0.2, 0, 0] }], [1.1, P.thW], [1.35, { ...P.thS, head: [-0.3, 0, 0] }], [2.0, P.thS]],
    onTime: [
      { t: 0.3, fn: (b, g) => { const p = b.rig.tip.getWorldPosition(new THREE.Vector3()); g.fx.burst(p, 16, lavaRGB, 2, 0.6, 0.3); g.audio.play('fire', 0.6); } },
      { t: 1.3, fn: (b, g) => { const p = b.target; if (!p) return; const n = b.shell === false ? 2 : 1; for (let k = 0; k < n; k++) blowGlobe(b, g, clampIn(b, p.pos.x + (k ? (Math.random() - 0.5) * 6 : 0), p.pos.z + (k ? (Math.random() - 0.5) * 6 : 0), 2)); } },
    ],
  },
  // a slam that cools the floor round him into spikes of glass
  quench: {
    dur: 2.1, unparryable: true, track: [0.8, 2], sfx: [0.85, 'heavySwing'],
    keys: [[0.8, P.ohR], [1.0, P.ohS], [1.7, P.ohS]],
    hits: [{ t0: 1.0, t1: 1.1, shape: 'circle', offset: 0, radius: 4.2, dmg: 34, poise: 55, knock: 'heavy' }],
    onTime: [{ t: 0.1, fn: (b, g) => { glint(b, true); b.tele = g.fx.telegraph(b.pos.x, b.pos.z, 4.2, 0.9 / b.atkSpeed, 0x8ae0ff); } }, { t: 1.0, fn: (b, g) => { g.impact(b.pos.x, b.pos.z, 4.4, 0.7); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; g.fx.burst({ x: b.pos.x + Math.cos(a) * 3, y: 0.5, z: b.pos.z + Math.sin(a) * 3 }, 6, [0.6, 0.85, 1], 3, 0.4, 0.3); } } }],
  },
  // the lava rises round the hall (second phase on)
  flood: {
    dur: 1.8, unparryable: true, cool: 11,
    keys: [[0.5, P.raiseL], [1.0, P.roar], [1.6, P.roar]],
    onTime: [{ t: 0.9, fn: (b, g) => { lavaRise(b, g); g.fx.addShake(0.5); b.floodCd = 6; } }],
  },
  leap: {
    dur: 2.2, unparryable: true, track: [0.45, 6], trail: [0.95, 1.15], leap: [0.45, 1.05],
    keys: [[0.4, P.crouch], [0.6, P.ohR], [0.98, P.ohR], [1.08, P.ohS], [1.7, P.ohS]],
    hits: [{ t0: 1.05, t1: 1.14, shape: 'circle', offset: 0.6, radius: 3.2, dmg: 42, poise: 60, knock: 'heavy' }],
    onTime: [{ t: 0.45, fn: (b) => { b.beginLeap(); if (b.shell === false && b.target) b.leapTo = foresee(b, b.target, 0.8); } }, { t: 1.06, fn: (b, g) => { g.impact(b.pos.x, b.pos.z, 3.8, 0.7); g.spawnFireRing(b.pos.x, b.pos.z, 4.5, 0.8, 20); } }], // (shell gone: he lands where you're going)
  },
  roar: {
    dur: 2.6, unparryable: true, unblockable: true,
    keys: [[0.5, { ...P.crouch, by: -0.3 }], [0.9, P.roar], [2.1, P.roar]],
    hits: [{ t0: 0.92, t1: 1.0, shape: 'circle', offset: 0, radius: 6, dmg: 14, poise: 50, knock: 'heavy' }],
    onTime: [{ t: 0.9, fn: (b, g) => { g.audio.play('roar', 1.3); g.fx.shockwave(b.pos.x, b.pos.z, 10, 0xff6a1a, 0.7); g.fx.addShake(1.0); b.ignite(); lavaRise(b, g); } }],
  },
};
const kilnTick = (b, dt) => {
  const g = b.game;
  watch(b); lavaUpdate(b, dt);
  // the third phase: at a quarter of his health his glass shell shatters
  if (b.alive && b.phase2 && b.shell !== false && b.hp <= b.maxHp * 0.25) {
    b.shell = false; b.atkSpeed = 1.3; b.trackMul = 1.4; b.elems = { fire: 0.45 };
    if (b.rig.shellParts) for (const s of b.rig.shellParts) s.visible = false;
    g.fx.burst({ x: b.pos.x, y: 3, z: b.pos.z }, 60, [0.6, 0.85, 1], 8, 0.8, 0.35); g.audio.play('clang', 1); g.audio.play('roar', 1); g.fx.addShake(1);
    g.ui.toastSmall?.('HIS SHELL SHATTERS · HE SEES WHERE YOU WILL BE');
  }
  if (b.rig.core) b.rig.core.color.setHex(b.shell === false ? 0xffd040 : b.phase2 ? 0xff7a20 : 0xff4a10);
  if (b.alive && Math.random() < dt * (b.shell === false ? 40 : 12)) g.fx.ember({ x: b.pos.x + (Math.random() - 0.5), y: 1 + Math.random() * 3, z: b.pos.z + (Math.random() - 0.5) }, 0.3, 1.5);
  // his pillars stand 20 s, then crumble
  for (const e of g.enemies) if (e.type === 'kilnpillar' && e.alive && e.bornAt != null && g.time - e.bornAt > 20) e.die(true);
  b.floodCd = Math.max(0, (b.floodCd || 0) - dt);
};
const kilnRecv = (b, info) => info;

// the boss table
const BOSS_DEFS = {
  lampking: {
    id: 'lampking', name: 'The Lamp-King, Foreman of Lanternhold', elems: null, hp: 1150, poise: 160, radius: 0.95, walk: 2.6, gap: [0.4, 1.0], music: 'hask',
    phase2: true, phase2At: 0.5, kneels: false, moves: LAMP_MOVES, leapH: 3.6, leapR: 3.0, leapAir: 0.65, leapCd: 7,
    weights: weights((b, d, behind) => [
      d < 3.6 && ['pick3', 3], d < 4 && ['crack', 1.6], d >= 3 && ['crack', 2], d >= 4.5 && ['toss', 2.5], (b.snuffCd || 0) <= 0 && ['snuff', b.phase2 ? 2 : 1.4], d > 6 && b.leapCd <= 0 && ['leap', 3],
    ]),
    punish: (b, dist) => (dist > 4 ? 'toss' : 'pick3'), tick: lampTick,
    reset: (b) => { b.snuffT = 0; b.snuffCd = 6; b.lanternBroke = false; if (b.rig.lanternCage) b.rig.lanternCage.visible = true; },
    model: { scale: 1.9, cloth: 0x3a2e24, armor: 0x4a3e30, accent: 0x8a6a2e, skin: 0x8a7a6a, head: 'none', weapon: 'club', eyes: 0xffc060, bulk: 1.4, kit: 'lampking' },
  },
  borer: {
    id: 'borer', name: 'The Mother Borer', hp: 1350, poise: 220, radius: 1.2, walk: 2.4, gap: [0.45, 1.1], music: 'gorrath',
    phase2: true, phase2At: 0.5, kneels: false, moves: BORER_MOVES,
    weights: weights((b, d, behind) => [d < 4 && ['bite', 3], d < 5.5 && ['sweep', behind ? 6 : 1.8], ['dive', d > 5 ? 3 : 1.4], ['brood', 1.2]]),
    punish: () => 'dive', tick: borerTick, immune: (b) => !!b.under,
    onReceive: (b, info) => (b.exposed > 0 ? { ...info, dmg: info.dmg * 1.8, poise: (info.poise || 0) * 2.2 } : info),
    reset: (b) => { b.under = false; b.exposed = 0; b.eruptAt = null; },
    model: { scale: 2.2, cloth: 0x8a8070, armor: 0x5a5650, accent: 0x5a8a3a, skin: 0xb8ac98, head: 'none', weapon: 'club', eyes: 0x9af050, bulk: 1.6, kit: 'motherborer' },
  },
  hierophant: {
    id: 'hierophant', name: 'The Glass Hierophant', hp: 1250, poise: 150, radius: 0.85, walk: 2.8, gap: [0.35, 0.95], music: 'vael',
    phase2: true, phase2At: 0.5, kneels: false, moves: HIERO_MOVES,
    weights: weights((b, d, behind) => [d < 3.4 && ['crozier', 3], ['foresight', d > 4 ? 3 : 1.4], pillarsOf(b).length >= 2 && ['mirrorstep', d < 3 ? 2.5 : 1.2], ['shardrain', 1.1]]),
    punish: () => 'foresight', tick: hieroTick, immune: (b) => b.inMirror > 0,
    reset: (b) => { b.inMirror = 0; b.wantEchoes = false; if (b.echoes) { for (const E of b.echoes) b.game.scene.remove(E.rig.root); b.echoes = null; } },
    model: { scale: 1.6, cloth: 0xd8d4e0, armor: 0xb8b4c8, accent: 0x8a6ad8, skin: 0xc8c0c8, head: 'none', weapon: 'psystaff', eyes: 0xd0b0ff, bulk: 1.0, cape: true, kit: 'hierophant' },
  },
  kilnfather: {
    id: 'kilnfather', name: 'The Kilnfather, First of the Glassmakers', hp: 2000, poise: 240, radius: 1.25, walk: 2.4, gap: [0.45, 1.1], music: 'varek1',
    phase2: true, phase2At: 0.6, kneels: false, moves: KILN_MOVES, leapH: 4.5, leapR: 3.2, leapAir: 0.75, leapCd: 8,
    weights: weights((b, d, behind) => [d < 4.4 && ['pipe3', 3], d < 4.4 && ['quench', behind ? 5 : 1.4], ['gather', d > 4 ? 2.5 : 1], b.phase2 && !b.lava && (b.floodCd || 0) <= 0 && ['flood', 2.2], d > 6 && b.leapCd <= 0 && ['leap', 2.5]]),
    punish: (b, dist) => (dist > 5 ? 'gather' : 'quench'), tick: kilnTick, onReceive: kilnRecv,
    reset: (b) => { b.shell = true; if (b.lava) { b.game.scene.remove(b.lava.mesh); b.lava = null; } if (b.rig.shellParts) for (const s of b.rig.shellParts) s.visible = true; },
    model: { scale: 2.3, cloth: 0x2a1a14, armor: 0x3a2a24, accent: 0xff6a1a, skin: 0x5a3a2a, head: 'none', weapon: 'spear', eyes: 0xffd040, bulk: 1.45, kit: 'kilnfather' },
  },
};
for (const B of Object.values(BOSS_DEFS)) { B.hp *= NUM; BOSSES[B.id] = B; }
// the Kilnfather's music turns over to its second half when his shell first cracks (boss.js ignite plays song 2)

// ---------- the arenas' still things: mirror-pillars (the Hierophant's doors) and glass pillars (the Kilnfather's) ----------
// struck, they crack and break; they never fight. A Kilnfather pillar breaking right beside him hurts him
TYPES.mirrorpillar = {
  name: 'Mirror Pillar', hp: 500 * NUM, poise: 999, scale: 1, radius: 0.8, run: 0, walk: 0, aggro: 0, prefer: 0, style: 'sword', turn: 0, still: true, quiet: true,
  cd: [99, 99], moves: {}, weights: {}, superArmor: true, noGold: true,
  model: { cloth: 0x8a88a0, armor: 0xc8c8e0, skin: 0xc8c8e0, head: 'none', eyes: 0x000000, kit: 'mirrorpillar' },
};
TYPES.kilnpillar = {
  name: 'Glass Pillar', hp: 260 * NUM, poise: 999, scale: 1, radius: 0.75, run: 0, walk: 0, aggro: 0, prefer: 0, style: 'sword', turn: 0, still: true, quiet: true,
  cd: [99, 99], moves: {}, weights: {}, superArmor: true, noGold: true, blocks: true,
  onDie: (e) => {
    const g = e.game, B = g.activeEnc?.boss;
    for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2; g.fx.add.spawn({ x: e.pos.x, y: 1 + Math.random() * 2, z: e.pos.z, vx: Math.cos(a) * 7, vy: Math.random() * 3, vz: Math.sin(a) * 7, life: 0.45, size: 0.2, size1: 0.04, r: 0.6, g: 0.85, b: 1 }); }
    g.audio.play('clang', 0.8);
    if (B?.alive && B.cfg.id === 'kilnfather' && Math.hypot(B.pos.x - e.pos.x, B.pos.z - e.pos.z) < 4.5 && !g.isGuest) {
      B.hp = Math.max(1, B.hp - B.maxHp * 0.05); B.rig.flash(0.6, 0.85, 1); g.ui.toastSmall?.('THE SHARDS CUT HIM');
      if (B.state === 'neutral') { B.setState('broken'); }
    }
  },
  model: { cloth: 0x5ab8d8, armor: 0x8ae0f0, skin: 0x8ae0f0, head: 'none', eyes: 0x000000, kit: 'kilnpillar' },
};

// =====================================================================================================
// the models
// =====================================================================================================
const setWeapon = (r, g, base, tip) => { r.wpnR = g; r.base.position.set(0, 0, base); g.add(r.base); r.tip.position.set(0, 0, tip); g.add(r.tip); };
const stripBody = (r) => { const s0 = (o) => { for (const c of [...o.children]) { if (c.isMesh) o.remove(c); else s0(c); } }; s0(r.body); };
Object.assign(KITS, {
  // the Lamp-King: a swollen foreman in a leather coat, a miner's helm with a great lamp, a huge iron lantern-cage on
  // his back with something burning inside it, a long pick-hammer
  lampking: { weapon: true, build(r) {
    const { bulk: b } = r.dims;
    const iron = r.m(0x3a3a3e), leather = r.m(0x4a3a2a), brass = r.m(0x8a6a2e), fire = basic(0xffa040), H = r.j.head, T = r.j.torso;
    H.add(box(0.3, 0.3, 0.3, r.m(0x8a7a6a), 0, 0.16, 0)); H.add(box(0.36, 0.14, 0.36, brass, 0, 0.36, 0)); H.add(box(0.12, 0.1, 0.06, fire, 0, 0.34, 0.2));
    const cage = new THREE.Group(); cage.position.set(0, 0.7, -0.38 * b); T.add(cage); r.lanternCage = cage;
    cage.add(box(0.5, 0.7, 0.5, fire, 0, 0, 0));
    for (const [x, z] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) cage.add(box(0.05, 0.8, 0.05, iron, x, 0, z));
    for (const y of [-0.4, 0.4]) cage.add(box(0.6, 0.06, 0.6, iron, 0, y, 0));
    for (let i = -1; i <= 1; i++) cage.add(box(0.03, 0.7, 0.52, iron, i * 0.12, 0, 0));
    T.add(box(0.6 * b, 0.6, 0.08, leather, 0, 0.3, 0.2));
    const g = new THREE.Group(); r.j.handR.add(g); g.add(box(0.07, 0.07, 1.4, r.m(0x3a2a1e), 0, 0, 0.55)); g.add(box(0.26, 0.26, 0.4, iron, 0, 0, 1.25)); g.add(rbox(0.06, 0.06, 0.5, iron, 0, 0.22, 1.25, -0.5, 0, 0));
    setWeapon(r, g, 0.2, 1.35);
  } },
  // the Mother Borer: a bloated grey body in iron plates, a spinning drill where the head was, three vent-hearts along
  // her back that glow yellow when they're open
  motherborer: { weapon: true, build(r) {
    const { bulk: b } = r.dims;
    const plate = r.m(0x5a5650), flesh = r.m(0xb8ac98), steel = r.m(0x9a9aa4), H = r.j.head, T = r.j.torso;
    const drill = cone(0.32, 1.0, steel, 8); drill.rotation.x = Math.PI / 2; drill.position.set(0, 0.12, 0.5); H.add(drill); r.drill = drill;
    H.add(cyl(0.34, 0.34, 0.3, plate, 10).rotateX(Math.PI / 2));
    for (let i = 0; i < 4; i++) T.add(box(0.62 * b, 0.14, 0.42 * b, i % 2 ? plate : flesh, 0, 0.12 + i * 0.16, -0.02));
    r.vents = [];
    for (let i = 0; i < 3; i++) { const m = new THREE.MeshBasicMaterial({ color: 0x5a8a3a }); r.vents.push(m); T.add(box(0.16, 0.16, 0.1, m, (i - 1) * 0.2, 0.55, -0.24 * b)); }
    for (let i = 0; i < 5; i++) T.add(box(0.5 * b, 0.12, 0.3, plate, 0, -0.1, -0.3 - i * 0.25)); // the tail segments trailing behind
    setWeapon(r, H, 0.2, 0.9);
  } },
  // the Glass Hierophant: white and silver robes, a smooth mirror where his face was, a glass crozier
  hierophant: { weapon: true, build(r) {
    const mirror = new THREE.MeshLambertMaterial({ color: 0xe0e8ff, emissive: 0x40465a, flatShading: true }), silver = r.m(0xc8c8d8), glass = new THREE.MeshLambertMaterial({ color: 0xb090ff, emissive: 0x4020a0, flatShading: true });
    const H = r.j.head; H.add(box(0.28, 0.34, 0.28, mirror, 0, 0.18, 0));
    for (let i = 0; i < 5; i++) { const c = cone(0.03, 0.2, glass, 4); c.position.set(-0.12 + i * 0.06, 0.42, -0.04); H.add(c); }
    const g = new THREE.Group(); r.j.handR.add(g); g.add(box(0.05, 0.05, 1.8, silver, 0, 0, 0.5)); const crook = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 4, 10, Math.PI), glass); crook.position.z = 1.45; crook.rotation.y = Math.PI / 2; g.add(crook);
    setWeapon(r, g, 0.1, 1.5);
  } },
  // the Kilnfather: a giant of molten rock under a shell of half-cooled glass (the shell shatters off), light moving in
  // him, the long iron blowpipe
  kilnfather: { weapon: true, build(r) {
    const { bulk: b } = r.dims;
    const glass = new THREE.MeshLambertMaterial({ color: 0x5ab8d8, emissive: 0x103040, flatShading: true, transparent: true, opacity: 0.8 }), core = new THREE.MeshBasicMaterial({ color: 0xff4a10 }), iron = r.m(0x3a3a3e), H = r.j.head, T = r.j.torso;
    r.core = core.color;
    T.add(box(0.36 * b, 0.5, 0.26, core, 0, 0.36, 0)); H.add(box(0.24, 0.26, 0.24, core, 0, 0.16, 0));
    const shell = [];
    const add = (parent, o) => { parent.add(o); shell.push(o); };
    add(T, box(0.64 * b, 0.64, 0.42, glass, 0, 0.36, 0)); add(H, box(0.34, 0.36, 0.34, glass, 0, 0.18, 0));
    for (const A of [r.j.armL, r.j.armR]) add(A, box(0.22, 0.4, 0.22, glass, 0, -0.18, 0));
    for (let i = 0; i < 6; i++) add(T, cone(0.07, 0.3, glass, 4).translateX(-0.25 + i * 0.1).translateY(0.75).translateZ(-0.15));
    r.shellParts = shell;
    const g = new THREE.Group(); r.j.handR.add(g); g.add(box(0.06, 0.06, 2.6, iron, 0, 0, 0.8)); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), core); bulb.position.z = 2.1; g.add(bulb);
    setWeapon(r, g, 0.1, 2.1);
  } },
  // a mirror-pillar: a tall slab of mirror in a silver frame
  mirrorpillar: { weapon: true, build(r) {
    stripBody(r);
    const g = new THREE.Group(); g.position.y = -r.hipH; r.body.add(g);
    const mirror = new THREE.MeshLambertMaterial({ color: 0xe0e8ff, emissive: 0x30344a, flatShading: true }), silver = r.m(0x9a9ab0);
    g.add(box(1.2, 0.3, 0.8, silver, 0, 0.15, 0)); g.add(box(0.9, 3.4, 0.3, silver, 0, 1.9, 0)); g.add(box(0.76, 3.2, 0.32, mirror, 0, 1.9, 0)); g.add(cone(0.4, 0.6, silver, 4).translateY(3.9));
    r.base.position.set(0, 1, 0); g.add(r.base); r.tip.position.set(0, 3, 0); g.add(r.tip);
  } },
  // a glass pillar: blown glass gone hard, glowing at its heart
  kilnpillar: { weapon: true, build(r) {
    stripBody(r);
    const g = new THREE.Group(); g.position.y = -r.hipH; r.body.add(g);
    const glass = new THREE.MeshLambertMaterial({ color: 0x5ab8d8, emissive: 0x104050, flatShading: true }), heart = basic(0xff8a3a);
    g.add(cyl(0.55, 0.7, 2.6, glass, 7).translateY(1.3)); g.add(box(0.25, 0.8, 0.25, heart, 0, 1.2, 0)); g.add(cone(0.5, 0.8, glass, 7).translateY(2.9));
    r.base.position.set(0, 1, 0); g.add(r.base); r.tip.position.set(0, 2.5, 0); g.add(r.tip);
  } },
});

// =====================================================================================================
// the mini bosses' arenas (city.js buildArena lays the ring; deep.js calls this for the Sunless Deep's)
// =====================================================================================================
export function dressDeepArena(w, bossId, A, enc) {
  const M = w.mats, lit = () => !(enc.boss?.snuffT > 0); // (the Lamp-King's snuff puts these out)
  const around = (r, n, a0 = 0) => Array.from({ length: n }, (_, k) => { const a = a0 + k / n * Math.PI * 2; return { x: A.x + Math.cos(a) * r, z: A.z + Math.sin(a) * r, a }; });
  if (bossId === 'lampking') {
    // the undercroft: braziers all round that his snuff puts out, lamps hung on chains, ore heaps, the dead
    for (const p of around(A.r - 1.2, 7, 0.3)) if (Math.abs(p.a - Math.PI / 2) > 0.4) w.brazier(p.x, p.z, { cond: lit, power: 12 });
    for (const p of around(A.r + 1.5, 10)) { w.box(0.06, 3, 0.06, M.metal, p.x, 4.5, p.z); w.box(0.3, 0.4, 0.3, M.glowAmber, p.x, 2.9, p.z); }
    for (const p of around(A.r + 2.6, 6, 0.5)) w.rock(p.x, p.z, 1.1, true, true);
  } else if (bossId === 'borer') {
    // her nest: holes bored in the floor, egg sacs and bones round the edge, glowing fungus
    for (const p of around(A.r - 2, 5, 0.6)) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.2, 10), new THREE.MeshBasicMaterial({ color: 0x050505 })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.03, p.z); m.userData.noMerge = true; w.add(m); }
    for (const p of around(A.r + 1.2, 9)) { const egg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), new THREE.MeshLambertMaterial({ color: 0xd8ccb0, emissive: 0x2a3a14, flatShading: true })); egg.position.set(p.x, 0.4, p.z); egg.scale.y = 1.3; w.add(egg); }
    for (const p of around(A.r - 0.5, 6, 0.2)) w.flora.push({ kind: 'shroom', x: p.x, z: p.z, color: 'teal', n: 6, r: 0.7, power: 4 });
    for (const p of around(A.r - 1.5, 4, 1)) w.torch(p.x, p.z, 0x9af0a0);
  } else if (bossId === 'hierophant') {
    // the hall of mirrors: five mirror-pillars (his doors: break them), crystal round the edge, cold light
    for (const p of around(A.r - 3.2, 5, 0.31)) w.spawn('mirrorpillar', p.x, p.z, Math.atan2(A.x - p.x, A.z - p.z), { effigy: true });
    for (const p of around(A.r + 0.8, 8, 0.2)) w.flora.push({ kind: 'crystal', x: p.x, z: p.z, color: p.a % 2 < 1 ? 'violet' : 'cyan', n: 6, r: 0.7, power: 5 });
    for (const p of around(A.r - 1, 4, 0.8)) w.brazier(p.x, p.z, { power: 10, color: 0xa080ff, cold: true });
  }
}
