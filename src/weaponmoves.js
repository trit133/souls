// The region weapons' moves (weapons.js): their light chains, heavies, combo moves and combos, with their own
// animations. Each set is a class's attacks for that weapon: the same shape as player.js's (keys of poses over time,
// hits, the combo window, tracking, the swing trail), and the combos the same shape as combos.js's.
import { NUM } from './scale.js';

const lunge = (l = 1) => ({ legL: [-0.5 * l, 0, 0.05], legR: [0.4 * l, 0, -0.05], shinL: [0.2, 0, 0], shinR: [0.45 * l, 0, 0], by: -0.1 * l });
const crouch = (l = 1) => ({ legL: [-0.75 * l, 0, 0], legR: [0.55 * l, 0, 0], shinL: [0.45 * l, 0, 0], shinR: [0.5 * l, 0, 0], by: -0.28 * l });
const withDmg = (def, dmgs, extra = {}) => ({ ...def, hits: def.hits.map((h, i) => ({ ...h, dmg: dmgs[i] ?? h.dmg })), comboMove: true, ...extra });
const front = (p, d = 1.2, y = 0) => p.pos.clone().addScaledVector(p.fwd(), d).setY(y);
const A = 'attack', H = 'heavy', R = 'roll';

// ================= THE PENITENT SLAB (Templar) =================
// both hands on the hilt: wide sweeps that carry the body round, an overhead that buries the tip, a crushing slam
const GS_HIGH_R = { armR: [-1.7, 0, -1.25], foreR: [-0.35, 0, 0], handR: [1.15, 0, 0], armL: [-1.5, 0, -0.7], foreL: [-0.7, 0, 0], handL: [1.0, 0, 0] };
const GS_SWEEP_L = { armR: [-1.35, 0, 0.95], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.25, 0, 1.2], foreL: [-0.3, 0, 0], handL: [1.2, 0, 0] };
const GS_HIGH_L = { armR: [-1.55, 0, 1.15], foreR: [-0.4, 0, 0], handR: [1.2, 0, 0], armL: [-1.7, 0, 1.3], foreL: [-0.3, 0, 0], handL: [1.1, 0, 0] };
const GS_SWEEP_R = { armR: [-1.3, 0, -1.1], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.2, 0, -0.8], foreL: [-0.5, 0, 0], handL: [1.2, 0, 0] };
const GS_OVER = { armR: [-3.0, 0, -0.25], foreR: [-0.8, 0, 0], handR: [0.7, 0, 0], armL: [-2.9, 0, 0.15], foreL: [-0.9, 0, 0], handL: [0.7, 0, 0] };
const GS_DOWN = { armR: [-0.75, 0, 0.1], foreR: [-0.05, 0, 0], handR: [1.45, 0, 0], armL: [-0.8, 0, 0.25], foreL: [-0.1, 0, 0], handL: [1.4, 0, 0] };
export const GREAT_ATTACKS = {
  g1: {
    dur: 0.95, cost: 22, next: 'g2', combo: [0.42, 0.95], cancel: 0.56, track: 0.22, trail: [0.32, 0.5], sfx: [0.32, 'heavySwing'], hand: 'R',
    keys: [
      [0.3, { torso: [0.05, -0.95, 0], ...GS_HIGH_R, legL: [-0.3, 0, 0], legR: [0.35, 0, 0], by: -0.1 }],
      [0.46, { torso: [0.25, 0.95, 0], ...GS_SWEEP_L, ...lunge(1.2) }],
      [0.78, { torso: [0.18, 0.75, 0], ...GS_SWEEP_L, armR: [-1.05, 0, 0.75], ...lunge(0.9) }],
    ],
    hits: [{ t0: 0.34, t1: 0.5, range: 3.2, arc: 3.4, dmg: 36, poise: 30 }],
    move: [[0.22, 0.48, 1.0]], onHitShake: 0.25,
  },
  g2: {
    dur: 0.95, cost: 22, next: 'g3', combo: [0.42, 0.95], cancel: 0.56, track: 0.22, trail: [0.32, 0.5], sfx: [0.32, 'heavySwing'], hand: 'R',
    keys: [
      [0.3, { torso: [0.05, 0.95, 0], ...GS_HIGH_L, legL: [0.35, 0, 0], legR: [-0.3, 0, 0], by: -0.1 }],
      [0.46, { torso: [0.25, -0.95, 0], ...GS_SWEEP_R, legL: [0.4, 0, 0], legR: [-0.5, 0, 0], shinL: [0.45, 0, 0], by: -0.12 }],
      [0.78, { torso: [0.18, -0.75, 0], ...GS_SWEEP_R, legL: [0.3, 0, 0], legR: [-0.4, 0, 0], by: -0.08 }],
    ],
    hits: [{ t0: 0.34, t1: 0.5, range: 3.2, arc: 3.4, dmg: 38, poise: 30 }],
    move: [[0.22, 0.48, 1.0]], onHitShake: 0.25,
  },
  g3: {
    dur: 1.05, cost: 26, next: 'g1', combo: [0.5, 1.05], cancel: 0.62, track: 0.3, trail: [0.38, 0.54], sfx: [0.38, 'heavySwing'], hand: 'R', armor: [0.2, 0.5],
    keys: [
      [0.34, { torso: [-0.35, 0, 0], ...GS_OVER, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], by: -0.15 }],
      [0.5, { torso: [0.85, 0, 0], ...GS_DOWN, ...lunge(1.4), by: -0.38 }],
      [0.85, { torso: [0.7, 0, 0], ...GS_DOWN, ...lunge(1.2), by: -0.32 }],
    ],
    hits: [{ t0: 0.4, t1: 0.54, range: 3.4, arc: 1.3, dmg: 48, poise: 42 }],
    move: [[0.3, 0.5, 1.2]], onHitShake: 0.45, heavyHit: true,
    onTime: [{ t: 0.5, fn: (p, g) => { g.fx.shockwave(front(p, 2.6).x, front(p, 2.6).z, 1.8); g.fx.dust(front(p, 2.6), 8, 0.8); } }],
  },
  // heavy: a leaping two-handed slam that cracks the ground
  heavy: {
    dur: 1.4, cost: 36, next: 'g1', combo: [0.86, 1.4], cancel: 0.9, track: 0.5, trail: [0.5, 0.68], sfx: [0.5, 'heavySwing'], hand: 'R', armor: [0.2, 0.7],
    keys: [
      [0.48, { torso: [-0.5, 0, 0], ...GS_OVER, legL: [-1.0, 0, 0], shinL: [1.2, 0, 0], legR: [-0.3, 0, 0], shinR: [1.0, 0, 0], by: -0.05 }],
      [0.64, { torso: [1.0, 0, 0], ...GS_DOWN, ...crouch(1.2) }],
      [1.05, { torso: [0.85, 0, 0], ...GS_DOWN, ...crouch(1.0) }],
    ],
    hits: [{ t0: 0.56, t1: 0.7, range: 3.4, arc: 1.7, dmg: 66, poise: 60 }],
    move: [[0.2, 0.6, 2.2]], jump: [0.18, 0.6, 0.9],
    onTime: [{ t: 0.64, fn: (p, g) => { const f = front(p, 2.4); g.fx.shockwave(f.x, f.z, 3.2); g.fx.addShake(0.5); g.fx.dust(f, 14, 1.4); } }],
    onHitShake: 0.6, heavyHit: true,
  },
};
// the blade raised as a wall (Blade Guard)
export const GREAT_GUARD = { guard: 1, torso: [0.1, 0.2, 0], armR: [-1.45, 0, 0.55], foreR: [-1.35, 0, 0], handR: [0.1, 0, 0], armL: [-1.4, 0, -0.35], foreL: [-1.3, 0, 0], handL: [0.2, 0, 0], legL: [-0.4, 0, 0], legR: [0.35, 0, 0], shinL: [0.3, 0, 0], shinR: [0.4, 0, 0], by: -0.14 };
export const GREAT_GUARD_HIT = { ...GREAT_GUARD, torso: [-0.15, 0.25, 0], head: [-0.2, 0, 0], by: -0.2 };

