// Per-character skill trees (replacing the old upgrade shop). Each tree is a web around a start node:
// spokes run outward ring by ring, side branches fork off them and ring links join neighbouring spokes,
// so there is more than one way out. Inner rings give small flat stats, outer rings bigger flat chunks,
// small percentages and the character's own stats; damage nodes for each damage type (leaning to the character's
// own: Knight physical, Rogue bleed, Spellsword frost), resistances to the four elements and the Knight's armour
// are spread through it. The evolution sits 6 rings out; 3 rune sockets sit at ring 10 (empty for now). A node
// can be bought when it touches one you own; price grows with the ring.
import { NUM } from './scale.js';
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
  ripDmg: { name: 'Cruelty', fmt: (v) => `+${v}% riposte and finisher damage`, icon: 'critDmg' },
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
  // critical hits (any class): a crit does +50% damage plus the crit damage bonus
  critChance: { name: 'Precision', fmt: (v) => `+${v}% critical hit chance`, icon: 'critChance' },
  critPower: { name: 'Ferocity', fmt: (v) => `+${v}% critical damage`, icon: 'critPower' },
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
  // resistances: each 1% cuts that element's damage and its build-up on you by 1% (75%: a quarter gets through)
  fireRes: { name: 'Fireproof', fmt: (v) => `+${v}% fire resistance`, icon: 'resFire', res: true },
  bleedRes: { name: 'Clotting', fmt: (v) => `+${v}% bleed resistance`, icon: 'resBleed', res: true },
  poisonRes: { name: 'Antidote', fmt: (v) => `+${v}% poison resistance`, icon: 'resPoison', res: true },
  frostRes: { name: 'Warmth', fmt: (v) => `+${v}% frost resistance`, icon: 'resFrost', res: true },
  // the Knight's notables (mechanics) and keystones
  counterSt: { name: 'Riposte Master', fmt: (v) => `Guard counters give back ${v} stamina`, icon: 'counter' },
  execute: { name: "Executioner's Mark", fmt: (v) => `+${v}% damage to enemies under 30% health`, icon: 'dmg' },
  lowHpDmg: { name: 'Last Stand', fmt: (v) => `+${v}% damage while you're under half health`, icon: 'dmg' },
  finisherPct: { name: 'Crowning Blow', fmt: (v) => `+${v}% damage with combo finishers`, icon: 'dmg' },
  burnDmg: { name: 'Pyre', fmt: (v) => `+${v}% damage to burning enemies`, icon: 'fire' },
  killHeal: { name: 'Second Wind', fmt: (v) => `Heal ${v}% of your health on each kill`, icon: 'hp' },
  immovable: { name: 'Immovable', fmt: () => 'You can\'t be staggered or knocked down; rolls cost 50% more stamina', icon: 'dr' },
  headsman: { name: 'Headsman', fmt: () => 'Heavy attacks and finishers +40% damage; light attacks −20%', icon: 'dmg' },
  emberOath: { name: 'Ember Oath', fmt: () => 'Half your physical damage becomes fire; you take 15% more damage', icon: 'fire' },
  stalwart: { name: 'Stalwart Vow', fmt: () => '+30% max health; −15% damage dealt', icon: 'hp' },
  // the Rogue's and Spellsword's
  bleedTgt: { name: 'Exsanguinate', fmt: (v) => `+${v}% damage to enemies whose bleed is half built or more`, icon: 'bleed' },
  poisonedDmg: { name: 'Wither', fmt: (v) => `+${v}% damage to poisoned enemies`, icon: 'poison' },
  frozenDmg: { name: 'Shatterpoint', fmt: (v) => `+${v}% damage to enemies slowed by frost`, icon: 'frost' },
  fleeting: { name: 'Fleeting', fmt: () => 'Rolls cost half the stamina; you take 15% more damage', icon: 'rollCost' },
  glassFang: { name: 'Glass Fang', fmt: () => 'Ripostes and finishers +40% damage; −25% max health', icon: 'critDmg' },
  plague: { name: 'Plaguelord', fmt: () => 'Poison damage +50%; physical damage −20%', icon: 'poison' },
  bladeDance: { name: 'Blade Dance', fmt: () => '+25% attack speed; −20% damage per hit', icon: 'aspd' },
  pyromania: { name: 'Pyromania', fmt: () => 'Fire damage +40%; you take 15% more from fire', icon: 'fire' },
  rimeHeart: { name: 'Rime Heart', fmt: () => 'Frost damage +40%; fire damage halved', icon: 'frost' },
  spellblade: { name: 'Spellblade', fmt: () => 'Spell damage +30%; knife damage −20%', icon: 'spellDmg' },
};

