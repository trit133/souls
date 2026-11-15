// Saint Orsk's Spire (regions.js r1a3), rebuilt on its hill in the low gold sun of late afternoon: the high augur's
// cathedral-fortress climbing north in four tiers, 95 m across, laid by hand (a Ward: ward.js):
//   - the Pilgrims' Yard (0 m) at the crusade's gate: the pilgrims' hostel, a wayside chapel; a grand stair up the
//     middle, a switchback ramp climbing the cliff in the east, and the crypt tunnel driven into the cliff in the west
//     (dark, lined with ossuary niches, steps up inside to the Cloister);
//   - the Cloister (3 m): the garth (a square of grass inside a colonnade you walk through between the columns), the
//     Scriptorium, a reliquary tower, the Augury House (a boss site) by the Augury Well, a bowl sunk deep in the rock;
//   - the Choir Heights (6 m): the Great Nave (a boss site) over its plaza, the monks' cells, a chapel;
//   - the Spire's Foot (8 m): the Bell Foundry (a boss site) in its furnace yard, the ossuary, the Spire itself (a
//     landmark you can't enter), and above them the north rampart (11 m) running between two bell towers you climb
//     (14 m).
// Its own chests, drums and shrine (the choir bells) as before.
import * as THREE from 'three';
import { City, GRID } from './city.js';
import { Ward } from './ward.js';
import { candles, bones, corpse, robed, crows, bloodStain } from './decor.js';
import { SPIRE } from './spire.js';

const { vh } = GRID;
const H_YARD = 0, H_CLO = 3, H_CHOIR = 6, H_FOOT = 8, H_RAMP = 11, H_BELL = 14;

export const HILL = {
  ...SPIRE, // (its shrines, arena and basement names)
  seed: 0x5711a,
  boss: ['augury', 'nave', 'foundry'], vaults: ['hostel', 'scrip', 'chapel2'], squares: ['pilgrim', 'garth', 'well', 'heights'],
  buildings: [
    // the Pilgrims' Yard
    { key: 'hostel', kind: 'hostel', x0: -44, x1: -30, z0: 36, z1: 46, doors: [['e', 0.5], ['n', 0.6]], h: 5 },
    { key: 'chapel1', kind: 'chapelet', x0: 18, x1: 28, z0: 37, z1: 46, doors: [['w', 0.5]], h: 6 },
    { key: 'crypt', kind: 'tunnel', x0: -27, x1: -23, z0: 14, z1: 33, doors: [['s', 0.5, 2.6], ['n', 0.5, 2.6]], h: 4.6 },
    // the Cloister
    { key: 'scrip', kind: 'scriptorium', x0: -44, x1: -30, z0: 10, z1: 24, doors: [['e', 0.35], ['s', 0.5]], h: 6, part: { axis: 'x', at: 17, t: 0.5 } },
    { key: 'reliq', kind: 'reliquary', x0: -20, x1: -14, z0: 8, z1: 14, doors: [['s', 0.5]], h: 9 },
    { key: 'augury', kind: 'augury', x0: 30, x1: 42, z0: 8, z1: 19, doors: [['w', 0.5, 2.8], ['s', 0.4]], h: 7 },
    // the Choir Heights
    { key: 'nave', kind: 'nave', x0: -14, x1: 14, z0: -20, z1: -5, doors: [['s', 0.5, 3.2], ['e', 0.5], ['w', 0.5]], h: 12 },
    { key: 'chapel2', kind: 'chapelet', x0: -44, x1: -34, z0: -20, z1: -10, doors: [['s', 0.5], ['e', 0.5]], h: 6 },
    { key: 'cells', kind: 'cells', x0: 24, x1: 42, z0: -18, z1: -9, doors: [['s', 0.3], ['s', 0.75], ['w', 0.5]], h: 4.2, part: { axis: 'z', at: 33, t: 0.5 } },
    // the Spire's Foot
    { key: 'foundry', kind: 'foundry', x0: 16, x1: 36, z0: -40, z1: -27, doors: [['s', 0.3, 3.2], ['w', 0.5]], h: 8 },
    { key: 'ossuary', kind: 'ossuary', x0: -36, x1: -26, z0: -38, z1: -30, doors: [['s', 0.5], ['e', 0.5]], h: 4.5, ruin: true },
  ],
  squareAt: { pilgrim: [-10, 10, 36, 46], garth: [-8, 8, 12, 22], well: [19, 29, 15, 25], heights: [-8, 8, -3, 4] },
};

