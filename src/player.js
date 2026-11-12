import { NUM } from './scale.js';
import * as THREE from 'three';
import { Actor, angDiff, clamp } from './actor.js';
import { buildHumanoid } from './models.js';
import { outfitModel } from './playerkits.js';
import { weaponElems, mitigate, enemyParts } from './damage.js';
import { StatusState } from './status.js';
import { locomotion, P, sample } from './anims.js';
import { Trail } from './fx.js';
import { comboMoves, comboTree, COMBO_WINDOW, FAST, TAIL } from './combos.js';

// ---------- move sets ----------
// Attack def fields: dur, keys [[t,pose]], hits [{t0,t1,range,arc,dmg,poise}], move [[t0,t1,dist]],
// combo [t0,t1] (buffered light chains to `next`), cancel (roll allowed after), cost, trail [t0,t1],
// track: time until which the player may still steer, armor [t0,t1] hyper-armor.

const lunge = (l = 1) => ({ legL: [-0.5 * l, 0, 0.05], legR: [0.4 * l, 0, -0.05], shinL: [0.2, 0, 0], shinR: [0.45 * l, 0, 0], by: -0.1 * l });

const KNIGHT_ATTACKS = {
  k1: {
    dur: 0.62, cost: 16, next: 'k2', combo: [0.27, 0.62], cancel: 0.32, track: 0.13, trail: [0.12, 0.27], sfx: [0.12, 'swing'],
    keys: [
      [0.13, { torso: [0.05, -0.6, 0], armR: [-2.5, 0, -0.75], foreR: [-0.3, 0, 0], handR: [1.1, 0, 0], legL: [-0.2, 0, 0], legR: [0.2, 0, 0] }],
      [0.24, { torso: [0.28, 0.6, 0], armR: [-1.05, 0, 0.8], foreR: [-0.1, 0, 0], handR: [1.25, 0, 0], ...lunge(1.1) }],
      [0.45, { torso: [0.2, 0.45, 0], armR: [-0.9, 0, 0.55], foreR: [-0.35, 0, 0], handR: [1.0, 0, 0], ...lunge(0.9) }],
    ],
    hits: [{ t0: 0.15, t1: 0.25, range: 2.35, arc: 2.5, dmg: 22, poise: 15 }],
    move: [[0.08, 0.25, 0.75]],
  },
  k2: {
    dur: 0.62, cost: 16, next: 'k3', combo: [0.26, 0.62], cancel: 0.31, track: 0.12, trail: [0.11, 0.26], sfx: [0.11, 'swing'],
    keys: [
      [0.12, { torso: [0.15, 0.75, 0], armR: [-1.45, 0, 1.05], foreR: [-0.25, 0, 0], handR: [1.4, 0, 0], ...lunge(0.8) }],
      [0.23, { torso: [0.22, -0.65, 0], armR: [-1.45, 0, -1.25], foreR: [0, 0, 0], handR: [1.45, 0, 0], legL: [0.3, 0, 0], legR: [-0.45, 0, 0], shinL: [0.35, 0, 0], by: -0.12 }],
      [0.45, { torso: [0.15, -0.5, 0], armR: [-1.25, 0, -0.95], foreR: [-0.25, 0, 0], handR: [1.3, 0, 0], legL: [0.25, 0, 0], legR: [-0.35, 0, 0], by: -0.08 }],
    ],
    hits: [{ t0: 0.13, t1: 0.24, range: 2.35, arc: 2.6, dmg: 23, poise: 15 }],
    move: [[0.06, 0.24, 0.7]],
  },
  k3: {
    dur: 0.88, cost: 25, next: 'k1', combo: [0.45, 0.88], cancel: 0.48, track: 0.24, trail: [0.25, 0.4], sfx: [0.26, 'heavySwing'],
    keys: [
      [0.27, { torso: [-0.25, -0.15, 0], armR: [-3.0, 0, -0.15], foreR: [-0.55, 0, 0], handR: [1.0, 0, 0], armL: [-2.6, 0, 0.25], foreL: [-0.6, 0, 0], legL: [-0.35, 0, 0], legR: [0.15, 0, 0], by: 0.02 }],
      [0.38, { torso: [0.6, 0, 0], armR: [-0.95, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.1, 0, 0.1], foreL: [-0.2, 0, 0], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], shinL: [0.45, 0, 0], shinR: [0.5, 0, 0], by: -0.28 }],
      [0.62, { torso: [0.45, 0, 0], armR: [-0.8, 0, 0.05], foreR: [-0.2, 0, 0], handR: [1.2, 0, 0], armL: [-0.7, 0, 0.1], legL: [-0.65, 0, 0], legR: [0.45, 0, 0], shinL: [0.35, 0, 0], shinR: [0.45, 0, 0], by: -0.22 }],
    ],
    hits: [{ t0: 0.28, t1: 0.39, range: 2.6, arc: 1.5, dmg: 34, poise: 25 }],
    move: [[0.18, 0.38, 1.1]],
    onHitShake: 0.35,
  },
  heavy: {
    dur: 1.1, cost: 34, next: 'k2', combo: [0.72, 1.1], cancel: 0.72, track: 0.42, trail: [0.42, 0.58], sfx: [0.42, 'heavySwing'], armor: [0.25, 0.58],
    keys: [
      [0.42, { torso: [-0.35, -0.35, 0], armR: [-3.1, 0, -0.3], foreR: [-0.95, 0, 0], handR: [0.6, 0, 0], armL: [-2.2, 0, 0.3], foreL: [-0.8, 0, 0], legL: [-0.5, 0, 0], legR: [0.35, 0, 0], shinR: [0.5, 0, 0], by: -0.2 }],
      [0.55, { torso: [0.75, 0.1, 0], armR: [-0.8, 0, 0.1], foreR: [0, 0, 0], handR: [1.35, 0, 0], armL: [-0.9, 0, 0.1], legL: [-0.85, 0, 0], legR: [0.65, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.38 }],
      [0.85, { torso: [0.6, 0.1, 0], armR: [-0.7, 0, 0.1], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], shinL: [0.45, 0, 0], shinR: [0.55, 0, 0], by: -0.32 }],
    ],
    hits: [{ t0: 0.44, t1: 0.57, range: 2.7, arc: 1.6, dmg: 52, poise: 37 }],
    move: [[0.3, 0.55, 1.5]],
    onHitShake: 0.5, heavyHit: true,
  },
  // evolved: right after a shield charge, a leaping overhead
  chargeSlam: {
    dur: 1.0, cost: 16, next: 'k2', combo: [0.7, 1.0], cancel: 0.72, track: 0.3, trail: [0.36, 0.52], sfx: [0.36, 'heavySwing'], armor: [0, 0.5],
    keys: [
      [0.2, { torso: [-0.35, 0, 0], armR: [-3.0, 0, -0.15], foreR: [-0.5, 0, 0], handR: [1.0, 0, 0], armL: [-2.5, 0, 0.2], foreL: [-0.5, 0, 0], legL: [-1.1, 0, 0], shinL: [1.6, 0, 0], legR: [-0.2, 0, 0], shinR: [1.4, 0, 0] }],
      [0.44, { torso: [0.7, 0, 0], armR: [-0.9, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.0, 0, 0.1], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.3 }],
      [0.75, { torso: [0.5, 0, 0], armR: [-0.9, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], ...lunge(1), by: -0.2 }],
    ],
    hits: [{ t0: 0.42, t1: 0.52, range: 2.7, arc: 1.8, dmg: 40, poise: 29 }],
    move: [[0.05, 0.42, 2.2]],
    jump: [0.04, 0.43, 1.6],
    onTime: [{ t: 0.43, fn: (p, g) => {
      // ground pound: cracks and a dust wave, a ring along the floor (on every screen)
      g.vfx('groundPound', p.pos.clone().addScaledVector(p.fwd(), 0.9).setY(0));
      g.hitstop(0.06);
    } }],
    onHitShake: 0.5, heavyHit: true,
  },
  // right after a block: a quick forehand then backhand (21 + 21)
  guardCounter: {
    dur: 0.8, cost: 21, next: 'k2', combo: [0.48, 0.8], cancel: 0.5, track: 0.16, trail: [0.1, 0.36], sfx: [0.1, 'swing'], armor: [0, 0.34],
    keys: [
      [0.1, { torso: [0.1, -0.9, 0], armR: [-1.5, 0, -1.4], foreR: [-0.1, 0, 0], handR: [1.45, 0, 0], guard: 0.6, legL: [-0.3, 0, 0], legR: [0.3, 0, 0] }],
      [0.2, { torso: [0.3, 0.75, 0], armR: [-1.5, 0, 1.0], foreR: [0, 0, 0], handR: [1.45, 0, 0], guard: 0.4, ...lunge(1.0) }],
      [0.34, { torso: [0.3, -0.8, 0], armR: [-1.45, 0, -1.3], foreR: [0, 0, 0], handR: [1.45, 0, 0], ...lunge(1.2) }],
      [0.58, { torso: [0.2, -0.6, 0], armR: [-1.2, 0, -0.9], foreR: [-0.3, 0, 0], handR: [1.2, 0, 0], ...lunge(1) }],
    ],
    hits: [
      { t0: 0.12, t1: 0.2, range: 2.6, arc: 2.8, dmg: 21, poise: 14 },
      { t0: 0.26, t1: 0.34, range: 2.6, arc: 2.8, dmg: 21, poise: 14 },
    ],
    onTime: [{ t: 0.24, sfx: 'heavySwing', fn: (p, g) => g.audio.play('heavySwing', 0.9) }],
    move: [[0.1, 0.3, 1.2]],
    onHitShake: 0.5, heavyHit: true,
  },
};

