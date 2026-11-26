// The Wormways (regions.js r2a2): the tunnels the regime's borers left under Lanternhold, round and bored smooth,
// crossing over and under each other. 95 m across, laid by hand (a Deep: deep.js) on two levels and a sunken nest:
//   - the galleries (0 m): the rock between the bores, worn into paths between ridges of stone; the squatters' camp
//     at the way in, the fungus farm, the borer graveyard (dead borer shells you walk through), the Spiral Shaft
//     (a boss site);
//   - the bores (-2.4 m): the tunnels themselves, trenches winding through the rock under arches of it; the flooded
//     junction where two cross; the Grinding Hall and the Borer's Nest (boss sites) at the bottom of them.
// From the galleries you look down into the bores, and you can drop on whatever's walking there (it's a short fall).
// The darkest of the Deep: torches where people still live, teal fungus everywhere else. Its shrine: the Lantern Run.
import * as THREE from 'three';
import { City, GRID } from './city.js';
import { Deep } from './deep.js';
import { wallTex } from './ground.js';
import { candles, bones, corpse, sacks, bloodStain } from './decor.js';

const { vh } = GRID;
const H_GAL = 0, H_BORE = -2.4;
// the bores: [x0, x1, z0, z1] strips at H_BORE
const BORES = [
  [-47, 47, 28, 33],   // the long bore, east to west, under the camp
  [-3, 2, -40, 33],    // the trunk, north to south
  [-47, 20, -10, -5],  // the cross bore
  [20, 25, -40, -5],   // the east bore
  [25, 47, -40, -35],  // ... and on to the edge
  [-20, -8, -46, -34], // (the Grinding Hall's floor)
  [-44, -28, -40, -26], // (the Nest's)
  [-38, -33, -26, -10], // (the way down to it from the cross bore)
  [-3, 2, -46, -40],
  [-8, -3, -40, -34],
];

export const WORMWAYS = {
  seed: 0x3077a,
  boss: ['spiral', 'grind', 'nest'], vaults: ['k1', 'k2', 'shell1'], squares: ['farm', 'graveyard', 'junction', 'deep'],
  shrines: { must: 'lantern', pool: ['altar', 'valve'] },
  arena: { name: 'The Borer\'s Nest' },
  under: { vault: 'The Crawlways', boss: 'The Brood Chamber', cache: 'The Cult\'s Hoard' },
  buildings: [
    // the squatters' camp by the way in
    { key: 'k1', kind: 'shack', x0: -44, x1: -36, z0: 36, z1: 44, doors: [['e', 0.5], ['n', 0.5]], h: 3.4 },
    { key: 'k2', kind: 'shack', x0: 14, x1: 22, z0: 37, z1: 45, doors: [['w', 0.5], ['n', 0.5]], h: 3.2 },
    { key: 'k3', kind: 'shack', x0: 26, x1: 34, z0: 37, z1: 45, doors: [['w', 0.5]], h: 3.0, ruin: true },
    // the borer graveyard: two dead borers' shells lying on the galleries, walked through end to end
    { key: 'shell1', kind: 'shell', x0: 28, x1: 44, z0: 10, z1: 16, doors: [['w', 0.5, 3.4], ['e', 0.5, 3.4]], h: 4.6 },
    { key: 'shell2', kind: 'shell', x0: 30, x1: 36, z0: 18, z1: 26, doors: [['s', 0.5, 3.4], ['n', 0.5, 3.4]], h: 4.2 },
    // boss sites: the Spiral Shaft's head on the galleries, the Grinding Hall and the Nest down the bores
    { key: 'spiral', kind: 'spiral', x0: 30, x1: 44, z0: -30, z1: -18, doors: [['w', 0.5, 3.2], ['n', 0.5]], h: 7 },
    { key: 'grind', kind: 'grind', x0: -20, x1: -8, z0: -46, z1: -34, doors: [['e', 0.3, 3.2], ['n', 0.5]], h: 6 },
    { key: 'nest', kind: 'nest', x0: -44, x1: -28, z0: -40, z1: -26, doors: [['s', 0.6, 3.2]], h: 6 },
    // the cult's hut on the galleries
    { key: 'k4', kind: 'shack', x0: -24, x1: -14, z0: 10, z1: 18, doors: [['s', 0.5], ['e', 0.5]], h: 3.4 },
    { key: 'k5', kind: 'shack', x0: 8, x1: 16, z0: -28, z1: -20, doors: [['w', 0.5], ['n', 0.5]], h: 3.2, ruin: true },
  ],
  squareAt: { farm: [-42, -28, 4, 20], graveyard: [26, 46, -2, 8], junction: [-8, 8, -14, -2], deep: [-14, -3, -30, -20] },
};

