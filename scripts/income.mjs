// Gold income vs skill tree prices. Builds real dungeons (20 seeds per act) and the approach to Varek to count what
// is in them, applies the game's gold rules (main.js onEnemyKilled, progress.js, seals.js, scale.js) for two kinds of
// player and five run outcomes, then walks each tree (cheapest reachable node first) to see how many nodes the runs
// buy under today's ring prices and under a proposed count-based curve. node scripts/income.mjs [url]
import { chromium } from 'playwright';
import { TREES, nodeCost, neighbours } from '../src/skilltree.js';
import { NUM } from '../src/scale.js';
import { MINI_GOLD, BOSS_GOLD, SECTION_MULT } from '../src/progress.js';
import { SEAL_BONUS } from '../src/seals.js';

const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext()).newPage();
await page.goto(url); await page.waitForTimeout(800);
// ---------- 1. what each dungeon holds (built by the game) ----------
const W = await page.evaluate(() => {
  const g = game; g.loop = () => {};
  const acts = [];
  for (let act = 0; act < 3; act++) {
    const sum = { regular: 0, brute: 0, elite: 0, event: 0 }, N = 20;
    for (let s = 1; s <= N; s++) {
      g.buildRun('dungeon', 1000 + s * 37, 1); if (act) g.buildAct(act);
      for (const e of [...g.enemies, ...g.reserves]) {
        if (e.effigy) continue;
        if (e.event) sum.event++; else if (e.elite) sum.elite++; else if (e.type === 'brute') sum.brute++; else sum.regular++;
      }
    }
    for (const k of Object.keys(sum)) sum[k] /= N;
    acts.push(sum);
  }
  g.buildRun('dungeon', 77, 1); g.buildAct(3);
  return { acts, gate: { regular: g.enemies.filter((e) => e.type !== 'brute').length, brute: g.enemies.filter((e) => e.type === 'brute').length } };
});
await b.close();

// ---------- 2. gold per run ----------
// kill gold in a dungeon: a regular enemy 1 × NUM 40% of the time, a brute 2, an elite 3 (Night Raid: half doubled)
const killGold = (c, share, night) => (c.regular * share * 0.4 + c.brute * share * 2 + c.elite * 3 + c.event * 0.4) * NUM * (night ? 1.5 : 1);
const FULL = 20 * NUM;
// a player: share of regular enemies killed, seals broken, full clear?
const PLAYERS = { rusher: { share: 0.5, seals: 3, events: 0.5 }, thorough: { share: 1, seals: 5, events: 1 } };
// outcome: how far the run gets (acts beaten; a death partway through the next one at half progress)
const OUTCOMES = [['dies in dungeon 1', 0], ['beats 1 mini boss', 1], ['beats 2', 2], ['beats 3, dies to Varek', 3], ['beats Varek', 4]];
function runGold(P, beaten, night = false) {
  const sec = [0, 0, 0, 0]; let banked = 0;
  for (let act = 0; act < 3; act++) {
    if (act > beaten) break;
    const c = W.acts[act], part = act === beaten ? 0.5 : 1; // dies halfway through the act it doesn't beat
    const evShare = P.events * Math.min(1, (P.seals - 3 + 1) / 3); // event enemies killed (only if those seals are done)
    const g = killGold({ ...c, event: c.event * evShare, elite: c.elite * Math.min(1, P.seals / 5) * (part < 1 ? 0.5 : 1) }, P.share * part, night);
    sec[act] += g;
    if (part < 1) break;
    const drop = MINI_GOLD[act] * (night ? 2 : 1);
    sec[act] += drop;
    banked += Math.max(0, P.seals - 3) * SEAL_BONUS + (P.share >= 1 ? FULL : 0);
  }
  if (beaten >= 3) { // the approach and Varek
    const part = beaten >= 4 ? 1 : 0.6;
    sec[3] += (W.gate.regular * 1 + W.gate.brute * 3) * NUM * part;
    if (beaten >= 4) sec[3] += BOSS_GOLD * (night ? 2 : 1);
  }
  // each beaten section's boss pays the section's multiplier on its gold
  let bonus = 0;
  for (let i = 0; i < 4; i++) if (beaten > i) bonus += sec[i] * (SECTION_MULT[i] - 1);
  return Math.round(sec.reduce((a, v) => a + v, 0) + bonus + banked);
}

