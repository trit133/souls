// Glasshallow (regions.js r2a3): the Glass-Wrights' city in a cavern so big it has weather, built round the greatest
// vein of seer-glass ever found. Bright again after the tunnels: violet and cyan light out of the crystal in the walls.
// 95 m across, laid by hand (a Deep: deep.js) on four terraces climbing north out of a black lake:
//   - the Lake Quarter (0 m): the black lake in the west (you can't wade it), boathouses and the lakeside;
//   - the Terraced Streets (2.5 m): carved stone houses, the Glass Gardens (a plaza of crystal "trees");
//   - the Gardens' terrace (5 m): the Hall of Mirrors (a boss site), houses, the terrace square;
//   - the Upper City (7.5 m): the Lens Cathedral and the Vein Altar (boss sites) under the Vein itself, a wall of
//     crystal at the cavern's north end.
// Crystal pillars stand all through it (world.prisms): a Prism Lancer can bank its beam off them. Its shrine: the Prism.
import * as THREE from 'three';
import { City, GRID } from './city.js';
import { Deep } from './deep.js';
import { wallTex } from './ground.js';
import { candles, bones, corpse, robed, bloodStain } from './decor.js';

const { vh } = GRID;
const H_LAKE = 0, H_STREET = 2.5, H_GARDEN = 5, H_UPPER = 7.5;

export const GLASSHALLOW = {
  seed: 0x61a55,
  boss: ['hallm', 'lens', 'veinaltar'], vaults: ['h1', 'h3', 'h7'], squares: ['lakeside', 'gardens', 'terrace', 'vein'],
  shrines: { must: 'prism', pool: ['bells', 'elite'] },
  arena: { name: 'The Hall of Mirrors' },
  under: { vault: 'The Reliquary Vaults', boss: 'The Mirror Vault', cache: 'The Wrights\' Treasury' },
  buildings: [
    // the Lake Quarter
    { key: 'h1', kind: 'house', x0: 14, x1: 26, z0: 34, z1: 44, doors: [['w', 0.5], ['n', 0.5]], h: 5 },
    { key: 'h2', kind: 'house', x0: 30, x1: 40, z0: 26, z1: 34, doors: [['w', 0.5], ['s', 0.5]], h: 4.6 },
    { key: 'boat', kind: 'boathouse', x0: -16, x1: -8, z0: 36, z1: 46, doors: [['e', 0.5, 3.2]], h: 4.4 },
    // the Terraced Streets
    { key: 'h3', kind: 'house', x0: -44, x1: -34, z0: 6, z1: 16, doors: [['e', 0.5], ['s', 0.5]], h: 5.4 },
    { key: 'h4', kind: 'house', x0: -28, x1: -18, z0: 4, z1: 14, doors: [['e', 0.5], ['s', 0.5]], h: 4.8 },
    { key: 'h5', kind: 'house', x0: 24, x1: 34, z0: 4, z1: 14, doors: [['w', 0.5], ['s', 0.5]], h: 5.0 },
    { key: 'h6', kind: 'house', x0: 37, x1: 46, z0: 2, z1: 10, doors: [['w', 0.5], ['s', 0.4]], ruin: true },
    // the Gardens' terrace
    { key: 'hallm', kind: 'hallm', x0: -44, x1: -28, z0: -20, z1: -6, doors: [['e', 0.5, 3.2], ['s', 0.5]], h: 8 },
    { key: 'h7', kind: 'house', x0: 22, x1: 32, z0: -20, z1: -10, doors: [['w', 0.5], ['s', 0.5]], h: 5.2 },
    { key: 'h8', kind: 'house', x0: 36, x1: 46, z0: -22, z1: -12, doors: [['w', 0.5], ['s', 0.4]], h: 4.6 },
    // the Upper City
    { key: 'lens', kind: 'lens', x0: -14, x1: 14, z0: -46, z1: -32, doors: [['s', 0.5, 3.4], ['e', 0.5], ['w', 0.5]], h: 11 },
    { key: 'veinaltar', kind: 'veinaltar', x0: 24, x1: 40, z0: -44, z1: -32, doors: [['s', 0.4, 3.2], ['w', 0.5]], h: 7 },
    { key: 'h9', kind: 'house', x0: -42, x1: -32, z0: -44, z1: -34, doors: [['s', 0.5], ['e', 0.5]], h: 5 },
  ],
  squareAt: { lakeside: [-6, 8, 26, 32], gardens: [-10, 10, 4, 16], terrace: [-8, 8, -18, -6], vein: [-30, -18, -32, -26] },
};

