import * as THREE from 'three';
import { Actor, angDiff, clamp } from './actor.js';
import { buildHumanoid } from './models.js';
import { locomotion, P, sample } from './anims.js';
import { Trail } from './fx.js';
import { UPGRADES, upgradeTotal } from './progress.js';

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
    hits: [{ t0: 0.15, t1: 0.25, range: 2.35, arc: 2.5, dmg: 24, poise: 22 }],
    move: [[0.08, 0.25, 0.75]],
  },
  k2: {
    dur: 0.62, cost: 16, next: 'k3', combo: [0.26, 0.62], cancel: 0.31, track: 0.12, trail: [0.11, 0.26], sfx: [0.11, 'swing'],
    keys: [
      [0.12, { torso: [0.15, 0.75, 0], armR: [-1.45, 0, 1.05], foreR: [-0.25, 0, 0], handR: [1.4, 0, 0], ...lunge(0.8) }],
      [0.23, { torso: [0.22, -0.65, 0], armR: [-1.45, 0, -1.25], foreR: [0, 0, 0], handR: [1.45, 0, 0], legL: [0.3, 0, 0], legR: [-0.45, 0, 0], shinL: [0.35, 0, 0], by: -0.12 }],
      [0.45, { torso: [0.15, -0.5, 0], armR: [-1.25, 0, -0.95], foreR: [-0.25, 0, 0], handR: [1.3, 0, 0], legL: [0.25, 0, 0], legR: [-0.35, 0, 0], by: -0.08 }],
    ],
    hits: [{ t0: 0.13, t1: 0.24, range: 2.35, arc: 2.6, dmg: 26, poise: 22 }],
    move: [[0.06, 0.24, 0.7]],
  },
  k3: {
    dur: 0.88, cost: 22, next: 'k1', combo: [0.45, 0.88], cancel: 0.48, track: 0.24, trail: [0.25, 0.4], sfx: [0.26, 'heavySwing'],
    keys: [
      [0.27, { torso: [-0.25, -0.15, 0], armR: [-3.0, 0, -0.15], foreR: [-0.55, 0, 0], handR: [1.0, 0, 0], armL: [-2.6, 0, 0.25], foreL: [-0.6, 0, 0], legL: [-0.35, 0, 0], legR: [0.15, 0, 0], by: 0.02 }],
      [0.38, { torso: [0.6, 0, 0], armR: [-0.95, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.1, 0, 0.1], foreL: [-0.2, 0, 0], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], shinL: [0.45, 0, 0], shinR: [0.5, 0, 0], by: -0.28 }],
      [0.62, { torso: [0.45, 0, 0], armR: [-0.8, 0, 0.05], foreR: [-0.2, 0, 0], handR: [1.2, 0, 0], armL: [-0.7, 0, 0.1], legL: [-0.65, 0, 0], legR: [0.45, 0, 0], shinL: [0.35, 0, 0], shinR: [0.45, 0, 0], by: -0.22 }],
    ],
    hits: [{ t0: 0.28, t1: 0.39, range: 2.6, arc: 1.5, dmg: 38, poise: 42 }],
    move: [[0.18, 0.38, 1.1]],
    onHitShake: 0.35,
  },
  heavy: {
    dur: 1.1, cost: 30, next: 'k2', combo: [0.72, 1.1], cancel: 0.72, track: 0.42, trail: [0.42, 0.58], sfx: [0.42, 'heavySwing'], armor: [0.25, 0.58],
    keys: [
      [0.42, { torso: [-0.35, -0.35, 0], armR: [-3.1, 0, -0.3], foreR: [-0.95, 0, 0], handR: [0.6, 0, 0], armL: [-2.2, 0, 0.3], foreL: [-0.8, 0, 0], legL: [-0.5, 0, 0], legR: [0.35, 0, 0], shinR: [0.5, 0, 0], by: -0.2 }],
      [0.55, { torso: [0.75, 0.1, 0], armR: [-0.8, 0, 0.1], foreR: [0, 0, 0], handR: [1.35, 0, 0], armL: [-0.9, 0, 0.1], legL: [-0.85, 0, 0], legR: [0.65, 0, 0], shinL: [0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.38 }],
      [0.85, { torso: [0.6, 0.1, 0], armR: [-0.7, 0, 0.1], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], shinL: [0.45, 0, 0], shinR: [0.55, 0, 0], by: -0.32 }],
    ],
    hits: [{ t0: 0.44, t1: 0.57, range: 2.7, arc: 1.6, dmg: 58, poise: 75 }],
    move: [[0.3, 0.55, 1.5]],
    onHitShake: 0.5, heavyHit: true,
  },
  guardCounter: {
    dur: 0.8, cost: 18, next: 'k2', combo: [0.48, 0.8], cancel: 0.5, track: 0.16, trail: [0.16, 0.3], sfx: [0.15, 'heavySwing'], armor: [0, 0.3],
    keys: [
      [0.16, { torso: [0.1, -0.9, 0], armR: [-1.5, 0, -1.4], foreR: [-0.1, 0, 0], handR: [1.45, 0, 0], guard: 0.6, legL: [-0.3, 0, 0], legR: [0.3, 0, 0] }],
      [0.28, { torso: [0.3, 0.8, 0], armR: [-1.5, 0, 1.0], foreR: [0, 0, 0], handR: [1.45, 0, 0], ...lunge(1.2) }],
      [0.55, { torso: [0.2, 0.6, 0], armR: [-1.2, 0, 0.8], foreR: [-0.3, 0, 0], handR: [1.2, 0, 0], ...lunge(1) }],
    ],
    hits: [{ t0: 0.17, t1: 0.3, range: 2.6, arc: 2.8, dmg: 46, poise: 80 }],
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
    hits: [{ t0: 0.08, t1: 0.17, range: 1.95, arc: 2.3, dmg: 15, poise: 11 }],
    move: [[0.03, 0.16, 0.55]],
  },
  r2: {
    dur: 0.42, cost: 11, next: 'r3', combo: [0.15, 0.42], cancel: 0.18, track: 0.08, trail: [0.06, 0.18], hand: 'L', sfx: [0.06, 'swing'],
    keys: [
      [0.08, { torso: [0.12, 0.55, 0], armL: [-1.6, 0, 1.15], foreL: [-0.3, 0, 0], handL: [1.35, 0, 0], armR: [-0.4, 0, -0.3], foreR: [-1.2, 0, 0], handR: [0.6, 0, 0] }],
      [0.16, { torso: [0.25, -0.5, 0], armL: [-1.5, 0, -0.75], foreL: [-0.1, 0, 0], handL: [1.45, 0, 0], legL: [0.4, 0, 0], legR: [-0.5, 0, 0], shinL: [0.45, 0, 0], by: -0.1 }],
      [0.3, { torso: [0.22, -0.4, 0], armL: [-1.3, 0, -0.55], foreL: [-0.3, 0, 0], handL: [1.3, 0, 0], legL: [0.3, 0, 0], legR: [-0.4, 0, 0], by: -0.08 }],
    ],
    hits: [{ t0: 0.08, t1: 0.17, range: 1.95, arc: 2.3, dmg: 15, poise: 11 }],
    move: [[0.03, 0.16, 0.55]],
  },
  r3: {
    dur: 0.48, cost: 12, next: 'r4', combo: [0.2, 0.48], cancel: 0.22, track: 0.1, trail: [0.09, 0.2], hand: 'R', sfx: [0.09, 'swing'],
    keys: [
      [0.1, { torso: [0.1, -0.45, 0], armR: [-0.3, 0, -0.2], foreR: [-1.75, 0, 0], handR: [1.6, 0, 0], armL: [-0.6, 0, 0.3], foreL: [-1.0, 0, 0] }],
      [0.18, { torso: [0.35, 0.3, 0], armR: [-1.55, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], ...lunge(1.3) }],
      [0.34, { torso: [0.3, 0.25, 0], armR: [-1.4, 0, 0], foreR: [-0.2, 0, 0], handR: [1.4, 0, 0], ...lunge(1.1) }],
    ],
    hits: [{ t0: 0.11, t1: 0.2, range: 2.25, arc: 1.1, dmg: 18, poise: 12 }],
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
      { t0: 0.12, t1: 0.21, range: 2.1, arc: 3.4, dmg: 13, poise: 10 },
      { t0: 0.25, t1: 0.34, range: 2.1, arc: 3.4, dmg: 17, poise: 14 },
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
    hits: [{ t0: 0.32, t1: 0.44, range: 2.1, arc: 1.3, dmg: 36, poise: 45 }],
    move: [[0.27, 0.42, 3.2]], stopAt: 1.2,
    onHitShake: 0.35,
  },
};

