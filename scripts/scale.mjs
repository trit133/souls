// The ×NUM scale (scale.js) changes the numbers, not the game: run the same fights on two builds and compare.
// Every health, damage, healing and gold figure should be exactly NUM times bigger, and everything that plays
// (hits to kill, status procs, stamina, mana, stagger) the same. node scripts/scale.mjs <new url> <old url>
import { chromium } from 'playwright';
const NEW = process.argv[2] || 'http://localhost:4173/?chain', OLD = process.argv[3] || 'http://localhost:4174/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const measure = async (url) => {
  const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
  page.on('pageerror', (e) => errs.push(url + ' ' + e.message));
  await page.goto(url); await page.waitForTimeout(700);
  const out = await page.evaluate(() => {
    const g = game, o = {}; g.loop = () => {}; g.audio.play = () => {};
    const R = Math.random; let s = 42; Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const LAYOUT = ['mini:hask', 'camp', 'ruins', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
    const step = (n) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
    for (const kind of ['knight', 'rogue', 'mage']) {
      g.start(kind); g.buildRun(LAYOUT, 5, 1); g.input.move = () => ({ x: 0, y: 0 });
      const p = g.player, e = g.enemies.find((x) => x.type === 'grunt');
      for (const x of g.enemies) if (x !== e) x.die(true);
      e.elems = null;
      o[kind + ' maxHp'] = p.maxHp; o[kind + ' stamina'] = p.maxSt;
      // a light hit on a grunt
      p.pos.set(e.pos.x, 0, e.pos.z + 1.6); p.yaw = Math.PI; e.alert(); step(30); e.cd = 99; e.setState('chase');
      const h0 = e.hp; g.input.pressed.add('attack'); step(40);
      o[kind + ' light hit'] = Math.round(h0 - e.hp); o[kind + ' grunt hp'] = e.maxHp;
      o[kind + ' hits to kill grunt'] = Math.ceil(e.maxHp / Math.max(1, h0 - e.hp));
      o[kind + ' stamina used'] = +(p.maxSt - p.st).toFixed(1);
      // the grunt's slash on the player, and the player's potion
      p.hp = p.maxHp; const def = e.T.moves.slash; e.yaw = e.yawTo(p.pos); p.setState('move'); p.cmb = null;
      g.resolveHit(e, p, def.hits[0], def);
      o[kind + ' slash taken'] = Math.round(p.maxHp - p.hp); o[kind + ' slashes to die'] = Math.ceil(p.maxHp / (p.maxHp - p.hp));
      e.die(true); p.hp = p.maxHp * 0.3; p.setState('move'); g.input.pressed.add('heal'); step(90);
      o[kind + ' potion heals'] = Math.round(p.hp - p.maxHp * 0.3);
    }
    // block: stamina a hit costs the knight
    g.start('knight'); g.buildRun(LAYOUT, 5, 1);
    { const p = g.player, e = g.enemies.find((x) => x.type === 'grunt'); e.elems = null; p.pos.set(e.pos.x, 0, e.pos.z + 1.6); p.yaw = Math.PI; e.yaw = 0; p.blocking = true; const st0 = p.st, hp0 = p.hp; const def = e.T.moves.slash; g.resolveHit(e, p, def.hits[0], def); o['knight block stamina'] = +(st0 - p.st).toFixed(1); o['knight block chip'] = +(hp0 - p.hp).toFixed(1); }
    // status: bleed on a grunt from infused hits — hits until it procs, and the proc's size
    g.start('rogue'); g.buildRun(LAYOUT, 5, 1);
    { const p = g.player; p.statusLv = { bleed: 3 }; const e = g.enemies.find((x) => x.type === 'grunt'); e.maxHp = e.hp = e.maxHp * 100;
      let hits = 0, procHp = 0; const def = p.c.attacks.r1;
      while (hits < 60) { hits++; e.state = 'chase'; const before = e.hp; g.resolveHit(p, e, def.hits[0], def); if (e.status.procd.bleed) { procHp = Math.round(before - e.hp); break; } }
      o['bleed hits to proc'] = hits; o['bleed proc + hit'] = procHp; }
    // bosses and gold
    o['hask hp'] = g.encounters.find((x) => x.bossId === 'hask').boss.maxHp;
    for (const id of ['vael', 'gorrath']) o[id + ' hp'] = g.encounters.find((x) => x.bossId === id).boss.maxHp;
    o['varek hp'] = g.boss.maxHp;
    o['grunt gold'] = (() => { const e = g.enemies.find((x) => x.type === 'grunt' && x.alive); const m = e.mod, b0 = g.roomGold[m] || 0; e.die(); return (g.roomGold[m] || 0) - b0; })();
    // a bolt and a fireball from the Spellsword into a grunt 3 m ahead
    for (const spell of ['bolt', 'fire']) {
      g.start('mage'); g.buildRun(LAYOUT, 5, 1);
      const p = g.player, e = g.enemies.find((x) => x.type === 'grunt');
      for (const x of g.enemies) if (x !== e) x.die(true);
      e.maxHp = e.hp = 1e7; e.cd = 99; e.status.add = () => {}; // the hit itself, no burn
      p.pos.set(e.pos.x, 0, e.pos.z + 3); p.yaw = Math.PI;
      const h = e.hp; g.spawnSpell(p, spell); step(60);
      o[spell + ' hit'] = Math.round(h - e.hp);
    }
    Math.random = R;
    return o;
  });
  await page.context().close();
  return out;
};
const a = await measure(NEW), o = await measure(OLD);
// an account from before: its gold is multiplied once, and only once
{
  const page = await (await b.newContext()).newPage();
  page.on('pageerror', (e) => errs.push('acct ' + e.message));
  await page.goto('http://localhost:4173/?server=' + encodeURIComponent('http://127.0.0.1:4111')); await page.waitForTimeout(600);
  await page.click('#btn-herm'); await page.fill('#acct-user', 'sc' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(600);
  console.log('account gold', JSON.stringify(await page.evaluate(() => {
    const d = game.accounts.data; d.gold = 77; d.stats.goldEarned = 300; delete d.numScale;
    game.refreshTitle(); const once = [d.gold, d.stats.goldEarned]; game.refreshTitle();
    return { before: [77, 300], after: once, again: [d.gold, d.stats.goldEarned] };
  })));
  await page.context().close();
}
let bad = 0;
const SCALED = /hp|hit\b|taken|heals|gold|proc \+|chip/i;
for (const k of Object.keys(o)) {
  const want = SCALED.test(k) && !/hits to|to die|to proc/.test(k) ? 10 : 1;
  const ratio = o[k] ? a[k] / o[k] : a[k] === 0 ? 1 : NaN;
  const ok = Math.abs(ratio - want) < 0.02 * want;
  if (!ok) bad++;
  console.log(k.padEnd(28), String(o[k]).padStart(8), '->', String(a[k]).padStart(8), ok ? '' : `  <-- want ×${want}`);
}
await b.close();
console.log(bad ? `${bad} MISMATCH` : 'all match');
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
