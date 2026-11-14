// The Sump Lines (regions.js r1a2; docs/region1-areas.md): the flooded transit tunnels under Ashfall Ward. Built on
// the same maze as the ward (city.js: the lanes, walking grid, shrines, chests, enemies, basements), with its own plan
// and everything dressed for underground: the lanes are tunnels walled in tiled rock and ribbed with iron, pipes and
// cable runs along them, hazard lamps; some carry a flooded channel down the middle that slows you; the blocks are
// stations (platform edges, rails, benches, dead destination boards), collapsed stations, caged pump yards, round
// cisterns (the squares, where a shrine can stand in the water) and cave-ins; the three big ones are Station Ninefold
// (a concourse with a dead clock and a regime saint), the Pump Cathedral (the engine the gangs pray to) and the Sluice
// Works (floodgates and chains). It's dark everywhere: your lamp-cone is always on. You come down by a maintenance
// lift. Its own chests (pressure lockers) and drums (promethium canisters), and its own shrine: the flood valves.
import * as THREE from 'three';
import { City, GRID } from './city.js';
import { CHEST_LOOKS, buildDrum } from './chests.js';
import { candles, bones, corpse, sacks, crows, bloodStain, cage } from './decor.js';

const { EDGE, UNDER, T, X, inside, vh, edgeRect } = GRID;

export const SUMP = {
  seed: 0x50b11, // (the map's own stream)
  blocks: [
    ['house', 'ruin', 'house', 'house', 'works', 'house'],
    ['plaza', 'house', 'yard', 'ruin', 'merged', 'plaza'],
    ['house', 'chapel', 'merged', 'house', 'house', 'house'],
    ['ruin', 'house', 'plaza', 'yard', 'barracks', 'ruin'],
    ['house', 'yard', 'house', 'house', 'merged', 'house'],
    ['rubble', 'house', 'ruin', 'plaza', 'house', 'yard'],
  ],
  merged: ['h4,1', 'v2,2', 'h4,4'], loops: 3,
  boss: ['0,4', '2,1', '3,4'], vaults: ['0,0', '2,5', '4,2'], squares: ['1,0', '1,5', '3,2', '5,3'],
  shrines: { must: 'valve', pool: ['elite', 'circle', 'altar'] },
  arena: { name: 'The Cold Pumps' },
  under: { vault: 'The Drainage Sumps', boss: 'The Undersump', cache: 'The Sealed Bunker' },
};
const KIND_NAME = { chapel: 'Station Ninefold', works: 'The Pump Cathedral', barracks: 'The Sluice Works' };

export class Sump extends City {
  static PLAN = SUMP;
  get look() { return 'sump'; }

  // ---------- what the game asks ----------
  darkAt() { return true; } // (underground: your cone is always on)
  // how dark (main.js darkLight): the tunnels, cisterns and yards are dim, not black (the lamps and the water's glow);
  // a roofed room and the basements below are as black as a house in the ward
  darkness(x, z) { const b = x > UNDER ? null : this.buildingAt(x, z); return x > UNDER || (b && !b.ruin && !b.yard) ? 1 : 0.62; }
  styleAt(x, z) { return x > UNDER ? super.styleAt(x, z) : 'sump'; }
  // floors: platform tiles in the stations, grating in the pump rooms, slick stone in the cisterns
  groundTint(x, z, c, n) {
    if (x > UNDER) return;
    const b = this.buildingAt(x, z);
    if (b && !b.yard) {
      if (b.kind === 'works' || b.kind === 'barracks') { const g = ((Math.floor(x * 2) + Math.floor(z * 2)) & 1) ? 0.85 : 1; c.setHex(0x34363a).multiplyScalar(g * (0.92 + n * 0.1)); return; }
      const tile = ((Math.floor(x * 1.6) + Math.floor(z * 1.6)) & 1) ? 0.9 : 1;
      c.setHex(b.kind === 'chapel' ? 0x5a5a50 : 0x4a5046).multiplyScalar(tile * (0.92 + n * 0.08));
      if (b.ruin) c.multiplyScalar(0.8);
      return;
    }
    if (b?.yard) { c.setHex(0x2e302c).multiplyScalar(0.9 + n * 0.2); return; }
    if (z > EDGE) { c.setHex(0x34342e).multiplyScalar(0.9 + n * 0.15); return; }
    const B = this.blocks.find((q) => inside(q, x, z, 0.3));
    if (B?.type === 'plaza') { const d = Math.hypot(x - B.cx, z - B.cz); c.setHex(d < 5.6 ? 0x1e2a26 : 0x3a3c36).multiplyScalar(0.92 + n * 0.1); return; }
    // the tunnels: a darker wet line down the middle
    if (this.channelAt?.(x, z)) c.setHex(0x1a2622).multiplyScalar(0.9 + n * 0.15);
  }