export class Hill extends Ward {
  static PLAN = HILL;
  get look() { return 'spire'; }
  get ground() { return 'hill'; }
  get groundUnder() { return 'hillUnder'; }
  // the low gold sun of late afternoon, long and warm
  get sky() { return { hemi: 3.0, sun: 3.6, hemiColor: 0xe0d0b8, sunColor: 0xffc489, fog: 0x3e3024 }; }

  streets() {
    return [[-4, 4, 30, 46], [30, 46, 27, 34], [-30, -10, 26, 30], [-26, 26, 6, 10], [-30, 24, -3, 2], [-44, -16, -6, -2], [-30, 14, -26, -22], [-20, 14, -44, -41]]
      .map(([x0, x1, z0, z1]) => ({ x0, x1, z0, z1, alongX: x1 - x0 > z1 - z0 }));
  }

  build(w) {
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    this.K = {
      pale: lam(0xa49c8e), paleDk: lam(0x7e776c), basalt: lam(0x3a3836), gold: lam(0x9a7a34), slate: lam(0x3a3c44), lead: lam(0x5a5e66),
      glassRed: lam(0x000000, { emissive: 0xc8402a }), glassGold: lam(0x000000, { emissive: 0xd8a040 }), glassViolet: lam(0x000000, { emissive: 0x9a5ae0 }),
      fire: lam(0x000000, { emissive: 0xff7a2a }), bronze: lam(0x7a5a2a), timber: lam(0x3a2c22), bone: lam(0xbab09a),
    };
    super.build(w);
  }