// the character's own stats: [small, large] values
const SPECIAL = {
  knight: [['blockDrain', 6, 12], ['chip', 1.5, 3], ['stun', 3, 6], ['counter', 6, 12], ['chargeCd', 1, 2], ['chargeKb', 10, 20]],
  rogue: [['parryCd', 0.25, 0.5], ['ripDmg', 4, 8], ['iframe', 0.01, 0.02], ['atkCost', 3, 6], ['parryWin', 1, 3], ['rollCost', 4, 8]],
  mage: [['mana', 5, 10], ['manaHit', 0.5, 1], ['boltCost', 0.5, 1], ['fireCost', 2, 4], ['spellDmg', 3, 6], ['fireRadius', 5, 10], ['knifeDmg', 3, 6]],
};
// limits so a full tree stays fair
export const CAPS = { bleedTgt: 60, poisonedDmg: 60, frozenDmg: 60, counterSt: 30, execute: 60, lowHpDmg: 60, finisherPct: 60, burnDmg: 60, killHeal: 6, armor: 60, physPct: 50, firePct: 125, bleedPct: 125, poisonPct: 125, frostPct: 125, fireRes: 75, bleedRes: 75, poisonRes: 75, frostRes: 75, blockDrain: 50, chip: 12, parryCd: 5, boltCost: 4, fireCost: 20, iframe: 0.08, atkCost: 25, rollCost: 30,
  parryWin: 4, potion: 40, ripDmg: 30, critChance: 75, critPower: 100, counter: 35, chargeCd: 6, stun: 25, spellDmg: 20, knifeDmg: 20, fireRadius: 30 };

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
  // (the Knight's four straight lines keep only rings 1-10 and the rings where things join them further out: the rest
  // of his nodes sit in the quarters' clusters; rings 7-8 stay so no shortcut brings the evolutions under 6 links apart)
  knight: { spokes: 4, lens: [22, 22, 22, 22], twist: 0, start: -Math.PI / 2, links: [[4, 1], [9, 2], [13, 2], [18, 1], [21, 1]], star: [], style: 'wheel', keep: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 18, 21, 22] },
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
  for (let i = 0; i < S.spokes; i++) for (let d = 1, prev = 'start'; d <= S.lens[i]; d++) {
    if (S.keep && !S.keep.includes(d)) continue;
    add({ id: `s${i}-${d}`, ring: d, role: 'main', spoke: i, pin: true, ...at(ang(i, d), d * RING) });
    link(prev, `s${i}-${d}`); prev = `s${i}-${d}`;
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
  if (PLANS[kind]) { regionTree(kind, nodes, edges); critNodes(kind, nodes, edges); elemNodes(kind, nodes, edges); } // laid out in themed regions (below)
  else { assign(kind, nodes); typedNodes(kind, nodes); }
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

// ---------- the Knight: four regions, one down each arm of the cross ----------
// up: BULWARK (block, armour, guard counter, Shield Charge, where the evolution sits); right: EXECUTIONER (physical
// damage, stun, heavy blows, combo finishers); down: CRUSADER (fire, charge, speed); left: WARDEN (health, stamina,
// potions, resistances). The middle three rings are a hub of health, stamina and a little of every resistance.
// Small nodes cycle through their region's stats; six notables per region (bundles and mechanics) sit at the ends of
// branches; a keystone (a big trade-off) caps each arm. Values are at the designed size (scale.js scales flat ones).
export const REGIONS = { knight: ['Bulwark', 'Executioner', 'Crusader', 'Warden'], rogue: ['Shadow', 'Bloodletter', 'Venom', 'Duelist'], mage: ['Pyromancer', 'Frostblade', 'Arcanist', 'Spellward'] };
export const KNIGHT_REGIONS = REGIONS.knight;
const KNIGHT = {
  // the centre (rings 1-4): basics, a little utility and a little of his damage (armour nodes are added after)
  hub: [{ hp: 5 }, { st: 3 }, { hp: 5 }, { physDmg: 1 }, { st: 3 }, { potion: 3 }, { hp: 5 }, { aspd: 1 }],
  // each quarter's own stats only (armour and resistances are placed after)
  small: [
    [{ blockDrain: 5 }, { chip: 1 }, { counter: 5 }, { chargeCd: 0.5 }, { blockDrain: 5 }, { hpPct: 2 }, { chip: 1 }, { st: 3 }],
    [{ physDmg: 2 }, { physPct: 3 }, { stun: 3 }, { aspd: 2 }, { physDmg: 2 }, { ripDmg: 4 }, { physPct: 3 }, { stun: 3 }],
    [{ fireDmg: 2 }, { firePct: 8 }, { chargeKb: 10 }, { move: 2 }, { fireDmg: 2 }, { firePct: 8 }, { aspd: 2 }, { chargeCd: 0.5 }],
    [{ hp: 8 }, { hpPct: 3 }, { st: 4 }, { stPct: 3 }, { potion: 4 }, { hp: 8 }],
  ],
  defensive: 3, // the quarter most resistances go to (Warden)
  notables: [
    [['Iron Wall', { blockDrain: 15, chip: 3 }], ['Riposte Master', { counter: 15, counterSt: 15 }], ['Unbroken', { armor: 3, hp: 10 }],
     ['Charging Bull', { chargeCd: 2, chargeKb: 25 }], ['Guarded Heart', { blockDrain: 10, hpPct: 5 }], ['Bastion', { armor: 3, chip: 2 }]],
    [["Executioner's Mark", { execute: 25 }], ['Brutal Edge', { physDmg: 4, physPct: 8 }], ['Crushing Weight', { stun: 10, physPct: 5 }],
     ['Crowning Blow', { finisherPct: 25 }], ['Relentless', { aspd: 6, physDmg: 2 }], ['Last Stand', { lowHpDmg: 25 }]],
    [['Pyre', { burnDmg: 20 }], ['Kindled Steel', { fireDmg: 4, firePct: 25 }], ['Holy Charge', { chargeCd: 2, fireDmg: 2 }],
     ['Flame Warden', { fireRes: 10, firePct: 15 }], ['Zeal', { move: 5, aspd: 4 }], ['Smoulder', { firePct: 30 }]],
    [['Second Wind', { killHeal: 3 }], ['Thick Hide', { hp: 15, hpPct: 6 }], ['Endurance', { st: 8, stPct: 8 }],
     ['Wardstone', { fireRes: 8, bleedRes: 8, poisonRes: 8, frostRes: 8 }], ['Field Medic', { potion: 15, hp: 6 }], ['Deep Breath', { stPct: 10, potion: 6 }]],
  ],
  keystones: [['Immovable', { immovable: 1 }], ['Headsman', { headsman: 1 }], ['Ember Oath', { emberOath: 1 }], ['Stalwart Vow', { stalwart: 1 }]],
  // one evolution per region: Shield Charge (Bulwark) is in; the other three evolve abilities still to come, so they
  // show with their notes and can't be taken yet
  soon: [null,
    { name: 'Guillotine', desc: 'Evolves a heavy execution strike still to come: a leaping downward blow that cleaves anything under 30% health clean through.' },
    { name: 'Sun Brand', desc: 'Evolves a holy brand still to come: the brand bursts into a ring of fire on the ground that burns enemies and heals you while you stand in it.' },
    { name: 'Rallying Cry', desc: 'Evolves a war cry still to come: a shout that restores stamina and grants armour to you and nearby allies, and staggers enemies close by.' }],
};
// ---------- the Rogue: up SHADOW (rolls, i-frames, parry cooldown; Red Riposte), right BLOODLETTER (bleed, crits),
// down VENOM (poison), left DUELIST (attack speed, stamina, combos). The parry window only grows a little: two small
// +2 ms nodes in Shadow, capped at +4 ms ----------
const ROGUE = {
  hub: [{ hp: 4 }, { st: 3 }, { hp: 4 }, { bleedDmg: 1 }, { st: 3 }, { rollCost: 3 }, { hp: 4 }, { atkCost: 2 }],
  small: [
    [{ rollCost: 4 }, { iframe: 0.01 }, { parryCd: 0.25 }, { move: 2 }, { st: 3 }, { atkCost: 3 }, { rollCost: 4 }, { move: 2 }],
    [{ bleedDmg: 2 }, { bleedPct: 8 }, { ripDmg: 4 }, { physDmg: 1.5 }, { bleedDmg: 2 }, { aspd: 2 }, { bleedPct: 8 }, { ripDmg: 4 }],
    [{ poisonDmg: 2 }, { poisonPct: 8 }, { poisonDmg: 2 }, { potion: 4 }, { poisonPct: 8 }, { hp: 5 }],
    [{ aspd: 2 }, { atkCost: 3 }, { stPct: 3 }, { st: 3 }, { physPct: 3 }, { ripDmg: 3 }, { aspd: 2 }, { stPct: 3 }],
  ],
  defensive: 2, // Venom
  notables: [
    [['Ghost Step', { iframe: 0.02, rollCost: 10 }], ['Quick Hands', { parryCd: 1 }], ['Fade', { move: 6, rollCost: 6 }],
     ['Slip Away', { stPct: 8, rollCost: 8 }], ['Riposte Artist', { ripDmg: 10, parryCd: 0.5 }], ['Untouchable', { iframe: 0.02, move: 4 }]],
    [['Hemorrhage', { bleedPct: 25, bleedDmg: 3 }], ['Exsanguinate', { bleedTgt: 20 }], ['Cruel Edge', { ripDmg: 12 }],
     ["Butcher's Rhythm", { aspd: 5, bleedPct: 10 }], ["Executioner's Kiss", { execute: 20 }], ['Red Harvest', { killHeal: 2, bleedDmg: 2 }]],
    [['Virulence', { poisonPct: 30 }], ['Toxic Edge', { poisonDmg: 4, poisonPct: 10 }], ['Wither', { poisonedDmg: 20 }],
     ['Antitoxin', { poisonRes: 15, bleedRes: 8 }], ['Lingering Death', { poisonPct: 20, potion: 8 }], ['Venom Blood', { poisonRes: 10, hp: 10 }]],
    [['Flurry', { aspd: 8 }], ['Finishing Flourish', { finisherPct: 25 }], ['Light Feet', { atkCost: 10, st: 6 }],
     ["Duelist's Focus", { ripDmg: 8, physPct: 6 }], ['Relentless Assault', { aspd: 5, physDmg: 2 }], ['Second Breath', { stPct: 10, atkCost: 5 }]],
  ],
  keystones: [['Fleeting', { fleeting: 1 }], ['Glass Fang', { glassFang: 1 }], ['Plaguelord', { plague: 1 }], ['Blade Dance', { bladeDance: 1 }]],
  soon: [null,
    { name: 'Crimson Fan', desc: 'Evolves a thrown-knife volley still to come: a fan of blades that opens deep bleeding wounds on everything it passes through.' },
    { name: 'Plague Cloud', desc: 'Evolves a poison flask still to come: it bursts into a lingering cloud that poisons and slows anything inside it.' },
    { name: 'Blade Waltz', desc: 'Evolves a spinning dash still to come: a whirl of cuts through a crowd that leaves you briefly untouchable.' }],
  extra: [{ parryWin: 2 }, { parryWin: 2 }], // the only parry window in the tree, in Shadow
};

// ---------- the Spellsword: up PYROMANCER (fire, fireball; Twin Inferno), right FROSTBLADE (frost, knife), down
// ARCANIST (mana, spells), left SPELLWARD (health, resistances, potions) ----------
const MAGE = {
  hub: [{ hp: 4 }, { st: 3 }, { mana: 4 }, { hp: 4 }, { st: 3 }, { frostDmg: 1 }, { mana: 4 }, { spellDmg: 2 }],
  small: [
    [{ fireDmg: 2 }, { firePct: 8 }, { fireRadius: 5 }, { fireCost: 2 }, { spellDmg: 3 }, { fireDmg: 2 }, { firePct: 8 }, { fireRadius: 5 }],
    [{ frostDmg: 2 }, { frostPct: 8 }, { knifeDmg: 3 }, { aspd: 2 }, { frostDmg: 2 }, { frostPct: 8 }, { knifeDmg: 3 }],
    [{ mana: 5 }, { manaHit: 0.5 }, { boltCost: 0.5 }, { spellDmg: 3 }, { mana: 5 }, { spellDmg: 3 }, { stPct: 3 }],
    [{ hp: 8 }, { hpPct: 3 }, { st: 4 }, { potion: 4 }, { hp: 8 }, { stPct: 3 }],
  ],
  defensive: 3, // Spellward
  notables: [
    [['Inferno', { firePct: 30 }], ['Wide Blast', { fireRadius: 15, fireCost: 4 }], ['Kindling', { fireCost: 6, fireDmg: 2 }],
     ['Pyre', { burnDmg: 20 }], ['Fire Soul', { firePct: 15, fireRes: 10 }], ['Searing', { spellDmg: 10, fireDmg: 3 }]],
    [['Rime Edge', { frostPct: 30 }], ['Frozen Steel', { frostDmg: 4, knifeDmg: 8 }], ['Shatterpoint', { frozenDmg: 20 }],
     ['Cold Steel', { knifeDmg: 10, aspd: 4 }], ["Winter's Grip", { frostPct: 15, frostRes: 10 }], ['Glacial', { frostDmg: 3, physDmg: 2 }]],
    [['Deep Well', { mana: 20 }], ['Siphon', { manaHit: 2 }], ['Thrift', { boltCost: 2, fireCost: 4 }],
     ['Arcane Power', { spellDmg: 15 }], ['Desperation', { lowHpDmg: 20 }], ['Focused Mind', { spellDmg: 8, mana: 10 }]],
    [['Second Wind', { killHeal: 3 }], ['Thick Hide', { hp: 15, hpPct: 6 }], ['Wardstone', { fireRes: 8, bleedRes: 8, poisonRes: 8, frostRes: 8 }],
     ['Field Medic', { potion: 15, hp: 6 }], ['Endurance', { st: 8, stPct: 8 }], ['Iron Will', { hpPct: 5, stPct: 5 }]],
  ],
  keystones: [['Pyromania', { pyromania: 1 }], ['Rime Heart', { rimeHeart: 1 }], ['Spellblade', { spellblade: 1 }], ['Stalwart Vow', { stalwart: 1 }]],
  soon: [null,
    { name: 'Glacier Prison', desc: 'Evolves a frost nova still to come: a ring of ice that freezes enemies in place and shatters for frost damage.' },
    { name: 'Arcane Echo', desc: 'Evolves an arcane missile still to come: each missile repeats itself a moment later at half strength.' },
    { name: 'Runic Aegis', desc: 'Evolves a rune ward still to come: a ward that soaks damage and bursts outward when it breaks.' }],
};
const PLANS = { knight: KNIGHT, rogue: ROGUE, mage: MAGE };

// a node on one of the Knight's straight lines (kept to basic nodes)
const onLine = (kind, n) => kind === 'knight' && n.spoke !== undefined && n.role === 'main';
// a small node's value by how far out it sits
const ringMul = (ring) => (ring <= 4 ? 1 : ring <= 8 ? 1.25 : ring <= 13 ? 1.75 : ring <= 18 ? 2.5 : 3);
const scaleGive = (give, m) => Object.fromEntries(Object.entries(give).map(([k, v]) => [k, v * m >= 2 ? Math.round(v * m) : Math.round(v * m * 100) / 100]));
function regionTree(kind, nodes, edges) {
  const P = PLANS[kind], NAMES = REGIONS[kind];
  const region = (n) => ((Math.round((Math.atan2(n.y, n.x) + Math.PI / 2) / (Math.PI / 2)) % 4) + 4) % 4;
  const all = [...nodes.values()].sort((a, b) => a.ring - b.ring || a.id.localeCompare(b.id));
  const plain = (n) => n.role !== 'start' && n.role !== 'evo' && n.role !== 'socket' && !n.flask && !n.socketRing;
  const line = (n) => onLine(kind, n); // (the Knight's straight lines: basic nodes only)
  const armOff = (n, g) => Math.abs(Math.atan2(Math.sin(Math.atan2(n.y, n.x) + Math.PI / 2 - g * Math.PI / 2), Math.cos(Math.atan2(n.y, n.x) + Math.PI / 2 - g * Math.PI / 2))); // (how far round from its arm)
  for (const n of all) { n.big = false; n.give = {}; n.notable = null; n.keystone = false; n.region = n.role === 'start' ? null : NAMES[region(n)]; }
  for (const n of all) {
    if (n.role === 'evo') { n.evo = EVOS[kind]; n.big = true; }
    else if (n.role === 'socket') n.big = true;
    else if (n.flask) n.give = { flask: 1 };
  }
  // keystones: the last node of each arm
  for (let g = 0; g < 4; g++) {
    const arm = all.filter((n) => plain(n) && !line(n) && region(n) === g && (kind !== 'knight' || armOff(n, g) < 0.6)).sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0];
    const [name, give] = P.keystones[g];
    Object.assign(arm, { give: { ...give }, notable: name, keystone: true, big: true });
  }
  // notables: branch ends spread along each arm (rings 4 and out)
  for (let g = 0; g < 4; g++) {
    let ends = all.filter((n) => plain(n) && !n.keystone && region(n) === g && n.ring >= 4 && (n.role === 'tip' || n.role === 'branch'));
    const pick = [], want = P.notables[g].length;
    // too few branch ends in this region: use other nodes along it too
    if (ends.length < want) ends = [...ends, ...all.filter((n) => plain(n) && !line(n) && !n.keystone && region(n) === g && n.ring >= 4 && !ends.includes(n))].sort((a, c) => a.ring - c.ring || a.id.localeCompare(c.id));
    for (let i = 0; i < want && ends.length; i++) {
      let k = Math.min(ends.length - 1, Math.round((i + 0.5) * ends.length / want));
      if (pick.includes(ends[k])) k = [...ends.keys()].slice(k).concat([...ends.keys()].slice(0, k)).find((j) => !pick.includes(ends[j])) ?? k; // (two landing on one: the next free)
      pick.push(ends[k]);
    }
    [...new Set(pick)].forEach((n, i) => { const [name, give] = P.notables[g][i]; Object.assign(n, { give: { ...give }, notable: name, big: true }); });
  }
  // a tree's one-off small nodes (the Rogue's two parry window nodes), on its first region's arm
  for (const extra of P.extra || []) {
    const n = all.find((x) => plain(x) && !x.notable && !x.keystone && !x.soon && !Object.keys(x.give).length && region(x) === 0 && x.ring >= 5 && !x.extra);
    if (n) Object.assign(n, { give: { ...extra }, extra: true });
  }
  // the hub, then each region's small nodes
  // values grow with distance: ×1 in the centre (rings 1-4), ×1.25 (5-8), ×1.75 (9-13), ×2.5 (14-18), ×3 at the edge
  let hi = 0; const si = [0, 0, 0, 0];
  for (const n of all) {
    if (!plain(n) || n.notable || n.soon || Object.keys(n.give).length) continue;
    if (n.ring <= 4) n.give = { ...P.hub[hi++ % P.hub.length] };
    else if (line(n)) n.give = scaleGive(P.hub[hi++ % 2], ringMul(n.ring)); // health and stamina along the lines
    else { const g = region(n), pool = P.small[g]; n.give = scaleGive(pool[si[g]++ % pool.length], ringMul(n.ring)); }
    n.typed = Object.keys(n.give).some((k) => /Dmg$|Pct$|Res$|armor/.test(k) && k !== 'hpPct' && k !== 'stPct');
  }
  // the evolutions still to come, one in each other region, placed last (so moving one never changes another node):
  // exactly 6 links out from the start like the first evolution, at least 6 links from every other evolution, on a
  // node whose loss cuts nothing off (they can't be taken yet). The region's main arm first, then anything else.
  const adj = new Map(); for (const [a, c] of edges) { (adj.get(a) || adj.set(a, []).get(a)).push(c); (adj.get(c) || adj.set(c, []).get(c)).push(a); }
  const hops = (from, skip = new Set()) => { const d = new Map([[from, 0]]), q = [from]; while (q.length) { const c = q.shift(); for (const x of adj.get(c) || []) if (!d.has(x) && !skip.has(x)) { d.set(x, d.get(c) + 1); q.push(x); } } return d; };
  const fromStart = hops('start');
  const ang = (n) => Math.atan2(n.y, n.x), aim = (g) => -Math.PI / 2 + g * Math.PI / 2;
  const off = (n, g) => Math.abs(Math.atan2(Math.sin(ang(n) - aim(g)), Math.cos(ang(n) - aim(g))));
  // the regions in each order until all three land exactly 6 out (otherwise the order that gets nearest)
  let best = null;
  // (off the Knight's lines first; on them only if that's the only way to keep all three exactly 6 out)
  for (const lineLast of [true, false]) for (const order of [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]) {
    if (best?.score === 0) break;
    const evoHops = all.filter((n) => n.role === 'evo').map((n) => hops(n.id)), blocked = new Set(), picks = [];
    for (const g of order) {
      const cutsOff = (n) => { const skip = new Set([...blocked, n.id]); return hops('start', skip).size < nodes.size - skip.size; };
      const fits = (n, want) => plain(n) && !n.notable && !n.keystone && !n.extra && region(n) === g && fromStart.get(n.id) === want && evoHops.every((h) => h.get(n.id) >= 6) && !cutsOff(n);
      let pick = null;
      for (let want = 6; want <= 9 && !pick; want++) pick = all.filter((n) => fits(n, want)).sort((a, c) => (lineLast ? (line(a) ? 1 : 0) - (line(c) ? 1 : 0) : 0) || (a.role === 'main' ? 0 : 1) - (c.role === 'main' ? 0 : 1) || off(a, g) - off(c, g))[0];
      if (pick) { picks.push([g, pick]); evoHops.push(hops(pick.id)); blocked.add(pick.id); }
    }
    const score = picks.reduce((a, [, n]) => a + fromStart.get(n.id) - 6, 0) + (3 - picks.length) * 100;
    if (!best || score < best.score) best = { score, picks };
    if (score === 0) break;
  }
  // the greedy pass can miss a set that works: try every combination of exactly-6 nodes (off the Knight's lines first)
  if (best.score > 0) {
    const ev0 = all.filter((n) => n.role === 'evo').map((n) => hops(n.id));
    const ok6 = (n, g) => plain(n) && !n.notable && !n.keystone && !n.extra && region(n) === g && fromStart.get(n.id) === 6 && ev0.every((h) => h.get(n.id) >= 6);
    const cand = [1, 2, 3].map((g) => all.filter((n) => ok6(n, g)).sort((a, c) => (line(a) ? 1 : 0) - (line(c) ? 1 : 0) || off(a, g) - off(c, g)));
    const H = new Map(cand.flat().map((n) => [n.id, hops(n.id)]));
    const cuts = (set) => { const skip = new Set(set.map((n) => n.id)); return hops('start', skip).size < nodes.size - skip.size; };
    search: for (const a of cand[0]) for (const b of cand[1]) {
      if (H.get(a.id).get(b.id) < 6) continue;
      for (const c of cand[2]) if (H.get(a.id).get(c.id) >= 6 && H.get(b.id).get(c.id) >= 6 && !cuts([a, b, c])) { best = { score: 0, picks: [[1, a], [2, b], [3, c]] }; break search; }
    }
  }
  for (const [g, pick] of best.picks) Object.assign(pick, { soon: P.soon[g], give: {}, big: true, typed: false });
  // resistances: 7 nodes per element, 7/8/9/10/12/13/16% (75%) rising outward from ring 8, spread evenly round the
  // outside: every quarter gets 7, a mix of all four elements, each as far as it can be from the same element's others
  const open = all.filter((n) => plain(n) && !line(n) && !n.notable && !n.keystone && !n.soon && !n.extra && n.ring >= 5);
  const take = (n, give) => { n.give = give; n.typed = true; open.splice(open.indexOf(n), 1); };
  const pickNode = (want, g, near) => {
    let bestN = null, bs = 1e9;
    for (const n of open) {
      if (g != null && region(n) !== g) continue;
      const d = near.length ? Math.min(...near.map((q) => Math.hypot(q.x - n.x, q.y - n.y))) : 99;
      const sc = Math.abs(n.ring - want) * 10 - Math.min(60, d) * 0.4;
      if (sc < bs) { bs = sc; bestN = n; }
    }
    return bestN;
  };
  const RES_STEPS = [7, 8, 9, 10, 12, 13, 16];
  ['fireRes', 'bleedRes', 'poisonRes', 'frostRes'].forEach((k, ei) => {
    const mine = [];
    RES_STEPS.forEach((v, j) => {
      const want = 8 + Math.round(j * 2.2), g = (ei + j) % 4;
      const n = pickNode(want, g, mine) || pickNode(want, null, mine);
      if (n) { take(n, { [k]: v }); mine.push(n); }
    });
  });
  // the Knight's armour (60% in all): 2% nodes round the centre (two in Bulwark, one in each other quarter), a 3%
  // node in the middle of each other quarter, and Bulwark's own growing outward: 3, 3, 3, 4, 4, 4, 5, 5, 5, 5
  if (kind === 'knight') {
    const arm = [], centre = all.filter((n) => plain(n) && !n.notable && !n.keystone && !n.soon && n.ring >= 2 && n.ring <= 4);
    const put = (n, v) => { if (!n) return; n.give = { armor: v }; n.typed = true; arm.push(n); if (open.includes(n)) open.splice(open.indexOf(n), 1); else centre.splice(centre.indexOf(n), 1); };
    const far = (list) => list.sort((a, c) => (arm.length ? Math.min(...arm.map((q) => Math.hypot(q.x - c.x, q.y - c.y))) - Math.min(...arm.map((q) => Math.hypot(q.x - a.x, q.y - a.y))) : 0) || a.ring - c.ring || a.id.localeCompare(c.id))[0];
    for (const g of [0, 0, 1, 2, 3]) put(far(centre.filter((n) => region(n) === g)), 2);
    for (const g of [1, 2, 3]) put(pickNode(11, g, arm), 3);
    for (const [want, v] of [[6, 3], [7, 3], [8, 3], [10, 4], [11, 4], [13, 4], [15, 5], [17, 5], [19, 5], [21, 5]]) put(pickNode(want, 0, arm), v);
  }
}

