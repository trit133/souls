// A raid map: Ashfall Ward, a burned-out hab-ward (regions.js). The map is laid by hand and the same every raid: a
// tight maze about 100 m across. Lanes 4 m wide run between 7 x 7 junctions; where a lane wasn't carved there's a
// wall of brick and rubble instead, so the lanes wind, branch and dead-end (a spanning tree over the junctions, plus
// a few loops). Between the lanes, 36 blocks of 12 m: houses you walk into through their doorways (dark inside unless
// they're roofless ruins), walled yards, heaps of rubble, four small squares, and three big buildings over two
// blocks each (a chapel, a manufactorum, a barracks). Some buildings have stairs down to vaults and bunkers built
// far off to the east (x > 300). What changes each raid (from the run's seed, so a party shares it): where the three
// shrines are (on the squares or down in the vaults), which big building hides the stair to the boss, and where
// every enemy stands.
//
// It stands in for a dungeon (world.dungeon): mods are 25 m chunks of the city (each enemy keeps to its chunk and
// the ones round it), every basement and the arena; seals.js runs the shrines and the boss door as before. Enemies
// find their way round walls with a flow field on a 1 m grid (steer). A building's roof only lifts off when you're
// inside it; a building standing between you and the camera fades to glass with its inside blacked out, and behind a
// lane wall main.js shows your outline through it.
import * as THREE from 'three';
import { rng } from './world.js';
import { mix, ELITES } from './dungeon.js';
import { arenaFurnish, stoneRing } from './modules.js';
import { buildChest, buildDrum } from './chests.js';
import { rollRarity, TIERS } from './items.js';
import { decorateArena, candles, bones, corpse, sacks, cart, crows, bloodStain, cage, skullStake } from './decor.js';

const MAP_SEED = 0x5a11f; // the map's own stream: the same lanes and buildings every raid
const N = 7, SP = 16, X0 = -48, LW = 4; // junctions on a 7 x 7 grid 16 m apart; lanes 4 m wide
const EDGE = 50, CH = 25, NC = 4, C0 = -50; // walkable -50..50 (and the camp south of it); 4 x 4 chunks of 25 m
const UNDER = 300; // beyond this x it's underground
const T = 0.5; // wall thickness
const X = (i) => X0 + i * SP;
// blocks, rows north (-z) to south, columns west to east (a big building's second block is 'merged')
const BLOCKS = [
  ['house', 'house', 'chapel', 'merged', 'house', 'ruin'],
  ['yard', 'plaza', 'house', 'ruin', 'plaza', 'house'],
  ['works', 'house', 'yard', 'house', 'house', 'barracks'],
  ['merged', 'ruin', 'house', 'house', 'yard', 'merged'],
  ['house', 'plaza', 'ruin', 'house', 'plaza', 'house'],
  ['ruin', 'house', 'house', 'yard', 'house', 'rubble'],
];
const MERGED_EDGES = ['v3,0', 'h0,3', 'h5,3']; // the lanes the big buildings stand over
const LOOPS = 2; // extra lanes on top of the spanning tree
const BOSS_SITES = ['0,2', '2,0', '2,5']; // the chapel, the manufactorum, the barracks: one hides the boss's stair
const VAULT_SITES = ['2,1', '3,3', '4,5']; // houses over a vault (a shrine can wait down there, or in the boss sites the boss didn't take)
const SURFACE_SHRINES = ['1,1', '1,4', '4,1', '4,4']; // the squares
const ARENAS = { hask: { theme: 'pit', name: 'The Penitent Pit', ground: 'arena' }, vael: { theme: 'cloister', name: 'The Cryo Cloister', ground: 'crypt' }, gorrath: { theme: 'forge', name: 'The Slag Foundry', ground: 'ash' } };

const pick = (r, a) => a[Math.floor(r() * a.length)];
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weighted(r, w) { let x = r() * Object.values(w).reduce((a, b) => a + b, 0); for (const [k, v] of Object.entries(w)) if ((x -= v) <= 0) return k; return Object.keys(w)[0]; }
// a visual-only random 0..1 from a position (wall heights, windows): never the level's streams
const vh = (x, z, k = 0) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
const inside = (b, x, z, m = 0) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
// a lane (an edge between two junctions) as a rect: 'h' runs east from junction (i, j), 'v' runs south
const edgeRect = (e) => {
  const t = e[0], [i, j] = e.slice(1).split(',').map(Number);
  return t === 'h' ? { x0: X(i) + LW / 2, x1: X(i + 1) - LW / 2, z0: X(j) - LW / 2, z1: X(j) + LW / 2, alongX: true }
    : { x0: X(i) - LW / 2, x1: X(i) + LW / 2, z0: X(j) + LW / 2, z1: X(j + 1) - LW / 2, alongX: false };
};

export class City {
  constructor(seed, area, players = 1) {
    this.seed = seed; this.area = area; this.def = { name: area.name }; this.players = Math.max(1, players);
    this.bossId = area.boss;
    this.plan();
    // this raid's draw: the boss's stair, the three shrines and what guards each
    const r = (this.r = rng(mix(seed * 7 + 101)));
    this.bossSite = pick(r, BOSS_SITES);
    const under = shuffle([...VAULT_SITES, ...BOSS_SITES.filter((k) => k !== this.bossSite)], r), over = shuffle([...SURFACE_SHRINES], r);
    const rest = shuffle([...under.slice(1), ...over.slice(1)], r);
    this.shrineSites = shuffle([over[0], under[0], rest[0]], r);
    this.shrineKinds = shuffle(['elite', 'circle', 'altar'], r);
    this.shrineTrait = pick(r, ELITES);
    // the hidden way out: a hatch at the end of a lane on the ward's north, west or east edge
    const edge = [];
    for (let k = 0; k < N; k++) edge.push({ x: X(k), z: X(0), dx: 0, dz: -1 }, { x: X(0), z: X(k), dx: -1, dz: 0 }, { x: X(N - 1), z: X(k), dx: 1, dz: 0 });
    this.hatch = pick(r, edge);
    // only the basements something waits in: the boss's, the shrines' down here, and one treasure vault (the hoard)
    const unders = [...VAULT_SITES, ...BOSS_SITES.filter((k) => k !== this.bossSite)];
    this.cacheSite = pick(r, unders.filter((k) => !this.shrineSites.includes(k)));
    const keep = new Set([this.bossSite, this.cacheSite, ...this.shrineSites]);
    for (const b of this.buildings) if (b.basement && !keep.has(b.block.key)) delete b.basement;
  }