export class Glasshallow extends Deep {
  static PLAN = GLASSHALLOW;
  get look() { return 'glasshallow'; }
  get ground() { return 'glass'; }
  get dim() { return 0.04; } // (bright again: the crystal fills it)
  get sky() { return { hemi: 2.4, sun: 2.6, hemiColor: 0xa4a8dc, sunColor: 0xd8c4ff, fog: 0x140f26 }; }
  get seams() { return 0.55; }

  streets() {
    return [[-4, 4, 30, 46], [-6, 40, 22, 26], [-44, 46, 16, 20], [-30, 22, -2, 2], [-26, 20, -24, -20], [-30, 22, -30, -26], [10, 22, -14, -10], [36, 46, 12, 18]]
      .map(([x0, x1, z0, z1]) => ({ x0, x1, z0, z1, alongX: x1 - x0 > z1 - z0 }));
  }

  build(w) {
    this.K = this.caveMats();
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    Object.assign(this.K, { pale: lam(0xc8c4d4), paleDk: lam(0x9894a8), silver: lam(0xb8bcd0), slate: lam(0x4a4660), water: new THREE.MeshPhongMaterial({ color: 0x06080e, emissive: 0x04040a, specular: 0xa090ff, shininess: 120, flatShading: true }), timber: lam(0x4a3a30) });
    for (const [k, kind, sc] of [['pale', 'stone'], ['paleDk', 'stone'], ['silver', 'metal', 1.4], ['slate', 'stone', 1]]) wallTex(this.K[k], kind, sc);
    this.seamMat = this.K.crystal;
    super.build(w);
    this.def.name = this.area.name;
  }

