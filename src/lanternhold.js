// Lanternhold (regions.js r2a1), the first town below the Glass Wastes: a mining town on ledges stepping down the
// main shaft, lit by a thousand lanterns, white daylight falling in shafts through cracks in the glass far overhead.
// 95 m across, laid by hand on five ledges going down north (a Deep: deep.js):
//   - the Top Landing (0 m) where the lift comes down: the Winding House (a boss site), the first houses;
//   - the Ledges (-2.5 m): timber houses on the rock shelf, rope-railed;
//   - the Market Floor (-5 m): stalls, the lantern-tree, the dry well; the Lamp Chapel (a boss site);
//   - the Workings (-7.5 m): ore heaps, sorting sheds, cart rails, the long cart ramp up; the Foreman's Hall (a boss
//     site);
//   - the Sump Pit (-10 m): black water, the old pumps.
// Pulled-up ladders between the ledges. Its shrine: the Ore Cart (seals.js).
import * as THREE from 'three';
import { City, GRID } from './city.js';
import { Deep } from './deep.js';
import { wallTex } from './ground.js';
import { candles, bones, corpse, sacks, crows, bloodStain } from './decor.js';

const { vh } = GRID;
const H_TOP = 0, H_LEDGE = -2.5, H_MARKET = -5, H_WORK = -7.5, H_PIT = -10;

export const LANTERNHOLD = {
  seed: 0x1a7e4,
  boss: ['winding', 'chapel', 'hall'], vaults: ['h1', 'h4', 's1'], squares: ['market', 'workings', 'pit', 'landing'],
  shrines: { must: 'cart', pool: ['elite', 'circle'] },
  arena: { name: 'The Lamp-King\'s Undercroft' },
  under: { vault: 'The Old Galleries', boss: 'The Undercroft', cache: 'The Foreman\'s Strongroom' },
  buildings: [
    // the Top Landing
    { key: 'winding', kind: 'winding', x0: 14, x1: 34, z0: 32, z1: 44, doors: [['w', 0.5, 3.2], ['n', 0.4]], h: 8 },
    { key: 'h1', x0: -44, x1: -34, z0: 34, z1: 43, doors: [['e', 0.5], ['n', 0.4]], h: 5.4 },
    { key: 'h2', x0: -28, x1: -20, z0: 36, z1: 45, doors: [['n', 0.5], ['e', 0.6]], h: 4.4 },
    // the Ledges
    { key: 'h3', x0: -44, x1: -34, z0: 16, z1: 25, doors: [['e', 0.5], ['n', 0.6]], h: 5.0 },
    { key: 'h4', x0: -28, x1: -18, z0: 18, z1: 27, doors: [['e', 0.5], ['s', 0.4]], h: 5.8 },
    { key: 'h5', x0: 20, x1: 30, z0: 16, z1: 25, doors: [['w', 0.5], ['n', 0.5]], h: 4.6 },
    { key: 'h6', x0: 34, x1: 44, z0: 15, z1: 26, doors: [['w', 0.6], ['n', 0.4]], ruin: true },
    // the Market Floor
    { key: 'chapel', kind: 'lampchapel', x0: -44, x1: -28, z0: -8, z1: 6, doors: [['e', 0.5, 3.2], ['n', 0.6]], h: 8 },
    { key: 'h7', x0: 30, x1: 42, z0: -6, z1: 4, doors: [['w', 0.5], ['s', 0.5]], h: 5.0 },
    { key: 'y1', kind: 'yard', x0: 20, x1: 27, z0: -10, z1: -3, doors: [['w', 0.5], ['s', 0.4]] },
    // the Workings
    { key: 'hall', kind: 'hall', x0: 18, x1: 38, z0: -30, z1: -17, doors: [['w', 0.4, 3.2], ['n', 0.5]], h: 7, part: { axis: 'x', at: 32, t: 0.5, w: 3 } },
    { key: 's1', kind: 'shed', x0: -30, x1: -18, z0: -28, z1: -18, doors: [['e', 0.5], ['s', 0.5]], h: 5 },
    { key: 's2', kind: 'shed', x0: -44, x1: -36, z0: -30, z1: -20, doors: [['e', 0.5], ['n', 0.5]], h: 4.6, ruin: true },
    // the Sump Pit
    { key: 'h8', x0: 24, x1: 34, z0: -46, z1: -38, doors: [['w', 0.5], ['s', 0.5]], ruin: true },
    { key: 'h9', x0: -40, x1: -30, z0: -46, z1: -37, doors: [['e', 0.5], ['s', 0.4]], h: 4.4 },
  ],
  squareAt: { landing: [-10, 8, 33, 46], market: [-12, 14, -9, 9], workings: [-12, 10, -30, -18], pit: [-14, 14, -46, -36] },
};

