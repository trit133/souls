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

// ================= THE PIT-BREAKER (Templar, the Sunless Deep) =================
// a steam-piston maul, carried low in both hands with the head down by his feet (anims.js piston). Its swings are
// hauls: wrenched up from the floor, dropped from over the shoulder, dragged flat round. The piston in the head fires
// as it lands (a puff of steam and sparks in your chest glow's colour: deepweapons.js). The left hand closes on the
// haft by itself (models.js FEEL pitbreaker)
const PB_LOW = { armR: [-0.02, 0.29, 0.98], foreR: [-1.74, 0, 0], handR: [1.41, 0, -0.84] }; // (= GS_LOW_MID: the head down before him)
const pbFire = (p, g, d = 2.0) => g.deepw?.piston(p, front(p, d));
export const PIT_ATTACKS = {
  // the upswing: wrenched up off the floor from low by his left hip, over and up past his right shoulder
  p1: {
    dur: 0.86, cost: 22, next: 'p2', combo: [0.4, 0.86], cancel: 0.52, track: 0.2, trail: [0.2, 0.4], sfx: [0.2, 'heavySwing'], hand: 'R',
    keys: [
      [0.14, { torso: [0.55, 0.7, 0], head: [0, -0.4, 0], ...GS_LOW_LEFT, ...crouch(1.2), by: -0.34 }], // (dragged back by the left hip)
      [0.32, { torso: [-0.25, -0.55, 0], head: [-0.1, 0.3, 0], ...GS_HI_RIGHT, ...lunge(1.1), by: -0.06 }], // (up past the right shoulder)
      [0.66, { torso: [-0.2, -0.45, 0], ...GS_HI_RIGHT, ...lunge(0.9) }],
    ],
    hits: [{ t0: 0.22, t1: 0.38, range: 2.9, arc: 2.2, dmg: 32, poise: 30 }],
    move: [[0.12, 0.34, 0.8]], onHitShake: 0.3,
  },
  // the drop: from over the right shoulder straight down in front, and the piston fires as it lands
  p2: {
    dur: 1.0, cost: 24, next: 'p3', combo: [0.5, 1.0], cancel: 0.62, track: 0.3, trail: [0.32, 0.46], sfx: [0.32, 'heavySwing'], hand: 'R', armor: [0.15, 0.45],
    keys: [
      [0.06, { torso: [-0.2, -0.5, 0], ...GS_HI_RIGHT, legL: [-0.3, 0, 0], legR: [0.3, 0, 0] }],
      [0.26, { torso: [-0.45, -0.1, 0], head: [-0.15, 0, 0], ...GS_OVERHEAD, legL: [-0.45, 0, 0], legR: [0.35, 0, 0], shinR: [0.3, 0, 0], by: -0.04 }],
      [0.42, { torso: [0.9, 0.05, 0], head: [0.2, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.2), by: -0.32 }],
      [0.8, { torso: [0.75, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.0), by: -0.26 }],
    ],
    hits: [{ t0: 0.36, t1: 0.48, range: 3.0, arc: 1.4, dmg: 42, poise: 40 }],
    move: [[0.24, 0.44, 1.0]], onHitShake: 0.45, heavyHit: true,
    onTime: [{ t: 0.43, fn: (p, g) => pbFire(p, g, 2.2) }],
  },
  // the drag: hauled up off the floor and dragged flat round from right to left, stumbling after it
  p3: {
    dur: 1.2, cost: 26, next: 'p1', combo: [0.66, 1.2], cancel: 0.8, track: 0.35, trail: [0.46, 0.7], sfx: [0.46, 'heavySwing'], hand: 'R', armor: [0.3, 0.65],
    keys: [
      [0.06, { torso: [0.85, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.1), by: -0.28 }],
      [0.3, { torso: [0.3, -0.85, 0], head: [0, 0.45, 0], ...GS_FLAT_RIGHT, legL: [-0.4, 0, 0.1], legR: [0.5, 0, -0.1], shinR: [0.45, 0, 0], by: -0.2 }],
      [0.5, { torso: [0.3, 0, 0], ...GS_FLAT_FRONT, ...lunge(1.3), by: -0.24 }],
      [0.68, { torso: [0.5, 0.85, 0], head: [0, -0.45, 0], ...GS_LOW_LEFT, ...lunge(1.4), by: -0.3 }],
      [1.0, { torso: [0.45, 0.6, 0], ...GS_LOW_LEFT, ...lunge(1.0), by: -0.22 }],
    ],
    hits: [{ t0: 0.48, t1: 0.7, range: 3.0, arc: 3.6, dmg: 48, poise: 42 }],
    move: [[0.4, 0.7, 1.1]], onHitShake: 0.45, heavyHit: true,
  },
  // heavy: the ram. Cocked back by the right hip, then run straight out like a battering ram, and the piston kicks
  // the head out a foot further as it hits: whatever it hits is thrown back
  heavy: {
    dur: 1.15, cost: 34, next: 'p1', combo: [0.66, 1.15], cancel: 0.72, track: 0.45, trail: [0.4, 0.56], sfx: [0.4, 'heavySwing'], hand: 'R', armor: [0.2, 0.6],
    keys: [
      [0.3, { grip: 1, torso: [-0.15, -0.85, 0], head: [0, 0.55, 0], ...GS_COCK, legL: [-0.3, 0, 0.05], legR: [0.6, 0, -0.05], shinL: [0.25, 0, 0], shinR: [0.6, 0, 0], by: -0.2 }],
      [0.46, { grip: 1, torso: [0.5, 0.05, 0], ...GS_THRUST, ...lunge(1.6) }],
      [0.86, { grip: 1, torso: [0.4, 0, 0], ...GS_THRUST, ...lunge(1.2) }],
    ],
    hits: [{ t0: 0.42, t1: 0.56, range: 3.2, arc: 1.2, dmg: 58, poise: 60 }],
    move: [[0.34, 0.5, 1.8]], onHitShake: 0.55, heavyHit: true,
    onTime: [{ t: 0.47, fn: (p, g) => { pbFire(p, g, 2.4); g.deepw?.shove(p, 3.4, 1.3, 30); } }],
  },
  // the special (Piston Slam): hauled up over the head and slammed into the floor, the piston firing down through
  // it: the floor splits in a straight line ahead (deepweapons.js pistonLine; Overpressure: rocks burst up along it)
  piston: {
    dur: 1.05, cost: 26, cancel: 0.82, track: 0.3, trail: [0.36, 0.5], sfx: [0.36, 'heavySwing'], hand: 'R', armor: [0.12, 0.7],
    keys: [
      [0.24, { torso: [-0.45, 0, 0], head: [-0.15, 0, 0], ...GS_OVERHEAD, legL: [-0.5, 0, 0], legR: [0.4, 0, 0], shinR: [0.3, 0, 0], by: -0.02 }],
      [0.42, { torso: [1.0, 0, 0], head: [0.25, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.35), by: -0.4 }],
      [0.8, { torso: [0.9, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.2), by: -0.34 }],
    ],
    hits: [{ t0: 0.38, t1: 0.48, range: 2.8, arc: 1.2, dmg: 30, poise: 30 }],
    move: [[0.2, 0.42, 0.6]], onHitShake: 0.6, heavyHit: true,
    onTime: [{ t: 0.43, fn: (p, g) => g.deepw?.pistonLine(p) }],
  },
};
// Piston Slam: the split's length and width (m), its damage (as a weapon hit's), poise, how hard it throws enemies
// along it; the cooldown (s). Overpressure (the evolution): every third swing that lands vents the boiler (a burst of
// fire round the head), and the next Piston Slam bursts rocks up all along a longer split
export const PISTON = { len: 7, w: 1.5, dmg: 34, poise: 45, push: 16, cd: 9,
  over: { len: 9.5, w: 2.0, dmg: 64, poise: 80, push: 22 }, ventEvery: 3, vent: { r: 2.4, dmg: 16, poise: 14 } };

