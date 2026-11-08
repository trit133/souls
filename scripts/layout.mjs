// Touch layout editor: drag buttons / stick home on a phone, save, cancel, reset, survives reload, moved buttons still work.
import { chromium } from 'playwright';
const URL = 'http://localhost:4173/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(URL); await p.waitForTimeout(600);
const cdp = await ctx.newCDPSession(p);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const drag = async (sel, x, y) => {
  const r = await p.locator(sel).boundingBox();
  const sx = r.x + r.width / 2, sy = r.y + r.height / 2;
  await touch('touchStart', sx, sy);
  for (let i = 1; i <= 8; i++) await touch('touchMove', sx + (x - sx) * i / 8, sy + (y - sy) * i / 8);
  await touch('touchEnd');
  await p.waitForTimeout(50);
};
const at = (sel) => p.locator(sel).boundingBox().then((r) => [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]);
const log = (k, v) => console.log(k.padEnd(20), JSON.stringify(v));

await p.click('#btn-settings');
log('default attack', await at('#b-attack').catch(() => 'hidden'));
await p.tap('#set-layout'); await p.waitForTimeout(100);
log('editing shown', [await p.isVisible('#layout-bar'), await p.isVisible('#b-attack')]);
const before = await at('#b-attack');
log('attack before', before);
await drag('#b-attack', 120, 200);
await drag('#b-heal', 700, 60);
await drag('#stick-base', 300, 250);
await drag('#b-pause', 2000, -100); // off screen: should clamp inside
log('attack after drag', await at('#b-attack'));
log('heal after drag', await at('#b-heal'));
log('stick after drag', await at('#stick-base'));
log('pause clamped', await at('#b-pause'));
log('no press in edit', await p.evaluate(() => [...game.input.pressed]));
await p.screenshot({ path: '/tmp/layout-edit.png' });
await p.tap('#layout-save'); await p.waitForTimeout(100);
log('saved layout', await p.evaluate(() => game.settings.touchLayout));
log('back in settings', await p.isVisible('#settings'));

// cancel throws away changes
await p.tap('#set-layout'); await drag('#b-roll', 400, 100); await p.tap('#layout-cancel'); await p.waitForTimeout(100);
log('cancel kept', await p.evaluate(() => Object.keys(game.settings.touchLayout)));

// reload keeps it (guest: this device)
await p.reload(); await p.waitForTimeout(600);
log('after reload', await p.evaluate(() => Object.keys(game.settings.touchLayout)));

// in a run: moved buttons are where they were put and still fire
await p.tap('.char[data-char="knight"]'); await p.waitForTimeout(800);
log('in-game attack', await at('#b-attack'));
log('in-game heal', await at('#b-heal'));
await p.screenshot({ path: '/tmp/layout-game.png' });
await p.evaluate(() => { window.hits = []; const f = game.input._press.bind(game.input); game.input._press = (a) => { hits.push(a); f(a); }; });
const [ax, ay] = await at('#b-attack');
await touch('touchStart', ax, ay); await touch('touchEnd');
log('attack fires', await p.evaluate(() => hits));
// stick rests at its new home and still drives movement
const [hx, hy] = await at('#stick-base');
await touch('touchStart', hx, hy); await touch('touchMove', hx + 60, hy);
log('stick moves', await p.evaluate(() => [game.input.stick.active, +game.input.stick.x.toFixed(2)]));
await touch('touchEnd'); await p.waitForTimeout(50);
log('stick home again', await at('#stick-base'));

// reset layout in the editor puts defaults back
await p.evaluate(() => game.openSettings());
await p.tap('#set-layout'); await p.tap('#layout-reset'); await p.tap('#layout-save'); await p.waitForTimeout(100);
log('after reset', [await p.evaluate(() => game.settings.touchLayout), await p.evaluate(() => document.getElementById('b-attack').parentNode.id)]);
log('attack default again', await p.evaluate(() => { document.getElementById('settings').classList.add('hidden'); return null; }) || await at('#b-attack'));

if (errs.length) { console.log('ERRORS', errs.slice(0, 4)); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
