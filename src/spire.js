// Saint Orsk's Spire (regions.js r1a3; docs/region1-areas.md): the high augur's cathedral-fortress on the ward's edge.
// The same maze as the ward (city.js) with its own plan, dressed as a holy fortress at dusk: the lanes are cloister
// walks between buttressed walls of pale stone and black basalt, blind arcades with pointed arches, gold trim and
// candle niches; the ground climbs in three terraces (steps across the walks between them); the blocks are small
// chapels (pews, an altar, icons), roofless chapels, bell-yards with graves, cloister garths (the squares: statues of
// penitents, dead trees) and ossuary heaps; the three big ones are the Great Nave (columns, a cracked window, the
// Eye over the altar), the Bell Foundry (a furnace, moulds, a half-cast bell) and the Augury Well (a shaft of violet
// light ringed by the seers' chairs). Pitched slate roofs with pinnacles. Its own chests (reliquaries) and drums
// (offering urns), and its own shrine: the choir bells.
import * as THREE from 'three';
import { City, GRID } from './city.js';
import { CHEST_LOOKS, buildDrum } from './chests.js';
import { candles, bones, corpse, robed, crows, bloodStain, skullStake, drift } from './decor.js';

const { N, EDGE, UNDER, T, X, inside, vh, edgeRect } = GRID;

export const SPIRE = {
  seed: 0x5917e,
  blocks: [
    ['house', 'house', 'barracks', 'house', 'ruin', 'house'],
    ['yard', 'plaza', 'merged', 'house', 'plaza', 'yard'],
    ['house', 'house', 'house', 'chapel', 'merged', 'house'],
    ['ruin', 'works', 'yard', 'house', 'ruin', 'house'],
    ['house', 'merged', 'plaza', 'house', 'plaza', 'house'],
    ['house', 'ruin', 'house', 'yard', 'house', 'rubble'],
  ],
  merged: ['h2,1', 'v4,2', 'h1,4'], loops: 2,
  boss: ['0,2', '2,3', '3,1'], vaults: ['0,0', '2,0', '5,4'], squares: ['1,1', '1,4', '4,2', '4,4'],
  shrines: { must: 'bells', pool: ['elite', 'circle', 'altar'] },
  arena: { name: 'The Bell Foundry' },
  under: { vault: 'The Catacombs', boss: 'The Seers\' Cells', cache: 'The Sealed Reliquary' },
};
// the terraces: the walks between these junction rows climb (steps across them)
const STEP_ROWS = [1, 3];

export class Spire extends City {
  static PLAN = SPIRE;
  get look() { return 'spire'; }

  styleAt(x, z) { return x > UNDER ? super.styleAt(x, z) : 'spire'; }
  // floors: dark marble with a red runner in the chapels, foundry ash, gravel in the bell-yards, dead turf and a cross
  // of paths in the garths; each terrace a shade lighter than the one below it
  groundTint(x, z, c, n) {
    if (x > UNDER) return;
    const b = this.buildingAt(x, z);
    if (b && !b.yard) {
      if (b.kind === 'works') { c.setHex(0x2a2624).multiplyScalar(0.9 + n * 0.2); return; }
      const tile = ((Math.floor(x * 1.2) + Math.floor(z * 1.2)) & 1) ? 0.78 : 1;
      c.setHex(b.kind === 'barracks' ? 0x3a3448 : 0x4a4648).multiplyScalar(tile * (0.92 + n * 0.08));
      if (!b.ruin && b.kind !== 'barracks' && Math.abs(x - b.cx) < 0.9 && b.kind !== 'works') c.setHex(0x5a1a18).multiplyScalar(0.9 + n * 0.1); // the runner
      if (b.ruin) c.multiplyScalar(0.82);
      return;
    }
    if (b?.yard) { c.setHex(0x3e3a36).multiplyScalar(0.85 + n * 0.25); return; }
    if (z > EDGE) { c.setHex(0x3a3634).multiplyScalar(0.9 + n * 0.15); return; }
    const B = this.blocks.find((q) => inside(q, x, z, 0.3));
    if (B?.type === 'plaza') { const path = Math.abs(x - B.cx) < 1.1 || Math.abs(z - B.cz) < 1.1 || Math.hypot(x - B.cx, z - B.cz) < 5.2; c.setHex(path ? 0x5e5a56 : 0x3a3a2a).multiplyScalar(0.9 + n * 0.15); return; }
    const terrace = z < X(STEP_ROWS[0]) + 8 ? 1.08 : z < X(STEP_ROWS[1]) + 8 ? 1.0 : 0.92;
    c.multiplyScalar(terrace);
  }