function pitCombos(P) {
  return {
    pc2: withDmg(P.p2, [46], { cost: 26 }),
    // Boiler Burst: (an upswing, a drop) the maul swung all the way round on its full weight, twice, and the boiler
    // bursts: a ring of fire round him in his chest glow's colour
    pBoil: {
      dur: 1.15, cost: 32, comboMove: true, track: 0.1, trail: [0.12, 0.7], hand: 'R', sfx: [0.12, 'heavySwing'], cancel: 0.82, armor: [0, 0.75],
      keys: [
        [0.12, { hips: [0, -1.6, 0], torso: [0.25, -0.4, 0], ...GS_SWEEP_R, ...crouch(0.7) }],
        [0.34, { hips: [0, 1.6, 0], torso: [0.3, 0.4, 0], ...GS_SWEEP_L, ...crouch(0.8) }],
        [0.56, { hips: [0, 4.7, 0], torso: [0.3, 0.4, 0], ...GS_SWEEP_L, ...crouch(0.8) }],
        [0.74, { hips: [0, 6.28, 0], torso: [0.6, 0.2, 0], ...PB_LOW, ...crouch(1.2) }],
        [1.0, { hips: [0, 6.28, 0], torso: [0.5, 0.1, 0], ...PB_LOW, ...crouch(1.0) }],
      ],
      hits: [{ t0: 0.14, t1: 0.36, range: 3.1, arc: 6.3, dmg: 32, poise: 16 }, { t0: 0.4, t1: 0.62, range: 3.1, arc: 6.3, dmg: 52, poise: 30 }],
      move: [[0.05, 0.6, 1.2]],
      onTime: [{ t: 0.74, fn: (p, g) => g.deepw?.boilerBurst(p, 3.4, 34) }],
      onHitShake: 0.5, heavyHit: true, finisher: 'Boiler Burst',
    },
    // Pile Driver: (the ram, an upswing) a leap, and the maul driven down head first with the piston firing: the
    // floor bursts in a ring of rock
    pUp: withDmg(P.p1, [34], { cost: 22 }),
    pDrive: {
      dur: 1.25, cost: 36, comboMove: true, track: 0.3, trail: [0.42, 0.6], hand: 'R', sfx: [0.42, 'heavySwing'], cancel: 0.9, armor: [0, 0.7],
      keys: [
        [0.42, { torso: [-0.55, 0, 0], ...GS_OVERHEAD, legL: [-1.1, 0, 0], shinL: [1.3, 0, 0], legR: [-0.3, 0, 0], shinR: [1.1, 0, 0] }],
        [0.58, { torso: [1.1, 0, 0], head: [0.25, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.4) }],
        [1.0, { torso: [0.95, 0, 0], ...GS_CHOP_DOWN, ...crouch(1.15) }],
      ],
      hits: [{ t0: 0.52, t1: 0.64, range: 3.2, arc: 1.6, dmg: 84, poise: 60 }],
      move: [[0.1, 0.54, 2.0]], jump: [0.1, 0.54, 1.4],
      onTime: [{ t: 0.58, fn: (p, g) => g.deepw?.rockRing(p, front(p, 2.2), 3.4, 30) }],
      onHitShake: 0.7, heavyHit: true, finisher: 'Pile Driver',
    },
    // Shunt: (an upswing, a roll in) the maul levelled and run in like a battering ram a long way, everything in
    // front shoved aside, then the piston kicks the last one off its feet
    pShunt: {
      dur: 1.05, cost: 30, comboMove: true, track: 0.3, trail: [0.26, 0.62], hand: 'R', sfx: [0.24, 'heavySwing'], cancel: 0.74, armor: [0, 0.6],
      keys: [
        [0.16, { grip: 1, torso: [-0.1, -0.8, 0], head: [0, 0.5, 0], ...GS_COCK, ...crouch(0.9) }],
        [0.3, { grip: 1, torso: [0.55, 0, 0], ...GS_THRUST, ...lunge(1.5) }],
        [0.58, { grip: 1, torso: [0.6, 0, 0], ...GS_THRUST, ...lunge(1.6) }],
        [0.86, { grip: 1, torso: [0.4, 0, 0], ...GS_THRUST, ...lunge(1.1) }],
      ],
      hits: [{ t0: 0.24, t1: 0.5, range: 2.6, arc: 1.6, dmg: 30, poise: 30 }, { t0: 0.52, t1: 0.64, range: 3.2, arc: 1.2, dmg: 62, poise: 55 }],
      move: [[0.2, 0.56, 4.6]], stopAt: 1.2,
      onTime: [{ t: 0.4, fn: (p, g) => g.deepw?.shove(p, 2.6, 1.8, 18, true) }, { t: 0.56, fn: (p, g) => { pbFire(p, g, 2.4); g.deepw?.shove(p, 3.4, 1.2, 34); } }],
      onHitShake: 0.6, heavyHit: true, finisher: 'Shunt',
    },
  };
}
const PIT_COMBOS = [
  { id: 'boiler', name: 'Boiler Burst', desc: 'An upswing, a drop, then the maul carried all the way round twice, and the boiler bursts in a ring of fire.', steps: [[A, 'p1', 0.4], [A, 'pc2', 0.48], [A, 'pBoil']] },
  { id: 'pile', name: 'Pile Driver', desc: 'The ram, an upswing, then a leap and the maul driven down head first: the floor bursts in a ring of rock.', steps: [[H, 'heavy', 0.56], [A, 'pUp', 0.4], [H, 'pDrive']] },
  { id: 'shunt', name: 'Shunt', desc: 'An upswing, a roll in, then the maul run in like a battering ram, shoving everything aside. Plays faster.', steps: [[A, 'p1', 0.4], [R, 'roll', 0.42], [A, 'pShunt']] },
];

