// Ashfall Ward (regions.js r1a1), the burned ward on the hill: 95 m across, laid by hand on three tiers that climb
// north, away from the camera (terrain.js), with nature taking it back (ground.js, flora.js).
//   - The Lower Ward (0 m): the crusade's gate in the south, a wide market square of flagstones with its collapsed
//     stalls and a dry well, houses either side, the Manufactorum in the south-east (a boss site).
//   - The dry canal (-1.5 m) right across the ward: mud, puddles, reeds; steps down into it at the west, the middle
//     and the east. Two causeway bridges rise over it from the Lower Ward to the Terraces. A pulled-up ladder hangs
//     on its north bank: lowered from the Terraces, it's the short way back up from the canal.
//   - The Terraces (2 m): the Barracks in the west (a boss site), houses along the street, and the Sunken Garden, a
//     square of grass and trees sunk to the ground below, a grassy bank down into it from the south and a 4 m drop
//     into it off the Crest.
//   - The Crest (4 m): the Chapel (a boss site) over its plaza and a broken saint, the overgrown cemetery to the
//     west, houses to the east. A grand stair and the east ramp come up from the Terraces; a pulled-up ladder is the
//     cemetery's short way down.
// It's a City (city.js) with its own plan: the same shrines, chests, drums, enemies, basements and walking grid, the
// blocks and buildings laid free instead of on the maze's grid.
import * as THREE from 'three';
import { City, GRID } from './city.js';
import { candles, bones, corpse, sacks, cart, crows, bloodStain, skullStake } from './decor.js';

const { UNDER, vh, inside } = GRID;
const B0 = 47.5; // the ward's edge (95 m across)
const H_LOW = 0, H_CANAL = -1.5, H_TER = 2.0, H_CREST = 4.0;

// the plan: the three tiers, the buildings (x0, x1, z0, z1; doors on the sides that face open ground) and the squares
export const WARD = {
  seed: 0xa5f4a1,
  boss: ['works', 'barracks', 'chapel'], vaults: ['h1', 'h7', 'h10'], squares: ['market', 'garden', 'plaza', 'cemetery'],
  shrines: { pool: ['elite', 'circle', 'altar'] },
  buildings: [
    // the Lower Ward
    { key: 'h1', x0: -44, x1: -34, z0: 34, z1: 44, doors: [['e', 0.5], ['n', 0.4]], h: 6.8 },
    { key: 'h2', x0: -30, x1: -20, z0: 36, z1: 45, doors: [['n', 0.5], ['e', 0.6]], h: 4.2 },
    { key: 'h3', x0: -44, x1: -34, z0: 17, z1: 27, doors: [['e', 0.5], ['s', 0.6]], ruin: true },
    { key: 'h4', x0: -28, x1: -16, z0: 19, z1: 29, doors: [['e', 0.5], ['n', 0.3]], h: 6.6, part: { axis: 'z', at: -22, t: 0.5 } },
    { key: 'works', kind: 'works', x0: 22, x1: 42, z0: 30, z1: 45, doors: [['w', 0.4], ['n', 0.3], ['s', 0.55]], h: 8, part: { axis: 'x', at: 37.5, t: 0.5, w: 3 } },
    { key: 'h5', x0: 18, x1: 28, z0: 15, z1: 24, doors: [['w', 0.5], ['s', 0.5]], h: 4.2 },
    { key: 'h6', x0: 32, x1: 43, z0: 15, z1: 25, doors: [['w', 0.6], ['s', 0.4]], ruin: true },
    // the Terraces
    { key: 'barracks', kind: 'barracks', x0: -44, x1: -28, z0: -16, z1: -2, doors: [['e', 0.5], ['s', 0.6]], h: 5, part: { axis: 'x', at: -9, t: 0.5, w: 3 } },
    { key: 'h7', x0: -22, x1: -12, z0: -6, z1: 3, doors: [['s', 0.5], ['e', 0.5]], h: 6.6 },
    { key: 'y1', kind: 'yard', x0: -9, x1: -2, z0: -17, z1: -9, doors: [['s', 0.5], ['e', 0.4]] },
    { key: 'h8', x0: 16, x1: 26, z0: -7, z1: 3, doors: [['s', 0.5], ['w', 0.5]], h: 4.2 },
    { key: 'h9', x0: 30, x1: 40, z0: -10, z1: 0, doors: [['s', 0.5], ['w', 0.4]], ruin: true },
    // the Crest
    { key: 'chapel', kind: 'chapel', x0: -8, x1: 14, z0: -44, z1: -31, doors: [['s', 0.35], ['s', 0.65]], h: 9 },
    { key: 'h10', x0: 21, x1: 31, z0: -44, z1: -35, doors: [['s', 0.5], ['w', 0.5]], h: 6.8 },
    { key: 'h11', x0: 34, x1: 44, z0: -42, z1: -33, doors: [['s', 0.4], ['w', 0.6]], ruin: true },
  ],
  squareAt: { market: [-10, 12, 18, 33], garden: [1, 11, -19, -11], plaza: [-6, 12, -29, -21], cemetery: [-38, -24, -40, -28] },
  arena: { name: 'The Penitent Pit' },
};

export class Ward extends City {
  static PLAN = WARD;
  get look() { return 'ward'; }

