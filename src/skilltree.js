// Per-character skill trees (replacing the old upgrade shop). Each tree is a web around a start node:
// spokes run outward ring by ring, side branches fork off them and ring links join neighbouring spokes,
// so there is more than one way out. Inner rings give small flat stats, outer rings bigger flat chunks,
// small percentages and the character's own stats. The evolution sits 6 rings out; 3 rune sockets sit at
// ring 10 (empty for now). A node can be bought when it touches one you own; price grows with the ring.
import { UPGRADES, upgradeCost } from './progress.js';
import { LAYOUT } from './treelayout.js';

// ---------- what nodes can give ----------
// fmt: how a value reads in the tooltip
export const STATS = {
  hp: { name: 'Health', fmt: (v) => `+${v} health`, icon: 'hp' },
  st: { name: 'Stamina', fmt: (v) => `+${v} stamina`, icon: 'st' },
  dmg: { name: 'Damage', fmt: (v) => `+${v} damage per hit`, icon: 'dmg' },
  hpPct: { name: 'Vitality', fmt: (v) => `+${v}% health`, icon: 'hp' },
  stPct: { name: 'Endurance', fmt: (v) => `+${v}% stamina`, icon: 'st' },
  dmgPct: { name: 'Might', fmt: (v) => `+${v}% damage`, icon: 'dmg' },
  move: { name: 'Swiftness', fmt: (v) => `+${v}% move speed`, icon: 'move' },
  aspd: { name: 'Quickness', fmt: (v) => `+${v}% attack speed`, icon: 'aspd' },
  potion: { name: 'Alchemy', fmt: (v) => `+${v}% potion healing`, icon: 'potion' },
  flask: { name: 'Extra Flask', fmt: (v) => `+${v} flask`, icon: 'flask' },
  // knight
  dr: { name: 'Bulwark', fmt: (v) => `${v}% less damage taken`, icon: 'dr' },
  blockDrain: { name: 'Steady Guard', fmt: (v) => `${v}% less stamina drain while blocking`, icon: 'blockDrain' },
  chip: { name: 'Tempered Shield', fmt: (v) => `${v} points less damage through the shield (of 25)`, icon: 'chip' },
  stun: { name: 'Crushing Blows', fmt: (v) => `+${v}% stun buildup`, icon: 'stun' },
  counter: { name: 'Riposte Edge', fmt: (v) => `+${v}% guard counter damage`, icon: 'counter' },
  chargeCd: { name: 'Relentless', fmt: (v) => `Shield Charge cooldown −${v}s`, icon: 'chargeCd' },
  chargeKb: { name: 'Battering Ram', fmt: (v) => `+${v}% Shield Charge knockback`, icon: 'chargeKb' },
  // rogue
  parryCd: { name: 'Quick Hands', fmt: (v) => `Parry cooldown −${v}s`, icon: 'parryCd' },
  critDmg: { name: 'Cruelty', fmt: (v) => `+${v}% critical damage`, icon: 'critDmg' },
  iframe: { name: 'Shadowstep', fmt: (v) => `+${v}s roll invincibility`, icon: 'iframe' },
  atkCost: { name: 'Light Blades', fmt: (v) => `Attacks cost ${v}% less stamina`, icon: 'atkCost' },
  bleed: { name: 'Serrated', fmt: (v) => `+${v}% bleed buildup`, icon: 'bleed' },
  parryWin: { name: 'Keen Eye', fmt: (v) => `+${v}ms parry window`, icon: 'parryWin' },
  rollCost: { name: 'Nimble', fmt: (v) => `Rolls cost ${v}% less stamina`, icon: 'rollCost' },
  // spellsword
  mana: { name: 'Deep Well', fmt: (v) => `+${v} max mana`, icon: 'mana' },
  manaHit: { name: 'Siphon', fmt: (v) => `+${v} mana per knife hit`, icon: 'manaHit' },
  boltCost: { name: 'Thrift', fmt: (v) => `Bolt costs ${v} less mana`, icon: 'boltCost' },
  fireCost: { name: 'Kindling', fmt: (v) => `Fireball costs ${v} less mana`, icon: 'fireCost' },
  spellDmg: { name: 'Arcana', fmt: (v) => `+${v}% spell damage`, icon: 'spellDmg' },
  fireRadius: { name: 'Conflagration', fmt: (v) => `+${v}% fireball blast radius`, icon: 'fireRadius' },
  knifeDmg: { name: 'Spellblade', fmt: (v) => `+${v}% knife damage`, icon: 'knifeDmg' },
};