const ROGUE_ATTACKS = {
  r1: {
    dur: 0.42, cost: 11, next: 'r2', combo: [0.15, 0.42], cancel: 0.18, track: 0.08, trail: [0.06, 0.18], hand: 'R', sfx: [0.06, 'swing'],
    keys: [
      [0.08, { torso: [0.12, -0.55, 0], armR: [-1.6, 0, -1.15], foreR: [-0.3, 0, 0], handR: [1.35, 0, 0], armL: [-0.4, 0, 0.3], foreL: [-1.2, 0, 0] }],
      [0.16, { torso: [0.25, 0.5, 0], armR: [-1.5, 0, 0.75], foreR: [-0.1, 0, 0], handR: [1.45, 0, 0], ...lunge(0.9) }],
      [0.3, { torso: [0.22, 0.4, 0], armR: [-1.3, 0, 0.55], foreR: [-0.3, 0, 0], handR: [1.3, 0, 0], ...lunge(0.8) }],
    ],
    hits: [{ t0: 0.08, t1: 0.17, range: 1.95, arc: 2.3, dmg: 16, poise: 6 }],
    move: [[0.03, 0.16, 0.55]],
  },
  r2: {
    dur: 0.42, cost: 11, next: 'r3', combo: [0.15, 0.42], cancel: 0.18, track: 0.08, trail: [0.06, 0.18], hand: 'L', sfx: [0.06, 'swing'],
    keys: [
      [0.08, { torso: [0.12, 0.55, 0], armL: [-1.6, 0, 1.15], foreL: [-0.3, 0, 0], handL: [1.35, 0, 0], armR: [-0.4, 0, -0.3], foreR: [-1.2, 0, 0], handR: [0.6, 0, 0] }],
      [0.16, { torso: [0.25, -0.5, 0], armL: [-1.5, 0, -0.75], foreL: [-0.1, 0, 0], handL: [1.45, 0, 0], legL: [0.4, 0, 0], legR: [-0.5, 0, 0], shinL: [0.45, 0, 0], by: -0.1 }],
      [0.3, { torso: [0.22, -0.4, 0], armL: [-1.3, 0, -0.55], foreL: [-0.3, 0, 0], handL: [1.3, 0, 0], legL: [0.3, 0, 0], legR: [-0.4, 0, 0], by: -0.08 }],
    ],
    hits: [{ t0: 0.08, t1: 0.17, range: 1.95, arc: 2.3, dmg: 16, poise: 6 }],
    move: [[0.03, 0.16, 0.55]],
  },
  r3: {
    dur: 0.48, cost: 12, next: 'r4', combo: [0.2, 0.48], cancel: 0.22, track: 0.1, trail: [0.09, 0.2], hand: 'R', sfx: [0.09, 'swing'],
    keys: [
      [0.1, { torso: [0.1, -0.45, 0], armR: [-0.3, 0, -0.2], foreR: [-1.75, 0, 0], handR: [1.6, 0, 0], armL: [-0.6, 0, 0.3], foreL: [-1.0, 0, 0] }],
      [0.18, { torso: [0.35, 0.3, 0], armR: [-1.55, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], ...lunge(1.3) }],
      [0.34, { torso: [0.3, 0.25, 0], armR: [-1.4, 0, 0], foreR: [-0.2, 0, 0], handR: [1.4, 0, 0], ...lunge(1.1) }],
    ],
    hits: [{ t0: 0.11, t1: 0.2, range: 2.25, arc: 1.1, dmg: 19, poise: 7 }],
    move: [[0.05, 0.19, 0.9]],
  },
  r4: {
    dur: 0.66, cost: 14, next: 'r1', combo: [0.4, 0.66], cancel: 0.4, track: 0.1, trail: [0.1, 0.36], hand: 'B', sfx: [0.1, 'swing'],
    keys: [
      [0.1, { hips: [0, -1.1, 0], torso: [0.15, -0.3, 0], armR: [-1.5, 0, -1.3], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.5, 0, 1.3], foreL: [0, 0, 0], handL: [1.5, 0, 0], by: -0.15 }],
      [0.22, { hips: [0, 0.9, 0], torso: [0.15, 0.3, 0], armR: [-1.5, 0, -1.3], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.5, 0, 1.3], foreL: [0, 0, 0], handL: [1.5, 0, 0], by: -0.12 }],
      [0.34, { hips: [0, 2.2, 0], torso: [0.2, 0.4, 0], armR: [-1.5, 0, -1.2], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.5, 0, 1.2], foreL: [0, 0, 0], handL: [1.5, 0, 0], by: -0.15 }],
      [0.5, { hips: [0, 0.3, 0], torso: [0.2, 0, 0], armR: [-0.8, 0, -0.6], armL: [-0.8, 0, 0.6], ...lunge(0.6) }],
    ],
    hits: [
      { t0: 0.12, t1: 0.21, range: 2.1, arc: 3.4, dmg: 13, poise: 6 },
      { t0: 0.25, t1: 0.34, range: 2.1, arc: 3.4, dmg: 18, poise: 8 },
    ],
    move: [[0.08, 0.3, 0.7]],
  },
  heavy: {
    dur: 0.86, cost: 26, next: 'r2', combo: [0.55, 0.86], cancel: 0.55, track: 0.28, trail: [0.3, 0.44], hand: 'B', sfx: [0.3, 'heavySwing'],
    keys: [
      [0.28, { torso: [0.45, 0, 0], armR: [0.35, 0, -0.35], foreR: [-1.75, 0, 0], handR: [1.4, 0, 0], armL: [0.35, 0, 0.35], foreL: [-1.75, 0, 0], handL: [1.4, 0, 0], legL: [-0.6, 0, 0], legR: [0.3, 0, 0], shinL: [0.6, 0, 0], shinR: [0.9, 0, 0], by: -0.3 }],
      [0.4, { torso: [0.5, 0, 0], armR: [-1.55, 0, 0.08], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.55, 0, -0.08], foreL: [0, 0, 0], handL: [1.5, 0, 0], legL: [-0.95, 0, 0], legR: [0.75, 0, 0], shinL: [0.3, 0, 0], shinR: [0.5, 0, 0], by: -0.25 }],
      [0.62, { torso: [0.4, 0, 0], armR: [-1.3, 0, 0], foreR: [-0.2, 0, 0], handR: [1.4, 0, 0], armL: [-1.3, 0, 0], foreL: [-0.2, 0, 0], handL: [1.4, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], shinR: [0.5, 0, 0], by: -0.2 }],
    ],
    hits: [{ t0: 0.32, t1: 0.44, range: 2.1, arc: 1.3, dmg: 38, poise: 23 }],
    move: [[0.27, 0.42, 3.2]], stopAt: 1.2,
    onHitShake: 0.35,
  },
};

// Spellsword melee: off-hand knife only. Swap sides of a right-handed attack.
const SWAP = { armL: 'armR', armR: 'armL', foreL: 'foreR', foreR: 'foreL', handL: 'handR', handR: 'handL', legL: 'legR', legR: 'legL', shinL: 'shinR', shinR: 'shinL' };
const mirrorPose = (pose) => Object.fromEntries(Object.entries(pose).map(([k, v]) => [SWAP[k] || k, Array.isArray(v) ? [v[0], -v[1], -v[2]] : v]));
const mirror = (def) => ({ ...def, keys: def.keys.map(([t, pose]) => [t, mirrorPose(pose)]) });

const MAGE_ATTACKS = {
  s1: { ...ROGUE_ATTACKS.r2, cost: 14, next: 's2', hand: 'L', hits: [{ t0: 0.08, t1: 0.17, range: 1.95, arc: 2.3, dmg: 11, poise: 7 }] },
  s2: { ...mirror(ROGUE_ATTACKS.r3), cost: 15, next: 's1', hand: 'L', hits: [{ t0: 0.11, t1: 0.2, range: 2.25, arc: 1.1, dmg: 14, poise: 8 }] },
};

const MANA_BOLT = 8, MANA_FIRE = 75;

export const CHARS = {
  knight: {
    hp: 150 * NUM, st: 75, walk: 4.3, sprint: 6.6, flasks: 4, style: 'sword',
    roll: { dur: 0.6, dist: 4.6, iframes: [0.03, 0.4], cost: 22 },
    attacks: KNIGHT_ATTACKS, light: 'k1', critDmg: 110, trail: 0xdfe8ff,
    model: { cloth: 0x2a2a30, armor: 0x7a7e86, accent: 0x6a1412, skin: 0xc49a7a, head: 'helm', weapon: 'sword', shield: true, tabard: true, pauldrons: true, bulk: 1.08, kit: 'knight' },
  },
  rogue: {
    hp: 105 * NUM, st: 85, walk: 4.8, sprint: 7.4, flasks: 4, style: 'daggers',
    roll: { dur: 0.5, dist: 4.9, iframes: [0.02, 0.4], cost: 16 },
    attacks: ROGUE_ATTACKS, light: 'r1', critDmg: 170, trail: 0xffd0a0, dual: true,
    model: { cloth: 0x2e2a28, armor: 0x4a3a2c, accent: 0x9a2a22, skin: 0xc49a7a, head: 'none', weapon: 'daggers', bulk: 0.95, kit: 'rogue' },
  },
};