  laneWalls(w) {
    const T = w.terrain, K = this.K;
    this.at(w, 0, 0);
    // the four tiers, climbing north
    T.flat(-53, 53, 30, 53, H_YARD);
    T.flat(-53, 53, 6, 30, H_CLO, { look: 'pale', ivy: 0.35 });
    T.flat(-53, 53, -22, 6, H_CHOIR, { look: 'pale', ivy: 0.3 });
    T.flat(-53, 53, -53, -22, H_FOOT, { look: 'pale', ivy: 0.25 });
    // the north rampart and its two bell towers
    T.flat(-41, 41, -53, -44, H_RAMP, { look: 'basalt' });
    T.flat(-53, -41, -53, -41, H_BELL, { look: 'basalt' }); T.flat(41, 53, -53, -41, H_BELL, { look: 'basalt' });
    T.stairs(-41, -36, -48, -44, H_BELL, H_RAMP, 'x'); T.stairs(36, 41, -48, -44, H_RAMP, H_BELL, 'x');
    T.stairs(-26, -21, -44, -40, H_RAMP, H_FOOT, 'z'); T.stairs(21, 26, -44, -40, H_RAMP, H_FOOT, 'z');
    // the Yard up to the Cloister: the grand stair, the switchback in the east, the crypt tunnel's floor
    T.stairs(-4, 4, 26, 33, H_CLO, H_YARD, 'z', { look: 'pale' });
    T.slope(30, 44, 30, 34, H_YARD, 1.5, 'x', { look: 'pale' }); T.flat(44, 47, 27, 34, 1.5, { look: 'pale' }); T.slope(33, 44, 27, 30, H_CLO, 1.5, 'x', { look: 'pale' });
    T.flat(-27, -23, 18, 33, H_YARD, { look: 'basalt' }); T.stairs(-27, -23, 14, 18, H_CLO, H_YARD, 'z', { look: 'basalt' });
    // the Cloister up to the Choir: a stair in the west, a long ramp in the east
    T.stairs(-22, -16, 1, 6, H_CHOIR, H_CLO, 'z', { look: 'pale' });
    T.slope(44, 49, -6, 10, H_CHOIR, H_CLO, 'z', { look: 'earth' });
    // the Choir up to the Spire's Foot: the processional stair before the nave, steps by the cells
    T.stairs(-30, -24, -26, -22, H_FOOT, H_CHOIR, 'z', { look: 'pale' }); T.stairs(16, 22, -26, -22, H_FOOT, H_CHOIR, 'z', { look: 'pale' });
    // the Augury Well: a bowl sunk deep in the Cloister's rock
    T.hill(24, 20, 6, -3.5);
    // the garth's grass sits a step down inside its colonnade
    T.flat(-7, 7, 13, 21, H_CLO - 0.35, { look: 'pale', cap: false });
    // a ladder (pulled up) from the Choir down to the Cloister, one from the rampart down to the Foot
    T.ladder(10, 6.45, Math.PI, H_CLO, H_CHOIR, { raised: true });
    T.ladder(0, -43.55, Math.PI, H_FOOT, H_RAMP, { raised: true });
    this.terrainGroup(w);

    // the ground: pale flagstones, gold-lichened rock and grass between, setts on the processional ways
    const P = (s, x0, x1, z0, z1, o) => w.paint({ x0, x1, z0, z1 }, s, o), C = (s, cx, cz, r, o) => w.paint({ cx, cz, r }, s, o);
    P('cobble', -47, 47, 30, 47, { amount: 0.45, edge: 3 });
    P('cobble', -5, 5, 26, 48, { edge: 0.6 });
    P('grass', -7, 7, 13, 21, { edge: 0.4 });                    // the garth
    P('dirt', 19, 29, 15, 25, { edge: 1.5, amount: 0.8 });       // the well's floor
    for (const [x, z, r] of [[-46, 40, 5], [44, 44, 4], [-40, 2, 4], [-12, 26, 3], [14, 28, 3], [46, -16, 4], [-46, -28, 5], [0, -28, 3], [40, -26, 4], [-14, -46, 3]]) C('grass', x, z, r, { edge: 2.4, amount: 0.8 });
    P('cobble', -30, 30, -3, 2, { amount: 0.8, edge: 1 });      // the Choir's walk
    P('cobble', -30, 30, -27, -22, { amount: 0.7, edge: 1 });
    P('dirt', 14, 38, -42, -24, { edge: 1.4, amount: 0.7 });     // the foundry yard's cinders
    P('cobble', -41, 41, -53, -44, { edge: 0.3 });               // the rampart walk
    for (const b of this.buildings) if (!b.yard && b.kind !== 'tunnel') P('flag', b.x0 + 0.2, b.x1 - 0.2, b.z0 + 0.2, b.z1 - 0.2, { edge: 0.05 });

    // what grows: dark cypresses, gold-leaved trees, briars in the corners
    const F = (o) => w.flora.push(o);
    for (const [x, z, s] of [[-46, 30.5, 1.0], [-10, 43, 0.9], [12, 43, 0.9], [-46, 6.5, 0.8], [46, 14, 0.9], [-4, 24, 1.0], [4, 14, 0.8], [-46, -23, 0.9], [44, -20, 0.8], [-10, -26, 0.9]]) { F({ kind: 'tree', x, z, s }); F({ kind: 'leaves', x, z, r: 2.6, n: 50 }); }
    for (const [x, z] of [[-14, 44], [32, 44], [-46, 18], [-12, 8], [14, 8], [26, 12], [18, 26], [-46, -4], [22, 0], [-4, -24], [40, -24], [-20, -36], [40, -34]]) F({ kind: 'bush', x, z, n: 3 + Math.floor(vh(x, z) * 3) });
    F({ kind: 'leaves', x: 24, z: 20, r: 4, n: 90 });

    // walls you can't cross: the parapets on each tier's lip (gaps for its stairs and ramps), the garth's colonnade
    // (columns: walk between them), the foundry yard's wall, the rampart's merlons
    const wall = (...a) => this.wallRun(w, ...a);
    for (const [x0, x1] of [[-47, -27], [-23, -5], [5, 29]]) wall(x0, x1, 29.55, 29.9, 0.9, K.paleDk);   // the Cloister over the Yard
    for (const [x0, x1] of [[-47, -23], [-15, 9], [11, 43]]) wall(x0, x1, 5.55, 5.9, 0.9, K.paleDk);              // the Choir over the Cloister
    for (const [x0, x1] of [[-47, -31], [-23, 15], [23, 47]]) wall(x0, x1, -22.45, -22.1, 0.9, K.paleDk);          // the Foot over the Choir
    for (const [x0, x1] of [[-36, -26.5], [-20.5, -1], [1, 20.5], [26.5, 36]]) wall(x0, x1, -44.4, -44.05, 1.1, K.basalt); // the rampart's lip
    wall(30, 44, 29.9, 30.2, 1.0, K.paleDk);                                                                          // between the switchback's legs
    // the colonnade: columns round the garth, an arcade roof over them
    for (let a = -8; a <= 8.01; a += 2.67) for (const [x, z] of [[a, 12], [a, 22], [-8, 12 + (a + 8) * 10 / 16], [8, 12 + (a + 8) * 10 / 16]]) { this.at(w, x, z); w.box(0.55, 3.6, 0.55, K.pale, x, 1.8, z); w.box(0.8, 0.3, 0.8, K.paleDk, x, 0.15, z); w.ob(x, z, 0.4); }
    this.dressHill(w);
  }