  // ---------- building ----------
  build(w) {
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    this.S = {
      rock: lam(0x2a2a28), rockDk: lam(0x1c1c1a), tile: lam(0x6a6e5a), tileDk: lam(0x4a4e40), tileGreen: lam(0x3a5446), iron: lam(0x3a3c40), ironDk: lam(0x24262a),
      pipe: lam(0x5a3a26), pipeGreen: lam(0x2e4a3a), cable: lam(0x16161a), rail: lam(0x7a7c80), sleeper: lam(0x2a2420), slime: lam(0x3a5a2a),
      water: new THREE.MeshLambertMaterial({ color: 0x14302a, transparent: true, opacity: 0.88, emissive: 0x041410 }),
      waterHi: new THREE.MeshBasicMaterial({ color: 0x2a6a5a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
      sign: lam(0x000000, { emissive: 0x9ad070 }), board: lam(0x000000, { emissive: 0xffa040 }), clock: lam(0x000000, { emissive: 0xd8e0b0 }),
      lamp: lam(0x000000, { emissive: 0xffc860 }), lampGreen: lam(0x000000, { emissive: 0x7aff9a }), stained: lam(0x000000, { emissive: 0x4ab0a0 }),
    };
    super.build(w);
    this.def.name = this.area.name;
  }
  buildingMats(w, b) {
    const S = this.S;
    return { wall: b.kind === 'works' || b.kind === 'barracks' ? S.iron : b.kind === 'chapel' ? S.tile : vh(b.cx, b.cz, 4) < 0.5 ? S.tileDk : S.tileGreen, trim: b.kind === 'works' ? S.pipe : S.ironDk };
  }
  windowMat(w, b, lit) { return b.kind === 'works' ? this.S.stained : b.kind === 'chapel' ? (lit ? this.S.board : this.S.sign) : lit ? this.S.lamp : w.mats.logDark; }
  // ceilings: ducts and vents over the rooms, the cathedral's pipe-organ stacks, the concourse's dead clock tower
  roofDetail(w, b, W, D, wall, trim) {
    const S = this.S, M = w.mats;
    for (let x = b.x0 + 1.5; x < b.x1 - 1; x += 4) w.box(0.6, 0.5, D - 0.6, S.ironDk, x, b.h + 0.55, b.cz); // ribs over the ceiling
    w.box(W * 0.7, 0.4, 0.5, S.pipe, b.cx, b.h + 0.5, b.z0 + 1.2); // a duct
    if (vh(b.cx, b.cz, 8) < 0.5) for (let k = 0; k < 3; k++) w.cyl(0.25, 0.3, 0.8, S.iron, b.x0 + 2 + k * 1.2, b.h + 0.6, b.z1 - 1.6, 6); // vents
    if (b.kind === 'works') for (let k = 0; k < 7; k++) { const h = 3 + Math.abs(k - 3) * -0.6 + 3; w.cyl(0.38, 0.42, h, k % 2 ? S.pipe : S.pipeGreen, b.x0 + W * (0.2 + k * 0.1), b.h + h / 2, b.z0 + 2.4, 8); w.cyl(0.46, 0.46, 0.2, M.brass, b.x0 + W * (0.2 + k * 0.1), b.h + h, b.z0 + 2.4, 8); }
    if (b.kind === 'chapel') { w.box(3, 5, 3, S.tileDk, b.cx, b.h + 2.5, b.z1 - 2.5); w.cyl(1.0, 1.0, 0.2, M.brass, b.cx, b.h + 3.6, b.z1 - 0.98, 16); const face = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), S.clock); face.position.set(b.cx, b.h + 3.6, b.z1 - 0.86); w.add(face); w.box(0.06, 0.6, 0.04, M.logDark, b.cx, b.h + 3.8, b.z1 - 0.82); w.box(0.4, 0.06, 0.04, M.logDark, b.cx + 0.15, b.h + 3.6, b.z1 - 0.82); }
    if (b.kind === 'barracks') for (const t of [0.3, 0.7]) { w.box(0.4, 4, 0.4, S.ironDk, b.x0 + 1, b.h + 2, b.z0 + (b.z1 - b.z0) * t); w.box(0.4, 4, 0.4, S.ironDk, b.x1 - 1, b.h + 2, b.z0 + (b.z1 - b.z0) * t); w.box(W - 1.6, 0.5, 0.5, S.iron, b.cx, b.h + 4, b.z0 + (b.z1 - b.z0) * t); } // a gantry
  }
  // the walls outside: a pipe run at shoulder height, a cable sagging, a name plate by each doorway
  decorateBuilding(w, b, segs) {
    const S = this.S;
    for (const s of segs) {
      if (!s.outer || s.door || s.a1 - s.a0 < 1.5) continue;
      const out = (s.outer === 's' || s.outer === 'e') ? 1 : -1, len = s.a1 - s.a0, mid = (s.a0 + s.a1) / 2, off = s.line + out * 0.42;
      const put = (ln, h, d, mat, y, o = off) => (s.alongX ? w.box(ln, h, d, mat, mid, y, o) : w.box(d, h, ln, mat, o, y, mid));
      put(len, 0.16, 0.16, vh(mid, s.line, 3) < 0.5 ? S.pipe : S.pipeGreen, 2.3);
      put(len, 0.06, 0.06, S.cable, 2.9, s.line + out * 0.36);
      put(len, 0.25, 0.08, S.ironDk, 0.12, s.line + out * 0.3); // a kerb
    }
    for (const d of b.doors) {
      if (b.yard) continue;
      const [o] = this.doorPos(b, d), alongX = d.s === 'n' || d.s === 's', side = d.s === 's' || d.s === 'e' ? 0.36 : -0.36;
      const px = alongX ? o.x + 1.9 : (d.s === 'w' ? b.x0 : b.x1) + side, pz = alongX ? (d.s === 'n' ? b.z0 : b.z1) + side : o.z + 1.9;
      w.box(alongX ? 1.1 : 0.06, 0.3, alongX ? 0.06 : 1.1, S.ironDk, px, 2.3, pz);
      w.box(alongX ? 0.8 : 0.07, 0.12, alongX ? 0.07 : 0.8, b.kind === 'works' ? S.stained : S.sign, px, 2.3, pz);
    }
  }

