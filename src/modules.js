import * as THREE from 'three';
import { NUM } from './scale.js';
import { decorateArena, cage } from './decor.js';
import { buildStands } from './crowd.js';

// Level modules. build(w, Z, mod) receives the World, Z(d) (module distance -> world z)
// and the module record. Coordinates: x across, d along the module (0 = entry, len = exit).
// Every module connects through a 5-wide opening centred on x = 0 at both ends.
// Enemy yaw 0 faces the entry (toward the arriving player).

const PI = Math.PI;

function ends(w, mod, len, half = 2.5) {
  // openings overlap both the neighbouring module and this module's interior by
  // more than an actor's diameter, so seams never form invisible walls
  w.rect(-half, half, 0, 5.5);
  // the way on stays fogged until every enemy in this room is dead
  w.rect(-half, half, len - 5.5, len + 1.5, { gate: 'exit' + mod.i });
  w.gate('exit' + mod.i, len - 0.5, 5, false);
}

export const MODULES = {
  ruins: {
    name: 'The Shattered Causeway', len: 42, ground: 'stone',
    build(w, Z, mod) {
      ends(w, mod, 42);
      w.rect(-4, 4, 0, 12); w.rect(-10, 2, 10, 24); w.rect(-3, 8, 22, 34); w.rect(-4, 4, 32, 42);
      for (const [x, d, h, b] of [[-3.4, 5, 3.2], [3.4, 8, 1.4, 1], [-9, 13, 3.6], [1.2, 18, 1.2, 1], [-8.6, 22.5, 2.8], [6.8, 25, 3.4], [-2.2, 30, 1.0, 1], [7.2, 32.5, 2.6]]) w.pillar(x, Z(d), h, !!b);
      w.fallenColumn(-4.5, Z(17), 3.4, 0.35);
      w.rock(4.5, Z(28.5), 0.9, false, true);
      w.brazier(-8, Z(19));
      w.spawn('grunt', -6, 15, 0);
      w.spawn('grunt', 3, 27, 2.2, { sit: true });
      w.spawn('archer', 5.5, 33, 0);
      w.spawn('spear', 0, 38, 0);
    },
  },

  camp: {
    name: 'The Siege Bivouac', len: 44, ground: 'dirt',
    build(w, Z, mod) {
      ends(w, mod, 44);
      w.rect(-15, 15, 3, 41);
      w.palisade(-15, Z(3), -15, Z(41)); w.palisade(15, Z(3), 15, Z(41));
      w.palisade(-15, Z(41), -3.5, Z(41)); w.palisade(3.5, Z(41), 15, Z(41));
      w.palisade(-15, Z(3), -3.5, Z(3), 1.2); w.palisade(3.5, Z(3), 15, Z(3), 1.2);
      w.banner(-3.4, Z(4)); w.banner(3.4, Z(4)); w.banner(-3.8, Z(40)); w.banner(3.8, Z(40));
      w.tent(-11, Z(8), 0.3); w.tent(11, Z(10), -0.2); w.tent(-11, Z(30), 0.1, 1.1); w.tent(11, Z(33), 0.5, 1.1); w.tent(11.5, Z(21), 0);
      w.firePit(-4, Z(14)); w.firePit(6, Z(28));
      w.crate(-13, Z(17)); w.crate(-12.2, Z(18)); w.crate(-13, Z(18.2), 0.6);
      w.barrel(13, Z(15.5)); w.barrel(13.3, Z(16.5)); w.barrel(-9, Z(37));
      w.crate(8, Z(38)); w.crate(9, Z(38.4), 0.6);
      w.rack(-8, Z(23)); w.rack(8.5, Z(5.5));
      w.rock(-1, Z(22), 0.8, true, true);
      w.spawn('grunt', -6.2, 12.2, 1.2, { sit: true });
      w.spawn('spear', -2, 16.6, -2.4, { sit: true });
      w.spawn('archer', 9.5, 18, 0);
      w.spawn('grunt', 8.2, 24.5, 0, { patrol: { x: -2, z: Z(26) } });
      w.spawn('spear', 3.8, 32, 0);
      w.spawn('grunt', -2.5, 37.5, 0);
    },
  },

  bridge: {
    name: 'The Hanging Gantry', len: 46, ground: 'chasm',
    build(w, Z, mod) {
      ends(w, mod, 46);
      w.rect(-7, 7, 0, 9); w.rect(-1.7, 1.7, 8, 38); w.rect(-4.5, 4.5, 19, 26); w.rect(-7, 7, 37, 46);
      // plank deck + rope posts
      for (let d = 8.2; d < 38; d += 0.62) w.box(3.7, 0.14, 0.52, w.mats.plank, 0, 0.02, Z(d), (w.rand() - 0.5) * 0.06);
      w.box(9.4, 0.16, 7.4, w.mats.plank, 0, 0.03, Z(22.5));
      for (let d = 8; d <= 38; d += 3.75) {
        for (const s of [-1, 1]) {
          const onDeck = d > 18.5 && d < 26.5;
          w.cyl(0.08, 0.1, 1.3, w.mats.logDark, s * (onDeck ? 4.8 : 2.0), 0.65, Z(d), 5);
        }
      }
      for (const s of [-1, 1]) {
        w.box(0.05, 0.05, 10.6, w.mats.log, s * 2.0, 1.15, Z(13.5));
        w.box(0.05, 0.05, 11.6, w.mats.log, s * 2.0, 1.15, Z(32));
      }
      w.brazier(-5.5, Z(4)); w.brazier(5.5, Z(42));
      w.spawn('spear', 0, 22.5, 0);
      w.spawn('grunt', -2.5, 40, 0);
      w.spawn('archer', 3, 42, 0);
    },
  },

  village: {
    name: 'The Burned Hab-Block', len: 48, ground: 'ash',
    build(w, Z, mod) {
      ends(w, mod, 48);
      w.rect(-13, 13, 3, 45);
      for (const [x, d, ww, dd] of [[-8, 8, 5, 4], [8.5, 10, 4.5, 4.5], [-7.5, 21, 5, 5], [3, 19.5, 3.5, 3.5], [8, 30, 5, 4], [-8, 36, 4, 5], [6.5, 40.5, 4, 3.5]]) w.house(x, Z(d), ww, dd, 0);
      // smouldering debris (no light, just flames)
      for (const [x, d] of [[-5.2, 9], [10.5, 12], [-5, 23], [10.2, 29], [-10, 38]]) w.fires.push({ x, z: Z(d), y: 0.3, scale: 0.55 });
      w.cyl(1.0, 1.1, 0.8, w.mats.stone, -2, 0.4, Z(29)); w.ob(-2, Z(29), 1.1);
      w.brazier(0, Z(33.5), { light: true });
      w.spawn('grunt', -4.4, 12, 0.6);
      w.spawn('grunt', 5.5, 16, 0);
      w.spawn('brute', 0.5, 26, 0);
      w.spawn('archer', 9.5, 36, 0);
      w.spawn('grunt', -3, 42, 0, { sit: true });
    },
  },

  crypt: {
    name: 'The Ossuary Reliquary', len: 46, ground: 'crypt',
    build(w, Z, mod) {
      ends(w, mod, 46);
      w.rect(-6.5, 6.5, 0, 46);
      for (let d = 7; d <= 37; d += 6) for (const s of [-1, 1]) w.pillar(s * 3.6, Z(d), 3.2);
      for (const d of [10, 22, 34]) for (const s of [-1, 1]) w.torch(s * 6, Z(d), 0x6ab4ff, true);
      for (const [x, d] of [[5, 16], [-5, 28], [5, 40]]) {
        w.box(1.0, 0.7, 2.2, w.mats.stoneDark, x, 0.35, Z(d));
        w.ob(x, Z(d - 0.6), 0.6); w.ob(x, Z(d + 0.6), 0.6);
      }
      for (let i = 0; i < 14; i++) w.box(0.12, 0.12, 0.5, w.mats.bone, (w.rand() - 0.5) * 11, 0.06, Z(3 + w.rand() * 40), w.rand() * 3);
      w.spawn('grunt', -2, 12, 0);
      w.spawn('grunt', 2, 20, 0);
      w.spawn('spear', 0, 30, 0);
      w.spawn('grunt', 4.5, 36, -0.8);
      w.spawn('archer', 0, 43, 0);
    },
  },

  bog: {
    name: 'The Coolant Mire', len: 48, ground: 'bog',
    build(w, Z, mod) {
      ends(w, mod, 48);
      w.rect(-13, 13, 3, 45);
      for (const [x, d, r] of [[-6, 10, 3.2], [5, 15, 3.5], [-2, 24, 3.8], [7, 31, 3], [-7, 36, 3.5], [2.5, 41, 2.4]]) w.pool(x, Z(d), r);
      for (const [x, d] of [[-10, 8], [10.5, 22], [-10.5, 28], [10, 43], [0.5, 33]]) { w.deadTree(x, Z(d), 3 + w.rand() * 2); w.ob(x, Z(d), 0.4); }
      w.torch(-4, Z(18)); w.torch(4, Z(37));
      w.spawn('archer', -10, 20, 0);
      w.spawn('grunt', 3, 22, 0);
      w.spawn('grunt', -4, 30, 0);
      w.spawn('archer', 10, 38, 0);
      w.spawn('spear', 0, 43, 0);
    },
  },

  gate: {
    name: "The Warden's Gate", len: 44, ground: 'stone',
    build(w, Z, mod) {
      ends(w, mod, 44);
      w.rect(-10, 10, 3, 22); w.rect(-3, 3, 20, 31); w.rect(-9, 9, 29, 41);
      for (const s of [-1, 1]) {
        w.box(4.2, 8, 4.5, w.mats.stone, s * 5.6, 4, Z(25.5));
        w.box(4.2, 0.8, 4.7, w.mats.stoneDark, s * 5.6, 8.4, Z(25.5));
        w.box(6, 3.2, 1.2, w.mats.stone, s * 10.5, 1.6, Z(23));
        w.banner(s * 3.4, Z(21));
      }
      w.brazier(-8, Z(6)); w.brazier(8, Z(18));
      for (const [x, d] of [[-7, 33], [7, 38]]) w.crate(x, Z(d));
      w.spawn('brute', 0, 14, 0);
      w.spawn('spear', 0, 28, 0);
      w.spawn('archer', -5, 36, 0);
      w.spawn('archer', 5, 37.5, 0);
    },
  },
};