// the character's own stats: [small, large] values
const SPECIAL = {
  knight: [['dr', 1.5, 3], ['blockDrain', 6, 12], ['chip', 1.5, 3], ['stun', 3, 6], ['counter', 6, 12], ['chargeCd', 1, 2], ['chargeKb', 10, 20]],
  rogue: [['parryCd', 0.25, 0.5], ['critDmg', 4, 8], ['iframe', 0.01, 0.02], ['atkCost', 3, 6], ['bleed', 8, 15], ['parryWin', 5, 10], ['rollCost', 4, 8]],
  mage: [['mana', 5, 10], ['manaHit', 0.5, 1], ['boltCost', 0.5, 1], ['fireCost', 2, 4], ['spellDmg', 3, 6], ['fireRadius', 5, 10], ['knifeDmg', 3, 6]],
};
// limits so a full tree stays fair
export const CAPS = { dr: 15, blockDrain: 50, chip: 12, parryCd: 5, boltCost: 4, fireCost: 20, iframe: 0.08, atkCost: 25, rollCost: 30,
  parryWin: 25, potion: 40, bleed: 50, critDmg: 30, counter: 35, chargeCd: 6, stun: 25, spellDmg: 20, knifeDmg: 20, fireRadius: 30, dmgPct: 25 };

const INNER = [{ hp: 3 }, { st: 2 }, { dmg: 1 }, { hp: 3 }, { st: 2 }];
const MID = [{ hp: 4 }, { st: 2 }];
const EARLY_PCT = [{ hpPct: 1 }, { stPct: 1 }, { dmgPct: 1 }];
const OUTER = [{ hp: 8 }, { st: 4 }, { dmg: 2 }];
const PCT_MID = [{ hpPct: 2 }, { dmgPct: 2 }, { stPct: 2 }, { move: 1 }, { aspd: 1 }];
const PCT_OUTER = [{ hpPct: 3 }, { dmgPct: 3 }, { stPct: 2 }, { move: 1 }, { aspd: 1 }, { potion: 5 }];

export const EVOS = {
  knight: { key: 'evo_knight', name: 'Shield Charge', desc: 'Block + heavy charges behind a spectral shield, knocking enemies back (20 s cooldown); attack right after it for a leaping overhead.' },
  rogue: { key: 'evo_rogue', name: 'Red Riposte', desc: 'Parry window +50 ms, a 5 s parry cooldown, and a parry blinks you behind the enemy for an instant backstab.' },
  mage: { key: 'evo_mage', name: 'Twin Inferno', desc: 'Your fireball splits into two larger fireballs.' },
};

// ---------- shapes ----------
// spokes and how far each runs, twist per ring (spiral), the first spoke's angle, ring links [ring, nodes
// between neighbouring spokes], star chords to the spoke two over [ring], and how the gaps are filled:
// 'wheel' (a hub ringed by small nodes), 'arc' (a curved chain sweeping toward the next spoke), 'gem' (wheels
// set out at the star's points and forks between them)
const SHAPES = {
  knight: { spokes: 4, lens: [20, 20, 20, 20], twist: 0, start: -Math.PI / 2, links: [[4, 1], [9, 2], [13, 2], [18, 1]], star: [], style: 'wheel' },
  rogue: { spokes: 6, lens: [20, 15, 20, 15, 20, 15], twist: 0.09, start: -Math.PI / 2, links: [[5, 1], [13, 1]], star: [], style: 'arc' },
  mage: { spokes: 5, lens: [20, 20, 20, 20, 20], twist: 0, start: -Math.PI / 2, links: [[4, 1]], star: [7, 14], style: 'gem' },
};