CHARS.mage = {
  hp: 95 * NUM, st: 85, walk: 4.6, sprint: 7.0, flasks: 4, style: 'daggers', caster: true, dual: true,
  roll: { dur: 0.55, dist: 4.6, iframes: [0.03, 0.4], cost: 18 },
  attacks: MAGE_ATTACKS, light: 's1', critDmg: 130, trail: 0x8ab4ff, meleeRate: 0.8, // knife swings 20% slower
  model: { cloth: 0x2c3a66, armor: 0x7a86b0, accent: 0x4a7aff, skin: 0xd0a888, head: 'none', weapon: 'spellknife', bulk: 0.9, kit: 'mage' },
};

// each class's combo moves join its attacks (so teammates can play them too), and its combos as a tree of inputs
for (const k of Object.keys(CHARS)) { Object.assign(CHARS[k].attacks, comboMoves(k, CHARS[k].attacks)); CHARS[k].combos = comboTree(k, CHARS[k].attacks); }

// ---------- critical hits ----------
// One per character and situation (see critFor). Times are in crit time (rt = t * rate); `hitAt` is when the
// damage lands, `events` fire once at their time, `vanish` hides the body, `reverse` holds the right weapon in a
// reverse grip, `jump` lifts the body [t0, t1, height], `at` is where to stand relative to the victim.
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const CRITS = {
  // Knight: a flying knee into a downed enemy (least damage: he knocks enemies down the most)
  knee: {
    dur: 1.05, hitAt: 0.4, dmg: 110, at: 0.55, jump: [0.14, 0.7, 1.4], trail: [9, 9],
    keys: [
      [0.14, { torso: [0.4, 0, 0], head: [-0.2, 0, 0], armL: [-0.7, 0, 0.3], armR: [0.5, 0, -0.3], foreR: [-0.6, 0, 0], handR: [0.4, 0, 0], legL: [-0.6, 0, 0], legR: [0.45, 0, 0], shinL: [0.8, 0, 0], shinR: [0.9, 0, 0], by: -0.24 }],
      [0.3, { torso: [-0.25, 0, 0], head: [0.2, 0, 0], armL: [0.9, 0, 0.5], armR: [1.0, 0, -0.5], foreR: [-0.3, 0, 0], handR: [0.3, 0, 0], legR: [-2.0, 0, 0], shinR: [2.4, 0, 0], legL: [0.45, 0, 0], shinL: [1.0, 0, 0], by: 0.04 }],
      [0.42, { torso: [0.2, 0, 0], head: [0.1, 0, 0], armL: [1.1, 0, 0.6], armR: [1.2, 0, -0.6], foreR: [-0.3, 0, 0], handR: [0.3, 0, 0], legR: [-1.7, 0, 0], shinR: [2.3, 0, 0], legL: [0.3, 0, 0], shinL: [0.8, 0, 0], by: 0.02 }],
      [0.68, { torso: [0.45, 0, 0], armL: [-0.3, 0, 0.4], armR: [-0.3, 0, -0.4], foreR: [-0.6, 0, 0], legL: [-0.7, 0, 0], legR: [0.35, 0, 0], shinL: [1.0, 0, 0], shinR: [1.1, 0, 0], by: -0.3 }],
      [0.92, { torso: [0.1, 0, 0], armR: [-0.25, 0, -0.12], foreR: [-0.9, 0, 0], handR: [0.35, 0, 0], by: -0.04 }],
    ],
    events: [{ t: 0.4, fn: (p, tg, g, hp, dir) => {
      // the knee connects with the head: blood sprays up off it, a hit star and sparks
      const head = new THREE.Vector3(tg.pos.x, 1.75 * tg.rig.root.scale.y + (tg.y || 0), tg.pos.z);
      g.vfx('kneeImpact', head, dir.clone());
      g.hitstop(0.09);
    } }],
  },
  // Rogue after a parry: flip the dagger to a reverse grip, coil, plunge forward elbow first.
  // 48 = three light attacks (one-shots an archer, not a healthy swordsman); x2.3 on bosses
  stab: {
    dur: 1.0, hitAt: 0.34, dmg: 48, flatHits: 3, bossMul: 2.3, at: 0.9, reverse: [0.06, 0.82], trail: [0.22, 0.42],
    keys: [
      [0.16, { torso: [0.1, -0.75, -0.18], head: [0, 0.5, 0], armR: [-1.6, 0, -1.1], foreR: [-1.7, 0, 0], handR: [0.2, 0, 0], armL: [-0.5, 0, 0.5], foreL: [-1.2, 0, 0], legL: [-0.45, 0, 0], legR: [0.4, 0, 0], shinL: [0.3, 0, 0], shinR: [0.6, 0, 0], by: -0.16 }],
      [0.34, { torso: [0.55, 0.5, 0.25], head: [-0.3, -0.35, 0], armR: [-1.5, 0, 0.2], foreR: [-0.45, 0, 0], handR: [0.6, 0, 0], armL: [0.4, 0, 0.6], foreL: [-0.6, 0, 0], ...lunge(1.4), by: -0.22 }],
      [0.62, { torso: [0.5, 0.45, 0.2], head: [-0.3, -0.3, 0], armR: [-1.45, 0, 0.15], foreR: [-0.5, 0, 0], handR: [0.6, 0, 0], armL: [0.4, 0, 0.6], foreL: [-0.6, 0, 0], ...lunge(1.3) }],
      [0.86, { torso: [0.15, -0.2, 0], armR: [-0.6, 0, -0.5], foreR: [-0.9, 0, 0], handR: [0.8, 0, 0], legL: [0.2, 0, 0], legR: [-0.2, 0, 0] }],
    ],
  },
  // evolved Rogue: blinks behind the enemy in a flash of red and stabs it in the back (played fast)
  backstab: {
    dur: 1.0, hitAt: 0.34, dmg: 48, flatHits: 3, bossMul: 2.3, at: -0.85, reverse: [0, 0.82], trail: [0.22, 0.42], blink: true,
    keys: null, // the stab's keys
    events: [{ t: 0.34, fn: (p, tg, g, hp) => { g.vfx('redCrit', hp); g.ui.redFlash(); } }],
  },
  // Rogue on a downed enemy: wraps himself in a black shroud, vanishes, and a red slash tears through
  shroud: {
    dur: 1.3, hitAt: 0.56, dmg: 170, at: 0.9, vanish: [0.24, 0.5], through: 0.5, trail: [0.5, 0.6],
    keys: [
      [0.22, { torso: [0.45, 0, 0], head: [0.3, 0, 0], armL: [-1.3, 0, -0.9], foreL: [-1.0, 0, 0], armR: [-1.3, 0, 0.9], foreR: [-1.0, 0, 0], handR: [1.0, 0, 0], handL: [1.0, 0, 0], legL: [-0.5, 0, 0], legR: [0.5, 0, 0], shinL: [0.9, 0, 0], shinR: [0.9, 0, 0], by: -0.32 }],
      [0.5, { torso: [0.5, -0.35, 0], head: [-0.2, 0.3, 0], armR: [-0.2, 0, -1.5], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-1.5, 0, 0.7], foreL: [-0.2, 0, 0], handL: [1.4, 0, 0], ...lunge(1.4), by: -0.25 }],
      [0.95, { torso: [0.45, -0.3, 0], head: [-0.2, 0.3, 0], armR: [-0.25, 0, -1.4], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-1.4, 0, 0.6], foreL: [-0.2, 0, 0], handL: [1.4, 0, 0], ...lunge(1.2) }],
      [1.2, { torso: [0.12, 0, 0], armR: [-0.3, 0, -0.3], foreR: [-1.0, 0, 0], armL: [-0.3, 0, 0.3], foreL: [-1.0, 0, 0] }],
    ],
    events: [
      { t: 0.1, fn: (p, tg, g) => g.vfx('shroud', p.pos.clone().setY(0.1)) },
      { t: 0.5, fn: (p, tg, g, hp, dir) => g.vfx('redSlash', hp, dir.clone()) },
      { t: 0.56, fn: (p, tg, g, hp) => g.vfx('redCrit', hp) },
    ],
  },
  // Spellsword on a downed enemy: hops up, turns the rune blade point-down and drives it in; runes burst
  impale: {
    dur: 1.2, hitAt: 0.48, dmg: 130, at: 0.75, jump: [0.12, 0.46, 0.5], reverse: [0.08, 0.9], trail: [0.38, 0.52],
    keys: [
      [0.14, { torso: [-0.15, 0, 0], head: [-0.2, 0, 0], armR: [-2.9, 0, -0.15], foreR: [-0.4, 0, 0], handR: [0.4, 0, 0], armL: [-2.7, 0, 0.15], foreL: [-0.4, 0, 0], legL: [-0.4, 0, 0], legR: [0.2, 0, 0], shinL: [0.9, 0, 0], shinR: [0.6, 0, 0], by: -0.05 }],
      [0.48, { torso: [0.85, 0, 0], head: [0.3, 0, 0], armR: [-1.3, 0, -0.05], foreR: [-0.1, 0, 0], handR: [0.5, 0, 0], armL: [-1.1, 0, 0.1], foreL: [-0.2, 0, 0], legL: [-0.9, 0, 0], legR: [0.5, 0, 0], shinL: [1.2, 0, 0], shinR: [1.3, 0, 0], by: -0.42 }],
      [0.85, { torso: [0.8, 0, 0], head: [0.25, 0, 0], armR: [-1.3, 0, -0.05], foreR: [-0.1, 0, 0], handR: [0.5, 0, 0], armL: [-1.1, 0, 0.1], foreL: [-0.2, 0, 0], legL: [-0.9, 0, 0], legR: [0.5, 0, 0], shinL: [1.2, 0, 0], shinR: [1.3, 0, 0], by: -0.4 }],
      [1.12, { torso: [0.1, 0, 0], armR: [-0.3, 0, -0.2], foreR: [-0.9, 0, 0], handR: [0.5, 0, 0] }],
    ],
    events: [{ t: 0.48, fn: (p, tg, g, hp) => g.vfx('impale', tg.pos.clone().setY(0.02), hp) }],
  },
};
CRITS.backstab.keys = CRITS.stab.keys;
for (const [k, c] of Object.entries(CRITS)) c.name = k;
export const RIPOSTE = CRITS.stab; // the shape teammates' puppets fall back to

