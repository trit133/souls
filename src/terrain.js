// Walkable height: terraces, slopes, stairs, hills and ladders. A map lays them out (world coords) and the world
// keeps one Terrain (world.terrain); floorAt(x, z) is the height of the ground you stand on there (0 where nothing
// is laid). Bodies stand at it (actor.gy):
//   - stepping up more than STEP is a wall (a terrace's edge), unless there are stairs or a slope;
//   - stepping down more than STEP: the player walks or rolls off and falls (player.js 'fall': a short fall lands on
//     the feet, one of SAFE_FALL or more hurts and lands on the stomach); enemies never step off;
//   - ladders join two heights for the player only. A ladder can start pulled up: it's lowered from the top, opening
//     a shortcut.
// Heights are baked onto a 0.25 m grid. Between grid points a slope blends smoothly; a step bigger than STEP stays a
// sharp edge. build(w) adds what you see: the retaining walls along every edge that drops, the steps of stairs, the
// ladders. The ground mesh (world.groundMesh) follows floorAt.
import * as THREE from 'three';

export const STEP = 0.45;     // the most a body steps up (or an enemy down) without stairs
export const SAFE_FALL = 2.6; // a fall shorter than this lands on the feet
const RES = 0.25;
// a visual-only random 0..1 from a position
const vh = (x, z, k = 0) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };

export class Terrain {
  constructor() { this.parts = []; this.ladders = []; this.grid = null; }

  // ---------- laying it out (world coords; x0 < x1, z0 < z1) ----------
  // a flat terrace at height h; o.look: the face of its edges ('stone' | 'brick' | 'earth'), o.cap: a coping course
  flat(x0, x1, z0, z1, h, o = {}) { this.parts.push({ t: 'flat', x0, x1, z0, z1, h, o }); this.grid = null; }
  // a slope from h0 to h1 along x or z (h0 at x0 / z0); o.stairs: built as steps (walked as a slope)
  slope(x0, x1, z0, z1, h0, h1, axis = 'z', o = {}) { this.parts.push({ t: 'slope', x0, x1, z0, z1, h0, h1, axis, o }); this.grid = null; }
  stairs(x0, x1, z0, z1, h0, h1, axis = 'z', o = {}) { this.slope(x0, x1, z0, z1, h0, h1, axis, { ...o, stairs: true }); }
  // a rounded rise of height h and radius r, added to whatever is under it
  hill(cx, cz, r, h, o = {}) { this.parts.push({ t: 'hill', cx, cz, r, h, o }); this.grid = null; }
  // a ladder up a terrace's face: its foot at (x, z) on the lower ground, facing yaw (the way up: toward the face);
  // o.raised: it starts pulled up, lowered from the top
  ladder(x, z, yaw, h0, h1, o = {}) {
    const f = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const L = { x, z, yaw, h0, h1, f, raised: !!o.raised, i: this.ladders.length,
      foot: { x, z }, wall: { x: x + f.x * 0.42, z: z + f.z * 0.42 }, top: { x: x + f.x * 1.15, z: z + f.z * 1.15 } };
    this.ladders.push(L);
    return L;
  }

  // ---------- heights ----------
  rawAt(x, z, parts = this.parts) {
    let h = 0;
    for (const p of parts) {
      if (p.t === 'hill') { const d = Math.hypot(x - p.cx, z - p.cz); if (d < p.r) h += p.h * 0.5 * (1 + Math.cos(Math.PI * d / p.r)); continue; }
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      if (p.t === 'flat') h = p.h;
      else { const u = p.axis === 'x' ? (x - p.x0) / (p.x1 - p.x0) : (z - p.z0) / (p.z1 - p.z0); h = p.h0 + (p.h1 - p.h0) * u; }
    }
    return h;
  }
  // bake: each cluster of parts (overlapping or within 2 m of each other: a map's surface, each of its basements)
  // gets its own grid, so ground far apart never costs a grid spanning the gap
  bake() {
    if (!this.parts.length) { this.grid = { none: true, list: [] }; return; }
    const box = (p) => (p.t === 'hill' ? [p.cx - p.r, p.cx + p.r, p.cz - p.r, p.cz + p.r] : [p.x0, p.x1, p.z0, p.z1]);
    let cl = this.parts.map((p) => ({ b: box(p), parts: [p] }));
    for (let merged = true; merged;) {
      merged = false;
      for (let a = 0; a < cl.length && !merged; a++) for (let c = a + 1; c < cl.length; c++) {
        const A = cl[a].b, C = cl[c].b;
        if (A[0] - 2 > C[1] || C[0] - 2 > A[1] || A[2] - 2 > C[3] || C[2] - 2 > A[3]) continue;
        cl[a] = { b: [Math.min(A[0], C[0]), Math.max(A[1], C[1]), Math.min(A[2], C[2]), Math.max(A[3], C[3])], parts: [...cl[a].parts, ...cl[c].parts] };
        cl.splice(c, 1); merged = true; break;
      }
    }
    const list = cl.map(({ b, parts }) => {
      parts.sort((p, q) => this.parts.indexOf(p) - this.parts.indexOf(q)); // (laid in order: later over earlier)
      const x0 = b[0] - 1, z0 = b[2] - 1, W = Math.ceil((b[1] + 1 - x0) / RES) + 1, H = Math.ceil((b[3] + 1 - z0) / RES) + 1, h = new Float32Array(W * H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) h[j * W + i] = this.rawAt(x0 + i * RES, z0 + j * RES, parts);
      return { x0, z0, W, H, h };
    });
    this.grid = { list };
  }
  // the ground's height at a point: a slope blends between grid points, a step bigger than STEP stays sharp
  floorAt(x, z) {
    const G0 = this.grid || (this.bake(), this.grid);
    if (G0.none) return 0;
    for (const G of G0.list) {
      const fx = (x - G.x0) / RES, fz = (z - G.z0) / RES;
      if (fx < 0 || fz < 0 || fx >= G.W - 1 || fz >= G.H - 1) continue;
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, W = G.W, h = G.h;
      const a = h[j * W + i], b = h[j * W + i + 1], c = h[(j + 1) * W + i], d = h[(j + 1) * W + i + 1];
      if (Math.max(a, b, c, d) - Math.min(a, b, c, d) > STEP) return u < 0.5 ? (v < 0.5 ? a : c) : (v < 0.5 ? b : d);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    }
    return 0;
  }