export const RING = 12; // distance between rings in tree units
// the three price bands, spread over 20 rings: 1-7: 10 -> 80, 8-14: 100 -> 200, 15-20: 250 -> 350
const COST = [0, 10, 14, 20, 30, 40, 55, 80, 100, 110, 125, 140, 160, 180, 200, 250, 270, 290, 310, 330, 350];
// every tree has the same number of nodes in each band of rings: [first ring, last ring, nodes]
export const BANDS = [[1, 7, 90], [8, 14, 60], [15, 20, 30]];
// the most nodes a tree can hold: 70 in the first section, 100 once that character beats it (Varek),
// 120 in the second section, 130 once that is beaten (the second section is still to come)
export function nodeCap(data, kind) {
  const st = data?.stats || {};
  if (st.section2WinsBy?.[kind]) return 130;
  if (st.section2By?.[kind]) return 120;
  if (st.winsBy?.[kind]) return 100;
  return 70;
}
export const capHint = (cap) => (cap <= 70 ? 'Beat Varek with this character to raise the limit to 100' : cap <= 100 ? 'More nodes open in the next section' : 'More nodes open as you go deeper');
export const EVO_RING = 6, SOCKET_RING = 10, SOCKET_GAP = 3;
// drawn sizes (tree units), used to keep nodes apart
const SIZE = (n) => (n.role === 'start' ? 4.6 : n.role === 'socket' || n.role === 'evo' ? 5 : 3.9);
const GAP = 2.4;