// which crit a character performs on this target
export function critFor(kind, tg, evolved) {
  if (kind === 'rogue') return tg.state === 'parried' ? (evolved ? CRITS.backstab : CRITS.stab) : CRITS.shroud;
  return kind === 'mage' ? CRITS.impale : CRITS.knee;
}

export const PARRY_CD = 8, PARRY_CD_EVO = 5; // rogue: seconds between parries (Red Riposte: 5)
export const CHARGE_CD = 20;   // evolved knight: seconds between shield charges

const PARRY = {
  dur: 0.56, cost: 14, trail: [0.03, 0.16], hand: 'L',
  keys: [
    [0.05, { torso: [0, 0.45, 0], armL: [-1.4, 0, 1.3], foreL: [-0.3, 0, 0], handL: [1.3, 0, 0], legL: [0.2, 0, 0], legR: [-0.2, 0, 0] }],
    [0.16, { torso: [0.1, -0.35, 0], armL: [-1.35, 0, -0.45], foreL: [-0.2, 0, 0], handL: [1.4, 0, 0], legL: [0.25, 0, 0], legR: [-0.25, 0, 0], by: -0.06 }],
    [0.36, { torso: [0.05, -0.25, 0], armL: [-1.0, 0, -0.2], foreL: [-0.6, 0, 0], handL: [1.0, 0, 0] }],
  ],
};

export class Player extends Actor {
  // `upgrades`: permanent upgrade levels from the player's account ({ dmg: 2, hp: 1, ... })
  constructor(game, kind, x, z, upgrades = {}) {
    const c = CHARS[kind];
    const outfit = game.equippedOutfit?.(kind) || {};
    const rig = buildHumanoid({ ...outfitModel(c.model, kind, outfit), scale: 1 });
    super(game, rig, { x, z, hp: c.hp, radius: 0.42, team: 'player', yaw: Math.PI, poise: 0 });
    this.outfit = outfit;
    // the knight's plates clink on every step (louder when sprinting)
    if (kind === 'knight') rig.onStep = (v) => game.audio.play('rattle', Math.min(1, v / 7));
    this.uid = 'P';
    this.kind = kind;
    this.c = c;
    this.maxSt = this.st = c.st;
    this.stDelay = 0;
    this.flasks = this.maxFlasks = c.flasks;
    this.vel = new THREE.Vector3();
    this.phase = 0;
    this.buf = null;
    this.blocking = false;
    this.blockHitT = 0;
    this.lock = null;
    this.speed = 0;
    this.sprinting = false;
    this.rollDir = new THREE.Vector3();
    this.trail = new Trail(game.scene, c.trail);
    if (c.dual) this.trailL = new Trail(game.scene, c.trail);
    this.healDone = false;
    this.stepT = 0;
    this.fatigue = 0; // 0..1, builds with consecutive attacks
    this.atkRate = 1;
    this.rollRate = 1; this.rollDist = 1;
    // run power-ups (see boons.js)
    this.dmgMul = 1; this.rollMul = 1; this.aspdMul = 1; this.moveMul = 1;
    this.statusLv = {};
    this.boonList = [];
    // `upgrades`: this character's summed skill-tree stats (skilltree.js treeStats)
    const T = (this.tree = upgrades || {}), pct = (k) => (T[k] || 0) / 100;
    this.aspdMul += pct('aspd') + (T.bladeDance ? 0.25 : 0); this.moveMul += pct('move'); // (Blade Dance: +25% attack speed)
    if (T.bladeDance) this.dmgMul *= 0.8; // ... and 20% less a hit
    this.flatDmg = T.physDmg || 0;
    // status effects build on players too (meters over the health bar)
    this.isPlayer = true;
    this.status = new StatusState(this, 100);
    this.maxHp = this.hp = Math.round((c.hp + (T.hp || 0)) * (1 + pct('hpPct')) * (T.stalwart ? 1.3 : 1) * (T.glassFang ? 0.75 : 1)); // Stalwart Vow +30%, Glass Fang −25%
    if (T.stalwart) this.dmgMul *= 0.85; // ... and 15% less damage
    this.maxSt = this.st = Math.round((c.st + (T.st || 0)) * (1 + pct('stPct')));
    this.flasks = this.maxFlasks = c.flasks + (T.flask || 0);
    this.potionMul = 1 + pct('potion');
    this.maxMana = this.mana = c.caster ? 100 + (T.mana || 0) : 0;
    this.evolved = !!T.evolved;
    this.ripRate = 1;
    if (kind === 'knight' && this.evolved) this.buildSpectralShield();
    this.fatigueT = 0;
    this.setState('move');
  }

  remove() { super.remove(); this.trailL?.dispose(this.game.scene); if (this.mark) this.game.scene.remove(this.mark); }