  // ---------- ladders ----------
  // a ladder the player can get on from here, moving `dir` (a unit vector or null): from its foot heading in, or
  // from its top heading out over the edge
  ladderFor(x, z, gy, dir) {
    for (const L of this.ladders) {
      if (L.raised) continue;
      const toward = dir ? dir.x * L.f.x + dir.z * L.f.z : 0;
      if (Math.abs(gy - L.h0) < 0.35 && Math.hypot(x - L.foot.x, z - L.foot.z) < 0.85 && toward > 0.6) return { L, up: true };
      if (Math.abs(gy - L.h1) < 0.35 && Math.hypot(x - L.top.x, z - L.top.z) < 0.95 && toward < -0.6) return { L, up: false };
    }
    return null;
  }
  // a pulled-up ladder whose top the player stands at
  raisedAt(x, z, gy) {
    return this.ladders.find((L) => L.raised && Math.abs(gy - L.h1) < 0.35 && Math.hypot(x - L.top.x, z - L.top.z) < 1.3) || null;
  }
  lower(L, instant = false) {
    if (!L || !L.raised) return;
    L.raised = false; L.swing = instant ? 1 : 0;
    if (instant && L.pivot) L.pivot.rotation.x = 0;
  }
  update(dt) {
    for (const L of this.ladders) if (L.pivot && L.swing != null && L.swing < 1) {
      L.swing = Math.min(1, L.swing + dt * 1.8);
      const e = L.swing < 1 ? 1 - Math.pow(1 - L.swing, 3) : 1;
      L.pivot.rotation.x = -Math.PI / 2 * (1 - e) + Math.sin(e * Math.PI) * 0.08; // (it swings down and knocks against the wall)
    }
  }

