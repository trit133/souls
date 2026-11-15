// The region weapons' moves (weapons.js): their light chains, heavies, combo moves and combos, with their own
// animations. Each set is a class's attacks for that weapon: the same shape as player.js's (keys of poses over time,
// hits, the combo window, tracking, the swing trail), and the combos the same shape as combos.js's.
import { NUM } from './scale.js';

const lunge = (l = 1) => ({ legL: [-0.5 * l, 0, 0.05], legR: [0.4 * l, 0, -0.05], shinL: [0.2, 0, 0], shinR: [0.45 * l, 0, 0], by: -0.1 * l });
const crouch = (l = 1) => ({ legL: [-0.75 * l, 0, 0], legR: [0.55 * l, 0, 0], shinL: [0.45 * l, 0, 0], shinR: [0.5 * l, 0, 0], by: -0.28 * l });
const withDmg = (def, dmgs, extra = {}) => ({ ...def, hits: def.hits.map((h, i) => ({ ...h, dmg: dmgs[i] ?? h.dmg })), comboMove: true, ...extra });
const front = (p, d = 1.2, y = 0) => p.pos.clone().addScaledVector(p.fwd(), d).setY(y + (p.pos.y || 0));
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
// the light chain's key poses, each solved for where the right hand is and which way the blade points (the left
// hand closes on the hilt by itself: models.js solveGrip); character frame: +z ahead, +x his left
const GS_HI_RIGHT = { armR: [-1.31, 0.15, 0.23], foreR: [-1.72, 0, 0], handR: [1.02, 0, 0.57] };  // up over the right shoulder, the point back
const GS_LOW_MID = { armR: [-0.02, 0.29, 0.98], foreR: [-1.74, 0, 0], handR: [1.41, 0, -0.84] };  // low in front, the point down at the middle
const GS_LOW_LEFT = { armR: [0.12, -0.53, 1.2], foreR: [0.02, 0, 0], handR: [1.83, 0, -0.04] };   // drawn back by the left hip, flat
const GS_FLAT_FRONT = { armR: [-0.29, 0.01, 0.82], foreR: [-1.48, 0, 0], handR: [1.47, 0, -0.37] }; // waist high, the blade straight out
const GS_FLAT_RIGHT = { armR: [-0.2, -0.31, 0.89], foreR: [-1.32, 0, 0], handR: [1.44, 0, 0.42] };  // carried through, out to the right
// the thrusts (solved: scripts/solve-arm.mjs): cocked back by the right hip with the point ahead (deeper for the
// plunge), then run straight out at chest height, or long and low for the plunge
const GS_COCK = { armR: [0.05, -0.83, 0.02], foreR: [-0.29, 0, 0], handR: [0.93, 1.63, 0.39] };
const GS_COCK_DEEP = { armR: [0.05, 0.26, -0.32], foreR: [0, 0, 0], handR: [-0.18, 0.67, -0.22] };
const GS_THRUST = { armR: [-0.86, 0.33, 0.21], foreR: [-0.76, 0, 0], handR: [1.12, -0.43, -0.22] };
const GS_PLUNGE = { armR: [-1.45, -0.14, 0.28], foreR: [-0.1, 0, 0], handR: [0.81, -0.15, 0.35] };
const DEEP_LUNGE = { legL: [-1.25, 0, 0.05], shinL: [1.15, 0, 0], legR: [0.95, 0, -0.05], shinR: [0.25, 0, 0], by: -0.44 };
const GS_OVERHEAD = { armR: [-1.95, 0.08, 0.38], foreR: [-0.83, 0, 0], handR: [0.61, 0, 0.85] };    // raised over the head, the point back
const GS_CHOP_DOWN = { armR: [-0.11, 0.54, 1.07], foreR: [-2.11, 0, 0], handR: [1.52, 0, -0.61] };  // down the middle, the point to the floor
// Earthsunder (solved): the hands chest high before him, the blade driven steeply down and a little ahead, about half
// of it in the ground; the arms hold it there while the body wrenches round one way and back (the blade turns with
// him where it stands); then hauled out
const GS_PLANT = { armR: [-0.26, 1.17, -1.07], foreR: [-1.71, 0, 0], handR: [3.02, 0.45, -0.73] };
const GS_PULL = { armR: [0.88, 0.05, 2.26], foreR: [-1.77, 0, 0], handR: [2.16, 0.5, -0.24] };
const PLANT_LEGS = { legL: [-0.6, 0, 0], legR: [0.45, 0, 0], shinL: [0.4, 0, 0], shinR: [0.4, 0, 0], by: -0.22 };
export const GREAT_ATTACKS = {
  // the overhead chop: both hands lift it straight up and back over his head, then bring it down the middle in front of him
  g1: {
    dur: 0.95, cost: 22, next: 'g2', combo: [0.42, 0.95], cancel: 0.56, track: 0.22, trail: [0.32, 0.5], sfx: [0.32, 'heavySwing'], hand: 'R',
    keys: [
      [0.12, { torso: [-0.15, 0, 0], armR: [-1.3, 0.05, 0.25], foreR: [-1.4, 0, 0], handR: [0.8, 0, 0.6], legL: [-0.2, 0, 0], legR: [0.25, 0, 0], by: -0.06 }], // (both hands lifting it straight up the middle)
      [0.27, { torso: [-0.4, 0, 0], head: [-0.15, 0, 0], ...GS_OVERHEAD, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], shinR: [0.3, 0, 0], by: -0.06 }], // (right back over his head)
      [0.42, { torso: [0.85, 0, 0], head: [0.2, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.15), by: -0.3 }], // (straight down in front of him)
      [0.78, { torso: [0.75, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.0), by: -0.26 }],
    ],
    hits: [{ t0: 0.34, t1: 0.5, range: 3.2, arc: 3.4, dmg: 36, poise: 30 }],
    move: [[0.22, 0.48, 1.0]], onHitShake: 0.25,
  },
  // back the other way, flat: the blade's weight drags him down, he draws it back by his left hip with both hands
  // and hauls it level across to the right, stumbling a step after it. Slow, and it hits harder for it
  g2: {
    dur: 1.25, cost: 24, next: 'g3', combo: [0.68, 1.25], cancel: 0.82, track: 0.4, trail: [0.54, 0.74], sfx: [0.54, 'heavySwing'], hand: 'R',
    keys: [
      [0.04, { torso: [0.85, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.15), by: -0.3 }], // (where the chop left it)
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
  // the special (Earthsunder): hauled up over the head and driven point first into the ground at his feet, he
  // twists it one way and back, and the ground breaks outward in a ring (game.groundQuake; Pyresunder: of fire)
  quake: {
    dur: 1.0, cost: 28, cancel: 0.8, track: 0.15, hand: 'R', armor: [0.15, 0.7],
    keys: [
      [0.14, { torso: [-0.35, 0, 0], head: [-0.15, 0, 0], ...GS_OVERHEAD, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], shinR: [0.3, 0, 0], by: -0.06 }],
      [0.3, { torso: [0.4, 0, 0], head: [0.2, 0, 0], ...GS_PLANT, ...PLANT_LEGS, by: -0.3 }], // (the point goes in)
      [0.36, { torso: [0.4, 0, 0], head: [0.2, 0, 0], ...GS_PLANT, ...PLANT_LEGS }],
      [0.46, { torso: [0.4, 0.22, 0], head: [0.2, -0.15, 0], ...GS_PLANT, ...PLANT_LEGS }], // (wrenched one way...)
      [0.56, { torso: [0.45, -0.22, 0], head: [0.25, 0.15, 0], ...GS_PLANT, ...PLANT_LEGS, by: -0.26 }], // (...and back)
      [0.68, { torso: [0.45, -0.18, 0], head: [0.25, 0.1, 0], ...GS_PLANT, ...PLANT_LEGS }],
      [0.88, { torso: [0.2, 0, 0], ...GS_PULL, legL: [-0.35, 0, 0], legR: [0.3, 0, 0], shinR: [0.2, 0, 0], by: -0.1 }], // (hauled out)
    ],
    onTime: [
      { t: 0.3, fn: (p, g) => g.vfx('quakePlant', p.pos.clone().addScaledVector(p.fwd(), 0.9).setY(0.05 + (p.pos.y || 0))) },
      { t: 0.56, fn: (p, g) => g.groundQuake(p, p.evo === 'berserk') },
    ],
  },
};
// Earthsunder: the ring's reach (m), damage (as a weapon hit's), poise, and how hard it throws regular enemies,
// brutes and bosses back (a push of n slides one about n / 8 m: knockback fades at 8/s); the cooldown (s).
// Pyresunder (the evolution) is wider, hits harder, and its damage is fire
export const QUAKE = { r: 3.5, dmg: 30, poise: 25, push: 45, heavy: 22, boss: 5, cd: 8,
  fire: { r: 5.5, dmg: 100, poise: 45, push: 55, heavy: 27, boss: 7, cd: 10 } };

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
      onTime: [{ t: 0.56, fn: (p, g) => { const f = front(p, 2.4); g.vfx('impaleSteel', f.clone().setY(f.y + 0.4)); g.comboBlast({ ...p, pos: f, cmbStag: p.cmbStag }, 3.4, 30 * NUM, 40, 'fire'); g.fx.shockwave(f.x, f.z, 4); g.fx.addShake(0.7); } }],
      onHitShake: 0.7, heavyHit: true, finisher: 'Anvil',
    },
    // Struggler: (a sweep, a roll in) a light thrust that closes the distance, then a deep plunge that runs the whole
    // blade through. The thrust: the Slab cocked back by his right hip, point ahead, then a dash in behind it (it stops
    // short of whoever he's locked on to)
    gLunge: {
      dur: 0.95, cost: 24, comboMove: true, track: 0.3, trail: [0.3, 0.46], hand: 'R', sfx: [0.3, 'swing'], cancel: 0.6,
      keys: [
        [0.2, { grip: 1, torso: [-0.1, -0.75, 0], head: [0, 0.5, 0], ...GS_COCK, legL: [-0.35, 0, 0.05], legR: [0.5, 0, -0.05], shinL: [0.25, 0, 0], shinR: [0.55, 0, 0], by: -0.16 }],
        [0.38, { grip: 1, torso: [0.45, 0.05, 0], ...GS_THRUST, ...lunge(1.5) }],
        [0.7, { grip: 1, torso: [0.35, 0, 0], ...GS_THRUST, ...lunge(1.2) }],
      ],
      hits: [{ t0: 0.32, t1: 0.46, range: 3.5, arc: 1.1, dmg: 40, poise: 25 }],
      move: [[0.24, 0.42, 3.6]], stopAt: 1.3,
      onHitShake: 0.25,
    },
    // the plunge: drawn far back and low, then the whole body behind the point, a deep lunge, the blade run all the way out
    gThrust: {
      dur: 0.95, cost: 28, comboMove: true, track: 0.25, trail: [0.32, 0.48], hand: 'R', sfx: [0.32, 'heavySwing'], cancel: 0.68, armor: [0.1, 0.5],
      keys: [
        [0.26, { grip: 1, torso: [-0.25, -0.9, 0], head: [0, 0.6, 0], ...GS_COCK_DEEP, legL: [-0.2, 0, 0.1], legR: [0.75, 0, -0.1], shinL: [0.35, 0, 0], shinR: [0.85, 0, 0], by: -0.26 }],
        [0.42, { grip: 1, torso: [0.65, 0.1, 0], head: [-0.35, 0, 0], ...GS_PLUNGE, ...DEEP_LUNGE }],
        [0.74, { grip: 1, torso: [0.6, 0.05, 0], head: [-0.3, 0, 0], ...GS_PLUNGE, ...DEEP_LUNGE, by: -0.38 }],
      ],
      hits: [{ t0: 0.34, t1: 0.48, range: 4.0, arc: 0.9, dmg: 96, poise: 45 }],
      move: [[0.3, 0.46, 2.6]], stopAt: 0.9,
      onTime: [{ t: 0.43, fn: (p, g) => { g.vfx('impaleSteel', front(p, 2.2, 0.9)); g.hitstop(0.04); } }],
      onHitShake: 0.6, heavyHit: true, finisher: 'Struggler',
    },
  };
}
const GREAT_COMBOS = [
  { id: 'wheel', name: "Dragon's Wheel", desc: 'Two sweeps, then the blade carries you all the way round, twice.', steps: [[A, 'g1', 0.5], [A, 'gc2', 0.5], [A, 'gWheel']] },
  { id: 'anvil', name: 'Anvil', desc: 'The slam, a rising cut, then a leaping overhead that buries the blade and floors everything near it.', steps: [[H, 'heavy', 0.9], [A, 'gUpper', 0.44], [H, 'gCrush']] },
  { id: 'struggler', name: 'Struggler', desc: 'A sweep, a roll in, a quick thrust that dashes you back onto them, then a deep plunge that runs the whole blade through. Plays faster.', steps: [[A, 'g1', 0.5], [R, 'roll', 0.42], [A, 'gLunge', 0.42], [H, 'gThrust']] },
];

