// The Sunless Deep's maps (region 2) share this: a Ward (ward.js: a map laid by hand on walkable heights) gone
// underground. Everywhere is a little dim (your cone is always on; under a roof it's dark), there's no sky (black over
// the cave walls), the edge is rock rising into the dark, and the lamps do the lighting. What each map adds: its plan,
// its tiers, its buildings and dressing (lanternhold.js, wormways.js, glasshallow.js).
import * as THREE from 'three';
import { GRID } from './city.js';
import { Ward } from './ward.js';
import { wallTex } from './ground.js';
import { dressDeepArena } from './deepbosses.js';

const { vh, UNDER } = GRID;

export class Deep extends Ward {
  // how dim the open cave is (0 the area's own light, 1 black: main.js darkLight) and under a roof
  get dim() { return 0.18; }
  darkAt() { return true; }
  darkness(x, z) { if (x > UNDER) return 1; const b = this.buildingAt(x, z); return b && !b.ruin && !b.yard ? 0.85 : this.dim; }
  get groundUnder() { return 'deepUnder'; }

  // the boss's arena (city.js lays its ring), dressed for its boss
  buildArena(w, u) { super.buildArena(w, u); dressDeepArena(w, this.bossId, u.arena, this.enc); }

  // the cave's own materials (each map adds its own over these: this.K)
  caveMats() {
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    const K = {
      rock: lam(0x4a4540), rockDk: lam(0x302c28), rockLt: lam(0x5e5852), timber: lam(0x4a3628), timberDk: lam(0x2e2219), iron: lam(0x3a3a3e), rust: lam(0x6a3a22),
      lamp: lam(0x000000, { emissive: 0xffc060 }), glowTeal: lam(0x000000, { emissive: 0x3ad8c8 }), glowViolet: lam(0x000000, { emissive: 0x9a6aff }),
      crystal: lam(0x8a6ad8, { emissive: 0x2a1460 }), crystalCy: lam(0x5ab8d8, { emissive: 0x104a5a }), rope: lam(0x6a5a3a), canvas: lam(0x6a5a44), stone: lam(0x8a8478), stoneDk: lam(0x5a554e),
    };
    for (const [k, kind, sc] of [['rock', 'rock'], ['rockDk', 'rock'], ['rockLt', 'rock'], ['timber', 'wood', 1.5], ['timberDk', 'wood', 1.5], ['iron', 'metal', 1.2], ['rust', 'metal', 1.2], ['stone', 'stone'], ['stoneDk', 'stone'], ['crystal', 'crystal', 1.5], ['crystalCy', 'crystal', 1.5]]) wallTex(K[k], kind, sc);
    return K;
  }

