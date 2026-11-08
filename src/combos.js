// Combos. Each class has 4 to start with (one 3-move, three 4-move; 4 more come later with the evolution).
// A combo starts with a normal attack. At a set moment in each move (`at`, in that move's own time) the weapon
// flashes, and for 110 ms the next input of a combo continues it with a combo move; a press outside that window
// does the button's normal action instead, and doing nothing ends it. Combos branch: after a move, each input
// that some combo continues with leads on (they share the window). Combo moves cost a fixed amount of stamina
// (more than the normal moves) and hit a little harder: a full combo deals ~20% more than its normal inputs.
// Every combo move can be interrupted, and a combo staggers each enemy at most once.
// Inputs: 'attack' (R1), 'heavy' (R2), 'roll'. A step's move: an attack key, 'roll' (roll or backstep) or 'bolt'.
export const COMBO_WINDOW = 0.11;

// ---------- pose helpers ----------
const lunge = (l = 1) => ({ legL: [-0.5 * l, 0, 0.05], legR: [0.4 * l, 0, -0.05], shinL: [0.2, 0, 0], shinR: [0.45 * l, 0, 0], by: -0.1 * l });
const crouch = (l = 1) => ({ legL: [-0.75 * l, 0, 0], legR: [0.55 * l, 0, 0], shinL: [0.45 * l, 0, 0], shinR: [0.5 * l, 0, 0], by: -0.28 * l });
const SWAP = { armL: 'armR', armR: 'armL', foreL: 'foreR', foreR: 'foreL', handL: 'handR', handR: 'handL', legL: 'legR', legR: 'legL', shinL: 'shinR', shinR: 'shinL' };
const mirrorPose = (pose) => Object.fromEntries(Object.entries(pose).map(([k, v]) => [SWAP[k] || k, Array.isArray(v) ? [v[0], -v[1], -v[2]] : v]));
const mirror = (def) => ({ ...def, keys: def.keys.map(([t, p]) => [t, mirrorPose(p)]), hand: def.hand === 'R' ? 'L' : def.hand === 'L' ? 'R' : def.hand });
const withDmg = (def, dmgs, extra = {}) => ({ ...def, hits: def.hits.map((h, i) => ({ ...h, dmg: dmgs[i] ?? h.dmg })), comboMove: true, ...extra });
// a finisher's effect in front of the player, on every screen
const front = (p, d = 1.2, y = 0) => p.pos.clone().addScaledVector(p.fwd(), d).setY(y);