export function build(kind, opts = {}) {
  const S = SHAPES[kind], nodes = new Map(), edges = [];
  const add = (n) => { nodes.set(n.id, n); return n; };
  const link = (a, b) => edges.push([a, b]);
  const ang = (i, d) => S.start + (i * Math.PI * 2) / S.spokes + S.twist * d;
  const at = (a, r) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  const ringOf = (x, y) => Math.max(1, Math.round(Math.hypot(x, y) / RING));
  add({ id: 'start', ring: 0, role: 'start', x: 0, y: 0, pin: true });
  // spokes
  for (let i = 0; i < S.spokes; i++) for (let d = 1; d <= S.lens[i]; d++) {
    add({ id: `s${i}-${d}`, ring: d, role: 'main', spoke: i, pin: true, ...at(ang(i, d), d * RING) });
    link(d === 1 ? 'start' : `s${i}-${d - 1}`, `s${i}-${d}`);
  }
  const has = (id) => nodes.has(id);
  // ring links between neighbouring spokes (only where both reach)
  for (const [d, m] of S.links) for (let i = 0; i < S.spokes; i++) {
    const j = (i + 1) % S.spokes;
    if (!has(`s${i}-${d}`) || !has(`s${j}-${d}`)) continue;
    let a0 = ang(i, d), a1 = ang(j, d);
    if (a1 < a0) a1 += Math.PI * 2;
    let prev = `s${i}-${d}`;
    for (let k = 1; k <= m; k++) {
      const id = `l${i}-${d}-${k}`;
      add({ id, ring: d, role: 'link', ...at(a0 + ((a1 - a0) * k) / (m + 1), d * RING) });
      link(prev, id); prev = id;
    }
    link(prev, `s${j}-${d}`);
  }
  // the star (spellsword): from each spoke's point at the outer star ring, a line dips to a valley between
  // the spokes at the inner star ring and back out to the next spoke's point: a five-point star outline
  if (S.star.length) {
    const [inner, outer] = S.star;
    for (let i = 0; i < S.spokes; i++) {
      const j = (i + 1) % S.spokes, A = nodes.get(`s${i}-${outer}`), B = nodes.get(`s${j}-${outer}`);
      const va = ang(i, inner) + Math.PI / S.spokes, V = at(va, inner * RING), vid = `x${i}-v`;
      add({ id: vid, ring: inner, role: 'link', ...V });
      for (const [P, side] of [[A, 'a'], [B, 'b']]) {
        const mx = (P.x + V.x) / 2, my = (P.y + V.y) / 2, id = `x${i}-${side}`;
        add({ id, ring: ringOf(mx, my), role: 'link', x: mx, y: my });
        link(P.id, id); link(id, vid);
      }
    }
  }
  nodes.get(`s0-${EVO_RING}`).role = 'evo';
  // rune sockets: a triangle on their own ring just outside ring 10, joined socket to socket by the same chain
  // of SOCKET_GAP nodes on every tree; turned to keep off the spokes; each socket links to the nearest spoke
  const SR = (SOCKET_RING + 0.5) * RING, steps = 3 * (SOCKET_GAP + 1);
  const spokeA = Array.from({ length: S.spokes }, (_, i) => ang(i, SOCKET_RING));
  const off = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  let best = 0, bestGap = -1;
  for (let deg = 0; deg < 360 / steps; deg += 0.5) {
    const a0 = S.start + (deg * Math.PI) / 180;
    const gap = Math.min(...Array.from({ length: steps }, (_, k) => Math.min(...spokeA.map((sa) => off(a0 + (k * Math.PI * 2) / steps, sa)))));
    if (gap > bestGap) { bestGap = gap; best = a0; }
  }
  const ringIds = [];
  for (let k = 0; k < steps; k++) {
    const a = best + (k * Math.PI * 2) / steps, sock = k % (SOCKET_GAP + 1) === 0;
    const id = sock ? `r${k / (SOCKET_GAP + 1)}` : `ra${k}`;
    add({ id, ring: SOCKET_RING, role: sock ? 'socket' : 'link', socketRing: true, ...at(a, SR) });
    if (sock) {
      let near = 0; spokeA.forEach((sa, i) => { if (off(a, sa) < off(a, spokeA[near])) near = i; });
      link(`s${near}-${SOCKET_RING}`, id);
    }
    ringIds.push(id);
  }
  ringIds.forEach((id, k) => link(id, ringIds[(k + 1) % steps]));

  // ---- fill each band to its share with the character's own features, out in the gaps between spokes ----
  const inBand = (lo, hi) => [...nodes.values()].filter((n) => n.ring >= lo && n.ring <= hi).length;
  let uid = 0;
  const nearest = (x, y, lo, hi, not = new Set()) => {
    let bestId = null, bd = 1e9;
    for (const n of nodes.values()) {
      if (not.has(n.id) || n.role === 'socket' || n.ring < lo || n.ring > hi) continue;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bd) { bd = d; bestId = n.id; }
    }
    return bestId;
  };
  const clampRing = (x, y, lo, hi) => Math.min(hi, Math.max(lo, ringOf(x, y)));
  // the clearest point near (x, y): most room from every node already placed
  const freeSpot = (x, y, reach) => {
    const r0 = Math.hypot(x, y), a0 = Math.atan2(y, x);
    let bx = x, by = y, bc = -1;
    for (let dr = -0.9; dr <= 0.91; dr += 0.3) for (let da = -0.36; da <= 0.361; da += 0.06) {
      const r = r0 + dr * RING, cx = Math.cos(a0 + da) * r, cy = Math.sin(a0 + da) * r;
      let c = 1e9;
      for (const n of nodes.values()) c = Math.min(c, Math.hypot(n.x - cx, n.y - cy) - SIZE(n));
      c -= reach;
      if (c > bc) { bc = c; bx = cx; by = cy; }
    }
    return [bx, by];
  };
  const wheel = (gx0, gy0, size, lo, hi) => {
    // a hub with `size - 1` nodes round it, joined in a loop; one entry to the web
    const [gx, gy] = freeSpot(gx0, gy0, RING * 0.95 + 4);
    const hub = `w${uid++}`, hr = clampRing(gx, gy, lo, hi), ids = [];
    add({ id: hub, ring: hr, role: 'tip', x: gx, y: gy });
    const m = size - 1, rad = RING * 0.95;
    for (let k = 0; k < m; k++) {
      const a = (k / m) * Math.PI * 2 + Math.atan2(gy, gx), x = gx + Math.cos(a) * rad, y = gy + Math.sin(a) * rad;
      const id = `w${uid++}`;
      add({ id, ring: clampRing(x, y, lo, hi), role: 'main', x, y });
      link(hub, id); ids.push(id);
    }
    for (let k = 0; k < m - 1 && m > 2; k++) if (k % 2 === 0) link(ids[k], ids[k + 1]);
    const inner = ids.length ? ids.reduce((a, b) => (Math.hypot(nodes.get(a).x, nodes.get(a).y) < Math.hypot(nodes.get(b).x, nodes.get(b).y) ? a : b)) : hub;
    const n = nodes.get(inner);
    link(nearest(n.x, n.y, Math.max(0, lo - 2), hi, new Set([hub, ...ids])), inner);
  };
  const arc = (i, r, len, lo, hi) => {
    // a curved chain from a spoke sweeping toward the next one, a little outside ring r
    const a0 = ang(i, r), span = (Math.PI * 2) / S.spokes, dir = 1;
    let prev = `s${i}-${r}`;
    for (let k = 1; k <= len; k++) {
      const a = a0 + dir * span * (k / (len + 1)), rr = (r + 0.5 + 0.15 * k) * RING, p = at(a, rr), id = `a${uid++}`;
      add({ id, ring: clampRing(p.x, p.y, lo, hi), role: k === len ? 'tip' : 'link', ...p });
      link(prev, id); prev = id;
    }
  };
  const fork = (i, r, len, lo, hi, side) => {
    // out from a spoke then split in two
    const a = ang(i, r) + side * 0.32, p = at(a, (r + 0.5) * RING), stem = `k${uid++}`;
    add({ id: stem, ring: clampRing(p.x, p.y, lo, hi), role: 'branch', ...p });
    link(`s${i}-${r}`, stem);
    for (let k = 0; k < len - 1; k++) {
      const q = at(a + (k ? 0.16 : -0.16) * side, (r + 1.4) * RING), id = `k${uid++}`;
      add({ id, ring: clampRing(q.x, q.y, lo, hi), role: 'tip', ...q });
      link(stem, id);
    }
  };
  for (const [lo, hi, want] of BANDS) {
    let need = want - inBand(lo, hi), slot = 0;
    const span = (Math.PI * 2) / S.spokes;
    // candidate places: the middle of each gap between spokes, at a few radii in the band
    const radii = [];
    for (let r = lo === 1 ? 3.6 : lo + 1.5; r <= hi - 0.5; r += 2.6) radii.push(r);
    if (!radii.length) radii.push((lo + hi) / 2);
    const spots = [];
    for (const r of radii) for (let g = 0; g < S.spokes; g++) {
      const reach = Math.max(S.lens[g], S.lens[(g + 1) % S.spokes]);
      if (r <= reach + 1) spots.push([g, r]);
    }
    while (need > 0 && slot < 400) {
      const [g, r] = spots[slot % spots.length], round = Math.floor(slot / spots.length);
      slot++;
      const a = ang(g, r) + span / 2 + (round % 2 ? 0.22 : -0.22) * round, gx = Math.cos(a) * r * RING, gy = Math.sin(a) * r * RING;
      const spokeHere = has(`s${g}-${Math.round(r)}`) ? g : (g + 1) % S.spokes;
      const rr = Math.max(lo, Math.min(hi, Math.round(r)));
      if (!has(`s${spokeHere}-${rr}`)) continue;
      if (S.style === 'wheel' || (S.style === 'gem' && round === 0)) {
        if (need >= 4) { const size = Math.min(need, round === 0 ? 6 : 5); wheel(gx, gy, size, lo, hi); need -= size; continue; }
      }
      if (S.style === 'arc' && need >= 2) { const len = Math.min(need, 4); arc(spokeHere, rr, len, lo, hi); need -= len; continue; }
      if (need >= 3) { fork(spokeHere, rr, 3, lo, hi, round % 2 ? 1 : -1); need -= 3; continue; }
      fork(spokeHere, rr, need, lo, hi, round % 2 ? 1 : -1); need = 0;
    }
  }
  // extra flasks on two spokes
  nodes.get(`s${1 % S.spokes}-5`).flask = true;
  nodes.get(`s${(S.spokes - 1)}-9`).flask = true;
  // positions: worked out once by scripts/gen-trees.mjs (relax below) and shipped in treelayout.js
  const saved = LAYOUT[kind];
  if (opts.relax || !saved || Object.keys(saved).length !== nodes.size) relax(nodes, edges);
  else for (const n of nodes.values()) if (saved[n.id]) [n.x, n.y] = saved[n.id];
  // a moved node is priced by where it ended up (staying inside its band, so the band counts hold)
  for (const n of nodes.values()) {
    if (n.pin || n.role === 'socket' || n.role === 'evo' || n.socketRing) continue;
    const [lo, hi] = BANDS.find(([a, b]) => n.ring >= a && n.ring <= b) || [1, 20];
    n.ring = Math.min(hi, Math.max(lo, Math.round(Math.hypot(n.x, n.y) / RING)));
  }
  assign(kind, nodes);
  return { kind, nodes, edges };
}