// ================= THE WRIST BLADE (Shrike) =================
// one short knife held point-down in the right fist (playerkits.js), the blade lying back along the forearm: it cuts
// as the fist goes by, so his slashes are punches and hooks that rake the edge across, and his stab is a hammer-fist
// driven down. The left hand is empty: it guards, grabs and shoves. Each hit says how it cuts (`cut`: 'slash' can
// take a piece off, 'stab' never does; gore.js)
const RK_GUARD = { armR: [-0.55, 0, -0.25], foreR: [-1.75, 0, 0], handR: [0.15, 0, 0], armL: [-0.75, 0, 0.3], foreL: [-1.0, 0, 0], handL: [0.4, 0, 0] }; // fist by the cheek, the left hand open before him
const RK_LEFT = { armL: [-0.75, 0, 0.3], foreL: [-1.0, 0, 0], handL: [0.4, 0, 0] };
const RK_WIND_R = { armR: [-1.2, 0, -1.15], foreR: [-1.1, 0, 0], handR: [0.2, 0, 0] };  // drawn back out to the right, high
const RK_ACROSS = { armR: [-1.35, 0, 0.75], foreR: [-0.55, 0, 0], handR: [0.1, 0, 0] }; // carried across to the left
const RK_WIND_L = { armR: [-1.25, 0, 0.85], foreR: [-1.4, 0, 0], handR: [0.2, 0, 0] };  // fist by the left shoulder
const RK_OUT_R = { armR: [-1.3, 0, -1.05], foreR: [-0.25, 0, 0], handR: [0.1, 0, 0] };  // flung out to the right
const RK_HIGH = { armR: [-2.75, 0, -0.15], foreR: [-0.9, 0, 0], handR: [0.2, 0, 0] };   // raised over the head, point down
const RK_DOWN = { armR: [-0.95, 0, 0.1], foreR: [-0.25, 0, 0], handR: [0.1, 0, 0] };    // hammered down in front
export const WRIST_ATTACKS = {
  // a forehand rake: the fist hooks across from the right, the edge trailing behind it
  w1: {
    dur: 0.42, cost: 10, next: 'w2', combo: [0.16, 0.42], cancel: 0.22, track: 0.08, trail: [0.08, 0.17], sfx: [0.08, 'swing'], hand: 'R',
    keys: [[0.07, { torso: [0.1, -0.45, 0], ...RK_WIND_R, ...RK_LEFT, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], by: -0.06 }],
      [0.15, { torso: [0.25, 0.55, 0], ...RK_ACROSS, ...RK_LEFT, ...lunge(1.1) }],
      [0.3, { torso: [0.2, 0.4, 0], ...RK_ACROSS, foreR: [-0.9, 0, 0], ...RK_LEFT, ...lunge(0.8) }]],
    hits: [{ t0: 0.1, t1: 0.17, range: 1.8, arc: 1.8, dmg: 12, poise: 6, cut: 'slash' }], move: [[0.05, 0.16, 0.55]],
  },
  // a backhand: back the other way, the elbow leading and the blade raking out to the right
  w2: {
    dur: 0.46, cost: 11, next: 'w3', combo: [0.18, 0.46], cancel: 0.24, track: 0.08, trail: [0.09, 0.19], sfx: [0.09, 'swing'], hand: 'R',
    keys: [[0.08, { torso: [0.1, 0.55, 0], ...RK_WIND_L, ...RK_LEFT, legL: [0.25, 0, 0], legR: [-0.2, 0, 0] }],
      [0.16, { torso: [0.25, -0.6, 0], ...RK_OUT_R, ...RK_LEFT, legL: [0.35, 0, 0], legR: [-0.45, 0, 0], shinL: [0.35, 0, 0], by: -0.1 }],
      [0.34, { torso: [0.2, -0.45, 0], ...RK_OUT_R, foreR: [-0.6, 0, 0], ...RK_LEFT, legL: [0.25, 0, 0], legR: [-0.35, 0, 0], by: -0.08 }]],
    hits: [{ t0: 0.11, t1: 0.19, range: 1.8, arc: 2.0, dmg: 13, poise: 7, cut: 'slash' }], move: [[0.05, 0.18, 0.5]],
  },
  // the hammer: the fist raised high and driven straight down, the point first
  w3: {
    dur: 0.55, cost: 13, next: 'w1', combo: [0.22, 0.55], cancel: 0.3, track: 0.1, trail: [0.12, 0.22], sfx: [0.12, 'swing'], hand: 'R',
    keys: [[0.1, { torso: [-0.2, -0.2, 0], ...RK_HIGH, armL: [-1.3, 0, 0.2], foreL: [-0.4, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0] }],
      [0.2, { torso: [0.6, 0.15, 0], ...RK_DOWN, armL: [-0.4, 0, 0.5], foreL: [-0.8, 0, 0], ...crouch(0.9) }],
      [0.4, { torso: [0.5, 0.1, 0], ...RK_DOWN, armL: [-0.4, 0, 0.5], foreL: [-0.8, 0, 0], ...crouch(0.7) }]],
    hits: [{ t0: 0.14, t1: 0.22, range: 1.9, arc: 1.2, dmg: 16, poise: 10, cut: 'stab' }], move: [[0.08, 0.2, 0.6]],
  },
  // heavy: a spinning backhand, all the way round, the blade flung out at the end of the arm
  heavy: {
    dur: 0.5, cost: 14, next: 'w2', combo: [0.22, 0.5], cancel: 0.28, track: 0.1, trail: [0.11, 0.21], sfx: [0.12, 'heavySwing'], hand: 'R',
    keys: [[0.1, { torso: [0.15, 0.85, 0], ...RK_WIND_L, armL: [-0.3, 0, 0.6], foreL: [-0.6, 0, 0], legL: [0.3, 0, 0], legR: [-0.3, 0, 0], by: -0.12 }],
      [0.17, { torso: [0.3, -0.9, 0], ...RK_OUT_R, foreR: [-0.1, 0, 0], armL: [-0.2, 0, 0.9], foreL: [-0.3, 0, 0], ...lunge(1.3) }],
      [0.36, { torso: [0.25, -0.75, 0], ...RK_OUT_R, armL: [-0.3, 0, 0.7], foreL: [-0.5, 0, 0], ...lunge(1.0) }]],
    hits: [{ t0: 0.13, t1: 0.21, range: 2.1, arc: 2.6, dmg: 27, poise: 20, cut: 'slash' }], move: [[0.1, 0.18, 0.9]], onHitShake: 0.2,
  },
};
function wristCombos(W) {
  return {
    wc2: withDmg(W.w2, [15], { cost: 12 }),
    // Silent Count: (two cuts) a duck under, then up and across the throat, the edge drawn from ear to ear
    wThroat: {
      dur: 0.62, cost: 18, comboMove: true, track: 0.12, trail: [0.18, 0.31], hand: 'R', sfx: [0.18, 'heavySwing'], cancel: 0.44,
      keys: [[0.14, { torso: [0.55, 0.45, 0], armR: [-0.6, 0, 0.7], foreR: [-1.5, 0, 0], handR: [0.2, 0, 0], ...RK_LEFT, ...crouch(1.2) }],
        [0.26, { torso: [-0.3, -0.55, 0], head: [-0.2, 0, 0], armR: [-1.9, 0, -0.9], foreR: [-0.3, 0, 0], handR: [0.1, 0, 0], armL: [-1.4, 0, 0.1], foreL: [-0.3, 0, 0], ...lunge(1.4), by: 0.02 }],
        [0.48, { torso: [-0.2, -0.45, 0], armR: [-1.8, 0, -1.0], foreR: [-0.5, 0, 0], armL: [-1.3, 0, 0.1], foreL: [-0.4, 0, 0], ...lunge(1.1) }]],
      hits: [{ t0: 0.22, t1: 0.32, range: 2.0, arc: 1.4, dmg: 46, poise: 24, cut: 'slash', behead: 1 }], move: [[0.12, 0.28, 0.9]],
      onTime: [{ t: 0.28, fn: (p, g) => g.vfx('redCrit', front(p, 1.0, 1.4)) }],
      onHitShake: 0.35, finisher: 'Silent Count',
    },
    // Shadow Hook: (a cut, a roll round) a long lunge out of the roll that ends in a hook, the blade raked across
    wLunge: {
      dur: 0.7, cost: 20, comboMove: true, track: 0.2, trail: [0.22, 0.36], hand: 'R', sfx: [0.2, 'heavySwing'], cancel: 0.5,
      keys: [[0.16, { torso: [0.35, -0.6, 0], ...RK_WIND_R, ...RK_LEFT, ...crouch(1.2) }],
        [0.3, { torso: [0.75, 0.6, 0], ...RK_ACROSS, armL: [0.7, 0, 0.45], foreL: [-0.4, 0, 0], legL: [-1.05, 0, 0.05], legR: [0.85, 0, -0.05], shinL: [0.35, 0, 0], shinR: [0.55, 0, 0], by: -0.38 }],
        [0.54, { torso: [0.65, 0.5, 0], ...RK_ACROSS, foreR: [-0.9, 0, 0], armL: [0.6, 0, 0.45], foreL: [-0.4, 0, 0], ...lunge(1.4) }]],
      hits: [{ t0: 0.26, t1: 0.36, range: 2.2, arc: 1.6, dmg: 52, poise: 28, cut: 'slash' }], move: [[0.12, 0.34, 3.0]],
      onTime: [{ t: 0.22, fn: (p, g) => g.vfx('shroud', p.pos.clone().setY(0.4 + (p.pos.y || 0))) }],
      onHitShake: 0.4, finisher: 'Shadow Hook',
    },
    // Needle Rain: (a spin, two cuts) a leap, both hands on the knife over his head, driven down as he lands
    wc1: withDmg(W.w1, [13], { cost: 11 }),
    wc3: withDmg(W.w3, [17], { cost: 13 }),
    wPin: {
      dur: 0.82, cost: 24, comboMove: true, track: 0.25, trail: [0.3, 0.44], hand: 'R', sfx: [0.3, 'heavySwing'], cancel: 0.6,
      keys: [[0.14, { torso: [-0.3, 0, 0], ...RK_HIGH, armL: [-2.75, 0, -0.1], foreL: [-1.0, 0, 0], handL: [0.4, 0, 0], legL: [-1.0, 0, 0], shinL: [1.4, 0, 0], legR: [-0.3, 0, 0], shinR: [1.2, 0, 0] }],
        [0.38, { torso: [0.95, 0, 0], ...RK_DOWN, armL: [-0.95, 0, -0.2], foreL: [-0.45, 0, 0], ...crouch(1.25) }],
        [0.66, { torso: [0.8, 0, 0], ...RK_DOWN, armL: [-0.95, 0, -0.2], foreL: [-0.45, 0, 0], ...crouch(1.0) }]],
      hits: [{ t0: 0.34, t1: 0.46, range: 2.1, arc: 1.2, dmg: 66, poise: 35, cut: 'stab' }], move: [[0.05, 0.38, 2.0]], jump: [0.05, 0.38, 1.2],
      onTime: [{ t: 0.4, fn: (p, g) => g.vfx('redCrit', front(p, 1.0, 0.8)) }],
      onHitShake: 0.55, heavyHit: true, finisher: 'Needle Rain',
    },
  };
}
const WRIST_COMBOS = [
  { id: 'count', name: 'Silent Count', desc: 'Two cuts, then a duck under and the blade drawn across the throat.', steps: [[A, 'w1', 0.17], [A, 'wc2', 0.19], [A, 'wThroat']] },
  { id: 'hook', name: 'Shadow Hook', desc: 'A cut, a roll round, then a long lunge that hooks the blade across.', steps: [[A, 'w1', 0.17], [R, 'roll', 0.32], [H, 'wLunge']] },
  { id: 'needle', name: 'Needle Rain', desc: 'A spin, two cuts, then a leap that hammers the knife down. Plays faster.', steps: [[H, 'heavy', 0.22], [A, 'wc1', 0.17], [A, 'wc3', 0.22], [H, 'wPin']] },
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
// the staff levelled at chest height, pointing straight ahead down her line of sight (solved for the hand's place and
// the staff's direction with the torso turned as in the heavy's keys), and the recoil as it fires
const ST_LEVEL = { armR: [-0.16, 0.11, 0.7], foreR: [-1.8, 0, 0], handR: [2.02, 0, 0.95] };
const ST_RECOIL = { armR: [-0.08, -0.01, 0.83], foreR: [-1.78, 0, 0], handR: [2.09, 0, -0.1] };
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
    keys: [[0.18, { torso: [0.05, -0.25, 0], head: [0.1, 0.25, 0], ...ST_LEVEL, legL: [-0.4, 0, 0], legR: [0.35, 0, 0], shinR: [0.3, 0, 0], by: -0.08 }],
      [0.28, { torso: [-0.15, -0.22, 0], head: [0.05, 0.22, 0], ...ST_RECOIL, legL: [-0.3, 0, 0], legR: [0.45, 0, 0], shinR: [0.4, 0, 0], by: -0.12 }],
      [0.56, { torso: [0.05, -0.25, 0], ...ST_LEVEL, legL: [-0.35, 0, 0], legR: [0.35, 0, 0], by: -0.08 }]],
    hits: [{ t0: 0.26, t1: 0.36, range: 4.2, arc: 1.3, dmg: 24, poise: 14 }], convert: { frost: 0.5 },
    onTime: [
      { t: 0.04, fn: (p, g) => g.vfx('psyCharge', g.myRef(), 0.24) },
      // the beam runs from the focus to where it strikes: a locked enemy in reach (its chest), otherwise the ground
      // at the attack's reach ahead (towards the locked enemy if it's further off)
      { t: 0.27, fn: (p, g) => {
        const tip = p.rig.tip.getWorldPosition(p.pos.clone()), L = p.lock?.alive ? p.lock : null, R = 4.2;
        const to = L && p.distTo(L) <= R + (L.radius || 0) ? L.pos.clone().setY(1.1 * (L.rig?.root.scale.y || 1) + (L.y || 0) + (L.pos.y || 0))
          : p.pos.clone().addScaledVector(L ? L.pos.clone().sub(p.pos).setY(0).normalize() : p.fwd(), R).setY(0.05 + (p.pos.y || 0));
        g.vfx('psyLaser', tip, to);
      } },
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
      onTime: [{ t: 0.34, fn: (p, g) => { g.vfx('frostNova', p.pos.clone().setY(0.1 + (p.pos.y || 0))); g.comboBlast(p, 3.6, 40 * NUM, 22, 'frost'); g.fx.addShake(0.4); } }],
      finisher: 'Thunderhead',
    },
  };
}
const STAFF_COMBOS = [
  { id: 'vault', name: 'Rising Staff', desc: 'Two sweeps, then a vault on the staff and a slam that bursts into frost.', steps: [[A, 't1', 0.27], [A, 'tc2', 0.28], [A, 'tVault']] },
  { id: 'arc', name: 'Arc Sweep', desc: 'A sweep, a roll, then the staff whirled all the way round.', steps: [[A, 't1', 0.27], [R, 'roll', 0.38], [A, 'tSpin']] },
  { id: 'thunder', name: 'Thunderhead', desc: 'The lash, a sweep, then lightning breaks all round you (14 mana).', steps: [[H, 'heavy', 0.38], [A, 'tc1', 0.27], [H, 'tStorm']] },
];
// r: its radius; cd: seconds before it can be laid again; freeze: how long enemies caught inside when it's laid are
// frozen solid. A boss or mini boss isn't frozen: it's chilled for bossChill s, moving and swinging at chill speed
export const SIGIL = { mana: 35, dur: 6, r: 5.5, slow: 0.5, zapEvery: 0.6, cd: 10, freeze: 5, bossChill: 4, chill: 0.3 };

// a region weapon's class overrides (player.js weaponChar adds the combos)
export const WEAPON_SETS = {
  greatsword: { style: 'slab', attacks: GREAT_ATTACKS, extra: greatCombos, light: 'g1', combos: GREAT_COMBOS, special: 'quake', dual: false, trail: 0xcfd4dc, model: { weapon: 'greatsword', shield: false } },
  wristblade: { style: 'rknife', attacks: WRIST_ATTACKS, extra: wristCombos, light: 'w1', combos: WRIST_COMBOS, special: 'dash', dual: false, trail: 0xff7a5a, model: { weapon: 'wristblade' } },
  psystaff: { style: 'staff', attacks: STAFF_ATTACKS, extra: staffCombos, light: 't1', combos: STAFF_COMBOS, special: 'sigil', dual: false, boltHeavy: false, trail: 0xc890ff, model: { weapon: 'psystaff' } },
};