  // ---------- the plan: blocks and buildings laid free ----------
  plan() {
    const L = this.L;
    this.blocks = []; this.buildings = []; this.walls = []; this.open = new Set();
    for (const D of L.buildings) {
      const kind = D.kind || 'house', yard = kind === 'yard';
      const B = { key: D.key, type: yard ? 'yard' : D.ruin ? 'ruin' : kind, x0: D.x0, x1: D.x1, z0: D.z0, z1: D.z1, cx: (D.x0 + D.x1) / 2, cz: (D.z0 + D.z1) / 2, bld: [] };
      const b = { block: B, kind, x0: D.x0, x1: D.x1, z0: D.z0, z1: D.z1, cx: B.cx, cz: B.cz, h: yard ? 2.4 : D.ruin ? 4.5 + vh(D.x0, D.z0) * 2 : D.h || 4.2, ruin: !!D.ruin, yard, part: D.part || null,
        doors: D.doors.map(([s, t, dw]) => ({ s, t, w: dw || (D.ruin ? 3 : kind === 'works' ? 3.2 : yard ? 2.6 : 2.4) })), shape: D.shape || null };
      if (L.boss.includes(D.key)) b.basement = 'site';
      else if (L.vaults.includes(D.key)) b.basement = 'vault';
      B.bld.push(b); this.blocks.push(B); this.buildings.push(b);
    }
    for (const [key, [x0, x1, z0, z1]] of Object.entries(L.squareAt)) this.blocks.push({ key, type: 'plaza', x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, bld: [] });
  }

  // ---------- what the game asks ----------
  // the ward's ground; below it its own cellars' (tiles, brick, grime), the boss's arena as it was
  styleAt(x, z) { if (x <= UNDER) return this.ground; const s = super.styleAt(x, z); return s === 'under' ? this.groundUnder : s; }
  get ground() { return 'ward'; }
  get groundUnder() { return 'wardUnder'; }
  // floors under a roof: boards (the textures still show through, tinted); everything else is the textures' own
  groundTint(x, z, c, n) {
    if (x > UNDER) return;
    const b = this.buildingAt(x, z);
    if (b && !b.yard) c.setHex(b.kind === 'chapel' ? 0x9a948a : b.kind === 'works' ? 0x6a6a6e : 0x8a7058).multiplyScalar(0.9 + n * 0.1);
  }
  // the lanes the gangs loiter in (city.js populate): the ward's streets
  streets() {
    return [[-4, 4, 36, 46], [-30, -12, 31, 34], [12, 30, 26, 29], [-30, -10, -1, 3], [0, 14, -8, -4], [-20, -6, -29, -22], [14, 34, -30, -24], [26, 44, 4, 12], [-46, -36, 6, 12]]
      .map(([x0, x1, z0, z1]) => ({ x0, x1, z0, z1, alongX: x1 - x0 > z1 - z0 }));
  }

  // ---------- building ----------
  build(w) {
    const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    this.S = { stone: lam(0x6a665e), stoneDk: lam(0x46433e), brick: lam(0x5a4034), plaster: lam(0x8a8070), timber: lam(0x3a2c22), slate: lam(0x34343a), awning: lam(0x5a2a22), awning2: lam(0x4a4a30), iron: lam(0x3a3a3e), grave: lam(0x7a766c) };
    super.build(w);
    this.def.name = this.area.name;
  }

