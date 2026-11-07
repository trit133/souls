// Per-character skill trees (replacing the old upgrade shop). Each tree is a web around a start node:
// spokes run outward ring by ring, side branches fork off them and ring links join neighbouring spokes,
// so there is more than one way out. Inner rings give small flat stats, outer rings bigger flat chunks,
// small percentages and the character's own stats. The evolution sits 6 rings out; 3 rune sockets sit at
// ring 10 (empty for now). A node can be bought when it touches one you own; price grows with the ring.
import { UPGRADES, upgradeCost } from './progress.js';

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

const INNER = [{ hp: 4 }, { st: 3 }, { hp: 4 }, { dmg: 1 }];
const MID = [{ hp: 6 }, { st: 4 }];
const EARLY_PCT = [{ hpPct: 2 }, { stPct: 2 }];
const OUTER = [{ hp: 10 }, { st: 6 }, { dmg: 2 }];
const PCT_MID = [{ hpPct: 2 }, { dmgPct: 2 }, { stPct: 2 }, { move: 1 }, { aspd: 1 }];
const PCT_OUTER = [{ hpPct: 3 }, { dmgPct: 3 }, { stPct: 2 }, { move: 1 }, { aspd: 1 }, { potion: 5 }];

export const EVOS = {
  knight: { key: 'evo_knight', name: 'Shield Charge', desc: 'Block + heavy charges behind a spectral shield, knocking enemies back (20 s cooldown); attack right after it for a leaping overhead.' },
  rogue: { key: 'evo_rogue', name: 'Red Riposte', desc: 'Parry window +50 ms, a 5 s parry cooldown, and a parry blinks you behind the enemy for an instant backstab.' },
  mage: { key: 'evo_mage', name: 'Twin Inferno', desc: 'Your fireball splits into two larger fireballs.' },
};

// ---------- shapes ----------
// spokes, max ring, twist per ring (spiral), the first spoke's angle, side branches [ring, length], ring links
// [ring, nodes between], star links (to the spoke two over) [ring]
const SHAPES = {
  knight: { spokes: 4, rings: 15, twist: 0, start: -Math.PI / 2, branches: [[4, 2], [8, 2]], links: [[3, 1], [6, 1], [9, 2], [12, 2], [15, 2]], star: [] },
  rogue: { spokes: 6, rings: 13, twist: 0.12, start: -Math.PI / 2, branches: [[3, 1], [7, 1]], links: [[5, 1], [9, 1], [13, 1]], star: [] },
  mage: { spokes: 5, rings: 14, twist: 0, start: -Math.PI / 2, branches: [[3, 1], [6, 1]], links: [[4, 1], [10, 1], [14, 2]], star: [8, 12] },
};

export const RING = 10; // distance between rings in tree units
// 10 gold at ring 1 up to 250 at ring 15 (x1.26 a ring), rounded to 5 from 20 up
const COST = [0, ...Array.from({ length: 15 }, (_, i) => { const c = 10 * Math.pow(25, i / 14); return c < 20 ? Math.round(c) : Math.round(c / 5) * 5; })];
export const EVO_RING = 6, SOCKET_RING = 10, SOCKET_GAP = 3;

function build(kind) {
  const S = SHAPES[kind], nodes = new Map(), edges = [];
  const add = (n) => { nodes.set(n.id, n); return n; };
  const link = (a, b) => edges.push([a, b]);
  const ang = (i, d) => S.start + (i * Math.PI * 2) / S.spokes + S.twist * d;
  const at = (a, r) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  add({ id: 'start', ring: 0, role: 'start', x: 0, y: 0 });
  // spokes
  for (let i = 0; i < S.spokes; i++) {
    for (let d = 1; d <= S.rings; d++) {
      add({ id: `s${i}-${d}`, ring: d, role: 'main', spoke: i, ...at(ang(i, d), d * RING) });
      link(d === 1 ? 'start' : `s${i}-${d - 1}`, `s${i}-${d}`);
    }
  }
  // side branches, alternating sides spoke to spoke
  for (const [d0, len] of S.branches) for (let i = 0; i < S.spokes; i++) {
    const side = i % 2 ? 1 : -1;
    let prev = `s${i}-${d0}`;
    for (let k = 1; k <= len && d0 + k <= S.rings + 1; k++) {
      const d = d0 + k, id = `b${i}-${d0}-${k}`;
      add({ id, ring: d, role: k === len ? 'tip' : 'branch', spoke: i, ...at(ang(i, d0 + k) + side * 0.24 * k, (d0 + k * 0.95) * RING) });
      link(prev, id); prev = id;
    }
  }
  // ring links between neighbouring spokes
  for (const [d, m] of S.links) for (let i = 0; i < S.spokes; i++) {
    const j = (i + 1) % S.spokes;
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
  // pentagram lines (spellsword): a chord to the spoke two over, through a node at its middle
  for (const d of S.star) for (let i = 0; i < S.spokes; i++) {
    const j = (i + 2) % S.spokes, A = nodes.get(`s${i}-${d}`), B = nodes.get(`s${j}-${d}`);
    const id = `x${i}-${d}`;
    add({ id, ring: d, role: 'link', x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 });
    link(A.id, id); link(id, B.id);
  }
  // the evolution
  nodes.get(`s0-${EVO_RING}`).role = 'evo';
  // the rune sockets: a triangle on their own ring just outside ring 10, joined socket to socket by the same
  // chain of SOCKET_GAP nodes on every tree (so the trip between any two costs the same for every character).
  // The ring turns to keep its nodes off the spokes; each socket also links to the nearest spoke.
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
  // extra flasks on two spokes
  nodes.get(`s${1 % S.spokes}-5`).flask = true;
  nodes.get(`s${(S.spokes - 1)}-9`).flask = true;
  assign(kind, nodes);
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

export const TREES = { knight: build('knight'), rogue: build('rogue'), mage: build('mage') };

export function nodeCost(n) {
  if (n.role === 'start') return 0;
  if (n.role === 'evo') return 75;
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
function costOld(v, kind, id) {
  if (id === 's0-6') return 75;
  const m = id.match(/^[slx](\d+)-(\d+)/), b = id.match(/^b\d+-(\d+)-(\d+)/);
  const ring = b ? +b[1] + +b[2] : m ? +m[2] : 0;
  const table = v === 2 ? COST : COST_V1;
  const c = table[Math.min(ring, table.length - 1)] || 0;
  return SOCKETS_V1[kind]?.includes(id) ? Math.round(c * 1.5) : c;
}
export const TREE_VERSION = 3;
export function migrateTree(data) {
  if (!data || data.treeV >= TREE_VERSION) return 0;
  const v = data.treeV === 2 ? 2 : 1;
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