  laneWalls(w) {
    const T = w.terrain, K = this.K;
    this.at(w, 0, 0);
    T.flat(-53, 53, 22, 53, H_LAKE);
    T.flat(-53, 53, 0, 22, H_STREET, { look: 'pale', ivy: 0.15 });
    T.flat(-53, 53, -24, 0, H_GARDEN, { look: 'pale', ivy: 0.15 });
    T.flat(-53, 53, -53, -24, H_UPPER, { look: 'pale', ivy: 0.1 });
    // the ways up: stairs carved in the terraces, a long ramp up the east side
    T.stairs(-4, 4, 18, 22, H_STREET, H_LAKE, 'z', { look: 'pale' });
    T.slope(40, 46, 12, 22, H_STREET, H_LAKE, 'z', { look: 'pale' });
    T.stairs(14, 20, -4, 0, H_GARDEN, H_STREET, 'z', { look: 'pale' });
    T.slope(-46, -40, -10, 0, H_GARDEN, H_STREET, 'z', { look: 'pale' });
    T.stairs(-5, 5, -28, -24, H_UPPER, H_GARDEN, 'z', { look: 'pale' });
    T.stairs(36, 42, -28, -24, H_UPPER, H_GARDEN, 'z', { look: 'pale' });
    // the shortcuts, pulled up
    T.ladder(-24, 22.45, Math.PI, H_LAKE, H_STREET, { raised: true });
    T.ladder(4, 0.45, Math.PI, H_STREET, H_GARDEN, { raised: true });
    T.ladder(20, -23.55, Math.PI, H_GARDEN, H_UPPER, { raised: true });
    this.terrainGroup(w);

    // the black lake: it fills the Lake Quarter's west, still and glassy (you can't wade it)
    w.solids.push({ x0: -50, x1: -19, z0: 26, z1: 50 });
    // the ground: carved flagstones through the streets, gravel by the lake, moss in the damp, crystal breaking
    // through the floor near the Vein
    const P = (s, x0, x1, z0, z1, o) => w.paint({ x0, x1, z0, z1 }, s, o), C = (s, cx, cz, r, o) => w.paint({ cx, cz, r }, s, o);
    P('gravel', -20, 47, 22, 47, { amount: 0.6, edge: 2 });
    P('flag', -5, 5, 22, 48, { edge: 0.6 });
    P('flag', -47, 47, 16, 21, { amount: 0.8, edge: 1 }); P('flag', -30, 22, -3, 3, { amount: 0.8, edge: 1 }); P('flag', -26, 20, -25, -19, { amount: 0.8, edge: 1 });
    P('crystal', -10, 10, 4, 16, { amount: 0.35, edge: 2 }); // the Glass Gardens
    P('crystal', -47, 47, -53, -40, { amount: 0.55, edge: 4 }); // near the Vein
    for (const [x, z, r] of [[-46, 4, 3], [46, -4, 3], [-20, -12, 2.5], [10, -30, 2], [44, 44, 3], [-16, 24, 2.5]]) C('moss', x, z, r, { edge: 1.8 });
    for (const b of this.buildings) if (!b.yard) P('flag', b.x0 + 0.2, b.x1 - 0.2, b.z0 + 0.2, b.z1 - 0.2, { edge: 0.05 });

    // crystal: pillars all through the city (the Lancers bank their beams off these: world.prisms), clusters in the
    // gardens, and the Vein along the north wall
    const F = (o) => w.flora.push(o);
    w.prisms = [];
    for (const [x, z] of [[-6, 6], [6, 14], [-8, 14], [8, 5], [-24, 18], [16, 18], [30, 18], [-14, -4], [10, -6], [-4, -20], [22, -26], [-30, -28], [44, -30], [-46, -26], [30, 40], [-12, 28]]) {
      F({ kind: 'crystal', x, z, color: vh(x, z) < 0.5 ? 'violet' : 'cyan', n: 6, r: 0.5, s: 1.8, block: true, power: 4 }); w.prisms.push({ x, z });
    }
    for (let x = -44; x <= 44; x += 6) F({ kind: 'crystal', x: x + vh(x, 1) * 2, z: -49 + vh(x, 2) * 2, color: vh(x, 3) < 0.5 ? 'violet' : 'cyan', n: 8, r: 1.2, s: 3, light: Math.abs(x) % 12 === 2 });

    // walls: parapets on each terrace's lip (gaps for the stairs, the ramps and the ladders), the lake's quay
    const wall = (...a) => this.wallRun(w, ...a);
    for (const [x0, x1] of [[-47, -25], [-23, -5], [5, 39.5]]) wall(x0, x1, 21.55, 21.9, 0.9, K.paleDk);
    for (const [x0, x1] of [[-39.5, 3], [5, 13], [21, 47]]) wall(x0, x1, -0.45, -0.1, 0.9, K.paleDk);
    for (const [x0, x1] of [[-47, -6], [6, 19], [21, 35], [43, 47]]) wall(x0, x1, -24.45, -24.1, 0.9, K.paleDk);
    this.dressGlass(w);
  }