export class Wormways extends Deep {
  static PLAN = WORMWAYS;
  get look() { return 'wormways'; }
  get ground() { return 'worm'; }
  get dim() { return 0.2; } // (the darkest of the Deep's areas)
  get sky() { return { hemi: 1.6, sun: 1.6, hemiColor: 0x7a948e, sunColor: 0x9ae0d0, fog: 0x0a1210 }; }
  get seams() { return 0.05; }

  streets() {
    return [[-47, 47, 28, 33], [-3, 2, -38, 26], [-46, 18, -10, -5], [20, 25, -38, -6], [-20, 20, 20, 26], [-20, 20, -2, 3], [6, 18, -16, -12], [-26, -6, -24, -18]]
      .map(([x0, x1, z0, z1]) => ({ x0, x1, z0, z1, alongX: x1 - x0 > z1 - z0 }));
  }

  build(w) {
    this.K = this.caveMats();
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    Object.assign(this.K, { tin: lam(0x5a5a54), canvas2: lam(0x4a5040), shell: lam(0x6a6660), shellDk: lam(0x4a4642), flesh: lam(0x8a7a6a), water: new THREE.MeshPhongMaterial({ color: 0x0a1414, emissive: 0x041010, specular: 0x6aa8a0, shininess: 90, flatShading: true }) });
    for (const [k, kind, sc] of [['tin', 'metal', 1.2], ['shell', 'metal', 2], ['shellDk', 'metal', 2]]) wallTex(this.K[k], kind, sc);
    super.build(w);
    this.def.name = this.area.name;
  }

