// Pose library + keyframe sampler. A pose is { joint: [x,y,z], by, guard, grip }.

const smooth = (t) => t * t * (3 - 2 * t);
const Z = [0, 0, 0];

export function mix(a, b, t) {
  const out = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'snap') continue;
    const va = a[k], vb = b[k];
    if (typeof (va ?? vb) === 'number') out[k] = (va ?? 0) + ((vb ?? 0) - (va ?? 0)) * t;
    else {
      const x = va || Z, y = vb || Z;
      out[k] = [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
    }
  }
  return out;
}

// keys: [[time, pose], ...] sorted. Missing joints fall back to `base`.
//
// One smooth curve through all the keys (a Catmull-Rom spline per joint), so a move flows through each pose
// instead of easing to a stop at every one; before the first key it leaves `base` from rest, after the last it
// holds. A joint a key leaves out counts as 0 there (as it always has), and a joint no key mentions stays at `base`.
// o.heft (0..1, the weapon's weight) shapes the swing: the wind-up pose is held longer (its tangent shrinks) and the
// blade carries on through the strike pose (o.strike: the index of the key the swing lands on) before settling.
export function sample(keys, time, base, o) {
  const tr = keys._tr || (keys._tr = track(keys));
  const n = tr.T.length, t = Math.max(0, time), heft = o?.heft || 0, sk = o?.strike == null ? -1 : o.strike + tr.off;
  const out = { ...base };
  // the segment: knots T[i] <= t < T[i + 1]
  let i = 0; while (i < n - 2 && t >= tr.T[i + 1]) i++;
  const T0 = tr.T[i], T1 = tr.T[i + 1], h = T1 - T0, u = t >= T1 ? 1 : (t - T0) / h, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  for (const name of tr.names) {
    const V = tr.v[name], L = tr.len[name], b = base[name];
    const at = (k, c) => (k === 0 && tr.off ? (b == null ? 0 : L === 1 ? b : b[c]) : V[k * L + c]);
    const res = L === 1 ? 0 : [0, 0, 0];
    for (let c = 0; c < L; c++) {
      const p0 = at(i, c), p1 = at(i + 1, c);
      // tangents: the slope across each knot's neighbours; none at the ends (leaving rest, coming to the hold)
      let m0 = i > 0 ? (p1 - at(i - 1, c)) / (T1 - tr.T[i - 1]) : 0;
      let m1 = i + 2 < n ? (at(i + 2, c) - p0) / (tr.T[i + 2] - T0) : 0;
      if (heft) { if (i === sk - 1) m0 *= 1 - 0.7 * heft; if (i + 1 === sk) m1 *= 1 + 0.6 * heft; if (i === sk) m0 *= 1 + 0.6 * heft; }
      const v = u >= 1 ? p1 : h00 * p0 + h10 * h * m0 + h01 * p1 + h11 * h * m1;
      if (L === 1) out[name] = v; else res[c] = v;
    }
    if (L !== 1) out[name] = res;
  }
  return out;
}
// the keys laid out as per-joint value tracks over the knots (a rest knot at 0 first if the keys start later)
function track(keys) {
  const off = keys[0][0] > 0 ? 1 : 0, T = off ? [0] : [], names = [], len = {}, v = {};
  for (const [t, p] of keys) { T.push(t); for (const k in p) if (k !== 'snap' && !len[k]) { len[k] = typeof p[k] === 'number' ? 1 : 3; names.push(k); } }
  const n = T.length;
  for (const k of names) {
    const L = len[k], A = new Float64Array(n * L);
    keys.forEach(([, p], j) => { const x = p[k]; for (let c = 0; c < L; c++) A[(j + off) * L + c] = x == null ? 0 : L === 1 ? x : x[c]; });
    v[k] = A;
  }
  return { T, off, names, len, v };
}
export const smoothstep = smooth;