// ---------- the moves ----------
// `base`: the class's normal attacks, to build variants from
export function comboMoves(kind, base) {
  if (kind === 'knight') return {
    kc2: withDmg(base.k2, [25], { cost: 20, next: 'k3' }),
    // Crown Cleave: a two-handed overhead that cracks the floor in a gold shockwave
    kCrown: {
      dur: 0.95, cost: 30, comboMove: true, track: 0.2, trail: [0.3, 0.46], sfx: [0.3, 'heavySwing'], armor: [0.18, 0.42], cancel: 0.62,
      keys: [
        [0.3, { torso: [-0.4, 0, 0], head: [-0.2, 0, 0], armR: [-3.2, 0, -0.1], foreR: [-0.7, 0, 0], handR: [0.8, 0, 0], armL: [-3.0, 0, 0.15], foreL: [-0.7, 0, 0], legL: [-0.45, 0, 0], legR: [0.2, 0, 0], by: 0.04 }],
        [0.42, { torso: [0.8, 0, 0], armR: [-0.7, 0, 0.05], foreR: [0, 0, 0], handR: [1.4, 0, 0], armL: [-0.8, 0, 0.1], foreL: [-0.1, 0, 0], ...crouch(1.2) }],
        [0.7, { torso: [0.6, 0, 0], armR: [-0.7, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.3, 0, 0], armL: [-0.7, 0, 0.1], ...crouch(1) }],
      ],
      hits: [{ t0: 0.36, t1: 0.47, range: 2.75, arc: 1.7, dmg: 48, poise: 30 }],
      move: [[0.2, 0.4, 1.0]],
      onTime: [{ t: 0.43, fn: (p, g) => { g.vfx('crownCleave', front(p, 1.3)); g.hitstop(0.05); } }],
      onHitShake: 0.55, heavyHit: true, finisher: 'Crown Cleave',
    },
    // Bulwark Breaker: shield bash, rising cut, leaping slam
    kBash: {
      dur: 0.55, cost: 18, comboMove: true, track: 0.1, sfx: [0.12, 'swing'], cancel: 0.36,
      keys: [
        [0.1, { torso: [0.1, 0.7, 0], armL: [-1.0, 0, 0.6], foreL: [-1.2, 0, 0], guard: 0.8, armR: [-0.6, 0, -0.3], ...lunge(0.6) }],
        [0.2, { torso: [0.35, -0.3, 0], armL: [-1.55, 0, -0.1], foreL: [0, 0, 0], guard: 1, armR: [-0.4, 0, -0.4], ...lunge(1.3) }],
        [0.4, { torso: [0.25, -0.2, 0], armL: [-1.3, 0, 0], foreL: [-0.3, 0, 0], guard: 0.7, armR: [-0.5, 0, -0.3], ...lunge(1) }],
      ],
      hits: [{ t0: 0.16, t1: 0.26, range: 1.9, arc: 1.7, dmg: 18, poise: 30 }],
      move: [[0.08, 0.24, 1.0]],
      onTime: [{ t: 0.2, fn: (p, g) => g.vfx('bash', front(p, 1.1, 1.1), p.fwd().clone()) }],
    },
    kRise: {
      dur: 0.6, cost: 16, comboMove: true, track: 0.1, trail: [0.12, 0.28], sfx: [0.12, 'swing'], cancel: 0.38,
      keys: [
        [0.1, { torso: [0.35, -0.5, 0], armR: [-0.2, 0, -0.6], foreR: [-0.3, 0, 0], handR: [1.6, 0, 0], ...crouch(0.8) }],
        [0.24, { torso: [-0.25, 0.4, 0], armR: [-2.9, 0, 0.3], foreR: [-0.1, 0, 0], handR: [1.1, 0, 0], legL: [-0.2, 0, 0], legR: [0.15, 0, 0], by: 0.02 }],
        [0.45, { torso: [-0.1, 0.3, 0], armR: [-2.4, 0, 0.3], foreR: [-0.3, 0, 0], handR: [1.1, 0, 0] }],
      ],
      hits: [{ t0: 0.16, t1: 0.27, range: 2.4, arc: 1.6, dmg: 30, poise: 18 }],
      move: [[0.06, 0.22, 0.7]],
    },
    kLeapSlam: withDmg(base.chargeSlam, [52], { cost: 24, finisher: 'Bulwark Breaker', next: null, combo: null }),
    // Iron Tempest: two full spins, then a lunging thrust
    kSpin: {
      dur: 0.6, cost: 12, comboMove: true, track: 0.08, trail: [0.12, 0.38], sfx: [0.12, 'heavySwing'], cancel: 0.42,
      keys: [
        [0.1, { hips: [0, 0.9, 0], torso: [0.1, 0.6, 0], armR: [-1.5, 0, 1.1], foreR: [0, 0, 0], handR: [1.45, 0, 0], ...lunge(0.6) }],
        [0.24, { hips: [0, -1.4, 0], torso: [0.2, -0.5, 0], armR: [-1.5, 0, -1.3], foreR: [0, 0, 0], handR: [1.45, 0, 0], by: -0.14 }],
        [0.36, { hips: [0, -3.2, 0], torso: [0.2, -0.6, 0], armR: [-1.4, 0, -1.2], foreR: [0, 0, 0], handR: [1.4, 0, 0], by: -0.12 }],
        [0.5, { hips: [0, -0.3, 0], torso: [0.15, -0.3, 0], armR: [-1.0, 0, -0.6], foreR: [-0.3, 0, 0], ...lunge(0.7) }],
      ],
      hits: [{ t0: 0.16, t1: 0.36, range: 2.4, arc: 6.3, dmg: 18, poise: 10 }],
      move: [[0.08, 0.34, 0.6]],
    },
    // the second spin turns the other way
    get kSpin2() {
      const flip = (pose) => Object.fromEntries(Object.entries(pose).map(([k, v]) => [k, (k === 'hips' || k === 'torso') && Array.isArray(v) ? [v[0], -v[1], v[2]] : v]));
      return { ...this.kSpin, keys: this.kSpin.keys.map(([t, pz]) => [t, flip(pz)]) };
    },
    kThrust: {
      dur: 0.75, cost: 16, comboMove: true, track: 0.16, trail: [0.26, 0.38], sfx: [0.26, 'heavySwing'], cancel: 0.5,
      keys: [
        [0.22, { torso: [-0.1, -0.7, 0], armR: [-0.4, 0, -0.3], foreR: [-1.7, 0, 0], handR: [1.6, 0, 0], armL: [-0.9, 0, 0.4], legL: [0.3, 0, 0], legR: [-0.5, 0, 0], shinR: [0.6, 0, 0], by: -0.12 }],
        [0.32, { torso: [0.45, 0.35, 0], armR: [-1.55, 0, 0], foreR: [0, 0, 0], handR: [1.55, 0, 0], armL: [-0.5, 0, 0.6], ...lunge(1.6) }],
        [0.58, { torso: [0.35, 0.25, 0], armR: [-1.45, 0, 0], foreR: [-0.1, 0, 0], handR: [1.5, 0, 0], ...lunge(1.3) }],
      ],
      hits: [{ t0: 0.27, t1: 0.37, range: 3.1, arc: 0.8, dmg: 32, poise: 25 }],
      move: [[0.24, 0.36, 1.7]],
      onTime: [{ t: 0.32, fn: (p, g) => g.vfx('steelFlash', front(p, 2.0, 1.1), p.fwd().clone()) }],
      onHitShake: 0.45, heavyHit: true, finisher: 'Iron Tempest',
    },
    // Vanguard: (slash, roll, rising cut) and an impaling two-handed stab
    kImpale: {
      dur: 0.88, cost: 20, comboMove: true, track: 0.2, trail: [0.34, 0.48], sfx: [0.34, 'heavySwing'], armor: [0.15, 0.46], cancel: 0.62,
      keys: [
        [0.3, { torso: [-0.3, 0, 0], armR: [-2.6, 0, 0.2], foreR: [-1.2, 0, 0], handR: [2.2, 0, 0], armL: [-2.4, 0, -0.3], foreL: [-1.2, 0, 0], legL: [-0.4, 0, 0], legR: [0.2, 0, 0] }],
        [0.42, { torso: [0.75, 0, 0], armR: [-1.0, 0, 0.15], foreR: [-0.3, 0, 0], handR: [2.4, 0, 0], armL: [-1.0, 0, -0.15], foreL: [-0.3, 0, 0], ...lunge(1.4), by: -0.3 }],
        [0.7, { torso: [0.6, 0, 0], armR: [-1.0, 0, 0.15], foreR: [-0.3, 0, 0], handR: [2.3, 0, 0], armL: [-1.0, 0, -0.15], ...lunge(1.2), by: -0.26 }],
      ],
      hits: [{ t0: 0.38, t1: 0.48, range: 2.5, arc: 1.2, dmg: 68, poise: 30 }],
      move: [[0.3, 0.44, 1.2]],
      onTime: [{ t: 0.44, fn: (p, g) => g.vfx('impaleSteel', front(p, 1.4, 1.0)) }],
      onHitShake: 0.6, heavyHit: true, finisher: 'Vanguard',
    },
  };
  if (kind === 'rogue') {
    const R = base;
    return {
      rc2: withDmg(R.r2, [17], { cost: 14 }),
      // Thousand Cuts: a blur of four stabs
      rFlurry: {
        dur: 0.72, cost: 20, comboMove: true, track: 0.1, trail: [0.06, 0.5], hand: 'B', sfx: [0.06, 'swing'], cancel: 0.5,
        keys: [0.08, 0.2, 0.32, 0.44].map((t, i) => [t, i % 2
          ? { torso: [0.25, -0.4, 0], armL: [-1.6, 0, 0.1], foreL: [0, 0, 0], handL: [1.5, 0, 0], armR: [-0.7, 0, -0.3], foreR: [-1.2, 0, 0], ...lunge(1) }
          : { torso: [0.25, 0.4, 0], armR: [-1.6, 0, -0.1], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.7, 0, 0.3], foreL: [-1.2, 0, 0], ...lunge(1.1) }]).concat([[0.6, { torso: [0.2, 0, 0], armR: [-1.2, 0, -0.3], armL: [-1.2, 0, 0.3], ...lunge(0.8) }]]),
        hits: [0.09, 0.21, 0.33, 0.45].map((t) => ({ t0: t, t1: t + 0.07, range: 2.0, arc: 1.4, dmg: 7, poise: 3 })),
        move: [[0.05, 0.45, 0.8]],
        onTime: [{ t: 0.46, fn: (p, g) => g.vfx('flurryEnd', front(p, 1.2, 1.1), p.fwd().clone()) }],
        finisher: 'Thousand Cuts',
      },
      // Viper's Dance: (stab, roll) a flank cut and a spinning cross-cut
      rFlank: withDmg(mirror(R.r1), [26], { cost: 18, dur: 0.46 }),
      rSpinX: {
        dur: 0.74, cost: 22, comboMove: true, track: 0.1, trail: [0.1, 0.42], hand: 'B', sfx: [0.1, 'heavySwing'], cancel: 0.5,
        keys: [
          [0.1, { hips: [0, -1.4, 0], torso: [0.15, -0.3, 0], armR: [-1.5, 0, -1.4], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.5, 0, 1.4], foreL: [0, 0, 0], handL: [1.5, 0, 0], by: -0.2 }],
          [0.26, { hips: [0, 1.6, 0], torso: [0.2, 0.3, 0], armR: [-1.5, 0, -1.3], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.5, 0, 1.3], foreL: [0, 0, 0], handL: [1.5, 0, 0], by: -0.16 }],
          [0.4, { hips: [0, 3.1, 0], torso: [0.3, 0, 0], armR: [-1.6, 0, 0.5], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-1.6, 0, -0.5], foreL: [0, 0, 0], handL: [1.5, 0, 0], ...lunge(1) }],
          [0.58, { hips: [0, 0.2, 0], torso: [0.2, 0, 0], armR: [-0.9, 0, -0.6], armL: [-0.9, 0, 0.6], ...lunge(0.7) }],
        ],
        hits: [{ t0: 0.14, t1: 0.26, range: 2.2, arc: 4.2, dmg: 28, poise: 8 }, { t0: 0.3, t1: 0.4, range: 2.2, arc: 4.2, dmg: 28, poise: 10 }],
        move: [[0.08, 0.38, 0.9]],
        onTime: [{ t: 0.38, fn: (p, g) => g.vfx('xSlash', front(p, 1.1, 1.1), p.fwd().clone(), false) }],
        finisher: "Viper's Dance",
      },
      // Hemorrhage: (lunge) two quick cuts, then an X slash that bursts blood
      rCut1: withDmg(R.r1, [14], { cost: 12 }),
      rCut2: withDmg(R.r2, [14], { cost: 12 }),
      rXSlash: {
        dur: 0.78, cost: 22, comboMove: true, track: 0.16, trail: [0.26, 0.42], hand: 'B', sfx: [0.26, 'heavySwing'], cancel: 0.55,
        keys: [
          [0.22, { torso: [-0.2, 0, 0], armR: [-2.7, 0, 0.6], foreR: [-0.4, 0, 0], handR: [1.4, 0, 0], armL: [-2.7, 0, -0.6], foreL: [-0.4, 0, 0], handL: [1.4, 0, 0], legL: [-0.3, 0, 0], legR: [0.2, 0, 0] }],
          [0.36, { torso: [0.55, 0, 0], armR: [-0.6, 0, -1.2], foreR: [0, 0, 0], handR: [1.5, 0, 0], armL: [-0.6, 0, 1.2], foreL: [0, 0, 0], handL: [1.5, 0, 0], ...crouch(1) }],
          [0.6, { torso: [0.4, 0, 0], armR: [-0.7, 0, -1.0], foreR: [-0.2, 0, 0], armL: [-0.7, 0, 1.0], foreL: [-0.2, 0, 0], ...crouch(0.8) }],
        ],
        hits: [{ t0: 0.28, t1: 0.34, range: 2.1, arc: 1.8, dmg: 15, poise: 10 }, { t0: 0.34, t1: 0.41, range: 2.1, arc: 1.8, dmg: 15, poise: 10 }],
        move: [[0.2, 0.36, 0.9]],
        onTime: [{ t: 0.36, fn: (p, g) => g.vfx('xSlash', front(p, 1.1, 1.1), p.fwd().clone(), true) }],
        onHitShake: 0.4, finisher: 'Hemorrhage',
      },
      // Shadow Reel: (two cuts, back-flip roll) a leaping dive stab
      rDive: {
        dur: 0.9, cost: 26, comboMove: true, track: 0.3, trail: [0.32, 0.5], hand: 'B', sfx: [0.32, 'heavySwing'], cancel: 0.64,
        keys: [
          [0.14, { torso: [-0.3, 0, 0], armR: [-2.8, 0, -0.3], foreR: [-0.6, 0, 0], armL: [-2.8, 0, 0.3], foreL: [-0.6, 0, 0], legL: [-1.0, 0, 0], shinL: [1.5, 0, 0], legR: [-0.3, 0, 0], shinR: [1.3, 0, 0] }],
          [0.4, { torso: [0.9, 0, 0], armR: [-0.9, 0, 0.1], foreR: [-0.3, 0, 0], handR: [2.0, 0, 0], armL: [-0.9, 0, -0.1], foreL: [-0.3, 0, 0], handL: [2.0, 0, 0], ...crouch(1.1) }],
          [0.7, { torso: [0.6, 0, 0], armR: [-0.9, 0, 0.1], foreR: [-0.3, 0, 0], handR: [1.8, 0, 0], armL: [-0.9, 0, -0.1], foreL: [-0.3, 0, 0], handL: [1.8, 0, 0], ...crouch(0.9) }],
        ],
        hits: [{ t0: 0.38, t1: 0.48, range: 2.2, arc: 1.4, dmg: 66, poise: 25 }],
        move: [[0.06, 0.4, 2.6]], jump: [0.05, 0.4, 1.5],
        onTime: [{ t: 0.06, fn: (p, g) => g.vfx('shroud', p.pos.clone().setY(0.4)) }, { t: 0.42, fn: (p, g) => g.vfx('redCrit', front(p, 1.0, 0.9)) }],
        onHitShake: 0.55, heavyHit: true, finisher: 'Shadow Reel',
      },
    };
  }
  // Spellsword: knife in the off hand; R2 is her frost bolt
  const S = base;
  const castPose = (t) => [t, { torso: [0.1, -0.35, 0], armR: [-1.55, 0, 0.1], foreR: [0, 0, 0], handR: [1.5, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0], shinR: [0.35, 0, 0], by: -0.06 }];
  return {
    sc1: withDmg(S.s1, [12], { cost: 16 }),
    sc2: withDmg(S.s2, [14], { cost: 18 }),
    // Rimeblade: a frost-charged thrust that bursts into ice shards
    sRime: {
      dur: 0.62, cost: 22, comboMove: true, hand: 'L', track: 0.14, trail: [0.18, 0.3], sfx: [0.18, 'swing'], cancel: 0.42,
      keys: [
        [0.16, mirrorPose({ torso: [-0.1, -0.6, 0], armR: [-0.3, 0, -0.2], foreR: [-1.75, 0, 0], handR: [1.6, 0, 0], legL: [0.3, 0, 0], legR: [-0.45, 0, 0], by: -0.1 })],
        [0.26, mirrorPose({ torso: [0.4, 0.35, 0], armR: [-1.55, 0, 0], foreR: [0, 0, 0], handR: [1.5, 0, 0], ...lunge(1.4) })],
        [0.46, mirrorPose({ torso: [0.3, 0.25, 0], armR: [-1.4, 0, 0], foreR: [-0.2, 0, 0], handR: [1.4, 0, 0], ...lunge(1.1) })],
      ],
      hits: [{ t0: 0.2, t1: 0.3, range: 2.4, arc: 1.0, dmg: 20, poise: 12 }],
      convert: { frost: 0.7 }, move: [[0.14, 0.28, 1.1]],
      onTime: [{ t: 0.27, fn: (p, g) => g.vfx('rimeBurst', front(p, 1.6, 1.1)) }],
      finisher: 'Rimeblade',
    },
    // Arc Step: (cut, roll, cut) a point-blank frost nova
    sNova: {
      dur: 0.78, cost: 20, mana: 12, comboMove: true, hand: 'L', track: 0.1, sfx: [0.28, 'fire'], cancel: 0.5,
      keys: [
        [0.24, { torso: [-0.2, 0, 0], armR: [-2.6, 0, -0.6], foreR: [-0.3, 0, 0], armL: [-2.6, 0, 0.6], foreL: [-0.3, 0, 0], ...crouch(0.5) }],
        [0.34, { torso: [0.3, 0, 0], armR: [-0.4, 0, -1.4], foreR: [0, 0, 0], armL: [-0.4, 0, 1.4], foreL: [0, 0, 0], ...crouch(1.1) }],
        [0.6, { torso: [0.2, 0, 0], armR: [-0.5, 0, -1.1], armL: [-0.5, 0, 1.1], ...crouch(0.8) }],
      ],
      onTime: [{ t: 0.32, fn: (p, g) => { g.vfx('frostNova', p.pos.clone().setY(0.1)); g.comboBlast(p, 3.2, 34, 18, 'frost'); } }],
      finisher: 'Arc Step',
    },
    // Glacial Lance: (bolt, two cuts) a fan of three ice lances
    sLances: {
      dur: 0.7, cost: 18, mana: 16, comboMove: true, track: 0.2, sfx: [0.26, 'bow'], cancel: 0.46,
      keys: [[0.16, { torso: [-0.1, -0.5, 0], armR: [-2.6, 0, -0.2], foreR: [0, 0, 0], handR: [1.5, 0, 0], legL: [-0.35, 0, 0], legR: [0.3, 0, 0] }], castPose(0.28), castPose(0.55)],
      onTime: [{ t: 0.27, fn: (p, g) => { for (const s of [-0.22, 0, 0.22]) g.spawnSpell(p, 'bolt', s, 1); g.vfx('lanceFan', front(p, 1.0, 1.25)); } }],
      finisher: 'Glacial Lance',
    },
    // Shatter: (two cuts, a bolt) a rune strike that detonates the frost
    sShatter: {
      dur: 0.75, cost: 24, comboMove: true, hand: 'L', track: 0.16, trail: [0.26, 0.4], sfx: [0.26, 'heavySwing'], cancel: 0.5,
      keys: [
        [0.22, mirrorPose({ torso: [-0.3, 0, 0], armR: [-2.9, 0, -0.1], foreR: [-0.6, 0, 0], handR: [1.1, 0, 0], legL: [-0.4, 0, 0], legR: [0.2, 0, 0] })],
        [0.36, mirrorPose({ torso: [0.7, 0, 0], armR: [-0.9, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.6, 0, 0], ...crouch(1.1) })],
        [0.6, mirrorPose({ torso: [0.5, 0, 0], armR: [-0.9, 0, 0.05], foreR: [-0.1, 0, 0], handR: [1.5, 0, 0], ...crouch(0.9) })],
      ],
      hits: [{ t0: 0.3, t1: 0.41, range: 2.3, arc: 1.5, dmg: 28, poise: 20 }],
      convert: { frost: 0.6 }, move: [[0.2, 0.36, 0.8]],
      onTime: [{ t: 0.37, fn: (p, g) => g.vfx('shatter', front(p, 1.3, 0.4)) }],
      onHitShake: 0.45, finisher: 'Shatter',
    },
  };
}

