// Per-character skill trees (replacing the old upgrade shop). Each tree is a web around a start node:
// spokes run outward ring by ring, side branches fork off them and ring links join neighbouring spokes,
// so there is more than one way out. Inner rings give small flat stats, outer rings bigger flat chunks,
// small percentages and the character's own stats; damage nodes for each damage type (leaning to the character's
// own: Knight physical, Rogue bleed, Spellsword frost), resistances to the four elements and the Knight's armour
// are spread through it. The evolution sits 6 rings out; 3 rune sockets sit at ring 10 (empty for now). A node
// can be bought when it touches one you own; price grows with the ring.
import { UPGRADES, upgradeCost } from './progress.js';
import { LAYOUT } from './treelayout.js';
import { COST_V5 } from './treecost-v5.js';
import { COST_V6 } from './treecost-v6.js';

// ---------- what nodes can give ----------
// fmt: how a value reads in the tooltip
export const STATS = {
  hp: { name: 'Health', fmt: (v) => `+${v} health`, icon: 'hp' },
  st: { name: 'Stamina', fmt: (v) => `+${v} stamina`, icon: 'st' },
  hpPct: { name: 'Vitality', fmt: (v) => `+${v}% health`, icon: 'hp' },
  stPct: { name: 'Endurance', fmt: (v) => `+${v}% stamina`, icon: 'st' },
  move: { name: 'Swiftness', fmt: (v) => `+${v}% move speed`, icon: 'move' },
  aspd: { name: 'Quickness', fmt: (v) => `+${v}% attack speed`, icon: 'aspd' },
  potion: { name: 'Alchemy', fmt: (v) => `+${v}% potion healing`, icon: 'potion' },
  flask: { name: 'Extra Flask', fmt: (v) => `+${v} flask`, icon: 'flask' },
  // knight
  armor: { name: 'Armour', fmt: (v) => `+${v}% armour (less physical damage taken)`, icon: 'dr' },
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
  // damage by type (status build-up comes from elemental damage)
  physDmg: { name: 'Brutality', fmt: (v) => `+${v} physical damage per hit`, icon: 'dmg' },
  physPct: { name: 'Heft', fmt: (v) => `+${v}% physical damage`, icon: 'dmg' },
  fireDmg: { name: 'Ember Edge', fmt: (v) => `+${v} fire damage per hit`, icon: 'fire' },
  firePct: { name: 'Kindle', fmt: (v) => `+${v}% fire damage`, icon: 'fire' },
  bleedDmg: { name: 'Serrated', fmt: (v) => `+${v} bleed damage per hit`, icon: 'bleed' },
  bleedPct: { name: 'Hemorrhage', fmt: (v) => `+${v}% bleed damage`, icon: 'bleed' },
  poisonDmg: { name: 'Toxin', fmt: (v) => `+${v} poison damage per hit`, icon: 'poison' },
  poisonPct: { name: 'Venom', fmt: (v) => `+${v}% poison damage`, icon: 'poison' },
  frostDmg: { name: 'Chill', fmt: (v) => `+${v} frost damage per hit`, icon: 'frost' },
  frostPct: { name: 'Rime', fmt: (v) => `+${v}% frost damage`, icon: 'frost' },
  // resistances: each 1% cuts that element's build-up on you by 1% and its damage by 0.5%
  fireRes: { name: 'Fireproof', fmt: (v) => `+${v}% fire resistance`, icon: 'resFire', res: true },
  bleedRes: { name: 'Clotting', fmt: (v) => `+${v}% bleed resistance`, icon: 'resBleed', res: true },
  poisonRes: { name: 'Antidote', fmt: (v) => `+${v}% poison resistance`, icon: 'resPoison', res: true },
  frostRes: { name: 'Warmth', fmt: (v) => `+${v}% frost resistance`, icon: 'resFrost', res: true },
};

// the character's own stats: [small, large] values
const SPECIAL = {
  knight: [['blockDrain', 6, 12], ['chip', 1.5, 3], ['stun', 3, 6], ['counter', 6, 12], ['chargeCd', 1, 2], ['chargeKb', 10, 20]],
  rogue: [['parryCd', 0.25, 0.5], ['critDmg', 4, 8], ['iframe', 0.01, 0.02], ['atkCost', 3, 6], ['parryWin', 1, 3], ['rollCost', 4, 8]],
  mage: [['mana', 5, 10], ['manaHit', 0.5, 1], ['boltCost', 0.5, 1], ['fireCost', 2, 4], ['spellDmg', 3, 6], ['fireRadius', 5, 10], ['knifeDmg', 3, 6]],
};
// limits so a full tree stays fair
export const CAPS = { armor: 20, physPct: 25, firePct: 45, bleedPct: 45, poisonPct: 45, frostPct: 45, fireRes: 50, bleedRes: 50, poisonRes: 50, frostRes: 50, blockDrain: 50, chip: 12, parryCd: 5, boltCost: 4, fireCost: 20, iframe: 0.08, atkCost: 25, rollCost: 30,
  parryWin: 10, potion: 40, critDmg: 30, counter: 35, chargeCd: 6, stun: 25, spellDmg: 20, knifeDmg: 20, fireRadius: 30 };