  // ---------- the tunnels ----------
  // tiled rock walls, iron ribs every few metres, a pipe run and cables along both faces, hazard lamps here and there
  wallLook(w, R, len, mid) {
    const S = this.S, M = w.mats;
    let hMax = 0;
    for (let a = 0; a < len - 0.05; a += 2) {
      const e = Math.min(len, a + 2), c = (a + e) / 2, h = 3.4 + vh(a + R.x0, mid + R.z0, 3) * 0.9;
      hMax = Math.max(hMax, h);
      const put = (lw, hh, d, mat, y, o = 0) => (R.alongX ? w.box(e - a + lw, hh, d, mat, R.x0 + c, y, mid + o) : w.box(d, hh, e - a + lw, mat, mid + o, y, R.z0 + c));
      put(0.02, h, 0.9, vh(c, mid, 5) < 0.8 ? S.rock : S.rockDk, h / 2);
      for (const s of [-1, 1]) {
        put(0, 0.9, 0.06, vh(c, mid, 6) < 0.85 ? S.tile : S.tileDk, 1.25, s * 0.46); // a band of old tiles
        put(0, 0.08, 0.08, S.ironDk, 1.75, s * 0.47);
        put(0, 0.14, 0.14, (c | 0) % 3 ? S.pipe : S.pipeGreen, 2.55, s * 0.52); // the pipe run
        put(0, 0.05, 0.05, S.cable, 2.95, s * 0.5);
        if (vh(c, mid, 9) < 0.2) put(-1.2, 0.5, 0.05, S.slime, 0.25, s * 0.46); // slime at the foot
      }
    }
    // iron ribs across the wall, every 4 m
    for (let a = 1; a < len - 0.5; a += 4) {
      const x = R.alongX ? R.x0 + a : mid, z = R.alongX ? mid : R.z0 + a;
      w.box(R.alongX ? 0.3 : 1.2, hMax + 0.3, R.alongX ? 1.2 : 0.3, S.ironDk, x, (hMax + 0.3) / 2, z);
      for (const s of [-1, 1]) w.box(0.12, 0.12, 0.12, M.brass, R.alongX ? x : mid + s * 0.62, 2.0, R.alongX ? mid + s * 0.62 : z);
      // a hazard lamp in a cage now and then, lighting the tunnel
      if (vh(x, z, 11) < 0.28) {
        const s = vh(x, z, 12) < 0.5 ? -1 : 1, lx = R.alongX ? x : mid + s * 0.7, lz = R.alongX ? mid + s * 0.7 : z;
        w.box(0.26, 0.26, 0.26, S.ironDk, lx, 2.7, lz); w.box(0.18, 0.18, 0.18, vh(x, z, 13) < 0.3 ? S.lampGreen : S.lamp, lx, 2.7, lz);
        w.lights.push({ x: lx, y: 2.6, z: lz, color: vh(x, z, 13) < 0.3 ? 0x7aff9a : 0xffb050, power: 5, range: 8, src: {} });
      }
    }
    // silt and debris along the foot of it
    for (let a = 0.8; a < len - 0.4; a += 2.2) for (const s of [-1, 1]) {
      const off = s * (0.8 + vh(a, s, 1) * 0.3), x = R.alongX ? R.x0 + a : mid + off, z = R.alongX ? mid + off : R.z0 + a;
      if (vh(x, z, 4) < 0.55) w.rock(x, z, 0.22 + vh(x, z) * 0.2, true);
    }
    return hMax;
  }
  // a chokepoint: a carriage on its side, crates and sandbags
  chokePiece(w, x, z) {
    const S = this.S, M = w.mats, k = vh(x, z, 7);
    if (k < 0.4) { w.box(0.9, 1.2, 0.9, S.iron, x, 0.6, z, vh(x, z, 4)); w.box(0.7, 0.3, 0.92, M.rust, x, 1.0, z, vh(x, z, 4)); w.box(0.5, 0.25, 0.94, S.lamp, x, 0.75, z, vh(x, z, 4)); }
    else if (k < 0.7) w.crate(x, z, 0.75);
    else { w.box(0.9, 0.35, 0.6, M.cloth, x, 0.18, z, vh(x, z, 2)); w.box(0.9, 0.35, 0.6, M.cloth, x, 0.52, z, vh(x, z, 3)); }
  }
  // the flooded channels: down the middle of about half the tunnels (never the gate's), slow water with a sheen and
  // floating scum
  laneWalls(w) {
    super.laneWalls(w);
    const S = this.S;
    this.channels = [];
    for (const e of this.open) {
      if (e === 'v3,5' || vh(e.length, e.charCodeAt(1) * 7 + e.charCodeAt(3) * 13, 21) > 0.5) continue;
      const R = edgeRect(e), cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2, len = R.alongX ? R.x1 - R.x0 + 4 : R.z1 - R.z0 + 4, wd = 1.6;
      this.at(w, cx, cz);
      const water = new THREE.Mesh(new THREE.BoxGeometry(R.alongX ? len : wd, 0.06, R.alongX ? wd : len), S.water); water.position.set(cx, 0.03, cz); w.add(water);
      const sheen = new THREE.Mesh(new THREE.PlaneGeometry(R.alongX ? len : 0.3, R.alongX ? 0.3 : len).rotateX(-Math.PI / 2), S.waterHi); sheen.position.set(cx, 0.07, cz); sheen.userData.noMerge = true; w.add(sheen);
      for (const s of [-1, 1]) w.box(R.alongX ? len : 0.12, 0.1, R.alongX ? 0.12 : len, S.ironDk, cx + (R.alongX ? 0 : s * wd / 2), 0.05, cz + (R.alongX ? s * wd / 2 : 0)); // its iron lip
      for (let a = -len / 2 + 1; a < len / 2; a += 1.1) w.slows.push({ x: R.alongX ? cx + a : cx, z: R.alongX ? cz : cz + a, r: 0.85, f: 0.6 });
      for (let k = 0; k < 3; k++) { const a = (vh(cx, cz, k) - 0.5) * len * 0.8; w.box(0.3, 0.05, 0.2, S.slime, R.alongX ? cx + a : cx + 0.2, 0.08, R.alongX ? cz - 0.2 : cz + a, vh(a, k)); } // scum
      w.ambient.push({ x: cx, z: cz, update: (dt, t) => { sheen.material.opacity = 0.25 + Math.sin(t * 1.3 + cx) * 0.08; } });
      this.channels.push({ R, wd });
    }
  }
  channelAt(x, z) { return this.channels?.some(({ R, wd }) => (R.alongX ? Math.abs(z - (R.z0 + R.z1) / 2) < wd / 2 && x > R.x0 - 2 && x < R.x1 + 2 : Math.abs(x - (R.x0 + R.x1) / 2) < wd / 2 && z > R.z0 - 2 && z < R.z1 + 2)); }