// Push apart anything that overlaps (and nodes sitting on a link line). Spokes, the start and the socket
// ring stay put; the rest move and are pulled gently back to their ring's radius.
function relax(nodes, edges) {
  const all = [...nodes.values()];
  for (const n of all) n.r0 = Math.hypot(n.x, n.y);
  const E = edges.map(([a, b]) => [nodes.get(a), nodes.get(b)]);
  for (let it = 0; it < 1600; it++) {
    let moved = 0;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const A = all[i], B = all[j];
      if (A.pin && B.pin) continue;
      let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      const want = SIZE(A) + SIZE(B) + GAP;
      if (d >= want) continue;
      if (d < 1e-3) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1; }
      dx += (((i * 7 + j * 13) % 11) - 5) * 0.002; dy += (((i * 11 + j * 5) % 7) - 3) * 0.002;
      const push = (want - d) / d, wa = A.pin ? 0 : B.pin ? 1 : 0.5, wb = 1 - wa;
      A.x -= dx * push * wa; A.y -= dy * push * wa; B.x += dx * push * wb; B.y += dy * push * wb;
      moved++;
    }
    for (const [A, B] of E) {
      const vx = B.x - A.x, vy = B.y - A.y, L2 = vx * vx + vy * vy || 1;
      for (const C of all) {
        if (C === A || C === B || (C.pin && A.pin && B.pin)) continue;
        const t = Math.max(0, Math.min(1, ((C.x - A.x) * vx + (C.y - A.y) * vy) / L2));
        const px = A.x + vx * t, py = A.y + vy * t, dx = C.x - px, dy = C.y - py, d = Math.hypot(dx, dy);
        const want = SIZE(C) + 2.4;
        if (t <= 0.02 || t >= 0.98 || d >= want) continue;
        const k = (want - d) / (d || 1), nx = (d ? dx : -vy) * k, ny = (d ? dy : vx) * k;
        if (!C.pin) { C.x += nx; C.y += ny; }
        else {
          // a fixed node on a line: move the line's free end(s) away instead
          for (const [P, w] of [[A, 1 - t], [B, t]]) if (!P.pin) { P.x -= nx * (0.5 + w); P.y -= ny * (0.5 + w); }
        }
        moved++;
      }
    }
    // a gentle pull back to the node's ring, weaker as the layout settles
    const pull = 0.03 * Math.max(0.15, 1 - it / 500);
    for (const n of all) if (!n.pin && n.r0 > 0) {
      const r = Math.hypot(n.x, n.y), f = 1 + ((n.r0 - r) / r) * pull;
      n.x *= f; n.y *= f;
    }
    if (!moved && it > 20) break;
  }
  // last pass: anything still touching a line jumps to the nearest clear spot
  const segD = (C, A, B) => {
    const vx = B.x - A.x, vy = B.y - A.y, L2 = vx * vx + vy * vy || 1, t = ((C.x - A.x) * vx + (C.y - A.y) * vy) / L2;
    return t <= 0.02 || t >= 0.98 ? 1e9 : Math.hypot(C.x - A.x - vx * t, C.y - A.y - vy * t);
  };
  const clear = (C) => all.every((N) => N === C || Math.hypot(N.x - C.x, N.y - C.y) >= SIZE(N) + SIZE(C) + GAP)
    && E.every(([A, B]) => A === C || B === C || segD(C, A, B) >= SIZE(C) + 1.5)
    && E.every(([A, B]) => (A !== C && B !== C) || all.every((N) => N === A || N === B || segD(N, A, B) >= SIZE(N) + 1));
  for (let pass = 0; pass < 3; pass++) for (const C of all) {
    if (C.pin || clear(C)) continue;
    const x0 = C.x, y0 = C.y;
    let done = false;
    for (let rad = 2; rad <= 16 && !done; rad += 2) for (let k = 0; k < 24 && !done; k++) {
      C.x = x0 + Math.cos((k / 24) * Math.PI * 2) * rad; C.y = y0 + Math.sin((k / 24) * Math.PI * 2) * rad;
      if (clear(C)) done = true;
    }
    if (!done) { C.x = x0; C.y = y0; }
  }
  for (const n of all) delete n.r0;
}