// Critical hit nodes, added on top of the finished tree (so no other node moves or changes): 10 crit chance (3% near
// the start up to 12% at the edge, 75% in all) and 10 crit damage (4% up to 16%, +100% in all). Each sits in the
// middle of an existing long line, split in two so the spacing stays even, with full room from every node and line;
// none on a path that would move an evolution off its 6 links. Spread out from ring 3 to the edge and round the
// regions, so a first-section tree reaches only the inner few.
export const CRIT_VALUES = { critChance: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], critPower: [4, 6, 7, 8, 9, 11, 12, 13, 14, 16] };
function critNodes(kind, nodes, edges) {
  addNodes(kind, nodes, edges, 20, 'cc', (i) => 3 + i, (placed) => {
    // values by distance out: alternate the two stats, smallest nearest the start
    const next = { critChance: 0, critPower: 0 };
    placed.forEach((n, i) => { const k = i % 2 ? 'critPower' : 'critChance'; n.crit = true; n.give = { [k]: CRIT_VALUES[k][next[k]++] }; });
  });
}
// Every class can deal every element, its own the most: the elements its tree had none of get 4 nodes each, added the
// same way after the crit nodes (flat +20 then +30 per hit, +50% then +80%, the bigger ones further out). Elements are
// dealt round so each gets nodes near the start and at the edge.
export const OFF_ELEMS = { knight: ['bleed', 'poison', 'frost'], rogue: ['fire', 'frost'], mage: ['bleed', 'poison'] };
const OFF_STEPS = [['Dmg', 2], ['Pct', 50], ['Dmg', 3], ['Pct', 80]]; // (flat ×NUM: +20 then +30)
function elemNodes(kind, nodes, edges) {
  const E = OFF_ELEMS[kind], count = E.length * 4;
  addNodes(kind, nodes, edges, count, 'ce', (i) => Math.round(4 + (i * 17) / (count - 1)), (placed) => {
    const next = Object.fromEntries(E.map((k) => [k, 0]));
    placed.forEach((n, i) => { const el = E[i % E.length], [suf, v] = OFF_STEPS[next[el]++]; n.give = { [el + suf]: v }; });
  });
}
// new nodes on top of a finished tree: `count` of them, the i-th aimed at ring want(i); finish(placed, nearest first)
// gives them their stats
function addNodes(kind, nodes, edges, count, prefix, want, finish) {
  const NAMES = REGIONS[kind];
  const region = (n) => ((Math.round((Math.atan2(n.y, n.x) + Math.PI / 2) / (Math.PI / 2)) % 4) + 4) % 4;
  const hopsFrom = (from) => {
    const adj = new Map(); for (const [a, b] of edges) { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); }
    const d = new Map([[from, 0]]), q = [from];
    while (q.length) { const c = q.shift(); for (const x of adj.get(c) || []) if (!d.has(x)) { d.set(x, d.get(c) + 1); q.push(x); } }
    return d;
  };
  const evos = [...nodes.values()].filter((n) => n.role === 'evo' || n.soon).map((n) => n.id);
  const h0 = hopsFrom('start'), evoHops = evos.map((id) => h0.get(id));
  const lineGap = (p, skip) => { let d = 1e9; for (let i = 0; i < edges.length; i++) if (i !== skip) d = Math.min(d, segDist(p, nodes.get(edges[i][0]), nodes.get(edges[i][1]))); return d; };
  const room = (p, skip) => [...nodes.values()].every((n) => Math.hypot(n.x - p.x, n.y - p.y) >= SIZE(n) + 3.9 + 2) && lineGap(p, skip) >= 3.9 + 2; // (clear of every node and line)
  const placed = [], rejected = new Set(), before = [...nodes.values()].filter((n) => n.added);
  for (let i = 0; i < count; i++) {
    const ring0 = want(i), g = (i + Math.floor(i / 4)) % 4;
    let best = null, bs = 1e9;
    for (let k = 0; k < edges.length; k++) {
      const [a, b] = edges[k], A = nodes.get(a), B = nodes.get(b);
      if (rejected.has(a + '|' + b) || (A.socketRing && B.socketRing) || (kind === 'knight' && A.spoke !== undefined && B.spoke !== undefined)) continue;
      // the middle of the line, or a little off it where something sits close to the middle
      const t = [0.5, 0.42, 0.58, 0.35, 0.65].find((f) => room({ x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f }, k));
      if (t === undefined) continue;
      const p = { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
      const ring = Math.min(RINGS, Math.max(1, Math.round(Math.hypot(p.x, p.y) / RING)));
      const near = placed.length + before.length ? Math.min(...[...before, ...placed].map((n) => Math.hypot(n.x - p.x, n.y - p.y))) : 99;
      const sc = Math.abs(ring - ring0) * 10 + (region(p) !== g ? 8 : 0) - Math.min(40, near) * 0.3 + (near < 3 * RING ? 25 : 0) + Math.abs(t - 0.5) * 20 + (A.added || B.added ? 40 : 0); // (one per line)
      if (sc < bs) { bs = sc; best = { k, p, ring }; }
    }
    // or a branch end carried on one step further, straight out along its line (nothing else moves)
    const deg = new Map(); for (const [a, b] of edges) { deg.set(a, (deg.get(a) || 0) + 1); deg.set(b, (deg.get(b) || 0) + 1); }
    for (const [a, b] of edges) for (const [end, from] of [[a, b], [b, a]]) {
      const E = nodes.get(end), F = nodes.get(from);
      if (deg.get(end) !== 1 || onLine(kind, E) || E.added || E.notable || E.keystone || E.soon || E.evo || E.role === 'socket') continue; // (notables and keystones stay at the ends)
      const L = Math.hypot(E.x - F.x, E.y - F.y) || 1;
      const p = { x: E.x + ((E.x - F.x) / L) * RING, y: E.y + ((E.y - F.y) / L) * RING };
      if (!room(p, -1) || edges.some(([c, d]) => c !== end && d !== end && segCross(E, p, nodes.get(c), nodes.get(d)))) continue;
      if ([...nodes.values()].some((n) => n !== E && segDist(n, E, p) < SIZE(n) + 1.5)) continue;
      const ring = Math.min(RINGS, Math.max(1, Math.round(Math.hypot(p.x, p.y) / RING)));
      const near = placed.length + before.length ? Math.min(...[...before, ...placed].map((n) => Math.hypot(n.x - p.x, n.y - p.y))) : 99;
      const sc = Math.abs(ring - ring0) * 10 + (region(p) !== g ? 8 : 0) - Math.min(40, near) * 0.3 + (near < 3 * RING ? 25 : 0) + 6; // (a split line first; none bunched together)
      if (sc < bs) { bs = sc; best = { end, p, ring }; }
    }
    if (!best) break;
    const id = `${prefix}${i}`;
    if (best.end) edges.push([best.end, id]);
    else {
      const [a, b] = edges[best.k];
      edges[best.k] = [a, id]; edges.push([id, b]);
      const h = hopsFrom('start');
      if (evos.some((e, j) => h.get(e) !== evoHops[j])) { edges.pop(); edges[best.k] = [a, b]; rejected.add(a + '|' + b); i--; continue; }
    }
    const n = { id, ring: best.ring, role: 'link', x: best.p.x, y: best.p.y, added: true, typed: true, big: false, notable: null, keystone: false, give: {} };
    n.region = NAMES[region(n)];
    nodes.set(id, n); placed.push(n);
  }
  placed.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  finish(placed);
}