// ---------- the combos ----------
// steps: [input, move, at]: `move` is what the input does as a combo step (the first is the normal move that
// starts it); `at`: when this move's window opens (s, in the move's own time). The last step has no window.
const A = 'attack', H = 'heavy', R = 'roll';
export const COMBOS = {
  knight: [
    { id: 'crown', name: 'Crown Cleave', desc: 'Two cuts, then a two-handed overhead that cracks the floor in a gold shockwave.', steps: [[A, 'k1', 0.34], [A, 'kc2', 0.33], [A, 'kCrown']] },
    { id: 'bulwark', name: 'Bulwark Breaker', desc: 'Slash, shield bash, rising cut, then a leaping slam.', steps: [[A, 'k1', 0.34], [H, 'kBash', 0.34], [A, 'kRise', 0.36], [H, 'kLeapSlam']] },
    { id: 'tempest', name: 'Iron Tempest', desc: 'A heavy, two full spins, then a lunging thrust.', steps: [[H, 'heavy', 0.66], [A, 'kSpin', 0.44], [A, 'kSpin2', 0.44], [H, 'kThrust']] },
    { id: 'vanguard', name: 'Vanguard', desc: 'Slash, a forward roll, a rising cut, then an impaling stab.', steps: [[A, 'k1', 0.34], [R, 'roll', 0.42], [A, 'kRise', 0.36], [H, 'kImpale']] },
  ],
  rogue: [
    { id: 'cuts', name: 'Thousand Cuts', desc: 'Two stabs, then a blur of four rapid cuts.', steps: [[A, 'r1', 0.24], [A, 'rc2', 0.24], [A, 'rFlurry']] },
    { id: 'viper', name: "Viper's Dance", desc: 'Stab, a roll round the flank, a cut, then a spinning cross-cut.', steps: [[A, 'r1', 0.24], [R, 'roll', 0.34], [A, 'rFlank', 0.27], [A, 'rSpinX']] },
    { id: 'hemorrhage', name: 'Hemorrhage', desc: 'A lunge, two quick cuts, then an X slash that bursts blood.', steps: [[H, 'heavy', 0.52], [A, 'rCut1', 0.24], [A, 'rCut2', 0.24], [H, 'rXSlash']] },
    { id: 'reel', name: 'Shadow Reel', desc: 'Two cuts, a back-flip roll, then a leaping dive stab.', steps: [[A, 'r1', 0.24], [A, 'rc2', 0.24], [R, 'roll', 0.3], [H, 'rDive']] },
  ],
  mage: [
    { id: 'rime', name: 'Rimeblade', desc: 'Two knife cuts, then a frost-charged thrust that bursts into ice shards.', steps: [[A, 's1', 0.25], [A, 'sc2', 0.28], [A, 'sRime']] },
    { id: 'arc', name: 'Arc Step', desc: 'Cut, a blink roll, a cut, then a point-blank frost nova (12 mana).', steps: [[A, 's1', 0.25], [R, 'roll', 0.38], [A, 'sc2', 0.28], [H, 'sNova']] },
    { id: 'lance', name: 'Glacial Lance', desc: 'A bolt, two cuts, then a fan of three ice lances (16 mana).', steps: [[H, 'bolt', 0.3], [A, 'sc1', 0.25], [A, 'sc2', 0.28], [H, 'sLances']] },
    { id: 'shatter', name: 'Shatter', desc: 'Two cuts, a bolt, then a rune strike that detonates the frost.', steps: [[A, 's1', 0.25], [A, 'sc2', 0.28], [H, 'bolt', 0.3], [A, 'sShatter']] },
  ],
};

// the combos as a tree of inputs: root[input] -> { move, at, next: { input: node }, combo (when it ends here) }
export function comboTree(kind) {
  const root = {};
  for (const c of COMBOS[kind] || []) {
    let level = root, node = null;
    c.steps.forEach(([input, move, at], i) => {
      node = level[input] ||= { move, at, next: {}, names: [] };
      node.names.push(c.name);
      if (at != null && node.at == null) node.at = at;
      if (i === c.steps.length - 1) node.combo = c;
      level = node.next;
    });
  }
  return root;
}