// ================= THE GLASS CHAKRAMS (Shrike, the Sunless Deep) =================
// a ring of seer-glass in each hand, held by the inner edge, the outer edge sharp: quick slashes with one and the
// other, both crossing; the heavy throws the right one, which cuts its way from one enemy to the next and comes back
// (deepweapons.js throwChakram). Its glints are your chest glow's colour
const CK_GUARD_L = { armL: [-0.6, 0, 0.45], foreL: [-1.1, 0, 0], handL: [0.3, 0, 0] };
const CK_GUARD_R = { armR: [-0.6, 0, -0.45], foreR: [-1.1, 0, 0], handR: [0.3, 0, 0] };
const CK_WIND_R = { armR: [-1.1, 0, -1.3], foreR: [-0.7, 0, 0], handR: [0.4, 0, 0] };  // the right ring out wide
const CK_CUT_R = { armR: [-1.4, 0, 0.8], foreR: [-0.3, 0, 0], handR: [0.1, 0, 0] };    // carried across to the left
const CK_WIND_L = { armL: [-1.1, 0, 1.3], foreL: [-0.7, 0, 0], handL: [0.4, 0, 0] };
const CK_CUT_L = { armL: [-1.4, 0, -0.8], foreL: [-0.3, 0, 0], handL: [0.1, 0, 0] };
const CK_THROW_BACK = { armR: [0.5, 0, -1.2], foreR: [-1.3, 0, 0], handR: [0.6, 0, 0] }; // drawn back behind him, low
const CK_THROW_OUT = { armR: [-1.55, 0, 0.35], foreR: [-0.1, 0, 0], handR: [-0.2, 0, 0] }; // flung out across
export const CHAKRAM_ATTACKS = {
  c1: {
    dur: 0.44, cost: 10, next: 'c2', combo: [0.17, 0.44], cancel: 0.24, track: 0.08, trail: [0.08, 0.18], sfx: [0.08, 'swing'], hand: 'R',
    keys: [[0.07, { torso: [0.1, -0.5, 0], ...CK_WIND_R, ...CK_GUARD_L, legL: [-0.3, 0, 0], legR: [0.25, 0, 0], by: -0.06 }],
      [0.16, { torso: [0.25, 0.55, 0], ...CK_CUT_R, ...CK_GUARD_L, ...lunge(1.1) }],
      [0.32, { torso: [0.2, 0.4, 0], ...CK_CUT_R, foreR: [-0.7, 0, 0], ...CK_GUARD_L, ...lunge(0.8) }]],
    hits: [{ t0: 0.1, t1: 0.18, range: 1.9, arc: 2.0, dmg: 11, poise: 6, cut: 'slash' }], move: [[0.05, 0.16, 0.5]],
  },
  c2: {
    dur: 0.46, cost: 10, next: 'c3', combo: [0.18, 0.46], cancel: 0.25, track: 0.08, trail: [0.09, 0.19], sfx: [0.09, 'swing'], hand: 'L',
    keys: [[0.08, { torso: [0.1, 0.5, 0], ...CK_WIND_L, ...CK_GUARD_R, legL: [0.25, 0, 0], legR: [-0.2, 0, 0] }],
      [0.17, { torso: [0.25, -0.55, 0], ...CK_CUT_L, ...CK_GUARD_R, legL: [0.35, 0, 0], legR: [-0.45, 0, 0], shinL: [0.35, 0, 0], by: -0.1 }],
      [0.34, { torso: [0.2, -0.4, 0], ...CK_CUT_L, foreL: [-0.6, 0, 0], ...CK_GUARD_R, by: -0.08 }]],
    hits: [{ t0: 0.11, t1: 0.19, range: 1.9, arc: 2.0, dmg: 12, poise: 7, cut: 'slash' }], move: [[0.05, 0.18, 0.5]],
  },
  // both rings flung wide, then crossed down in an X in front of him
  c3: {
    dur: 0.58, cost: 13, next: 'c1', combo: [0.24, 0.58], cancel: 0.32, track: 0.1, trail: [0.13, 0.24], sfx: [0.13, 'heavySwing'], hand: 'B',
    keys: [[0.11, { torso: [-0.25, 0, 0], armR: [-2.4, 0, -0.9], foreR: [-0.3, 0, 0], armL: [-2.4, 0, 0.9], foreL: [-0.3, 0, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0] }],
      [0.22, { torso: [0.55, 0, 0], armR: [-0.9, 0, 0.55], foreR: [-0.2, 0, 0], armL: [-0.9, 0, -0.55], foreL: [-0.2, 0, 0], ...crouch(0.9) }],
      [0.42, { torso: [0.45, 0, 0], armR: [-0.8, 0, 0.5], foreR: [-0.3, 0, 0], armL: [-0.8, 0, -0.5], foreL: [-0.3, 0, 0], ...crouch(0.7) }]],
    hits: [{ t0: 0.15, t1: 0.25, range: 2.0, arc: 1.8, dmg: 17, poise: 11, cut: 'slash' }], move: [[0.08, 0.22, 0.6]],
  },
  // heavy: the throw. The right ring drawn back low behind him and flung out flat; it cuts the first enemy, leaps to
  // the next nearest (three in all) and comes back to his hand. With it still out, a slash with the left
  heavy: {
    dur: 0.52, cost: 14, next: 'c2', combo: [0.24, 0.52], cancel: 0.3, track: 0.18, trail: [0.12, 0.22], sfx: [0.14, 'heavySwing'], hand: 'L',
    keys: [[0.12, { torso: [0.1, -0.85, 0], head: [0, 0.6, 0], ...CK_THROW_BACK, ...CK_GUARD_L, legL: [0.3, 0, 0], legR: [-0.3, 0, 0], by: -0.12 }],
      [0.2, { torso: [0.35, 0.6, 0], head: [0, -0.3, 0], ...CK_THROW_OUT, armL: [-1.2, 0, -0.4], foreL: [-0.4, 0, 0], ...lunge(1.3) }],
      [0.38, { torso: [0.3, 0.45, 0], ...CK_THROW_OUT, ...CK_GUARD_L, ...lunge(1.0) }]],
    hits: [{ t0: 0.14, t1: 0.22, range: 1.8, arc: 1.6, dmg: 10, poise: 6, cut: 'slash' }], move: [[0.08, 0.2, 0.6]],
    onTime: [{ t: 0.19, fn: (p, g) => g.deepw?.throwChakram(p) }],
  },
};
// the thrown ring: its reach to the first enemy, the leap to each next (m), how many it cuts, its speed (m/s) and each
// cut's damage. Prism Split (the evolution): two shards of light split off each throw, flying straight on either side.
// Shard Orbit (the special): both rings set spinning round him for orbit.dur s, cutting what they pass every tick s
export const CHAKRAM = { reach: 9, leap: 5, cuts: 3, speed: 18, dmg: 21, poise: 10,
  prism: { n: 2, spread: 0.32, dmg: 14, len: 8 }, orbit: { dur: 3.5, r: 1.7, tick: 0.35, dmg: 6, poise: 4, cd: 10, cost: 10 } };