const INNER = [{ hp: 3 }, { st: 2 }];
const MID = [{ hp: 4 }, { st: 2 }];
const EARLY_PCT = [{ hpPct: 1 }, { stPct: 1 }];
const OUTER = [{ hp: 8 }, { st: 4 }];
const PCT_MID = [{ hpPct: 2 }, { stPct: 2 }, { move: 1 }, { aspd: 1 }];
const PCT_OUTER = [{ hpPct: 3 }, { stPct: 2 }, { move: 1 }, { aspd: 1 }, { potion: 5 }];

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
  knight: { spokes: 4, lens: [22, 22, 22, 22], twist: 0, start: -Math.PI / 2, links: [[4, 1], [9, 2], [13, 2], [18, 1], [21, 1]], star: [], style: 'wheel' },
  rogue: { spokes: 6, lens: [22, 17, 22, 17, 22, 17], twist: 0.09, start: -Math.PI / 2, links: [[5, 1], [13, 1]], star: [], style: 'arc' },
  mage: { spokes: 5, lens: [22, 22, 22, 22, 22], twist: 0, start: -Math.PI / 2, links: [[4, 1]], star: [12, 16], style: 'gem' },
};

export const RING = 12; // distance between rings in tree units
// the three price bands, spread over 22 rings: 1-8: 10 -> 80, 9-15: 100 -> 200, 16-22: 250 -> 350
const COST = [0, 10, 14, 20, 28, 38, 50, 65, 80, 100, 115, 130, 150, 165, 180, 200, 250, 265, 285, 300, 320, 335, 350];
export const RINGS = 22;
// every tree has the same number of nodes in each band of rings (about 10 a ring): [first ring, last ring, nodes]
export const BANDS = [[1, 8, 80], [9, 15, 70], [16, 22, 65]];
// the most nodes a tree can hold: 45 in the first section, 70 once that character beats it (Varek),
// 100 in the second section, 130 once that is beaten (the second section is still to come)
export function nodeCap(data, kind) {
  const st = data?.stats || {};
  if (st.section2WinsBy?.[kind]) return 130;
  if (st.section2By?.[kind]) return 100;
  if (st.winsBy?.[kind]) return 70;
  return 45;
}
export const capHint = (cap) => (cap <= 45 ? 'Beat Varek with this character to raise the limit to 70' : cap <= 70 ? 'More nodes open in the next section' : 'More nodes open as you go deeper');
export const EVO_RING = 6, SOCKET_RING = 10, SOCKET_GAP = 3;
function segCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function segDist(c, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1, t = ((c.x - a.x) * vx + (c.y - a.y) * vy) / L2;
  if (t <= 0.02 || t >= 0.98) return 1e9;
  return Math.hypot(c.x - a.x - vx * t, c.y - a.y - vy * t);
}
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
  // ring 10 is a full circle of 12 nodes passing through every spoke's ring-10 node (lines only meet at nodes);
  // the three rune sockets sit 4 steps apart on it, so going socket to socket crosses the same 3 nodes on every
  // tree. Spokes that are sockets themselves stay spokes.
  const RN = 3 * (SOCKET_GAP + 1), per = Array(S.spokes).fill(Math.floor((RN - S.spokes) / S.spokes));
  for (let k = 0; k < (RN - S.spokes) % S.spokes; k++) per[Math.floor((k * S.spokes) / ((RN - S.spokes) % S.spokes))]++;
  const ringIds = [];
  for (let g = 0; g < S.spokes; g++) {
    const sid = `s${g}-${SOCKET_RING}`;
    nodes.get(sid).socketRing = true; ringIds.push(sid);
    let a0 = ang(g, SOCKET_RING), a1 = ang((g + 1) % S.spokes, SOCKET_RING);
    if (a1 <= a0) a1 += Math.PI * 2;
    for (let k = 1; k <= per[g]; k++) {
      const id = `q${g}-${k}`;
      add({ id, ring: SOCKET_RING, role: 'link', socketRing: true, ...at(a0 + ((a1 - a0) * k) / (per[g] + 1), SOCKET_RING * RING) });
      ringIds.push(id);
    }
  }
  ringIds.forEach((id, k) => link(id, ringIds[(k + 1) % RN]));
  // pick the socket places: every 4th node, starting where the most of them land between spokes
  let bestO = 0, bestN = -1;
  for (let o = 0; o <= SOCKET_GAP; o++) {
    const n = [0, 1, 2].filter((k) => !ringIds[o + k * (SOCKET_GAP + 1)].startsWith('s')).length;
    if (n > bestN) { bestN = n; bestO = o; }
  }
  for (let k = 0; k < 3; k++) nodes.get(ringIds[bestO + k * (SOCKET_GAP + 1)]).role = 'socket';

  // ---- fill each band to its share with the character's own features, out in the gaps between spokes ----
  const inBand = (lo, hi) => [...nodes.values()].filter((n) => n.ring >= lo && n.ring <= hi).length;
  let uid = 0;
  // the nearest node a new line from (x, y) can reach without crossing anything
  const nearest = (x, y, lo, hi, not = new Set(), from = null) => {
    const cands = [...nodes.values()].filter((n) => !not.has(n.id) && n.role !== 'socket' && n.ring >= lo && n.ring <= hi)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    for (const n of cands.slice(0, 12)) if (!blocked(from || { x, y }, n, new Set([...not, n.id]))) return n.id;
    return cands[0]?.id ?? null;
  };
  const clampRing = (x, y, lo, hi) => Math.min(hi, Math.max(lo, ringOf(x, y)));
  // would a new line p-q cross an existing line, or pass over a node?
  const blocked = (p, q, skip = new Set()) => {
    for (const [a, b] of edges) {
      if (skip.has(a) || skip.has(b)) continue;
      if (segCross(p, q, nodes.get(a), nodes.get(b))) return true;
    }
    for (const n of nodes.values()) if (!skip.has(n.id) && n !== p && n !== q && segDist(n, p, q) < SIZE(n) + 1.5) return true;
    return false;
  };
  const lineGap = (x, y) => { let d = 1e9; for (const [a, b] of edges) d = Math.min(d, segDist({ x, y }, nodes.get(a), nodes.get(b))); return d; };
  // the clearest point near (x, y): most room from every node already placed
  const freeSpot = (x, y, reach) => {
    const r0 = Math.hypot(x, y), a0 = Math.atan2(y, x);
    let bx = x, by = y, bc = -1;
    for (let dr = -0.9; dr <= 0.91; dr += 0.3) for (let da = -0.36; da <= 0.361; da += 0.06) {
      const r = r0 + dr * RING, cx = Math.cos(a0 + da) * r, cy = Math.sin(a0 + da) * r;
      let c = 1e9;
      for (const n of nodes.values()) c = Math.min(c, Math.hypot(n.x - cx, n.y - cy) - SIZE(n));
      c = Math.min(c, lineGap(cx, cy)) - reach;
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
    link(nearest(n.x, n.y, Math.max(0, lo - 2), hi, new Set([hub, ...ids]), n), inner);
  };
  // can a node go at p? (room from every node and every line)
  const roomAt = (p, extra = []) => [...nodes.values(), ...extra].every((n) => Math.hypot(n.x - p.x, n.y - p.y) >= SIZE(n) + 3.9 + GAP)
    && lineGap(p.x, p.y) >= 3.9 + 2;
  // add a planned group: points, their roles, and its lines ([i, j] into the group, or [nodeId, j] to the web)
  const group = (pts, roles, lines, lo, hi, prefix) => {
    for (let k = 0; k < pts.length; k++) if (!roomAt(pts[k], pts.slice(0, k).map((q) => ({ ...q, role: 'main' })))) return false;
    const P = (e) => (typeof e === 'number' ? pts[e] : nodes.get(e));
    const planned = lines.map(([u, v]) => [P(u), P(v)]);
    for (let i = 0; i < planned.length; i++) {
      const [A, B] = planned[i];
      if (blocked(A, B, new Set([typeof lines[i][0] === 'string' ? lines[i][0] : '', typeof lines[i][1] === 'string' ? lines[i][1] : '']))) return false;
      for (let j = 0; j < i; j++) {
        const [C, D] = planned[j];
        if (A !== C && A !== D && B !== C && B !== D && segCross(A, B, C, D)) return false;
      }
      for (const q of pts) if (q !== A && q !== B && segDist(q, A, B) < 3.9 + 1.5) return false;
    }
    const ids = pts.map((p, k) => { const id = `${prefix}${uid++}`; add({ id, ring: clampRing(p.x, p.y, lo, hi), role: roles[k], x: p.x, y: p.y }); return id; });
    for (const [u, v] of lines) link(typeof u === 'number' ? ids[u] : u, typeof v === 'number' ? ids[v] : v);
    return true;
  };
  // the closest web node a group can hang from
  const anchors = (p, lo, hi) => [...nodes.values()].filter((n) => n.role !== 'socket' && n.ring >= Math.max(1, lo - 2) && n.ring <= hi)
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 6);
  const tryWheel = (c, size, lo, hi) => {
    // a hub ringed by size-1 nodes, every other pair joined; it hangs from the web by its inner-most node
    const m = size - 1, rad = RING * 0.95, base = Math.atan2(c.y, c.x);
    const pts = [c, ...Array.from({ length: m }, (_, k) => ({ x: c.x + Math.cos(base + Math.PI + (k / m) * Math.PI * 2) * rad, y: c.y + Math.sin(base + Math.PI + (k / m) * Math.PI * 2) * rad }))];
    const lines = Array.from({ length: m }, (_, k) => [0, k + 1]);
    for (let k = 1; k < m; k += 2) lines.push([k, k + 1]);
    for (const A of anchors(pts[1], lo, hi)) if (group(pts, ['tip', ...Array(m).fill('main')], [...lines, [A.id, 1]], lo, hi, 'w')) return true;
    return false;
  };
  const tryChain = (c, len, lo, hi, kind) => {
    // a short chain from the nearest web node out through c, bending along the ring (arc) or outward (fork)
    for (const A of anchors(c, lo, hi)) {
      const a0 = Math.atan2(A.y, A.x), r0 = Math.hypot(A.x, A.y), ac = Math.atan2(c.y, c.x), rc = Math.hypot(c.x, c.y);
      const pts = Array.from({ length: len }, (_, k) => {
        const f = (k + 1) / len;
        const a = kind === 'arc' ? a0 + (ac - a0) * f * 1.15 : ac + (ac - a0) * 0.25 * k;
        const r = kind === 'arc' ? rc + 0.12 * RING * k : r0 + (rc - r0) * f + 0.55 * RING * k;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      });
      const lines = [[A.id, 0], ...Array.from({ length: len - 1 }, (_, k) => [k, k + 1])];
      if (group(pts, pts.map((_, k) => (k === len - 1 ? 'tip' : kind === 'arc' ? 'link' : 'branch')), lines, lo, hi, kind === 'arc' ? 'a' : 'k')) return true;
    }
    return false;
  };
  for (const [lo, hi, want] of BANDS) {
    let need = want - inBand(lo, hi);
    const span = (Math.PI * 2) / S.spokes, cands = [];
    for (let r = (lo === 1 ? 2.6 : lo) ; r <= hi + 0.3; r += 0.55) for (const f of [0.5, 0.32, 0.68, 0.18, 0.82]) for (let g = 0; g < S.spokes; g++) {
      if (r > Math.max(S.lens[g], S.lens[(g + 1) % S.spokes]) + 0.5) continue;
      cands.push({ r, f, g, ...at(ang(g, r) + span * f, r * RING) });
    }
    // spread: alternate gaps and radii rather than filling one gap first
    cands.sort((a, b) => (a.f === 0.5 ? 0 : 1) - (b.f === 0.5 ? 0 : 1) || a.g - b.g || a.r - b.r);
    const order = []; const byG = Array.from({ length: S.spokes }, (_, g) => cands.filter((c) => c.g === g));
    for (let k = 0; order.length < cands.length; k++) for (const list of byG) if (list[k]) order.push(list[k]);
    for (const c of order) {
      if (need <= 0) break;
      let ok = false;
      if (S.style !== 'arc' && need >= 4) for (const size of [6, 5, 4]) if (size <= need && tryWheel(c, size, lo, hi)) { need -= size; ok = true; break; }
      if (ok) continue;
      if (S.style === 'arc') for (const len of [4, 3, 2]) if (len <= need && tryChain(c, len, lo, hi, 'arc')) { need -= len; ok = true; break; }
      if (ok) continue;
      for (const len of [3, 2, 1]) if (len <= need && tryChain(c, len, lo, hi, 'fork')) { need -= len; break; }
    }
  }
  // extra flasks on two spokes
  nodes.get(`s${1 % S.spokes}-5`).flask = true;
  nodes.get(`s${(S.spokes - 1)}-9`).flask = true;
  // positions: generated once by scripts/gen-trees.mjs and shipped in treelayout.js
  const saved = LAYOUT[kind];
  // (nodes are placed clear of each other and of every line as the tree is built; the saved copy only speeds up loading)
  if (!opts.relax && saved && Object.keys(saved).length === nodes.size) for (const n of nodes.values()) if (saved[n.id]) [n.x, n.y] = saved[n.id];
  // a moved node is priced by where it ended up (staying inside its band, so the band counts hold)
  for (const n of nodes.values()) {
    if (n.pin || n.role === 'socket' || n.role === 'evo' || n.socketRing) continue;
    const [lo, hi] = BANDS.find(([a, b]) => n.ring >= a && n.ring <= b) || [1, RINGS];
    n.ring = Math.min(hi, Math.max(lo, Math.round(Math.hypot(n.x, n.y) / RING)));
  }
  assign(kind, nodes);
  typedNodes(kind, nodes);
  return { kind, nodes, edges };
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