// ---------- 3. trees: nodes in the order a player would buy them (cheapest reachable first) ----------
const typeOf = (n) => (n.role === 'evo' ? 'evo' : n.role === 'socket' ? 'socket' : n.typed ? 'typed' : n.big ? 'big' : 'small');
function buyOrder(kind, price) {
  const tree = TREES[kind], have = new Set(['start']), order = [];
  while (have.size - 1 < tree.nodes.size - 1) {
    let best = null, bc = Infinity;
    for (const id of have) for (const nb of neighbours(tree, id)) {
      if (have.has(nb)) continue;
      const c = price(tree.nodes.get(nb), have.size - 1);
      if (c < bc) { bc = c; best = nb; }
    }
    if (!best) break;
    have.add(best); order.push({ id: best, cost: bc, node: tree.nodes.get(best) });
  }
  return order;
}
const today = (n) => nodeCost(n);
// proposed: base × growth^(nodes owned) × node type × a light ring weight
const WEIGHT = { small: 1, typed: 1.5, big: 2.5, socket: 3, evo: 4 };
const proposed = (B, g) => (n, owned) => Math.round(B * g ** owned * WEIGHT[typeOf(n)] * (1 + 0.4 * (n.ring - 1) / 21) / 10) * 10;
// or a power curve: base × (1 + owned / k)^p, same weights
const power = (B, k, pw) => (n, owned) => Math.round(B * (1 + owned / k) ** pw * WEIGHT[typeOf(n)] * (1 + 0.4 * (n.ring - 1) / 21) / 10) * 10;

// ---------- 4. report ----------
const fmt = (x) => x.toLocaleString('en-US');
console.log('\nPer dungeon (average of 20):', W.acts.map((a, i) => `D${i + 1}: ${a.regular.toFixed(0)} regular, ${a.brute.toFixed(1)} brutes, ${a.elite} elites, ${a.event.toFixed(0)} seal-event enemies`).join(' | '), `| approach: ${W.gate.regular} + ${W.gate.brute} brute`);
console.log('\nGold per run (solo):');
console.log('outcome'.padEnd(26), 'rusher'.padStart(8), 'thorough'.padStart(9), 'rusher night'.padStart(13), 'thorough night'.padStart(15));
const G = {};
for (const [name, beaten] of OUTCOMES) {
  G[beaten] = { rush: runGold(PLAYERS.rusher, beaten), thor: runGold(PLAYERS.thorough, beaten), rushN: runGold(PLAYERS.rusher, beaten, true), thorN: runGold(PLAYERS.thorough, beaten, true) };
  console.log(name.padEnd(26), fmt(G[beaten].rush).padStart(8), fmt(G[beaten].thor).padStart(9), fmt(G[beaten].rushN).padStart(13), fmt(G[beaten].thorN).padStart(15));
}

// a player's career: early runs die early, then they get further; night raids once they can (after run 25)
const CAREER = [];
for (let r = 0; r < 120; r++) {
  const skill = Math.min(4, Math.floor(r / 6)); // ~6 runs per step of progress
  const beaten = r % 5 === 4 ? Math.max(0, skill - 1) : skill; // every fifth run goes badly
  const night = r >= 25 && r % 3 === 0;
  CAREER.push({ beaten, night, gold: runGold(r % 2 ? PLAYERS.thorough : PLAYERS.rusher, beaten, night) });
}
function progress(kind, price, cap = (wins) => (wins ? 70 : 45)) {
  const order = buyOrder(kind, price);
  let gold = 0, owned = 0, wins = 0;
  const at = {};
  CAREER.forEach((run, i) => {
    gold += run.gold; if (run.beaten >= 4) wins++;
    while (owned < order.length && owned < cap(wins) && gold >= order[owned].cost) { gold -= order[owned].cost; owned++; }
    if ([5, 10, 20, 40, 60, 80, 120].includes(i + 1)) at[i + 1] = owned;
  });
  return { at, unspent: Math.round(gold), total: order.reduce((a, n) => a + n.cost, 0), to45: order.slice(0, 45).reduce((a, n) => a + n.cost, 0), to70: order.slice(0, 70).reduce((a, n) => a + n.cost, 0), to130: order.slice(0, 130).reduce((a, n) => a + n.cost, 0) };
}
const careerGold = CAREER.reduce((a, r) => a + r.gold, 0);
console.log(`\nA career of 120 runs earns ${fmt(careerGold)} gold (first 10 runs: ${fmt(CAREER.slice(0, 10).reduce((a, r) => a + r.gold, 0))}).`);
for (const [label, price] of [['TODAY (ring prices)', today], ['EXPONENTIAL 150 × 1.028^n', proposed(150, 1.028)], ['POWER 100 × (1 + n/20)^2', power(100, 20, 2)], ['POWER 120 × (1 + n/25)^2.2', power(120, 25, 2.2)]]) {
  const p = progress('knight', price);
  const pNoCap = progress('knight', price, () => 999);
  console.log(`\n${label}: whole tree ${fmt(p.total)} · first 45 nodes ${fmt(p.to45)} · first 70 ${fmt(p.to70)} · first 130 ${fmt(p.to130)}`);
  console.log('  nodes owned after N runs (caps 45 / 70):', JSON.stringify(p.at), `(gold left unspent after 120 runs: ${fmt(p.unspent)})`);
  console.log('  ... with no caps:', JSON.stringify(pNoCap.at));
  const order = buyOrder('knight', price);
  console.log('  price of node #1, #10, #45, #70, #100, #130, #200:', [0, 9, 44, 69, 99, 129, 199].map((i) => order[i] ? fmt(order[i].cost) + (order[i].node ? '(' + typeOf(order[i].node)[0] + ')' : '') : '-').join(', '));
}