function greatCombos(G) {
  return {
    gc2: withDmg(G.g2, [42], { cost: 24 }),
    // Dragon's Wheel: the body turns all the way round with the blade, twice
    gWheel: {
      dur: 1.05, cost: 30, comboMove: true, track: 0.1, trail: [0.12, 0.62], hand: 'R', sfx: [0.12, 'heavySwing'], cancel: 0.7, armor: [0, 0.65],
      keys: [
        [0.1, { hips: [0, -1.6, 0], torso: [0.2, -0.4, 0], ...GS_SWEEP_R, by: -0.18 }],
        [0.3, { hips: [0, 1.6, 0], torso: [0.25, 0.4, 0], ...GS_SWEEP_L, by: -0.2 }],
        [0.5, { hips: [0, 4.7, 0], torso: [0.25, 0.4, 0], ...GS_SWEEP_L, by: -0.2 }],
        [0.66, { hips: [0, 6.28, 0], torso: [0.3, 0.3, 0], ...GS_SWEEP_L, ...lunge(1) }],
        [0.9, { hips: [0, 6.28, 0], torso: [0.2, 0.2, 0], ...GS_SWEEP_L, ...lunge(0.8) }],
      ],
      hits: [{ t0: 0.14, t1: 0.34, range: 3.3, arc: 6.3, dmg: 34, poise: 15 }, { t0: 0.4, t1: 0.62, range: 3.3, arc: 6.3, dmg: 62, poise: 30 }],
      move: [[0.05, 0.6, 1.4]],
      onTime: [{ t: 0.62, fn: (p, g) => g.vfx('steelFlash', front(p, 1.5, 1.1), p.fwd().clone()) }],
      onHitShake: 0.5, heavyHit: true, finisher: "Dragon's Wheel",
    },
    // Anvil: (the slam, a rising cut) an overhead that buries the blade and throws everything near it down
    gUpper: {
      dur: 0.8, cost: 22, comboMove: true, track: 0.2, trail: [0.22, 0.38], hand: 'R', sfx: [0.22, 'heavySwing'], cancel: 0.5,
      keys: [
        [0.2, { torso: [0.6, 0, 0], ...GS_DOWN, ...crouch(1.1) }],
        [0.36, { torso: [-0.4, 0, 0], ...GS_OVER, ...lunge(1.1) }],
        [0.62, { torso: [-0.3, 0, 0], ...GS_OVER, ...lunge(0.9) }],
      ],
      hits: [{ t0: 0.24, t1: 0.38, range: 3.1, arc: 1.4, dmg: 34, poise: 34 }],
      move: [[0.18, 0.36, 0.8]],
    },
    gCrush: {
      dur: 1.2, cost: 34, comboMove: true, track: 0.3, trail: [0.42, 0.6], hand: 'R', sfx: [0.42, 'heavySwing'], cancel: 0.85, armor: [0, 0.65],
      keys: [
        [0.4, { torso: [-0.55, 0, 0], ...GS_OVER, legL: [-1.1, 0, 0], shinL: [1.3, 0, 0], legR: [-0.3, 0, 0], shinR: [1.1, 0, 0] }],
        [0.56, { torso: [1.05, 0, 0], ...GS_DOWN, ...crouch(1.3) }],
        [0.95, { torso: [0.9, 0, 0], ...GS_DOWN, ...crouch(1.1) }],
      ],
      hits: [{ t0: 0.5, t1: 0.62, range: 3.5, arc: 1.6, dmg: 90, poise: 60 }],
      move: [[0.1, 0.52, 2.0]], jump: [0.1, 0.52, 1.3],
      onTime: [{ t: 0.56, fn: (p, g) => { const f = front(p, 2.4); g.vfx('impaleSteel', f.clone().setY(0.4)); g.comboBlast({ ...p, pos: f, cmbStag: p.cmbStag }, 3.4, 30 * NUM, 40, 'fire'); g.fx.shockwave(f.x, f.z, 4); g.fx.addShake(0.7); } }],
      onHitShake: 0.7, heavyHit: true, finisher: 'Anvil',
    },
    // Struggler: (sweep, a roll in, a rising cut) a thrust that runs the whole blade through
    gRise: withDmg({ ...G.g2, keys: [[0.24, { torso: [0.5, 0.6, 0], ...GS_SWEEP_R, ...crouch(1) }], [0.4, { torso: [-0.3, -0.4, 0], ...GS_HIGH_L, ...lunge(1.1) }], [0.7, { torso: [-0.2, -0.3, 0], ...GS_HIGH_L, ...lunge(0.9) }]] }, [40], { cost: 24 }),
    gThrust: {
      dur: 0.95, cost: 28, comboMove: true, track: 0.25, trail: [0.32, 0.46], hand: 'R', sfx: [0.32, 'heavySwing'], cancel: 0.65, armor: [0.1, 0.5],
      keys: [
        [0.28, { torso: [-0.3, -0.6, 0], armR: [-1.6, 0, -0.2], foreR: [-1.6, 0, 0], handR: [1.6, 0, 0], armL: [-1.5, 0, 0.1], foreL: [-1.5, 0, 0], handL: [1.5, 0, 0], legL: [0.3, 0, 0], legR: [-0.45, 0, 0], by: -0.12 }],
        [0.4, { torso: [0.6, 0.3, 0], armR: [-1.55, 0, 0.1], foreR: [0, 0, 0], handR: [1.55, 0, 0], armL: [-1.5, 0, 0.3], foreL: [-0.1, 0, 0], handL: [1.5, 0, 0], ...lunge(1.7) }],
        [0.72, { torso: [0.5, 0.25, 0], armR: [-1.5, 0, 0.1], foreR: [-0.1, 0, 0], handR: [1.5, 0, 0], armL: [-1.45, 0, 0.3], foreL: [-0.2, 0, 0], handL: [1.45, 0, 0], ...lunge(1.4) }],
      ],
      hits: [{ t0: 0.34, t1: 0.46, range: 3.8, arc: 0.8, dmg: 96, poise: 45 }],
      move: [[0.3, 0.44, 2.2]],
      onTime: [{ t: 0.42, fn: (p, g) => g.vfx('impaleSteel', front(p, 2.0, 1.0)) }],
      onHitShake: 0.6, heavyHit: true, finisher: 'Struggler',
    },
  };
}
const GREAT_COMBOS = [
  { id: 'wheel', name: "Dragon's Wheel", desc: 'Two sweeps, then the blade carries you all the way round, twice.', steps: [[A, 'g1', 0.5], [A, 'gc2', 0.5], [A, 'gWheel']] },
  { id: 'anvil', name: 'Anvil', desc: 'The slam, a rising cut, then a leaping overhead that buries the blade and floors everything near it.', steps: [[H, 'heavy', 0.9], [A, 'gUpper', 0.44], [H, 'gCrush']] },
  { id: 'struggler', name: 'Struggler', desc: 'A sweep, a roll in, a rising cut, then a thrust that runs the whole blade through. Plays faster.', steps: [[A, 'g1', 0.5], [R, 'roll', 0.42], [A, 'gRise', 0.42], [H, 'gThrust']] },
];