  laneWalls(w) {
    const T = w.terrain, K = this.K;
    this.at(w, 0, 0);
    T.flat(-53, 53, -53, 53, H_GAL);
    for (const [x0, x1, z0, z1] of BORES) T.flat(x0, x1, z0, z1, H_BORE, { look: 'basalt', ivy: 0.5 });
    // ramps between the galleries and the bores
    T.slope(8, 12, 33, 37, H_BORE, H_GAL, 'z', { look: 'earth' });   // the camp down into the long bore
    T.slope(-30, -26, 24, 28, H_GAL, H_BORE, 'z', { look: 'earth' }); // the long bore up to the farm
    T.slope(2, 6, 10, 14, H_BORE, H_GAL, 'x', { look: 'earth' });     // the trunk up east
    T.slope(-7, -3, 16, 20, H_GAL, H_BORE, 'x', { look: 'earth' });   // ... and west
    T.slope(-46, -42, -14, -10, H_GAL, H_BORE, 'z', { look: 'earth' }); // the cross bore up south
    T.slope(25, 29, -20, -16, H_BORE, H_GAL, 'x', { look: 'earth' }); // the east bore up to the Spiral Shaft
    T.slope(30, 34, -35, -31, H_BORE, H_GAL, 'z', { look: 'earth' });
    T.slope(12, 16, -5, -1, H_BORE, H_GAL, 'z', { look: 'earth' });
    // the flooded junction: the trunk and the cross bore meet in a wider hollow
    T.flat(-8, 8, -14, -2, H_BORE, { look: 'basalt', ivy: 0.5 });
    // the deep hollow off the trunk, a step lower
    T.flat(-14, -2, -30, -20, H_BORE, { look: 'basalt' });
    // shortcuts: ladders pulled up out of the bores onto the galleries
    T.ladder(-16, 33.45, Math.PI, H_BORE, H_GAL, { raised: true });
    T.ladder(10, -9.55, Math.PI, H_BORE, H_GAL, { raised: true });
    this.terrainGroup(w);

    // the ground: the bores bored rock and gravel, the galleries moss and rock, boards through the camp
    const P = (s, x0, x1, z0, z1, o) => w.paint({ x0, x1, z0, z1 }, s, o), C = (s, cx, cz, r, o) => w.paint({ cx, cz, r }, s, o);
    P('moss', -47, 47, -47, 47, { amount: 0.3, edge: 4 });
    for (const [x0, x1, z0, z1] of BORES) P('gravel', x0 + 0.5, x1 - 0.5, z0 + 0.5, z1 - 0.5, { amount: 0.8, edge: 1 });
    P('boards', -5, 5, 34, 48, { edge: 0.4 }); P('boards', -44, 34, 34.5, 36, { amount: 0.7, edge: 0.4 });
    P('moss', -42, -28, 4, 20, { edge: 1.4 }); // the fungus farm
    for (const b of this.buildings) if (!b.yard) P(b.kind === 'shack' ? 'boards' : 'rock', b.x0 + 0.2, b.x1 - 0.2, b.z0 + 0.2, b.z1 - 0.2, { edge: 0.05 });
    for (const [x, z, r] of [[-20, -2, 3], [16, 20, 3], [-12, 40, 2.5], [40, -6, 3], [-40, -18, 3]]) C('moss', x, z, r, { edge: 2 });

    // glowing fungus: in the bores, round the farm, clinging to the ridges
    const F = (o) => w.flora.push(o);
    for (let k = 0; k < 30; k++) {
      const x = -45 + vh(k, 1) * 90, z = -45 + vh(k, 2) * 90;
      if (z > 34) continue;
      F({ kind: 'shroom', x, z, color: 'teal', n: 4 + Math.floor(vh(k, 3) * 5), r: 0.6 + vh(k, 4) * 0.6, power: 2 });
    }
    for (let x = -40; x <= -30; x += 3.3) for (let z = 6; z <= 18; z += 4) F({ kind: 'shroom', x, z, color: vh(x, z) < 0.3 ? 'amber' : 'teal', n: 8, r: 0.9, s: 1.3, light: vh(x, z, 2) < 0.4 }); // the farm's beds

    // the ridges of rock between the bores on the galleries (paths between them), and the bores' lips
    const wall = (...a) => this.wallRun(w, ...a);
    for (const [x0, x1, z0, z1, h] of [[-20, -8, 20, 21, 2.4], [8, 20, 20, 21, 2.2], [-46, -30, -2, -1, 2.4], [-20, -12, -1, 0, 2.0], [6, 18, -18, -17, 2.4], [28, 44, -14, -13, 2.4], [-26, -24, -26, -16, 2.2], [10, 11, 0, 14, 2.4], [-14, -13, 22, 27, 2.0]]) wall(x0, x1, z0, z1, h, K.rock);
    this.dressWorm(w);
  }

