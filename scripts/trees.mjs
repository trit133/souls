// The Rogue's and Spellsword's regional trees: what each new mechanic does in a fight, the parry window limit, and
// the one-time refund of their old nodes (version 9 -> 10). Screenshots /tmp/tree-rogue.png, /tmp/tree-mage.png.
// node scripts/trees.mjs [url with ?server=]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/?chain&server=' + encodeURIComponent('http://127.0.0.1:4111');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
await page.click('#btn-herm'); await page.fill('#acct-user', 'tr' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const g = game, o = {}; g.loop = () => {}; g.audio.play = () => {};
  const d = g.accounts.data;
  Object.assign(d, { treeV: 9, gold: 0, upgrades: { mage: 1 }, tree: { knight: ['s0-1'], rogue: ['s0-1', 's0-2'], mage: ['s0-1'] } });
  g.refreshTitle();
  o.refund = { gold: d.gold, knight: d.tree.knight, rogue: d.tree.rogue, mage: d.tree.mage, v: d.treeV };
  const LAYOUT = ['camp', 'ruins', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
  const hit = (kind, tree, setup = () => {}, move) => {
    if (g.kind !== kind) { g.start(kind); g.buildRun(LAYOUT, 5, 1); }
    const p = g.player; p.tree = tree;
    const e = g.enemies.find((x) => x.type === 'grunt'); e.elems = null; e.alive = true; e.maxHp = e.hp = 1e7; e.status.reset(); e.state = 'chase';
    p.pos.set(e.pos.x, 0, e.pos.z + 1.6); p.hp = p.maxHp; p.statusLv = {};
    setup(p, e);
    const def = p.c.attacks[move || p.c.light]; const h0 = e.hp;
    g.resolveHit(p, e, def.hits[0], def);
    return h0 - e.hp;
  };
  const r0 = hit('rogue', {});
  o.rogue = {
    exsanguinate: +(hit('rogue', { bleedTgt: 20 }, (p, e) => { e.status.meter.bleed = e.status.resist.bleed * 0.6; }) / r0).toFixed(2),
    wither: +(hit('rogue', { poisonedDmg: 20 }, (p, e) => { e.status.dots.poison = { t: 5, dps: 0 }; }) / r0).toFixed(2),
    plaguelord: (() => { const plain = hit('rogue', { poisonDmg: 20 }), pl = hit('rogue', { poisonDmg: 20, plague: 1 }); return +(pl / plain).toFixed(2); })(),
  };
  // Blade Dance, Glass Fang and Fleeting act on the player
  const Player = g.player.constructor;
  const mk = (kind, t) => { const p = new Player(g, kind, 0, 0, t); const r = { hp: p.maxHp, dmg: p.dmgMul, aspd: p.aspdMul }; p.remove(); return r; };
  const base = mk('rogue', {});
  o.bladeDance = { aspd: +(mk('rogue', { bladeDance: 1 }).aspd - base.aspd).toFixed(2), dmg: mk('rogue', { bladeDance: 1 }).dmg };
  o.glassFang = { hp: +(mk('rogue', { glassFang: 1 }).hp / base.hp).toFixed(2) };
  o.fleeting = (() => { const p = g.player; const take = (t) => { p.tree = t; p.setState('move'); p.hp = p.maxHp; p.receive({ dmg: 200, poise: 0, srcPos: p.pos.clone().add({ x: 1, y: 0, z: 0 }) }); return p.maxHp - p.hp; };
    const roll = (t) => { p.tree = t; p.st = 100; p.spend = (c) => { p.lastCost = c; }; p.doRoll?.({ x: 0, z: 1 }, 1); return p.lastCost; };
    return { taken: +(take({ fleeting: 1 }) / take({})).toFixed(2) }; })();
  // the Spellsword: spells, knife and the frost / fire keystones
  const m0 = hit('mage', {});
  const spell = (tree, kind = 'fire', setup = () => {}) => { const p = g.player; p.tree = tree; const e = g.enemies.find((x) => x.type === 'grunt'); e.maxHp = e.hp = 1e7; e.status.reset(); e.status.add = () => {}; setup(e); const h = e.hp; g.spellDamage({ dmg: 1000, poise: 0, pos: p.pos.clone(), kind }, e); return h - e.hp; };
  const f0 = spell({}), b0 = spell({}, 'bolt');
  o.mage = {
    shatterpoint: +(hit('mage', { frozenDmg: 20 }, (p, e) => { e.status.frostT = 3; }) / m0).toFixed(2),
    spellbladeSpell: +(spell({ spellblade: 1 }) / f0).toFixed(2), spellbladeKnife: +(hit('mage', { spellblade: 1 }) / m0).toFixed(2),
    pyromaniaFireball: +(spell({ pyromania: 1 }) / f0).toFixed(2),
    rimeHeartBolt: +(spell({ rimeHeart: 1 }, 'bolt') / b0).toFixed(2), rimeHeartFireball: +(spell({ rimeHeart: 1 }) / f0).toFixed(2),
    pyromaniaFireTaken: (() => { const p = g.player; const take = (t) => { p.tree = t; p.setState('move'); p.hp = p.maxHp; p.status.add = () => {}; const fire = { fire: 0.5 }; p.receive({ dmg: 200, poise: 0, elems: fire, srcPos: p.pos.clone().add({ x: 1, y: 0, z: 0 }) }); return p.maxHp - p.hp; }; return +(take({ pyromania: 1 }) / take({})).toFixed(3); })(),
  };
  return o;
});
for (const k of ['rogue', 'mage']) {
  await page.evaluate((k) => { game.toTitle(); game.accounts.data.gold = 40000; game.treeUI.open(k); }, k);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/tree-${k}.png` });
}
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(12), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
