// Baked motion clips (scripts/bake-anims.mjs: Mixamo's Locomotion Pack, Quaternius' Universal Animation Library
// (CC0), turned into our rig's poses) and the gait built from them, split as games do it:
//   the lower body: an 8-way blend by the way you move against the way you face: forward (walk, run, sprint by real
//     ground speed), sideways (Mixamo's strafe walk and strafe run, each side its own), and back (the forward gait in
//     reverse; there's no backward clip); diagonals mix their neighbours with a little orientation warp of the hips.
//     Every clip starts on the same footfall and the cycle runs as far as the ground covered, so they blend foot for
//     foot without sliding. Turning on the spot steps the feet round (Mixamo's turn, the spin taken out)
//   the upper body: facing where the body faces (locked on), standing tall (a posture pass: the clips are made for a
//     lean mannequin; on a broad knight their stoop reads as an ape), steady (no rocking side to side), the shoulders
//     turning a little with the steps; turning leans into the turn; the weapon's hold on top (anims.js styleArms)
// Visual only: nothing here moves anyone.
import { Quaternion, Euler, Vector3 } from 'three';
import DATA from './anim-data/clips.json';
import { styleArms } from './anims.js';

const JOINTS = ['hips', 'torso', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'legR', 'shinR'];
const GAITS = ['walk', 'jog', 'sprint'];
// which clip plays each pace in each direction: Mixamo's where baked, else Quaternius' (and a side step made from the
// forward gait when there's no strafe)
const MIX = !!DATA.mRun;
const SET = {
  idle: MIX ? 'mIdle' : 'idle',
  f: MIX ? { walk: 'mWalk', jog: 'mRun', sprint: 'sprint' } : { walk: 'walk', jog: 'jog', sprint: 'sprint' },
  L: DATA.strafeRunL ? { walk: 'strafeWalkL', jog: 'strafeRunL', sprint: 'strafeRunL' } : null,
  R: DATA.strafeRunR ? { walk: 'strafeWalkR', jog: 'strafeRunR', sprint: 'strafeRunR' } : null,
};
const WALK_SPEED = DATA[SET.f.walk].speed, RUN_SPEED = Math.min(4, DATA[SET.f.jog].speed);
// posture over the clips (they're made for a lean mannequin; on our broad, blocky knights the same motion reads as a
// stooping ape): lean - how much of the clip's forward lean of the chest is kept (the head stays level whatever);
// armOut - how much of the arms' swing away from the body is kept (tucked in close); crouch - how much of the hips'
// drop is kept
const POSTURE = { lean: 0.3, armOut: 0.3, crouch: 0.5, headLevel: 0.06 };
// the shoulders while moving: swing (turning against the hips each step), dip (toward the planted foot), sway (the
// weight going foot to foot on a side step)
const SHOULDERS = { swing: 0.16, dip: 0, sway: 0 }; // (no rocking side to side: the shoulders turning with each stride, about the spine)
// an arm the weapon's stance holds still pumps this much (radians each way at a run) with the stride, against the legs
const ARM_PUMP = 0.3;
// how much of the hips' side-to-side roll the clips have is kept (the legs need a little; the body above doesn't)
const HIP_ROLL = 0.25;
// a side step covers this much of a forward stride's ground
const SIDE_STEP = 0.6;