// ================= THE WRIST BLADE (Shrike) =================
// one blade springing from the right bracer: punches that end in steel, the left hand guarding the face
const WB_GUARD = { armL: [-0.9, 0, 0.5], foreL: [-1.9, 0, 0], handL: [0.3, 0, 0] };
const WB_COCK = { armR: [-0.5, 0, -0.3], foreR: [-2.0, 0, 0], handR: [1.1, 0, 0] };
const WB_STAB = { armR: [-1.6, 0, -0.05], foreR: [-0.05, 0, 0], handR: [1.55, 0, 0] };
export const WRIST_ATTACKS = {
  w1: {
    dur: 0.42, cost: 10, next: 'w2', combo: [0.16, 0.42], cancel: 0.22, track: 0.08, trail: [0.08, 0.16], sfx: [0.08, 'swing'], hand: 'R',
    keys: [[0.07, { torso: [0.1, 0.45, 0], ...WB_COCK, ...WB_GUARD, legL: [-0.3, 0, 0], legR: [0.25, 0, 0] }], [0.14, { torso: [0.25, -0.35, 0], ...WB_STAB, ...WB_GUARD, ...lunge(1.1) }], [0.3, { torso: [0.2, -0.25, 0], ...WB_STAB, ...WB_GUARD, ...lunge(0.8) }]],
    hits: [{ t0: 0.1, t1: 0.17, range: 1.8, arc: 1.3, dmg: 12, poise: 6 }], move: [[0.05, 0.16, 0.55]],
  },
  w2: {
    dur: 0.46, cost: 11, next: 'w3', combo: [0.18, 0.46], cancel: 0.24, track: 0.08, trail: [0.09, 0.18], sfx: [0.09, 'swing'], hand: 'R',
    keys: [[0.08, { torso: [0.1, 0.8, 0], armR: [-1.2, 0, -1.3], foreR: [-1.3, 0, 0], handR: [1.2, 0, 0], ...WB_GUARD }], [0.16, { torso: [0.25, -0.6, 0], armR: [-1.45, 0, 0.6], foreR: [-0.4, 0, 0], handR: [1.4, 0, 0], ...WB_GUARD, ...lunge(1) }], [0.34, { torso: [0.2, -0.5, 0], armR: [-1.3, 0, 0.55], foreR: [-0.5, 0, 0], handR: [1.3, 0, 0], ...WB_GUARD, ...lunge(0.8) }]],
    hits: [{ t0: 0.11, t1: 0.19, range: 1.8, arc: 2.0, dmg: 13, poise: 7 }], move: [[0.05, 0.18, 0.5]],
  },
  w3: {
    dur: 0.55, cost: 13, next: 'w1', combo: [0.22, 0.55], cancel: 0.3, track: 0.1, trail: [0.12, 0.22], sfx: [0.12, 'swing'], hand: 'R',
    keys: [[0.1, { torso: [0.35, 0, 0], armR: [-0.3, 0, -0.2], foreR: [-1.9, 0, 0], handR: [0.4, 0, 0], ...WB_GUARD, ...crouch(0.8) }], [0.2, { torso: [-0.25, 0, 0], armR: [-2.4, 0, -0.1], foreR: [-0.2, 0, 0], handR: [1.6, 0, 0], ...WB_GUARD, ...lunge(1.1) }], [0.4, { torso: [-0.15, 0, 0], armR: [-2.2, 0, -0.1], foreR: [-0.3, 0, 0], handR: [1.5, 0, 0], ...WB_GUARD, ...lunge(0.8) }]],
    hits: [{ t0: 0.14, t1: 0.22, range: 1.9, arc: 1.2, dmg: 16, poise: 10 }], move: [[0.08, 0.2, 0.6]],
  },
  // heavy: a short, sudden jab straight from the guard
  heavy: {
    dur: 0.5, cost: 14, next: 'w2', combo: [0.22, 0.5], cancel: 0.28, track: 0.1, trail: [0.12, 0.2], sfx: [0.12, 'heavySwing'], hand: 'R',
    keys: [[0.1, { torso: [-0.05, 0.3, 0], armR: [-0.7, 0, -0.2], foreR: [-2.3, 0, 0], handR: [1.2, 0, 0], ...WB_GUARD, legL: [0.2, 0, 0], legR: [-0.2, 0, 0], by: -0.06 }], [0.16, { torso: [0.35, -0.2, 0], ...WB_STAB, ...WB_GUARD, ...lunge(1.4) }], [0.36, { torso: [0.3, -0.15, 0], ...WB_STAB, ...WB_GUARD, ...lunge(1.1) }]],
    hits: [{ t0: 0.13, t1: 0.2, range: 2.0, arc: 0.8, dmg: 27, poise: 20 }], move: [[0.1, 0.18, 0.9]], onHitShake: 0.2,
  },
};
function wristCombos(W) {
  return {
    wc2: withDmg(W.w2, [15], { cost: 12 }),
    // Silent Count: (two stabs) one up under the jaw
    wThroat: {
      dur: 0.62, cost: 18, comboMove: true, track: 0.12, trail: [0.18, 0.3], hand: 'R', sfx: [0.18, 'heavySwing'], cancel: 0.44,
      keys: [[0.14, { torso: [0.5, 0.2, 0], armR: [-0.2, 0, -0.1], foreR: [-2.2, 0, 0], handR: [0.5, 0, 0], ...WB_GUARD, ...crouch(1.1) }], [0.26, { torso: [-0.4, -0.1, 0], armR: [-2.7, 0, 0], foreR: [-0.1, 0, 0], handR: [1.7, 0, 0], armL: [-1.4, 0, 0.3], foreL: [-0.6, 0, 0], ...lunge(1.4) }], [0.48, { torso: [-0.3, -0.1, 0], armR: [-2.5, 0, 0], foreR: [-0.2, 0, 0], handR: [1.6, 0, 0], ...lunge(1.1) }]],
      hits: [{ t0: 0.22, t1: 0.32, range: 2.0, arc: 1.0, dmg: 46, poise: 24 }], move: [[0.12, 0.28, 0.9]],
      onTime: [{ t: 0.28, fn: (p, g) => g.vfx('redCrit', front(p, 1.0, 1.4)) }],
      onHitShake: 0.35, finisher: 'Silent Count',
    },
    // Shadow Hook: (a stab, a roll round) a long lunging stab out of the roll
    wLunge: {
      dur: 0.7, cost: 20, comboMove: true, track: 0.2, trail: [0.2, 0.34], hand: 'R', sfx: [0.2, 'heavySwing'], cancel: 0.5,
      keys: [[0.16, { torso: [0.3, 0.6, 0], ...WB_COCK, ...WB_GUARD, ...crouch(1.2) }], [0.3, { torso: [0.7, -0.4, 0], ...WB_STAB, armL: [-0.3, 0, 0.9], foreL: [-0.3, 0, 0], legL: [-1.0, 0, 0.05], legR: [0.8, 0, -0.05], shinL: [0.3, 0, 0], shinR: [0.6, 0, 0], by: -0.35 }], [0.54, { torso: [0.6, -0.3, 0], ...WB_STAB, armL: [-0.3, 0, 0.9], ...lunge(1.4) }]],
      hits: [{ t0: 0.26, t1: 0.36, range: 2.2, arc: 0.9, dmg: 52, poise: 28 }], move: [[0.12, 0.34, 3.0]],
      onTime: [{ t: 0.22, fn: (p, g) => g.vfx('shroud', p.pos.clone().setY(0.4)) }],
      onHitShake: 0.4, finisher: 'Shadow Hook',
    },
    // Needle Rain: (a jab, two stabs) a pinning blow that drives the blade down through the collarbone
    wc1: withDmg(W.w1, [13], { cost: 11 }),
    wc3: withDmg(W.w3, [17], { cost: 13 }),
    wPin: {
      dur: 0.82, cost: 24, comboMove: true, track: 0.25, trail: [0.3, 0.44], hand: 'R', sfx: [0.3, 'heavySwing'], cancel: 0.6,
      keys: [[0.14, { torso: [-0.3, 0, 0], armR: [-3.0, 0, -0.2], foreR: [-0.6, 0, 0], handR: [0.8, 0, 0], armL: [-1.0, 0, 0.6], legL: [-1.0, 0, 0], shinL: [1.4, 0, 0], legR: [-0.3, 0, 0], shinR: [1.2, 0, 0] }], [0.38, { torso: [0.95, 0, 0], armR: [-0.7, 0, 0.1], foreR: [-0.2, 0, 0], handR: [2.0, 0, 0], armL: [-0.5, 0, 0.8], ...crouch(1.2) }], [0.66, { torso: [0.8, 0, 0], armR: [-0.7, 0, 0.1], handR: [1.9, 0, 0], ...crouch(1.0) }]],
      hits: [{ t0: 0.34, t1: 0.46, range: 2.1, arc: 1.2, dmg: 66, poise: 35 }], move: [[0.05, 0.38, 2.0]], jump: [0.05, 0.38, 1.2],
      onTime: [{ t: 0.4, fn: (p, g) => g.vfx('redCrit', front(p, 1.0, 0.8)) }],
      onHitShake: 0.55, heavyHit: true, finisher: 'Needle Rain',
    },
  };
}
const WRIST_COMBOS = [
  { id: 'count', name: 'Silent Count', desc: 'Two stabs, then one up under the jaw.', steps: [[A, 'w1', 0.17], [A, 'wc2', 0.19], [A, 'wThroat']] },
  { id: 'hook', name: 'Shadow Hook', desc: 'A stab, a roll round, then a long lunging stab out of the roll.', steps: [[A, 'w1', 0.17], [R, 'roll', 0.32], [H, 'wLunge']] },
  { id: 'needle', name: 'Needle Rain', desc: 'A jab, two stabs, then a leap that drives the blade down. Plays faster.', steps: [[H, 'heavy', 0.22], [A, 'wc1', 0.17], [A, 'wc3', 0.22], [H, 'wPin']] },
];
// the dash (the Wrist Blade's special): short, very fast, untouchable throughout
export const DASH = { dur: 0.2, dist: 3.6, cd: 3, cost: 8 };
export const VEIL = { dur: 5, backstab: 3 };