  // in place of the maze's walls (city.js build step 2): the hill, its paint, walls and dressing
  laneWalls(w) {
    const T = w.terrain, S = this.S;
    this.at(w, 0, 0);
    // the tiers (later parts lay over earlier ones), reaching out under the rim
    T.flat(-53, 53, 12, 53, H_LOW);
    T.flat(-53, 53, 6, 12, H_CANAL, { look: 'stone' });
    T.flat(-53, 53, -20, 6, H_TER, { look: 'stone', ivy: 0.4 });
    T.flat(-53, 53, -53, -20, H_CREST, { look: 'brick', ivy: 0.35 });
    // steps down into the canal (west, middle, east) and the two causeway bridges up to the Terraces
    for (const x of [-40, -3, 36]) T.stairs(x, x + (x === -3 ? 6 : 4), 12, 15.5, H_CANAL, H_LOW, 'z');
    for (const [x0, x1] of [[-25, -19], [17, 23]]) T.slope(x0, x1, 6, 12, H_TER, H_LOW, 'z', { look: 'stone' });
    // the Sunken Garden: down to the ground below in the middle of the Terraces, a grassy bank into it from the south
    T.flat(0, 12, -20, -10, H_LOW, { look: 'earth', ivy: 0.6 });
    T.slope(0, 12, -10, -5, H_LOW, H_TER, 'z', { look: 'earth' });
    // up to the Crest: the grand stair west of the plaza, the long ramp in the east
    T.stairs(-14, -8, -25, -20, H_CREST, H_TER, 'z');
    T.slope(38, 46, -32, -16, H_CREST, H_TER, 'z', { look: 'earth' });
    // the shortcuts: a ladder up the canal's north bank, one down from the cemetery to the Terraces (both pulled up)
    T.ladder(-6, 6.45, Math.PI, H_CANAL, H_TER, { raised: true });
    T.ladder(-31, -19.55, Math.PI, H_TER, H_CREST, { raised: true });
    this.terrainGroup(w);

    // the ground (ground.js): cobbled streets, flagstone squares, dirt yards and verges, grass where it's taking over
    const P = (s, x0, x1, z0, z1, o) => w.paint({ x0, x1, z0, z1 }, s, o), C = (s, cx, cz, r, o) => w.paint({ cx, cz, r }, s, o);
    P('cobble', -47, 47, 12, 47, { amount: 0.55, edge: 3 });
    P('cobble', -5, 5, 30, 48, { edge: 0.8 });               // the gate road
    P('cobble', -30, 30, 26, 34, { amount: 0.8, edge: 1.5 }); // the market street
    P('flag', -10, 12, 18, 33, { edge: 0.7 });               // the market
    for (const [x, z, r] of [[-46, 30, 6], [46, 34, 5], [-12, 44, 4], [14, 44, 4.5], [-46, 14, 4], [10, 16, 3]]) C('grass', x, z, r, { edge: 2.2 });
    P('dirt', -47, 47, 6, 12, { edge: 0.3 });                // the canal bed
    for (const [x, r] of [[-30, 5], [-10, 4], [8, 6], [30, 5], [44, 3]]) C('grass', x, 9, r, { edge: 2, amount: 0.8 });
    P('cobble', -47, 47, -2, 4, { amount: 0.85, edge: 1.2 }); // the terrace street
    for (const [x0, x1] of [[-25, -19], [17, 23]]) P('cobble', x0, x1, 4, 12, { edge: 0.4 });
    P('grass', 0, 12, -20, -5, { edge: 1.4 });               // the Sunken Garden
    for (const [x, z, r] of [[-46, -8, 5], [28, -14, 6], [44, -6, 4], [-24, -14, 4], [10, 0, 3]]) C('grass', x, z, r, { edge: 2.4 });
    P('flag', -6, 12, -29, -21, { edge: 0.6 });              // the chapel plaza
    P('flag', -14, -8, -25, -20, { edge: 0.3 });
    P('grass', -47, -16, -47, -23, { edge: 2.5 });           // the cemetery
    P('dirt', -40, -22, -35, -33, { edge: 1.4, amount: 0.7 }); // its path
    P('dirt', 38, 46, -32, -16, { edge: 0.8 });
    for (const [x, z, r] of [[20, -30, 5], [40, -46, 5], [16, -46, 4]]) C('grass', x, z, r, { edge: 2.4 });

    // floors under a roof: flagstones (tinted to boards by groundTint)
    for (const b of this.buildings) if (!b.yard) P('flag', b.x0 + 0.2, b.x1 - 0.2, b.z0 + 0.2, b.z1 - 0.2, { edge: 0.05 });
    for (const b of this.buildings) if (b.yard) P('grass', b.x0, b.x1, b.z0, b.z1, { edge: 1, amount: 0.8 });

    // what grows (flora.js)
    const F = (o) => w.flora.push(o);
    // the cemetery's trees and briars
    for (const [x, z, s, dead] of [[-44, -44, 1.0, false], [-36, -46, 0.8, true], [-20, -42, 1.1, false], [-44, -27, 0.9, true], [-18, -26, 0.8, false]]) { F({ kind: 'tree', x, z, s, dead }); if (!dead) F({ kind: 'leaves', x, z, r: 3, n: 70 }); }
    for (const [x, z] of [[-40, -30], [-26, -45], [-17, -36], [-46, -38], [-30, -24]]) F({ kind: 'bush', x, z, n: 4 + Math.floor(vh(x, z) * 3) });
    // the Sunken Garden: two old trees, briars, leaves everywhere
    F({ kind: 'tree', x: 3, z: -17, s: 1.1 }); F({ kind: 'tree', x: 10, z: -13, s: 0.9 });
    F({ kind: 'leaves', x: 6, z: -15, r: 5, n: 160 });
    for (const [x, z] of [[1.5, -11.5], [11, -19], [5, -19.2]]) F({ kind: 'bush', x, z, n: 4 });
    // round the ward
    for (const [x, z, s, dead] of [[-46, 46, 0.9, true], [45, 13.5, 0.8, false], [-46, 14, 0.7, true], [44, -14, 1.0, false], [-46, -18, 0.9, true], [24, -47, 0.8, false]]) { F({ kind: 'tree', x, z, s, dead }); if (!dead) F({ kind: 'leaves', x, z, r: 2.6, n: 50 }); }
    for (const [x, z] of [[-14, 46], [13, 46], [46, 28], [-46, 22], [28, 8], [-34, 4.5], [8, 4.5], [-46, -4], [46, 0], [30, -20.5], [46, -40], [18, -24]]) F({ kind: 'bush', x, z, n: 3 });
    for (const [x, z, r] of [[-28, 9, 0.9], [4, 10, 1.2], [26, 8.5, 0.8], [40, 9.5, 0.7], [-2, 22, 0.7], [8, 30, 0.6], [-20, 0, 0.6], [30, 2, 0.8], [-12, -24, 0.6]]) F({ kind: 'puddle', x, z, r });

    const wall = (...a) => this.wallRun(w, ...a);
    // the parapet along the Terraces over the canal (gaps: the bridges, the ladder, a couple where it fell)
    for (const [x0, x1] of [[-47, -26], [-18, -10], [-4, 4], [9, 16], [24, 47]]) wall(x0, x1, 5.45, 5.85, 0.9, S.stoneDk);
    // and along the Crest's edge (gaps: the stair, the ladder, the garden's broken overlook, the ramp)
    for (const [x0, x1] of [[-47, -33], [-29, -15], [-7, 0], [12, 37]]) wall(x0, x1, -20.85, -20.45, 0.9, S.stoneDk);
    // the cemetery's low wall, broken through in places
    for (const [x0, x1, z0, z1] of [[-47, -36, -23.6, -23.2], [-32, -16, -23.6, -23.2], [-16.4, -16, -47, -36], [-16.4, -16, -32, -26]]) wall(x0, x1, z0, z1, 1.1, S.stone);
    // garden walls and ruined stubs in the Lower Ward and on the Terraces
    for (const [x0, x1, z0, z1] of [[-30, -20, 30.6, 31], [-16, -16.4, 36, 45], [30, 30.4, 15, 25.5], [-44, -36, 30.6, 31], [28, 38, -12.6, -12.2], [-26, -26.4, -16, -8]]) wall(x0, x1, z0, z1, 1.4, S.brick);

    this.dressWard(w);
  }