  build(w) {
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    const glow = (c) => lam(0x000000, { emissive: c });
    this.S = {
      lime: lam(0x6e685e), limeDk: lam(0x56514a), basalt: lam(0x34313a), basaltDk: lam(0x24222a), gold: lam(0x8a6a2a), goldDk: lam(0x5a4620), slate: lam(0x2a2a34), slateDk: lam(0x1e1e26),
      recess: lam(0x141218), wood: lam(0x2a1e18), red: lam(0x5a1a18), bronze: lam(0x7a5a2a), bone: lam(0xbab09a), turf: lam(0x3a3a2a),
      violet: glow(0x8a50ff), amber: glow(0xffa040), crimson: glow(0xd03020), blue: glow(0x4a7aff), candle: glow(0xffc870), eye: glow(0xc890ff), furnace: glow(0xff6a1a),
    };
    this.glassMats = [this.S.violet, this.S.amber, this.S.crimson, this.S.blue];
    super.build(w);
    // ash drifting down over the garths and the gate
    for (const B of this.blocks) if (B.type === 'plaza') drift(w, B.cx, B.cz, 'ash', 2, 12);
    drift(w, 0, EDGE + 5, 'ash', 2, 14);
  }
  buildingMats(w, b) {
    const S = this.S;
    return { wall: b.kind === 'works' ? S.basalt : b.kind === 'barracks' ? S.basaltDk : vh(b.cx, b.cz, 4) < 0.6 ? S.lime : S.limeDk, trim: b.kind === 'works' ? S.goldDk : S.gold };
  }
  // stained glass: each window its own colour, the unlit ones dark lead
  windowMat(w, b, lit) { const S = this.S; return lit || b.kind === 'chapel' || b.kind === 'barracks' ? this.glassMats[Math.floor(vh(b.cx, b.cz, 7) * 4 + (lit ? 1 : 0)) % 4] : S.recess; }
  // pitched slate roofs, pinnacles at the corners; the Nave's tower and the Eye, the Foundry's chimneys and bell-cote,
  // the Well's dome
  roofDetail(w, b, W, D, wall, trim) {
    const S = this.S;
    const along = W >= D, hd = (along ? D : W) / 2 + 0.25, a = 0.6, L = hd / Math.cos(a), rise = hd * Math.tan(a);
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(along ? W + 0.5 : L, 0.22, along ? L : D + 0.5), vh(b.cx, b.cz, s) < 0.5 ? S.slate : S.slateDk);
      if (along) { m.position.set(b.cx, b.h + 0.3 + rise / 2, b.cz + s * hd / 2); m.rotation.x = s * a; } else { m.position.set(b.cx + s * hd / 2, b.h + 0.3 + rise / 2, b.cz); m.rotation.z = -s * a; }
      w.add(m);
    }
    w.box(along ? W + 0.6 : 0.2, 0.2, along ? 0.2 : D + 0.6, S.gold, b.cx, b.h + 0.35 + rise, b.cz); // the ridge
    for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) { w.box(0.5, 1.2, 0.5, wall, x, b.h + 0.6, z); const p = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.4, 4), S.slateDk); p.position.set(x, b.h + 1.9, z); p.rotation.y = Math.PI / 4; w.add(p); w.box(0.08, 0.3, 0.08, S.gold, x, b.h + 2.7, z); }
    if (b.kind === 'chapel') {
      // the tower over the south end, the spire on it, the Eye in gold at its top
      const tx = b.cx, tz = b.z1 - 2.6;
      w.box(3.2, 9, 3.2, S.lime, tx, b.h + 4.5, tz); w.box(3.4, 0.3, 3.4, S.gold, tx, b.h + 9, tz);
      for (const s of [-1, 1]) { w.box(0.9, 2.4, 0.1, S.violet, tx + s * 0.8, b.h + 6.5, tz + 1.62); }
      const sp = new THREE.Mesh(new THREE.ConeGeometry(2.0, 7, 4), S.slateDk); sp.position.set(tx, b.h + 12.6, tz); sp.rotation.y = Math.PI / 4; w.add(sp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.12, 5, 16), S.gold); ring.position.set(tx, b.h + 16.8, tz); w.add(ring);
      w.box(0.3, 0.3, 0.3, S.eye, tx, b.h + 16.8, tz);
      w.lights.push({ x: tx, y: b.h + 16, z: tz + 1, color: 0xc890ff, power: 6, range: 14, src: {} });
    }
    if (b.kind === 'works') {
      for (const t of [0.25, 0.75]) { w.box(1.4, 6, 1.4, S.basalt, b.x0 + W * t, b.h + 3, b.z0 + 2); w.box(1.6, 0.4, 1.6, S.goldDk, b.x0 + W * t, b.h + 6, b.z0 + 2); w.box(0.9, 0.2, 0.9, S.furnace, b.x0 + W * t, b.h + 6.25, b.z0 + 2); }
      // a bell-cote over the doors
      for (const s of [-1, 1]) w.box(0.3, 3, 0.3, S.basalt, b.cx + s * 1, b.h + rise + 1.5, b.z1 - 1.5);
      w.box(2.4, 0.3, 0.5, S.basalt, b.cx, b.h + rise + 3, b.z1 - 1.5);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, 0.9, 10), S.bronze); bell.position.set(b.cx, b.h + rise + 2.3, b.z1 - 1.5); w.add(bell);
    }
    if (b.kind === 'barracks') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), S.slate); dome.position.set(b.cx, b.h + rise + 0.2, b.cz); w.add(dome);
      for (let k = 0; k < 8; k++) { const q = (k / 8) * Math.PI * 2; w.box(0.18, 1.2, 0.18, S.gold, b.cx + Math.cos(q) * 3.1, b.h + rise + 0.6, b.cz + Math.sin(q) * 3.1); }
      w.box(0.8, 0.8, 0.8, S.eye, b.cx, b.h + rise + 3.4, b.cz);
      w.lights.push({ x: b.cx, y: b.h + rise + 3, z: b.cz, color: 0xc890ff, power: 6, range: 12, src: {} });
    }
  }
  // buttresses along the outer walls, a gold band, a carved head here and there
  decorateBuilding(w, b, segs, wall, trim) {
    const S = this.S;
    for (const s of segs) {
      if (!s.outer || s.door || b.yard) continue;
      const out = (s.outer === 's' || s.outer === 'e') ? 1 : -1;
      for (let a = s.a0 + 1.6; a < s.a1 - 0.6; a += 3) {
        const at = (dx, dy, dz, ww, hh, dd, mat) => (s.alongX ? w.box(ww, hh, dd, mat, a + dx, dy, s.line + out * dz) : w.box(dd, hh, ww, mat, s.line + out * dz, dy, a + dx));
        at(0, b.h * 0.42, 0.55, 0.5, b.h * 0.84, 0.7, wall);
        at(0, b.h * 0.86, 0.4, 0.45, 0.6, 0.45, wall);
        at(0, 0.25, 0.62, 0.6, 0.5, 0.85, S.basaltDk);
        if (vh(a, s.line, 9) < 0.3) at(0, b.h - 0.5, 0.45, 0.3, 0.3, 0.4, S.limeDk); // a gargoyle's head
      }
      const len = s.a1 - s.a0, mid = (s.a0 + s.a1) / 2;
      if (s.alongX) w.box(len, 0.12, 0.08, S.gold, mid, 3.0, s.line + out * 0.29); else w.box(0.08, 0.12, len, S.gold, s.line + out * 0.29, 3.0, mid);
    }
  }

  // a building between you and the camera: the Spire's are too tall to fade to glass (towers, pitched roofs, a
  // sheet of glass over everything behind), so it drops to the stumps of its walls instead, filled with dark
  setFaded(b, on) {
    b.faded = on;
    b.tall.visible = !on && !b.cut; b.low.visible = on || b.cut;
    b.shroud.visible = on;
  }

  // ---------- the cloister walks ----------
  // pale stone and black basalt in courses, a plinth, buttresses each side, blind arcades (a dark pointed recess),
  // a gold band, crenels on top, a candle in a niche now and then
  wallLook(w, R, len, mid) {
    const S = this.S;
    let hMax = 0;
    for (let a = 0; a < len - 0.05; a += 3) {
      const e = Math.min(len, a + 3), c = (a + e) / 2, h = 4.4 + vh(a + R.x0, mid + R.z0, 3) * 0.8;
      hMax = Math.max(hMax, h + 0.5);
      const put = (lw, hh, d, mat, y, o = 0, at = c) => (R.alongX ? w.box(lw, hh, d, mat, R.x0 + at, y, mid + o) : w.box(d, hh, lw, mat, mid + o, y, R.z0 + at));
      put(e - a + 0.02, h, 0.8, vh(c, mid, 5) < 0.75 ? S.lime : S.limeDk, h / 2);
      put(e - a + 0.02, 0.5, 1.0, S.basalt, 0.25);
      for (let y = 1.2; y < h - 0.4; y += 1.1) put(e - a + 0.03, 0.06, 0.84, S.limeDk, y); // courses
      put(e - a + 0.04, 0.14, 0.9, S.gold, 3.3);
      for (const s of [-1, 1]) {
        if (e - a > 2.2) {
          put(1.3, 2.4, 0.06, S.recess, 1.9, s * 0.42);
          const arch = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.06), S.recess);
          if (R.alongX) { arch.position.set(R.x0 + c, 3.1, mid + s * 0.42); arch.rotation.z = Math.PI / 4; } else { arch.position.set(mid + s * 0.42, 3.1, R.z0 + c); arch.rotation.x = Math.PI / 4; }
          w.add(arch);
          for (const o of [-0.72, 0.72]) put(0.14, 2.6, 0.14, S.limeDk, 1.5, s * 0.45, c + o); // the colonnettes
        }
        put(0.5, h * 0.7, 0.4, S.basalt, h * 0.35, s * 0.55, a + 0.1); // a buttress
        put(0.4, 0.6, 0.3, S.basalt, h * 0.72, s * 0.5, a + 0.1);
      }
      for (let k = 0; k < 3; k++) if (k !== 1) put(0.7, 0.5, 0.82, S.lime, h + 0.25, 0, a + 0.5 + k);  // crenels
      if (vh(c, mid, 11) < 0.22) {
        const s = vh(c, mid, 12) < 0.5 ? -1 : 1;
        put(0.4, 0.5, 0.06, S.recess, 1.6, s * 0.43); put(0.1, 0.16, 0.08, S.candle, 1.5, s * 0.46);
        const lx = R.alongX ? R.x0 + c : mid + s * 0.6, lz = R.alongX ? mid + s * 0.6 : R.z0 + c;
        w.lights.push({ x: lx, y: 1.6, z: lz, color: 0xffb060, power: 3, range: 5, src: {} });
      }
    }
    return hMax;
  }
  // a chokepoint: fallen masonry, a toppled saint, scaffolding poles
  chokePiece(w, x, z) {
    const S = this.S, k = vh(x, z, 7);
    if (k < 0.4) { w.box(0.9, 0.7, 0.9, S.lime, x, 0.35, z, vh(x, z, 4)); w.box(0.6, 0.4, 0.6, S.limeDk, x + 0.1, 0.9, z, vh(x, z, 5)); }
    else if (k < 0.7) { w.box(0.5, 0.5, 1.6, S.lime, x, 0.3, z, vh(x, z, 4) * 3); w.box(0.3, 0.3, 0.3, S.limeDk, x + 0.5, 0.2, z + 0.4); }
    else { for (const o of [-0.3, 0.3]) w.box(0.08, 2.2, 0.08, S.wood, x + o, 1.1, z); w.box(0.9, 0.08, 0.5, S.wood, x, 1.6, z); w.box(0.9, 0.08, 0.5, S.wood, x, 0.8, z); }
  }
  // the terraces: steps across the walks that climb from one to the next, with a balustrade post each side
  laneWalls(w) {
    super.laneWalls(w);
    const S = this.S;
    for (const e of this.open) {
      if (e[0] !== 'v' || !STEP_ROWS.includes(+e.split(',')[1])) continue;
      const R = edgeRect(e), cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
      this.at(w, cx, cz);
      for (let k = 0; k < 4; k++) { w.box(R.x1 - R.x0, 0.05 + k * 0.03, 0.55, k % 2 ? S.limeDk : S.lime, cx, 0.02 + k * 0.015, cz - 1 + k * 0.55); w.box(R.x1 - R.x0, 0.03, 0.06, S.basaltDk, cx, 0.06 + k * 0.03, cz - 0.73 + k * 0.55); }
      for (const s of [-1, 1]) { w.box(0.35, 1.0, 0.35, S.lime, cx + s * 1.75, 0.5, cz - 1.2); w.box(0.45, 0.15, 0.45, S.gold, cx + s * 1.75, 1.05, cz - 1.2); }
    }
  }

  // ---------- the blocks ----------
  dressBlock(w, B) {
    const S = this.S, M = w.mats, { x0, x1, z0, z1, cx, cz } = B;
    this.at(w, cx, cz);
    if (B.type === 'rubble') {
      // an ossuary heap: a chapel's bones spilled out under fallen stone, a broken column through it
      w.solids.push({ x0, x1, z0, z1 });
      for (let x = x0 + 0.8; x < x1 - 0.4; x += 1.6) for (let z = z0 + 0.8; z < z1 - 0.4; z += 1.6) {
        const back = (z1 - z) / (z1 - z0);
        if (vh(x, z, 6) < 0.5) w.rock(x + (vh(x, z, 1) - 0.5), z + (vh(x, z, 2) - 0.5), 0.5 + back * 1.3 + vh(x, z) * 0.5, false);
        else { const s = 0.4 + back * 0.9; w.box(s, s * 0.6, s, S.bone, x, s * 0.3, z, vh(x, z, 3) * 3); w.box(0.22, 0.2, 0.22, S.bone, x + 0.2, s * 0.6 + 0.1, z); }
      }
      w.fallenColumn(cx - 1, cz + 1, 7, 0.6);
      crows(w, cx, cz + 2, 4);
    } else if (B.type === 'plaza') {
      // a cloister garth: dead turf, a cross of paths, a penitent statue on a plinth at each corner, dead trees, a low
      // stone kerb; the middle stays clear for a shrine
      for (const [px, pz] of [[x0 + 1.4, z0 + 1.4], [x1 - 1.4, z0 + 1.4], [x0 + 1.4, z1 - 1.4], [x1 - 1.4, z1 - 1.4]]) {
        w.box(1.2, 0.8, 1.2, S.basalt, px, 0.4, pz); w.box(1.3, 0.12, 1.3, S.gold, px, 0.82, pz); w.ob(px, pz, 0.8);
        // a penitent in stone, hooded, head bowed, hands joined
        const st = new THREE.Group(); st.position.set(px, 0.88, pz); st.rotation.y = Math.atan2(cx - px, cz - pz);
        for (const [geo, py, pzz, rx] of [[new THREE.ConeGeometry(0.42, 1.6, 6), 0.8, 0, 0], [new THREE.ConeGeometry(0.22, 0.5, 6), 1.72, 0.05, 0.3], [new THREE.BoxGeometry(0.14, 0.26, 0.14), 1.2, 0.3, 0.5]]) { const m = new THREE.Mesh(geo, S.limeDk); m.position.set(0, py, pzz); m.rotation.x = rx; st.add(m); }
        w.add(st);
        candles(w, px + (px < cx ? 0.9 : -0.9), pz, 2);
      }
      for (const [px, pz] of [[cx - 4.4, cz - 2.2], [cx + 4.4, cz + 2.2]]) { w.deadTree(px, pz, 3 + vh(px, pz) * 1.5); w.ob(px, pz, 0.4); }
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; if (k % 4 === 0) continue; w.box(1.6, 0.25, 0.3, S.limeDk, cx + Math.cos(a) * 5.5, 0.12, cz + Math.sin(a) * 5.5, -a + Math.PI / 2); }
      bloodStain(w, cx + 2.5, cz + 3, 1);
    }
  }

  furnish(w, b) {
    const S = this.S, M = w.mats, r = w.rand;
    this.at(w, b.cx, b.cz);
    const { spot } = this.freeIn(w, b);
    if (b.basement) this.placeStair(w, b);
    const W = b.x1 - b.x0, D = b.z1 - b.z0;
    const solid = (x, z, ww, dd) => w.solids.push({ x0: x - ww / 2, x1: x + ww / 2, z0: z - dd / 2, z1: z + dd / 2 });
    const altar = (x, z, s = 1) => {
      w.box(2.6 * s, 1.0, 1.0 * s, S.basalt, x, 0.5, z); w.box(2.8 * s, 0.12, 1.1 * s, S.gold, x, 1.04, z); w.box(2.4 * s, 0.06, 0.9 * s, S.red, x, 1.12, z);
      candles(w, x - 0.8 * s, z, 5); w.ob(x, z, 1.0 * s);
      w.lights.push({ x, y: 1.6, z: z + 0.9, color: 0xffb060, power: 3.5, range: 6, src: {} });
    };
    const icon = (x, z, glass) => { w.box(1.0, 1.4, 0.1, S.gold, x, 2.2, z); w.box(0.8, 1.2, 0.06, glass, x, 2.2, z + 0.04); };
    const pews = (x0, x1, z0, z1, step = 1.6) => { for (let z = z0; z < z1; z += step) for (const s of [-1, 1]) { const px = (x0 + x1) / 2 + s * (x1 - x0) / 4; w.box((x1 - x0) / 2 - 1.4, 0.45, 0.45, S.wood, px, 0.35, z); w.box((x1 - x0) / 2 - 1.4, 0.55, 0.08, S.wood, px, 0.65, z + 0.22); } };
    if (b.kind === 'chapel') {
      // the Great Nave: columns, pews, a raised altar on the north wall under a great cracked window with the Eye
      for (let x = b.x0 + 3; x < b.x1 - 2; x += 4.5) if (Math.abs(x - b.cx) > 3) for (const z of [b.z0 + 3.2, b.z1 - 2.6]) { w.pillar(x, z, 7, vh(x, z, 3) < 0.15); w.box(1.0, 0.3, 1.0, S.gold, x, 0.15, z); }
      pews(b.x0 + 2, b.x1 - 2, b.z0 + 4.6, b.z1 - 3.4, 1.8);
      w.box(5, 0.3, 2.4, S.limeDk, b.cx, 0.15, b.z0 + 1.6);
      altar(b.cx, b.z0 + 1.6, 1.4);
      w.box(5.6, 5.4, 0.14, S.basaltDk, b.cx, 4.6, b.z0 + 0.32);
      for (let k = 0; k < 5; k++) w.box(1.0, 4.8, 0.08, this.glassMats[k % 4], b.cx - 2.2 + k * 1.1, 4.6, b.z0 + 0.4);
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 5, 18), S.gold); eye.position.set(b.cx, 5.4, b.z0 + 0.5); w.add(eye); w.box(0.5, 0.5, 0.1, S.eye, b.cx, 5.4, b.z0 + 0.5);
      w.lights.push({ x: b.cx, y: 4, z: b.z0 + 2, color: 0xc890ff, power: 5, range: 10, src: {} });
      for (const s of [-1, 1]) w.banner(b.cx + s * 3.6, b.z0 + 0.9);
      return;
    }
    if (b.kind === 'works') {
      // the Bell Foundry: a furnace against the north wall pouring into a channel, two mould pits, a half-cast bell
      // hanging from chains, anvils and tongs
      const fx = b.cx, fz = b.z0 + 1.8;
      w.box(4, 3.2, 2.2, S.basalt, fx, 1.6, fz); w.box(4.2, 0.4, 2.4, S.goldDk, fx, 3.3, fz); w.box(1.8, 1.2, 0.1, S.furnace, fx, 1.0, fz + 1.12); solid(fx, fz, 4, 2.2);
      w.box(0.6, 0.06, D * 0.5, S.furnace, fx, 0.03, fz + 1.1 + D * 0.25);
      w.lights.push({ x: fx, y: 1.5, z: fz + 2, color: 0xff6a1a, power: 8, range: 10, src: {} });
      for (const s of [-1, 1]) { const mx = b.cx + s * 3.4, mz = b.cz + 2; w.cyl(1.3, 1.3, 0.4, S.basaltDk, mx, 0.2, mz, 12); w.cyl(1.0, 1.0, 0.42, S.furnace, mx, 0.2, mz, 12); w.ob(mx, mz, 1.35); }
      const bz = b.cz + 6; const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.3, 2.0, 12, 1, true), S.bronze); bell.position.set(b.cx, 2.6, bz); w.add(bell);
      for (const s of [-1, 1]) w.box(0.06, 2.4, 0.06, M.metal, b.cx + s * 0.4, 4.8, bz);
      for (let k = 0; k < 2; k++) { const p = spot(1); if (p) { w.box(0.8, 0.6, 0.4, S.basaltDk, p.x, 0.3, p.z); w.box(1.0, 0.2, 0.5, M.metal, p.x, 0.7, p.z); w.ob(p.x, p.z, 0.5); } }
      for (let k = 0; k < 3; k++) { const p = spot(1); if (p) w.drums.push(buildDrum(w, p.x, p.z, true)); }
      return;
    }
    if (b.kind === 'barracks') {
      // the Augury Well: a round shaft full of violet light behind a rail, the seers' chairs round it, each with a
      // brass eye-machine over it; scroll piles
      const cx = b.cx, cz = b.cz;
      w.cyl(2.4, 2.4, 0.4, S.basalt, cx, 0.2, cz, 16);
      const well = new THREE.Mesh(new THREE.CircleGeometry(2.0, 20), new THREE.MeshBasicMaterial({ color: 0x8a50ff })); well.rotation.x = -Math.PI / 2; well.position.set(cx, 0.42, cz); w.add(well);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 7, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xa070ff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.set(cx, 3.6, cz); beam.userData.noMerge = true; w.add(beam);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; w.box(0.12, 1.0, 0.12, S.gold, cx + Math.cos(a) * 2.5, 0.7, cz + Math.sin(a) * 2.5); }
      w.solids.push({ x0: cx - 2.4, x1: cx + 2.4, z0: cz - 2.4, z1: cz + 2.4 });
      w.lights.push({ x: cx, y: 2, z: cz, color: 0xa070ff, power: 9, range: 12, src: {} });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3, px = cx + Math.cos(a) * 4.2, pz = cz + Math.sin(a) * 4.2;
        if (w.blocked(px, pz, 0.8)) continue;
        w.box(0.7, 0.5, 0.7, S.wood, px, 0.25, pz); w.box(0.7, 1.1, 0.12, S.wood, px + Math.cos(a) * 0.3, 0.8, pz + Math.sin(a) * 0.3);
        w.box(0.06, 1.5, 0.06, M.brass, px + Math.cos(a) * 0.4, 1.4, pz + Math.sin(a) * 0.4); w.box(0.3, 0.3, 0.3, M.brass, px + Math.cos(a) * 0.1, 2.1, pz + Math.sin(a) * 0.1); w.box(0.12, 0.12, 0.05, S.eye, px, 2.1, pz);
        w.ob(px, pz, 0.5);
      }
      w.ambient.push({ x: cx, z: cz, update: (dt, t, fx) => { if (Math.random() < dt * 8) fx.add.spawn({ x: cx + (Math.random() - 0.5) * 3, y: 0.5, z: cz + (Math.random() - 0.5) * 3, vy: 1.5 + Math.random(), life: 2, size: 0.12, size1: 0.02, r: 0.7, g: 0.5, b: 1 }); } });
      return;
    }
    if (b.yard) {
      // a bell-yard: a small bell on its gallows, graves in rows, a dead tree, candles left on the stones
      const p = spot(1.8); if (p) { this.buildBellFrame(w, p.x, p.z, 0); const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.45, 0.75, 10), S.bronze); bell.position.set(p.x, 2.3, p.z); w.add(bell); }
      for (let k = 0; k < 5; k++) { const q = spot(1.1); if (!q) continue; w.box(0.7, 0.08, 1.4, S.limeDk, q.x, 0.04, q.z); w.box(0.6, 0.9, 0.16, S.lime, q.x, 0.45, q.z - 0.7); w.box(0.06, 0.4, 0.06, S.gold, q.x, 1.05, q.z - 0.7); if (r() < 0.4) candles(w, q.x + 0.2, q.z - 0.4, 2); w.ob(q.x, q.z - 0.7, 0.35); }
      const q = spot(1.4); if (q) { w.deadTree(q.x, q.z, 3); w.ob(q.x, q.z, 0.4); }
      if (r() < 0.5) { const s = spot(1); if (s) skullStake(w, s.x, s.z); }
      return;
    }
    // a chapel: pews in two rows, an altar on the north wall with icons either side, a censer on a chain; a roofless
    // one has its columns down, ash on everything and the altar broken
    const pz0 = b.z0 + 3.2, pz1 = b.z1 - 1.8;
    if (!b.doors.some((d) => d.s === 'n')) {
      if (b.ruin) { w.box(2.4, 0.6, 1.0, S.basalt, b.cx - 0.3, 0.3, b.z0 + 1.4, 0.2); w.box(1.2, 0.4, 0.8, S.basalt, b.cx + 1.2, 0.2, b.z0 + 1.8, -0.4); w.ob(b.cx, b.z0 + 1.5, 1.1); }
      else { altar(b.cx, b.z0 + 1.4); icon(b.cx - 2.4, b.z0 + 0.4, this.glassMats[Math.floor(vh(b.cx, b.cz) * 4)]); icon(b.cx + 2.4, b.z0 + 0.4, this.glassMats[Math.floor(vh(b.cz, b.cx) * 4)]); }
    }
    let n = 0;
    for (let z = pz0; z < pz1 && n < 4; z += 1.7) for (const s of [-1, 1]) {
      const px = b.cx + s * W / 4; if (!this.freeIn(w, b).free(px, z, 0.4)) continue;
      if (b.ruin && vh(px, z, 2) < 0.4) { w.box(W / 2 - 1.6, 0.45, 0.45, S.wood, px, 0.22, z, (vh(px, z) - 0.5)); continue; }
      w.box(W / 2 - 1.6, 0.45, 0.45, S.wood, px, 0.35, z); w.box(W / 2 - 1.6, 0.55, 0.08, S.wood, px, 0.65, z + 0.22); n += s > 0 ? 1 : 0;
    }
    if (b.ruin) { const p = spot(1.4); if (p) w.fallenColumn(p.x, p.z, 4, vh(p.x, p.z) * 3); drift(w, b.cx, b.cz, 'ash', 1.5, 8); }
    else { w.box(0.04, 1.6, 0.04, M.metal, b.cx, 3.0, b.cz); w.box(0.3, 0.3, 0.3, S.gold, b.cx, 2.1, b.cz); w.box(0.16, 0.12, 0.16, S.candle, b.cx, 2.0, b.cz); }
    const k = spot(1.0); if (k) (r() < 0.5 ? corpse : bones)(w, k.x, k.z, r() * 6);
  }

  // the way down: a crypt stair under a pointed arch, candles on its steps
  stairDown(w, x, z) {
    const S = this.S, M = w.mats;
    w.box(1.8, 0.04, 2.4, M.ash, x, 0.02, z);
    for (let k = 0; k < 4; k++) w.box(1.6, 0.03, 0.4, S.basaltDk, x, 0.045, z - 0.9 + k * 0.5);
    for (const s of [-1, 1]) { w.box(0.3, 2.4, 0.3, S.lime, x + s * 1.0, 1.2, z - 1.1); w.box(0.12, 0.6, 2.2, S.basalt, x + s * 0.95, 0.3, z); }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.3), S.lime); arch.position.set(x, 2.5, z - 1.1); arch.rotation.z = Math.PI / 4; w.add(arch);
    w.box(0.6, 0.6, 0.32, S.recess, x, 2.4, z - 1.1);
    candles(w, x - 0.7, z + 0.6, 2); candles(w, x + 0.6, z + 0.2, 2);
    w.lights.push({ x, y: 1.6, z: z - 0.6, color: 0xffb060, power: 4, range: 5, src: {} });
  }

  // the Pilgrims' Gate: braziers, grey tents, prayer candles, banners, the beacon; the gate itself is the way out
  camp(w) {
    const M = w.mats, S = this.S, z0 = EDGE, cx = 0;
    this.at(w, 0, EDGE + 4);
    for (const s of [-1, 1]) {
      w.box(1.0, 1.4, 12, S.lime, s * 7.6, 0.7, z0 + 7); w.box(1.1, 0.12, 12.1, S.gold, s * 7.6, 1.45, z0 + 7);
      w.tent(s * 5, z0 + 10, s, 0.85); w.banner(s * 2.6, z0 + 0.8, false);
      w.brazier(s * 5.5, z0 + 3.5, { light: true });
      robed(w, s * 6.2, z0 + 6, s * 1.4);
    }
    for (let k = 0; k < 6; k++) candles(w, -2.5 + k, z0 + 5.5 + (k % 2) * 0.4, 2);
    // the gate's arch
    for (const s of [-1, 1]) { w.box(1.2, 7, 1.4, S.lime, s * 3.2, 3.5, z0 + 14.5); const p = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.4, 4), S.slateDk); p.position.set(s * 3.2, 8.2, z0 + 14.5); p.rotation.y = Math.PI / 4; w.add(p); }
    w.box(7.6, 1.0, 1.4, S.lime, cx, 6.2, z0 + 14.5); w.box(7.8, 0.15, 1.5, S.gold, cx, 5.7, z0 + 14.5);
    const fire = w.bonfire(cx, z0 + 2.3); fire.lit = true;
    this.startAt = { x: cx, z: z0 + 9 };
    this.exitDoor(w, cx, EDGE + 13.4, 0, 1, 'Leave by the Pilgrims\' Gate');
  }
  // round the edge: the fortress's outer walls, tall and buttressed, lit windows of stained glass, spires against the sky
  rim(w) {
    const S = this.S, E = EDGE + 3;
    for (let a = -E; a <= E; a += 5) {
      for (const [x, z, alongX] of [[a, -E, true], [-E, a, false], [E, a, false]]) {
        this.at(w, Math.max(-EDGE, Math.min(EDGE, x)), Math.max(-EDGE, Math.min(EDGE, z)));
        const h = 8 + vh(x, z) * 6;
        w.box(alongX ? 5.2 : 4, h, alongX ? 4 : 5.2, vh(x, z, 2) < 0.6 ? S.lime : S.basalt, x, h / 2, z);
        w.box(alongX ? 5.3 : 4.1, 0.2, alongX ? 4.1 : 5.3, S.gold, x, h * 0.6, z);
        if (vh(x, z, 3) < 0.6) w.box(alongX ? 1.0 : 4.15, 2.6, alongX ? 4.15 : 1.0, this.glassMats[Math.floor(vh(x, z, 4) * 4)], x, h * 0.42, z);
        if (vh(x, z, 5) < 0.3) { const sp = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 4), S.slateDk); sp.position.set(x, h + 3, z); sp.rotation.y = Math.PI / 4; w.add(sp); }
      }
      if (Math.abs(a) > 9) { this.at(w, a, EDGE); w.rock(a, E - 1, 0.6 + vh(a, 5) * 0.5, false); }
    }
  }
}
City.MAPS.spire = Spire;