  // ---------- the blocks ----------
  dressBlock(w, B) {
    const S = this.S, M = w.mats, r = w.rand, { x0, x1, z0, z1, cx, cz } = B;
    this.at(w, cx, cz);
    if (B.type === 'rubble') {
      // a cave-in: the roof came down, rock heaped highest at the back, broken girders through it
      w.solids.push({ x0, x1, z0, z1 });
      for (let x = x0 + 0.8; x < x1 - 0.4; x += 1.7) for (let z = z0 + 0.8; z < z1 - 0.4; z += 1.7) {
        const back = (z1 - z) / (z1 - z0);
        w.rock(x + (vh(x, z, 1) - 0.5), z + (vh(x, z, 2) - 0.5), 0.5 + back * 1.4 + vh(x, z) * 0.5, true);
      }
      for (let k = 0; k < 3; k++) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 7), S.ironDk); g.position.set(cx - 3 + k * 3, 1.5 + k * 0.6, cz - 1); g.rotation.set(0.4 - k * 0.3, k * 0.9, 0.2); w.add(g); }
      w.box(0.3, 0.3, 0.3, S.lampGreen, cx + 2, 0.6, cz + 3); // a dropped lamp still lit
    } else if (B.type === 'plaza') {
      // a cistern: a round basin of black water inside a broken stone kerb, columns round it holding up nothing, a
      // lamp on each; a shrine stands in the middle of the water
      const basin = new THREE.Mesh(new THREE.CircleGeometry(5.4, 28), S.water); basin.rotation.x = -Math.PI / 2; basin.position.set(cx, 0.035, cz); w.add(basin);
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2; if (k % 6 === 0) continue; // (four gaps in the kerb)
        w.box(1.35, 0.32, 0.4, M.stoneDark, cx + Math.cos(a) * 5.6, 0.16, cz + Math.sin(a) * 5.6, -a + Math.PI / 2);
      }
      for (let k = 0; k < 6; k++) w.slows.push({ x: cx + Math.cos(k) * 2.4, z: cz + Math.sin(k) * 2.4, r: 2.4, f: 0.75 });
      for (const [px, pz] of [[x0 + 1.2, z0 + 1.2], [x1 - 1.2, z0 + 1.2], [x0 + 1.2, z1 - 1.2], [x1 - 1.2, z1 - 1.2]]) {
        w.pillar(px, pz, 4.5, vh(px, pz) < 0.3); w.ob(px, pz, 0.55);
        w.box(0.3, 0.3, 0.3, S.lamp, px + (px < cx ? 0.5 : -0.5), 2.6, pz + (pz < cz ? 0.5 : -0.5));
        w.lights.push({ x: px + (px < cx ? 0.6 : -0.6), y: 2.6, z: pz + (pz < cz ? 0.6 : -0.6), color: 0xffb050, power: 5, range: 8, src: {} });
      }
      bones(w, x0 + 2, z1 - 1.4); sacks(w, x1 - 1.5, z0 + 1.6);
      w.ambient.push({ x: cx, z: cz, update: (dt, t, fx) => { if (Math.random() < dt * 0.8) fx.add.spawn({ x: cx + (Math.random() - 0.5) * 9, y: 0.1, z: cz + (Math.random() - 0.5) * 9, vy: 0, life: 0.8, size: 0.05, size1: 0.6, r: 0.2, g: 0.45, b: 0.38, alpha: 0.4 }); } }); // ripples
    }
  }

  // what's inside each room
  furnish(w, b) {
    const S = this.S, M = w.mats, r = w.rand;
    this.at(w, b.cx, b.cz);
    const { spot } = this.freeIn(w, b);
    if (b.basement) this.placeStair(w, b);
    const W = b.x1 - b.x0, D = b.z1 - b.z0;
    const solid = (x, z, ww, dd) => w.solids.push({ x0: x - ww / 2, x1: x + ww / 2, z0: z - dd / 2, z1: z + dd / 2 });
    const lamp = (x, z, col = 0x9ad0aa) => { w.box(0.08, 2.4, 0.08, S.ironDk, x, 1.2, z); w.box(0.3, 0.22, 0.3, col === 0x9ad0aa ? S.lampGreen : S.lamp, x, 2.45, z); w.lights.push({ x, y: 2.4, z, color: col, power: 4, range: 7, src: {} }); };
    if (b.kind === 'chapel') {
      // Station Ninefold's concourse: two rows of tiled pillars, benches between, the regime saint on a plinth in the
      // middle (his face chiselled off), ticket booths along the north wall, a destination board that still flickers
      for (let x = b.x0 + 3; x < b.x1 - 2; x += 4.2) if (Math.abs(x - b.cx) > 3) for (const z of [b.z0 + 3.4, b.z1 - 3.4]) { w.pillar(x, z, 5.5, vh(x, z, 3) < 0.2); w.ob(x, z, 0.5); w.box(0.9, 0.8, 0.9, S.tile, x, 1.2, z); }
      w.box(2.4, 1.0, 2.4, M.stoneDark, b.cx, 0.5, b.cz); w.box(1.8, 0.3, 1.8, M.stone, b.cx, 1.15, b.cz); solid(b.cx, b.cz, 2.4, 2.4);
      const saint = new THREE.Group(); saint.position.set(b.cx, 1.3, b.cz);
      for (const [ww, hh, dd, mat, px, py, pz] of [[0.9, 1.6, 0.6, M.stone, 0, 0.8, 0], [0.4, 0.45, 0.4, M.stoneDark, 0, 1.85, 0], [1.6, 0.25, 0.25, M.stone, 0, 1.3, 0.1], [0.12, 2.6, 0.12, M.brass, 0.6, 1.2, 0.3], [1.0, 1.1, 0.12, M.stoneDark, 0, 0.9, -0.36]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, dd), mat); m.position.set(px, py, pz); saint.add(m); // (a robed saint, his staff, a cloak; the face gone)
      }
      w.add(saint);
      candles(w, b.cx - 1, b.cz + 1.5, 5);
      for (let x = b.x0 + 4; x < b.x1 - 3; x += 2.6) if (Math.abs(x - b.cx) > 3) { w.box(1.8, 0.45, 0.5, M.logDark, x, 0.45, b.cz + 4); w.box(1.8, 0.6, 0.1, M.logDark, x, 0.75, b.cz + 4.25); }
      for (let k = 0; k < 3; k++) { const x = b.x0 + 3 + k * 3; w.box(2, 2.4, 1.2, S.iron, x, 1.2, b.z0 + 0.95); w.box(1.6, 0.6, 0.05, S.board, x, 1.7, b.z0 + 1.56); solid(x, b.z0 + 0.95, 2, 1.2); }
      w.box(6, 0.9, 0.12, S.ironDk, b.cx + 6, 3.2, b.z0 + 0.6); w.box(5.6, 0.6, 0.06, S.board, b.cx + 6, 3.2, b.z0 + 0.68); // the departures board
      lamp(b.x0 + 2, b.z1 - 2, 0xffb050); lamp(b.x1 - 2, b.z1 - 2, 0xffb050);
      w.lights.push({ x: b.cx, y: 2, z: b.cz + 1.5, color: 0xffb060, power: 3, range: 6, src: {} });
      return;
    }
    if (b.kind === 'works') {
      // the Pump Cathedral: one huge engine in the middle (a boiler drum, flywheels, pistons, a manifold), candles and
      // offerings round its foot, prayer strips on its pipes; a stained-glass control window glowing on the north wall
      const ex = b.cx, ez = b.cz + 1;
      w.cyl(2.0, 2.2, 3.4, S.iron, ex, 1.7, ez, 12); w.cyl(2.25, 2.25, 0.25, M.brass, ex, 3.4, ez, 12); w.cyl(1.4, 1.6, 1.4, S.ironDk, ex, 4.1, ez, 10);
      for (const s of [-1, 1]) {
        const fw = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 6, 16), S.ironDk); fw.position.set(ex + s * 3, 1.6, ez); fw.rotation.y = Math.PI / 2; w.add(fw);
        w.box(0.3, 0.3, 2.6, S.iron, ex + s * 3, 1.6, ez); w.box(0.5, 3.2, 0.5, S.pipe, ex + s * 2.4, 1.6, ez - 1.6);
        w.box(0.8, 0.3, 0.5, M.hazard, ex + s * 2.4, 3.3, ez - 1.6);
      }
      solid(ex, ez, 7.6, 4.8);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; candles(w, ex + Math.cos(a) * 4.4, ez + Math.sin(a) * 2.9, 2); }
      for (let k = 0; k < 6; k++) w.box(0.06, 0.4, 0.02, M.bone, ex - 1.5 + k * 0.6, 2.2, ez + 2.23); // prayer strips
      w.box(5, 3, 0.1, S.ironDk, b.cx, 4.6, b.z0 + 0.35); w.box(4.4, 2.6, 0.06, S.stained, b.cx, 4.6, b.z0 + 0.42);
      for (let k = -2; k <= 2; k++) w.box(0.08, 2.6, 0.08, S.ironDk, b.cx + k * 0.9, 4.6, b.z0 + 0.46);
      w.lights.push({ x: ex, y: 3.6, z: ez + 3, color: 0xffb060, power: 7, range: 10, src: {} });
      w.lights.push({ x: b.cx, y: 4, z: b.z0 + 1.5, color: 0x4ab0a0, power: 5, range: 9, src: {} });
      for (let k = 0; k < 3; k++) { const p = spot(1); if (p) w.drums.push(buildDrum(w, p.x, p.z, true)); }
      return;
    }
    if (b.kind === 'barracks') {
      // the Sluice Works: a drained channel down the middle (walk in it), two floodgates hanging from chains over it,
      // winches either side
      const cx = b.cx, z0 = b.z0 + 2, z1 = b.z1 - 2;
      w.box(3, 0.04, z1 - z0, S.rockDk, cx, 0.02, (z0 + z1) / 2);
      for (const s of [-1, 1]) w.box(0.3, 0.3, z1 - z0, S.ironDk, cx + s * 1.6, 0.15, (z0 + z1) / 2);
      for (const t of [0.3, 0.7]) {
        const z = b.z0 + D * t;
        w.box(3.4, 1.8, 0.3, S.iron, cx, 3.6, z); for (let k = 0; k < 4; k++) w.box(3.4, 0.08, 0.34, M.hazard, cx, 2.9 + k * 0.45, z);
        for (const s of [-1, 1]) { w.box(0.06, 2.2, 0.06, M.metal, cx + s * 1.4, 5.6, z); w.box(0.4, 2, 0.4, S.ironDk, cx + s * 1.9, 1, z); }
        for (const s of [-1, 1]) { const wx = cx + s * 3.6; w.cyl(0.5, 0.5, 1.0, S.iron, wx, 0.9, z, 8); w.box(1.4, 0.4, 0.8, S.ironDk, wx, 0.2, z); solid(wx, z, 1.4, 1.0); }
      }
      lamp(b.x0 + 1.5, b.cz); lamp(b.x1 - 1.5, b.cz, 0xffb050);
      for (let k = 0; k < 3; k++) { const p = spot(1); if (p) w.drums.push(buildDrum(w, p.x, p.z, true)); }
      return;
    }
    if (b.yard) {
      // a pump yard behind a cage: a squat pump on its pad, valve wheels, a drum or two, a dead worker
      const p = spot(2.2);
      if (p) { w.box(1.6, 1.2, 1.2, S.iron, p.x, 0.6, p.z); w.cyl(0.35, 0.35, 0.8, S.pipe, p.x + 0.9, 0.9, p.z, 8); const wh = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 4, 10), M.rust); wh.position.set(p.x, 1.4, p.z + 0.62); w.add(wh); w.solids.push({ x0: p.x - 0.8, x1: p.x + 1.3, z0: p.z - 0.6, z1: p.z + 0.6 }); }
      for (let k = 0; k < 2; k++) { const q = spot(1.2); if (q) (r() < 0.5 ? cage : corpse)(w, q.x, q.z, r() * 6); }
      const q = spot(1); if (q) bloodStain(w, q.x, q.z, 1);
      return;
    }
    // a station: a platform edge along one side (yellow line, a drop to the rails), benches, a pillar or two, a dead
    // destination board; a collapsed one has rock through the roof and a pool of black water
    const ns = W > D || vh(b.cx, b.cz, 2) < 0.5;
    const ex = ns ? b.cx : b.x0 + 1.2, ez = ns ? b.z0 + 1.2 : b.cz, lw = ns ? W - 1.2 : 0.3, ld = ns ? 0.3 : D - 1.2;
    if (!b.doors.some((d) => d.s === (ns ? 'n' : 'w'))) {
      w.box(ns ? lw : 1.2, 0.03, ns ? 1.2 : ld, S.sleeper, ns ? ex : ex - 0.3, 0.02, ns ? ez - 0.3 : ez); // the rail bed
      for (const o of [-0.25, 0.25]) w.box(ns ? lw : 0.06, 0.06, ns ? 0.06 : ld, S.rail, ns ? ex : ex - 0.3 + o, 0.05, ns ? ez - 0.3 + o : ez);
      w.box(ns ? lw : 0.12, 0.02, ns ? 0.12 : ld, M.hazard, ns ? ex : ex + 0.4, 0.04, ns ? ez + 0.4 : ez);
    }
    w.box(ns ? 2.6 : 0.08, 0.5, ns ? 0.08 : 2.6, S.ironDk, b.cx, 2.7, ns ? b.z0 + 0.32 : b.cz); w.box(ns ? 2.2 : 0.06, 0.3, ns ? 0.06 : 2.2, vh(b.cx, b.cz, 5) < 0.6 ? S.board : M.logDark, b.cx, 2.7, ns ? b.z0 + 0.38 : b.cz);
    const n = Math.min(5, Math.floor(W * D / 32));
    for (let k = 0; k < n; k++) {
      const p = spot(1.0); if (!p) continue;
      const q = r();
      if (q < 0.3) { w.box(1.6, 0.45, 0.5, M.logDark, p.x, 0.3, p.z, ns ? 0 : Math.PI / 2); w.ob(p.x, p.z, 0.6); }
      else if (q < 0.45) { w.pillar(p.x, p.z, b.h - 0.2, b.ruin); w.ob(p.x, p.z, 0.5); }
      else if (q < 0.6) w.crate(p.x, p.z);
      else if (q < 0.75) corpse(w, p.x, p.z, r() * 6);
      else if (q < 0.88) bones(w, p.x, p.z);
      else sacks(w, p.x, p.z);
    }
    if (b.ruin) {
      const p = spot(1.6); if (p) { w.rock(p.x, p.z, 1.0, true, true); w.pool(p.x + 1.5, p.z + 0.5, 1.2); }
      if (r() < 0.6) { const q = spot(1); if (q) lamp(q.x, q.z, 0xffb050); }
    } else if (r() < 0.35) { const q = spot(1); if (q) lamp(q.x, q.z); }
  }

  // the way down: a manhole shaft with a ladder, a guard rail in hazard paint, a red lamp
  stairDown(w, x, z) {
    const M = w.mats, S = this.S;
    w.cyl(0.95, 0.95, 0.06, M.ash, x, 0.03, z, 12);
    w.cyl(1.05, 1.05, 0.12, S.ironDk, x, 0.06, z, 12);
    for (let k = 0; k < 4; k++) w.box(0.7, 0.04, 0.06, M.metal, x, 0.08, z - 0.5 + k * 0.33);
    for (const s of [-1, 1]) { w.box(0.08, 1.0, 0.08, M.hazard, x + s * 1.05, 0.5, z - 0.6); w.box(0.08, 1.0, 0.08, M.hazard, x + s * 1.05, 0.5, z + 0.6); w.box(0.08, 0.08, 1.3, M.hazard, x + s * 1.05, 1.0, z); }
    w.box(0.2, 0.2, 0.2, M.glowRed, x, 1.6, z - 1.1);
    w.lights.push({ x, y: 1.6, z: z - 1.0, color: 0xff3a24, power: 4, range: 5, src: {} });
  }

  // the maintenance lift you came down by: a cage on rails, a work-crew's camp of tarps, lamps and crates, the beacon
  camp(w) {
    const M = w.mats, S = this.S, z0 = EDGE, cx = 0;
    this.at(w, 0, EDGE + 4);
    // the lift shaft at the south end (its gate is the way out): rails up into the dark either side, a winch house
    for (const s of [-1, 1]) { w.box(0.3, 12, 0.3, S.ironDk, cx + s * 2.6, 6, z0 + 14.2); w.box(0.18, 12, 0.18, S.rail, cx + s * 2.3, 6, z0 + 14.2); for (let y = 1.5; y < 12; y += 2.5) w.box(0.12, 0.12, 0.9, S.ironDk, cx + s * 2.6, y, z0 + 14.6, 0.5); }
    w.box(5.6, 0.4, 1.4, S.iron, cx, 5.4, z0 + 14.2); w.box(5.6, 0.12, 1.5, M.hazard, cx, 5.15, z0 + 14.2);
    w.box(1.4, 1.2, 1.2, S.ironDk, cx + 4.6, 0.6, z0 + 12.6); w.cyl(0.4, 0.4, 0.9, S.iron, cx + 4.6, 1.5, z0 + 12.6, 8);
    for (const s of [-1, 1]) {
      w.box(0.8, 0.8, 11, M.cloth, s * 7.6, 0.4, z0 + 6.5); // sandbags
      const tarp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 2.6), M.cloth); tarp.position.set(s * 5, 2.0, z0 + 6); tarp.rotation.z = s * 0.25; w.add(tarp);
      for (const dz of [-1.2, 1.2]) w.box(0.08, 2.0, 0.08, S.ironDk, s * 6.4, 1.0, z0 + 6 + dz);
      w.crate(s * 5.2, z0 + 3.2); w.crate(s * 5.9, z0 + 3.6, 0.6);
      w.box(0.3, 0.3, 0.3, S.lamp, s * 3.4, 2.4, z0 + 1); w.box(0.08, 2.3, 0.08, S.ironDk, s * 3.4, 1.15, z0 + 1);
      w.lights.push({ x: s * 3.4, y: 2.4, z: z0 + 1, color: 0xffc070, power: 6, range: 9, src: {} });
    }
    w.brazier(5.5, z0 + 8.5, { light: true });
    const fire = w.bonfire(cx, z0 + 2.3); fire.lit = true;
    candles(w, cx - 1.4, z0 + 1.9, 4);
    this.startAt = { x: cx, z: z0 + 9 };
    this.exitDoor(w, cx, EDGE + 13.4, 0, 1, 'Ride the lift back up');
  }
  // round the edge: bare black rock, tiled where the old tunnels ran into it, with the odd sealed bulkhead
  rim(w) {
    const S = this.S, E = EDGE + 3;
    for (let a = -E; a <= E; a += 4) {
      for (const [x, z, alongX] of [[a, -E, true], [-E, a, false], [E, a, false]]) {
        this.at(w, Math.max(-EDGE, Math.min(EDGE, x)), Math.max(-EDGE, Math.min(EDGE, z)));
        const h = 6 + vh(x, z) * 5;
        w.box(alongX ? 4.2 : 4, h, alongX ? 4 : 4.2, vh(x, z, 2) < 0.7 ? S.rock : S.rockDk, x, h / 2, z);
        if (vh(x, z, 4) < 0.25) { w.box(alongX ? 2.4 : 4.1, 2.8, alongX ? 4.1 : 2.4, S.ironDk, x, 1.4, z); w.box(alongX ? 0.4 : 4.15, 0.4, alongX ? 4.15 : 0.4, S.lampGreen, x, 2.6, z); } // a sealed bulkhead
        else if (vh(x, z, 5) < 0.5) w.box(alongX ? 4.2 : 4.1, 0.9, alongX ? 4.1 : 4.2, S.tileDk, x, 1.3, z);
      }
      if (Math.abs(a) > 9) { this.at(w, a, EDGE); w.rock(a, E - 1, 0.6 + vh(a, 5) * 0.5, true); }
    }
  }
}
City.MAPS.sump = Sump;

