// The training ring's summoning pads (trainpads.js): 3 s on the amber pad calls a small enemy, on the red pad a big
// one, across the ring; one a stand (step off and on for another); at most 6 at once; a trainee's kill is worth
// nothing. Picture: /tmp/look/trainpads.png
// node scripts/trainpads.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:5180/?training';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 800, height: 500 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const res = await page.evaluate(() => {
  const g = game, out = {}; g.loop = () => {}; g.audio.play = () => {};
  const run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(1 / 60, 1 / 60); };
  g.training = true; g.start('knight');
  const p = g.player; p.hp = p.maxHp = 1e9; p.iframe = () => true;
  const [S, L] = g.world.trainPads, tr = () => g.enemies.filter((e) => e.trainee && e.alive);
  const stand = (P) => { p.pos.set(P.x, P.y, P.z); p.vel?.set(0, 0, 0); };
  const away = () => p.pos.set(0, 0, -4);
  out.pads = g.world.trainPads.map((P) => P.size);
  stand(S); run(1.5); out.early = tr().length;
  out.prompt = document.getElementById('prompt')?.textContent || '';
  run(1.7); out.small = tr().map((e) => e.type);
  run(3.5); out.onlyOne = tr().length;
  away(); run(0.5); stand(S); run(3.2); out.again = tr().length;
  away(); run(0.3); stand(L); run(3.2); out.large = tr().slice(-1).map((e) => e.type);
  out.coming = tr().every((e) => e.state === 'alert' || e.state === 'chase' || e.state === 'attack' || e.state === 'recover');
  // kill one: nothing for it
  const gold0 = g.runGold, emer0 = g.accounts.data?.emeralds ?? 0, kills0 = g.accounts.data?.stats?.kills ?? 0;
  const e = tr()[0]; e.hp = 1; g.resolveHit(p, e, { dmg: 999, poise: 0 }, p.c.attacks.a1 || Object.values(p.c.attacks)[0]); run(0.5);
  out.killed = !e.alive; out.paid = { gold: g.runGold - gold0, emeralds: (g.accounts.data?.emeralds ?? 0) - emer0, hearts: (g.hearts || []).length };
  // the cap
  for (let i = 0; i < 6; i++) { away(); run(0.3); stand(S); run(3.2); }
  out.capped = tr().length;
  away(); run(0.2);
  return out;
});
// a picture: the pads, one charging
const pic = await page.evaluate(() => {
  const g = game; g.loop = () => {}; g.training = true; g.start('rogue');
  for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const [S, L] = g.world.trainPads, p = g.player; p.pos.set(L.x, 0, L.z);
  for (let i = 0; i < 100; i++) g.step(1 / 60, 1 / 60);
  const c = g.camera; g.camLock = true; c.position.set(0, 5, S.z + 7); c.lookAt(0, 0.3, S.z - 1); g.pixel.render(g.scene, c);
  return document.querySelector('canvas').toDataURL();
});
writeFileSync('/tmp/look/trainpads.png', Buffer.from(pic.split(',')[1], 'base64'));
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(9), JSON.stringify(v));
const SMALL = ['grunt', 'spear', 'archer', 'wretch', 'hook', 'torcher', 'flagellant', 'augur'], LARGE = ['brute', 'hulk', 'castellan', 'bellwarden'];
const ok = res.pads.join() === 'small,large' && res.early === 0 && /Hold still/.test(res.prompt) && res.small.length === 1 && SMALL.includes(res.small[0])
  && res.onlyOne === 1 && res.again === 2 && LARGE.includes(res.large[0]) && res.coming && res.killed && res.paid.gold === 0 && res.paid.emeralds === 0 && res.paid.hearts === 0 && res.capped === 6;
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'no page errors');
console.log(ok && !errs.length ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok && !errs.length ? 0 : 1);