  dressWorm(w) {
    const K = this.K, M = w.mats;
    // arches of rock over the bores: the tunnels' roofs, high enough to walk under (you can't walk on them)
    const arch = (x, z, alongX, span) => {
      this.at(w, x, z);
      const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.noSettle = true;
      const y0 = w.floorAt(x, z);
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI * k / 8, r = span / 2 + 0.6, px = Math.cos(a) * r, py = Math.sin(a) * (r * 0.75) + 2.6;
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 2.2), k % 2 ? K.rock : K.rockDk);
        m.position.set(alongX ? 0 : px, y0 + py, alongX ? px : 0); m.rotation[alongX ? 'x' : 'z'] = (alongX ? -1 : 1) * (a - Math.PI / 2); g.add(m);
      }
      w.add(g);
    };
    for (const z of [30.5]) for (const x of [-34, -12, 18, 38]) arch(x, z, false, 5);
    for (const z of [22, 6, -24]) arch(-0.5, z, true, 5);
    for (const x of [-38, -22, 8]) arch(x, -7.5, false, 5);
    arch(22.5, -26, true, 5);
    // the borer graveyard: segments of dead borers lying about, a great drill head
    this.at(w, 36, 2);
    for (const [x, z, ry, s] of [[30, 2, 0.4, 1.1], [40, 4, -0.3, 0.9], [44, -4, 1.2, 1.3]]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * s, 1.6 * s, 1.4, 10, 1, true), K.shell); ring.rotation.z = Math.PI / 2; ring.rotation.y = ry; ring.position.set(x, 1.4 * s, z); w.add(ring);
      w.solids.push({ x0: x - 0.8, x1: x + 0.8, z0: z - 0.8, z1: z + 0.8 });
    }
    const drill = new THREE.Mesh(new THREE.ConeGeometry(2.0, 4.5, 8), K.iron); drill.rotation.z = Math.PI / 2; drill.position.set(36, 1.8, -1); w.add(drill); w.ob(36, -1, 1.8);
    // the camp: tarps, crates, a cooking fire, torches
    this.at(w, 0, 40);
    for (const [x, z] of [[-6, 36], [6, 36], [-14, 46], [12, 46], [-30, 36], [28, 34.6]]) this.lanternPost(w, x, z);
    for (const [x, z] of [[-10, 42], [-9, 43], [10, 40]]) w.crate(x, z);
    w.firePit(-24, 42); sacks(w, -20, 44); corpse(w, 4, 44, 1);
    // the bores: torches here and there, the dead, a cart off its rails, the flooded junction's black water
    this.at(w, 0, 0);
    for (const [x, z] of [[-20, 29], [24, 29], [-2.4, 14], [1.4, -18], [-28, -9], [22.5, -14], [36, -38]]) w.torch(x, z, 0x9ae8d0);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 20), K.water); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.04, -8); pool.scale.set(1.2, 0.9, 1); w.add(pool);
    this.mineCart(w, -16, -7, 1.2); bones(w, -1, 18); corpse(w, 22, -30, 2); bloodStain(w, -40, -8, 1);
    for (const [x, z] of [[-10, -24], [-6, -28]]) this.oreHeap(w, x, z, 1.0);
    for (const [x, z, h] of [[-44, 0, 2.4], [-30, -20, 2.6], [16, 8, 2.2], [44, -26, 2.8], [-8, 44, 2.0]]) this.stalagmite(w, x, z, h);
  }

  // ---------- the buildings ----------
  buildingMats(w, b) {
    const K = this.K;
    return { shack: { wall: vh(b.cx, b.cz) < 0.5 ? K.tin : K.canvas2, trim: K.timberDk }, shell: { wall: K.shell, trim: K.shellDk }, spiral: { wall: K.rockDk, trim: K.iron }, grind: { wall: K.iron, trim: K.rust }, nest: { wall: K.rockDk, trim: K.flesh } }[b.kind] || { wall: K.rock, trim: K.timber };
  }
  windowMat(w, b, lit) { return b.kind === 'shell' || b.kind === 'nest' ? this.K.shellDk : lit ? this.K.glowTeal : w.mats.logDark; }
  decorateBuilding(w, b, segs) {
    const K = this.K;
    for (const s of segs) {
      if (!s.outer || s.door) continue;
      const out = s.outer === 's' || s.outer === 'e' ? 1 : -1, face = s.line + out * 0.29;
      const put = (a0, a1, y0, y1, mat, d = 0.1) => { const len = a1 - a0, hh = y1 - y0, mid = (a0 + a1) / 2; if (len <= 0.02 || hh <= 0.02) return; this.into(w, b.tall, () => (s.alongX ? w.box(len, hh, d, mat, mid, y0 + hh / 2, face) : w.box(d, hh, len, mat, face, y0 + hh / 2, mid))); };
      // a shell: its ribs; the Grinding Hall: bolted plates; the nest: grown-over lumps
      if (b.kind === 'shell') for (let a = s.a0 + 0.6; a < s.a1; a += 1.4) put(a - 0.15, a + 0.15, 0, b.h, K.shellDk, 0.3);
      if (b.kind === 'grind') for (let a = s.a0 + 1; a < s.a1; a += 2) put(a - 0.1, a + 0.1, 0.4, b.h - 0.4, K.rust, 0.12);
      if (b.kind === 'nest') for (let a = s.a0 + 0.8; a < s.a1; a += 2.2) put(a - 0.5, a + 0.5, 0, 0.8 + vh(a, s.line) * 1.4, K.flesh, 0.5);
      if (b.kind === 'shack') put(s.a0, s.a1, 0, 0.5, K.timberDk, 0.12);
    }
  }
  roofDetail(w, b, W, D) {
    const K = this.K, y = b.h + 0.3, cx = b.cx, cz = b.cz;
    if (b.kind === 'shell') { // a half-round of plates over it
      const along = W > D, L = along ? W : D, span = along ? D : W;
      for (let k = 0; k < 7; k++) { const a = Math.PI * (k + 0.5) / 7, o = Math.cos(a) * span / 2, yy = Math.sin(a) * span * 0.35; const m = w.box(along ? L : 0.9, 0.18, along ? 0.9 : L, k % 2 ? K.shell : K.shellDk, cx + (along ? 0 : o), y - 0.6 + yy, cz + (along ? o : 0)); m.rotation[along ? 'x' : 'z'] = (along ? 1 : -1) * (a - Math.PI / 2); }
      return;
    }
    if (b.kind === 'spiral') { // the shaft's headgear: a ring of iron and a winch over the hole
      const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(W, D) * 0.32, 0.3, 5, 16), K.iron); ring.rotation.x = Math.PI / 2; ring.position.set(cx, y + 0.3, cz); w.add(ring);
      for (const s2 of [-1, 1]) w.box(0.4, 4, 0.4, K.iron, cx + s2 * 3, y + 2, cz); w.box(6.4, 0.4, 0.4, K.iron, cx, y + 4, cz);
      return;
    }
    if (b.kind === 'grind') { w.box(W + 0.4, 0.3, D + 0.4, K.iron, cx, y, cz); for (let k = 0; k < 3; k++) { const g = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.4, 10), K.rust); g.rotation.x = Math.PI / 2; g.position.set(b.x0 + 2.5 + k * 3.5, y + 1.4, cz); w.add(g); } return; }
    if (b.kind === 'nest') { for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 7, 5), K.flesh); m.position.set(b.x0 + 2 + vh(k, 1) * (W - 4), y + 0.2, b.z0 + 2 + vh(k, 2) * (D - 4)); m.scale.y = 0.6; w.add(m); } w.box(W, 0.4, D, K.rockDk, cx, y, cz); return; }
    // a shack: a tarp over poles
    const m = w.box(W + 0.8, 0.1, D + 0.8, vh(cx, cz) < 0.5 ? K.canvas : K.canvas2, cx, y + 0.3, cz); m.rotation.z = 0.12;
  }
  furnish(w, b) {
    super.furnish(w, b);
    const K = this.K, { spot } = this.freeIn(w, b);
    this.at(w, b.cx, b.cz);
    if (b.kind === 'shack') { const p = spot(1.0); if (p) { w.box(1.6, 0.3, 0.9, K.canvas, p.x, 0.15, p.z); } const q = spot(0.8); if (q) w.flora.push({ kind: 'shroom', x: q.x, z: q.z, color: 'amber', n: 3, r: 0.3, power: 1.5 }); }
    if (b.kind === 'nest') for (let k = 0; k < 3; k++) { const p = spot(1.2); if (p) { const egg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), K.flesh); egg.position.set(p.x, 0.45, p.z); egg.scale.y = 1.3; w.add(egg); w.ob(p.x, p.z, 0.6); } }
    if (b.kind === 'grind') for (let k = 0; k < 2; k++) { const p = spot(1.4); if (p) this.oreHeap(w, p.x, p.z, 0.9); }
    if (b.kind === 'shell') { const p = spot(0.8); if (p) w.flora.push({ kind: 'shroom', x: p.x, z: p.z, color: 'teal', n: 5, r: 0.5 }); }
  }
}
City.MAPS.wormways = Wormways;
