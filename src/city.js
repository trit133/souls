// A raid map: Ashfall Ward, a burned-out hab-ward (regions.js). Unlike the dungeons the map is hand-laid and the same
// every raid: a 236 m square of streets on a grid (avenues through the middle), 36 blocks of tenements, markets,
// yards, a chapel, two manufactoria, a barracks and collapsed heaps you have to go round, and barricades across a
// few streets. Most buildings can be walked into (walls are solids with doorways; the roof and walls lift off the
// one you're in or behind), and some have stairs down to cellars, vaults and bunkers, built far off to the east
// (x > 300) and joined by the stairs. What changes each raid (from the run's seed, so a party shares it): where
// the three shrines are (surface squares and yards, or down in the vaults), which of three buildings hides the stair
// down to the boss, and where every enemy stands.
//
// It stands in for a dungeon (world.dungeon): mods are 40 m chunks of the city (each enemy keeps to its chunk and
// the ones round it), every basement and the arena; seals.js runs the shrines and the boss door as before. Enemies
// find their way round walls with a flow field on a 1 m grid (steer).
import * as THREE from 'three';
import { rng } from './world.js';
import { mix, ELITES, SEALS_NEEDED } from './dungeon.js';
import { arenaFurnish, stoneRing } from './modules.js';
import { decorateArena, candles, bones, corpse, sacks, cart, crows, bloodStain, cage, skullStake } from './decor.js';

const MAP_SEED = 0x5a11f; // the map's own stream: the same streets and buildings every raid
const EDGE = 118, CH = 40, NC = 6, C0 = -120; // walkable -118..118; 6 x 6 chunks of 40 m from -120
const UNDER = 300; // beyond this x it's underground
const T = 0.5; // wall thickness
// block edges along each axis (streets run between: avenues at 0 are 12 m wide, the rest 8 m, a ring road round)
const SPAN = [[-112, -84], [-76, -44], [-36, -6], [6, 36], [44, 76], [84, 112]];
// rows north (-z) to south (+z), columns west to east
const BLOCKS = [
  ['collapse', 'tenement', 'chapel', 'tenement', 'works', 'collapse'],
  ['tenement', 'market', 'tenement', 'yard', 'tenement', 'tenement'],
  ['tenement', 'tenement', 'square', 'square', 'tenement', 'barracks'],
  ['yard', 'tenement', 'square', 'square', 'market', 'tenement'],
  ['tenement', 'works', 'tenement', 'tenement', 'collapse', 'tenement'],
  ['collapse', 'tenement', 'yard', 'camp', 'tenement', 'tenement'],
];
const CELLARS = new Set(['0,1', '1,0', '2,4', '3,5', '4,2', '5,1', '1,5', '4,3']); // tenement blocks with a cellar under one building
const VAULTS = new Set(['4,3']); // ...of which these are whole vaults
const VAULT_SITES = ['4,3', '4,1']; // vaults a shrine can wait in (with the two boss sites the boss didn't take)
const BOSS_SITES = ['0,2', '0,4', '2,5']; // the chapel, the north manufactorum, the barracks: one hides the boss's stair
const SURFACE_SHRINES = ['1,1', '1,3', '3,4', '3,0'];
// barricades across streets: [x0, x1, z0, z1]; a gap = two pieces
const BARRICADES = [
  [-44, -36, 58, 59.2], [36, 38.6, -20, -18.8], [41.4, 44, -20, -18.8], [-60, -58.8, 36, 44], [58, 59.2, -44, -41.4], [58, 59.2, -38.6, -36],
  [-100, -98.8, 76, 84], [-84, -76, -100, -98.8], [76, 84, 22, 23.2], [-20, -18.8, 76, 78.6], [-20, -18.8, 81.4, 84],
];
const ARENAS = { hask: { theme: 'pit', name: 'The Penitent Pit', ground: 'arena' }, vael: { theme: 'cloister', name: 'The Cryo Cloister', ground: 'crypt' }, gorrath: { theme: 'forge', name: 'The Slag Foundry', ground: 'ash' } };

