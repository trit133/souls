// Dungeons: the open maps between mini bosses. A dungeon is ~22-25 chambers on a 7 × 7 grid of 28 m cells, joined
// by corridors (a random tree plus a few loops, so there are dead ends and circuits). You start in the middle; the
// mini boss's arena sits off one edge of the map, somewhere you have to find, behind a sealed door. Five seal
// shrines are spread far apart round the map, each guarded (an elite pack, a circle to hold, or cursed effigies);
// break three to open the door (seals.js runs them). Everything comes from the run's seed, so every player in a
// party gets the same dungeon.
//
// Coordinates are world x / z (z grows south, toward the camera). Chambers are World modules (mods): each has its
// own group (drawn when near), walkable shapes, props and enemies. The terrain is built in 14 m tiles.
import * as THREE from 'three';
import { decorate, decorateArena, candles, bones } from './decor.js';
import { arenaFurnish, stoneRing } from './modules.js';
import { rng } from './world.js';

export const CELL = 28;
const HALF = CELL / 2, R = 3; // grid cells -3..3 on each axis
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (i, j) => i + ',' + j;

const THEME_GROUND = { camp: 'dirt', ruins: 'stone', bridge: 'chasm', village: 'ash', crypt: 'crypt', bog: 'bog', gate: 'stone', start: 'stone' };
// the three dungeons of a run, in order, and the enemies in them (weights)
export const ACTS = [
  { name: 'The Ashen Warrens', themes: ['camp', 'ruins', 'bridge'], ground: 'dirt', mix: { grunt: 4, spear: 2, archer: 2, brute: 0.35 } },
  { name: 'The Hollow Deep', themes: ['village', 'crypt', 'ruins'], ground: 'ash', mix: { grunt: 3, spear: 3, archer: 2, brute: 0.6 } },
  { name: 'The Drowned Halls', themes: ['bog', 'gate', 'crypt'], ground: 'bog', mix: { grunt: 3, spear: 3, archer: 3, brute: 0.8 } },
];
const ARENAS = { hask: { theme: 'pit', name: "The Executioner's Pit", ground: 'arena' }, vael: { theme: 'cloister', name: 'The Moonlit Cloister', ground: 'crypt' }, gorrath: { theme: 'forge', name: 'The Slag Forge', ground: 'ash' } };
export const ELITES = ['frenzied', 'armoured', 'blazing'];
export const SEALS_NEEDED = 3;

