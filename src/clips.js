// Baked motion clips (scripts/bake-anims.mjs: Quaternius' Universal Animation Library, CC0, and any Mixamo clips,
// turned into our rig's poses) and the gait built from them: idle, walk, jog and sprint blended by how fast the body
// is really moving, kept in step and played at the rate their stride covers the ground (no sliding feet). The body is
// split, as games do it: the lower body is an 8-way blend (forward, back played in reverse, and a side step made from
// the forward gait; diagonals mix them with a little orientation warp of the hips), the upper body its own layer that
// keeps facing where the body faces (locked on), the shoulders swinging, dipping and swaying with the steps; turning
// leans the body into the turn. The weapon's hold goes on top
// (anims.js styleArms), so every weapon is carried as before. Visual only: nothing here moves anyone.
import DATA from './anim-data/clips.json';
import { styleArms } from './anims.js';

const JOINTS = ['hips', 'torso', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'legR', 'shinR'];
const GAITS = ['walk', 'jog', 'sprint'];
// posture over the clips (they're made for a lean mannequin; on our broad, blocky knights the same motion reads as a
// stooping ape): lean - how much of the clip's forward lean of the chest is kept (the head stays level whatever);
// armOut - how much of the arms' swing away from the body is kept (tucked in close); crouch - how much of the hips'
// drop is kept
const POSTURE = { lean: 0.3, armOut: 0.3, crouch: 0.5, headLevel: 0.06 };
// the shoulders while moving: swing (turning against the hips each step), dip (toward the planted foot), sway (the
// weight going foot to foot on a side step)
const SHOULDERS = { swing: 0.13, dip: 0.05, sway: 0.09 };
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
const wrap = (a) => { a %= Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; };

export const hasClips = () => !!DATA.jog;

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
// dir (the way it moves, relative to where it faces: 0 ahead, ±PI/2 sideways, PI back), turn (how fast it turns,
// rad/s), sprint, time, scale (the body's size: a bigger body takes longer strides) }
export function gaitPose(who, style, dt, o) {
  const G = who._gait || (who._gait = { u: 0, w: { idle: 1, walk: 0, jog: 0, sprint: 0 }, d: { f: 1, b: 0, s: 0 }, side: 1, lean: 0, twist: 0 });
  const sc = o.scale || 1, sp = (o.speed || 0) / sc;
  // which clips, by speed (eased, so a change of pace blends over a moment)
  const want = { idle: 0, walk: 0, jog: 0, sprint: 0 };
  if (o.sprint && sp > 2) want.sprint = 1;
  else if (sp < 0.15) want.idle = 1;
  else if (sp < 1.2) { const t = (sp - 0.15) / 1.05; want.idle = 1 - t; want.walk = t; }
  else if (sp < 3.2) { const t = (sp - 1.2) / 2; want.walk = 1 - t; want.jog = t; }
  else want.jog = 1;
  const k = 1 - Math.exp(-dt * 9);
  for (const c in want) G.w[c] += (want[c] - G.w[c]) * k;
  // the direction of travel against the way the body faces (positive: to its left), as four weights that always
  // sum to one: forward, back, side (an 8-way blend: a diagonal is half of each)
  const dir = sp > 0.25 ? (o.dir || 0) : 0, c = Math.cos(dir), sn = Math.sin(dir);
  const wantD = { f: Math.max(0, c) ** 2, b: Math.max(0, -c) ** 2, s: sn * sn };
  for (const d in wantD) G.d[d] += (wantD[d] - G.d[d]) * k;
  G.side += ((sn >= 0 ? 1 : -1) - G.side) * k; // (which side: eased, so a change from left to right doesn't snap)
  // the cycle: as far through as the ground covered; a side step covers less ground than a stride
  let gw = 0, len = 0; for (const g of GAITS) { gw += G.w[g]; len += G.w[g] * stride(g); }
  if (gw > 0.01) G.u += dt * sp / (len / gw * (G.d.f + G.d.b + SIDE_STEP * G.d.s));
  // a little orientation warp: on a diagonal the hips turn partly toward the line of travel (forward or back)
  const warp = sp > 0.3 ? 0.3 * Math.sin(2 * dir) : 0;
  G.twist += (warp - G.twist) * k;
  // turning: lean into it
  G.lean += (clamp(-(o.turn || 0) * 0.05 * Math.min(1, sp / 2), -0.22, 0.22) - G.lean) * (1 - Math.exp(-dt * 6));

  // ---- the lower body: hips and legs from the directional blend ----
  const fwd = {}, back = {};
  addClip(fwd, 'idle', (o.time || 0) / DATA.idle.dur, G.w.idle); addClip(back, 'idle', (o.time || 0) / DATA.idle.dur, G.w.idle);
  for (const g of GAITS) { addClip(fwd, g, G.u + DATA[g].sync, G.w[g]); addClip(back, g, DATA[g].sync - G.u, G.w[g]); }
  const tot = G.w.idle + gw || 1;
  for (const P of [fwd, back]) { for (const j of JOINTS) P[j] = P[j].map((v) => v / tot); P.by /= tot; }
  const side = sideStep(fwd, G.side, gw / tot);
  const p = { ...fwd };
  for (const j of ['hips', 'legL', 'shinL', 'legR', 'shinR']) p[j] = [0, 1, 2].map((q) => fwd[j][q] * G.d.f + back[j][q] * G.d.b + side[j][q] * G.d.s);
  p.by = fwd.by * G.d.f + back.by * G.d.b + side.by * G.d.s;

  // ---- the upper body: its own layer, facing where the body faces whatever the legs do ----
  // posture: chest up, head level, arms in (the clips are made for a lean mannequin; on a broad knight their stoop
  // reads as an ape)
  const leanAll = p.hips[0] + fwd.torso[0];
  p.torso = [fwd.torso[0] - leanAll * (1 - POSTURE.lean), fwd.torso[1], fwd.torso[2]];
  p.head = [POSTURE.headLevel - (p.hips[0] + p.torso[0]) * 0.85, fwd.head[1], fwd.head[2]];
  for (const [a, sg] of [['armL', 1], ['armR', -1]]) { const z = p[a][2] * sg; p[a] = [p[a][0], p[a][1], sg * (0.12 + (z - 0.12) * POSTURE.armOut)]; }
  p.by *= POSTURE.crouch;
  // the shoulders move with the steps: they swing against the hips, dip toward the planted foot, and on a side step
  // sway with the weight going from foot to foot
  const s = Math.min(1, sp / 4), ph = G.u * Math.PI * 2, moving = gw / tot;
  p.torso[1] += Math.cos(ph) * SHOULDERS.swing * s * moving;
  p.torso[2] += Math.sin(ph) * (SHOULDERS.dip * s + SHOULDERS.sway * G.d.s) * moving;
  p.head[2] -= p.torso[2] * 0.6; p.head[1] -= Math.cos(ph) * SHOULDERS.swing * s * moving * 0.7; // (the head stays steady)
  // the hips warp toward a diagonal, the chest turns back to face; the turn's lean
  p.hips = [p.hips[0], p.hips[1] + G.twist, p.hips[2] + G.lean * 0.6];
  p.torso[1] -= G.twist; p.torso[2] += G.lean;
  // the weapon in hand: the arms its stance wants, the free arm swinging with the stride
  const sw = Math.sin(ph) * (0.12 + 0.5 * s + (o.sprint ? 0.25 : 0));
  return styleArms(style, p, s, sw, !!o.sprint);
}
