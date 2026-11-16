// The Sump Lines (regions.js r1a2), rebuilt as the Drained Cut: the ward's old transit line ran north through a deep
// open cutting; it's been pumped dry and lies open to the sky, grey daylight on weeds and rust. 95 m across, laid by
// hand (a Ward: ward.js) on four heights:
//   - the Marshalling Yard (0 m) at the crusade's gate: Station Ninefold (a boss site), shanties, the signal box;
//   - the Cut (-3 m) running north through the middle: a long ramp down into it from the yard, gravel and weeds, two
//     derailed carriages you can climb onto, two tunnels through embankment spurs (roofed: dark inside) and the
//     Basin at its north end, where the cut widens;
//   - the Embankments (2.5 m) either side: the Pump Cathedral (a boss site) and the allotments in the west, the
//     turntable pit, the Sluice Works (a boss site) and workshops in the east; stairs up from the yard;
//   - and up high: the old elevated line (5 m) along the east embankment, and two Pump Towers (9.5 m) climbed by
//     stairs wrapped round them, with torchers watching from the top.
// Ladders (pulled up) from the Cut to both embankments. No water to wade, no rails to trip on.
import * as THREE from 'three';
import { City, GRID } from './city.js';
import { Ward } from './ward.js';
import { wallTex } from './ground.js';
import { candles, bones, corpse, sacks, crows, bloodStain } from './decor.js';
import { SUMP } from './sump.js';

const { vh } = GRID;
const H_YARD = 0, H_BANK = 2.5, H_CUT = -3, H_LINE = 5, H_TOWER = 9.5;

export const CUT = {
  ...SUMP, // (its shrines, arena and basement names)
  seed: 0xc0717,
  boss: ['station', 'cathedral', 'sluice'], vaults: ['s1', 'w1', 'e1'], squares: ['allot', 'turntable', 'cutmid', 'basin'],
  buildings: [
    // the Marshalling Yard
    { key: 'station', kind: 'station', x0: 14, x1: 44, z0: 33, z1: 45, doors: [['n', 0.25, 3.2], ['n', 0.75, 3.2], ['w', 0.5]], h: 7, part: { axis: 'z', at: 29, t: 0.5, w: 3 } },
    { key: 's1', kind: 'shanty', x0: -44, x1: -36, z0: 34, z1: 42, doors: [['e', 0.5], ['n', 0.6]], h: 3.2 },
    { key: 's2', kind: 'shanty', x0: -30, x1: -22, z0: 38, z1: 45, doors: [['n', 0.4], ['e', 0.5]], h: 3.0, ruin: true },
    { key: 'signal', kind: 'signal', x0: -16, x1: -11, z0: 30, z1: 35, doors: [['e', 0.5]], h: 7.5 },
    // the west embankment
    { key: 'cathedral', kind: 'pumphall', x0: -46, x1: -26, z0: -2, z1: 16, doors: [['e', 0.5, 3.2], ['s', 0.5, 3.2]], h: 9 },
    { key: 'w1', kind: 'shed', x0: -22, x1: -12, z0: 7, z1: 17, doors: [['s', 0.5], ['n', 0.5]], h: 4.5 },
    { key: 'w2', kind: 'shanty', x0: -46, x1: -38, z0: -46, z1: -37, doors: [['e', 0.5], ['s', 0.5]], h: 3.2, ruin: true },
    { key: 'w3', kind: 'shed', x0: -26, x1: -14, z0: -47, z1: -38, doors: [['s', 0.4], ['e', 0.5]], h: 4.2 },
    // the east embankment
    { key: 'sluice', kind: 'sluice', x0: 20, x1: 44, z0: -48, z1: -35, doors: [['s', 0.3, 3.2], ['w', 0.5]], h: 7, part: { axis: 'z', at: 32, t: 0.5, w: 3 } },
    { key: 'e1', kind: 'shed', x0: 18, x1: 28, z0: -28, z1: -18, doors: [['s', 0.5], ['w', 0.5]], h: 4.2 },
    { key: 'e2', kind: 'shanty', x0: 38, x1: 46, z0: -26, z1: -16, doors: [['w', 0.5], ['s', 0.5]], h: 3.2, ruin: true },
    { key: 'e3', kind: 'shanty', x0: 36, x1: 45, z0: 6, z1: 14, doors: [['w', 0.5], ['s', 0.4]], h: 3.2 },
    // the tunnels: the Cut's floor going on under the embankment spurs (roofed, dark inside)
    { key: 't1', kind: 'tunnel', x0: -5, x1: 5, z0: -14, z1: -4, doors: [['n', 0.5, 7], ['s', 0.5, 7]], h: 5.4 },
    { key: 't2', kind: 'tunnel', x0: -5, x1: 5, z0: -40, z1: -30, doors: [['n', 0.5, 7], ['s', 0.5, 7]], h: 5.4 },
  ],
  squareAt: { allot: [-24, -12, -10, 0], turntable: [19, 31, 5, 17], cutmid: [-3, 7, -28, -18], basin: [-12, 12, -52, -44] },
};

