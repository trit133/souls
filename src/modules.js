import * as THREE from 'three';
import { decorateArena } from './decor.js';

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
  } else {
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

// the region's last area (regions.js r1f): the Sentinel's Bastion, the approach to Varek's throne. A landing with
// the beacon; a broken causeway; the Court of Penance where the last of the March's hardest wait (a few from each
// deeper area, one an elite); the Gem Door, its arch set with the three bosses' gems, burning (you carry
// them, or you couldn't be here). The door on to the throne fogs until the court is clear. BOSS_ARENA follows
export const FINAL_MODULES = {
  bastion: {
    name: "The Sentinel's Bastion", len: 64, ground: 'stone',
    build(w, Z, mod) {
      const M = w.mats, gold = new THREE.MeshLambertMaterial({ color: 0x8a6a2a, flatShading: true });
      ends(w, mod, 64);
      w.rect(-5, 5, 0, 11); // the landing
      w.rect(-3.2, 3.2, 9, 27); // the causeway
      w.rect(-12, 12, 25, 49); // the Court of Penance
      w.rect(-4, 4, 47, 64); // the Gem Door's hall
      // the landing: the beacon, sandbags, a banner each side
      const fire = w.bonfire(0, Z(5)); fire.lit = true;
      for (const s of [-1, 1]) { w.box(0.8, 0.8, 6, M.cloth, s * 4.4, 0.4, Z(5)); w.banner(s * 3.6, Z(9.5)); }
      // the causeway: broken parapets over a drop, black stone with gold caps, lamps on chains
      for (let d = 10; d < 26; d += 2.2) for (const s of [-1, 1]) {
        const h = vhash(d, s) < 0.3 ? 0.4 : 1.1;
        w.box(0.5, h, 1.8, M.stoneDark, s * 3.6, h / 2, Z(d + 1)); if (h > 1) w.box(0.6, 0.12, 1.9, gold, s * 3.6, h + 0.06, Z(d + 1));
      }
      for (const d of [14, 22]) for (const s of [-1, 1]) w.torch(s * 4.6, Z(d), 0xffb050);
      // the Court of Penance: a ring of hanged cages, broken statues of the regime's saints, braziers, a dais at the
      // back where an Augur reads you coming
      for (const [x, d, h] of [[-10, 28, 6], [10, 28, 6], [-10.5, 46, 7], [10.5, 46, 7], [-11, 37, 4], [11, 37, 4.5]]) w.pillar(x, Z(d), h, h < 5);
      for (const s of [-1, 1]) {
        w.brazier(s * 7.5, Z(31)); w.brazier(s * 7.5, Z(44));
        const st = new THREE.Group(); st.position.set(s * 9.5, 0, Z(40));
        for (const [geo, y] of [[new THREE.BoxGeometry(1.6, 1, 1.6), 0.5], [new THREE.ConeGeometry(0.6, 2.4, 6), 2.2], [new THREE.BoxGeometry(0.5, 0.5, 0.5), 3.6]]) { const m = new THREE.Mesh(geo, M.stone); m.position.y = y; st.add(m); }
        w.add(st); w.ob(s * 9.5, Z(40), 1.0);
      }
      w.box(9, 0.4, 3.6, M.stoneDark, 0, 0.2, Z(46.5)); w.box(9.2, 0.08, 3.8, gold, 0, 0.42, Z(46.5));
      w.fallenColumn(-5, Z(33), 4, 0.5); w.rock(6, Z(35), 0.8, true, true);
      // the Gem Door: a gatehouse at the hall's end with the three bosses' gems burning in sockets over the arch (you
      // carry them, or you couldn't be here), a candle-lit kneeling step each side
      for (const s of [-1, 1]) {
        w.box(1.4, 7, 1.4, M.stone, s * 3.5, 3.5, Z(62)); w.box(1.5, 0.2, 1.5, gold, s * 3.5, 7.1, Z(62));
        w.box(1.6, 0.3, 2.4, M.stoneDark, s * 3.0, 0.15, Z(55)); w.banner(s * 3.7, Z(51));
      }
      w.box(8.4, 1.6, 1.4, M.stone, 0, 7.6, Z(62)); w.box(8.6, 0.12, 1.5, gold, 0, 6.8, Z(62));
      [0xff3a1a, 0xa8e0ff, 0xffb040].forEach((col, k) => {
        const x = (k - 1) * 2.2, z = Z(62) + 0.75;
        w.box(0.9, 0.9, 0.2, gold, x, 7.6, z - 0.05);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: col })); gem.position.set(x, 7.6, z + 0.1); gem.userData.noMerge = true; w.add(gem);
        w.ambient.push({ x, z, update: (dt, t) => { gem.rotation.y = t * 1.5 + k; } });
        w.lights.push({ x, y: 6.8, z: z + 1.2, color: col, power: 5, range: 8, src: {} });
      });
      // the last of the March's hardest: a few from each deeper area (the court's elite an armoured Castellan)
      w.spawn('hook', -1.4, 17, 0);
      w.spawn('torcher', 1.8, 24, 0);
      w.spawn('flagellant', -6, 33, 0);
      w.spawn('flagellant', 6, 34, 0);
      w.spawn('castellan', 0, 39, 0, { elite: 'armoured' });
      w.spawn('augur', -2, 46.5, 0);
      w.spawn('wretch', 7, 44, 0);
      w.spawn('hulk', 0, 52, 0);
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