function arenaRing(w, Z, cx, cd, r, gapS, gapN) {
  const n = Math.round(r * 1.2);
  for (let i = 0; i < n; i++) {
    const a = i / n * PI * 2;
    const px = cx + Math.cos(a) * (r + 0.9), pd = cd - Math.sin(a) * (r + 0.9);
    if (Math.abs(px) < 4.5 && ((gapS && pd < cd) || (gapN && pd > cd))) continue;
    const south = pd < cd - r * 0.2; // near the entry = toward the camera: keep low
    const h = south ? 0.8 + w.rand() * 0.5 : (i % 3 === 0 ? 1.5 + w.rand() : 4 + w.rand() * 2.5);
    w.cyl(0.55, 0.65, h, w.mats.stone, px, h / 2, Z(pd));
  }
}

// the fight's own furniture round a mini boss arena centred on (cx, cz): braziers that light when the fight starts,
// and the theme's centrepieces (the block, the fountain, the anvils)
export function arenaFurnish(w, theme, cx, cz, enc) {
  const fire = theme === 'cloister' ? { color: 0x8ab4ff, cold: true } : {};
  for (const [x, z] of [[-9, 8], [9, 8], [-9, -8], [9, -8]]) w.brazier(cx + x, cz + z, { cond: () => enc.active, power: 14, ...fire });
  if (theme === 'pit') {
    w.box(1.6, 0.8, 1.0, w.mats.wood, cx, 0.4, cz - 7.5); w.ob(cx, cz - 7.5, 0.8);
    for (const [x, z] of [[-6, -9], [6, -9.5], [-11, 0], [11, 0]]) {
      w.cyl(0.08, 0.1, 2.4, w.mats.logDark, cx + x, 1.2, cz + z, 5);
      w.box(0.28, 0.28, 0.28, w.mats.bone, cx + x, 2.5, cz + z);
    }
  } else if (theme === 'cloister') {
    // moonlit garden ring: low hedges and a dry fountain
    w.cyl(1.6, 1.8, 0.6, w.mats.stone, cx, 0.3, cz - 6); w.ob(cx, cz - 6, 1.8);
    w.cyl(0.25, 0.3, 1.6, w.mats.stone, cx, 0.8, cz - 6);
    for (const [x, z] of [[-10.5, 4], [10.5, 4], [-10.5, -4], [10.5, -4]]) w.box(0.9, 0.8, 3, w.mats.leaf, cx + x, 0.4, cz + z);
  } else if (theme === 'forge') {
    // forge: anvils, slag heaps, glowing coals
    for (const [x, z] of [[-6, -7], [6, 7]]) { w.box(1.2, 0.7, 0.6, w.mats.metal, cx + x, 0.35, cz + z); w.ob(cx + x, cz + z, 0.7); }
    for (const [x, z] of [[-10.5, 2], [10.5, -3], [5, -9]]) { w.rock(cx + x, cz + z, 0.9, true, true); w.fires.push({ x: cx + x, z: cz + z, y: 0.4, scale: 0.5 }); }
  }
}

