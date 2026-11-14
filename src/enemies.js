import { NUM } from './scale.js';
import { addedElems } from './damage.js';
import { comboHold, tickHold, HOLD_BURST } from './hold.js';
import * as THREE from 'three';
import { Actor, angDiff } from './actor.js';
import { buildHumanoid } from './models.js';
import { locomotion, P } from './anims.js';
import { Trail } from './fx.js';
import { StatusState } from './status.js';
import { tierStats, TIER_EYES, partyScale } from './progress.js';

let UID = 1;

const glint = (red) => (e, g) => {
  const p = e.rig.tip.getWorldPosition(new THREE.Vector3());
  g.fx.burst(p, red ? 14 : 8, red ? [1, 0.15, 0.1] : [1, 1, 0.85], 2.5, 0.35, red ? 0.5 : 0.35);
  if (red) g.audio.play('clang', 0.25);
};

// ---------- move sets ----------
const SWORD_WIND = { torso: [0.05, -0.6, 0], armR: [-2.5, 0, -0.75], foreR: [-0.35, 0, 0], handR: [1.1, 0, 0], legL: [-0.25, 0, 0], legR: [0.2, 0, 0] };
const SWORD_STRIKE = { torso: [0.3, 0.6, 0], armR: [-1.05, 0, 0.8], foreR: [-0.1, 0, 0], handR: [1.25, 0, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], shinR: [0.4, 0, 0], by: -0.1 };
const BACK_WIND = { torso: [0.15, 0.75, 0], armR: [-1.45, 0, 1.05], foreR: [-0.25, 0, 0], handR: [1.4, 0, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0] };
const BACK_STRIKE = { torso: [0.22, -0.65, 0], armR: [-1.45, 0, -1.25], foreR: [0, 0, 0], handR: [1.45, 0, 0], legL: [0.3, 0, 0], legR: [-0.45, 0, 0], by: -0.1 };
const OVER_WIND = { torso: [-0.25, -0.1, 0], armR: [-3.0, 0, -0.2], foreR: [-0.6, 0, 0], handR: [1.0, 0, 0], armL: [-2.4, 0, 0.3], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.2 };
const OVER_STRIKE = { torso: [0.6, 0, 0], armR: [-0.95, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.0, 0, 0.1], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], shinL: [0.45, 0, 0], shinR: [0.5, 0, 0], by: -0.28 };

const GRUNT_MOVES = {
  slash: {
    parry: true, dur: 1.25, range: 2.0, track: [0.5, 5], sfx: [0.55, 'swing'], trail: [0.54, 0.7], recover: 0.35,
    keys: [[0.5, SWORD_WIND], [0.66, SWORD_STRIKE], [0.95, SWORD_STRIKE]],
    hits: [{ t0: 0.57, t1: 0.68, range: 2.1, arc: 2.2, dmg: 18, poise: 20 }],
    move: [[0.42, 0.66, 0.9]], stopAt: 1.0,
  },
  double: {
    parry: true, dur: 1.7, range: 2.0, track: [0.5, 5], sfx: [0.52, 'swing'], trail: [0.52, 1.02], recover: 0.4,
    keys: [[0.48, SWORD_WIND], [0.63, SWORD_STRIKE], [0.86, BACK_WIND], [1.0, BACK_STRIKE], [1.3, BACK_STRIKE]],
    hits: [{ t0: 0.54, t1: 0.65, range: 2.1, arc: 2.2, dmg: 16, poise: 18 }, { t0: 0.9, t1: 1.01, range: 2.1, arc: 2.4, dmg: 16, poise: 18 }],
    move: [[0.4, 0.63, 0.8], [0.8, 0.98, 0.7]], stopAt: 1.0,
    onTime: [{ t: 0.8, fn: (e, g) => { if (e.target) e.yaw += angDiff(e.yaw, e.yawTo(e.target.pos)) * 0.6; } }],
  },
  leap: {
    dur: 1.55, range: 4.8, minRange: 2.6, track: [0.62, 4], sfx: [0.62, 'heavySwing'], trail: [0.7, 0.92], recover: 0.5,
    keys: [[0.55, OVER_WIND], [0.8, { ...OVER_WIND, by: 0.25, legL: [-0.8, 0, 0], shinL: [1.0, 0, 0] }], [0.9, OVER_STRIKE], [1.25, OVER_STRIKE]],
    hits: [{ t0: 0.84, t1: 0.94, range: 2.1, arc: 1.4, dmg: 24, poise: 30 }],
    move: [[0.6, 0.88, 2.66]], stopAt: 1.1,
    onTime: [{ t: 0.9, fn: (e, g) => g.fx.dust(e.pos, 6, 1.2) }],
  },
};

const SPEAR_WIND = { torso: [0.1, -0.45, 0], armR: [0.4, 0, -0.3], foreR: [-1.6, 0, 0], handR: [1.25, 0, 0], armL: [-0.8, 0, 0.1], foreL: [-0.6, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0], shinR: [0.4, 0, 0], by: -0.1 };
const SPEAR_STRIKE = { torso: [0.35, 0.25, 0], armR: [-1.5, 0, 0], foreR: [0, 0, 0], handR: [1.45, 0, 0], armL: [-1.2, 0, 0], legL: [-0.7, 0, 0], legR: [0.55, 0, 0], shinR: [0.5, 0, 0], by: -0.18 };

