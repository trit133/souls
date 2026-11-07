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
export const CAPS = { dr: 15, blockDrain: 50, chip: 12, parryCd: 5, boltCost: 4, fireCost: 20, iframe: 0.08, atkCost: 25, rollCost: 30 };

const INNER = [{ hp: 3 }, { st: 2 }, { hp: 3 }, { dmg: 1 }];
const MID = [{ hp: 5 }, { st: 3 }];
const OUTER = [{ hp: 8 }, { st: 4 }, { dmg: 1 }];
const PCT_MID = [{ hpPct: 2 }, { dmgPct: 2 }, { stPct: 2 }, { move: 1 }, { aspd: 1 }];
const PCT_OUTER = [{ hpPct: 2 }, { dmgPct: 3 }, { stPct: 2 }, { potion: 5 }];

export const EVOS = {
  knight: { key: 'evo_knight', name: 'Shield Charge', desc: 'Block + heavy charges behind a spectral shield, knocking enemies back (20 s cooldown); attack right after it for a leaping overhead.' },
  rogue: { key: 'evo_rogue', name: 'Red Riposte', desc: 'Parry window +50 ms, a 5 s parry cooldown, and a parry blinks you behind the enemy for an instant backstab.' },
  mage: { key: 'evo_mage', name: 'Twin Inferno', desc: 'Your fireball splits into two larger fireballs.' },
};

// ---------- shapes ----------
// spokes, max ring, twist per ring (spiral), the first spoke's angle, side branches [ring, length], ring links
// [ring, nodes between], star links (to the spoke two over) [ring]
const SHAPES = {
  knight: { spokes: 4, rings: 13, twist: 0, start: -Math.PI / 2, branches: [[4, 2], [9, 2]], links: [[3, 1], [7, 1], [11, 1]], star: [] },
  rogue: { spokes: 6, rings: 11, twist: 0.14, start: -Math.PI / 2, branches: [[7, 1]], links: [[5, 1], [9, 1]], star: [] },
  mage: { spokes: 5, rings: 12, twist: 0, start: -Math.PI / 2, branches: [[6, 1]], links: [[4, 1], [12, 1]], star: [8] },
};

export const RING = 10; // distance between rings in tree units
const COST = [0, 8, 10, 12, 15, 18, 22, 26, 31, 37, 44, 52, 62, 74];
export const EVO_RING = 6, SOCKET_RING = 10;

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
  // the evolution and the three rune sockets
  nodes.get(`s0-${EVO_RING}`).role = 'evo';
  const third = S.spokes / 3;
  for (let k = 0; k < 3; k++) nodes.get(`s${Math.round(k * third) % S.spokes}-${SOCKET_RING}`).role = 'socket';
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
    else if (n.ring <= 7) n.give = (mi++ % 2 === 0) ? MID[(mi >> 1) % MID.length] : special(false);
    else {
      const r = oi++ % 3;
      n.give = r === 0 ? OUTER[(oi / 3 | 0) % OUTER.length] : r === 1 ? PCT_OUTER[po++ % PCT_OUTER.length] : special(false);
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
  return refund;
}