const pick = (r, a) => a[Math.floor(r() * a.length)];
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weighted(r, w) { let x = r() * Object.values(w).reduce((a, b) => a + b, 0); for (const [k, v] of Object.entries(w)) if ((x -= v) <= 0) return k; return Object.keys(w)[0]; }
// a visual-only random 0..1 from a position (wall heights, windows): never the level's streams
const vh = (x, z, k = 0) => { const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
const inside = (b, x, z, m = 0) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;

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
  }

  // ---------- the plan (data only, the map's own stream) ----------
  plan() {
    const r = rng(MAP_SEED);
    this.blocks = []; this.buildings = [];
    for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
      const [x0, x1] = SPAN[i], [z0, z1] = SPAN[j], key = j + ',' + i;
      const B = { key, i, j, type: BLOCKS[j][i], x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, bld: [] };
      this.blocks.push(B);
      const add = (o) => { const b = { block: B, h: 3.8, ruin: false, doors: [], part: null, kind: 'house', ...o }; b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2; B.bld.push(b); this.buildings.push(b); return b; };
      const doors = (b, n) => {
        const sides = shuffle(['n', 's', 'e', 'w'], r).filter((s) => ((s === 'n' || s === 's') ? b.x1 - b.x0 : b.z1 - b.z0) > 4.5);
        for (const s of sides.slice(0, n)) b.doors.push({ s, t: 0.3 + r() * 0.4, w: b.kind === 'works' ? 4 : 2.4 });
      };
      const partition = (b) => {
        const w = b.x1 - b.x0, d = b.z1 - b.z0;
        if (Math.max(w, d) < 12) return;
        b.part = w > d ? { axis: 'z', at: b.x0 + w * (0.42 + r() * 0.16), t: 0.25 + r() * 0.5 } : { axis: 'x', at: b.z0 + d * (0.42 + r() * 0.16), t: 0.25 + r() * 0.5 };
      };
      switch (B.type) {
        case 'tenement': {
          // split the block (less a pavement) into two to four buildings with alleys between
          let rects = [[x0 + 1.6, x1 - 1.6, z0 + 1.6, z1 - 1.6]];
          for (let pass = 0; pass < 2; pass++) {
            const next = [];
            for (const [a0, a1, b0, b1] of rects) {
              const w = a1 - a0, d = b1 - b0, long = Math.max(w, d);
              if (long < 15 || (pass === 1 && r() < 0.35)) { next.push([a0, a1, b0, b1]); continue; }
              const cut = 0.4 + r() * 0.2, gap = 2.6 + r() * 1.4;
              if (w >= d) { const m = a0 + w * cut; next.push([a0, m - gap / 2, b0, b1], [m + gap / 2, a1, b0, b1]); }
              else { const m = b0 + d * cut; next.push([a0, a1, b0, m - gap / 2], [a0, a1, m + gap / 2, b1]); }
            }
            rects = next;
          }
          rects.forEach(([a0, a1, b0, b1], n) => {
            if (n > 0 && r() < 0.12 && rects.length > 2) return; // an empty lot
            const b = add({ x0: a0, x1: a1, z0: b0, z1: b1, h: r() < 0.5 ? 6.6 + r() * 1.4 : 3.8 + r() * 0.6, ruin: r() < 0.3, kind: 'house' });
            doors(b, 1 + (r() < 0.6 ? 1 : 0)); partition(b);
            if (n === 0 && CELLARS.has(key)) b.basement = VAULTS.has(key) ? 'vault' : 'cellar';
          });
          break;
        }
        case 'chapel': {
          const b = add({ x0: x0 + 2.5, x1: x1 - 2.5, z0: z0 + 1.5, z1: z1 - 2, h: 9, kind: 'chapel', basement: 'site' });
          b.doors.push({ s: 's', t: 0.5, w: 3.6 }, { s: 'e', t: 0.65, w: 2.4 }, { s: 'w', t: 0.35, w: 2.4 });
          break;
        }
        case 'works': {
          const b = add({ x0: x0 + 2, x1: x1 - 2, z0: z0 + 2, z1: z1 - 2, h: 8, kind: 'works', basement: key === '4,1' ? 'vault' : 'site' });
          b.doors.push({ s: 's', t: 0.3 + r() * 0.2, w: 4 }, { s: r() < 0.5 ? 'e' : 'w', t: 0.5, w: 4 });
          b.part = { axis: 'z', at: (b.x0 + b.x1) / 2 + (r() - 0.5) * 4, t: 0.5, w: 4 };
          break;
        }
        case 'barracks': {
          const b = add({ x0: x0 + 2, x1: x1 - 2, z0: z0 + 3, z1: z1 - 9, h: 4.6, kind: 'barracks', basement: 'site' });
          b.doors.push({ s: 's', t: 0.5, w: 2.4 }, { s: 'w', t: 0.5, w: 2.4 });
          b.part = { axis: 'z', at: (b.x0 + b.x1) / 2, t: 0.5 };
          break;
        }
        case 'market': {
          // an open square with a kiosk in one corner (the middle stays clear for a shrine)
          const cx = r() < 0.5 ? x0 + 2 : x1 - 8, cz = r() < 0.5 ? z0 + 2 : z1 - 8;
          const b = add({ x0: cx, x1: cx + 6, z0: cz, z1: cz + 6, h: 3.6, kind: 'kiosk' }); doors(b, 1);
          break;
        }
        case 'yard': {
          const cx = r() < 0.5 ? x0 + 2 : x1 - 9, cz = z0 + 2;
          const b = add({ x0: cx, x1: cx + 7, z0: cz, z1: cz + 6, h: 3.4, ruin: true, kind: 'shed' }); doors(b, 1);
          break;
        }
        case 'square': {
          // the four quarters round the crossroads: one building in the outer corner, the rest paved and open
          const ox = i === 2 ? x0 + 1.6 : x1 - 15.6, oz = j === 2 ? z0 + 1.6 : z1 - 13.6;
          const b = add({ x0: ox, x1: ox + 14, z0: oz, z1: oz + 12, h: 7.2, kind: 'house' }); doors(b, 2); partition(b);
          break;
        }
        default: break; // collapse, camp
      }
    }
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
  // the stair you're standing at, if any
  stairAt(x, z) { return this.stairs.find((s) => Math.hypot(x - s.x, z - s.z) < 1.5) || null; }
  // map layers for the minimap: the streets, and each basement on its own
  layerAt(x, z) { return x <= UNDER ? this.layers[0] : this.layers.find((L) => L.u && x >= L.x0 && x <= L.x0 + L.W && z >= L.z0 && z <= L.z0 + L.H) || this.layers[0]; }

  // floor colours: pavements round the blocks, boards and tiles inside, paving on the squares, scorch by the heaps
  groundTint(x, z, c, n) {
    if (x > UNDER) return;
    const b = this.buildingAt(x, z);
    if (b) {
      const tile = ((Math.floor(x * 1.25) + Math.floor(z * 1.25)) & 1) ? 0.92 : 1;
      c.setHex(b.kind === 'chapel' ? 0x55504a : b.kind === 'works' ? 0x3a3a3c : 0x3e352c).multiplyScalar(tile * (0.94 + n * 0.08));
      return;
    }
    for (const B of this.blocks) {
      if (!inside(B, x, z, 0.3)) continue;
      if (B.type === 'square' || B.type === 'market') { c.setHex(0x55524c).multiplyScalar(((Math.floor(x / 1.5) + Math.floor(z / 1.5)) & 1 ? 0.93 : 1) * (0.95 + n * 0.08)); return; }
      if (B.type === 'yard') { c.setHex(0x3a362c).multiplyScalar(0.9 + n * 0.2); return; }
      if (B.type === 'collapse') { c.multiplyScalar(0.7); return; }
      if (!inside(B, x, z, -1.6)) c.setHex(0x5a5650).multiplyScalar(0.95 + n * 0.08); // pavement
      return;
    }
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
    this.stairs = []; this.unders = []; this.layers = [];
    this.bAt = new Map();
    for (const b of this.buildings) for (let i = Math.floor(b.x0 / 10); i <= Math.floor(b.x1 / 10); i++) for (let j = Math.floor(b.z0 / 10); j <= Math.floor(b.z1 / 10); j++) {
      const k = i * 1000 + j; if (!this.bAt.has(k)) this.bAt.set(k, []); this.bAt.get(k).push(b);
    }
    // 1. the chunks and the city floor (one walkable square, cut per chunk with overlaps)
    this.chunks = [];
    for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
      const group = new THREE.Group(); w.root.add(group);
      const cx = C0 + CH * (i + 0.5), cz = C0 + CH * (j + 0.5);
      const mod = { i: w.mods.length, key: 'city', name: this.def.name, cx, cz, z0: cz + CH / 2, z1: cz - CH / 2, len: CH, half: CH / 2, r: 14, group, ground: 'city', dungeon: true, zone: true, ci: i, cj: j };
      w.mods.push(mod); this.chunks.push(mod); w.cur = mod;
      const o = 1.6;
      w.rect(Math.max(-EDGE, cx - CH / 2 - o), Math.min(EDGE, cx + CH / 2 + o), Math.max(-EDGE, cz - CH / 2 - o), Math.min(EDGE, cz + CH / 2 + o));
    }
    for (const m of this.chunks) m.roamSet = new Set(this.chunks.filter((n) => Math.abs(n.ci - m.ci) <= 1 && Math.abs(n.cj - m.cj) <= 1).map((n) => n.i));
    this.layers.push({ id: 'city', x0: -EDGE - 4, z0: -EDGE - 4, W: 2 * EDGE + 8, H: 2 * EDGE + 8 });

    // 2. blocks, buildings, streets
    for (const B of this.blocks) this.dressBlock(w, B);
    for (const b of this.buildings) this.buildBuilding(w, b);
    this.streets(w);
    this.rim(w);

    // 3. basements (and the boss's vault and arena)
    let k = 0;
    for (const b of this.buildings) {
      if (!b.basement) continue;
      const kind = b.basement === 'site' ? (b.block.key === this.bossSite ? 'boss' : 'vault') : b.basement;
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
    tiles(-EDGE - 16, EDGE + 16, -EDGE - 16, EDGE + 16);
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
    b.tall = tall; b.low = low; b.cut = false; b.shadow = b.h / 1.2 + 1.2;
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
      if (!s.outer) continue;
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
    this.into(w, tall, () => {
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
      for (let z = b.z0 + 5; z < b.z1 - 4; z += 4.5) for (const s of [-1, 1]) w.pillar(b.cx + s * (b.x1 - b.x0) * 0.3, z, 5.5, vh(z, s, 3) < 0.25);
      for (let z = b.z0 + 8; z < b.z1 - 5; z += 2.2) for (const s of [-1, 1]) w.box(3.2, 0.5, 0.5, M.logDark, b.cx + s * 2.6, 0.25, z, (vh(z, s) - 0.5) * 0.3);
      w.box(3.2, 1.0, 1.4, M.stoneDark, b.cx, 0.5, b.z0 + 3); w.ob(b.cx, b.z0 + 3, 1.2);
      candles(w, b.cx - 1, b.z0 + 3, 5); w.banner(b.cx - 4, b.z0 + 1.4); w.banner(b.cx + 4, b.z0 + 1.4);
      w.torch(b.x0 + 1.5, b.z0 + 1.5, 0xff5030); w.torch(b.x1 - 1.5, b.z1 - 1.5, 0xff5030);
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
      for (let k = 0; k < 3; k++) { const p = spot(1); if (p) { w.barrel(p.x, p.z); } }
      w.torch(b.x0 + 1.4, b.cz, 0xffb04a); w.torch(b.x1 - 1.4, b.cz, 0xffb04a);
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
    if (r() < 0.4) { const p = spot(0.8); if (p) w.torch(p.x, p.z); }
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

  // ---------- blocks: what's out in the open ----------
  dressBlock(w, B) {
    const r = w.rand, M = w.mats, { x0, x1, z0, z1, cx, cz } = B;
    this.at(w, cx, cz);
    const clearOf = (x, z, m) => !w.blocked(x, z, m) && !B.bld.some((b) => inside(b, x, z, m));
    switch (B.type) {
      case 'collapse': {
        // a block that came down: a heap you can't cross, highest at the back so it never hides you
        w.solids.push({ x0: x0 + 0.6, x1: x1 - 0.6, z0: z0 + 0.6, z1: z1 - 0.6 });
        for (let x = x0 + 1.5; x < x1 - 1; x += 2.2) for (let z = z0 + 1.5; z < z1 - 1; z += 2.2) {
          const back = (z1 - z) / (z1 - z0), s = 0.6 + back * 1.6 + vh(x, z) * 0.7;
          w.rock(x + (vh(x, z, 1) - 0.5) * 1.2, z + (vh(x, z, 2) - 0.5) * 1.2, s, vh(x, z, 3) < 0.5);
        }
        for (let k = 0; k < 3; k++) { const x = x0 + 4 + r() * (x1 - x0 - 8), z = z0 + 3 + r() * (z1 - z0) * 0.5; w.box(0.5, 4 + r() * 5, 6 + r() * 4, M.char, x, 2.5, z, r() * 3); }
        w.box(x1 - x0 - 6, 0.6, 1.0, M.logDark, cx, 3.2, z0 + 4, 0.15); // a girder across the top
        crows(w, cx, cz + 4, 4);
        break;
      }
      case 'market': {
        // stalls: canvas on poles round the edges, crates and sacks, a burned cart; the middle stays open
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + r() * 0.4, d = 9 + r() * 3, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
          if (!clearOf(x, z, 2)) continue;
          for (const [px, pz] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]) w.cyl(0.05, 0.05, 2.2, M.logDark, x + px, 1.1, z + pz, 4);
          w.box(2.4, 0.05, 2.0, k % 3 ? M.cloth : M.clothRed, x, 2.25, z, (r() - 0.5) * 0.2);
          w.box(1.8, 0.8, 0.8, M.plank, x, 0.4, z); w.ob(x, z, 1.0);
        }
        cart(w, cx + 6, cz - 8, r() * 6); sacks(w, cx - 7, cz + 6); bloodStain(w, cx + 2, cz + 3, 1.4);
        w.torch(cx - 8, cz - 8); w.torch(cx + 8, cz + 8);
        break;
      }
      case 'yard': {
        // dead ground: graves, dead trees, a broken fence; the middle open
        for (let k = 0; k < 10; k++) { const x = x0 + 2 + r() * (x1 - x0 - 4), z = z0 + 2 + r() * (z1 - z0 - 4); if (Math.hypot(x - cx, z - cz) < 7 || !clearOf(x, z, 1.5)) continue; w.box(0.6, 0.9, 0.2, M.stone, x, 0.45, z, (r() - 0.5) * 0.4); }
        for (let k = 0; k < 4; k++) { const x = x0 + 2 + r() * (x1 - x0 - 4), z = z0 + 2 + r() * (z1 - z0 - 4); if (Math.hypot(x - cx, z - cz) < 8 || !clearOf(x, z, 1.5)) continue; w.deadTree(x, z, 3 + r() * 2); w.ob(x, z, 0.4); }
        skullStake(w, cx + 5, cz - 6); cage(w, cx - 6, cz + 5, r() * 6);
        break;
      }
      case 'square': {
        // paving, planters with dead trees, a toppled saint near the crossroads
        const ix = B.i === 2 ? x1 : x0, iz = B.j === 2 ? z1 : z0;
        w.fallenColumn(ix + (B.i === 2 ? -6 : 6), iz + (B.j === 2 ? -5 : 5), 4, r() * 3);
        for (let k = 0; k < 3; k++) {
          const x = cx + (r() - 0.5) * 18, z = cz + (r() - 0.5) * 18;
          if (!clearOf(x, z, 2)) continue;
          w.box(2.2, 0.6, 2.2, M.stoneDark, x, 0.3, z); w.deadTree(x, z, 2.5 + r()); w.solids.push({ x0: x - 1.1, x1: x + 1.1, z0: z - 1.1, z1: z + 1.1 });
        }
        w.brazier(cx + (r() - 0.5) * 8, cz + (r() - 0.5) * 8, { light: true });
        break;
      }
      case 'camp': {
        // the crusade's foothold: sandbag walls, tents, crates, the beacon
        const bx = cx, bz = cz + 2;
        const bag = (a0, a1, z) => { w.box(a1 - a0, 0.9, 0.9, M.cloth, (a0 + a1) / 2, 0.45, z); w.solids.push({ x0: a0, x1: a1, z0: z - 0.45, z1: z + 0.45 }); };
        bag(x0 + 1, cx - 3, z0 + 2); bag(cx + 3, x1 - 1, z0 + 2);
        for (let k = 0; k < 3; k++) w.tent(x0 + 5 + k * 8, z1 - 5, r() * 3, 0.9);
        for (let k = 0; k < 4; k++) w.crate(x1 - 3, z0 + 6 + k * 1.2);
        w.banner(cx - 3.4, z0 + 1.4); w.banner(cx + 3.4, z0 + 1.4);
        w.brazier(cx - 6, bz - 3, { light: true }); w.brazier(cx + 6, bz - 3, { light: true });
        const fire = w.bonfire(bx, bz - 6.7); fire.lit = true;
        candles(w, bx - 1.4, bz - 7.1, 4);
        this.startAt = { x: bx, z: bz };
        break;
      }
      default: {
        // a tenement block's alleys: bins, rubble, a lamp
        for (let k = 0; k < 4; k++) {
          const x = x0 + 1 + r() * (x1 - x0 - 2), z = z0 + 1 + r() * (z1 - z0 - 2);
          if (!clearOf(x, z, 1.2)) continue;
          if (k === 0) w.torch(x, z); else if (k === 1) bones(w, x, z); else w.barrel(x, z);
        }
      }
    }
  }

  // the streets: lamp posts, burned-out wrecks, craters, barricades, the toppled saint at the crossroads
  streets(w) {
    const r = w.rand, M = w.mats;
    for (const [x0, x1, z0, z1] of BARRICADES) {
      this.at(w, (x0 + x1) / 2, (z0 + z1) / 2);
      w.solids.push({ x0, x1, z0, z1 });
      const alongX = x1 - x0 > z1 - z0;
      for (let a = alongX ? x0 : z0; a < (alongX ? x1 : z1) - 0.2; a += 1.1) {
        const x = alongX ? a + 0.55 : (x0 + x1) / 2, z = alongX ? (z0 + z1) / 2 : a + 0.55;
        w.box(alongX ? 1.1 : 1.2, 0.8 + vh(x, z) * 0.5, alongX ? 1.2 : 1.1, vh(x, z, 2) < 0.5 ? M.cloth : M.rust, x, 0.5, z, (vh(x, z, 3) - 0.5) * 0.3);
        if (vh(x, z, 4) < 0.3) w.box(0.08, 1.6, 0.08, M.logDark, x, 1.2, z, 0.4);
      }
    }
    // the saint at the crossroads: a plinth you go round
    this.at(w, 0, 0);
    w.box(4, 1.2, 4, M.stoneDark, 0, 0.6, 0); w.box(3.2, 0.4, 3.2, M.stone, 0, 1.4, 0);
    w.box(1.0, 3.4, 0.8, M.stone, 0.3, 3.2, 0, 0.3); w.box(2.6, 0.5, 0.6, M.stone, 1.4, 1.9, 1.2, 1.1); // (its arm, broken off)
    w.solids.push({ x0: -2, x1: 2, z0: -2, z1: 2 });
    candles(w, -1.4, 2.4, 6);
    // street furniture along every street line
    const lines = [-80, -40, 0, 40, 80];
    for (const L of lines) for (let a = -110; a <= 110; a += 18) {
      for (const [x, z] of [[L + (L === 0 ? 5.4 : 3.4), a + 4], [a + 4, L + (L === 0 ? 5.4 : 3.4)]]) {
        if (w.blocked(x, z, 1) || Math.abs(x) < 3 && Math.abs(z) < 3) continue;
        this.at(w, x, z);
        const v = vh(x, z, 11);
        if (v < 0.3) w.torch(x, z);
        else if (v < 0.42) { const ry = Math.abs(x - L) < 7 ? 0 : Math.PI / 2; w.box(1.9, 1.2, 4.2, M.rust, x, 0.6, z, ry); w.box(1.7, 0.7, 2.2, M.logDark, x, 1.5, z, ry); w.solids.push(ry ? { x0: x - 2.1, x1: x + 2.1, z0: z - 0.95, z1: z + 0.95 } : { x0: x - 0.95, x1: x + 0.95, z0: z - 2.1, z1: z + 2.1 }); }
        else if (v < 0.55) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.6 + vh(x, z) , 9), M.ash); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); w.add(m); }
        else if (v < 0.62) corpse(w, x, z, v * 30);
      }
    }
  }

  // round the city: ruined facades on three sides, rubble along the south (low, so it never hides you), the breach
  rim(w) {
    const M = w.mats;
    for (let a = -124; a <= 124; a += 6) {
      for (const [x, z, alongX] of [[a, -122, true], [-122, a, false], [122, a, false]]) {
        this.at(w, Math.max(-118, Math.min(118, x)), Math.max(-118, Math.min(118, z)));
        const h = 5 + vh(x, z) * 9, ww = 5 + vh(x, z, 1) * 2;
        w.box(alongX ? ww : 4, h, alongX ? 4 : ww, vh(x, z, 2) < 0.5 ? M.char : M.stoneDark, x, h / 2, z);
        for (let y = 2; y < h - 1; y += 3) w.box(alongX ? 1 : 4.1, 0.8, alongX ? 4.1 : 1, vh(x, y, 3) < 0.1 ? M.glowWindow : M.logDark, x, y, z);
      }
      this.at(w, a, 118);
      w.rock(a, 121.5, 0.6 + vh(a, 5) * 0.6, vh(a, 6) < 0.5);
    }
  }

  // ---------- basements ----------
  buildUnder(w, b, kind, k) {
    const ox = 400 + (k % 4) * 100, oz = -150 + Math.floor(k / 4) * 120;
    const group = new THREE.Group(); w.root.add(group);
    const names = { cellar: 'Cellars', vault: 'The Vaults', boss: 'The Deep Vault' };
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
    this.stairs.push({ x: b.stair.x, z: b.stair.z, to: u.arrive, label: 'Go down', down: true, name: names[kind] });
    this.stairs.push({ x: ox, z: oz + 2.6, to: { x: b.stair.x, z: b.stair.z + 2.2 }, label: 'Climb up', down: false, name: this.def.name });
    const lamp = (x, z, cold = false) => w.torch(x, z, cold ? 0x9ad0ff : 0xffb04a, cold);
    lamp(ox - 5, oz - 5);
    const rooms = [];
    if (kind === 'cellar') {
      R(ox + 4, ox + 15, oz - 1.6, oz + 1.6); R(ox + 13, ox + 25, oz - 6, oz + 4); rooms.push([ox + 19, oz - 1, 5]);
      if (r() < 0.6) { R(ox + 17.4, ox + 20.6, oz - 17, oz - 4); R(ox + 13, ox + 25, oz - 26, oz - 15); rooms.push([ox + 19, oz - 20.5, 5]); }
      R(ox - 1.6, ox + 1.6, oz - 15, oz - 4); R(ox - 6, ox + 6, oz - 24, oz - 13); rooms.push([ox, oz - 18.5, 5]);
    } else if (kind === 'vault') {
      R(ox - 1.8, ox + 1.8, oz - 17, oz - 4); R(ox - 13, ox + 13, oz - 42, oz - 15);
      R(ox + 11, ox + 20, oz - 31, oz - 25); R(ox + 17, ox + 26, oz - 36, oz - 20); rooms.push([ox + 21.5, oz - 28, 4]);
      u.hall = { x: ox, z: oz - 28.5 };
      for (const s of [-1, 1]) for (const t of [-1, 1]) w.pillar(ox + s * 8, oz - 28.5 + t * 7, 4.2, vh(s, t) < 0.3);
    } else this.buildArena(w, u); // the boss's vault: a long corridor north to the door, the arena past it
    w.cur = mod;
    for (const [x, z, s] of rooms) {
      lamp(x - s + 1, z - s + 1);
      for (let n = 0; n < 3; n++) { const px = x + (r() - 0.5) * s * 1.4, pz = z + (r() - 0.5) * s * 1.4; const q = r(); if (q < 0.4) w.crate(px, pz); else if (q < 0.7) w.barrel(px, pz); else bones(w, px, pz); }
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
    const free = (x, z, gap = 2.4) => w.walkable(x, z, 0.6) && this.reach(x, z) && !placed.some((p) => Math.hypot(p.x - x, p.z - z) < gap)
      && !this.stairs.some((s) => Math.hypot(s.x - x, s.z - z) < 3) && Math.hypot(x - this.startAt.x, z - this.startAt.z) > 30
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
    const pack = (n, x0, x1, z0, z1, o) => { let brute = false; for (let k = 0; k < n; k++) { const p = spotIn(x0, x1, z0, z1, o); if (!p) continue; const t = regular(brute); if (t === 'brute') brute = true; add(t, p); } };

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
    const nearShrine = (x, z) => this.sites.some((S) => !S.under && Math.hypot(S.x - x, S.z - z) < 14);

    // the streets and blocks
    for (const B of this.blocks) {
      if (B.type === 'collapse' || B.type === 'camp') continue;
      const shrine = this.sites.some((S) => S.key === B.key && !S.under);
      // inside the buildings
      for (const b of B.bld) {
        const area = (b.x1 - b.x0) * (b.z1 - b.z0), n = b.kind === 'chapel' || b.kind === 'works' ? 3 + Math.floor(r() * 2) : b.kind === 'barracks' ? 4 : r() < 0.5 ? 1 + Math.floor(area / 160 * r()) : 0;
        pack(Math.min(n, 5), b.x0 + 1, b.x1 - 1, b.z0 + 1, b.z1 - 1, {});
      }
      // out in the open (a shrine's square has its guards already)
      if (shrine) continue;
      const n = B.type === 'market' ? 3 : B.type === 'square' || B.type === 'yard' ? 1 + Math.floor(r() * 2) : r() < 0.3 ? 1 : 0;
      pack(n, B.x0, B.x1, B.z0, B.z1, {});
    }
    // gangs loitering out on the streets
    for (let k = 0; k < 9; k++) {
      const L = pick(r, [-80, -40, 0, 40, 80]), a = -105 + r() * 210, onX = r() < 0.5;
      const x = onX ? a : L + (r() - 0.5) * 5, z = onX ? L + (r() - 0.5) * 5 : a;
      if (nearShrine(x, z)) continue;
      pack(2 + Math.floor(r() * 2), x - 4, x + 4, z - 4, z + 4, {});
    }
    // the basements
    for (const u of this.unders) {
      if (this.sites.some((S) => S.under && S.rec.mod === u.mod.i)) { pack(2, u.ox - 6, u.ox + 6, u.oz - 6, u.oz + 4, {}); continue; }
      const L = this.layers.find((l) => l.u === u);
      const n = u.kind === 'cellar' ? 2 + Math.floor(r() * 2) : u.kind === 'vault' ? 4 + Math.floor(r() * 2) : 3;
      if (u.kind === 'boss') pack(n, u.ox - 6, u.ox + 6, u.oz - 6, u.oz + 5, {}); // (the corridor past the room is the arena's)
      else pack(n, L.x0, L.x0 + L.W, L.z0, L.z0 + L.H, {});
    }
  }

  // ---------- per frame ----------
  // the building you're in, or just behind (between you and the camera), shows only its walls' bottom metre
  update(dt, time, focus) {
    for (const b of this.buildings) {
      const near = Math.abs(b.cx - focus.x) < 45 && Math.abs(b.cz - focus.z) < 45;
      const cut = near && focus.x > b.x0 - 0.8 && focus.x < b.x1 + 0.8 && focus.z > b.z0 - b.shadow && focus.z < b.z1 + 0.6;
      if (cut === b.cut) continue;
      b.cut = cut; b.tall.visible = !cut; b.low.visible = cut;
    }
  }
}

// how many shrines a raid needs (the same as a dungeon's three)
export const CITY_SHRINES = SEALS_NEEDED;
