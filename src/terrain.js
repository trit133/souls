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
  rawAt(x, z) {
    let h = 0;
    for (const p of this.parts) {
      if (p.t === 'hill') { const d = Math.hypot(x - p.cx, z - p.cz); if (d < p.r) h += p.h * 0.5 * (1 + Math.cos(Math.PI * d / p.r)); continue; }
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      if (p.t === 'flat') h = p.h;
      else { const u = p.axis === 'x' ? (x - p.x0) / (p.x1 - p.x0) : (z - p.z0) / (p.z1 - p.z0); h = p.h0 + (p.h1 - p.h0) * u; }
    }
    return h;
  }
  bake() {
    if (!this.parts.length) { this.grid = { none: true }; return; }
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of this.parts) {
      const b = p.t === 'hill' ? [p.cx - p.r, p.cx + p.r, p.cz - p.r, p.cz + p.r] : [p.x0, p.x1, p.z0, p.z1];
      x0 = Math.min(x0, b[0]); x1 = Math.max(x1, b[1]); z0 = Math.min(z0, b[2]); z1 = Math.max(z1, b[3]);
    }
    x0 -= 1; z0 -= 1; x1 += 1; z1 += 1;
    const W = Math.ceil((x1 - x0) / RES) + 1, H = Math.ceil((z1 - z0) / RES) + 1, h = new Float32Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) h[j * W + i] = this.rawAt(x0 + i * RES, z0 + j * RES);
    this.grid = { x0, z0, W, H, h };
  }
  // the ground's height at a point: a slope blends between grid points, a step bigger than STEP stays sharp
  floorAt(x, z) {
    const G = this.grid || (this.bake(), this.grid);
    if (G.none) return 0;
    const fx = (x - G.x0) / RES, fz = (z - G.z0) / RES;
    if (fx < 0 || fz < 0 || fx >= G.W - 1 || fz >= G.H - 1) return 0;
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, W = G.W, h = G.h;
    const a = h[j * W + i], b = h[j * W + i + 1], c = h[(j + 1) * W + i], d = h[(j + 1) * W + i + 1];
    if (Math.max(a, b, c, d) - Math.min(a, b, c, d) > STEP) return u < 0.5 ? (v < 0.5 ? a : c) : (v < 0.5 ? b : d);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
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
  build(w) {
    if (!this.grid) this.bake();
    const M = w.mats, add = (m) => { w.add(m); return m; };
    const look = (o) => (o.look === 'brick' ? M.rust : o.look === 'earth' ? M.rockDark : M.stone);
    const capMat = M.stoneDark;
    // the faces: along every edge of a terrace or slope, where the ground outside is more than STEP lower, a wall
    // down to it (in 0.5 m pieces, so a slope's side steps down with it), set just inside the edge
    for (const p of this.parts) {
      if (p.t === 'hill') continue;
      const mat = look(p.o), T = 0.3;
      const edges = [
        { ax: 'x', a0: p.x0, a1: p.x1, at: p.z0 - 0.06, inn: p.z0 + 0.06, mid: p.z0 + T / 2 },
        { ax: 'x', a0: p.x0, a1: p.x1, at: p.z1 + 0.06, inn: p.z1 - 0.06, mid: p.z1 - T / 2 },
        { ax: 'z', a0: p.z0, a1: p.z1, at: p.x0 - 0.06, inn: p.x0 + 0.06, mid: p.x0 + T / 2 },
        { ax: 'z', a0: p.z0, a1: p.z1, at: p.x1 + 0.06, inn: p.x1 - 0.06, mid: p.x1 - T / 2 },
      ];
      for (const E of edges) {
        const n = Math.max(1, Math.round((E.a1 - E.a0) / 0.5)), step = (E.a1 - E.a0) / n;
        for (let k = 0; k < n; k++) {
          const a = E.a0 + (k + 0.5) * step;
          const [ix, iz] = E.ax === 'x' ? [a, E.inn] : [E.inn, a], [ox, oz] = E.ax === 'x' ? [a, E.at] : [E.at, a];
          const top = this.rawAt(ix, iz), low = this.rawAt(ox, oz);
          if (top - low <= STEP) continue;
          const hgt = top - low + 0.04, [cx, cz] = E.ax === 'x' ? [a, E.mid] : [E.mid, a];
          const [sw, sd] = E.ax === 'x' ? [step + 0.01, T] : [T, step + 0.01];
          const m = new THREE.Mesh(new THREE.BoxGeometry(sw, hgt, sd), mat); m.position.set(cx, low + hgt / 2 - 0.02, cz); add(m);
          // a coping course along the top, a little proud of the face, and the odd stone out
          if (p.o.cap !== false) { const c = new THREE.Mesh(new THREE.BoxGeometry(sw + (E.ax === 'x' ? 0 : 0.08), 0.12, sd + (E.ax === 'x' ? 0.08 : 0)), capMat); c.position.set(cx, top + 0.0, cz); add(c); }
          if (vh(cx, cz, 3) < 0.3 && hgt > 0.8) { const s = new THREE.Mesh(new THREE.BoxGeometry(E.ax === 'x' ? 0.28 : 0.36, 0.2, E.ax === 'x' ? 0.36 : 0.28), M.stoneDark); s.position.set(cx + (E.ax === 'x' ? 0 : (E.at < E.inn ? -0.05 : 0.05)), low + 0.25 + vh(cx, cz, 4) * (hgt - 0.6), cz + (E.ax === 'x' ? (E.at < E.inn ? -0.05 : 0.05) : 0)); add(s); }
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
    for (const L of this.ladders) {
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