// what each node gives, by ring and role (cycled so neighbours differ)
function assign(kind, nodes) {
  const sp = SPECIAL[kind];
  let ci = 0, mi = 0, oi = 0, pm = 0, po = 0, si = 0;
  const special = (big) => { const [k, a, b] = sp[si++ % sp.length]; return { [k]: big ? b : a }; };
  for (const n of [...nodes.values()].sort((a, b) => a.ring - b.ring || a.id.localeCompare(b.id))) {
    n.big = false;
    if (n.role === 'start') n.give = {};
    else if (n.role === 'evo') { n.give = {}; n.evo = EVOS[kind]; n.big = true; }
    else if (n.role === 'socket') { n.give = {}; n.big = true; }
    else if (n.flask) n.give = { flask: 1 };
    else if (n.ring <= 3) n.give = INNER[ci++ % INNER.length];
    else if (n.role === 'tip') { n.give = special(n.ring >= 8); n.big = n.ring >= 8; }
    else if (n.role === 'branch') n.give = special(false);
    else if (n.role === 'link') n.give = n.ring >= 8 ? PCT_OUTER[po++ % PCT_OUTER.length] : PCT_MID[pm++ % PCT_MID.length];
    else if (n.ring <= 7) {
      // middle rings: flat stat, the character's own, an early percentage
      const r = mi++ % 3;
      n.give = r === 0 ? MID[(mi / 3 | 0) % MID.length] : r === 1 ? special(false) : EARLY_PCT[(mi / 3 | 0) % EARLY_PCT.length];
    } else {
      // outer rings: mostly percentages, some big flat chunks and the character's own
      const r = oi++ % 4;
      n.give = r === 0 ? OUTER[(oi / 4 | 0) % OUTER.length] : r === 3 ? special(false) : PCT_OUTER[po++ % PCT_OUTER.length];
    }
  }
}