// spear jabs telegraph: a red glint runs up the spear, then a long, deep pull-back before the lunge
const SPEAR_PULL = { torso: [0.05, -0.7, 0], armR: [0.7, 0, -0.35], foreR: [-1.8, 0, 0], handR: [1.2, 0, 0], armL: [-0.6, 0, 0.15], foreL: [-0.5, 0, 0], legL: [-0.45, 0, 0], legR: [0.4, 0, 0], shinR: [0.5, 0, 0], by: -0.16 };
const spearAlert = (e, g) => {
  const r = e.rig, a = new THREE.Vector3(), b = new THREE.Vector3();
  if (!r.base || !r.tip) return;
  r.base.getWorldPosition(a); r.tip.getWorldPosition(b);
  for (let i = 0; i <= 5; i++) {
    const q = a.clone().lerp(b, 0.3 + i * 0.14);
    g.fx.add.spawn({ x: q.x, y: q.y, z: q.z, life: 0.45, size: i === 5 ? 0.4 : 0.18, size1: 0.05, r: 1, g: 0.12, b: 0.08, alpha: 1 });
  }
  r.flash(1, 0.15, 0.1);
  g.audio.play('swing', 0.25);
};

const SPEAR_MOVES = {
  thrust: {
    parry: true, dur: 1.4, range: 3.3, track: [0.7, 4.5], sfx: [0.72, 'swing'], trail: [0.72, 0.88], recover: 0.35,
    keys: [[0.35, SPEAR_WIND], [0.72, SPEAR_PULL], [0.84, SPEAR_STRIKE], [1.15, SPEAR_STRIKE]],
    hits: [{ t0: 0.76, t1: 0.88, range: 3.4, arc: 0.6, dmg: 17, poise: 18 }],
    move: [[0.67, 0.84, 0.7]], stopAt: 2.0,
    onTime: [{ t: 0.3, fn: spearAlert }],
  },
  double: {
    dur: 1.85, range: 3.3, track: [0.7, 4.5], sfx: [0.72, 'swing'], trail: [0.72, 1.27], recover: 0.4,
    keys: [[0.35, SPEAR_WIND], [0.7, SPEAR_PULL], [0.85, SPEAR_STRIKE], [1.07, SPEAR_WIND], [1.21, SPEAR_STRIKE], [1.5, SPEAR_STRIKE]],
    hits: [{ t0: 0.77, t1: 0.88, range: 3.4, arc: 0.6, dmg: 14, poise: 16 }, { t0: 1.13, t1: 1.24, range: 3.5, arc: 0.6, dmg: 16, poise: 16 }],
    move: [[0.67, 0.85, 0.5], [1.1, 1.21, 0.6]], stopAt: 2.0,
    onTime: [{ t: 0.3, fn: spearAlert }, { t: 1.0, fn: (e) => { if (e.target) e.yaw += angDiff(e.yaw, e.yawTo(e.target.pos)) * 0.7; } }],
  },
  sweep: {
    parry: true, dur: 1.1, range: 2.2, maxRange: 2.2, track: [0.4, 6], sfx: [0.42, 'swing'], trail: [0.42, 0.58], recover: 0.3,
    keys: [[0.4, { torso: [0.2, -0.9, 0], armR: [-1.3, 0, -1.3], foreR: [0, 0, 0], handR: [1.5, 0, 0], by: -0.2, legL: [-0.4, 0, 0], legR: [0.4, 0, 0] }],
      [0.55, { torso: [0.3, 0.9, 0], armR: [-1.3, 0, 1.2], foreR: [0, 0, 0], handR: [1.5, 0, 0], by: -0.25, legL: [-0.4, 0, 0], legR: [0.4, 0, 0] }]],
    hits: [{ t0: 0.44, t1: 0.57, range: 2.9, arc: 2.8, dmg: 13, poise: 14, knockback: 8 }],
  },
};

const ARCHER_MOVES = {
  shoot: {
    dur: 1.55, range: 17, minRange: 3, track: [0.95, 3.2], recover: 0.4, ranged: true,
    keys: [
      [0.3, { armL: [-1.55, 0, 0.1], foreL: [0, 0, 0], armR: [-1.5, 0, -0.1], foreR: [-0.6, 0, 0], handR: [1.6, 0, 0], torso: [0, 0.9, 0], head: [0, -0.8, 0], hips: [0, 0, 0] }],
      [0.95, { armL: [-1.57, 0, 0.1], foreL: [0, 0, 0], armR: [-1.55, 0, -0.4], foreR: [-2.3, 0, 0], handR: [2.2, 0, 0], torso: [0, 1.0, 0], head: [0, -0.95, 0] }],
      [1.08, { armL: [-1.57, 0, 0.1], foreL: [0, 0, 0], armR: [-1.4, 0, -1.0], foreR: [-0.8, 0, 0], handR: [1.6, 0, 0], torso: [0, 1.0, 0], head: [0, -0.95, 0] }],
      [1.4, { armL: [-1.2, 0, 0.1], armR: [-0.5, 0, -0.4], torso: [0, 0.5, 0], head: [0, -0.4, 0] }],
    ],
    onTime: [
      { t: 0.65, fn: (e, g) => g.audio.play('bow', 0.5) },
      { t: 1.0, fn: (e, g) => { if (e.rig.arrow) e.rig.arrow.visible = false; g.spawnArrow(e); } },
      { t: 1.4, fn: (e) => { if (e.rig.arrow) e.rig.arrow.visible = true; } },
    ],
  },
  bash: {
    parry: true, dur: 1.0, range: 1.7, maxRange: 2.2, track: [0.35, 6], sfx: [0.38, 'swing'], recover: 0.3,
    keys: [[0.35, { armL: [-1.0, 0, 1.2], foreL: [-0.3, 0, 0], torso: [0, 0.6, 0] }], [0.48, { armL: [-1.4, 0, -0.5], foreL: [0, 0, 0], torso: [0.2, -0.5, 0], ...{ legL: [-0.5, 0, 0], legR: [0.4, 0, 0] } }]],
    hits: [{ t0: 0.4, t1: 0.5, range: 1.8, arc: 2.0, dmg: 9, poise: 10, knockback: 9 }],
  },
};