function chakramCombos(C) {
  return {
    cc2: withDmg(C.c2, [14], { cost: 11 }),
    // Glass Storm: (two slashes) both arms out wide and the body turned round twice, the rings a blur round him
    cStorm: {
      dur: 0.8, cost: 20, comboMove: true, track: 0.06, trail: [0.06, 0.56], hand: 'B', sfx: [0.06, 'heavySwing'], cancel: 0.58,
      keys: [[0.08, { hips: [0, -1.5, 0], torso: [0.1, -0.2, 0], armR: [-1.5, 0, -1.3], foreR: [-0.1, 0, 0], armL: [-1.5, 0, 1.3], foreL: [-0.1, 0, 0], by: -0.1 }],
        [0.28, { hips: [0, 3.1, 0], torso: [0.1, 0, 0], armR: [-1.5, 0, -1.4], foreR: [-0.1, 0, 0], armL: [-1.5, 0, 1.4], foreL: [-0.1, 0, 0], by: -0.12 }],
        [0.5, { hips: [0, 9.42, 0], torso: [0.15, 0, 0], armR: [-1.5, 0, -1.4], armL: [-1.5, 0, 1.4], by: -0.14 }],
        [0.66, { hips: [0, 12.57, 0], torso: [0.3, 0, 0], ...CK_GUARD_R, ...CK_GUARD_L, ...crouch(0.8) }]],
      hits: [{ t0: 0.08, t1: 0.3, range: 2.3, arc: 6.3, dmg: 20, poise: 10, cut: 'slash' }, { t0: 0.32, t1: 0.56, range: 2.3, arc: 6.3, dmg: 34, poise: 18, cut: 'slash' }],
      move: [[0.05, 0.5, 1.0]],
      onTime: [{ t: 0.3, fn: (p, g) => g.deepw?.glassBurst(p, p.pos.clone().setY(1.0 + (p.pos.y || 0)), 0.8) }],
      onHitShake: 0.35, finisher: 'Glass Storm',
    },
    // Ricochet: (the throw, a slash) a pair of glass rings cut from nothing and flung out together, each cutting its
    // way from enemy to enemy before it shatters
    cc1: withDmg(C.c1, [13], { cost: 11 }),
    cTwin: {
      dur: 0.62, cost: 22, comboMove: true, track: 0.2, trail: [0.16, 0.28], hand: 'B', sfx: [0.18, 'heavySwing'], cancel: 0.44,
      keys: [[0.14, { torso: [-0.2, 0, 0], armR: [0.4, 0, -1.2], foreR: [-1.2, 0, 0], armL: [0.4, 0, 1.2], foreL: [-1.2, 0, 0], ...crouch(0.9) }],
        [0.24, { torso: [0.5, 0, 0], armR: [-1.5, 0, 0.3], foreR: [-0.1, 0, 0], armL: [-1.5, 0, -0.3], foreL: [-0.1, 0, 0], ...lunge(1.3) }],
        [0.46, { torso: [0.4, 0, 0], armR: [-1.4, 0, 0.3], armL: [-1.4, 0, -0.3], ...lunge(1.0) }]],
      hits: [],
      onTime: [{ t: 0.23, fn: (p, g) => { g.deepw?.throwChakram(p, { ghost: true, spread: -0.25, dmg: 26, finisher: true }); g.deepw?.throwChakram(p, { ghost: true, spread: 0.25, dmg: 26, finisher: true }); } }],
      finisher: 'Ricochet',
    },
    // Shatterstep: (a slash, a roll) a flip up and over, both rings brought down as he lands, and the glass bursts
    cFlip: {
      dur: 0.84, cost: 24, comboMove: true, track: 0.25, trail: [0.3, 0.46], hand: 'B', sfx: [0.3, 'heavySwing'], cancel: 0.62,
      keys: [[0.12, { torso: [0.6, 0, 0], armR: [-2.6, 0, -0.5], armL: [-2.6, 0, 0.5], legL: [-1.4, 0, 0], shinL: [1.8, 0, 0], legR: [-1.3, 0, 0], shinR: [1.8, 0, 0] }],
        [0.24, { hips: [3.14, 0, 0], torso: [0.8, 0, 0], armR: [-0.4, 0, -0.6], armL: [-0.4, 0, 0.6], legL: [-1.6, 0, 0], shinL: [2.0, 0, 0], legR: [-1.6, 0, 0], shinR: [2.0, 0, 0] }],
        [0.38, { hips: [6.28, 0, 0], torso: [0.9, 0, 0], armR: [-0.85, 0, 0.5], foreR: [-0.2, 0, 0], armL: [-0.85, 0, -0.5], foreL: [-0.2, 0, 0], ...crouch(1.3) }],
        [0.66, { hips: [6.28, 0, 0], torso: [0.7, 0, 0], armR: [-0.85, 0, 0.5], armL: [-0.85, 0, -0.5], ...crouch(1.0) }]],
      hits: [{ t0: 0.34, t1: 0.46, range: 2.3, arc: 1.8, dmg: 56, poise: 30, cut: 'slash' }], move: [[0.04, 0.38, 2.4]], jump: [0.04, 0.38, 1.4],
      onTime: [{ t: 0.39, fn: (p, g) => g.deepw?.glassBurst(p, front(p, 1.2, 0.4), 1.2, true) }],
      onHitShake: 0.5, heavyHit: true, finisher: 'Shatterstep',
    },
  };
}
const CHAKRAM_COMBOS = [
  { id: 'storm', name: 'Glass Storm', desc: 'Two slashes, then both arms out and the body turned round twice, the rings a blur.', steps: [[A, 'c1', 0.18], [A, 'cc2', 0.19], [A, 'cStorm']] },
  { id: 'ricochet', name: 'Ricochet', desc: 'The throw, a slash, then two rings of glass from nothing flung out together, each cutting from one enemy to the next.', steps: [[H, 'heavy', 0.24], [A, 'cc1', 0.18], [H, 'cTwin']] },
  { id: 'shatter', name: 'Shatterstep', desc: 'A slash, a roll, then a flip up and over and both rings brought down as you land, the glass bursting. Plays faster.', steps: [[A, 'c1', 0.18], [R, 'roll', 0.32], [A, 'cFlip']] },
];

