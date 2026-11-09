// The Hermitage: the title has three buttons (Hermitage, Settings, Fullscreen); Hermitage signs you in first, then
// opens your last character's hideout. Hovering the stash / wardrobe / character outlines it with a label; the
// character opens the skill tree, the wardrobe the customizer, the stash opens its lid and the shared stash panel;
// the selector switches hideouts and offers to unlock the Spellsword; Solo Raid starts a run, and the end of a run
// comes back here. Screenshots /tmp/herm-*.png. node scripts/hermitage.mjs [url with ?server=]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/?server=' + encodeURIComponent('http://127.0.0.1:4111');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(900);
const out = {};
out.title = await page.evaluate(() => [...document.querySelectorAll('#menu .tile')].filter((t) => t.offsetParent).map((t) => t.id));
await page.screenshot({ path: '/tmp/herm-title.png' });
// signed out: the Hermitage asks you to sign in, then opens
await page.click('#btn-herm'); await page.waitForTimeout(200);
out.signInShown = await page.evaluate(() => !document.getElementById('account').classList.contains('hidden'));
await page.fill('#acct-user', 'hm' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(900);
out.opened = await page.evaluate(() => ({ active: game.hermitage.active, kind: game.hermitage.kind, menuHidden: document.getElementById('menu').classList.contains('hidden') }));
// screen position of each thing
const where = (id) => page.evaluate((id) => { const h = game.hermitage, it = h.items.find((x) => x.id === id); const THREE = h.camera.constructor; const box = { min: { x: 1e9, y: 1e9, z: 1e9 }, max: { x: -1e9, y: -1e9, z: -1e9 } }; it.group.updateMatrixWorld(true); const v = it.group.getWorldPosition(it.group.position.clone()); const p = v.clone(); p.y += id === 'char' ? 0.7 : 0.6; p.project(h.camera); const r = h.el.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height }; }, id);
for (const kind of ['knight', 'rogue']) {
  await page.evaluate((k) => game.hermitage.setKind(k), kind); await page.waitForTimeout(500);
  await page.screenshot({ path: `/tmp/herm-${kind}.png` });
  const s = await where('stash'); await page.mouse.move(s.x, s.y); await page.waitForTimeout(250);
  out[kind + 'Hover'] = await page.evaluate(() => ({ hover: game.hermitage.hover?.id, label: document.getElementById('hm-label').textContent, outlined: game.hermitage.hover?.outlines.some((o) => !o.material.transparent), faintOnAll: game.hermitage.items.every((it) => it.outlines.length && it.outlines.every((o) => o.visible)) }));
  await page.screenshot({ path: `/tmp/herm-${kind}-hover.png` });
}
// the stash opens (lid and panel)
let s = await where('stash'); await page.mouse.click(s.x, s.y); await page.waitForTimeout(500);
out.stash = await page.evaluate(() => ({ open: game.hermitage.stashOpen, panel: !document.getElementById('hm-stash').classList.contains('hidden'), slots: document.querySelectorAll('.hm-slot').length, lid: +game.hermitage.stashLid.rotation.x.toFixed(2) }));
await page.screenshot({ path: '/tmp/herm-stash.png' });
await page.click('#hm-stash-close');
// the wardrobe opens the customizer for this character; the character opens the skill tree
s = await where('wardrobe'); await page.mouse.click(s.x, s.y); await page.waitForTimeout(400);
out.wardrobe = await page.evaluate(() => ({ skins: !document.getElementById('skins').classList.contains('hidden'), kind: game.skinMenu.kind }));
await page.click('#skins-back'); await page.waitForTimeout(200);
s = await where('char'); await page.mouse.click(s.x, s.y); await page.waitForTimeout(400);
out.character = await page.evaluate(() => ({ tree: !document.getElementById('tree').classList.contains('hidden'), hermStill: game.hermitage.active }));
await page.click('#tree-back'); await page.waitForTimeout(200);
// the Spellsword: locked in the list, a yes/no to unlock it
await page.click('#hm-chars'); await page.waitForTimeout(150);
out.list = await page.evaluate(() => [...document.querySelectorAll('.hm-opt')].map((b) => b.textContent));
await page.evaluate(() => { game.accounts.data.gold = 1500; });
await page.click('.hm-opt.locked'); await page.waitForTimeout(150);
out.ask = await page.evaluate(() => document.querySelector('.hm-ask')?.textContent);
await page.screenshot({ path: '/tmp/herm-unlock.png' });
await page.click('.hm-yes'); await page.waitForTimeout(500);
out.unlocked = await page.evaluate(() => ({ kind: game.hermitage.kind, mage: game.accounts.data.upgrades.mage, gold: game.accounts.data.gold }));
await page.screenshot({ path: '/tmp/herm-mage.png' });
// Solo Raid starts a run as this character (asking about Night Raid once that's unlocked); ending it comes back here
out.bottom = await page.evaluate(() => [...document.querySelectorAll('.hm-bottom > button, .hm-bottom .hm-solo-wrap > button')].filter((b) => b.offsetParent).map((b) => b.textContent.trim()));
await page.evaluate(() => { game.accounts.data.nightRaid = true; game.refreshNight(); });
await page.click('#hm-solo'); await page.waitForTimeout(200);
out.soloAsks = await page.evaluate(() => !document.getElementById('hm-go').classList.contains('hidden'));
await page.click('#hm-night'); await page.waitForTimeout(100);
out.nightOn = await page.evaluate(() => [game.nightRaid, game.newLayout()]);
await page.screenshot({ path: '/tmp/herm-solo-night.png' });
await page.click('#hm-night'); await page.click('#hm-begin'); await page.waitForTimeout(400);
out.run = await page.evaluate(() => ({ mode: game.mode, kind: game.kind, herm: game.hermitage.active }));
await page.evaluate(() => game.toTitle()); await page.waitForTimeout(300);
out.back = await page.evaluate(() => ({ herm: game.hermitage.active, kind: game.hermitage.kind, last: game.accounts.data.lastKind }));
await page.click('#hm-back'); await page.waitForTimeout(200);
out.backToTitle = await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden'));
// phone: first tap labels, second opens
await page.setViewportSize({ width: 844, height: 390 });
await page.click('#btn-herm'); await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/herm-phone.png' });
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(12), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