const BRUTE_MOVES = {
  slam: {
    dur: 2.15, range: 3.4, track: [0.85, 2.4], sfx: [1.0, 'heavySwing'], trail: [1.0, 1.18], recover: 0.5, armor: true, unparryable: true,
    keys: [
      [0.85, { torso: [-0.35, 0, 0], armR: [-3.0, 0, -0.25], foreR: [-0.6, 0, 0], handR: [0.8, 0, 0], armL: [-2.8, 0, 0.25], foreL: [-0.6, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: 0.05 }],
      [1.0, { torso: [-0.4, 0, 0], armR: [-3.1, 0, -0.25], foreR: [-0.7, 0, 0], handR: [0.8, 0, 0], armL: [-2.9, 0, 0.25], foreL: [-0.7, 0, 0], by: 0.05 }],
      [1.14, { torso: [0.8, 0, 0], armR: [-0.7, 0, 0.1], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-0.8, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.35 }],
      [1.75, { torso: [0.75, 0, 0], armR: [-0.7, 0, 0.1], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-0.8, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.35 }],
    ],
    hits: [{ t0: 1.1, t1: 1.2, shape: 'circle', offset: 2.6, radius: 1.8, dmg: 36, poise: 60, knock: 'heavy' }],
    move: [[0.9, 1.12, 0.8]],
    onTime: [
      { t: 0.25, fn: glint(true) },
      { t: 1.14, fn: (e, g) => { const f = e.fwd(); g.impact(e.pos.x + f.x * 2.6, e.pos.z + f.z * 2.6, 3.2, 0.55); } },
    ],
  },
  sweep: {
    dur: 1.75, range: 3.2, track: [0.75, 2.8], sfx: [0.8, 'heavySwing'], trail: [0.8, 1.0], recover: 0.45, armor: true,
    keys: [
      [0.75, { torso: [0.15, -1.0, 0], armR: [-1.4, 0, -1.4], foreR: [0, 0, 0], handR: [1.5, 0, 0], legL: [-0.4, 0, 0], legR: [0.4, 0, 0], by: -0.15 }],
      [0.98, { torso: [0.3, 1.0, 0], armR: [-1.4, 0, 1.25], foreR: [0, 0, 0], handR: [1.5, 0, 0], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], by: -0.2 }],
      [1.4, { torso: [0.25, 0.9, 0], armR: [-1.1, 0, 1.0], foreR: [-0.2, 0, 0], handR: [1.3, 0, 0], by: -0.15 }],
    ],
    hits: [{ t0: 0.82, t1: 0.98, range: 3.3, arc: 2.9, dmg: 26, poise: 40, knockback: 10 }],
    move: [[0.7, 0.95, 0.6]],
    onTime: [{ t: 0.15, fn: glint(false) }],
  },
  stomp: {
    dur: 1.25, range: 2.8, track: [0.1, 1], sfx: [0.6, 'slam'], recover: 0.35, armor: true, unparryable: true, rear: true,
    keys: [
      [0.5, { legL: [-1.3, 0, 0.1], shinL: [1.2, 0, 0], torso: [-0.25, 0, 0], armL: [-0.5, 0, 0.8], armR: [-0.3, 0, -0.8], by: 0.12 }],
      [0.62, { legL: [-0.3, 0, 0.1], shinL: [0.2, 0, 0], torso: [0.3, 0, 0], armL: [-0.2, 0, 0.5], armR: [-0.2, 0, -0.5], by: -0.25 }],
    ],
    hits: [{ t0: 0.6, t1: 0.68, shape: 'circle', offset: 0, radius: 2.5, dmg: 14, poise: 40, knock: 'heavy' }],
    onTime: [
      { t: 0.1, fn: (e, g) => { e.tele = g.fx.telegraph(e.pos.x, e.pos.z, 2.5 * 1, 0.55); } },
      { t: 0.62, fn: (e, g) => g.impact(e.pos.x, e.pos.z, 2.8, 0.4) },
    ],
  },
};