// ================= THE LANTERN CENSER (Adept, the Sunless Deep) =================
// a lantern on a chain, swung from the right hand (it swings for real: playerkits.js), the fire in it your chest
// glow's colour. Its swings trail fire, its hits burn (part of each is fire), its slams leave the floor burning
// (deepweapons.js fireFloor). Her heavy lets the chain out to its full length. The hits charge mana, like the knife's
const CN_LOW_BACK = { armR: [0.55, 0, -0.25], foreR: [-0.2, 0, 0], handR: [0.3, 0, 0] };   // swung back low behind her
const CN_HIGH_FRONT = { armR: [-2.3, 0, -0.15], foreR: [-0.2, 0, 0], handR: [0.2, 0, 0] }; // up over in front
const CN_WIDE_R = { armR: [-1.45, 0, -1.25], foreR: [-0.15, 0, 0], handR: [0.2, 0, 0] };   // out wide right
const CN_WIDE_L = { armR: [-1.45, 0, 1.0], foreR: [-0.15, 0, 0], handR: [0.2, 0, 0] };     // carried across left
const CN_OVER = { armR: [-3.0, 0, -0.25], foreR: [-0.3, 0, 0], handR: [0.3, 0, 0] };       // straight up over the head
const CN_DOWN = { armR: [-0.9, 0, 0.05], foreR: [-0.1, 0, 0], handR: [0.4, 0, 0] };        // brought down in front
const CN_OFF = { armL: [-0.7, 0, 0.35], foreL: [-1.0, 0, 0], handL: [0.3, 0, 0] };         // the left hand open, warding
const UP = { x: 0, y: 1, z: 0 }; // (the axis the arcs of fire turn about)
const cnFloor = (p, g, d, r, dur) => g.deepw?.fireFloor(p, front(p, d), r, dur);
export const CENSER_ATTACKS = {
  // the underswing: from low behind her, up and over in front
  e1: {
    dur: 0.6, cost: 14, next: 'e2', combo: [0.25, 0.6], cancel: 0.34, track: 0.12, trail: [0.1, 0.28], sfx: [0.12, 'swing'], hand: 'R', convert: { fire: 0.35 },
    keys: [[0.1, { torso: [-0.05, -0.4, 0], ...CN_LOW_BACK, ...CN_OFF, legL: [-0.3, 0, 0], legR: [0.35, 0, 0], by: -0.06 }],
      [0.24, { torso: [0.3, 0.2, 0], ...CN_HIGH_FRONT, ...CN_OFF, ...lunge(1.1) }],
      [0.44, { torso: [0.25, 0.15, 0], ...CN_HIGH_FRONT, armR: [-1.9, 0, -0.1], ...CN_OFF, ...lunge(0.9) }]],
    hits: [{ t0: 0.15, t1: 0.28, range: 2.7, arc: 1.6, dmg: 13, poise: 9 }], move: [[0.06, 0.24, 0.6]],
  },
  // the whirl: flat round from right to left on a long chain
  e2: {
    dur: 0.64, cost: 15, next: 'e3', combo: [0.26, 0.64], cancel: 0.36, track: 0.12, trail: [0.12, 0.3], sfx: [0.13, 'swing'], hand: 'R', convert: { fire: 0.35 },
    keys: [[0.1, { torso: [0.1, -0.7, 0], head: [0, 0.35, 0], ...CN_WIDE_R, ...CN_OFF, legL: [0.3, 0, 0], legR: [-0.3, 0, 0], by: -0.06 }],
      [0.26, { torso: [0.2, 0.75, 0], head: [0, -0.3, 0], ...CN_WIDE_L, ...CN_OFF, ...lunge(1.1), by: -0.1 }],
      [0.48, { torso: [0.15, 0.6, 0], ...CN_WIDE_L, ...CN_OFF, ...lunge(0.9) }]],
    hits: [{ t0: 0.15, t1: 0.3, range: 2.9, arc: 3.0, dmg: 14, poise: 9 }], move: [[0.06, 0.24, 0.6]],
  },
  // the fall: up over her head and brought down on the floor in front, and the oil catches where it lands
  e3: {
    dur: 0.7, cost: 16, next: 'e1', combo: [0.3, 0.7], cancel: 0.4, track: 0.16, trail: [0.16, 0.32], sfx: [0.16, 'heavySwing'], hand: 'R', convert: { fire: 0.5 },
    keys: [[0.14, { torso: [-0.35, 0, 0], head: [-0.15, 0, 0], ...CN_OVER, armL: [-1.4, 0, 0.3], foreL: [-0.5, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0] }],
      [0.28, { torso: [0.75, 0, 0], ...CN_DOWN, ...CN_OFF, ...crouch(1.0) }],
      [0.52, { torso: [0.6, 0, 0], ...CN_DOWN, ...CN_OFF, ...crouch(0.8) }]],
    hits: [{ t0: 0.2, t1: 0.32, range: 2.7, arc: 1.1, dmg: 19, poise: 13 }], move: [[0.1, 0.28, 0.8]],
    onTime: [{ t: 0.29, fn: (p, g) => cnFloor(p, g, 2.2, 1.1, 2.5) }],
  },
  // heavy: the long arc (8 mana): the chain let all the way out and swung in a wide flat arc, the floor catching
  // along it
  heavy: {
    dur: 0.86, cost: 14, mana: 8, next: 'e1', combo: [0.42, 0.86], cancel: 0.5, track: 0.2, trail: [0.22, 0.44], sfx: [0.22, 'heavySwing'], hand: 'R', convert: { fire: 0.6 },
    keys: [[0.16, { torso: [-0.1, -0.85, 0], head: [0, 0.5, 0], armR: [-1.0, 0, -1.5], foreR: [0, 0, 0], handR: [0.1, 0, 0], ...CN_OFF, legL: [0.35, 0, 0], legR: [-0.35, 0, 0], by: -0.1 }],
      [0.36, { torso: [0.3, 0.9, 0], head: [0, -0.4, 0], armR: [-1.4, 0, 1.2], foreR: [0, 0, 0], handR: [0.1, 0, 0], ...CN_OFF, ...lunge(1.3), by: -0.16 }],
      [0.66, { torso: [0.25, 0.7, 0], armR: [-1.2, 0, 1.0], foreR: [-0.2, 0, 0], ...CN_OFF, ...lunge(1.0) }]],
    hits: [{ t0: 0.24, t1: 0.44, range: 3.8, arc: 2.7, dmg: 24, poise: 16 }], move: [[0.12, 0.36, 0.7]],
    onTime: [{ t: 0.04, fn: (p, g) => g.deepw?.lanternFlare(p, 0.3) }, { t: 0.4, fn: (p, g) => { for (const a of [-0.7, 0, 0.7]) { const f = p.fwd().clone().applyAxisAngle(UP, a); g.deepw?.fireFloor(p, p.pos.clone().addScaledVector(f, 3.0).setY(p.pos.y || 0), 0.9, 2.2); } } }],
  },
};
// Blinding Flare (the special): mana, how long the lantern is held up before it flares, reach (m), how long a boss is
// slowed, the fire it does, the cooldown. Wildfire (the evolution): every jump s, the fire leaps from each burning
// enemy to the nearest that isn't, within leap m, up to max a time
export const FLARE = { mana: 30, at: 0.42, r: 6, bossSlow: 2.5, dmg: 12, cd: 12, wild: { every: 0.8, leap: 4.5, max: 3 } };