  // ---------- the dressing (at ground level: lifted onto the hill after) ----------
  dressHill(w) {
    const M = w.mats, K = this.K;
    // the colonnade's arcade roof (high and thin: it never hides you) and gold capitals
    this.at(w, 0, 17);
    for (const [cx, cz, ww, dd] of [[0, 12, 17, 1.2], [0, 22, 17, 1.2], [-8, 17, 1.2, 11], [8, 17, 1.2, 11]]) { w.box(ww, 0.4, dd, K.slate, cx, 3.8, cz); w.box(ww + 0.1, 0.12, dd + 0.1, K.gold, cx, 3.55, cz); }
    robed(w, 0, 17, 0.6, false); candles(w, -1.2, 18, 5);
    // the Pilgrims' Yard: votive stalls, a pilgrims' cross, lamps, the dead who came too late
    this.at(w, 0, 40);
    w.box(0.5, 4.2, 0.5, K.basalt, 0, 2.1, 41); w.box(2.2, 0.45, 0.45, K.basalt, 0, 3.3, 41); w.box(0.2, 0.6, 0.2, K.gold, 0, 4.5, 41); w.ob(0, 41, 0.6);
    for (const [x, z] of [[-6, 34], [6, 34], [-12, 44], [12, 44], [-20, 32], [36, 34]]) this.lampPost(w, x, z);
    candles(w, -1, 42.5, 8); corpse(w, -4, 38, 1.1); bones(w, 6, 45); crows(w, 3, 38, 4); bloodStain(w, -6, 44, 1.1);
    for (const [x, z, ry] of [[-14, 38, 0], [14, 38, 0]]) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const p = (W, H, D, m, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), m); o.position.set(px, py, pz); g.add(o); }; p(2.4, 0.9, 0.9, K.timber, 0, 0.45, 0); for (const s of [-1, 1]) p(0.1, 2.2, 0.1, K.timber, s * 1.1, 1.1, -0.4); p(2.6, 0.08, 1.2, K.glassRed, 0, 2.2, -0.1); w.add(g); w.solids.push({ x0: x - 1.2, x1: x + 1.2, z0: z - 0.5, z1: z + 0.5 }); candles(w, x, z, 4); }
    // the Augury Well: a ring of seers' chairs round its lip, a violet light rising out of it
    this.at(w, 24, 20);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = 24 + Math.cos(a) * 6.6, z = 20 + Math.sin(a) * 6.6; w.box(0.7, 1.4, 0.7, K.basalt, x, 0.7, z, -a); w.box(0.12, 0.12, 0.12, K.glassViolet, x, 1.5, z); }
    w.lights.push({ x: 24, y: -1.5, z: 20, color: 0xa060ff, power: 10, range: 12, src: {} });
    // the Choir Heights: the nave's plaza, its saints, the cells' garden
    this.at(w, 0, 0);
    for (const x of [-6, 6]) { w.box(1.2, 0.6, 1.2, K.paleDk, x, 0.3, 1); w.box(0.7, 2.4, 0.5, K.pale, x, 1.8, 1); w.box(0.5, 0.5, 0.5, K.pale, x, 3.25, 1); w.ob(x, 1, 0.8); }
    for (const [x, z] of [[-10, -1], [10, -1], [-30, 0], [30, 0], [-40, -6], [40, -6]]) this.lampPost(w, x, z);
    corpse(w, 18, -2, 2); bones(w, -24, -4); robed(w, -18, -6, 2.4, true); crows(w, 20, -20, 3);
    // the Spire's Foot: the Spire itself rising behind the north wall (out of reach, never in the way), the foundry
    // yard's furnace and moulds, a half-cast bell
    const sz = -58;
    this.at(w, 0, -47);
    w.box(9, 34, 9, K.pale, 0, 17, sz); w.box(10, 1.2, 10, K.gold, 0, 11, sz); w.box(6, 6, 6, K.basalt, 0, 37, sz); w.cyl(0.1, 3.4, 9, K.slate, 0, 44.5, sz, 4);
    for (const [dx, dz] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) w.box(1.2, 38, 1.2, K.paleDk, dx, 19, sz + dz);
    for (let k = 0; k < 5; k++) w.box(1.6, 3.2, 0.12, K.glassGold, 0, 16 + k * 4, sz + 4.56);
    this.at(w, 26, -24);
    w.box(3.2, 3.4, 3.2, K.basalt, 38, 1.7, -24); w.box(1.6, 1.2, 0.2, K.fire, 38, 0.9, -22.35); w.cyl(0.8, 1.0, 6, K.basalt, 38, 5, -24, 8); w.solids.push({ x0: 36.4, x1: 39.6, z0: -25.6, z1: -22.4 });
    w.lights.push({ x: 38, y: 1.4, z: -21.5, color: 0xff7a2a, power: 9, range: 9, src: {} });
    w.cyl(1.0, 1.6, 1.8, K.bronze, 14, 0.9, -24, 10); w.ob(14, -24, 1.4);
    for (const [x, z] of [[-14, -24], [12, -24], [-36, -42], [36, -42], [-10, -42], [10, -42]]) this.lampPost(w, x, z);
    // the bell towers' belfries: four posts, a roof, a great bronze bell hanging
    for (const x of [-47, 47]) {
      this.at(w, x, -47);
      for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) w.box(0.6, 3.6, 0.6, K.basalt, x + dx, 1.8, -47 + dz);
      w.box(6.4, 0.5, 6.4, K.slate, x, 3.8, -47); w.cyl(0.1, 3.6, 3, K.slate, x, 5.5, -47, 4); w.cyl(0.9, 1.4, 1.8, K.bronze, x, 2.2, -47, 10);
      w.ob(x, -47, 1.2);
    }
    // merlons along the rampart's outer edge
    this.at(w, 0, -50);
    for (let x = -40; x <= 40; x += 2) w.box(1.0, 1.0, 0.5, K.basalt, x, 0.5, -49.6);
  }

  // the edge: the hill's pale cliffs and fortress walls
  rim(w) {
    const K = this.K, E = 48.9;
    for (let a = -47.5; a <= 47.5; a += 4.8) {
      for (const [x, z, alongX] of [[a, -E, true], [-E, a, false], [E, a, false], [a, E, true]]) {
        if (alongX && z > 0 && Math.abs(a) < 7) continue; // (the gate)
        this.at(w, Math.max(-47.5, Math.min(47.5, x)), Math.max(-47.5, Math.min(47.5, z)));
        const south = alongX && z > 0, h = south ? 1.6 + vh(x, z) * 0.8 : 5 + vh(x, z) * 6, ww = 5.0;
        w.box(alongX ? ww : 3, h, alongX ? 3 : ww, vh(x, z, 2) < 0.6 ? K.pale : K.paleDk, x, h / 2, z);
        if (!south) w.box(alongX ? ww + 0.2 : 3.2, 0.4, alongX ? 3.2 : ww + 0.2, K.basalt, x, h, z);
        w.solids.push(alongX ? { x0: x - ww / 2, x1: x + ww / 2, z0: z - 1.5, z1: z + 1.5 } : { x0: x - 1.5, x1: x + 1.5, z0: z - ww / 2, z1: z + ww / 2 });
      }
    }
    this.at(w, 0, 47.5);
    for (const s of [-1, 1]) { w.box(1.4, 5, 1.4, K.pale, s * 7, 2.5, 48.6); w.cyl(0.1, 0.9, 1.6, K.slate, s * 7, 5.8, 48.6, 4); }
  }

  // ---------- the buildings ----------
  buildingMats(w, b) {
    const K = this.K;
    return {
      nave: { wall: K.pale, trim: K.gold }, foundry: { wall: K.basalt, trim: K.bronze }, augury: { wall: K.basalt, trim: K.gold },
      chapelet: { wall: K.pale, trim: K.paleDk }, scriptorium: { wall: K.paleDk, trim: K.timber }, reliquary: { wall: K.pale, trim: K.gold },
      hostel: { wall: K.paleDk, trim: K.timber }, cells: { wall: K.pale, trim: K.basalt }, ossuary: { wall: K.paleDk, trim: K.bone }, tunnel: { wall: K.basalt, trim: K.basalt },
    }[b.kind] || { wall: K.pale, trim: K.paleDk };
  }
  windowMat(w, b, lit) { const K = this.K; return b.kind === 'tunnel' ? K.basalt : b.kind === 'augury' ? K.glassViolet : b.kind === 'nave' || b.kind === 'chapelet' ? (vh(b.cx, b.cz) < 0.5 ? K.glassRed : K.glassGold) : lit ? K.glassGold : w.mats.logDark; }
  decorateBuilding(w, b, segs) {
    const K = this.K;
    for (const s of segs) {
      if (!s.outer) continue;
      const out = s.outer === 's' || s.outer === 'e' ? 1 : -1, face = s.line + out * 0.29;
      const put = (a0, a1, y0, y1, mat, d = 0.1) => { const len = a1 - a0, hh = y1 - y0, mid = (a0 + a1) / 2; if (len <= 0.02 || hh <= 0.02) return; this.into(w, b.tall, () => (s.alongX ? w.box(len, hh, d, mat, mid, y0 + hh / 2, face) : w.box(d, hh, len, mat, face, y0 + hh / 2, mid))); };
      if (b.kind === 'tunnel') { if (s.door) { put(s.a0 - 0.7, s.a0, 0, 3.4, K.paleDk, 0.5); put(s.a1, s.a1 + 0.7, 0, 3.4, K.paleDk, 0.5); put(s.a0 - 0.7, s.a1 + 0.7, 2.7, 3.4, K.pale, 0.55); } continue; }
      if (s.door) { if (b.kind !== 'ossuary') put(s.a0 - 0.3, s.a1 + 0.3, 2.7, 3.3, K.gold, 0.14); continue; }
      put(s.a0, s.a1, 0, 0.7, K.basalt, 0.14); // a basalt plinth all round
      if (b.kind === 'nave' || b.kind === 'chapelet' || b.kind === 'foundry') for (let a = s.a0 + 0.4; a < s.a1; a += 3.2) put(a - 0.4, a + 0.4, 0, b.h * 0.85, b.kind === 'foundry' ? K.basalt : K.paleDk, 0.7); // buttresses
      if (b.kind === 'ossuary') for (let a = s.a0 + 0.5; a < s.a1 - 0.5; a += 0.6) put(a, a + 0.35, 1 + vh(a, 1) * 0.5, 1.3 + vh(a, 1) * 0.5, K.bone, 0.12); // skulls in the wall
      if (b.kind === 'nave') put(s.a0, s.a1, b.h - 0.6, b.h - 0.3, K.gold, 0.16);
    }
  }
  // the roofs: steep slate with gold finials, the nave's tower, the foundry's stacks, the augury's dome, a reliquary's
  // spire, a scriptorium's dormers, a tunnel's rock
  roofDetail(w, b, W, D) {
    const K = this.K, y = b.h + 0.3, cx = b.cx, cz = b.cz;
    if (b.kind === 'tunnel') { w.box(W + 0.6, 0.6, D + 0.4, K.basalt, cx, y, cz); return; }
    if (b.kind === 'augury') { const r = Math.min(W, D) * 0.45; const dome = w.cyl(r * 0.2, r, r * 0.8, K.lead, cx, y + r * 0.4, cz, 10); w.cyl(0.6, 0.6, 0.4, K.glassViolet, cx, y + r * 0.85, cz, 8); return dome; }
    if (b.kind === 'foundry') { for (const t of [0.25, 0.75]) { w.cyl(0.9, 1.2, 8, K.basalt, b.x0 + W * t, y + 4, b.z0 + 2.5, 8); w.cyl(1.0, 1.0, 0.4, K.fire, b.x0 + W * t, y + 8.1, b.z0 + 2.5, 8); } return; }
    // a steep slate roof (ridge along the longer side), gold finials at its ends
    const alongX = W >= D, span = (alongX ? D : W) + 0.6, len = (alongX ? W : D) + 0.6, pitch = b.kind === 'cells' || b.kind === 'hostel' ? 0.6 : 0.95;
    const rise = Math.tan(pitch) * span / 2, slab = (span / 2) / Math.cos(pitch);
    for (const side of [-1, 1]) { const off = side * span / 4; const m = w.box(alongX ? len : slab, 0.2, alongX ? slab : len, K.slate, cx + (alongX ? 0 : off), y + rise / 2, cz + (alongX ? off : 0)); m.rotation[alongX ? 'x' : 'z'] = (alongX ? side : -side) * pitch; }
    w.box(alongX ? len : 0.25, 0.25, alongX ? 0.25 : len, K.gold, cx, y + rise + 0.05, cz);
    for (const e of [-1, 1]) {
      for (let k = 0; k < 4; k++) { const f = 1 - k / 4, gw = span * f * 0.96, gy = y + rise * (k + 0.5) / 4, ge = e * (len / 2 - 0.35); w.box(alongX ? 0.2 : gw, rise / 4, alongX ? gw : 0.2, K.pale, cx + (alongX ? ge : 0), gy, cz + (alongX ? 0 : ge)); }
      w.box(0.3, 1.2, 0.3, K.gold, cx + (alongX ? e * len / 2 : 0), y + rise + 0.6, cz + (alongX ? 0 : e * len / 2));
    }
    if (b.kind === 'nave') { w.box(4, 9, 4, K.pale, b.x1 - 3, y + rise + 2, b.z1 - 3); w.cyl(0.1, 3, 6, K.slate, b.x1 - 3, y + rise + 9.5, b.z1 - 3, 4); w.box(0.3, 1.6, 0.3, K.gold, b.x1 - 3, y + rise + 13, b.z1 - 3); }
    if (b.kind === 'reliquary') w.cyl(0.1, 2.4, 5, K.slate, cx, y + rise + 2.5, cz, 4);
    if (b.kind === 'scriptorium') for (let a = -len / 2 + 2; a < len / 2 - 1; a += 3.5) w.box(alongX ? 1.2 : 1.6, 1.2, alongX ? 1.6 : 1.2, K.paleDk, cx + (alongX ? a : span * 0.2), y + rise * 0.45, cz + (alongX ? span * 0.2 : a));
  }
  furnish(w, b) {
    super.furnish(w, b);
    const K = this.K, M = w.mats, { spot } = this.freeIn(w, b), r = w.rand;
    this.at(w, b.cx, b.cz);
    if (b.kind === 'tunnel') { for (let z = b.z0 + 4; z < b.z1 - 1; z += 3) for (const x of [b.x0 + 0.45, b.x1 - 0.45]) { w.box(0.3, 0.9, 1.4, K.bone, x, 1.1, z); } for (const z of [b.z0 + 5, b.z1 - 3]) w.torch(b.x0 + 1, z, 0xffa040); return; }
    if (b.kind === 'nave') { for (let x = b.x0 + 3; x < b.x1 - 2; x += 4) for (const z of [b.z0 + 3, b.z1 - 3]) if (Math.abs(x - b.cx) > 2.5) w.pillar(x, z, 9, vh(x, z) < 0.2); for (let k = 0; k < 6; k++) { const p = spot(1.4); if (p) { w.box(2.4, 0.5, 0.6, K.timber, p.x, 0.5, p.z); w.ob(p.x, p.z, 1.0); } } candles(w, b.cx, b.z0 + 1.6, 9); return; }
    if (b.kind === 'scriptorium') for (let k = 0; k < 5; k++) { const p = spot(1.2); if (p) { const ry = r() < 0.5 ? 0 : Math.PI / 2; w.box(2.2, 2.2, 0.5, K.timber, p.x, 1.1, p.z, ry); w.box(2.0, 0.3, 0.45, M.cloth, p.x, 1.4, p.z, ry); w.ob(p.x, p.z, 1.1); } }
    if (b.kind === 'foundry') { for (let k = 0; k < 3; k++) { const p = spot(1.6); if (p) { w.cyl(0.9, 1.2, 1.6, K.bronze, p.x, 0.8, p.z, 10); w.ob(p.x, p.z, 1.2); } } }
    if (b.kind === 'cells') for (let k = 0; k < 4; k++) { const p = spot(1.0); if (p) { w.box(0.9, 0.4, 1.9, K.timber, p.x, 0.2, p.z); w.box(0.4, 0.6, 0.4, K.timber, p.x + 0.9, 0.3, p.z); } }
  }

  // augurs at the bell towers' tops, watching the Foot (beyond what city.js placed)
  populate(w) {
    super.populate(w);
    if (this.area.mix?.augur) for (const [x, z] of [[-46, -45], [46, -45]]) { this.at(w, x, z); w.spawn('augur', x, z, 0, { look: this.area.look }); }
  }
}
City.MAPS.spire = Hill;
