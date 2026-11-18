// Edge or flat: through each attack's hit window, how much the blade cuts with its edge (1) or slaps with its flat
// (0). The tip's motion across the blade (its velocity with the part along the blade taken out) is compared with the
// blade's edge line (the weapon's y; its flat faces x), weighted by that speed. Stabs (motion along the blade) count
// little. node scripts/edge.mjs [filter] [url]   filter: comma list of classes, weapons or moves
import { chromium } from 'playwright';
const filter = (process.argv[2] || '').split(',').filter(Boolean), url = process.argv[3] || 'http://localhost:5180/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
const SETS = [['knight', 'sword'], ['knight', 'greatsword'], ['rogue', 'daggers'], ['rogue', 'wristblade'], ['mage', 'daggers'], ['mage', 'spellknife']];
const all = [];
for (const [kind, weapon] of SETS) {
  if (filter.length && filter.every((f) => f === 'knight' || f === 'rogue' || f === 'mage' || SETS.some((s) => s[1] === f)) && !filter.some((f) => f === kind || f === weapon)) continue;
  const res = await page.evaluate(({ kind, weapon, filter }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    g.loadoutFor = () => ({ weapon, evo: null });
    g.start(kind);
    const P = g.player, R = P.rig; P.hp = P.maxHp = 1e7; P.st = P.maxSt = 1e5;
    for (const e of [...g.enemies, ...(g.bosses || [])]) { e.rig.root.visible = false; e.update = () => {}; }
    const moves = Object.entries(P.c.attacks).filter(([k, d]) => d && d.keys && d.dur && d.hits?.length && (!filter.length || filter.includes(kind) || filter.includes(weapon) || filter.includes(k))).map(([k]) => k);
    const V = P.pos.constructor, out = [];
    const blades = R.edges || (R.wpnR ? [{ g: R.wpnR, tip: R.tip }] : []);
    if (!blades.length) return out;
    for (const move of moves) {
      const def = P.c.attacks[move];
      P.setState('move'); P.vel.set(0, 0, 0); P.yaw = 0;
      for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60);
      P.doAttack(move, P.pos.clone().set(0, 0, 1), 0);
      const prev = blades.map((bl) => bl.tip.getWorldPosition(new V()));
      let sum = 0, wsum = 0, worst = 1, worstT = 0, guard = 0;
      while (P.state === 'attack' && guard++ < 400) {
        const T = P.atk.t; g.step(1 / 60, 1 / 60); if (!P.atk) break;
        const live = def.hits.some((h) => T >= h.t0 - 0.04 && T <= h.t1);
        blades.forEach((bl, i) => {
          const cur = bl.tip.getWorldPosition(new V()), v = cur.clone().sub(prev[i]); prev[i] = cur;
          if (!live) return;
          bl.g.updateWorldMatrix(true, false);
          const m = bl.g.matrixWorld.elements, ax = new V(m[8], m[9], m[10]).normalize(), ed = new V(m[4], m[5], m[6]).normalize();
          const vp = v.clone().addScaledVector(ax, -v.dot(ax)), sp = vp.length();
          if (sp < 0.01) return; // (a blade barely moving across: the other hand's, or a stab)
          const a = Math.abs(vp.dot(ed)) / sp; // 1: the edge leads, 0: the flat
          sum += a * sp; wsum += sp; if (sp > 0.03 && a < worst) { worst = a; worstT = T; }
        });
      }
      out.push({ move, edge: wsum ? +(sum / wsum).toFixed(2) : null, worst: +worst.toFixed(2), worstT: +worstT.toFixed(2) });
      while (P.state === 'attack') g.step(1 / 60, 1 / 60);
    }
    return out;
  }, { kind, weapon, filter });
  for (const r of res) { all.push(r.edge); console.log(`${kind.padEnd(7)} ${weapon.padEnd(11)} ${r.move.padEnd(12)} edge ${String(r.edge).padEnd(5)} worst ${r.worst} at ${r.worstT}s${r.edge < 0.8 ? '   FLAT' : ''}`); }
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
