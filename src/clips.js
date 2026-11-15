// Baked motion clips (scripts/bake-anims.mjs: Quaternius' Universal Animation Library, CC0, and any Mixamo clips,
// turned into our rig's poses) and the gait built from them: idle, walk, jog and sprint blended by how fast the body
// is really moving, kept in step and played at the rate their stride covers the ground (no sliding feet); moving
// backwards plays the gait in reverse; moving sideways turns the hips toward the way you're going while the chest
// keeps facing (strafing while locked on); turning leans the body into the turn. The weapon's hold goes on top
// (anims.js styleArms), so every weapon is carried as before. Visual only: nothing here moves anyone.
import DATA from './anim-data/clips.json';
import { styleArms } from './anims.js';

const JOINTS = ['hips', 'torso', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'legR', 'shinR'];
const GAITS = ['walk', 'jog', 'sprint'];
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
  const G = who._gait || (who._gait = { u: 0, w: { idle: 1, walk: 0, jog: 0, sprint: 0 }, lean: 0, twist: 0, back: 0 });
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
  // the cycle: as far through as the ground covered (the gaits' strides weighted)
  let gw = 0, len = 0; for (const c of GAITS) { gw += G.w[c]; len += G.w[c] * stride(c); }
  // backwards: the gait runs in reverse, the hips turned toward the line of travel either way
  const dir = o.dir || 0, back = sp > 0.3 && Math.abs(dir) > 1.9 ? 1 : 0;
  G.back += (back - G.back) * k;
  if (gw > 0.01) G.u += dt * sp / (len / gw) * (G.back > 0.5 ? -1 : 1);
  const travel = G.back > 0.5 ? wrap(dir - Math.PI) : dir, twist = sp > 0.3 ? clamp(travel * 0.62, -1.05, 1.05) : 0;
  G.twist += (twist - G.twist) * k;
  // turning: lean into it
  G.lean += (clamp(-(o.turn || 0) * 0.05 * Math.min(1, sp / 2), -0.22, 0.22) - G.lean) * (1 - Math.exp(-dt * 6));
  // the blend
  const p = {};
  addClip(p, 'idle', (o.time || 0) / DATA.idle.dur, G.w.idle);
  for (const c of GAITS) addClip(p, c, G.u + DATA[c].sync, G.w[c]);
  const tot = G.w.idle + gw || 1;
  for (const j of JOINTS) p[j] = p[j].map((v) => v / tot);
  p.by /= tot;
  // the hips turn toward the way you're going, the chest stays where you face
  p.hips[1] += G.twist; p.torso[1] -= G.twist * 0.85; p.head[1] -= G.twist * 0.15;
  p.hips[2] += G.lean * 0.6; p.torso[2] += G.lean;
  // the weapon in hand: the arms its stance wants, the free arm swinging with the stride
  const s = Math.min(1, sp / 4), sw = Math.sin(G.u * Math.PI * 2) * (0.12 + 0.5 * s + (o.sprint ? 0.25 : 0));
  return styleArms(style, p, s, sw, !!o.sprint);
}