  // the terrain laid so far baked, and its faces, steps and ladders built into a group of their own that's always drawn
  // (not culled with a chunk; gone with the map: world.extras)
  terrainGroup(w, from = 0) {
    const T = w.terrain; T.bake();
    const tg = new THREE.Group(); w.root.add(tg); w.extras.push(tg);
    const cur = w.cur; w.cur = { i: cur.i, group: tg }; T.build(w, from); w.mergeStatic(tg); w.cur = cur;
  }
  // a wall you can't cross (a solid city.js keeps), built in uneven 1.2 m stretches h high (at ground level: settle)
  wallRun(w, x0, x1, z0, z1, h, mat) {
    this.at(w, (x0 + x1) / 2, (z0 + z1) / 2);
    w.solids.push({ x0, x1, z0, z1 });
    const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0;
    for (let a = 0; a < len - 0.02; a += 1.2) {
      const e = Math.min(len, a + 1.2), c = (a + e) / 2, hh = h * (0.75 + vh(x0 + a, z0, 3) * 0.35);
      if (alongX) w.box(e - a + 0.02, hh, z1 - z0, mat, x0 + c, hh / 2, (z0 + z1) / 2); else w.box(x1 - x0, hh, e - a + 0.02, mat, (x0 + x1) / 2, hh / 2, z0 + c);
    }
    this.occluders.push({ x0, x1, z0, h });
  }