  // the edge: rock rising into the dark on three sides (tall and craggy, stalactites hanging off its lip, now and then a
  // crystal seam or a dead lamp), low rubble along the south so it never hides you; the way in from the camp
  rim(w) {
    const K = this.K, E = 48.9;
    for (let a = -47.5; a <= 47.5; a += 4.2) {
      for (const [x, z, alongX] of [[a, -E, true], [-E, a, false], [E, a, false], [a, E, true]]) {
        if (alongX && z > 0 && Math.abs(a) < 7) continue; // (the way in)
        this.at(w, Math.max(-47.5, Math.min(47.5, x)), Math.max(-47.5, Math.min(47.5, z)));
        const south = alongX && z > 0, h = south ? 1.6 + vh(x, z) * 1.2 : 9 + vh(x, z) * 8, ww = 4.6;
        const m = w.box(alongX ? ww : 3.2, h, alongX ? 3.2 : ww, vh(x, z, 2) < 0.55 ? K.rock : K.rockDk, x, h / 2, z); m.rotation.y = (vh(x, z, 3) - 0.5) * 0.3;
        if (!south) {
          // crags stepping out of it, a stalactite or two off the lip, now and then a crystal seam
          w.box(alongX ? 2.2 : 1.6, h * 0.6, alongX ? 1.6 : 2.2, K.rockLt, x + (alongX ? (vh(x, 1) - 0.5) * 2 : -Math.sign(x) * 1.4), h * 0.3, z + (alongX ? -Math.sign(z) * 1.4 : (vh(z, 1) - 0.5) * 2));
          if (vh(x, z, 5) < 0.5) { const st = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.4, 5), K.rockDk); st.rotation.x = Math.PI; st.position.set(x - (alongX ? 0 : Math.sign(x) * 1.8), h - 1.4, z - (alongX ? Math.sign(z) * 1.8 : 0)); w.add(st); }
          if (vh(x, z, 6) < this.seams) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), this.seamMat || K.crystal); c.scale.y = 1.8; c.position.set(x - (alongX ? 0 : Math.sign(x) * 1.7), 1.5 + vh(x, z, 7) * h * 0.5, z - (alongX ? Math.sign(z) * 1.7 : 0)); w.add(c); }
        }
        w.solids.push(alongX ? { x0: x - ww / 2, x1: x + ww / 2, z0: z - 1.6, z1: z + 1.6 } : { x0: x - 1.6, x1: x + 1.6, z0: z - ww / 2, z1: z + ww / 2 });
      }
    }
  }
  get seams() { return 0.12; }

  // the way in: a lift cage come down the shaft on its chains, a crew's lamps, the beacon
  camp(w) {
    const K = this.K, z0 = 50;
    this.at(w, 0, z0 + 4);
    for (const s of [-1, 1]) { w.box(0.3, 7, 0.3, K.iron, s * 2.4, 3.5, z0 + 7); w.box(0.3, 7, 0.3, K.iron, s * 2.4, 3.5, z0 + 11); }
    w.box(5.2, 0.2, 4.6, K.timberDk, 0, 0.1, z0 + 9); w.box(5.4, 0.3, 0.3, K.iron, 0, 7, z0 + 7); w.box(5.4, 0.3, 0.3, K.iron, 0, 7, z0 + 11);
    for (const s of [-1, 1]) w.box(0.06, 9, 0.06, K.iron, s * 1.6, 11, z0 + 9); // the chains, up into the dark
    for (const s of [-1, 1]) { w.crate(s * 5.5, z0 + 4); this.lanternPost(w, s * 4.5, z0 + 1.5); }
    const fire = w.bonfire(0, z0 + 2.3); fire.lit = true;
    this.startAt = { x: 0, z: z0 + 9 };
    this.exitDoor(w, 0, z0 + 13.4, 0, 1, 'Ride the lift back up');
  }

  // a lamp on a post: an iron pole, a crossarm, a caged lantern (lit, mostly)
  lanternPost(w, x, z, lit = vh(x, z) < 0.85, color = 0xffb860) {
    const K = this.K;
    w.box(0.14, 3.0, 0.14, K.timberDk, x, 1.5, z); w.box(0.7, 0.08, 0.08, K.timberDk, x + 0.3, 2.95, z);
    w.box(0.24, 0.32, 0.24, lit ? K.lamp : K.iron, x + 0.6, 2.7, z); w.box(0.3, 0.05, 0.3, K.iron, x + 0.6, 2.9, z);
    w.ob(x, z, 0.25);
    if (lit) w.lights.push({ x: x + 0.6, y: 2.6, z, color, power: 7, range: 10, src: {} });
  }
  // a string of little lamps hung between two points (purely to look at)
  lampString(w, x0, z0, x1, z1, y = 3.4) {
    const K = this.K, n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.6));
    for (let k = 0; k <= n; k++) { const t = k / n, sag = Math.sin(t * Math.PI) * 0.6; w.box(0.12, 0.14, 0.12, K.lamp, x0 + (x1 - x0) * t, y - sag, z0 + (z1 - z0) * t); }
  }
  // a shaft of daylight falling from a crack in the glass far overhead (Lanternhold): a soft column with dust in it
  lightShaft(w, x, z, r = 1.6) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, 26, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.025, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(x, 13, z); m.userData.noMerge = true; m.userData.noSettle = true; w.root.add(m); w.extras.push(m);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 1.1, 16), new THREE.MeshBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, w.floorAt(x, z) + 0.04, z); pool.userData.noSettle = true; w.root.add(pool); w.extras.push(pool);
    m.position.y += w.floorAt(x, z);
    w.lights.push({ x, y: 4, z, color: 0xd8ecff, power: 6, range: 8, src: {} });
    w.ambient.push({ x, z, update: (dt, t, fx) => { if (Math.random() < dt * 5) fx.add.spawn({ x: x + (Math.random() - 0.5) * r * 1.4, y: w.floorAt(x, z) + 1 + Math.random() * 6, z: z + (Math.random() - 0.5) * r * 1.4, vy: -0.15, vx: 0.05, life: 3, size: 0.05, size1: 0.05, r: 0.9, g: 0.95, b: 1, alpha: 0.6 }); } });
  }
  // a stalagmite (or a cluster of them), blocking
  stalagmite(w, x, z, h = 2.4) {
    const K = this.K;
    const m = new THREE.Mesh(new THREE.ConeGeometry(h * 0.22, h, 6), vh(x, z) < 0.5 ? K.rock : K.rockDk); m.position.set(x, h / 2, z); m.rotation.y = vh(x, z, 2) * 3; w.add(m);
    if (vh(x, z, 3) < 0.6) { const n = new THREE.Mesh(new THREE.ConeGeometry(h * 0.12, h * 0.5, 5), K.rockLt); n.position.set(x + 0.4, h * 0.25, z + 0.2); w.add(n); }
    w.ob(x, z, h * 0.2 + 0.15);
  }
  // an ore heap: a mound of broken rock, glints of seer-glass in it
  oreHeap(w, x, z, r = 1.4) {
    const K = this.K;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.9, 7), K.rockDk); m.position.set(x, r * 0.45, z); m.rotation.y = vh(x, z) * 3; w.add(m);
    for (let k = 0; k < 5; k++) { const a = vh(x, k) * 6.28, d = r * 0.5 * vh(z, k); w.box(0.18, 0.18, 0.18, vh(k, x) < 0.3 ? K.crystalCy : K.rockLt, x + Math.cos(a) * d, r * 0.5 - d * 0.4, z + Math.sin(a) * d, a); }
    w.ob(x, z, r * 0.8);
  }
  // a mine cart left on its own (dressing)
  mineCart(w, x, z, ry = 0) {
    const K = this.K;
    w.box(1.1, 0.65, 1.5, K.rust, x, 0.55, z, ry); w.box(1.16, 0.08, 1.56, K.iron, x, 0.9, z, ry);
    for (const s of [-1, 1]) w.box(1.2, 0.36, 0.12, K.iron, x + Math.sin(ry) * s * 0.5, 0.2, z + Math.cos(ry) * s * 0.5, ry);
    w.ob(x, z, 0.9);
  }
  // timber shoring: two posts and a cap beam (a mine's doorway, or along a wall)
  shoring(w, x, z, ry = 0, wd = 3, h = 3) {
    const K = this.K, c = Math.cos(ry), s = Math.sin(ry);
    for (const k of [-1, 1]) w.box(0.25, h, 0.25, K.timber, x + c * k * wd / 2, h / 2, z - s * k * wd / 2);
    w.box(wd + 0.4, 0.28, 0.3, K.timber, x, h, z, ry);
  }
}