export class Cut extends Ward {
  static PLAN = CUT;
  get look() { return 'sump'; }
  get ground() { return 'cut'; }
  get groundUnder() { return 'cutUnder'; }
  // a sickly green light over the Cut, a little dim: the sky through the pumps' haze
  get sky() { return { hemi: 1.9, sun: 1.15, hemiColor: 0x86b494, sunColor: 0xb8e6a8, fog: 0x14231a }; }

  streets() {
    return [[-4, 4, 30, 46], [-30, -16, 26, 31], [24, 40, 26, 32], [-6, 6, -2, 12], [-6, 6, -28, -16], [-36, -14, -16, -12], [16, 34, -14, -10], [-6, 6, -44, -41]]
      .map(([x0, x1, z0, z1]) => ({ x0, x1, z0, z1, alongX: x1 - x0 > z1 - z0 }));
  }

  build(w) {
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    this.K = {
      concrete: lam(0x7a7872), concreteDk: lam(0x55534e), rust: lam(0x6a4028), rustDk: lam(0x4a2c1c), tin: lam(0x6e6a62), tinDk: lam(0x4e4a44),
      tile: lam(0x5a7262), tileDk: lam(0x3e5246), brick: lam(0x6a4436), iron: lam(0x3a3c40), glass: lam(0x000000, { emissive: 0x5a7a72 }),
      lamp: lam(0x000000, { emissive: 0xffc860 }), green: lam(0x000000, { emissive: 0x7aff9a }), rock: lam(0x5a5650), rockDk: lam(0x3e3b37), paint: lam(0x8a7a2a),
    };
    for (const [k, kind, sc] of [['concrete', 'plaster'], ['concreteDk', 'plaster'], ['rust', 'metal', 1.2], ['rustDk', 'metal', 1.2], ['tin', 'metal', 1.2], ['tinDk', 'metal', 1.2], ['tile', 'stone', 1], ['tileDk', 'stone', 1], ['brick', 'brick'], ['iron', 'metal', 1.2], ['rock', 'rock'], ['rockDk', 'rock']]) wallTex(this.K[k], kind, sc);
    super.build(w);
  }