// Spellsword melee: off-hand knife only. Swap sides of a right-handed attack.
const SWAP = { armL: 'armR', armR: 'armL', foreL: 'foreR', foreR: 'foreL', handL: 'handR', handR: 'handL', legL: 'legR', legR: 'legL', shinL: 'shinR', shinR: 'shinL' };
const mirrorPose = (pose) => Object.fromEntries(Object.entries(pose).map(([k, v]) => [SWAP[k] || k, Array.isArray(v) ? [v[0], -v[1], -v[2]] : v]));
const mirror = (def) => ({ ...def, keys: def.keys.map(([t, pose]) => [t, mirrorPose(pose)]) });

const MAGE_ATTACKS = {
  s1: { ...ROGUE_ATTACKS.r2, next: 's2', hand: 'L', hits: [{ t0: 0.08, t1: 0.17, range: 1.95, arc: 2.3, dmg: 14, poise: 10 }] },
  s2: { ...mirror(ROGUE_ATTACKS.r3), next: 's1', hand: 'L', hits: [{ t0: 0.11, t1: 0.2, range: 2.25, arc: 1.1, dmg: 17, poise: 12 }] },
};

const MANA_BOLT = 33, MANA_FIRE = 75;

export const CHARS = {
  knight: {
    hp: 150, st: 75, walk: 4.3, sprint: 6.6, flasks: 4, style: 'sword',
    roll: { dur: 0.6, dist: 4.6, iframes: [0.03, 0.4], cost: 22 },
    attacks: KNIGHT_ATTACKS, light: 'k1', critDmg: 150, trail: 0xdfe8ff,
    model: { cloth: 0x2c3e66, armor: 0x8d939c, accent: 0x2d4a7a, skin: 0xc49a7a, head: 'helm', weapon: 'sword', shield: true, tabard: true, pauldrons: true, bulk: 1.08 },
  },
  rogue: {
    hp: 105, st: 85, walk: 4.8, sprint: 7.4, flasks: 4, style: 'daggers',
    roll: { dur: 0.5, dist: 4.9, iframes: [0.02, 0.4], cost: 16 },
    attacks: ROGUE_ATTACKS, light: 'r1', critDmg: 170, trail: 0xffd0a0, dual: true,
    model: { cloth: 0x4e3e30, armor: 0x6a5440, accent: 0x9a2a22, skin: 0xc49a7a, head: 'hood', weapon: 'daggers', bulk: 0.95 },
  },
};