// ---------- the Sump Lines' chests and drums ----------
CHEST_LOOKS.sump = {
  // a pressure locker: a riveted steel crate on skids, a porthole gauge, a valve-wheel lock in its rarity's light,
  // hazard chevrons, a hose coiled on top; the lid swings up on a piano hinge. The hoard's is a bunker strongbox with
  // two wheels and a stencilled regime eagle
  chest(w, x, z, yaw, big, rarity, { rarityHex, LOCKED }) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.userData.noMerge = true;
    if (big) g.scale.setScalar(1.5);
    const M = w.mats, steel = new THREE.MeshLambertMaterial({ color: 0x4e5452, flatShading: true }), dark = new THREE.MeshLambertMaterial({ color: 0x24282a, flatShading: true });
    const part = (geo, mat, px, py, pz, parent = g, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
    const W = 1.15, D = 0.72, H = 0.55;
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(W + 0.1, 0.1, 0.12), dark, 0, 0.05, s * D * 0.36); // skids
    part(new THREE.BoxGeometry(W, H, D), steel, 0, 0.1 + H / 2, 0);
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.06, H + 0.02, D + 0.03), dark, s * (W / 2 - 0.05), 0.1 + H / 2, 0); // corner ribs
    for (let k = 0; k < 6; k++) part(new THREE.BoxGeometry(0.035, 0.035, 0.02), M.brass, -W / 2 + 0.12 + k * 0.18, 0.18, D / 2 + 0.01); // rivets
    for (let k = 0; k < 3; k++) part(new THREE.BoxGeometry(0.14, 0.05, 0.02), M.hazard, -0.38 + k * 0.17, 0.3, D / 2 + 0.012, g, 0, 0, 0.6); // chevrons
    part(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10), M.brass, 0.36, 0.42, D / 2 + 0.015, g, Math.PI / 2); // the gauge
    part(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 10), new THREE.MeshBasicMaterial({ color: 0xd8e0b0 }), 0.36, 0.42, D / 2 + 0.03, g, Math.PI / 2);
    const lid = new THREE.Group(); lid.position.set(0, 0.1 + H, -D / 2); g.add(lid);
    part(new THREE.BoxGeometry(W + 0.04, 0.12, D + 0.04), steel, 0, 0.06, D / 2, lid);
    part(new THREE.BoxGeometry(W - 0.2, 0.05, D - 0.2), dark, 0, 0.14, D / 2, lid);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 4, 10), dark); hose.rotation.x = Math.PI / 2; hose.position.set(-0.3, 0.16, D / 2); lid.add(hose);
    if (big) { part(new THREE.BoxGeometry(0.34, 0.03, 0.2), M.brass, 0.25, 0.16, D / 2, lid); part(new THREE.BoxGeometry(0.12, 0.03, 0.34), M.brass, 0.25, 0.165, D / 2, lid); } // the eagle, stencilled
    // the lock: a valve wheel on the front, its hub lit
    const glow = new THREE.MeshBasicMaterial({ color: LOCKED });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 4, 10), M.rust); wheel.position.set(-0.05, 0.1 + H - 0.14, D / 2 + 0.04); g.add(wheel);
    for (let k = 0; k < 2; k++) part(new THREE.BoxGeometry(0.24, 0.025, 0.02), M.metal, -0.05, 0.1 + H - 0.14, D / 2 + 0.04, g, 0, 0, k * Math.PI / 2);
    const lock = part(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), glow, -0.05, 0.1 + H - 0.14, D / 2 + 0.06, g, Math.PI / 2);
    if (big) { const w2 = wheel.clone(); w2.position.x = 0.3; g.add(w2); }
    const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({ color: rarityHex(rarity), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; g.add(halo);
    w.add(g);
    return { group: g, lid, lock, halo, glow };
  },
  // a promethium canister: tall, dented, black-green with a hazard band and a valve on top; a dark slick under it.
  // The plain ones are rusted water drums
  drum(w, x, z, plain) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.noMerge = true;
    const M = w.mats, body = new THREE.MeshLambertMaterial({ color: plain ? 0x4a3a2a : 0x223a2e, flatShading: true });
    const part = (geo, mat, py, px = 0, pz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); return m; };
    part(new THREE.CylinderGeometry(0.32, 0.34, 1.1, 8), body, 0.55);
    for (const y of [0.15, 0.95]) part(new THREE.CylinderGeometry(0.355, 0.355, 0.07, 8), M.metal, y);
    if (!plain) { part(new THREE.CylinderGeometry(0.345, 0.345, 0.16, 8), M.hazard, 0.55); part(new THREE.BoxGeometry(0.12, 0.1, 0.02), new THREE.MeshBasicMaterial({ color: 0x9ad070 }), 0.75, 0, 0.34); }
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 6), M.metal, 1.16, 0.12, 0); part(new THREE.BoxGeometry(0.2, 0.03, 0.03), M.rust, 1.24, 0.12, 0);
    const slick = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), new THREE.MeshBasicMaterial({ color: 0x0a0c0a, transparent: true, opacity: 0.6, depthWrite: false })); slick.rotation.x = -Math.PI / 2; slick.position.set(0.15, 0.025, 0.1); g.add(slick);
    w.add(g);
    return g;
  },
  debris: { stave: new THREE.MeshLambertMaterial({ color: 0x223a2e, flatShading: true }), dust: [0.3, 0.55, 0.4] },
};