  // in place of the maze's walls: the cutting, its banks, the line, the towers; paint, plants, walls and dressing
  laneWalls(w) {
    const T = w.terrain, K = this.K;
    this.at(w, 0, 0);
    T.flat(-53, 53, 26, 53, H_YARD);
    T.flat(-53, -8, -53, 26, H_BANK, { look: 'stone', ivy: 0.3 });
    T.flat(8, 53, -53, 26, H_BANK, { look: 'stone', ivy: 0.3 });
    T.flat(-8, 8, -53, 26, H_CUT, { look: 'stone', ivy: 0.45 });
    T.slope(-7, 7, 14, 26, H_CUT, H_YARD, 'z', { look: 'stone' });          // the ramp down from the yard
    for (const [x0, x1] of [[-34, -28], [28, 34]]) T.stairs(x0, x1, 26, 30, H_BANK, H_YARD, 'z'); // up to the banks
    T.slope(40, 47, 26, 34, H_BANK, H_YARD, 'z', { look: 'earth' });
    // the spurs over the tunnels, and the tunnels through them
    for (const [z0, z1] of [[-14, -4], [-40, -30]]) { T.flat(-8, 8, z0, z1, H_BANK, { look: 'stone' }); T.flat(-5, 5, z0, z1, H_CUT, { look: 'stone' }); }
    // the Basin: the Cut widening at its north end
    T.flat(-20, 20, -53, -44, H_CUT, { look: 'stone', ivy: 0.5 });
    // two derailed carriages lying in the Cut, a heap of ballast up to each roof
    T.flat(-6.4, -3.6, 3, 12, -1.0, { look: 'iron', cap: false }); T.slope(-6.4, -3.6, 12, 15, -1.0, H_CUT, 'z', { look: 'earth' });
    T.flat(-6.4, -3.6, -27, -18, -1.0, { look: 'iron', cap: false }); T.slope(-6.4, -3.6, -30, -27, H_CUT, -1.0, 'z', { look: 'earth' });
    // the elevated line along the east bank: stairs up at either end
    T.flat(10, 14, -26, 20, H_LINE, { look: 'brick' });
    T.stairs(10, 14, 20, 24, H_LINE, H_BANK, 'z'); T.stairs(10, 14, -30, -26, H_BANK, H_LINE, 'z');
    // the Pump Towers: a core 9.5 m up, two flights wrapped round it (up its side, along its back)
    T.flat(-34, -28, -24, -18, H_TOWER, { look: 'stone' });
    T.stairs(-37, -34, -24, -18, 6.0, H_BANK, 'z'); T.flat(-37, -34, -27, -24, 6.0); T.stairs(-34, -30.5, -27, -24, 6.0, H_TOWER, 'x'); T.flat(-30.5, -28, -27, -24, H_TOWER); // (a landing at the top, onto the core)
    T.flat(28, 34, -6, 0, H_TOWER, { look: 'stone' });
    T.stairs(34, 37, -6, 0, 6.0, H_BANK, 'z'); T.flat(34, 37, -9, -6, 6.0); T.stairs(30.5, 34, -9, -6, H_TOWER, 6.0, 'x'); T.flat(28, 30.5, -9, -6, H_TOWER);
    // the turntable pit: a round dish in the east bank
    T.hill(25, 11, 6.5, -1.4);
    // the shortcuts up out of the Cut (pulled up)
    T.ladder(-7.55, 0, -Math.PI / 2, H_CUT, H_BANK, { raised: true });
    T.ladder(7.55, -24, Math.PI / 2, H_CUT, H_BANK, { raised: true });
    this.terrainGroup(w);

    // the ground: the yard's cinders and setts, gravel and weeds down the Cut, the banks gone to grass and allotments
    const P = (s, x0, x1, z0, z1, o) => w.paint({ x0, x1, z0, z1 }, s, o), C = (s, cx, cz, r, o) => w.paint({ cx, cz, r }, s, o);
    P('cobble', -47, 47, 26, 47, { amount: 0.6, edge: 3 });
    P('cobble', -5, 5, 26, 48, { edge: 0.8 });
    P('dirt', -8, 8, -53, 26, { edge: 0.4 });
    for (const [z, r] of [[18, 3], [6, 4], [-2, 3], [-22, 4], [-47, 7], [-35, 3]]) C('grass', vh(z, 1) * 8 - 4, z, r, { edge: 2, amount: 0.85 });
    P('cobble', -7, 7, 14, 26, { amount: 0.7, edge: 0.6 });
    P('grass', -47, -8, -53, 26, { amount: 0.55, edge: 4 });
    P('grass', 8, 47, -53, 26, { amount: 0.5, edge: 4 });
    P('dirt', -24, -12, -10, 0, { edge: 0.8 });                    // the allotments
    for (let x = -23; x < -12; x += 2.6) P('grass', x, x + 1.2, -9, -1, { edge: 0.2 });
    P('cobble', 10, 14, -30, 24, { edge: 0.3 });                   // the line's deck
    P('flag', 18, 32, 4, 18, { edge: 0.6 });                       // round the turntable
    P('cobble', -46, -12, -16, -12, { amount: 0.8, edge: 1 }); P('cobble', 16, 47, -14, -10, { amount: 0.8, edge: 1 }); // the bank roads
    for (const [x0, x1, z0, z1] of [[-34, -28, -24, -18], [28, 34, -6, 0]]) P('flag', x0, x1, z0, z1, { edge: 0.2 });
    for (const b of this.buildings) if (!b.yard && b.kind !== 'tunnel') P('flag', b.x0 + 0.2, b.x1 - 0.2, b.z0 + 0.2, b.z1 - 0.2, { edge: 0.05 });

    // what grows: birches gone sickly on the banks, briars along the Cut's lip, leaves in the Basin
    const F = (o) => w.flora.push(o);
    for (const [x, z, s, dead] of [[-44, 22, 0.9, false], [-12, -26, 1.0, false], [-44, -28, 0.8, true], [44, 22, 0.8, false], [32, -30, 1.0, false], [16, -46, 0.9, true], [-46, 46, 0.8, true], [44, -2, 0.7, false]]) { F({ kind: 'tree', x, z, s, dead }); if (!dead) F({ kind: 'leaves', x, z, r: 2.6, n: 50 }); }
    for (const [x, z] of [[-10, 22], [10, 18], [-10, -2], [10, 4], [-10, -24], [16, -24], [-10, -46], [36, -10], [-36, -10], [-46, 30], [18, 30], [-6, -50], [8, -50]]) F({ kind: 'bush', x, z, n: 3 + Math.floor(vh(x, z) * 3) });
    F({ kind: 'leaves', x: 0, z: -48, r: 6, n: 120 });
    for (const [x, z, r] of [[-3, 0, 1.0], [4, -26, 0.9], [-2, -48, 1.4], [6, -50, 0.8], [-20, 40, 0.8], [30, 28, 0.7], [-30, -12, 0.6]]) F({ kind: 'puddle', x, z, r });

    // walls you can't cross: railings on the banks' lips over the Cut (gaps: the ladders, the ramp's ends), the
    // towers' and the line's parapets, the allotments' fence
    const wall = (...a) => this.wallRun(w, ...a);
    for (const [z0, z1] of [[-53, -41], [-29, -15], [-3, 1], [3, 14]]) { wall(-8.9, -8.5, z0, z1, 1.0, K.iron); wall(8.5, 8.9, z0, z1, 1.0, K.iron); }
    for (const [z0, z1] of [[-41, -29], [-15, -3]]) { wall(-8.9, -8.5, z0, z1, 0.9, K.concreteDk); wall(8.5, 8.9, z0, z1, 0.9, K.concreteDk); } // (round the spurs)
    wall(14.1, 14.5, -26, 20, 1.0, K.iron);                                          // the line's outer rail
    for (const [x0, x1, z0, z1] of [[-34, -28, -18.4, -18], [-28.4, -28, -24, -18], [28, 34, -0.4, 0], [28, 28.4, -6, 0]]) wall(x0, x1, z0, z1, 1.0, K.rust); // tower tops
    for (const [x0, x1, z0, z1] of [[-24, -12, 0.2, 0.6], [-24, -23.6, -10, 0]]) wall(x0, x1, z0, z1, 1.1, K.rustDk);

    this.dressCut(w);
  }