// Damage, resistance and armour nodes take over regular stat nodes, spread round the web. Each sits in a ring
// range by tier: small values near the centre, the biggest at the edge. [stat, value, tier]
const TIER_RINGS = { 1: [2, 5], 2: [6, 8], 3: [9, 12], 4: [13, 16], 5: [17, 22] };
export const EMPHASIS = { knight: 'phys', rogue: 'bleed', mage: 'frost' };
function typedSet(kind) {
  const own = EMPHASIS[kind], out = [];
  if (own === 'phys') {
    // Knight: the most and biggest physical: flat 1,1,1,1,1,2 + 1,2,2,3 (15) and 5/8/10/12/15% (50%)
    for (const [v, t] of [[1, 1], [1, 1], [1, 2], [1, 3], [1, 4], [2, 5], [1, 1], [2, 2], [2, 3], [3, 5]]) out.push(['physDmg', v, t]);
    for (const [v, t] of [[5, 2], [8, 3], [10, 4], [12, 5], [15, 5]]) out.push(['physPct', v, t]);
  } else {
    // the character's element: flat 1,1,1,1,1,2 and +15/20/25/30/35% (125%)
    for (const [v, t] of [[1, 1], [1, 1], [1, 2], [1, 3], [1, 4], [2, 5]]) out.push([own + 'Dmg', v, t]);
    for (const [v, t] of [[15, 2], [20, 3], [25, 4], [30, 4], [35, 5]]) out.push([own + 'Pct', v, t]);
    // some physical too: flat 1,1,1,1,2 (6) and 5/8% (13%)
    for (const [v, t] of [[1, 1], [1, 2], [1, 2], [1, 3], [2, 4]]) out.push(['physDmg', v, t]);
    out.push(['physPct', 5, 3], ['physPct', 8, 5]);
  }
  // every other element: +1 and +2 flat, +15/20/25% (60%)
  for (const k of ['bleed', 'fire', 'frost', 'poison']) if (k !== own) out.push([k + 'Dmg', 1, 1], [k + 'Dmg', 2, 3], [k + 'Pct', 15, 3], [k + 'Pct', 20, 4], [k + 'Pct', 25, 5]);
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
// flat health and flat damage per hit are NUM times bigger (scale.js); the give objects are shared, so copy them
const FLAT = ['hp', 'physDmg', 'fireDmg', 'bleedDmg', 'poisonDmg', 'frostDmg'];
for (const t of Object.values(TREES)) for (const n of t.nodes.values()) if (n.give && FLAT.some((k) => n.give[k])) n.give = Object.fromEntries(Object.entries(n.give).map(([k, v]) => [k, FLAT.includes(k) ? v * NUM : v]));

export function nodeCost(n) {
  if (n.role === 'start') return 0;
  if (n.role === 'evo') return 150 * NUM;
  const c = COST[Math.min(n.ring, COST.length - 1)];
  // notables cost twice a small node of their ring, keystones three times
  return Math.round((n.role === 'socket' ? c * 1.5 : n.keystone ? c * 3 : n.notable ? c * 2 : c)) * NUM;
}

export function neighbours(tree, id) {
  const out = [];
  for (const [a, b] of tree.edges) { if (a === id) out.push(b); else if (b === id) out.push(a); }
  return out;
}

export const owned = (data, kind) => new Set(['start', ...(data?.tree?.[kind] || [])]);

// buyable: not owned and touching an owned node
export function canTake(tree, have, id) {
  if (tree.nodes.get(id)?.soon) return false; // an evolution still to come
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
  const lines = Object.entries(n.give).map(([k, v]) => STATS[k].fmt(+v.toFixed(2)));
  const k = Object.keys(n.give)[0];
  if (n.soon) return { name: `Evolution · ${n.soon.name}`, lines: [n.soon.desc, 'Coming soon: its ability isn\'t in the game yet'] };
  if (n.keystone) return { name: `Keystone · ${n.notable}`, lines };
  if (n.notable) return { name: `${n.notable}`, lines: [...lines, n.region ? `${n.region} notable` : ''].filter(Boolean) };
  return { name: STATS[k]?.name || 'Node', lines: n.region ? [...lines] : lines };
}

export const iconKey = (n) => (n.role === 'start' ? 'start' : n.evo || n.soon ? 'evo' : n.role === 'socket' ? 'socket' : STATS[Object.keys(n.give)[0]]?.icon || 'dmg');

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
export const TREE_VERSION = 17;
// version 7 -> 8 rebuilt only the Knight's tree (regions, notables, keystones): his nodes come back as gold at the
// ring price paid; the others' trees are untouched
const COST_V7 = (id, kind = 'knight') => { const n = TREES[kind].nodes.get(id); if (!n) return 0; return n.role === 'evo' ? 150 : Math.round(COST[Math.min(n.ring, COST.length - 1)] * (n.role === 'socket' ? 1.5 : 1)); };
export function migrateTree(data) {
  if (!data || data.treeV >= TREE_VERSION) return 0;
  // 10 -> 11 and 11 -> 12: the evolutions moved (6 links from the start, 6 from each other), so every tree's nodes come back
  if (data.treeV >= 10 && data.treeV <= 16) { // (16 -> 17: the Knight's lines thinned, resistances spread round the outside;
    // 14 -> 15: damage nodes for every element; 15 -> 16: stats regrouped: centre basics, outer quarters, armour 60%) // (12 -> 13: resistance and armour nodes added; 13 -> 14: crit nodes put into the lines)
    let refund = 0;
    for (const k of ['knight', 'rogue', 'mage']) { refund += (data.tree?.[k] || []).reduce((a, id) => a + COST_V7(id, k), 0); if (data.tree) data.tree[k] = []; }
    refund *= NUM;
    data.gold = (data.gold || 0) + refund;
    data.treeV = TREE_VERSION;
    return refund;
  }
  // 9 -> 10: the Rogue's and Spellsword's trees rebuilt in regions: their nodes come back as gold at the ring price
  if (data.treeV === 9) {
    let refund = 0;
    for (const k of ['rogue', 'mage']) { refund += (data.tree?.[k] || []).reduce((a, id) => a + COST_V7(id, k), 0); if (data.tree) data.tree[k] = []; }
    refund *= NUM;
    data.gold = (data.gold || 0) + refund;
    data.treeV = 10; // (and on to 11)
    return refund + migrateTree(data);
  }
  // 8 -> 9: three Knight nodes became evolutions still to come; anyone holding one gets it back as gold
  if (data.treeV === 8) {
    const soon = (data.tree?.knight || []).filter((id) => TREES.knight.nodes.get(id)?.soon);
    const refund = soon.reduce((a, id) => a + COST_V7(id), 0) * NUM;
    if (soon.length) data.tree.knight = data.tree.knight.filter((id) => !soon.includes(id));
    data.gold = (data.gold || 0) + refund;
    data.treeV = 9; // (and on to 10)
    return refund + migrateTree(data);
  }
  if (data.treeV === 7) {
    const refund = (data.tree?.knight || []).reduce((a, id) => a + COST_V7(id), 0) * NUM;
    if (data.tree) data.tree.knight = [];
    data.gold = (data.gold || 0) + refund;
    data.treeV = 9; // (and on to 10)
    return refund + migrateTree(data);
  }
  const v = data.treeV >= 2 && data.treeV <= 6 ? data.treeV : 1;
  let refund = 0;
  for (const [kind, ids] of Object.entries(data.tree || {})) for (const id of ids) refund += costOld(v, kind, id);
  data.tree = {};
  refund *= NUM; // old prices, in today's bigger gold
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
  refund *= NUM; // old prices, in today's bigger gold
  data.gold = (data.gold || 0) + refund;
  data.tree = data.tree || {};
  data.treeMigrated = true;
  data.treeV = TREE_VERSION; // brand-new trees are already on the current layout
  return refund;
}
