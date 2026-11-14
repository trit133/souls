// The Bazaar (bazaar.js, bazaarsets.js, traders.js): hidden from the Sanctum until Executor Hask is dead; all ten traders
// stand at their places, those still locked grey; Mother Grist open then,
// Brother Vesk after Varek; buying (at 3x / 2.5x worth, from a limited stock), selling (at a share of worth that grows
// with level), the three quest kinds (a hunt by your own kills, a supply from the stash, a relic found in a raid and
// kept), the "!" over a trader and on the Sanctum's button when a quest can be handed in, rewards (gold, emeralds,
// xp), level 5's buff (+300 health), restocking after a raid, a teammate's kill reaching you. Screenshots
// /tmp/bazaar-*.png. node scripts/bazaar.mjs [url with ?server=]
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', url = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(url); await page.waitForTimeout(800);
await page.click('#btn-herm'); await page.waitForTimeout(200);
await page.fill('#acct-user', 'bz' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(1000);
await page.evaluate(() => game.hermitage.setGuide(false));
const out = {};
const vis = (id) => page.evaluate((id) => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none'; }, id);
out.lockedButton = await vis('hm-bazaar');
// Hask falls: the button shows
await page.evaluate(() => { const d = game.accounts.data; d.gems = { gem_hask: 1 }; d.gold = 5000; game.hermitage.refresh(); });
out.openButton = await vis('hm-bazaar');
await page.click('#hm-bazaar'); await page.waitForTimeout(1200);
out.scene = await page.evaluate(() => { const z = game.bazaar; return { active: z.active, people: z.people.filter((p) => p.open).map((p) => p.T.id), all: z.people.length, stalls: z.items.filter((i) => i.locked).length, greyed: z.people.filter((p) => !p.open).every((p) => { let grey = true; p.rig.root.traverse((o) => { if (o.isMesh && !o.userData.outline && o.material.color && o.material.color.getHex() !== 0x5e5c5a && o.material.color.getHex() !== 0x4a4846) grey = false; }); return grey; }), lockedSub: z.items.find((i) => i.id === 'vesk').sub, sanctumHidden: !game.hermitage.active }; });
await page.screenshot({ path: '/tmp/bazaar-scene.png' });
// hover Grist, then click her
const at = await page.evaluate(() => { const z = game.bazaar, p = z.people[0], v = p.rig.j.head.getWorldPosition(p.rig.root.position.clone()); v.y -= 0.25; v.project(z.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }; });
await page.mouse.move(at.x, at.y); await page.waitForTimeout(300);
out.hover = await page.evaluate(() => document.getElementById('bz-label').textContent);
await page.mouse.click(at.x, at.y); await page.waitForTimeout(400);
out.panel = await vis('bz-panel');
await page.screenshot({ path: '/tmp/bazaar-grist-buy.png' });
// buy: scrap iron (worth 5) at 3x = 15
out.buy = await page.evaluate(() => {
  const d = game.accounts.data, s = d.bazaar.grist, g0 = d.gold, st0 = s.stock.scrap_iron, it0 = d.items?.scrap_iron || 0;
  const row = [...document.querySelectorAll('#bz-body .bz-row')].find((r) => r.textContent.includes('Scrap Iron'));
  row.querySelector('.bz-btn').click();
  return { paid: g0 - d.gold, stock: [st0, s.stock.scrap_iron], got: (d.items.scrap_iron || 0) - it0, rows: document.querySelectorAll('#bz-body .bz-row').length, rareOffered: Object.keys(s.stock).some((id) => ['servo_motor', 'oracle_core'].includes(id)) };
});
// sell at level 1: 20% of worth (copper coil, worth 15 -> 3)
await page.click('.bz-tabs [data-bt=sell]'); await page.waitForTimeout(150);
out.sell = await page.evaluate(() => {
  const d = game.accounts.data; d.items.copper_coil = 4; d.items.oracle_core = 1; game.bazaar.renderPanel();
  const g0 = d.gold, rows = [...document.querySelectorAll('#bz-body .bz-row')];
  rows.find((r) => r.textContent.includes('Copper Coil')).querySelector('.bz-btn').click();
  return { got: d.gold - g0, left: d.items.copper_coil, legendaryListed: rows.some((r) => r.textContent.includes('Oracle Core')) };
});
await page.screenshot({ path: '/tmp/bazaar-grist-sell.png' });
// quest 1: a hunt, by your own kills
await page.click('.bz-tabs [data-bt=quests]'); await page.waitForTimeout(150);
out.hunt = await page.evaluate(() => {
  const g = game, d = g.accounts.data, z = g.bazaar;
  for (let i = 0; i < 9; i++) g.bazaarKill('grunt');
  g.bazaarKill('archer'); // (not a Zealot)
  z.refresh(); const before = { bang: z.people[0].bang.visible };
  g.bazaarKill('grunt'); z.refresh(); g.hermitage.refresh(); z.renderPanel();
  const em0 = d.emeralds, g0 = d.gold;
  const after = { bang: z.people[0].bang.visible, sanctumBang: !document.getElementById('hm-bz-bang').classList.contains('hidden'), btn: document.querySelector('.bz-claim').textContent };
  document.querySelector('.bz-claim').click();
  return { before, after, gold: d.gold - g0, em: d.emeralds - em0, xp: d.bazaar.grist.xp, q: d.bazaar.grist.q, bangGone: !z.people[0].bang.visible };
});
await page.screenshot({ path: '/tmp/bazaar-grist-quest.png' });
// quest 2: a supply from the stash
out.supply = await page.evaluate(() => { const d = game.accounts.data; d.items.scrap_iron = 10; game.bazaar.renderPanel(); document.querySelector('.bz-claim').click(); return { scrapLeft: d.items.scrap_iron, q: d.bazaar.grist.q, xp: d.bazaar.grist.xp }; });
// quest 3: the ledger, hidden in Ashfall Ward: start a raid there, walk onto it
await page.evaluate(() => game.bazaar.close());
out.recover = await page.evaluate(() => {
  const g = game, d = g.accounts.data; g.loop = () => {}; g.audio.play = () => {};
  g.raidArea = 'r1a1'; g.hermitage.close(false); g.start('knight');
  const R = g.relics[0], p = g.player; p.hp = p.maxHp = 1e9;
  const placed = { n: g.relics.length, id: R?.id };
  p.pos.set(R.x, 0, R.z); g.lastGood = null;
  for (let i = 0; i < 5; i++) g.step(1 / 60, 1 / 60);
  return { placed, inStash: d.items.grist_ledger || 0, left: g.relics.length };
});
// restock after the raid (falling counts): his stock back to its limit
out.restock = await page.evaluate(() => { const g = game, d = g.accounts.data; d.bazaar.grist.stock.scrap_iron = 0; g.player.hp = 0; g.commitLoot(); return d.bazaar.grist.stock.scrap_iron; });
await page.evaluate(() => { game.toTitle(); });
await page.waitForTimeout(300);
out.claimRelic = await page.evaluate(() => { const d = game.accounts.data, z = game.bazaar; z.open(); z.setPanel(z.people[0].T); z.tab = 'quests'; z.renderPanel(); document.querySelector('.bz-claim').click(); return { q: d.bazaar.grist.q, ledger: d.items.grist_ledger, xp: d.bazaar.grist.xp }; });
// level 5: Grist's Tonic, +300 base health for every character
out.perk = await page.evaluate(() => {
  const g = game, d = g.accounts.data, z = g.bazaar;
  g.start('rogue'); const hp0 = g.player.maxHp, fl0 = g.player.maxFlasks; g.toTitle(); z.open();
  d.bazaar.grist.xp = 700; z.refresh();
  g.start('rogue'); const hp1 = g.player.maxHp, fl1 = g.player.maxFlasks; g.toTitle();
  z.open(); z.refresh();
  return { hpGain: hp1 - hp0, flaskGain: fl1 - fl0, sigil: z.people[0].sigil.visible };
});
// Varek falls: Brother Vesk opens (2.5x)
out.vesk = await page.evaluate(() => {
  const d = game.accounts.data, z = game.bazaar; d.raids = { ...(d.raids || {}), r1f: 1 }; z.buildScene();
  const V = z.people.find((p) => p.T.id === 'vesk'); z.setPanel(V.T); z.tab = 'buy'; z.renderPanel();
  const row = [...document.querySelectorAll('#bz-body .bz-row')].find((r) => r.textContent.includes('Servo Motor'));
  return { people: z.people.filter((p) => p.open).map((p) => p.T.id), servoPrice: row?.querySelector('.bz-rt b').textContent, legendaryStockL1: d.bazaar.vesk.stock.oracle_core };
});
await page.screenshot({ path: '/tmp/bazaar-vesk.png' });
await page.evaluate(() => game.bazaar.setPanel(null)); await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/bazaar-scene-both.png' });
// a party: the host tells you a kill was yours
out.partyKill = await page.evaluate(() => { const d = game.accounts.data, s = d.bazaar.grist, p0 = s.prog, k0 = d.kills?.knight || 0; game.kind = 'knight'; game.mp.handle(1, { t: 'kill', boss: false, type: 'archer' }); return { prog: s.prog - p0, kills: (d.kills?.knight || 0) - k0 }; });
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(12), JSON.stringify(v));
const ok = !out.lockedButton && out.openButton && out.scene.active && out.scene.people.join() === 'grist' && out.scene.all === 10 && out.scene.stalls === 9 && out.scene.greyed && out.scene.lockedSub === 'Beat Archon Varek' && out.hover.includes('Mother Grist') && out.panel
  && out.buy.paid === 15 && out.buy.stock[1] === out.buy.stock[0] - 1 && out.buy.got === 1 && !out.buy.rareOffered
  && out.sell.got === 3 && out.sell.left === 3 && !out.sell.legendaryListed
  && !out.hunt.before.bang && out.hunt.after.bang && out.hunt.after.sanctumBang && out.hunt.gold === 120 && out.hunt.em === 2 && out.hunt.xp === 50 && out.hunt.q === 1 && out.hunt.bangGone
  && out.supply.scrapLeft === 2 && out.supply.q === 2 && out.recover.placed.n === 1 && out.recover.placed.id === 'grist_ledger' && out.recover.inStash === 1 && out.recover.left === 0
  && out.restock === 8 && out.claimRelic.q === 3 && out.claimRelic.ledger === 0 && out.perk.hpGain === 300 && out.perk.flaskGain === 0 && out.perk.sigil
  && out.vesk.people.join() === 'grist,vesk' && out.vesk.servoPrice === '◆ 125' && out.vesk.legendaryStockL1 === 0 && out.partyKill.prog === 1 && out.partyKill.kills === 1;
console.log(ok ? 'bazaar works' : 'BAZAAR PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