// ---------- locomotion ----------
export function locomotion(style, phase, speed, sprint, time) {
  const s = Math.min(speed, 1);
  const amp = 0.12 + 0.5 * s + (sprint ? 0.25 : 0);
  const sw = Math.sin(phase) * amp;
  const lift = (p) => Math.max(0, Math.sin(p)) * (0.5 + 0.7 * s);
  const breathe = Math.sin(time * 2.2) * 0.02;
  // the gait: the hips sway over the planted foot and roll a little, the shoulders counter it, the head stays level
  // and on the way ahead; a knee gives as each foot lands; the free arm bends more as it swings forward
  const sway = Math.sin(phase) * s, plantL = Math.pow(Math.max(0, -Math.sin(phase)), 3) * s, plantR = Math.pow(Math.max(0, Math.sin(phase)), 3) * s;
  const p = {
    legL: [-sw, 0, 0.03 + sway * 0.02], legR: [sw, 0, -0.03 + sway * 0.02],
    shinL: [0.12 + lift(phase + Math.PI / 2) * s + plantL * 0.14, 0, 0], shinR: [0.12 + lift(phase - Math.PI / 2) * s + plantR * 0.14, 0, 0],
    torso: [0.06 + 0.12 * s + (sprint ? 0.22 : 0) + breathe, Math.sin(phase) * 0.1 * s, -sway * 0.035],
    head: [-0.05 - (sprint ? 0.15 : 0), -Math.sin(phase) * 0.06 * s, sway * 0.02],
    hips: [0, -Math.sin(phase) * 0.12 * s, sway * 0.045],
    armL: [sw * 0.7, 0, 0.12], foreL: [-0.35 - s * 0.3 - Math.max(0, -sw) * 0.3, 0, 0], handL: [0, 0, 0],
    by: -0.04 - Math.abs(Math.cos(phase)) * 0.06 * s + breathe * 0.5,
  };
  STYLE[style](p, s, sw, sprint);
  return p;
}

const STYLE = {
  sword(p, s, sw, sprint) {
    p.armR = [-0.25 + (sprint ? sw * 0.6 : 0), 0, -0.12]; p.foreR = [-0.9, 0, 0]; p.handR = [0.35, 0, 0];
  },
  daggers(p, s, sw, sprint) {
    p.armR = [-0.2 - sw * 0.6, 0, -0.18]; p.foreR = [-1.2, 0, 0]; p.handR = [0.6, 0, 0];
    p.armL = [-0.2 + sw * 0.6, 0, 0.18]; p.foreL = [-1.2, 0, 0]; p.handL = [0.6, 0, 0];
    p.torso[0] += 0.1; p.by -= 0.04;
  },
  greatsword(p) {
    p.armR = [-0.25, 0, -0.2]; p.foreR = [-0.55, 0, 0]; p.handR = [0.95, 0, 0];
    p.armL = [-0.4, 0, -0.1]; p.foreL = [-0.9, 0, 0];
  },
  // the Penitent Slab: carried over the right shoulder, the blade lying back along it
  slab(p, s, sw, sprint) {
    p.armR = [-0.9, 0, -0.35]; p.foreR = [-1.9, 0, 0]; p.handR = [0.3, 0, 0];
    p.armL = [-0.15 - sw * 0.4, 0, 0.1]; p.foreL = [-0.45, 0, 0];
    p.torso[0] += 0.06; p.torso[1] -= 0.12; p.by -= 0.03;
  },
  // the Wrist Blades: a fighter's guard, lead (left) fist up and forward, rear fist by the ribs, both blades pointing
  // ahead along the forearms; a little bounce on the feet
  wrist(p, s, sw, sprint) {
    p.armL = [-0.55 + (sprint ? sw * 0.5 : 0), 0, 0.2]; p.foreL = [-1.15 - (sprint ? 0.3 : 0), 0, 0]; p.handL = [0.2, 0, 0];
    p.armR = [-0.25 - (sprint ? sw * 0.5 : 0), 0, -0.25]; p.foreR = [-1.35 - (sprint ? 0.3 : 0), 0, 0]; p.handR = [0.2, 0, 0];
    p.torso[0] += 0.14; p.torso[1] += 0.2; p.head[1] -= 0.18; p.by -= 0.06;
  },
  // the Psy-Staff: held across the body in both hands, the focus up and forward
  staff(p, s, sw, sprint) {
    p.armR = [-0.55, 0, -0.3]; p.foreR = [-1.05, 0, 0]; p.handR = [1.25, 0, 0];
    p.armL = [-0.85, 0, -0.05]; p.foreL = [-1.15, 0, 0]; p.handL = [0.9, 0, 0];
    if (sprint) { p.armR[0] -= sw * 0.3; p.armL[0] += sw * 0.3; }
  },
  spear(p) {
    p.armR = [-0.15, 0, -0.1]; p.foreR = [-1.35, 0, 0]; p.handR = [1.3, 0, 0];
    p.armL = [-0.7, 0, -0.1]; p.foreL = [-0.8, 0, 0];
  },
  club(p) {
    p.armR = [-0.1, 0, -0.25]; p.foreR = [-0.5, 0, 0]; p.handR = [0.2, 0, 0];
  },
  bow(p) {
    p.armR = [0, 0, -0.1]; p.foreR = [-0.4, 0, 0]; p.handR = [1.3, 0, 0];
    p.armL = [-0.3, 0, 0.1]; p.foreL = [-0.6, 0, 0];
  },
};

