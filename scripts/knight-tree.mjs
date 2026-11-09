// The Knight's regional tree (skilltree.js knightTree): regions, notables and keystones, what each mechanic does in
// a fight, and the one-time refund of his old nodes (the other trees untouched). Screenshot /tmp/knight-tree.png.
// node scripts/knight-tree.mjs [url with ?server=]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/?chain&server=' + encodeURIComponent('http://127.0.0.1:4111');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
await page.click('#btn-herm'); await page.fill('#acct-user', 'kt' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const g = game, o = {}; g.loop = () => {}; g.audio.play = () => {};
  // 1. the refund: an account on tree version 7 with Knight and Rogue nodes
  const d = g.accounts.data;
  Object.assign(d, { treeV: 7, gold: 0, tree: { knight: ['s0-1', 's0-2', 's0-3'], rogue: ['s0-1', 's0-2'] } });
  g.refreshTitle();
  o.refund = { gold: d.gold, knight: d.tree.knight, rogue: d.tree.rogue, v: d.treeV };

  // 2. the mechanics: the same light hit on a grunt with each stat
  const LAYOUT = ['camp', 'ruins', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
  const P = g.player?.constructor;
  g.start('knight'); g.buildRun(LAYOUT, 5, 1);
  const Player = g.player.constructor;
  const hit = (tree, setup = () => {}, move = 'k1') => {
    const p = g.player; p.tree = tree;
    const e = g.enemies.find((x) => x.type === 'grunt'); e.elems = null; e.alive = true; e.maxHp = e.hp = 1e6; e.status.reset(); e.state = 'chase';
    p.pos.set(e.pos.x, 0, e.pos.z + 1.6); p.hp = p.maxHp;
    setup(p, e);
    const def = p.c.attacks[move] || p.comboDef?.(move); const h0 = e.hp;
    g.resolveHit(p, e, def.hits[def.hits.length - 1], def);
    return Math.round(h0 - e.hp);
  };
  const base = hit({});
  o.lightHit = base;
  o.execute = hit({ execute: 25 }, (p, e) => { e.hp = e.maxHp * 0.2; }) / base;
  o.lastStand = hit({ lowHpDmg: 25 }, (p) => { p.hp = p.maxHp * 0.4; }) / base;
  o.pyre = hit({ burnDmg: 20 }, (p, e) => { e.status.dots.fire = { t: 3, dps: 0 }; }) / base;
  o.headsmanLight = hit({ headsman: 1 }) / base;
  const heavyBase = hit({}, () => {}, 'heavy');
  o.headsmanHeavy = hit({ headsman: 1 }, () => {}, 'heavy') / heavyBase;
  o.emberOath = (() => { const p = g.player; p.tree = { emberOath: 1 }; const e = g.enemies.find((x) => x.type === 'grunt'); e.elems = null; e.maxHp = e.hp = 1e6; const def = p.c.attacks.k1; const info = {}; const r0 = g.resolveHit; let parts; e.receive = ((orig) => (inf) => { parts = inf.parts; return orig.call(e, inf); })(e.receive); g.resolveHit(p, e, def.hits[0], def); return Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v)])); })();
  o.riposteMaster = (() => { const p = g.player; p.tree = { counterSt: 15 }; p.st = 10; const e = g.enemies.find((x) => x.type === 'grunt'); const def = p.c.attacks.guardCounter; g.resolveHit(p, e, def.hits[0], def); return +(p.st - 10).toFixed(1); })();
  o.secondWind = (() => { const p = g.player; p.tree = { killHeal: 3 }; p.hp = p.maxHp * 0.5; const e = g.enemies.find((x) => x.type === 'grunt' && x.alive); e.lastHitBy = p; e.die(); return +((p.hp / p.maxHp - 0.5) * 100).toFixed(1); })();
  // keystones that act on the player
  const stal = new Player(g, 'knight', 0, 0, { stalwart: 1 }), plain = new Player(g, 'knight', 0, 0, {});
  o.stalwart = { hp: stal.maxHp / plain.maxHp, dmg: stal.dmgMul }; stal.remove(); plain.remove();
  o.immovable = (() => { const p = g.player; p.tree = { immovable: 1 }; p.setState('move'); p.hp = p.maxHp; const r = p.receive({ dmg: 100, poise: 80, knock: 'heavy', srcPos: p.pos.clone().add({ x: 1, y: 0, z: 0 }), attacker: null }); return { state: p.state, result: r }; })();
  o.emberTaken = (() => { const p = g.player; const take = (t) => { p.tree = t; p.setState('move'); p.hp = p.maxHp; p.receive({ dmg: 100, poise: 0, srcPos: p.pos.clone().add({ x: 1, y: 0, z: 0 }) }); return p.maxHp - p.hp; }; return +(take({ emberOath: 1 }) / take({})).toFixed(2); })();
  return o;
});
await page.evaluate(() => { game.toTitle(); game.accounts.data.gold = 40000; game.treeUI.open('knight'); });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/knight-tree.png' });
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(14), JSON.stringify(typeof v === 'number' ? +v.toFixed(2) : v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
