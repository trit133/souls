// The star tiers (items.js tierInfo): region 1 Common ★1-★4 and Uncommon ★1, region 2 Uncommon ★1-★4 and Rare ★1;
// the Bazaar's Exchange (opening it, two for one a star up); a region master's strength (the pick, per character,
// what it adds); the trophy shelf in the Sanctum. Shots /tmp/look/stars-*.png. node scripts/stars.mjs [url]
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(process.argv[2] || 'http://localhost:5180/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 });
const out = await page.evaluate(async () => {
  const g = game, I = await import('/src/items.js'), Z = await import('/src/bazaar.js'), RB = await import('/src/regionbuffs.js');
  const o = {};
  o.r1 = ['scrap_iron', 'copper_coil', 'servo_motor', 'augury_shard', 'oracle_core'].map((id) => I.itemTier(id).short);
  o.r2 = ['ore_chunk', 'raw_seerglass', 'prism_lens', 'geode_heart', 'kiln_ember'].map((id) => I.itemTier(id).short);
  o.twinkles = ['scrap_iron', 'copper_coil', 'servo_motor', 'oracle_core', 'raw_seerglass'].map((id) => I.itemTier(id).twinkle);
  const d = { items: { scrap_iron: 12, ash_rag: 10, spent_casings: 6, copper_coil: 6, cracked_lens: 4, servo_motor: 2, purity_seal: 2 }, gold: 0, gems: {}, raids: {}, stats: { wins: 0 } };
  o.opened = Z.openExchange(d); o.left = d.items.scrap_iron;
  o.trade = Z.exchange(d, 'scrap_iron', 'cracked_lens'); o.after = [d.items.scrap_iron, d.items.cracked_lens];
  o.badTrade = Z.exchange(d, 'scrap_iron', 'servo_motor'); // (two stars up: no)
  // strength: per character
  d.regionBuffs = { knight: { r1: 'hp' }, mage: { r1: 'res' } };
  o.mulKnight = RB.buffMul(d, 'knight'); o.mulRogue = RB.buffMul(d, 'rogue'); o.mulMage = RB.buffMul(d, 'mage');
  o.needs = [RB.needsPick(d, 'knight', 'r1'), RB.needsPick(d, 'rogue', 'r1'), RB.needsPick(d, 'knight', 'r2')];
  return o;
});
console.log(JSON.stringify(out));
// the pick on screen, and the shelf in the Templar's Sanctum (a signed-in account with Varek beaten by the Templar)
await page.evaluate(async () => { const RB = await import('/src/regionbuffs.js'); game.accounts.data = game.accounts.data || {}; game.accounts.save = () => {}; game.ui.toast = () => {}; RB.showPick(game, 'knight', 'r1', 'Templar'); });
await page.waitForTimeout(300); await page.screenshot({ path: '/tmp/look/stars-pick.png' });
const picked = await page.evaluate(() => { document.querySelector('.rb-card[data-k=dmg]').click(); return game.accounts.data.regionBuffs?.knight?.r1; });
console.log('picked', picked);
await page.evaluate(() => { const d = game.accounts.data; d.items = { scrap_iron: 9, copper_coil: 3, servo_motor: 2, augury_shard: 1, oracle_core: 1, ore_chunk: 4, prism_lens: 1 }; d.gems = {}; d.raids = {}; d.stats ||= { wins: 0 }; game.accounts.user = game.accounts.user || 'tester'; game.hermitage.open('knight'); });
await page.waitForTimeout(1500); await page.screenshot({ path: '/tmp/look/stars-sanctum.png' });
await page.evaluate(() => { const H = game.hermitage; H.setGuide(false); H.use(H.items.find((i) => i.id === 'shelf')); }); await page.waitForTimeout(300); await page.screenshot({ path: '/tmp/look/stars-shelf.png' });
await page.evaluate(() => { const H = game.hermitage; H.setShelf(false); H.setStash(true); }); await page.waitForTimeout(300); await page.screenshot({ path: '/tmp/look/stars-stash.png' });
// the player built with the strength: +10% damage for the Templar
const dmg = await page.evaluate(() => { game.start('knight'); return game.player.dmgMul; }); console.log('templar dmgMul', dmg);
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
// (the Exchange's window in the Bazaar: a fresh page, an account that's beaten Hask and has things to trade)
const p2 = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const e2 = []; p2.on('pageerror', (e) => e2.push(e.message));
await page.close(); await p2.goto(process.argv[2] || 'http://localhost:5180/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p2.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 });
await p2.evaluate(() => { const g = game; g.accounts.user = 'tester'; g.accounts.save = () => {}; g.accounts.data = { gold: 500, gems: { gem_hask: 1 }, raids: {}, stats: { wins: 0 }, items: { scrap_iron: 5, copper_coil: 2, servo_motor: 3, raw_seerglass: 2 }, exchange: 1 }; g.hermitage.open('knight'); g.bazaar.open(); g.bazaar.setPanel(null); document.getElementById('bz-exch').click(); });
await p2.waitForTimeout(400); await p2.screenshot({ path: '/tmp/look/stars-exchange.png' });
await p2.evaluate(() => { document.querySelector('#bz-body .bz-row .bz-btn').click(); }); await p2.waitForTimeout(300); await p2.screenshot({ path: '/tmp/look/stars-exchange2.png' });
console.log(e2.length ? 'EXCHANGE ERRORS ' + e2.join(' | ') : 'exchange ok');
await b.close();