// ---------- shared poses ----------
export const P = {
  // forward roll; `e` 0..1 eased progress
  roll(e) {
    const k = Math.sin(Math.PI * Math.min(1, e * 1.15));
    return {
      hips: [Math.PI * 2 * e, 0, 0], snap: { hips: true },
      torso: [0.7 * k, 0, 0], head: [0.5 * k, 0, 0],
      legL: [-1.7 * k, 0, 0], legR: [-1.5 * k, 0, 0], shinL: [2.1 * k, 0, 0], shinR: [2.0 * k, 0, 0],
      armL: [-1.3 * k, 0, 0.2], foreL: [-1.2 * k, 0, 0], armR: [-1.2 * k, 0, -0.2], foreR: [-1.1 * k, 0, 0],
      by: -0.42 * k,
    };
  },
  backstep: {
    torso: [-0.15, 0, 0], legL: [-0.5, 0, 0], legR: [0.3, 0, 0], shinL: [0.3, 0, 0], shinR: [0.6, 0, 0],
    armL: [0.3, 0, 0.3], by: -0.12,
  },
  hurt: {
    torso: [-0.35, 0.2, 0], head: [-0.4, 0, 0], armL: [-0.4, 0, 0.6], armR: [-0.3, 0, -0.5],
    legL: [-0.3, 0, 0], legR: [0.25, 0, 0], shinR: [0.3, 0, 0], by: -0.08,
  },
  stagger: {
    torso: [-0.5, -0.3, 0.1], head: [-0.5, 0, 0], armL: [-0.2, 0, 1.0], armR: [-0.1, 0, -0.9], foreR: [-0.3, 0, 0],
    legL: [-0.5, 0, 0], legR: [0.4, 0, 0], shinL: [0.2, 0, 0], shinR: [0.6, 0, 0], by: -0.2,
  },
  knockdown: {
    hips: [-1.35, 0, 0], torso: [0.1, 0, 0], head: [0.4, 0, 0], armL: [-0.3, 0, 1.2], armR: [-0.3, 0, -1.2],
    legL: [-0.1, 0, 0.1], legR: [-0.2, 0, -0.1], shinL: [0.4, 0, 0], shinR: [0.2, 0, 0], by: -0.78,
  },
  dead: {
    hips: [-1.45, 0, 0.1], torso: [0.05, 0.2, 0], head: [0.3, 0.5, 0], armL: [-0.2, 0, 1.4], armR: [-0.4, 0, -1.3],
    legL: [-0.1, 0, 0.15], legR: [0.05, 0, -0.1], shinL: [0.2, 0, 0], shinR: [0.4, 0, 0], by: -0.8,
  },
  heal: {
    armL: [-1.9, 0, 0.1], foreL: [-1.2, 0, 0], head: [-0.35, 0, 0], torso: [-0.1, 0, 0], by: -0.03,
  },
  block: {
    guard: 1, armL: [-1.0, 0, 0.3], foreL: [-1.0, 0, 0], torso: [0.12, -0.15, 0], by: -0.1,
    legL: [-0.35, 0, 0], legR: [0.3, 0, 0], shinL: [0.25, 0, 0], shinR: [0.35, 0, 0],
  },
  blockHit: {
    guard: 1, armL: [-0.8, 0, 0.3], foreL: [-1.0, 0, 0], torso: [-0.12, -0.2, 0], head: [-0.2, 0, 0], by: -0.14,
    legL: [-0.5, 0, 0], legR: [0.45, 0, 0], shinR: [0.5, 0, 0],
  },
  guardBreak: {
    guard: 0.3, armL: [0.2, 0, 1.3], torso: [-0.5, 0.3, 0], head: [-0.5, 0, 0], armR: [-0.2, 0, -1.1], by: -0.2,
    legL: [-0.4, 0, 0], legR: [0.4, 0, 0], shinR: [0.6, 0, 0],
  },
  rest: {
    legL: [-1.5, 0, 0.3], shinL: [1.6, 0, 0], legR: [-0.4, 0, -0.1], shinR: [2.3, 0, 0],
    torso: [0.35, 0, 0], head: [0.4, 0, 0], armR: [-0.6, 0, 0], foreR: [-0.6, 0, 0], armL: [-0.7, 0, 0], foreL: [-0.7, 0, 0],
    by: -0.62,
  },
};