  // Evolved: the spectral shield the knight charges behind, 20% wider than his torso
  buildSpectralShield() {
    const torso = 0.46 * this.c.model.bulk;
    this.spectralWidth = torso * 1.2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(this.spectralWidth, 1.7, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(0, 1.05, 0.75); m.visible = false;
    this.rig.root.add(m);
    this.spectral = m;
  }

  // ---------- helpers ----------
  spend(n) { if (this.freeMove) return; this.st -= n; if (this.st < 0) this.st = 0; this.stDelay = 0.6; }
  // an empty bar blocks attacks, rolls and parries until it refills a little
  canSpend() { return this.st >= 1; }

  iframe() {
    if (this.state === 'roll') return this.inWindow([this.c.roll.iframes[0], this.c.roll.iframes[1] + (this.tree?.iframe || 0)], this.t);
    if (this.state === 'backstep') return this.t >= 0.02 && this.t <= 0.22;
    if (this.chargeArmored()) return true; // Shield Charge and its leaping overhead: untouchable
    return this.state === 'knockdown' || this.state === 'riposte' || this.state === 'rest' || this.state === 'dead';
  }

  hyperArmor() { return this.comboArmored() || (this.state === 'attack' && this.inWindow(this.atk.def.armor)); }
  // from a combo's second move on, hits hurt but can't stagger or knock the player out of it
  // the Knight's Shield Charge and its leaping overhead can't be broken or hurt: hits pass through him (iframe)
  chargeArmored() { return this.alive && (this.state === 'charge' || (this.state === 'attack' && this.atkKey === 'chargeSlam')); }
  comboArmored() { return this.armorSeq != null && this.armorSeq === this.stateSeq && this.alive; }
  setState(s) { super.setState(s); this.stateSeq = (this.stateSeq || 0) + 1; }

  worldDir(mv) { return new THREE.Vector3(mv.x, 0, -mv.y); }

  push(a) { this.buf = { a, t: 0.4 }; }

  // nearest enemy in a cone around `yaw` (used for attack aim assist + riposte)
  findTarget(range, cone, yaw = this.yaw, filter = null) {
    let best = null, bs = Infinity;
    for (const e of this.game.enemiesAll()) {
      if (!e.alive || (filter && !filter(e))) continue;
      const d = this.distTo(e) - e.radius;
      if (d > range) continue;
      const a = Math.abs(angDiff(yaw, this.yawTo(e.pos)));
      if (a > cone) continue;
      const s = d + a * 2;
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }

  // ---------- main update ----------
  update(dt, input, presses) {
    this.t += dt;
    // visual only: idle flourishes, rune glow
    this.rig.idle = this.state === 'move' && this.speed < 0.2;
    this.wfxKey = weaponElems(this.tree, this.statusLv); // elements showing on the weapon
    this.status.update(dt, this.game);
    if (this.c.caster) this.rig.setGlow(this.maxMana ? this.mana / this.maxMana : 0);
    if (this.atkLift && (this.state !== 'attack' || !this.atk?.def.jump)) { this.y = 0; this.atkLift = false; }
    // a crit that ended any other way (knocked out of it) gives the body back
    if (this.state !== 'riposte' && this.crit) {
      this.rig.reverse = false;
      if (this.ripHidden) { this.rig.root.visible = true; this.ripHidden = false; }
      if (this.ripLift) { this.y = 0; this.ripLift = false; }
    }
    this.parryCd = Math.max(0, (this.parryCd || 0) - dt);
    this.chargeCd = Math.max(0, (this.chargeCd || 0) - dt);
    if (this.state !== 'cast' && this.castDef?.charge) { this.game.pfx.kill(this.castDef.charge); this.castDef.charge = null; }
    const mv = input.move();
    const dir = this.worldDir(mv);
    const mag = Math.min(1, dir.length());
    this.comboTick();
    for (const a of presses) if (a !== 'lock' && a !== 'pause' && a !== 'interact' && !this.comboPress(a, dir, mag)) this.push(a);
    if (this.buf) { this.buf.t -= dt; if (this.buf.t <= 0) this.buf = null; }
    if (this.lock && (!this.lock.alive || this.distTo(this.lock) > 22)) this.lock = null;

    this.stDelay -= dt;
    this.fatigueT -= dt;
    if (this.fatigueT <= 0) this.fatigue = Math.max(0, this.fatigue - dt * 0.5);
    this.blockHitT -= dt;
    let pose = null, rate = 16;
    const style = this.c.style;

    switch (this.state) {
      case 'move': {
        if (this.tryAct(dir, mag)) break;
        this.blocking = this.kind === 'knight' && input.held.special;
        const wantSprint = input.sprintHeld() && mag > 0.3 && !this.blocking && this.st > 0.5 && !this.sprintLock;
        if (this.st <= 0.5) this.sprintLock = true;
        if (this.sprintLock && this.st > 10) this.sprintLock = false;
        this.sprinting = wantSprint;
        let sp = (this.sprinting ? this.c.sprint : this.c.walk) * mag;
        if (this.blocking) sp *= 0.5;
        sp *= (1 - 0.1 * this.fatigue) * this.moveMul * this.status.slow();
        if (this.sprinting) { this.st -= 14 * dt; this.stDelay = 0.4; }
        const tv = dir.clone().normalize().multiplyScalar(mag > 0.01 ? sp : 0);
        this.vel.lerp(tv, 1 - Math.exp(-14 * dt));
        this.move(this.vel.x * dt, this.vel.z * dt);
        this.speed = this.vel.length();
        if (this.lock && !this.sprinting) this.turnToward(this.yawTo(this.lock.pos), 12, dt);
        else if (mag > 0.05) this.turnToward(Math.atan2(dir.x, dir.z), 13, dt);
        this.phase += dt * (2.5 + this.speed * 1.6);
        const s = this.speed / this.c.walk;
        pose = locomotion(style, this.phase, s, this.sprinting, this.game.time);
        if (this.lock && !this.sprinting && this.speed > 0.3) {
          // strafing: swing legs sideways when moving perpendicular to facing
          const side = angDiff(this.yaw, Math.atan2(this.vel.x, this.vel.z));
          if (Math.abs(side) > 0.8 && Math.abs(side) < 2.3) { pose.hips = [0, -Math.sign(side) * 0.5, 0]; pose.torso[1] = Math.sign(side) * 0.5; }
        }
        if (this.blocking) Object.assign(pose, this.blockHitT > 0 ? P.blockHit : P.block, this.speed > 0.3 ? { legL: pose.legL, legR: pose.legR, shinL: pose.shinL, shinR: pose.shinR } : {});
        if (this.speed > 1 && (this.stepT -= dt) <= 0) { this.stepT = this.sprinting ? 0.28 : 0.38; if (this.sprinting) this.game.fx.dust(this.pos, 1, 0.3); }
        // holding the shield up drains stamina; regen resumes shortly after lowering it
        if (this.blocking) { this.st = Math.max(0, this.st - 10 * (1 - (this.tree.blockDrain || 0) / 100) * dt); this.stDelay = Math.max(this.stDelay, 0.4); }
        else this.regen(dt, 48);
        break;
      }
      case 'attack': {
        const d = this.atk.def;
        if (this.atk.t < (d.track ?? 0)) {
          if (this.lock) this.turnToward(this.yawTo(this.lock.pos), 20, dt);
          else if (mag > 0.2) this.turnToward(Math.atan2(dir.x, dir.z), 9, dt);
        }
        // fatigue makes each swing in a long string slower (down to ~70% speed)
        const going = this.runAttack(dt * this.atkRate, this.game.enemiesAll());
        const J = this.atk?.def.jump;
        if (J) { const t = this.atk.t; this.atkLift = true; this.y = t > J[0] && t < J[1] ? J[2] * Math.sin(Math.PI * (t - J[0]) / (J[1] - J[0])) : 0; }
        if (this.state !== 'attack' || !this.atk) { pose = this.basePose(); break; }
        const t = this.atk.t;
        pose = this.attackPose(this.basePose());
        rate = 28;
        this.trailOn = this.inWindow(d.trail);
        if (this.buf && (this.buf.a === 'attack' || this.buf.a === 'heavy') && d.combo && t >= d.combo[0]) {
          const b0 = this.buf, heavy = b0.a === 'heavy';
          this.buf = null;
          if (heavy && this.c.caster) { this.castBolt(dir, mag); break; }
          if (!this.canSpend()) { this.buf = b0; break; }
          if (!this.tryRiposte(dir, mag)) this.doAttack(heavy ? 'heavy' : (d.next || this.c.light), dir, mag);
          break;
        }
        if (this.buf && (this.buf.a === 'roll' || this.buf.a === 'heal' || this.buf.a === 'special') && t >= (d.cancel ?? d.dur)) {
          if (this.tryAct(dir, mag)) break;
        }
        if (!going) { this.setState('move'); this.vel.set(0, 0, 0); }
        break;
      }
      case 'roll': {
        const R = this.c.roll;
        // animation/movement run on scaled time (slow when exhausted); i-frames stay real-time
        const rt = this.t * this.rollRate, rdt = dt * this.rollRate;
        const u = rt / R.dur;
        const dist = R.dist * this.rollDist * this.rollMul;
        const e = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 2.2);
        const prev = e((rt - rdt) / (R.dur * 0.88)), now = e(rt / (R.dur * 0.88));
        this.move(this.rollDir.x * dist * (now - prev), this.rollDir.z * dist * (now - prev));
        pose = { ...locomotion(style, 0, 0, false, 0), ...P.roll(clamp(u * 1.08, 0, 1)) };
        rate = 30;
        if (u > 0.7 && this.buf && this.tryAct(dir, mag, true)) break;
        if (u >= 1) { this.setState('move'); this.vel.copy(this.rollDir).multiplyScalar(this.c.walk * 0.8); }
        break;
      }
      case 'backstep': {
        const rt = this.t * this.rollRate, rdt = dt * this.rollRate;
        const dur = 0.42, u = rt / dur, dist = 2.6 * this.rollDist * this.rollMul;
        const prev = Math.sin(clamp((rt - rdt) / (dur * 0.7), 0, 1) * Math.PI / 2), now = Math.sin(clamp(u / 0.7, 0, 1) * Math.PI / 2);
        this.move(this.rollDir.x * dist * (now - prev), this.rollDir.z * dist * (now - prev));
        pose = { ...locomotion(style, 0, 0, false, 0), ...P.backstep };
        rate = 24;
        if (u > 0.65 && this.buf && this.tryAct(dir, mag, true)) break;
        if (u >= 1) this.setState('move');
        break;
      }
      case 'hurt': {
        pose = { ...locomotion(style, 0, 0, false, 0), ...P.hurt };
        rate = 22;
        if (this.t > 0.32 && this.buf && this.tryAct(dir, mag)) break;
        if (this.t > 0.42) this.setState('move');
        break;
      }
      case 'knockdown': {
        pose = this.t < 1.0 ? P.knockdown : locomotion(style, 0, 0, false, 0);
        rate = this.t < 0.3 ? 14 : 8;
        if (this.t > 0.85 && this.buf?.a === 'roll') { this.buf = null; this.yaw += 0; this.startRoll(mag > 0.2 ? dir : this.fwd().clone()); break; }
        if (this.t > 1.45) this.setState('move');
        break;
      }
      case 'guardbreak': {
        pose = { ...locomotion(style, 0, 0, false, 0), ...P.guardBreak };
        rate = 18;
        if (this.t > 1.0) this.setState('move');
        break;
      }
      case 'heal': {
        const dur = 1.15;
        const tv = dir.clone().normalize().multiplyScalar(mag > 0.05 ? this.c.walk * 0.32 : 0);
        this.vel.lerp(tv, 1 - Math.exp(-10 * dt));
        this.move(this.vel.x * dt, this.vel.z * dt);
        if (mag > 0.05) this.turnToward(Math.atan2(dir.x, dir.z), 5, dt);
        pose = { ...locomotion(style, this.phase += dt * 4 * (this.vel.length() > 0.2 ? 1 : 0), this.vel.length() / this.c.walk, false, this.game.time), ...P.heal };
        if (this.t > 0.2 && this.t < 0.8) this.game.fx.heal(this.pos);
        if (!this.healDone && this.t >= 0.55) {
          this.healDone = true;
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.48 * this.potionMul);
          this.game.audio.play('heal');
          this.game.fx.burst({ x: this.pos.x, y: 1, z: this.pos.z }, 16, [1, 0.75, 0.35], 3, 0.8, 0.2);
        }
        if (this.t > 0.9 && this.buf?.a === 'roll' && this.tryAct(dir, mag)) break;
        if (this.t >= dur) this.setState('move');
        this.regen(dt, 25);
        break;
      }
      case 'parry': {
        this.atk.t = this.t;
        pose = sample(PARRY.keys, this.t, this.basePose());
        rate = 30;
        this.trailOn = this.inWindow(PARRY.trail, this.t);
        if (this.t > 0.42 && this.buf && this.tryAct(dir, mag)) break;
        if (this.t >= PARRY.dur) this.setState('move');
        break;
      }
      case 'cast': {
        const c = this.castDef;
        const fired = this.t >= c.fireAt;
        if (!c.done && fired) { c.done = true; c.fire(); if (c.charge) { this.game.pfx.kill(c.charge); c.charge = null; } }
        pose = {
          ...this.basePose(), torso: [0.1, -0.35, 0], by: -0.06,
          armR: fired ? [-1.55, 0, 0.1] : [-2.5, 0, -0.2], foreR: [0, 0, 0], handR: [1.5, 0, 0],
          legL: [-0.35, 0, 0], legR: [0.3, 0, 0], shinR: [0.35, 0, 0],
        };
        rate = 24;
        if (fired && this.t > c.fireAt + 0.1 && this.buf?.a === 'roll' && this.tryAct(dir, mag)) break;
        if (this.t >= c.dur) this.setState('move');
        break;
      }
      case 'charge': {
        // 4 m dash behind the spectral shield; whoever it meets is bashed back
        const D = 0.45, f = this.fwd().clone();
        if (this.t < D * 0.9) this.move(f.x * 9 * dt, f.z * 9 * dt);
        const cx = this.pos.x + f.x * 0.8, cz = this.pos.z + f.z * 0.8;
        for (const e of this.game.enemiesAll()) {
          if (!e.alive || this.chargeHits.has(e) || Math.hypot(e.pos.x - cx, e.pos.z - cz) > e.radius + 0.9) continue;
          this.chargeHits.add(e);
          this.game.shieldBash(this, e, f);
        }
        pose = { ...this.basePose(), ...P.block, ...lunge(1.2), torso: [0.35, -0.1, 0] };
        rate = 22;
        if (Math.random() < dt * 20) this.game.fx.dust(this.pos, 1, 0.4);
        if (this.t >= D) { this.chargeEndT = this.game.time; this.setState('move'); }
        break;
      }
      case 'riposte': {
        const tg = this.riposteTarget, C = this.crit;
        const rt = this.t * this.ripRate; // the evolved rogue's critical plays much faster
        if (tg && rt < Math.min(0.3, C.hitAt) && !C.blink && !(C.through && rt >= C.through)) {
          // glide into position at the victim
          this.turnToward(this.yawTo(tg.pos), 20, dt);
          const d = this.distTo(tg) - tg.radius - C.at;
          if (Math.abs(d) > 0.05) { const f = this.fwd(); const k = Math.min(1, dt * 12); this.move(f.x * d * k, f.z * d * k); }
        }
        // Shroud Slash: reappear on the far side of the victim, facing on through
        if (tg && C.through && !this.ripThrough && rt >= C.through) {
          this.ripThrough = true;
          const dx = tg.pos.x - this.pos.x, dz = tg.pos.z - this.pos.z, L = Math.hypot(dx, dz) || 1;
          const go = L + tg.radius + 0.8;
          this.ripDir = V3(dx / L, 0, dz / L);
          this.move(dx / L * go, dz / L * go);
          this.yaw = Math.atan2(dx, dz);
        }
        pose = sample(C.keys, rt, this.basePose());
        rate = 26 * this.ripRate;
        this.trailOn = this.inWindow(C.trail, rt);
        this.rig.reverse = !!(C.reverse && rt >= C.reverse[0] && rt < C.reverse[1]);
        if (C.vanish) { this.ripHidden = rt >= C.vanish[0] && rt < C.vanish[1]; this.rig.root.visible = !this.ripHidden; }
        if (C.jump) { this.ripLift = true; this.y = rt > C.jump[0] && rt < C.jump[1] ? C.jump[2] * Math.sin(Math.PI * (rt - C.jump[0]) / (C.jump[1] - C.jump[0])) : 0; }
        if (tg && C.events) for (const ev of C.events) {
          if (this.ripEv.has(ev) || rt < ev.t) continue;
          this.ripEv.add(ev);
          const hp = V3(tg.pos.x, 1.1 * tg.rig.root.scale.y, tg.pos.z);
          ev.fn(this, tg, this.game, hp, this.ripDir || this.fwd().clone());
        }
        if (!this.ripHit && rt >= C.hitAt && tg) {
          this.ripHit = true;
          // parry crits hit like three light attacks (more against bosses); others use their own number
          this.game.riposteHit(this, tg, C.dmg * NUM * (tg.isBoss ? C.bossMul || 1 : 1), C.flatHits || 1);
        }
        if (rt >= C.dur) this.endCrit();
        break;
      }
      case 'rest': {
        pose = P.rest; rate = 6;
        this.vel.set(0, 0, 0);
        if (this.t > 1.2 && (mag > 0.3 || this.buf)) { this.buf = null; this.setState('move'); }
        break;
      }
      case 'dead': {
        pose = P.dead; rate = 7;
        break;
      }
    }
    if (this.state !== 'attack' && this.state !== 'parry' && this.state !== 'riposte') this.trailOn = false;
    if (this.spectral) {
      this.spectral.visible = this.state === 'charge';
      this.spectral.material.opacity = 0.45 + Math.sin(this.game.time * 30) * 0.1;
    }

    if (this.state !== 'move' && this.state !== 'heal') this.blocking = false;
    this.applyKnockback(dt);
    if (pose) this.syncRig(dt, pose, rate);
    const hand = this.atk?.def?.hand || (this.state === 'parry' ? 'L' : 'R');
    this.trail.update(dt, this.trailOn && hand !== 'L', this.rig.base, this.rig.tip);
    this.trailL?.update(dt, this.trailOn && (hand === 'L' || hand === 'B'), this.rig.baseL, this.rig.tipL);
    if (this.rig.wpnR && !this.rig.fx) this.rig.wpnR.rotation.x = this.rig.reverse ? Math.PI : 0;
  }