  // ---------- the plan (data only, the map's own stream) ----------
  plan() {
    const r = rng(MAP_SEED);
    // the lanes: a winding spanning tree over the junctions from the gate (south middle), the squares opened all
    // round, then a few loops
    const open = new Set(), closed = new Set(MERGED_EDGES);
    const nbrs = (i, j) => [[i + 1, j, `h${i},${j}`], [i - 1, j, `h${i - 1},${j}`], [i, j + 1, `v${i},${j}`], [i, j - 1, `v${i},${j - 1}`]]
      .filter(([a, b, e]) => a >= 0 && b >= 0 && a < N && b < N && !closed.has(e));
    const seen = new Set(['3,6']), stack = [[3, 6]];
    while (stack.length) {
      const [i, j] = stack[stack.length - 1];
      const nx = nbrs(i, j).filter(([a, b]) => !seen.has(a + ',' + b));
      if (!nx.length) { stack.pop(); continue; }
      const [a, b, e] = pick(r, nx);
      open.add(e); seen.add(a + ',' + b); stack.push([a, b]);
    }
    for (const key of SURFACE_SHRINES) { const [bj, bi] = key.split(',').map(Number); for (const e of [`h${bi},${bj}`, `h${bi},${bj + 1}`, `v${bi},${bj}`, `v${bi + 1},${bj}`]) open.add(e); }
    const all = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { if (i < N - 1) all.push(`h${i},${j}`); if (j < N - 1) all.push(`v${i},${j}`); }
    for (const e of shuffle(all.filter((e) => !open.has(e) && !closed.has(e)), r).slice(0, LOOPS)) open.add(e);
    this.open = open;

    // the blocks
    this.blocks = []; this.buildings = [];
    const sideEdges = (bi, bj) => ({ n: `h${bi},${bj}`, s: `h${bi},${bj + 1}`, w: `v${bi},${bj}`, e: `v${bi + 1},${bj}` });
    for (let bj = 0; bj < 6; bj++) for (let bi = 0; bi < 6; bi++) {
      const x0 = X(bi) + LW / 2, x1 = X(bi + 1) - LW / 2, z0 = X(bj) + LW / 2, z1 = X(bj + 1) - LW / 2, key = bj + ',' + bi;
      const B = { key, i: bi, j: bj, type: BLOCKS[bj][bi], x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, bld: [] };
      this.blocks.push(B);
      const E = sideEdges(bi, bj), opens = Object.keys(E).filter((s) => open.has(E[s]));
      const add = (o) => { const b = { block: B, h: 3.8, ruin: false, doors: [], part: null, kind: 'house', ...o }; b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2; B.bld.push(b); this.buildings.push(b); return b; };
      if ((B.type === 'house' || B.type === 'ruin' || B.type === 'yard') && !opens.length) B.type = 'rubble'; // (walled in on every side)
      switch (B.type) {
        case 'house': case 'ruin': {
          const b = add({ x0, x1, z0, z1, h: B.type === 'ruin' ? 4.5 + r() * 2 : r() < 0.5 ? 6.6 + r() * 1.2 : 4.0 + r() * 0.6, ruin: B.type === 'ruin' });
          for (const s of shuffle([...opens], r).slice(0, 1 + (r() < 0.45 ? 1 : 0))) b.doors.push({ s, t: 0.3 + r() * 0.4, w: B.type === 'ruin' ? 3 : 2.4 });
          if (r() < 0.65) b.part = r() < 0.5 ? { axis: 'z', at: x0 + 12 * (0.4 + r() * 0.2), t: 0.3 + r() * 0.4 } : { axis: 'x', at: z0 + 12 * (0.4 + r() * 0.2), t: 0.3 + r() * 0.4 };
          if (VAULT_SITES.includes(key)) b.basement = 'vault';
          break;
        }
        case 'yard': {
          const b = add({ x0, x1, z0, z1, h: 2.4, kind: 'yard', yard: true });
          for (const s of shuffle([...opens], r).slice(0, 1 + (r() < 0.3 ? 1 : 0))) b.doors.push({ s, t: 0.3 + r() * 0.4, w: 2.6 });
          break;
        }
        case 'chapel': case 'works': case 'barracks': {
          // over two blocks (east for the chapel, south for the others) and the lane between them
          const wide = B.type === 'chapel', bx1 = wide ? X(bi + 2) - LW / 2 : x1, bz1 = wide ? z1 : X(bj + 2) - LW / 2;
          const b = add({ x0, x1: bx1, z0, z1: bz1, h: B.type === 'chapel' ? 9 : B.type === 'works' ? 8 : 5, kind: B.type, basement: 'site' });
          // a doorway in each open lane along its sides (the halves of a long side are separate lanes)
          const halves = wide ? { n: [`h${bi},${bj}`, `h${bi + 1},${bj}`], s: [`h${bi},${bj + 1}`, `h${bi + 1},${bj + 1}`], w: [`v${bi},${bj}`], e: [`v${bi + 2},${bj}`] }
            : { n: [`h${bi},${bj}`], s: [`h${bi},${bj + 2}`], w: [`v${bi},${bj}`, `v${bi},${bj + 1}`], e: [`v${bi + 1},${bj}`, `v${bi + 1},${bj + 1}`] };
          for (const [s, list] of Object.entries(halves)) list.forEach((e, n) => { if (open.has(e)) b.doors.push({ s, t: (n + 0.5) / list.length, w: B.type === 'works' ? 3.2 : 2.6 }); });
          if (!b.doors.length) { open.add(halves.s[0]); b.doors.push({ s: 's', t: 0.5 / halves.s.length, w: 2.6 }); } // (never walled in)
          if (B.type !== 'chapel') b.part = wide ? null : { axis: 'x', at: (z0 + bz1) / 2, t: 0.5, w: 3 };
          break;
        }
        default: break; // plaza, rubble, merged
      }
    }
    this.walls = all.filter((e) => !open.has(e) && !closed.has(e)).map(edgeRect); // a wall wherever there's no lane
  }

  // ---------- queries ----------
  chunkAt(x, z) { const i = Math.max(0, Math.min(NC - 1, Math.floor((x - C0) / CH))), j = Math.max(0, Math.min(NC - 1, Math.floor((z - C0) / CH))); return this.chunks[j * NC + i]; }
  isUnder(x) { return x > UNDER; }
  underAt(x, z) { return this.unders.find((u) => x >= u.bx0 && x <= u.bx1 && z >= u.bz0 && z <= u.bz1) || null; }
  modAt(x, z) {
    if (x <= UNDER) return this.chunkAt(x, z);
    const u = this.underAt(x, z);
    if (u?.arena && Math.hypot(x - u.arena.x, z - u.arena.z) < u.arena.r + 8) return u.arenaMod;
    return u?.mod || this.chunks[0];
  }
  styleAt(x, z) {
    if (x <= UNDER) return 'city';
    const u = this.underAt(x, z);
    if (u?.arena && Math.hypot(x - u.arena.x, z - u.arena.z) < u.arena.r + 6) return ARENAS[this.bossId].ground;
    return 'under';
  }
  roam(i) { return this.w.mods[i]?.roamSet ?? null; }
  buildingAt(x, z) { for (const b of this.bAt.get(Math.floor(x / 10) * 1000 + Math.floor(z / 10)) || []) if (inside(b, x, z)) return b; return null; }
  // dark: underground, or under a roof (a house, not a ruin or a yard)
  darkAt(x, z) { if (x > UNDER) return true; const b = this.buildingAt(x, z); return !!b && !b.ruin && !b.yard; }
  // hidden from the camera: something tall stands just south of (x, z), between it and the camera (a building whose
  // roof is on, a lane wall), or it's under a roof you aren't under
  hides(x, z) {
    if (x > UNDER) return false;
    for (const o of this.occluders) {
      if (o.b?.cut || o.b?.faded || x < o.x0 - 0.2 || x > o.x1 + 0.2 || z >= o.z0 + 0.3 || z < o.z0 - o.h / 1.25) continue;
      return true;
    }
    return false;
  }
  // the stair you're standing at, if any
  stairAt(x, z) { return this.stairs.find((s) => Math.hypot(x - s.x, z - s.z) < 1.5) || null; }
  // map layers for the minimap: the streets, and each basement on its own
  layerAt(x, z) { return x <= UNDER ? this.layers[0] : this.layers.find((L) => L.u && x >= L.x0 && x <= L.x0 + L.W && z >= L.z0 && z <= L.z0 + L.H) || this.layers[0]; }

  // floor colours: boards and tiles indoors, packed dirt in the yards, paving on the squares, mud in the camp
  groundTint(x, z, c, n) {
    if (x > UNDER) return;
    const b = this.buildingAt(x, z);
    if (b && !b.yard) {
      const tile = ((Math.floor(x * 1.25) + Math.floor(z * 1.25)) & 1) ? 0.92 : 1;
      c.setHex(b.kind === 'chapel' ? 0x55504a : b.kind === 'works' ? 0x3a3a3c : 0x3e352c).multiplyScalar(tile * (0.94 + n * 0.08));
      return;
    }
    if (b?.yard || z > EDGE) { c.setHex(0x3a362c).multiplyScalar(0.9 + n * 0.2); return; }
    const B = this.blocks.find((q) => inside(q, x, z, 0.3));
    if (B?.type === 'plaza') c.setHex(0x55524c).multiplyScalar(((Math.floor(x / 1.5) + Math.floor(z / 1.5)) & 1 ? 0.93 : 1) * (0.95 + n * 0.08));
  }

  // ---------- building ----------
  build(w) {
    this.w = w; w.dungeon = this; w.cutaway = true;
    w.Z = (d) => d;
    w.rand = rng(MAP_SEED + 1); // props are part of the map: the same every raid
    // facades: soot-stained plaster, old brick, scorched render (lit a little brighter than the dungeon's walls)
    const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    this.facade = [lam(0x6e665a), lam(0x6a4a3a), lam(0x575450), lam(0x7a6e5e)];
    this.facadeDark = lam(0x3a3430);
    this.brick = lam(0x5a3e30);
    this.shroudMat = new THREE.MeshBasicMaterial({ color: 0x17130f });
    this.glass = new Map(); // a faded copy of each material a building uses
    this.stairs = []; this.unders = []; this.layers = []; this.occluders = []; this.exits = [];
    this.bAt = new Map();
    for (const b of this.buildings) for (let i = Math.floor(b.x0 / 10); i <= Math.floor(b.x1 / 10); i++) for (let j = Math.floor(b.z0 / 10); j <= Math.floor(b.z1 / 10); j++) {
      const k = i * 1000 + j; if (!this.bAt.has(k)) this.bAt.set(k, []); this.bAt.get(k).push(b);
    }
    // 1. the chunks and the city floor (one walkable square, cut per chunk with overlaps), and the camp to the south
    this.chunks = [];
    for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
      const group = new THREE.Group(); w.root.add(group);
      const cx = C0 + CH * (i + 0.5), cz = C0 + CH * (j + 0.5);
      const mod = { i: w.mods.length, key: 'city', name: this.def.name, cx, cz, z0: cz + CH / 2, z1: cz - CH / 2, len: CH, half: CH / 2, r: 6, group, ground: 'city', dungeon: true, zone: true, ci: i, cj: j };
      w.mods.push(mod); this.chunks.push(mod); w.cur = mod;
      const o = 1.6;
      w.rect(Math.max(-EDGE, cx - CH / 2 - o), Math.min(EDGE, cx + CH / 2 + o), Math.max(-EDGE, cz - CH / 2 - o), Math.min(EDGE, cz + CH / 2 + o));
    }
    for (const m of this.chunks) m.roamSet = new Set(this.chunks.filter((n) => Math.abs(n.ci - m.ci) <= 1 && Math.abs(n.cj - m.cj) <= 1).map((n) => n.i));
    this.at(w, 0, EDGE); w.rect(-8, 8, EDGE - 4, EDGE + 13);
    this.layers.push({ id: 'city', x0: -EDGE - 4, z0: -EDGE - 4, W: 2 * EDGE + 8, H: 2 * EDGE + 22 });