// A side step, made from the forward gait at the same moment (no sideways clip in the free library; a Mixamo strafe
// can take its place): each leg's swing forward and back becomes a swing out and in, so the lead foot reaches out
// toward the way you're going while the trail foot closes behind it, the knees still lifting; the hips square and
// rocking with the weight. dirSide: +1 moving to the body's left, -1 to its right
function sideStep(F, dirSide, moving) {
  const out = { by: F.by * 0.6 };
  const hipX = F.hips[0];
  for (const [leg, shin, sg] of [['legL', 'shinL', 1], ['legR', 'shinR', -1]]) {
    const swing = F[leg][0] + hipX; // (forward of straight down, with the hips' tilt taken out)
    out[leg] = [-0.04 + swing * 0.12, 0, dirSide * -swing * 0.5 + sg * 0.04];
    out[shin] = [F[shin][0] * 0.75, 0, 0];
  }
  out.hips = [0.04, F.hips[1] * 0.3, -(F.legL[0] - F.legR[0]) * 0.05 * dirSide * moving];
  return out;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// rotations for the blend and the upper body (joint angles are XYZ Euler, as Rig.apply sets them)
const _e = new Euler(), _v = new Vector3(), Y = new Vector3(0, 1, 0), X = new Vector3(1, 0, 0), Z = new Vector3(0, 0, 1);
const qOf = (a) => new Quaternion().setFromEuler(_e.set(a[0], a[1], a[2], 'XYZ'));
const eOf = (q) => { _e.setFromQuaternion(q, 'XYZ'); return [_e.x, _e.y, _e.z]; };
const axis = (ax, a) => new Quaternion().setFromAxisAngle(ax, a);
// a weighted blend of joint rotations (each a [x, y, z] Euler), as rotations: nlerp, signs aligned
function blendRot(list) {
  const out = new Quaternion(0, 0, 0, 0), ref = qOf(list[0][0]);
  for (const [a, w] of list) {
    if (w <= 0) continue;
    const q = qOf(a); if (q.dot(ref) < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; }
    out.x += q.x * w; out.y += q.y * w; out.z += q.z * w; out.w += q.w * w;
  }
  return eOf(out.normalize());
}
// a world rotation's heading (yaw) and the same rotation with its heading taken out
const yawOf = (q) => { _v.set(0, 0, 1).applyQuaternion(q); return Math.atan2(_v.x, _v.z); };
const unyaw = (q) => axis(Y, -yawOf(q)).multiply(q);
const wrap = (a) => { a %= Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; };

export const hasClips = () => !!DATA[SET.f.jog];

// a clip's pose at u (0..1 of its length, wrapping), between its two nearest frames, into `out` scaled by w
function addClip(out, name, u, w) {
  const C = DATA[name]; if (!C || w <= 0) return;
  const n = C.by.length, x = ((u % 1) + 1) % 1 * n, i = Math.floor(x) % n, j = (i + 1) % n, f = x - Math.floor(x);
  for (const k of JOINTS) {
    const A = C.f[k], o = out[k] || (out[k] = [0, 0, 0]);
    for (let c = 0; c < 3; c++) { let a = A[i * 3 + c], b = A[j * 3 + c]; if (b - a > Math.PI) b -= Math.PI * 2; else if (a - b > Math.PI) b += Math.PI * 2; o[c] += (a + (b - a) * f) * w; }
  }
  out.by = (out.by || 0) + (C.by[i] + (C.by[j] - C.by[i]) * f) * w;
}
// how far one cycle of a gait clip carries you
const stride = (name) => (DATA[name].speed || 1) * DATA[name].dur;

// The pose for a moving body. who: the actor (keeps its gait's state on it); o: { speed (m/s over the ground),
// dir (the way it moves, relative to where it faces: 0 ahead, ±PI/2 sideways (+ to its left), PI back), turn (how
// fast it turns, rad/s), sprint, time, scale (the body's size: a bigger body takes longer strides) }
export function gaitPose(who, style, dt, o) {
  const G = who._gait || (who._gait = { u: 0, tu: 0, wt: 0, tdir: 1, w: { idle: 1, walk: 0, jog: 0, sprint: 0 }, d: { f: 1, b: 0, l: 0, r: 0 }, lean: 0, twist: 0 });
  const sc = o.scale || 1, sp = (o.speed || 0) / sc, k = 1 - Math.exp(-dt * 9);
  // the pace, by speed (eased, so a change of pace blends over a moment)
  const want = { idle: 0, walk: 0, jog: 0, sprint: 0 };
  if (o.sprint && sp > 2) want.sprint = 1;
  else if (sp < 0.15) want.idle = 1;
  else if (sp < WALK_SPEED) { const t = (sp - 0.15) / (WALK_SPEED - 0.15); want.idle = 1 - t; want.walk = t; }
  else if (sp < RUN_SPEED) { const t = (sp - WALK_SPEED) / (RUN_SPEED - WALK_SPEED); want.walk = 1 - t; want.jog = t; }
  else want.jog = 1;
  for (const c in want) G.w[c] += (want[c] - G.w[c]) * k;
  // the direction against the facing, as weights that always sum to one (an 8-way blend: a diagonal is half of each
  // neighbour)
  const dir = sp > 0.25 ? (o.dir || 0) : 0, c = Math.cos(dir), sn = Math.sin(dir);
  const wantD = { f: Math.max(0, c) ** 2, b: Math.max(0, -c) ** 2, l: Math.max(0, sn) ** 2, r: Math.max(0, -sn) ** 2 };
  for (const d in wantD) G.d[d] += (wantD[d] - G.d[d]) * k;
  // the cycle: as far through as the ground covered (each direction's clips' strides, weighted)
  let gw = 0; for (const g of GAITS) gw += G.w[g];
  const strideOf = (set) => { let L = 0; for (const g of GAITS) L += G.w[g] * stride(set[g]); return L / (gw || 1); };
  const sideStride = SET.L ? strideOf(SET.L) : strideOf(SET.f) * SIDE_STEP, fStride = strideOf(SET.f);
  if (gw > 0.01) G.u += dt * sp / (fStride * (G.d.f + G.d.b) + sideStride * (G.d.l + G.d.r));
  // a little orientation warp: on a diagonal the hips turn partly toward the line of travel
  const warp = sp > 0.3 ? 0.22 * Math.sin(2 * dir) : 0;
  G.twist += (warp - G.twist) * k;
  // turning: lean into it moving; standing, the feet step round (a turn's cycle per quarter turn)
  G.lean += (clamp(-(o.turn || 0) * 0.05 * Math.min(1, sp / 2), -0.22, 0.22) - G.lean) * (1 - Math.exp(-dt * 6));
  const turning = DATA.turnL && sp < 0.4 && Math.abs(o.turn || 0) > 0.8;
  G.wt += ((turning ? 1 : 0) - G.wt) * (1 - Math.exp(-dt * 8));
  if (turning) { G.tdir = o.turn > 0 ? 1 : -1; G.tu += dt * Math.abs(o.turn) / (Math.PI / 2); }

  // ---- each direction's pose at this moment of the cycle ----
  const idleU = (o.time || 0) / DATA[SET.idle].dur;
  const dirPose = (set, rev) => {
    const P = {};
    addClip(P, SET.idle, idleU, G.w.idle);
    for (const g of GAITS) addClip(P, set[g], rev ? DATA[set[g]].sync - G.u : G.u + DATA[set[g]].sync, G.w[g]);
    const tot = G.w.idle + gw || 1; for (const j of JOINTS) P[j] = P[j].map((v) => v / tot); P.by /= tot;
    return P;
  };
  const fwd = dirPose(SET.f), back = G.d.b > 0.01 ? dirPose(SET.f, true) : fwd;
  const moving = gw / (G.w.idle + gw || 1);
  const left = G.d.l > 0.01 ? (SET.L ? dirPose(SET.L) : sideStep(fwd, 1, moving)) : fwd;
  const right = G.d.r > 0.01 ? (SET.R ? dirPose(SET.R) : sideStep(fwd, -1, moving)) : fwd;
  const p = {}, parts = [[fwd, G.d.f], [back, G.d.b], [left, G.d.l], [right, G.d.r]];
  for (const j of JOINTS) p[j] = blendRot(parts.map(([P, w]) => [P[j] || fwd[j], w]));
  p.by = parts.reduce((a, [P, w]) => a + (P.by ?? fwd.by) * w, 0);
  // stepping round on the spot: the lower body from the turn
  if (G.wt > 0.01) {
    const T = {}; addClip(T, G.tdir > 0 ? 'turnL' : 'turnR', G.tu, 1);
    for (const j of ['hips', 'legL', 'shinL', 'legR', 'shinR']) p[j] = p[j].map((v, q) => v + (T[j][q] - v) * G.wt);
    p.by += (T.by - p.by) * G.wt;
  }

  // ---- the upper body, worked out in the world: the chest squared to where the body faces (whatever the hips do:
  // Mixamo's strafes turn them most of the way to the line of travel), standing tall, the shoulders moving ----
  const s = Math.min(1, sp / 4), ph = G.u * Math.PI * 2, side = G.d.l + G.d.r;
  // the hips: their heading (smoothed, so the twist each step doesn't rock everything above; a strafe's big steady turn
  // stays), their forward tilt, and only a little of their roll side to side
  const hq = qOf(p.hips), hy = yawOf(hq), rest = unyaw(hq);
  G.hy = (G.hy ?? hy) + wrap(hy - (G.hy ?? hy)) * (1 - Math.exp(-dt * 5));
  _v.set(0, 1, 0).applyQuaternion(rest); const hPitch = Math.atan2(_v.z, _v.y), hRoll = Math.atan2(-_v.x, _v.y);
  const hipsQ = axis(Y, G.hy + G.twist).multiply(axis(Z, G.lean * 0.3 + hRoll * HIP_ROLL)).multiply(axis(X, hPitch)); // (the warp toward a diagonal, the turn's lean)
  // the chest keeps only its forward lean (a part of it): no roll side to side, no turn
  const c0 = unyaw(hq.clone().multiply(qOf(p.torso))); _v.set(0, 1, 0).applyQuaternion(c0); const pitch = Math.atan2(_v.z, _v.y);
  let chest = axis(X, pitch * POSTURE.lean);
  // the shoulders turning a little against the hips each step (no dip or sway: SHOULDERS); the turn.s lean, halved
  chest = axis(Z, Math.sin(ph) * (SHOULDERS.dip * s + SHOULDERS.sway * side) * moving + G.lean * 0.5).multiply(chest).multiply(axis(Y, Math.cos(ph) * SHOULDERS.swing * s * moving)); // (the twist about the spine itself, so it never tips the chest sideways)
  p.hips = eOf(hipsQ);
  p.torso = eOf(hipsQ.clone().invert().multiply(chest));
  // the head level and looking where the body faces, steady over the moving shoulders
  p.head = eOf(chest.clone().invert().multiply(axis(X, POSTURE.headLevel)));
  for (const [a, sg] of [['armL', 1], ['armR', -1]]) { const z = p[a][2] * sg; p[a][2] = sg * (0.12 + (z - 0.12) * POSTURE.armOut); }
  p.by *= POSTURE.crouch;
  // the weapon in hand: the arms its stance wants, the free arm swinging with the stride
  const sw = Math.sin(ph) * (0.12 + 0.5 * s + (o.sprint ? 0.25 : 0));
  const clipArms = { armL: p.armL.slice(), armR: p.armR.slice() };
  styleArms(style, p, s, sw, !!o.sprint);
  // the arms with the stride: one the stance holds still (the sword arm, both on a great blade) still pumps forward and
  // back against the legs, the elbow working with it; a free arm keeps the clip's own swing
  const pump = Math.sin(ph) * ARM_PUMP * s * moving * (o.sprint ? 0.4 : 1); // (a sprinting stance swings the arm already)
  for (const [a, f, sg] of [['armR', 'foreR', 1], ['armL', 'foreL', -1]]) {
    if (p[a].every((v, i) => Math.abs(v - clipArms[a][i]) < 1e-6)) continue;
    p[a] = [p[a][0] + pump * sg, p[a][1], p[a][2]];
    p[f] = [p[f][0] - Math.abs(pump) * 0.4, p[f][1], p[f][2]];
  }
  return p;
}