// a ring of standing stones round an arena, open at the given angles (radians, 0 = +x, PI/2 = north); stones on the
// south side (toward the camera) stay low
export function stoneRing(w, cx, cz, r, gaps = []) {
  const n = Math.round(r * 1.2);
  for (let i = 0; i < n; i++) {
    const a = i / n * PI * 2;
    if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.36)) continue;
    const px = cx + Math.cos(a) * (r + 0.9), pz = cz - Math.sin(a) * (r + 0.9);
    const south = pz > cz + r * 0.2;
    const h = south ? 0.8 + w.rand() * 0.5 : (i % 3 === 0 ? 1.5 + w.rand() : 4 + w.rand() * 2.5);
    w.cyl(0.55, 0.65, h, w.mats.stone, px, h / 2, pz);
  }
}

// Mini boss arena: fog in, fight, fog out, then a short alcove. `theme` picks decor.
function miniArena(bossId, name, ground, theme) {
  return {
    name, len: 54, ground,
    build(w, Z, mod) {
      w.rect(-3, 3, 0, 6);
      w.rect(-3, 3, 4, 12, { gate: 'in' + mod.i });
      w.circle(0, 24, 13);
      w.rect(-3, 3, 35, 42, { gate: 'out' + mod.i });
      w.rect(-6, 6, 41, 50);
      w.rect(-2.5, 2.5, 48.5, 55.5);
      w.gate('in' + mod.i, 7.5, 6, true);
      w.gate('out' + mod.i, 38.5, 6, false);
      arenaRing(w, Z, 0, 24, 13, true, true);
      const enc = { id: 'mini' + mod.i, kind: 'mini', bossId, arena: { x: 0, z: Z(24), r: 13 }, gateIn: 'in' + mod.i, gateOut: 'out' + mod.i, mod: mod.i, active: false, defeated: false };
      w.encounters.push(enc);
      arenaFurnish(w, theme, 0, Z(24), enc);
      decorateArena(w, theme, 0, Z(24), 13, enc);
      w.rock(-5, Z(44), 0.7); w.rock(5, Z(48), 0.6);
    },
  };
}

export const MINI_ARENAS = {
  hask: miniArena('hask', "The Executioner's Pit", 'arena', 'pit'),
  vael: miniArena('vael', 'The Moonlit Cloister', 'crypt', 'cloister'),
  gorrath: miniArena('gorrath', 'The Slag Forge', 'ash', 'forge'),
};