function censerCombos(E) {
  return {
    ec2: withDmg(E.e2, [16], { cost: 16 }),
    // Pyre Dance: (an underswing, a whirl) the chain let out and the lantern swung round her twice, and the fire
    // goes out of it in a ring
    eSpin: {
      dur: 0.9, cost: 20, mana: 8, comboMove: true, track: 0.08, trail: [0.08, 0.6], hand: 'R', sfx: [0.08, 'heavySwing'], cancel: 0.62, convert: { fire: 0.5 },
      keys: [[0.08, { hips: [0, -1.4, 0], torso: [0.15, -0.3, 0], ...CN_WIDE_R, ...CN_OFF, by: -0.12 }],
        [0.3, { hips: [0, 3.1, 0], torso: [0.2, 0.3, 0], ...CN_WIDE_R, ...CN_OFF, by: -0.14 }],
        [0.52, { hips: [0, 9.42, 0], torso: [0.25, 0.3, 0], ...CN_WIDE_R, ...CN_OFF, by: -0.14 }],
        [0.7, { hips: [0, 12.57, 0], torso: [0.3, 0.2, 0], ...CN_DOWN, ...CN_OFF, ...crouch(0.9) }]],
      hits: [{ t0: 0.1, t1: 0.32, range: 3.2, arc: 6.3, dmg: 18, poise: 10 }, { t0: 0.34, t1: 0.58, range: 3.2, arc: 6.3, dmg: 28, poise: 16 }],
      move: [[0.05, 0.5, 0.6]],
      onTime: [{ t: 0.6, fn: (p, g) => g.deepw?.boilerBurst(p, 3.6, 34) }],
      finisher: 'Pyre Dance',
    },
    // Beacon: (the long arc, an underswing) the lantern swung up high and brought down, and a pillar of fire goes up
    // where it lands (14 mana)
    ec1: withDmg(E.e1, [14], { cost: 14 }),
    eBeacon: {
      dur: 0.9, cost: 20, mana: 14, comboMove: true, track: 0.2, trail: [0.26, 0.42], hand: 'R', sfx: [0.26, 'heavySwing'], cancel: 0.62, convert: { fire: 0.6 },
      keys: [[0.22, { torso: [-0.4, 0, 0], head: [-0.2, 0, 0], ...CN_OVER, armL: [-2.8, 0, 0.2], foreL: [-0.3, 0, 0], ...lunge(0.5) }],
        [0.36, { torso: [0.85, 0, 0], ...CN_DOWN, armL: [-0.6, 0, 0.5], foreL: [-0.5, 0, 0], ...crouch(1.2) }],
        [0.66, { torso: [0.7, 0, 0], ...CN_DOWN, armL: [-0.6, 0, 0.5], ...crouch(1.0) }]],
      hits: [{ t0: 0.3, t1: 0.42, range: 2.8, arc: 1.2, dmg: 24, poise: 18 }], move: [[0.1, 0.34, 0.6]],
      onTime: [{ t: 0.37, fn: (p, g) => g.deepw?.pillar(p, front(p, 2.3), 2.6, 42) }],
      onHitShake: 0.45, finisher: 'Beacon',
    },
    // Ember Step: (an underswing, a roll) the lantern dragged round low at ankle height, the floor catching in an arc
    eSweep: {
      dur: 0.74, cost: 18, comboMove: true, track: 0.1, trail: [0.14, 0.42], hand: 'R', sfx: [0.14, 'heavySwing'], cancel: 0.52, convert: { fire: 0.5 },
      keys: [[0.12, { torso: [0.6, -0.8, 0], armR: [-0.4, 0, -1.4], foreR: [0, 0, 0], ...CN_OFF, ...crouch(1.4) }],
        [0.3, { torso: [0.7, 0.2, 0], armR: [-0.5, 0, 0.2], foreR: [0, 0, 0], ...CN_OFF, ...crouch(1.5) }],
        [0.46, { torso: [0.6, 0.9, 0], armR: [-0.5, 0, 1.3], foreR: [0, 0, 0], ...CN_OFF, ...crouch(1.3) }],
        [0.62, { torso: [0.4, 0.6, 0], armR: [-0.6, 0, 1.0], ...CN_OFF, ...crouch(0.9) }]],
      hits: [{ t0: 0.16, t1: 0.44, range: 3.0, arc: 3.4, dmg: 34, poise: 20 }], move: [[0.05, 0.4, 0.8]],
      onTime: [{ t: 0.44, fn: (p, g) => { for (const a of [-1.1, -0.55, 0, 0.55, 1.1]) { const f = p.fwd().clone().applyAxisAngle(UP, a); g.deepw?.fireFloor(p, p.pos.clone().addScaledVector(f, 2.4).setY(p.pos.y || 0), 0.85, 3.0); } } }],
      finisher: 'Ember Step',
    },
  };
}
const CENSER_COMBOS = [
  { id: 'pyre', name: 'Pyre Dance', desc: 'An underswing, a whirl, then the lantern swung round you twice on its full chain and the fire bursts out of it in a ring (8 mana).', steps: [[A, 'e1', 0.25], [A, 'ec2', 0.26], [A, 'eSpin']] },
  { id: 'beacon', name: 'Beacon', desc: 'The long arc, an underswing, then the lantern brought down from high and a pillar of fire goes up where it lands (14 mana).', steps: [[H, 'heavy', 0.42], [A, 'ec1', 0.25], [H, 'eBeacon']] },
  { id: 'ember', name: 'Ember Step', desc: 'An underswing, a roll, then the lantern dragged round at ankle height, the floor catching fire in an arc.', steps: [[A, 'e1', 0.25], [R, 'roll', 0.38], [A, 'eSweep']] },
];