export const TYPES = {
  grunt: {
    hp: 140, poise: 15, scale: 1, radius: 0.45, run: 3.7, walk: 1.7, aggro: 11, prefer: 1.7, style: 'sword', turn: 7,
    cd: [0.6, 1.6], moves: GRUNT_MOVES, weights: { slash: 3, double: 2, leap: 1.5 },
    model: { cloth: 0x3a3a32, armor: 0x4a4a50, skin: 0x7a6e66, head: 'bare', weapon: 'rusty', eyes: 0xff3a24, kit: 'grunt' }, // (a Zealot)
  },
  spear: {
    hp: 120, poise: 15, scale: 1, radius: 0.45, run: 3.5, walk: 1.8, aggro: 11, prefer: 2.9, style: 'spear', turn: 6,
    cd: [0.8, 1.8], moves: SPEAR_MOVES, weights: { thrust: 3, double: 2, sweep: 2 }, backoff: 1.7,
    model: { cloth: 0x2e2a2a, armor: 0x55565c, skin: 0x7a6e66, head: 'cap', weapon: 'spear', eyes: 0xff3a24, kit: 'spear' }, // (a Pike Zealot)
  },
  archer: {
    hp: 46, poise: 10, scale: 1, radius: 0.42, run: 3.3, walk: 2.2, aggro: 16, prefer: 9, style: 'bow', turn: 6,
    cd: [1.2, 2.4], moves: ARCHER_MOVES, weights: { shoot: 1, bash: 1 }, ranged: true, backoff: 5,
    model: { cloth: 0x34342c, armor: 0x3e3e36, skin: 0x7a6e66, head: 'hood', weapon: 'bow', accent: 0x3e3e36, eyes: 0x9ad06a, kit: 'archer' }, // (a Needle Gunner)
  },
  // a cursed effigy at an altar seal: it never moves or fights, it just has to be broken
  effigy: {
    hp: 150, poise: 999, scale: 1.15, radius: 0.55, run: 0, walk: 0, aggro: 0, prefer: 0, style: 'sword', turn: 0, still: true,
    cd: [99, 99], moves: {}, weights: {}, superArmor: true,
    model: { cloth: 0x1e1c1e, armor: 0x3a3a40, skin: 0x5a544e, head: 'horned', eyes: 0xff3a2a, bulk: 1.1, kit: 'effigy' }, // (a Heretic Idol)
  },
  brute: {
    hp: 280, poise: 80, scale: 1.45, radius: 0.75, run: 2.9, walk: 1.5, aggro: 12, prefer: 2.4, style: 'club', turn: 2.6,
    cd: [0.9, 1.9], moves: BRUTE_MOVES, weights: { slam: 2, sweep: 3, stomp: 3 }, superArmor: true,
    model: { cloth: 0x2e2c2a, armor: 0x5a5c62, skin: 0x6a6460, head: 'helm', weapon: 'club', bulk: 1.35, eyes: 0xff3a24, pauldrons: true, kit: 'brute' }, // (a War Servitor)
  },
};

// Elites lead the packs guarding seals: bigger, tougher, glowing in their trait's colour, with one trait.
// frenzied: faster everything; armoured: takes a third less damage and hard to stagger; blazing: fire on every hit
// and a heat aura that burns anyone close (main.js)
export const NIGHT = { hp: 1.4, dmg: 1.3, spd: 1.2, gap: 0.7, aggro: 1.3, watch: 5 };

export const ELITE = {
  frenzied: { color: 0xff3a2a, rgb: [1, 0.25, 0.15], name: 'Frenzied' },
  armoured: { color: 0x9ab8d8, rgb: [0.6, 0.75, 0.9], name: 'Armoured' },
  blazing: { color: 0xff8a1a, rgb: [1, 0.55, 0.1], name: 'Blazing' },
};

for (const T of Object.values(TYPES)) T.hp *= NUM; // (see scale.js)