// the region's last area (regions.js r1f): the Sentinel's Bastion, a climb to Varek's throne. Four tiers rise north
// (terrain.js), the throne's floor at the top:
//   - the Landing (-5.2 m): the beacon, sandbags; the dry moat either side, overgrown;
//   - the causeway (-3.6 m): a raised road over the moat on broken parapets (drop off them into the moat; a ladder
//     on its west side climbs back);
//   - the Court of Penance (-2 m): where the last of the March's hardest wait (a few from each deeper area, one an
//     elite), galleries up either side (-0.4 m) with hanged cages, a dais at the back where an Augur reads you coming.
//     A ladder (pulled up) drops from the court to the moat;
//   - the Gem Door's hall (0 m): up the grand stair, its arch set with the three bosses' gems, burning (you carry
//     them, or you couldn't be here). The door on to the throne fogs until the court is clear.
// FINAL_MODULES.throne follows: Varek's arena, flat, in a ring of stands full of the March cheering him on
const LAND = -5.2, CAUSE = -3.6, COURT = -2.0, GAL = -0.4, DAIS = -1.6;
export const FINAL_MODULES = {
  bastion: {
    name: "The Sentinel's Bastion", len: 76, ground: 'bastion',
    build(w, Z, mod) {
      const M = w.mats, T = w.terrain, L = 76, gold = new THREE.MeshLambertMaterial({ color: 0x8a6a2a, flatShading: true });
      // (terrain in module distance: d0..d1 north; up(...) a flight climbing north from h0 to h1)
      const band = (x0, x1, d0, d1, h, o) => T.flat(x0, x1, Z(d1), Z(d0), h, o);
      const up = (x0, x1, d0, d1, h0, h1, o) => T.stairs(x0, x1, Z(d1), Z(d0), h1, h0, 'z', o);
      band(-40, 40, -2, 30, LAND, { look: 'basalt', ivy: 0.2 });
      band(-3.4, 3.4, 12, 30, CAUSE, { look: 'pale', ivy: 0.45 });
      up(-3.4, 3.4, 9, 12, LAND, CAUSE, { look: 'pale' });
      band(-40, 40, 30, 52, COURT, { look: 'pale', ivy: 0.4 });
      up(-3.4, 3.4, 26.5, 30, CAUSE, COURT, { look: 'pale' });
      for (const s of [-1, 1]) {
        T.flat(s < 0 ? -40 : 10, s < 0 ? -10 : 40, Z(52), Z(32), GAL, { look: 'brick', ivy: 0.5 });
        T.stairs(s < 0 ? -10 : 7, s < 0 ? -7 : 10, Z(37.5), Z(34), s < 0 ? GAL : COURT, s < 0 ? COURT : GAL, 'x', { look: 'pale' });
      }
      band(-4.5, 4.5, 44.5, 48.5, DAIS, { look: 'basalt' });
      up(-4, 4, 52, 56, COURT, 0, { look: 'pale' });
      T.ladder(-3.85, Z(20), PI / 2, LAND, CAUSE);                 // the moat back up on to the causeway
      T.ladder(8, Z(29.55), PI, LAND, COURT, { raised: true });     // the court down to the moat, lowered from the top
      ends(w, mod, L);
      w.rect(-11, 11, 0, 31);   // the landing, the moat and the causeway over it (each overlaps the next by a body's width)
      w.rect(-14, 14, 29, 54);  // the court and its galleries
      w.rect(-4.5, 4.5, 52, L); // the grand stair and the Gem Door's hall

      // the ground: flagstones round the beacon and across the court, setts on the causeway and the hall, the moat
      // gone back to dirt and grass
      const P = (s, x0, x1, d0, d1, o) => w.paint({ x0, x1, z0: Z(d1), z1: Z(d0) }, s, o), C = (s, x, d, r, o) => w.paint({ cx: x, cz: Z(d), r }, s, o);
      P('dirt', -11, 11, 0, 30, { edge: 1, amount: 0.8 });
      for (const [x, d, r] of [[-8, 14, 3.4], [8.5, 19, 3], [-7.5, 25, 2.8], [7, 27, 2.4], [-9.5, 4, 2.2], [9, 7, 2.6]]) C('grass', x, d, r, { edge: 1.8 });
      C('flag', 0, 5, 4.2, { edge: 0.6 });
      P('cobble', -3.4, 3.4, 9, 30, { edge: 0.3 });
      P('flag', -14, 14, 30, 52, { edge: 0.5 });
      C('cobble', 0, 39, 5.5, { edge: 0.8 });
      for (const [x, d, r] of [[-12, 31, 2], [12.5, 50, 2.4], [-12.5, 50, 1.8], [9, 31, 1.4]]) C('grass', x, d, r, { edge: 1.4, amount: 0.85 });
      P('cobble', -14, -10, 32, 52, { edge: 0.4, amount: 0.8 }); P('cobble', 10, 14, 32, 52, { edge: 0.4, amount: 0.8 });
      P('flag', -4.5, 4.5, 44.5, 48.5, { edge: 0.2 });
      P('cobble', -4.5, 4.5, 52, L, { edge: 0.3 }); P('flag', -2.6, 2.6, 56, L, { edge: 0.3 });
      w.flora.push(
        { kind: 'tree', x: -9, z: Z(15.5), s: 0.85, dead: true }, { kind: 'tree', x: 9, z: Z(24), s: 0.9 }, { kind: 'leaves', x: 9, z: Z(24), r: 2.8, n: 70 },
        { kind: 'tree', x: 12.5, z: Z(50), s: 0.8 }, { kind: 'leaves', x: 12.5, z: Z(50), r: 2.2, n: 40 },
        { kind: 'bush', x: -8.5, z: Z(11), n: 4 }, { kind: 'bush', x: 7.5, z: Z(13), n: 3 }, { kind: 'bush', x: -7, z: Z(27.5), n: 4 }, { kind: 'bush', x: 10, z: Z(4), n: 3, s: 0.8 },
        { kind: 'bush', x: -12.5, z: Z(31.5), n: 3, s: 0.8 }, { kind: 'leaves', x: -6, z: Z(22), r: 2, n: 30 },
      );

      // the landing: the beacon, sandbags, a banner each side
      const fire = w.bonfire(0, Z(5)); fire.lit = true;
      for (const s of [-1, 1]) { w.box(0.8, 0.8, 6, M.cloth, s * 4.4, 0.4, Z(5)); w.ob(s * 4.4, Z(3.5), 0.5); w.ob(s * 4.4, Z(6.5), 0.5); w.banner(s * 3.6, Z(9.5)); }
      // the causeway: parapets along its lips, black stone with gold caps, broken here and there (where you can drop
      // into the moat); lamps on posts; what fell of it lies in the moat
      for (let d = 13; d < 26.5; d += 2.2) for (const s of [-1, 1]) {
        if (vhash(d, s) < 0.3) { w.rock(s * 5.2, Z(d + 1), 0.6, true); continue; }
        w.box(0.5, 1.0, 1.9, M.stoneDark, s * 3.1, 0.5, Z(d + 1)); w.box(0.6, 0.12, 2.0, gold, s * 3.1, 1.06, Z(d + 1));
        w.solid(s * 3.1 - 0.3, s * 3.1 + 0.3, d + 0.05, d + 1.95);
      }
      for (const d of [14, 25]) for (const s of [-1, 1]) w.torch(s * 2.5, Z(d), 0xffb050);
      // the moat: bones and the dead the fighting left, a broken cart wheel of rubble
      for (const [x, d] of [[-6, 18], [6.5, 21.5], [-9.5, 21], [5.5, 15]]) w.rock(x, Z(d), 0.5 + vhash(x, d) * 0.4, vhash(d, x) < 0.5, true);
      w.fallenColumn(-6.5, Z(28), 3.5, 0.3);
      // the Court of Penance: pillars, braziers, broken statues of the regime's saints, a dais at the back
      for (const [x, d, h] of [[-8.6, 31.5, 6], [8.6, 31.5, 6], [-8.6, 50.5, 7], [8.6, 50.5, 7]]) w.pillar(x, Z(d), h, false);
      for (const s of [-1, 1]) {
        w.brazier(s * 6, Z(31.5)); w.brazier(s * 6, Z(44));
        const st = new THREE.Group(); st.position.set(s * 7.6, 0, Z(41));
        for (const [geo, y] of [[new THREE.BoxGeometry(1.4, 1, 1.4), 0.5], [new THREE.ConeGeometry(0.55, 2.4, 6), 2.2], [new THREE.BoxGeometry(0.5, 0.5, 0.5), 3.6]]) { const m = new THREE.Mesh(geo, M.stone); m.position.y = y; st.add(m); }
        w.add(st); w.ob(s * 7.6, Z(41), 0.9);
      }
      w.fallenColumn(-4.5, Z(35), 4, 0.5); w.rock(5, Z(37), 0.8, true, true);
      // the galleries: hanged cages, lamps, banners down their back walls
      for (const s of [-1, 1]) {
        for (const d of [38, 46]) cage(w, s * 12.2, Z(d), s < 0 ? 0 : PI);
        for (const d of [35, 43, 51]) w.torch(s * 13.4, Z(d), 0xffb050);
        w.banner(s * 13.6, Z(39)); w.banner(s * 13.6, Z(47));
      }
      // the Gem Door: a walled hall, a gatehouse at its end with the three bosses' gems burning in sockets over the arch
      // (you carry them, or you couldn't be here), a candle-lit kneeling step each side
      const wallMat = M.stone, G = L - 2;
      for (const s of [-1, 1]) {
        w.box(0.7, 4, 18, wallMat, s * 4.85, 2, Z(G - 10)); for (const d of [58, 64, 70]) w.box(1.0, 4.6, 0.9, M.stoneDark, s * 4.85, 2.3, Z(d));
        w.box(1.4, 7, 1.4, M.stone, s * 3.5, 3.5, Z(G)); w.box(1.5, 0.2, 1.5, gold, s * 3.5, 7.1, Z(G));
        w.box(1.6, 0.3, 2.4, M.stoneDark, s * 3.0, 0.15, Z(G - 7)); w.banner(s * 3.7, Z(G - 11));
      }
      w.box(8.4, 1.6, 1.4, M.stone, 0, 7.6, Z(G)); w.box(8.6, 0.12, 1.5, gold, 0, 6.8, Z(G));
      [0xff3a1a, 0xa8e0ff, 0xffb040].forEach((col, k) => {
        const x = (k - 1) * 2.2, z = Z(G) + 0.75;
        w.box(0.9, 0.9, 0.2, gold, x, 7.6, z - 0.05);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: col })); gem.position.set(x, 7.6, z + 0.1); gem.userData.noMerge = true; w.add(gem);
        w.ambient.push({ x, z, update: (dt, t) => { gem.rotation.y = t * 1.5 + k; } });
        w.lights.push({ x, y: 6.8, z: z + 1.2, color: col, power: 5, range: 8, src: {} });
      });
      // the last of the March's hardest: a few from each deeper area (the court's elite an armoured Castellan), the
      // Hulk at the Gem Door
      w.spawn('hook', -1.4, 17, 0);
      w.spawn('torcher', 1.8, 24, 0);
      w.spawn('flagellant', -5, 33.5, 0);
      w.spawn('flagellant', 5, 34, 0);
      w.spawn('castellan', 0, 39, 0, { elite: 'armoured', soft: { hp: 0.3, armor: 0.3 } }); // softened: 30% of its health and armour
      w.spawn('augur', -2, 46.5, 0);
      w.spawn('wretch', 6.5, 44, 0);
      w.spawn('hulk', 0, 62, 0);
    },
  },
  // Varek's arena: a flat ring of worn flagstones (no grass), cobbles round its edge, old blood; the throne and the
  // great statue to the north; and all round it stands packed with the March's own, cheering him on (crowd.js)
  throne: {
    name: 'The Throne of the Last Sentinel', len: 64, ground: 'throne',
    build(w, Z, mod) {
      const R = 19, CD = 31;
      w.rect(-3, 3, 0, 8);
      w.rect(-3, 3, 5, 13, { gate: 'boss_in' });
      w.circle(0, CD, R);
      w.gate('boss_in', 8.5, 6, true);
      const enc = { id: 'boss', kind: 'boss', arena: { x: 0, z: Z(CD), r: R }, gateIn: 'boss_in', gateOut: null, mod: mod.i, active: false, defeated: false };
      w.encounters.push(enc);
      w.lights.push({ x: 0, y: 6, z: Z(35), color: 0xff7a3a, power: 26, range: 34, src: { cond: () => enc.active } });
      // the ground: flagstones, a ring of cobbles at the edge, scuffed dirt where the fighting's worn it
      w.paint({ cx: 0, cz: Z(CD), r: R + 0.5 }, 'cobble', { edge: 0.6 });
      w.paint({ cx: 0, cz: Z(CD), r: R - 2.6 }, 'flag', { edge: 0.8 });
      for (const [x, d, r] of [[-6, 26, 3], [7, 36, 2.6], [1, 42, 2.2], [-9, 38, 2], [10, 23, 2.2], [-2, 18, 1.8]]) w.paint({ cx: x, cz: Z(d), r }, 'dirt', { edge: 1.4, amount: 0.7 });
      w.paint({ x0: -3, x1: 3, z0: Z(13), z1: Z(0) }, 'cobble', { edge: 0.4 });
      // the great statue behind the throne
      w.box(5, 2, 4, w.mats.stone, 0, 1, Z(58));
      w.cyl(1.0, 1.6, 6, w.mats.stone, 0, 5, Z(58), 6);
      const hd = w.rock(0, Z(58), 0.9); hd.position.y = 8.6; hd.material = w.mats.stone;
      w.box(0.3, 7, 0.8, w.mats.stone, 0, 4.5, Z(56.2));
      decorateArena(w, 'throne', 0, Z(CD), R, enc, { stands: true });
      buildStands(w, 0, Z(CD), R, enc);
    },
  },
  // ---------- the Sunless Deep's master (regions.js r2f): down through the Crucible to the Kiln ----------
  // The Crucible: a descent down basalt ledges into the red. A landing with the beacon (8 m); stairs down to the
  // ledge (5.5 m) and a channel of lava across it, a chained bridge over; down again into the ruined Kiln-Works (3 m),
  // the first seer-glass poured here, lava pooled among the furnaces (it burns: keep out of it); the last stair down
  // to the Gem Door's hall (0 m), its gate of black glass set with the three gems. The region's hardest stand along
  // the way; the door fogs until they're dead. The Kiln follows
  crucible: {
    name: 'The Crucible', len: 78, ground: 'kiln',
    build(w, Z, mod) {
      const M = w.mats, T = w.terrain, L = 78;
      const band = (x0, x1, d0, d1, h, o) => T.flat(x0, x1, Z(d1), Z(d0), h, o);
      const down = (x0, x1, d0, d1, h0, h1, o) => T.stairs(x0, x1, Z(d1), Z(d0), h1, h0, 'z', o); // (h0 at d0, h1 at d1: descending north)
      band(-40, 40, -2, 12, 8, { look: 'basalt', ivy: 0.1 });
      down(-4, 4, 12, 16, 8, 5.5, { look: 'basalt' });
      band(-40, 40, 16, 30, 5.5, { look: 'basalt' });
      band(-40, 40, 24, 27, 2.0, { look: 'basalt', cap: false }); // the lava channel
      band(-2, 2, 23.5, 27.5, 5.5, { look: 'iron' });              // the chained bridge over it
      band(-40, 40, 33, 52, 3, { look: 'basalt' });
      band(-40, 40, 30, 33, 3, { look: 'basalt' }); down(-4, 4, 29.5, 33, 5.5, 3, { look: 'basalt' });
      down(-4, 4, 52, 56, 3, 0, { look: 'basalt' });
      ends(w, mod, L);
      w.rect(-8, 8, 0, 13);
      w.rect(-10, 10, 12, 24.4); w.rect(-2, 2, 23, 28.5); w.rect(-10, 10, 26.6, 31);
      w.rect(-14, 14, 29, 54); w.rect(-4.5, 4.5, 50, L);
      // the ground: basalt worn smooth on the way, cooled crust and ash gravel off it, obsidian in the hall
      const P = (sf, x0, x1, d0, d1, o) => w.paint({ x0, x1, z0: Z(d1), z1: Z(d0) }, sf, o), C = (sf, x, d, r, o) => w.paint({ cx: x, cz: Z(d), r }, sf, o);
      P('crust', -40, 40, -2, L, { amount: 0.35, edge: 3 });
      P('basalt', -3, 3, 0, L, { edge: 0.6 });
      P('gravel', -14, 14, 33, 52, { amount: 0.5, edge: 2 });
      P('obsidian', -4.5, 4.5, 56, L, { edge: 0.4 });
      for (const [x, d, r] of [[-6, 6, 2], [6, 20, 2.4], [-8, 40, 2.6], [9, 46, 2]]) C('crust', x, d, r, { edge: 1.2 });
      // lava: the channel under the bridge, pools among the furnaces (they burn whoever stands in them)
      const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff5a10 });
      const lava = (x0, x1, d0, d1, y, hurt) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, d1 - d0), lavaMat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, Z((d0 + d1) / 2)); m.userData.noMerge = true; m.userData.noSettle = true; w.add(m);
        const cx = (x0 + x1) / 2, cz = Z((d0 + d1) / 2);
        w.lights.push({ x: cx, y: y + 1.5, z: cz, color: 0xff5a10, power: 8, range: 10, src: {} });
        w.ambient.push({ x: cx, z: cz, update: (dt, t, fx) => {
          lavaMat.color.setRGB(1, 0.32 + Math.sin(t * 2.2) * 0.06, 0.06);
          if (Math.random() < dt * 8) fx.add.spawn({ x: x0 + Math.random() * (x1 - x0), y: y + 0.1, z: Z(d0 + Math.random() * (d1 - d0)), vy: 1.5 + Math.random(), life: 1.2, size: 0.12, size1: 0.02, r: 1, g: 0.6, b: 0.2 });
        } });
        if (hurt) (w.lavaPools ||= []).push({ x0, x1, z0: Z(d1), z1: Z(d0), y });
      };
      // whoever stands in a pool burns (every 0.4 s): the host's or solo player's world sees to its own players
      let burnT = 0;
      w.ambient.push({ x: 0, z: Z(40), update: (dt) => {
        if ((burnT -= dt) > 0) return; burnT = 0.4;
        const g = w.game; if (!g || !w.lavaPools) return;
        for (const p of g.allPlayers()) for (const L of w.lavaPools) if (p.alive && p.pos.x > L.x0 && p.pos.x < L.x1 && p.pos.z > L.z0 && p.pos.z < L.z1 && (p.pos.y || 0) < L.y + 0.6) { g.projectileHit(p, { dmg: 10 * NUM, knock: 'none', src: [p.pos.x, p.pos.z + 1], elems: { fire: 0.6 } }); break; }
      } });
      lava(-40, -2.2, 24, 27, 2.3, false); lava(2.2, 40, 24, 27, 2.3, false);
      // the furnaces' pools: round, a rim of cooling crust
      for (const [x, d, r] of [[-10.5, 39, 2.6], [10.5, 46, 2.2]]) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), lavaMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 3.05, Z(d)); m.userData.noMerge = true; m.userData.noSettle = true; w.add(m);
        w.paint({ cx: x, cz: Z(d), r: r + 1 }, 'crust', { edge: 0.6 });
        w.lights.push({ x, y: 4.5, z: Z(d), color: 0xff5a10, power: 8, range: 9, src: {} });
        w.lavaPools.push({ x0: x - r * 0.8, x1: x + r * 0.8, z0: Z(d) - r * 0.8, z1: Z(d) + r * 0.8, y: 3.05 });
        w.ambient.push({ x, z: Z(d), update: (dt, t, fx) => { if (Math.random() < dt * 6) fx.add.spawn({ x: x + (Math.random() - 0.5) * r, y: 3.15, z: Z(d) + (Math.random() - 0.5) * r, vy: 1.4 + Math.random(), life: 1.1, size: 0.12, size1: 0.02, r: 1, g: 0.6, b: 0.2 }); } });
      }
      // the landing: the beacon, chains hanging from nowhere, a broken winch
      const fire = w.bonfire(0, Z(5)); fire.lit = true;
      for (const [x, d] of [[-6, 3], [6, 8], [-7, 18], [8, 28], [-12, 46], [12, 36]]) w.box(0.08, 12, 0.08, M.metal, x, 9, Z(d));
      for (const s2 of [-1, 1]) w.torch(s2 * 5, Z(9), 0xff8a3a);
      // the bridge's chains and posts
      for (const s2 of [-1, 1]) { for (const d of [23.4, 27.6]) w.box(0.3, 1.6, 0.3, M.metal, s2 * 2.1, 0.8, Z(d)); w.box(0.06, 0.06, 4.2, M.metal, s2 * 2.1, 1.3, Z(25.5)); w.solid(s2 * 2.1 - 0.1, s2 * 2.1 + 0.1, 23.4, 27.6); }
      // the Kiln-Works: furnaces, crucibles on chains, moulds, slag heaps
      for (const [x, d] of [[-11, 34], [11, 39], [-11, 49], [11, 51]]) {
        w.box(2.6, 3.2, 2.4, M.stoneDark, x, 1.6, Z(d)); w.box(1.2, 1.0, 0.2, new THREE.MeshBasicMaterial({ color: 0xff7a20 }), x, 1.0, Z(d) + 1.22);
        w.lights.push({ x, y: 1.4, z: Z(d) + 1.8, color: 0xff7a20, power: 7, range: 8, src: {} }); w.solid(x - 1.3, x + 1.3, d - 1.2, d + 1.2);
      }
      for (const [x, d] of [[-4, 38], [5, 45], [-6, 48]]) { w.cyl(0.8, 0.6, 1.0, M.metal, x, 0.5, Z(d), 8); w.ob(x, Z(d), 0.9); }
      for (const [x, d] of [[3, 35], [-2, 44]]) w.rock(x, Z(d), 0.9, true, true);
      // the Gem Door: a gate of black glass at the hall's end, the three gems burning over it
      const G = L - 2, obs = new THREE.MeshLambertMaterial({ color: 0x16141a, flatShading: true });
      for (const s2 of [-1, 1]) { w.box(1.4, 7, 1.4, obs, s2 * 3.5, 3.5, Z(G)); w.box(0.7, 4, 16, M.stoneDark, s2 * 4.85, 2, Z(G - 9)); w.torch(s2 * 3.8, Z(G - 6), 0xff8a3a); }
      w.box(8.4, 1.6, 1.4, obs, 0, 7.6, Z(G));
      [0xffb040, 0x9af050, 0xb090ff].forEach((col, k) => {
        const x = (k - 1) * 2.2, z = Z(G) + 0.75;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: col })); gem.position.set(x, 7.6, z + 0.1); gem.userData.noMerge = true; w.add(gem);
        w.ambient.push({ x, z, update: (dt, t) => { gem.rotation.y = t * 1.5 + k; } });
        w.lights.push({ x, y: 6.8, z: z + 1.2, color: col, power: 5, range: 8, src: {} });
      });
      // the Deep's hardest, one of each kind from all three areas (two of them elites), the Shardback at the door
      w.spawn('rivet', -5, 19, 0);
      w.spawn('creeper', 5, 21, 0);
      w.spawn('lobber', -6, 35, 0);
      w.spawn('thrall', 0, 41, 0, { elite: 'blazing' });
      w.spawn('acolyte', 6, 37, 0);
      w.spawn('lancer', -8, 46, 0);
      w.spawn('shade', 7, 44, 0);
      w.spawn('burrower', 2, 49, 0, { elite: 'frenzied' });
      w.spawn('shardback', 0, 64, 0);
    },
  },
  // the Kiln: a round floor of black glass in a lake of lava, the ceiling lost in the dark; the Kilnfather waits at
  // its heart. His glass pillars wait off stage until his globes call them (deepbosses.js)
  kiln: {
    name: 'The Kiln', len: 60, ground: 'kilnArena',
    build(w, Z, mod) {
      const R = 17, CD = 30, M = w.mats;
      w.rect(-3, 3, 0, 8);
      w.rect(-3, 3, 5, 14, { gate: 'boss_in' });
      w.circle(0, CD, R);
      w.gate('boss_in', 8.5, 6, true);
      const enc = { id: 'boss', kind: 'boss', bossId: 'kilnfather', arena: { x: 0, z: Z(CD), r: R }, gateIn: 'boss_in', gateOut: null, mod: mod.i, active: false, defeated: false };
      w.encounters.push(enc);
      w.lights.push({ x: 0, y: 7, z: Z(CD), color: 0xff7a3a, power: 22, range: 30, src: {} });
      // the floor: obsidian, crust round the edge
      w.paint({ cx: 0, cz: Z(CD), r: R + 0.5 }, 'crust', { edge: 1 });
      w.paint({ cx: 0, cz: Z(CD), r: R - 2.5 }, 'basalt', { edge: 1.4 });
      w.paint({ cx: 0, cz: Z(CD), r: 6 }, 'obsidian', { edge: 1.2 }); // (black glass at the heart, where he stands)
      // the lava all round it (below the edge: the ground falls away into it)
      const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff5a10 });
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(76, 60), lavaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -1.2, Z(30)); sea.userData.noMerge = true; w.add(sea);
      w.ambient.push({ x: 0, z: Z(CD), update: (dt, t, fx) => {
        lavaMat.color.setRGB(1, 0.32 + Math.sin(t * 1.7) * 0.06, 0.05);
        for (let k = 0; k < 2; k++) if (Math.random() < dt * 14) { const a = Math.random() * Math.PI * 2, d = R + 2 + Math.random() * 14; fx.add.spawn({ x: Math.cos(a) * d, y: -1, z: Z(CD) + Math.sin(a) * d, vy: 2 + Math.random() * 3, life: 2.5, size: 0.14, size1: 0.02, r: 1, g: 0.55, b: 0.15 }); }
      } });
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; w.lights.push({ x: Math.cos(a) * (R + 4), y: 0.5, z: Z(CD) + Math.sin(a) * (R + 4), color: 0xff5a10, power: 8, range: 12, src: {} }); }
      // chains down from the dark, the great kiln's mouth glowing behind him
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.2, d = R - 1.5; w.box(0.08, 14, 0.08, M.metal, Math.cos(a) * d, 9, Z(CD) + Math.sin(a) * d); }
      const kiln = new THREE.MeshLambertMaterial({ color: 0x241a16, flatShading: true });
      w.box(10, 9, 5, kiln, 0, 3.5, Z(CD + R + 5)); w.box(4, 3.4, 0.3, new THREE.MeshBasicMaterial({ color: 0xff7a20 }), 0, 2.2, Z(CD + R + 2.4));
      w.lights.push({ x: 0, y: 2.5, z: Z(CD + R + 1), color: 0xff7a20, power: 14, range: 16, src: {} });
      // his pillars, waiting
      for (let k = 0; k < 10; k++) w.spawn('kilnpillar', 0, CD, 0, { reserve: true, effigy: true });
    },
  },
};
// (a visual-only random 0..1 from a position)
const vhash = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