export class Lanternhold extends Deep {
  static PLAN = LANTERNHOLD;
  get look() { return 'lanternhold'; }
  get ground() { return 'lantern'; }
  get dim() { return 0.06; } // (the brightest of the Deep's areas)
  // underground: what light there is falls from the cracks above, cold, with the lamps warm below it
  get sky() { return { hemi: 2.1, sun: 2.4, hemiColor: 0xa8968a, sunColor: 0xe0eeff, fog: 0x1a140e }; }

  streets() {
    return [[-4, 4, 30, 46], [-30, -10, 28, 32], [6, 18, 26, 30], [-12, 14, 10, 14], [-26, 26, -14, -10], [-14, 14, -34, -31], [-44, -14, -14, -10], [28, 44, -14, -10]]
      .map(([x0, x1, z0, z1]) => ({ x0, x1, z0, z1, alongX: x1 - x0 > z1 - z0 }));
  }

  build(w) {
    this.K = this.caveMats();
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    Object.assign(this.K, { plank: lam(0x6a4e38), plankDk: lam(0x4a3626), tin: lam(0x6a6660), awning: lam(0x7a3a24), awning2: lam(0x5a5a30), brass: lam(0x8a6a2e), water: new THREE.MeshPhongMaterial({ color: 0x0c1418, emissive: 0x050a0c, specular: 0x8aa0b0, shininess: 90, flatShading: true }) });
    for (const [k, kind, sc] of [['plank', 'wood', 1.5], ['plankDk', 'wood', 1.5], ['tin', 'metal', 1.2]]) wallTex(this.K[k], kind, sc);
    // (the city's facades and brick: city.js uses them for the odd wall)
    super.build(w);
    this.def.name = this.area.name;
  }