// Damage, resistance and armour nodes take over regular stat nodes, spread round the web. Each sits in a ring
// range by tier: small values near the centre, the biggest at the edge. [stat, value, tier]
const TIER_RINGS = { 1: [2, 5], 2: [6, 8], 3: [9, 12], 4: [13, 16], 5: [17, 22] };
export const EMPHASIS = { knight: 'phys', rogue: 'bleed', mage: 'frost' };
function typedSet(kind) {
  const own = EMPHASIS[kind], out = [];
  // the character's own type: flat damage 1,1,1,1,1,2 and +5/8/12% (physical) or +10/15/20% (an element)
  for (const [v, t] of [[1, 1], [1, 1], [1, 2], [1, 3], [1, 4], [2, 5]]) out.push([own + 'Dmg', v, t]);
  for (const [v, t] of own === 'phys' ? [[5, 2], [8, 4], [12, 5]] : [[10, 2], [15, 4], [20, 5]]) out.push([own + 'Pct', v, t]);
  // every other element: +1 and +2 flat, +10%
  for (const k of ['bleed', 'fire', 'frost', 'poison']) if (k !== own) out.push([k + 'Dmg', 1, 1], [k + 'Dmg', 2, 3], [k + 'Pct', 10, 4]);
  // a little physical for the elemental characters
  if (own !== 'phys') out.push(['physDmg', 1, 1], ['physDmg', 1, 2]);
  // resistances: 6/8/10/12/14 = 50% for each element
  for (const k of ['fire', 'bleed', 'poison', 'frost']) [6, 8, 10, 12, 14].forEach((v, i) => out.push([k + 'Res', v, i + 1]));
  // Knight armour: up to 20%
  if (kind === 'knight') [1, 1, 1.5, 1.5, 2, 2, 2.5, 2.5, 3, 3].forEach((v, i) => out.push(['armor', v, 1 + (i >> 1)]));
  return out;
}
function typedNodes(kind, nodes) {
  const placed = [];
  const free = (n) => !n.flask && !n.evo && n.role !== 'evo' && n.role !== 'socket' && n.role !== 'start' && !n.socketRing && !n.typed;
  for (const [stat, v, t] of typedSet(kind)) {
    const [lo, hi] = TIER_RINGS[t];
    let cands = [...nodes.values()].filter((n) => free(n) && n.ring >= lo && n.ring <= hi);
    if (!cands.length) cands = [...nodes.values()].filter((n) => free(n) && n.ring >= lo - 2 && n.ring <= hi + 2);
    // farthest from the typed nodes already placed, so they spread round the web
    let best = cands[0], bd = -1;
    for (const n of cands) {
      const d = placed.length ? Math.min(...placed.map((p) => Math.hypot(p.x - n.x, p.y - n.y))) : Math.hypot(n.x, n.y);
      if (d > bd) { bd = d; best = n; }
    }
    best.give = { [stat]: v }; best.typed = true; best.big = t >= 4;
    placed.push(best);
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
export function treeStats(kind, data) { return sumStats(kind, owned(data, kind)); }
// the same for any set of owned node ids (the tree screen previews a node before you buy it)
export function sumStats(kind, have) {
  const tree = TREES[kind], s = {};
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
  if (v === 6) return COST_V6[kind]?.[id] || 0;
  if (v === 5) return COST_V5[kind]?.[id] || 0;
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
export const TREE_VERSION = 7;
export function migrateTree(data) {
  if (!data || data.treeV >= TREE_VERSION) return 0;
  const v = data.treeV >= 2 && data.treeV <= 6 ? data.treeV : 1;
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