  basePose() { return locomotion(this.c.style, this.phase, 0, false, this.game.time); }

  regen(dt, rate) {
    rate *= 1 - 0.6 * this.fatigue;
    if (this.stDelay <= 0) this.st = Math.min(this.maxSt, this.st + rate * dt);
  }

  // Try to perform the buffered action. Returns true if a new state began.
  tryAct(dir, mag, fromDodge = false) {
    const b = this.buf;
    if (!b) return false;
    const a = b.a;
    if (a === 'roll') {
      if (!this.canSpend()) return false;
      this.buf = null;
      if (mag > 0.2) this.startRoll(dir); else this.startBackstep();
      return true;
    }
    if (a === 'heavy' && this.c.caster) { this.buf = null; return this.castBolt(dir, mag) && this.comboBegin('heavy'); }
    if (a === 'attack' || a === 'heavy') {
      if (!this.canSpend()) return false;
      this.buf = null;
      if (a === 'attack' && this.tryRiposte(dir, mag)) return true;
      if (a === 'heavy' && this.kind === 'knight' && this.game.time - (this.lastBlockT ?? -9) < 0.9) {
        this.lastBlockT = -9;
        this.doAttack('guardCounter', dir, mag);
        return true;
      }
      // evolved knight: block + heavy = shield charge; attack right after it = leaping overhead
      if (this.kind === 'knight' && this.evolved && this.game.time - (this.chargeEndT ?? -9) < 0.6) {
        this.chargeEndT = -9;
        this.doAttack('chargeSlam', dir, mag);
        return true;
      }
      if (a === 'heavy' && this.kind === 'knight' && this.evolved && this.blocking) {
        if (this.chargeCd > 0) this.game.ui.toastSmall?.(`Shield charge in ${Math.ceil(this.chargeCd)}s`);
        else { this.startCharge(dir, mag); return true; }
      }
      this.doAttack(a === 'heavy' ? 'heavy' : this.c.light, dir, mag);
      this.comboBegin(a);
      return true;
    }
    if (a === 'heal') {
      this.buf = null;
      if (this.flasks <= 0) { this.game.ui.toastSmall?.('No injectors left'); return false; }
      this.flasks--; this.healDone = false; this.setState('heal');
      this.game.vfx('heal', this.game.myRef());
      return true;
    }
    if (a === 'special' && this.c.caster) { this.buf = null; return this.castFire(dir, mag); }
    if (a === 'special' && this.kind === 'rogue') {
      if (this.parryCd > 0) { this.buf = null; this.game.ui.toastSmall?.('Parry recharging'); return false; }
      if (!this.canSpend()) return false;
      this.buf = null;
      this.parryCd = Math.max(2, (this.evolved ? PARRY_CD_EVO : PARRY_CD) - (this.tree.parryCd || 0));
      this.spend(PARRY.cost);
      if (mag > 0.2 && !this.lock) this.yaw = Math.atan2(dir.x, dir.z);
      else if (this.lock) this.yaw = this.yawTo(this.lock.pos);
      // The parry is judged on the attacker's clock: it only works if a parryable
      // hit lands within the next 0.25s (small tolerance for frame timing).
      const tgt = this.game.parryTargets(this, 0.03)[0];
      if (tgt) {
        this.parryCd = Math.max(0, this.parryCd - 1.5); // a clean parry recharges 1.5 s sooner
        tgt.e.parryMark = { atk: tgt.e.atk, h: tgt.np.h };
        this.yaw = this.yawTo(tgt.e.pos);
      } else {
        // whiffed parry: huge stamina penalty and a long regen delay
        this.st = Math.max(0, this.st - this.maxSt * 0.5);
        this.stDelay = 1.6;
        this.game.ui.staminaPenalty();
      }
      this.atk = { def: PARRY, t: 0, hit: new Set() };
      this.setState('parry');
      this.game.audio.play('swing', 0.6);
      this.game.mp.event({ k: 'sfx', s: 'swing', v: 0.6 });
      return true;
    }
    if (a === 'special') { this.buf = null; return false; }
    return false;
  }