    // 2. the lane walls, the blocks and their buildings, the camp, round the edge
    this.laneWalls(w);
    for (const B of this.blocks) this.dressBlock(w, B);
    for (const b of this.buildings) this.buildBuilding(w, b);
    this.camp(w);
    this.rim(w);
    { const H = this.hatch; this.at(w, H.x, H.z); this.exitDoor(w, H.x + H.dx * 2.7, H.z + H.dz * 2.7, H.dx, H.dz, 'Slip out through the hatch'); }

    // 3. basements (and the boss's vault and arena)
    let k = 0;
    for (const b of this.buildings) {
      if (!b.basement) continue;
      const kind = b.block.key === this.bossSite ? 'boss' : b.block.key === this.cacheSite ? 'cache' : 'vault';
      this.buildUnder(w, b, kind, k++);
    }

    // 4. the walking grid (enemy paths, what can be reached), then shrines and enemies
    for (const L of this.layers) this.navLayer(w, L);
    this.seals(w);
    this.populate(w);

    // 5. terrain: 14 m tiles over the city and each basement
    const T14 = 14;
    const tiles = (x0, x1, z0, z1) => {
      for (let tx = Math.floor(x0 / T14) * T14; tx < x1; tx += T14) for (let tz = Math.floor(z0 / T14) * T14; tz < z1; tz += T14) {
        const group = new THREE.Group(); w.root.add(group);
        const tile = { x: tx + T14 / 2, z: tz + T14 / 2, group, i: -1 };
        const style = w.styleAt(tile.x, tile.z);
        group.add(w.groundMesh(tile.x, tile.z, T14, T14, style));
        w.cur = tile;
        if (style !== 'city') w.scatter('crypt', tx, tx + T14, tz, tz + T14);
        w.mergeStatic(group);
        w.tiles.push(tile);
      }
    };
    tiles(-EDGE - 14, EDGE + 14, -EDGE - 14, EDGE + 26);
    for (const L of this.layers) if (L.u) tiles(L.x0 - 12, L.x0 + L.W + 12, L.z0 - 12, L.z0 + L.H + 12);
    // each building's two halves merge on their own (so they can swap), then everything else per module
    for (const b of this.buildings) for (const g of [b.tall, b.low]) { w.mergeStatic(g); for (const c of g.children) c.userData.noMerge = true; }
    for (const m of w.mods) w.mergeStatic(m.group);
    w.cur = null;
    w.start = { ...this.startAt };
  }

  // a box into a building's own group (its tall or cut-away half)
  into(w, g, fn) { const cur = w.cur; w.cur = { i: cur.i, group: g }; fn(); w.cur = cur; }
  at(w, x, z) { w.cur = x > UNDER ? this.modAt(x, z) : this.chunkAt(x, z); return w.cur; }

  // ---------- a building: walls (solids) with doorways, roof and upper walls that lift off when you're in or behind it
  buildBuilding(w, b) {
    const mod = this.at(w, b.cx, b.cz), M = w.mats;
    const tall = new THREE.Group(), low = new THREE.Group(); low.visible = false;
    mod.group.add(tall, low);
    b.tall = tall; b.low = low; b.cut = false;
    if (!b.yard) {
      this.occluders.push({ b, x0: b.x0, x1: b.x1, z0: b.z0, h: b.h });
      // the dark that fills it while it's faded to glass (so you never see in), over the floor and the furniture; anyone in there is hidden too
      const sh = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0 - 2 * T - 0.1, 1.15, b.z1 - b.z0 - 2 * T - 0.1), this.shroudMat);
      sh.position.set(b.cx, 0.575, b.cz); sh.visible = false; sh.userData.noMerge = true; mod.group.add(sh);
      b.shroud = sh;
    }
    const wall = b.kind === 'chapel' ? M.stone : b.kind === 'works' ? this.facade[2] : this.facade[Math.floor(vh(b.cx, b.cz, 4) * 4)], trim = b.kind === 'works' ? M.rust : this.facadeDark;
    const segs = [];
    // the four outer walls, broken by doorways
    const side = (s) => {
      const alongX = s === 'n' || s === 's', a0 = alongX ? b.x0 : b.z0, a1 = alongX ? b.x1 : b.z1;
      const gaps = b.doors.filter((d) => d.s === s).map((d) => { const c = a0 + (a1 - a0) * d.t; return [c - d.w / 2, c + d.w / 2]; }).sort((p, q) => p[0] - q[0]);
      let from = a0;
      const line = s === 'n' ? b.z0 + T / 2 : s === 's' ? b.z1 - T / 2 : s === 'w' ? b.x0 + T / 2 : b.x1 - T / 2;
      for (const [g0, g1] of [...gaps, [a1, a1]]) {
        if (g0 - from > 0.05) segs.push({ alongX, a0: from, a1: g0, line, outer: s });
        if (g1 > g0) segs.push({ alongX, a0: g0, a1: g1, line, outer: s, door: true });
        from = g1;
      }
    };
    for (const s of ['n', 's', 'e', 'w']) side(s);
    if (b.part) {
      const P = b.part, alongX = P.axis === 'x', a0 = alongX ? b.x0 + T : b.z0 + T, a1 = alongX ? b.x1 - T : b.z1 - T, c = a0 + (a1 - a0) * P.t, dw = (P.w || 2.4) / 2;
      segs.push({ alongX, a0, a1: c - dw, line: P.at }, { alongX, a0: c - dw, a1: c + dw, line: P.at, door: true }, { alongX, a0: c + dw, a1, line: P.at });
    }
    const boxAt = (s, a0, a1, y0, y1, mat, g, grow = 0) => {
      const len = a1 - a0 + grow, mid = (a0 + a1) / 2, h = y1 - y0;
      if (len <= 0.02 || h <= 0.02) return;
      this.into(w, g, () => (s.alongX ? w.box(len, h, T, mat, mid, y0 + h / 2, s.line) : w.box(T, h, len, mat, s.line, y0 + h / 2, mid)));
    };
    for (const s of segs) {
      if (s.door) {
        if (b.yard) { for (const e of [s.a0, s.a1]) this.into(w, tall, () => (s.alongX ? w.box(0.4, 2.9, 0.7, trim, e, 1.45, s.line) : w.box(0.7, 2.9, 0.4, trim, s.line, 1.45, e))); continue; } // (gateposts)
        // a lintel over the doorway, and a dark threshold
        if (!b.ruin) boxAt(s, s.a0, s.a1, 2.7, b.h, wall, tall, T);
        boxAt(s, s.a0 - 0.15, s.a1 + 0.15, 2.55, 2.75, trim, tall, T * 0.6);
        continue;
      }
      w.solids.push(s.alongX ? { x0: s.a0, x1: s.a1, z0: s.line - T / 2, z1: s.line + T / 2 } : { x0: s.line - T / 2, x1: s.line + T / 2, z0: s.a0, z1: s.a1 });
      boxAt(s, s.a0, s.a1, 0, 1.0, wall, low, T);
      boxAt(s, s.a0, s.a1, 1.0, 1.12, trim, low, T + 0.06);
      if (b.ruin) {
        // broken off in jagged steps
        for (let a = s.a0; a < s.a1 - 0.05; a += 1.6) { const e = Math.min(s.a1, a + 1.6); boxAt(s, a, e, 0, b.h * (0.35 + vh(a, s.line, 2) * 0.65), wall, tall, a === s.a0 ? T : 0); }
      } else boxAt(s, s.a0, s.a1, 0, b.h, wall, tall, T);
      // windows along the outer walls (never in a ruin's broken tops), pilasters between them
      if (!s.outer || b.yard) continue;
      const out = (s.outer === 's' || s.outer === 'e') ? 1 : -1;
      for (let a = s.a0 + 0.2; a < s.a1 - 0.1; a += 3) {
        const ph = b.ruin ? b.h * (0.35 + vh(a, s.line, 2) * 0.65) : b.h;
        this.into(w, tall, () => (s.alongX ? w.box(0.4, ph, 0.2, trim, a, ph / 2, s.line + out * 0.3) : w.box(0.2, ph, 0.4, trim, s.line + out * 0.3, ph / 2, a)));
      }
      this.into(w, tall, () => (s.alongX ? w.box(s.a1 - s.a0, 0.5, 0.16, trim, (s.a0 + s.a1) / 2, 0.25, s.line + out * 0.3) : w.box(0.16, 0.5, s.a1 - s.a0, trim, s.line + out * 0.3, 0.25, (s.a0 + s.a1) / 2)));
      for (let a = s.a0 + 0.2; a < s.a1 - 2.6; a += 3) {
        const lit = vh(a, s.line, 5) < 0.18, mat = b.kind === 'chapel' ? M.glowRed : lit ? M.glowWindow : M.logDark;
        const off = (s.outer === 's' || s.outer === 'e') ? 0.04 : -0.04;
        const win = (y, hh) => this.into(w, tall, () => {
          if (s.alongX) { w.box(1.0, hh, T + 0.04, mat, a + 1.5, y, s.line + off); w.box(1.3, 0.14, T + 0.2, trim, a + 1.5, y - hh / 2 - 0.07, s.line + off); }
          else { w.box(T + 0.04, hh, 1.0, mat, s.line + off, y, a + 1.5); w.box(T + 0.2, 0.14, 1.3, trim, s.line + off, y - hh / 2 - 0.07, a + 1.5); }
        });
        if (b.kind === 'chapel') win(4.5, 3.2);
        else { if (!b.ruin || vh(a, s.line, 2) > 0.3) win(1.8, 0.8); if (b.h > 6 && !b.ruin) win(5.0, 0.8); }
      }
    }
    // roof, parapet and a storey ledge
    const W = b.x1 - b.x0, D = b.z1 - b.z0;
    if (!b.yard) this.into(w, tall, () => {
      if (!b.ruin) {
        w.box(W + 0.3, 0.3, D + 0.3, trim, b.cx, b.h + 0.15, b.cz);
        for (const [x, z, ww, dd] of [[b.cx, b.z0, W + 0.3, 0.3], [b.cx, b.z1, W + 0.3, 0.3], [b.x0, b.cz, 0.3, D + 0.3], [b.x1, b.cz, 0.3, D + 0.3]]) w.box(ww, 0.5, dd, wall, x, b.h + 0.55, z);
        if (b.kind === 'chapel') { w.box(W * 0.5, 2.4, D * 0.8, M.stoneDark, b.cx, b.h + 1.5, b.cz); w.box(2.2, 7, 2.2, M.stone, b.cx, b.h + 3.5, b.z1 - 2.5); w.box(0.4, 1.6, 0.4, M.brass, b.cx, b.h + 7.8, b.z1 - 2.5); w.box(1.2, 0.3, 0.3, M.brass, b.cx, b.h + 8.1, b.z1 - 2.5); }
        if (b.kind === 'works') for (const t of [0.25, 0.75]) { w.cyl(0.8, 1.0, 7, M.rust, b.x0 + W * t, b.h + 3.5, b.z0 + 3, 7); w.cyl(0.9, 0.9, 0.3, M.logDark, b.x0 + W * t, b.h + 6.9, b.z0 + 3, 7); }
        if (vh(b.cx, b.cz, 8) < 0.4) { w.box(1.6, 1.0, 1.2, M.metal, b.x0 + 2, b.h + 0.8, b.z0 + 2); w.cyl(0.04, 0.04, 2.2, M.metal, b.x1 - 1.5, b.h + 1.4, b.z0 + 1.5, 4); }
      } else {
        // a ruin: a fallen beam or two across the top
        w.box(W * 0.8, 0.25, 0.3, M.logDark, b.cx, b.h * 0.6, b.cz - D * 0.2, 0.2);
      }
      if (b.h > 6) for (const s of segs) if (s.outer && !s.door) boxAt(s, s.a0, s.a1, 3.6, 3.85, trim, tall, T + 0.12);
    });
    this.furnish(w, b);
  }

  // what's inside: beds, tables, crates, rubble, a lamp; machines in the works, pews in the chapel
  furnish(w, b) {
    const r = w.rand, M = w.mats;
    this.at(w, b.cx, b.cz);
    const free = (x, z, m = 1.2) => inside(b, x, z, -T - m) && !w.blocked(x, z, 0.9) && !(b.stair && Math.hypot(x - b.stair.x, z - b.stair.z) < 2.8) && !b.doors.some((d) => this.doorPos(b, d).some((p) => Math.hypot(p.x - x, p.z - z) < 2.6));
    const spot = (m) => { for (let t = 0; t < 30; t++) { const x = b.x0 + r() * (b.x1 - b.x0), z = b.z0 + r() * (b.z1 - b.z0); if (free(x, z, m)) return { x, z }; } return null; };
    if (b.basement) {
      // the stair down: against the north wall, away from the doorways
      for (let t = 0; t < 40 && !b.stair; t++) {
        const x = b.x0 + 2 + r() * (b.x1 - b.x0 - 4), z = b.z0 + T + 1.5;
        if (b.kind === 'chapel' && Math.abs(x - b.cx) < 3.5) continue; // (the altar's place)
        if (!w.blocked(x, z, 1.2) && !w.blocked(x, z + 2, 1.0) && !b.doors.some((d) => this.doorPos(b, d).some((p) => Math.hypot(p.x - x, p.z - z) < 3))) b.stair = { x, z };
      }
      b.stair ||= { x: b.cx, z: b.cz };
      this.stairDown(w, b.stair.x, b.stair.z);
    }
    if (b.kind === 'chapel') {
      // a nave running east-west: two rows of columns, pews between, the altar on the north wall lit by candles alone
      for (let x = b.x0 + 3; x < b.x1 - 2; x += 4.5) if (Math.abs(x - b.cx) > 3) for (const z of [b.z0 + 4.6, b.z1 - 2.6]) w.pillar(x, z, 5.5, vh(x, z, 3) < 0.25);
      for (let x = b.x0 + 4; x < b.x1 - 3; x += 2.4) if (Math.abs(x - b.cx) > 2.4) w.box(0.5, 0.5, 2.6, M.logDark, x, 0.25, b.cz + 1.2, (vh(x, 1) - 0.5) * 0.3);
      w.box(3.2, 1.0, 1.2, M.stoneDark, b.cx, 0.5, b.z0 + 1.6); w.ob(b.cx, b.z0 + 1.6, 1.1);
      candles(w, b.cx - 1, b.z0 + 1.6, 6); w.banner(b.cx - 3, b.z0 + 0.9); w.banner(b.cx + 3, b.z0 + 0.9);
      w.lights.push({ x: b.cx, y: 1.6, z: b.z0 + 2.4, color: 0xffb060, power: 3.5, range: 6, src: {} }); // (the candles)
      return;
    }
    if (b.kind === 'works') {
      // machines: big solid housings with pipes and a glow
      for (let k = 0; k < 4; k++) {
        const p = spot(3.2); if (!p) continue;
        const ww = 2.4 + r() * 1.6, dd = 2 + r() * 1.4, hh = 1.6 + r() * 1.6;
        w.box(ww, hh, dd, k % 2 ? M.rust : M.metal, p.x, hh / 2, p.z); w.box(ww * 0.6, 0.3, dd * 0.6, M.logDark, p.x, hh + 0.15, p.z);
        w.box(0.3, 0.2, 0.05, M.glowAmber, p.x, hh * 0.7, p.z + dd / 2 + 0.03);
        w.solids.push({ x0: p.x - ww / 2, x1: p.x + ww / 2, z0: p.z - dd / 2, z1: p.z + dd / 2 });
      }
      for (let k = 0; k < 3; k++) { const p = spot(1); if (p) w.drums.push(buildDrum(w, p.x, p.z, true)); } // (plain drums: smash them, often empty)
      return;
    }
    if (b.yard) {
      // a walled yard: dead trees, graves, a cart, a cage
      for (let k = 0; k < 4; k++) { const p = spot(1.2); if (p) w.box(0.6, 0.9, 0.2, M.stone, p.x, 0.45, p.z, (r() - 0.5) * 0.4); }
      for (let k = 0; k < 2; k++) { const p = spot(1.4); if (p) { w.deadTree(p.x, p.z, 2.6 + r() * 1.4); w.ob(p.x, p.z, 0.4); } }
      const p = spot(1.6); if (p) (r() < 0.5 ? cart : cage)(w, p.x, p.z, r() * 6);
      if (r() < 0.5) { const q = spot(1); if (q) skullStake(w, q.x, q.z); }
      return;
    }
    const n = Math.floor((b.x1 - b.x0) * (b.z1 - b.z0) / 30);
    for (let k = 0; k < Math.min(6, n); k++) {
      const p = spot(1.0); if (!p) continue;
      const q = r();
      if (q < 0.25) { w.box(1.0, 0.45, 2.0, M.logDark, p.x, 0.22, p.z, r() < 0.5 ? 0 : Math.PI / 2); w.box(0.9, 0.12, 1.9, M.cloth, p.x, 0.5, p.z); }
      else if (q < 0.45) { w.box(1.4, 0.75, 0.8, M.plank, p.x, 0.38, p.z, r()); w.ob(p.x, p.z, 0.6); }
      else if (q < 0.65) w.crate(p.x, p.z);
      else if (q < 0.8) { w.rock(p.x, p.z, 0.5 + r() * 0.3, true); }
      else if (q < 0.9) corpse(w, p.x, p.z, r() * 6);
      else sacks(w, p.x, p.z);
    }
    if (b.ruin && r() < 0.5) { const p = spot(0.8); if (p) w.torch(p.x, p.z); } // (a roofed house has no light of its own)
    if (b.kind === 'barracks') { for (let k = 0; k < 3; k++) { const p = spot(1); if (p) w.rack(p.x, p.z); } w.banner(b.cx, b.z0 + 1); }
  }

  // the outside spots of a doorway (just out and just in)
  doorPos(b, d) {
    const alongX = d.s === 'n' || d.s === 's', c = alongX ? b.x0 + (b.x1 - b.x0) * d.t : b.z0 + (b.z1 - b.z0) * d.t;
    const line = d.s === 'n' ? b.z0 : d.s === 's' ? b.z1 : d.s === 'w' ? b.x0 : b.x1;
    return [-1.2, 1.2].map((o) => (alongX ? { x: c, z: line + o } : { x: line + o, z: c }));
  }

  // a stairwell going down: a black opening with a hazard-painted frame and a red lamp
  stairDown(w, x, z) {
    const M = w.mats;
    w.box(1.8, 0.04, 2.4, M.ash, x, 0.02, z);
    for (let k = 0; k < 4; k++) w.box(1.6, 0.03, 0.4, M.logDark, x, 0.045, z - 0.9 + k * 0.5);
    for (const s of [-1, 1]) { w.box(0.1, 0.9, 2.4, M.hazard, x + s * 0.95, 0.45, z); w.box(0.12, 0.12, 2.4, M.logDark, x + s * 0.95, 0.95, z); }
    w.box(0.2, 0.2, 0.2, M.glowRed, x, 1.6, z - 1.3);
    w.lights.push({ x, y: 1.6, z: z - 1.2, color: 0xff3a24, power: 4, range: 5, src: {} });
  }
  // and coming up from below: steps rising south (toward the camera, where the wall stays low) to a lit doorway
  stairUp(w, x, z) {
    const M = w.mats;
    for (let k = 0; k < 5; k++) w.box(2.2, 0.2 + k * 0.2, 0.45, M.stoneDark, x, (0.2 + k * 0.2) / 2, z - 0.9 + k * 0.45);
    w.box(2.0, 0.9, 0.2, M.glowWindow, x, 0.95, z + 1.8); w.box(2.6, 0.25, 0.4, M.stoneDark, x, 1.5, z + 1.8);
    for (const s of [-1, 1]) w.box(0.12, 1.1, 2.4, M.hazard, x + s * 1.2, 0.55, z + 0.1);
    w.torch(x - 2, z - 1.2, 0x9ad0ff, true);
  }

  // ---------- the maze's walls: wherever no lane was carved, a broken brick wall with rubble banked either side
  laneWalls(w) {
    const M = w.mats;
    for (const R of this.walls) {
      this.at(w, (R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2);
      w.solids.push({ x0: R.x0, x1: R.x1, z0: R.z0, z1: R.z1 });
      const len = R.alongX ? R.x1 - R.x0 : R.z1 - R.z0, mid = R.alongX ? (R.z0 + R.z1) / 2 : (R.x0 + R.x1) / 2;
      let hMax = 0;
      for (let a = 0; a < len - 0.05; a += 1.5) {
        const e = Math.min(len, a + 1.5), h = 2.6 + vh(a + R.x0, mid + R.z0, 3) * 1.6, c = (a + e) / 2;
        hMax = Math.max(hMax, h);
        const mat = vh(c, mid, 5) < 0.7 ? this.brick : this.facade[2];
        if (R.alongX) w.box(e - a + 0.02, h, 0.8, mat, R.x0 + c, h / 2, mid); else w.box(0.8, h, e - a + 0.02, mat, mid, h / 2, R.z0 + c);
      }
      // rubble along both faces, low to the south (it never hides you)
      for (let a = 0.6; a < len - 0.4; a += 1.3) for (const s of [-1, 1]) {
        const off = s * (1.0 + vh(a, s, 1) * 0.5), x = R.alongX ? R.x0 + a : mid + off, z = R.alongX ? mid + off : R.z0 + a;
        w.rock(x, z, 0.35 + vh(x, z) * 0.35, vh(x, z, 2) < 0.5);
      }
      this.occluders.push({ x0: R.x0, x1: R.x1, z0: R.z0, h: hMax });
    }
    // chokepoints: a heap of rubble and scrap across a lane, leaving a 2 m gap down one side (never by a square or the gate)
    const r = w.rand, sq = new Set(), plz = this.blocks.filter((B) => B.type === 'plaza');
    for (const B of plz) for (const e of [`h${B.i},${B.j}`, `h${B.i},${B.j + 1}`, `v${B.i},${B.j}`, `v${B.i + 1},${B.j}`]) sq.add(e);
    const lanes = shuffle([...this.open].filter((e) => !sq.has(e) && e !== 'v3,5'), r);
    const doors = this.buildings.flatMap((b) => b.doors.map((d) => this.doorPos(b, d)[0]));
    let placed = 0;
    for (const e of lanes) {
      if (placed >= 8) break;
      const R = edgeRect(e), side = r() < 0.5 ? 0 : 1, gap = 2.0, t = 0.35 + r() * 0.3;
      const along = R.alongX ? R.x0 + (R.x1 - R.x0) * t : R.z0 + (R.z1 - R.z0) * t;
      const a0 = (R.alongX ? R.z0 : R.x0) + (side ? gap : 0), a1 = (R.alongX ? R.z1 : R.x1) - (side ? 0 : gap);
      const S = R.alongX ? { x0: along - 0.8, x1: along + 0.8, z0: a0, z1: a1 } : { x0: a0, x1: a1, z0: along - 0.8, z1: along + 0.8 };
      if (doors.some((d) => d.x > S.x0 - 3 && d.x < S.x1 + 3 && d.z > S.z0 - 3 && d.z < S.z1 + 3)) continue; // (never in front of a doorway)
      placed++;
      this.at(w, (S.x0 + S.x1) / 2, (S.z0 + S.z1) / 2);
      w.solids.push(S);
      for (let a = 0.3; a < (R.alongX ? S.z1 - S.z0 : S.x1 - S.x0); a += 0.9) {
        const x = R.alongX ? along : S.x0 + a, z = R.alongX ? S.z0 + a : along;
        if (vh(x, z, 7) < 0.5) w.rock(x, z, 0.5 + vh(x, z) * 0.4, true); else w.box(0.9, 0.7 + vh(x, z, 2) * 0.6, 0.9, vh(x, z, 3) < 0.5 ? M.rust : M.cloth, x, 0.5, z, vh(x, z, 4));
      }
    }
  }

  // ---------- blocks: what's out in the open ----------
  dressBlock(w, B) {
    const r = w.rand, M = w.mats, { x0, x1, z0, z1, cx, cz } = B;
    this.at(w, cx, cz);
    if (B.type === 'rubble') {
      // a block that came down: a heap you can't cross, highest at the back so it never hides you
      w.solids.push({ x0, x1, z0, z1 });
      for (let x = x0 + 0.8; x < x1 - 0.4; x += 1.8) for (let z = z0 + 0.8; z < z1 - 0.4; z += 1.8) {
        const back = (z1 - z) / (z1 - z0);
        w.rock(x + (vh(x, z, 1) - 0.5), z + (vh(x, z, 2) - 0.5), 0.5 + back * 1.3 + vh(x, z) * 0.5, vh(x, z, 3) < 0.5);
      }
      w.box(0.5, 3 + r() * 3, 5, M.char, cx - 2, 2, cz - 3, r() * 3);
      crows(w, cx, cz + 2, 3);
    } else if (B.type === 'plaza') {
      // a little square: a dry fountain basin you go round, a lamp or two, litter; the middle stays clear for a shrine
      for (const [px, pz] of [[x0 + 1.2, z0 + 1.2], [x1 - 1.2, z1 - 1.2]]) w.torch(px, pz);
      bloodStain(w, cx + 3, cz + 3, 1.2); bones(w, x0 + 2, z1 - 1.5); sacks(w, x1 - 1.5, z0 + 1.5);
    }
  }

  // the crusade's camp south of the ward: sandbags, tents, the beacon; the gate into the maze at its north end
  camp(w) {
    const M = w.mats, z0 = EDGE, cx = 0;
    this.at(w, 0, EDGE + 4);
    for (const s of [-1, 1]) { w.box(1.0, 1.0, 12, M.cloth, s * 7.6, 0.5, z0 + 7); w.tent(s * 5, z0 + 10, s, 0.85); w.banner(s * 2.6, z0 + 0.8); }
    for (let k = 0; k < 3; k++) w.crate(-5.5 + k * 0.9, z0 + 4);
    w.brazier(5.5, z0 + 3.5, { light: true });
    const fire = w.bonfire(cx, z0 + 2.3); fire.lit = true;
    candles(w, cx - 1.4, z0 + 1.9, 4);
    this.startAt = { x: cx, z: z0 + 9 };
    // the way you came in, at the camp's south end: a way out too
    this.exitDoor(w, cx, EDGE + 13.4, 0, 1, 'Leave by the camp gate');
  }

  // a way out of the raid (main.js: extract): a blast door in a frame with a green lamp, set into the edge, facing in
  exitDoor(w, x, z, dx, dz, label) {
    const M = w.mats, g = new THREE.Group(), across = dz !== 0;
    g.position.set(x, 0, z); g.rotation.y = across ? 0 : Math.PI / 2;
    const part = (W, H, D, mat, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mat); m.position.set(px, py, pz); g.add(m); };
    for (const s of [-1, 1]) part(0.7, 4.0, 1.0, M.stoneDark, s * 1.75, 2.0, 0);
    part(4.2, 0.8, 1.0, M.stoneDark, 0, 4.2, 0);
    part(2.8, 3.6, 0.3, M.metal, 0, 1.8, 0);
    for (let k = 0; k < 4; k++) part(2.8, 0.18, 0.34, k % 2 ? M.logDark : M.hazard, 0, 0.5 + k * 0.9, 0);
    const lamp = new THREE.MeshBasicMaterial({ color: 0x5aff7a });
    part(0.4, 0.22, 0.4, lamp, 0, 4.7, 0);
    w.add(g); g.userData.noMerge = false;
    const ix = x - dx * 1.4, iz = z - dz * 1.4;
    w.lights.push({ x: ix, y: 3.6, z: iz, color: 0x5aff7a, power: 5, range: 7, src: {} });
    this.exits.push({ x: ix, z: iz, label, door: { x, z } });
  }

  // round the ward: ruined facades on three sides, rubble along the south (low, so it never hides you)
  rim(w) {
    const M = w.mats, E = EDGE + 3;
    for (let a = -E; a <= E; a += 5) {
      for (const [x, z, alongX] of [[a, -E, true], [-E, a, false], [E, a, false]]) {
        this.at(w, Math.max(-EDGE, Math.min(EDGE, x)), Math.max(-EDGE, Math.min(EDGE, z)));
        const h = 5 + vh(x, z) * 7, ww = 5.2;
        w.box(alongX ? ww : 4, h, alongX ? 4 : ww, vh(x, z, 2) < 0.5 ? this.facade[0] : this.facade[2], x, h / 2, z);
        for (let y = 2; y < h - 1; y += 3) w.box(alongX ? 1 : 4.1, 0.8, alongX ? 4.1 : 1, vh(x, y, 3) < 0.1 ? M.glowWindow : M.logDark, x, y, z);
      }
      if (Math.abs(a) > 9) { this.at(w, a, EDGE); w.rock(a, E - 1, 0.6 + vh(a, 5) * 0.5, vh(a, 6) < 0.5); }
    }
  }

  // ---------- basements ----------
  buildUnder(w, b, kind, k) {
    const ox = 400 + (k % 4) * 100, oz = -150 + Math.floor(k / 4) * 120;
    const group = new THREE.Group(); w.root.add(group);
    const names = { cellar: 'Cellars', vault: 'The Vaults', boss: 'The Deep Vault', cache: 'The Reliquary Hoard' };
    const mod = { i: w.mods.length, key: 'under', name: names[kind], cx: ox, cz: oz - 15, z0: oz + 10, z1: oz - 45, len: 55, half: 30, r: 24, group, ground: 'under', dungeon: true, zone: true, under: true };
    mod.roamSet = new Set([mod.i]);
    w.mods.push(mod); w.cur = mod;
    const u = { k, kind, b, ox, oz, mod, bx0: ox - 40, bx1: ox + 40, bz0: oz - 75, bz1: oz + 15 };
    this.unders.push(u); b.under = u;
    const R = (x0, x1, z0, z1) => w.rect(x0, x1, z0, z1);
    const r = w.rand, M = w.mats;
    // the room you arrive in, with the stair up in its north wall
    R(ox - 6, ox + 6, oz - 6, oz + 5);
    this.stairUp(w, ox, oz + 3.4);
    u.arrive = { x: ox, z: oz + 0.8 };
    this.stairs.push({ x: b.stair.x, z: b.stair.z, to: u.arrive, label: 'Go down', down: true, name: names[kind], u });
    this.stairs.push({ x: ox, z: oz + 2.6, to: { x: b.stair.x, z: b.stair.z + 2.2 }, label: 'Climb up', down: false, name: this.def.name });
    const lamp = (x, z, cold = false) => w.torch(x, z, cold ? 0x9ad0ff : 0xffb04a, cold);
    lamp(ox - 5, oz - 5);
    const rooms = [];
    if (kind === 'cellar') {
      R(ox + 4, ox + 15, oz - 1.6, oz + 1.6); R(ox + 13, ox + 25, oz - 6, oz + 4); rooms.push([ox + 19, oz - 1, 5]);
      if (r() < 0.6) { R(ox + 17.4, ox + 20.6, oz - 17, oz - 4); R(ox + 13, ox + 25, oz - 26, oz - 15); rooms.push([ox + 19, oz - 20.5, 5]); }
      R(ox - 1.6, ox + 1.6, oz - 15, oz - 4); R(ox - 6, ox + 6, oz - 24, oz - 13); rooms.push([ox, oz - 18.5, 5]);
    } else if (kind === 'vault' || kind === 'cache') {
      R(ox - 1.8, ox + 1.8, oz - 17, oz - 4); R(ox - 13, ox + 13, oz - 42, oz - 15);
      R(ox + 11, ox + 20, oz - 31, oz - 25); R(ox + 17, ox + 26, oz - 36, oz - 20); rooms.push([ox + 21.5, oz - 28, 4]);
      u.hall = { x: ox, z: oz - 28.5 };
      for (const s of [-1, 1]) for (const t of [-1, 1]) w.pillar(ox + s * 8, oz - 28.5 + t * 7, 4.2, vh(s, t) < 0.3);
    } else this.buildArena(w, u); // the boss's vault: a long corridor north to the door, the arena past it
    w.cur = mod;
    for (const [x, z, s] of rooms) {
      lamp(x - s + 1, z - s + 1);
      for (let n = 0; n < 3; n++) { const px = x + (r() - 0.5) * s * 1.4, pz = z + (r() - 0.5) * s * 1.4; const q = r(); if (q < 0.4) w.crate(px, pz); else if (q < 0.7) w.drums.push(buildDrum(w, px, pz, true)); else bones(w, px, pz); }
      if (r() < 0.5) w.pool(x + (r() - 0.5) * 3, z + (r() - 0.5) * 3, 1.6 + r());
    }
    // pipes along the walls of the first room
    for (const s of [-1, 1]) w.box(0.25, 0.25, 10, M.rust, ox + s * 5.6, 2.4, oz - 0.5);
    // the layer for the map and the walking grid: everything this basement (and its arena) put down
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const sh of w.shapes) {
      const m = w.mods[sh.mod]; if (m !== mod && m !== u.arenaMod) continue;
      const bb = sh.t === 'r' ? [sh.x0, sh.x1, sh.z0, sh.z1] : [sh.x - sh.r, sh.x + sh.r, sh.z - sh.r, sh.z + sh.r];
      x0 = Math.min(x0, bb[0]); x1 = Math.max(x1, bb[1]); z0 = Math.min(z0, bb[2]); z1 = Math.max(z1, bb[3]);
    }
    const L = { id: 'u' + k, u, x0: Math.floor(x0) - 4, z0: Math.floor(z0) - 4, W: Math.ceil(x1 - x0) + 8, H: Math.ceil(z1 - z0) + 8 };
    u.bx0 = L.x0; u.bx1 = L.x0 + L.W; u.bz0 = L.z0; u.bz1 = L.z0 + L.H;
    this.layers.push(L);
  }

  buildArena(w, u) {
    const { ox, oz } = u, info = ARENAS[this.bossId];
    const group = new THREE.Group(); w.root.add(group);
    const A = { x: ox, z: oz - 47, r: 13 };
    const mod = { i: w.mods.length, key: 'mini:' + this.bossId, name: info.name, cx: A.x, cz: A.z, z0: A.z + 20, z1: A.z - 20, len: 40, half: 20, r: 8, group, ground: info.ground, dungeon: true, arena: true };
    w.mods.push(mod); w.cur = mod; u.arenaMod = mod; u.arena = A;
    w.circle(A.x, A.z, A.r);
    // the corridor north from the vault, the sealed door across it (pieces overlap 1.5 m, as in dungeon.js)
    const seg = (d0, d1, o = {}) => w.rect(ox - 2.6, ox + 2.6, oz - Math.max(d0, d1), oz - Math.min(d0, d1), o);
    const gid = 'in' + mod.i, gd = 18;
    seg(4, gd - 1); seg(gd - 2.5, gd + 2.5, { gate: gid }); seg(gd + 1, 47 - A.r + 2);
    w.gateAt(gid, ox, oz - gd, false, 6, false);
    for (let d = 7; d < gd - 2; d += 5) for (const s of [-1, 1]) w.torch(ox + s * 3.4, oz - d, 0xff5030);
    const enc = { id: 'mini' + mod.i, kind: 'mini', bossId: this.bossId, arena: { ...A }, gateIn: gid, gateOut: null, mod: mod.i, active: false, defeated: false, sealed: true, dungeon: true, raid: true };
    w.encounters.push(enc);
    this.enc = enc;
    stoneRing(w, A.x, A.z, A.r, [Math.atan2(-1, -0)]);
    arenaFurnish(w, info.theme, A.x, A.z, enc);
    decorateArena(w, info.theme, A.x, A.z, A.r, enc);
  }

  // ---------- the walking grid: a 1 m grid per layer, what's reachable, and flow fields for enemies ----------
  navLayer(w, L) {
    L.ok = new Uint8Array(L.W * L.H);
    for (let j = 0; j < L.H; j++) for (let i = 0; i < L.W; i++) if (w.walkable(L.x0 + i + 0.5, L.z0 + j + 0.5, 0.45, null, true)) L.ok[j * L.W + i] = 1;
    // reachable from where you come in
    const from = L.u ? L.u.arrive : this.startAt, seen = new Uint8Array(L.W * L.H), q = [];
    const s = this.cell(L, from.x, from.z);
    if (s >= 0 && L.ok[s]) { seen[s] = 1; q.push(s); }
    while (q.length) {
      const k = q.pop(), i = k % L.W, j = (k - i) / L.W;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + a, jj = j + b, kk = jj * L.W + ii;
        if (ii < 0 || jj < 0 || ii >= L.W || jj >= L.H || seen[kk] || !L.ok[kk]) continue;
        seen[kk] = 1; q.push(kk);
      }
    }
    L.reach = seen;
    L.flows = new Map();
  }
  cell(L, x, z) { const i = Math.floor(x - L.x0), j = Math.floor(z - L.z0); return i < 0 || j < 0 || i >= L.W || j >= L.H ? -1 : j * L.W + i; }
  reach(x, z) { const L = this.layerAt(x, z), k = this.cell(L, x, z); return k >= 0 && !!L.reach?.[k]; }

  // which way an enemy at e.pos should go to reach (tx, tz): null when the straight line is clear (or no path is known)
  steer(e, tx, tz) {
    const L = this.layerAt(e.pos.x, e.pos.z);
    if (!L.ok || L !== this.layerAt(tx, tz)) return null;
    // a clear straight line: go straight
    const dx = tx - e.pos.x, dz = tz - e.pos.z, d = Math.hypot(dx, dz), n = Math.ceil(d / 0.5);
    let clear = true;
    for (let s = 1; s < n && clear; s++) { const k = this.cell(L, e.pos.x + dx * s / n, e.pos.z + dz * s / n); if (k < 0 || !L.ok[k]) clear = false; }
    if (clear) return null;
    const F = this.flow(L, tx, tz), R = F.R, S = 2 * R + 1;
    const ci = Math.floor(e.pos.x - L.x0) - F.i0, cj = Math.floor(e.pos.z - L.z0) - F.j0;
    if (ci < 0 || cj < 0 || ci >= S || cj >= S) return null;
    const here = F.d[cj * S + ci];
    let best = here < 0 ? 1e9 : here, bx = 0, bz = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      if (!a && !b) continue;
      const ii = ci + a, jj = cj + b;
      if (ii < 0 || jj < 0 || ii >= S || jj >= S) continue;
      if (a && b && (F.d[cj * S + ii] < 0 || F.d[jj * S + ci] < 0)) continue; // (no cutting corners)
      const v = F.d[jj * S + ii];
      if (v >= 0 && v < best) { best = v; bx = a; bz = b; }
    }
    if (!bx && !bz) return null;
    // head for the middle of that cell
    const gx = L.x0 + F.i0 + ci + bx + 0.5 - e.pos.x, gz = L.z0 + F.j0 + cj + bz + 0.5 - e.pos.z, gl = Math.hypot(gx, gz) || 1;
    return { x: gx / gl, z: gz / gl };
  }
  // distances (in steps) to a target cell over a 73 m window round it, kept a moment and shared by every chaser
  flow(L, tx, tz) {
    const R = 36, S = 2 * R + 1, ti = Math.floor(tx - L.x0), tj = Math.floor(tz - L.z0), key = ti * 10000 + tj, now = performance.now();
    const old = L.flows.get(key);
    if (old && now - old.at < 500) return old;
    if (L.flows.size > 12) for (const [k, f] of L.flows) if (now - f.at > 500) L.flows.delete(k);
    const d = new Int16Array(S * S).fill(-1), i0 = ti - R, j0 = tj - R, q = [];
    const okAt = (i, j) => { const gi = i0 + i, gj = j0 + j; return gi >= 0 && gj >= 0 && gi < L.W && gj < L.H && L.ok[gj * L.W + gi]; };
    d[R * S + R] = 0; q.push(R * S + R);
    for (let h = 0; h < q.length; h++) {
      const k = q[h], i = k % S, j = (k - i) / S;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + a, jj = j + b;
        if (ii < 0 || jj < 0 || ii >= S || jj >= S || d[jj * S + ii] >= 0 || !okAt(ii, jj)) continue;
        d[jj * S + ii] = d[k] + 1; q.push(jj * S + ii);
      }
    }
    const F = { d, i0, j0, R, at: now };
    L.flows.set(key, F);
    return F;
  }

  // ---------- shrines ----------
  seals(w) {
    this.sites = this.shrineSites.map((key, n) => {
      const B = this.blocks.find((b) => b.key === key);
      const bld = B.bld.find((b) => b.under);
      const at = bld ? bld.under.hall : { x: B.cx, z: B.cz };
      return { key, x: at.x, z: at.z, kind: this.shrineKinds[n], under: !!bld };
    });
    this.sites.forEach((s) => this.buildShrine(w, s));
  }

  buildShrine(w, S) {
    const x = S.x, z = S.z, M = w.mats, mod = this.at(w, x, z);
    const color = S.kind === 'altar' ? 0xff3a2a : S.kind === 'circle' ? 0xffc040 : 0xb060ff;
    // the shrine: a stepped base, a pillar carved with runes, a crystal floating over it, a beam of light seen from afar
    w.box(2.2, 0.4, 2.2, M.stoneDark, x, 0.2, z); w.box(1.6, 0.4, 1.6, M.stone, x, 0.6, z);
    w.cyl(0.38, 0.55, 2.4, M.stoneDark, x, 2.0, z, 4);
    w.ob(x, z, 1.2);
    const glow = new THREE.MeshBasicMaterial({ color });
    for (const s of [-1, 1]) { const rune = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.04), glow); rune.position.set(x + s * 0.2, 2.0, z + 0.42); w.add(rune); }
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), glow);
    crystal.position.set(x, 3.7, z); crystal.scale.y = 1.6; crystal.userData.noMerge = true; w.add(crystal);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, S.under ? 6 : 34, 6, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(x, S.under ? 3 : 17, z); beam.userData.noMerge = true; w.add(beam);
    const seal = { i: w.seals.length, kind: S.kind, x, z, mod: mod.i, color, crystal, beam, broken: false, guards: [], reserves: [], effigies: [], spawnPts: [] };
    w.lights.push({ x, y: 3.6, z, color, power: 10, range: 12, src: { cond: () => !seal.broken } });
    w.ambient.push({ x, z, update: (dt, t) => { crystal.rotation.y = t * 1.4; crystal.position.y = 3.7 + Math.sin(t * 2) * 0.12; } });
    if (S.kind === 'circle') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(4.3, 4.75, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.06, z); ring.userData.noMerge = true; w.add(ring);
      seal.ring = ring; seal.radius = 4.5;
    }
    // where event enemies come in from: round the shrine, 7-13 m out, somewhere you can get to
    const r = this.r;
    for (let t = 0; t < 300 && seal.spawnPts.length < 8; t++) {
      const a = r() * Math.PI * 2, d = 7 + r() * 6, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (w.walkable(px, pz, 0.6) && this.reach(px, pz) && this.modAt(px, pz) === mod) seal.spawnPts.push({ x: px, z: pz });
    }
    if (!seal.spawnPts.length) seal.spawnPts.push({ x: x + 4, z: z + 3 });
    w.seals.push(seal);
    S.rec = seal;
  }

  // ---------- enemies (this raid's stream: they stand somewhere new every time) ----------
  populate(w) {
    const r = this.r, mixW = this.area.mix, look = this.area.look, placed = [];
    const free = (x, z, gap = 2.2) => w.walkable(x, z, 0.6) && this.reach(x, z) && !placed.some((p) => Math.hypot(p.x - x, p.z - z) < gap)
      && !this.stairs.some((s) => Math.hypot(s.x - x, s.z - z) < 3) && Math.hypot(x - this.startAt.x, z - this.startAt.z) > 18
      && !w.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.7);
    const spotIn = (x0, x1, z0, z1, o = {}) => {
      for (let t = 0; t < 40; t++) {
        const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
        if (o.ring && Math.hypot(x - o.ring.x, z - o.ring.z) > o.ring.r) continue;
        if (o.avoid && Math.hypot(x - o.avoid.x, z - o.avoid.z) < (o.avoidR ?? 3.5)) continue;
        if (free(x, z, o.gap)) return { x, z };
      }
      return null;
    };
    const add = (type, p, o = {}) => {
      this.at(w, p.x, p.z);
      placed.push(p);
      const sit = !o.elite && !o.event && (type === 'grunt' || type === 'spear') && r() < 0.22;
      w.spawn(type, p.x, p.z, r() * Math.PI * 2, { ...o, sit, look });
      return w.spawns[w.spawns.length - 1];
    };
    const regular = (noBrute) => { let t = weighted(r, mixW); if (t === 'brute' && noBrute) t = 'grunt'; return t; };
    const pack = (n, x0, x1, z0, z1, o = {}) => { let brute = false; const out = []; for (let k = 0; k < n; k++) { const p = spotIn(x0, x1, z0, z1, o); if (!p) continue; const t = regular(brute); if (t === 'brute') brute = true; out.push(add(t, p)); } return out; };

    // the shrines' guards first (so nothing else crowds them)
    for (const S of this.sites) {
      const d = S.rec, near = { ring: { x: d.x, z: d.z, r: 7 }, avoid: d, avoidR: 2.4, gap: 2 };
      const box = [d.x - 8, d.x + 8, d.z - 8, d.z + 8];
      if (S.kind === 'elite') {
        const p = spotIn(...box, near) || { x: d.x + 3, z: d.z + 3 };
        d.guards.push(add(r() < 0.35 ? 'brute' : pick(r, ['grunt', 'spear']), p, { elite: this.shrineTrait }));
        for (let k = 0; k < 3 + Math.floor((this.players - 1) / 2); k++) { const q = spotIn(...box, near); if (q) d.guards.push(add(regular(true), q)); }
      } else if (S.kind === 'altar') {
        for (let k = 0; k < 3; k++) {
          let a = k / 3 * Math.PI * 2 + 0.5, ex = d.x, ez = d.z;
          for (let t = 0; t < 12; t++, a += 0.17) { ex = d.x + Math.cos(a) * 5.5; ez = d.z - Math.sin(a) * 5.5; if (w.walkable(ex, ez, 0.8) && this.reach(ex, ez)) break; }
          this.at(w, ex, ez);
          w.box(1.2, 0.3, 1.2, w.mats.stoneDark, ex, 0.15, ez);
          w.spawn('effigy', ex, ez, Math.atan2(d.x - ex, d.z - ez), { effigy: true });
          d.effigies.push(w.spawns[w.spawns.length - 1]);
        }
        this.at(w, d.x, d.z);
        for (let k = 0; k < 7 + this.players; k++) { w.spawn(regular(true), d.x, d.z, 0, { reserve: true, event: true, look }); d.reserves.push(w.spawns[w.spawns.length - 1]); }
        const q = spotIn(...box, near); if (q) add(regular(true), q);
      } else {
        this.at(w, d.x, d.z);
        for (let k = 0; k < 4 * (2 + this.players); k++) { w.spawn(regular(true), d.x, d.z, 0, { reserve: true, event: true, look }); d.reserves.push(w.spawns[w.spawns.length - 1]); }
      }
      placed.push({ x: d.x, z: d.z }); // (and keep everyone else off the shrine itself)
    }

    // supply chests (chests.js): 2-4 buildings each hide one, with a couple more enemies than usual round it
    // (down the shuffled list until enough have room for one)
    const chestAt = new Map(), want = 2 + Math.floor(r() * 3);
    for (const b of shuffle(this.buildings.filter((b) => !b.yard), r)) {
      if (chestAt.size >= want) break;
      const c = spotIn(b.x0 + 1.3, b.x1 - 1.3, b.z0 + 1.3, b.z1 - 1.3, { gap: 3 });
      if (c) { chestAt.set(b, c); placed.push(c); }
    }
    // in the buildings and yards: most houses hold someone in the dark
    for (const b of this.buildings) {
      let n = b.basement === 'site' ? 2 + (r() < 0.5 ? 1 : 0) : b.yard ? (r() < 0.5 ? 1 : 0) : b.ruin ? 1 : r() < 0.5 ? 1 + (r() < 0.35 ? 1 : 0) : 0;
      const c = chestAt.get(b);
      if (c) {
        this.at(w, c.x, c.z);
        // its rarity (the area's chest table) sets how many guard it and how hard they are
        const rarity = rollRarity(r, this.area.loot.chest);
        const chest = buildChest(w, c.x, c.z, pick(r, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), false, rarity);
        chest.guards = this.toughen(pack(n + 1 + TIERS.indexOf(rarity), b.x0 + 1, b.x1 - 1, b.z0 + 1, b.z1 - 1), rarity, r);
        w.chests.push(chest);
      } else pack(n, b.x0 + 1, b.x1 - 1, b.z0 + 1, b.z1 - 1);
    }
    // the squares that aren't a shrine's
    for (const B of this.blocks) if (B.type === 'plaza' && !this.sites.some((S) => S.key === B.key && !S.under)) pack(1 + (r() < 0.5 ? 1 : 0), B.x0, B.x1, B.z0, B.z1);
    // gangs in the lanes
    const lanes = shuffle([...this.open].map(edgeRect), r);
    for (const L of lanes.slice(0, 6)) pack(1 + (r() < 0.4 ? 1 : 0), L.x0, L.x1, L.z0, L.z1, { gap: 1.8 });
    // the basements
    for (const u of this.unders) {
      if (this.sites.some((S) => S.under && S.rec.mod === u.mod.i)) { pack(2, u.ox - 6, u.ox + 6, u.oz - 6, u.oz + 4); continue; }
      const L = this.layers.find((l) => l.u === u);
      if (u.kind === 'boss') pack(2, u.ox - 6, u.ox + 6, u.oz - 6, u.oz + 5); // (the corridor past the room is the arena's)
      else if (u.kind === 'cache') {
        // the hoard: a large chest in the hall with a small one either side, guarded by a War Servitor and two big
        // elites; all three chests stay sealed until the three are dead
        const h = u.hall, guards = [];
        this.at(w, h.x, h.z);
        const side = () => { const q = rollRarity(r, this.area.loot.chest); return q === 'common' ? 'uncommon' : q; };
        const chests = [buildChest(w, h.x, h.z, 0, true, rollRarity(r, this.area.loot.hoard)), buildChest(w, h.x - 3.4, h.z + 0.6, 0.25, false, side()), buildChest(w, h.x + 3.4, h.z + 0.6, -0.25, false, side())];
        placed.push(...chests.map((c) => ({ x: c.x, z: c.z })));
        const ring = { ring: { x: h.x, z: h.z + 4, r: 6 }, avoid: h, avoidR: 3, gap: 2.6 };
        const spot = () => spotIn(h.x - 7, h.x + 7, h.z, h.z + 9, ring) || { x: h.x + (r() - 0.5) * 6, z: h.z + 5 };
        guards.push(add('brute', spot()));
        const trait = pick(r, ELITES);
        for (let k = 0; k < 2; k++) guards.push(add(pick(r, ['grunt', 'spear']), spot(), { elite: trait, big: true }));
        for (const c of chests) { c.guards = guards; c.hoard = true; w.chests.push(c); }
      }
      else pack(u.kind === 'vault' ? 2 + (r() < 0.5 ? 1 : 0) : 2, L.x0, L.x0 + L.W, L.z0, L.z0 + L.H);
    }
    // supply drums to smash (chests.js): in houses and yards and down the lanes, somewhere new each raid
    const drums = [];
    for (const b of shuffle(this.buildings.slice(), r)) { if (drums.length >= 9) break; const p = spotIn(b.x0 + 1, b.x1 - 1, b.z0 + 1, b.z1 - 1, { gap: 1.6 }); if (p) drums.push(p); }
    for (const L of lanes.slice(6, 12)) { const p = spotIn(L.x0, L.x1, L.z0, L.z1, { gap: 1.6 }); if (p) drums.push(p); }
    for (const p of drums) { placed.push(p); this.at(w, p.x, p.z); w.drums.push(buildDrum(w, p.x, p.z)); }
  }

  // a chest's guards by its rarity: rare and up bring elites, a legendary one a War Servitor too
  toughen(guards, rarity, r) {
    const t = TIERS.indexOf(rarity), trait = pick(r, ELITES);
    guards.forEach((sp, k) => {
      if (t >= 4 && k === 0) sp.type = 'brute';
      else if ((t >= 2 && k === 0) || (t >= 3 && k <= 2)) sp.o.elite = trait;
    });
    return guards;
  }

  // ---------- per frame ----------
  // the building you're in shows only its walls' bottom metre (no roof); from outside a building stays whole, but
  // one standing between you and the camera fades to glass, its inside filled with dark
  update(dt, time, focus) {
    for (const b of this.buildings) {
      if (b.yard) continue;
      const cut = focus.x > b.x0 + 0.1 && focus.x < b.x1 - 0.1 && focus.z > b.z0 + 0.1 && focus.z < b.z1 - 0.1;
      if (cut !== b.cut) { b.cut = cut; b.tall.visible = !cut; b.low.visible = cut; }
      const fade = !cut && focus.x > b.x0 - 0.6 && focus.x < b.x1 + 0.6 && focus.z < b.z0 + 0.3 && focus.z > b.z0 - b.h / 1.25 - 0.6;
      if (fade !== !!b.faded) this.setFaded(b, fade);
    }
  }
  setFaded(b, on) {
    b.faded = on;
    b.tall.traverse((o) => {
      if (!o.isMesh) return;
      const m0 = (o.userData.mat0 ||= o.material);
      if (on && !this.glass.has(m0)) { const g = m0.clone(); g.transparent = true; g.opacity = 0.38; g.depthWrite = false; this.glass.set(m0, g); }
      o.material = on ? this.glass.get(m0) : m0;
    });
    b.shroud.visible = on;
  }
  // inside a building that's faded to glass (whoever is in there stays hidden)
  fadedAt(x, z) { const b = this.buildingAt(x, z); return !!b?.faded; }
}