  laneWalls(w) {
    const T = w.terrain, K = this.K;
    this.at(w, 0, 0);
    // the five ledges, going down north
    T.flat(-53, 53, 30, 53, H_TOP);
    T.flat(-53, 53, 12, 30, H_LEDGE, { look: 'earth', ivy: 0.2 });
    T.flat(-53, 53, -12, 12, H_MARKET, { look: 'earth', ivy: 0.2 });
    T.flat(-53, 53, -32, -12, H_WORK, { look: 'earth', ivy: 0.15 });
    T.flat(-53, 53, -53, -32, H_PIT, { look: 'basalt', ivy: 0.25 });
    // the ways down: stairs cut in the rock, timber ramps, the long cart ramp from the market to the workings
    T.stairs(-4, 4, 26, 30, H_LEDGE, H_TOP, 'z', { look: 'earth' });
    T.slope(38, 44, 22, 30, H_LEDGE, H_TOP, 'z', { look: 'earth' });
    T.stairs(-3, 5, 8, 12, H_MARKET, H_LEDGE, 'z', { look: 'earth' });
    T.slope(-46, -40, 4, 12, H_MARKET, H_LEDGE, 'z', { look: 'earth' });
    T.stairs(14, 20, -16, -12, H_WORK, H_MARKET, 'z', { look: 'earth' });
    T.slope(-6, 0, -24, -12, H_WORK, H_MARKET, 'z', { look: 'earth' }); // (the cart ramp)
    T.stairs(-4, 4, -36, -32, H_PIT, H_WORK, 'z', { look: 'basalt' });
    T.stairs(38, 44, -36, -32, H_PIT, H_WORK, 'z', { look: 'basalt' });
    // the shortcuts: ladders pulled up at the top of a ledge, lowered to come back up
    T.ladder(10, 29.55, 0, H_LEDGE, H_TOP, { raised: true });
    T.ladder(-20, -12.45, 0, H_WORK, H_MARKET, { raised: true });
    T.ladder(20, -32.45, 0, H_PIT, H_WORK, { raised: true });
    this.terrainGroup(w);

    // the ground: plank walkways on the ledges and through the town, the rock floor worn smooth, ore gravel in the
    // workings, moss in the damp corners and down in the pit
    const P = (s, x0, x1, z0, z1, o) => w.paint({ x0, x1, z0, z1 }, s, o), C = (s, cx, cz, r, o) => w.paint({ cx, cz, r }, s, o);
    P('boards', -5, 5, 26, 48, { edge: 0.3 });
    P('boards', -47, 47, 27, 31, { amount: 0.8, edge: 0.6 });
    P('boards', -47, 47, 9, 13, { amount: 0.8, edge: 0.6 });
    P('boards', -12, 14, -9, 9, { edge: 0.6, amount: 0.55 });
    P('gravel', -47, 47, -32, -12, { amount: 0.7, edge: 2 });
    P('boards', -6, 0, -24, -12, { edge: 0.3 });
    P('moss', -47, 47, -53, -32, { amount: 0.55, edge: 3 });
    for (const [x, z, r] of [[-46, 44, 4], [46, 40, 3], [-46, 20, 3.5], [46, 4, 4], [-46, -6, 3], [8, 22, 2.6], [-14, -4, 2.2], [46, -26, 3]]) C('moss', x, z, r, { edge: 1.8 });
    for (const b of this.buildings) if (!b.yard) P('boards', b.x0 + 0.2, b.x1 - 0.2, b.z0 + 0.2, b.z1 - 0.2, { edge: 0.05 });

    // what grows down here: glowing mushrooms in the damp, crystal in the rock
    const F = (o) => w.flora.push(o);
    for (const [x, z, c] of [[-45, 30.5, 'amber'], [44, 12.6, 'teal'], [-14, 10.4, 'teal'], [12, -11.3, 'amber'], [-44, -13, 'teal'], [-10, -40, 'teal'], [10, -44, 'teal'], [44, -44, 'amber'], [-24, -34, 'teal'], [30, -14, 'teal']]) F({ kind: 'shroom', x, z, color: c, n: 7, r: 0.8 });
    for (const [x, z, c] of [[-46, -46, 'cyan'], [46, -40, 'violet'], [-46, 8, 'cyan'], [46, 30, 'cyan']]) F({ kind: 'crystal', x, z, color: c, n: 5, r: 0.6, block: true });

    // walls you can't cross: rope-railed timber along each ledge's lip (gaps for the ways down and the ladders)
    const wall = (...a) => this.wallRun(w, ...a);
    // (on the higher side of each drop: gaps for the stairs, the ramps and the ladders)
    for (const [x0, x1] of [[-47, -5], [5, 9.2], [10.8, 37.5], [44.5, 47]]) wall(x0, x1, 30.1, 30.4, 0.9, K.timberDk);
    for (const [x0, x1] of [[-39.5, -4], [6, 47]]) wall(x0, x1, 12.1, 12.4, 0.9, K.timberDk);
    for (const [x0, x1] of [[-47, -20.8], [-19.2, -7], [1, 13], [21, 47]]) wall(x0, x1, -11.9, -11.6, 0.9, K.timberDk);
    for (const [x0, x1] of [[-47, -5], [5, 19.2], [20.8, 37.5], [44.5, 47]]) wall(x0, x1, -31.9, -31.6, 0.9, K.timberDk);

    this.dressTown(w);
  }