  tryRiposte(dir, mag) {
    const aim = mag > 0.2 ? Math.atan2(dir.x, dir.z) : this.yaw;
    const tg = this.findTarget(2.2, 1.2, aim, (e) => e.critable && e.critable());
    if (!tg) return false;
    // must be in front of the victim
    if (Math.abs(angDiff(tg.yaw, tg.yawTo(this.pos))) > 1.3) return false;
    this.startRiposte(tg);
    return true;
  }

  startRiposte(tg, rate = 1, crit = critFor(this.kind, tg, false)) {
    this.riposteTarget = tg; this.ripHit = false; this.ripRate = rate;
    this.crit = crit; this.ripEv = new Set(); this.ripThrough = false; this.ripDir = null;
    tg.beginRiposted?.(this, crit.hitAt / rate);
    this.atk = { def: crit, t: 0, hit: new Set() };
    this.setState('riposte');
    this.game.mp.event({ k: 'riposte', r: rate, c: crit.name });
  }

  // ---------- evolved knight: shield charge ----------
  startCharge(dir, mag) {
    this.chargeCd = CHARGE_CD - (this.tree.chargeCd || 0);
    this.spend(20);
    if (this.lock) this.yaw = this.yawTo(this.lock.pos);
    else if (mag > 0.2) this.yaw = Math.atan2(dir.x, dir.z);
    this.chargeHits = new Set();
    this.blocking = false;
    this.setState('charge');
    this.game.audio.play('roll', 1); this.game.audio.play('clang', 0.4);
    this.game.vfx('chargeStart', this.pos.clone());
  }

  endCrit() {
    this.rig.reverse = false;
    if (this.ripHidden) { this.rig.root.visible = true; this.ripHidden = false; }
    if (this.ripLift) { this.y = 0; this.ripLift = false; }
    this.setState('move');
  }

  // Evolved rogue: a parry instantly becomes a backstab: a red blink to behind the enemy
  instantRiposte(tg) {
    this.game.vfx('redPoof', this.pos.clone().setY(0.2));
    const b = tg.fwd(), at = tg.radius + 0.85;
    const tx = tg.pos.x - b.x * at, tz = tg.pos.z - b.z * at;
    this.move(tx - this.pos.x, tz - this.pos.z);
    this.yaw = this.yawTo(tg.pos);
    this.startRiposte(tg, 2.8, CRITS.backstab);
  }