  // ---------- the ward's dressing (all at ground level: lifted onto the hill after: settle) ----------
  dressWard(w) {
    const M = w.mats, S = this.S, r = w.rand;
    // the market: collapsed stalls under rotten awnings, a dry well in the middle, carts and litter
    this.at(w, 1, 25);
    const stall = (x, z, ry, fallen) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
      const part = (W, H, D, mat, px, py, pz, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mat); m.position.set(px, py, pz); m.rotation.set(rx, 0, rz); g.add(m); };
      for (const [px, pz] of [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]]) part(0.12, 2.2, 0.12, S.timber, px, 1.1, pz, 0, fallen && px > 0 ? 0.5 : 0);
      part(2.8, 0.1, 1.9, fallen ? S.awning2 : S.awning, fallen ? 0.4 : 0, fallen ? 1.6 : 2.25, 0, fallen ? 0.15 : 0.12, fallen ? -0.45 : 0);
      part(2.4, 0.8, 0.6, S.timber, 0, 0.4, 0.4);
      part(0.5, 0.3, 0.4, M.cloth, -0.6, 0.95, 0.4); part(0.4, 0.25, 0.4, M.rust, 0.5, 0.92, 0.35);
      w.add(g); w.solids.push({ x0: x - 1.3, x1: x + 1.3, z0: z - 0.9, z1: z + 0.9 });
    };
    for (const [x, z, ry, f] of [[-6.5, 20.5, 0, false], [-6.5, 30.5, 0, true], [8.5, 20.5, 0, true], [8.5, 30.5, 0, false]]) stall(x, z, ry, f);
    // the dry well: a stone ring, its winch and a bucket on the cobbles
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; w.box(0.7, 0.8, 0.35, S.stone, 1 + Math.cos(a) * 1.1, 0.4, 25.5 + Math.sin(a) * 1.1, -a); }
    for (const s of [-1, 1]) w.box(0.14, 2.0, 0.14, S.timber, 1 + s * 1.2, 1.0, 25.5);
    w.box(2.6, 0.14, 0.14, S.timber, 1, 2.0, 25.5); w.box(0.3, 0.3, 0.3, M.rust, 2.2, 0.15, 27.1);
    w.ob(1, 25.5, 1.5);
    cart(w, -8.5, 25.5, 1.2); sacks(w, 10.5, 25); bloodStain(w, 3, 21, 1.1); bones(w, -2, 31.5); crows(w, 3, 23, 4);
    for (const [x, z] of [[-9.5, 18.5], [11.5, 18.5], [-9.5, 32.5], [11.5, 32.5]]) this.lampPost(w, x, z);
    // the gate road and the Lower Ward's streets
    for (const [x, z] of [[-4.6, 40], [4.6, 40], [-12, 33.6], [16, 28.6], [-30, 33]]) this.lampPost(w, x, z);
    corpse(w, -2.5, 38, 1); corpse(w, 14, 27.5, 2.6); crows(w, 20, 27, 3); skullStake(w, 6, 36);
    for (const [x, z] of [[-46, 46], [-12, 46], [-46, 33], [44, 27]]) w.rock(x, z, 0.8 + vh(x, z) * 0.6, true);

    // the canal: rubble and reeds, a dead man, an iron grate at each end, the bridges' rails and arches
    this.at(w, 0, 9);
    for (let k = 0; k < 16; k++) { const x = -44 + k * 5.8 + vh(k, 9) * 2, z = 7 + vh(k, 2) * 4; if (Math.abs(x + 22) < 4 || Math.abs(x - 20) < 4) continue; w.rock(x, z, 0.35 + vh(x, z) * 0.4, vh(x, z, 2) < 0.5); }
    corpse(w, -14, 9.5, 0.4); bones(w, 12, 8); sacks(w, 30, 7.4);
    for (const x of [-47, 47]) for (let k = 0; k < 4; k++) w.box(0.12, 2.4, 0.12, S.iron, x, 1.2, 7 + k * 1.4);
    for (const [x0, x1] of [[-25, -19], [17, 23]]) for (const xr of [x0 + 0.25, x1 - 0.25]) {
      for (let z = 6.4; z <= 11.8; z += 1.35) w.box(0.18, 1.0, 0.18, S.stoneDk, xr, 0.5, z);
      w.solids.push({ x0: xr - 0.12, x1: xr + 0.12, z0: 6, z1: 12 });
    }
    // the Terraces: lamps along the street, a shrine niche, a cart, the garden's broken bench
    this.at(w, 0, -2);
    for (const [x, z] of [[-26, 4.6], [-10, 4.6], [14, 4.6], [28, 4.6], [-26, -3], [12, -4.6], [42, -3]]) this.lampPost(w, x, z);
    cart(w, 28, 2.5, 0.4); sacks(w, -8, 2); bloodStain(w, -24, 1.5, 1);
    w.box(2.2, 0.5, 0.6, S.stone, 6, 0.25, -12.5); w.box(0.4, 0.5, 0.4, S.stone, 5.2, 0.25, -12.5); // the bench
    crows(w, 30, -16, 3); skullStake(w, -4, -4);
    // the Crest: the broken saint on the plaza, lamps, the cemetery's graves and mausoleum
    this.at(w, 3, -25);
    w.box(2.6, 0.6, 2.6, S.stoneDk, 3, 0.3, -25); w.box(1.8, 0.8, 1.8, S.stone, 3, 1.0, -25);
    w.box(0.9, 2.4, 0.7, S.grave, 3, 2.6, -25); w.box(1.4, 0.4, 0.5, S.grave, 3, 3.4, -25, 0.3); // the saint, his head long gone
    w.ob(3, -25, 1.6); candles(w, 1.4, -23.6, 5);
    for (const [x, z] of [[-6.6, -21.6], [12.6, -21.6], [-6.6, -29.4], [12.6, -29.4]]) this.lampPost(w, x, z);
    this.at(w, -30, -35);
    for (let gx = -45; gx < -17; gx += 2.6) for (let gz = -45; gz < -25; gz += 3.2) {
      const x = gx + (vh(gx, gz) - 0.5) * 0.8, z = gz + (vh(gz, gx) - 0.5) * 0.6;
      if (Math.hypot(x + 31, z + 34) < 6.5 || vh(x, z, 3) < 0.3 || (z > -35.5 && z < -32.5)) continue; // (the clearing and its path)
      const tall = vh(x, z, 4) < 0.25, lean = (vh(x, z, 5) - 0.5) * 0.4;
      const m = w.box(tall ? 0.5 : 0.7, tall ? 1.4 : 0.85, 0.18, S.grave, x, tall ? 0.7 : 0.42, z); m.rotation.z = lean;
      if (tall) w.box(0.7, 0.12, 0.2, S.grave, x, 1.15, z);
      w.box(0.8, 0.12, 1.3, M.rockDark, x, 0.06, z + 0.8);
      w.ob(x, z, 0.35);
    }
    // the mausoleum, sealed
    w.box(4.2, 3.6, 3.4, S.stone, -42, 1.8, -36); w.box(4.6, 0.5, 3.8, S.stoneDk, -42, 3.85, -36); w.box(1.4, 2.2, 0.2, M.logDark, -42, 1.1, -34.2);
    w.solids.push({ x0: -44.1, x1: -39.9, z0: -37.7, z1: -34.3 });
    crows(w, -30, -40, 5); bones(w, -28, -30); candles(w, -31, -36.5, 3);
  }
  lampPost(w, x, z) {
    const M = w.mats, S = this.S;
    w.box(0.14, 3.0, 0.14, S.iron, x, 1.5, z); w.box(0.6, 0.08, 0.08, S.iron, x + 0.25, 2.95, z);
    w.box(0.22, 0.3, 0.22, vh(x, z) < 0.65 ? M.glowAmber : M.logDark, x + 0.5, 2.75, z);
    w.ob(x, z, 0.25);
    if (vh(x, z) < 0.65) w.lights.push({ x: x + 0.5, y: 2.6, z, color: 0xffb060, power: 5, range: 8, src: {} });
  }

  // the ward's edge: tenement facades standing on every side (on the hill as it climbs), the camp's gate in the south
  rim(w) {
    const M = w.mats, E = B0 + 1.4;
    for (let a = -B0; a <= B0; a += 4.8) {
      for (const [x, z, alongX] of [[a, -E, true], [-E, a, false], [E, a, false], [a, E, true]]) {
        if (alongX && z > 0 && Math.abs(a) < 7) continue; // (the gate)
        this.at(w, Math.max(-B0, Math.min(B0, x)), Math.max(-B0, Math.min(B0, z)));
        const south = alongX && z > 0, h = south ? 1.4 + vh(x, z) * 1.2 : 5 + vh(x, z) * 7, ww = 5.0;
        w.box(alongX ? ww : 3, h, alongX ? 3 : ww, vh(x, z, 2) < 0.5 ? this.facade[0] : this.brick, x, h / 2, z);
        if (!south) for (let y = 2; y < h - 1; y += 3) w.box(alongX ? 1 : 3.1, 0.8, alongX ? 3.1 : 1, vh(x, y, 3) < 0.08 ? M.glowWindow : M.logDark, x, y, z);
        w.solids.push(alongX ? { x0: x - ww / 2, x1: x + ww / 2, z0: z - 1.5, z1: z + 1.5 } : { x0: x - 1.5, x1: x + 1.5, z0: z - ww / 2, z1: z + ww / 2 });
      }
    }
    // the gateposts
    this.at(w, 0, B0);
    for (const s of [-1, 1]) { w.box(1.2, 4.2, 1.2, this.S.stoneDk, s * 7, 2.1, B0 + 1.2); w.box(1.5, 0.4, 1.5, this.S.stone, s * 7, 4.4, B0 + 1.2); }
  }

  // ---------- the houses (city.js buildBuilding draws the walls, windows and doorways; these add the ward's own) ----------
  buildingMats(w, b) {
    const S = this.S;
    if (b.kind === 'chapel') return { wall: S.stone, trim: S.stoneDk };
    if (b.kind === 'works') return { wall: S.brick, trim: w.mats.rust };
    if (b.kind === 'barracks') return { wall: S.stoneDk, trim: S.timber };
    const k = Math.floor(vh(b.cx, b.cz, 4) * 3);
    return { wall: [S.plaster, this.facade[0], this.facade[3]][k], trim: S.timber };
  }
  // the outer walls: a brick plinth, timber framing with braces in some bays, sills and shutters at the windows (one
  // hanging, some boarded up), soot over the doorways; and ivy up some of them (flora.js, as on the terraces' faces)
  decorateBuilding(w, b, segs, wall, trim) {
    if (b.yard) return;
    const S = this.S, house = b.kind === 'house', y0 = w.floorAt(b.cx, b.cz), TH = 0.5;
    for (const s of segs) {
      if (!s.outer) continue;
      const out = s.outer === 's' || s.outer === 'e' ? 1 : -1, face = s.line + out * (TH / 2 + 0.03);
      const put = (a0, a1, yA, yB, mat, depth = 0.08, rot = 0) => {
        const len = a1 - a0, hh = yB - yA, mid = (a0 + a1) / 2;
        if (len <= 0.02 || hh <= 0.02) return;
        this.into(w, b.tall, () => { const m = s.alongX ? w.box(len, hh, depth, mat, mid, yA + hh / 2, face) : w.box(depth, hh, len, mat, face, yA + hh / 2, mid); if (rot) m.rotation[s.alongX ? 'z' : 'x'] = rot; });
      };
      const top = b.ruin ? b.h * 0.45 : b.h;
      if (s.door) { put(s.a0 - 0.2, s.a1 + 0.2, 2.75, Math.min(top, 3.4), w.mats.ash, 0.04); continue; } // (soot over the doorway)
      put(s.a0, s.a1, 0, 0.85, S.brick, 0.12); // the plinth
      if (house || b.kind === 'barracks') {
        // the frame: posts, rails at the plinth, the storey and the eaves, braces across some bays
        const rails = [0.85, ...(b.h > 6 ? [3.5] : []), top - 0.15];
        for (const y of rails) if (y < top) put(s.a0, s.a1, y - 0.07, y + 0.07, trim);
        for (let a = s.a0; a <= s.a1 + 0.01; a += 1.6) {
          const ph = b.ruin ? top * (0.5 + vh(a, s.line, 2) * 0.5) : top;
          put(a - 0.07, a + 0.07, 0.85, ph, trim);
          if (a + 1.6 <= s.a1 && vh(a, s.line, 9) < 0.35 && ph > 2.6) put(a + 0.2, a + 1.4, 1.4, 2.6, trim, 0.06, (vh(a, s.line, 10) < 0.5 ? 1 : -1) * 0.75);
        }
      }
      // the windows (where city.js put them): a sill, shutters, sometimes boards across
      for (let a = s.a0 + 0.2; a < s.a1 - 2.6; a += 3) {
        const c = a + 1.5;
        for (const [y, hh] of b.kind === 'chapel' ? [] : [[1.8, 0.8], ...(b.h > 6 && !b.ruin ? [[5.0, 0.8]] : [])]) {
          if (b.ruin && vh(a, s.line, 2) <= 0.3) continue;
          put(c - 0.65, c + 0.65, y - hh / 2 - 0.16, y - hh / 2 - 0.04, S.stoneDk, 0.16);
          const q = vh(c, y + s.line, 11);
          if (q < 0.3) { put(c - 0.6, c + 0.6, y - 0.18, y - 0.04, S.timber, 0.1, 0.2); put(c - 0.6, c + 0.6, y + 0.06, y + 0.2, S.timber, 0.1, -0.15); } // boarded up
          else if (q < 0.75) { put(c - 1.0, c - 0.52, y - hh / 2, y + hh / 2, S.timber, 0.06); put(c + 0.52, c + (q < 0.5 ? 1.0 : 0.9), y - hh / 2 - (q < 0.5 ? 0 : 0.25), y + hh / 2 - (q < 0.5 ? 0 : 0.25), S.timber, 0.06, q < 0.5 ? 0 : 0.35); } // shutters, one hanging
        }
      }
      // ivy up the wall, part of the building (so it fades with it when you're behind it)
      if (vh(b.cx + s.a0, s.line, 12) < (b.ruin ? 0.75 : 0.45)) {
        const geo = (this.leafGeo ||= new THREE.CircleGeometry(0.075, 4)), mats = (this.ivyMats ||= [0x2e3f22, 0x34482a, 0x3c5230, 0x2a3820].map((c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, side: THREE.DoubleSide })));
        const fo = face + out * 0.04, len = s.a1 - s.a0;
        this.into(w, b.tall, () => {
          for (let k = 0; k < 1 + Math.floor(vh(s.a0, s.line, 13) * 3); k++) {
            const along = s.a0 + 0.4 + vh(s.a1, k, 14) * (len - 0.8), hl = top * (0.4 + vh(s.line, k, 15) * 0.55);
            for (let d = 0; d < hl; d += 0.09) {
              const wob = Math.sin(d * 4 + k) * 0.12, spread = 0.1 + (1 - d / hl) * 0.25;
              for (let q = 0; q < 2; q++) {
                const a = along + wob + (vh(along + d, q, 16) - 0.5) * spread * 2, y = top - 0.1 - d;
                const m = new THREE.Mesh(geo, mats[Math.floor(vh(a, y, 17) * 4)]);
                m.position.set(s.alongX ? a : fo, y, s.alongX ? fo : a); m.rotation.set(0, s.alongX ? 0 : Math.PI / 2, vh(a, d, 18) * 3);
                w.add(m);
              }
            }
          }
        });
      }
    }
    // a ruin: its rafters charred and fallen across the room
    if (b.ruin) this.into(w, b.tall, () => {
      for (let k = 0; k < 4; k++) {
        const x = b.x0 + 1.5 + vh(b.cx, k, 1) * (b.x1 - b.x0 - 3), y = b.h * (0.3 + vh(b.cz, k, 2) * 0.45);
        const m = w.box(0.22, 0.22, b.z1 - b.z0 - 0.6, w.mats.logDark, x, y, b.cz); m.rotation.x = (vh(k, b.cx, 3) - 0.5) * 0.6; m.rotation.y = (vh(k, b.cz, 4) - 0.5) * 0.4;
      }
    });
  }
  // a house's roof: pitched slate over the flat one, its ridge along the longer side, the odd hole down to the rafters,
  // a chimney; the big buildings keep theirs (city.js)
  roofDetail(w, b, W, D, wall, trim) {
    if (b.kind !== 'house') { super.roofDetail(w, b, W, D, wall, trim); return; }
    const S = this.S, alongX = W >= D, span = (alongX ? D : W) + 0.6, len = (alongX ? W : D) + 0.6, pitch = 0.62;
    const rise = Math.tan(pitch) * span / 2, slab = (span / 2) / Math.cos(pitch), y = b.h + 0.3;
    for (const side of [-1, 1]) {
      const off = side * span / 4;
      const m = w.box(alongX ? len : slab, 0.18, alongX ? slab : len, S.slate, b.cx + (alongX ? 0 : off), y + rise / 2, b.cz + (alongX ? off : 0));
      m.rotation[alongX ? 'x' : 'z'] = (alongX ? side : -side) * pitch;
      // courses of slate, and a hole or two down to the rafters
      for (let t = 0.2; t < 0.95; t += 0.22) {
        const o = side * (span / 2) * (1 - t), yy = y + rise * t + 0.11;
        const c = w.box(alongX ? len : 0.08, 0.05, alongX ? 0.08 : len, w.mats.logDark, b.cx + (alongX ? 0 : o), yy, b.cz + (alongX ? o : 0));
        c.rotation[alongX ? 'x' : 'z'] = (alongX ? side : -side) * pitch;
      }
      if (vh(b.cx, side, 6) < 0.55) {
        const hl = 1.2 + vh(b.cz, side, 7) * 1.4, ha = (vh(b.cx, b.cz, side + 8) - 0.5) * (len - hl - 1), o = side * span * 0.26;
        const h = w.box(alongX ? hl : 0.9, 0.2, alongX ? 0.9 : hl, w.mats.ash, b.cx + (alongX ? ha : o), y + rise / 2 + 0.06, b.cz + (alongX ? o : ha));
        h.rotation[alongX ? 'x' : 'z'] = (alongX ? side : -side) * pitch;
      }
    }
    // the ridge, the gables (stepped) and a chimney
    w.box(alongX ? len : 0.22, 0.2, alongX ? 0.22 : len, S.timber, b.cx, y + rise + 0.05, b.cz);
    for (const e of [-1, 1]) for (let k = 0; k < 4; k++) {
      const f = 1 - k / 4, gw = span * f * 0.96, gy = y + rise * (k + 0.5) / 4, ge = e * (len / 2 - 0.35);
      w.box(alongX ? 0.2 : gw, rise / 4, alongX ? gw : 0.2, wall, b.cx + (alongX ? ge : 0), gy, b.cz + (alongX ? 0 : ge));
    }
    const cx = b.cx + (alongX ? (vh(b.cx, 1) < 0.5 ? -1 : 1) * len * 0.3 : span * 0.18), cz = b.cz + (alongX ? -span * 0.18 : (vh(b.cz, 1) < 0.5 ? -1 : 1) * len * 0.3);
    w.box(0.8, rise + 1.4, 0.8, S.brick, cx, y + (rise + 1.4) / 2, cz); w.box(1.0, 0.18, 1.0, S.stoneDk, cx, y + rise + 1.45, cz); w.box(0.5, 0.06, 0.5, w.mats.ash, cx, y + rise + 1.56, cz);
  }
  // inside: what city.js puts in a house (beds, a table, crates, the dead), and a hearth, a rug, stools, a shelf
  furnish(w, b) {
    super.furnish(w, b);
    if (b.kind !== 'house') return;
    const M = w.mats, S = this.S, { spot } = this.freeIn(w, b);
    this.at(w, b.cx, b.cz);
    // the hearth against the north wall, cold or still smouldering
    const hx = b.x0 + 2 + vh(b.cx, 5) * (b.x1 - b.x0 - 4), hz = b.z0 + 0.25 + 0.55;
    if (!w.blocked(hx, hz + 0.6, 0.8) && !(b.stair && Math.hypot(hx - b.stair.x, hz - b.stair.z) < 3)) {
      w.box(1.8, 1.4, 0.7, S.stone, hx, 0.7, hz); w.box(1.0, 0.7, 0.2, M.ash, hx, 0.4, hz + 0.3); w.box(2.0, 0.18, 0.85, S.stoneDk, hx, 1.45, hz);
      w.solids.push({ x0: hx - 0.9, x1: hx + 0.9, z0: hz - 0.35, z1: hz + 0.35 });
      if (vh(b.cx, b.cz, 6) < 0.4) { w.box(0.5, 0.12, 0.1, M.glowAmber, hx, 0.14, hz + 0.42); w.lights.push({ x: hx, y: 0.6, z: hz + 0.9, color: 0xff7a2a, power: 2.4, range: 4.5, src: {} }); }
    }
    // a rug, a table and stools, a shelf
    let p = spot(1.4); if (p) w.box(2.2, 0.03, 1.5, vh(p.x, p.z) < 0.5 ? S.awning : S.awning2, p.x, 0.015, p.z, vh(p.z, p.x) * 0.6);
    p = spot(1.6);
    if (p) { w.box(1.6, 0.08, 0.9, S.timber, p.x, 0.78, p.z); for (const [dx, dz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) w.box(0.08, 0.76, 0.08, S.timber, p.x + dx, 0.38, p.z + dz); for (const sx of [-1, 1]) w.box(0.4, 0.45, 0.4, S.timber, p.x + sx * 1.2, 0.22, p.z + (vh(p.x, sx) - 0.5) * 0.4); w.ob(p.x, p.z, 0.9); if (vh(p.x, p.z, 2) < 0.5) candles(w, p.x, p.z, 2); }
    p = spot(1.0);
    if (p) { const ry = vh(p.x, p.z, 3) < 0.5 ? 0 : Math.PI / 2; for (const y of [0.5, 1.1, 1.7]) w.box(1.6, 0.06, 0.45, S.timber, p.x, y, p.z, ry); for (const s of [-1, 1]) w.box(0.08, 1.9, 0.45, S.timber, p.x + (ry ? 0 : s * 0.78), 0.95, p.z + (ry ? s * 0.78 : 0), ry); w.ob(p.x, p.z, 0.7); }
  }

  // ---------- the cellars and vaults below (city.js buildUnder lays the rooms) ----------
  // their floors: tiled rooms, brick-paved passages, grime along the walls and in the corners, flagstones in the
  // great hall. A vault or the hoard goes down: steps in the corridor drop to a sunken hall with a raised dais at its
  // north end, and steps climb from the side passage to a raised chamber. The boss's (its corridor and the arena)
  // stays flat
  buildUnder(w, b, kind, k) {
    const T = w.terrain, from = T.parts.length;
    super.buildUnder(w, b, kind, k);
    const u = b.under, { ox, oz } = u, P = (s2, x0, x1, z0, z1, o) => w.paint({ x0, x1, z0, z1 }, s2, o), C = (s2, cx, cz, r, o) => w.paint({ cx, cz, r }, s2, o);
    P('tile', ox - 7, ox + 7, oz - 7, oz + 6, { edge: 0.4 }); // the room you arrive in
    for (const [x, z, r] of [[ox - 5, oz - 5, 1.6], [ox + 5, oz + 4, 1.2], [ox + 4.5, oz - 5.2, 1.4]]) C('grime', x, z, r, { edge: 1 });
    if (kind === 'vault' || kind === 'cache') {
      const H = -1.2, D = -0.2;
      T.stairs(ox - 1.8, ox + 1.8, oz - 13, oz - 8, H, 0, 'z', { look: 'brick' });
      T.flat(ox - 1.8, ox + 1.8, oz - 17, oz - 13, H, { look: 'brick' });
      T.flat(ox - 13, ox + 13, oz - 42, oz - 15, H, { look: 'brick' });
      T.flat(ox - 9, ox + 9, oz - 42, oz - 37, D, { look: 'stone' });           // the dais
      T.stairs(ox - 2.5, ox + 2.5, oz - 37, oz - 35, D, H, 'z', { look: 'stone' });
      T.flat(ox + 11, ox + 15, oz - 31, oz - 25, H, { look: 'brick' });
      T.stairs(ox + 15, ox + 18, oz - 31, oz - 25, H, D, 'x', { look: 'brick' });
      T.flat(ox + 18, ox + 26, oz - 36, oz - 20, D, { look: 'brick' });          // the raised chamber
      P('brick', ox - 2.2, ox + 2.2, oz - 17.5, oz - 3.5, { edge: 0.3 });
      P('flag', ox - 13, ox + 13, oz - 42, oz - 15, { edge: 0.5 });
      P('tile', ox - 9, ox + 9, oz - 42, oz - 37, { edge: 0.3 });
      P('brick', ox + 11, ox + 18, oz - 31.5, oz - 24.5, { edge: 0.3 });
      P('tile', ox + 17, ox + 26, oz - 36, oz - 20, { edge: 0.4 });
      for (const [x, z, r] of [[ox - 11, oz - 17, 2.2], [ox + 11, oz - 40, 2], [ox - 12, oz - 33, 1.6], [ox + 6, oz - 21, 1.4], [ox + 24, oz - 22, 1.8], [ox + 19, oz - 34.5, 1.2]]) C('grime', x, z, r, { edge: 1.2 });
      for (const [x, z, r] of [[ox - 10.5, oz - 24, 0.8], [ox + 8, oz - 31, 0.6]]) w.flora.push({ kind: 'puddle', x, z, r });
    } else {
      // the boss's: tiles to the corridor, the corridor brick-paved up to the arena
      P('brick', ox - 3, ox + 3, oz - 34, oz - 5, { edge: 0.3 });
      C('grime', ox, oz - 18, 2.6, { edge: 1.4 });
    }
    // the faces and steps of what was just laid (always drawn: not culled with a chunk)
    if (T.parts.length > from) this.terrainGroup(w, from);
  }

  // after everything is placed (city.js populate): lift it all onto the hill (terrain.js), the buildings whole
  populate(w) {
    super.populate(w);
    // barrels, crates and sacks against the walls by some doorways (never in them)
    for (const b of this.buildings) for (const d of b.doors) {
      if (b.yard || vh(b.cx + d.t, b.cz, 13) > 0.5) continue;
      const [o] = this.doorPos(b, d), alongX = d.s === 'n' || d.s === 's', side = vh(b.cz, d.t, 14) < 0.5 ? -1 : 1, off = d.w / 2 + 0.9;
      const x = o.x + (alongX ? side * off : 0) + (alongX ? 0 : (d.s === 'e' ? -0.5 : 0.5)), z = o.z + (alongX ? (d.s === 's' ? -0.5 : 0.5) : side * off);
      if (w.blocked(x, z, 0.5) || !w.walkable(x, z, 0.4)) continue;
      this.at(w, x, z);
      const q = vh(x, z, 15); if (q < 0.4) w.barrel(x, z); else if (q < 0.75) w.crate(x, z, 0.7); else sacks(w, x, z);
    }
    for (const b of this.buildings) {
      const y = w.floorAt(b.cx, b.cz);
      for (const g of [b.tall, b.low]) { g.userData.noSettle = true; if (y) for (const c of g.children) c.position.y += y; } // (its pieces, not the group: they merge in world space)
    }
    w.settle();
  }
}
City.MAPS.ward = Ward;