  dressTown(w) {
    const K = this.K, M = w.mats;
    // the Top Landing: lamps, crates off the lift, a notice board, a daylight shaft
    this.at(w, 0, 38);
    for (const [x, z] of [[-6, 34], [6, 34], [-14, 40], [10, 46], [-32, 31], [36, 31]]) this.lanternPost(w, x, z);
    for (const [x, z] of [[-8, 44], [-7, 45], [8, 38]]) w.crate(x, z);
    w.box(2.2, 1.6, 0.2, K.plankDk, -2, 1.2, 46.4); w.box(0.12, 2.0, 0.12, K.timberDk, -3, 1.0, 46.4); w.box(0.12, 2.0, 0.12, K.timberDk, -1, 1.0, 46.4);
    this.lightShaft(w, -2, 38, 1.8);
    // the Ledges: lamp strings from house to house, sacks, a dead miner
    this.at(w, 0, 20);
    this.lampString(w, -34, 21, -28, 22); this.lampString(w, 20, 20, 30, 20, 3.8);
    for (const [x, z] of [[-12, 14], [10, 14], [-4, 22], [34, 13]]) this.lanternPost(w, x, z);
    sacks(w, -16, 16); corpse(w, 6, 18, 1.2); bones(w, 14, 24);
    this.lightShaft(w, 4, 20, 1.4);
    // the Market Floor: stalls under awnings, the lantern-tree, the dry well, lamps all round
    this.at(w, 1, 0);
    const stall = (x, z, ry, fallen) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
      const part = (W, H, D, m, px, py, pz, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), m); o.position.set(px, py, pz); o.rotation.z = rz; g.add(o); };
      for (const [px, pz] of [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]]) part(0.12, 2.2, 0.12, K.timber, px, 1.1, pz);
      part(2.8, 0.1, 1.9, fallen ? K.awning2 : K.awning, 0, 2.25, 0, fallen ? -0.3 : 0.1);
      part(2.4, 0.8, 0.6, K.plank, 0, 0.4, 0.4);
      part(0.3, 0.3, 0.3, K.lamp, -0.7, 0.95, 0.4); part(0.5, 0.25, 0.4, M.cloth, 0.5, 0.92, 0.35);
      w.add(g); w.solids.push({ x0: x - 1.3, x1: x + 1.3, z0: z - 0.9, z1: z + 0.9 });
    };
    for (const [x, z, f] of [[-8, -5, false], [-8, 5, true], [10, -5, true], [10, 5, false]]) stall(x, z, 0, f);
    // the lantern-tree: a dead tree in the middle hung all over with lamps
    w.flora.push({ kind: 'tree', x: 1, z: 0, s: 1.1, dead: true });
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, r = 0.8 + (k % 3) * 0.35; w.box(0.16, 0.2, 0.16, K.lamp, 1 + Math.cos(a) * r, 2.2 + (k % 4) * 0.35, Math.sin(a) * r); }
    w.lights.push({ x: 1, y: 3, z: 0, color: 0xffb860, power: 10, range: 12, src: {} });
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; w.box(0.6, 0.8, 0.35, K.stone, 1 + Math.cos(a) * 1.2 + 6, 0.4, 5 + Math.sin(a) * 1.2, -a); } // the well (east of the tree)
    w.ob(7, 5, 1.5);
    for (const [x, z] of [[-12, -9], [14, -9], [-12, 9], [14, 9], [-26, 2], [26, -1]]) this.lanternPost(w, x, z);
    crows(w, 4, -3, 2); bloodStain(w, -4, 2, 1); bones(w, 8, -8);
    this.lightShaft(w, -4, -2, 2.0);
    // the Workings: ore heaps, mine carts on their old rails, a sorting chute, timber shoring along the rock
    this.at(w, 0, -24);
    for (const [x, z, r] of [[-10, -21, 1.6], [6, -28, 1.3], [-34, -14, 1.4], [44, -18, 1.5], [8, -20, 1.0]]) this.oreHeap(w, x, z, r);
    for (const [x, z, ry] of [[-3, -27, 0], [4, -23, 1.2], [12, -14, 0.3]]) this.mineCart(w, x, z, ry);
    for (let z = -30; z <= -14; z += 1.2) { w.box(1.4, 0.06, 0.2, K.timberDk, -3, 0.03, z); } for (const s of [-1, 1]) w.box(0.06, 0.08, 16, K.iron, -3 + s * 0.5, 0.08, -22);
    for (const [x, z] of [[-14, -16], [14, -31], [-40, -14.5], [40, -14.5], [-6, -16]]) this.lanternPost(w, x, z);
    for (const x of [-46, -30, 44]) this.shoring(w, x, -26, Math.PI / 2, 3, 3.2);
    sacks(w, 12, -26); corpse(w, -8, -25, 2);
    this.lightShaft(w, -18, -32.8 + 6, 1.2);
    // the Sump Pit: black water in the middle, two old pump engines, a lamp or two, the drowned
    this.at(w, 0, -41);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(6, 22), K.water); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.04, -42); pool.scale.set(1.4, 0.8, 1); w.add(pool);
    for (const [x, z] of [[-11, -38], [11, -44]]) { w.box(2.4, 2.6, 2.0, K.rust, x, 1.3, z); w.box(0.5, 4.2, 0.5, K.iron, x + 0.8, 2.1, z); w.box(2.6, 0.3, 0.3, K.iron, x, 3.4, z); w.solids.push({ x0: x - 1.2, x1: x + 1.2, z0: z - 1.0, z1: z + 1.0 }); }
    for (const [x, z] of [[-16, -35], [16, -35], [-22, -46], [22, -46]]) this.lanternPost(w, x, z, true, 0x9ad8ff);
    bones(w, 6, -38); corpse(w, -4, -46, 0.4);
    for (const [x, z] of [[-30, -34], [42, -46], [-46, -40]]) this.stalagmite(w, x, z, 2.6);
  }

  // ---------- the buildings ----------
  buildingMats(w, b) {
    const K = this.K;
    return { winding: { wall: K.plankDk, trim: K.iron }, lampchapel: { wall: K.stone, trim: K.brass }, hall: { wall: K.stoneDk, trim: K.timber }, shed: { wall: K.tin, trim: K.timberDk } }[b.kind]
      || { wall: vh(b.cx, b.cz) < 0.5 ? K.plank : K.plankDk, trim: K.timberDk };
  }
  windowMat(w, b, lit) { return lit ? this.K.lamp : w.mats.logDark; }
  // the houses: timber planked shacks on stilts, a lamp by every door; the big ones their own trim
  decorateBuilding(w, b, segs, wall, trim) {
    const K = this.K;
    for (const s of segs) {
      if (!s.outer) continue;
      const out = s.outer === 's' || s.outer === 'e' ? 1 : -1, face = s.line + out * 0.29;
      const put = (a0, a1, y0, y1, mat, d = 0.08) => { const len = a1 - a0, hh = y1 - y0, mid = (a0 + a1) / 2; if (len <= 0.02 || hh <= 0.02) return; this.into(w, b.tall, () => (s.alongX ? w.box(len, hh, d, mat, mid, y0 + hh / 2, face) : w.box(d, hh, len, mat, face, y0 + hh / 2, mid))); };
      if (s.door) { put(s.a0 - 0.3, s.a0 - 0.05, 0, 2.8, K.timber, 0.14); put(s.a1 + 0.05, s.a1 + 0.3, 0, 2.8, K.timber, 0.14); put(s.a0 - 0.3, s.a1 + 0.3, 2.7, 2.95, K.timber, 0.16); put(s.a1 + 0.35, s.a1 + 0.6, 2.2, 2.5, K.lamp, 0.2); continue; }
      put(s.a0, s.a1, 0, 0.6, K.timberDk, 0.12); // a skirt of planks round the stilts
      for (let a = s.a0; a <= s.a1 + 0.01; a += 2.2) put(a - 0.08, a + 0.08, 0, b.ruin ? b.h * 0.5 : b.h, trim, 0.14); // posts
      if (b.kind === 'lampchapel') for (let a = s.a0 + 1; a < s.a1; a += 2.5) put(a - 0.2, a + 0.2, 1.4, 3.0, K.lamp, 0.06); // lit lancet windows
      if (b.kind === 'hall' || b.kind === 'winding') put(s.a0, s.a1, b.h - 0.6, b.h - 0.3, K.iron, 0.14);
    }
  }
  roofDetail(w, b, W, D) {
    const K = this.K, y = b.h + 0.3, cx = b.cx, cz = b.cz;
    if (b.kind === 'winding') {
      // the headframe: a tall timber A-frame with the winding wheel over the shaft
      for (const s of [-1, 1]) { const m = w.box(0.35, 9, 0.35, K.timber, cx + s * 2.5, y + 4.2, cz); m.rotation.z = -s * 0.22; }
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 5, 14), K.iron); wheel.position.set(cx, y + 8, cz); w.add(wheel);
      w.box(W + 0.4, 0.25, D + 0.4, K.tin, cx, y, cz);
      return;
    }
    if (b.kind === 'lampchapel') {
      const m = w.box(W + 0.6, 0.2, D * 0.62, K.tin, cx, y + 1.2, cz - D * 0.22); m.rotation.x = -0.5; const m2 = w.box(W + 0.6, 0.2, D * 0.62, K.tin, cx, y + 1.2, cz + D * 0.22); m2.rotation.x = 0.5;
      w.box(1.4, 3.2, 1.4, K.stone, b.x0 + 2, y + 1.6, cz); w.box(0.8, 0.8, 0.8, K.lamp, b.x0 + 2, y + 3.4, cz); // the lamp tower
      w.lights.push({ x: b.x0 + 2, y: y + 3.4, z: cz, color: 0xffb860, power: 10, range: 14, src: {} });
      return;
    }
    if (b.kind === 'hall') { w.box(W + 0.5, 0.3, D + 0.5, K.stoneDk, cx, y, cz); for (const s of [-1, 1]) w.cyl(0.4, 0.5, 3, K.rust, cx + s * W * 0.3, y + 1.5, cz, 8); return; }
    if (b.kind === 'shed') { const m = w.box(W + 0.6, 0.15, D + 0.6, K.tin, cx, y + 0.4, cz); m.rotation.z = 0.2; return; }
    // a house: a tin lean-to roof patched with planks, a stove pipe
    const m = w.box(W + 0.7, 0.14, D + 0.7, vh(cx, cz) < 0.5 ? K.tin : K.plankDk, cx, y + 0.45, cz); m.rotation.x = 0.16;
    w.cyl(0.12, 0.12, 1.4, K.iron, b.x1 - 1, y + 1.0, b.z0 + 1, 6);
  }
  furnish(w, b) {
    super.furnish(w, b);
    const K = this.K, { spot } = this.freeIn(w, b);
    this.at(w, b.cx, b.cz);
    if (b.kind === 'shed') for (let k = 0; k < 2; k++) { const p = spot(1.4); if (p) this.oreHeap(w, p.x, p.z, 0.9); }
    if (b.kind === 'lampchapel') { for (let k = 0; k < 4; k++) { const p = spot(1.0); if (p) candles(w, p.x, p.z, 5); } }
    if (b.kind === 'hall') { const p = spot(1.6); if (p) { w.box(2.4, 0.9, 1.2, K.plankDk, p.x, 0.45, p.z); w.ob(p.x, p.z, 1.1); } }
    const q = spot(0.8); if (q && !b.yard) { w.box(0.22, 0.3, 0.22, K.lamp, q.x, 0.15, q.z); w.lights.push({ x: q.x, y: 0.6, z: q.z, color: 0xffb860, power: 2.4, range: 5, src: {} }); }
  }
}
City.MAPS.lanternhold = Lanternhold;