export const TREES = { knight: build('knight'), rogue: build('rogue'), mage: build('mage') };

export function nodeCost(n) {
  if (n.role === 'start') return 0;
  if (n.role === 'evo') return 150;
  const c = COST[Math.min(n.ring, COST.length - 1)];
  return n.role === 'socket' ? Math.round(c * 1.5) : c;
}

export function neighbours(tree, id) {
  const out = [];
  for (const [a, b] of tree.edges) { if (a === id) out.push(b); else if (b === id) out.push(a); }
  return out;
}

export const owned = (data, kind) => new Set(['start', ...(data?.tree?.[kind] || [])]);

// buyable: not owned and touching an owned node
export function canTake(tree, have, id) {
  return !have.has(id) && neighbours(tree, id).some((x) => have.has(x));
}

// summed stats for a character (caps applied); `evolved` if the evolution node is owned
export function treeStats(kind, data) {
  const tree = TREES[kind], have = owned(data, kind), s = {};
  for (const id of have) {
    const n = tree?.nodes.get(id);
    if (!n) continue;
    for (const [k, v] of Object.entries(n.give || {})) s[k] = (s[k] || 0) + v;
    if (n.evo) s.evolved = true;
  }
  for (const [k, cap] of Object.entries(CAPS)) if (s[k] > cap) s[k] = cap;
  return s;
}