export const BOSS_ARENA = {
  name: 'The Throne of the Last Sentinel', len: 58, ground: 'arena',
  build(w, Z, mod) {
    w.rect(-3, 3, 0, 8);
    w.rect(-3, 3, 5, 13, { gate: 'boss_in' });
    w.circle(0, 31, 19);
    w.gate('boss_in', 8.5, 6, true);
    arenaRing(w, Z, 0, 31, 19, true, false);
    const enc = { id: 'boss', kind: 'boss', arena: { x: 0, z: Z(31), r: 19 }, gateIn: 'boss_in', gateOut: null, mod: mod.i, active: false, defeated: false };
    w.encounters.push(enc);
    for (const [x, d] of [[-12, 42], [12, 42], [-14.5, 25], [14.5, 25]]) w.brazier(x, Z(d), { cond: () => enc.active, light: false });
    w.lights.push({ x: 0, y: 6, z: Z(35), color: 0xff7a3a, power: 26, range: 34, src: { cond: () => enc.active } });
    // great statue behind the arena
    w.box(5, 2, 4, w.mats.stone, 0, 1, Z(55));
    w.cyl(1.0, 1.6, 6, w.mats.stone, 0, 5, Z(55), 6);
    const hd = w.rock(0, Z(55), 0.9); hd.position.y = 8.6; hd.material = w.mats.stone;
    w.box(0.3, 7, 0.8, w.mats.stone, 0, 4.5, Z(53.2));
    decorateArena(w, 'throne', 0, Z(31), 19, enc);
  },
};

