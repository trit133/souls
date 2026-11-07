// Skill tree layout check: 180 connected nodes per tree, 90/60/30 per band, 20 rings, no overlapping nodes, no
// node sitting on a link line, equal socket-to-socket cost. node scripts/treecheck.mjs
import { TREES, treeStats, nodeCost, neighbours, BANDS, RING } from '../src/skilltree.js';
const SIZE = (n) => (n.role === 'start' ? 4.6 : n.role === 'socket' || n.role === 'evo' ? 5 : 3.9);
function path(t, a, b) { const dist = new Map([[a, 0]]), q = [[0, a]]; while (q.length) { q.sort((x, y) => x[0] - y[0]); const [d, c] = q.shift(); if (c === b) return d; if (d > dist.get(c)) continue; for (const n of neighbours(t, c)) { const nd = d + nodeCost(t.nodes.get(n)); if (nd < (dist.get(n) ?? 1e9)) { dist.set(n, nd); q.push([nd, n]); } } } }
const t0 = Date.now();
for (const [k, t] of Object.entries(TREES)) {
  const all = [...t.nodes.values()], seen = new Set(['start']), q = ['start'];
  while (q.length) { const c = q.shift(); for (const n of neighbours(t, c)) if (!seen.has(n)) { seen.add(n); q.push(n); } }
  let overlaps = 0, minGap = 99;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const d = Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y) - SIZE(all[i]) - SIZE(all[j]); minGap = Math.min(minGap, d); if (d < 0.5) overlaps++; }
  let onLine = 0;
  for (const [a, b] of t.edges) { const A = t.nodes.get(a), B = t.nodes.get(b), vx = B.x - A.x, vy = B.y - A.y, L2 = vx * vx + vy * vy;
    for (const C of all) { if (C === A || C === B) continue; const tt = ((C.x - A.x) * vx + (C.y - A.y) * vy) / L2; if (tt <= 0 || tt >= 1) continue; const d = Math.hypot(C.x - A.x - vx * tt, C.y - A.y - vy * tt); if (d < SIZE(C) - 0.5) onLine++; } }
  // link lines crossing each other (sharing an end node is fine)
  const P = (id) => t.nodes.get(id), cross = (a, b, c, d) => {
    const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  let crossings = 0;
  for (let i = 0; i < t.edges.length; i++) for (let j = i + 1; j < t.edges.length; j++) {
    const [a, b] = t.edges[i], [c, d] = t.edges[j];
    if (a === c || a === d || b === c || b === d) continue;
    if (cross(P(a), P(b), P(c), P(d))) crossings++;
  }
  const bands = BANDS.map(([lo, hi]) => all.filter((n) => n.ring >= lo && n.ring <= hi).length);
  const socks = all.filter((n) => n.role === 'socket').map((n) => n.id);
  const cost = all.reduce((s, n) => s + nodeCost(n), 0);
  console.log(k, 'nodes', all.length - 1, 'conn', seen.size === all.length, 'bands', bands.join('/'), 'maxRing', Math.max(...all.map((n) => n.ring)), 'overlaps', overlaps, 'crossings', crossings, 'minGap', minGap.toFixed(2), 'nodesOnLines', onLine, 'sockets', [[0, 1], [1, 2], [2, 0]].map(([x, y]) => path(t, socks[x], socks[y])).join('/'), 'full', cost);
}
console.log('build+check ms', Date.now() - t0);