// a region weapon's class overrides (player.js weaponChar adds the combos). trail 'glow': the swing trail takes the
// wearer's chest glow colour
export const WEAPON_SETS = {
  greatsword: { style: 'slab', attacks: GREAT_ATTACKS, extra: greatCombos, light: 'g1', combos: GREAT_COMBOS, special: 'quake', dual: false, trail: 0xcfd4dc, model: { weapon: 'greatsword', shield: false } },
  wristblade: { style: 'rknife', attacks: WRIST_ATTACKS, extra: wristCombos, light: 'w1', combos: WRIST_COMBOS, special: 'dash', dual: false, trail: 0xff7a5a, model: { weapon: 'wristblade' } },
  psystaff: { style: 'staff', attacks: STAFF_ATTACKS, extra: staffCombos, light: 't1', combos: STAFF_COMBOS, special: 'sigil', dual: false, boltHeavy: false, trail: 0xc890ff, model: { weapon: 'psystaff' } },
  // the Sunless Deep's
  pitbreaker: { style: 'piston', attacks: PIT_ATTACKS, extra: pitCombos, light: 'p1', combos: PIT_COMBOS, special: 'piston', dual: false, trail: 'glow', model: { weapon: 'pitbreaker', shield: false } },
  chakrams: { style: 'chakram', attacks: CHAKRAM_ATTACKS, extra: chakramCombos, light: 'c1', combos: CHAKRAM_COMBOS, special: 'orbit', dual: true, trail: 'glow', model: { weapon: 'chakrams' } },
  censer: { style: 'censer', attacks: CENSER_ATTACKS, extra: censerCombos, light: 'e1', combos: CENSER_COMBOS, special: 'flare', dual: false, boltHeavy: false, trail: 'glow', model: { weapon: 'censer' } },
};