export function describe(n) {
  if (n.role === 'start') return { name: 'Start', lines: ['Your path begins here.'] };
  if (n.evo) return { name: `Evolution · ${n.evo.name}`, lines: [n.evo.desc] };
  if (n.role === 'socket') return { name: 'Rune Socket', lines: ['An empty socket. Runes found later in the game will fit here.'] };
  const lines = Object.entries(n.give).map(([k, v]) => STATS[k].fmt(v));
  const k = Object.keys(n.give)[0];
  return { name: STATS[k]?.name || 'Node', lines };
}

export const iconKey = (n) => (n.role === 'start' ? 'start' : n.evo ? 'evo' : n.role === 'socket' ? 'socket' : STATS[Object.keys(n.give)[0]]?.icon || 'dmg');

// Earlier tree layouts were priced and placed differently: anything bought on them comes back as the
// gold it cost, once, and the trees start fresh on the current layout (version 3: socket triangle).
// v1: 80 nodes, cheap rings; v2: 120 nodes, sockets on the spokes at ring 10.
const COST_V1 = [0, 8, 10, 12, 15, 18, 22, 26, 31, 37, 44, 52, 62, 74];
const SOCKETS_V1 = { knight: ['s0-10', 's1-10', 's3-10'], rogue: ['s0-10', 's2-10', 's4-10'], mage: ['s0-10', 's2-10', 's3-10'] };
const COST_V4 = [0, 10, 15, 30, 50, 80, 100, 120, 140, 170, 200, 250, 275, 300, 325, 350];
const COST_V23 = [0, ...Array.from({ length: 15 }, (_, i) => { const c = 10 * Math.pow(25, i / 14); return c < 20 ? Math.round(c) : Math.round(c / 5) * 5; })];
function costOld(v, kind, id) {
  if (v === 4) {
    if (id === 's0-6') return 150;
    if (/^r\d+$/.test(id)) return 300;
    if (/^ra\d+$/.test(id)) return 200;
    const f = id.match(/^f\d+-(\d+)-\d+-(\d+)$/), m = id.match(/^[slx]\d+-(\d+)/), b = id.match(/^b\d+-(\d+)-(\d+)/);
    const ring = f ? +f[1] + +f[2] : b ? +b[1] + +b[2] : m ? +m[1] : 0;
    return COST_V4[Math.min(ring, COST_V4.length - 1)] || 0;
  }
  if (id === 's0-6') return 75;
  if (v === 3 && /^r\d+$/.test(id)) return Math.round(COST_V23[10] * 1.5);
  if (v === 3 && /^ra\d+$/.test(id)) return COST_V23[10];
  const m = id.match(/^[slx](\d+)-(\d+)/), b = id.match(/^b\d+-(\d+)-(\d+)/);
  const ring = b ? +b[1] + +b[2] : m ? +m[2] : 0;
  const table = v >= 2 ? COST_V23 : COST_V1;
  const c = table[Math.min(ring, table.length - 1)] || 0;
  return v !== 3 && SOCKETS_V1[kind]?.includes(id) ? Math.round(c * 1.5) : c;
}
export const TREE_VERSION = 5;
export function migrateTree(data) {
  if (!data || data.treeV >= TREE_VERSION) return 0;
  const v = data.treeV === 4 ? 4 : data.treeV === 3 ? 3 : data.treeV === 2 ? 2 : 1;
  let refund = 0;
  for (const [kind, ids] of Object.entries(data.tree || {})) for (const id of ids) refund += costOld(v, kind, id);
  data.tree = {};
  data.gold = (data.gold || 0) + refund;
  data.treeV = TREE_VERSION;
  return refund;
}

// One-time move from the old shop: everything bought back as gold, except the Spellsword unlock.
export function migrateUpgrades(data) {
  if (!data || data.treeMigrated) return 0;
  let refund = 0;
  for (const u of UPGRADES) {
    if (u.key === 'mage') continue;
    const lv = data.upgrades?.[u.key] || 0;
    for (let i = 0; i < lv; i++) refund += upgradeCost(u, i) || 0;
    if (data.upgrades) delete data.upgrades[u.key];
  }
  data.gold = (data.gold || 0) + refund;
  data.tree = data.tree || {};
  data.treeMigrated = true;
  data.treeV = TREE_VERSION; // brand-new trees are already on the current layout
  return refund;
}
