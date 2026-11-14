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
const GS_SWEEP_L = { armR: [-1.35, 0, 0.95], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-1.25, 0, 1.2], foreL: [-0.3, 0, 0], handL: [1.2, 0, 0] };
const GS_HIGH_L = { armR: [-1.75, 0, 0.9], foreR: [-0.5, 0, 0], handR: [1.2, 0, 0], armL: [-1.7, 0, 1.3], foreL: [-0.3, 0, 0], handL: [1.1, 0, 0] };
const GS_SWEEP_R = { armR: [-1.35, 0, 0.15], foreR: [-0.45, 0, 0], handR: [1.3, 0, 0], armL: [-1.2, 0, -0.8], foreL: [-0.5, 0, 0], handL: [1.2, 0, 0] };
const GS_OVER = { armR: [-3.0, 0, 0.4], foreR: [-0.8, 0, 0], handR: [0.7, 0, 0], armL: [-2.9, 0, 0.15], foreL: [-0.9, 0, 0], handL: [0.7, 0, 0] };
const GS_DOWN = { armR: [-0.75, 0, 0.1], foreR: [-0.05, 0, 0], handR: [1.45, 0, 0], armL: [-0.8, 0, 0.25], foreL: [-0.1, 0, 0], handL: [1.4, 0, 0] };
// the slab resting on the right shoulder (its stance, anims.js slab)
const GS_SHOULDER = { armR: [-0.9, 0, -0.35], foreR: [-1.9, 0, 0], handR: [0.3, 0, 0], armL: [-1.2, 0, -0.3], foreL: [-1.3, 0, 0], handL: [0.6, 0, 0] };
// the second swing, before it was made slower and heavier: Struggler's rising cut keeps this shape (gRise)
const G2_QUICK = { dur: 0.95, cost: 22, next: 'g3', combo: [0.42, 0.95], cancel: 0.56, track: 0.22, trail: [0.32, 0.5], sfx: [0.32, 'heavySwing'], hand: 'R', hits: [{ t0: 0.34, t1: 0.5, range: 3.2, arc: 3.4, dmg: 38, poise: 30 }], move: [[0.22, 0.48, 1.0]], onHitShake: 0.25 };
// the light chain's key poses, each solved for where the right hand is and which way the blade points (the left
// hand closes on the hilt by itself: models.js solveGrip); character frame: +z ahead, +x his left
const GS_HI_RIGHT = { armR: [-1.31, 0.15, 0.23], foreR: [-1.72, 0, 0], handR: [1.02, 0, 0.57] };  // up over the right shoulder, the point back
const GS_LOW_MID = { armR: [-0.02, 0.29, 0.98], foreR: [-1.74, 0, 0], handR: [1.41, 0, -0.84] };  // low in front, the point down at the middle
const GS_LOW_LEFT = { armR: [0.12, -0.53, 1.2], foreR: [0.02, 0, 0], handR: [1.83, 0, -0.04] };   // drawn back by the left hip, flat
const GS_FLAT_FRONT = { armR: [-0.29, 0.01, 0.82], foreR: [-1.48, 0, 0], handR: [1.47, 0, -0.37] }; // waist high, the blade straight out
const GS_FLAT_RIGHT = { armR: [-0.2, -0.31, 0.89], foreR: [-1.32, 0, 0], handR: [1.44, 0, 0.42] };  // carried through, out to the right
const GS_OVERHEAD = { armR: [-1.95, 0.08, 0.38], foreR: [-0.83, 0, 0], handR: [0.61, 0, 0.85] };    // raised over the head, the point back
const GS_CHOP_DOWN = { armR: [-0.11, 0.54, 1.07], foreR: [-2.11, 0, 0], handR: [1.52, 0, -0.61] };  // down the middle, the point to the floor
export const GREAT_ATTACKS = {
  // an angled chop: up over the right shoulder, then down and in across the body to the middle, the point low
  g1: {
    dur: 0.95, cost: 22, next: 'g2', combo: [0.42, 0.95], cancel: 0.56, track: 0.22, trail: [0.32, 0.5], sfx: [0.32, 'heavySwing'], hand: 'R',
    keys: [
      [0.12, { torso: [-0.05, -0.35, 0], ...GS_SHOULDER, legL: [-0.2, 0, 0], legR: [0.25, 0, 0], by: -0.06 }],
      [0.27, { torso: [-0.3, -0.6, 0], head: [-0.1, 0.35, 0], ...GS_HI_RIGHT, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], shinR: [0.3, 0, 0], by: -0.06 }],
      [0.42, { torso: [0.85, 0.35, 0], head: [0.15, -0.2, 0], ...GS_LOW_MID, ...crouch(1.15), by: -0.3 }],
      [0.78, { torso: [0.75, 0.3, 0], ...GS_LOW_MID, ...crouch(1.0), by: -0.26 }],
    ],
    hits: [{ t0: 0.34, t1: 0.5, range: 3.2, arc: 3.4, dmg: 36, poise: 30 }],
    move: [[0.22, 0.48, 1.0]], onHitShake: 0.25,
  },
  // back the other way, flat: the blade's weight drags him down, he draws it back by his left hip with both hands
  // and hauls it level across to the right, stumbling a step after it. Slow, and it hits harder for it
  g2: {
    dur: 1.25, cost: 24, next: 'g3', combo: [0.68, 1.25], cancel: 0.82, track: 0.4, trail: [0.54, 0.74], sfx: [0.54, 'heavySwing'], hand: 'R',
    keys: [
      [0.04, { torso: [0.85, 0.35, 0], ...GS_LOW_MID, ...crouch(1.15), by: -0.3 }], // (where the chop left it)
      [0.2, { torso: [0.9, 0.4, 0], head: [0.1, -0.2, 0], ...GS_LOW_MID, ...crouch(1.3), by: -0.38 }],
      [0.38, { torso: [0.5, 0.75, 0], head: [0, -0.45, 0], ...GS_LOW_LEFT, legL: [0.45, 0, 0.1], legR: [-0.6, 0, -0.1], shinL: [0.55, 0, 0], shinR: [0.6, 0, 0], by: -0.35 }],
      [0.54, { torso: [0.3, 0, 0], ...GS_FLAT_FRONT, ...lunge(1.2), by: -0.22 }],
      [0.66, { torso: [0.3, -0.95, 0], head: [0, 0.45, 0], ...GS_FLAT_RIGHT, ...lunge(1.45), by: -0.24 }],
      [1.05, { torso: [0.35, -0.75, 0], ...GS_FLAT_RIGHT, ...lunge(1.1), by: -0.16 }],
    ],
    hits: [{ t0: 0.56, t1: 0.74, range: 3.2, arc: 3.4, dmg: 54, poise: 42 }],
    move: [[0.46, 0.72, 1.2]], onHitShake: 0.45, heavyHit: true,
  },
  // and down: hauled up over the head and brought straight down the middle, burying the point
  g3: {
    dur: 1.05, cost: 26, next: 'g1', combo: [0.5, 1.05], cancel: 0.62, track: 0.3, trail: [0.38, 0.54], sfx: [0.38, 'heavySwing'], hand: 'R', armor: [0.2, 0.5],
    keys: [
      [0.04, { torso: [0.3, -0.85, 0], ...GS_FLAT_RIGHT, ...lunge(1.2), by: -0.18 }], // (where the pull left it)
      [0.16, { torso: [0.05, -0.55, 0], ...GS_FLAT_RIGHT, legL: [-0.3, 0, 0], legR: [0.3, 0, 0], by: -0.12 }],
      [0.34, { torso: [-0.4, 0, 0], head: [-0.15, 0, 0], ...GS_OVERHEAD, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], by: -0.08 }],
      [0.5, { torso: [0.85, 0, 0], head: [0.2, 0, 0], ...GS_CHOP_DOWN, ...lunge(1.4), by: -0.38 }],
      [0.85, { torso: [0.72, 0, 0], ...GS_CHOP_DOWN, ...lunge(1.2), by: -0.32 }],
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
export const GREAT_GUARD = { guard: 1, grip: 1, torso: [0.1, 0.2, 0], armR: [-1.45, 0, 0.55], foreR: [-1.35, 0, 0], handR: [0.1, 0, 0], armL: [-1.4, 0, -0.35], foreL: [-1.3, 0, 0], handL: [0.2, 0, 0], legL: [-0.4, 0, 0], legR: [0.35, 0, 0], shinL: [0.3, 0, 0], shinR: [0.4, 0, 0], by: -0.14 };
export const GREAT_GUARD_HIT = { ...GREAT_GUARD, torso: [-0.15, 0.25, 0], head: [-0.2, 0, 0], by: -0.2 };

function greatCombos(G) {
  return {
    gc2: withDmg(G.g2, [58], { cost: 26 }),
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
    gRise: withDmg({ ...G2_QUICK, keys: [[0.24, { torso: [0.5, 0.6, 0], ...GS_SWEEP_R, ...crouch(1) }], [0.4, { torso: [-0.3, -0.4, 0], ...GS_HIGH_L, ...lunge(1.1) }], [0.7, { torso: [-0.2, -0.3, 0], ...GS_HIGH_L, ...lunge(0.9) }]] }, [40], { cost: 24 }),
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

// ================= THE WRIST BLADES (Shrike) =================
// a blade along each forearm, out past the fist (playerkits.js): he fights like a boxer, and every punch is a stab.
// Poses: the forearm's line is the blade's, so a straight arm drives the point straight out
const WB_GUARD_L = { armL: [-0.55, 0, 0.2], foreL: [-1.15, 0, 0], handL: [0.2, 0, 0] };   // lead hand up, blade forward
const WB_GUARD_R = { armR: [-0.25, 0, -0.25], foreR: [-1.35, 0, 0], handR: [0.2, 0, 0] }; // rear hand by the ribs
const WB_CHAMBER_R = { armR: [0.15, 0, -0.3], foreR: [-1.75, 0, 0], handR: [0.3, 0, 0] }; // fist pulled back to the hip
const WB_CHAMBER_L = { armL: [0.15, 0, 0.3], foreL: [-1.75, 0, 0], handL: [0.3, 0, 0] };
const WB_JAB_R = { armR: [-1.55, 0, 0.12], foreR: [-0.05, 0, 0], handR: [0.1, 0, 0] };     // arm straight out: the point in
const WB_JAB_L = { armL: [-1.55, 0, -0.12], foreL: [-0.05, 0, 0], handL: [0.1, 0, 0] };
export const WRIST_ATTACKS = {
  // a right straight from the hip
  w1: {
    dur: 0.42, cost: 10, next: 'w2', combo: [0.16, 0.42], cancel: 0.22, track: 0.08, trail: [0.08, 0.16], sfx: [0.08, 'swing'], hand: 'R',
    keys: [[0.07, { torso: [0.1, -0.4, 0], ...WB_CHAMBER_R, ...WB_GUARD_L, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], by: -0.06 }],
      [0.14, { torso: [0.25, 0.55, 0], ...WB_JAB_R, ...WB_GUARD_L, ...lunge(1.1) }],
      [0.3, { torso: [0.2, 0.35, 0], armR: [-1.25, 0, 0], foreR: [-0.55, 0, 0], ...WB_GUARD_L, ...lunge(0.8) }]],
    hits: [{ t0: 0.1, t1: 0.17, range: 1.8, arc: 1.3, dmg: 12, poise: 6 }], move: [[0.05, 0.16, 0.55]],
  },
  // a left hook: the arm swings round flat, the blade raking across
  w2: {
    dur: 0.46, cost: 11, next: 'w3', combo: [0.18, 0.46], cancel: 0.24, track: 0.08, trail: [0.09, 0.18], sfx: [0.09, 'swing'], hand: 'L',
    keys: [[0.08, { torso: [0.1, 0.5, 0], armL: [-0.7, 0, 1.05], foreL: [-1.25, 0, 0], handL: [0.2, 0, 0], ...WB_GUARD_R, legL: [0.25, 0, 0], legR: [-0.2, 0, 0] }],
      [0.16, { torso: [0.25, -0.6, 0], armL: [-1.5, 0, -0.3], foreL: [-0.55, 0, 0], handL: [0.2, 0, 0], ...WB_GUARD_R, legL: [0.35, 0, 0], legR: [-0.45, 0, 0], shinL: [0.35, 0, 0], by: -0.1 }],
      [0.34, { torso: [0.2, -0.45, 0], armL: [-1.35, 0, -0.45], foreL: [-0.7, 0, 0], ...WB_GUARD_R, legL: [0.25, 0, 0], legR: [-0.35, 0, 0], by: -0.08 }]],
    hits: [{ t0: 0.11, t1: 0.19, range: 1.8, arc: 2.0, dmg: 13, poise: 7 }], move: [[0.05, 0.18, 0.5]],
  },
  // down low, then up under the ribs: a rising right stab
  w3: {
    dur: 0.55, cost: 13, next: 'w1', combo: [0.22, 0.55], cancel: 0.3, track: 0.1, trail: [0.12, 0.22], sfx: [0.12, 'swing'], hand: 'R',
    keys: [[0.1, { torso: [0.4, -0.25, 0], armR: [0.25, 0, -0.2], foreR: [-1.2, 0, 0], ...WB_GUARD_L, ...crouch(0.9) }],
      [0.2, { torso: [-0.2, 0.3, 0], armR: [-2.05, 0, 0.05], foreR: [-0.25, 0, 0], handR: [0.3, 0, 0], ...WB_GUARD_L, ...lunge(1.1) }],
      [0.4, { torso: [-0.12, 0.2, 0], armR: [-1.85, 0, 0.05], foreR: [-0.45, 0, 0], ...WB_GUARD_L, ...lunge(0.8) }]],
    hits: [{ t0: 0.14, t1: 0.22, range: 1.9, arc: 1.2, dmg: 16, poise: 10 }], move: [[0.08, 0.2, 0.6]],
  },
  // heavy: both fists back to the hips, then both blades driven in together
  heavy: {
    dur: 0.5, cost: 14, next: 'w2', combo: [0.22, 0.5], cancel: 0.28, track: 0.1, trail: [0.12, 0.2], sfx: [0.12, 'heavySwing'], hand: 'B',
    keys: [[0.1, { torso: [-0.1, 0, 0], ...WB_CHAMBER_R, ...WB_CHAMBER_L, legL: [0.2, 0, 0], legR: [-0.2, 0, 0], by: -0.1 }],
      [0.16, { torso: [0.4, 0, 0], armR: [-1.45, 0, 0.2], foreR: [0, 0, 0], armL: [-1.45, 0, -0.2], foreL: [0, 0, 0], ...lunge(1.4) }],
      [0.36, { torso: [0.32, 0, 0], armR: [-1.35, 0, 0.2], foreR: [-0.2, 0, 0], armL: [-1.35, 0, -0.2], foreL: [-0.2, 0, 0], ...lunge(1.1) }]],
    hits: [{ t0: 0.13, t1: 0.2, range: 2.0, arc: 0.8, dmg: 27, poise: 20 }], move: [[0.1, 0.18, 0.9]], onHitShake: 0.2,
  },
  // out of the Ghost Veil: the arm shoved in to the elbow, held, and ripped out (always a backstab: player.js, main.js)
  wRip: {
    dur: 0.9, cost: 10, next: 'w2', combo: [0.62, 0.9], cancel: 0.64, track: 0.12, trail: [0.2, 0.3], sfx: [0.2, 'heavySwing'], hand: 'R',
    keys: [[0.16, { torso: [0.15, -0.6, 0], head: [0.1, 0.4, 0], armR: [0.4, 0, -0.35], foreR: [-1.6, 0, 0], armL: [-1.3, 0, 0.35], foreL: [-0.5, 0, 0], handL: [0.6, 0, 0], legL: [-0.4, 0, 0], legR: [0.35, 0, 0], shinR: [0.4, 0, 0], by: -0.12 }],
      [0.28, { torso: [0.55, 0.45, 0], head: [-0.2, -0.3, 0], armR: [-1.4, 0, 0.25], foreR: [0, 0, 0], armL: [-1.45, 0, -0.1], foreL: [-0.9, 0, 0], ...lunge(1.4), by: -0.2 }],
      [0.44, { torso: [0.6, 0.5, -0.1], head: [-0.2, -0.3, 0], armR: [-1.35, 0.4, 0.3], foreR: [-0.1, 0, 0], armL: [-1.45, 0, -0.1], foreL: [-0.9, 0, 0], ...lunge(1.4), by: -0.22 }],
      [0.58, { torso: [-0.2, -0.75, 0.1], head: [0.1, 0.3, 0], armR: [-0.4, 0, -1.2], foreR: [-1.0, 0, 0], armL: [-1.1, 0, 0.5], foreL: [-0.6, 0, 0], legL: [0.2, 0, 0], legR: [-0.3, 0, 0], by: -0.08 }],
      [0.78, { torso: [0.12, -0.3, 0], ...WB_GUARD_R, ...WB_GUARD_L }]],
    hits: [{ t0: 0.24, t1: 0.32, range: 1.9, arc: 1.4, dmg: 12, poise: 30 }], move: [[0.04, 0.24, 0.9]], onHitShake: 0.4,
    onTime: [
      { t: 0.28, fn: (p, g) => g.vfx('redCrit', front(p, 0.9, 1.15)) },
      // the rip: blood thrown back the way the arm comes out
      { t: 0.52, fn: (p, g) => g.vfx('xSlash', front(p, 0.9, 1.15), p.fwd().clone().negate(), true) },
    ],
  },
};
function wristCombos(W) {
  return {
    wc2: withDmg(W.w2, [15], { cost: 12 }),
    // Silent Count: (two stabs) a crouch, then an uppercut that drives the right blade up under the jaw
    wThroat: {
      dur: 0.62, cost: 18, comboMove: true, track: 0.12, trail: [0.18, 0.3], hand: 'R', sfx: [0.18, 'heavySwing'], cancel: 0.44,
      keys: [[0.14, { torso: [0.55, -0.3, 0], armR: [0.35, 0, -0.25], foreR: [-1.1, 0, 0], ...WB_GUARD_L, ...crouch(1.2) }],
        [0.26, { torso: [-0.4, 0.25, 0], head: [-0.25, 0, 0], armR: [-2.45, 0, 0.05], foreR: [-0.45, 0, 0], armL: [-1.0, 0, 0.5], foreL: [-1.3, 0, 0], ...lunge(1.4), by: 0.02 }],
        [0.48, { torso: [-0.3, 0.2, 0], armR: [-2.3, 0, 0.05], foreR: [-0.55, 0, 0], armL: [-1.0, 0, 0.5], foreL: [-1.3, 0, 0], ...lunge(1.1) }]],
      hits: [{ t0: 0.22, t1: 0.32, range: 2.0, arc: 1.0, dmg: 46, poise: 24 }], move: [[0.12, 0.28, 0.9]],
      onTime: [{ t: 0.28, fn: (p, g) => g.vfx('redCrit', front(p, 1.0, 1.4)) }],
      onHitShake: 0.35, finisher: 'Silent Count',
    },
    // Shadow Hook: (a stab, a roll round) a long lunge, right arm and blade flat out, the left flung back
    wLunge: {
      dur: 0.7, cost: 20, comboMove: true, track: 0.2, trail: [0.2, 0.34], hand: 'R', sfx: [0.2, 'heavySwing'], cancel: 0.5,
      keys: [[0.16, { torso: [0.35, -0.6, 0], ...WB_CHAMBER_R, ...WB_GUARD_L, ...crouch(1.2) }],
        [0.3, { torso: [0.75, 0.45, 0], ...WB_JAB_R, armL: [0.7, 0, 0.45], foreL: [-0.4, 0, 0], legL: [-1.05, 0, 0.05], legR: [0.85, 0, -0.05], shinL: [0.35, 0, 0], shinR: [0.55, 0, 0], by: -0.38 }],
        [0.54, { torso: [0.65, 0.35, 0], ...WB_JAB_R, armL: [0.6, 0, 0.45], foreL: [-0.4, 0, 0], ...lunge(1.4) }]],
      hits: [{ t0: 0.26, t1: 0.36, range: 2.2, arc: 0.9, dmg: 52, poise: 28 }], move: [[0.12, 0.34, 3.0]],
      onTime: [{ t: 0.22, fn: (p, g) => g.vfx('shroud', p.pos.clone().setY(0.4)) }],
      onHitShake: 0.4, finisher: 'Shadow Hook',
    },
    // Needle Rain: (a jab, two stabs) a pinning blow that drives the blade down through the collarbone
    wc1: withDmg(W.w1, [13], { cost: 11 }),
    wc3: withDmg(W.w3, [17], { cost: 13 }),
    wPin: {
      // a leap with both blades raised, driven down together as he lands
      dur: 0.82, cost: 24, comboMove: true, track: 0.25, trail: [0.3, 0.44], hand: 'B', sfx: [0.3, 'heavySwing'], cancel: 0.6,
      keys: [[0.14, { torso: [-0.3, 0, 0], armR: [-2.85, 0, -0.2], foreR: [-0.35, 0, 0], armL: [-2.85, 0, 0.2], foreL: [-0.35, 0, 0], legL: [-1.0, 0, 0], shinL: [1.4, 0, 0], legR: [-0.3, 0, 0], shinR: [1.2, 0, 0] }],
        [0.38, { torso: [0.95, 0, 0], armR: [-0.75, 0, 0.15], foreR: [0, 0, 0], armL: [-0.75, 0, -0.15], foreL: [0, 0, 0], ...crouch(1.25) }],
        [0.66, { torso: [0.8, 0, 0], armR: [-0.8, 0, 0.15], foreR: [-0.1, 0, 0], armL: [-0.8, 0, -0.15], foreL: [-0.1, 0, 0], ...crouch(1.0) }]],
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
// a quarterstaff in both hands (the left closes on the shaft: models.js FEEL psystaff), the focus end leading:
// whipped down across, whipped back up, run through in a thrust; the heavy levels it like a lance and fires
const ST_HOLD_R = { armR: [-1.0, 0, 0.1], foreR: [-0.9, 0, 0], handR: [1.0, 0, 0], armL: [-1.1, 0, -0.1], foreL: [-1.2, 0, 0], handL: [0.8, 0, 0] };
const ST_HIGH_R = { armR: [-2.2, 0, 0.15], foreR: [-0.6, 0, 0], handR: [1.0, 0, 0] };
const ST_SWEEP_L = { armR: [-1.15, 0, 0.75], foreR: [-0.2, 0, 0], handR: [1.4, 0, 0], armL: [-1.1, 0, 1.0], foreL: [-0.6, 0, 0], handL: [1.1, 0, 0] };
const ST_LOW_L = { armR: [-0.65, 0, 0.6], foreR: [-0.3, 0, 0], handR: [1.6, 0, 0] };
const ST_SWEEP_R = { armR: [-1.9, 0, -0.1], foreR: [-0.4, 0, 0], handR: [0.7, 0, 0], armL: [-1.2, 0, -0.6], foreL: [-0.7, 0, 0], handL: [1.1, 0, 0] };
const ST_THRUST = { armR: [-1.55, 0, 0.05], foreR: [0, 0, 0], handR: [1.55, 0, 0], armL: [-1.3, 0, 0.3], foreL: [-0.6, 0, 0], handL: [1.3, 0, 0] };
const ST_LEVEL = { armR: [-1.35, 0, -0.15], foreR: [-0.35, 0, 0], handR: [1.7, 0, 0] }; // the staff levelled at chest height, aimed down its length
export const STAFF_ATTACKS = {
  t1: {
    dur: 0.6, cost: 14, next: 't2', combo: [0.24, 0.6], cancel: 0.32, track: 0.12, trail: [0.12, 0.26], sfx: [0.12, 'swing'], hand: 'R',
    keys: [[0.1, { torso: [-0.1, -0.75, 0], head: [0, 0.35, 0], ...ST_HIGH_R, legL: [-0.25, 0, 0], legR: [0.3, 0, 0] }],
      [0.22, { torso: [0.4, 0.7, 0], ...ST_SWEEP_L, ...lunge(1.1) }],
      [0.44, { torso: [0.45, 0.6, 0], ...ST_LOW_L, ...lunge(0.9) }]],
    hits: [{ t0: 0.14, t1: 0.26, range: 2.8, arc: 2.6, dmg: 13, poise: 9 }], move: [[0.06, 0.24, 0.6]],
  },
  t2: {
    dur: 0.62, cost: 15, next: 't3', combo: [0.25, 0.62], cancel: 0.34, track: 0.12, trail: [0.13, 0.27], sfx: [0.13, 'swing'], hand: 'R',
    keys: [[0.1, { torso: [0.45, 0.65, 0], ...ST_LOW_L, legL: [0.25, 0, 0], legR: [-0.25, 0, 0], by: -0.12 }],
      [0.23, { torso: [-0.1, -0.8, 0], head: [0, 0.3, 0], ...ST_SWEEP_R, legL: [0.35, 0, 0], legR: [-0.45, 0, 0], shinL: [0.3, 0, 0], by: -0.06 }],
      [0.46, { torso: [0, -0.6, 0], ...ST_SWEEP_R, armR: [-1.7, 0, -0.05], by: -0.04 }]],
    hits: [{ t0: 0.15, t1: 0.27, range: 2.8, arc: 2.6, dmg: 14, poise: 9 }], move: [[0.06, 0.24, 0.6]],
  },
  t3: {
    dur: 0.66, cost: 16, next: 't1', combo: [0.28, 0.66], cancel: 0.38, track: 0.16, trail: [0.16, 0.28], sfx: [0.16, 'swing'], hand: 'R',
    keys: [[0.12, { torso: [-0.05, -0.55, 0], ...ST_HOLD_R, armR: [-0.6, 0, 0.05], foreR: [-1.3, 0, 0], legL: [0.3, 0, 0], legR: [-0.4, 0, 0], by: -0.08 }],
      [0.24, { torso: [0.5, 0.3, 0], ...ST_THRUST, ...lunge(1.5) }],
      [0.5, { torso: [0.4, 0.22, 0], ...ST_THRUST, ...lunge(1.15) }]],
    hits: [{ t0: 0.18, t1: 0.29, range: 3.1, arc: 0.9, dmg: 18, poise: 12 }], move: [[0.1, 0.26, 0.9]],
  },
  // heavy: Arc Lash, the staff levelled at the target and a violet laser fired down its length (10 mana)
  heavy: {
    dur: 0.7, cost: 12, mana: 10, next: 't1', combo: [0.36, 0.7], cancel: 0.4, track: 0.2, sfx: [0.24, 'fire'], hand: 'R',
    keys: [[0.18, { torso: [0.05, -0.35, 0], head: [0.1, 0.3, 0], ...ST_LEVEL, legL: [-0.4, 0, 0], legR: [0.35, 0, 0], shinR: [0.3, 0, 0], by: -0.08 }],
      [0.28, { torso: [-0.15, -0.3, 0], head: [0.05, 0.3, 0], ...ST_LEVEL, armR: [-1.2, 0, -0.15], foreR: [-0.5, 0, 0], legL: [-0.3, 0, 0], legR: [0.45, 0, 0], shinR: [0.4, 0, 0], by: -0.12 }],
      [0.56, { torso: [0.05, -0.25, 0], ...ST_LEVEL, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], by: -0.08 }]],
    hits: [{ t0: 0.26, t1: 0.36, range: 4.2, arc: 1.3, dmg: 24, poise: 14 }], convert: { frost: 0.5 },
    onTime: [
      { t: 0.04, fn: (p, g) => g.vfx('psyCharge', g.myRef(), 0.24) },
      { t: 0.27, fn: (p, g) => { const tip = p.rig.tip.getWorldPosition(p.pos.clone()); g.vfx('psyLaser', tip, p.fwd().clone(), 4.2 - Math.hypot(tip.x - p.pos.x, tip.z - p.pos.z) + 0.4); } },
    ],
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
// r: its radius; freeze: how long enemies caught inside when it's laid are frozen solid (a boss: bossFreeze)
export const SIGIL = { mana: 35, dur: 6, r: 5.5, slow: 0.5, zapEvery: 0.6, freeze: 5, bossFreeze: 2.5 };

// a region weapon's class overrides (player.js weaponChar adds the combos)
export const WEAPON_SETS = {
  greatsword: { style: 'slab', attacks: GREAT_ATTACKS, extra: greatCombos, light: 'g1', combos: GREAT_COMBOS, special: 'guard', dual: false, trail: 0xcfd4dc, model: { weapon: 'greatsword', shield: false } },
  wristblade: { style: 'wrist', attacks: WRIST_ATTACKS, extra: wristCombos, light: 'w1', combos: WRIST_COMBOS, special: 'dash', dual: true, trail: 0xff7a5a, model: { weapon: 'wristblade' } },
  psystaff: { style: 'staff', attacks: STAFF_ATTACKS, extra: staffCombos, light: 't1', combos: STAFF_COMBOS, special: 'sigil', dual: false, boltHeavy: false, trail: 0xc890ff, model: { weapon: 'psystaff' } },
};