// the training arena (the Sanctum's Training button): a lit ring of sand with a training dummy in the middle that
// never fights back and never breaks (foes.js 'dummy'). Nothing to win: no gold, no loot, no enemies. You arrive at
// its south edge; the pause menu takes you home
export const TRAINING_ARENA = {
  name: 'The Proving Ring', len: 26, ground: 'proving',
  build(w, Z, mod) {
    const M = w.mats;
    w.circle(0, 13, 12);
    arenaRing(w, Z, 0, 13, 12, false, false);
    for (const [x, d] of [[-8.5, 5], [8.5, 5], [-8.5, 21], [8.5, 21]]) w.brazier(x, Z(d), { power: 14 });
    w.lights.push({ x: 0, y: 7, z: Z(13), color: 0xffc080, power: 18, range: 26, src: {} });
    // a chalk circle round the dummy, weapon racks and banners along the back wall
    const chalk = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.8, 32), new THREE.MeshBasicMaterial({ color: 0x8a8070, transparent: true, opacity: 0.5 }));
    chalk.rotation.x = -PI / 2; chalk.position.set(0, 0.03, Z(13)); chalk.userData.noMerge = true; w.add(chalk);
    w.rack(-4, Z(23.2)); w.rack(4, Z(23.2));
    w.banner(-9.5, Z(18)); w.banner(9.5, Z(18));
    w.crate(-10, Z(11)); w.barrel(10, Z(10)); w.barrel(10.6, Z(11.2));
    w.box(1.6, 0.5, 1.0, M.wood, 0, 0.25, Z(24)); // a bench by the racks
    w.spawn('dummy', 0, 13, 0, { effigy: true });
    // two summoning pads behind the dummy (trainpads.js): stand on one 3 s to call an enemy in across the ring, the
    // amber one a small enemy, the red one a big one. An iron plate with a lit rim and a rune that spins as it charges,
    // a post with a skull on it to say which (a small skull; a big horned one)
    w.trainPads = [];
    for (const [x, size] of [[-2.6, 'small'], [2.6, 'large']]) {
      const big = size === 'large', r = big ? 1.25 : 0.95, z = Z(19.4), hex = big ? 0xff3a24 : 0xffb04a, rim = big ? M.glowRed : M.glowAmber;
      w.cyl(r, r + 0.08, 0.12, M.stoneDark, x, 0.06, z, 12);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.06, 0.04, 4, 20), rim); ring.rotation.x = -PI / 2; ring.position.set(x, 0.13, z); w.add(ring);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(r - 0.1, 20), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.rotation.x = -PI / 2; glow.position.set(x, 0.14, z); glow.userData.noMerge = true; w.add(glow);
      const rune = new THREE.Group(); rune.rotation.x = -PI / 2; rune.position.set(x, 0.145, z); rune.userData.noMerge = true; w.add(rune);
      for (let i = 0; i < 3; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(r * 1.3, 0.06, 0.01), new THREE.MeshBasicMaterial({ color: hex })); bar.rotation.z = i * PI / 3; rune.add(bar); }
      // the post and its skull, at the back edge
      const px = x + (big ? 1.0 : -0.8), pz = z - r * 0.9;
      w.box(0.12, 1.5, 0.12, M.logDark, px, 0.75, pz); w.ob(px, pz, 0.2);
      w.box(big ? 0.34 : 0.22, big ? 0.3 : 0.2, big ? 0.3 : 0.2, M.bone, px, 1.6, pz);
      w.box(big ? 0.22 : 0.14, 0.05, 0.02, rim, px, big ? 1.62 : 1.6, pz + (big ? 0.16 : 0.11));
      if (big) for (const s of [-1, 1]) { const h = w.cyl(0.02, 0.06, 0.32, M.bone, px + s * 0.2, 1.82, pz); h.rotation.z = -s * 0.7; }
      w.lights.push({ x, y: 1.4, z, color: hex, power: 4, range: 5, src: {} });
      // where its enemy comes in: across the ring, the far side of the dummy
      w.trainPads.push({ x, z, y: 0, r, size, glow, rune, t: 0, armed: true, sx: x * 0.9, sz: Z(7.5) });
    }
    // the terrain to try (terrain.js): a terrace to the west (1.6 m: stairs up its east side, a ladder up its front;
    // dropping off it lands on your feet), a higher one to the east (3.6 m: a long ramp up from the south, a ladder
    // pulled up at the top to lower; a drop off it hurts), and a low hill by the way in
    const T = w.terrain;
    T.flat(-12, -5, Z(22), Z(8), 1.6);
    T.stairs(-5, -3, Z(14.5), Z(11), 1.6, 0, 'x');
    T.ladder(-8, Z(7.55), Math.PI, 0, 1.6);
    T.flat(5, 12, Z(21), Z(9), 3.6, { look: 'brick' });
    T.slope(5, 9, Z(9), Z(3.5), 3.6, 0, 'z', { look: 'earth' });
    T.ladder(4.58, Z(15), Math.PI / 2, 0, 3.6, { raised: true });
    T.hill(-6.5, Z(3.5), 3, 0.7);
    // the ground (ground.js): flagstones round the dummy in a ring of cobbles, packed dirt beyond, and the grass
    // creeping back in at the edges, over the terraces and up the ramp's sides; what grows and lies about (flora.js)
    w.paint({ cx: 0, cz: Z(13), r: 8.6 }, 'cobble', { edge: 0.8 });
    w.paint({ cx: 0, cz: Z(13), r: 6.4 }, 'flag', { edge: 0.6 });
    for (const [x, d, r] of [[-9.5, 3, 3.2], [9.5, 2.5, 2.6], [-2, 24, 2.4], [4.5, 25, 2], [-10.5, 15, 2.6]]) w.paint({ cx: x, cz: Z(d), r }, 'grass', { edge: 1.8 });
    w.paint({ x0: -12, x1: -5, z0: Z(22), z1: Z(8) }, 'grass', { edge: 2.5, amount: 0.75 });
    w.paint({ x0: 5, x1: 12, z0: Z(21), z1: Z(9) }, 'grass', { edge: 2.2, amount: 0.8 });
    w.paint({ cx: 8.5, cz: Z(15), r: 2.2 }, 'flag', { edge: 0.6 });
    w.paint({ x0: 5.6, x1: 8.4, z0: Z(9), z1: Z(3.5) }, 'dirt', { edge: 0.5 });
    w.flora.push(
      { kind: 'tree', x: 10, z: Z(18.5), s: 0.9 }, { kind: 'leaves', x: 10, z: Z(18.5), r: 3, n: 90 },
      { kind: 'tree', x: -10.5, z: Z(20), s: 0.8, dead: true },
      { kind: 'bush', x: -10.8, z: Z(9.5), n: 5 }, { kind: 'bush', x: 11, z: Z(4), n: 4 }, { kind: 'bush', x: -3.5, z: Z(24.5), n: 3 }, { kind: 'bush', x: 6.4, z: Z(11), n: 3, s: 0.8 },
      { kind: 'leaves', x: -4, z: Z(6), r: 2.5, n: 40 },
      { kind: 'puddle', x: 3.2, z: Z(5.5), r: 0.9 }, { kind: 'puddle', x: -2.6, z: Z(20.5), r: 0.7 }, { kind: 'puddle', x: 5.2, z: Z(2.6), r: 0.5 },
    );
  },
};

export const REGULAR = Object.keys(MODULES);

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// 11 slots: every 3rd is a mini boss (3, 6, 9 — each a different one), slot 11 is Varek,
// and the other 7 slots use all 7 regular modules in random order.
export function pickLayout(rand = Math.random) {
  const r = shuffle([...REGULAR], rand);
  const m = shuffle(Object.keys(MINI_ARENAS), rand).map((k) => 'mini:' + k);
  return [r[0], r[1], m[0], r[2], r[3], m[1], r[4], r[5], m[2], r[6], 'boss'];
}