  dressGlass(w) {
    const K = this.K;
    // the lake: black water, moored boats, the quay's posts, violet lamps along it
    this.at(w, -30, 36);
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(32, 26), K.water); lake.rotation.x = -Math.PI / 2; lake.position.set(-34, 0.05, 38); w.add(lake);
    for (const [x, z, ry] of [[-26, 30, 0.3], [-30, 42, -0.2], [-38, 34, 1.4]]) { w.box(1.4, 0.4, 4.2, K.timber, x, 0.2, z, ry); w.box(1.2, 0.1, 3.6, K.timberDk, x, 0.42, z, ry); }
    for (let z = 27; z < 47; z += 3) { w.box(0.3, 1.2, 0.3, K.paleDk, -19.2, 0.6, z); }
    for (const z of [28, 36, 44]) this.lanternPost(w, -17.5, z, true, 0xb090ff);
    // the streets: lamps with violet and cyan light, the Wrights' stone penitents gazing into crystal, the dead
    this.at(w, 0, 10);
    for (const [x, z, c] of [[-6, 24, 0xb090ff], [6, 24, 0x8ae0ff], [-12, 18, 0x8ae0ff], [12, 18, 0xb090ff], [-30, 18, 0xb090ff], [30, 18, 0x8ae0ff], [-12, 2, 0x8ae0ff], [12, 2, 0xb090ff], [-10, -22, 0xb090ff], [10, -22, 0x8ae0ff], [-20, -30, 0x8ae0ff], [20, -30, 0xb090ff]]) this.lanternPost(w, x, z, true, c);
    for (const [x, z] of [[-4, 8], [4, 12], [0, -12]]) robed(w, x, z, Math.atan2(-x, -z), { kneel: true, pray: true, mat: K.pale });
    bones(w, 14, 26); corpse(w, -10, 0, 2); bloodStain(w, 16, -8, 1);
    // spires: tall carved columns with crystal tips round the Upper City
    this.at(w, 0, -40);
    for (const [x, z, h] of [[-20, -48, 14], [20, -48, 16], [-46, -36, 11], [46, -36, 12], [0, -50, 18]]) { w.box(1.6, h, 1.6, K.pale, x, h / 2, z); const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), K.crystal); tip.position.set(x, h + 0.9, z); tip.scale.y = 2; w.add(tip); w.solids.push({ x0: x - 0.8, x1: x + 0.8, z0: z - 0.8, z1: z + 0.8 }); }
  }

  // ---------- the buildings ----------
  buildingMats(w, b) {
    const K = this.K;
    return { lens: { wall: K.pale, trim: K.silver }, veinaltar: { wall: K.paleDk, trim: K.crystal }, hallm: { wall: K.silver, trim: K.pale }, boathouse: { wall: K.timber, trim: K.paleDk } }[b.kind]
      || { wall: vh(b.cx, b.cz) < 0.5 ? K.pale : K.paleDk, trim: K.silver };
  }
  windowMat(w, b, lit) { return lit ? (vh(b.cx, b.cz) < 0.5 ? this.K.glowViolet : this.K.crystalCy) : this.K.slate; }
  decorateBuilding(w, b, segs) {
    const K = this.K;
    for (const s of segs) {
      if (!s.outer) continue;
      const out = s.outer === 's' || s.outer === 'e' ? 1 : -1, face = s.line + out * 0.29;
      const put = (a0, a1, y0, y1, mat, d = 0.1) => { const len = a1 - a0, hh = y1 - y0, mid = (a0 + a1) / 2; if (len <= 0.02 || hh <= 0.02) return; this.into(w, b.tall, () => (s.alongX ? w.box(len, hh, d, mat, mid, y0 + hh / 2, face) : w.box(d, hh, len, mat, face, y0 + hh / 2, mid))); };
      if (s.door) { put(s.a0 - 0.3, s.a1 + 0.3, 2.8, 3.2, K.silver, 0.16); put(s.a0 - 0.1, s.a1 + 0.1, 3.2, 3.5, K.crystal, 0.12); continue; }
      put(s.a0, s.a1, 0, 0.6, K.paleDk, 0.12);
      put(s.a0, s.a1, b.h - 0.5, b.h - 0.3, K.silver, 0.14);
      for (let a = s.a0 + 1.4; a < s.a1 - 0.8; a += 3) put(a - 0.12, a + 0.12, 0.6, b.ruin ? b.h * 0.5 : b.h - 0.5, K.paleDk, 0.2); // pilasters
      if (b.kind === 'lens' || b.kind === 'veinaltar') for (let a = s.a0 + 2; a < s.a1 - 1; a += 3.5) put(a - 0.35, a + 0.35, 2, b.h * 0.7, K.crystal, 0.06); // tall crystal lancets
    }
  }
  roofDetail(w, b, W, D) {
    const K = this.K, y = b.h + 0.3, cx = b.cx, cz = b.cz;
    if (b.kind === 'lens') {
      // the cathedral: a dome of silver ribs with the great lens at its crown, two crystal-tipped towers
      const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(W, D) * 0.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), K.silver); dome.position.set(cx, y, cz); w.add(dome);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 14), K.crystalCy); lens.position.set(cx, y + Math.min(W, D) * 0.4, cz); w.add(lens);
      for (const s2 of [-1, 1]) { w.box(2.4, 6, 2.4, K.pale, cx + s2 * (W / 2 - 1.5), y + 3, b.z1 - 1.5); const t = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), K.crystal); t.position.set(cx + s2 * (W / 2 - 1.5), y + 7, b.z1 - 1.5); t.scale.y = 2; w.add(t); }
      w.lights.push({ x: cx, y: y + 6, z: cz, color: 0x8ae0ff, power: 12, range: 16, src: {} });
      return;
    }
    if (b.kind === 'veinaltar') { w.box(W + 0.4, 0.3, D + 0.4, K.paleDk, cx, y, cz); for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.5 + vh(k, 1) * 3, 4), K.crystal); c.position.set(b.x0 + 2 + vh(k, 2) * (W - 4), y + 1.5, b.z0 + 2 + vh(k, 3) * (D - 4)); c.rotation.z = (vh(k, 4) - 0.5) * 0.6; w.add(c); } return; }
    if (b.kind === 'hallm') { w.box(W + 0.4, 0.3, D + 0.4, K.silver, cx, y, cz); for (const s2 of [-1, 1]) { const m = w.box(W * 0.9, 0.12, 2.4, K.crystalCy, cx, y + 1.2, cz + s2 * D * 0.2); m.rotation.x = s2 * 0.35; } return; }
    if (b.kind === 'boathouse') { const m = w.box(W + 0.8, 0.14, D + 0.8, K.slate, cx, y + 0.5, cz); m.rotation.z = 0.25; return; }
    // a house: a shallow pyramid roof of slate with a crystal finial
    const r = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(W, D) * 0.55, 2.2, 4), K.slate); r.position.set(cx, y + 1.1, cz); r.rotation.y = Math.PI / 4; r.scale.set(W / Math.hypot(W, D) * 1.4, 1, D / Math.hypot(W, D) * 1.4); w.add(r);
    const f = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), vh(cx, cz) < 0.5 ? K.crystal : K.crystalCy); f.position.set(cx, y + 2.5, cz); f.scale.y = 1.6; w.add(f);
  }
  furnish(w, b) {
    super.furnish(w, b);
    const K = this.K, { spot } = this.freeIn(w, b);
    this.at(w, b.cx, b.cz);
    if (b.kind === 'lens' || b.kind === 'hallm') for (let k = 0; k < 3; k++) { const p = spot(1.2); if (p) w.flora.push({ kind: 'crystal', x: p.x, z: p.z, color: k % 2 ? 'cyan' : 'violet', n: 5, r: 0.5, s: 1.4, block: true }); }
    if (b.kind === 'house') { const p = spot(1.0); if (p) { w.box(0.7, 0.9, 0.7, K.paleDk, p.x, 0.45, p.z); const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), K.crystalCy); c.position.set(p.x, 1.2, p.z); w.add(c); w.ob(p.x, p.z, 0.5); } }
    if (b.kind === 'veinaltar') { const p = spot(1.6); if (p) { w.box(2.4, 1.0, 1.4, K.pale, p.x, 0.5, p.z); candles(w, p.x, p.z + 0.9, 6); w.ob(p.x, p.z, 1.2); } }
  }
}
City.MAPS.glasshallow = Glasshallow;
