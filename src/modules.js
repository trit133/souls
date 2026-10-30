// Level modules. build(w, Z, mod) receives the World, Z(d) (module distance -> world z)
// and the module record. Coordinates: x across, d along the module (0 = entry, len = exit).
// Every module connects through a 5-wide opening centred on x = 0 at both ends.
// Enemy yaw 0 faces the entry (toward the arriving player).

const PI = Math.PI;

function ends(w, mod, len, half = 2.5) {
  // openings overlap both the neighbouring module and this module's interior by
  // more than an actor's diameter, so seams never form invisible walls
  w.rect(-half, half, mod.i === 0 ? 0 : -1.5, 5.5);
  w.rect(-half, half, len - 5.5, len + 1.5);
}

export const MODULES = {
  ruins: {
    name: 'The Broken Road', len: 42, ground: 'stone',
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
    name: 'The Ashen Camp', len: 44, ground: 'dirt',
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
    name: 'The Hanging Span', len: 46, ground: 'chasm',
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
    name: 'The Burned Hamlet', len: 48, ground: 'ash',
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
    name: 'The Ossuary Hall', len: 46, ground: 'crypt',
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
    name: 'The Sunken Mire', len: 48, ground: 'bog',
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

// Mini boss arena: fog in, fight, fog out, then a short alcove. `theme` picks decor.
function miniArena(bossId, name, ground, theme) {
  return {
    name, len: 54, ground,
    build(w, Z, mod) {
      w.rect(-3, 3, -1.5, 6);
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
      const fire = theme === 'cloister' ? { color: 0x8ab4ff, cold: true } : {};
      for (const [x, d] of [[-9, 16], [9, 16], [-9, 32], [9, 32]]) w.brazier(x, Z(d), { cond: () => enc.active, power: 14, ...fire });
      if (theme === 'pit') {
        w.box(1.6, 0.8, 1.0, w.mats.wood, 0, 0.4, Z(31.5)); w.ob(0, Z(31.5), 0.8);
        for (const [x, d] of [[-6, 33], [6, 33.5], [-11, 24], [11, 24]]) {
          w.cyl(0.08, 0.1, 2.4, w.mats.logDark, x, 1.2, Z(d), 5);
          w.box(0.28, 0.28, 0.28, w.mats.bone, x, 2.5, Z(d));
        }
      } else if (theme === 'cloister') {
        // moonlit garden ring: low hedges and a dry fountain
        w.cyl(1.6, 1.8, 0.6, w.mats.stone, 0, 0.3, Z(30)); w.ob(0, Z(30), 1.8);
        w.cyl(0.25, 0.3, 1.6, w.mats.stone, 0, 0.8, Z(30));
        for (const [x, d] of [[-10.5, 20], [10.5, 20], [-10.5, 28], [10.5, 28]]) w.box(0.9, 0.8, 3, w.mats.leaf, x, 0.4, Z(d));
      } else {
        // forge: anvils, slag heaps, glowing coals
        for (const [x, d] of [[-6, 31], [6, 17]]) { w.box(1.2, 0.7, 0.6, w.mats.metal, x, 0.35, Z(d)); w.ob(x, Z(d), 0.7); }
        for (const [x, d] of [[-10.5, 22], [10.5, 27], [5, 33]]) { w.rock(x, Z(d), 0.9, true, true); w.fires.push({ x, z: Z(d), y: 0.4, scale: 0.5 }); }
      }
      w.rock(-5, Z(44), 0.7); w.rock(5, Z(48), 0.6);
    },
  };
}

export const MINI_ARENAS = {
  hask: miniArena('hask', "The Executioner's Pit", 'arena', 'pit'),
  vael: miniArena('vael', 'The Moonlit Cloister', 'crypt', 'cloister'),
  gorrath: miniArena('gorrath', 'The Slag Forge', 'ash', 'forge'),
};

export const BOSS_ARENA = {
  name: 'The Throne of Ash', len: 58, ground: 'arena',
  build(w, Z, mod) {
    w.rect(-3, 3, -1.5, 8);
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