  // ---------- combos (combos.js) ----------
  // a normal move that starts some combo: follow it
  comboBegin(input) {
    const node = this.c.combos?.[input];
    this.cmb = node && this.comboIn(node) ? { node, openAt: null } : null;
    this.cmbStag = new Set(); // enemies this combo has staggered (once each)
    // stamina back: land the first two moves of a combo and the rest of it is free (a roll or bolt step counts as
    // landed). cmbDepth: which move of the combo is playing; cmbHit: the moves that hit something
    this.cmbDepth = 1; this.cmbHit = new Set(); this.cmbAuto = new Set();
    return true;
  }
  // is the player doing that node's move right now?
  comboIn(node) {
    if (node.move === 'roll') return this.state === 'roll' || this.state === 'backstep';
    if (node.move === 'bolt') return this.state === 'cast';
    return this.state === 'attack' && this.atkKey === node.move;
  }
  // time into the current move, in the move's own time
  comboTime() { return this.state === 'attack' ? this.atk.t : this.t * (this.state === 'roll' || this.state === 'backstep' ? this.rollRate : 1); }
  // each frame: open the window (the weapon flashes) at its moment; drop the combo if it was missed or broken off
  comboTick() {
    const C = this.cmb;
    if (!C) { this.comboMark(false); return; }
    const now = this.game.time;
    // (an open window outlasts the move: you can still continue from standing until it closes)
    const lingering = C.openAt != null && now <= C.openAt + COMBO_WINDOW && this.state === 'move';
    if ((!this.comboIn(C.node) && !lingering) || !Object.keys(C.node.next).length) { this.cmb = null; return; }
    if (C.openAt == null && this.comboTime() >= C.node.at) { C.openAt = now; this.comboFlash(); }
    else if (C.openAt != null && now > C.openAt + COMBO_WINDOW) this.cmb = null;
    this.comboMark(this.cmb?.openAt != null);
  }
  // a press while following a combo: in the window and the right input continues it; anything else ends it
  // (and the press does its normal thing)
  comboPress(a, dir, mag) {
    const C = this.cmb;
    if (!C || (a !== 'attack' && a !== 'heavy' && a !== 'roll')) return false;
    const now = this.game.time, next = C.node.next[a];
    this.cmb = null;
    if (C.openAt == null || now > C.openAt + COMBO_WINDOW || !next) return false;
    const depth = (this.cmbDepth || 1) + 1;
    if (C.node.move === 'roll' || C.node.move === 'bolt') this.cmbAuto?.add(depth - 1);
    const landed = (d) => this.cmbHit?.has(d) || this.cmbAuto?.has(d);
    this.freeMove = depth >= 3 && landed(1) && landed(2);
    const ok = this.comboStep(next, dir, mag);
    this.freeMove = false;
    if (!ok) return false;
    this.cmbDepth = depth;
    if (depth === 3 && landed(1) && landed(2)) this.game.statusPopup(this, 'STAMINA FREE', '#7ad06a');
    this.armorSeq = this.stateSeq; // this move is armoured until it ends
    this.game.audio.play('comboHit');
    if (Object.keys(next.next).length) this.cmb = { node: next, openAt: null };
    else if (next.combo) this.game.statusPopup(this, next.combo.name.toUpperCase(), '#ffc23d'); // the finisher
    return true;
  }
  comboStep(node, dir, mag) {
    if (node.move === 'roll') {
      if (!this.freeMove && !this.canSpend()) return false;
      if (mag > 0.2) this.startRoll(dir); else this.startBackstep();
      if (node.fast) this.rollRate *= FAST;
      if (node.depth >= 3) this.rollRate *= TAIL;
      return true;
    }
    if (node.move === 'bolt') return this.castBolt(dir, mag);
    const def = this.c.attacks[node.move];
    if (!def || (!this.freeMove && !this.canSpend())) return false;
    if (def.mana) {
      if (this.mana < def.mana) { this.game.ui.toastSmall?.('Not enough mana'); return false; }
      this.mana -= def.mana;
    }
    this.doAttack(node.move, dir, mag);
    if (node.fast) this.atkRate *= FAST; // the longer combos play faster
    if (node.depth >= 3) this.atkRate *= TAIL; // after the opening two moves the combo rolls on quickly
    return true;
  }
  // the other cue: a little red pixel mark over the player's head while the window is open
  comboMark(on) {
    if (!this.mark) {
      if (!on) return;
      const c = document.createElement('canvas'); c.width = c.height = 7;
      const g = c.getContext('2d');
      // a downward chevron with a dark outline
      const rows = ['.ooooo.', 'orrrrro', 'oRrrrRo', '.oRrRo.', '..oRo..', '...o...', '.......'];
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = ch === 'o' ? '#200404' : ch === 'R' ? '#ff6a4a' : '#d4141c'; g.fillRect(x, y, 1, 1); } }));
      const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
      this.mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
      this.mark.scale.setScalar(0.32); this.mark.renderOrder = 12;
      this.game.scene.add(this.mark);
    }
    this.mark.visible = on;
    if (on) this.mark.position.set(this.pos.x, 2.35 + (this.y || 0) + Math.sin(this.game.time * 30) * 0.03, this.pos.z);
  }

  // the cue: a glint along the blade(s) that lasts the window
  comboFlash() {
    const r = this.rig, fx = this.game.fx, a = new THREE.Vector3(), b = new THREE.Vector3();
    for (const [u, v] of [[r.base, r.tip], [r.baseL, r.tipL]]) {
      if (!u || !v) continue;
      u.getWorldPosition(a); v.getWorldPosition(b);
      for (let i = 0; i <= 5; i++) {
        const q = a.clone().lerp(b, 0.3 + i * 0.14);
        fx.add.spawn({ x: q.x, y: q.y, z: q.z, life: COMBO_WINDOW + 0.04, size: i === 5 ? 0.34 : 0.16, size1: 0.04, r: 1, g: 0.95, b: 0.75, alpha: 1 });
      }
    }
  }

  // ---------- Spellsword ----------
  aimAt(dir, mag) {
    if (this.lock) { this.yaw = this.yawTo(this.lock.pos); return; }
    const aim = mag > 0.2 ? Math.atan2(dir.x, dir.z) : this.yaw;
    const tg = this.findTarget(14, 0.5, aim);
    this.yaw = tg ? this.yawTo(tg.pos) : aim;
  }

  startCast(cost, dur, fireAt, fire, dir, mag) {
    if (this.mana < cost) { this.game.ui.toastSmall('Not enough mana'); return false; }
    this.mana -= cost;
    this.aimAt(dir, mag);
    this.castDef = { dur: dur / this.aspdMul, fireAt: fireAt / this.aspdMul, fire, done: false };
    // visual: energy gathers in the casting hand until the spell leaves it
    const big = fireAt > 0.3; // the fireball
    this.game.vfx('cast', this.game.myRef(), big, this.castDef.fireAt + 0.05);
    this.vel.set(0, 0, 0);
    this.setState('cast');
    return true;
  }

  castBolt(dir, mag) {
    return this.startCast(Math.max(4, MANA_BOLT - (this.tree.boltCost || 0)), 0.5, 0.16, () => this.game.spawnSpell(this, 'bolt'), dir, mag);
  }

  castFire(dir, mag) {
    return this.startCast(MANA_FIRE - (this.tree.fireCost || 0), 0.95, 0.45, () => {
      if (this.evolved) { this.game.spawnSpell(this, 'fire', -0.16); this.game.spawnSpell(this, 'fire', 0.16); }
      else this.game.spawnSpell(this, 'fire');
    }, dir, mag);
  }

  doAttack(name, dir, mag) {
    const def = this.c.attacks[name];
    this.atkKey = name;
    // repeated attacks cost more and push stamina regen further out (combo moves cost a fixed, larger amount)
    this.spend(0.9 * def.cost * (def.comboMove ? 1 : 1 + 0.9 * this.fatigue) * (1 - (this.tree.atkCost || 0) / 100)); // (every attack costs 10% less than listed)
    this.stDelay = 0.6 + 0.7 * this.fatigue;
    this.fatigue = Math.min(1, this.fatigue + (name === 'heavy' ? 0.3 : 0.2));
    this.fatigueT = 1.0;
    // swing speed is locked in when the attack starts: fatigue slows it a bit, and
    // swinging with an empty bar is very slow (down to ~0.3x at zero stamina)
    const low = Math.min(1, this.st / (this.maxSt * 0.3));
    this.atkRate = (1 - 0.3 * this.fatigue) * (0.35 + 0.65 * low) * this.aspdMul * (this.c.meleeRate ?? 1);
    // initial facing: lock target > stick > aim-assist toward a nearby enemy
    if (this.lock) this.yaw = this.yawTo(this.lock.pos);
    else {
      const aim = mag > 0.2 ? Math.atan2(dir.x, dir.z) : this.yaw;
      const tg = this.findTarget(3.6, def.comboMove ? Math.PI : 1.0, aim); // a combo move turns to an enemy behind you too (after a roll)
      this.yaw = tg ? this.yawTo(tg.pos) : aim;
    }
    this.startAttack(def);
    this.atkKey = name; // (startAttack looks it up among enemy move sets)
    this.vel.set(0, 0, 0);
    this.game.mp.event({ k: 'swing', a: name, r: this.atkRate });
  }

  // after paying for a dodge, an empty bar makes it ~2.2x slower and much shorter
  setDodgeRate() {
    const low = Math.min(1, this.st / (this.maxSt * 0.3));
    this.rollRate = 0.8 + 0.2 * low;
    this.rollDist = 0.85 + 0.15 * low;
  }

  startRoll(dir) {
    this.spend(this.c.roll.cost * (1 - (this.tree.rollCost || 0) / 100) * (this.tree.immovable ? 1.5 : 1) * (this.tree.fleeting ? 0.5 : 1));
    this.setDodgeRate();
    this.rollDir.copy(dir).setY(0).normalize();
    this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
    this.setState('roll');
    this.game.audio.play('roll');
    this.game.mp.event({ k: 'sfx', s: 'roll' });
    this.game.fx.dust(this.pos, 5, 0.8);
    this.rig.cur.hips && (this.rig.cur.hips[0] = 0);
  }

  startBackstep() {
    this.spend(this.c.roll.cost * 0.6 * (1 - (this.tree.rollCost || 0) / 100) * (this.tree.immovable ? 1.5 : 1) * (this.tree.fleeting ? 0.5 : 1));
    this.setDodgeRate();
    this.fwd(this.rollDir).multiplyScalar(-1);
    this.setState('backstep');
    this.game.audio.play('roll', 0.6);
    this.game.mp.event({ k: 'sfx', s: 'roll', v: 0.6 });
  }

  // ---------- receiving damage ----------
  receive(info) {
    if (!this.alive) return 'none';
    if (this.iframe()) return 'dodge';
    // armour and resistances: what gets through, and the status build-up the elements add
    const mit = mitigate(info.parts || enemyParts(info.dmg, info.elems), this.tree, info.buildMul ?? 1);
    // keystones that cost you: Ember Oath and Fleeting take 15% more, Pyromania 15% more from fire
    const extra = (this.tree.emberOath ? 1.15 : 1) * (this.tree.fleeting ? 1.15 : 1);
    info = { ...info, dmg: (mit.total + (this.tree.pyromania ? (mit.taken.fire || 0) * 0.15 : 0)) * extra };
    const src = info.srcPos;
    const toSrc = Math.atan2(src.x - this.pos.x, src.z - this.pos.z);
    const facing = Math.abs(angDiff(this.yaw, toSrc)) < 1.4;
    const A = info.attacker;
    if (this.state === 'parry' && A?.parryMark && A.parryMark.h === info.hit && (A.puppet || A.parryMark.atk === A.atk)) { A.parryMark = null; return 'parry'; }
    if (this.blocking && facing && !info.unblockable) {
      const cost = info.dmg / NUM * (info.knock === 'heavy' ? 1.6 : 1.15); // stamina isn't scaled
      this.st -= cost; this.stDelay = 0.6;
      this.lastBlockT = this.game.time;
      this.blockHitT = 0.25;
      this.kb.set(this.pos.x - src.x, 0, this.pos.z - src.z).normalize().multiplyScalar(info.knock === 'heavy' ? 7 : 3.5);
      if (this.st < 0) {
        this.st = 0;
        this.hp -= info.dmg * 0.35;
        this.setState('guardbreak');
        if (this.hp <= 0) this.die();
        return 'guardbreak';
      }
      this.hp -= info.dmg * (25 - (this.tree.chip || 0)) / 100; // a quarter of a blocked hit gets through (less with the tree)
      if (this.hp <= 0) this.die();
      return 'block';
    }
    this.hp -= info.dmg;
    if (!this.comboArmored()) this.cmb = null; // a hit breaks a combo, unless it is two moves in
    this.rig.flash(1, 0.3, 0.2);
    if (this.hp <= 0) { this.die(); return 'hit'; }
    for (const [k, v] of Object.entries(mit.build)) if (v > 0) this.status.add(k, v, this.game);
    const away = new THREE.Vector3(this.pos.x - src.x, 0, this.pos.z - src.z).normalize();
    if (this.tree.immovable || this.chargeArmored()) {
      // Immovable (Knight keystone), or mid Shield Charge: hits hurt but never stagger or knock you down
    } else if (info.knock === 'heavy' && !this.comboArmored() && !(this.hyperArmor() && info.dmg < 30 * NUM)) {
      this.kb.copy(away).multiplyScalar(11);
      this.yaw = toSrc;
      this.setState('knockdown');
      this.atk = null;
    } else if (!this.hyperArmor()) {
      this.kb.copy(away).multiplyScalar(4);
      if (this.state !== 'heal' || info.dmg > 0) this.setState('hurt');
      this.atk = null;
    }
    return 'hit';
  }

  die() {
    this.hp = 0;
    this.alive = false;
    this.setState('dead');
    this.atk = null;
    this.lock = null;
    this.game.onPlayerDeath();
  }

  // party play: back on your feet after a teammate's revive
  revive(frac) {
    this.alive = true; this.hp = Math.max(1, Math.round(this.maxHp * frac)); this.st = this.maxSt;
    this.kb.set(0, 0, 0); this.atk = null; this.buf = null;
    this.setState('move');
  }

  respawn(x, z) {
    this.alive = true;
    this.hp = this.maxHp; this.st = this.maxSt; this.flasks = this.maxFlasks;
    this.pos.set(x, 0, z); this.yaw = Math.PI; this.kb.set(0, 0, 0); this.vel.set(0, 0, 0);
    this.lock = null; this.buf = null; this.atk = null;
    this.fatigue = 0;
    this.setState('move');
  }
}