// ================= THE PSY-STAFF (Adept) =================
// held in both hands: reaching sweeps and thrusts; the heavy throws a lash of lightning from the focus
const ST_HOLD_R = { armR: [-1.0, 0, -0.5], foreR: [-0.9, 0, 0], handR: [1.0, 0, 0], armL: [-1.1, 0, -0.1], foreL: [-1.2, 0, 0], handL: [0.8, 0, 0] };
const ST_SWEEP_L = { armR: [-1.4, 0, 0.9], foreR: [-0.2, 0, 0], handR: [1.4, 0, 0], armL: [-1.1, 0, 1.0], foreL: [-0.6, 0, 0], handL: [1.1, 0, 0] };
const ST_SWEEP_R = { armR: [-1.3, 0, -1.0], foreR: [-0.2, 0, 0], handR: [1.4, 0, 0], armL: [-1.2, 0, -0.6], foreL: [-0.7, 0, 0], handL: [1.1, 0, 0] };
const ST_THRUST = { armR: [-1.55, 0, 0.05], foreR: [0, 0, 0], handR: [1.55, 0, 0], armL: [-1.3, 0, 0.3], foreL: [-0.6, 0, 0], handL: [1.3, 0, 0] };
export const STAFF_ATTACKS = {
  t1: {
    dur: 0.6, cost: 14, next: 't2', combo: [0.24, 0.6], cancel: 0.32, track: 0.12, trail: [0.12, 0.26], sfx: [0.12, 'swing'], hand: 'R',
    keys: [[0.1, { torso: [0.05, -0.7, 0], ...ST_SWEEP_R, legL: [-0.25, 0, 0], legR: [0.25, 0, 0] }], [0.22, { torso: [0.2, 0.7, 0], ...ST_SWEEP_L, ...lunge(1) }], [0.44, { torso: [0.15, 0.5, 0], ...ST_SWEEP_L, ...lunge(0.8) }]],
    hits: [{ t0: 0.14, t1: 0.26, range: 2.8, arc: 2.6, dmg: 13, poise: 9 }], move: [[0.06, 0.24, 0.6]],
  },
  t2: {
    dur: 0.62, cost: 15, next: 't3', combo: [0.25, 0.62], cancel: 0.34, track: 0.12, trail: [0.13, 0.27], sfx: [0.13, 'swing'], hand: 'R',
    keys: [[0.1, { torso: [0.05, 0.7, 0], ...ST_SWEEP_L, legL: [0.25, 0, 0], legR: [-0.25, 0, 0] }], [0.23, { torso: [0.2, -0.7, 0], ...ST_SWEEP_R, legL: [0.35, 0, 0], legR: [-0.45, 0, 0], by: -0.1 }], [0.46, { torso: [0.15, -0.5, 0], ...ST_SWEEP_R, by: -0.06 }]],
    hits: [{ t0: 0.15, t1: 0.27, range: 2.8, arc: 2.6, dmg: 14, poise: 9 }], move: [[0.06, 0.24, 0.6]],
  },
  t3: {
    dur: 0.66, cost: 16, next: 't1', combo: [0.28, 0.66], cancel: 0.38, track: 0.16, trail: [0.16, 0.28], sfx: [0.16, 'swing'], hand: 'R',
    keys: [[0.12, { torso: [-0.1, -0.5, 0], ...ST_HOLD_R, foreR: [-1.6, 0, 0], legL: [0.3, 0, 0], legR: [-0.4, 0, 0] }], [0.24, { torso: [0.5, 0.25, 0], ...ST_THRUST, ...lunge(1.4) }], [0.5, { torso: [0.4, 0.2, 0], ...ST_THRUST, ...lunge(1.1) }]],
    hits: [{ t0: 0.18, t1: 0.29, range: 3.1, arc: 0.9, dmg: 18, poise: 12 }], move: [[0.1, 0.26, 0.9]],
  },
  // heavy: Arc Lash, a cone of lightning off the focus (10 mana)
  heavy: {
    dur: 0.7, cost: 12, mana: 10, next: 't1', combo: [0.36, 0.7], cancel: 0.4, track: 0.2, sfx: [0.24, 'fire'], hand: 'R',
    keys: [[0.18, { torso: [-0.2, -0.4, 0], armR: [-2.6, 0, -0.3], foreR: [-0.3, 0, 0], handR: [1.3, 0, 0], armL: [-2.2, 0, 0.1], foreL: [-0.5, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0] }], [0.28, { torso: [0.45, 0.1, 0], ...ST_THRUST, ...lunge(1.2) }], [0.56, { torso: [0.35, 0.1, 0], ...ST_THRUST, ...lunge(0.9) }]],
    hits: [{ t0: 0.26, t1: 0.36, range: 4.2, arc: 1.3, dmg: 24, poise: 14 }], convert: { frost: 0.5 },
    onTime: [{ t: 0.27, fn: (p, g) => g.vfx('lanceFan', front(p, 1.6, 1.2)) }],
  },
};
function staffCombos(S) {
  return {
    tc2: withDmg(S.t2, [16], { cost: 16 }),
    // Rising Staff: (two sweeps) a vault on the staff and a slam with the focus
    tVault: {
      dur: 0.86, cost: 22, comboMove: true, track: 0.25, trail: [0.32, 0.46], hand: 'R', sfx: [0.32, 'heavySwing'], cancel: 0.6,
      keys: [[0.14, { torso: [0.3, 0, 0], ...ST_THRUST, armR: [-0.6, 0, 0.1], handR: [2.2, 0, 0], legL: [-1.0, 0, 0], shinL: [1.3, 0, 0], legR: [-0.4, 0, 0], shinR: [1.1, 0, 0] }], [0.38, { torso: [0.9, 0, 0], armR: [-0.8, 0, 0.1], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.8, 0, 0.2], foreL: [-0.1, 0, 0], handL: [1.4, 0, 0], ...crouch(1.2) }], [0.66, { torso: [0.7, 0, 0], armR: [-0.8, 0, 0.1], handR: [1.5, 0, 0], armL: [-0.8, 0, 0.2], ...crouch(1.0) }]],
      hits: [{ t0: 0.34, t1: 0.46, range: 2.8, arc: 1.6, dmg: 30, poise: 26 }], move: [[0.04, 0.38, 2.0]], jump: [0.04, 0.38, 1.3],
      onTime: [{ t: 0.4, fn: (p, g) => { g.vfx('frostNova', front(p, 1.6, 0.1)); g.comboBlast({ ...p, pos: front(p, 1.6), cmbStag: p.cmbStag }, 2.6, 22 * NUM, 16, 'frost'); } }],
      onHitShake: 0.45, finisher: 'Rising Staff',
    },
    // Arc Sweep: (a sweep, a roll) the staff whirled all the way round
    tSpin: {
      dur: 0.8, cost: 20, comboMove: true, track: 0.08, trail: [0.08, 0.5], hand: 'R', sfx: [0.08, 'heavySwing'], cancel: 0.56,
      keys: [[0.08, { hips: [0, -1.4, 0], torso: [0.15, -0.3, 0], ...ST_SWEEP_R, by: -0.15 }], [0.26, { hips: [0, 1.6, 0], torso: [0.2, 0.3, 0], ...ST_SWEEP_L, by: -0.16 }], [0.46, { hips: [0, 6.28, 0], torso: [0.25, 0.2, 0], ...ST_SWEEP_L, ...lunge(1) }], [0.66, { hips: [0, 6.28, 0], ...ST_SWEEP_L, ...lunge(0.7) }]],
      hits: [{ t0: 0.1, t1: 0.28, range: 2.9, arc: 6.3, dmg: 18, poise: 10 }, { t0: 0.3, t1: 0.48, range: 2.9, arc: 6.3, dmg: 30, poise: 18 }], move: [[0.05, 0.46, 0.8]],
      onTime: [{ t: 0.46, fn: (p, g) => g.vfx('xSlash', front(p, 1.2, 1.1), p.fwd().clone(), false) }],
      finisher: 'Arc Sweep',
    },
    // Thunderhead: (the lash, a sweep) lightning breaks round you (14 mana)
    tc1: withDmg(S.t1, [14], { cost: 14 }),
    tStorm: {
      dur: 0.82, cost: 20, mana: 14, comboMove: true, track: 0.1, sfx: [0.3, 'fire'], hand: 'R', cancel: 0.56,
      keys: [[0.24, { torso: [-0.3, 0, 0], armR: [-3.0, 0, -0.2], foreR: [-0.2, 0, 0], handR: [1.4, 0, 0], armL: [-2.9, 0, 0.2], foreL: [-0.2, 0, 0], handL: [1.4, 0, 0], ...lunge(0.4) }], [0.36, { torso: [0.4, 0, 0], armR: [-0.4, 0, -0.6], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.4, 0, 0.6], ...crouch(1.1) }], [0.62, { torso: [0.3, 0, 0], armR: [-0.5, 0, -0.5], armL: [-0.5, 0, 0.5], ...crouch(0.8) }]],
      onTime: [{ t: 0.34, fn: (p, g) => { g.vfx('frostNova', p.pos.clone().setY(0.1)); g.comboBlast(p, 3.6, 40 * NUM, 22, 'frost'); g.fx.addShake(0.4); } }],
      finisher: 'Thunderhead',
    },
  };
}
const STAFF_COMBOS = [
  { id: 'vault', name: 'Rising Staff', desc: 'Two sweeps, then a vault on the staff and a slam that bursts into frost.', steps: [[A, 't1', 0.27], [A, 'tc2', 0.28], [A, 'tVault']] },
  { id: 'arc', name: 'Arc Sweep', desc: 'A sweep, a roll, then the staff whirled all the way round.', steps: [[A, 't1', 0.27], [R, 'roll', 0.38], [A, 'tSpin']] },
  { id: 'thunder', name: 'Thunderhead', desc: 'The lash, a sweep, then lightning breaks all round you (14 mana).', steps: [[H, 'heavy', 0.38], [A, 'tc1', 0.27], [H, 'tStorm']] },
];
export const SIGIL = { mana: 35, dur: 6, r: 3.4, slow: 0.5, zapEvery: 0.6 };

// a region weapon's class overrides (player.js weaponChar adds the combos)
export const WEAPON_SETS = {
  greatsword: { style: 'slab', attacks: GREAT_ATTACKS, extra: greatCombos, light: 'g1', combos: GREAT_COMBOS, special: 'guard', dual: false, trail: 0xcfd4dc, model: { weapon: 'greatsword', shield: false } },
  wristblade: { style: 'wrist', attacks: WRIST_ATTACKS, extra: wristCombos, light: 'w1', combos: WRIST_COMBOS, special: 'dash', dual: false, trail: 0xff7a5a, model: { weapon: 'wristblade' } },
  psystaff: { style: 'staff', attacks: STAFF_ATTACKS, extra: staffCombos, light: 't1', combos: STAFF_COMBOS, special: 'sigil', dual: false, boltHeavy: false, trail: 0xc890ff, model: { weapon: 'psystaff' } },
};