CHARS.mage = {
  hp: 95, st: 85, walk: 4.6, sprint: 7.0, flasks: 4, style: 'daggers', caster: true, dual: true,
  roll: { dur: 0.55, dist: 4.6, iframes: [0.03, 0.4], cost: 18 },
  attacks: MAGE_ATTACKS, light: 's1', critDmg: 130, trail: 0x8ab4ff,
  model: { cloth: 0x2c3a66, armor: 0x7a86b0, accent: 0x4a7aff, skin: 0xd0a888, head: 'hair', weapon: 'spellknife', bulk: 0.9 },
};

export const RIPOSTE = {
  dur: 1.15, track: 0.05, trail: [0.18, 0.5],
  keys: [
    [0.18, { torso: [0.2, -0.4, 0], armR: [-0.3, 0, -0.2], foreR: [-1.8, 0, 0], handR: [1.6, 0, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0], by: -0.1 }],
    [0.32, { torso: [0.45, 0.25, 0], armR: [-1.5, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], ...lunge(1.3) }],
    [0.7, { torso: [0.45, 0.25, 0], armR: [-1.45, 0, 0], foreR: [-0.05, 0, 0], handR: [1.5, 0, 0], ...lunge(1.3) }],
    [0.85, { torso: [0.1, -0.3, 0], armR: [-0.6, 0, -0.5], foreR: [-0.6, 0, 0], handR: [1.0, 0, 0], legL: [0.2, 0, 0], legR: [-0.2, 0, 0] }],
  ],
};

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
    const rig = buildHumanoid({ ...c.model, scale: 1 });
    super(game, rig, { x, z, hp: c.hp, radius: 0.42, team: 'player', yaw: Math.PI, poise: 0 });
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
    const pct = (k) => upgradeTotal(UPGRADES.find((u) => u.key === k), upgrades[k] || 0) / 100;
    this.dmgMul += pct('dmg'); this.aspdMul += pct('aspd'); this.moveMul += pct('move');
    this.maxHp = this.hp = Math.round(c.hp * (1 + pct('hp')));
    this.maxSt = this.st = Math.round(c.st * (1 + pct('st')));
    this.flasks = this.maxFlasks = c.flasks + (upgrades.flask || 0);
    this.potionMul = 1 + pct('potion');
    this.maxMana = this.mana = c.caster ? 100 + upgradeTotal(UPGRADES.find((u) => u.key === 'mana'), upgrades.mana || 0) : 0;
    this.evolved = !!upgrades['evo_' + kind];
    this.ripRate = 1;
    if (kind === 'knight' && this.evolved) this.buildSpectralShield();
    this.fatigueT = 0;
    this.setState('move');
  }

  remove() { super.remove(); this.trailL?.dispose(this.game.scene); }

  // Evolved block: a white wall 20% wider than the torso, held out in front
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
  spend(n) { this.st -= n; if (this.st < 0) this.st = 0; this.stDelay = 0.6; }
  canSpend() { return this.st > 0.5; }

  iframe() {
    if (this.state === 'roll') return this.inWindow(this.c.roll.iframes, this.t);
    if (this.state === 'backstep') return this.t >= 0.02 && this.t <= 0.22;
    return this.state === 'knockdown' || this.state === 'riposte' || this.state === 'rest' || this.state === 'dead';
  }

  hyperArmor() { return this.state === 'attack' && this.inWindow(this.atk.def.armor); }

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
    for (const a of presses) if (a !== 'lock' && a !== 'pause' && a !== 'interact') this.push(a);
    if (this.buf) { this.buf.t -= dt; if (this.buf.t <= 0) this.buf = null; }

    const mv = input.move();
    const dir = this.worldDir(mv);
    const mag = Math.min(1, dir.length());
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
        if (this.sprintLock && this.st > 20) this.sprintLock = false;
        this.sprinting = wantSprint;
        let sp = (this.sprinting ? this.c.sprint : this.c.walk) * mag;
        if (this.blocking) sp *= 0.5;
        sp *= (1 - 0.35 * this.fatigue) * this.moveMul;
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
        this.regen(dt, this.blocking ? 16 : 48);
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
        if (this.state !== 'attack' || !this.atk) { pose = this.basePose(); break; }
        const t = this.atk.t;
        pose = this.attackPose(this.basePose());
        rate = 28;
        this.trailOn = this.inWindow(d.trail);
        if (this.buf && (this.buf.a === 'attack' || this.buf.a === 'heavy') && d.combo && t >= d.combo[0]) {
          const heavy = this.buf.a === 'heavy';
          this.buf = null;
          if (heavy && this.c.caster) { this.castBolt(dir, mag); break; }
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
        if (!c.done && fired) { c.done = true; c.fire(); }
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
      case 'riposte': {
        const tg = this.riposteTarget;
        const rt = this.t * this.ripRate; // the evolved rogue's critical plays much faster
        if (tg && rt < 0.3) {
          // glide into position in front of the victim
          const want = this.yawTo(tg.pos);
          this.turnToward(want, 20, dt);
          const d = this.distTo(tg) - tg.radius - 0.9;
          if (Math.abs(d) > 0.05) { const f = this.fwd(); const k = Math.min(1, dt * 12); this.move(f.x * d * k, f.z * d * k); }
        }
        pose = sample(RIPOSTE.keys, rt, this.basePose());
        rate = 26 * this.ripRate;
        this.trailOn = this.inWindow(RIPOSTE.trail, rt);
        if (!this.ripHit && rt >= 0.32 && tg) {
          this.ripHit = true;
          this.game.riposteHit(this, tg, this.c.critDmg);
        }
        if (rt >= RIPOSTE.dur) this.setState('move');
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
      this.spectral.visible = this.blocking;
      this.spectral.material.opacity = 0.34 + Math.sin(this.game.time * 9) * 0.08 + (this.blockHitT > 0 ? 0.3 : 0);
    }

    if (this.state !== 'move' && this.state !== 'heal') this.blocking = false;
    this.applyKnockback(dt);
    if (pose) this.syncRig(dt, pose, rate);
    const hand = this.atk?.def?.hand || (this.state === 'parry' ? 'L' : 'R');
    this.trail.update(dt, this.trailOn && hand !== 'L', this.rig.base, this.rig.tip);
    this.trailL?.update(dt, this.trailOn && (hand === 'L' || hand === 'B'), this.rig.baseL, this.rig.tipL);
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
    if (a === 'heavy' && this.c.caster) { this.buf = null; return this.castBolt(dir, mag); }
    if (a === 'attack' || a === 'heavy') {
      if (!this.canSpend()) return false;
      this.buf = null;
      if (a === 'attack' && this.tryRiposte(dir, mag)) return true;
      if (a === 'heavy' && this.kind === 'knight' && this.game.time - (this.lastBlockT ?? -9) < 0.9) {
        this.lastBlockT = -9;
        this.doAttack('guardCounter', dir, mag);
        return true;
      }
      this.doAttack(a === 'heavy' ? 'heavy' : this.c.light, dir, mag);
      return true;
    }
    if (a === 'heal') {
      this.buf = null;
      if (this.flasks <= 0) { this.game.ui.toastSmall?.('No flasks left'); return false; }
      this.flasks--; this.healDone = false; this.setState('heal');
      return true;
    }
    if (a === 'special' && this.c.caster) { this.buf = null; return this.castFire(dir, mag); }
    if (a === 'special' && this.kind === 'rogue') {
      if (!this.canSpend()) return false;
      this.buf = null;
      this.spend(PARRY.cost);
      if (mag > 0.2 && !this.lock) this.yaw = Math.atan2(dir.x, dir.z);
      else if (this.lock) this.yaw = this.yawTo(this.lock.pos);
      // The parry is judged on the attacker's clock: it only works if a parryable
      // hit lands within the next 0.25s (small tolerance for frame timing).
      const tgt = this.game.parryTargets(this, 0.03)[0];
      if (tgt) {
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

  startRiposte(tg, rate = 1) {
    this.riposteTarget = tg; this.ripHit = false; this.ripRate = rate;
    tg.beginRiposted?.(this);
    this.atk = { def: RIPOSTE, t: 0, hit: new Set() };
    this.setState('riposte');
    this.game.mp.event({ k: 'riposte', r: rate });
  }

  // Evolved rogue: a parry instantly becomes a critical, closing the gap at once
  instantRiposte(tg) {
    const a = this.yawTo(tg.pos), d = this.distTo(tg) - tg.radius - 0.9;
    this.yaw = a;
    if (d > 0) this.move(Math.sin(a) * d, Math.cos(a) * d);
    this.startRiposte(tg, 2.8);
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
    this.vel.set(0, 0, 0);
    this.setState('cast');
    return true;
  }

  castBolt(dir, mag) {
    return this.startCast(MANA_BOLT, 0.5, 0.16, () => this.game.spawnSpell(this, 'bolt'), dir, mag);
  }

  castFire(dir, mag) {
    return this.startCast(MANA_FIRE, 0.95, 0.45, () => {
      if (this.evolved) { this.game.spawnSpell(this, 'fire', -0.16); this.game.spawnSpell(this, 'fire', 0.16); }
      else this.game.spawnSpell(this, 'fire');
    }, dir, mag);
  }

  doAttack(name, dir, mag) {
    const def = this.c.attacks[name];
    this.atkKey = name;
    // repeated attacks cost more and push stamina regen further out
    this.spend(def.cost * (1 + 0.9 * this.fatigue));
    this.stDelay = 0.6 + 0.7 * this.fatigue;
    this.fatigue = Math.min(1, this.fatigue + (name === 'heavy' ? 0.3 : 0.2));
    this.fatigueT = 1.0;
    // swing speed is locked in when the attack starts: fatigue slows it a bit, and
    // swinging with an empty bar is very slow (down to ~0.3x at zero stamina)
    const low = Math.min(1, this.st / (this.maxSt * 0.3));
    this.atkRate = (1 - 0.3 * this.fatigue) * (0.35 + 0.65 * low) * this.aspdMul;
    // initial facing: lock target > stick > aim-assist toward a nearby enemy
    if (this.lock) this.yaw = this.yawTo(this.lock.pos);
    else {
      const aim = mag > 0.2 ? Math.atan2(dir.x, dir.z) : this.yaw;
      const tg = this.findTarget(3.6, 1.0, aim);
      this.yaw = tg ? this.yawTo(tg.pos) : aim;
    }
    this.startAttack(def);
    this.vel.set(0, 0, 0);
    this.game.mp.event({ k: 'swing', a: name, r: this.atkRate });
  }

  // after paying for a dodge, an empty bar makes it ~2.2x slower and much shorter
  setDodgeRate() {
    const low = Math.min(1, this.st / (this.maxSt * 0.3));
    this.rollRate = 0.46 + 0.54 * low;
    this.rollDist = 0.55 + 0.45 * low;
  }

  startRoll(dir) {
    this.spend(this.c.roll.cost);
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
    this.spend(this.c.roll.cost * 0.6);
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
    const src = info.srcPos;
    const toSrc = Math.atan2(src.x - this.pos.x, src.z - this.pos.z);
    const facing = Math.abs(angDiff(this.yaw, toSrc)) < 1.4;
    const A = info.attacker;
    if (this.state === 'parry' && A?.parryMark && A.parryMark.h === info.hit && (A.puppet || A.parryMark.atk === A.atk)) { A.parryMark = null; return 'parry'; }
    if (this.blocking && facing && !info.unblockable) {
      const cost = info.dmg * (info.knock === 'heavy' ? 1.6 : 1.15);
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
      this.hp -= info.dmg * 0.08;
      if (this.hp <= 0) this.die();
      return 'block';
    }
    this.hp -= info.dmg;
    this.rig.flash(1, 0.3, 0.2);
    if (this.hp <= 0) { this.die(); return 'hit'; }
    const away = new THREE.Vector3(this.pos.x - src.x, 0, this.pos.z - src.z).normalize();
    if (info.knock === 'heavy' && !(this.hyperArmor() && info.dmg < 30)) {
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