// ---------- the Spire's chests and drums ----------
const gilt = () => new THREE.MeshLambertMaterial({ color: 0x9a7a30, flatShading: true });
CHEST_LOOKS.spire = {
  // a reliquary: an ebony casket with gilt corners and feet, a pitched lid like a chapel roof with a gilt ridge and a
  // tiny Eye at its peak, a saint's icon on the front glowing in its rarity's light (the lock), wax seals and prayer
  // strips hanging off it, two candles at its foot. The hoard's is a long sarcophagus-reliquary
  chest(w, x, z, yaw, big, rarity, { rarityHex, LOCKED }) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; g.userData.noMerge = true;
    if (big) g.scale.set(1.35, 1.35, 1.6);
    const ebony = new THREE.MeshLambertMaterial({ color: 0x1e1814, flatShading: true }), gold = gilt(), wax = new THREE.MeshLambertMaterial({ color: 0x8a1a12 }), parch = new THREE.MeshLambertMaterial({ color: 0xc8bca0 });
    const part = (geo, mat, px, py, pz, parent = g, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
    const W = 1.05, D = 0.62, H = 0.5;
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(new THREE.BoxGeometry(0.12, 0.12, 0.12), gold, px * (W / 2 - 0.06), 0.06, pz * (D / 2 - 0.06)); // feet
    part(new THREE.BoxGeometry(W, H, D), ebony, 0, 0.12 + H / 2, 0);
    for (const px of [-1, 1]) for (const pz of [-1, 1]) part(new THREE.BoxGeometry(0.06, H + 0.02, 0.06), gold, px * W / 2, 0.12 + H / 2, pz * D / 2); // gilt corners
    part(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), gold, 0, 0.12 + H - 0.03, 0);
    part(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), gold, 0, 0.14, 0);
    // the icon: a gilt frame, the glowing saint (the lock)
    part(new THREE.BoxGeometry(0.34, 0.34, 0.03), gold, 0, 0.12 + H / 2, D / 2 + 0.01);
    const glow = new THREE.MeshBasicMaterial({ color: LOCKED });
    const lock = part(new THREE.BoxGeometry(0.24, 0.26, 0.02), glow, 0, 0.12 + H / 2, D / 2 + 0.025);
    part(new THREE.BoxGeometry(0.06, 0.12, 0.025), ebony, 0, 0.12 + H / 2 + 0.03, D / 2 + 0.035); // the saint's shape
    // the lid, a little chapel roof, hinged at the back
    const lid = new THREE.Group(); lid.position.set(0, 0.12 + H, -D / 2); g.add(lid);
    part(new THREE.BoxGeometry(W + 0.06, 0.06, D + 0.06), gold, 0, 0.03, D / 2, lid);
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(W + 0.02, 0.05, D * 0.58), ebony, 0, 0.14, D / 2 + s * D * 0.24, lid, s * 0.55);
    part(new THREE.BoxGeometry(W + 0.08, 0.05, 0.05), gold, 0, 0.29, D / 2, lid);
    part(new THREE.TorusGeometry(0.06, 0.015, 4, 10), gold, 0, 0.38, D / 2, lid);
    part(new THREE.BoxGeometry(0.03, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xc890ff }), 0, 0.38, D / 2, lid);
    for (const s of [-1, 1]) { part(new THREE.BoxGeometry(0.07, 0.07, 0.03), wax, s * 0.32, 0.12 + H - 0.12, D / 2 + 0.02); part(new THREE.BoxGeometry(0.04, 0.16, 0.01), parch, s * 0.32, 0.12 + H - 0.26, D / 2 + 0.025); }
    for (const s of [-1, 1]) { part(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), parch, s * 0.7, 0.11, 0.3); part(new THREE.BoxGeometry(0.03, 0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0xffc870 }), s * 0.7, 0.26, 0.3); }
    if (big) { part(new THREE.BoxGeometry(0.2, 0.06, 0.6), gold, 0, 0.32, D / 2, lid); } // the effigy's sword on the lid
    const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({ color: rarityHex(rarity), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; g.add(halo);
    w.add(g);
    return { group: g, lid, lock, halo, glow };
  },
  // an offering urn: bronze, round-bellied on a foot, a lid with a knop, a band of gilt and a wax seal; the plain ones
  // are clay ossuary jars with a skull painted on
  drum(w, x, z, plain) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.noMerge = true;
    const body = new THREE.MeshLambertMaterial({ color: plain ? 0x6a5040 : 0x6a4a22, flatShading: true }), gold = gilt();
    const part = (geo, mat, py, px = 0, pz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); return m; };
    part(new THREE.CylinderGeometry(0.2, 0.26, 0.14, 8), body, 0.07);
    part(new THREE.CylinderGeometry(0.36, 0.22, 0.4, 8), body, 0.34);
    part(new THREE.CylinderGeometry(0.28, 0.36, 0.36, 8), body, 0.72);
    part(new THREE.CylinderGeometry(0.2, 0.26, 0.1, 8), body, 0.95);
    part(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 8), plain ? body : gold, 1.03);
    part(new THREE.SphereGeometry(0.07, 6, 4), plain ? body : gold, 1.1);
    if (!plain) { part(new THREE.CylinderGeometry(0.365, 0.365, 0.06, 8), gold, 0.54); part(new THREE.BoxGeometry(0.1, 0.1, 0.03), new THREE.MeshLambertMaterial({ color: 0x8a1a12 }), 0.72, 0, 0.33); }
    else part(new THREE.BoxGeometry(0.14, 0.12, 0.02), new THREE.MeshLambertMaterial({ color: 0xbab09a }), 0.6, 0, 0.35);
    w.add(g);
    return g;
  },
  debris: { stave: new THREE.MeshLambertMaterial({ color: 0x6a4a22, flatShading: true }), hoop: gilt(), lid: gilt(), dust: [0.7, 0.55, 0.3] },
};