export class Enemy extends Actor {
  constructor(game, type, x, z, yaw = 0, opts = {}) {
    const T = TYPES[type], E = ELITE[opts.elite], G = opts.big ? TYPES.brute : null; // big: a regular enemy at a War Servitor's size and toughness
    // tier = mini bosses passed before this module
    const heavy = type === 'brute' || !!T.heavy; // (a War Servitor, or another area's heavy: foes.js)
    const tier = opts.tier || 0, ts = tierStats(tier, opts.players || 1), party = partyScale(opts.players || 1, heavy);
    const rig = buildHumanoid({ ...T.model, ...(opts.look?.[type] || {}), scale: (G ? G.scale : T.scale) * (E ? 1.2 : 1), eyes: E ? E.color : TIER_EYES[tier] ?? T.model.eyes, eyeGlow: E ? 0xffffff : tier >= 3 ? 0xff1a10 : null });
    super(game, rig, { x, z, yaw, hp: Math.round((G || T).hp * ts.hp * party.hp * (E ? 2.6 : 1)), radius: (G || T).radius * (E ? 1.15 : 1), poise: (G || T).poise * (E ? 2 : 1) });
    this.tier = tier; this.dmgScale = ts.dmg * party.dmg; this.spdScale = ts.spd * party.spd;
    this.atkScale = ts.atk * party.atk; this.gapScale = party.gap; this.moves = T.moves;
    if (E) {
      this.elite = opts.elite; this.dmgScale *= 1.25;
      if (opts.elite === 'frenzied') { this.atkScale *= 1.3; this.spdScale *= 1.25; this.gapScale *= 0.6; }
      if (opts.elite === 'armoured') { this.dmgTaken = 0.65; this.maxPoise = this.poise = this.maxPoise * 1.5; }
      // a glowing ring under its feet
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.86, 24), new THREE.MeshBasicMaterial({ color: E.color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; rig.root.add(ring); this.auraRing = ring;
    }
    if (G) { this.big = true; this.dmgScale *= 1.3; }
    this.event = !!opts.event; this.reserve = !!opts.reserve; this.effigy = !!T.still;
    if (this.reserve) rig.root.visible = false; // waits off stage until its seal's event calls it in
    // Night Raid: tougher, harder hitting, faster, quicker to notice you and to attack; watchers step in every 5 s
    this.night = !!opts.night; this.aggroMul = 1;
    if (this.night && !this.effigy) {
      this.maxHp = this.hp = Math.round(this.maxHp * NIGHT.hp); this.dmgScale *= NIGHT.dmg; this.spdScale *= NIGHT.spd;
      this.gapScale *= NIGHT.gap; this.aggroMul = NIGHT.aggro;
    }
    this.uid = 'E' + UID++;
    this.mod = opts.mod ?? null;
    this.heavy = heavy;
    this.status = new StatusState(this, heavy ? 180 : 100);
    if (heavy && !this.moves.holdBurst) this.moves.holdBurst = HOLD_BURST; // breaks out of a combo lock
    this.type = type;
    this.T = T;
    this.home = { x, z, yaw };
    this.sitting = !!opts.sit;
    this.patrol = opts.patrol || null;
    this.cd = 0.5;
    this.token = false;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.phase = Math.random() * 6;
    this.speed = 0;
    this.trackMul = 1;
    this.trail = new Trail(game.scene, heavy ? 0xffb080 : 0xffe0c0, 12, 0.4);
    this.hpShow = 0;
    this.lastMove = null;
    this.flinches = []; this.armorT = 0; this.urgent = false; this.atkSpeed = 1;
    this.engaged = false; this.engagedTo = null; this.watchCd = this.watchGap(); this.lastHitBy = {};
    this.setState(this.sitting ? 'sit' : 'idle');
  }

  get target() { return this.game.targetOf(this); }
  // how long an enemy waiting its turn holds back before stepping in for one attack
  watchGap() { return this.night ? NIGHT.watch : 10 + Math.random() * 5; }

  critable() { return this.state === 'parried'; }
  attackRate() { return (this.atkSpeed || 1) * this.status.slow() * this.atkScale * (this.T.rate?.(this) ?? 1); }

  // elemental damage this enemy carries (a share of each hit, taken out of the physical): { fire: 0.25 } or null.
  // Its weapon shows the element(s), like a player's.
  setElems(elems) {
    if (this.T.elems) { const o = { ...(elems || {}) }; for (const [k, v] of Object.entries(this.T.elems)) o[k] = Math.max(o[k] || 0, v); elems = addedElems(o); } // (its own, always)
    if (this.elite === 'blazing') elems = addedElems({ ...(elems || {}), fire: Math.max(elems?.fire || 0, 0.3) }); // fire on every hit
    if (this.effigy) elems = null;
    this.elems = elems; this.elemBuild = 1;
    this.wfxKey = elems ? ['bleed', 'fire', 'frost', 'poison'].filter((k) => elems[k]).join('+') : '';
  }

  alert() {
    if (this.T.still) return;
    if (this.state !== 'idle' && this.state !== 'sit' && this.state !== 'return') return;
    this.setState('alert');
    for (const o of this.game.enemies) {
      if (o !== this && o.alive && o.mod === this.mod && (o.state === 'idle' || o.state === 'sit') && this.distTo(o) < 6) {
        o.alertDelay = 0.2 + Math.random() * 0.5;
      }
    }
  }

  releaseToken() { if (this.token) { this.token = false; this.game.tokens--; } }

  chooseMove(dist, behind) {
    const opts = [];
    for (const [name, w] of Object.entries(this.T.weights)) {
      const m = this.T.moves[name];
      if (dist > m.range + 0.4) continue;
      if (m.minRange && dist < m.minRange) continue;
      if (m.maxRange && dist > m.maxRange) continue;
      if (m.rear && !behind) continue;
      let ww = w;
      if (behind && m.rear) ww *= 4;
      if (name === this.lastMove) ww *= 0.4;
      opts.push([name, ww]);
    }
    if (!opts.length) return null;
    let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
    for (const [n, w] of opts) { if ((r -= w) <= 0) return n; }
    return opts[0][0];
  }

  // a raid's city has walls between you and them: which way to go to get to `to` (null: straight there). Asked a
  // few times a second, not every frame
  path(to) {
    const D = this.game.world.dungeon;
    if (!D?.steer) return null;
    if (this.game.time - (this.pathAt ?? -9) > 0.15 || Math.hypot(to.x - (this.pathTo?.x ?? 1e9), to.z - (this.pathTo?.z ?? 1e9)) > 2) {
      this.pathAt = this.game.time; this.pathTo = { x: to.x, z: to.z };
      this.pathDir = D.steer(this, to.x, to.z);
    }
    return this.pathDir;
  }

  update(dt) {
    if (this.T.still) return this.stillUpdate(dt);
    if (this.elite && this.alive && Math.random() < dt * 14) {
      const c = ELITE[this.elite].rgb;
      this.game.fx.add.spawn({ x: this.pos.x + (Math.random() - 0.5) * 0.9, y: 0.2 + Math.random() * 1.8, z: this.pos.z + (Math.random() - 0.5) * 0.9, vy: 1 + Math.random(), life: 0.7, size: 0.16, size1: 0.02, r: c[0], g: c[1], b: c[2] });
    }
    if (this.puppet) return this.puppetUpdate(dt, this.T.style);
    this.t += dt;
    this.status.update(dt, this.game);
    tickHold(this, dt);
    const p = this.game.targetOf(this);
    const unseen = p.veilT > 0 || p.veiled; // (Ghost Veil: they lose you)
    const dist = this.distTo(p);
    const toP = this.yawTo(p.pos);
    const T = this.T;
    let pose = null, rate = 12;
    this.hpShow -= dt;
    if (this.alertDelay !== undefined) { this.alertDelay -= dt; if (this.alertDelay <= 0) { this.alertDelay = undefined; this.alert(); } }

    switch (this.state) {
      case 'sit':
      case 'idle': {
        if (this.state === 'sit') pose = P.rest;
        else {
          let s = 0;
          if (this.patrol) {
            const tgt = this.patrolIdx ? this.patrol : this.home;
            const d = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
            if (d < 0.4) { this.patrolWait = (this.patrolWait || 0) + dt; if (this.patrolWait > 2.5) { this.patrolWait = 0; this.patrolIdx = !this.patrolIdx; } }
            else {
              const y = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
              this.turnToward(y, 3, dt);
              const f = this.fwd(); this.move(f.x * T.walk * dt, f.z * T.walk * dt); s = T.walk / 4;
            }
          }
          this.phase += dt * (2 + s * 6);
          pose = locomotion(T.style, this.phase, s, false, this.game.time + this.phase);
        }
        const sense = (this.state === 'sit' ? T.aggro * 0.6 : T.aggro) * this.aggroMul;
        if (p.alive && !unseen && dist < sense && this.game.sameRoom(this, p)) this.alert();
        break;
      }
      case 'alert': {
        this.turnToward(toP, 8, dt);
        pose = { ...locomotion(T.style, 0, 0, false, 0), head: [-0.3, 0, 0], torso: [-0.15, 0, 0], armL: [-0.5, 0, 0.7], by: this.t < 0.25 ? -0.1 : 0 };
        rate = this.t < 0.3 ? 6 : 10;
        if (this.t > 0.55) { this.setState('chase'); this.cd = 0.3 + Math.random() * 0.6; }
        break;
      }
      case 'chase': {
        if (!p.alive || unseen || !this.game.sameRoom(this, p)) { this.setState('return'); break; }
        if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 30 && dist > 8) { this.setState('return'); break; }
        if (T.think?.(this, dt, p, dist)) break; // (its own trick: an Augur's blink)
        this.cd -= dt;
        const behind = Math.abs(angDiff(this.yaw, toP)) > 1.4;
        if (this.urgent && (this.urgentT -= dt) <= 0) this.urgent = false;
        // Only the enemy engaged with a player fights freely; the others watch and
        // step in for one attack every 10-15s. `urgent` = quicker counter after being hit.
        this.watchCd -= dt;
        if (this.cd <= 0 && (this.engaged || this.watchCd <= 0)) {
          let m = this.chooseMove(dist, behind);
          if (m && T.moves[m].range > 4 && !this.game.world.lineClear(this.pos.x, this.pos.z, p.pos.x, p.pos.z)) m = null; // (a shot needs a clear line)
          if (m) {
            if (!this.engaged) this.watchCd = this.watchGap();
            this.atkSpeed = this.urgent ? 1.3 : 1;
            this.urgent = false;
            this.lastMove = m;
            this.trackMul = this.atkSpeed;
            this.startAttack(T.moves[m]);
            break;
          }
        }
        // spacing
        let mx = 0, mz = 0, sp = 0;
        const dx = (p.pos.x - this.pos.x) / (dist || 1), dz = (p.pos.z - this.pos.z) / (dist || 1);
        // watchers hover just out of reach, drifting in and out
        const waiting = !this.engaged && this.watchCd > 0;
        const want = waiting ? Math.max(T.prefer, 4.6 + Math.sin(this.game.time * 0.8 + this.netId * 1.7) * 0.9) : T.prefer;
        const around = this.path(p.pos); // (a raid's city: a wall between you, so go round it first)
        if (around) { mx = around.x; mz = around.z; sp = T.run * 0.85; }
        else if (T.backoff && dist < T.backoff) { mx = -dx; mz = -dz; sp = T.walk * 1.2; }
        else if (dist > want + 0.6) { mx = dx; mz = dz; sp = dist > want + 4 ? T.run : T.run * 0.7; }
        else {
          this.strafeT -= dt;
          if (this.strafeT <= 0) { this.strafeT = 1.2 + Math.random() * 1.8; this.strafeDir = Math.random() < 0.5 ? -1 : 1; }
          mx = -dz * this.strafeDir; mz = dx * this.strafeDir;
          if (dist < want - 0.6) { mx -= dx * 0.8; mz -= dz * 0.8; }
          sp = T.walk;
        }
        // separation from other enemies
        for (const o of this.game.enemies) {
          if (o === this || !o.alive) continue;
          const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, od = Math.hypot(ox, oz);
          if (od < 2.2 && od > 0.01) { mx += ox / od * (2.2 - od) * 0.8; mz += oz / od * (2.2 - od) * 0.8; }
        }
        const ml = Math.hypot(mx, mz);
        sp *= this.status.slow() * this.spdScale;
        if (ml > 0.01) this.move(mx / ml * sp * dt, mz / ml * sp * dt);
        this.speed += (sp - this.speed) * Math.min(1, dt * 8);
        this.turnToward(toP, T.turn, dt);
        this.phase += dt * (2.5 + this.speed * 1.6);
        pose = locomotion(T.style, this.phase, this.speed / 4, false, this.game.time);
        if (waiting) { pose.armR = [-0.85, 0, -0.35]; pose.foreR = [-0.75, 0, 0]; pose.torso[0] += 0.15; pose.by -= 0.06; } // weapon up, ready
        break;
      }
      case 'attack': {
        const d = this.atk.def;
        const going = this.runAttack(dt * this.attackRate(), this.game.allPlayers(), p.alive ? toP : null);
        if (this.state !== 'attack') { pose = locomotion(T.style, 0, 0, false, 0); break; }
        pose = this.attackPose(locomotion(T.style, this.phase, 0, false, 0), 22);
        rate = 22;
        this.trailOn = this.inWindow(d.trail);
        if (!going) {
          this.releaseToken();
          this.setState('recover');
          this.recoverT = d.recover ?? 0.3;
          this.cd = (T.cd[0] + Math.random() * (T.cd[1] - T.cd[0])) * this.gapScale;
          if (this.tele) { this.tele.dead = true; this.tele = null; }
        }
        break;
      }
      case 'recover': {
        pose = locomotion(T.style, this.phase, 0, false, this.game.time);
        if (this.t > 0.15) this.turnToward(toP, T.turn * 0.5, dt);
        if (this.t >= this.recoverT) this.setState('chase');
        break;
      }
      case 'held': {
        // held by a combo: reeling in place, can't act
        pose = { ...locomotion(T.style, 0, 0, false, 0), ...P.stagger, torso: [0.25 + Math.sin(this.t * 9) * 0.06, Math.sin(this.t * 5) * 0.1, 0] };
        rate = 18;
        break;
      }
      case 'hurt': {
        pose = { ...locomotion(T.style, 0, 0, false, 0), ...P.hurt };
        rate = 20;
        if (this.t > (this.hurtDur || 0.4)) { this.setState('chase'); this.counter(); }
        break;
      }
      case 'parried': {
        pose = { ...locomotion(T.style, 0, 0, false, 0), ...P.stagger };
        rate = 16;
        if (this.t > 1.7) this.setState('chase');
        break;
      }
      case 'riposted': {
        const ra = this.ripAt ?? 0.55;
        pose = this.t < ra ? { ...locomotion(T.style, 0, 0, false, 0), ...P.stagger } : (this.hp > 0 ? P.knockdown : P.dead);
        rate = this.t < ra ? 14 : 9;
        if (this.t > ra && this.hp <= 0 && this.alive) this.die();
        if (this.t > ra + 1.45 && this.alive) this.setState('chase');
        break;
      }
      case 'dead': {
        pose = P.dead; rate = 8;
        if (this.t > 2.5) this.rig.root.position.y = -(this.t - 2.5) * 0.6;
        if (this.t > 4.5) this.rig.root.visible = false;
        break;
      }
      case 'return': {
        const d = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
        const pw = d > 0.5 ? this.path(this.home) : null; // (round a wall on the way back)
        const y = pw ? Math.atan2(pw.x, pw.z) : Math.atan2(this.home.x - this.pos.x, this.home.z - this.pos.z);
        this.turnToward(y, pw ? 10 : 6, dt);
        if (d > 0.5) { const f = this.fwd(); this.move(f.x * T.run * dt, f.z * T.run * dt); }
        this.phase += dt * 8;
        pose = locomotion(T.style, this.phase, d > 0.5 ? 0.9 : 0, false, this.game.time);
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * dt * 0.3);
        if (d <= 0.5) { this.setState(this.sitting ? 'sit' : 'idle'); this.yaw = this.home.yaw; }
        if (p.alive && !unseen && dist < T.aggro * 0.7 * this.aggroMul && this.t > 1.0 && this.game.sameRoom(this, p)) this.setState('chase');
        break;
      }
    }
    if (this.state !== 'attack') this.trailOn = false;
    if (this.armorT > 0) {
      this.armorT -= dt;
      if (Math.random() < dt * 25) this.game.fx.ember({ x: this.pos.x, y: 0.3 + Math.random() * 1.6 * this.T.scale, z: this.pos.z }, 0.8, 1.2);
    }
    if (this.state !== 'dead') this.regenPoise(dt);
    this.applyKnockback(dt);
    if (pose && this.state !== 'dead') this.syncRig(dt, pose, rate);
    else if (pose) { this.rig.apply(pose, dt, rate); }
    this.trail.update(dt, this.trailOn, this.rig.base, this.rig.tip);
  }

  // an effigy: stands with its arms spread, shuddering when struck, and crumbles when broken
  stillUpdate(dt) {
    this.t += dt; this.hpShow -= dt;
    if (!this.puppet) this.status.update(dt, this.game);
    if (this.state === 'dead') {
      if (this.t > 1.2) this.rig.root.position.y = -(this.t - 1.2) * 0.8;
      if (this.t > 3) this.rig.root.visible = false;
      this.rig.apply(P.dead, dt, 6);
      return;
    }
    const shake = this.rig.flashT > 0 ? Math.sin(this.game.time * 60) * 0.08 : 0;
    const pose = { ...locomotion('sword', 0, 0, false, 0), armL: [0, 0, 1.45], armR: [0, 0, -1.45], foreL: [0, 0, 0.3], foreR: [0, 0, -0.3], head: [0.35 + shake, 0, 0.2], torso: [0.1, shake, 0], by: 0.3 };
    this.syncRig(dt, pose, 10);
    if (Math.random() < dt * 6) this.game.fx.add.spawn({ x: this.pos.x + (Math.random() - 0.5) * 0.6, y: 1.9, z: this.pos.z + (Math.random() - 0.5) * 0.6, vy: 0.8, life: 0.8, size: 0.14, size1: 0.02, r: 1, g: 0.2, b: 0.15 });
  }

  // returns 'hit' etc. Called by game.resolveHit
  receive(info) {
    if (info.attacker) this.lastHitBy = info.attacker;
    if (!this.alive) return 'none';
    if (this.puppet) return this.puppetHit(info);
    if (this.dmgTaken) info = { ...info, dmg: info.dmg * this.dmgTaken };
    if (this.T.onReceive) info = this.T.onReceive(this, info); // (a Castellan's shield)
    if (this.T.still) {
      this.hp -= info.dmg; this.hpShow = 4; this.rig.flash(1, 0.4, 0.3);
      if (this.hp <= 0) { this.die(); this.game.pfx?.play('poof', this.pos.clone().setY(0.6), { size: 1.4 }); return 'kill'; }
      return 'hit';
    }
    if (info.attacker?.uid) this.lastHitBy[info.attacker.uid] = this.game.time; // hitting a watcher makes it your fight
    this.hp -= info.dmg;
    this.hpShow = 4;
    this.rig.flash(1, 0.9, 0.8);
    if (this.state === 'idle' || this.state === 'sit' || this.state === 'return') { this.alert(); }
    if (this.hp <= 0) { this.die(); return 'kill'; }
    if (info.combo && comboHold(this)) return 'held'; // a combo caught it while weak
    this.poise -= info.poise || 0;
    this.poiseT = 2.0;
    const armored = this.armorT > 0 || (this.state === 'attack' && (this.atk.def.armor || this.T.superArmor || this.big));
    const now = this.game.time;
    this.flinches = this.flinches.filter((t) => now - t < 3);
    if (this.poise <= 0 && (this.armorT > 0 || this.flinches.length >= 2)) {
      // stun-lock breaker: third flinch in 3s -> shrug it off, armor up and counter fast
      this.poise = this.maxPoise;
      if (!(this.armorT > 0)) {
        this.armorT = 1.6;
        this.game.fx.burst({ x: this.pos.x, y: 1.2 * this.T.scale, z: this.pos.z }, 18, [1, 0.5, 0.15], 4, 0.5, 0.3);
        this.game.audio.play('clang', 0.5);
      }
      if (this.state !== 'attack') { if (this.state === 'hurt') this.setState('chase'); this.counter(0); }
      return 'hit';
    }
    if (this.poise <= 0) {
      this.flinches.push(now);
      this.poise = this.maxPoise;
      if (this.state === 'attack') { this.releaseToken(); if (this.tele) { this.tele.dead = true; this.tele = null; } }
      this.atk = null;
      this.setState('hurt');
      this.hurtDur = this.heavy ? 1.1 : 0.45;
      const away = new THREE.Vector3(this.pos.x - info.srcPos.x, 0, this.pos.z - info.srcPos.z).normalize();
      if (!info.noKnock) this.kb.copy(away).multiplyScalar(this.heavy ? 3 : 5);
      return 'stagger';
    }
    if (this.state === 'chase' || this.state === 'recover') this.counter(0.15);
    if (!armored && this.state !== 'attack' && !info.noKnock) {
      // small flinch without full stagger
      const away = new THREE.Vector3(this.pos.x - info.srcPos.x, 0, this.pos.z - info.srcPos.z).normalize();
      this.kb.copy(away).multiplyScalar(2);
    }
    return 'hit';
  }

  endHold() { this.setState('chase'); this.counter(0.2); }

  // queue a quick retaliation (used after flinching / being hit)
  counter(delay = 0) {
    this.urgent = true; this.urgentT = 2;
    this.cd = Math.min(this.cd, delay);
    if (this.state === 'recover') this.setState('chase');
  }

  onParried() {
    if (this.puppet) { this.game.mp.send({ t: 'parried', id: this.netId }); this.state = 'parried'; this.t = 0; this.atk = null; return; }
    this.releaseToken();
    this.atk = null;
    if (this.tele) { this.tele.dead = true; this.tele = null; }
    this.setState('parried');
  }

  // hitAt: seconds until the crit lands (each character's crit has its own timing)
  beginRiposted(p, hitAt = 0.32) {
    if (this.puppet) this.game.mp.send({ t: 'riposted', id: this.netId, at: hitAt });
    this.setState('riposted'); this.atk = null; this.ripAt = Math.max(0.55, hitAt + 0.2);
  }

  // the dust poof where an enemy falls; plays on every screen (puppets call it from the host's snapshot)
  deathFx(sound = true) {
    this.game.pfx?.play('poof', this.pos.clone().setY(0.2), { size: this.T.scale || 1 });
    this.game.fx.dust(this.pos, 8, 0.9);
    if (sound) this.game.audio.remote('enemyDie');
  }

  die(silent) {
    if (this.alive) this.game.onEnemyKilled(this);
    this.alive = false;
    this.hp = 0;
    this.releaseToken();
    if (this.tele) { this.tele.dead = true; this.tele = null; }
    this.atk = null;
    this.setState('dead');
    this.game.audio.play('enemyDie');
    if (!silent) this.deathFx(false);
    if (this.game.player.lock === this) this.game.player.lock = null;
  }

  reset() {
    this.alive = true; this.hp = this.maxHp; this.poise = this.maxPoise;
    this.pos.set(this.home.x, 0, this.home.z); this.yaw = this.home.yaw;
    this.kb.set(0, 0, 0); this.atk = null; this.token = false; this.cd = 0.5; this.hpShow = 0;
    this.rig.root.visible = true; this.rig.root.position.y = 0;
    this.alertDelay = undefined; this.patrolIdx = false;
    this.flinches = []; this.armorT = 0; this.urgent = false; this.atkSpeed = 1;
    this.engaged = false; this.engagedTo = null; this.watchCd = this.watchGap(); this.lastHitBy = {};
    this.status.reset();
    this.setState(this.sitting ? 'sit' : 'idle');
  }
}