  // ---------- what you see ----------
  // what you see of the parts from `from` on (a map's later parts, its basements, are built on their own)
  build(w, from = 0) {
    if (!this.grid) this.bake();
    const M = w.mats, add = (m) => { w.add(m); return m; };
    const brick = (this.brickMat ||= new THREE.MeshLambertMaterial({ color: 0x4e3c34, flatShading: true }));
    const look = (o) => (o.look === 'brick' ? brick : o.look === 'earth' ? M.rockDark : M.stone);
    const capMat = M.stoneDark;
    if (!from || !this.faces) this.faces = []; // (each piece of face, for what grows on it: flora.js ivy)
    const seen = new Set();
    // the faces: along every edge of a terrace or slope, where the ground outside is more than STEP lower, a wall
    // down to it (in 0.5 m pieces, so a slope's side steps down with it), set just inside the edge
    for (const p of this.parts.slice(from)) {
      if (p.t === 'hill') continue;
      const mat = look(p.o), T = 0.55;
      // each edge: e the line, s which way is out. The face goes on whichever side is higher (a terrace's own edge,
      // or the rim of a hollow cut into higher ground), facing the low side; one face per spot (seen)
      const edges = [{ ax: 'x', a0: p.x0, a1: p.x1, e: p.z0, s: -1 }, { ax: 'x', a0: p.x0, a1: p.x1, e: p.z1, s: 1 }, { ax: 'z', a0: p.z0, a1: p.z1, e: p.x0, s: -1 }, { ax: 'z', a0: p.z0, a1: p.z1, e: p.x1, s: 1 }];
      for (const E of edges) {
        const n = Math.max(1, Math.round((E.a1 - E.a0) / 0.5)), step = (E.a1 - E.a0) / n;
        for (let k = 0; k < n; k++) {
          const a = E.a0 + (k + 0.5) * step, P2 = (o) => (E.ax === 'x' ? [a, E.e + o] : [E.e + o, a]);
          const hin = this.rawAt(...P2(-E.s * 0.06)), hout = this.rawAt(...P2(E.s * 0.06));
          if (Math.abs(hin - hout) <= STEP) continue;
          const inHigh = hin > hout, top = Math.max(hin, hout), low = Math.min(hin, hout), side = inHigh ? -E.s : E.s;
          const key = E.ax + Math.round(a * 4) + ':' + Math.round(E.e * 4) + ':' + side;
          if (seen.has(key)) continue; seen.add(key);
          const hgt = top - low + 0.04, [cx, cz] = P2(side * T / 2), nrm = -side;
          const [sw, sd] = E.ax === 'x' ? [step + 0.01, T] : [T, step + 0.01];
          const m = new THREE.Mesh(new THREE.BoxGeometry(sw, hgt, sd), mat); m.position.set(cx, low + hgt / 2 - 0.02, cz); add(m);
          const [fx, fz] = P2(0);
          this.faces.push({ x: fx, z: fz, ax: E.ax, nx: E.ax === 'z' ? nrm : 0, nz: E.ax === 'x' ? nrm : 0, low, top, w: step, ivy: p.o.ivy });
          // a coping course along the top, a little proud of the face, and the odd stone out
          if (p.o.cap !== false) { const c = new THREE.Mesh(new THREE.BoxGeometry(sw + (E.ax === 'x' ? 0 : 0.08), 0.12, sd + (E.ax === 'x' ? 0.08 : 0)), capMat); c.position.set(cx, top, cz); add(c); }
          if (vh(cx, cz, 3) < 0.3 && hgt > 0.8) { const st = new THREE.Mesh(new THREE.BoxGeometry(E.ax === 'x' ? 0.28 : 0.36, 0.2, E.ax === 'x' ? 0.36 : 0.28), M.stoneDark); const [sx, sz] = P2(side * 0.02); st.position.set(sx, low + 0.25 + vh(cx, cz, 4) * (hgt - 0.6), sz); add(st); }
        }
      }
      // stairs: a step every ~0.22 m of rise, each a solid block down to the foot of the flight
      if (p.t === 'slope' && p.o.stairs) {
        const rise = Math.abs(p.h1 - p.h0), n = Math.max(2, Math.round(rise / 0.22)), along = p.axis === 'x' ? p.x1 - p.x0 : p.z1 - p.z0;
        const base = Math.min(p.h0, p.h1);
        for (let k = 0; k < n; k++) {
          const u0 = k / n, u1 = (k + 1) / n, top = p.h0 + (p.h1 - p.h0) * (p.h1 > p.h0 ? u1 : u0);
          const hgt = Math.max(0.05, top - base + 0.02);
          const [w0, w1] = [u0 * along, u1 * along];
          const geo = p.axis === 'x' ? new THREE.BoxGeometry(w1 - w0, hgt, p.z1 - p.z0) : new THREE.BoxGeometry(p.x1 - p.x0, hgt, w1 - w0);
          const m = new THREE.Mesh(geo, k % 2 ? M.stone : M.rock);
          if (p.axis === 'x') m.position.set(p.x0 + (w0 + w1) / 2, base + hgt / 2 - 0.02, (p.z0 + p.z1) / 2);
          else m.position.set((p.x0 + p.x1) / 2, base + hgt / 2 - 0.02, p.z0 + (w0 + w1) / 2);
          add(m);
        }
      }
    }
    // ladders: iron rails and rungs on a pivot at the top of the face (a pulled-up one lies on the terrace above)
    for (const L of from ? [] : this.ladders) {
      const g = new THREE.Group(); g.position.set(L.wall.x, L.h1, L.wall.z); g.rotation.y = L.yaw; g.userData.noMerge = true;
      const pv = new THREE.Group(); g.add(pv); L.pivot = pv;
      const len = L.h1 - L.h0 + 0.55, iron = M.metal, rung = M.log;
      for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, len, 0.07), iron); r.position.set(s * 0.26, 0.55 - len / 2, -0.16); pv.add(r); }
      for (let y = 0.35; y < len - 0.2; y += 0.32) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.05), rung); r.position.set(0, 0.55 - y, -0.16); pv.add(r); }
      // two hooks over the coping
      for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), iron); h.position.set(s * 0.26, 0.55, -0.02); pv.add(h); }
      pv.rotation.x = L.raised ? -Math.PI / 2 : 0;
      add(g);
    }
  }
}