// seeds next to each other (1, 2, 3...) start the LCG almost alike: stir them first
export const mix = (n) => { n = Math.imul((n ^ (n >>> 16)) >>> 0, 0x45d9f3b); n = Math.imul((n ^ (n >>> 16)) >>> 0, 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; };
const pick = (r, a) => a[Math.floor(r() * a.length)];
function weighted(r, w) { let x = r() * Object.values(w).reduce((a, b) => a + b, 0); for (const [k, v] of Object.entries(w)) if ((x -= v) <= 0) return k; return Object.keys(w)[0]; }
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export class Dungeon {
  // act 0..2, bossId: the mini boss waiting at the end
  // players: party size (seal guards and events grow with it)
  constructor(seed, act, bossId, players = 1) {
    this.seed = seed; this.act = act; this.bossId = bossId; this.players = Math.max(1, players); this.def = ACTS[act];
    this.plan(rng(mix(seed * 7 + act * 1013 + 11)));
  }

  // ---------- the layout (data only) ----------
  plan(r) {
    const cells = new Map(), list = [];
    const add = (i, j) => { const c = { i, j, key: key(i, j), links: new Set(), cx: i * CELL, cz: j * CELL }; cells.set(c.key, c); list.push(c); return c; };
    const link = (a, b) => { a.links.add(b.key); b.links.add(a.key); };
    add(0, 0);
    const target = 22 + Math.floor(r() * 4);
    for (let guard = 0; list.length < target && guard < 6000; guard++) {
      // mostly grow from the newest cells (long winding paths), sometimes from anywhere (branches)
      const from = r() < 0.6 ? list[list.length - 1 - Math.floor(r() * Math.min(3, list.length))] : pick(r, list);
      const free = DIRS.filter(([a, b]) => Math.abs(from.i + a) <= R && Math.abs(from.j + b) <= R && !cells.has(key(from.i + a, from.j + b)));
      if (!free.length) continue;
      const [a, b] = pick(r, free);
      link(from, add(from.i + a, from.j + b));
    }
    // a few loops
    for (const c of list) for (const [a, b] of [[1, 0], [0, 1]]) {
      const n = cells.get(key(c.i + a, c.j + b));
      if (n && !c.links.has(n.key) && r() < 0.2) link(c, n);
    }
    // steps from the start
    const dist = new Map([[list[0].key, 0]]), q = [list[0]];
    while (q.length) { const c = q.shift(); for (const k of c.links) if (!dist.has(k)) { dist.set(k, dist.get(c.key) + 1); q.push(cells.get(k)); } }
    for (const c of list) c.dist = dist.get(c.key);
    this.cells = list; this.cellMap = cells;

    // the arena: off a chamber on the map's edge (nothing further out that way), as far from the start as we can
    const empty = (i, j) => !cells.has(key(i, j));
    const options = [];
    for (const c of list) for (const [a, b] of DIRS) {
      let open = true;
      for (let k = 1; k <= 2 * R + 1 && open; k++) if (!empty(c.i + a * k, c.j + b * k)) open = false;
      for (const s of [-1, 1]) if (!empty(c.i + a + b * s, c.j + b + a * s)) open = false; // room either side
      if (open && c !== list[0]) options.push({ c, d: [a, b] });
    }
    const far = Math.max(...options.map((o) => o.c.dist));
    const good = options.filter((o) => o.c.dist >= Math.min(4, far));
    const A = pick(r, good.length ? good : options);
    this.arenaCell = A.c; this.arenaDir = A.d;
    this.arena = { x: A.c.cx + A.d[0] * (CELL + 6), z: A.c.cz + A.d[1] * (CELL + 6), r: 13 };

    // kinds: the start, small junctions, the five seal chambers, everything else a chamber
    list[0].kind = 'start';
    const cand = list.filter((c) => c.dist >= 2 && c !== A.c);
    const seals = [];
    while (seals.length < 5 && cand.length) {
      // spread out: the candidate furthest from the start and the seals chosen so far (a little random)
      let best = null, bs = -1;
      for (const c of cand) {
        const d = Math.min(c.dist * 1.2, ...seals.map((s) => Math.abs(s.i - c.i) + Math.abs(s.j - c.j))) + r() * 1.5;
        if (d > bs) { bs = d; best = c; }
      }
      seals.push(best); cand.splice(cand.indexOf(best), 1);
    }
    const kinds = shuffle(['elite', 'elite', 'elite', 'circle', 'altar'], r), traits = shuffle([...ELITES], r);
    seals.forEach((c, n) => { c.kind = 'seal'; c.seal = kinds[n]; if (c.seal === 'elite') c.trait = traits.pop(); });
    for (const c of list) {
      if (c.kind) continue;
      c.kind = c.links.size >= 3 && r() < 0.3 ? 'junction' : 'room';
    }
    for (const c of list) {
      c.theme = c.kind === 'start' ? 'start' : pick(r, this.def.themes);
      if (c.kind === 'seal' && c.theme === 'bridge') c.theme = 'ruins'; // seal fights want solid ground round them
      c.ground = THEME_GROUND[c.theme] || this.def.ground;
    }
    this.r = r;
  }

  // ---------- queries ----------
  cellAt(x, z) { return this.cellMap.get(key(Math.round(x / CELL), Math.round(z / CELL))); }
  modAt(x, z) {
    if (this.arenaMod && Math.hypot(x - this.arena.x, z - this.arena.z) < 21) return this.arenaMod;
    return this.cellAt(x, z)?.mod || this.cells[0].mod;
  }
  styleAt(x, z) {
    if (Math.hypot(x - this.arena.x, z - this.arena.z) < 20) return ARENAS[this.bossId].ground;
    return this.cellAt(x, z)?.ground || this.def.ground;
  }
  // where an enemy from module i may walk: its own chamber and the ones joined to it
  roam(i) {
    const m = this.w.mods[i];
    if (!m?.cell) return null;
    return new Set([i, ...[...m.cell.links].map((k) => this.cellMap.get(k).mod.i)]);
  }

  // ---------- building ----------
  build(w) {
    this.w = w; w.dungeon = this; w.cutaway = true;
    w.Z = (d) => d;
    const r = w.rand;
    // 1. every chamber's walkable shapes (the dressing needs to know all of them)
    for (const c of this.cells) {
      const group = new THREE.Group(); w.root.add(group);
      const mod = { i: w.mods.length, key: c.theme, name: this.def.name, cx: c.cx, cz: c.cz, z0: c.cz + HALF, z1: c.cz - HALF, len: CELL, half: HALF - 1, group, ground: c.ground, dungeon: true, cell: c };
      c.mod = mod; w.mods.push(mod); w.cur = mod;
      this.shape(w, c, r);
      mod.lanes = (x, z) => this.laneDist(c, x, z);
    }
    this.buildArena(w);
    // 2. dressing, seals and enemies
    for (const c of this.cells) {
      w.cur = c.mod;
      const l0 = w.lights.length;
      DRESS[c.theme]?.(w, c, this, r);
      if (c.kind === 'seal') this.buildSeal(w, c, r);
      if (c.kind !== 'start' && c.kind !== 'junction') decorate(w, c.theme === 'start' ? 'ruins' : c.theme, c.mod);
      if (w.lights.length === l0) { const p = this.spot(w, c, { inset: -0.6, rim: true, lane: 1.5 }); if (p) w.torch(p.x, p.z); } // never a dark room
      this.floodChamber(w, c);
      this.populate(w, c, r);
    }
    // 3. terrain in 14 m tiles, with rocks and trees on the raised ground
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const s of w.shapes) {
      const b = s.t === 'r' ? [s.x0, s.x1, s.z0, s.z1] : [s.x - s.r, s.x + s.r, s.z - s.r, s.z + s.r];
      x0 = Math.min(x0, b[0]); x1 = Math.max(x1, b[1]); z0 = Math.min(z0, b[2]); z1 = Math.max(z1, b[3]);
    }
    const T = 14;
    for (let tx = Math.floor((x0 - 16) / T) * T; tx < x1 + 16; tx += T) {
      for (let tz = Math.floor((z0 - 16) / T) * T; tz < z1 + 16; tz += T) {
        const group = new THREE.Group(); w.root.add(group);
        const tile = { x: tx + T / 2, z: tz + T / 2, group, i: -1 };
        const style = w.styleAt(tile.x, tile.z);
        group.add(w.groundMesh(tile.x, tile.z, T, T, style));
        w.cur = tile;
        w.scatter(style, tx, tx + T, tz, tz + T);
        w.mergeStatic(group);
        w.tiles.push(tile);
      }
    }
    for (const m of w.mods) w.mergeStatic(m.group);
    w.cur = null;
    w.start = { x: 0, z: 2.5 };
  }

  // a chamber's floor (by kind and theme) and its corridors toward each linked cell
  shape(w, c, r) {
    const { cx, cz } = c;
    const big = c.kind === 'seal';
    let hw, hd;
    if (c.kind === 'start') { hw = hd = 7; w.rect(cx - hw, cx + hw, cz - hd, cz + hd); }
    else if (c.kind === 'junction') { hw = hd = 3.4; w.rect(cx - hw, cx + hw, cz - hd, cz + hd); }
    else {
      const lo = big ? 8.5 : 6, span = big ? 2 : 4;
      hw = lo + r() * span; hd = lo + r() * span;
      if (c.theme === 'crypt' && !big) { if (r() < 0.5) hw = 5 + r(); else hd = 5 + r(); } // a long hall
      if (c.theme === 'bridge') { hw = Math.min(hw, 7); hd = Math.min(hd, 7); }
      if (c.theme === 'bog') { const rr = Math.min(10.5, Math.max(hw, hd)); w.circle(cx, cz, rr); hw = hd = rr * 0.8; w.rect(cx - hw, cx + hw, cz - hd * 0.6, cz + hd * 0.6); }
      else w.rect(cx - hw, cx + hw, cz - hd, cz + hd);
      // an extra wing or bay so rooms aren't all boxes
      if (c.theme !== 'bridge' && r() < 0.45) {
        const sx = r() < 0.5 ? -1 : 1, sz = r() < 0.5 ? -1 : 1;
        if (r() < 0.5) w.circle(cx + sx * hw * 0.7, cz + sz * hd * 0.7, 3.5 + r() * 2);
        else w.rect(cx + sx * (hw - 1), cx + sx * Math.min(hw + 3, 10.5), cz + sz * 1 - 3, cz + sz * 1 + 3);
      }
    }
    c.hw = hw; c.hd = hd;
    // corridors to the cell edges (each overlaps the neighbour's by 1.6 m so there's no seam)
    const cw = c.theme === 'bridge' ? 1.8 : 2.2;
    c.doors = [];
    for (const k of c.links) {
      const n = this.cellMap.get(k), a = Math.sign(n.i - c.i), b = Math.sign(n.j - c.j), L = HALF + 0.8;
      if (a) w.rect(Math.min(cx, cx + a * L), Math.max(cx, cx + a * L), cz - cw, cz + cw);
      else w.rect(cx - cw, cx + cw, Math.min(cz, cz + b * L), Math.max(cz, cz + b * L));
      c.doors.push([a, b]);
    }
    if (c === this.arenaCell) {
      // the way out toward the boss door (the arena's own corridor carries on from the cell edge)
      const [a, b] = this.arenaDir, L = HALF + 0.8;
      if (a) w.rect(Math.min(cx, cx + a * L), Math.max(cx, cx + a * L), cz - 2.6, cz + 2.6);
      else w.rect(cx - 2.6, cx + 2.6, Math.min(cz, cz + b * L), Math.max(cz, cz + b * L));
      c.doors.push(this.arenaDir);
    }
  }

  // how far (x, z) is from the paths through a chamber (centre to each doorway): blocking props keep off them
  laneDist(c, x, z) {
    let best = Math.hypot(x - c.cx, z - c.cz) - (c.seal === 'circle' ? 6 : c.kind === 'seal' ? 3 : 1); // (the circle stays clear)
    for (const [a, b] of c.doors) {
      const t = Math.max(0, Math.min(HALF, (x - c.cx) * a + (z - c.cz) * b));
      best = Math.min(best, Math.hypot(x - (c.cx + a * t), z - (c.cz + b * t)));
    }
    return best;
  }

  // a random spot in chamber c. o.inset: how far inside the floor (negative = out on the rim); o.lane: distance from
  // the paths; o.gap: distance from other obstacles
  spot(w, c, o = {}) {
    const r = w.rand, ext = o.rim ? 3 : 0;
    for (let t = 0; t < 90; t++) {
      const x = c.cx + (r() * 2 - 1) * (c.hw + ext), z = c.cz + (r() * 2 - 1) * (c.hd + ext);
      if (o.rim ? (w.area(x, z, -0.3) || !w.area(x, z, o.inset ?? -2.4)) : !w.area(x, z, o.inset ?? 1)) continue;
      if (w.moduleAt(x, z) !== c.mod) continue;
      if (this.laneDist(c, x, z) < (o.lane ?? 2.6)) continue;
      if (w.obstacles.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + (o.gap ?? 1.4))) continue;
      if (w.solids.some((s) => x > s.x0 - 1.5 && x < s.x1 + 1.5 && z > s.z0 - 1.5 && z < s.z1 + 1.5)) continue;
      return { x, z };
    }
    return null;
  }

  // which parts of a chamber you can actually walk to from its doorways once the props are in (half-metre grid):
  // a corner can end up closed off by tents and crates, and nothing should stand in there
  floodChamber(w, c) {
    const S = 0.5, N = CELL / S + 1, ox = c.cx - HALF, oz = c.cz - HALF, rad = 0.5;
    const obs = w.obstacles.filter((o) => Math.abs(o.x - c.cx) < HALF + 2 && Math.abs(o.z - c.cz) < HALF + 2);
    const ok = (i, j) => { const x = ox + i * S, z = oz + j * S; return w.walkable(x, z, rad) && !obs.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + rad); };
    const seen = new Uint8Array(N * N), q = [];
    for (const [a, b] of c.doors) {
      const i = Math.round((a * (HALF - 0.6) + HALF) / S), j = Math.round((b * (HALF - 0.6) + HALF) / S);
      if (ok(i, j) && !seen[j * N + i]) { seen[j * N + i] = 1; q.push(i, j); }
    }
    while (q.length) {
      const j = q.pop(), i = q.pop();
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + a, jj = j + b, k = jj * N + ii;
        if (ii < 0 || jj < 0 || ii >= N || jj >= N || seen[k]) continue;
        seen[k] = ok(ii, jj) ? 1 : 2;
        if (seen[k] === 1) q.push(ii, jj);
      }
    }
    c.reach = (x, z) => { const i = Math.round((x - ox) / S), j = Math.round((z - oz) / S); return i >= 0 && j >= 0 && i < N && j < N && seen[j * N + i] === 1; };
  }

  // ---------- the mini boss's arena ----------
  buildArena(w) {
    const c = this.arenaCell, [a, b] = this.arenaDir, A = this.arena, info = ARENAS[this.bossId];
    const group = new THREE.Group(); w.root.add(group);
    const mod = { i: w.mods.length, key: 'mini:' + this.bossId, name: info.name, cx: A.x, cz: A.z, z0: A.z + 20, z1: A.z - 20, len: 40, half: 20, r: 8, group, ground: info.ground, dungeon: true, arena: true };
    w.mods.push(mod); w.cur = mod; this.arenaMod = mod;
    w.circle(A.x, A.z, A.r);
    // the corridor from the edge chamber, with the sealed door across it
    // a stretch of corridor d0..d1 metres out from the edge chamber's centre
    const seg = (d0, d1, o = {}) => {
      const cw = 2.6, lo = Math.min(d0, d1), hi = Math.max(d0, d1);
      if (a) w.rect(c.cx + Math.min(a * lo, a * hi), c.cx + Math.max(a * lo, a * hi), c.cz - cw, c.cz + cw, o);
      else w.rect(c.cx - cw, c.cx + cw, c.cz + Math.min(b * lo, b * hi), c.cz + Math.max(b * lo, b * hi), o);
    };
    const gid = 'in' + mod.i, gd = HALF + 5;
    seg(HALF - 0.8, gd - 2);
    seg(gd - 2.5, gd + 2.5, { gate: gid });
    seg(gd + 2, CELL + 6 - A.r + 2);
    w.gateAt(gid, c.cx + a * gd, c.cz + b * gd, !!a, 6, false);
    const enc = { id: 'mini' + mod.i, kind: 'mini', bossId: this.bossId, arena: { x: A.x, z: A.z, r: A.r }, gateIn: gid, gateOut: null, mod: mod.i, active: false, defeated: false, sealed: true, dungeon: true };
    w.encounters.push(enc);
    this.enc = enc;
    stoneRing(w, A.x, A.z, A.r, [Math.atan2(b, -a)]);
    arenaFurnish(w, info.theme, A.x, A.z, enc);
    decorateArena(w, info.theme, A.x, A.z, A.r, enc);
  }

  // ---------- seals ----------
  buildSeal(w, c, r) {
    const x = c.cx, z = c.cz - (c.seal === 'circle' ? 0 : 1.5);
    const color = c.seal === 'altar' ? 0xff3a2a : c.seal === 'circle' ? 0xffc040 : 0xb060ff;
    // the shrine: a stepped base, a pillar carved with runes, a crystal floating over it, a beam of light seen from afar
    w.box(2.2, 0.4, 2.2, w.mats.stoneDark, x, 0.2, z); w.box(1.6, 0.4, 1.6, w.mats.stone, x, 0.6, z);
    w.cyl(0.38, 0.55, 2.4, w.mats.stoneDark, x, 2.0, z, 4);
    w.ob(x, z, 1.2);
    const glow = new THREE.MeshBasicMaterial({ color });
    for (const s of [-1, 1]) { const rune = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.04), glow); rune.position.set(x + s * 0.2, 2.0, z + 0.42); w.add(rune); }
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), glow);
    crystal.position.set(x, 3.7, z); crystal.scale.y = 1.6; crystal.userData.noMerge = true; w.add(crystal);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 34, 6, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(x, 17, z); beam.userData.noMerge = true; w.add(beam);
    const seal = { i: w.seals.length, kind: c.seal, x, z, mod: c.mod.i, color, crystal, beam, broken: false, guards: [], reserves: [], effigies: [], spawnPts: [] };
    w.lights.push({ x, y: 3.6, z, color, power: 10, range: 12, src: { cond: () => !seal.broken } });
    w.ambient.push({ x, z, update: (dt, t) => { crystal.rotation.y = t * 1.4; crystal.position.y = 3.7 + Math.sin(t * 2) * 0.12; } });
    if (c.seal === 'circle') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(4.3, 4.75, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.06, z); ring.userData.noMerge = true; w.add(ring);
      seal.ring = ring; seal.radius = 4.5;
    }
    w.seals.push(seal);
    c.sealRec = seal;
  }

  // ---------- enemies ----------
  populate(w, c, r) {
    const mix = this.def.mix, placed = [];
    const at = (o = {}) => {
      for (let t = 0; t < 60; t++) {
        const p = this.spot(w, c, { inset: 1.0, lane: 0, gap: 0.9 });
        if (p && c.reach?.(p.x, p.z) && !placed.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 2.6) && (!c.sealRec || Math.hypot(p.x - c.sealRec.x, p.z - c.sealRec.z) > (o.near ? 2.2 : 3.5)) && (!o.near || Math.hypot(p.x - c.cx, p.z - c.cz) < 7)) { placed.push(p); return p; }
      }
      return { x: c.cx + (r() - 0.5) * 4, z: c.cz + 3 + r() };
    };
    const add = (type, o = {}) => {
      const p = at(o);
      const sit = !o.elite && !o.event && (type === 'grunt' || type === 'spear') && r() < 0.22;
      w.spawn(type, p.x, p.z, r() * Math.PI * 2, { ...o, sit });
      return w.spawns[w.spawns.length - 1];
    };
    const regular = (noBrute) => { let t = weighted(r, mix); if (t === 'brute' && noBrute) t = 'grunt'; return t; };
    if (c.kind === 'start') return;
    if (c.kind === 'junction') { if (r() < 0.4) add(regular(true)); return; }
    if (c.kind === 'seal') {
      const S = c.sealRec;
      // where event enemies come from: round the edge of the chamber
      for (let t = 0; t < 200 && S.spawnPts.length < 8; t++) {
        const p = this.spot(w, c, { inset: 0.8, lane: 0, gap: 0.6 });
        if (p && Math.hypot(p.x - S.x, p.z - S.z) > 6.5 && c.reach(p.x, p.z)) S.spawnPts.push(p);
      }
      if (!S.spawnPts.length) S.spawnPts.push({ x: S.x + 4, z: S.z + 3 });
      if (c.seal === 'elite') {
        const base = this.act > 0 && r() < 0.35 ? 'brute' : pick(r, ['grunt', 'spear']);
        S.guards.push(add(base, { elite: c.trait, near: true }));
        for (let k = 0; k < 3 + Math.floor((this.players - 1) / 2); k++) S.guards.push(add(regular(true))); // 3 more with the elite (4 with three players)
      } else if (c.seal === 'altar') {
        // three cursed effigies round the shrine; enemies pour out of it until they fall
        for (let k = 0; k < 3; k++) {
          // round the shrine, nudged round until it stands somewhere you can get to
          let a = k / 3 * Math.PI * 2 + 0.5, ex, ez;
          for (let t = 0; t < 12; t++, a += 0.17) { ex = S.x + Math.cos(a) * 5.5; ez = S.z - Math.sin(a) * 5.5; if (c.reach(ex + 1, ez) || c.reach(ex - 1, ez) || c.reach(ex, ez + 1) || c.reach(ex, ez - 1)) break; }
          w.box(1.2, 0.3, 1.2, w.mats.stoneDark, ex, 0.15, ez);
          w.spawn('effigy', ex, ez, Math.atan2(S.x - ex, S.z - ez), { effigy: true });
          S.effigies.push(w.spawns[w.spawns.length - 1]);
        }
        for (let k = 0; k < 7 + this.players; k++) { w.spawn(regular(true), S.x, S.z, 0, { reserve: true, event: true }); S.reserves.push(w.spawns[w.spawns.length - 1]); }
        add(regular(true));
      } else {
        // hold the circle: waves come in from the edges
        for (let k = 0; k < 4 * (2 + this.players); k++) { w.spawn(regular(true), S.x, S.z, 0, { reserve: true, event: true }); S.reserves.push(w.spawns[w.spawns.length - 1]); }
      }
      return;
    }
    const n = 2 + Math.floor(r() * 3) + (c.hw * c.hd > 90 ? 1 : 0);
    let brute = false;
    for (let k = 0; k < n; k++) { const t = regular(brute); if (t === 'brute') brute = true; add(t); }
  }
}

