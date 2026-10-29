// Pose library + keyframe sampler. A pose is { joint: [x,y,z], by, guard }.

const smooth = (t) => t * t * (3 - 2 * t);

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
const Z = [0, 0, 0];

// keys: [[time, pose], ...] sorted. Missing joints fall back to `base`.
export function sample(keys, time, base) {
  let pose;
  if (time <= keys[0][0]) pose = mix(base, keys[0][1], keys[0][0] > 0 ? smooth(time / keys[0][0]) : 1);
  else {
    pose = keys[keys.length - 1][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, p0] = keys[i], [t1, p1] = keys[i + 1];
      if (time >= t0 && time < t1) { pose = mix(p0, p1, smooth((time - t0) / (t1 - t0))); break; }
    }
  }
  return { ...base, ...pose };
}

// ---------- locomotion ----------
export function locomotion(style, phase, speed, sprint, time) {
  const s = Math.min(speed, 1);
  const amp = 0.12 + 0.5 * s + (sprint ? 0.25 : 0);
  const sw = Math.sin(phase) * amp;
  const lift = (p) => Math.max(0, Math.sin(p)) * (0.5 + 0.7 * s);
  const breathe = Math.sin(time * 2.2) * 0.02;
  const p = {
    legL: [-sw, 0, 0.03], legR: [sw, 0, -0.03],
    shinL: [0.12 + lift(phase + Math.PI / 2) * s, 0, 0], shinR: [0.12 + lift(phase - Math.PI / 2) * s, 0, 0],
    torso: [0.06 + 0.12 * s + (sprint ? 0.22 : 0) + breathe, Math.sin(phase) * 0.1 * s, 0],
    head: [-0.05 - (sprint ? 0.15 : 0), 0, 0],
    hips: [0, -Math.sin(phase) * 0.12 * s, 0],
    armL: [sw * 0.7, 0, 0.12], foreL: [-0.35 - s * 0.3, 0, 0], handL: [0, 0, 0],
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