  // ---------- the dressing (at ground level: lifted onto the heights after) ----------
  dressCut(w) {
    const M = w.mats, K = this.K;
    // the carriages' bodies over their terrain: riveted sides, a row of black windows, roof vents
    for (const [z0, z1] of [[3, 12], [-27, -18]]) {
      this.at(w, -5, (z0 + z1) / 2);
      const L = z1 - z0, cz = (z0 + z1) / 2, x = -5;
      for (const s of [-1, 1]) {
        w.box(0.12, 2.0, L, K.rust, x + s * 1.34, -1.0, cz); // (heights from the roof: everything's lifted by the ground under it)
        for (let a = z0 + 0.8; a < z1 - 0.8; a += 1.6) w.box(0.14, 0.7, 1.0, M.logDark, x + s * 1.36, -0.5, a);
      }
      for (const e of [z0 + 0.05, z1 - 0.05]) w.box(2.8, 2.0, 0.12, K.rustDk, x, -1.0, e);
      w.box(2.8, 0.1, L - 0.1, K.tinDk, x, 0.05, cz); // the roof plate
      for (let a = z0 + 1.5; a < z1 - 1; a += 3) w.box(0.8, 0.3, 0.8, K.iron, x, 0.25, a);
      w.box(0.5, 0.5, 0.5, K.rustDk, x + 2.6, 0.25, cz); // a wheel set lying beside it
    }
    // the line: a derailed tram half off the deck, signal posts, arches drawn along its faces
    this.at(w, 12, -5);
    w.box(2.6, 2.2, 7, K.tinDk, 12, 1.1, -6, 0.12); w.solids.push({ x0: 10.6, x1: 13.4, z0: -9.6, z1: -2.4 });
    for (let a = -8; a <= -4; a += 2) w.box(2.62, 0.6, 1.2, K.glass, 12, 1.6, a);
    for (const z of [16, 2, -12, -24]) { w.box(0.12, 2.4, 0.12, K.iron, 13.7, 1.2, z); w.box(0.3, 0.5, 0.2, z % 4 ? K.green : K.lamp, 13.7, 2.3, z + 0.15); }
    for (let z = -24; z < 18; z += 4) w.box(0.1, 1.6, 2.2, K.concreteDk, 9.96, 0.9, z + 2); // (the arches' dark mouths: on the west face, toward the Cut)
    // the yard: buffers, a water crane, crates, lamps, the dead
    this.at(w, 0, 36);
    for (const [x, z] of [[-6, 31], [6, 31], [-20, 44], [20, 28], [-36, 28], [36, 30]]) this.lampPost(w, x, z);
    for (const x of [-46, 46]) { w.box(1.8, 1.2, 1.0, K.rust, x, 0.6, 30); w.box(0.4, 0.4, 0.6, K.paint, x - 0.5, 0.9, 29.3); w.box(0.4, 0.4, 0.6, K.paint, x + 0.5, 0.9, 29.3); w.ob(x, 30, 1.0); }
    w.box(0.4, 4.5, 0.4, K.iron, -8, 2.25, 40); w.box(2.6, 0.3, 0.3, K.iron, -6.8, 4.4, 40); w.box(0.3, 1.2, 0.3, K.iron, -5.6, 3.8, 40); w.ob(-8, 40, 0.5); // the water crane
    corpse(w, 3, 36, 0.4); bones(w, -4, 44); sacks(w, 12, 30); crows(w, -2, 34, 4); bloodStain(w, 8, 40, 1.2);
    for (const [x, z] of [[-18, 42], [-17, 43], [30, 30], [40, 31]]) w.crate(x, z);
    // the banks: allotment frames, a scarecrow of rags, a pump trough, more lamps
    this.at(w, -18, -5);
    for (let x = -22.5; x < -12; x += 2.6) { w.box(0.08, 1.0, 0.08, M.log, x, 0.5, -9.5); w.box(0.08, 1.0, 0.08, M.log, x, 0.5, -0.5); }
    w.box(0.1, 2.0, 0.1, M.log, -16, 1.0, -6); w.box(1.4, 0.1, 0.1, M.log, -16, 1.6, -6); w.box(0.6, 0.9, 0.3, M.cloth, -16, 1.3, -6); w.ob(-16, -6, 0.4);
    for (const [x, z] of [[-14, -14], [-40, -14], [18, -12], [40, -12], [-10, 24], [16, 20], [-24, -30], [30, -32]]) this.lampPost(w, x, z);
    candles(w, 25, 11, 6); crows(w, 40, -20, 3); bones(w, -30, -30); corpse(w, 26, -12, 2.2);
    // the turntable: its rim ring and the bridge across it
    this.at(w, 25, 11);
    for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; w.box(1.9, 0.25, 0.5, K.concreteDk, 25 + Math.cos(a) * 6.3, 0.12, 11 + Math.sin(a) * 6.3, -a); }
    // the Basin: a drowned pump's housing, heaped silt, a dead lamp
    this.at(w, 0, -48);
    w.box(3.2, 2.2, 2.4, K.rust, 13, 1.1, -50); w.solids.push({ x0: 11.4, x1: 14.6, z0: -51.2, z1: -48.8 });
    for (const [x, z] of [[-16, -50], [-12, -46], [16, -45]]) w.rock(x, z, 0.8 + vh(x, z) * 0.6, true);
  }

  // the edge: grey rock walls with the old cutting's retaining arches, bulkheads, tin fences on the yard
  rim(w) {
    const K = this.K, E = 48.9;
    for (let a = -47.5; a <= 47.5; a += 4.8) {
      for (const [x, z, alongX] of [[a, -E, true], [-E, a, false], [E, a, false], [a, E, true]]) {
        if (alongX && z > 0 && Math.abs(a) < 7) continue; // (the gate)
        this.at(w, Math.max(-47.5, Math.min(47.5, x)), Math.max(-47.5, Math.min(47.5, z)));
        const south = alongX && z > 0, h = south ? 2.2 : 6 + vh(x, z) * 5, ww = 5.0;
        w.box(alongX ? ww : 3, h, alongX ? 3 : ww, south ? K.tinDk : vh(x, z, 2) < 0.6 ? K.rock : K.rockDk, x, h / 2, z);
        if (!south && vh(x, z, 4) < 0.2) w.box(alongX ? 2.4 : 3.1, 2.8, alongX ? 3.1 : 2.4, K.iron, x, 1.4, z); // a bulkhead
        w.solids.push(alongX ? { x0: x - ww / 2, x1: x + ww / 2, z0: z - 1.5, z1: z + 1.5 } : { x0: x - 1.5, x1: x + 1.5, z0: z - ww / 2, z1: z + ww / 2 });
      }
    }
    this.at(w, 0, 47.5);
    for (const s of [-1, 1]) { w.box(1.0, 3.6, 1.0, K.rust, s * 7, 1.8, 48.6); w.box(0.3, 0.3, 0.3, K.lamp, s * 7, 3.75, 48.6); }
  }

  // ---------- the buildings ----------
  buildingMats(w, b) {
    const K = this.K;
    return {
      station: { wall: K.brick, trim: K.tileDk }, pumphall: { wall: K.concrete, trim: K.rust }, sluice: { wall: K.concreteDk, trim: K.iron },
      shed: { wall: K.brick, trim: K.concreteDk }, shanty: { wall: vh(b.cx, b.cz) < 0.5 ? K.tin : K.rust, trim: K.rustDk }, signal: { wall: K.tile, trim: K.iron },
      tunnel: { wall: K.rock, trim: K.rockDk },
    }[b.kind] || { wall: K.concrete, trim: K.iron };
  }
  windowMat(w, b, lit) { const K = this.K; return b.kind === 'tunnel' ? K.rock : b.kind === 'signal' ? K.glass : lit ? K.lamp : w.mats.logDark; }
  // their own trimmings: tile bands on the station, buttresses on the pump hall, a shanty's patchwork, a tunnel's portal
  decorateBuilding(w, b, segs, wall, trim) {
    const K = this.K;
    for (const s of segs) {
      if (!s.outer) continue;
      const out = s.outer === 's' || s.outer === 'e' ? 1 : -1, face = s.line + out * 0.29;
      const put = (a0, a1, y0, y1, mat, d = 0.08) => { const len = a1 - a0, hh = y1 - y0, mid = (a0 + a1) / 2; if (len <= 0.02 || hh <= 0.02) return; this.into(w, b.tall, () => (s.alongX ? w.box(len, hh, d, mat, mid, y0 + hh / 2, face) : w.box(d, hh, len, mat, face, y0 + hh / 2, mid))); };
      if (b.kind === 'tunnel') { if (s.door) { put(s.a0 - 0.6, s.a0, 0, b.h, K.rockDk, 0.4); put(s.a1, s.a1 + 0.6, 0, b.h, K.rockDk, 0.4); put(s.a0 - 0.6, s.a1 + 0.6, 3.6, 4.4, K.concreteDk, 0.45); } continue; }
      if (s.door) continue;
      if (b.kind === 'station') { put(s.a0, s.a1, 0, 1.1, K.tile, 0.1); put(s.a0, s.a1, 4.2, 4.5, K.tile, 0.12); }
      if (b.kind === 'pumphall') for (let a = s.a0 + 0.5; a < s.a1; a += 4) put(a - 0.35, a + 0.35, 0, b.h * 0.9, K.concreteDk, 0.5);
      if (b.kind === 'shanty') for (let a = s.a0; a < s.a1 - 0.3; a += 1.1) if (vh(a, s.line, 3) < 0.4) put(a, a + 1.0, 0.3, b.h - 0.4, vh(a, 1) < 0.5 ? K.tinDk : K.rust, 0.05);
      if (b.kind === 'shed') put(s.a0, s.a1, 0, 0.9, K.concreteDk, 0.1);
      if (b.kind === 'sluice') for (let a = s.a0 + 1; a < s.a1; a += 3) put(a - 0.15, a + 0.15, 0, b.h, K.rust, 0.18);
    }
  }
  // the roofs: a station's glazed canopy and clock, the pump hall's great drum and dome, the sluice's gate frames,
  // sawtooth workshop roofs, a shanty's tin lean-to, the signal box's hat, a tunnel's earth over it
  roofDetail(w, b, W, D) {
    const K = this.K, y = b.h + 0.3, cx = b.cx, cz = b.cz;
    if (b.kind === 'tunnel') { w.box(W + 0.6, 0.6, D + 0.4, K.rockDk, cx, y, cz); return; }
    if (b.kind === 'station') {
      for (let x = b.x0 + 2; x < b.x1 - 1; x += 3) w.box(2.6, 0.2, D * 0.9, K.glass, x, y + 0.6, cz);
      w.box(2.4, 4, 2.4, K.brick, b.x0 + 4, y + 2, cz); w.box(1.6, 1.6, 0.1, K.lamp, b.x0 + 4, y + 3, b.z0 + 2.75);
      // the platform canopy over its north face
      for (let x = b.x0 + 1; x < b.x1; x += 3.5) w.box(0.15, 3.4, 0.15, K.iron, x, 1.7, b.z0 - 2.6);
      w.box(W, 0.15, 3.2, K.tinDk, cx, 3.5, b.z0 - 1.5);
      return;
    }
    if (b.kind === 'pumphall') {
      const r = Math.min(W, D) * 0.32;
      w.cyl(r, r, 3.2, K.concrete, cx, y + 1.6, cz, 12); w.cyl(r * 0.85, r, 1.2, K.rust, cx, y + 3.8, cz, 12); w.cyl(0.6, 0.6, 2.2, K.iron, cx, y + 5.4, cz, 8);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) w.cyl(0.4, 0.5, 5, K.rustDk, cx + dx * W * 0.38, y + 2.5, cz + dz * D * 0.38, 7);
      return;
    }
    if (b.kind === 'sluice') {
      for (const x of [b.x0 + 5, b.x1 - 5]) { for (const s of [-1, 1]) w.box(0.4, 5, 0.4, K.iron, x + s * 2, y + 2.5, cz); w.box(4.6, 0.5, 0.5, K.iron, x, y + 5, cz); w.box(3.4, 2.4, 0.3, K.rust, x, y + 2.4, cz); }
      return;
    }
    if (b.kind === 'shed') {
      for (let x = b.x0; x < b.x1 - 0.5; x += 3.2) { const m = w.box(3.3, 0.15, D + 0.3, K.tinDk, x + 1.6, y + 0.8, cz); m.rotation.z = 0.5; w.box(0.12, 1.3, D + 0.2, K.glass, x + 3.1, y + 0.7, cz); }
      return;
    }
    if (b.kind === 'shanty') { const m = w.box(W + 0.8, 0.12, D + 0.8, vh(cx, cz) < 0.5 ? K.tinDk : K.rust, cx, y + 0.6, cz); m.rotation.x = 0.18; w.cyl(0.12, 0.12, 1.6, K.iron, b.x1 - 1, y + 1.2, b.z0 + 1, 6); return; }
    if (b.kind === 'signal') { const m = w.box(W + 0.8, 0.2, D + 0.8, K.tileDk, cx, y + 0.5, cz); m.rotation.z = 0.25; w.box(0.3, 2.2, 0.3, K.iron, b.x1 + 0.4, y + 0.8, cz); }
  }
  furnish(w, b) {
    super.furnish(w, b);
    const K = this.K, M = w.mats, { spot } = this.freeIn(w, b), r = w.rand;
    this.at(w, b.cx, b.cz);
    if (b.kind === 'tunnel') { for (let k = 0; k < 3; k++) { const p = spot(1.2); if (p) w.rock(p.x, p.z, 0.4 + r() * 0.4, true); } for (const z of [b.z0 + 2, b.z1 - 2]) w.torch(b.x0 + 0.9, z, 0xffb060); return; }
    if (b.kind === 'station') { for (let k = 0; k < 5; k++) { const p = spot(1.2); if (p) { w.box(2.0, 0.45, 0.5, M.logDark, p.x, 0.45, p.z); w.box(2.0, 0.6, 0.1, M.logDark, p.x, 0.75, p.z - 0.25); w.ob(p.x, p.z, 0.9); } } const q = spot(2); if (q) { w.box(2.4, 2.2, 1.6, K.tileDk, q.x, 1.1, q.z); w.box(1.2, 0.5, 0.05, K.lamp, q.x, 1.6, q.z + 0.83); w.solids.push({ x0: q.x - 1.2, x1: q.x + 1.2, z0: q.z - 0.8, z1: q.z + 0.8 }); } return; }
    if (b.kind === 'pumphall') { const p = { x: b.cx, z: b.cz }; if (!w.blocked(p.x, p.z, 2.5) && !(b.stair && Math.hypot(b.stair.x - p.x, b.stair.z - p.z) < 5)) { w.cyl(2.2, 2.4, 3.4, K.rust, p.x, 1.7, p.z, 10); w.cyl(0.4, 0.4, 6, K.iron, p.x, 4.6, p.z, 6); w.box(0.4, 0.4, 0.06, K.lamp, p.x, 1.8, p.z + 2.42); w.solids.push({ x0: p.x - 2.3, x1: p.x + 2.3, z0: p.z - 2.3, z1: p.z + 2.3 }); } return; }
    if (b.kind === 'shed') for (let k = 0; k < 2; k++) { const p = spot(1.4); if (p) { w.box(1.8, 0.9, 0.9, K.iron, p.x, 0.45, p.z); w.box(0.6, 0.5, 0.6, K.rust, p.x + 0.4, 1.15, p.z); w.ob(p.x, p.z, 1.0); } }
  }

  // torchers on the Pump Towers' tops, watching the banks (beyond what city.js placed)
  populate(w) {
    super.populate(w);
    if (this.area.mix?.torcher) for (const [x, z] of [[-31, -21], [31, -3]]) { this.at(w, x, z); w.spawn('torcher', x, z, Math.PI, { look: this.area.look }); }
  }
}
City.MAPS.sump = Cut;