// ---------- chamber dressing, by theme ----------
// Big things keep off the paths between the doorways (Dungeon.spot's lane), so every chamber stays crossable.
const DRESS = {
  start: (w, c, D) => {
    const b = w.bonfire(c.cx, c.cz - 4.2); b.lit = true;
    for (const s of [-1, 1]) { w.brazier(c.cx + s * 5.5, c.cz - 5.5); w.banner(c.cx + s * 3.2, c.cz - 6.6); }
    candles(w, c.cx - 1.4, c.cz - 4.6, 4); bones(w, c.cx + 4, c.cz + 3);
  },
  junction: (w, c, D) => {
    const p = D.spot(w, c, { rim: true, inset: -1.2, lane: 1 });
    if (p) w.torch(p.x, p.z);
  },
  camp: (w, c, D, r) => {
    // a palisade round the sides, broken where the corridors come in
    const { cx, cz, hw, hd } = c;
    const door = (a, b) => c.doors.some(([x, y]) => x === a && y === b);
    const fence = (x0, z0, x1, z1, h, gap) => {
      if (!gap) return w.palisade(x0, z0, x1, z1, h);
      if (x0 === x1) { w.palisade(x0, z0, x0, (z0 + z1) / 2 - 3.2, h); w.palisade(x0, (z0 + z1) / 2 + 3.2, x1, z1, h); }
      else { w.palisade(x0, z0, (x0 + x1) / 2 - 3.2, z0, h); w.palisade((x0 + x1) / 2 + 3.2, z0, x1, z1, h); }
    };
    if (r() < 0.8) {
      fence(cx - hw - 0.4, cz - hd - 0.4, cx + hw + 0.4, cz - hd - 0.4, 2.6, door(0, -1));
      fence(cx - hw - 0.4, cz + hd + 0.4, cx + hw + 0.4, cz + hd + 0.4, 1.2, door(0, 1));
      fence(cx - hw - 0.4, cz - hd - 0.4, cx - hw - 0.4, cz + hd + 0.4, 2.6, door(-1, 0));
      fence(cx + hw + 0.4, cz - hd - 0.4, cx + hw + 0.4, cz + hd + 0.4, 2.6, door(1, 0));
    }
    for (let k = 0; k < 2 + (r() * 2 | 0); k++) { const p = D.spot(w, c, { inset: 2, lane: 3.4, gap: 2 }); if (p) w.tent(p.x, p.z, r() * 3, 0.9 + r() * 0.2); }
    const f = D.spot(w, c, { inset: 2, lane: 2.4 }); if (f) w.firePit(f.x, f.z);
    for (let k = 0; k < 3; k++) { const p = D.spot(w, c, { inset: 0.8, lane: 2.4, gap: 1 }); if (!p) continue; if (r() < 0.5) { w.crate(p.x, p.z); w.crate(p.x + 0.9, p.z + 0.2, 0.6); } else { w.barrel(p.x, p.z); w.barrel(p.x + 0.4, p.z + 0.8); } }
    const k = D.spot(w, c, { inset: 1, lane: 2.4 }); if (k) w.rack(k.x, k.z);
  },
  ruins: (w, c, D, r) => {
    for (let k = 0; k < 5 + (r() * 4 | 0); k++) { const p = D.spot(w, c, { inset: 0.6, lane: 2.2, gap: 1.6 }); if (p) w.pillar(p.x, p.z, 1 + r() * 2.8, r() < 0.4); }
    const p = D.spot(w, c, { inset: 2, lane: 3, gap: 2 }); if (p) w.fallenColumn(p.x, p.z, 3 + r(), r() * 3);
    for (let k = 0; k < 2; k++) { const b = D.spot(w, c, { inset: 0.8, lane: 2.2 }); if (b) w.brazier(b.x, b.z); }
    for (let k = 0; k < 2; k++) { const b = D.spot(w, c, { inset: 0.5, lane: 2.4 }); if (b) w.rock(b.x, b.z, 0.7 + r() * 0.3, r() < 0.5, true); }
  },
  bridge: (w, c, D, r) => {
    // a stone platform over the chasm; the corridors are plank bridges with rope posts
    for (const [a, b] of c.doors) {
      if (c === D.arenaCell && a === D.arenaDir[0] && b === D.arenaDir[1]) continue;
      const from = a ? c.hw : c.hd;
      for (let d = from; d < HALF + 0.6; d += 0.62) w.box(a ? 0.52 : 3.5, 0.14, a ? 3.5 : 0.52, w.mats.plank, c.cx + a * d, 0.02, c.cz + b * d, (r() - 0.5) * 0.06);
      for (let d = from; d < HALF; d += 3.6) for (const s of [-1, 1]) w.cyl(0.08, 0.1, 1.3, w.mats.logDark, c.cx + a * d + (a ? 0 : s * 2.0), 0.65, c.cz + b * d + (b ? 0 : s * 2.0), 5);
    }
    for (let k = 0; k < 2; k++) { const p = D.spot(w, c, { inset: 0.6, lane: 2 }); if (p) w.brazier(p.x, p.z); }
    for (let k = 0; k < 2; k++) { const p = D.spot(w, c, { inset: 0.6, lane: 2, gap: 1 }); if (p) w.crate(p.x, p.z); }
  },
  village: (w, c, D, r) => {
    for (let k = 0; k < 2 + (r() * 3 | 0); k++) {
      const ww = 3.5 + r() * 1.5, dd = 3.5 + r() * 1.5;
      const p = D.spot(w, c, { inset: Math.max(ww, dd) / 2 + 0.6, lane: Math.max(ww, dd) / 2 + 1.8, gap: 3.4 });
      if (p) { w.house(p.x, p.z, ww, dd, 0); w.fires.push({ x: p.x + ww / 2 + 0.2, z: p.z, y: 0.3, scale: 0.5 }); }
    }
    const p = D.spot(w, c, { inset: 1.4, lane: 2.6 }); if (p) { w.cyl(1.0, 1.1, 0.8, w.mats.stone, p.x, 0.4, p.z); w.ob(p.x, p.z, 1.1); }
    const b = D.spot(w, c, { inset: 0.8, lane: 2.2 }); if (b) w.brazier(b.x, b.z, { light: true });
  },
  crypt: (w, c, D, r) => {
    // rows of pillars down the long sides, cold torches on the walls, stone coffins
    const along = c.hd >= c.hw;
    for (let t = -1; t <= 1.01; t += 0.5) for (const s of [-1, 1]) {
      const x = along ? c.cx + s * (c.hw - 1.6) : c.cx + t * (c.hw - 2), z = along ? c.cz + t * (c.hd - 2) : c.cz + s * (c.hd - 1.6);
      if (D.laneDist(c, x, z) > 1.8 && w.area(x, z, 0.5)) w.pillar(x, z, 3.2);
    }
    for (let k = 0; k < 3; k++) { const p = D.spot(w, c, { rim: true, inset: -1.0, lane: 1.2, gap: 1 }); if (p) w.torch(p.x, p.z, 0x6ab4ff, true); }
    for (let k = 0; k < 2 + (r() * 2 | 0); k++) {
      const p = D.spot(w, c, { inset: 1.4, lane: 2.4, gap: 1.6 });
      if (p) { w.box(1.0, 0.7, 2.2, w.mats.stoneDark, p.x, 0.35, p.z); w.ob(p.x, p.z - 0.6, 0.6); w.ob(p.x, p.z + 0.6, 0.6); }
    }
    for (let k = 0; k < 10; k++) w.box(0.12, 0.12, 0.5, w.mats.bone, c.cx + (r() - 0.5) * c.hw * 1.8, 0.06, c.cz + (r() - 0.5) * c.hd * 1.8, r() * 3);
  },
  bog: (w, c, D, r) => {
    for (let k = 0; k < 2 + (r() * 3 | 0); k++) { const p = D.spot(w, c, { inset: 1, lane: 3.4, gap: 0.5 }); if (p) w.pool(p.x, p.z, 2.2 + r() * 1.4); }
    for (let k = 0; k < 4; k++) { const p = D.spot(w, c, { inset: 0.4, lane: 2.2, gap: 1.2 }); if (p) { w.deadTree(p.x, p.z, 3 + r() * 2); w.ob(p.x, p.z, 0.4); } }
    for (let k = 0; k < 2; k++) { const p = D.spot(w, c, { inset: 0.6, lane: 2 }); if (p) w.torch(p.x, p.z); }
  },
  gate: (w, c, D, r) => {
    for (let k = 0; k < 2; k++) {
      const p = D.spot(w, c, { inset: 2.6, lane: 4, gap: 2.4 });
      if (p) { w.box(4, 4 + r() * 3, 3.2, w.mats.stone, p.x, null, p.z); w.box(4.2, 0.6, 3.4, w.mats.stoneDark, p.x, null, p.z); w.solids.push({ x0: p.x - 2, x1: p.x + 2, z0: p.z - 1.6, z1: p.z + 1.6 }); }
    }
    for (let k = 0; k < 2; k++) { const p = D.spot(w, c, { inset: 0.6, lane: 2.2 }); if (p) w.brazier(p.x, p.z); }
    for (let k = 0; k < 3; k++) { const p = D.spot(w, c, { inset: 0.4, lane: 2, gap: 0.8 }); if (p) w.banner(p.x, p.z); }
    for (let k = 0; k < 2; k++) { const p = D.spot(w, c, { inset: 0.8, lane: 2.4, gap: 1 }); if (p) w.crate(p.x, p.z); }
  },
};
